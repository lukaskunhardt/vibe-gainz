"use client";

import { RecoveryScoreBreakdown } from "@/types";
import { Progress } from "@/components/ui/progress";
import { RECOVERY_SCORE_WEIGHTS } from "@/lib/constants/progression";

interface ScoreBreakdownProps {
  breakdown: RecoveryScoreBreakdown;
}

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const components = [
    {
      label: "First Set Performance",
      score: breakdown.firstSetPerformance,
      max: RECOVERY_SCORE_WEIGHTS.FIRST_SET_PERFORMANCE,
      description: "Average first set reps vs. max effort",
    },
    {
      label: "RPE Efficiency",
      score: breakdown.rpeEfficiency,
      max: RECOVERY_SCORE_WEIGHTS.RPE_EFFICIENCY,
      description: "Percentage of sets in optimal RPE range (6-8)",
    },
    {
      label: "Target Achievement",
      score: breakdown.targetAchievement,
      max: RECOVERY_SCORE_WEIGHTS.TARGET_ACHIEVEMENT,
      description: "Days where daily target was met",
    },
    {
      label: "Consistency",
      score: breakdown.consistency,
      max: RECOVERY_SCORE_WEIGHTS.CONSISTENCY,
      description: "Number of training days in the week",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Score Breakdown</h3>
      {components.map((component) => {
        const percentage = (component.score / component.max) * 100;
        
        return (
          <div key={component.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{component.label}</span>
              <span className="text-muted-foreground">
                {component.score} / {component.max}
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">{component.description}</p>
          </div>
        );
      })}
    </div>
  );
}

