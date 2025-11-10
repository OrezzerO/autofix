import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const moduleDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(moduleDir, '..', '..');

export const defaultConfig = {
  codexBin: process.env.CODEX_BIN ?? 'codex',
  promptDir: process.env.PROMPT_DIR ?? resolve(projectRoot, 'prompts'),
  stateDir: process.env.STATE_DIR ?? resolve(projectRoot, '.autofix-state'),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 60_000),
  maxConcurrentCodexTasks: Number(process.env.MAX_CODEX_TASKS ?? 2),
  mockCodex: process.env.MOCK_CODEX === 'true',
  feishuTableUrl:
    process.env.FEISHU_TABLE_URL ??
    'https://xvp7aunvksf.feishu.cn/wiki/WeMow80Roin34Wk0NbgcXilznrd?table=tblHbOkP6IBNdlBq&view=vewOWB07Jq',
};

export async function loadConfig(overrides = {}) {
  const config = { ...defaultConfig, ...overrides };
  await mkdir(config.stateDir, { recursive: true });
  return config;
}
