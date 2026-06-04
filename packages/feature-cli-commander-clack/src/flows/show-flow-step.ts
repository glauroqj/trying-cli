import * as p from '@clack/prompts';
import color from 'picocolors';
import { formatFlowStepBanner, getFlowStep } from '@trying-cli/agents-core';
import type { FlowStepId } from '@trying-cli/agents-core';

/**
 * Displays a contextual header before each wizard step using p.note.
 * The title shows "Passo N de 6 — Título" and the message contains
 * the longer heading plus an optional dim hint.
 */
export function showFlowStep(id: FlowStepId): void {
  const step = getFlowStep(id);
  const lines: string[] = [step.heading];
  if (step.hint) lines.push(color.dim(step.hint));
  p.note(lines.join('\n'), color.cyan(formatFlowStepBanner(id)));
}
