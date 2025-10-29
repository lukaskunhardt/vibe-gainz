-- Function to refresh exercise_status whenever sets change
CREATE OR REPLACE FUNCTION refresh_exercise_status_for_set(p_user UUID, p_exercise TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_pr_record RECORD;
  v_implied_record RECORD;
  v_prompt_pending BOOLEAN;
  v_pr_reps INTEGER := 0;
  v_pr_tested_at TIMESTAMPTZ := NULL;
  v_pr_set_id UUID := NULL;
  v_implied_reps INTEGER := NULL;
  v_implied_at TIMESTAMPTZ := NULL;
  v_implied_set_id UUID := NULL;
BEGIN
  IF p_user IS NULL OR p_exercise IS NULL THEN
    RETURN;
  END IF;

  SELECT id, reps AS pr_reps, logged_at
  INTO v_pr_record
  FROM sets
  WHERE user_id = p_user
    AND exercise_variation = p_exercise
    AND is_max_effort = TRUE
  ORDER BY reps DESC, logged_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_pr_reps := v_pr_record.pr_reps;
    v_pr_tested_at := v_pr_record.logged_at;
    v_pr_set_id := v_pr_record.id;
  END IF;

  SELECT id, implied_max_reps, logged_at
  INTO v_implied_record
  FROM sets
  WHERE user_id = p_user
    AND exercise_variation = p_exercise
    AND is_max_effort = FALSE
  ORDER BY implied_max_reps DESC, logged_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_implied_reps := v_implied_record.implied_max_reps;
    v_implied_at := v_implied_record.logged_at;
    v_implied_set_id := v_implied_record.id;
  END IF;

  v_prompt_pending := v_implied_reps IS NOT NULL AND v_implied_reps > COALESCE(v_pr_reps, 0);

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
  VALUES (
    p_user,
    p_exercise,
    COALESCE(v_pr_reps, 0),
    v_pr_tested_at,
    v_pr_set_id,
    CASE WHEN v_prompt_pending THEN v_implied_reps ELSE NULL END,
    CASE WHEN v_prompt_pending THEN v_implied_at ELSE NULL END,
    CASE WHEN v_prompt_pending THEN v_implied_set_id ELSE NULL END,
    v_prompt_pending,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, exercise_id)
  DO UPDATE SET
    current_pr_reps = EXCLUDED.current_pr_reps,
    current_pr_tested_at = EXCLUDED.current_pr_tested_at,
    current_pr_set_id = EXCLUDED.current_pr_set_id,
    latest_implied_max_reps = EXCLUDED.latest_implied_max_reps,
    latest_implied_at = EXCLUDED.latest_implied_at,
    latest_implied_set_id = EXCLUDED.latest_implied_set_id,
    prompt_pending = EXCLUDED.prompt_pending,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION handle_set_change_refresh_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user UUID;
  v_exercise TEXT;
BEGIN
  v_user := COALESCE(NEW.user_id, OLD.user_id);
  v_exercise := COALESCE(NEW.exercise_variation, OLD.exercise_variation);

  PERFORM refresh_exercise_status_for_set(v_user, v_exercise);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sets_refresh_status_aiu ON sets;
CREATE TRIGGER trg_sets_refresh_status_aiu
AFTER INSERT OR UPDATE ON sets
FOR EACH ROW
EXECUTE FUNCTION handle_set_change_refresh_status();

DROP TRIGGER IF EXISTS trg_sets_refresh_status_ad ON sets;
CREATE TRIGGER trg_sets_refresh_status_ad
AFTER DELETE ON sets
FOR EACH ROW
EXECUTE FUNCTION handle_set_change_refresh_status();
