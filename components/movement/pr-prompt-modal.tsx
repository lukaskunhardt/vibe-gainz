"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Clock } from "lucide-react";

interface PRPromptModalProps {
  isOpen: boolean;
  currentPR: number;
  impliedMax: number;
  onDismiss: () => void;
  onTakeTest: () => void;
}

export function PRPromptModal({
  isOpen,
  currentPR,
  impliedMax,
  onDismiss,
  onTakeTest,
}: PRPromptModalProps) {
  const suggestedTarget = Math.max(impliedMax, currentPR + 1);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onDismiss() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <Trophy className="h-8 w-8 text-green-500" />
          </div>
          <DialogTitle className="text-center text-2xl">Ready to Break Your Record?</DialogTitle>
          <DialogDescription className="text-center">
            Yesterday&apos;s performance suggests you can beat your benchmark.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg bg-muted p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Current max effort</span>
            <span className="font-semibold">{currentPR} reps</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <Clock className="h-4 w-4" /> Suggested test target
            </span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {suggestedTarget} reps
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Log one max-effort set today to update your benchmark. We&apos;ll limit the rest of your
          session so you can give it everything.
        </p>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full" onClick={onDismiss}>
            Remind me later
          </Button>
          <Button className="w-full" onClick={onTakeTest}>
            Record Max Effort
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
