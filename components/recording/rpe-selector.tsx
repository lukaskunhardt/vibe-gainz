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
  const color = value > 0 ? colorForRPE(value) : "#888";

  return (
    <div className="space-y-3 sm:space-y-4">
      <Label className="text-sm font-bold">Difficulty (RPE)</Label>

      {/* Cartoony slider container */}
      <div className="rounded-2xl border-4 border-foreground/80 bg-muted/40 p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] sm:p-6">
        {/* RPE value display */}
        <div className="mb-4 text-center sm:mb-6">
          <div
            className="inline-block rounded-2xl border-4 px-6 py-3 shadow-[0_3px_0_0_rgba(0,0,0,0.15)] transition-all sm:px-8 sm:py-4"
            style={{
              backgroundColor: color,
              borderColor: color,
            }}
          >
            <div className="text-5xl font-bold text-white sm:text-6xl">{value || "-"}</div>
          </div>
        </div>

        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            min="1"
            max="10"
            value={value || 1}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="rpe-slider w-full"
            style={
              {
                "--slider-color": color,
                "--slider-value": value || 1,
              } as React.CSSProperties
            }
          />

          {/* RPE labels below slider */}
          <div className="mt-2 flex justify-between px-1 text-xs font-bold text-muted-foreground">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      </div>

      {/* Selected RPE description - prominent display */}
      {value > 0 && (
        <div className="border-3 rounded-xl border-foreground/20 bg-muted/60 p-2 text-center sm:p-3">
          <p className="text-xs font-semibold text-foreground sm:text-sm">
            {RPE_DESCRIPTIONS[value]}
          </p>
        </div>
      )}
    </div>
  );
}
