import spok from 'cy-spok';
import { FieldList, JsonObject, OtherOptions, Payload, RequestDetails } from '@/types/index';

Cypress.Commands.add(
  'sendRequest',
  (requestDetails: RequestDetails, payload?: Payload, otherOptions?: OtherOptions) => {
    Cypress._.update(requestDetails, 'url', (url) => `${Cypress.env('baseUrlApi')}${url}`);

    const token = otherOptions?.invalidAuthToken
      ? ''
      : `Bearer ${window.localStorage.getItem('auth-token')}`;

    cy.step(`Send a ${requestDetails.method} request to the endpoint: ${requestDetails.url}`);

    return cy
      .request({
        ...requestDetails,
        headers: { authorization: token },
        ...otherOptions,
        body: payload,
        failOnStatusCode: false,
      })
      .then((endpointResponse) => {
        if (![200, 201].includes(endpointResponse.status) && otherOptions?.failOnStatusCode !== false) {
          throw new Error(
            `Unexpected status ${endpointResponse.status} calling endpoint:\t${requestDetails.url}\n\nResponse:\n${JSON.stringify(endpointResponse.body, null, 2)}`,
          );
        }

        return cy.wrap(endpointResponse);
      });
  },
);

Cypress.Commands.add('addToLocalStorage', (key: string, value: string) => {
  window.localStorage.setItem(key, value);
});

Cypress.Commands.add('removeFromLocalStorage', (key: string) => {
  window.localStorage.removeItem(key);
});

Cypress.Commands.add('verifyStatusCode', (apiResponseVariable: any, statusCode: number) => {
  cy.step(`Verify status code: ${statusCode} is returned`);
  cy.get(apiResponseVariable).its('status').should('equal', statusCode);
});

const verifyErrors = (
  apiResponseVariable: any,
  fieldName: FieldList,
  errorType: 'required' | 'empty' | 'validEmail',
) => {
  const messages = {
    required: 'is required',
    empty: 'is not allowed to be empty',
    validEmail: 'must be a valid email',
  };

  const fields = Array.isArray(fieldName) ? fieldName : [fieldName];
  const expectedErrors = fields.map((field) => ({
    key: field,
    message: `"${field}" ${messages[errorType]}`,
  }));

  cy.spok(apiResponseVariable, {
    errors: (receivedErrors: JsonObject[]) =>
      expectedErrors.every((expected) =>
        receivedErrors.some(
          (received) => received.key === expected.key && received.message === expected.message,
        ),
      ),
  });
};

Cypress.Commands.add('verifyFieldIsRequired', (apiResponseVariable: any, fieldName: FieldList) => {
  verifyErrors(apiResponseVariable, fieldName, 'required');
});

Cypress.Commands.add('verifyFieldCantBeEmpty', (apiResponseVariable: any, fieldName: FieldList) => {
  verifyErrors(apiResponseVariable, fieldName, 'empty');
});

Cypress.Commands.add('verifyEmailMustBeValid', (apiResponseVariable: any, fieldName: FieldList) => {
  verifyErrors(apiResponseVariable, fieldName, 'validEmail');
});

// thin wrapper around cy-spok that also unwraps a cy.get('@alias') response for you
Cypress.Commands.add('spok', (dataObjectOrAlias: any, expectedAssertion: any) => {
  const verify = (dataObject: JsonObject) => {
    const responseBody = Cypress._.get(dataObject, 'body', dataObject);
    cy.wrap(responseBody).should(spok(expectedAssertion));
  };

  if (typeof dataObjectOrAlias === 'string' && dataObjectOrAlias.startsWith('@')) {
    cy.get(dataObjectOrAlias).then(verify);
  } else {
    verify(dataObjectOrAlias);
  }
});
