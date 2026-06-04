---
title: A Camada Shared — Base Comum sem Lógica de Negócio
impact: CRITICAL
impactDescription: sem separação clara da camada shared, código utilitário se mistura com lógica de domínio e cria acoplamento invisível entre features
tags: architecture, shared-layer, feature-sliced-design, fsd, reuse, ui-kit, types, utilities
---

## A Camada Shared

A pasta `shared/` é a base da pirâmide de dependências. Ela contém código reutilizável que não pertence a nenhuma feature específica — UI kit, configuração de libs, tipos utilitários, abstrações de infraestrutura. Shared não conhece features nem app. Features e app dependem de shared, nunca o contrário.

### Princípio Central

```
Shared não contém lógica de negócio.
Se o código pertence a um domínio, ele pertence a uma feature.
```

### Posição na Hierarquia

```
app/          → conhece features (via public API) e shared
features/     → conhece apenas shared
shared/       → não conhece ninguém (base da pirâmide)
```

Shared é a única camada que todas as outras podem importar. Isso torna qualquer mudança em shared potencialmente impactante — por isso a disciplina sobre o que entra aqui é fundamental.

### O Que Vive em Shared

Shared é organizado por propósito, não por tipo técnico. Cada subpasta representa uma responsabilidade clara.

#### SPA

```
src/shared/
├── ui/           # UI kit — componentes visuais reutilizáveis sem lógica de negócio
├── auth/         # Abstração de autenticação — tokens, sessão, guards
├── query/        # Configuração do React Query (QueryClient, defaults)
├── http/         # Cliente HTTP configurado (Axios instance, interceptors)
├── types/        # Tipos utilitários genéricos (PaginatedResponse, ApiError)
├── i18n/         # Setup de internacionalização
├── navigation/   # Abstrações de navegação
└── config/       # Feature flags globais, configuração de ambiente
```

#### Monorepo

```
packages/frontend/shared/
├── ui/
├── auth/
├── query/
├── http/
├── types/
└── i18n/
```

No monorepo, cada shared vive dentro de `packages/frontend/shared/` como pacote independente com seu próprio `package.json` e `project.json`.

### O Que NÃO Vive em Shared

| Não pertence a shared | Onde vive | Por quê |
|-----------------------|-----------|---------|
| Tipos de domínio (Order, Product, User) | `feature/domain/types.ts` | Tipos de domínio pertencem à feature que os define |
| Hooks de negócio (useSubmitOrder) | `feature/hooks/` | Lógica de negócio é responsabilidade da feature |
| Componentes com lógica de negócio | `feature/components/` | Componentes de negócio são internos da feature |
| Estado de features | `feature/context/` | Cada feature gerencia seu próprio estado |
| Configuração de rotas | `app/routes/` | Rotas são responsabilidade da camada app |

### Regra do 3: Quando Mover para Shared

Não antecipe o que será compartilhado. Comece com o código dentro da feature. Mova para shared quando a mesma abstração aparecer em 3 ou mais features.

```
# Evolução natural

# Fase 1: código duplicado em 2 features — OK, mantenha duplicado
features/checkout/components/loading-spinner.tsx
features/cart/components/loading-spinner.tsx

# Fase 2: terceira feature precisa do mesmo componente — hora de extrair
shared/ui/loading-spinner.tsx
```

Duplicação entre 2 features é aceitável e até preferível. Cada feature pode evoluir o componente independentemente. Quando a terceira feature precisa, o padrão está claro o suficiente para extrair com confiança.

Mover para shared prematuramente cria abstrações genéricas que acumulam complexidade conforme features diferentes precisam de comportamentos ligeiramente diferentes.

### shared/types/ — Tipos Utilitários, Não de Domínio

Tipos que vivem em shared são genéricos e não pertencem a nenhum domínio:

```ts
// ✅ shared/types/pagination.ts
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ✅ shared/types/api.ts
export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
}
```

Tipos de domínio nunca vivem em shared — mesmo que duas features usem "Order", cada uma define o que precisa no seu próprio `domain/types.ts`.

### shared/ui/ — UI Kit sem Lógica de Negócio

Componentes em shared/ui são visuais e reutilizáveis. Podem ter lógica de UI (autocomplete, datepicker) mas nunca lógica de negócio.

```tsx
// ✅ shared/ui — componente visual reutilizável
export function Button({ children, variant, onClick, disabled }: ButtonProps) {
  return (
    <button className={styles[variant]} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

// ❌ shared/ui — componente com lógica de negócio
export function CheckoutButton({ orderId }: { orderId: string }) {
  const { submit } = useSubmitOrder() // lógica de negócio não pertence a shared
  return <button onClick={() => submit(orderId)}>Finalizar</button>
}
```

### Dependências Internas de Shared

Shared pode importar de outros shared, mas com cuidado para evitar dependências circulares:

```
# ✅ Permitido
shared/ui → shared/types
shared/http → shared/config

# ❌ Proibido
shared/ui → shared/http → shared/ui (circular)
```

### Shared como Infraestrutura Implícita

Algumas libs de shared funcionam como infraestrutura implícita via Providers na árvore do React. Features não acessam essas libs diretamente — elas funcionam "por baixo dos panos".

```tsx
// app/ monta providers de infraestrutura
<QueryProvider>      {/* shared/query — useQuery funciona implicitamente */}
  <ThemeProvider>    {/* shared/theme — tokens via CSS */}
    <Routes />
  </ThemeProvider>
</QueryProvider>
```

Features usam `useQuery` sem saber que o `QueryClientProvider` existe. Isso é infraestrutura implícita — aceitável. O que não é aceitável é a feature acessar estado global explicitamente (como `useAuth()` direto).
