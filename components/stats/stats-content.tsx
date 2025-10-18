"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory, Movement, Set as WorkoutSet } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, Calendar, Trophy, Target } from "lucide-react";
import { EXERCISE_VARIATIONS } from "@/lib/constants/exercises";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { colorForRPE, RPE_LEGEND } from "@/lib/constants/rpe";
import { format } from "date-fns";

interface StatsContentProps {
  userId: string;
}

interface StatsData {
  byCategory: Record<MovementCategory, {
    dailyVolume: Array<{ date: string; reps: number }>;
    totalSets: number;
    totalReps: number;
    avgRPE: number;
    dailySets: Array<{
      date: string;
      sets: Array<{ reps: number; rpe: number; is_max_effort: boolean; set_number: number }>;
      totalReps: number;
      setsCount: number;
    }>;
    maxSetsPerDay: number;
  }>;
  reviews: Array<{
    category: MovementCategory;
    week_start_date: string;
    recovery_score: number;
    chosen_daily_target: number;
  }>;
}

export function StatsContent({ userId }: StatsContentProps) {
  const [activeTab, setActiveTab] = useState<MovementCategory>("push");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch movements
      const { data: movementsData } = await supabase
        .from("movements")
        .select("*")
        .eq("user_id", userId);

      setMovements(movementsData || []);

      // Fetch all sets from last 365 days
      const yearAgo = new Date();
      yearAgo.setDate(yearAgo.getDate() - 365);

      const { data: sets } = await supabase
        .from("sets")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", yearAgo.toISOString())
        .order("logged_at", { ascending: true });

      // Fetch weekly reviews
      const { data: reviews } = await supabase
        .from("weekly_reviews")
        .select("*")
        .eq("user_id", userId)
        .order("week_start_date", { ascending: true });

      // Process stats
      const statsData = processStats(sets || [], movementsData || [], reviews || []);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const processStats = (
    sets: WorkoutSet[],
    movements: Movement[],
    reviews: Array<{ category: MovementCategory; week_start_date: string; recovery_score: number; chosen_daily_target: number }>
  ): StatsData => {
    const statsByCategory: Record<MovementCategory, {
      dailyVolume: Array<{ date: string; reps: number }>;
      totalSets: number;
      totalReps: number;
      avgRPE: number;
      dailySets: Array<{
        date: string;
        sets: Array<{ reps: number; rpe: number; is_max_effort: boolean; set_number: number }>;
        totalReps: number;
        setsCount: number;
      }>;
      maxSetsPerDay: number;
    }> = {
      push: { dailyVolume: [], totalSets: 0, totalReps: 0, avgRPE: 0, dailySets: [], maxSetsPerDay: 0 },
      pull: { dailyVolume: [], totalSets: 0, totalReps: 0, avgRPE: 0, dailySets: [], maxSetsPerDay: 0 },
      legs: { dailyVolume: [], totalSets: 0, totalReps: 0, avgRPE: 0, dailySets: [], maxSetsPerDay: 0 },
    };

    // Group sets by category and date
    const categories: MovementCategory[] = ["push", "pull", "legs"];
    
    categories.forEach((category) => {
      const categorySets = sets.filter((s) => s.category === category);
      
      // Daily volume and per-set aggregation
      const dailyVolumeMap = new Map<string, number>();
      const dailySetMap = new Map<string, Array<{ reps: number; rpe: number; is_max_effort: boolean; set_number: number }>>();
      categorySets.forEach((set) => {
        const d = new Date(set.logged_at);
        d.setHours(0, 0, 0, 0);
        const date = format(d, "yyyy-MM-dd"); // local day key
        dailyVolumeMap.set(date, (dailyVolumeMap.get(date) || 0) + set.reps);
        const arr = dailySetMap.get(date) || [];
        arr.push({ reps: set.reps, rpe: set.rpe, is_max_effort: !!set.is_max_effort, set_number: set.set_number });
        dailySetMap.set(date, arr);
      });

      // If no sets for this category, keep arrays empty (no chart)
      if (categorySets.length === 0) {
        return;
      }

      // Build full date range up to 365 days, starting at first logged day for this category
      const today = new Date();
      let start = new Date();
      start.setDate(today.getDate() - 365);
      start.setHours(0, 0, 0, 0);
      const earliestMs = Math.min(
        ...categorySets.map((s) => {
          const d = new Date(s.logged_at);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
      );
      if (earliestMs > start.getTime()) {
        start = new Date(earliestMs);
      }
      const allDays: string[] = [];
      const cursor = new Date(start);
      while (cursor <= today) {
        allDays.push(format(cursor, "yyyy-MM-dd"));
        cursor.setDate(cursor.getDate() + 1);
      }

      statsByCategory[category].dailyVolume = allDays
        .map((date) => ({ date, reps: dailyVolumeMap.get(date) || 0 }));

      const dailySets = allDays
        .map((date) => {
          const setsForDay = (dailySetMap.get(date) || []).sort((a, b) => a.set_number - b.set_number);
          const totalReps = setsForDay.reduce((s, v) => s + v.reps, 0);
          return {
            date,
            sets: setsForDay,
            totalReps,
            setsCount: setsForDay.length,
          };
        });

      statsByCategory[category].dailySets = dailySets;
      statsByCategory[category].maxSetsPerDay = dailySets.reduce((mx, d) => Math.max(mx, d.setsCount), 0);

      // Total stats
      statsByCategory[category].totalSets = categorySets.length;
      statsByCategory[category].totalReps = categorySets.reduce((sum, s) => sum + s.reps, 0);
      statsByCategory[category].avgRPE = categorySets.length > 0
        ? categorySets.reduce((sum, s) => sum + s.rpe, 0) / categorySets.length
        : 0;
    });

    return {
      byCategory: statsByCategory,
      reviews,
    };
  };

  type ChartRow = {
    date: string;
    total: number;
    target: number;
  } & Record<string, number | boolean | string>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Progress & Statistics</h1>
        <p className="text-muted-foreground">Track your calisthenics journey</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MovementCategory)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="push">Push</TabsTrigger>
          <TabsTrigger value="pull">Pull</TabsTrigger>
          <TabsTrigger value="legs">Legs</TabsTrigger>
        </TabsList>

        {(["push", "pull", "legs"] as MovementCategory[]).map((category) => {
          const movement = movements.find((m) => m.category === category);
          const categoryStats = stats?.byCategory[category];
          
          return (
            <TabsContent key={category} value={category} className="space-y-6">
              {/* Overview Cards */}
              {movement && (
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Current Exercise</CardTitle>
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {EXERCISE_VARIATIONS[category].find((ex) => ex.id === movement.exercise_variation)?.name || movement.exercise_variation}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Max Effort</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{movement.max_effort_reps} reps</div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(movement.max_effort_date).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Daily Target</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{movement.daily_target} reps</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Reps (365d)</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{categoryStats?.totalReps || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {categoryStats?.totalSets || 0} sets
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Stacked Per-Set Chart */}
              {categoryStats && categoryStats.dailySets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Set Distribution (Last 14 Days)</CardTitle>
                    <CardDescription>Each stacked segment is one set, colored by RPE</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={340}>
                      {
                        (() => {
                          // Build chart rows with dynamic keys s1_reps, s1_rpe, s1_max, ...
                          const maxSets = categoryStats.maxSetsPerDay;
                          const movement = movements.find((m) => m.category === category);
                          const reviewsForCategory = (stats?.reviews || [])
                            .filter((r) => r.category === category)
                            .sort((a, b) => (a.week_start_date < b.week_start_date ? -1 : a.week_start_date > b.week_start_date ? 1 : 0));

                          const targetForDate = (dateStr: string): number | undefined => {
                            // Find the most recent review with week_start_date <= dateStr
                            let target: number | undefined = undefined;
                            for (let i = 0; i < reviewsForCategory.length; i++) {
                              const rev = reviewsForCategory[i];
                              if (rev.week_start_date <= dateStr) {
                                target = rev.chosen_daily_target;
                              } else {
                                break;
                              }
                            }
                            return target;
                          };

                          const chartData: ChartRow[] = categoryStats.dailySets.map((d) => {
                            const row: ChartRow = { date: d.date, total: d.totalReps, target: 0 };
                            d.sets.forEach((s, idx) => {
                              const i = idx + 1;
                              row[`s${i}_reps`] = s.reps;
                              row[`s${i}_rpe`] = s.rpe;
                              row[`s${i}_max`] = s.is_max_effort;
                            });
                            // Historic target per day using weekly_reviews; fallback to current movement target
                            row.target = targetForDate(d.date) ?? movement?.daily_target ?? 0;
                            return row;
                          });

                          interface CustomTooltipProps {
                            active?: boolean;
                            payload?: Array<{ payload: ChartRow }>;
                            label?: string | number;
                          }
                          const CustomTooltip = ({ active, label, payload }: CustomTooltipProps) => {
                            if (!active || !payload || payload.length === 0) return null;
                            const data = (payload[0]?.payload as ChartRow) || ({} as ChartRow);
                            const date = label ? new Date(String(label)).toLocaleDateString() : "";
                            const sets: Array<{ reps: number; rpe: number; isMax: boolean }> = [];
                            for (let i = 1; i <= maxSets; i++) {
                              const reps = data[`s${i}_reps`] as number | undefined;
                              const rpe = data[`s${i}_rpe`] as number | undefined;
                              const isMax = data[`s${i}_max`] as boolean | undefined;
                              if (typeof reps === "number") {
                                sets.push({ reps, rpe: typeof rpe === "number" ? rpe : 0, isMax: !!isMax });
                              }
                            }
                            return (
                              <div className="rounded-md border bg-card p-3 shadow-sm">
                                <div className="mb-2 text-xs text-muted-foreground">{date}</div>
                                <div className="text-sm font-medium">Total: {data.total} reps</div>
                                <div className="mt-2 space-y-1">
                                  {sets.map((s, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      <span
                                        className="inline-block h-3 w-3 rounded"
                                        style={{ backgroundColor: colorForRPE(s.rpe, s.isMax) }}
                                      />
                                      <span>Set {idx + 1}: {s.reps} reps</span>
                                      <span className="text-xs text-muted-foreground">
                                        {typeof s.rpe === "number" && s.rpe < 6 ? "RPE <6" : `RPE ${s.rpe}`}
                                      </span>
                                      {s.isMax && (
                                        <span className="ml-1 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Max Effort</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">Target: {data.target ?? 0} reps</div>
                              </div>
                            );
                          };

                          const CustomLegend = () => (
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                              {RPE_LEGEND.map((item) => (
                                <div key={item.label} className="flex items-center gap-1.5">
                                  <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                                  <span className="text-muted-foreground">{item.label}</span>
                                </div>
                              ))}
                            </div>
                          );

                          return (
                            <BarChart data={chartData} barCategoryGap={16} barGap={2}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              />
                              <YAxis />
                              <Tooltip content={<CustomTooltip />} labelFormatter={(value) => String(value)} />
                              {/* Stacked bars per set index */}
                              {Array.from({ length: maxSets }).map((_, idx) => {
                                const i = idx + 1;
                                const key = `s${i}_reps`;
                                return (
                                  <Bar key={key} dataKey={key} stackId="sets" radius={idx === maxSets - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}>
                                    {chartData.map((entry: ChartRow, index: number) => (
                                      <Cell
                                        key={`cell-${i}-${index}`}
                                        fill={colorForRPE(entry[`s${i}_rpe`] as number | undefined, entry[`s${i}_max`] as boolean | undefined)}
                                        stroke={"hsl(var(--card))"}
                                        strokeWidth={1.5}
                                      />
                                    ))}
                                  </Bar>
                                );
                              })}
                              {/* Per-day target as a line */}
                              <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                              <Legend content={<CustomLegend />} />
                            </BarChart>
                          );
                        })()
                      }
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Recovery Score Trend */}
              {stats?.reviews && stats.reviews.filter((r) => r.category === category).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recovery Score Trend</CardTitle>
                    <CardDescription>Weekly recovery scores over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={stats.reviews
                          .filter((r) => r.category === category)
                          .map((r) => ({
                            week: r.week_start_date,
                            score: r.recovery_score,
                            target: r.chosen_daily_target,
                          }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="week"
                          tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip
                          labelFormatter={(value) => `Week of ${new Date(value).toLocaleDateString()}`}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          name="Recovery Score"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="target"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Daily Target"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {!movement && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground mb-4">No data available for {category}</p>
                    <Button onClick={() => window.location.href = `/movement/${category}/select`}>
                      Set Up Movement
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
