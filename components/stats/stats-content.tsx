"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory, Movement, Set as WorkoutSet } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, Calendar, Trophy, Target } from "lucide-react";
import { EXERCISE_VARIATIONS } from "@/lib/constants/exercises";
import { formatDate } from "@/lib/utils/date-helpers";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface StatsContentProps {
  userId: string;
}

export function StatsContent({ userId }: StatsContentProps) {
  const [activeTab, setActiveTab] = useState<MovementCategory>("push");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
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

      // Fetch all sets from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sets } = await supabase
        .from("sets")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", thirtyDaysAgo.toISOString())
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

  const processStats = (sets: WorkoutSet[], movements: Movement[], reviews: any[]) => {
    const statsByCategory: Record<MovementCategory, any> = {
      push: { dailyVolume: [], totalSets: 0, totalReps: 0, avgRPE: 0 },
      pull: { dailyVolume: [], totalSets: 0, totalReps: 0, avgRPE: 0 },
      legs: { dailyVolume: [], totalSets: 0, totalReps: 0, avgRPE: 0 },
    };

    // Group sets by category and date
    const categories: MovementCategory[] = ["push", "pull", "legs"];
    
    categories.forEach((category) => {
      const categorySets = sets.filter((s) => s.category === category);
      
      // Daily volume
      const dailyMap = new Map<string, number>();
      categorySets.forEach((set) => {
        const date = new Date(set.logged_at).toISOString().split("T")[0];
        dailyMap.set(date, (dailyMap.get(date) || 0) + set.reps);
      });

      statsByCategory[category].dailyVolume = Array.from(dailyMap.entries())
        .map(([date, reps]) => ({ date, reps }))
        .slice(-14); // Last 14 days

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
                      <CardTitle className="text-sm font-medium">Total Reps (30d)</CardTitle>
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

              {/* Daily Volume Chart */}
              {categoryStats && categoryStats.dailyVolume.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Volume (Last 14 Days)</CardTitle>
                    <CardDescription>Total reps per day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryStats.dailyVolume}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value) => [`${value} reps`, "Volume"]}
                        />
                        <Bar dataKey="reps" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Recovery Score Trend */}
              {stats?.reviews && stats.reviews.filter((r: any) => r.category === category).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recovery Score Trend</CardTitle>
                    <CardDescription>Weekly recovery scores over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={stats.reviews
                          .filter((r: any) => r.category === category)
                          .map((r: any) => ({
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

