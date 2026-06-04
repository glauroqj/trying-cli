import type { ResourcePackage } from './types.js';

/**
 * Curated skill packages bundled in agents-core (MVP).
 * Items from vercel-labs/agent-skills match the live catalog retrieved via
 * `npx skills add vercel-labs/agent-skills --list`.
 * Phase 2: fetch from git at runtime.
 */
export const SKILL_PACKAGES: ResourcePackage[] = [
  {
    id: 'vercel-labs/agent-skills',
    label: 'Vercel Labs — Agent Skills',
    kind: 'skill',
    source: {
      type: 'registry',
      id: 'vercel-labs/agent-skills',
      label: 'Vercel Labs (vercel-labs/agent-skills)',
      description: 'Catálogo oficial de skills da Vercel — React, Next.js, deploy e muito mais',
    },
    items: [
      {
        id: 'vercel-react-best-practices',
        label: 'React Best Practices',
        description: 'Padrões de performance React/Next.js da equipe Vercel Engineering',
      },
      {
        id: 'vercel-composition-patterns',
        label: 'Composition Patterns',
        description: 'Padrões de composição React escaláveis (compound components, render props, React 19)',
      },
      {
        id: 'vercel-react-view-transitions',
        label: 'View Transitions',
        description: 'Animações suaves com a View Transition API e <ViewTransition>',
      },
      {
        id: 'vercel-react-native-skills',
        label: 'React Native / Expo',
        description: 'Boas práticas de performance para apps mobile com React Native e Expo',
      },
      {
        id: 'deploy-to-vercel',
        label: 'Deploy to Vercel',
        description: 'Automatiza deploy de aplicações na Vercel',
      },
      {
        id: 'vercel-cli-with-tokens',
        label: 'Vercel CLI with Tokens',
        description: 'Deploy via Vercel CLI com autenticação por token (sem login interativo)',
      },
      {
        id: 'vercel-optimize',
        label: 'Vercel Optimize',
        description: 'Recomendações de custo e performance para projetos hospedados na Vercel',
      },
      {
        id: 'web-design-guidelines',
        label: 'Web Design Guidelines',
        description: 'Auditoria de UI/UX, acessibilidade e boas práticas de interface',
      },
      {
        id: 'writing-guidelines',
        label: 'Writing Guidelines',
        description: 'Revisão de documentação: tom, voz e guia de escrita técnica',
      },
    ],
  },
  {
    id: 'agents-cli/built-in',
    label: 'Agents CLI — Built-in',
    kind: 'skill',
    source: {
      type: 'bundled',
      id: 'agents-cli/built-in',
      label: 'Built-in (Agents CLI)',
      description: 'Skills bundled no Agents CLI — scaffold e templates locais',
    },
    items: [
      {
        id: 'scaffold-skill',
        label: 'Scaffold Skill',
        description: 'SKILL.md com scripts/, references/ e assets/ — padrão Vercel Agent Resources',
      },
    ],
  },
];

export function getSkillPackages(): ResourcePackage[] {
  return SKILL_PACKAGES;
}

export function findSkillPackage(packageId: string): ResourcePackage | undefined {
  return SKILL_PACKAGES.find((p) => p.id === packageId);
}
