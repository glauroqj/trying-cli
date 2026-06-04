---
title: Camada Context — Provider, Estado Encapsulado e Otimização
impact: HIGH
impactDescription: sem Provider dedicado, estado vaza entre features e cria dependências invisíveis
tags: architecture, context, provider, state, encapsulation, environment, split-context
---

## Camada Context

Context e Provider da feature. Encapsula estado compartilhado entre componentes. A camada context contém dois artefatos: o Provider (componente que gerencia estado) e o hook de acesso (que valida uso dentro do Provider).

### Regras

- Custom Provider obrigatório: nunca use `<Context.Provider>` diretamente no JSX (naked provider). Sempre crie um componente Provider dedicado. Isso evita re-renders desnecessários em toda a árvore — apenas consumers re-renderizam quando o valor muda
- Hook de acesso com validação: cada context tem um hook `useNomeDaFeatureContext` que valida se está sendo usado dentro do Provider. Se não estiver, lança erro explícito
- Interface `{ state, actions, meta }`: o valor do context segue essa estrutura para separar dados (state), operações (actions) e metadados (meta como refs, environment, user)

```tsx
interface CheckoutContextValue {
  state: CheckoutState           // dados reativos — total, items, status
  actions: CheckoutActions       // operações — submitOrder, updateItem
  meta: {                        // metadados não-reativos — environment, user, refs
    environment: string
    user: User
    formRef: RefObject<HTMLFormElement>
  }
}
```

`meta` é opcional — use quando a feature recebe dados externos (environment, user) ou precisa de refs compartilhadas. Se a feature não tem metadados, use apenas `{ state, actions }`.
- Um context por feature: cada feature tem seu próprio context. Sem context compartilhado entre features
- Dados externos via props: environment, user e callbacks chegam via props do Provider, nunca acessados diretamente pela feature
- Context por responsabilidade: não misture responsabilidades diferentes no mesmo context. Se o context gerencia dados de compra e dados de frete, uma mudança no frete re-renderiza componentes que só consomem dados de compra

### Quando a Feature Precisa de Provider

| Cenário | Provider? |
|---------|-----------|
| Múltiplos componentes compartilham estado | Sim |
| Feature expõe compound component | Sim |
| Feature precisa de dados externos (environment, user) | Sim |
| Feature CRUD simples sem estado compartilhado | Não |
| Feature com componente único e auto-contido | Não |

### Implementação Base

```tsx
// context/checkout-context.tsx
import { createContext, useContext, useReducer, useCallback } from 'react'
import type { CheckoutState, CheckoutActions } from '../domain/types'

interface CheckoutContextValue {
  state: CheckoutState
  actions: CheckoutActions
}

const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined)

// Hook de acesso — valida uso dentro do Provider
export function useCheckoutContext(): CheckoutContextValue {
  const context = useContext(CheckoutContext)
  if (context === undefined) {
    throw new Error('useCheckoutContext must be used within a CheckoutProvider')
  }
  return context
}

// Custom Provider — nunca use <CheckoutContext.Provider> diretamente
export function CheckoutProvider({ children, environment, user, onComplete }: CheckoutProviderProps) {
  const [state, dispatch] = useReducer(checkoutReducer, initialState)

  const submitOrder = useCallback(async () => {
    dispatch({ type: 'SUBMIT_START' })
    // ... lógica de submit
    onComplete?.()
  }, [onComplete])

  return (
    <CheckoutContext value={{
      state,
      actions: { submitOrder, dispatch },
    }}>
      {children}
    </CheckoutContext>
  )
}
```

```tsx
// Componente interno consome via hook seguro
function CheckoutForm() {
  const { state, actions } = useCheckoutContext()
  // Se usado fora do Provider, erro explícito em dev
  return <form onSubmit={actions.submitOrder}>...</form>
}
```

### Environment e Dados Externos via Props

Features nunca acessam `process.env` ou estado global diretamente. A app passa environment e dados do usuário via props do Provider.

