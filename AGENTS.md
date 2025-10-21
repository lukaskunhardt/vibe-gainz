# Repository Guidelines

- Standard workflow includes fetching an issue, which you then attempt to solve. Often the issues are not detailed enough for you to implement them directly, ask the user detailed follow up questions on how to implement this issue
- Fetch GitHub issues reliably with: `gh issue view <num> --repo lukaskunhardt/vibe-gainz --json number,title,state,body,url` (avoids deprecated Projects Classic fields). Always use `required_permissions: ["all"]` when running this command to avoid TLS certificate errors.

Delete unused or obsolete files when your changes make them irrelevant (refactors, feature removals, etc.), and revert files only when the change is yours or explicitly requested. If a git operation leaves you unsure about other agents' in-flight work, stop and coordinate instead of deleting.
Before attempting to delete a file to resolve a local type/lint failure, stop and ask the user. Other agents are often editing adjacent files; deleting their work to silence an error is never acceptable without explicit approval.
NEVER edit .env or any environment variable files—only the user may change them.
Coordinate with other agents before removing their in-progress edits—don't revert or delete work you didn't author unless everyone agrees.
Moving/renaming and restoring files is allowed.
ABSOLUTELY NEVER run destructive git operations (e.g., git reset --hard, rm, git checkout/git restore to an older commit) unless the user gives an explicit, written instruction in this conversation. Treat these commands as catastrophic; if you are even slightly unsure, stop and ask before touching them. (When working within Cursor or Codex Web, these git limitations do not apply; use the tooling's capabilities as needed.)
Never use git restore (or similar commands) to revert files you didn't author—coordinate with other agents instead so their in-progress work stays intact.
Always double-check git status before any commit
Keep commits atomic: commit only the files you touched and list each path explicitly. For tracked files run git commit -m "<scoped message>" -- path/to/file1 path/to/file2. For brand-new files, use the one-liner git restore --staged :/ && git add "path/to/file1" "path/to/file2" && git commit -m "<scoped message>" -- path/to/file1 path/to/file2.
Quote any git paths containing brackets or parentheses (e.g., src/app/[candidate]/\*\*) when staging or committing so the shell does not treat them as globs or subshells.
Never amend commits unless you have explicit written approval in the task thread.

## Coding Style & Naming Conventions

- TypeScript + React (Next.js App Router).
- Formatting: Prettier; run `pnpm format` before commits.
- Linting: ESLint (Next.js config). Fix warnings when feasible.
- Components: PascalCase in `components/`.
- Hooks: `use-*` naming in `lib/hooks/` (e.g., `use-friends.ts`).
- Routes: kebab-case directories under `app/` (e.g., `app/(dashboard)/weekly-review/[category]/`).
- Imports: prefer `@/` alias for local modules.

## Commit & Pull Request Guidelines

- Conventional Commits: `feat:`, `fix:`, `docs:`, etc. Example: `feat(friends): implement timeline feed`.
- Link issues: `Closes #<id>` in commit/PR descriptions.
- run pnpm build before committing to fix any errors that might cause the code to fail to compile.

## Security & Configuration

- Env: `.env.local` define `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (do not commit secrets). Do not change this file.
- Database changes must include an SQL migration and RLS updates.
