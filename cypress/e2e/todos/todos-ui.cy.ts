import { generateTodoTitle } from '@utils/index';

describe('Todos UI - List', { tags: ['@ui', '@todos'] }, () => {
  beforeEach(() => {
    cy.loginUI();
  });

  context('Positive Scenarios', { tags: '@positive' }, () => {
    it('Adds a todo from the UI and sees it in the list', () => {
      const title = generateTodoTitle();

      cy.get('[data-cy=todo-title-input]').type(title);
      cy.get('[data-cy=todo-add-button]').click();

      cy.contains('[data-cy=todo-list-item]', title).should('be.visible');
    });

    it('Marks a todo as complete', () => {
      const title = generateTodoTitle();

      cy.get('[data-cy=todo-title-input]').type(title);
      cy.get('[data-cy=todo-add-button]').click();

      cy.contains('[data-cy=todo-list-item]', title)
        .find('[data-cy=todo-complete-checkbox]')
        .click();

      cy.contains('[data-cy=todo-list-item]', title).should(
        'have.class',
        'todo-complete',
      );
    });
  });
});
