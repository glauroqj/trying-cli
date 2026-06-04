---
name: monorepo
description: >
  Guia de arquitetura, governança e CI/CD para Monorepos Nx.
  Cobre estrutura de pastas, naming, boundaries, CODEOWNERS, Dependabot,
  pipeline com GitHub Actions, affected, cache, release e deploy.
  Multi-stack via Technology Grouping Folders (frontend/, backend/).
  Golden path: Next.js (frontend), Java/Spring Boot (backend), Python (lambdas).
  Use ao criar, configurar, migrar ou manter monorepos com Nx e pnpm workspaces.
keywords:
  - monorepo
  - nx
  - pnpm
  - workspace
  - codeowners
  - governance
  - naming
  - technology-grouping
  - pipeline
  - ci-cd
  - deploy
  - cache
  - affected
  - release
  - microfrontend
  - github-actions
  - feature-branch
license: Apache-2.0
metadata:
  author: .
  version: "1.0"
---

# Monorepo — Arquitetura, Governança e CI/CD

Guia para desenvolvimento em Monorepo na. Baseado na estratégia de Monorepo Especializado com Nx. Em monorepos multi-stack, packages são organizados por Technology Grouping Folders (`packages/frontend/`, `packages/backend/`). Apps usam prefixos por stack (`app-*`, `api-*`, `lambda-*`). Packages de domínio usam prefixo `feature-*`.

## Quando Aplicar

Consulte esta skill ao:

- Criar a estrutura de um monorepo novo
- Definir naming de apps e packages
- Configurar CODEOWNERS e ownership de times
- Configurar boundaries entre projetos no Nx
- Configurar Dependabot para múltiplos projetos
- Configurar pipeline de CI/CD para um monorepo
- Adicionar deploy de um novo framework ao pipeline
- Debugar falhas no pipeline (cache, affected, release)
- Configurar Tailwind centralizado para projetos frontend
- Configurar variáveis de ambiente para apps e libs
- Configurar feature branch deploy para uma app ou monorepo
- Adicionar nova app ao pipeline de feature branch existente

## Referências

### Arquitetura e Governança

| Reference               | Foco                                                                                                              | Impacto  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| `monorepo-architecture` | Camadas (Config/Infra/Packages/Apps), Technology Grouping Folders, bounded contexts, fluxo de dependência         | CRITICAL |
| `monorepo-naming`       | Prefixos `app-*`/`api-*`/`lambda-*`/`feature-*`, Technology Grouping Folders, exemplos multi-stack e single-stack | CRITICAL |
| `monorepo-codeowners`   | Modelo de ownership, Repository Owner Team, precedência, branch protection, boas práticas, configuração por stack | HIGH     |
| `monorepo-dependabot`   | Configuração multi-projeto (npm, maven, pip, github-actions), agrupamento de PRs, alinhamento com CODEOWNERS      | MEDIUM   |

### Frontend

| Reference              | Foco                                                                                           | Impacto |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ------- |
| `frontend-tailwind`    | Tailwind centralizado na app, @source para packages, preset Cosmos DS, IntelliSense            | HIGH    |
| `frontend-environment` | Variáveis de ambiente, environmentStore Zustand, config por ambiente nas libs, Rsbuild loadEnv | HIGH    |

### Feature Branch

| Reference                    | Foco                                                                                                                                                 | Impacto |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `feature-branch-app-setup`   | Configuração por app: Dockerfile, feature.yml (Helm), nginx.conf, project.json (configuration feature), env/.feature                                 | HIGH    |
| `feature-branch-cicd-setup`  | Configuração do workflow CI/CD: jobs (detect-apps, build-and-deploy), base-module como step, branches trigger, concurrency, secrets, troubleshooting | HIGH    |
| `nx-workflow-feature-branch` | Workflow completo de referência para deploy de feature branches (Docker + Helm) com URL dinâmica por branch                                          | HIGH    |

### Nx — Tooling e Pipeline

