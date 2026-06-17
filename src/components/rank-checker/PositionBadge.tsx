"use client";

import { cn } from "@/lib/utils";

interface PositionBadgeProps {
  position: number | null;
  size?: "sm" | "md" | "lg";
}

export default function PositionBadge({
  position,
  size = "md",
}: PositionBadgeProps) {
  if (position === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-slate-100 font-medium text-slate-400",
          size === "sm" && "h-6 w-6 text-xs",
          size === "md" && "h-8 w-8 text-sm",
          size === "lg" && "h-12 w-12 text-base"
        )}
      >
        —
      </span>
    );
  }

  const getColor = (pos: number) => {
    if (pos <= 3) return "bg-emerald-50 text-emerald-700 ring-emerald-500/30";
    if (pos <= 10) return "bg-blue-50 text-blue-700 ring-blue-500/30";
    if (pos <= 20) return "bg-amber-50 text-amber-700 ring-amber-500/30";
    return "bg-red-50 text-red-700 ring-red-500/30";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold ring-1 ring-inset shadow-sm",
        getColor(position),
        size === "sm" && "h-6 w-6 text-xs",
        size === "md" && "h-8 w-8 text-sm",
        size === "lg" && "h-14 w-14 text-xl"
      )}
    >
      {position}
    </span>
  );
}
