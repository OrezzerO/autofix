import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export class ContextStore {
  constructor(stateDir, logger = console) {
    this.stateDir = stateDir;
    this.logger = logger;
    this.contextFile = resolve(stateDir, 'contexts.json');
    this.contexts = new Map();
  }

  async init() {
    try {
      const raw = await readFile(this.contextFile, 'utf8');
      const parsed = JSON.parse(raw);
      parsed.forEach((ctx) => this.contexts.set(ctx.id, ctx));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error('[ContextStore] Failed to load contexts', error);
      }
      await this.persist();
    }
  }

  async persist() {
    const serialized = JSON.stringify([...this.contexts.values()], null, 2);
    await writeFile(this.contextFile, serialized, 'utf8');
  }

  createContext(kind, payload = {}) {
    const context = {
      id: randomUUID(),
      kind,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payload,
      history: [],
    };
    this.contexts.set(context.id, context);
    void this.persist();
    return context;
  }

  updateContext(id, patch = {}) {
    const existing = this.contexts.get(id);
    if (!existing) {
      throw new Error(`Context ${id} not found`);
    }
    const updated = {
      ...existing,
      ...patch,
      payload: { ...existing.payload, ...patch.payload },
      updatedAt: new Date().toISOString(),
    };
    this.contexts.set(id, updated);
    void this.persist();
    return updated;
  }

  appendHistory(id, entry) {
    const existing = this.contexts.get(id);
    if (!existing) {
      throw new Error(`Context ${id} not found`);
    }
    existing.history.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    existing.updatedAt = new Date().toISOString();
    this.contexts.set(id, existing);
    void this.persist();
    return existing;
  }

  markStage(id, stage, status, detail) {
    const existing = this.contexts.get(id);
    if (!existing) {
      this.logger.warn(`[ContextStore] Attempted to mark stage on missing context ${id}`);
      return;
    }
    existing.history.push({
      stage,
      status,
      detail,
      timestamp: new Date().toISOString(),
    });
    existing.stageStatus = existing.stageStatus ?? {};
    existing.stageStatus[stage] = status;

    if (status === 'failed') {
      existing.status = 'aborted';
    } else if (status === 'completed') {
      existing.status = 'completed';
    } else if (status === 'running') {
      existing.status = 'running';
    } else if (status === 'queued') {
      existing.status = 'pending';
    }

    this.logger.info(
      `[Context ${id}] stage "${stage}" -> ${status}${detail ? ` | ${detail}` : ''}`
    );

    existing.updatedAt = new Date().toISOString();
    this.contexts.set(id, existing);
    void this.persist();
  }

  releaseContext(id) {
    const existing = this.contexts.get(id);
    if (!existing) {
      return;
    }
    existing.status = 'completed';
    existing.completedAt = new Date().toISOString();
    this.contexts.set(id, existing);
    void this.persist();
  }

  abandonContext(id, reason) {
    const existing = this.contexts.get(id);
    if (!existing) {
      return;
    }
    existing.status = 'aborted';
    existing.abortedAt = new Date().toISOString();
    existing.history.push({ reason, timestamp: new Date().toISOString() });
    this.contexts.set(id, existing);
    void this.persist();
  }

  listActive() {
    return [...this.contexts.values()].filter((ctx) =>
      ['pending', 'running'].includes(ctx.status)
    );
  }
}
