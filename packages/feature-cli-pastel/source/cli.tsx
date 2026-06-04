#!/usr/bin/env node
import Pastel from 'pastel';

const app = new Pastel({
  importMeta: import.meta,
  name: 'agents-pastel',
  version: '1.0.0',
});

await app.run();
