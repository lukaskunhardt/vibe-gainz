## Project Overview:

github repo: git@github.com:lukaskunhardt/vibe-gainz.git

This is supposed to be a nextjs based app for high volume calisthenics based on Kyle Bogemans (Kboges) training style. the training is based around logging a push, pull and leg calisthenics movement everyday. (For example squats, push ups or pull ups). Movement can be varied during the days, but each category gets the same volume target every day. The app has supabase auth and logs the values for each day. The web app is optimized for mobile, but could be used on a desktop as well.

# Detailed User Flow & Screen Specifications

## 1. Sign Up / Login Screen

**Purpose:** Authenticate users via Supabase email auth

**UI Elements:**

- App name at top: Vibe Gainz
- Email input field
- Magic link button: "Send Login Link" 
- Small text: "We'll email you a link to sign in"

**Flow:**

- User enters email → Supabase sends magic link → user clicks link in email → authenticated
- After successful auth, redirect to Dashboard (if returning user) or Onboarding (if new user)

**Edge Cases:**

- Invalid email format → show inline error
- Email sending failure → show retry option

---

## 2. Onboarding Screen (First Time Users Only)

**Purpose:** Explain the training philosophy before user starts

**UI Elements:**

- 3-4 swipeable cards or single scrollable page explaining:
  - Card 1: "Train Push, Pull, Legs every day"
  - Card 2: "Hit your daily volume target" (visual of progress bars)
  - Card 3: "Quality over quantity - first set matters most"
  - Card 4: "Track progress with smart max effort tests"
- "Get Started" button at the end

**Flow:**

- User reads through → taps "Get Started" → goes to Dashboard (locked state)

---

## 3. Dashboard - Locked State (No Max Efforts Recorded)

**Purpose:** Initial state before any movement is unlocked

**UI Elements:**

- Three rows, each taking ~30% vertical space:
  - **PUSH** row with locked icon 🔒
  - **PULL** row with locked icon 🔒  
  - **LEGS** row with locked icon 🔒
- Each row shows: "Record max effort to unlock"
- Tap any row to start that movement's onboarding

**Styling:**

- Rows are full-width, minimal padding
- Locked state: muted colors (gray overlay)
- Clear tap targets

**Flow:**

- Tap locked row → Navigate to Movement Selection Screen for that category

---

## 4. Movement Selection Screen (First Time for Each Category)

**Purpose:** Let user choose their current ability level for a movement

**URL/State:** `/movement/[push|pull|legs]/select`

**UI Elements:**

- Header: "Select Your [PUSH/PULL/LEGS] Starting Point"
- Subtitle: "Choose an exercise you can do at least 5 reps of with good form"
- List of exercise variations (easiest to hardest):

**PUSH variations:**

  - Wall push-ups ❓
  - Incline push-ups (hands elevated on stairs or box) ❓
  - Knee push-ups ❓
  - Regular push-ups ❓
  - Weighted push-ups ❓

**PULL variations:**

  - Incline Rows ❓
  - Australian pull-ups (horizontal rows) ❓
  - Jumping pull-ups ❓
  - Regular pull-ups ❓
  - Weighted pull-ups ❓

**LEGS variations:**

  - Chair squat ❓
  - Assisted squats (holding support) ❓
  - Bodyweight squats ❓
  - Lunge ❓
  - Jump squats ❓
  - Pistol squats (progression) ❓
  - Weighted squats ❓

- Each option as a selectable card/row
- Each exercise has a question mark icon (❓) on the right side

**Flow:**

- **Tap exercise name:** Selects it → Navigate directly to Recording Screen (max effort mode)
- **Tap ❓ icon:** Opens Exercise Information Screen (view only)

---

## 5. Exercise Information Screen (Reusable)

**Purpose:** Show form cues and instructional video for any exercise. Pure informational screen - no recording functionality.

**URL/State:** `/movement/[push|pull|legs]/[exercise-name]/info`

