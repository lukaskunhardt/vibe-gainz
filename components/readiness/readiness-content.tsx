"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

interface ReadinessContentProps {
  userId: string;
  date: string; // YYYY-MM-DD
}

export function ReadinessContent({ userId, date }: ReadinessContentProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [bodyWeight, setBodyWeight] = useState<string>("");

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const supabase = createClient();

      // Prepare data for daily_user_stats
      const dailyStatsData: {
        user_id: string;
        date: string;
        readiness_score: number;
        body_weight_kg?: number;
        updated_at: string;
      } = {
        user_id: userId,
        date,
        readiness_score: selected,
        updated_at: new Date().toISOString(),
      };

      // Add body weight if provided
      if (bodyWeight && !isNaN(parseFloat(bodyWeight))) {
        dailyStatsData.body_weight_kg = parseFloat(bodyWeight);
      }

      // Save to daily_user_stats table
      await supabase
        .from("daily_user_stats")
        .upsert(dailyStatsData, { onConflict: "user_id,date" });

      router.replace("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Daily Check-In</CardTitle>
          <CardDescription>
            Track your readiness and optionally log your body weight.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm font-medium">How ready to exercise are you today?</div>
          <p className="mb-4 text-sm text-muted-foreground">
            1 = terrible, no energy. 5 = great, can really push.
          </p>
          <ul className="mb-4 space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-muted-foreground">
                <Info className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Why measure readiness?</div>
                <div className="text-sm text-muted-foreground">
                  It&apos;s a quick daily signal of recovery and fatigue to track how you feel each
                  day.
                </div>
              </div>
            </li>
          </ul>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                variant={selected === n ? "default" : "outline"}
                onClick={() => setSelected(n)}
                disabled={saving}
              >
                {n}
              </Button>
            ))}
          </div>

          {/* Body Weight Input */}
          <div className="mt-6">
            <label htmlFor="body-weight" className="mb-2 block text-sm font-medium">
              Body Weight (optional)
            </label>
            <Input
              id="body-weight"
              type="number"
              step="0.1"
              min="0"
              max="500"
              placeholder="Weight (kg)"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              disabled={saving}
              className="w-full"
            />
          </div>

          <Button className="mt-6 w-full" onClick={submit} disabled={!selected || saving}>
            {saving ? "Saving..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
