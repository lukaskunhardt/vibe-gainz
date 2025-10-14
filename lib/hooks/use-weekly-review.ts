"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WeeklyReview, MovementCategory } from "@/types";

export function useWeeklyReview(
  userId?: string,
  category?: MovementCategory,
  weekStartDate?: string
) {
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !category || !weekStartDate) {
      setLoading(false);
      return;
    }

    const fetchReview = async () => {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("weekly_reviews")
          .select("*")
          .eq("user_id", userId)
          .eq("category", category)
          .eq("week_start_date", weekStartDate)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          // PGRST116 is "not found" - not an error in this case
          throw fetchError;
        }

        setReview(data || null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [userId, category, weekStartDate]);

  return { review, loading, error };
}

export function useWeeklyReviews(userId?: string) {
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchReviews = async () => {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("weekly_reviews")
          .select("*")
          .eq("user_id", userId)
          .order("week_start_date", { ascending: false });

        if (fetchError) throw fetchError;

        setReviews(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [userId]);

  return { reviews, loading, error };
}