**Accessible From:**

- Movement Selection Screen (tap ❓ icon)
- Daily Logging Screen (tap ❓ icon next to exercise name)

**UI Elements:**

- Header: "[Exercise Name] Form Guide"
- Key form cues (3-5 bullet points):

**Push-ups example:**

  - "Elbows close to body (not flared)"
  - "Control the descent (3 second eccentric)"
  - "Full lockout at top"
  - "Chest touches ground or fist"
  - "Maintain plank position (no sagging hips)"

**Pull-ups example:**

  - "Dead hang start (full elbow extension)"
  - "Pull until chin clears bar"
  - "Control the descent (no dropping)"
  - "Engage lats, not just arms"
  - "No kipping or swinging"

**Squats example:**

  - "Feet shoulder-width apart"
  - "Knees track over toes (don't cave inward)"
  - "Descend until thighs parallel or below"
  - "Keep chest up, core braced"
  - "Drive through heels to stand"

- **Embedded YouTube video** (placeholder URL for now, you'll fill in later)
  - Video player embedded in screen
  - Defaults to paused state

**Navigation:**

- Back button/arrow returns to previous screen

**Flow:**

- User taps ❓ icon from anywhere → This screen opens → User watches video and reads cues → Taps back to return

---

## 6. Recording Screen (Unified)

**Purpose:** Record sets - either max effort tests OR daily workout sets. Same screen, different modes.

**URL/State:** `/movement/[push|pull|legs]/record?mode=[max_effort|daily]&exercise=[exercise-name]`

**Mode Parameters:**

- `mode=max_effort` - Recording a max effort benchmark test
- `mode=daily` - Regular daily workout logging

---

### MAX EFFORT MODE

**When Active:**

- First time unlocking a movement
- After Max Effort Prompt modal when user clicks "Record Now"

**UI Elements:**

- **Header:** "Max Effort - [Exercise Name]"
- **Description:** "Do as many quality reps as you can. Focus on form, and slow and controlled movements"
- **Rep Counter (Center):**
  - Large number display
  - Starts at last max effort value (or 0 for first time)
  - Plus button (right, large, thumb-friendly)
  - Minus button (left, large)
  - Tap number to open keyboard for manual entry
- **Action Button:** "Log Max Effort"
- **Exercise Switcher** (will use the last selected exercise, UNLESS it is a pre-standard exercise for each movement, and the user did more than 20 in the last max effort. the standard for push pull and leg are pushup pullup and squats. up to this difficulty level, the benchmark test will automatically try to improve difficulty, if the last benchmark exceeded 20. e.g last log was 21 wall push ups, now it will automatically try to benchmark for knee puhs ups. If the last max effort was 40 push ups, it will still select push ups, as they are already the standard for the push movement. )
- **NO RPE Selector** (max effort is always ~RPE 10)

**Flow:**

1. User performs max effort set, enters reps
2. Taps "Log Max Effort"
3. System calculates daily volume target:

   - **First max effort (week 1):** 80% of max effort (Minimum Effective Dose approach)
   - Example: 50 max effort → 40 reps/day target
   - **Subsequent max efforts:** Updates max effort value, daily target adjusted by Weekly Review

4. Navigate to Dashboard
5. Success toast: "Daily target: [X] reps - This is the testing week to assess your recovery. We will adjust the number of daily reps based on how well you tolerate additional volume"

**Data Saved:**

- Movement category
- Exercise variation
- Reps
- Timestamp
- is_max_effort: true
- Calculates and stores daily_target in movements table (80% of max for first week)

---

### DAILY LOGGING MODE

**When Active:**

- User taps unlocked movement row on Dashboard (without trophy icon)
- User clicks "Skip for Today" on Max Effort Prompt

**UI Elements:**

- **Header:** "[PUSH/PULL/LEGS] Workout"
- **Progress Indicator (Top):**
  - "45/150 reps"
  - Small progress bar
  - Back arrow to Dashboard

- **Exercise Selection:**
  - Current exercise as chip/pill: "Regular Push-ups" ❓
  - Tap exercise name → opens modal to switch exercise variation (exercise selection screen displayed as modal)
  - Tap ❓ → opens Exercise Information Screen

- **Rep Counter (Center):**
  - Large number display with predicted value
  - Prediction logic:
    - First set of day: previous day's first set OR (if not present) max effort × 0.8
    - Subsequent sets: previous set - 2-3 reps (fatigue adjustment)
  - Plus button (right, large)
  - Minus button (left, large)
  - Tap number to open keyboard

- **RPE Selector:**
  - Label: "Rate of Perceived Exertion"
  - 10 circular buttons numbered 1-10
  - Default: RPE 8
  - Selected state: filled/highlighted
  - question mark to display pop up with Guide text: "1=Very Easy ... 10=Max Effort", inlcude information of how many reps one would be able to do at each rpe

- **Action Button:** "Log Set"

**Flow:**

1. Screen loads with predicted reps and current exercise
2. User does the exercise
3. based on what the user could do, they adjusts reps if needed (± or tap to edit)
4. User optionally switches exercise or views form cues (❓)
5. User selects RPE
6. Taps "Log Set"
7. **IF RPE = 10:** Show RPE 10 Confirmation Modal (see below)

**ELSE:** Continue to step 8

8. Brief success animation (progress updates)
9. Automatically stays on screen with reset counter (new prediction)
10. User can log another set or tap back to Dashboard

**RPE 10 Confirmation Modal:**

**Trigger:** User selects RPE 10 and taps "Log Set" during daily logging

**UI Elements:**

- Modal overlay
- Warning icon ⚠️
- Header: "Training to Failure?"
- Text: "RPE 10 means you went to complete failure. Training to failure causes significantly more fatigue with minimal extra growth stimulus. This can reduce your weekly volume capacity. Try to stop at a number of repetitions where you could do 2-3 more if you tried."
- Small additional text: "Do you want to log this as a new max effort?"
- Three buttons:
  - "Log as Max Effort" → Logs with is_max_effort: true, updates max effort value
  - "Log as Regular Set" → Logs with is_max_effort: false, RPE 10
  - "Change RPE" (secondary/link style) → Closes modal, returns to RPE selector

**Flow:**

- User selects "Log as Max Effort":
  - Set saved with is_max_effort: true
  - Updates max_effort_reps in movements table
  - Success message: "Max effort recorded! [X] reps"
  - Returns to Dashboard

- User selects "Log as Regular Set":
  - Set saved with is_max_effort: false, rpe: 10
  - Success message: "Set logged"
  - Stays on recording screen for another set

- User selects "Change RPE":
  - Modal closes
  - RPE selector remains active for user to choose different RPE (1-9)
  - User can then tap "Log Set" again

**Data Saved:**

- Movement category
- Exercise variation
- Reps
- RPE
- Timestamp
- Set number for the day
- is_max_effort: false

---

## 7. Dashboard - Active State (Daily Usage)

**Purpose:** Main screen for logging daily workouts

**UI Elements:**

- Three rows (same layout as locked state):
  - **PUSH** - [X/Y reps] with progress bar overlay (e.g., "45/150 reps" with 30% progress bar)
  - **PULL** - [X/Y reps] with progress bar overlay
  - **LEGS** - [X/Y reps] with progress bar overlay
- Progress bar: visual overlay on each row, fills left to right
- Unlocked movements show current exercise variation in smaller text below category name
- If max effort benchmark unlocked: small trophy icon 🏆 in top-right of that row

**Color:**

- **dark background with light color text and light progress bar shader**

**Flow:**

- Tap any unlocked row → Navigate to Recording Screen (mode=daily)
- If row has trophy icon → Show Max Effort Prompt Modal first

**Top Navigation:**

- Date selector (today by default, can view previous days)
- Stats/History icon (top-right) → Navigate to Stats Screen
- Settings icon

---

## 8. Max Effort Benchmark Prompt (Modal/Overlay)

**Purpose:** Opt-in prompt when system detects user is ready for retest

**Trigger Conditions:**

- Consistent logging (e.g., 6+ days in past week)
- At least 7 days since last max effort test
- Or last days first set exceeded max effort

**UI Elements:**

- Modal overlay on dashboard
- Trophy icon 🏆
- Header: "Max Effort Benchmark Unlocked!"
- Text: "Your strength has improved! Ready to test your progress?"
- Two buttons:
  - "Record Now" (primary) → Navigate to Recording Screen (mode=max_effort)
  - "Skip for Today" (secondary) → Dismiss modal, navigate to Recording Screen (mode=daily)

**Flow:**

- User chooses to record → Recording Screen in max effort mode (updates targets after completion)
- User skips → Recording Screen in daily mode, trophy icon persists until next day

---

## 10. Weekly Review Screen

**Purpose:** Assess recovery and set volume targets for the upcoming week

**Trigger:** Automatically appears on mondays

**URL/State:** `/weekly-review/[push|pull|legs]`

**UI Elements:**

**Recovery Score Display (Top Section):**

- Large circular gauge showing Recovery Score: X/100
- Not Color-coded:
  - 85-100: Dark Green (Excellent)
  - 70-84: Light Green (Good)
  - 55-69: Yellow (Moderate)
  - 40-54: Orange (Marginal)
  - 20-39: Red (Poor)
  - 0-19: Dark Red (Very Poor)

**Recovery Score Breakdown (Expandable Section):**

- Tap "See Breakdown" to expand details
- Shows 4 components with individual scores:

**1. First Set Performance (40 points)**

  - "This week avg: 28 reps | Last week: 25 reps (+12%)"
  - Score: 38/40 ✓

**2. RPE Efficiency (30 points)**

  - "Reps per RPE point: 3.2 | Last week: 2.8 (+14%)"
  - Score: 28/30 ✓

**3. Target Achievement (20 points)**

  - "Days hitting target: 7/7 days"
  - Score: 20/20 ✓

**4. Consistency (10 points)**

  - "Days logged: 7/7"
  - Score: 10/10 ✓

**Volume Suggestion Section:**

- Current daily target displayed: "Current: 100 reps/day"
- Suggested new target based on recovery score:
  - Recovery 85-100: "+20-30 % → Suggested: 125 reps/day"
    - Message: "Crushing it! Your recovery is excellent. Ready for a bigger jump?"
  - Recovery 70-84: "+15 % → Suggested: 115 reps/day"
    - Message: "Strong progress! You're ready for more volume."
  - Recovery 55-69: "+10 % → Suggested: 110 reps/day"
    - Message: "Steady gains! Standard progression this week."
  - Recovery 40-54: "+5 % → Suggested: 105 reps/day"
    - Message: "Taking it easy. Small increase to maintain adaptation."
  - Recovery 20-39: "Hold → Suggested: 100 reps/day"
    - Message: "Focus on recovery. Maintaining current volume."
  - Recovery 0-19: "-10 to -15 % → Suggested: 90 reps/day"
    - Message: "Recovery needed. Reducing volume to bounce back stronger."

**Target Adjustment Controls:**

- Editable input field showing suggested target
- Plus/Minus buttons to adjust in increments of 5 reps
- User can override to any value they prefer
- Small warning if user chooses much higher than suggested (e.g., +50 when suggestion is +10)
  - "Are you sure? This is significantly more than recommended based on your recovery."

**Action Buttons:**

- "Set New Target" (primary button) - applies the displayed target
- "Keep Current Target" (secondary button) - maintains existing volume

**Flow:**

1. Screen appears at start of new week (or can be accessed from Settings)
2. Shows recovery score calculation
3. User reviews breakdown (optional tap to expand)
4. User sees suggested target
5. User can accept, modify up/down, or keep current
6. Taps "Set New Target" → Returns to Dashboard with updated daily targets
7. Brief toast: "New daily target: X reps. Let's grow!"

**Multi-Movement Flow:**

- sequential screens: "1/3: Push Review" → Next → "2/3: Pull Review" → etc.
- Each movement gets its own recovery score and suggestion

**Skip/Defer Option:**

- "Review Later" button if user wants to defer decision
- Can access from Settings → "Weekly Review" at any time

**Data Saved:**

- New daily target for the movement
- Recovery score for the week (historical tracking)
- User's decision (accepted suggestion vs custom override)
- Week number/date range

---

## 11. Stats / Progress Screen

**Purpose:** Visualize progress over time

**URL/State:** `/stats` OR `/stats/[push|pull|legs]`

**UI Elements:**

**Tab/Segment Control (Top):**

- Dropdown menu to select which movements to display
- Shows stats for all selected movements

**Weekly Volume Chart:**

- Bar chart showing total daily volume (stacked by day)
- X-axis: Week number or date range
- Y-axis: Total reps
- Max effort sets highlighted in red
- Different colors for different exercises within category



**Navigation:**

- Back to Dashboard button
- Filter by date range (last 7 days, 30 days, all time)

---

## 11. Settings Screen

**Purpose:** Account management and app preferences

**UI Elements:**

- Account section:
  - Email display
  - Sign out button

---

## Key Navigation Flow Summary

```
Sign Up/Login → Onboarding (first time) → Dashboard (Locked)
                                             ↓
                           Tap locked row → Movement Selection
                                             ↓
                                        Select Exercise → Instructions
                                                            ↓
                                                     Max Effort Recording
                                                            ↓
                                                      Dashboard (Active)
                                                            ↓
                        ┌──────────────────────────────────┼────────────┐
                        ↓                                  ↓            ↓
              Daily Logging (repeat)          Max Effort Prompt    Stats Screen
                        ↓                                  ↓
                  Back to Dashboard                 Max Effort Recording
```

---

# Vibe Gainz Technical Implementation Plan

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **State Management**: React Server Components + Client Context for UI state
- **Code Quality**: ESLint + Prettier
- **Deployment**: Vercel

## Database Schema

### 1. profiles (extends Supabase auth.users)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. movements (tracks user's unlocked movements and targets)

```sql
CREATE TYPE movement_category AS ENUM ('push', 'pull', 'legs');

CREATE TABLE movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category movement_category NOT NULL,
  exercise_variation TEXT NOT NULL,
  max_effort_reps INTEGER NOT NULL,
  max_effort_date TIMESTAMPTZ NOT NULL,
  daily_target INTEGER NOT NULL,
  is_unlocked BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);
```

### 3. sets (logs all workout sets)

```sql
CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_id UUID REFERENCES movements(id) ON DELETE SET NULL,
  category movement_category NOT NULL,
  exercise_variation TEXT NOT NULL,
  reps INTEGER NOT NULL,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  is_max_effort BOOLEAN DEFAULT FALSE,
  set_number INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sets_user_logged_at ON sets(user_id, logged_at DESC);
CREATE INDEX idx_sets_user_category_logged_at ON sets(user_id, category, logged_at DESC);
```

### 4. weekly_reviews (tracks recovery scores and target adjustments)

```sql
CREATE TABLE weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  category movement_category NOT NULL,
  week_start_date DATE NOT NULL,
  recovery_score INTEGER CHECK (recovery_score >= 0 AND recovery_score <= 100),
  first_set_performance_score INTEGER CHECK (first_set_performance_score >= 0 AND first_set_performance_score <= 40),
  rpe_efficiency_score INTEGER CHECK (rpe_efficiency_score >= 0 AND rpe_efficiency_score <= 30),
  target_achievement_score INTEGER CHECK (target_achievement_score >= 0 AND target_achievement_score <= 20),
  consistency_score INTEGER CHECK (consistency_score >= 0 AND consistency_score <= 10),
  previous_daily_target INTEGER NOT NULL,
  suggested_daily_target INTEGER NOT NULL,
  chosen_daily_target INTEGER NOT NULL,
  user_overrode_suggestion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, week_start_date)
);
```

### 5. max_effort_prompts (tracks benchmark test eligibility)

```sql
CREATE TABLE max_effort_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  category movement_category NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL,
  dismissed BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Row Level Security Policies

Enable RLS on all tables and create policies:

```sql
-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- movements
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own movements" ON movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own movements" ON movements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own movements" ON movements FOR UPDATE USING (auth.uid() = user_id);

-- sets
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sets" ON sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sets" ON sets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- weekly_reviews
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reviews" ON weekly_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON weekly_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- max_effort_prompts
ALTER TABLE max_effort_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prompts" ON max_effort_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prompts" ON max_effort_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompts" ON max_effort_prompts FOR UPDATE USING (auth.uid() = user_id);
```

## Project Structure

```
/vibe-gainz
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx              # Sign up / Login screen
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts          # Auth callback handler
│   ├── (protected)/
│   │   ├── layout.tsx                # Protected route wrapper
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Main dashboard (locked/active states)
│   │   ├── onboarding/
│   │   │   └── page.tsx              # First-time user onboarding
│   │   ├── movement/
│   │   │   └── [category]/
│   │   │       ├── select/
│   │   │       │   └── page.tsx      # Movement selection screen
│   │   │       ├── record/
│   │   │       │   └── page.tsx      # Recording screen (max effort & daily)
│   │   │       └── [exercise]/
│   │   │           └── info/
│   │   │               └── page.tsx  # Exercise information screen
│   │   ├── weekly-review/
│   │   │   └── [category]/
│   │   │       └── page.tsx          # Weekly review screen
│   │   ├── stats/
│   │   │   └── page.tsx              # Stats/progress screen
│   │   └── settings/
│   │       └── page.tsx              # Settings screen
│   ├── api/
│   │   └── auth/
│   │       └── signout/
│   │           └── route.ts          # Sign out API route
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Global styles + Tailwind
├── components/
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── progress.tsx
│   │   ├── modal.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── dashboard/
│   │   ├── movement-row.tsx          # Dashboard movement row component
│   │   └── max-effort-prompt-modal.tsx
│   ├── recording/
│   │   ├── rep-counter.tsx           # Rep counter with +/- buttons
│   │   ├── rpe-selector.tsx          # RPE selector (1-10)
│   │   └── rpe-10-confirmation-modal.tsx
│   ├── weekly-review/
│   │   ├── recovery-score-gauge.tsx  # Circular gauge component
│   │   └── score-breakdown.tsx       # Breakdown of score components
│   └── providers/
│       ├── supabase-provider.tsx     # Supabase client provider
│       └── toast-provider.tsx        # Toast notifications
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Client-side Supabase client
│   │   ├── server.ts                 # Server-side Supabase client
│   │   └── middleware.ts             # Auth middleware
│   ├── constants/
│   │   ├── exercises.ts              # Exercise variations and form cues
│   │   └── progression.ts            # Exercise progression rules
│   ├── utils/
│   │   ├── calculations.ts           # Target calculations, recovery score
│   │   ├── predictions.ts            # Rep predictions for sets
│   │   └── date-helpers.ts           # Date/week utilities
│   └── hooks/
│       ├── use-movements.ts          # Fetch user movements
│       ├── use-sets.ts               # Fetch sets for date/category
│       └── use-weekly-review.ts      # Weekly review data
├── types/
│   ├── database.ts                   # Generated Supabase types
│   └── index.ts                      # Shared types
├── middleware.ts                     # Next.js middleware for auth
├── .eslintrc.json
├── .prettierrc
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Key Implementation Details

### Exercise Variations Data Structure (`lib/constants/exercises.ts`)

```typescript
export const EXERCISE_VARIATIONS = {
  push: [
    { id: 'wall-pushups', name: 'Wall Push-ups', difficulty: 1, isStandard: false },
    { id: 'incline-pushups', name: 'Incline Push-ups', difficulty: 2, isStandard: false },
    { id: 'knee-pushups', name: 'Knee Push-ups', difficulty: 3, isStandard: false },
    { id: 'regular-pushups', name: 'Regular Push-ups', difficulty: 4, isStandard: true },
    { id: 'weighted-pushups', name: 'Weighted Push-ups', difficulty: 5, isStandard: true },
  ],
  pull: [
    { id: 'incline-rows', name: 'Incline Rows', difficulty: 1, isStandard: false },
    { id: 'australian-pullups', name: 'Australian Pull-ups', difficulty: 2, isStandard: false },
    { id: 'jumping-pullups', name: 'Jumping Pull-ups', difficulty: 3, isStandard: false },
    { id: 'regular-pullups', name: 'Regular Pull-ups', difficulty: 4, isStandard: true },
    { id: 'weighted-pullups', name: 'Weighted Pull-ups', difficulty: 5, isStandard: true },
  ],
  legs: [
    { id: 'chair-squat', name: 'Chair Squat', difficulty: 1, isStandard: false },
    { id: 'assisted-squats', name: 'Assisted Squats', difficulty: 2, isStandard: false },
    { id: 'bodyweight-squats', name: 'Bodyweight Squats', difficulty: 3, isStandard: true },
    { id: 'lunge', name: 'Lunge', difficulty: 4, isStandard: true },
    { id: 'jump-squats', name: 'Jump Squats', difficulty: 5, isStandard: true },
    { id: 'pistol-squats', name: 'Pistol Squats', difficulty: 6, isStandard: true },
    { id: 'weighted-squats', name: 'Weighted Squats', difficulty: 7, isStandard: true },
  ],
};

export const FORM_CUES = {
  'regular-pushups': {
    cues: [
      'Elbows close to body (not flared)',
      'Control the descent (3 second eccentric)',
      'Full lockout at top',
      'Chest touches ground or fist',
      'Maintain plank position (no sagging hips)',
    ],
    videoUrl: 'https://www.youtube.com/embed/PLACEHOLDER_PUSHUP',
  },
  // ... more exercises
};
```

### Calculation Utilities (`lib/utils/calculations.ts`)

```typescript
// Calculate daily target from max effort (80% for week 1)
export function calculateInitialDailyTarget(maxEffortReps: number): number {
  return Math.floor(maxEffortReps * 0.8);
}

// Recovery score calculation
export function calculateRecoveryScore(data: WeeklyData): RecoveryScore {
  // First set performance (40 points)
  // RPE efficiency (30 points)
  // Target achievement (20 points)
  // Consistency (10 points)
  // Returns breakdown + total score
}

// Volume adjustment suggestion
export function suggestVolumeAdjustment(recoveryScore: number, currentTarget: number) {
  if (recoveryScore >= 85) return { percentage: 0.25, newTarget: Math.floor(currentTarget * 1.25) };
  if (recoveryScore >= 70) return { percentage: 0.15, newTarget: Math.floor(currentTarget * 1.15) };
  if (recoveryScore >= 55) return { percentage: 0.10, newTarget: Math.floor(currentTarget * 1.10) };
  if (recoveryScore >= 40) return { percentage: 0.05, newTarget: Math.floor(currentTarget * 1.05) };
  if (recoveryScore >= 20) return { percentage: 0, newTarget: currentTarget };
  return { percentage: -0.125, newTarget: Math.floor(currentTarget * 0.875) };
}

// Auto-progression logic for max effort tests
export function shouldAutoProgress(exercise: Exercise, lastMaxEffort: number): Exercise | null {
  if (exercise.isStandard) return null; // Don't auto-progress beyond standard
  if (lastMaxEffort > 20) {
    // Find next difficulty exercise
    return getNextDifficultyExercise(exercise);
  }
  return null;
}
```

### Prediction Utilities (`lib/utils/predictions.ts`)

```typescript
// Predict reps for next set
export function predictReps(
  setsToday: Set[],
  maxEffortReps: number,
  previousDayFirstSet?: number
): number {
  if (setsToday.length === 0) {
    // First set of the day
    return previousDayFirstSet ?? Math.floor(maxEffortReps * 0.8);
  }
  
  // Subsequent sets: previous set - 2-3 reps
  const lastSet = setsToday[setsToday.length - 1];
  return Math.max(1, lastSet.reps - 3);
}
```

### Authentication Flow

1. Magic link authentication via Supabase
2. Middleware checks auth state on protected routes
3. Redirect to `/onboarding` if `onboarding_completed = false`
4. Redirect to `/dashboard` if already onboarded

### Key Features Implementation

**Dashboard State Logic:**

- Query `movements` table for user's unlocked movements
- For each category, aggregate today's sets to show progress (X/Y reps)
- Check `max_effort_prompts` table for active prompts (trophy icon)
- Show locked state if movement not in `movements` table

**Max Effort Auto-Detection:**

- Check if 7+ days since last max effort
- OR check if yesterday's first set exceeded current max effort
- Create record in `max_effort_prompts` table
- Show modal on dashboard

**Weekly Review Trigger:**

- Run check on dashboard load: is it Monday + no review for current week?
- Calculate recovery score from previous week's data
- Sequential flow: Push → Pull → Legs reviews

**RPE 10 Confirmation:**

- Modal intercepts "Log Set" when RPE = 10
- Three options: max effort, regular set, or change RPE
- If "max effort" selected, update `movements.max_effort_reps` and recalculate targets

## Configuration Files

### `package.json` dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.344.0",
    "date-fns": "^3.0.0",
    "recharts": "^2.10.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^15.0.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

### Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Mobile Optimization

- Tailwind responsive classes (mobile-first)
- Touch-friendly button sizes (min 44px tap targets)
- Optimized for vertical viewport
- PWA-ready with manifest.json (optional future enhancement)

## Implementation Order

1. **Bootstrap with Supabase starter**: Run `pnpm create next-app --example with-supabase`

   - This provides Next.js 15 + App Router, TypeScript, and Supabase client pre-configured
   - Authentication middleware and basic auth flow already set up

2. Verify/add Tailwind CSS configuration (likely included in starter)
3. Configure ESLint and Prettier with appropriate rules
4. Install and configure shadcn/ui components
5. Create Supabase database schema and run migrations with RLS policies
6. Customize authentication UI (starter provides basic email/password auth)
7. Build constants (exercise variations, form cues, progression logic)
8. Implement utility functions (calculations, predictions, date helpers)
9. Create onboarding flow screen
10. Build dashboard (locked/active states)
11. Implement movement selection and exercise info screens
12. Build recording screen (max effort & daily modes)
13. Implement RPE 10 confirmation modal and max effort prompt
14. Build weekly review calculation and UI
15. Add stats/progress screen
16. Create settings screen
17. Polish UI/UX and mobile responsiveness
18. Testing and bug fixes

## Training principles

- set daily volume target based on max effort set
- reach that volume target every day
- add 5-10 reps each week
- first set is most important, go near failure, but not to failure
- every subsequent set has increasingly more fatigue, and less growth stimulus. So the focus is on making high quality sets, the first one being most important
- this is a life long program
- training to failure causes much more fatigue than training with RPE 8 for example, with only marginal increases in stimulus. Training to failure then might diminish the possible volume you can train in a week, which can be counterproductive