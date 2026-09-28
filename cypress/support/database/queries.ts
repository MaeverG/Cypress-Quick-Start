// SQL query builders — specs/commands call these directly to seed or assert DB state.
// Swap `public.users` / `public.todos` for your service's actual tables.

export const dbGetUserByEmail = (emailAddress: string) => {
  const query = `
    SELECT *
    FROM public.users
    WHERE email_address = '${emailAddress}';
  `;

  return cy.executeQuery(query);
};

export const dbGetTodoById = (todoId: string) => {
  const query = `
    SELECT *
    FROM public.todos
    WHERE todo_id = '${todoId}';
  `;

  return cy.executeQuery(query);
};

export const dbDeleteTodoById = (todoId: string) => {
  const query = `
    DELETE FROM public.todos
    WHERE todo_id = '${todoId}';
  `;

  return cy.executeQuery(query);
};
