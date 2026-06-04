---
title: Dependabot em Monorepos Multi-Projeto
impact: MEDIUM
impactDescription: sem configuração granular, PRs de dependência ficam genéricos, sem ownership claro e difíceis de revisar
tags: monorepo, dependabot, dependencies, security, updates, github, agnostic
---

## Dependabot em Monorepos Multi-Projeto

Configuração do Dependabot para monorepos com múltiplos apps e packages, cada um com seu próprio `package.json` (ou `pom.xml`). O objetivo é gerar PRs granulares por projeto, com reviewers corretos e agrupamento inteligente.

### Agrupamento de PRs (Groups)

Groups reduzem o volume de PRs agrupando bumps relacionados em um único PR.

| Estratégia      | Quando usar                       | Exemplo                              |
| --------------- | --------------------------------- | ------------------------------------ |
| Por ecossistema | Framework com múltiplos pacotes   | `next`, `next-*`, `@next/*`          |
| Por tipo        | Separar prod de dev               | `dependency-type: "production"`      |
| Por padrão      | Prefixo comum                     | `@aws-sdk/*`, `org.springframework*` |
| Catch-all       | Packages pequenos com poucas deps | `patterns: ["*"]`                    |

Para apps e root, separar production e development em grupos distintos facilita a priorização de review:

```yaml
groups:
  app-name-production:
    dependency-type: "production"
    patterns:
      - "*"
  app-name-development:
    dependency-type: "development"
    patterns:
      - "*"
```

Para packages shared com poucas dependências, um grupo único catch-all é suficiente:

```yaml
groups:
  shared-package-dependencies:
    patterns:
      - "*"
```

### Commit Messages com Conventional Commits

Usar `commit-message` com `prefix` e `include: "scope"` para gerar commits padronizados que se integram com o histórico do monorepo:

```yaml
    # Root
    commit-message:
      prefix: 'chore(deps)'
      include: 'scope'

    # Apps — prefix identifica a app
    commit-message:
      prefix: 'chore(app-name-1)'
      include: 'scope'

    # Packages — prefix identifica o package
    commit-message:
      prefix: 'chore(@packages/shared-ui)'
      include: 'scope'
```

Isso gera commits como `chore(app-name-1): bump react from 18.2.0 to 18.3.0`, facilitando filtragem no git log e changelogs.

### Reviewers e CODEOWNERS

O `reviewers` no Dependabot define quem é notificado, mas o CODEOWNERS define quem precisa aprovar. A recomendação é alinhar ambos usando times do GitHub. Se o CODEOWNERS já cobre o diretório, o `reviewers` é opcional — o GitHub adiciona os code owners automaticamente.

### Labels por Projeto

Labels identificam a origem do PR e facilitam filtragem no board:

```yaml
    # Root
    labels:
      - 'dependencies'

    # Apps
    labels:
      - 'dependencies'
      - 'app-name-1'

    # Packages
    labels:
      - 'dependencies'
      - 'packages-shared'
```

### Controle de Volume

```yaml
# Limitar PRs abertos por diretório
open-pull-requests-limit: 5

# Ignorar dependências específicas
ignore:
  - dependency-name: "aws-sdk"
    update-types: ["version-update:semver-major"]

# Schedule menos frequente para projetos estáveis
schedule:
  interval: "monthly"
```

Recomendação de limites por tipo de entry:

| Entry           | Limite | Justificativa                                |
| --------------- | ------ | -------------------------------------------- |
| Root            | `10`   | Mais dependências hoisted, precisa de margem |
| Apps            | `5`    | Volume moderado, review por time da app      |
| Packages shared | `3`    | Poucas deps, PRs menores                     |
| GitHub Actions  | `5`    | Poucas actions, mas updates frequentes       |

### Exemplo Completo (Multi-Stack)

