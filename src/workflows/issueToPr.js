import { resolve } from 'node:path';

export class IssueToPrWorkflow {
  constructor({ config, codexController, contextStore, logger = console }) {
    this.config = config;
    this.codex = codexController;
    this.contextStore = contextStore;
    this.logger = logger;
  }

  async run(issueDescriptor) {
    if (!issueDescriptor || !issueDescriptor.repo || !issueDescriptor.number) {
      throw new Error('issueDescriptor requires repo, owner, number, and title');
    }

    const context = this.contextStore.createContext('issue-to-pr', {
      sourceIssue: issueDescriptor,
    });

    this.contextStore.markStage(
      context.id,
      'issue-to-pr',
      'queued',
      `准备修复 issue #${issueDescriptor.number}`
    );

    const promptPath = resolve(this.config.promptDir, 'issue-to-pr.md');
    await this.codex.enqueueTask({
      contextId: context.id,
      promptPath,
      variables: {
        ISSUE_NUMBER: issueDescriptor.number,
        ISSUE_URL: issueDescriptor.url ?? '',
        GITHUB_REPO: `${issueDescriptor.owner}/${issueDescriptor.repo}`,
      },
      metadata: {
        stage: 'issue-to-pr',
      },
    });

    this.logger.info('[Workflow] Issue → PR task dispatched', context.id);
    return context.id;
  }
}
