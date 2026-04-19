"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, Brain, ShieldAlert, HeartPulse, Zap } from "lucide-react";
import type { OrchestratorOutputV5 } from "@/lib/engine/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result: OrchestratorOutputV5;
}

export const FullPlanSheet: React.FC<Props> = ({ isOpen, onClose, result }) => {
  const { metrics, creedaDecision } = result;
  const { readiness, risk, load } = metrics;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-[#0a0a0a] border-t border-white/10 rounded-t-[2.5rem] p-6 sm:p-8 z-[101] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--saffron)]" />
                <h2 className="text-xl font-black text-white tracking-tight uppercase">Scientist Insights</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-8 pb-10">
              {/* 1. Readiness Breakdown */}
              <section>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Readiness Domains</h3>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Neuromuscular" value={readiness.domains.neuromuscular} icon={Zap} color="blue" />
                  <MetricCard label="Metabolic" value={readiness.domains.metabolic} icon={HeartPulse} color="emerald" />
                  <MetricCard label="Mental" value={readiness.domains.mental} icon={Brain} color="amber" />
                  <MetricCard label="Recovery Score" value={readiness.score} icon={Activity} color="saffron" highlight />
                </div>
              </section>

              {/* 2. Risk Factors */}
              <section>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Risk Interaction Model</h3>
                <div className="space-y-3">
                  {risk.interactions.map((interaction, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-xs text-slate-300">{interaction.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (interaction.impact / 40) * 100)}%` }}
                            className={`h-full ${interaction.impact > 25 ? 'bg-red-500' : 'bg-amber-500'}`}
                          />
                        </div>
                        <span className={`text-[10px] font-mono font-bold ${interaction.impact > 25 ? 'text-red-400' : 'text-amber-400'}`}>
                          +{interaction.impact}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 3. Logic Explanation */}
              <section className="p-5 rounded-3xl bg-[var(--chakra-blue)]/10 border border-[var(--chakra-blue)]/20">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-blue-400" />
                  <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Scientific Rationale</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {creedaDecision.explanation.primaryDrivers[0]?.reason || "System logic optimizing for current readiness and risk profiles."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {creedaDecision.explanation.primaryDrivers.map((driver, i) => (
                    <span key={i} className="text-[9px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold uppercase tracking-wider">
                      {driver.factor}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function MetricCard({ label, value, icon: Icon, color, highlight = false }: any) {
  const colorMap: any = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    saffron: "text-[var(--saffron)]",
  };

  return (
    <div className={`p-4 rounded-2xl border ${highlight ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.01] border-white/[0.05]'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3 h-3 ${colorMap[color]}`} />
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black text-white">{value}</span>
        <span className="text-[9px] text-slate-600 font-bold">/100</span>
      </div>
    </div>
  );
}
