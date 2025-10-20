"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, TrendingUp, BookOpen } from "lucide-react";

interface ReadinessContentProps {
  userId: string;
  date: string; // YYYY-MM-DD
}

export function ReadinessContent({ userId, date }: ReadinessContentProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from("readiness")
        .upsert({ user_id: userId, date, score: selected }, { onConflict: "user_id,date" });
      router.replace("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>How do you feel today?</CardTitle>
          <CardDescription>
            How ready to exercise are you? 1 = terrible, no energy. 5 = great, can really push.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="mb-4 space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-muted-foreground">
                <Info className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Why measure readiness?</div>
                <div className="text-sm text-muted-foreground">
                  It’s a quick daily signal of recovery and fatigue so we can tailor volume to how
                  you feel today.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-medium">How it affects training</div>
                <div className="text-sm text-muted-foreground">
                  Low scores pause increases; neutral or high scores allow increases when sets look
                  easy.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Scientific background</div>
                <div className="text-sm text-muted-foreground">
                  Self‑reported readiness correlates with perceived recovery, neuromuscular
                  performance, and HRV; low scores flag accumulated fatigue and higher injury risk.
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
          <Button className="mt-6 w-full" onClick={submit} disabled={!selected || saving}>
            {saving ? "Saving..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
