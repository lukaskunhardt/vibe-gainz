"use client";

import { useFriends } from "@/lib/hooks/use-friends";
import { useFriendsActivity } from "@/lib/hooks/use-friends-activity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MovementCategory } from "@/types";

function CategoryPill({ category }: { category: MovementCategory }) {
  const color = {
    push: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    pull: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    legs: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  }[category];
  return <span className={`text-xs px-2 py-1 rounded ${color}`}>{category}</span>;
}

export function FriendsTimeline({ userId }: { userId: string }) {
  const { items, loading: feedLoading, refresh: refreshFeed } = useFriendsActivity(userId);
  const { friends, incoming, outgoing, loading: friendsLoading, sendRequest, acceptRequest, removeFriend } = useFriends(userId);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email) return;
    setSending(true);
    try {
      await sendRequest(email);
      setEmail("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send request";
      alert(msg);
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (fromId: string) => {
    setAccepting(fromId);
    try {
      await acceptRequest(fromId);
      refreshFeed();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to accept";
      alert(msg);
    } finally {
      setAccepting(null);
    }
  };

  return (
    <Tabs defaultValue="timeline">
      <TabsList>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="manage">Manage</TabsTrigger>
      </TabsList>

      <TabsContent value="timeline" className="mt-4 space-y-3">
        {feedLoading ? (
          <div className="text-sm text-muted-foreground">Loading feed…</div>
        ) : items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No activity yet</CardTitle>
              <CardDescription>Add friends to see their workouts here.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          items.map((i) => (
            <Card key={i.id} className={i.is_max_effort ? "border-purple-500" : ""}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(i.logged_at).toLocaleString()}
                    </div>
                  </div>
                  <CategoryPill category={i.category} />
                </div>
                <div className="mt-2">
                  <div className="text-sm">
                    {i.is_max_effort ? (
                      <>
                        <Badge variant="secondary" className="mr-2">Max Effort</Badge>
                        {i.exercise_variation}: {i.reps} reps
                      </>
                    ) : (
                      <>
                        Logged {i.reps} reps @ RPE {i.rpe} — {i.exercise_variation}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="manage" className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add Friend</CardTitle>
            <CardDescription>Enter their account email</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={handleSend} disabled={sending || !email}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incoming Requests</CardTitle>
            <CardDescription>Approve to become friends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {friendsLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : incoming.length === 0 ? (
              <div className="text-sm text-muted-foreground">No incoming requests</div>
            ) : (
              incoming.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span>{p.email}</span>
                  <Button size="sm" onClick={() => handleAccept(p.id)} disabled={accepting === p.id}>
                    {accepting === p.id ? "Accepting…" : "Accept"}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outgoing Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {friendsLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : outgoing.length === 0 ? (
              <div className="text-sm text-muted-foreground">No outgoing requests</div>
            ) : (
              outgoing.map((p) => (
                <div key={p.id} className="text-sm">{p.email}</div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Friends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {friendsLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : friends.length === 0 ? (
              <div className="text-sm text-muted-foreground">No friends yet</div>
            ) : (
              friends.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span>{p.email}</span>
                  <Button size="sm" variant="destructive" onClick={() => removeFriend(p.id)}>
                    Remove
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
