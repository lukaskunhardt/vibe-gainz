import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecordingContent } from "@/components/movement/recording-content";

export default async function RecordingPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const supabase = await createClient();
  const { category } = await params;
  const { mode } = await searchParams;

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

  const isMaxEffort = mode === "max-effort";

  return (
    <RecordingContent
      userId={user.id}
      category={category as "push" | "pull" | "legs"}
      isMaxEffort={isMaxEffort}
    />
  );
}

