import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

export class CodexController {
  constructor(config, { logger = console, onTaskStatus } = {}) {
    this.config = config;
    this.logger = logger;
    this.onTaskStatus = onTaskStatus;
    this.queue = [];
    this.running = 0;
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
    this.queue.push(task);
    this.logger.info(`[Codex] Task ${id} queued for context ${contextId}`);
    this.notifyStatus(task, 'queued', 'Prompt rendered and queued');
    void this.processQueue();
    return task;
  }

  async processQueue() {
    if (this.running >= this.config.maxConcurrentCodexTasks) {
      return;
    }
    const next = this.queue.shift();
    if (!next) {
      return;
    }
    this.running += 1;
    next.status = 'running';
    this.notifyStatus(next, 'running', 'Codex invocation started');
    try {
      await this.executeTask(next);
      next.status = 'completed';
      this.notifyStatus(next, 'completed', 'Codex invocation finished');
    } catch (error) {
      next.status = 'failed';
      next.error = error;
      this.logger.error(`[Codex] Task ${next.id} failed`, error);
      this.notifyStatus(next, 'failed', error.message);
    } finally {
      this.running -= 1;
      if (this.queue.length > 0) {
        void this.processQueue();
      }
    }
  }

  async executeTask(task) {
    return new Promise((resolve, reject) => {
      const child = spawn(this.config.codexBin, ['run'], {
        stdio: ['pipe', 'inherit', 'inherit'],
      });
      child.stdin.write(task.prompt);
      child.stdin.end();
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Codex exited with code ${code}`));
        }
      });
      child.on('error', reject);
    });
  }

  notifyStatus(task, status, detail) {
    if (typeof this.onTaskStatus === 'function') {
      this.onTaskStatus(task, status, detail);
    }
  }
}
