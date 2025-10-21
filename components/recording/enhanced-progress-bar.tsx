"use client";

import { useEffect, useState } from "react";
import { Set as WorkoutSet } from "@/types";
import { colorForRPE } from "@/lib/constants/rpe";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EnhancedProgressBarProps {
  totalTarget: number;
  completedSets: WorkoutSet[];
  plannedSets: number[];
  showAnimation: boolean;
}

export function EnhancedProgressBar({
  totalTarget,
  completedSets,
  plannedSets,
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

  // Create planned sets description
  const plannedSetsDescription =
    plannedSets.length > 0
      ? `Planned: ${plannedSets.map((reps, i) => `${reps} reps${i < plannedSets.length - 1 ? ", " : ""}`).join("")}`
      : "";

  return (
    <div className="space-y-3">
      {/* Label with description */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Today&apos;s Progress</span>
        </div>
        {plannedSetsDescription && (
          <p className="mt-1 text-xs text-muted-foreground">{plannedSetsDescription}</p>
        )}
      </div>

      {/* Enhanced Progress Bar */}
      <div className="relative">
        {/* Set labels above the bar - both completed and planned */}
        <div className="relative mb-2 h-5">
          {/* Completed set labels */}
          {completedSegments.map((segment) => {
            const actualCenter = segment.startPercentage + segment.width / 2;
            // Cap at 98% to keep label visible even with overflow
            const displayCenter = Math.min(actualCenter, 98);

            return (
              <div
                key={`label-completed-${segment.index}`}
                className="absolute"
                style={{
                  left: `${displayCenter}%`,
                }}
              >
                <div className="relative flex -translate-x-1/2 flex-col items-center">
                  <span className="whitespace-nowrap text-xs font-bold text-foreground">
                    Set {segment.index + 1}
                  </span>
                  <div className="h-1 w-0.5 bg-foreground/40"></div>
                </div>
              </div>
            );
          })}

          {/* Planned set labels (for sets not yet completed) */}
          {plannedSegments.slice(completedSegments.length).map((segment, idx) => {
            const actualCenter = segment.startPercentage + segment.width / 2;
            if (actualCenter > 100) return null;
            const setNumber = completedSegments.length + idx + 1;

            return (
              <div
                key={`label-planned-${segment.index}`}
                className="absolute"
                style={{
                  left: `${actualCenter}%`,
                }}
              >
                <div className="relative flex -translate-x-1/2 flex-col items-center">
                  <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                    (Set {setNumber})
                  </span>
                  <div className="h-1 w-0.5 bg-muted-foreground/30"></div>
                </div>
              </div>
            );
          })}
        </div>

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

          {/* Overflow indicator (beyond 100%) */}
          {isOverTarget && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border-2 border-foreground/60 bg-primary px-3 py-1 text-sm font-black text-primary-foreground shadow-md">
              +{overflowReps}
            </div>
          )}
        </div>

        {/* Total volume counter below bar (right side) */}
        <div className="mt-2 flex justify-end">
          <span className="text-xs font-semibold text-muted-foreground">
            {currentTotal} / {totalTarget} reps
            {overflowReps > 0 && (
              <span className="ml-1 font-black text-primary">(+{overflowReps})</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
