import React from 'react';
import { render } from 'ink';
import { App } from './app/App.js';

export function runInkUi(): void {
  if (!process.stdin.isTTY) {
    console.log('Agents CLI requer um terminal interativo (TTY).');
    process.exit(1);
  }
  render(<App />);
}
