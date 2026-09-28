import { requestMethodList } from '@utils/index';
import { OtherOptions, Payload } from '@/types/index';

Cypress.Commands.add('postTodoCreate', (payload: Payload, otherOptions?: OtherOptions) => {
  return cy
    .sendRequest({ method: requestMethodList.POST, url: '/todos' }, payload, otherOptions ?? {})
    .as('postTodoCreateResponse');
});

Cypress.Commands.add('getTodoById', (todoId: string, otherOptions?: OtherOptions) => {
  return cy
    .sendRequest({ method: requestMethodList.GET, url: `/todos/${todoId}` }, undefined, otherOptions ?? {})
    .as('getTodoByIdResponse');
});

Cypress.Commands.add('patchTodoComplete', (todoId: string, otherOptions?: OtherOptions) => {
  return cy
    .sendRequest(
      { method: requestMethodList.PATCH, url: `/todos/${todoId}/complete` },
      undefined,
      otherOptions ?? {},
    )
    .as('patchTodoCompleteResponse');
});

Cypress.Commands.add('deleteTodoById', (todoId: string, otherOptions?: OtherOptions) => {
  return cy
    .sendRequest(
      { method: requestMethodList.DELETE, url: `/todos/${todoId}` },
      undefined,
      otherOptions ?? {},
    )
    .as('deleteTodoByIdResponse');
});
