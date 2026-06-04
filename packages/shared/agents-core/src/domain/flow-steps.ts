export type FlowStepId =
  | 'mainAction'
  | 'resourceKind'
  | 'source'
  | 'itemPick'
  | 'agentPick'
  | 'scope'
  | 'folderBrowse'
  | 'installing'
  | 'done'
  | 'error';

export interface FlowStepMeta {
  stepNumber: number;
  totalSteps: number;
  title: string;
  heading: string;
  hint?: string;
}

const TOTAL_ADD_STEPS = 6;

const STEPS: Record<FlowStepId, FlowStepMeta> = {
  mainAction: {
    stepNumber: 1,
    totalSteps: TOTAL_ADD_STEPS,
    title: 'Ação',
    heading: 'O que você quer fazer?',
    hint: 'add · find · list · init',
  },
  resourceKind: {
    stepNumber: 2,
    totalSteps: TOTAL_ADD_STEPS,
    title: 'Tipo de recurso',
    heading: 'O que deseja instalar?',
    hint: 'Skill (SKILL.md) ou Hook (hooks.json)',
  },
  source: {
    stepNumber: 3,
    totalSteps: TOTAL_ADD_STEPS,
    title: 'Origem',
    heading: 'De qual pacote você quer instalar?',
  },
  itemPick: {
    stepNumber: 4,
    totalSteps: TOTAL_ADD_STEPS,
    title: 'Itens',
    heading: 'Quais itens do pacote deseja instalar?',
  },
  agentPick: {
    stepNumber: 5,
    totalSteps: TOTAL_ADD_STEPS,
    title: 'Agente',
    heading: 'Em qual agente instalar?',
    hint: 'Agentes detectados aparecem com ✓',
  },
  scope: {
    stepNumber: 6,
    totalSteps: TOTAL_ADD_STEPS,
    title: 'Escopo',
    heading: 'Onde instalar?',
    hint: 'Global = pasta nativa do agente  ·  Projeto = .agents/ + symlink',
  },
  folderBrowse: {
    stepNumber: 6,
    totalSteps: TOTAL_ADD_STEPS,
    title: 'Pasta do projeto',
    heading: 'Navegue até a pasta do projeto',
    hint: 'O conteúdo ficará em .agents/ (commitável) com symlink para o agente',
  },
  installing: {
    stepNumber: 6,
    totalSteps: TOTAL_ADD_STEPS,
    title: 'Instalação',
    heading: 'Copiando arquivos…',
  },
  done: {
    stepNumber: 6,
    totalSteps: TOTAL_ADD_STEPS,
    title: 'Concluído',
    heading: 'Instalação concluída com sucesso!',
  },
  error: {
    stepNumber: 6,
    totalSteps: TOTAL_ADD_STEPS,
    title: 'Erro',
    heading: 'Ocorreu um problema durante a instalação.',
  },
};

/** Canonical order of the add-flow wizard steps (excludes mainAction). */
export const ADD_FLOW_ORDER: FlowStepId[] = [
  'resourceKind',
  'source',
  'itemPick',
  'agentPick',
  'scope',
];

/** Returns the previous step in the add flow, or null if at the beginning. */
export function prevStep(id: FlowStepId): FlowStepId | null {
  const idx = ADD_FLOW_ORDER.indexOf(id);
  if (idx <= 0) return null;
  return ADD_FLOW_ORDER[idx - 1] ?? null;
}

export function getFlowStep(id: FlowStepId): FlowStepMeta {
  return STEPS[id];
}

export function formatFlowStepBanner(id: FlowStepId): string {
  const step = STEPS[id];
  return `Passo ${step.stepNumber} de ${step.totalSteps} — ${step.title}`;
}
