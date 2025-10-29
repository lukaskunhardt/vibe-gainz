CREATE TABLE exercise_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  current_pr_reps INTEGER NOT NULL DEFAULT 0,
  current_pr_tested_at TIMESTAMPTZ,
  current_pr_set_id UUID REFERENCES sets(id) ON DELETE SET NULL,
  latest_implied_max_reps INTEGER,
  latest_implied_at TIMESTAMPTZ,
  latest_implied_set_id UUID REFERENCES sets(id) ON DELETE SET NULL,
  prompt_pending BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

ALTER TABLE exercise_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercise status" ON exercise_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise status" ON exercise_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise status" ON exercise_status
  FOR UPDATE USING (auth.uid() = user_id);

-- Backfill existing data based on historical sets and movement records
WITH exercise_candidates AS (
  SELECT DISTINCT user_id, exercise_variation AS exercise_id FROM sets
  UNION
  SELECT user_id, exercise_variation AS exercise_id FROM movements
),
max_ranked AS (
  SELECT
    s.user_id,
    s.exercise_variation AS exercise_id,
    s.id AS set_id,
    s.reps,
    s.logged_at,
    ROW_NUMBER() OVER (PARTITION BY s.user_id, s.exercise_variation ORDER BY s.reps DESC, s.logged_at DESC) AS rn
  FROM sets s
  WHERE s.is_max_effort = TRUE
),
best_max AS (
  SELECT user_id, exercise_id, set_id, reps, logged_at
  FROM max_ranked
  WHERE rn = 1
),
movement_defaults AS (
  SELECT
    user_id,
    exercise_variation AS exercise_id,
    max_effort_reps AS max_reps,
    max_effort_date AS max_date
  FROM movements
),
base AS (
  SELECT
    c.user_id,
    c.exercise_id,
    COALESCE(bm.reps, md.max_reps, 0) AS current_pr_reps,
    COALESCE(bm.logged_at, md.max_date) AS current_pr_tested_at,
    bm.set_id AS current_pr_set_id
  FROM exercise_candidates c
  LEFT JOIN best_max bm
    ON bm.user_id = c.user_id AND bm.exercise_id = c.exercise_id
  LEFT JOIN movement_defaults md
    ON md.user_id = c.user_id AND md.exercise_id = c.exercise_id
),
implied_ranked AS (
  SELECT
    s.user_id,
    s.exercise_variation AS exercise_id,
    s.id AS set_id,
    s.implied_max_reps,
    s.logged_at,
    ROW_NUMBER() OVER (PARTITION BY s.user_id, s.exercise_variation ORDER BY s.implied_max_reps DESC, s.logged_at DESC) AS rn
  FROM sets s
  WHERE s.is_max_effort = FALSE
),
best_implied AS (
  SELECT user_id, exercise_id, set_id, implied_max_reps, logged_at
  FROM implied_ranked
  WHERE rn = 1
),
final AS (
  SELECT
    b.user_id,
    b.exercise_id,
    b.current_pr_reps,
    b.current_pr_tested_at,
    b.current_pr_set_id,
    CASE
      WHEN bi.implied_max_reps > b.current_pr_reps THEN bi.implied_max_reps
      ELSE NULL
    END AS latest_implied_max_reps,
    CASE
      WHEN bi.implied_max_reps > b.current_pr_reps THEN bi.logged_at
      ELSE NULL
    END AS latest_implied_at,
    CASE
      WHEN bi.implied_max_reps > b.current_pr_reps THEN bi.set_id
      ELSE NULL
    END AS latest_implied_set_id,
    CASE
      WHEN bi.implied_max_reps > b.current_pr_reps THEN TRUE
      ELSE FALSE
    END AS prompt_pending
  FROM base b
  LEFT JOIN best_implied bi
    ON bi.user_id = b.user_id AND bi.exercise_id = b.exercise_id
),
final_ranked AS (
  SELECT
    final.*,
    ROW_NUMBER() OVER (
      PARTITION BY final.user_id, final.exercise_id
      ORDER BY final.current_pr_reps DESC,
               final.current_pr_tested_at DESC NULLS LAST
    ) AS rn
  FROM final
)
INSERT INTO exercise_status (
  user_id,
  exercise_id,
  current_pr_reps,
  current_pr_tested_at,
  current_pr_set_id,
  latest_implied_max_reps,
  latest_implied_at,
  latest_implied_set_id,
  prompt_pending,
  created_at,
  updated_at
)
SELECT
  user_id,
  exercise_id,
  current_pr_reps,
  current_pr_tested_at,
  current_pr_set_id,
  latest_implied_max_reps,
  latest_implied_at,
  latest_implied_set_id,
  prompt_pending,
  NOW(),
  NOW()
FROM final_ranked
WHERE rn = 1;
