"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GamifiedProgressBarProps {
  current?: number;
  total?: number;
  progress?: number;
  showGlow?: boolean;
  className?: string;
  showLabels?: boolean;
}

export const GamifiedProgressBar: React.FC<GamifiedProgressBarProps> = ({
  current,
  total,
  progress: manualProgress,
  showGlow = false,
  className,
  showLabels = false,
}) => {
  const progressValue = manualProgress !== undefined 
    ? manualProgress 
    : (current && total ? Math.round((current / total) * 100) : 0);

  return (
    <div className={cn("w-full flex flex-col gap-4", className)}>
      {showLabels && (
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] uppercase font-black tracking-[0.24em] text-[var(--saffron)]/80">
            Sync Status
          </span>
          <span className="text-sm font-black text-white">
            {progressValue}%
          </span>
        </div>
      )}
      
      <div className="relative h-2 w-full bg-white/[0.06] rounded-full overflow-hidden border border-white/[0.04]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressValue}%` }}
          className={cn(
            "h-full bg-gradient-to-r from-[var(--saffron)] to-[var(--chakra-neon)] transition-all duration-700 rounded-full",
            showGlow && "shadow-[0_0_15px_var(--saffron-glow)]"
          )}
        />
      </div>
    </div>
  );
};
