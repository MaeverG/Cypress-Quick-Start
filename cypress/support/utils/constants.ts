export const requestMethodList = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

export const dateFormatList = {
  US_SLASH: 'MM/DD/YYYY',
  SQL_DATE_TIME: 'YYYY-MM-DD HH:mm:ss',
} as const;

// getters (not static values) so a value always reflects whatever `before()` bootstrap put in Cypress.env
export const testUsers = {
  get systemUser() {
    return Cypress.env('testUsers').systemUser;
  },
  get password() {
    return Cypress.env('testUsers').password;
  },
};
