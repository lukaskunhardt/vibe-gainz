import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseInfoContent } from "@/components/movement/exercise-info-content";

export default async function ExerciseInfoPage({
  params,
}: {
  params: Promise<{ category: string; exercise: string }>;
}) {
  const supabase = await createClient();
  const { category, exercise } = await params;

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

  return (
    <ExerciseInfoContent
      category={category as "push" | "pull" | "legs"}
      exerciseId={exercise}
    />
  );
}

