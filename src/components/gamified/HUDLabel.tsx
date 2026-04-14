"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface HUDLabelProps {
  index: string | number;
  label: string;
  className?: string;
  accent?: "saffron" | "chakra" | "emerald" | "red" | "blue";
}

export const HUDLabel: React.FC<HUDLabelProps> = ({
  index,
  label,
  className,
  accent = "saffron",
}) => {
  const accentStyles = {
    saffron: "text-[var(--saffron)]",
    chakra: "text-[var(--chakra-neon)]",
    blue: "text-[var(--chakra-neon)]",
    emerald: "text-emerald-500",
    red: "text-red-500",
  };

  const formattedIndex = typeof index === "number" ? index.toString().padStart(2, '0') : index;

  return (
    <div className={cn("flex items-center gap-3 group", className)}>
      <span className={cn(
        "text-[10px] font-black tracking-[0.3em]",
        accentStyles[accent],
        "opacity-80 group-hover:opacity-100 transition-opacity"
      )}>
        {formattedIndex}
      </span>
      <span className="h-[1px] w-6 bg-white/[0.08] group-hover:w-10 group-hover:bg-[var(--saffron)]/30 transition-all" />
      <span className="text-[11px] uppercase font-bold text-white/50 tracking-widest group-hover:text-white/80 transition-colors">
        {label}
      </span>
    </div>
  );
};
