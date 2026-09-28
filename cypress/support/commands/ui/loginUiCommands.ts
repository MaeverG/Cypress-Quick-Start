import { testUsers } from '@utils/index';

Cypress.Commands.add('loginUI', (email = testUsers.systemUser, password = testUsers.password) => {
  cy.visit('/login');
  cy.get('[data-cy=email-input]').type(email);
  cy.get('[data-cy=password-input]').type(password);
  cy.get('[data-cy=login-submit]').click();
  cy.get('[data-cy=app-nav]').should('be.visible');
});
