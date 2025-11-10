export class AutofixFramework {
  constructor({ config, contextStore, codexController, logger = console }) {
    this.config = config;
    this.contextStore = contextStore;
    this.codex = codexController;
    this.logger = logger;
    this.workflows = {};
    this.timers = [];
  }

  registerWorkflow(name, workflow) {
    this.workflows[name] = workflow;
  }

  start() {
    if (this.workflows.feishuToIssue) {
      this.logger.info('[Framework] Starting Feishu → Issue scheduler');
      this.triggerFeishuCycle();
      const timer = setInterval(
        () => this.triggerFeishuCycle(),
        this.config.pollIntervalMs
      );
      this.timers.push(timer);
    }
  }

  async triggerFeishuCycle() {
    try {
      await this.workflows.feishuToIssue.runScheduledSync();
    } catch (error) {
      this.logger.error('[Framework] Feishu → Issue cycle failed', error);
    }
  }

  async shutdown() {
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers = [];
    this.logger.info('[Framework] Shutdown complete');
  }
}
