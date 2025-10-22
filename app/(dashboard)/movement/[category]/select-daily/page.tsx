import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DailyExerciseSelectionContent } from "@/components/movement/daily-exercise-selection-content";
import { MovementCategory } from "@/types";

interface PageProps {
  params: Promise<{ category: string }>;
}

export default async function DailyExerciseSelectionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const category = resolvedParams.category as MovementCategory;

  // Validate category
  if (!["push", "pull", "legs"].includes(category)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <DailyExerciseSelectionContent userId={user.id} category={category} />;
}

