"use client";

import { useEffect, useState } from "react";
import { Set as WorkoutSet } from "@/types";
import { colorForRPE } from "@/lib/constants/rpe";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EnhancedProgressBarProps {
  totalTarget: number;
  completedSets: WorkoutSet[];
  showAnimation: boolean;
}

export function EnhancedProgressBar({
  totalTarget,
  completedSets,
  showAnimation,
}: EnhancedProgressBarProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [animatingSegments, setAnimatingSegments] = useState<Set<string>>(new Set());
  const [previousSetCount, setPreviousSetCount] = useState(completedSets.length);

  const currentTotal = completedSets.reduce((sum, set) => sum + set.reps, 0);
  const isOverTarget = currentTotal > totalTarget;
  const overflowReps = isOverTarget ? currentTotal - totalTarget : 0;

  // Trigger animation only once when target is reached
  useEffect(() => {
    if (showAnimation && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [showAnimation, hasAnimated]);

  // Track new sets and trigger their animations
  useEffect(() => {
    if (completedSets.length > previousSetCount) {
      const newSegments = new Set(animatingSegments);
      for (let i = previousSetCount; i < completedSets.length; i++) {
        const setId = completedSets[i].id;
        newSegments.add(setId);

        setTimeout(() => {
          setAnimatingSegments((prev) => {
            const updated = new Set(prev);
            updated.delete(setId);
            return updated;
          });
        }, 800);
      }
      setAnimatingSegments(newSegments);
      setPreviousSetCount(completedSets.length);
    }
  }, [completedSets, previousSetCount, animatingSegments]);

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
      {/* Simple static label */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Progress</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Daily volume target fills up with each set. Aim for RPE 6-8.
        </p>
      </div>

      {/* Progress Bar */}
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
                      Set {segment.index + 1}: {segment.set.reps} reps
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>

          {/* Divider lines between completed sets */}
          {completedSegments.map((segment, index) => {
            if (index === 0) return null;
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

        {/* Total volume counter below bar */}
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
