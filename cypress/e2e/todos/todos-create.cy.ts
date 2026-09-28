import { generateTodoTitle } from '@utils/index';
import { dbGetTodoById, dbDeleteTodoById } from '@queries/queries';

describe('Todos API - Create', { tags: ['@api', '@todos'] }, () => {
  context('Positive Scenarios', { tags: '@positive' }, () => {
    it('Creates a todo and persists it to the database', () => {
      const title = generateTodoTitle();

      cy.postTodoCreate({ title, status: 'PENDING' });
      cy.verifyStatusCode('@postTodoCreateResponse', 201);

      cy.spok('@postTodoCreateResponse', {
        success: true,
        data: { title, status: 'PENDING' },
      });

      cy.get('@postTodoCreateResponse')
        .its('body.data.todoId')
        .then((todoId) => {
          dbGetTodoById(todoId).then((dbTodo) => {
            expect(dbTodo.title).to.equal(title);
          });

          // clean up what this test created
          dbDeleteTodoById(todoId);
        });
    });
  });

  context('Negative Scenarios', { tags: '@negative' }, () => {
    it("title can't be empty", () => {
      cy.postTodoCreate({ title: '' }, { failOnStatusCode: false });
      cy.verifyStatusCode('@postTodoCreateResponse', 422);
      cy.verifyFieldCantBeEmpty('@postTodoCreateResponse', 'title');
    });

    it('title is required', () => {
      cy.postTodoCreate({}, { failOnStatusCode: false });
      cy.verifyStatusCode('@postTodoCreateResponse', 422);
      cy.verifyFieldIsRequired('@postTodoCreateResponse', 'title');
    });
  });
});
