---
title: Nx Enforce Module Boundaries — Tags e Regras de Dependência
impact: CRITICAL
impactDescription: sem boundaries, features acoplam entre si e o monorepo vira um monolito distribuído
tags: nx, boundaries, tags, dependencies, enforce-module-boundaries, eslint
---

## Nx Enforce Module Boundaries — Tags e Regras de Dependência

### Hierarquia de Dependência por `type` (REGRA PRINCIPAL)

O fluxo de dependência entre tipos é **unidirecional e estrito**. Existem 3 camadas:

```
┌─────────────────────────────────────────────────────────┐
│  Camada APP (deployáveis)                               │
│  type:spa · type:mf · type:ssr · type:api · type:lambda │
│                                                         │
│  ✅ Pode importar → type:feature, type:shared           │
│  ❌ NÃO importa de outros apps                          │
│     (spa ↛ spa, spa ↛ ssr, mf ↛ api, etc.)             │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Camada FEATURE (bounded contexts)                      │
│  type:feature                                           │
│                                                         │
│  ✅ Pode importar → type:shared                         │
│  ❌ NÃO importa de apps                                 │
│  ❌ NÃO importa de outras features                      │
│     (feature ↛ feature)                                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Camada SHARED (utilitários e libs base)                │
│  type:shared                                            │
│                                                         │
│  ✅ Pode importar → type:shared (entre si)              │
│  ❌ NÃO importa de apps                                 │
│  ❌ NÃO importa de features                             │
└─────────────────────────────────────────────────────────┘
```

#### Tabela de Permissões por `type`

| Source | Pode importar de | NÃO pode importar de |
|--------|-------------------|----------------------|
| `type:spa` | `type:feature`, `type:shared` | `type:spa`, `type:mf`, `type:ssr`, `type:api`, `type:lambda` |
| `type:mf` | `type:feature`, `type:shared` | `type:spa`, `type:mf`, `type:ssr`, `type:api`, `type:lambda` |
| `type:ssr` | `type:feature`, `type:shared` | `type:spa`, `type:mf`, `type:ssr`, `type:api`, `type:lambda` |
| `type:api` | `type:feature`, `type:shared` | `type:spa`, `type:mf`, `type:ssr`, `type:api`, `type:lambda` |
| `type:lambda` | `type:feature`, `type:shared` | `type:spa`, `type:mf`, `type:ssr`, `type:api`, `type:lambda` |
| `type:feature` | `type:shared` | `type:spa`, `type:mf`, `type:ssr`, `type:api`, `type:lambda`, `type:feature` |
| `type:shared` | `type:shared` | `type:spa`, `type:mf`, `type:ssr`, `type:api`, `type:lambda`, `type:feature` |

> Se duas features precisam colaborar, a composição acontece na camada de app.
> Se ambas precisam de um utilitário, ele pertence a `type:shared` (pasta `shared/`).

### Dimensões de Tags

Cada projeto declara tags no `project.json`. Use **apenas** os valores listados abaixo.

| Dimensão | Valores válidos | Propósito |
|----------|-----------------|-----------|
| `type` | `spa`, `mf`, `ssr`, `api`, `lambda`, `feature`, `shared` | Camada na hierarquia de dependência |
| `scope` | `host`, `mf`, `api`, `lambda`, `feature`, `shared` | Papel na arquitetura |
| `technology` | `frontend`, `backend`, `shared` | Isola stacks (multi-stack) |
| `domain` | `chat`, `billing`, `analytics`, ... | Bounded context de negócio |
| `framework` | `next`, `react`, `spring`, `python` | Contrato com o pipeline de CI/CD |

> **Tags que NÃO existem** — não invente tags:
> `type:app`, `type:lib`, `type:util`, `type:component`, `type:hook`,
> `scope:lib`, `scope:app`, `framework:agnostic`, `technology:node`.

A combinação de tags `framework` + `type` é usada pela action `detect-affected` para rotear cada app para o job de deploy correto (consulte `nx-actions-reference.md`).

#### Mapeamento Pasta → Tag `type`

| Pasta | Tag `type` | Exemplo |
|-------|-----------|---------|
| `apps/app-*` | `type:spa` ou `type:ssr` ou `type:mf` | `app-platform` → `type:ssr` |
| `apps/api-*` | `type:api` | `api-payments` → `type:api` |
| `apps/lambda-*` | `type:lambda` | `lambda-webhooks` → `type:lambda` |
| `packages/**/feature-*` | `type:feature` | `feature-chat-sidebar` → `type:feature` |
| `packages/**/shared/*` | `type:shared` | `shared/ui` → `type:shared` |

#### Exemplos de Tags

