---
title: Camada Hooks — Service Layer da Feature
impact: HIGH
impactDescription: hooks mal estruturados misturam responsabilidades e dificultam testes e manutenção
tags: architecture, hooks, service-layer, react-query, axios, business-logic, naming
---

## A Camada Hooks

Hooks são o service layer da feature no React. Cada hook encapsula uma responsabilidade completa, sem expor detalhes de implementação aos componentes consumidores. Hooks cobrem dois cenários:

- Requisições HTTP: encapsulam chamada, estado da requisição e tratamento de erro (via React Query + Axios)
- Lógica de negócio pura: cálculos complexos, formatações, validações, transformações de dados que são reutilizados entre componentes da feature ou complexos o suficiente pra ter teste próprio

Se a lógica é simples e usada por um único componente (ex: toggle, formatação trivial), ela fica no componente. Se é complexa, reutilizada, ou precisa de teste isolado, vai pra hook.

### Diretrizes Fundamentais

- Single Responsibility: cada hook tem uma única responsabilidade clara
- Interface bem definida: expõe apenas o necessário, internos encapsulados
- Composição: hooks podem compor outros hooks para funcionalidades mais complexas
- Arquivo separado: cada hook em seu próprio arquivo/pasta
- Requisições HTTP: sempre encapsuladas em hooks com React Query (`useQuery` para GET, `useMutation` para POST/PUT/DELETE) e Axios como cliente HTTP
- Lógica de negócio pura: cálculos, validações e transformações complexas que justificam teste isolado
- Tratamento de erro: mensagens de erro junto ao hook, não espalhadas pelos componentes

### Semântica e Nomenclatura

Padrão `useAçãoOuIntenção` — o nome deve deixar claro o que o hook faz, não como funciona internamente.

```
✅ useSubmitOrder      — claro: submete um pedido
✅ useCreatePost       — claro: cria um post
✅ useListProducts     — claro: lista produtos
✅ useCancelFile       — claro: cancela um arquivo
✅ useCalculateTotal   — claro: calcula o total

❌ useCheckoutState    — vago: estado de quê? faz o quê?
❌ useOrderData        — vago: busca? atualiza? deleta?
❌ useProductHook      — redundante: todo hook é hook
```

### Exemplo: Hook de Requisição HTTP

```ts
// hooks/use-checkout-submit/use-checkout-submit.ts
type SubmitParams = {
  orderId: string
  paymentMethod: string
}

export function useCheckoutSubmit() {
  const { t } = useTranslation()
  const { success, danger } = useToast()

  const { mutateAsync, isPending, error } = useMutation({
    mutationKey: ['checkout:submit'],
    mutationFn: async (params: SubmitParams): Promise<void> => {
      try {
        await axios.post('/v1/checkout/submit', params)
        success({ message: t('checkout.success') })
      } catch (e) {
        danger({ message: t('checkout.failed') })
        throw e // Propaga o erro para que o estado 'error' do hook seja populado
      }
    }
  })

  return { submit: mutateAsync, error, isPending }
}
```

### Exemplo: Hook de Lógica de Negócio Pura

```ts
// hooks/use-calculate-total/use-calculate-total.ts
import type { CartItem } from '../domain/types'

interface TotalResult {
  subtotal: number
  discount: number
  total: number
}

export function useCalculateTotal(items: CartItem[], coupon?: string): TotalResult {
  return useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const discount = coupon === 'PROMO20' ? subtotal * 0.2 : 0
    return { subtotal, discount, total: subtotal - discount }
  }, [items, coupon])
}
```

Esse hook não faz HTTP — encapsula um cálculo de negócio reutilizado por múltiplos componentes da feature. Se fosse um cálculo trivial usado por um único componente, ficaria no próprio componente.
