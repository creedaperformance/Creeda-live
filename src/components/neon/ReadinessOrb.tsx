"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Activity, ShieldAlert } from "lucide-react";

interface ReadinessOrbProps {
  score: number;
  status?: string;
  isLoading?: boolean;
}

export const ReadinessOrb: React.FC<ReadinessOrbProps> = ({
  score,
  status = "Syncing",
  isLoading = false,
}) => {
  const tier = useMemo(() => {
    if (score >= 80) return "high";
    if (score >= 60) return "mid";
    return "low";
  }, [score]);

  const orbGradient = useMemo(() => {
    switch (tier) {
      case "high":
        return "radial-gradient(circle at 35% 35%, #00E5FF 0%, #0055FF 50%, #111118 100%)";
      case "mid":
        return "radial-gradient(circle at 35% 35%, #FF8C5A 0%, #FF5F1F 50%, #111118 100%)";
      case "low":
        return "radial-gradient(circle at 35% 35%, #EF4444 0%, #991B1B 50%, #111118 100%)";
    }
  }, [tier]);

  const glowColor = useMemo(() => {
    switch (tier) {
      case "high": return "rgba(0, 229, 255, 0.3)";
      case "mid": return "rgba(255, 95, 31, 0.3)";
      case "low": return "rgba(239, 68, 68, 0.3)";
    }
  }, [tier]);

  const StatusIcon = tier === "high" ? Zap : tier === "mid" ? Activity : ShieldAlert;
  const statusColorClass = tier === "high" ? "text-[#00E5FF]" : tier === "mid" ? "text-[#FF5F1F]" : "text-red-400";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="h-48 w-48 rounded-full animate-pulse"
          style={{
            background: "radial-gradient(circle at 35% 35%, rgba(255,95,31,0.2) 0%, #111118 100%)",
            boxShadow: "0 0 60px rgba(255,95,31,0.15)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
        className="relative"
      >
        {/* Outer glow ring */}
        <div
          className="absolute inset-[-16px] rounded-full opacity-40"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          }}
        />

        {/* The Orb */}
        <motion.div
          animate={{
            scale: [1, 1.03, 1],
            boxShadow: [
              `0 0 50px ${glowColor}, 0 0 100px ${glowColor.replace("0.3", "0.1")}`,
              `0 0 70px ${glowColor}, 0 0 140px ${glowColor.replace("0.3", "0.15")}`,
              `0 0 50px ${glowColor}, 0 0 100px ${glowColor.replace("0.3", "0.1")}`,
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-52 w-52 rounded-full flex flex-col items-center justify-center"
          style={{ background: orbGradient }}
        >
          {/* Glass highlight */}
          <div
            className="absolute top-3 left-6 w-20 h-12 rounded-full opacity-20"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)",
            }}
          />

          {/* Score display */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-1">
              <StatusIcon className={`h-3.5 w-3.5 ${statusColorClass}`} />
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-[0.2em]">
                Readiness
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="text-5xl font-black text-white tracking-tight">{score}</span>
              <span className="text-lg text-white/40 ml-0.5">%</span>
            </div>
            <div className="mt-2 px-3 py-1 rounded-full bg-black/30 border border-white/10">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/60">
                {status}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
