"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trophy, FileText, Pencil } from "lucide-react";

interface RPE10ConfirmationModalProps {
  onMaxEffort: () => void;
  onRegularSet: () => void;
  onChangeRPE: () => void;
}

export function RPE10ConfirmationModal({
  onMaxEffort,
  onRegularSet,
  onChangeRPE,
}: RPE10ConfirmationModalProps) {
  return (
    <Dialog open={true} onOpenChange={onChangeRPE}>
      <DialogContent className="px-4 sm:max-w-md sm:px-6">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
          <DialogTitle className="text-2xl">RPE 10 Detected</DialogTitle>
          <DialogDescription>
            You selected RPE 10 (max effort). How would you like to log this set?
          </DialogDescription>
        </DialogHeader>

        {/* Tip box with cartoony styling */}
        <div className="border-3 rounded-xl border-foreground/20 bg-muted/40 p-4 shadow-[0_2px_0_0_rgba(0,0,0,0.05)]">
          <p className="text-sm text-muted-foreground">
            <strong className="font-bold">Tip:</strong> For optimal gains with minimal fatigue, aim
            for RPE 6-8. Training to failure (RPE 10) should be reserved for max effort tests.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="h-auto w-full justify-start whitespace-normal py-4"
            onClick={onMaxEffort}
          >
            <Trophy className="mr-2 h-5 w-5 flex-shrink-0" />
            <div className="min-w-0 flex-1 text-left">
              <div className="font-semibold">Record as Max Effort Test</div>
              <div className="text-xs opacity-90">Update your max reps for benchmarking</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto w-full justify-start whitespace-normal py-4"
            onClick={onRegularSet}
          >
            <FileText className="mr-2 h-5 w-5 flex-shrink-0" />
            <div className="min-w-0 flex-1 text-left">
              <div className="font-semibold">Log as Regular Set</div>
              <div className="text-xs text-muted-foreground">
                Keep current targets, just log this set
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto w-full justify-start whitespace-normal py-4"
            onClick={onChangeRPE}
          >
            <Pencil className="mr-2 h-5 w-5 flex-shrink-0" />
            <div className="min-w-0 flex-1 text-left">
              <div className="font-semibold">Change RPE</div>
              <div className="text-xs text-muted-foreground">Select a different RPE value</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
