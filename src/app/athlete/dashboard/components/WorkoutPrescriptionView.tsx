"use client";

import React from "react";
import type { GeneratedExercise, WorkoutPlan } from "@/lib/engine/Prescription/WorkoutGenerator";
import type { CreedaDecision } from "@/lib/engine/types";
import { Info, Timer } from "lucide-react";

interface Props {
  plan: WorkoutPlan | null;
  athleteFocus?: CreedaDecision["components"]["training"]["athleteFocus"];
  sessionProtocol?: CreedaDecision["components"]["training"]["sessionProtocol"];
}

export const WorkoutPrescriptionView: React.FC<Props> = ({
  plan,
  athleteFocus,
  sessionProtocol,
}) => {
  if (!plan) return <div className="text-slate-500 text-xs italic">No workout plan generated.</div>;

  const resolvedAthleteFocus = athleteFocus || plan.athleteFocus || null;
  const resolvedSessionProtocol = sessionProtocol || plan.protocols || null;

  const sections = [
    { label: "Warmup & Activation", items: plan.warmup.filter((item) => item.source !== "sport_drill") },
    { label: "Main Structural Block", items: plan.main.filter((item) => item.source !== "sport_drill") },
    { label: "Stability & Accessory", items: plan.accessory.filter((item) => item.source !== "sport_drill") },
    { label: "Conditioning / METCON", items: plan.conditioning.filter((item) => item.source !== "sport_drill") },
  ];

  return (
    <div className="space-y-6">
      {resolvedAthleteFocus && (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/8 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-200 bg-cyan-500/15 border border-cyan-500/20 rounded-full px-2.5 py-1">
              {resolvedAthleteFocus.sport}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-100 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1">
              {resolvedAthleteFocus.position}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1">
              {resolvedAthleteFocus.readinessState}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed mt-3">
            {resolvedAthleteFocus.progressionSummary}
          </p>
        </div>
      )}

      {plan.sportDrills && plan.sportDrills.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-cyan-200 uppercase tracking-widest border-b border-cyan-500/15 pb-2">
            Role Drill Block
          </h4>
          <div className="space-y-2">
            {plan.sportDrills.map((exercise, index) => (
              <ExerciseRow key={exercise.id || index} exercise={exercise} />
            ))}
          </div>
        </div>
      )}

      {resolvedSessionProtocol && (
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/8 p-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest">Sport Protocol</p>
            {resolvedSessionProtocol.focus && (
              <p className="text-[12px] text-white font-semibold mt-2">{resolvedSessionProtocol.focus}</p>
            )}
          </div>

          {resolvedSessionProtocol.preSession.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pre-Session</p>
              <div className="space-y-2">
                {resolvedSessionProtocol.preSession.map((item) => (
                  <ProtocolRow key={item} text={item} />
                ))}
              </div>
            </div>
          )}

          {resolvedSessionProtocol.nutrition && (
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fueling Lens</p>
              <p className="text-[11px] text-slate-300 leading-relaxed mt-1">{resolvedSessionProtocol.nutrition}</p>
            </div>
          )}

          {(resolvedSessionProtocol.recoveryPriority || resolvedSessionProtocol.recoveryTargets.length > 0) && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Recovery Protocol</p>
              {resolvedSessionProtocol.recoveryPriority && (
                <p className="text-[11px] text-white font-medium">{resolvedSessionProtocol.recoveryPriority}</p>
              )}
              <div className="space-y-2">
                {resolvedSessionProtocol.recoveryTargets.map((item) => (
                  <ProtocolRow key={item} text={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {sections.filter(s => s.items.length > 0).map((section, idx) => (
        <div key={idx} className="space-y-3">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] pb-2">
            {section.label}
          </h4>
          <div className="space-y-2">
            {section.items.map((ex, i) => (
              <ExerciseRow key={ex.id || i} exercise={ex} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

function ExerciseRow({ exercise }: { exercise: GeneratedExercise }) {
  const { dosage } = exercise;
  const isSportDrill = exercise.source === "sport_drill";
  
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between group hover:bg-white/[0.04] transition-all">
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-white group-hover:text-[var(--saffron)] transition-colors">
            {exercise.name}
          </span>
          {isSportDrill && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5">
              Sport Drill
            </span>
          )}
          {exercise.blockFocus && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-2 py-0.5">
              {exercise.blockFocus}
            </span>
          )}
        </div>
        {exercise.coachingNote && (
          <span className="text-[11px] text-slate-400 mt-1 max-w-md leading-relaxed">
            {exercise.coachingNote}
          </span>
        )}
        {exercise.sportContext && (
          <span className="text-[10px] text-cyan-200/80 mt-1 uppercase tracking-wider">
            {exercise.sportContext}
          </span>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider">
            {dosage.sets} Sets × {dosage.reps}
          </span>
          {dosage.restTimeSeconds > 0 && (
            <span className="text-[10px] text-slate-600 flex items-center gap-1">
              <Timer className="w-2.5 h-2.5" />
              {dosage.restTimeSeconds}s Rest
            </span>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
          <span className="text-[10px] font-bold text-blue-400">RPE {dosage.targetRPE}</span>
          {dosage.isCapped && (
            <Info className="w-2.5 h-2.5 text-amber-500 cursor-help" />
          )}
        </div>
      </div>
    </div>
  );
}

function ProtocolRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300 flex-shrink-0" />
      <p className="text-[11px] text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}
