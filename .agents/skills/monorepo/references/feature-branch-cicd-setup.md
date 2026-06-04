---
title: Feature Branch — Configuração do CI/CD
impact: HIGH
impactDescription: sem o workflow configurado corretamente, pushes em branches feature não disparam deploy automático
tags: monorepo, feature-branch, cicd, github-actions, workflow, docker, helm, pipeline
---

## Feature Branch — Configuração do CI/CD

Guia para configurar o workflow GitHub Actions de feature branch em um monorepo Nx. Para a configuração por app, consulte `feature-branch-app-setup.md`. Para o workflow completo de referência, consulte `nx-workflow-feature-branch.md`.

### Diferença Fundamental vs Staging/Production

| Aspecto          | Feature Branch                           | Staging/Production                  |
| ---------------- | ---------------------------------------- | ----------------------------------- |
| Detecção de apps | **Todas** (`ls apps/*/`)                 | Apenas affected (`detect-affected`) |
| Deploy target    | Docker + Helm (container)                | S3 + CloudFront (static)            |
| URL              | Dinâmica por branch                      | Fixa                                |
| Versionamento    | Não versiona                             | `release-version` (staging)         |
| Infra base       | `base-module` por app (step)             | Não precisa                         |
| Cleanup          | Automático (`branchReleaseCollapseTime`) | N/A                                 |

Feature branch builda **todas** as apps (não apenas affected) para garantir que tudo funciona junto no ambiente de teste.

### Estrutura do Workflow

O workflow `.github/workflows/feature.yml` tem 2 jobs:

```
push em feature/** / fix/** / refactor/**
  │
  ├─ Job 1: detect-apps
  │     └─ ls apps/*/ → JSON array de apps
  │
  └─ Job 2: build-and-deploy (matrix por app, depende de Job 1)
        ├─ base-module (infra — usa feature.yml da app)
        ├─ setup (node, pnpm, codeartifact, cache)
        ├─ build (TARGET_ENV=feature + APP_HOST dinâmico + nx run <app>:build:feature)
        ├─ docker build
        └─ helm deploy
```

### Job 1: detect-apps — Descoberta de Apps

Lista todas as apps em `apps/` e gera um JSON array para a matrix do job de build.

```yaml
detect-apps:
  name: Detect Apps
  runs-on: buildstaging
  outputs:
    apps: ${{ steps.list.outputs.apps }}
  steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: List all apps
      id: list
      run: |
        APPS=$(ls -d apps/*/ | xargs -I{} basename {} | jq -R -s -c 'split("\n") | map(select(. != ""))')
        echo "apps=$APPS" >> $GITHUB_OUTPUT
        echo "📋 Apps found: $APPS"
```

> Diferente de staging que usa `detect-affected`, feature branch lista **todas** as apps.

### Job 2: build-and-deploy — Build e Deploy por App

Executa em matrix: uma instância por app detectada no job 1.

```yaml
build-and-deploy:
  name: Feature — ${{ matrix.app }}
  runs-on: buildstaging
  needs: [detect-apps]
  strategy:
    fail-fast: false
    matrix:
      app: ${{ fromJson(needs.detect-apps.outputs.apps) }}
```

`fail-fast: false` garante que a falha de uma app não cancela o deploy das outras.

#### Step: base-module (Infra)

O `base-module` configura a infra (Terraform — namespace, ingress) usando o `feature.yml` **da app**, não da raiz do repo.

```yaml
- name: Base Module (Infra)
  uses: tryingcli-Org/actions/base-module@master
  with:
    gh-token: ${{ secrets.CI_GH_TOKEN }}
    pingdom-key: ${{ secrets.PINGDOM_API_TOKEN }}
    statping-key: ${{ secrets.STATPING_API_KEY }}
    newrelic-key: ${{ secrets.NEW_RELIC_API_KEY }}
    datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
    datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
    cloudflare-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    sentry-auth-token: ${{ secrets.SENTRY_AUTH_TOKEN }}
    mongodb_atlas_private_key: ${{ secrets.MONGODB_ATLAS_PRIVATE_KEY }}
    mongodb_atlas_public_key: ${{ secrets.MONGODB_ATLAS_PUBLIC_KEY }}
    file: apps/${{ matrix.app }}/feature.yml
    environment: staging
    cluster: buildstaging
    namespace: <namespace>
```

#### Steps de Setup

```yaml
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: 20

- name: Retrieve .npmrc
  uses: tryingcli-Org/actions/codeartifact@master
  with:
    npmrc: "${{ secrets.NPM_RC }}"

- name: Setup PNPM
  uses: tryingcli-Org/actions/nx/setup-pnpm@master

- name: Setup Cache
  uses: tryingcli-Org/actions/nx/setup-nx-cache@master
```

#### Step: Install Dependencies

```yaml
- name: Install Dependencies
  run: |
    echo "shamefully-hoist=true" >> .npmrc
    echo "strict-peer-dependencies=false" >> .npmrc
    echo "auto-install-peers=true" >> .npmrc
    pnpm install --frozen-lockfile
```

As flags extras no `.npmrc` são workarounds comuns em monorepos com dependências legadas:

- `shamefully-hoist=true` — hoist todas as dependências para a raiz (necessário para alguns bundlers)
- `strict-peer-dependencies=false` — não falha em conflitos de peer deps
- `auto-install-peers=true` — instala peer deps automaticamente

