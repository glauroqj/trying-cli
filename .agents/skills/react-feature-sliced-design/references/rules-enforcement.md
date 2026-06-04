---
title: Enforcement Automatizado — ESLint, Nx Boundaries e CI
impact: HIGH
impactDescription: sem enforcement automatizado, regras de arquitetura são violadas no primeiro deadline apertado
tags: architecture, enforcement, eslint, nx-boundaries, ci, automation
---

## Enforcement Automatizado

Regras de arquitetura sem enforcement são sugestões. Sugestões são violadas. Use ESLint e Nx boundaries para garantir que as regras sejam respeitadas automaticamente.

### ESLint — SPA

Proíbe imports cruzados entre features e acesso a internos:

```js
// eslint.config.js
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        // Proíbe acesso a internos de features
        {
          group: [
            '@/features/*/components/*',
            '@/features/*/hooks/*',
            '@/features/*/context/*',
            '@/features/*/domain/*',
          ],
          message: 'Importe apenas da public API da feature (index.ts).'
        },
        // Proíbe features importando de app/
        {
          group: ['@/app/*'],
          message: 'Features não podem importar de app/. Use shared/ ou props do Provider.'
        }
      ]
    }]
  }
}
```

Para enforcement mais granular (proibir imports cruzados entre features específicas), use `eslint-plugin-boundaries`:

```js
// eslint.config.js com eslint-plugin-boundaries
import boundaries from 'eslint-plugin-boundaries'

export default [
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/*' },
        { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
        { type: 'module', pattern: 'src/modules/*', capture: ['module'] },
        { type: 'shared', pattern: 'src/shared/*' },
      ],
    },
    rules: {
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          // app pode importar de features, modules e shared
          { from: 'app', allow: ['feature', 'module', 'shared'] },
          // features podem importar de shared
          { from: 'feature', allow: ['shared'] },
          // modules podem importar de shared
          { from: 'module', allow: ['shared'] },
          // shared pode importar de shared
          { from: 'shared', allow: ['shared'] },
        ],
      }],
      'boundaries/no-private': ['error', {
        allowUncategorized: false,
      }],
    },
  },
]
```

### Nx Boundaries — Monorepo

No monorepo, use tags Nx para enforcement de boundaries entre pacotes:

```json
// packages/frontend/feature-checkout/project.json
{
  "tags": ["type:feature", "scope:checkout", "technology:frontend"]
}
```

```json
// packages/frontend/shared/ui/project.json
{
  "tags": ["type:shared", "scope:ui", "technology:frontend"]
}
```

```js
// eslint.config.js — Nx boundary rules
{
  rules: {
    '@nx/enforce-module-boundaries': ['error', {
      depConstraints: [
        // Features só dependem de shared
        {
          sourceTag: 'type:feature',
          onlyDependOnLibsWithTags: ['type:shared']
        },
        // Modules só dependem de shared
        {
          sourceTag: 'type:module',
          onlyDependOnLibsWithTags: ['type:shared']
        },
        // Shared só depende de shared
        {
          sourceTag: 'type:shared',
          onlyDependOnLibsWithTags: ['type:shared']
        },
        // Apps dependem de features, modules e shared
        {
          sourceTag: 'type:app',
          onlyDependOnLibsWithTags: ['type:feature', 'type:module', 'type:shared']
        },
      ],
    }],
  },
}
```

Para configuração completa de tags e boundaries no Nx, consulte a documentação oficial do Nx.

### Validação no CI

Adicione verificação de boundaries no pipeline de CI para bloquear PRs que violam as regras:

```yaml
# .github/workflows/ci.yml
- name: Lint (inclui boundary checks)
  run: pnpm lint

- name: Nx boundary check
  run: npx nx run-many --target=lint --all
```

### Checklist de Enforcement

- [ ] ESLint `no-restricted-imports` configurado para proibir acesso a internos de features
- [ ] ESLint `eslint-plugin-boundaries` ou Nx boundaries configurado para proibir imports cruzados
- [ ] CI valida lint em cada PR
- [ ] Novas features seguem a convenção de tags (monorepo)


