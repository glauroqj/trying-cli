---
title: Nx Actions — Inputs, Outputs e Comportamento Interno
impact: HIGH
impactDescription: usar actions incorretamente causa falhas no pipeline e deploys inconsistentes
tags: nx, pipeline, actions, github-actions, cache, affected, release, deploy, reference
---

## Nx Actions — Inputs, Outputs e Comportamento Interno

Documentação de cada action usada no pipeline de monorepos Nx. Para o fluxo conceitual do pipeline, consulte a SKILL.md. Para workflow completo de React MFs, consulte `nx-workflow-react-mf.md`.

### Setup PNPM — `tryingcli-Org/actions/nx/setup-pnpm@master`

Configura o pnpm no runner. Deve ser chamada antes do `pnpm install`.

```yaml
- name: Setup PNPM
  uses: tryingcli-Org/actions/nx/setup-pnpm@master
```

| Input          | Default   | Descrição                 |
| -------------- | --------- | ------------------------- |
| `pnpm-version` | `10.12.1` | Versão do pnpm a instalar |

### Setup Nx Cache — `tryingcli-Org/actions/nx/setup-nx-cache@master`

Configura cache do pnpm store e do Nx (`.nx/cache`) com invalidação em cascata.

```yaml
- name: Setup Cache
  uses: tryingcli-Org/actions/nx/setup-nx-cache@master
```

Internamente:

1. Obtém o path do pnpm store (`pnpm store path --silent`)
2. Cache do pnpm store com key baseada em `pnpm-lock.yaml`
3. Cache do Nx com primary key incluindo `github.sha` e restore keys com fallback

Estratégia de invalidação:

| Evento                                       | Cache pnpm | Cache Nx                             |
| -------------------------------------------- | ---------- | ------------------------------------ |
| Mudança em `pnpm-lock.yaml`                  | Invalidado | Invalidado (cascade)                 |
| Mudança em código de um projeto              | Mantido    | Invalidado apenas para o projeto     |
| Novo commit sem mudanças                     | Mantido    | Mantido (restore key)                |
| Mudança em `nx.json` ou `tsconfig.base.json` | Mantido    | Invalidado para todos (global input) |

### Detect Affected — `tryingcli-Org/actions/nx/detect-affected@master`

Detecta projetos afetados usando combinações de tags do Nx, com refinamento por tipo de deploy.

```yaml
- name: Detect affected projects
  id: detect
  uses: tryingcli-Org/actions/nx/detect-affected@master
  with:
    gh-token: ${{ env.GH_TOKEN }}
```

Internamente:

1. Usa `nrwl/nx-set-shas@v4` para derivar `NX_BASE` e `NX_HEAD`
2. Detecta apps afetadas por framework (`framework:react`)
3. Refina por tipo de deploy usando combinação de tags (`framework:react` + `type:spa`, `framework:react` + `type:mf`, `framework:next` + `type:ssr`)
4. Extrai diretórios e flags booleanas para jobs condicionais

#### Outputs — Framework-level (retrocompatível)

| Output           | Tipo       | Descrição                                   | Exemplo                                  |
| ---------------- | ---------- | ------------------------------------------- | ---------------------------------------- |
| `react_projects` | JSON array | Todos os projetos React afetados (SPA + MF) | `["@apps/app-agent", "@apps/app-tutor"]` |
| `react_dirs`     | JSON array | Diretórios de todos os projetos React       | `["app-agent", "app-tutor"]`             |
| `has_react`      | boolean    | Se há projetos React afetados               | `true` / `false`                         |

#### Outputs — React deploy-type refinement (SPA vs MF)

| Output         | Tipo       | Descrição                                | Exemplo                 |
| -------------- | ---------- | ---------------------------------------- | ----------------------- |
| `spa_projects` | JSON array | Projetos React SPA (`type:spa`)          | `["@apps/app-spa"]`     |
| `spa_dirs`     | JSON array | Diretórios dos projetos React SPA        | `["app-spa"]`           |
| `has_spa`      | boolean    | Se há projetos SPA afetados              | `true` / `false`        |
| `mf_projects`  | JSON array | Projetos React Microfrontend (`type:mf`) | `["@apps/app-mf-auth"]` |
| `mf_dirs`      | JSON array | Diretórios dos projetos React MF         | `["app-mf-auth"]`       |
| `has_mf`       | boolean    | Se há projetos MF afetados               | `true` / `false`        |

#### Outputs — Next.js / SSR

