## Project Overview

## Project Overview:

github repo: git@github.com:lukaskunhardt/vibe-gainz.git

This is supposed to be a nextjs based app for high volume calisthenics based on Kyle Bogemans (Kboges) training style. the training is based around logging a push, pull and leg calisthenics movement everyday. (For example squats, push ups or pull ups). exercises can be varied during the days, but each movement category gets hit every day. The app has supabase auth and logs the values for each day. The web app is optimized for mobile, but could be used on a desktop as well.

# Detailed User Flow & Screen Specifications

## 1. Authentication & Onboarding

### Sign Up / Login

- Email-only Supabase auth (magic link).
- Flow: user enters email → Supabase sends link → link opens the app, the session is established.
- After login: returning users land on the Dashboard; brand-new accounts go through onboarding once.
- Failure states surface inline to the user (invalid email, link resend errors).

### First-Time Onboarding

- Short intro covering daily push/pull/legs structure, readiness logging, and the role of max-effort benchmarks.
- “Get Started” button exits onboarding and opens the Dashboard with locked movement cards until each category has a baseline max effort.

## 2. Daily Routine Overview

### Step 1 – Record Readiness (`/readiness`)

- User selects a readiness score (1–5) and can optionally log body weight.
- Submission updates `daily_user_stats` (`readiness_score`, `body_weight_kg`) via upsert keyed on `(user_id, date)`.
- Readiness is the single input that controls the set prescription for all categories that day.

### Step 2 – Dashboard (`/dashboard`)

- Three movement cards (push, pull, legs) show:
  - Prescribed vs completed sets using the new set-count progress bar.
  - Readiness-adjusted target reps (`getDailyPrescription`).
  - Trophy icon when a PR prompt is pending (based on `exercise_status.prompt_pending`).
  - Streak chip sourced from Supabase RPCs (unchanged) and GIF hover cues.
  - Max-effort results if a test has already been logged that day.
- Desktop surfaces the `StatsContent` charts below the cards; mobile links to the same analytics via the nav.
- Dashboard no longer references target volume, weekly review banners, or prompt tables—the logic now reads directly from `exercise_status`.

### Step 3 – Logging Sets (`/movement/[category]/record`)

- Unified recording screen handles daily sets and max-effort tests.
- The set list shows planned placeholders (dashed outline) for every prescribed set. Completed sets replace their placeholder with a green card, border, and check icon.
- `SetCountProgressBar` mirrors the dashboard styling.
- The modal (`SetLoggingModal`) pre-fills reps based on the next planned set and default RPE from `getDailyPrescription`.
- A PR prompt (new `PRPromptModal`) appears when `exercise_status` indicates the athlete can beat the benchmark and readiness ≥ 3. Accepting the prompt switches the session into max-effort mode; the day is limited to that single test.
- After each logged set:
  - We recompute `rir` and `implied_max_reps`.
  - Non-max sessions auto-redirect to the dashboard once the prescribed set count is satisfied.
  - Max-effort sessions redirect immediately after logging the test to avoid additional work that day.

### Step 4 – Stats (`/stats`)

- Charts focus purely on actual performance—daily rep totals (stacked sets) or max-rep highlights.
- Overlay toggles for readiness, 7‑day trend, and body weight remain.
- Exercise filtering works per category and keeps the last-used variation as default.
- All references to daily target overlay/adjustment have been removed.

### Step 5 – Settings (`/settings`)

- Displays account metadata, link to the onboarding/training guide, and a data reset option.
- Reset now clears `exercise_status` alongside `sets` and `movements`.
- Copy updated to reflect the simplified model (no automated daily target adjustments or weekly review).

## 3. Training Prescription & Max-Effort Logic

### Readiness → Plan Mapping

| Readiness | Prescribed Sets | Target RPE | Notes                                           |
| --------- | --------------- | ---------- | ----------------------------------------------- |
| 5         | 3               | 8          | Full workload.                                  |
| 4         | 2               | 8          | Slightly reduced volume.                        |
| 3         | 1               | 8          | Maintenance effort.                             |
| 2         | 1               | 6          | Keep the movement grooved at a lighter effort.  |
| 1         | 1               | 4          | Minimal stimulus; user may be ill or exhausted. |

