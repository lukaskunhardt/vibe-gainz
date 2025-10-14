import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WeeklyReviewContent } from "@/components/weekly-review/weekly-review-content";

export default async function WeeklyReviewPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const supabase = await createClient();
  const { category } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Validate category
  if (!["push", "pull", "legs"].includes(category)) {
    redirect("/dashboard");
  }

  return <WeeklyReviewContent userId={user.id} category={category as "push" | "pull" | "legs"} />;
}