| Reference               | Foco                                                                                                                                                                  | Impacto  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `nx-boundaries`         | Tags por dimensão (type, scope, technology, domain, framework), configuração ESLint, regras de isolamento                                                             | CRITICAL |
| `nx-actions-reference`  | Inputs, outputs e comportamento de cada action (setup-pnpm, setup-nx-cache, detect-affected com refinamento SPA/MF/SSR, release-version, upload-artifacts, deploy S3) | HIGH     |
| `nx-workflow-react-mf`  | Workflow completo de referência para deploy de Micro Frontends React (S3/CloudFront)                                                                                  | HIGH     |
| `nx-workflow-react-spa` | Workflow completo de referência para deploy de SPAs React (S3/CloudFront)                                                                                             | HIGH     |

## Nx Actions — Visão Geral do Pipeline

```
-Org/actions/
├── nx/
│   ├── setup-pnpm/            # Configura pnpm no runner
│   ├── setup-nx-cache/        # Cache do pnpm store + .nx/cache
│   ├── detect-affected/       # Detecta projetos afetados, separa por framework e tipo de deploy
│   ├── release-version/       # Semantic versioning + git tags
│   └── upload-artifacts/      # Upload de dist para job de deploy
├── s3/
│   ├── spa/
│   │   ├── deploy/            # Deploy de SPA para S3 + CloudFront
│   │   └── rollback/          # Rollback de SPA
│   └── microfrontend/
│       ├── deploy/            # Deploy de MF para S3 + CloudFront
│       └── rollback/          # Rollback de MF
└── codeartifact/              # Configura .npmrc para registry privado
```

### Fluxo do Pipeline

```
push em main
  │
  ├─ Job 1: Detect, Build & Tag
  │     ├─ checkout (fetch-depth: 0, fetch-tags: true)
  │     ├─ setup-node + codeartifact (.npmrc)
  │     ├─ setup-pnpm → setup-nx-cache → pnpm install
  │     ├─ detect-affected → outputs: has_{type}, {type}_dirs (spa, mf, ssr, react)
  │     ├─ nx affected -t build:{env} (condicional por framework)
  │     ├─ release-version → semantic version + git tags
  │     └─ upload-artifacts → dist de cada app
  │
  └─ Job 2: Deploy (matrix por app, fail-fast: false)
        ├─ sparse-checkout (apenas package.json)
        ├─ download artifacts
        └─ deploy action (varia por framework)
```

### Deploy por Framework e Tipo

| Tags                           | Tipo                | Deploy          | Action                    | Workflow                                                                                |
| ------------------------------ | ------------------- | --------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| `framework:react` + `type:spa` | React SPA           | S3 + CloudFront | `s3/spa/deploy`           | `nx-workflow-react-spa`                                                                 |
| `framework:react` + `type:mf`  | React Microfrontend | S3 + CloudFront | `s3/microfrontend/deploy` | `nx-workflow-react-mf`                                                                  |
| `feature/**` branches          | Feature Branch      | Docker + Helm   | `docker` + `helm`         | `feature-branch-app-setup` + `feature-branch-cicd-setup` + `nx-workflow-feature-branch` |
| `framework:next` + `type:ssr`  | Next.js SSR         | Docker + Helm   | 🚧 Em construção          | —                                                                                       |
| `framework:spring`             | Spring Boot API     | Docker + Helm   | 🚧 Em construção          | —                                                                                       |
| `framework:python`             | AWS Lambda          | Lambda deploy   | 🚧 Em construção          | —                                                                                       |

## Ordem de Leitura Recomendada

1. `monorepo-architecture` — camadas e Technology Grouping Folders
2. `monorepo-naming` — convenção de naming
3. `nx-boundaries` — tags e enforcement de boundaries
4. `monorepo-codeowners` — ownership e governança
5. `frontend-tailwind` — Tailwind centralizado para projetos frontend
6. `frontend-environment` — variáveis de ambiente para apps e libs
7. `nx-actions-reference` — actions do pipeline
8. `nx-workflow-react-mf` — workflow completo de deploy de MFs
9. `nx-workflow-react-spa` — workflow completo de deploy de SPAs
10. `feature-branch-app-setup` — configuração por app para feature branch
11. `feature-branch-cicd-setup` — configuração do CI/CD para feature branch
12. `nx-workflow-feature-branch` — workflow completo de referência para feature branches
13. `monorepo-dependabot` — gestão de dependências
