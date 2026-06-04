---
title: Convenção de Stack e Naming
impact: CRITICAL
impactDescription: sem convenção clara, times confundem apps com packages e a estrutura perde legibilidade
tags: monorepo, naming, convention, frontend, backend, serverless, multi-stack
---

## Convenção de Stack e Naming

Para a estrutura de pastas e Technology Grouping Folders, consulte `monorepo-architecture.md`.

### Apps (deployáveis)

Diferenciação por prefixo:

| Prefixo | Stack | Exemplo |
|---------|-------|---------|
| `app-*` | Frontend | `app-platform`, `app-insights` |
| `api-*` | Backend | `api-payments`, `api-billing` |
| `lambda-*` | Serverless | `lambda-notifications`, `lambda-webhooks` |

### Packages (reutilizáveis)

Diferenciação pela pasta (Technology Grouping Folder), não por prefixo:

| Contexto | Estrutura | Exemplo |
|----------|-----------|---------|
| Multi-stack (frontend) | `packages/frontend/feature-*` | `frontend/feature-chat-sidebar` |
| Multi-stack (backend) | `packages/backend/feature-*` | `backend/feature-billing-engine` |
| Multi-stack (cross) | `packages/shared/*` | `shared/types` |
| Single-stack | `packages/feature-*` | `feature-chat-conversations` |

O prefixo `feature-*` diferencia packages de domínio dos utilitários em `shared/`.

### Exemplo: Multi-Stack

| Projeto | Nome | Justificativa |
|---------|------|---------------|
| Frontend SSR Host | `app-platform` | `app-*` = frontend |
| Backend API | `api-payments` | `api-*` = backend |
| Serverless | `lambda-notifications` | `lambda-*` = serverless |
| Package frontend | `frontend/feature-chat-sidebar` | Pasta = stack, `feature-*` = domínio |
| Package backend | `backend/feature-billing-engine` | Pasta = stack, `feature-*` = domínio |
| Shared cross-stack | `shared/types` | Utilitário transversal |

### Exemplo: Single-Stack (Frontend)

| Projeto | Nome |
|---------|------|
| App agentes | `app-agent` |
| Package domínio | `feature-chat-conversations` |
| Shared UI | `shared/ui` |

### Exemplo: Single-Stack (Backend)

| Projeto | Nome |
|---------|------|
| API pagamentos | `api-payments` |
| Serverless | `lambda-webhooks` |
| Package domínio | `feature-payment-engine` |
| Shared database | `shared/database` |
