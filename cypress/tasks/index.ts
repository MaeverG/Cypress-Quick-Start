import fs from 'fs';
import net from 'net';
import { Pool, PoolClient } from 'pg';
import { Client as SshClient } from 'ssh2';
import type {
  ConnectionDetails,
  SshTunnelDetails,
  TunnelState,
  ConnectDbArgs,
} from '@/types/index';

const SSH_READY_TIMEOUT_MS = 20_000;
const DB_CONNECT_TIMEOUT_MS = 10_000;
const DB_STATEMENT_TIMEOUT_MS = 30_000;
const DB_QUERY_TIMEOUT_MS = DB_STATEMENT_TIMEOUT_MS + 5_000;

// local/ci connect straight to Postgres; every other env goes through the SSH bastion
function isLocalPemFilename(pemFilename: string): boolean {
  return pemFilename.includes('local') || pemFilename.includes('ci');
}

function buildLocalPoolKey(connection: ConnectionDetails): string {
  return `local:${connection.user}@${connection.host}:${connection.port}/${connection.database}`;
}

function buildTunnelKey(
  connection: ConnectionDetails,
  sshTunnel: SshTunnelDetails,
  pemFilename: string,
): string {
  return `ssh:${sshTunnel.user}@${sshTunnel.host}:${sshTunnel.port} -> ${connection.user}@${connection.host}:${connection.port}/${connection.database} pem=${pemFilename}`;
}

function assertPemFilename(pemFilename: unknown): asserts pemFilename is string {
  if (typeof pemFilename !== 'string' || pemFilename.length === 0) {
    throw new Error(`connectDB: pemFilename is required. Received: ${String(pemFilename)}`);
  }
}

function safeClose(label: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`[DB] cleanup failed: ${label}`, error);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }) as Promise<T>;
}

async function runQueryWithStatementTimeout(pool: Pool, query: string): Promise<unknown[]> {
  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query(`SET statement_timeout TO ${DB_STATEMENT_TIMEOUT_MS}`);
    const result = await client.query(query);
    return result.rows;
  } finally {
    try {
      client?.release();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('[DB] client.release() failed', error);
    }
  }
}

let cachedLocalPool: Pool | null = null;
let cachedLocalPoolKey: string | null = null;

const cachedTunnels = new Map<string, TunnelState>();
const tunnelInitPromises = new Map<string, Promise<TunnelState>>();

function getOrCreateLocalPool(connectionDetails: ConnectionDetails): Pool {
  const nextKey = buildLocalPoolKey(connectionDetails);

  if (cachedLocalPool && cachedLocalPoolKey === nextKey) {
    return cachedLocalPool;
  }

  if (cachedLocalPool) {
    void cachedLocalPool.end().catch((error) => {
      // eslint-disable-next-line no-console
      console.log('[DB] cachedLocalPool.end() failed (pool swap)', error);
    });
    cachedLocalPool = null;
    cachedLocalPoolKey = null;
  }

  const pool = new Pool({
    ...connectionDetails,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
  });

  pool.on('error', (error) => {
    // eslint-disable-next-line no-console
    console.log('[DB] Local pool error:', error);
  });

  cachedLocalPool = pool;
  cachedLocalPoolKey = nextKey;

  return pool;
}

