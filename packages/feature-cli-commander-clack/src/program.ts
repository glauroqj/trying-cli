import { Command } from 'commander';
import { runInteractiveFlow } from './flows/run-interactive.js';

export function createProgram(): Command {
  const program = new Command('agents-clack')
    .description('Agents CLI — Commander.js + Clack')
    .version('1.0.0');

  program
    .command('start')
    .description('Iniciar fluxo interativo')
    .action(async () => {
      await runInteractiveFlow();
    });

  program.action(async () => {
    await runInteractiveFlow();
  });

  return program;
}
