export const isString = (value: unknown) => typeof value === 'string';
export const isNumber = (value: unknown) => typeof value === 'number';
export const isBoolean = (value: unknown) => typeof value === 'boolean';
export const isArray = (value: unknown) => Array.isArray(value);

// matches loose ISO-8601, good enough for API date-string assertions
export const isIsoDateString = (value: unknown) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));
