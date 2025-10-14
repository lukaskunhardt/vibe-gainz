"use client";

interface RecoveryScoreGaugeProps {
  score: number;
}

export function RecoveryScoreGauge({ score }: RecoveryScoreGaugeProps) {
  // Calculate the stroke dash offset for the circle
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(score, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on score
  const getColor = () => {
    if (score >= 85) return "#22c55e"; // green
    if (score >= 70) return "#84cc16"; // lime
    if (score >= 55) return "#3b82f6"; // blue
    if (score >= 40) return "#eab308"; // yellow
    if (score >= 20) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  const color = getColor();

  return (
    <div className="flex justify-center">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-muted opacity-20"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke={color}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold" style={{ color }}>
              {score}
            </div>
            <div className="text-sm text-muted-foreground">/ 100</div>
          </div>
        </div>
      </div>
    </div>
  );
}

