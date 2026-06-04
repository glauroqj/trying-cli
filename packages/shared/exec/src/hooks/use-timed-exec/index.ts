import { spawn } from 'node:child_process';

export interface TimedExecOptions {
  command: string;
  args?: string[];
  cwd?: string;
  timeoutMs?: number;
  dryRun?: boolean;
}

export interface TimedExecResult {
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  dryRun: boolean;
}

const DEFAULT_TIMEOUT_MS = 60_000;

export async function timedExec(
  options: TimedExecOptions
): Promise<TimedExecResult> {
  const { command, args = [], cwd, timeoutMs = DEFAULT_TIMEOUT_MS, dryRun } =
    options;

  if (dryRun) {
    return {
      durationMs: 0,
      stdout: `[dry-run] ${command} ${args.join(' ')}`.trim(),
      stderr: '',
      exitCode: 0,
      dryRun: true,
    };
  }

  const startedAt = performance.now();

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    });

    child.on('close', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          durationMs: Math.round(performance.now() - startedAt),
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
          dryRun: false,
        });
      }
    });
  });
}
