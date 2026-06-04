---
title: Domínio Local — Tipos, Constantes e Modelagem por Feature
impact: HIGH
impactDescription: tipos compartilhados entre features criam acoplamento invisível e impedem evolução independente
tags: architecture, domain, types, api-layer, bounded-context, modeling, feature-sliced-design
---

## A Camada Domain

Cada feature define seus próprios tipos, constantes e regras de domínio. Não existe um diretório global de tipos de domínio compartilhado entre features. A ausência de esquemas de dados compartilhados previne o acoplamento estrutural e assegura a integridade das regras de negócio em cada unidade funcional.

### Princípio

```
Cada feature é dona do seu modelo de domínio.
Se duas features usam "Order", cada uma define o que precisa.
```

### Por Que Tipos Locais

No frontend, a tentação é criar `shared/types/order.ts` e importar em todas as features. Isso cria acoplamento invisível:

```tsx
// ❌ Tipo compartilhado entre features
// shared/types/order.ts
export interface Order {
  id: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  shippingAddress: Address
  paymentMethod: PaymentMethod
  createdAt: Date
  updatedAt: Date
}

// feature-checkout importa Order
// feature-order-history importa Order
// feature-shipping importa Order
// Mudar um campo afeta todas as features
```

Com tipos locais, cada feature define apenas o que precisa:

```tsx
// ✅ feature-checkout/domain/types.ts
interface CheckoutOrder {
  items: { productId: string; quantity: number; price: number }[]
  total: number
  paymentMethod: string
}

// ✅ feature-order-history/domain/types.ts
interface HistoryOrder {
  id: string
  total: number
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: Date
}

// ✅ feature-shipping/domain/types.ts
interface ShippingOrder {
  id: string
  shippingAddress: Address
  status: 'preparing' | 'shipped' | 'delivered'
}
```

### Estrutura do domain/

```
domain/
├── types.ts        # Tipos da feature (entidades, DTOs, enums)
├── constants.ts    # Constantes da feature
└── validators.ts   # Regras de validação (opcional)
```

### Exportação de Types

Types do domain podem ser expostos na public API da feature via `export type`. Isso é seguro porque `export type` é eliminado em build time — não entra no bundle, não cria dependência runtime. Constantes, validações e qualquer valor runtime permanecem internos.

```ts
// feature-checkout/index.ts
export { Checkout } from './checkout-module'
export type { CheckoutOrder, CheckoutStatus } from './domain/types'  // ✅ compile-time only

// ❌ Constantes e validações nunca são exportadas
// export { CHECKOUT_CONSTANTS } from './domain/constants'
```

### O Que Vive em shared/types/

Tipos utilitários e genéricos que não pertencem a nenhum domínio:

```ts
// shared/types/pagination.ts
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// shared/types/api.ts
export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
}
```

Tipos de domínio (Order, Product, User) nunca vivem em shared.
