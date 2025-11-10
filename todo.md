# Project TODO

- [x] **Project scaffolding** – Initialize the Node.js project (package.json, TypeScript or ESM choice, lint/test tooling) so the agent framework has a runnable entry point and coding standards.
- [ ] **Context orchestration design** – Define the core framework object that captures end-to-end context (Feishu row IDs, issue IDs, branch names, PR URLs) and ensures multiple concurrent workflows stay isolated.
- [x] **Prompt management** – Extract all Codex prompts into a dedicated, versioned directory (e.g., `prompts/`) with clear naming, plus a loader utility so runtime code never hardcodes prompt strings.
- [ ] **Feishu ingestion module** – Implement a scheduler + Feishu client that reads rows marked “请求自动修复”, flips them to “自动修复中”, and emits normalized task payloads without touching downstream systems.
- [ ] **Issue creation pipeline** – Build a GitHub integration that takes the normalized payload and creates issues (templated title/body, labels, metadata) entirely decoupled from Feishu-specific logic to allow future Notion inputs.
- [ ] **Issue-to-PR executor** – Implement the loop that hands GitHub issues to Codex, manages repo checkout, branching, commit/push, and opens PRs tagged `AI-GEN`, without assuming where the issue originated.
- [ ] **PR feedback to Feishu** – Once a PR is opened, update the originating Feishu row’s status (e.g., to “待审核”) using the context object so the correct row is modified.
- [ ] **State persistence & isolation** – Choose a lightweight store (files, SQLite, KV) for pending contexts, guarantee idempotency, and enforce locks so overlapping tasks don’t clobber each other.
- [ ] **Configuration & secrets** – Provide a central config surface (env vars or config file) for Feishu tokens, GitHub tokens, repo mappings, schedule interval, etc., plus documentation on secure storage.
- [ ] **Monitoring & recovery hooks** – Add logging, metrics, and retry/alert policies for each stage (Feishu fetch, issue creation, Codex run, PR status update) so failures are visible and recoverable.
