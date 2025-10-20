import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReadinessContent } from "@/components/readiness/readiness-content";

export default async function ReadinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  const { data: existing } = await supabase
    .from("readiness")
    .select("id, score")
    .eq("user_id", user.id)
    .eq("date", dateStr)
    .single();

  if (existing) {
    redirect("/dashboard");
  }

  return <ReadinessContent userId={user.id} date={dateStr} />;
}
