"use client";

import { useRouter } from "next/navigation";
import { MaxEffortPrompt } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, X } from "lucide-react";

interface MaxEffortPromptModalProps {
  prompt: MaxEffortPrompt;
  onDismiss: () => void;
  onComplete: () => void;
}

export function MaxEffortPromptModal({ prompt, onDismiss, onComplete }: MaxEffortPromptModalProps) {
  const router = useRouter();

  const handleTakeTest = () => {
    router.push(`/movement/${prompt.category}/record?mode=max-effort`);
    onComplete();
  };

  const categoryName = prompt.category.charAt(0).toUpperCase() + prompt.category.slice(1);

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
            <Trophy className="h-8 w-8 text-yellow-500" />
          </div>
          <DialogTitle className="text-center text-2xl">Max Effort Test Available!</DialogTitle>
          <DialogDescription className="text-center">
            It's time to test your {categoryName} progression
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="mb-2">You're ready for a new max effort test because:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>It's been 7+ days since your last test</li>
              <li>OR your recent performance suggests you've gotten stronger</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={onDismiss} className="w-full">
              <X className="mr-2 h-4 w-4" />
              Remind Later
            </Button>
            <Button onClick={handleTakeTest} className="w-full">
              <Trophy className="mr-2 h-4 w-4" />
              Take Test
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