| Output         | Tipo       | Descrição                           | Exemplo              |
| -------------- | ---------- | ----------------------------------- | -------------------- |
| `ssr_projects` | JSON array | Projetos Next.js SSR (`type:ssr`)   | `["@apps/app-next"]` |
| `ssr_dirs`     | JSON array | Diretórios dos projetos Next.js SSR | `["app-next"]`       |
| `has_ssr`      | boolean    | Se há projetos Next.js SSR afetados | `true` / `false`     |

#### Tags necessárias nos projetos

No `project.json` de cada app:

```json
{ "name": "app-spa", "tags": ["framework:react", "type:spa"] }
```

Ou via propriedade `nx` no `package.json`:

```json
{ "name": "app-mf-auth", "nx": { "tags": ["framework:react", "type:mf"] } }
```

Combinações de tags:

| Tags                          | Tipo                |
| ----------------------------- | ------------------- |
| `framework:react`, `type:spa` | React SPA           |
| `framework:react`, `type:mf`  | React Microfrontend |
| `framework:next`, `type:ssr`  | Next.js SSR         |

> Os outputs `react_projects`, `react_dirs` e `has_react` continuam disponíveis como agregação de todos os projetos React (SPA + MF), mantendo retrocompatibilidade.

#### Filtragem por tags no CI e local

```bash
# Todos os projetos React afetados (SPA + MF)
nx show projects --affected --type=app --exclude='*,!tag:framework:react' --json

# Apenas React SPA (framework:react + type:spa)
nx show projects --affected --type=app --exclude='*,!tag:framework:react,!tag:type:spa' --json

# Apenas React Microfrontends (framework:react + type:mf)
nx show projects --affected --type=app --exclude='*,!tag:framework:react,!tag:type:mf' --json

# Apenas Next.js SSR (framework:next + type:ssr)
nx show projects --affected --type=app --exclude='*,!tag:framework:next,!tag:type:ssr' --json

# Build apenas apps React SPA afetadas para staging
pnpm nx affected -t build:staging --exclude='*,!tag:framework:react,!tag:type:spa'

# Build apenas apps React MF afetadas para staging
pnpm nx affected -t build:staging --exclude='*,!tag:framework:react,!tag:type:mf'
```

### Release Version — `tryingcli-Org/actions/nx/release-version@master`

Executa versionamento semântico via conventional commits e cria tags git.

```yaml
- name: Version and tag affected apps
  if: steps.detect.outputs.has_react == 'true'
  uses: tryingcli-Org/actions/nx/release-version@master
  with:
    gh-token: ${{ env.GH_TOKEN }}
    framework: react
    actor: ${{ github.actor }}
```

Inputs:

| Input       | Tipo   | Descrição                                                |
| ----------- | ------ | -------------------------------------------------------- |
| `gh-token`  | string | Token com permissão de escrita no repositório            |
| `framework` | string | Tag de framework para filtrar projetos (`react`, `next`) |
| `actor`     | string | Usuário para o commit de versão (`github.actor`)         |

Internamente:

1. Configura git com o actor (`git config user.name`)
2. Identifica projetos afetados filtrados pela tag `framework:*`
3. Executa `pnpm nx release --projects="$AFFECTED" --skip-publish`
4. Cria tags e push com `--follow-tags --no-verify`

O `--skip-publish` é usado porque os packages são consumidos internamente no monorepo, não publicados em registry.

Configuração necessária no `nx.json`:

```json
{
  "release": {
    "projects": ["packages/*"],
    "projectsRelationship": "independent",
    "version": {
      "conventionalCommits": true
    },
    "changelog": {
      "projectChangelogs": true,
      "workspaceChangelog": false
    }
  }
}
```

Apps (`apps/*`) geralmente não são versionadas via Nx Release — elas são deployadas, não publicadas como pacotes.

### Upload Artifacts — `tryingcli-Org/actions/nx/upload-artifacts@master`

Faz upload dos artefatos de build para serem consumidos pelo job de deploy.

```yaml
- name: Upload build artifacts
  if: steps.detect.outputs.has_react == 'true'
  uses: tryingcli-Org/actions/nx/upload-artifacts@master
  with:
    framework: react
    artifact-name: dist-artifacts
```

