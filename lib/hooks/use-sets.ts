"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Set, MovementCategory } from "@/types";

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
