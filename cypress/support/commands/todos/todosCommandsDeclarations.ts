import { OtherOptions, Payload } from '@/types/index';

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      postTodoCreate(payload: Payload, otherOptions?: OtherOptions): Chainable<any>;
      getTodoById(todoId: string, otherOptions?: OtherOptions): Chainable<any>;
      patchTodoComplete(todoId: string, otherOptions?: OtherOptions): Chainable<any>;
      deleteTodoById(todoId: string, otherOptions?: OtherOptions): Chainable<any>;
    }
  }
}
