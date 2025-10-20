import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatsContent } from "@/components/stats/stats-content";

export default async function StatsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <StatsContent userId={user.id} />;
}
