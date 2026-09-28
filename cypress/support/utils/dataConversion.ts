// DB columns are snake_case; camelCase them so query results match API/fixture shapes.
export const convertKeysToCamelCase = (input: unknown): any => {
  if (Array.isArray(input)) {
    return input.map(convertKeysToCamelCase);
  }

  if (input !== null && typeof input === 'object') {
    return Object.entries(input as Record<string, unknown>).reduce(
      (result, [key, value]) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = convertKeysToCamelCase(value);
        return result;
      },
      {} as Record<string, unknown>,
    );
  }

  return input;
};
