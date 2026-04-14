"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Shield, HeartPulse, AlertTriangle } from "lucide-react";
import type { CreedaDecision } from "@/lib/engine/types";

interface Props {
  decision: CreedaDecision;
}

const DECISION_CONFIG = {
  TRAIN: {
    label: "TRAIN",
    sublabel: "You can push today",
    gradient: "from-[#00E5FF] to-[#0055FF]",
    bg: "bg-[#00E5FF]/8",
    border: "border-[#00E5FF]/20",
    glow: "shadow-[0_0_80px_rgba(0,229,255,0.12)]",
    textColor: "text-[#00E5FF]",
    icon: Zap,
    pulse: "bg-[#00E5FF]",
    watermark: "शक्ति",
  },
  MODIFY: {
    label: "MODIFY",
    sublabel: "Train, but keep it controlled",
    gradient: "from-[#FF5F1F] to-[#FF8C5A]",
    bg: "bg-[#FF5F1F]/8",
    border: "border-[#FF5F1F]/20",
    glow: "shadow-[0_0_80px_rgba(255,95,31,0.12)]",
    textColor: "text-[#FF5F1F]",
    icon: Shield,
    pulse: "bg-[#FF5F1F]",
    watermark: "योद्धा",
  },
  RECOVER: {
    label: "RECOVER",
    sublabel: "Recovery should lead today",
    gradient: "from-[#ef4444] to-[#f43f5e]",
    bg: "bg-red-500/8",
    border: "border-red-500/20",
    glow: "shadow-[0_0_80px_rgba(239,68,68,0.12)]",
    textColor: "text-red-400",
    icon: HeartPulse,
    pulse: "bg-red-500",
    watermark: "विश्राम",
  },
};

export const HeroDecision: React.FC<Props> = ({ decision }) => {
  const config = DECISION_CONFIG[decision.decision];
  const trustSummary = decision.trustSummary ?? {
    dataQuality: decision.dataCompleteness >= 80 ? 'COMPLETE' : decision.dataCompleteness >= 50 ? 'PARTIAL' : 'WEAK',
    whyTodayChanged: [],
  };

  // Primary explanation (1 line)
  const primaryExplanation = decision.explanation.primaryDrivers[0]?.reason || decision.sessionType;
  const shortExplanation = primaryExplanation.length > 100
    ? primaryExplanation.substring(0, 97) + '...'
    : primaryExplanation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-[2.5rem] bg-[#111118] border ${config.border} ${config.glow} p-7 sm:p-10 backdrop-blur-md`}
    >
      {/* Background neon aura blob */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-[-40%] right-[-20%] w-[500px] h-[500px] rounded-full bg-gradient-to-br ${config.gradient} blur-[120px] opacity-[0.06]`} />
      </div>

      {/* Devanagari watermark */}
      <div className="absolute bottom-[-20px] right-4 text-8xl font-black text-white/[0.015] select-none pointer-events-none font-hindi">
        {config.watermark}
      </div>

      <div className="relative z-10">
        {/* Status indicator + Confidence Badge */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${config.pulse} animate-pulse`} style={{ boxShadow: '0 0 10px currentColor' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              Today&apos;s call
            </span>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <div className={`px-2 py-1 rounded-md text-[9px] font-black tracking-widest border transition-all ${
              decision.confidenceLevel === 'HIGH' ? 'bg-[#00E5FF]/10 border-[#00E5FF]/20 text-[#00E5FF]' :
              decision.confidenceLevel === 'MEDIUM' ? 'bg-[#FF5F1F]/10 border-[#FF5F1F]/20 text-[#FF5F1F]' :
              'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
            }`}>
              {decision.confidenceLevel} CONFIDENCE
            </div>
            {decision.confidenceReasons && decision.confidenceReasons.length > 0 && (
              <span className="text-[8px] text-white/25 uppercase tracking-tighter max-w-[120px] text-right leading-tight">
                {decision.confidenceReasons.slice(0, 2).join(' • ')}
              </span>
            )}
          </div>
        </div>

        {/* BIG DECISION */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 mb-6">
          <h1
            className={`text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-b ${config.gradient} bg-clip-text text-transparent`}
            style={{ lineHeight: 0.85 }}
          >
            {config.label}
          </h1>
          <div className="flex flex-col mb-1 sm:ml-2">
            <span className={`text-xs font-bold uppercase tracking-widest ${config.textColor} opacity-80`}>
              {config.sublabel}
            </span>
          </div>
        </div>

        {/* 1-line explanation */}
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
          {shortExplanation}
        </p>

        {trustSummary.whyTodayChanged[0] && (
          <p className="mt-3 text-xs text-white/30 leading-relaxed max-w-2xl">
            {trustSummary.whyTodayChanged[0]}
          </p>
        )}

        {/* Dominant factor badge + intensity */}
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${config.bg} border ${config.border}`}>
            <AlertTriangle className={`w-3 h-3 ${config.textColor}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${config.textColor}`}>
              {decision.decisionContext.dominantFactor}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Intensity: {decision.intensity}%
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {decision.duration} min
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Data: {trustSummary.dataQuality}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
