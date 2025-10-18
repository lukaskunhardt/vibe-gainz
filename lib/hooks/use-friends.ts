"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FriendRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
};

export interface FriendProfile {
  id: string;
  email: string;
}

export function useFriends(userId?: string) {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [incoming, setIncoming] = useState<FriendProfile[]>([]);
  const [outgoing, setOutgoing] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Load friendship rows where participant
      const { data: rows, error } = await supabase
        .from("friendships")
        .select("id, user_id, friend_id, status, created_at")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
      if (error) throw error;

      const accepted = rows?.filter((r: FriendRow) => r.status === "accepted") || [];
      const incomingReq = rows?.filter((r: FriendRow) => r.status === "pending" && r.friend_id === userId) || [];
      const outgoingReq = rows?.filter((r: FriendRow) => r.status === "pending" && r.user_id === userId) || [];

      const friendIds = accepted.map((r: FriendRow) => (r.user_id === userId ? r.friend_id : r.user_id));
      const incomingUserIds = incomingReq.map((r: FriendRow) => r.user_id);
      const outgoingFriendIds = outgoingReq.map((r: FriendRow) => r.friend_id);

      const ids = Array.from(new Set([...friendIds, ...incomingUserIds, ...outgoingFriendIds]));
      let profiles: FriendProfile[] = [];
      if (ids.length > 0) {
        const { data: profs, error: perr } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", ids);
        if (perr) throw perr;
        profiles = profs || [];
      }

      const findProfile = (id: string) => profiles.find((p) => p.id === id) || { id, email: "Unknown" };

      setFriends(friendIds.map(findProfile));
      setIncoming(incomingUserIds.map(findProfile));
      setOutgoing(outgoingFriendIds.map(findProfile));
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendRequest = useCallback(async (targetEmail: string) => {
    const { data: target, error: terr } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", targetEmail)
      .single();
    if (terr) throw terr;
    if (!userId) throw new Error("No user id");
    if (!target) throw new Error("User not found");
    if (target.id === userId) throw new Error("You cannot add yourself");
    const { error } = await supabase.from("friendships").insert({ user_id: userId, friend_id: target.id, status: "pending" });
    if (error) throw error;
    await refresh();
  }, [supabase, userId, refresh]);

  const acceptRequest = useCallback(async (fromUserId: string) => {
    if (!userId) throw new Error("No user id");
    const { data: row, error: rerr } = await supabase
      .from("friendships")
      .select("id")
      .eq("user_id", fromUserId)
      .eq("friend_id", userId)
      .single();
    if (rerr) throw rerr;
    const { error } = await supabase.rpc("accept_friendship", { p_friendship_id: row.id });
    if (error) throw error;
    await refresh();
  }, [supabase, userId, refresh]);

  const removeFriend = useCallback(async (otherUserId: string) => {
    if (!userId) throw new Error("No user id");
    const { error } = await supabase
      .from("friendships")
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${userId})`);
    if (error) throw error;
    await refresh();
  }, [supabase, userId, refresh]);

  return { friends, incoming, outgoing, loading, refresh, sendRequest, acceptRequest, removeFriend };
}

