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
      <Label className="text-sm font-bold">Difficulty (RPE)</Label>
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
              className={`border-3 group relative rounded-xl p-3 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isSelected
                  ? "scale-105 shadow-[0_3px_0_0_rgba(0,0,0,0.15)]"
                  : "border-foreground/30 hover:scale-105 hover:border-foreground/50"
              }`}
              style={{
                backgroundColor: isSelected ? color : undefined,
                borderColor: isSelected ? color : undefined,
              }}
            >
              {/* Hover background overlay */}
              {!isSelected && (
                <div
                  className="absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ backgroundColor: color }}
                />
              )}

              <div
                className={`relative z-10 text-2xl font-bold transition-colors ${isSelected ? textOnColor : "group-hover:text-white"}`}
              >
                {rpeValue}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected RPE description - prominent display */}
      {value > 0 && (
        <div className="border-3 rounded-xl border-foreground/20 bg-muted/60 p-3 text-center">
          <p className="text-sm font-semibold text-foreground">{RPE_DESCRIPTIONS[value]}</p>
        </div>
      )}

      {/* Tip box with cartoony styling */}
      <div className="border-3 rounded-xl border-foreground/20 bg-muted/40 p-3 shadow-[0_2px_0_0_rgba(0,0,0,0.05)]">
        <p className="text-xs text-muted-foreground">
          <strong className="font-bold">Tip:</strong> For optimal gains with minimal fatigue, aim
          for RPE 6-8. Training to failure (RPE 10) should be reserved for max effort tests.
        </p>
      </div>
    </div>
  );
}
