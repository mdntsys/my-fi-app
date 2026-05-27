# MyFi

Personal finance app. Repository: `git@github.com:mdntsys/my-fi-app.git` (default branch `main`).

## Git workflow — hard rules

- **Never commit without explicit approval.** Do not run `git commit` (or `git commit --amend`) unless I have asked for it in the current turn. Staging files is fine when preparing a commit for review, but stop before the commit itself.
- **Never push without explicit approval.** Do not run `git push`, `git push --force`, or any variant. This includes pushing newly created branches.
- **Never force-push.** Even with approval, prefer a new commit over `--force` / `--force-with-lease` unless I explicitly ask for it.
- **No destructive git operations without confirmation.** `git reset --hard`, `git clean -fd`, `branch -D`, `checkout -- .`, deleting remotes, rewriting history — always ask first.
- **No `--no-verify`.** If a pre-commit or pre-push hook fails, surface the failure and fix the underlying issue. Do not skip hooks.
- **Branching is fine.** Creating local branches, switching branches, and staging changes locally don't need approval.
- **Never attribute yourself as a contributor.** When I approve a commit, do not add `Co-Authored-By: Claude`, `Generated with Claude Code`, or any similar trailer/footer. Commits are authored solely by me (`Nicolas Perez <nic@midnitesystems.com>`). This applies to commit messages, PR bodies, and anything else that lands on GitHub.

When you finish a unit of work, summarize the diff and propose a commit message — wait for me to say "commit" (and separately "push") before executing.

## Working preferences

- Keep responses tight. Skip trailing recaps of what I can read in the diff.
- Prefer editing existing files over creating new ones.
- Don't add files I didn't ask for (READMEs, scaffolding docs, example configs).
