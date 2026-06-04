---
title: CODEOWNERS — Ownership, Governança e Configuração por Stack
impact: HIGH
impactDescription: sem ownership claro, PRs são revisados por pessoas sem contexto e a governança do monorepo se perde
tags: codeowners, ownership, governance, teams, best-practices, multi-stack, github
---

## CODEOWNERS — Ownership, Governança e Configuração por Stack

O CODEOWNERS define quem é responsável por cada parte do código e garante que PRs sejam revisados pelas pessoas certas, automaticamente.

### O Repository Owner Team

Todo monorepo precisa de um time dono do repositório. Esse time não é dono do negócio de cada app — ele é dono da infraestrutura do monorepo: pipelines, padrões, configurações globais, shared libraries e governança.

| Contexto do Monorepo | Repository Owner Team |
|----------------------|----------------------|
| Plataforma (múltiplos domínios, um produto) | Time de Plataforma |
| Produto com variações (core + apps customizadas) | Time de Platform do produto |
| Produto com múltiplos serviços (APIs da mesma experiência) | Time de Platform do produto |

O monorepo deve ter um propósito claro que justifique a coexistência dos projetos. Se não existe um time que naturalmente cuida da coesão do repositório, os projetos provavelmente não deveriam estar juntos.

Responsabilidades: padrões e convenções, pipelines e CI/CD, shared libraries, generators, onboarding, governança, suporte.
O que NÃO faz: não é dono do código de negócio, não aprova PRs de features de outros times (exceto shared), não decide roadmap de produto.

### Onde Colocar

```
.github/CODEOWNERS    ← recomendado (junto com workflows)
```

### Precedência (Last Match Wins)

O GitHub processa de cima para baixo. O último padrão que faz match vence:

```
*                                @org/repo-owner-team
/packages/                       @org/repo-owner-team
/packages/feature-checkout/      @org/team-alpha   # ← vence para este path
```

### Anatomia para Monorepo

```
# .github/CODEOWNERS

# ── FALLBACK GLOBAL ──
*                                @org/repo-owner-team

# ── CONFIGURAÇÃO GLOBAL ──
/nx.json                         @org/repo-owner-team
/pnpm-workspace.yaml             @org/repo-owner-team
/tsconfig.base.json              @org/repo-owner-team
/eslint.config.*                 @org/repo-owner-team

# ── CI/CD ──
/.github/workflows/              @org/repo-owner-team
/.github/CODEOWNERS              @org/repo-owner-team

# ── TOOLS ──
/tools/                          @org/repo-owner-team

# ── SHARED LIBRARIES ──
/packages/shared/                @org/repo-owner-team

# ── PACKAGES (domínios) ──
/packages/feature-checkout/      @org/team-alpha
/packages/feature-analytics/     @org/team-beta

# ── APPS ──
/apps/app-platform/              @org/team-alpha
/apps/app-insights/              @org/team-beta
```

### Configuração Multi-Stack (Frontend + Backend + Serverless)

Em monorepos multi-stack, o CODEOWNERS reflete os Technology Grouping Folders:

```
# ── FALLBACK ──
*                                             @org/platform-x-team

# ── FRONTEND (apps) ──
/apps/app-platform/                           @org/frontend-team-alpha
/apps/app-insights/                           @org/frontend-team-beta

# ── BACKEND (apps) ──
/apps/api-payments/                           @org/backend-team-alpha
/apps/api-billing/                            @org/backend-team-beta

# ── BACKEND (lambdas) ──
/apps/lambda-notifications/                   @org/backend-team-alpha

# ── FRONTEND (packages) ──
/packages/frontend/feature-chat-sidebar/      @org/frontend-team-alpha
/packages/frontend/feature-analytics-widget/  @org/frontend-team-beta
/packages/frontend/shared/                    @org/platform-x-team

# ── BACKEND (packages) ──
/packages/backend/feature-billing-engine/     @org/backend-team-beta
/packages/backend/shared/                     @org/platform-x-team

# ── SHARED (cross-stack) ──
/packages/shared/                             @org/platform-x-team

# ── CONTRATOS DE API ──
**/*.graphql                                  @org/platform-x-team
**/*.proto                                    @org/platform-x-team
```

### Configuração Single-Stack (Frontend)

```
*                                       @org/chat-platform
/apps/app-agent/                        @org/team-agent
/apps/app-insights/                     @org/team-insights
/packages/feature-chat-conversations/   @org/chat-platform
/packages/feature-chat-messages/        @org/team-agent
/packages/shared/                       @org/chat-platform
```

### Configuração Single-Stack (Backend)

```
*                                       @org/checkout-platform
/apps/api-payments/                     @org/team-payments
/apps/api-billing/                      @org/team-billing
/apps/lambda-webhooks/                  @org/team-payments
/packages/feature-payment-engine/       @org/team-payments
/packages/shared/                       @org/checkout-platform
```

### Branch Protection (Enforcement)

CODEOWNERS por si só apenas sugere reviewers. Para enforcement real:

```
GitHub → Settings → Branches → Branch protection rules → main

✅ Require a pull request before merging
✅ Require approvals (mínimo 1)
✅ Require review from Code Owners
✅ Do not allow bypassing the above settings
```

### Boas Práticas

```
# ❌ Errado: indivíduo como owner
/packages/feature-checkout/              @john-doe

# ✅ Correto: time como owner
/packages/feature-checkout/              @org/team-alpha
```

```
# ❌ Errado: um time para tudo
*                                @org/all-engineering

# ✅ Correto: fallback + owners granulares
*                                @org/repo-owner-team
/apps/app-platform/              @org/team-alpha
```

```
# ❌ Errado: 4 times para um diretório (responsabilidade diluída)
/packages/feature-checkout/  @org/team-alpha @org/team-beta @org/platform @org/devops

# ✅ Correto: owner primário claro
/packages/feature-checkout/  @org/team-alpha
```

```
# ❌ Errado: sem contexto
/packages/shared/                @org/repo-owner-team

# ✅ Correto: com comentário explicativo
# Shared libraries têm impacto transversal. Alterações exigem
# revisão do repo-owner-team para compatibilidade e versionamento.
/packages/shared/                @org/repo-owner-team
```

### Anti-Pattern: Monorepo sem Propósito Compartilhado

```
# ❌ Errado: APIs que não compartilham propósito
monorepo/
├── apps/api-payments/           # Produto: Checkout
├── apps/api-content/            # Produto: CMS
├── apps/api-analytics/          # Produto: Dashboard interno
└── packages/shared/             # Shared de quem?

# ✅ Correto: monorepos agrupados por propósito/produto
checkout-monorepo/               # @org/checkout-platform
├── apps/api-payments/
├── apps/api-billing/
└── packages/shared/
```
