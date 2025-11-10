import { loadConfig } from './config/index.js';
import { ContextStore } from './context/contextStore.js';
import { CodexController } from './codex/codexController.js';
import { MockCodexController } from './codex/mockCodexController.js';
import { AutofixFramework } from './pipeline/framework.js';
import { FeishuToIssueWorkflow } from './workflows/feishuToIssue.js';
import { IssueToPrWorkflow } from './workflows/issueToPr.js';
import { PrFeedbackWorkflow } from './workflows/prFeedback.js';

async function bootstrap() {
  const config = await loadConfig();
  const contextStore = new ContextStore(config.stateDir);
  await contextStore.init();
  const codexConstructor = config.mockCodex ? MockCodexController : CodexController;

  const codexController = new codexConstructor(config, {
    onTaskStatus: (task, status, detail) => {
      if (task?.contextId && task?.metadata?.stage) {
        contextStore.markStage(task.contextId, task.metadata.stage, status, detail);
      }
    },
  });

  const framework = new AutofixFramework({
    config,
    contextStore,
    codexController,
  });

  const feishuToIssue = new FeishuToIssueWorkflow({
    config,
    codexController,
    contextStore,
  });

  const issueToPr = new IssueToPrWorkflow({
    config,
    codexController,
    contextStore,
  });

  const prFeedback = new PrFeedbackWorkflow({
    config,
    codexController,
    contextStore,
  });

  framework.registerWorkflow('feishuToIssue', feishuToIssue);

  framework.start();

  const handleExit = async () => {
    await framework.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);

  return { framework, issueToPr, prFeedback };
}

bootstrap()
  .then(() => {
    console.log('[Autofix] Framework bootstrapped. Additional workflows can be triggered via issueToPr.run(...) or prFeedback.run(...).');
  })
  .catch((error) => {
    console.error('[Autofix] Failed to bootstrap', error);
    process.exit(1);
  });