- `repsPerSet = maxEffortReps - RIR`, where `RIR = 10 - targetRPE` (clamped to 0–9). Example: PR 10 reps, target RPE 8 → RIR 2 → target reps 8.
- `getDailyPrescription(readiness, maxEffortReps)` (in `lib/utils/prescription.ts`) centralizes this logic.

### Implied Max Detection

- Every logged set calculates `implied_max_reps = reps + RIR`.
- We track the best implied max per exercise (ignoring max-effort flags) and compare it to the stored PR in `exercise_status`.
- If the implied max exceeds the current PR, the status record sets `prompt_pending = true` and stores the candidate set metadata.
- Prompts only surface when readiness ≥ 3 to avoid forcing a test on low-energy days.

### Max-Effort Workflow

- Tests are tied to specific exercises (no more movement-category PRs).
- When the athlete accepts a prompt or chooses “Record Max Effort,” the session records exactly one set for that exercise that day.
- After the set posts, the trigger refreshes `exercise_status`, clears the prompt, and the UI redirects to the dashboard.
- Auto-progress to harder variations has been removed; progression decisions are manual for now.

## 4. Data Model & Automation

### Key Tables

- `movements`: stores unlocked movement per category (no more `max_effort_*` columns).
- `sets`: includes `exercise_variation`, `rir`, and `implied_max_reps`. Max-effort sets are flagged via `is_max_effort`.
- `daily_user_stats`: readiness, body weight, and per-category exercise selections keyed by date.
- `exercise_status`: new table holding per-exercise PRs, implied max data, and prompt state.

### Supabase Migrations

- `011_add_implied_max_to_sets.sql` – backfills RIR/implied max for historical sets.
- `012_create_exercise_status.sql` – creates status table and migrates legacy PR data (movement-level PRs are mapped to exercises where possible).
- `013_refresh_exercise_status_triggers.sql` – trigger + function to recompute status rows after any set insert/update/delete.
- `014_cleanup_legacy_volume.sql` – drops `movement_target_history`, `weekly_reviews`, `max_effort_prompts`, and removes obsolete columns on `movements`.

### Trigger Behavior

- `refresh_exercise_status_for_set` recalculates PR and implied max for the affected exercise.
- Prompt flagging is automatic; clearing occurs when a true max effort meets or exceeds the implied max.
- All logic is RLS-safe (policies restrict access to the owning user).

## 5. UI & Component Notes

- `SetCountProgressBar` shares the visual language of the original dashboard progress bar but counts sets instead of reps.
- `CompletedSetsList` merges planned and completed sets into a single list; placeholders appear dashed, finished sets turn green with a checkmark.
- `PRPromptModal` replaces the old dashboard max-effort modal and is reusable across the recording flow.
- `StatsContent` drops the legacy daily-target overlay while retaining readiness/body-weight toggles and exercise filters.
- Dashboard cards highlight active prompts, max-effort completions, and streaks; they rely solely on the new status data.

## 6. Development Workflow

- Install dependencies: `pnpm install`.
- Run formatters before committing: `pnpm format`.
- Type-check and build: `pnpm build` (runs `next build`, type checks, and linting).
- Migrations live under `supabase/migrations/` and should be executed via `supabase db push` or the project’s preferred deployment routine.
- Keep commits scoped and reference issues with Conventional Commit prefixes (e.g., `feat(training): …`).

## 7. Removed Legacy Features

- Target daily volume calculations, adjustment helpers, and weekly review scoring.
- `movement_target_history`, `weekly_reviews`, and `max_effort_prompts` tables.
- Auto-progression logic that automatically changed exercise variations after large max efforts.
- Any dashboard UI that depended on target volume metrics.

With the simplified readiness → sets model, the codebase centers on clear prescriptions, transparent PR prompts, and per-exercise tracking while removing redundant calculations and tables. Refer to `lib/utils/prescription.ts` and the new migrations for authoritative logic and schema.
