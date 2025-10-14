"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trophy, FileText } from "lucide-react";

interface RPE10ConfirmationModalProps {
  reps: number;
  onMaxEffort: () => void;
  onRegularSet: () => void;
  onChangeRPE: () => void;
}

export function RPE10ConfirmationModal({
  reps,
  onMaxEffort,
  onRegularSet,
  onChangeRPE,
}: RPE10ConfirmationModalProps) {
  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
          <DialogTitle className="text-center text-2xl">RPE 10 Detected</DialogTitle>
          <DialogDescription className="text-center">
            You selected RPE 10 (max effort). How would you like to log this set?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            variant="default"
            className="w-full justify-start h-auto py-4"
            onClick={onMaxEffort}
          >
            <Trophy className="mr-3 h-5 w-5 flex-shrink-0" />
            <div className="text-left">
              <div className="font-semibold">Record as Max Effort Test</div>
              <div className="text-xs opacity-90">
                Update your max reps and recalculate daily targets
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={onRegularSet}
          >
            <FileText className="mr-3 h-5 w-5 flex-shrink-0" />
            <div className="text-left">
              <div className="font-semibold">Log as Regular Set</div>
              <div className="text-xs text-muted-foreground">
                Keep current targets, just log this set
              </div>
            </div>
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={onChangeRPE}
          >
            Change RPE
          </Button>
        </div>

        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <strong>Note:</strong> Training to failure (RPE 10) causes significantly more fatigue than
          RPE 8, with only marginal increases in muscle stimulus. Reserve RPE 10 for max effort tests.
        </div>
      </DialogContent>
    </Dialog>
  );
}

