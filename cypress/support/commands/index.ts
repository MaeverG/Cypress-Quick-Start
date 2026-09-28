export * from './supportCommands/supportCommands';

// auto-registers every command file below this folder — add a new file, no manual wiring
// @ts-ignore
const context = require.context('./', true, /\.ts$/);
// @ts-ignore
context.keys().forEach(context);
