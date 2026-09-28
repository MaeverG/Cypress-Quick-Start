import './index';
import './commands/index';

import 'cypress-mochawesome-reporter/register';
import 'cypress-plugin-api';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import registerCypressGrep from '@cypress/grep/src/support';
registerCypressGrep();

import 'cypress-plugin-steps';
import 'cypress-recurse/commands';

import installLogsCollector from 'cypress-terminal-report/src/installLogsCollector';
import { convertKeysToCamelCase } from '@utils/index';

installLogsCollector();

// specs assert real UI/API errors; don't let unrelated app exceptions fail the run
Cypress.on('uncaught:exception', () => false);

before(() => {
  // Log in once per run so every spec starts with a valid auth token.
  cy.loginAPI();
});

Cypress.Commands.add('executeQuery', (query: string) => {
  const envName = Cypress.env('environmentName') || 'local';
  const pemFilename = Cypress.env('pemFilename') || `./bastion-${envName}.pem`;

  return cy
    .task('connectDB', {
      query,
      connectionDetails: Cypress.env('postgres'),
      sshTunnelDetails: Cypress.env('ssh'),
      pemFilename,
    })
    .then((dataSet: any) => {
      const convertedDataSet = convertKeysToCamelCase(dataSet);
      return cy.wrap(dataSet.length === 1 ? convertedDataSet[0] : convertedDataSet);
    });
});
