"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StreakFlameProps {
  intensity?: number; // 0 to 1
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StreakFlame: React.FC<StreakFlameProps> = ({
  intensity = 0.5,
  size = "md",
  className,
}) => {
  const sizeMap = {
    sm: { container: "w-8 h-10", flame: "w-6 h-8" },
    md: { container: "w-12 h-16", flame: "w-9 h-13" },
    lg: { container: "w-16 h-20", flame: "w-12 h-16" },
  };

  const dims = sizeMap[size];
  const glowOpacity = 0.2 + intensity * 0.6;
  const glowSpread = 10 + intensity * 30;

  return (
    <div
      className={cn("relative flex items-end justify-center", dims.container, className)}
      title={`Streak intensity: ${Math.round(intensity * 100)}%`}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(255,95,31,${glowOpacity}) 0%, transparent 70%)`,
          transform: `scale(${0.8 + intensity * 0.4})`,
        }}
      />

      {/* Flame body */}
      <div
        className={cn(
          "relative rounded-t-full animate-[streak-burn_1.5s_ease-in-out_infinite]",
          dims.flame
        )}
        style={{
          background: `linear-gradient(to top, #FF5F1F ${Math.round(intensity * 40)}%, #FF8C5A ${Math.round(40 + intensity * 30)}%, #FCD34D 100%)`,
          filter: `drop-shadow(0 0 ${glowSpread}px rgba(255,95,31,${glowOpacity}))`,
          clipPath: "ellipse(50% 60% at 50% 60%)",
        }}
      >
        {/* Inner bright core */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 rounded-t-full"
          style={{
            background: "linear-gradient(to top, #FFFFFF 0%, #FCD34D 50%, transparent 100%)",
            opacity: 0.3 + intensity * 0.5,
          }}
        />
      </div>
    </div>
  );
};
