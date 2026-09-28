import { Pool } from 'pg';
import { Client as SshClient } from 'ssh2';
import { Server } from 'net';

export type JsonObject = {
  [key: string]: any;
};

export type FieldList = string | string[];

export type Payload = JsonObject | undefined;

export type RequestDetails = {
  method: Cypress.HttpMethod;
  url: string;
};

export type OtherOptions = JsonObject & {
  failOnStatusCode?: boolean;
  invalidAuthToken?: boolean;
};

export type ConnectionDetails = {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
};

export type SshTunnelDetails = {
  host: string;
  port: number;
  user: string;
};

export type ConnectDbArgs = {
  query: string;
  connectionDetails: ConnectionDetails;
  sshTunnelDetails: SshTunnelDetails;
  pemFilename: string;
};

export type TunnelState = {
  tunnelKey: string;
  pemFilename: string;
  localBoundPort: number;
  localServer: Server;
  sshClient: SshClient;
  dbPool: Pool;
  createdAtEpochMs: number;
};
