declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      loginUI(email?: string, password?: string): Chainable<any>;
    }
  }
}
