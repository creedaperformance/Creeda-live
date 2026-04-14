"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonNeonProps {
  className?: string;
  lines?: number;
}

export const SkeletonNeon: React.FC<SkeletonNeonProps> = ({
  className,
  lines = 3,
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-xl bg-[#111118] skeleton-neon"
          style={{
            width: i === lines - 1 ? "60%" : "100%",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
};

export const SkeletonNeonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/[0.06] bg-[#111118] p-6 space-y-4",
        className
      )}
    >
      <div className="h-3 w-24 rounded-full skeleton-neon" />
      <div className="h-8 w-32 rounded-xl skeleton-neon" style={{ animationDelay: "0.1s" }} />
      <div className="h-3 w-full rounded-full skeleton-neon" style={{ animationDelay: "0.2s" }} />
      <div className="h-3 w-3/4 rounded-full skeleton-neon" style={{ animationDelay: "0.3s" }} />
    </div>
  );
};
