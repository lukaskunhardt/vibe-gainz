import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Dumbbell, TrendingUp, Target, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Dumbbell className="h-6 w-6" />
            <span>Vibe Gainz</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              High-Volume Calisthenics
              <br />
              <span className="text-primary">Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Track your push, pull, and leg movements with intelligent volume progression and
              recovery monitoring. Build muscle with bodyweight training.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/sign-up">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started Free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16 text-left">
            <div className="space-y-3">
              <div className="flex items-center justify-center md:justify-start">
                <div className="rounded-full bg-primary/10 p-3">
                  <Target className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Smart Targets</h3>
              <p className="text-muted-foreground">
                Automatically calculate daily rep targets at 80% of your max effort, with weekly
                adjustments based on recovery.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center md:justify-start">
                <div className="rounded-full bg-primary/10 p-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Progressive Overload</h3>
              <p className="text-muted-foreground">
                Track your progress from beginner variations to advanced movements with automatic
                progression triggers.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center md:justify-start">
                <div className="rounded-full bg-primary/10 p-3">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Recovery Insights</h3>
              <p className="text-muted-foreground">
                Weekly recovery scores analyze your performance, RPE efficiency, and consistency to
                optimize volume.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with Next.js, Supabase, and Tailwind CSS</p>
        </div>
      </footer>
    </main>
  );
}
