import * as p from '@clack/prompts';
import color from 'picocolors';
import { getWelcomeContent } from '@trying-cli/agents-core';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const TRANSITION_FRAMES = ['▓▒░  ', ' ▓▒░ ', '  ▓▒░', '   ▓▒', '    ▓', '     '];

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function isCancel<T>(value: T | symbol): value is symbol {
  return typeof value === 'symbol';
}

/**
 * Displays an animated intro:
 *  1. Reveal brand name letter-by-letter with a spinning cursor.
 *  2. Short loading spinner ("Inicializando…").
 *  3. Show version + tagline, prompt "Pressione Enter para iniciar".
 *  4. Play a brief transition sweep before returning true.
 */
export async function showWelcomeScreen(): Promise<boolean> {
  const welcome = getWelcomeContent();
  const brand = welcome.brandName.toUpperCase();
  const WIDTH = 45;

  process.stdout.write('\n');

  // Phase 1 — Reveal brand name letter by letter
  for (let i = 0; i <= brand.length; i++) {
    const spinner = FRAMES[i % FRAMES.length]!;
    const revealed = color.cyan(color.bold(brand.slice(0, i)));
    const rest = color.dim(brand.slice(i));
    process.stdout.write(`\r  ${spinner} ${revealed}${rest}`);
    await sleep(55);
  }

  process.stdout.write('\n');
  console.log(color.cyan('  ' + '═'.repeat(WIDTH)));
  console.log(color.white(`  ${welcome.tagline}`));
  console.log(color.dim(`  v${welcome.version}`));
  console.log('');

  // Phase 2 — Loading spinner
  const spinner = p.spinner();
  spinner.start('Inicializando Agents CLI…');
  await sleep(700);
  spinner.stop(color.cyan('Pronto!'));
  console.log('');

  // Phase 3 — "Press Enter" prompt
  const proceed = await p.confirm({
    message: welcome.subtitle,
    initialValue: true,
  });

  if (isCancel(proceed) || !proceed) {
    p.cancel('Operação cancelada.');
    return false;
  }

  // Phase 4 — Transition sweep animation
  for (const frame of TRANSITION_FRAMES) {
    process.stdout.write(`\r  ${color.cyan(frame)}`);
    await sleep(60);
  }
  process.stdout.write('\r' + ' '.repeat(10) + '\r');

  return true;
}
