# feature-benchmark-core

Orquestração da suite de benchmark: executa adapters contra cenários e agrega resultados.

## Public API

```ts
import { runSuite, DEFAULT_SCENARIOS } from '@trying-cli/feature-benchmark-core';
```

A composição de adapters (5 CLIs) acontece na camada **app** (`apps/cli-benchmark`), não neste package.

## Domínio

Benchmark de CLIs de coding agents — latência, status e métricas por cenário.
