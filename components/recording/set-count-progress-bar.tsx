"use client";

import React from "react";

interface SetCountProgressBarProps {
  prescribedSets: number;
  completedNonMaxSets: number;
}

export function SetCountProgressBar({
  prescribedSets,
  completedNonMaxSets,
}: SetCountProgressBarProps) {
  const totalSets = Math.max(0, prescribedSets);
  const completedSets = Math.max(
    0,
    Math.min(completedNonMaxSets, totalSets || completedNonMaxSets)
  );
  const showGlow = totalSets > 0 && completedSets >= totalSets;
  const segmentWidth = totalSets > 0 ? 100 / totalSets : 100;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Sets Progress</span>
          <span className="text-xs text-muted-foreground">
            {completedSets}/{totalSets || 0} sets
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Complete the suggested number of sets based on today&apos;s readiness.
        </p>
      </div>

      <div className="relative">
        <div
          className={`relative h-14 w-full overflow-hidden rounded-2xl border-4 border-foreground/80 bg-muted/40 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] transition-all duration-500 ${
            showGlow ? "shadow-[0_4px_0_0_rgba(0,0,0,0.1),0_0_20px_rgba(var(--primary),0.6)]" : ""
          }`}
          role="progressbar"
          aria-valuenow={completedSets}
          aria-valuemin={0}
          aria-valuemax={totalSets}
          aria-label={`Sets: ${completedSets} of ${totalSets}`}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_20px)]"></div>

          {/* Segments */}
          {totalSets > 0 ? (
            Array.from({ length: totalSets }).map((_, index) => {
              const left = index * segmentWidth;
              const completed = index < completedSets;
              return (
                <div
                  key={index}
                  className="absolute top-0 h-full transition-all duration-500"
                  style={{ left: `${left}%`, width: `${segmentWidth}%` }}
                >
                  <div className={`h-full w-full ${completed ? "bg-primary" : "bg-transparent"}`} />
                  {index > 0 && (
                    <div className="absolute left-0 top-0 h-full w-0.5 bg-foreground/40" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
              No sets prescribed today
            </div>
          )}
        </div>

        <div className="mt-2 flex justify-end">
          <span className="text-xs font-semibold text-muted-foreground">
            {totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0}% complete
          </span>
        </div>
      </div>
    </div>
  );
}