// SSH tunnels are cached by connection params and reused across specs; init is
// de-duped via tunnelInitPromises so concurrent callers don't open the tunnel twice.
async function getOrCreateTunnelState(
  params: Omit<ConnectDbArgs, 'query'>,
): Promise<TunnelState> {
  const { connectionDetails, sshTunnelDetails, pemFilename } = params;

  const tunnelKey = buildTunnelKey(connectionDetails, sshTunnelDetails, pemFilename);

  const existing = cachedTunnels.get(tunnelKey);
  if (existing) return existing;

  const existingInit = tunnelInitPromises.get(tunnelKey);
  if (existingInit) return existingInit;

  const initPromise = new Promise<TunnelState>((resolve, reject) => {
    const sshClient = new SshClient();
    const localServer = net.createServer();

    let settled = false;

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;

      tunnelInitPromises.delete(tunnelKey);

      safeClose('localServer.close()', () => localServer.close());
      safeClose('sshClient.end()', () => sshClient.end());

      reject(error);
    };

    const complete = (tunnelState: TunnelState) => {
      if (settled) return;
      settled = true;

      tunnelInitPromises.delete(tunnelKey);
      cachedTunnels.set(tunnelKey, tunnelState);

      resolve(tunnelState);
    };

    const sshReadyTimer = setTimeout(() => {
      fail(
        new Error(
          `SSH ready timeout after ${SSH_READY_TIMEOUT_MS}ms for ${sshTunnelDetails.host}:${sshTunnelDetails.port}`,
        ),
      );
    }, SSH_READY_TIMEOUT_MS);

    localServer.on('error', fail);

    localServer.listen(0, '127.0.0.1', () => {
      const address = localServer.address();
      if (!address || typeof address === 'string') {
        clearTimeout(sshReadyTimer);
        return fail(new Error('Failed to bind local tunnel port'));
      }

      const localBoundPort = address.port;

      localServer.on('connection', (localSocket) => {
        sshClient.forwardOut(
          localSocket.remoteAddress || '127.0.0.1',
          localSocket.remotePort || localBoundPort,
          connectionDetails.host,
          connectionDetails.port,
          (error, remoteStream) => {
            if (error) {
              safeClose('localSocket.end()', () => localSocket.end());
              return;
            }
            localSocket.pipe(remoteStream).pipe(localSocket);
          },
        );
      });

      const sshConfig = {
        host: sshTunnelDetails.host,
        port: sshTunnelDetails.port,
        username: sshTunnelDetails.user,
        privateKey: fs.readFileSync(pemFilename),
        readyTimeout: SSH_READY_TIMEOUT_MS,
        keepaliveInterval: 10_000,
        keepaliveCountMax: 3,
      };

      sshClient
        .on('ready', () => {
          clearTimeout(sshReadyTimer);

          const dbPool = new Pool({
            user: connectionDetails.user,
            host: '127.0.0.1',
            database: connectionDetails.database,
            password: connectionDetails.password,
            port: localBoundPort,
            max: 5,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
          });

          dbPool.on('error', (error) => {
            // eslint-disable-next-line no-console
            console.log('[DB] Tunnel pool error:', error);
          });

          complete({
            tunnelKey,
            pemFilename,
            localBoundPort,
            localServer,
            sshClient,
            dbPool,
            createdAtEpochMs: Date.now(),
          });
        })
        .on('error', (error) => {
          clearTimeout(sshReadyTimer);
          fail(error);
        })
        .connect(sshConfig);
    });
  });

  tunnelInitPromises.set(tunnelKey, initPromise);
  return initPromise;
}

export async function closeAllDbConnections(): Promise<void> {
  for (const [tunnelKey, tunnelState] of cachedTunnels.entries()) {
    try {
      await tunnelState.dbPool.end();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('[DB] dbPool.end() failed', { tunnelKey, error });
    }

    safeClose('sshClient.end()', () => tunnelState.sshClient.end());
    safeClose('localServer.close()', () => tunnelState.localServer.close());

    cachedTunnels.delete(tunnelKey);
  }

  if (cachedLocalPool) {
    try {
      await cachedLocalPool.end();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('[DB] cachedLocalPool.end() failed', error);
    } finally {
      cachedLocalPool = null;
      cachedLocalPoolKey = null;
    }
  }
}

export function makeTasks() {
  return {
    async connectDB({ query, connectionDetails, sshTunnelDetails, pemFilename }: ConnectDbArgs) {
      assertPemFilename(pemFilename);

      if (isLocalPemFilename(pemFilename)) {
        const pool = getOrCreateLocalPool(connectionDetails);

        return withTimeout(
          runQueryWithStatementTimeout(pool, query),
          DB_QUERY_TIMEOUT_MS,
          'DB query (local)',
        );
      }

      const tunnelState = await withTimeout(
        getOrCreateTunnelState({ connectionDetails, sshTunnelDetails, pemFilename }),
        SSH_READY_TIMEOUT_MS + 5_000,
        'SSH tunnel init',
      );

      return withTimeout(
        runQueryWithStatementTimeout(tunnelState.dbPool, query),
        DB_QUERY_TIMEOUT_MS,
        'DB query (tunnel)',
      );
    },

    async closeDbConnections() {
      await closeAllDbConnections();
      return null;
    },
  };
}
