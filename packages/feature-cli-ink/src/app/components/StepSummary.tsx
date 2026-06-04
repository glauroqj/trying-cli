import React from 'react';
import { Box, Text } from 'ink';
import { getFlowStep } from '@trying-cli/agents-core';
import type { FlowStepId } from '@trying-cli/agents-core';

export type Answers = Partial<Record<FlowStepId, string>>;

const ORDERED_STEPS: FlowStepId[] = [
  'resourceKind',
  'source',
  'itemPick',
  'agentPick',
  'scope',
];

interface StepSummaryProps {
  answers: Answers;
  /** Current active step — shown with arrow marker */
  current: FlowStepId;
}

/**
 * Renders a persistent breadcrumb of completed wizard steps above the active prompt.
 * Completed steps show ✓ + selected value. The current step shows ▸.
 */
export function StepSummary({ answers, current }: StepSummaryProps) {
  const visible = ORDERED_STEPS.filter((id) => answers[id] !== undefined || id === current);
  if (visible.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="cyan" paddingX={1}>
      {visible.map((id) => {
        const meta = getFlowStep(id);
        const answer = answers[id];
        const isCurrent = id === current;

        return (
          <Box key={id} gap={1}>
            <Text color={isCurrent ? 'yellow' : 'green'}>
              {isCurrent ? '▸' : '✓'}
            </Text>
            <Text bold color={isCurrent ? 'yellow' : 'white'} dimColor={!isCurrent && !answer}>
              {meta.title.padEnd(12)}
            </Text>
            {answer ? (
              <Text color="cyan">{answer}</Text>
            ) : (
              <Text dimColor>…</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
