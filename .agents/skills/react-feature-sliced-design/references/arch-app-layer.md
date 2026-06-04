---
title: A Camada App — Composição e Orquestração
impact: CRITICAL
impactDescription: sem separação clara da camada app, acoplamento entre features e infraestrutura se torna inevitável
tags: architecture, app-layer, composition, routes, orchestration
---

## A Camada App

A pasta `app/` é o único lugar onde o acoplamento é intencional e controlado. A dependência é unidirecional: `app/` conhece as features, mas nenhuma feature conhece a `app/`. É aqui que todas as peças se conectam — rotas, composição de features e inicialização da aplicação.

### Princípio Central

```
A app/ conhece todas as features (via public API).
Nenhuma feature conhece a app/.
```

### O Que Vive em app/

| Responsabilidade | Exemplo |
|-----------------|---------|
| Configuração de rotas | `app/routes/` — rotas públicas, privadas, guards, lazy loading |
| Páginas | `app/pages/` — composição de features para cada rota |
| Orquestração de comunicação | Passar callback props entre features, estado local de orquestração |
| Layout da aplicação | Shell, sidebar, header |
| Inicialização | Entry point, composição de shared libs na árvore |

### Routes vs Pages — SPA

Em SPA, a configuração de rotas e a composição de features são responsabilidades distintas que devem estar separadas:

- `routes/` — configuração de rotas: quais caminhos existem, quais são públicas/privadas, guards de autenticação, lazy loading de páginas
- `pages/` — composição de features: monta os Providers, passa props, orquestra comunicação entre features

```tsx
// app/routes/index.tsx — configuração de rotas
import { lazy } from 'react'
import { AuthGuard } from '@/shared/auth'

const StorePage = lazy(() => import('../pages/store-page'))
const AdminPage = lazy(() => import('../pages/admin-page'))
const LoginPage = lazy(() => import('../pages/login-page'))

export const routes = [
  // Rotas públicas
  { path: '/login', element: <LoginPage /> },

  // Rotas privadas
  {
    element: <AuthGuard />,
    children: [
      { path: '/store', element: <StorePage /> },
      { path: '/admin', element: <AdminPage /> },
    ],
  },
]
```

```tsx
// app/pages/store-page.tsx — composição de features
import { useCallback, useState } from 'react'
import { Checkout } from '@/features/checkout'
import { Cart } from '@/features/cart'

export function StorePage() {
  const environment = import.meta.env.MODE
  const user = useAuth()
  const [cartTotal, setCartTotal] = useState(0)

  const handleItemAdded = useCallback((item: { price: number }) => {
    setCartTotal((prev) => prev + item.price)
  }, [])

  return (
    <Layout>
      <Cart.Provider environment={environment} user={user} onItemAdded={handleItemAdded}>
        <Cart.Frame>
          <Cart.Items />
          <Cart.Summary />
        </Cart.Frame>
      </Cart.Provider>

      <Checkout.Provider environment={environment} user={user} initialTotal={cartTotal}>
        <Checkout.Form />
        <Checkout.Submit />
      </Checkout.Provider>
    </Layout>
  )
}
```

A rota não sabe como a página compõe features. A página não sabe se é pública ou privada. Cada uma tem uma razão independente para mudar.

### Routes vs Pages — Next.js (SSR)

No Next.js com App Router, o file-system routing já separa naturalmente:

- `app/store/page.tsx` — a página (composição de features)
- `app/store/layout.tsx` — layout da rota
- `middleware.ts` — guards de autenticação

A separação routes/pages é implícita no Next.js. Em SPA, precisa ser explícita.

### O Que NÃO Vive em app/

| Não pertence a app/ | Onde vive |
|---------------------|----------|
| Lógica de negócio | Dentro da feature (`domain/`) |
| Componentes de UI reutilizáveis | `shared/ui/` |
| Estado de features | Dentro da feature (`context/`) |
| Hooks de features | Dentro da feature (`hooks/`) |
| Configuração de libs (query client, i18n) | `shared/` como pacotes independentes |
| Auth, tokens, sessão | `shared/auth/` — feature recebe via Provider props |
| Configuração de ambiente (URLs, keys) | Dentro de cada feature/shared lib |
| Configuração de infraestrutura (tailwind, tsconfig, vite) | Raiz do projeto |

### Providers de Infraestrutura na Árvore

O React exige que Providers estejam acima de quem consome na árvore. Isso força a `app/` a montar Providers de libs compartilhadas no topo. Isso é uma realidade do modelo do React, não uma violação arquitetural — desde que as features não acessem estado global explicitamente.

#### Tipos de Providers na Árvore

| Tipo | Exemplo | Feature acessa diretamente? | Aceitável? |
|------|---------|----------------------------|------------|
| Infraestrutura implícita | QueryClientProvider, ThemeProvider | Não — `useQuery` consome implicitamente, theme via tokens/CSS | Sim |
| Estado explícito | AuthProvider com `useAuth()` | Sim — feature chamaria `useAuth()` internamente | Não — feature deve receber `user` via props do Provider |

A regra central: features não acessam estado global explicitamente. Providers de infraestrutura que funcionam de forma implícita são aceitáveis.

```tsx
// ✅ app/ compõe providers de infraestrutura na árvore
// app/app.tsx
import { QueryProvider } from '@packages/shared-query'
import { ThemeProvider } from '@packages/shared-theme'

function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <Routes />
      </ThemeProvider>
    </QueryProvider>
  )
}
```

```tsx
// ❌ Feature acessando estado global explicitamente
function CheckoutProvider({ children }) {
  const user = useAuth() // acoplamento direto com estado global
}

// ✅ Feature recebe dados externos via props do Provider
function CheckoutProvider({ children, user }) {
  // user veio da page, feature não sabe de onde
}
```

### Environment e Dados Externos

A page resolve environment e dados do usuário e passa via props do Provider. Features nunca acessam `process.env` ou estado global diretamente. A page (camada `app/`) é o lugar correto para acessar hooks globais como `useAuth()` — ela resolve os dados e injeta nas features via props.

```tsx
// ✅ Page (camada app) acessa useAuth() e passa para features via props
export function StorePage() {
  const user = useAuth()  // ✅ aceitável — page é camada app
  const environment = import.meta.env.MODE

  return (
    <Checkout.Provider environment={environment} user={user}>
      <Checkout.Form />
    </Checkout.Provider>
  )
}

// ❌ Feature acessa useAuth() diretamente
function CheckoutProvider({ children }) {
  const user = useAuth()  // ❌ feature não acessa estado global
}
```
