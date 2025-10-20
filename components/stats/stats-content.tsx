"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory, Movement, Set as WorkoutSet } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListFilter } from "lucide-react";
import { EXERCISE_VARIATIONS } from "@/lib/constants/exercises";
import {
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { colorForRPE, RPE_LEGEND } from "@/lib/constants/rpe";
import { format } from "date-fns";

interface StatsContentProps {
  userId: string;
}

interface StatsData {
  byCategory: Record<
    MovementCategory,
    {
      dailySets: Array<{
        date: string;
        sets: Array<{
          reps: number;
          rpe: number;
          is_max_effort: boolean;
          set_number: number;
          exercise_variation: string;
        }>;
      }>;
    }
  >;
  readinessByDate: Record<string, number>;
  targetsByCategory: Record<MovementCategory, Array<{ date: string; target: number }>>;
}

export function StatsContent({ userId }: StatsContentProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<MovementCategory>("push");
  const [viewMode, setViewMode] = useState<"stacked" | "biggest">("stacked");
  const [showReadiness, setShowReadiness] = useState(true);
  const [showTarget, setShowTarget] = useState(true);
  const [selectedExercises, setSelectedExercises] = useState<string[]>(() =>
    EXERCISE_VARIATIONS["push"].map((ex) => ex.id)
  );

  const processStats = (
    sets: WorkoutSet[],
    readiness: Array<{ date: string; score: number }>,
    targets: Array<{ category: MovementCategory; date: string; target: number }>
  ): StatsData => {
    const readinessByDate: Record<string, number> = {};
    readiness.forEach((r) => {
      readinessByDate[r.date] = r.score;
    });

    const statsByCategory: Record<
      MovementCategory,
      {
        dailySets: Array<{
          date: string;
          sets: Array<{
            reps: number;
            rpe: number;
            is_max_effort: boolean;
            set_number: number;
            exercise_variation: string;
          }>;
        }>;
      }
    > = {
      push: { dailySets: [] },
      pull: { dailySets: [] },
      legs: { dailySets: [] },
    };

    const categories: MovementCategory[] = ["push", "pull", "legs"];

    categories.forEach((cat) => {
      const categorySets = sets.filter((set) => set.category === cat);
      if (categorySets.length === 0) {
        statsByCategory[cat].dailySets = [];
        return;
      }

      const dailySetMap = new Map<
        string,
        Array<{
          reps: number;
          rpe: number;
          is_max_effort: boolean;
          set_number: number;
          exercise_variation: string;
        }>
      >();

      categorySets.forEach((set) => {
        const day = new Date(set.logged_at);
        day.setHours(0, 0, 0, 0);
        const key = format(day, "yyyy-MM-dd");
        const arr = dailySetMap.get(key) || [];
        arr.push({
          reps: set.reps,
          rpe: set.rpe,
          is_max_effort: !!set.is_max_effort,
          set_number: set.set_number,
          exercise_variation: set.exercise_variation,
        });
        dailySetMap.set(key, arr);
      });

      const today = new Date();
      let start = new Date();
      start.setDate(today.getDate() - 365);
      start.setHours(0, 0, 0, 0);
      const earliestMs = Math.min(
        ...categorySets.map((set) => {
          const day = new Date(set.logged_at);
          day.setHours(0, 0, 0, 0);
          return day.getTime();
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

      statsByCategory[cat].dailySets = allDays.map((date) => {
        const setsForDay = (dailySetMap.get(date) || []).sort(
          (a, b) => a.set_number - b.set_number
        );
        return {
          date,
          sets: setsForDay,
        };
      });
    });

    const targetsByCategory: Record<MovementCategory, Array<{ date: string; target: number }>> = {
      push: [],
      pull: [],
      legs: [],
    };

    targets.forEach((entry) => {
      targetsByCategory[entry.category].push({ date: entry.date, target: entry.target });
    });

    (Object.keys(targetsByCategory) as MovementCategory[]).forEach((key) => {
      targetsByCategory[key].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    });

    return {
      byCategory: statsByCategory,
      readinessByDate,
      targetsByCategory,
    };
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: movementsData } = await supabase
        .from("movements")
        .select("*")
        .eq("user_id", userId);

      setMovements(movementsData || []);

      const yearAgo = new Date();
      yearAgo.setDate(yearAgo.getDate() - 365);

      const { data: sets } = await supabase
        .from("sets")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", yearAgo.toISOString())
        .order("logged_at", { ascending: true });

      const { data: readiness } = await supabase
        .from("readiness")
        .select("date, score")
        .eq("user_id", userId)
        .gte("date", yearAgo.toISOString().slice(0, 10))
        .order("date", { ascending: true });

      const { data: targets } = await supabase
        .from("movement_target_history")
        .select("category, date, target")
        .eq("user_id", userId)
        .order("date", { ascending: true });

      const statsData = processStats(
        sets || [],
        readiness || [],
        (targets || []) as Array<{ category: MovementCategory; date: string; target: number }>
      );
      setStats(statsData);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    setSelectedExercises(EXERCISE_VARIATIONS[category].map((ex) => ex.id));
  }, [category]);

  const exerciseOptions = useMemo(() => EXERCISE_VARIATIONS[category], [category]);

  const effectiveSelection = useMemo(() => {
    if (selectedExercises.length === 0) {
      return exerciseOptions.map((ex) => ex.id);
    }
    return selectedExercises;
  }, [selectedExercises, exerciseOptions]);

  const selectionSet = useMemo(() => new Set(effectiveSelection), [effectiveSelection]);

  const exerciseSummary = useMemo(() => {
    if (effectiveSelection.length === exerciseOptions.length) {
      return "All exercises";
    }
    return `${effectiveSelection.length} selected`;
  }, [effectiveSelection, exerciseOptions]);

  const categoryName = useMemo(
    () => category.charAt(0).toUpperCase() + category.slice(1),
    [category]
  );

  const movement = useMemo(
    () => movements.find((m) => m.category === category) || null,
    [movements, category]
  );

  const categoryStats = stats?.byCategory[category];
  const readinessByDate = stats?.readinessByDate;
  const targetHistory = stats?.targetsByCategory?.[category];

  type ChartRow = {
    date: string;
    total: number;
    readiness?: number;
    target?: number;
    maxReps?: number;
    maxRpe?: number;
    maxIsMax?: boolean;
    setCount?: number;
  } & Record<string, number | boolean | string | undefined>;

  const chartData: ChartRow[] = useMemo(() => {
    if (!categoryStats) return [];

    let historyIndex = -1;
    let currentTarget: number | undefined = undefined;

    return categoryStats.dailySets.map((day) => {
      const history = targetHistory ?? [];
      while (historyIndex + 1 < history.length && history[historyIndex + 1].date <= day.date) {
        historyIndex++;
        currentTarget = history[historyIndex].target;
      }

      const sets = day.sets
        .filter((set) => selectionSet.has(set.exercise_variation))
        .sort((a, b) => a.set_number - b.set_number);

      const totalReps = sets.reduce((sum, set) => sum + set.reps, 0);

      const row: ChartRow = {
        date: day.date,
        total: totalReps,
        readiness: readinessByDate?.[day.date],
        target: currentTarget ?? movement?.daily_target,
        setCount: sets.length,
      };

      sets.forEach((set, idx) => {
        const index = idx + 1;
        row[`s${index}_reps`] = set.reps;
        row[`s${index}_rpe`] = set.rpe;
        row[`s${index}_max`] = set.is_max_effort;
      });

      const biggest = sets.reduce<(typeof sets)[number] | null>((best, set) => {
        if (!best || set.reps > best.reps) return set;
        return best;
      }, null);

      row.maxReps = biggest?.reps ?? 0;
      row.maxRpe = biggest?.rpe ?? 0;
      row.maxIsMax = biggest?.is_max_effort ?? false;

      return row;
    });
  }, [categoryStats, selectionSet, readinessByDate, movement?.daily_target, targetHistory]);

  const maxSetsForChart = useMemo(() => {
    if (viewMode !== "stacked") return 0;
    return chartData.reduce((mx, row) => {
      const count = typeof row.setCount === "number" ? row.setCount : 0;
      return Math.max(mx, count);
    }, 0);
  }, [chartData, viewMode]);

  const hasChartData = useMemo(
    () => chartData.some((row) => row.total > 0 || (row.maxReps ?? 0) > 0),
    [chartData]
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading your stats...</p>
        </div>
      </div>
    );
  }

  const hasReadinessLine =
    showReadiness && chartData.some((row) => typeof row.readiness === "number");
  const showTargetLine = showTarget && movement && typeof movement.daily_target === "number";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Progress &amp; Statistics</h1>
        <p className="text-muted-foreground">Track your calisthenics journey</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={category}
            onValueChange={(value) => setCategory(value as MovementCategory)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="push">Push</SelectItem>
              <SelectItem value="pull">Pull</SelectItem>
              <SelectItem value="legs">Legs</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={viewMode}
            onValueChange={(value) => setViewMode(value as "stacked" | "biggest")}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stacked">Stacked sets</SelectItem>
              <SelectItem value="biggest">Biggest set</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ListFilter className="h-4 w-4" />
                <span>{exerciseSummary}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              {exerciseOptions.map((option) => {
                const checked = effectiveSelection.includes(option.id);
                return (
                  <DropdownMenuCheckboxItem
                    key={option.id}
                    checked={checked}
                    onCheckedChange={(next) => {
                      setSelectedExercises((prev) => {
                        const isChecked = Boolean(next);
                        if (isChecked) {
                          const set = new Set(prev);
                          set.add(option.id);
                          return Array.from(set);
                        }
                        const filtered = prev.filter((id) => id !== option.id);
                        if (filtered.length === 0) {
                          return exerciseOptions.map((ex) => ex.id);
                        }
                        return filtered;
                      });
                    }}
                  >
                    {option.name}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={showReadiness}
              onCheckedChange={(checked) => setShowReadiness(Boolean(checked))}
            />
            Readiness line
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={showTarget}
              onCheckedChange={(checked) => setShowTarget(Boolean(checked))}
            />
            Target line
          </label>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{categoryName} Training Load</CardTitle>
          <CardDescription>
            {viewMode === "stacked"
              ? "Stacked daily sets with optional readiness overlay."
              : "Biggest set per day with optional readiness overlay."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasChartData ? (
            <div className="text-sm text-muted-foreground">
              No training data yet for this selection.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              {(() => {
                interface CustomTooltipProps {
                  active?: boolean;
                  payload?: Array<{ payload: ChartRow }>;
                  label?: string | number;
                }

                const CustomTooltip = ({ active, label, payload }: CustomTooltipProps) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = (payload[0]?.payload as ChartRow) || ({} as ChartRow);
                  const dateLabel = label ? new Date(String(label)).toLocaleDateString() : "";

                  const stackedSets: Array<{ reps: number; rpe: number; isMax: boolean }> = [];
                  if (viewMode === "stacked") {
                    for (let i = 1; i <= maxSetsForChart; i++) {
                      const reps = data[`s${i}_reps`] as number | undefined;
                      if (typeof reps !== "number") continue;
                      const rpe = data[`s${i}_rpe`] as number | undefined;
                      const isMax = data[`s${i}_max`] as boolean | undefined;
                      stackedSets.push({
                        reps,
                        rpe: typeof rpe === "number" ? rpe : 0,
                        isMax: !!isMax,
                      });
                    }
                  }

                  return (
                    <div className="rounded-md border bg-card p-3 shadow-sm">
                      <div className="mb-2 text-xs text-muted-foreground">{dateLabel}</div>
                      {viewMode === "stacked" ? (
                        <>
                          <div className="text-sm font-medium">Total: {data.total} reps</div>
                          <div className="mt-2 space-y-1">
                            {stackedSets.map((set, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span
                                  className="inline-block h-3 w-3 rounded"
                                  style={{ backgroundColor: colorForRPE(set.rpe, set.isMax) }}
                                />
                                <span>
                                  Set {idx + 1}: {set.reps} reps
                                </span>
                                <span className="text-xs text-muted-foreground">RPE {set.rpe}</span>
                                {set.isMax && (
                                  <span className="ml-1 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600 dark:bg-purple-900/30 dark:text-purple-200">
                                    Max effort
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1 text-sm">
                          <div className="font-medium">Biggest set: {data.maxReps ?? 0} reps</div>
                          <div className="text-xs text-muted-foreground">
                            RPE {data.maxRpe ?? 0}
                          </div>
                          {data.maxIsMax && (
                            <div className="text-xs text-purple-600 dark:text-purple-300">
                              Max effort set
                            </div>
                          )}
                        </div>
                      )}
                      {hasReadinessLine && typeof data.readiness === "number" && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Readiness: {data.readiness}
                        </div>
                      )}
                      {showTargetLine && typeof data.target === "number" && (
                        <div className="text-xs text-muted-foreground">
                          Target: {data.target} reps
                        </div>
                      )}
                    </div>
                  );
                };

                const CustomLegend = () => (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {RPE_LEGEND.map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-3 w-3 rounded"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                    {hasReadinessLine && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-3 w-3 rounded"
                          style={{ backgroundColor: "hsl(var(--primary))" }}
                        />
                        <span className="text-muted-foreground">Readiness (1–5)</span>
                      </div>
                    )}
                    {showTargetLine && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-0.5 w-4 rounded bg-muted-foreground" />
                        <span className="text-muted-foreground">Target volume</span>
                      </div>
                    )}
                  </div>
                );

                return (
                  <BarChart data={chartData} barCategoryGap={16} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis yAxisId="left" allowDecimals={false} />
                    {hasReadinessLine && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[1, 5]}
                        allowDecimals={false}
                      />
                    )}
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />

                    {viewMode === "stacked" && maxSetsForChart > 0 ? (
                      Array.from({ length: maxSetsForChart }).map((_, idx) => {
                        const key = `s${idx + 1}_reps`;
                        return (
                          <Bar
                            key={key}
                            yAxisId="left"
                            dataKey={key}
                            stackId="sets"
                            radius={idx === maxSetsForChart - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          >
                            {chartData.map((entry, index) => (
                              <Cell
                                key={`${key}-${index}`}
                                fill={colorForRPE(
                                  entry[`s${idx + 1}_rpe`] as number | undefined,
                                  entry[`s${idx + 1}_max`] as boolean | undefined
                                )}
                                stroke="hsl(var(--card))"
                                strokeWidth={1}
                              />
                            ))}
                          </Bar>
                        );
                      })
                    ) : (
                      <Bar yAxisId="left" dataKey="maxReps" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`max-${index}`}
                            fill={colorForRPE(entry.maxRpe ?? 0, entry.maxIsMax ?? false)}
                            stroke="hsl(var(--card))"
                            strokeWidth={1}
                          />
                        ))}
                      </Bar>
                    )}

                    {hasReadinessLine && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="readiness"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name="Readiness"
                      />
                    )}
                    {showTargetLine && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="target"
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                        name="Target"
                      />
                    )}
                  </BarChart>
                );
              })()}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {!movement && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-sm text-muted-foreground">
              No movement configured for {categoryName} yet.
            </p>
            <Button onClick={() => (window.location.href = `/movement/${category}/select`)}>
              Set Up Movement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
