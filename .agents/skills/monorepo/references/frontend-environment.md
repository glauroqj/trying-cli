---
title: Variáveis de Ambiente no Monorepo
impact: HIGH
impactDescription: feature packages e shared libs acessando process.env ou URLs hardcoded quebram isolamento entre ambientes
tags: monorepo, environment, variables, config, staging, production, frontend
---

## Variáveis de Ambiente no Monorepo

Para a estrutura de pastas e camadas, consulte `monorepo-architecture.md`.

### Princípio

- Apps (`apps/`) declaram variáveis de ambiente nos seus `.env` por ambiente (staging/production)
- Feature packages e shared libs (`packages/shared`) definem internamente suas configs por ambiente (URLs, keys, etc.)
- Feature packages e shared libs recebem o environment ativo via Provider ou parâmetro ao instanciar — nunca acessam `process.env`

### Configs por Ambiente

Cada feature package ou shared lib que precisa de URLs ou configs por ambiente define um mapeamento interno:

```typescript
// packages/shared/upload/src/lib/config/environment.ts (lib shared)
export const API_URLS = {
  staging: "https://api-tryingcli-drive.buildstaging.com",
  production: "https://api-tryingcli-drive.tryingcli.com",
} as const;

export function resolveApiUrl(environment: keyof typeof API_URLS): string {
  return API_URLS[environment];
}
```

### Consumo: Pacote Recebe Environment

A app passa o environment para o package via Provider:

```tsx
import { UploadProvider } from "@packages/shared/shared-upload";

function App() {
  return (
    <UploadProvider environment={process.env.NODE_ENV}>
      <MyFeature />
    </UploadProvider>
  );
}
```

```tsx
// Dentro do pacote — módulos consomem via context, sem receber props
function useUploadConfig() {
  const {
    state: { environment },
  } = use(UploadContext);
  return resolveApiUrl(environment);
}
```

### Apps: Variáveis de Build

Apps usam arquivos `.env` por ambiente apenas para variáveis de build (asset prefix, app name, environment):

```
apps/<app-name>/
├── environments/
│   ├── .env.development    # ENVIRONMENT=staging, APP_NAME=<app-name>
│   ├── .env.staging        # ENVIRONMENT=staging, APP_NAME=<app-name>
│   └── .env.production     # ENVIRONMENT=production, APP_NAME=<app-name>
```

URLs de API e configs de serviço ficam dentro dos feature packages e shared libs, não nos `.env`.

### Regras

```
❌ Errado: app passando URLs de API via .env para feature packages ou shared libs
✅ Correto: feature package e shared libs definem mapeamento staging/production internamente

❌ Errado: feature packages e shared libs acessando process.env diretamente
✅ Correto: recebe environment via Provider/parâmetro e resolve configs internamente

❌ Errado: URL hardcoded sem mapeamento staging/production
✅ Correto: mapeamento explícito via config/environment.ts
```

### Checklist: Novo Feature Package ou Shared Lib com Config por Ambiente

- [ ] Criar mapeamento staging/production em `config/environment.ts`
- [ ] Receber `environment` via Provider ou parâmetro nos hooks/services
- [ ] NÃO acessar `process.env` diretamente

### Checklist: Nova App

- [ ] Criar pasta `environments/` com `.env` por ambiente
- [ ] NÃO colocar URLs de API nos arquivos `.env`
- [ ] Passar environment para feature packages e shared libs ao instanciar
