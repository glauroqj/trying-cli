import React from 'react';
import { render } from 'ink';
import { PastelApp } from '../app/PastelApp.js';

/** Comando default do Pastel — delega ao wizard Ink (file-based routing). */
export default function Index() {
  render(<PastelApp />);
  return null;
}
