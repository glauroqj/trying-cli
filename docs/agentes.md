# Agentes suportados

A Agents CLI detecta automaticamente os agentes instalados na máquina verificando os caminhos de configuração abaixo. Apenas agentes detectados aparecem no passo "Destino" do wizard.

## Tabela completa

| AgentId | Label | Detectar em | Skill global | Hook global |
|---------|-------|-------------|--------------|-------------|
| `cursor` | Cursor | `~/.cursor` | `~/.cursor/skills/` | `~/.cursor/hooks.json` |
| `claude-code` | Claude Code | `~/.claude` | `~/.claude/skills/` | `~/.claude/hooks.json` |
| `opencode` | OpenCode | `~/.config/opencode` | `~/.config/opencode/skills/` | `~/.config/opencode/hooks.json` |
| `codex` | Codex | `~/.codex` | `~/.codex/skills/` | `~/.codex/hooks.json` |
| `github-copilot` | GitHub Copilot | `~/.copilot` | `~/.copilot/skills/` | `~/.copilot/hooks.json` |
| `windsurf` | Windsurf | `~/.codeium/windsurf` | `~/.codeium/windsurf/skills/` | `~/.codeium/windsurf/hooks.json` |
| `roo` | Roo Code | `~/.roo` | `~/.roo/skills/` | `~/.roo/hooks.json` |
| `gemini-cli` | Gemini CLI | `~/.gemini` | `~/.gemini/skills/` | `~/.gemini/hooks.json` |
| `goose` | Goose | `~/.config/goose` | `~/.config/goose/skills/` | `~/.config/goose/hooks.json` |
| `continue` | Continue | `~/.continue` | `~/.continue/skills/` | `~/.continue/hooks.json` |
| `kiro` | Kiro (AWS) | `~/.kiro` | `~/.kiro/skills/` | `~/.kiro/hooks.json` |

## Como a detecção funciona

A função `detectInstalledAgents()` em `agents-core` percorre o `AGENT_CATALOG` e verifica, via `fs.access`, se o `detectionPath` de cada agente existe no sistema. Apenas os caminhos presentes são retornados como `AgentId[]`.

## Adicionar suporte a um novo agente

Edite `packages/shared/agents-core/src/domain/agent-catalog.ts` e adicione uma nova entrada no array `AGENT_CATALOG` seguindo o padrão `AgentDef`. Adicione também o novo `AgentId` ao tipo em `domain/types.ts`.
