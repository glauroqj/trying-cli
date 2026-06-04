import Pastel from 'pastel';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export async function run(): Promise<void> {
  const importMeta = import.meta;
  const app = new Pastel({
    importMeta,
    name: 'agents-pastel',
    version: '1.0.0',
  });
  await app.run();
}
