---
title: Public API da Feature — Componentes e Types
impact: CRITICAL
impactDescription: sem contrato público claro, a app acopla-se a internos da feature e inviabiliza refatoração e code splitting
tags: architecture, public-api, encapsulation, index-ts, lazy-loading, code-splitting, export-type
---

## Public API da Feature

O `index.ts` é o único ponto de saída da feature. A public API exporta componentes React (lazy-loadable) e, opcionalmente, types via `export type`. Hooks, constantes, services e internos nunca são exportados.

### Princípio Central

```
A public API exporta componentes React e, opcionalmente, types via `export type`.
Hooks, constantes, services e internos nunca são exportados.
```

Essa restrição garante que cada feature se comporte como um módulo encapsulado: um chunk independente que pode ser carregado sob demanda. Componentes são lazy-loadable. Types via `export type` são eliminados em build time pelo TypeScript (tree-shaken pelo compilador) — não entram no bundle, não criam dependência runtime, não quebram code splitting.

### O Que Exportar

A feature exporta componentes React agrupados num objeto (compound component) ou como export direto. Opcionalmente, exporta types de domínio via `export type` para que a app possa tipar callbacks, props e contratos sem workarounds.

```tsx
// feature-checkout/src/index.ts

// Componentes — lazy loadable
export { Checkout } from './checkout-module'

// Types — import type não afeta bundle (eliminado em build time)
export type { CheckoutOrder, CheckoutStatus } from './domain/types'
```

```tsx
// feature-notification-banner/src/index.ts
export { NotificationBanner } from './components/notification-banner'

// Types — apenas se a app precisar tipar callbacks ou props
export type { NotificationLevel } from './domain/types'
```

Lazy loading funciona naturalmente:

```tsx
// app/routes/index.tsx
const CheckoutPage = lazy(() => import('../pages/checkout-page'))
```

O chunk da feature só é carregado quando a rota é acessada. Types exportados via `export type` são eliminados na compilação — não entram em nenhum chunk.

### Por Que Permitir `export type`

`import type` e `export type` são construções puramente compile-time do TypeScript. O compilador os elimina completamente do output JavaScript. Isso significa:

- Não afetam bundle size
- Não criam dependência runtime entre features
- Não quebram code splitting
- Não impedem lazy loading

Sem `export type`, a alternativa é inferir types via `ComponentProps`:

```tsx
// ❌ Workaround verboso — funciona, mas é desnecessariamente complexo
type OnComplete = ComponentProps<typeof Checkout.Submit>['onComplete']

// ✅ Export type limpo — eliminado em build time
import type { CheckoutCompletePayload } from '@/features/checkout'
```

O `ComponentProps` workaround é frágil: depende da estrutura interna do componente, quebra se o componente for refatorado, e é difícil de descobrir para novos devs.

### O Que NÃO Exportar

```ts
// ❌ Hooks — criam dependência runtime, quebram encapsulamento
export { useCheckoutState } from './hooks/use-checkout-state'
export { useTrack } from './hooks/use-track'

// ❌ Constantes — criam dependência runtime
export { CHECKOUT_CONSTANTS } from './domain/constants'

// ❌ Services — internos da feature
export { checkoutService } from './services/checkout-service'

// ❌ Internos — nunca
export { checkoutReducer } from './context/checkout-reducer'

// ❌ export value de types — cria dependência runtime
export { CheckoutStatus } from './domain/types'  // enum runtime!
```

A distinção é clara: `export type` (compile-time, eliminado) é permitido. `export` de valores (runtime, entra no bundle) é restrito a componentes React.

### Features como Micro-Frontends

Cada feature é tratada como um micro-frontend dentro do monolito/monorepo — encapsulada, portável, com public API como único ponto de contato. Quando uma feature é de fato consumida como micro-frontend em outra aplicação, não é possível compartilhar types entre repositórios diferentes (types são compile-time). Nesses casos, o dev do lado da app consumidora define a interface localmente. Isso não quebra nenhum conceito da arquitetura — o domínio continua encapsulado na feature de origem, e a app consumidora mantém seu próprio contrato.

Para features que vivem no mesmo repositório ou monorepo, `export type` é a abordagem correta:

```ts
// ✅ Mesmo repo/monorepo — import type direto
import type { CheckoutOrder } from '@/features/checkout'

// ✅ Feature consumida como micro-frontend em outro repo — interface local na app consumidora
// app/types/checkout-contract.ts
interface CheckoutOrder {
  id: string
  total: number
  status: 'idle' | 'processing' | 'completed'
}
```

### Checklist de Exportação

- [ ] O `index.ts` exporta componentes React
- [ ] Types exportados usam `export type` (compile-time only)
- [ ] Nenhum hook é exportado
- [ ] Nenhuma constante, service ou domain value é exportado
- [ ] Enums runtime não são exportados (use union types)
- [ ] A feature pode ser lazy loaded como um chunk único
- [ ] Remover a feature não quebra imports runtime em outros módulos
