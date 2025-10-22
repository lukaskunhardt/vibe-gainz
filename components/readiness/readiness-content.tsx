"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, TrendingUp, BookOpen, ArrowRight } from "lucide-react";
import { Movement, MovementCategory, Set as WorkoutSet } from "@/types";
import { suggestDailyTargetDelta, isCapRelaxed } from "@/lib/utils/recovery-daily";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

interface ReadinessContentProps {
  userId: string;
  date: string; // YYYY-MM-DD
}

interface CategoryPreview {
  category: MovementCategory;
  currentTarget: number;
  newTarget: number;
  delta: number;
  reason: string;
}

export function ReadinessContent({ userId, date }: ReadinessContentProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [bodyWeight, setBodyWeight] = useState<string>("");
  const [previews, setPreviews] = useState<CategoryPreview[]>([]);

  useEffect(() => {
    if (selected === null) {
      setPreviews([]);
      return;
    }
    calculatePreviews(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const calculatePreviews = async (readinessScore: number) => {
    try {
      const supabase = createClient();
      const today = new Date();
      const yesterday = subDays(today, 1);
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);
      const dayMinus2 = subDays(today, 2);
      const dayMinus2Start = startOfDay(dayMinus2);

      // Fetch movements
      const { data: movementsData } = await supabase
        .from("movements")
        .select("*")
        .eq("user_id", userId);
      const movements = (movementsData ?? []) as Movement[];

      // Fetch recent sets (yesterday and day before)
      const { data: recentSets } = await supabase
        .from("sets")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", dayMinus2Start.toISOString())
        .lte("logged_at", yesterdayEnd.toISOString())
        .order("logged_at", { ascending: true });
      const recentWorkoutSets = (recentSets ?? []) as WorkoutSet[];

      const yKey = format(yesterdayStart, "yyyy-MM-dd");
      const d2Key = format(dayMinus2Start, "yyyy-MM-dd");

      // Group sets by category and date
      const byCatDate = new Map<MovementCategory, Map<string, WorkoutSet[]>>();
      recentWorkoutSets.forEach((s) => {
        const d = new Date(s.logged_at);
        d.setHours(0, 0, 0, 0);
        const key = format(d, "yyyy-MM-dd");
        const cat = s.category as MovementCategory;
        if (!byCatDate.has(cat)) byCatDate.set(cat, new Map());
        const inner = byCatDate.get(cat)!;
        if (!inner.has(key)) inner.set(key, []);
        inner.get(key)!.push(s);
      });

      // Calculate adjustment for each category
      const newPreviews: CategoryPreview[] = [];
      const categories: MovementCategory[] = ["push", "pull", "legs"];

      for (const cat of categories) {
        const movement = movements.find((m) => m.category === cat);
        if (!movement) continue;

        // Get current target from history
        const { data: currentTargetData } = await supabase
          .from("movement_target_history")
          .select("target")
          .eq("movement_id", movement.id)
          .lte("date", yKey)
          .order("date", { ascending: false })
          .limit(1);
        const currentTarget = currentTargetData?.[0]?.target ?? 0;

        const ySets = byCatDate.get(cat)?.get(yKey) ?? [];
        const d2Sets = byCatDate.get(cat)?.get(d2Key);

        const capOk = isCapRelaxed(ySets, d2Sets);
        const suggestion = suggestDailyTargetDelta(
          ySets,
          currentTarget,
          capOk,
          movement.category,
          readinessScore
        );

        const newTarget = Math.max(1, currentTarget + suggestion.delta);
        newPreviews.push({
          category: cat,
          currentTarget,
          newTarget,
          delta: suggestion.delta,
          reason: suggestion.reason,
        });
      }

      setPreviews(newPreviews);
    } catch (error) {
      console.error("Error calculating previews:", error);
      setPreviews([]);
    }
  };

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const supabase = createClient();

      // Prepare data for daily_user_stats
      const dailyStatsData: {
        user_id: string;
        date: string;
        readiness_score: number;
        body_weight_kg?: number;
        updated_at: string;
      } = {
        user_id: userId,
        date,
        readiness_score: selected,
        updated_at: new Date().toISOString(),
      };

      // Add body weight if provided
      if (bodyWeight && !isNaN(parseFloat(bodyWeight))) {
        dailyStatsData.body_weight_kg = parseFloat(bodyWeight);
      }

      // Save to daily_user_stats table
      await supabase
        .from("daily_user_stats")
        .upsert(dailyStatsData, { onConflict: "user_id,date" });

      router.replace("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Daily Check-In</CardTitle>
          <CardDescription>
            Track your readiness and optionally log your body weight.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm font-medium">How ready to exercise are you today?</div>
          <p className="mb-4 text-sm text-muted-foreground">
            1 = terrible, no energy. 5 = great, can really push.
          </p>
          <ul className="mb-4 space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-muted-foreground">
                <Info className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Why measure readiness?</div>
                <div className="text-sm text-muted-foreground">
                  It’s a quick daily signal of recovery and fatigue so we can tailor volume to how
                  you feel today.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-medium">How it affects training</div>
                <div className="text-sm text-muted-foreground">
                  Higher scores increase targets more aggressively based on yesterday&apos;s
                  performance. Low scores (≤2) pause increases for recovery.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Scientific background</div>
                <div className="text-sm text-muted-foreground">
                  Self‑reported readiness correlates with perceived recovery, neuromuscular
                  performance, and HRV; low scores flag accumulated fatigue and higher injury risk.
                </div>
              </div>
            </li>
          </ul>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                variant={selected === n ? "default" : "outline"}
                onClick={() => setSelected(n)}
                disabled={saving}
              >
                {n}
              </Button>
            ))}
          </div>

          {/* Body Weight Input */}
          <div className="mt-6">
            <label htmlFor="body-weight" className="mb-2 block text-sm font-medium">
              Body Weight (optional)
            </label>
            <Input
              id="body-weight"
              type="number"
              step="0.1"
              min="0"
              max="500"
              placeholder="Weight (kg)"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              disabled={saving}
              className="w-full"
            />
          </div>

          {/* Preview Section */}
          {selected !== null && previews.length > 0 && (
            <div className="mt-4 rounded-lg border bg-muted/50 p-4">
              <div className="mb-2 text-sm font-medium">Target adjustments for tomorrow:</div>
              <div className="space-y-2">
                {previews.map((p) => {
                  const categoryName = p.category.charAt(0).toUpperCase() + p.category.slice(1);
                  return (
                    <div key={p.category} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{categoryName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{p.currentTarget}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span
                          className={
                            p.delta > 0
                              ? "font-semibold text-green-600 dark:text-green-400"
                              : p.delta < 0
                                ? "font-semibold text-red-600 dark:text-red-400"
                                : "font-semibold"
                          }
                        >
                          {p.newTarget}
                        </span>
                        {p.delta !== 0 && (
                          <span
                            className={
                              p.delta > 0
                                ? "text-xs text-green-600 dark:text-green-400"
                                : "text-xs text-red-600 dark:text-red-400"
                            }
                          >
                            ({p.delta > 0 ? "+" : ""}
                            {p.delta})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {previews.some((p) => p.delta === 0) && (
                <div className="mt-2 text-xs text-muted-foreground">
                  No change:{" "}
                  {previews
                    .filter((p) => p.delta === 0)
                    .map((p) => p.reason)
                    .join(", ")}
                </div>
              )}
            </div>
          )}

          <Button className="mt-6 w-full" onClick={submit} disabled={!selected || saving}>
            {saving ? "Saving..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
