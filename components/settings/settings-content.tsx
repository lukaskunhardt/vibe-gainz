"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Dumbbell, Trash2, AlertTriangle, BookOpen, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ExerciseRotationManager } from "@/components/settings/exercise-rotation-manager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SettingsContentProps {
  userId: string;
  userEmail: string;
}

export function SettingsContent({ userId, userEmail }: SettingsContentProps) {
  const router = useRouter();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch (err) {
      console.error("Error signing out:", err);
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const handleResetData = async () => {
    setResetting(true);
    try {
      const supabase = createClient();

      // Delete all user data in order (foreign keys)
      await supabase.from("exercise_status").delete().eq("user_id", userId);
      await supabase.from("sets").delete().eq("user_id", userId);
      await supabase.from("movements").delete().eq("user_id", userId);

      toast.success("All data reset successfully");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Failed to reset data. Please try again.");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-lg">{userEmail}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">User ID</label>
            <p className="font-mono text-sm text-muted-foreground">{userId}</p>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Rotation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Exercise Rotation
          </CardTitle>
          <CardDescription>
            Manage which exercises to rotate through for each movement category. The app will
            automatically cycle through your selected exercises each day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExerciseRotationManager userId={userId} />
        </CardContent>
      </Card>

      {/* Training Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Training Guide
          </CardTitle>
          <CardDescription>Review the principles and methodology behind Vibe Gainz</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/onboarding">
            <Button className="w-full sm:w-auto">
              <BookOpen className="mr-2 h-4 w-4" />
              View Training Guide
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            About Vibe Gainz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vibe Gainz is a high-volume calisthenics tracker designed to help you maximize muscle
            growth through intelligent volume progression and recovery monitoring.
          </p>
          <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
            <h4 className="font-semibold">Key Features:</h4>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Automated daily target calculation (80% of max effort)</li>
              <li>Weekly recovery score assessment</li>
              <li>Smart volume adjustments based on performance</li>
              <li>Exercise progression tracking</li>
              <li>RPE-based training guidance</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Account Actions
          </CardTitle>
          <CardDescription>Sign out of your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? "Signing out..." : "Sign Out"}
          </Button>
        </CardContent>
      </Card>

      {/* Training Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Training Methodology</CardTitle>
          <CardDescription>Based on Kyle Bogemans&apos; high-volume approach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="mb-1 font-semibold">Volume Progression</h4>
            <p className="text-muted-foreground">
              Start at 80% of your max effort and gradually increase volume based on weekly recovery
              scores. This allows for sustainable long-term progress without excessive fatigue.
            </p>
          </div>
          <div>
            <h4 className="mb-1 font-semibold">RPE Management</h4>
            <p className="text-muted-foreground">
              Train most sets at RPE 6-8 to maximize stimulus while minimizing fatigue. Reserve RPE
              10 (failure) for max effort tests only.
            </p>
          </div>
          <div>
            <h4 className="mb-1 font-semibold">Recovery Monitoring</h4>
            <p className="text-muted-foreground">
              Weekly assessments track first set performance, RPE efficiency, target achievement,
              and consistency to determine optimal volume adjustments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions - proceed with caution</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowResetDialog(true)}
            className="w-full sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Reset All Data
          </Button>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset All Data?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your movements, sets, and weekly reviews. You&apos;ll
              be redirected to the dashboard to start fresh. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetData} disabled={resetting}>
              {resetting ? "Resetting..." : "Yes, Reset Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