| Input            | Tipo   | Obrigatório | Descrição                                           |
| ---------------- | ------ | ----------- | --------------------------------------------------- |
| `framework`      | string | sim         | Tag de framework para identificar quais dists subir |
| `artifact-name`  | string | não         | Nome do artifact (default: `dist-artifacts`)        |
| `retention-days` | string | não         | Dias de retenção (default: `1`)                     |
| `source-dir`     | string | não         | Diretório base das apps (default: `apps`)           |
| `build-output`   | string | não         | Nome do diretório de build output (default: `dist`) |

### Deploy S3 SPA — `tryingcli-Org/actions/s3/spa/deploy@master`

Faz deploy de uma SPA para S3 com invalidação de CloudFront. Diferente do MF, o SPA faz deploy direto na raiz do bucket (sem subpasta por app) e não recebe `app-name`.

```yaml
- name: Deploy SPA to S3
  uses: tryingcli-Org/actions/s3/spa/deploy@master
  with:
    bucket-name: ${{ env.BUCKET_NAME }}
    package-json-path: ./apps/${{ matrix.app-dir }}/package.json
    bundle-source: ./apps/${{ matrix.app-dir }}/dist
    account-id: ${{ env.CLOUDFRONT_ACCOUNT_ID }}
    cdn-distribution: ${{ env.CLOUDFRONT_DISTRIBUTION }}
    cdn-url: ${{ env.CLOUDFRONT_URL }}
```

| Input               | Tipo   | Obrigatório | Descrição                                  |
| ------------------- | ------ | ----------- | ------------------------------------------ |
| `bucket-name`       | string | sim         | Nome do bucket S3                          |
| `package-json-path` | string | sim         | Path do `package.json` para extrair versão |
| `bundle-source`     | string | sim         | Diretório com os arquivos buildados        |
| `account-id`        | string | sim         | Account ID da AWS para o CloudFront        |
| `cdn-distribution`  | string | sim         | ID da distribuição CloudFront              |
| `cdn-url`           | string | sim         | URL da distribuição CloudFront             |
| `aws-region`        | string | não         | Região AWS (default: `us-east-1`)          |

Internamente:

1. Extrai versão do `package.json` e cria `_version.json` no bundle
2. Upload para `versions/v{version}/` (versionamento)
3. Sync para a raiz do bucket com `--delete` (excluindo `versions/*`)
4. Invalida cache do CloudFront (`/*`)
5. Health check: verifica `index.html` na versão e na raiz

> Diferença-chave vs MF: SPA faz deploy na raiz do bucket (1 bucket = 1 app). MF organiza por subpasta `{app-name}/_current` e `{app-name}/v{version}` (1 bucket = N apps).

### Deploy S3 Microfrontend — `tryingcli-Org/actions/s3/microfrontend/deploy@master`

Faz deploy de um micro frontend para S3 com invalidação de CloudFront. Cada MF é organizado em subpasta no bucket (`{app-name}/_current` e `{app-name}/v{version}`), permitindo múltiplas apps no mesmo bucket.

```yaml
- name: Deploy Microfrontend to S3
  uses: tryingcli-Org/actions/s3/microfrontend/deploy@master
  with:
    bucket-name: ${{ env.BUCKET_NAME }}
    app-name: ${{ matrix.app-dir }}
    package-json-path: ./apps/${{ matrix.app-dir }}/package.json
    bundle-source: ./apps/${{ matrix.app-dir }}/dist
    account-id: ${{ env.CLOUDFRONT_ACCOUNT_ID }}
    cdn-distribution: ${{ env.CLOUDFRONT_DISTRIBUTION }}
    cdn-url: ${{ env.CLOUDFRONT_URL }}
```

| Input               | Tipo   | Descrição                                  |
| ------------------- | ------ | ------------------------------------------ |
| `bucket-name`       | string | Nome do bucket S3                          |
| `app-name`          | string | Nome da app (diretório no bucket)          |
| `package-json-path` | string | Path do `package.json` para extrair versão |
| `bundle-source`     | string | Diretório com os arquivos buildados        |
| `account-id`        | string | Account ID da AWS para o CloudFront        |
| `cdn-distribution`  | string | ID da distribuição CloudFront              |
| `cdn-url`           | string | URL da distribuição CloudFront             |
| `aws-region`        | string | Região AWS (default: `us-east-1`)          |

### CodeArtifact — `tryingcli-Org/actions/codeartifact@master`

Configura `.npmrc` para acesso ao registry privado da tryingcli.

```yaml
- name: Retrieve .npmrc
  uses: tryingcli-Org/actions/codeartifact@master
  with:
    npmrc: "${{ secrets.NPM_RC }}"
```
