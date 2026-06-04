---
title: Feature Branch — Configuração por App
impact: HIGH
impactDescription: sem a configuração correta por app, o deploy de feature branch falha no Docker build ou no Helm deploy
tags: monorepo, feature-branch, app, docker, helm, nginx, env, project-json
---

## Feature Branch — Configuração por App

Guia para configurar cada app do monorepo para suportar deploy de feature branch via Docker + Helm. Para o workflow CI/CD completo, consulte `feature-branch-cicd-setup.md`. Para o workflow de referência, consulte `nx-workflow-feature-branch.md`.

### Visão Geral

Cada app em `apps/` precisa de 5 artefatos para funcionar em feature branch:

```
apps/
└── <app-name>/
    ├── Dockerfile          # Imagem Docker (multi-stage: build + serve)
    ├── feature.yml         # Config Helm + base-module (branchRelease, host, resources)
    ├── nginx.conf          # Servidor web para servir o build estático
    ├── project.json        # Configuration "feature" no target build
    └── env/
        └── .feature        # Variáveis de ambiente para o ambiente feature
```

> Não é necessário um `feature.yml` na raiz do repo. Cada app tem o seu, e o workflow usa `apps/${{ matrix.app }}/feature.yml` tanto para o `base-module` (infra) quanto para o Docker build e Helm deploy.

### 1. Dockerfile

Multi-stage build: copia o dist gerado pelo Nx e serve via OpenResty (nginx).

```dockerfile
FROM 315120000506.dkr.ecr.us-east-1.amazonaws.com/hotmart/alpine/node/18 as builder

WORKDIR /home/app
COPY apps/<app-name>/dist build/

FROM 315120000506.dkr.ecr.us-east-1.amazonaws.com/hotmart/alpine/openresty

COPY --from=builder /home/app/build build/
COPY apps/<app-name>/nginx.conf /etc/nginx/conf.d/default.conf
```

Pontos de atenção:
- O context do Docker build é a **raiz do repo**, então paths de `COPY` são relativos à raiz
- O `outputPath` no `project.json` define onde o Nx gera o dist (ex: `apps/<app-name>/dist`)
- O `COPY` do Dockerfile deve bater com esse path
- Imagens base são do ECR da Hotmart — não usar imagens públicas

### 2. feature.yml (Config Helm + Infra)

Configuração do Helm chart para deploy isolado por branch. O campo `branchRelease: true` é o que habilita a criação de um deploy separado por branch. Este mesmo arquivo é usado pelo step `base-module` (Terraform — namespace, ingress) e pelos steps de Docker build e Helm deploy.

```yaml
name: <repo-name>

containerPort: 8080
cpu: 0.4
memory: 512M

replicaCount: 1

branchRelease: true
branchReleaseCollapseTime: 15
healthCheckPath: /health
preStopTime: 30
timeoutSeconds: 5
successThreshold: 3
failureThreshold: 5

env:
  TARGET_ENV: feature
  PROFILE: feature

lb:
  type: nginx
  hosts:
    - host: <app>.buildstaging.com
      paths: ['/']

podAnnotations:
  linkerd.io/inject: enabled

infra:
  kms:
    enable: false
```

Campos importantes:

| Campo | Descrição |
|-------|-----------|
| `name` | Nome do **repositório** (não da app) — usado pelo base-module para identificar o serviço |
| `branchRelease` | `true` para habilitar deploy isolado por branch |
| `branchReleaseCollapseTime` | Dias até o deploy da branch ser removido automaticamente |
| `containerPort` | Porta que o nginx escuta (deve bater com `nginx.conf`) |
| `healthCheckPath` | Path do health check (deve bater com `nginx.conf`) |
| `lb.hosts[].host` | Host base — o Helm prefixa com o nome sanitizado da branch |

URL gerada: `https://{branch-sanitizado}-{host}`. O branch é sanitizado (lowercase, apenas alfanuméricos). Exemplo com branch `feature/bwtest` e 3 apps:

| App | Host no `feature.yml` | URL gerada |
|-----|----------------------|------------|
| `app` | `app.buildstaging.com` | `https://featurebwtest-app.buildstaging.com` |
| `astrobox` | `astrobox.buildstaging.com` | `https://featurebwtest-astrobox.buildstaging.com` |
| `astroflow` | `astroflow.buildstaging.com` | `https://featurebwtest-astroflow.buildstaging.com` |

### 3. nginx.conf

