---
title: Anti-Patterns — O Que Evitar na Arquitetura Frontend
impact: CRITICAL
impactDescription: esses padrões criam acoplamento invisível que impede escala, migração e evolução independente de features
tags: architecture, anti-patterns, coupling, global-state, technical-layers
---

## Anti-Patterns

### 1. Organização por Camada Técnica

Organização por camada técnica (`components/`, `hooks/`, `services/`) escala mal. Adicionar uma feature exige tocar múltiplas pastas. Entender uma funcionalidade exige navegar o projeto inteiro.

```
# ❌ Organização por camada técnica
src/
├── components/
│   ├── order-form.tsx
│   └── payment-form.tsx
├── hooks/
│   ├── use-orders.ts
│   └── use-payments.ts
├── services/
│   └── order-service.ts
└── types/
    └── order.ts
```

Adicionar "checkout" exige tocar `components/`, `hooks/`, `services/`, `types/`. Isso viola o Single Responsibility Principle — cada mudança de feature força alterações em múltiplos módulos.

```
# ✅ Organização por feature
src/features/
├── checkout/
│   ├── components/
│   ├── hooks/
│   ├── domain/
│   └── index.ts
├── cart/
│   ├── components/
│   ├── hooks/
│   ├── domain/
│   └── index.ts
```

### 2. Estado Global Compartilhado entre Features

```tsx
// ❌ Estado global compartilhado entre features
const GlobalContext = createContext()

function GlobalProvider({ children }) {
  const [checkout, setCheckout] = useState({ items: [], total: 0 })
  const [cart, setCart] = useState({ items: [], isOpen: false })

  return (
    <GlobalContext value={{ checkout, setCheckout, cart, setCart }}>
      {children}
    </GlobalContext>
  )
}
```

Quando você remove `feature-cart`, `feature-checkout` quebra porque dependia de `cart.items` no contexto global.

```tsx
// ✅ Cada feature com seu próprio estado
function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  return (
    <CartContext value={{ state, actions: { dispatch } }}>
      {children}
    </CartContext>
  )
}
```

### 3. Imports Cruzados entre Features

```tsx
// ❌ Feature importando de outra feature
import { useCartState } from '@/features/cart/hooks/use-cart-state'
import { CartItem } from '@/features/cart/domain/types'

// ❌ Feature importando internos de outra feature
import { CheckoutForm } from '@/features/checkout/components/checkout-form'
```

Features não se conhecem. Se uma feature precisa de dados de outra, a app orquestra via callback props ou eventos.

### 4. Feature Importando de app/

```tsx
// ❌ Feature com dependência invertida
import { useAppRouter } from '@/app/hooks/use-app-router'
import { AppLayout } from '@/app/components/layout'
```

A feature não conhece a app. Se precisa de navegação ou layout, recebe via props do Provider ou usa abstrações de `shared/`.

```tsx
// ✅ Feature recebe navegação via props
function CheckoutForm({ onNavigate }: { onNavigate: (path: string) => void }) {
  const handleSubmit = () => {
    // processa...
    onNavigate('/confirmation')
  }
}

// ✅ Ou usa abstração de shared/
import { useNavigation } from '@/shared/navigation'
```

### 5. Providers Genéricos Servindo Múltiplas Features

```tsx
// ❌ Provider genérico que serve checkout E cart
function StoreProvider({ children }) {
  const [cart, setCart] = useState([])
  const [checkout, setCheckout] = useState({})

  return (
    <StoreContext value={{ cart, setCart, checkout, setCheckout }}>
      {children}
    </StoreContext>
  )
}
```

Cada feature tem seu próprio Provider. Se duas features precisam se comunicar, a app orquestra.

### 6. app/ Acessando Internos de uma Feature

```tsx
// ❌ App importando internos da feature
import { useCheckoutState } from '@/features/checkout/hooks/use-checkout-state'
import { checkoutReducer } from '@/features/checkout/context/checkout-reducer'

// ✅ App importa apenas da public API
import { Checkout } from '@/features/checkout'
```

### 7. Exportar Valores Runtime na Public API

A public API permite `export type` (eliminado em build time). Mas exportar valores runtime (hooks, constantes, enums, services) quebra encapsulamento e code splitting.

```ts
// ❌ Enum — gera código runtime, entra no bundle
export { CheckoutStatus } from './domain/types'  // enum!

// ❌ Constantes — valor runtime
export { CHECKOUT_CONSTANTS } from './domain/constants'

// ❌ Hooks — dependência runtime
export { useCheckoutState } from './hooks/use-checkout-state'

// ✅ export type — eliminado em build time, não afeta bundle
export type { CheckoutOrder, CheckoutStatus } from './domain/types'
```

Use union types ao invés de enums quando o type precisa ser exportado:

```ts
// ✅ Union type — compile-time, pode ser exportado
export type CheckoutStatus = 'idle' | 'processing' | 'completed' | 'failed'

// ❌ Enum — gera código runtime
export enum CheckoutStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
}
```

### Resumo

| Anti-Pattern | Problema | Solução |
|-------------|----------|---------|
| Camada técnica | Tocar N pastas para 1 feature | Organizar por feature |
| Estado global | Dependências invisíveis | Provider por feature |
| Imports cruzados | Acoplamento horizontal | Comunicação via app |
| Feature → app | Dependência invertida | Feature depende de shared |
| Provider genérico | Escopo misturado | Provider dedicado por feature |
| App → internos | Quebra encapsulamento | Importar apenas public API |
| Export runtime na public API | Quebra code splitting e encapsulamento | Usar `export type` para types, union types ao invés de enums |
