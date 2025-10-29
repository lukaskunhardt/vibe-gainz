"use client";

import { Set as WorkoutSet } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Pencil, Trash2, Trophy } from "lucide-react";
import { colorForRPE } from "@/lib/constants/rpe";
import { format } from "date-fns";

interface PlannedSet {
  index: number;
  reps: number;
  targetRPE: number;
}

interface CompletedSetsListProps {
  sets: WorkoutSet[];
  plannedSets?: PlannedSet[];
  onEditSet: (set: WorkoutSet) => void;
  onDeleteSet: (setId: string) => void;
  isRefreshing?: boolean;
}

export function CompletedSetsList({
  sets,
  plannedSets = [],
  onEditSet,
  onDeleteSet,
  isRefreshing = false,
}: CompletedSetsListProps) {
  const totalItems = Math.max(sets.length, plannedSets.length);

  if (totalItems === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-muted bg-muted/10 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No sets planned or logged yet. Tap the button below to get started!
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${isRefreshing ? "opacity-60" : ""}`}>
      <h3 className="text-sm font-semibold text-muted-foreground">Today&apos;s Sets</h3>
      <div className="space-y-2">
        {Array.from({ length: totalItems }).map((_, index) => {
          const completed = sets[index];
          const planned = plannedSets[index];
          const displayIndex = planned?.index ?? completed?.set_number ?? index + 1;

          if (completed) {
            const rpeColor = colorForRPE(completed.rpe, completed.is_max_effort);
            const timestamp = new Date(completed.logged_at);

            return (
              <div
                key={completed.id}
                className="flex items-center gap-3 rounded-lg border border-green-400/70 bg-green-500/10 p-3 transition-colors hover:bg-green-500/20"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted font-bold text-foreground">
                  {displayIndex}
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {completed.reps} {completed.reps === 1 ? "rep" : "reps"}
                    </span>
                    {completed.is_max_effort ? (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                      >
                        <Trophy className="h-3 w-3" />
                        Max Effort
                      </Badge>
                    ) : (
                      <Badge
                        style={{
                          backgroundColor: rpeColor,
                          color: "white",
                        }}
                      >
                        RPE {completed.rpe}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{format(timestamp, "h:mm a")}</p>
                </div>

                <CheckCircle2 className="h-5 w-5 text-green-500" />

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditSet(completed)}
                    disabled={isRefreshing}
                    aria-label="Edit set"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDeleteSet(completed.id)}
                    disabled={isRefreshing}
                    aria-label="Delete set"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          }

          if (planned) {
            return (
              <div
                key={`planned-${planned.index}`}
                className="flex items-center gap-3 rounded-lg border-2 border-dashed border-muted bg-muted/20 p-3"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted font-bold text-foreground">
                  {planned.index}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{planned.reps} reps</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Suggested target for this set</p>
                </div>
              </div>
            );
          }

          // Extra completed sets beyond planned count
          return (
            <div
              key={`extra-placeholder-${index}`}
              className="flex items-center gap-3 rounded-lg border-2 border-dashed border-muted bg-muted/20 p-3"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted font-bold text-foreground">
                {index + 1}
              </div>
              <div className="flex-1">
                <span className="text-sm text-muted-foreground">Additional set slot</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