> Se o monorepo não tem problemas de peer deps ou hoisting, essas flags podem ser omitidas. Teste sem elas primeiro.

#### Step de Build (com APP_HOST dinâmico)

```yaml
- name: Build app
  env:
    TARGET_ENV: feature
  run: |
    BRANCH_NAME="${{ github.ref_name }}"
    CLEAN_BRANCH=$(echo "$BRANCH_NAME" | tr -cd '[:alnum:]\n' | tr '[:upper:]' '[:lower:]')
    export APP_HOST="${CLEAN_BRANCH}-<app>.buildstaging.com"
    echo "🎯 Building ${{ matrix.app }} for feature (host: $APP_HOST)..."
    pnpm nx run ${{ matrix.app }}:build:feature
```

O step faz duas coisas: `TARGET_ENV=feature` faz o bundler carregar `env/.feature`, e o `export APP_HOST` sobrescreve o valor estático do `.feature` com a URL dinâmica da branch. Isso é **obrigatório** — para detalhes de como funciona e por que, consulte a seção "APP_HOST dinâmico" em `feature-branch-app-setup.md`.

#### Steps de Docker e Deploy

```yaml
- name: Docker Build
  uses: tryingcli-Org/actions/docker@master
  with:
    file: apps/${{ matrix.app }}/feature.yml
    dockerfile: apps/${{ matrix.app }}/Dockerfile

- name: Deploy Feature
  uses: tryingcli-Org/actions/helm@master
  with:
    file: apps/${{ matrix.app }}/feature.yml
    environment: staging
    cluster: buildstaging
    namespace: <namespace>
```

Todos os 3 steps (base-module, docker, helm) usam o mesmo `file: apps/${{ matrix.app }}/feature.yml`.

### Branches Trigger

```yaml
on:
  push:
    branches:
      - feature/**
      - refactor/**
      - fix/**
```

### Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Garante que apenas um deploy por branch roda por vez. Pushes subsequentes cancelam o deploy anterior.

### Secrets Necessários

| Secret                      | Descrição                                  |
| --------------------------- | ------------------------------------------ |
| `CI_GH_TOKEN`               | Token GitHub com permissão de escrita      |
| `NPM_RC`                    | Conteúdo do `.npmrc` para registry privado |
| `PINGDOM_API_TOKEN`         | Token Pingdom (base-module)                |
| `STATPING_API_KEY`          | Token Statping (base-module)               |
| `NEW_RELIC_API_KEY`         | Token New Relic (base-module)              |
| `DATADOG_API_KEY`           | API key Datadog (base-module)              |
| `DATADOG_APP_KEY`           | App key Datadog (base-module)              |
| `CLOUDFLARE_API_TOKEN`      | Token Cloudflare (base-module)             |
| `SENTRY_AUTH_TOKEN`         | Token Sentry (base-module)                 |
| `MONGODB_ATLAS_PRIVATE_KEY` | Private key MongoDB Atlas (base-module)    |
| `MONGODB_ATLAS_PUBLIC_KEY`  | Public key MongoDB Atlas (base-module)     |

### Adaptações por Monorepo

| Item                   | O que mudar                        | Exemplo                                        |
| ---------------------- | ---------------------------------- | ---------------------------------------------- |
| `<namespace>`          | Namespace Kubernetes               | `vulcano`                                      |
| `<app>`                | Nome da app usado no host dinâmico | `app` (gera `featurexyz-app.buildstaging.com`) |
| `node-version`         | Versão do Node.js                  | `20`                                           |
| Branches trigger       | Padrões de branch                  | `feature/**`, `fix/**`                         |
| Flags de pnpm          | Remover se não necessário          | Testar sem `shamefully-hoist`                  |
| Secrets do base-module | Apenas os que o monorepo usa       | Nem todos são obrigatórios                     |

### Adicionando Feature Branch a um Monorepo Existente

1. Para cada app: seguir checklist de `feature-branch-app-setup.md`
2. Criar `.github/workflows/feature.yml` baseado no workflow de referência (`nx-workflow-feature-branch.md`)
3. Verificar que os secrets necessários existem no repo
4. Fazer push em uma branch `feature/*` para testar

### Adicionando Nova App ao Feature Branch Existente

1. Seguir checklist de `feature-branch-app-setup.md` para a nova app
2. O workflow **não precisa de alteração** — o job `detect-apps` descobre apps automaticamente via `ls apps/*/`
3. Fazer push em uma branch `feature/*` para testar

### Troubleshooting

| Problema                                         | Diagnóstico                           | Solução                                                         |
| ------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------- |
| `cp: cannot stat 'feature.yml'` no base-module   | `file` aponta para raiz em vez da app | Usar `file: apps/${{ matrix.app }}/feature.yml`                 |
| Nova app não aparece na matrix                   | Diretório não existe em `apps/`       | Garantir que `apps/<app>/` existe                               |
| Build falha com "target build:feature not found" | Falta configuration no project.json   | Adicionar configuration `feature`                               |
| Deploy sobe mas app retorna 502                  | Health check falhando                 | Verificar nginx.conf e containerPort                            |
| URL da branch não resolve                        | Ingress não configurado               | Verificar base-module e host no feature.yml                     |
| Peer dependency conflicts no install             | Dependências legadas                  | Adicionar flags `shamefully-hoist` e `strict-peer-dependencies` |
