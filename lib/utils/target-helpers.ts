import { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { MovementCategory } from "@/types";

/**
 * Get the target for a specific movement on a specific date.
 * Returns the most recent target on or before the given date.
 */
export async function getMovementTarget(
  supabase: SupabaseClient,
  movementId: string,
  date: Date
): Promise<number | null> {
  const dateStr = format(date, "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("movement_target_history")
    .select("target")
    .eq("movement_id", movementId)
    .lte("date", dateStr)
    .order("date", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching movement target:", error);
    return null;
  }

  return data?.[0]?.target ?? null;
}

/**
 * Get current targets for all movements of a user on a specific date.
 * Returns a map of category to target value.
 */
export async function getCurrentTargets(
  supabase: SupabaseClient,
  userId: string,
  date: Date
): Promise<Map<MovementCategory, number>> {
  const targets = new Map<MovementCategory, number>();

  // Fetch all movements for the user
  const { data: movements } = await supabase
    .from("movements")
    .select("id, category")
    .eq("user_id", userId);

  if (!movements || movements.length === 0) {
    return targets;
  }

  // Fetch targets for each movement
  for (const movement of movements) {
    const target = await getMovementTarget(supabase, movement.id, date);
    if (target !== null) {
      targets.set(movement.category as MovementCategory, target);
    }
  }

  return targets;
}

/**
 * Set a new target for a movement on a specific date.
 * Creates an entry in movement_target_history.
 */
export async function setMovementTarget(
  supabase: SupabaseClient,
  userId: string,
  movementId: string,
  category: MovementCategory,
  date: Date,
  target: number
): Promise<{ success: boolean; error?: string }> {
  const dateStr = format(date, "yyyy-MM-dd");

  const { error } = await supabase.from("movement_target_history").upsert(
    {
      user_id: userId,
      movement_id: movementId,
      category,
      date: dateStr,
      target,
    },
    { onConflict: "movement_id,date" }
  );

  if (error) {
    console.error("Error setting movement target:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
