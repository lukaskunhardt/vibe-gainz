import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MovementSelectionContent } from "@/components/movement/movement-selection-content";

export default async function MovementSelectPage({
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

  return <MovementSelectionContent userId={user.id} category={category as "push" | "pull" | "legs"} />;
}

