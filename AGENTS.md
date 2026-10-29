# Coding agents: read this first

These rules apply to any coding agent working in this repo (Codex reads this file automatically). CLAUDE.md holds the same rules for Claude Code.

The product is Lemoha (working name Fola until 28 Oct 2026). The repo codename stays vot-health-za.

1. Before anything else, read HANDOVER.md and docs/PROJECT_CONTEXT.md.
2. Show your plan, then STOP and wait for "approved". Nthabiseng reviews every plan before anything runs.
3. Every permanent or risky action gets its own separate STOP, even inside an approved plan: Firebase project IDs or locations, deleting anything, security rules, deploys, git push, and any git reset, rebase, amend or force operation, even on unpushed commits.
4. Never ask for, print, log or write an API key, password or token. Nthabiseng sets keys herself at a terminal prompt (firebase functions:secrets:set NAME).
5. This repo is private until Day 8 (Tue 3 Nov), then made public. Treat it as public now: the full history becomes visible. No keys, passwords, tokens or personal data in any file or commit. Test audio stays in test-audio/, which is gitignored.
6. Made-up data only. Follow the hard rules in docs/PROJECT_CONTEXT.md, section 3.
7. We're on Windows: use PowerShell commands, and explain each one in plain words before running it. Don't assume Nthabiseng knows what a command does.
8. Multi-attribute JSX tags go on one line. The product name comes only from src/config/product.js. The only copies are index.html's title and public/manifest.webmanifest, which can't read it; test/unit/brand.test.js keeps them in step.
9. At the end of every task: update HANDOVER.md (including "Last updated" in SAST), commit, then ask "Push now?" and push only on a yes.
10. Never use a model ID with "-contributor" in it: those let Meta train on our prompts and outputs.
11. Never write transcript text, real names, keys, passwords or personal Windows folder paths into the repo.
12. Keep CLAUDE.md and AGENTS.md in step: any rule change goes into both files.
13. UI: every screen follows docs/DESIGN.md (the Shweshwe direction). Read it before any UI work. Use the tokens, never hard-coded colours. If a case isn't covered, follow its principles and flag it in your plan. Never fall back to default component-library looks.
