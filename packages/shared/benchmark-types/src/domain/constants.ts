import type { BenchmarkScenario } from './types.js';

export const DEFAULT_SCENARIOS: BenchmarkScenario[] = [
  {
    id: 'hello-world',
    name: 'Hello World',
    prompt: 'Respond with exactly: OK',
  },
  {
    id: 'list-files',
    name: 'List Files',
    prompt: 'List the files in the current directory (max 5 lines).',
  },
];
