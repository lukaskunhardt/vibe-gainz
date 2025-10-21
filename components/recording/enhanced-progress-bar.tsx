"use client";

import { useEffect, useState } from "react";
import { Set as WorkoutSet } from "@/types";
import { colorForRPE } from "@/lib/constants/rpe";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface YesterdaySummary {
  setsCount: number;
  avgRPE: number;
  reached: boolean;
}

interface EnhancedProgressBarProps {
  totalTarget: number;
  completedSets: WorkoutSet[];
  plannedSets: number[];
  showAnimation: boolean;
  yesterdayTarget?: number;
  readinessScore?: number | null;
  yesterdaySummary?: YesterdaySummary | null;
  isLoadingContext?: boolean;
}

export function EnhancedProgressBar({
  totalTarget,
  completedSets,
  plannedSets,
  showAnimation,
  yesterdayTarget,
  readinessScore,
  yesterdaySummary,
  isLoadingContext = false,
}: EnhancedProgressBarProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [animatingSegments, setAnimatingSegments] = useState<Set<string>>(new Set());
  const [previousSetCount, setPreviousSetCount] = useState(completedSets.length);

  const currentTotal = completedSets.reduce((sum, set) => sum + set.reps, 0);
  const isOverTarget = currentTotal > totalTarget;
  const overflowReps = isOverTarget ? currentTotal - totalTarget : 0;

  // Generate dynamic target explanation
  const generateTargetExplanation = (): string => {
    // If we don't have enough context data, return a simple explanation
    if (yesterdayTarget === undefined || !plannedSets.length) {
      return `Today's plan: ${plannedSets.length} ${plannedSets.length === 1 ? "set" : "sets"} totaling ${totalTarget} reps.`;
    }

    const delta = totalTarget - yesterdayTarget;
    const setsDescription =
      plannedSets.length > 0
        ? `${plannedSets.length} ${plannedSets.length === 1 ? "set" : "sets"} (${plannedSets.slice(0, 3).join(", ")}${plannedSets.length > 3 ? "..." : ""} reps)`
        : `${totalTarget} reps`;

    // Determine reason based on delta and context
    if (delta > 0) {
      // Increased
      if (readinessScore !== undefined && readinessScore !== null && readinessScore <= 2) {
        // Should not happen, but handle it
        return `Increased by ${delta} reps from yesterday's ${yesterdayTarget} reps. Today's plan: ${setsDescription}.`;
      } else if (yesterdaySummary?.setsCount === 1) {
        return `Increased by ${delta} reps from yesterday's ${yesterdayTarget} reps—you crushed it in just 1 set! Today's plan: ${setsDescription}.`;
      } else if (yesterdaySummary?.setsCount === 2) {
        return `Increased by ${delta} reps from yesterday's ${yesterdayTarget} reps because you hit your target efficiently in 2 sets. Today's plan: ${setsDescription}.`;
      } else if (yesterdaySummary?.reached) {
        return `Increased by ${delta} reps from yesterday's ${yesterdayTarget} reps based on your solid performance. Today's plan: ${setsDescription}.`;
      } else {
        return `Increased by ${delta} reps from yesterday's ${yesterdayTarget} reps. Today's plan: ${setsDescription}.`;
      }
    } else if (delta < 0) {
      // Decreased
      if (readinessScore !== undefined && readinessScore !== null && readinessScore <= 2) {
        return `Decreased by ${Math.abs(delta)} reps from yesterday's ${yesterdayTarget} reps because you logged low readiness for recovery. Today's plan: ${setsDescription}.`;
      } else {
        return `Decreased by ${Math.abs(delta)} reps from yesterday's ${yesterdayTarget} reps to optimize recovery. Today's plan: ${setsDescription}.`;
      }
    } else {
      // Same as yesterday
      if (readinessScore !== undefined && readinessScore !== null && readinessScore <= 2) {
        return `Same as yesterday (${yesterdayTarget} reps) because you logged low readiness for recovery. Today's plan: ${setsDescription}.`;
      } else if (yesterdaySummary && !yesterdaySummary.reached) {
        return `Same as yesterday (${yesterdayTarget} reps) because the target wasn't fully reached. Today's plan: ${setsDescription}.`;
      } else if (yesterdaySummary && yesterdaySummary.setsCount >= 4) {
        return `Same as yesterday (${yesterdayTarget} reps) to maintain efficiency—yesterday took ${yesterdaySummary.setsCount} sets. Today's plan: ${setsDescription}.`;
      } else {
        return `Same as yesterday (${yesterdayTarget} reps). Today's plan: ${setsDescription}.`;
      }
    }
  };

  const targetExplanation = generateTargetExplanation();

  // Trigger animation only once when target is reached
  useEffect(() => {
    if (showAnimation && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [showAnimation, hasAnimated]);

  // Track new sets and trigger their animations
  useEffect(() => {
    if (completedSets.length > previousSetCount) {
      // New set(s) added, animate them
      const newSegments = new Set(animatingSegments);
      for (let i = previousSetCount; i < completedSets.length; i++) {
        const setId = completedSets[i].id;
        newSegments.add(setId);

        // Remove from animating set after animation completes
        setTimeout(() => {
          setAnimatingSegments((prev) => {
            const updated = new Set(prev);
            updated.delete(setId);
            return updated;
          });
        }, 800); // Match animation duration
      }
      setAnimatingSegments(newSegments);
      setPreviousSetCount(completedSets.length);
    }
  }, [completedSets, previousSetCount, animatingSegments]);

  // Calculate segments for planned sets (ghosted outline style)
  const plannedSegments = plannedSets.map((reps, index) => {
    const previousTotal = plannedSets.slice(0, index).reduce((sum, r) => sum + r, 0);
    const startPercentage = (previousTotal / totalTarget) * 100;
    const width = (reps / totalTarget) * 100;
    return { startPercentage, width, reps, index };
  });

  // Calculate segments for completed sets
  const completedSegments = completedSets.map((set, index) => {
    const previousTotal = completedSets.slice(0, index).reduce((sum, s) => sum + s.reps, 0);
    const startPercentage = (previousTotal / totalTarget) * 100;
    const width = (set.reps / totalTarget) * 100;
    const color = colorForRPE(set.rpe, set.is_max_effort);
    return { startPercentage, width, color, set, index };
  });

  return (
    <div className="space-y-3">
      {/* Label with dynamic explanation */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Today&apos;s Progress</span>
        </div>
        {isLoadingContext ? (
          // Skeleton loading state
          <div className="mt-1 space-y-1">
            <div className="h-3 w-full animate-pulse rounded bg-muted"></div>
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted"></div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">{targetExplanation}</p>
        )}
      </div>

      {/* Enhanced Progress Bar */}
      <div className="relative">
        <div
          className={`relative h-14 w-full overflow-hidden rounded-2xl border-4 border-foreground/80 bg-muted/40 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] transition-all duration-500 ${
            showAnimation && hasAnimated
              ? "shadow-[0_4px_0_0_rgba(0,0,0,0.1),0_0_20px_rgba(var(--primary),0.6)]"
              : ""
          }`}
          role="progressbar"
          aria-valuenow={currentTotal}
          aria-valuemin={0}
          aria-valuemax={totalTarget}
          aria-label={`Progress: ${currentTotal} of ${totalTarget} reps completed`}
        >
          {/* Background subtle pattern */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_20px)]"></div>

          {/* Planned set segments (diagonal stripes) */}
          {plannedSegments.map((segment) => {
            const actualStartPercentage = Math.min(segment.startPercentage, 100);
            const actualWidth = Math.min(segment.width, 100 - actualStartPercentage);

            return (
              <div
                key={`planned-${segment.index}`}
                className="absolute top-0 h-full"
                style={{
                  left: `${actualStartPercentage}%`,
                  width: `${actualWidth}%`,
                  background:
                    "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0, 0, 0, 0.08) 6px, rgba(0, 0, 0, 0.08) 12px)",
                }}
              />
            );
          })}

          {/* Completed segments with RPE colors */}
          <TooltipProvider delayDuration={0}>
            {completedSegments.map((segment) => {
              const actualStartPercentage = Math.min(segment.startPercentage, 100);
              const actualWidth = Math.min(segment.width, 100 - actualStartPercentage);
              const isAnimating = animatingSegments.has(segment.set.id);

              return (
                <Tooltip key={segment.set.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`absolute top-0 h-full cursor-pointer transition-all ease-out hover:opacity-90 ${
                        isAnimating ? "animate-fill-segment" : ""
                      }`}
                      style={{
                        left: `${actualStartPercentage}%`,
                        width: isAnimating ? 0 : `${actualWidth}%`,
                        backgroundColor: segment.color,
                        ...(isAnimating &&
                          ({
                            animation: `fillSegment 800ms ease-out forwards`,
                            "--segment-width": `${actualWidth}%`,
                          } as React.CSSProperties)),
                      }}
                    >
                      {/* Shimmer effect on hover */}
                      <div className="h-full w-full opacity-0 transition-opacity duration-300 hover:opacity-30">
                        <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="font-medium">
                    <p>
                      Set {segment.index + 1}: {segment.set.reps} reps @ RPE {segment.set.rpe}
                      {segment.set.is_max_effort && " (Max Effort)"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>

          {/* Divider lines between all segments (planned + completed) */}
          {[...plannedSegments].map((segment, index) => {
            if (index === 0) return null; // No divider before first segment
            const cumulativePercentage = segment.startPercentage;
            if (cumulativePercentage >= 100) return null;

            return (
              <div
                key={`divider-${index}`}
                className="absolute top-0 h-full w-0.5 bg-foreground/60"
                style={{ left: `${cumulativePercentage}%` }}
              />
            );
          })}
        </div>

        {/* Total volume counter below bar (right side) */}
        <div className="mt-2 flex justify-end">
          <span className="text-xs font-semibold text-muted-foreground">
            {isOverTarget ? totalTarget : currentTotal} / {totalTarget}
            {overflowReps > 0 && (
              <span className="ml-1 font-black text-primary"> +{overflowReps} additional reps</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
