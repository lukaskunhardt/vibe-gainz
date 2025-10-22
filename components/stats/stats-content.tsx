"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory, Movement, Set as WorkoutSet } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ListFilter, Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { useIsDesktop } from "@/lib/hooks/use-media-query";

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
  bodyWeightByDate: Record<string, number>;
}

type ChartRow = {
  date: string;
  total: number;
  readiness?: number;
  target?: number;
  maxReps?: number;
  maxRpe?: number;
  maxIsMax?: boolean;
  setCount?: number;
  trend?: number;
  bodyWeight?: number;
} & Record<string, number | boolean | string | undefined>;

interface SingleCategoryChartProps {
  category: MovementCategory;
  movement: Movement | null;
  categoryStats: StatsData["byCategory"][MovementCategory] | undefined;
  readinessByDate: Record<string, number> | undefined;
  targetHistory: Array<{ date: string; target: number }> | undefined;
  bodyWeightByDate: Record<string, number> | undefined;
  viewMode: "stacked" | "max";
  showReadiness: boolean;
  showTarget: boolean;
  showTrend: boolean;
  showBodyWeight: boolean;
  recentExercise: string | null;
}

function SingleCategoryChart({
  category,
  movement,
  categoryStats,
  readinessByDate,
  targetHistory,
  bodyWeightByDate,
  viewMode,
  showReadiness,
  showTarget,
  showTrend,
  showBodyWeight,
  recentExercise,
}: SingleCategoryChartProps) {
  const [selectedExercises, setSelectedExercises] = useState<string[]>(() =>
    recentExercise ? [recentExercise] : EXERCISE_VARIATIONS[category].map((ex) => ex.id)
  );

  // Reset selected exercises when category or recent exercise changes
  useEffect(() => {
    setSelectedExercises(
      recentExercise ? [recentExercise] : EXERCISE_VARIATIONS[category].map((ex) => ex.id)
    );
  }, [category, recentExercise]);

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
        target: currentTarget,
        setCount: sets.length,
        bodyWeight: bodyWeightByDate?.[day.date],
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
  }, [categoryStats, selectionSet, readinessByDate, targetHistory, bodyWeightByDate]);

  const chartDataWithTrend: ChartRow[] = useMemo(() => {
    if (chartData.length === 0) return [];

    const sourceKey = viewMode === "stacked" ? "total" : "maxReps";
    const values = chartData.map((row) => {
      const val = row[sourceKey];
      return typeof val === "number" && !Number.isNaN(val) ? val : 0;
    });

    const windowSize = 7;
    const moving: number[] = [];
    let rollingSum = 0;

    for (let i = 0; i < values.length; i++) {
      rollingSum += values[i];
      if (i >= windowSize) {
        rollingSum -= values[i - windowSize];
      }
      const divisor = Math.min(i + 1, windowSize);
      moving.push(divisor > 0 ? Number((rollingSum / divisor).toFixed(2)) : 0);
    }

    return chartData.map((row, idx) => ({
      ...row,
      trend: moving[idx],
    }));
  }, [chartData, viewMode]);

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

  const hasReadinessLine =
    showReadiness && chartDataWithTrend.some((row) => typeof row.readiness === "number");
  const hasBodyWeightLine =
    showBodyWeight && chartDataWithTrend.some((row) => typeof row.bodyWeight === "number");
  const showTargetLine = showTarget && movement && targetHistory && targetHistory.length > 0;

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
            <div className="font-medium">Max reps: {data.maxReps ?? 0}</div>
            <div className="text-xs text-muted-foreground">RPE {data.maxRpe ?? 0}</div>
            {data.maxIsMax && (
              <div className="text-xs text-purple-600 dark:text-purple-300">Max effort set</div>
            )}
          </div>
        )}
        {hasReadinessLine && typeof data.readiness === "number" && (
          <div className="mt-2 text-xs text-muted-foreground">Readiness: {data.readiness}</div>
        )}
        {hasBodyWeightLine && typeof data.bodyWeight === "number" && (
          <div className="mt-2 text-xs text-muted-foreground">
            Body weight: {data.bodyWeight.toFixed(1)} kg
          </div>
        )}
        {showTrend && typeof data.trend === "number" && (
          <div className="text-xs text-muted-foreground">
            7-day trend: {data.trend.toFixed(1)} reps
          </div>
        )}
        {showTargetLine && typeof data.target === "number" && (
          <div className="text-xs text-muted-foreground">Target: {data.target} reps</div>
        )}
      </div>
    );
  };

  const CustomLegend = () => (
    <div className="mt-2 flex items-center justify-between px-2">
      <TooltipProvider>
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="flex cursor-help items-center gap-1.5 text-xs">
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Legend</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div>
                <div className="mb-1 text-xs font-semibold">RPE Colors</div>
                <div className="space-y-1">
                  {RPE_LEGEND.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {(hasReadinessLine || hasBodyWeightLine || showTargetLine || showTrend) && (
                <div>
                  <div className="mb-1 text-xs font-semibold">Overlays</div>
                  <div className="space-y-1">
                    {hasReadinessLine && (
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded"
                          style={{ backgroundColor: "#EF4444" }}
                        />
                        <span className="text-xs">Readiness (1-5)</span>
                      </div>
                    )}
                    {hasBodyWeightLine && (
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded"
                          style={{ backgroundColor: "hsl(var(--primary))" }}
                        />
                        <span className="text-xs">Body weight (kg)</span>
                      </div>
                    )}
                    {showTargetLine && (
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-0.5 w-4 rounded bg-muted-foreground" />
                        <span className="text-xs">Target volume</span>
                      </div>
                    )}
                    {showTrend && (
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-0.5 w-4 rounded bg-sky-500" />
                        <span className="text-xs">7-day trend</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TooltipContent>
        </UITooltip>
      </TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto py-1 text-xs">
            <ListFilter className="mr-1 h-3 w-3" />
            {exerciseSummary}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
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
  );

  // Calculate Y-axis domain for body weight
  const bodyWeightDomain = useMemo(() => {
    if (!hasBodyWeightLine) return [0, 100];
    const weights = chartDataWithTrend
      .map((row) => row.bodyWeight)
      .filter((w): w is number => typeof w === "number");
    if (weights.length === 0) return [0, 100];
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    return [Math.floor(min - 2), Math.ceil(max + 2)];
  }, [chartDataWithTrend, hasBodyWeightLine]);

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const viewLabel = viewMode === "stacked" ? "Volume" : "Max Reps";

  let chartTitle = `${viewLabel}: ${categoryName}`;
  if (effectiveSelection.length > 0 && effectiveSelection.length < exerciseOptions.length) {
    const names = effectiveSelection
      .map((id) => exerciseOptions.find((ex) => ex.id === id)?.name)
      .filter(Boolean)
      .slice(0, 2);
    const extra = effectiveSelection.length > 2 ? ` +${effectiveSelection.length - 2}` : "";
    chartTitle = `${viewLabel}: ${names.join(", ")}${extra}`;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-base font-medium">{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent className="px-1 pb-2">
        {!hasChartData ? (
          <div className="text-sm text-muted-foreground">
            No training data yet for this selection.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartDataWithTrend} barCategoryGap="10%" barGap={2}>
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
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                label={{
                  value: "Reps",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle" },
                }}
              />
              {(hasReadinessLine || hasBodyWeightLine) && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={hasBodyWeightLine ? bodyWeightDomain : [1, 5]}
                  allowDecimals={false}
                  tickFormatter={hasBodyWeightLine ? (value) => `${value} kg` : undefined}
                  label={{
                    value: hasBodyWeightLine ? "Body Weight (kg)" : "Readiness",
                    angle: 90,
                    position: "insideRight",
                    style: { textAnchor: "middle" },
                  }}
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
                      {chartDataWithTrend.map((entry, index) => (
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
                  {chartDataWithTrend.map((entry, index) => (
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
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                  name="Readiness"
                />
              )}
              {hasBodyWeightLine && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bodyWeight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  name="Body Weight"
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
              {showTrend && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="trend"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                  name="7-day trend"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsContent({ userId }: StatsContentProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<MovementCategory>("push");
  const [viewMode, setViewMode] = useState<"stacked" | "max">("max");
  const [showReadiness, setShowReadiness] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
  const [showTrend, setShowTrend] = useState(true);
  const [showBodyWeight, setShowBodyWeight] = useState(false);
  const [recentExercises, setRecentExercises] = useState<Record<MovementCategory, string | null>>({
    push: null,
    pull: null,
    legs: null,
  });
  const isDesktop = useIsDesktop();

  // Handle mutually exclusive readiness/body weight toggles
  const handleReadinessToggle = (checked: boolean) => {
    if (checked) {
      setShowBodyWeight(false);
    }
    setShowReadiness(checked);
  };

  const handleBodyWeightToggle = (checked: boolean) => {
    if (checked) {
      setShowReadiness(false);
    }
    setShowBodyWeight(checked);
  };

  const processStats = (
    sets: WorkoutSet[],
    dailyStats: Array<{
      date: string;
      readiness_score: number | null;
      body_weight_kg: number | null;
    }>,
    targets: Array<{ category: MovementCategory; date: string; target: number }>
  ): StatsData => {
    const readinessByDate: Record<string, number> = {};
    const bodyWeightByDate: Record<string, number> = {};

    dailyStats.forEach((stat) => {
      if (stat.readiness_score) {
        readinessByDate[stat.date] = stat.readiness_score;
      }
      if (stat.body_weight_kg) {
        bodyWeightByDate[stat.date] = stat.body_weight_kg;
      }
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
      bodyWeightByDate,
    };
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const yearAgo = new Date();
      yearAgo.setDate(yearAgo.getDate() - 365);

      // OPTIMIZATION: Parallelize all queries
      const [{ data: movementsData }, { data: sets }, { data: dailyStats }, { data: targets }] =
        await Promise.all([
          supabase.from("movements").select("*").eq("user_id", userId),
          supabase
            .from("sets")
            .select("*")
            .eq("user_id", userId)
            .gte("logged_at", yearAgo.toISOString())
            .order("logged_at", { ascending: true }),
          supabase
            .from("daily_user_stats")
            .select(
              "date, readiness_score, body_weight_kg, push_exercise_id, pull_exercise_id, legs_exercise_id"
            )
            .eq("user_id", userId)
            .gte("date", yearAgo.toISOString().slice(0, 10))
            .order("date", { ascending: false }),
          supabase
            .from("movement_target_history")
            .select("category, date, target")
            .eq("user_id", userId)
            .order("date", { ascending: true }),
        ]);

      setMovements(movementsData || []);

      // Extract most recent exercise selections (dailyStats is ordered DESC by date)
      const mostRecentExercises = {
        push: dailyStats?.find((d) => d.push_exercise_id)?.push_exercise_id || null,
        pull: dailyStats?.find((d) => d.pull_exercise_id)?.pull_exercise_id || null,
        legs: dailyStats?.find((d) => d.legs_exercise_id)?.legs_exercise_id || null,
      };
      setRecentExercises(mostRecentExercises);

      const statsData = processStats(
        sets || [],
        dailyStats || [],
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

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div>
          <div className="mb-2 h-9 w-64 animate-pulse rounded bg-muted"></div>
          <div className="h-5 w-80 animate-pulse rounded bg-muted"></div>
        </div>

        {/* Filter controls skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-10 w-24 animate-pulse rounded-md bg-muted"></div>
            <div className="h-10 w-32 animate-pulse rounded-md bg-muted"></div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-5 w-32 animate-pulse rounded bg-muted"></div>
            <div className="h-5 w-28 animate-pulse rounded bg-muted"></div>
            <div className="h-5 w-24 animate-pulse rounded bg-muted"></div>
          </div>
        </div>

        {/* Chart skeletons */}
        <div className={isDesktop ? "grid gap-4 md:grid-cols-3" : ""}>
          {(isDesktop ? [1, 2, 3] : [1]).map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="mx-auto h-5 w-32 animate-pulse rounded bg-muted"></div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="h-[300px] w-full animate-pulse rounded bg-muted"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const categories: MovementCategory[] = ["push", "pull", "legs"];

  return (
    <div className="space-y-6">
      {/* Interactive Title */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Show chart data for</span>
        <Select value={viewMode} onValueChange={(value) => setViewMode(value as "stacked" | "max")}>
          <SelectTrigger className="h-auto w-auto border-none bg-transparent p-0 font-medium text-foreground hover:text-primary focus:ring-0 focus:ring-offset-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stacked">total daily volume</SelectItem>
            <SelectItem value="max">max reps</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Category selector */}
      {!isDesktop && (
        <div>
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
        </div>
      )}

      {/* Charts */}
      {isDesktop ? (
        // Desktop: 3 charts side by side
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((cat) => {
            const movement = movements.find((m) => m.category === cat) || null;
            return (
              <SingleCategoryChart
                key={cat}
                category={cat}
                movement={movement}
                categoryStats={stats?.byCategory[cat]}
                readinessByDate={stats?.readinessByDate}
                targetHistory={stats?.targetsByCategory[cat]}
                bodyWeightByDate={stats?.bodyWeightByDate}
                viewMode={viewMode}
                showReadiness={showReadiness}
                showTarget={showTarget}
                showTrend={showTrend}
                showBodyWeight={showBodyWeight}
                recentExercise={recentExercises[cat]}
              />
            );
          })}
        </div>
      ) : (
        // Mobile: Single chart with category selector
        <SingleCategoryChart
          category={category}
          movement={movements.find((m) => m.category === category) || null}
          categoryStats={stats?.byCategory[category]}
          readinessByDate={stats?.readinessByDate}
          targetHistory={stats?.targetsByCategory[category]}
          bodyWeightByDate={stats?.bodyWeightByDate}
          viewMode={viewMode}
          showReadiness={showReadiness}
          showTarget={showTarget}
          showTrend={showTrend}
          showBodyWeight={showBodyWeight}
          recentExercise={recentExercises[category]}
        />
      )}

      {/* Chart Options */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={showReadiness}
            onCheckedChange={(checked) => handleReadinessToggle(Boolean(checked))}
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
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={showTrend}
            onCheckedChange={(checked) => setShowTrend(Boolean(checked))}
          />
          7-day trend
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={showBodyWeight}
            onCheckedChange={(checked) => handleBodyWeightToggle(Boolean(checked))}
          />
          Body weight line
        </label>
      </div>
    </div>
  );
}
