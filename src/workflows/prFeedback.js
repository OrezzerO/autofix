import { resolve } from 'node:path';

export class PrFeedbackWorkflow {
  constructor({ config, codexController, contextStore, logger = console }) {
    this.config = config;
    this.codex = codexController;
    this.contextStore = contextStore;
    this.logger = logger;
  }

  async run(feedbackDescriptor) {
    if (!feedbackDescriptor || !feedbackDescriptor.rowId || !feedbackDescriptor.prUrl) {
      throw new Error('feedbackDescriptor requires rowId and prUrl');
    }

    const context = this.contextStore.createContext('pr-feedback', feedbackDescriptor);

    this.contextStore.markStage(
      context.id,
      'pr-feedback',
      'queued',
      `准备同步 PR 到 Feishu 行 ${feedbackDescriptor.rowId}`
    );

    const promptPath = resolve(this.config.promptDir, 'pr-feedback.md');
    await this.codex.enqueueTask({
      contextId: context.id,
      promptPath,
      variables: {
        PR_URL: feedbackDescriptor.prUrl,
        ROW_ID: feedbackDescriptor.rowId,
        FEISHU_TABLE_URL: feedbackDescriptor.tableUrl ?? this.config.feishuTableUrl,
      },
      metadata: { stage: 'pr-feedback' },
    });

    this.logger.info('[Workflow] PR feedback task dispatched', context.id);
    return context.id;
  }
}
