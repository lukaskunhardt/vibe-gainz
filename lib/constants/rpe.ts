export const RPE_COLORS = {
  GRAY: "#9CA3AF", // gray (other RPE)
  GREEN_6: "#86EFAC", // light green for RPE 6
  GREEN_7: "#22C55E", // medium green for RPE 7
  GREEN_8: "#16A34A", // dark green for RPE 8
  ORANGE_9: "#F59E0B", // orange for RPE 9
  RED_10: "#EF4444", // red for RPE 10
  PURPLE_MAX: "#A855F7", // purple for max effort
} as const;

export function colorForRPE(rpe: number | undefined, isMaxEffort?: boolean): string {
  if (isMaxEffort) return RPE_COLORS.PURPLE_MAX;
  if (typeof rpe !== "number") return RPE_COLORS.GRAY;
  if (rpe === 6) return RPE_COLORS.GREEN_6;
  if (rpe === 7) return RPE_COLORS.GREEN_7;
  if (rpe === 8) return RPE_COLORS.GREEN_8;
  if (rpe === 9) return RPE_COLORS.ORANGE_9;
  if (rpe === 10) return RPE_COLORS.RED_10;
  return RPE_COLORS.GRAY;
}

export const RPE_LEGEND = [
  { label: "RPE 6", color: RPE_COLORS.GREEN_6 },
  { label: "RPE 7", color: RPE_COLORS.GREEN_7 },
  { label: "RPE 8", color: RPE_COLORS.GREEN_8 },
  { label: "RPE 9", color: RPE_COLORS.ORANGE_9 },
  { label: "RPE 10", color: RPE_COLORS.RED_10 },
  { label: "RPE <6", color: RPE_COLORS.GRAY },
  { label: "Max Effort", color: RPE_COLORS.PURPLE_MAX },
];
