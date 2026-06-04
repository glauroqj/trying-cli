---
title: Estrutura de Pastas e Camadas de Responsabilidade
impact: CRITICAL
impactDescription: estrutura incorreta aumenta complexidade cognitiva e gera acoplamento entre camadas
tags: monorepo, folder-structure, layers, packages, apps, bounded-contexts
---

## Estrutura de Pastas e Camadas de Responsabilidade

### Camadas

| Camada | Pasta | Definição |
|--------|-------|-----------|
| Config | `/` | Regras de compilação, lint e teste herdadas por todos |
| Infra | `tools/` | Scripts que suportam o desenvolvimento |
| Packages | `packages/` | Blocos de construção e lógicas reutilizáveis |
| Apps | `apps/` | Aplicações deployáveis |

### Configuração Global (raiz)

Arquivos exigidos na raiz pelas ferramentas. Herdados via `extends` ou compostos via presets. Alterações aqui afetam todo o monorepo.

```
/
├── tsconfig.base.json
├── eslint.config.js
├── vitest.workspace.ts
├── nx.json
├── pnpm-workspace.yaml
├── .github/
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── workflows/
```

### Tools

Scripts auxiliares. O código da aplicação nunca importa de `tools/`.

```
tools/
├── generators/
│   └── feature-lib/
└── scripts/
    ├── ci-check.ts
    └── db-seed.ts
```

> Se você deletar `tools/`, o projeto ainda compila. Você apenas perde automações.

### Packages

Código importado por `apps/` ou por outros packages. Organização por bounded context (domínio), não por tipo técnico.

```
# ❌ Errado: organização por tipo técnico
packages/
├── components/
├── containers/
└── hooks/

# ✅ Correto: organização por bounded context
packages/
├── feature-chat-conversations/
├── feature-chat-messages/
├── feature-payment-form/
└── shared/
    ├── ui/
    ├── i18n/
    └── request/
```

#### Technology Grouping Folders (Multi-Stack)

Em monorepos multi-stack, frontend e backend não compartilham dependências. Misturar packages de stacks distintas gera confusão. A solução é agrupar por stack:

```
packages/
├── frontend/            # technology:frontend
│   ├── feature-chat-sidebar/
│   └── shared/
│       ├── ui/
│       └── i18n/
├── backend/             # technology:backend
│   ├── feature-billing-engine/
│   └── shared/
│       ├── api-client/
│       └── database/
└── shared/              # technology:shared (cross-stack, quando existir)
    └── types/
```

Vantagens:
- Sem prefixos de stack — a pasta já indica
- Cada stack tem seu próprio `shared/`
- Boundaries triviais via tag `technology:*` no Nx

Em monorepos single-stack, Technology Grouping Folders são desnecessários — packages ficam direto em `packages/`.

#### Pacotes Independentes

Cada shared é um pacote independente com seu próprio `package.json` (ou `pom.xml`):

```
# ❌ Errado: um único @packages/shared monolítico
# ✅ Correto: cada shared é um pacote independente
packages/frontend/shared/
├── ui/              # @packages/frontend-shared-ui
├── i18n/            # @packages/frontend-shared-i18n
└── testing/         # @packages/frontend-shared-testing
```

### Apps

Aplicações deployáveis que consomem `packages/`. Prefixo indica a stack (ver `monorepo-naming.md`).

```
apps/
├── app-platform/         # Frontend: SSR Host (Next.js)
├── app-insights/         # Frontend: Dashboard (Next.js)
├── api-payments/         # Backend: API (Java/Spring Boot)
├── lambda-notifications/ # Serverless (Python)
```

### Estrutura Completa (Multi-Stack)

```
/
├── tsconfig.base.json
├── eslint.config.js
├── vitest.workspace.ts
├── nx.json
├── pnpm-workspace.yaml
├── .github/
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── workflows/
│
├── apps/
│   ├── app-platform/        # Tags: framework:next, scope:host, type:ssr
│   ├── app-spa/             # Tags: framework:react, scope:host, type:spa
│   ├── app-agent/           # Tags: framework:react, scope:mf, type:mf
│   ├── api-payments/        # Tags: framework:spring, scope:api, type:api
│   └── lambda-webhooks/     # Tags: scope:lambda, type:lambda
│
├── packages/
│   ├── frontend/
│   │   ├── feature-chat-sidebar/  # Tags: technology:frontend, type:feature, domain:chat
│   │   └── shared/
│   │       ├── ui/
│   │       └── i18n/
│   ├── backend/
│   │   ├── feature-billing-engine/ # Tags: technology:backend, type:feature, domain:billing
│   │   └── shared/
│   │       ├── api-client/
│   │       └── database/
│   └── shared/              # Cross-stack
│       └── types/
│
└── tools/
    ├── generators/
    └── scripts/
```

### Fluxo de Dependência

A hierarquia é de 3 camadas, unidirecional e estrita: **APP → FEATURE → SHARED**.

```
apps/ (type:spa/mf/ssr/api/lambda) → packages/feature-* (type:feature)  ✅
apps/ (type:spa/mf/ssr/api/lambda) → packages/shared/*   (type:shared)  ✅
apps/ → apps/                                                            ❌
feature-* (type:feature) → shared/* (type:shared)                        ✅
feature-* → feature-*                                                    ❌
shared/*   → feature-*                                                   ❌
shared/*   → apps/                                                       ❌
packages/  → apps/                                                       ❌
packages/  → tools/                                                      ❌
```

Cada `feature-*` é um bounded context independente. Se duas features precisam colaborar, a composição acontece em `apps/`. Se ambas precisam de um utilitário, ele pertence a `shared/` (tag `type:shared`).

Para a tabela completa de permissões por tag, configuração ESLint e lista de tags válidas, consulte `nx-boundaries.md`.
