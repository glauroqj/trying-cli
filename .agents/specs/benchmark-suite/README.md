# Benchmark Suite — cenários de medição

Índice de cenários e métricas para o benchmark das 5 CLIs (placeholders `cli-01` … `cli-05`).

## Cenários padrão (fase 1)

| ID | Nome | Objetivo |
| --- | --- | --- |
| `hello-world` | Hello World | Resposta mínima previsível (`OK`) — mede latência base |
| `list-files` | List Files | Tarefa leve no filesystem — mede uso de ferramentas |

Definidos em `@trying-cli/benchmark-types` (`DEFAULT_SCENARIOS`).

## Métricas por execução

| Métrica | Unidade | Descrição |
| --- | --- | --- |
| `durationMs` | ms | Tempo total da execução |
| `exit_code` | code | Código de saída do processo |
| `stdout_length` | chars | Tamanho da saída (proxy de verbosidade) |

### Métricas planejadas (fase 2)

- `tokens_input` / `tokens_output` (count)
- `cost_usd` (usd) — estimativa por modelo
- `success_rate` (percent) — agregado por adapter

## Matriz adapter × cenário

Cada adapter (`feature-cli-0N`) deve implementar `CliAdapter.run()` para todos os cenários ativos.

Composição dos adapters: apenas em `apps/cli-benchmark/src/registry.ts`.

## Como rodar

```bash
pnpm install
pnpm nx run cli-benchmark:benchmark:dry
pnpm nx run cli-benchmark:benchmark
```

Filtro parcial:

```bash
pnpm nx run cli-benchmark:benchmark -- --only=cli-01,cli-03 --dry-run
```

## Renomear placeholders

1. Renomear pasta `packages/feature-cli-0N` e atualizar `project.json` / `package.json`
2. Atualizar `CliAdapterId` em `packages/shared/benchmark-types`
3. Registrar adapter em `apps/cli-benchmark/src/registry.ts`
