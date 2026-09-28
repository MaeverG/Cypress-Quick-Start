import Chance from 'chance';

const chance = new Chance();

export const generateEmail = () => chance.email({ domain: 'example.com' });

export const generateFullName = () => chance.name();

export const generateTodoTitle = () => `Cypress ${chance.word({ length: 8 })} ${Date.now()}`;
