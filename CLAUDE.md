# Claude Code: read this first

1. Before anything else, read HANDOVER.md and docs/PROJECT_CONTEXT.md.
2. Show your plan, then STOP and wait for "approved". Nthabiseng reviews every plan before anything runs.
3. Every permanent or risky action gets its own separate STOP, even inside an approved plan: Firebase project IDs or locations, deleting anything, security rules, deploys, git push.
4. Never ask for, print, log or write an API key, password or token. Nthabiseng sets keys herself at a terminal prompt (firebase functions:secrets:set NAME).
5. This repo is public. No keys, passwords, tokens or personal data in any file or commit. Test audio stays in test-audio/, which is gitignored.
6. Made-up data only. Follow the hard rules in docs/PROJECT_CONTEXT.md, section 3.
7. We're on Windows: use PowerShell commands, and explain each one in plain words before running it. Don't assume Nthabiseng knows what a command does.
8. Multi-attribute JSX tags go on one line. The product name comes only from src/config/product.js.
9. At the end of every task: update HANDOVER.md (including "Last updated" in SAST), commit, then ask "Push now?" and push only on a yes.
