import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const STAGE_MESSAGES = {
  'feishu-to-issue': '模拟：已从 Feishu 拉取 2 条记录并创建 issue',
  'issue-to-pr': '模拟：已完成代码修复并创建 PR https://github.com/mock/repo/pull/42',
  'pr-feedback': '模拟：已更新 Feishu 行状态为待审核',
};

export class MockCodexController {
  constructor(config, { logger = console, onTaskStatus } = {}) {
    this.config = config;
    this.logger = logger;
    this.onTaskStatus = onTaskStatus;
  }

  async loadPrompt(promptPath, variables = {}) {
    const template = await readFile(promptPath, 'utf8');
    return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const trimmed = key.trim();
      return variables[trimmed] ?? `{{${trimmed}}}`;
    });
  }

  async enqueueTask({ promptPath, variables, contextId, metadata = {} }) {
    const id = randomUUID();
    const prompt = await this.loadPrompt(promptPath, variables);
    const task = {
      id,
      contextId,
      metadata,
      prompt,
      status: 'queued',
    };

    this.logger.info(
      `[MockCodex] Task ${id} queued for context ${contextId} stage ${metadata.stage}`
    );
    this.notifyStatus(task, 'queued', 'Mock Codex: prompt ready');

    setTimeout(() => {
      this.runTask(task);
    }, 50);

    return task;
  }

  async runTask(task) {
    this.notifyStatus(task, 'running', 'Mock Codex: executing');
    this.logger.info(
      `[MockCodex] Executing task ${task.id} for stage ${task.metadata.stage}`
    );

    setTimeout(() => {
      const stage = task.metadata.stage;
      const detail =
        STAGE_MESSAGES[stage] ?? '模拟：Codex 已完成任务并返回成功结果';
      this.logger.info(`[MockCodex] Completed task ${task.id}: ${detail}`);
      this.notifyStatus(task, 'completed', detail);
    }, 150);
  }

  notifyStatus(task, status, detail) {
    if (typeof this.onTaskStatus === 'function') {
      this.onTaskStatus(task, status, detail);
    }
  }
}
