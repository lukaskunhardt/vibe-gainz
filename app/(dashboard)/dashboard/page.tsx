import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Gate: ask daily readiness before showing dashboard
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  const { data: dailyStats } = await supabase
    .from("daily_user_stats")
    .select("readiness_score")
    .eq("user_id", user.id)
    .eq("date", dateStr)
    .maybeSingle();

  if (!dailyStats || dailyStats.readiness_score === null) {
    redirect("/readiness");
  }

  return <DashboardContent userId={user.id} />;
}
