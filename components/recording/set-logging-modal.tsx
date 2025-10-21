"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Save } from "lucide-react";
import { RPESelector } from "@/components/recording/rpe-selector";
import { RPE10ConfirmationModal } from "@/components/recording/rpe-10-confirmation-modal";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Set as WorkoutSet } from "@/types";

interface SetLoggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  existingSet?: WorkoutSet;
  nextPlannedReps?: number;
  isMaxEffort: boolean;
  onSave: (reps: number, rpe: number, isMaxEffort: boolean) => Promise<void>;
}

export function SetLoggingModal({
  isOpen,
  onClose,
  mode,
  existingSet,
  nextPlannedReps = 0,
  isMaxEffort,
  onSave,
}: SetLoggingModalProps) {
  const [reps, setReps] = useState(0);
  const [rpe, setRPE] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showRPE10Modal, setShowRPE10Modal] = useState(false);

  // Initialize form when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && existingSet) {
        setReps(existingSet.reps);
        setRPE(existingSet.rpe);
      } else if (mode === "create") {
        setReps(nextPlannedReps);
        setRPE(0);
      }
    }
  }, [isOpen, mode, existingSet, nextPlannedReps]);

  const handleSave = async () => {
    if (reps <= 0) {
      return;
    }

    // Show RPE 10 confirmation if not max effort mode and RPE is 10
    if (!isMaxEffort && rpe === 10 && mode === "create") {
      setShowRPE10Modal(true);
      return;
    }

    await saveSet(false);
  };

  const handleMaxEffortConfirm = async () => {
    await saveSet(true);
    setShowRPE10Modal(false);
  };

  const handleRegularSetConfirm = async () => {
    await saveSet(false);
    setShowRPE10Modal(false);
  };

  const saveSet = async (isMaxEffortSet: boolean) => {
    setSaving(true);
    try {
      await onSave(reps, rpe, isMaxEffortSet || isMaxEffort);
      onClose();
    } catch (error) {
      console.error("Error saving set:", error);
    } finally {
      setSaving(false);
    }
  };

  const isValid = reps > 0 && (isMaxEffort || rpe > 0);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>
              {mode === "create" ? (isMaxEffort ? "Max Effort Test" : "Log Set") : "Edit Set"}
            </SheetTitle>
            <SheetDescription>
              {mode === "create"
                ? "Enter the reps you completed and rate the difficulty"
                : "Update the reps and RPE for this set"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 pb-6">
            {/* Rep Counter */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {isMaxEffort ? "Max Effort Reps" : "Reps"}
              </label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16"
                  onClick={() => setReps(Math.max(0, reps - 1))}
                  disabled={reps <= 0}
                >
                  <Minus className="h-6 w-6" />
                </Button>
                <div className="w-32 text-center text-6xl font-bold">{reps}</div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16"
                  onClick={() => setReps(reps + 1)}
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* RPE Selector */}
            {!isMaxEffort && <RPESelector value={rpe} onChange={setRPE} />}

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving || !isValid} className="w-full" size="lg">
              <Save className="mr-2 h-4 w-4" />
              {saving
                ? "Saving..."
                : mode === "create"
                  ? isMaxEffort
                    ? "Record Max Effort"
                    : "Save Set"
                  : "Update Set"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* RPE 10 Confirmation Modal */}
      {showRPE10Modal && (
        <RPE10ConfirmationModal
          onMaxEffort={handleMaxEffortConfirm}
          onRegularSet={handleRegularSetConfirm}
          onChangeRPE={() => setShowRPE10Modal(false)}
        />
      )}
    </>
  );
}
