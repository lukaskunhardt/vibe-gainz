"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dumbbell,
  TrendingUp,
  Target,
  ArrowRight,
  ArrowLeft,
  Gauge,
  Activity,
  Calendar,
} from "lucide-react";
import { colorForRPE } from "@/lib/constants/rpe";

type OnboardingStep =
  | "welcome"
  | "volume-targets"
  | "rpe-quality"
  | "fatigue-stimulus"
  | "recovery-progression"
  | "get-started";

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("welcome");

  const steps: OnboardingStep[] = [
    "welcome",
    "volume-targets",
    "rpe-quality",
    "fatigue-stimulus",
    "recovery-progression",
    "get-started",
  ];
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    } else {
      router.push("/dashboard");
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <div className="mb-4">
          <Progress value={progress} className="w-full" />
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {currentStepIndex + 1} of {steps.length}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {step === "welcome" && <WelcomeScreen />}
        {step === "volume-targets" && <VolumeTargetsScreen />}
        {step === "rpe-quality" && <RPEQualityScreen />}
        {step === "fatigue-stimulus" && <FatigueStimulusScreen />}
        {step === "recovery-progression" && <RecoveryProgressionScreen />}
        {step === "get-started" && <GetStartedScreen />}

        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <Button variant="outline" onClick={handlePrevious} disabled={currentStepIndex === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
            Skip to Dashboard
          </Button>
          <Button onClick={handleNext}>
            {currentStepIndex === steps.length - 1 ? "Get Started" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WelcomeScreen() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Dumbbell className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="mb-2 text-3xl">Welcome to Vibe Gainz!</CardTitle>
        <CardDescription className="text-base">
          High-volume calisthenics training tracker with intelligent progression
        </CardDescription>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Target className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
          <div>
            <h3 className="font-semibold">Automated Volume Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Set daily targets and track your progress across push, pull, and leg movements
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <TrendingUp className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
          <div>
            <h3 className="font-semibold">Smart Progression</h3>
            <p className="text-sm text-muted-foreground">
              Weekly recovery scores guide your volume adjustments for optimal gains
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Activity className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
          <div>
            <h3 className="font-semibold">Sustainable Training</h3>
            <p className="text-sm text-muted-foreground">
              Balance volume and recovery for long-term, consistent progress
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-muted p-4">
        <h4 className="mb-2 font-semibold">Let&apos;s learn how it works!</h4>
        <p className="text-sm text-muted-foreground">
          This quick guide will teach you the principles behind Vibe Gainz and how to use the app
          effectively.
        </p>
      </div>
    </div>
  );
}

function VolumeTargetsScreen() {
  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="mb-2 text-2xl">Volume Targets & Max Effort Tests</CardTitle>
        <CardDescription>Understanding how your daily targets are calculated</CardDescription>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <Target className="h-5 w-5 text-primary" />
            Max Effort Test
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Before starting any movement category, you&apos;ll perform a max effort test - this
            means doing as many reps as you can until complete failure (RPE 10).
          </p>
          <div className="rounded bg-primary/10 p-3 text-sm">
            <p className="font-medium">Example: You do 50 push-ups to failure</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 font-semibold">Daily Target Calculation</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Your daily target is automatically set to <strong>80% of your max effort</strong>. This
            creates a sustainable baseline that you can hit consistently.
          </p>
          <div className="rounded bg-primary/10 p-3">
            <p className="mb-2 text-sm font-medium">Example Calculation:</p>
            <p className="text-sm">Max effort: 50 reps</p>
            <p className="text-sm">
              Daily target: 50 × 0.80 = <strong className="text-primary">40 reps</strong>
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Progressive Overload
          </h3>
          <p className="text-sm text-muted-foreground">
            Each week, you&apos;ll aim to add <strong>5-10 reps</strong> to your daily target based
            on your recovery score. This gradual increase ensures steady, sustainable progress.
          </p>
        </div>
      </div>
    </div>
  );
}

