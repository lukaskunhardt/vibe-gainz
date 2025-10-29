"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Set, MovementCategory } from "@/types";
import { computeSetMetrics } from "@/lib/utils/prescription";

export function useSets(userId?: string, category?: MovementCategory, date?: Date) {
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSets = async () => {
      try {
        const supabase = createClient();
        let query = supabase
          .from("sets")
          .select("*")
          .eq("user_id", userId)
          .order("logged_at", { ascending: false });

        if (category) {
          query = query.eq("category", category);
        }

        if (date) {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          query = query
            .gte("logged_at", startOfDay.toISOString())
            .lte("logged_at", endOfDay.toISOString());
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setSets(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, category, date?.toISOString()]);

  return { sets, loading, error };
}

export function useTodaySets(userId?: string, category?: MovementCategory) {
  return useSets(userId, category, new Date());
}

export function useWeekSets(userId?: string, category?: MovementCategory, weekStartDate?: Date) {
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !weekStartDate) {
      setLoading(false);
      return;
    }

    const fetchSets = async () => {
      try {
        const supabase = createClient();

        const weekStart = new Date(weekStartDate);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStartDate);
        weekEnd.setDate(weekEnd.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);

        let query = supabase
          .from("sets")
          .select("*")
          .eq("user_id", userId)
          .gte("logged_at", weekStart.toISOString())
          .lte("logged_at", weekEnd.toISOString())
          .order("logged_at", { ascending: true });

        if (category) {
          query = query.eq("category", category);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setSets(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, category, weekStartDate?.toISOString()]);

  return { sets, loading, error };
}

/**
 * Update an existing set's reps and RPE
 */
export async function updateSet(
  setId: string,
  updates: { reps?: number; rpe?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("sets")
      .select("reps, rpe, is_max_effort")
      .eq("id", setId)
      .single();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error("Set not found");

    const nextReps = updates.reps ?? existing.reps;
    const nextRpe = updates.rpe ?? existing.rpe;
    const { rir, impliedMaxReps } = computeSetMetrics(nextReps, nextRpe, existing.is_max_effort);

    const { error } = await supabase
      .from("sets")
      .update({ ...updates, rir, implied_max_reps: impliedMaxReps })
      .eq("id", setId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error updating set:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update set",
    };
  }
}

/**
 * Delete a set and renumber subsequent sets
 */
export async function deleteSet(
  setId: string,
  userId: string,
  category: MovementCategory,
  date: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Get the set to be deleted to know its set_number
    const { data: setToDelete, error: fetchError } = await supabase
      .from("sets")
      .select("set_number, logged_at")
      .eq("id", setId)
      .single();

    if (fetchError) throw fetchError;
    if (!setToDelete) throw new Error("Set not found");

    // Delete the set
    const { error: deleteError } = await supabase.from("sets").delete().eq("id", setId);

    if (deleteError) throw deleteError;

    // Renumber subsequent sets from the same day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: subsequentSets, error: subsequentError } = await supabase
      .from("sets")
      .select("id, set_number")
      .eq("user_id", userId)
      .eq("category", category)
      .gte("logged_at", dayStart.toISOString())
      .lte("logged_at", dayEnd.toISOString())
      .gt("set_number", setToDelete.set_number)
      .order("set_number", { ascending: true });

    if (subsequentError) throw subsequentError;

    // Update set_numbers for subsequent sets
    if (subsequentSets && subsequentSets.length > 0) {
      const updates = subsequentSets.map((set, index) => ({
        id: set.id,
        set_number: setToDelete.set_number + index,
      }));

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("sets")
          .update({ set_number: update.set_number })
          .eq("id", update.id);

        if (updateError) throw updateError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting set:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete set",
    };
  }
}
