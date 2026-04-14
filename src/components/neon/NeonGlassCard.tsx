"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NeonGlassCardProps {
  children: React.ReactNode;
  className?: string;
  auraColor?: "saffron" | "chakra";
  watermark?: string;
  hover?: boolean;
}

export const NeonGlassCard: React.FC<NeonGlassCardProps> = ({
  children,
  className,
  auraColor = "chakra",
  watermark,
  hover = true,
}) => {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "group relative rounded-3xl bg-[#111118] p-6 overflow-hidden",
        "border border-white/[0.06] backdrop-blur-md transition-all",
        className
      )}
    >
      {/* Background Aura — activates on hover */}
      <div
        className={cn(
          "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none",
          auraColor === "chakra" ? "bg-[#00E5FF]" : "bg-[#FF5F1F]"
        )}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Desi Devanagari watermark */}
      {watermark && (
        <div className="absolute bottom-[-10px] right-2 text-6xl font-bold text-white/[0.02] select-none pointer-events-none font-hindi">
          {watermark}
        </div>
      )}
    </motion.div>
  );
};

/* ── Convenience: Metric variant ── */
interface NeonMetricCardProps {
  title: string;
  value: string;
  label?: string;
  auraColor?: "saffron" | "chakra";
}

export const NeonMetricCard: React.FC<NeonMetricCardProps> = ({
  title,
  value,
  label,
  auraColor = "chakra",
}) => {
  return (
    <NeonGlassCard auraColor={auraColor} watermark={title === "Readiness" ? "प्राण" : "क्रीडा"}>
      <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
        {title}
      </span>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-3xl font-black text-white">{value}</span>
        {label && (
          <span
            className={cn(
              "text-sm font-medium",
              auraColor === "chakra" ? "text-[#00E5FF]" : "text-[#FF5F1F]"
            )}
          >
            {label}
          </span>
        )}
      </div>
    </NeonGlassCard>
  );
};
