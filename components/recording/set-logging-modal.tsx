"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { RPESelector } from "@/components/recording/rpe-selector";
import { RPE10ConfirmationModal } from "@/components/recording/rpe-10-confirmation-modal";
import NumberFlow from "@number-flow/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [isEditingReps, setIsEditingReps] = useState(false);

  // Initialize form when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && existingSet) {
        setReps(existingSet.reps);
        setRPE(existingSet.rpe);
      } else if (mode === "create") {
        setReps(nextPlannedReps);
        setRPE(7);
      }
      setIsEditingReps(false);
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
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold sm:text-xl">
              {mode === "create" ? (isMaxEffort ? "Max Effort Test" : "Log Set") : "Edit Set"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {mode === "create"
                ? "Enter the reps you completed and rate the difficulty"
                : "Update the reps and RPE for this set"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6">
            {/* Rep Counter Section */}
            <div className="space-y-3">
              <label className="text-sm font-bold">
                {isMaxEffort ? "Max Effort Reps" : "Reps"}
              </label>

              {/* Cartoony Rep Display Container */}
              <div className="rounded-2xl border-4 border-foreground/80 bg-muted/40 p-3 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] sm:p-6">
                {/* Manual adjustment controls */}
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-3 h-11 w-11 rounded-xl border-foreground/60 shadow-[0_3px_0_0_rgba(0,0,0,0.1)] transition-all hover:scale-105 hover:border-foreground active:translate-y-0.5 active:shadow-none disabled:opacity-50 sm:h-14 sm:w-14"
                    onClick={() => setReps(Math.max(0, reps - 10))}
                    disabled={reps <= 0}
                    title="Subtract 10"
                  >
                    <span className="text-sm font-bold sm:text-lg">-10</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="border-3 h-11 w-11 rounded-xl border-foreground/60 shadow-[0_3px_0_0_rgba(0,0,0,0.1)] transition-all hover:scale-105 hover:border-foreground active:translate-y-0.5 active:shadow-none disabled:opacity-50 sm:h-14 sm:w-14"
                    onClick={() => setReps(Math.max(0, reps - 1))}
                    disabled={reps <= 0}
                    title="Subtract 1"
                  >
                    <span className="text-sm font-bold sm:text-lg">-1</span>
                  </Button>

                  {/* Animated number display or input */}
                  {isEditingReps ? (
                    <input
                      type="number"
                      value={reps}
                      onChange={(e) => setReps(Math.max(0, parseInt(e.target.value) || 0))}
                      onBlur={() => setIsEditingReps(false)}
                      autoFocus
                      className="border-3 w-20 rounded-xl border-foreground/40 bg-background p-2 text-center text-4xl font-bold shadow-inner focus:border-foreground focus:outline-none sm:w-28 sm:text-5xl"
                      min="0"
                    />
                  ) : (
                    <div
                      onClick={() => setIsEditingReps(true)}
                      className="border-3 relative w-20 cursor-pointer rounded-xl border-foreground/40 bg-background px-2 py-2 text-center shadow-inner transition-colors hover:border-foreground/60 sm:w-28 sm:py-3"
                      title="Click to type a number"
                    >
                      <NumberFlow
                        value={reps}
                        className="text-4xl font-bold tabular-nums sm:text-5xl"
                        transformTiming={{ duration: 400, easing: "ease-out" }}
                        spinTiming={{ duration: 400, easing: "ease-out" }}
                        opacityTiming={{ duration: 200, easing: "ease-out" }}
                      />
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="icon"
                    className="border-3 h-11 w-11 rounded-xl border-foreground/60 shadow-[0_3px_0_0_rgba(0,0,0,0.1)] transition-all hover:scale-105 hover:border-foreground active:translate-y-0.5 active:shadow-none sm:h-14 sm:w-14"
                    onClick={() => setReps(reps + 1)}
                    title="Add 1"
                  >
                    <span className="text-sm font-bold sm:text-lg">+1</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="border-3 h-11 w-11 rounded-xl border-foreground/60 shadow-[0_3px_0_0_rgba(0,0,0,0.1)] transition-all hover:scale-105 hover:border-foreground active:translate-y-0.5 active:shadow-none sm:h-14 sm:w-14"
                    onClick={() => setReps(reps + 10)}
                    title="Add 10"
                  >
                    <span className="text-sm font-bold sm:text-lg">+10</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Visual divider */}
            {!isMaxEffort && <div className="border-t-2 border-dashed border-foreground/20"></div>}

            {/* RPE Selector */}
            {!isMaxEffort && <RPESelector value={rpe} onChange={setRPE} />}

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving || !isValid}
              className="border-3 w-full rounded-xl border-foreground/20 shadow-[0_4px_0_0_rgba(0,0,0,0.15)] transition-all hover:translate-y-0.5 hover:shadow-[0_2px_0_0_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none disabled:opacity-50"
              size="lg"
            >
              <Save className="mr-2 h-5 w-5" />
              {saving
                ? "Saving..."
                : mode === "create"
                  ? isMaxEffort
                    ? "Record Max Effort"
                    : "Save Set"
                  : "Update Set"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
