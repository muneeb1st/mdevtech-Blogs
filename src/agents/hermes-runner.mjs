import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROOT } from '../lib.mjs';

export async function runHermesAgent(prompt, options = {}) {
  const { timeoutMs = Number(process.env.HERMES_TIMEOUT_MS || 600000) } = options;

  const hermesBin = process.env.HERMES_CLI_PATH || 'hermes';
  const args = ['-z', prompt];

  if (process.env.HERMES_ACCEPT_HOOKS) args.push('--accept-hooks');
  if (process.env.HERMES_TOOLSETS) args.push('--toolsets', process.env.HERMES_TOOLSETS);
  if (process.env.HERMES_MODEL) args.push('--model', process.env.HERMES_MODEL);
  if (process.env.HERMES_PROVIDER) args.push('--provider', process.env.HERMES_PROVIDER);
  if (process.env.HERMES_SKILLS) args.push('--skills', process.env.HERMES_SKILLS);
  if (process.env.HERMES_ACCEPT_HOOKS === '1') args.push('--accept-hooks');

  const result = await new Promise((resolve, reject) => {
    const child = spawn(hermesBin, args, {
      cwd: ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`Hermes CLI timed out after ${timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        reject(new Error(stderr || `Hermes CLI exited with code ${code}`));
        return;
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });

  return result.stdout;
}

export function extractJsonObject(text) {
  const cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : cleaned;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = candidate.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice);
      } catch {
        throw new Error('Hermes output was not valid JSON and could not be parsed from braces.');
      }
    }
    throw new Error('Hermes output did not contain a JSON object.');
  }
}

export async function generateWithHermes(prompt) {
  const output = await runHermesAgent(prompt);
  return extractJsonObject(output);
}
