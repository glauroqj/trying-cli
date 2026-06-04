import type { TemplateInfo } from './types.js';

export const PROJECT_MARKERS = [
  'package.json',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'pom.xml',
] as const;

export const AVAILABLE_TEMPLATES: TemplateInfo[] = [
  {
    id: 'scaffold-skill',
    kind: 'skill',
    label: 'Scaffold Skill',
    description: 'SKILL.md com scripts/, references/ e assets/ (padrão Vercel)',
  },
  {
    id: 'scaffold-hook',
    kind: 'hook',
    label: 'Scaffold Hook',
    description: 'hooks.json para eventos do agente (Cursor)',
  },
];
