import { resolve } from 'node:path';

export class FeishuToIssueWorkflow {
  constructor({ config, codexController, contextStore, logger = console }) {
    this.config = config;
    this.codex = codexController;
    this.contextStore = contextStore;
    this.logger = logger;
  }

  async runScheduledSync() {
    const context = this.contextStore.createContext('feishu-to-issue', {
      source: 'feishu',
      tableUrl: this.config.feishuTableUrl,
    });

    this.contextStore.markStage(
      context.id,
      'feishu-to-issue',
      'queued',
      'Dispatch Feishu → Issue Codex任务'
    );

    const promptPath = resolve(this.config.promptDir, 'feishu-to-issue.md');
    await this.codex.enqueueTask({
      contextId: context.id,
      promptPath,
      variables: {
        FEISHU_TABLE_URL: this.config.feishuTableUrl,
      },
      metadata: { stage: 'feishu-to-issue' },
    });

    this.logger.info('[Workflow] Feishu → Issue task dispatched', context.id);
    return context.id;
  }
}
