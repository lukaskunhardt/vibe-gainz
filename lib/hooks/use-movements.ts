"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Movement } from "@/types";

export function useMovements(userId?: string) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchMovements = async () => {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("movements")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;

        setMovements(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovements();
  }, [userId]);

  return { movements, loading, error, refetch: () => setMovements([]) };
}

export function useMovement(userId?: string, category?: string) {
  const [movement, setMovement] = useState<Movement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !category) {
      setLoading(false);
      return;
    }

    const fetchMovement = async () => {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("movements")
          .select("*")
          .eq("user_id", userId)
          .eq("category", category)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          // PGRST116 is "not found" - not an error in this case
          throw fetchError;
        }

        setMovement(data || null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovement();
  }, [userId, category]);

  return { movement, loading, error };
}
