import { FieldList, OtherOptions, Payload, RequestDetails } from '@/types/index';

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      sendRequest(
        requestDetails: RequestDetails,
        payload?: Payload,
        otherOptions?: OtherOptions,
      ): Chainable<any>;
      addToLocalStorage(key: string, value: string): Chainable<any>;
      removeFromLocalStorage(key: string): Chainable<any>;
      executeQuery(query: string): Chainable<any>;
      verifyStatusCode(apiResponseVariable: any, statusCode: number): void;
      verifyFieldIsRequired(apiResponseVariable: any, fieldName: FieldList): void;
      verifyFieldCantBeEmpty(apiResponseVariable: any, fieldName: FieldList): void;
      verifyEmailMustBeValid(apiResponseVariable: any, fieldName: FieldList): void;
      spok(dataObjectOrAlias: any, expectedAssertion: any): void;
    }
  }
}
