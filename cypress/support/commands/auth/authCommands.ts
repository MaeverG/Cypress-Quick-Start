import { requestMethodList, testUsers } from '@utils/index';
import { OtherOptions, Payload } from '@/types/index';

Cypress.Commands.add('loginAPI', (payload?: Payload, otherOptions?: OtherOptions) => {
  const defaultPayload = {
    email: testUsers.systemUser,
    password: testUsers.password,
  };

  const mergedPayload = Cypress._.merge(defaultPayload, payload);

  return cy
    .sendRequest(
      { method: requestMethodList.POST, url: '/auth/token' },
      mergedPayload,
      otherOptions ?? {},
    )
    .as('postAuthTokenResponse')
    .then((response) => {
      if (otherOptions?.failOnStatusCode !== false) {
        cy.addToLocalStorage('auth-token', response.body.data.token);
      }
    });
});