function RPEQualityScreen() {
  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="mb-2 text-2xl">RPE & Set Quality</CardTitle>
        <CardDescription>
          The importance of effort management and first set performance
        </CardDescription>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Gauge className="h-5 w-5 text-primary" />
            RPE Scale (Rate of Perceived Exertion)
          </h3>
          <RPEGauge />
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 font-semibold">First Set is Most Important</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Your first set of the day should be high quality - aim for <strong>RPE 8-9</strong>{" "}
            (close to failure, but not quite). This set provides the most growth stimulus.
          </p>
          <div className="rounded border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              ✓ Good: First set at RPE 8-9, near failure but controlled
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 font-semibold">
            Avoid Training to Failure (Except Max Effort Tests)
          </h3>
          <p className="text-sm text-muted-foreground">
            Training to failure (RPE 10) causes excessive fatigue with only marginal increases in
            growth stimulus. Reserve RPE 10 for max effort tests only. For daily training, keep most
            sets at <strong>RPE 6-8</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

function RPEGauge() {
  // Uses app-wide RPE color mapping for consistency

  const rpeData = [
    { value: 1, label: "Very Easy" },
    { value: 2, label: "Easy" },
    { value: 3, label: "Moderate" },
    { value: 4, label: "Somewhat Hard" },
    { value: 5, label: "Hard" },
    { value: 6, label: "Hard+" },
    { value: 7, label: "Very Hard" },
    { value: 8, label: "Very Hard+" },
    { value: 9, label: "Near Failure" },
    { value: 10, label: "Complete Failure" },
  ];

  return (
    <div className="space-y-2">
      {rpeData.map((rpe) => {
        const bg = colorForRPE(rpe.value);
        const text = rpe.value >= 9 ? "text-white" : "text-foreground";
        return (
          <div key={rpe.value} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-12 items-center justify-center rounded font-bold ${text}`}
              style={{ backgroundColor: bg }}
            >
              {rpe.value}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{rpe.label}</p>
              {rpe.value === 8 && (
                <p className="text-xs text-muted-foreground">Target for first set</p>
              )}
              {rpe.value === 10 && (
                <p className="text-xs text-muted-foreground">Max effort tests only</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FatigueStimulusScreen() {
  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="mb-2 text-2xl">Fatigue vs. Growth Stimulus</CardTitle>
        <CardDescription>Understanding diminishing returns of additional sets</CardDescription>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 font-semibold">Set Quality Over Quantity</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Each subsequent set you perform in a day has increasingly more fatigue relative to the
            growth stimulus it provides. This is why set quality matters more than total set count.
          </p>
          <FatigueStimulusGraph />
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 font-semibold">Key Takeaways</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <span>
                <strong>Set 1:</strong> Fresh, high quality, maximum stimulus - aim for RPE 8-9
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <span>
                <strong>Sets 2-4:</strong> Good stimulus but accumulating fatigue - RPE 6-8
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <span>
                <strong>Sets 5+:</strong> More fatigue than stimulus - keep RPE moderate (6-7)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <span>
                Focus on making high-quality sets rather than pushing every set to failure
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function FatigueStimulusGraph() {
  return (
    <div className="relative h-64 rounded-lg bg-muted p-4">
      <svg width="100%" height="100%" viewBox="0 0 400 200" className="overflow-visible">
        {/* Axes */}
        <line
          x1="40"
          y1="180"
          x2="360"
          y2="180"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />
        <line
          x1="40"
          y1="20"
          x2="40"
          y2="180"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />

        {/* Y-axis labels */}
        <text x="10" y="25" fontSize="10" fill="currentColor" opacity="0.6">
          High
        </text>
        <text x="10" y="105" fontSize="10" fill="currentColor" opacity="0.6">
          Med
        </text>
        <text x="10" y="185" fontSize="10" fill="currentColor" opacity="0.6">
          Low
        </text>

        {/* X-axis labels */}
        <text x="70" y="195" fontSize="10" fill="currentColor" opacity="0.6">
          Set 1
        </text>
        <text x="150" y="195" fontSize="10" fill="currentColor" opacity="0.6">
          Set 2
        </text>
        <text x="230" y="195" fontSize="10" fill="currentColor" opacity="0.6">
          Set 3
        </text>
        <text x="310" y="195" fontSize="10" fill="currentColor" opacity="0.6">
          Set 4+
        </text>

        {/* Growth Stimulus line (decreasing) */}
        <polyline
          points="40,40 80,60 160,90 240,130 320,160"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Fatigue line (increasing) */}
        <polyline
          points="40,160 80,140 160,110 240,70 320,40"
          fill="none"
          stroke="hsl(var(--destructive))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5,5"
        />

        {/* Legend */}
        <g transform="translate(50, 10)">
          <line x1="0" y1="0" x2="30" y2="0" stroke="hsl(var(--primary))" strokeWidth="3" />
          <text x="35" y="5" fontSize="12" fill="currentColor">
            Growth Stimulus
          </text>

          <line
            x1="180"
            y1="0"
            x2="210"
            y2="0"
            stroke="hsl(var(--destructive))"
            strokeWidth="3"
            strokeDasharray="5,5"
          />
          <text x="215" y="5" fontSize="12" fill="currentColor">
            Fatigue
          </text>
        </g>
      </svg>
    </div>
  );
}

function RecoveryProgressionScreen() {
  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="mb-2 text-2xl">Recovery-Based Progression</CardTitle>
        <CardDescription>How Vibe Gainz adjusts your volume for sustainable growth</CardDescription>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <Calendar className="h-5 w-5 text-primary" />
            Weekly Recovery Assessment
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Every Monday, you&apos;ll review the previous week&apos;s performance. The app
            calculates a recovery score (0-100) based on four factors:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-20 text-muted-foreground">40 points</div>
              <div className="flex-1">First Set Performance (vs. max effort baseline)</div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-20 text-muted-foreground">30 points</div>
              <div className="flex-1">RPE Efficiency (quality over quantity)</div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-20 text-muted-foreground">20 points</div>
              <div className="flex-1">Target Achievement (daily volume)</div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-20 text-muted-foreground">10 points</div>
              <div className="flex-1">Consistency (training frequency)</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 font-semibold">Smart Volume Adjustments</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-20 flex-shrink-0 items-center justify-center rounded border border-green-500 bg-green-500/20 text-sm font-bold">
                80-100
              </div>
              <div className="text-sm">
                <p className="font-medium">Excellent Recovery</p>
                <p className="text-muted-foreground">Add 10 reps next week</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-20 flex-shrink-0 items-center justify-center rounded border border-yellow-500 bg-yellow-500/20 text-sm font-bold">
                60-79
              </div>
              <div className="text-sm">
                <p className="font-medium">Good Recovery</p>
                <p className="text-muted-foreground">Add 5 reps next week</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-20 flex-shrink-0 items-center justify-center rounded border border-orange-500 bg-orange-500/20 text-sm font-bold">
                40-59
              </div>
              <div className="text-sm">
                <p className="font-medium">Moderate Recovery</p>
                <p className="text-muted-foreground">Keep same volume</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-20 flex-shrink-0 items-center justify-center rounded border border-red-500 bg-red-500/20 text-sm font-bold">
                0-39
              </div>
              <div className="text-sm">
                <p className="font-medium">Poor Recovery</p>
                <p className="text-muted-foreground">Reduce 5 reps to recover</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
          <p className="text-sm font-medium">
            This recovery-based approach ensures you&apos;re always training at the right volume -
            challenging enough for growth, but sustainable for long-term progress.
          </p>
        </div>
      </div>
    </div>
  );
}

function GetStartedScreen() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-500 bg-green-500/10">
          <Dumbbell className="h-10 w-10 text-green-500" />
        </div>
        <CardTitle className="mb-2 text-3xl">You&apos;re Ready!</CardTitle>
        <CardDescription className="text-base">Time to start your training journey</CardDescription>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 font-semibold">Next Steps</h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">1.</span>
              <span>
                Go to your dashboard and choose a movement category to unlock (Push, Pull, or Legs)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">2.</span>
              <span>Select an exercise variation for that category</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">3.</span>
              <span>Perform your max effort test (go to complete failure)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">4.</span>
              <span>Start hitting your daily target and logging your sets!</span>
            </li>
          </ol>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <h4 className="mb-2 flex items-center gap-2 font-semibold">
            <Target className="h-5 w-5" />
            Remember the Core Principles
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• First set is most important - make it high quality</li>
            <li>• Train at RPE 6-8, save RPE 10 for max effort tests</li>
            <li>• Hit your daily target consistently</li>
            <li>• Complete weekly reviews to adjust your volume</li>
            <li>• Focus on sustainable, long-term progress</li>
          </ul>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center">
          <p className="text-sm font-medium text-primary">
            You can always review this guide from Settings → View Training Guide
          </p>
        </div>
      </div>
    </div>
  );
}
