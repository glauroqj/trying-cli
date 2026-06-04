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
    prompt: 'List workspace projects and dry-run skill install.',
  },
  {
    id: 'cold-start',
    name: 'Cold Start',
    prompt: 'Measure smoke path through agents-core.',
  },
];
