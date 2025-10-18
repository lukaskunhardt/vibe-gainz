-- Category streak computation as of a target date
-- Returns consecutive-day streak ending on p_target_date (inclusive)
-- for the authenticated user in a given movement_category.

CREATE OR REPLACE FUNCTION get_category_streak(
  p_category movement_category,
  p_target_date DATE
)
RETURNS INTEGER
LANGUAGE sql
AS $$
WITH days AS (
  SELECT DISTINCT (logged_at::date) AS d
  FROM sets
  WHERE user_id = auth.uid()
    AND category = p_category
    AND logged_at::date <= p_target_date
),
numbered AS (
  SELECT d, ROW_NUMBER() OVER (ORDER BY d) AS rn
  FROM days
),
grps AS (
  SELECT d, rn, (d - (rn || ' days')::interval)::date AS grp
  FROM numbered
),
target_grp AS (
  SELECT grp FROM grps WHERE d = p_target_date
)
SELECT COALESCE(
  (SELECT COUNT(*) FROM grps WHERE grp = (SELECT grp FROM target_grp)),
  0
);
$$;