Configuração mínima do servidor web. Serve o build estático com fallback para `index.html` (SPA routing).

```nginx
server {
  listen       0.0.0.0:8080;
  server_name  localhost;
  add_header Permissions-Policy "browsing-topics=()" always;

  location /health {
    return 200 'healthy';
  }

  location / {
    root   /home/app/build;
    try_files $uri /index.html;
  }
}
```

A porta `8080` deve bater com o `containerPort` do `feature.yml`.

### 4. project.json — Configuration "feature"

Adicionar a configuration `feature` no target `build`. Ela controla flags do bundler (optimization, sourceMap) — é independente do env file.

```json
{
  "name": "<app-name>",
  "targets": {
    "build": {
      "configurations": {
        "feature": {
          "optimization": true,
          "sourceMap": false
        }
      }
    }
  }
}
```

A configuration `feature` é invocada pelo CI via `pnpm nx run <app>:build:feature`.

> A configuration `feature` do Nx controla flags do bundler. A env var `TARGET_ENV` controla qual arquivo de variáveis de ambiente é carregado. São coisas diferentes — ambas são necessárias.

### 5. Arquivo de Ambiente (env/.feature)

Cada app deve ter um arquivo `env/.feature` com variáveis de ambiente para o ambiente de feature.

```env
# apps/<app-name>/env/.feature

# APP
APP_HOST=<app>.buildstaging.com
APP_PORT=

# URLs de APIs (apontam para staging)
API_URL_1=https://<api>.buildstaging.com
API_URL_2=https://<api>.buildstaging.com
```

Regras do env file de feature:
- `APP_PORT` deve estar vazio — o Helm serve na porta padrão (443/80)
- `APP_HOST` usa o host base de staging — o roteamento por branch é feito pelo Helm/ingress, não pela app
- URLs de APIs devem apontar para o ambiente de **staging** (`buildstaging.com`)
- O env file de feature geralmente é uma cópia do `.staging` com ajustes de porta

#### APP_HOST dinâmico (obrigatório no CI)

O step de build no CI **deve** gerar o `APP_HOST` dinamicamente a partir do nome da branch. Cada app recebe a URL correta da feature branch em build time, garantindo que links absolutos, callbacks OAuth e qualquer referência ao host funcionem no ambiente isolado.

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

A lib `dotenv` **não sobrescreve** env vars que já existem no `process.env`, então o `export` tem prioridade sobre o valor no `.feature`.

> O `APP_HOST` no `env/.feature` serve como fallback para desenvolvimento local. No CI, o valor dinâmico gerado pelo step de build sempre tem precedência.

### Carregamento de Variáveis de Ambiente

O bundler (webpack, Rsbuild, Vite) carrega o env file baseado na env var `TARGET_ENV`:

```ts
// webpack.config.ts
const targetEnv = process.env.TARGET_ENV || 'development'
require('dotenv').config({ path: path.resolve(__dirname, `env/.${targetEnv}`) })
```

No CI, `TARGET_ENV=feature` é definido no step de build, fazendo o bundler carregar `env/.feature`.

### Checklist por App

- [ ] `apps/<app>/Dockerfile` com paths corretos de dist e nginx
- [ ] `apps/<app>/feature.yml` com `branchRelease: true`, host correto e `name` = nome do repositório
- [ ] `apps/<app>/nginx.conf` com porta batendo com `containerPort`
- [ ] Configuration `feature` no target `build` do `project.json`
- [ ] Arquivo `env/.feature` com URLs de staging e porta vazia
- [ ] `outputPath` no `project.json` batendo com o `COPY` do Dockerfile
- [ ] Step de build no workflow gera `APP_HOST` dinâmico a partir do nome da branch

### Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `cp: cannot stat 'feature.yml'` no base-module | `file` aponta para path errado | Usar `apps/${{ matrix.app }}/feature.yml` |
| Docker build falha com "COPY failed" | `outputPath` não bate com o path no Dockerfile | Alinhar paths |
| Health check falha | Porta do nginx ≠ `containerPort` do feature.yml | Usar mesma porta (8080) |
| App carrega env errado | `TARGET_ENV` não definido no CI | Adicionar `env: TARGET_ENV: feature` no step de build |
| URL da feature branch não funciona | `branchRelease: false` ou host errado no feature.yml | Verificar `branchRelease: true` e host |
| App não builda com `build:feature` | Falta configuration `feature` no project.json | Adicionar configuration |
