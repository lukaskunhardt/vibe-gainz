"use client";

import { Label } from "@/components/ui/label";
import { colorForRPE } from "@/lib/constants/rpe";

interface RPESelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const RPE_DESCRIPTIONS: Record<number, string> = {
  1: "Very Easy - Barely any effort",
  2: "Easy - Light effort",
  3: "Moderate - Some effort",
  4: "Somewhat Hard - Moderate effort",
  5: "Hard - Challenging",
  6: "Very Hard - Could do 4+ more reps",
  7: "Very Hard - Could do 3 more reps",
  8: "Extremely Hard - Could do 2 more reps",
  9: "Near Max - Could do 1 more rep",
  10: "Max Effort - Absolute failure",
};

export function RPESelector({ value, onChange }: RPESelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Rate of Perceived Exertion (RPE)</Label>
      <div className="grid grid-cols-5 gap-2">
        {[...Array(10)].map((_, idx) => {
          const rpeValue = idx + 1;
          const isSelected = value === rpeValue;
          const color = colorForRPE(rpeValue);
          const textOnColor = rpeValue >= 9 ? "text-white" : "text-foreground";
          
          return (
            <button
              key={rpeValue}
              type="button"
              onClick={() => onChange(rpeValue)}
              className={`p-3 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2`}
              style={{
                borderColor: color,
                backgroundColor: isSelected ? color : undefined,
              }}
            >
              <div className={`text-2xl font-bold ${isSelected ? textOnColor : ""}`}>{rpeValue}</div>
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground text-center min-h-[2.5rem]">
        {RPE_DESCRIPTIONS[value]}
      </p>
      <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        <strong>Tip:</strong> For optimal gains with minimal fatigue, aim for RPE 6-8. 
        Training to failure (RPE 10) should be reserved for max effort tests.
      </div>
    </div>
  );
}