```tsx
// ✅ Feature recebe environment e user via props
<Checkout.Provider environment={environment} user={user}>
  <Checkout.Form />
</Checkout.Provider>

// ❌ Feature acessa process.env diretamente
function CheckoutProvider({ children }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL // Errado!
}
```

Dentro da feature, o environment é resolvido via config interna:

```ts
// domain/config.ts
const API_URLS = {
  staging: 'https://api-checkout.buildstaging.com',
  production: 'https://api-checkout.hotmart.com',
} as const

export function resolveApiUrl(environment: keyof typeof API_URLS): string {
  return API_URLS[environment]
}
```

### Otimização: Split State/Actions

Quando o context cresce demais, existem dois caminhos:

```
# Sinal: context com responsabilidades misturadas
# Componente que só lê state re-renderiza quando action é chamada

# Caminho 1 (preferido): a feature é grande demais — divida em features menores
# Cada feature menor terá seu próprio context focado

# Caminho 2 (otimização): split state/actions em dois contexts
# Componentes que só chamam actions não re-renderizam quando state muda
```

O split state/actions evita re-renders desnecessários sem criar provider hell:

```tsx
// context/checkout-context.tsx

// Context de estado — muda quando state muda
const CheckoutStateContext = createContext<CheckoutState | undefined>(undefined)

// Context de ações — referência estável, não causa re-render
const CheckoutActionsContext = createContext<CheckoutActions | undefined>(undefined)

export function CheckoutProvider({ children, environment, user }: CheckoutProviderProps) {
  const [state, dispatch] = useReducer(checkoutReducer, initialState)

  // Actions são estáveis — useMemo garante referência fixa
  const actions = useMemo(() => ({
    submitOrder: () => dispatch({ type: 'SUBMIT' }),
    updateItem: (item: Item) => dispatch({ type: 'UPDATE_ITEM', payload: item }),
  }), [])

  return (
    <CheckoutActionsContext value={actions}>
      <CheckoutStateContext value={state}>
        {children}
      </CheckoutStateContext>
    </CheckoutActionsContext>
  )
}

// Hooks separados — componente consome só o que precisa
export function useCheckoutState(): CheckoutState {
  const context = useContext(CheckoutStateContext)
  if (context === undefined) {
    throw new Error('useCheckoutState must be used within a CheckoutProvider')
  }
  return context
}

export function useCheckoutActions(): CheckoutActions {
  const context = useContext(CheckoutActionsContext)
  if (context === undefined) {
    throw new Error('useCheckoutActions must be used within a CheckoutProvider')
  }
  return context
}
```

```tsx
// Componente que só chama ações — NÃO re-renderiza quando state muda
function CheckoutSubmitButton() {
  const { submitOrder } = useCheckoutActions()
  return <button onClick={submitOrder}>Finalizar</button>
}

// Componente que lê estado — re-renderiza quando state muda
function CheckoutTotal() {
  const { total } = useCheckoutState()
  return <span>Total: {total}</span>
}
```

O Provider continua sendo um só componente (sem provider hell). A separação é interna — dois contexts dentro do mesmo Provider. O consumidor escolhe qual hook usar.

Evite criar múltiplos Providers aninhados (hadouken de providers). Se a feature precisa de tantos contexts que vira um nesting profundo, a feature é grande demais e deve ser dividida.



### Referências Externas

- [Why you need a custom context provider](https://gabrielpichot.fr/blog/why-you-need-a-custom-context-provider/) — Por que naked providers causam re-renders desnecessários e custom providers resolvem
- [How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) — Kent C. Dodds sobre custom providers, hook de acesso com validação e split state/dispatch
- [Split Context](https://www.epicreact.dev/workshops/react-performance/split-context) — Kent C. Dodds sobre separar state e actions em dois contexts para otimizar re-renders
- [React's Context API: Friend or Architectural Foe?](https://feature-sliced.design/uz/blog/react-context-api-guide) — Context como estado invisível global vs uso focado por feature
