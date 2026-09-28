import { OtherOptions, Payload } from '@/types/index';

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      loginAPI(payload?: Payload, otherOptions?: OtherOptions): Chainable<any>;
    }
  }
}
