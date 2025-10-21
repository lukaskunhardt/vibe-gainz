"use client";

import { Set as WorkoutSet } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Trophy } from "lucide-react";
import { colorForRPE } from "@/lib/constants/rpe";
import { format } from "date-fns";

interface CompletedSetsListProps {
  sets: WorkoutSet[];
  onEditSet: (set: WorkoutSet) => void;
  onDeleteSet: (setId: string) => void;
  isRefreshing?: boolean;
}

export function CompletedSetsList({
  sets,
  onEditSet,
  onDeleteSet,
  isRefreshing = false,
}: CompletedSetsListProps) {
  if (sets.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-muted bg-muted/10 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No sets logged yet. Tap the button below to log your first set!
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${isRefreshing ? "opacity-60" : ""}`}>
      <h3 className="text-sm font-semibold text-muted-foreground">Completed Sets</h3>
      <div className="space-y-2">
        {sets.map((set) => {
          const rpeColor = colorForRPE(set.rpe, set.is_max_effort);
          const timestamp = new Date(set.logged_at);

          return (
            <div
              key={set.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
            >
              {/* Set Number */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted font-bold text-foreground">
                {set.set_number}
              </div>

              {/* Set Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {set.reps} {set.reps === 1 ? "rep" : "reps"}
                  </span>
                  {set.is_max_effort ? (
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
                      RPE {set.rpe}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{format(timestamp, "h:mm a")}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEditSet(set)}
                  disabled={isRefreshing}
                  aria-label="Edit set"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDeleteSet(set.id)}
                  disabled={isRefreshing}
                  aria-label="Delete set"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
