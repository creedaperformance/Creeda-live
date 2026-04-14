"use client";

import Link from "next/link";
import React, { useState } from "react";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { GamifiedProgressBar } from "@/components/gamified/GamifiedProgressBar";
import { GamifiedButton } from "@/components/gamified/GamifiedButton";
import { useCreedaState } from "@/lib/state_engine";
import { Search, Video, Database, TrendingUp, BarChart3, Users } from "lucide-react";
import { CoachDecisionHUD } from "./components/CoachDecisionHUD";
import { CoachVideoTerminal } from "./components/CoachVideoTerminal";
import type { VideoAnalysisReportSummary } from "@/lib/video-analysis/reporting";

interface Props {
  videoReports: Array<VideoAnalysisReportSummary & { athleteName: string; athleteAvatarUrl: string | null }>
  lockerCode: string | null
}

export const GamifiedCoachDashboard: React.FC<Props> = ({ videoReports, lockerCode }) => {
  const { state } = useCreedaState();
  const [coachQuery, setCoachQuery] = useState("");

  return (
    <div className="min-h-screen bg-[var(--background)] text-white p-6 md:pl-72 pb-24 md:pb-6">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <HUDLabel index="01" label="Command Center Active" />
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
            Coach<span className="text-[var(--saffron)]">INTEL</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={coachQuery}
                onChange={(event) => setCoachQuery(event.target.value)}
                placeholder="Search athlete, team, reason..." 
                className="bg-[#111118] border border-white/[0.06] rounded-xl py-2 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-[var(--chakra-neon)]/50 focus:shadow-[0_0_10px_var(--chakra-glow)] transition-all w-64 text-white placeholder:text-white/25"
              />
           </div>
           <Link href="/coach/academy">
             <GamifiedButton variant="PRIMARY" size="SM">
               Academy Ops
             </GamifiedButton>
           </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* LEFT COLUMN: HUD & AGGREGATE INTEL */}
        <div className="lg:col-span-3 space-y-8">
          <CoachDecisionHUD query={coachQuery} />
          
          <div className="pt-4 border-t border-slate-800/50">
             <div className="flex items-center gap-3 mb-6 px-2">
                <Video className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Squad Technical Repository</h3>
             </div>
             <CoachVideoTerminal reports={videoReports} />
          </div>
        </div>

        {/* RIGHT COLUMN: COACHING UTILS & ANALYTICS */}
        <div className="space-y-8">
          <GamifiedCard glowColor="rgba(59,130,246,0.3)">
            <HUDLabel index="04" label="Operator Locker Code" />
            <div
              className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center"
              data-testid="coach-locker-code-card"
            >
              <div
                className="text-3xl font-black tracking-[0.2em] text-[var(--chakra-neon)]"
                data-testid="coach-locker-code-value"
              >
                {lockerCode || state.squadData[0]?.invite_code || "N/A"}
              </div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-2">
                Share this connection code with athletes to link profiles
              </p>
            </div>
          </GamifiedCard>

          <GamifiedCard className="bg-slate-900/40">
            <HUDLabel index="05" label="Operational Compliance" />
            <div className="mt-4 space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/30 uppercase">Daily Log Participation</span>
                  <span className="text-xs font-black text-white">
                    {state.squadData[0]?.members.length > 0 ? '92%' : '0%'}
                  </span>
               </div>
               <GamifiedProgressBar progress={state.squadData[0]?.members.length > 0 ? 92 : 0} showGlow />
               <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-bold text-white/30 uppercase">Avg Team Readiness</span>
                  <span className="text-xs font-black text-[var(--chakra-neon)]">
                    {state.squadData[0]?.members.reduce((acc, m) => acc + m.readiness_score, 0) / (state.squadData[0]?.members.length || 1) | 0}
                  </span>
               </div>
            </div>
          </GamifiedCard>

          <GamifiedCard className="bg-slate-900/40">
            <HUDLabel index="06" label="Weekly Operating View" />
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Move from today&apos;s queue to weekly squad planning.
            </p>
            <div className="mt-4 grid gap-3">
              <Link
                href="/coach/review"
                className="flex items-center justify-between rounded-2xl border border-[var(--saffron)]/20 bg-[var(--saffron)]/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--saffron-light)] hover:bg-[var(--saffron)]/15 transition-all"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Weekly Review
                </span>
                <span>Open</span>
              </Link>
              <Link
                href="/coach/analytics"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/[0.05] transition-all"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </span>
                <span>Open</span>
              </Link>
            </div>
          </GamifiedCard>

          <GamifiedCard className="bg-slate-900/40">
            <HUDLabel index="07" label="Academy Layer" />
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/30 uppercase">Teams</span>
                  <span className="text-xs font-black text-white">{state.squadData.length}</span>
              </div>
              <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/30 uppercase">Junior Athletes</span>
                  <span className="text-xs font-black text-[var(--chakra-neon)]">
                  {state.squadData.reduce((acc, team) => acc + team.members.filter((member) => member.is_junior).length, 0)}
                </span>
              </div>
              <Link
                href="/coach/academy"
                className="flex items-center justify-between rounded-2xl border border-[var(--saffron)]/20 bg-[var(--saffron)]/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--saffron-light)] hover:bg-[var(--saffron)]/15 transition-all"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Open Academy Ops
                </span>
                <span>Open</span>
              </Link>
            </div>
          </GamifiedCard>

          <div className="p-5 rounded-2xl border border-[var(--saffron)]/20 bg-[var(--saffron)]/5 space-y-4">
             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-[var(--saffron)]" />
                    <span className="text-[10px] font-black uppercase text-white">V5 Engine Node</span>
                 </div>
                 <div className="px-2 py-0.5 rounded-full bg-[var(--saffron)] text-[8px] font-black text-black uppercase">Active</div>
             </div>
             <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">
                Centralizing multi-athlete adaptation cycles into a unified coaching stream.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
