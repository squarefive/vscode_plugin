# Collaboration Protocol

This document defines the user's collaboration protocol for planning, local documentation changes, code changes, persistent commands, branching, merging, and commits.

AI coding tools should follow this protocol before changing local documents, changing code, planning work, running persistent commands, or committing changes.

## 1. Plan Before Acting

Unless the user explicitly asks for execution, do not immediately modify local files, run commands that create persistent changes, or commit to Git.

### 1.1 Required Plan Fields

When giving an implementation plan, list these items first:

- Workspace
- Git branch
- Background
- Goal
- File scope

### 1.2 File Scope Format

When producing an implementation plan, complete the necessary investigation first and list the definitive file scope for additions, modifications, and deletions.

The file scope is for global orientation only. Each file must include only the path and a one-sentence description of the change. Do not include detailed prose, demos, pseudocode, or implementation details in the file scope.

Use this exact format:

```markdown
Modify:
- `path/to/file`: One-sentence description of the change.

Add:
- `path/to/file`: One-sentence description of the new file.

Delete:
- `path/to/file`: One-sentence reason for deletion.
```

If a category has no entries, write `None`, for example:

```markdown
Add: None
Delete: None
```

The file scope must be a deterministic conclusion after investigation. Do not use uncertain wording such as "maybe", "expected", or "probably" as a substitute for confirmed scope. If the complete file scope cannot be determined after investigation, state the uncertainty, the reason, and what needs user confirmation.

### 1.3 Implementation Plan Details

Detailed document text, Markdown examples, code pseudocode, logic drafts, and verification methods must appear in the subsequent implementation plan steps.

For local documentation changes, the implementation plan must explicitly list the concrete content to add, replace, or remove. Do not describe only the general direction.

For code changes, list the file scope separately first. If a step includes code changes, provide pseudocode or a logic draft for that step before editing code.

### 1.4 Branch Strategy

Planning is part of change control. Before modifying files, confirm the current Git branch and worktree status.

Do not add, modify, or delete files directly on `main` or `master` unless the user explicitly asks to work on the main branch.

If the current branch is `main` or `master` and the task will add, modify, or delete files, create a task branch from the current branch before editing files.

If the current branch is already a non-`main` / non-`master` task branch and the new task is aligned with the current branch direction, continue on the current branch.

If the new task is not aligned with the current branch direction, create a new task branch from `main` or from the user-specified baseline branch. Do not mix unrelated task directions in one branch.

Use a short branch name that describes the task intent, for example `docs/update-collaboration-preferences`, `feat/local-qa-agent`, or `fix/agent-doc-format-check`.

If the worktree has uncommitted changes, explain the change state, judge whether it is aligned with the new task, and wait for user confirmation before switching branches or mixing work.

### 1.5 Merge Strategy

When the user asks to merge a task branch into `main` or `master`, keep an explicit merge commit by default:

```bash
git merge --no-ff <branch>
```

Do not use a fast-forward merge unless the user explicitly asks for it.

If the task branch is behind `main` or `master`, first switch to the task branch and merge the latest main branch:

```bash
git switch <branch>
git merge main
```

Resolve conflicts and complete necessary verification on the task branch, then switch back to the main branch and run `git merge --no-ff <branch>`.

Do not rebase task branches by default. Rebase only when the user explicitly asks.

Do not delete the task branch after merging unless the user explicitly asks for cleanup.

## 2. Execution Confirmation

Only start modifying local files, running commands that create persistent changes, or committing to Git after the user clearly expresses execution intent.

Clear execution intent includes:

- "execute"
- "start modifying"
- "implement"
- "apply the plan"
- "commit"
- Other instructions that clearly allow modification or submission

If the user is only discussing options, asking for opinions, requesting a plan, or asking to verify scope, do not modify files.

## 3. Commit Preferences

If the user asks for a commit, inspect the actual diff before committing and generate the commit message from the actual changes.

Documentation design changes and corresponding code implementation changes should be committed separately, unless the change only fixes typos, paths, or examples in documentation.
