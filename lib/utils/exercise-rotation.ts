import { createClient } from "@/lib/supabase/client";
import { MovementCategory } from "@/types";

/**
 * Get the next exercise for a category based on rotation logic
 * Returns the exercise_variation that should be used
 * 
 * Logic:
 * - If user has only 1 active exercise, always return that one
 * - Otherwise, find the exercise with the oldest last_used_date (or never used)
 * - Respects rotation_order as secondary sort for exercises never used
 */
export async function getNextExerciseForCategory(
  userId: string,
  category: MovementCategory
): Promise<string | null> {
  const supabase = createClient();

  // Fetch all active movements for this category, ordered by rotation
  const { data: movements, error } = await supabase
    .from("movements")
    .select("exercise_variation, last_used_date, rotation_order")
    .eq("user_id", userId)
    .eq("category", category)
    .order("rotation_order", { ascending: true });

  if (error || !movements || movements.length === 0) {
    console.error("Error fetching movements for rotation:", error);
    return null;
  }

  // If only one exercise, always return it
  if (movements.length === 1) {
    return movements[0].exercise_variation;
  }

  // Find the exercise with oldest last_used_date (nulls first)
  const sortedByLastUsed = [...movements].sort((a, b) => {
    // Prioritize exercises that have never been used (null last_used_date)
    if (a.last_used_date === null && b.last_used_date !== null) return -1;
    if (a.last_used_date !== null && b.last_used_date === null) return 1;
    if (a.last_used_date === null && b.last_used_date === null) {
      // Both never used, sort by rotation_order
      return a.rotation_order - b.rotation_order;
    }
    // Both have been used, compare dates
    return new Date(a.last_used_date!).getTime() - new Date(b.last_used_date!).getTime();
  });

  return sortedByLastUsed[0].exercise_variation;
}

/**
 * Update the last_used_date for a specific exercise
 * Called when user selects an exercise (either auto or manual)
 */
export async function updateExerciseLastUsed(
  userId: string,
  category: MovementCategory,
  exerciseVariation: string,
  date: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("movements")
    .update({ last_used_date: date })
    .eq("user_id", userId)
    .eq("category", category)
    .eq("exercise_variation", exerciseVariation);

  if (error) {
    console.error("Error updating last_used_date:", error);
    return false;
  }

  return true;
}

/**
 * Get all active exercises for a category
 */
export async function getActiveExercises(userId: string, category: MovementCategory) {
  const supabase = createClient();

  const { data: movements, error } = await supabase
    .from("movements")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .order("rotation_order", { ascending: true });

  if (error) {
    console.error("Error fetching active exercises:", error);
    return [];
  }

  return movements || [];
}

/**
 * Add a new exercise to rotation
 */
export async function addExerciseToRotation(
  userId: string,
  category: MovementCategory,
  exerciseVariation: string
): Promise<boolean> {
  const supabase = createClient();

  // Get the max rotation_order for this category
  const { data: maxOrderData } = await supabase
    .from("movements")
    .select("rotation_order")
    .eq("user_id", userId)
    .eq("category", category)
    .order("rotation_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrderData?.rotation_order || 0) + 1;

  const { error } = await supabase.from("movements").insert({
    user_id: userId,
    category,
    exercise_variation: exerciseVariation,
    rotation_order: nextOrder,
    last_used_date: null,
  });

  if (error) {
    console.error("Error adding exercise to rotation:", error);
    return false;
  }

  return true;
}

/**
 * Remove an exercise from rotation
 */
export async function removeExerciseFromRotation(
  userId: string,
  category: MovementCategory,
  exerciseVariation: string
): Promise<boolean> {
  const supabase = createClient();

  // Check if this is the last exercise
  const { data: movements } = await supabase
    .from("movements")
    .select("id")
    .eq("user_id", userId)
    .eq("category", category);

  if (!movements || movements.length <= 1) {
    console.error("Cannot remove the last exercise from a category");
    return false;
  }

  const { error, count } = await supabase
    .from("movements")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("category", category)
    .eq("exercise_variation", exerciseVariation);

  if (error) {
    console.error("Error removing exercise from rotation:", error);
    return false;
  }

  if (count === 0) {
    console.error("No rows were deleted - possible RLS policy issue");
    return false;
  }

  return true;
}

/**
 * Update rotation order for exercises
 */
export async function updateRotationOrder(
  userId: string,
  category: MovementCategory,
  orderedExercises: { id: string; rotation_order: number }[]
): Promise<boolean> {
  const supabase = createClient();

  // Update each exercise's rotation_order
  const promises = orderedExercises.map(({ id, rotation_order }) =>
    supabase
      .from("movements")
      .update({ rotation_order })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("category", category)
  );

  const results = await Promise.all(promises);
  const hasError = results.some((result) => result.error);

  if (hasError) {
    console.error("Error updating rotation order");
    return false;
  }

  return true;
}
