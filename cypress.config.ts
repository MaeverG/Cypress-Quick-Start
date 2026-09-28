import { defineConfig } from 'cypress';
import { beforeRunHook } from 'cypress-mochawesome-reporter/lib';
import { merge } from 'mochawesome-merge';
import generator from 'mochawesome-report-generator';
import { makeTasks } from './cypress/tasks';

require('dotenv').config();

export default defineConfig({
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'cypress-mochawesome-reporter, mocha-junit-reporter',
    cypressMochawesomeReporterReporterOptions: {
      reportDir: 'cypress/reports',
      charts: true,
      saveJson: true,
      reportPageTitle: 'Test Report',
      embeddedScreenshots: true,
      inlineAssets: true,
      json: true,
    },
    mochaJunitReporterReporterOptions: {
      mochaFile: 'cypress/reports/xml/junit/results-[hash].xml',
      suiteTitleSeparatedBy: ' - ',
      useFullSuiteTitle: false,
      testCaseSwitchClassnameAndName: true,
    },
  },

  viewportWidth: 1440,
  viewportHeight: 900,

  defaultCommandTimeout: 15000,
  pageLoadTimeout: 30000,
  requestTimeout: 15000,
  responseTimeout: 30000,

  e2e: {
    watchForFileChanges: false,
    chromeWebSecurity: false,

    retries: {
      runMode: 1,
    },

    async setupNodeEvents(on, config) {
      const tasks = makeTasks();
      on('task', tasks);

      // DB connections/tunnels are pooled across specs — close them explicitly
      // rather than relying on process exit.
      on('after:spec', async () => {
        await tasks.closeDbConnections();
      });

      on('after:run', async () => {
        await tasks.closeDbConnections();

        const reportDir = './cypress/reports';
        try {
          const report = await merge({ files: [`${reportDir}/.jsons/*.json`] });
          await generator.create(report, {
            reportDir,
            inline: true,
            charts: true,
            reportTitle: 'Merged Test Report',
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error merging mochawesome reports:', error);
        }
      });

      on('before:run', async (details) => {
        await beforeRunHook(details);
      });

      require('@cypress/grep/src/plugin')(config);
      require('cypress-terminal-report/src/installLogsPrinter')(on, {
        printLogsToConsole: 'onFail',
      });
      require('cypress-mochawesome-reporter/plugin')(on);

      // Per-environment baseUrl/env, loaded by `--env environmentName=<name>`.
      // Copy *.settings.example.json to *.settings.json (gitignored) and fill in real values.
      const environmentName = config.env.environmentName || 'local';
      config.env.environmentName = environmentName;

      const settingsFilename = `./${environmentName}.settings.json`;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const settings = require(settingsFilename);

      if (settings.baseUrl) {
        config.baseUrl = settings.baseUrl;
      }
      if (settings.env) {
        config.env = { ...config.env, ...settings.env };
      }

      config.env.pemFilename = `./bastion-${environmentName}.pem`;

      return config;
    },

    env: {
      grepFilterSpecs: true,
      grepOmitFiltered: true,
    },

    specPattern: 'cypress/e2e/**/*.cy.ts',
  },
});