```jsonc
// --- Apps (Camada APP) ---

// apps/app-platform/project.json (Next.js SSR Host)
{ "tags": ["type:ssr", "scope:host", "framework:next"] }

// apps/app-agent/project.json (React Microfrontend)
{ "tags": ["type:mf", "scope:mf", "framework:react"] }

// apps/app-spa/project.json (React SPA)
{ "tags": ["type:spa", "scope:host", "framework:react"] }

// apps/api-payments/project.json (Spring Boot API)
{ "tags": ["type:api", "scope:api", "framework:spring"] }

// apps/lambda-webhooks/project.json (Python Lambda)
{ "tags": ["type:lambda", "scope:lambda", "framework:python"] }

// --- Features (Camada FEATURE) ---

// packages/frontend/feature-chat-sidebar/project.json
{ "tags": ["type:feature", "scope:feature", "technology:frontend", "domain:chat"] }

// packages/backend/feature-billing-engine/project.json
{ "tags": ["type:feature", "scope:feature", "technology:backend", "domain:billing"] }

// --- Shared (Camada SHARED) ---

// packages/frontend/shared/ui/project.json
{ "tags": ["type:shared", "scope:shared", "technology:frontend"] }

// packages/frontend/shared/i18n/project.json
{ "tags": ["type:shared", "scope:shared", "technology:frontend"] }

// packages/backend/shared/database/project.json
{ "tags": ["type:shared", "scope:shared", "technology:backend"] }

// packages/shared/types/project.json (cross-stack)
{ "tags": ["type:shared", "scope:shared", "technology:shared"] }
```

### Configuração ESLint (Multi-Stack)

```js
// eslint.config.js
import nxPlugin from "@nx/eslint-plugin"

export default [
  {
    plugins: { "@nx": nxPlugin },
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          "allow": [],
          "depConstraints": [
            // --- type: hierarquia APP → FEATURE → SHARED ---
            { "sourceTag": "type:spa",     "onlyDependOnLibsWithTags": ["type:feature", "type:shared"] },
            { "sourceTag": "type:mf",      "onlyDependOnLibsWithTags": ["type:feature", "type:shared"] },
            { "sourceTag": "type:ssr",     "onlyDependOnLibsWithTags": ["type:feature", "type:shared"] },
            { "sourceTag": "type:api",     "onlyDependOnLibsWithTags": ["type:feature", "type:shared"] },
            { "sourceTag": "type:lambda",  "onlyDependOnLibsWithTags": ["type:feature", "type:shared"] },
            { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:shared"] },
            { "sourceTag": "type:shared",  "onlyDependOnLibsWithTags": ["type:shared"] },

            // --- scope ---
            { "sourceTag": "scope:feature", "onlyDependOnLibsWithTags": ["scope:shared"] },
            { "sourceTag": "scope:shared",  "onlyDependOnLibsWithTags": ["scope:shared"] },

            // --- technology (multi-stack) ---
            { "sourceTag": "technology:frontend", "onlyDependOnLibsWithTags": ["technology:frontend", "technology:shared"] },
            { "sourceTag": "technology:backend",  "onlyDependOnLibsWithTags": ["technology:backend", "technology:shared"] },
            { "sourceTag": "technology:shared",   "onlyDependOnLibsWithTags": ["technology:shared"] }
          ]
        }
      ]
    }
  }
]
```

### Configuração ESLint (Single-Stack)

Sem dimensão `technology`:

```js
"depConstraints": [
  // --- type: hierarquia APP → FEATURE → SHARED ---
  { "sourceTag": "type:spa",     "onlyDependOnLibsWithTags": ["type:feature", "type:shared"] },
  { "sourceTag": "type:mf",      "onlyDependOnLibsWithTags": ["type:feature", "type:shared"] },
  { "sourceTag": "type:ssr",     "onlyDependOnLibsWithTags": ["type:feature", "type:shared"] },
  { "sourceTag": "type:api",     "onlyDependOnLibsWithTags": ["type:feature", "type:shared"] },
  { "sourceTag": "type:lambda",  "onlyDependOnLibsWithTags": ["type:feature", "type:shared"] },
  { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:shared"] },
  { "sourceTag": "type:shared",  "onlyDependOnLibsWithTags": ["type:shared"] },

  // --- scope ---
  { "sourceTag": "scope:feature", "onlyDependOnLibsWithTags": ["scope:shared"] },
  { "sourceTag": "scope:shared",  "onlyDependOnLibsWithTags": ["scope:shared"] }
]
```

### O Que Cada Regra Impede

Isolamento entre apps (app ↛ app):

```
❌ app-platform (type:ssr) → app-spa (type:spa)
❌ app-agent (type:mf) → app-platform (type:ssr)
❌ api-payments (type:api) → app-platform (type:ssr)
✅ app-platform (type:ssr) → feature-chat-sidebar (type:feature)
```

Acoplamento horizontal (feature ↛ feature):

```
❌ feature-chat-sidebar → feature-chat-messages
✅ app-platform → feature-chat-sidebar (composição na camada de app)
```

Dependência invertida (shared ↛ feature, feature ↛ app):

```
❌ shared-ui (type:shared) → feature-chat-sidebar (type:feature)
❌ feature-chat-sidebar (type:feature) → app-platform (type:ssr)
✅ feature-chat-sidebar → shared-ui
✅ app-platform → feature-chat-sidebar
```

Isolamento de stacks (multi-stack):

```
❌ feature-chat-sidebar (technology:frontend) → feature-billing-engine (technology:backend)
✅ feature-chat-sidebar (technology:frontend) → shared-ui (technology:frontend)
✅ feature-chat-sidebar (technology:frontend) → shared-types (technology:shared)
```
