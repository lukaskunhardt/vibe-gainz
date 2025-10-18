import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { HeaderRight } from "@/components/dashboard/header-right";
import { DateNav } from "@/components/dashboard/date-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Ensure user profile exists
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // Create profile if it doesn't exist
  if (!profile) {
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email || "",
    });
  }

  // Note: Sign-out handled in client via HeaderRight

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div
          id="header-grid"
          className="container mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-4"
        >
          <Link
            id="header-brand"
            href="/dashboard"
            className="flex items-center gap-2 justify-self-start text-xl font-bold"
          >
            <Dumbbell className="h-6 w-6" />
            <span>Vibe Gainz</span>
          </Link>

          {/* Center-aligned compact date navigator (dashboard only) */}
          <div id="header-date" className="justify-self-center">
            <DateNav id="header-date-inner" />
          </div>

          {/* Right side: responsive nav that collapses when space is insufficient */}
          <div className="justify-self-end">
            <HeaderRight />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