```yaml
# .github/dependabot.yml
# ============================================================================
# Dependabot — <repo-name>
# ============================================================================
# Reviewers alinhados com .github/CODEOWNERS
# Agrupamento de PRs por tipo (production/development) para reduzir ruído
# Docs: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference
# ============================================================================
version: 2
updates:
  # -------------------------------------------------------------------------
  # GitHub Actions
  # -------------------------------------------------------------------------
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    reviewers:
      - "tryingcli/platform-team"
    groups:
      github-actions:
        patterns:
          - "*"
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "github-actions"
    open-pull-requests-limit: 5

  # -------------------------------------------------------------------------
  # Root (dependências globais hoisted pelo pnpm)
  # -------------------------------------------------------------------------
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    reviewers:
      - "tryingcli/platform-team"
    groups:
      root-production:
        dependency-type: "production"
        patterns:
          - "*"
      root-development:
        dependency-type: "development"
        patterns:
          - "*"
    commit-message:
      prefix: "chore(deps)"
      include: "scope"
    labels:
      - "dependencies"
    open-pull-requests-limit: 10

  # -------------------------------------------------------------------------
  # Apps — app-name-1
  # -------------------------------------------------------------------------
  - package-ecosystem: "npm"
    directory: "/apps/app-name-1"
    schedule:
      interval: "weekly"
      day: "monday"
    reviewers:
      - "tryingcli/team-app-name-1"
    groups:
      app-name-1-production:
        dependency-type: "production"
        patterns:
          - "*"
      app-name-1-development:
        dependency-type: "development"
        patterns:
          - "*"
    commit-message:
      prefix: "chore(app-name-1)"
      include: "scope"
    labels:
      - "dependencies"
      - "app-name-1"
    open-pull-requests-limit: 5

  # -------------------------------------------------------------------------
  # Apps — app-name-2
  # -------------------------------------------------------------------------
  - package-ecosystem: "npm"
    directory: "/apps/app-name-2"
    schedule:
      interval: "weekly"
      day: "monday"
    reviewers:
      - "tryingcli/team-app-name-2"
    groups:
      app-name-2-production:
        dependency-type: "production"
        patterns:
          - "*"
      app-name-2-development:
        dependency-type: "development"
        patterns:
          - "*"
    commit-message:
      prefix: "chore(app-name-2)"
      include: "scope"
    labels:
      - "dependencies"
      - "app-name-2"
    open-pull-requests-limit: 5

  # -------------------------------------------------------------------------
  # Backend app (Maven)
  # -------------------------------------------------------------------------
  - package-ecosystem: "maven"
    directory: "/apps/api-payments"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      spring-ecosystem:
        patterns: ["org.springframework*"]
      api-payments-all:
        patterns: ["*"]
    reviewers:
      - "tryingcli/team-payments"
    commit-message:
      prefix: "chore(api-payments)"
      include: "scope"
    labels:
      - "dependencies"
      - "api-payments"
    open-pull-requests-limit: 5

  # -------------------------------------------------------------------------
  # Serverless (pip)
  # -------------------------------------------------------------------------
  - package-ecosystem: "pip"
    directory: "/apps/lambda-notifications"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      aws-sdk:
        patterns: ["boto3", "botocore", "aws-*"]
    reviewers:
      - "tryingcli/team-notifications"
    commit-message:
      prefix: "chore(lambda-notifications)"
      include: "scope"
    labels:
      - "dependencies"
      - "lambda-notifications"
    open-pull-requests-limit: 3

  # -------------------------------------------------------------------------
  # Packages — feature (mesmos owners da app que consome)
  # -------------------------------------------------------------------------
  - package-ecosystem: "npm"
    directory: "/packages/feature-chat"
    schedule:
      interval: "weekly"
      day: "monday"
    reviewers:
      - "tryingcli/team-app-name-1"
    groups:
      feature-chat-dependencies:
        patterns:
          - "*"
    commit-message:
      prefix: "chore(@packages/feature-chat)"
      include: "scope"
    labels:
      - "dependencies"
      - "packages-feature"
    open-pull-requests-limit: 5

  # -------------------------------------------------------------------------
  # Packages — shared (um entry por pacote para commit prefix alinhado)
  # -------------------------------------------------------------------------
  - package-ecosystem: "npm"
    directory: "/packages/shared/ui"
    schedule:
      interval: "weekly"
      day: "monday"
    reviewers:
      - "tryingcli/platform-team"
    groups:
      shared-ui-dependencies:
        patterns:
          - "*"
    commit-message:
      prefix: "chore(@packages/shared-ui)"
      include: "scope"
    labels:
      - "dependencies"
      - "packages-shared"
    open-pull-requests-limit: 3

  - package-ecosystem: "npm"
    directory: "/packages/shared/i18n"
    schedule:
      interval: "weekly"
      day: "monday"
    reviewers:
      - "tryingcli/platform-team"
    groups:
      shared-i18n-dependencies:
        patterns:
          - "*"
    commit-message:
      prefix: "chore(@packages/shared-i18n)"
      include: "scope"
    labels:
      - "dependencies"
      - "packages-shared"
    open-pull-requests-limit: 3
```

### Padrão por Tipo de Entry

| Entry            | Groups                       | Commit Prefix             | Limite |
| ---------------- | ---------------------------- | ------------------------- | ------ |
| GitHub Actions   | Catch-all único              | `chore(deps)`             | `5`    |
| Root             | `production` + `development` | `chore(deps)`             | `10`   |
| Apps             | `production` + `development` | `chore(<app-name>)`       | `5`    |
| Packages feature | Catch-all único              | `chore(@packages/<name>)` | `5`    |
| Packages shared  | Catch-all único              | `chore(@packages/<name>)` | `3`    |
| Backend (Maven)  | Por ecossistema              | `chore(<api-name>)`       | `5`    |
| Serverless (pip) | Por ecossistema              | `chore(<lambda-name>)`    | `3`    |

### Checklist de Configuração

- [ ] Cada app com manifesto de dependências tem uma entrada em `updates`
- [ ] Packages shared com dependências próprias estão cobertos (um entry por package)
- [ ] GitHub Actions tem entrada com `package-ecosystem: "github-actions"`
- [ ] Groups configurados: `production` + `development` para apps/root, catch-all para packages
- [ ] `commit-message` com `prefix` alinhado ao nome do projeto e `include: "scope"`
- [ ] `reviewers` alinhados com CODEOWNERS do diretório
- [ ] `labels` identificam o projeto de origem do PR
- [ ] `open-pull-requests-limit` definido por tipo de entry (root: 10, apps: 5, packages: 3)
- [ ] `schedule` com `day: "monday"` para concentrar PRs no início da semana
- [ ] Security updates habilitados nas Settings do repo
