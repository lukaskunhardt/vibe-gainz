"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface FeedItem {
  id: string;
  type: "set" | "max_effort";
  user_id: string;
  email?: string;
  category: "push" | "pull" | "legs";
  exercise_variation: string;
  reps: number;
  rpe: number;
  is_max_effort: boolean;
  logged_at: string;
}

export function useFriendsActivity(userId?: string) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Get friendships to derive friend ids
      const { data: rows } = await supabase
        .from("friendships")
        .select("user_id, friend_id, status")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
      const friendIds = (rows || [])
        .filter((r) => r.status === "accepted")
        .map((r) => (r.user_id === userId ? r.friend_id : r.user_id));

      const viewerScope = Array.from(new Set([userId, ...friendIds]));

      // Fetch recent sets for self and friends
      const { data: sets, error } = await supabase
        .from("sets")
        .select("id, user_id, category, exercise_variation, reps, rpe, is_max_effort, logged_at")
        .in("user_id", viewerScope)
        .order("logged_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      // Map to feed items
      const items: FeedItem[] = (sets || []).map((s) => ({
        id: s.id,
        type: s.is_max_effort ? "max_effort" : "set",
        user_id: s.user_id,
        category: s.category,
        exercise_variation: s.exercise_variation,
        reps: s.reps,
        rpe: s.rpe,
        is_max_effort: s.is_max_effort,
        logged_at: s.logged_at,
      }));

      // Attach emails
      const ids = Array.from(new Set(items.map((i) => i.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", ids);
      const emailById = new Map((profs || []).map((p) => [p.id, p.email]));
      items.forEach((i) => (i.email = emailById.get(i.user_id) || "Unknown"));

      setItems(items);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, refresh: load };
}

