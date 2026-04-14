"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, BarChart3, Brain, ClipboardCheck, Timer, Video, Zap } from "lucide-react";
import { ReadinessOrb } from "@/components/neon/ReadinessOrb";

import type { AthleteHealthSummary, ObjectiveTestSummary } from "@/lib/dashboard_decisions";
import type { CreedaDecision, OrchestratorOutputV5 } from "@/lib/engine/types";
import type { NutritionSafetySummary } from "@/lib/nutrition-safety";
import type { VideoAnalysisReportSummary } from "@/lib/video-analysis/reporting";
import type { DailyContextSummary } from "@/lib/context-signals/storage";

import { FeedbackBanner } from "./components/FeedbackBanner";
import { FullPlanSheet } from "./components/FullPlanSheet";
import { HeroDecision } from "./components/HeroDecision";
import { PredictionCard } from "./components/PredictionCard";
import { ScientificEvidencePanel } from "./components/ScientificEvidencePanel";
import { TodayPlan } from "./components/TodayPlan";
import { WhySection } from "./components/WhySection";
import { ConstraintsCard } from "./components/ConstraintsCard";
import { VideoAnalysisSummaryCard } from "@/components/video-analysis/VideoAnalysisSummaryCard";

interface DecisionHUDProps {
  result: OrchestratorOutputV5 | null;
  performanceProfile?: Record<string, unknown> | null;
  healthSummary?: AthleteHealthSummary | null;
  latestVideoReport?: VideoAnalysisReportSummary | null;
  objectiveTest?: ObjectiveTestSummary | null;
  contextSummary?: DailyContextSummary | null;
  nutritionSafety: NutritionSafetySummary;
}

export const DecisionHUD: React.FC<DecisionHUDProps> = ({
  result,
  performanceProfile,
  healthSummary,
  latestVideoReport,
  objectiveTest,
  contextSummary,
  nutritionSafety,
}) => {
  const router = useRouter();
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [showDeepScience, setShowDeepScience] = useState(false);
  const [isPlanPinned, setIsPlanPinned] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("creeda_plan_pinned") === "true"
  );
  const [isPending, startTransition] = useTransition();

  const togglePin = () => {
    const nextValue = !isPlanPinned;
    setIsPlanPinned(nextValue);
    window.localStorage.setItem("creeda_plan_pinned", String(nextValue));
  };

  const handleRefresh = () => {
    startTransition(() => router.refresh());
  };

  const decision: CreedaDecision | null = result?.creedaDecision || null;
  const calibrationSessionCount = Number(performanceProfile?.session_count || 0);

  if (!decision) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-white p-4 md:p-6 md:pl-72 pb-24 md:pb-6">
        <div className="max-w-2xl mx-auto pt-8 text-center">
          <ReadinessOrb score={0} status="Awaiting Check-In" isLoading />
          <h1 className="text-2xl font-black text-white mb-3 tracking-tight">
            Your Sports Scientist is Ready
          </h1>
          <p className="text-sm text-white/40 mb-8 max-w-md mx-auto leading-relaxed">
            Complete today&apos;s check-in so CREEDA can make one authoritative training decision for you.
          </p>
          <Link
            href="/athlete/checkin"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--saffron)] text-black font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_30px_var(--saffron-glow)]"
          >
            <ClipboardCheck className="w-4 h-4" />
            Start Check-In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-white p-4 md:p-6 md:pl-72 pb-24 md:pb-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <FeedbackBanner
          feedback={decision.feedback}
          calibrationSessionCount={calibrationSessionCount}
        />

        {decision.components.training.plan?.isCalibrationSession && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-2xl bg-[var(--chakra-neon)]/10 border border-[var(--chakra-neon)]/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-[var(--chakra-neon)]/20 text-[var(--chakra-neon)]">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[var(--chakra-neon)] uppercase tracking-widest leading-none mb-1">
                  Calibration Phase
                </span>
                <span className="text-[11px] font-medium text-[var(--chakra-neon)]/80">
                  Scaling your performance model from real training responses.
                </span>
              </div>
            </div>
            <div className="px-2 py-1 rounded-md bg-[var(--chakra-neon)]/20 text-[10px] font-bold text-[var(--chakra-neon)] uppercase">
              Exp: {calibrationSessionCount}/5
            </div>
          </motion.div>
        )}

        <HeroDecision decision={decision} />

        <AthleteTrustCard
          decision={decision}
          healthSummary={healthSummary || null}
          latestVideoReport={latestVideoReport || null}
          calibrationSessionCount={calibrationSessionCount}
          objectiveTest={objectiveTest || null}
          contextSummary={contextSummary || null}
        />

        <SectionHeader
          eyebrow="Today"
          title="Follow this plan first"
          body="Open the plan, execute the session, and only drop into the deeper science when you need extra context."
          icon={Zap}
        />

        <TodayPlan
          components={decision.components}
          sessionType={decision.sessionType}
          duration={decision.duration}
          nutritionSafety={nutritionSafety}
          isPinned={isPlanPinned}
          onTogglePin={togglePin}
        />

        <SectionHeader
          eyebrow="Technique"
          title="Video review and movement quality"
          body="Scan technique when you want CREEDA to pick up movement faults, coaching cues, and rescan guidance."
          icon={Video}
        />

        <VideoAnalysisSummaryCard
          role="athlete"
          latestReport={latestVideoReport || null}
          preferredSport={decision.scientificContext?.sportProfile?.sportKey || null}
        />

        <SectionHeader
          eyebrow="Science"
          title="Deeper context, trends, and safeguards"
          body="This is where CREEDA explains the why behind the day, not where the user has to start."
          icon={Brain}
        />

        <button
          type="button"
          onClick={() => setShowDeepScience((current) => !current)}
          className="w-full flex items-center justify-between p-4 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all"
        >
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
              Science Notes
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {showDeepScience ? "Hide the deeper science view" : "Open the deeper science view"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Expand only when you want the deeper why, constraints, forecast, and sport science references.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--chakra-neon)]">
            {showDeepScience ? "Hide" : "Show"}
          </span>
        </button>

        {showDeepScience && (
          <>
            <ScientificEvidencePanel
              context={decision.scientificContext}
              role="athlete"
              nutritionSafety={nutritionSafety}
            />

            <ConstraintsCard
              constraints={decision.constraints}
              visionFaults={decision.visionFaults}
            />

            <WhySection explanation={decision.explanation} />

            <PredictionCard predictions={decision.predictions} />
          </>
        )}

        {result && (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsInsightsOpen(true)}
            className="w-full flex items-center justify-between p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--chakra-neon)]/10 border border-[var(--chakra-neon)]/20 text-[var(--chakra-neon)] group-hover:bg-[var(--chakra-neon)]/20 transition-all">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none mb-1">
                  Scientific Insights
                </span>
                <span className="text-xs font-bold text-white">Why this decision?</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[var(--chakra-neon)] uppercase tracking-widest bg-[var(--chakra-neon)]/10 px-2 py-1 rounded-md">
              View Metrics
            </span>
          </motion.button>
        )}

        {result && (
          <FullPlanSheet
            isOpen={isInsightsOpen}
            onClose={() => setIsInsightsOpen(false)}
            result={result}
          />
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2"
        >
          <Link
            href="/athlete/checkin"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all text-xs font-bold text-slate-400 uppercase tracking-wider"
          >
            <ClipboardCheck className="w-4 h-4" />
            Daily Check-In
          </Link>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wider ${
              isPending
                ? "bg-[var(--chakra-neon)]/10 border-[var(--chakra-neon)]/20 text-[var(--chakra-neon)] animate-pulse"
                : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.05]"
            }`}
          >
            <Zap className="w-4 h-4" />
            {isPending ? "Refreshing..." : "Refresh"}
          </button>
          <Link
            href="/athlete/review"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all text-xs font-bold text-slate-400 uppercase tracking-wider"
          >
            <BarChart3 className="w-4 h-4" />
            Weekly Review
          </Link>
          <Link
            href="/athlete/tests"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all text-xs font-bold text-slate-400 uppercase tracking-wider"
          >
            <Timer className="w-4 h-4" />
            Objective Tests
          </Link>
        </motion.div>

        {decision.adherence.adherenceScore < 0.5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-3"
          >
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">
              Missing planned work reduces confidence. Log the real day so the engine can recover accuracy quickly.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

function SectionHeader({
  eyebrow,
  title,
  body,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  body: string;
  icon: typeof Zap;
}) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-primary">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-lg font-bold text-white tracking-tight">{title}</h2>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  );
}

function AthleteTrustCard({
  decision,
  healthSummary,
  latestVideoReport,
  calibrationSessionCount,
  objectiveTest,
  contextSummary,
}: {
  decision: CreedaDecision;
  healthSummary: AthleteHealthSummary | null;
  latestVideoReport: VideoAnalysisReportSummary | null;
  calibrationSessionCount: number;
  objectiveTest: ObjectiveTestSummary | null;
  contextSummary: DailyContextSummary | null;
}) {
  const trustSummary = getTrustSummary(decision);
  const sources = [
    ...trustSummary.signals,
    {
      label: "Device data",
      type: "measured" as const,
      status: healthSummary?.connected && healthSummary.sampleDays > 0 ? "active" as const : "missing" as const,
      detail:
        healthSummary?.connected && healthSummary.sampleDays > 0
          ? `${healthSummary.sampleDays} recent synced health days are available.`
          : "No synced device data is influencing today’s decision.",
    },
    {
      label: "Video review",
      type: "measured" as const,
      status: latestVideoReport?.summary?.status ? "active" as const : "missing" as const,
      detail: latestVideoReport?.summary?.status
        ? `Latest technique status: ${latestVideoReport.summary.status}.`
        : "No recent video review is attached to today’s plan.",
    },
    {
      label: "Calibration",
      type: "estimated" as const,
      status: calibrationSessionCount >= 5 ? "active" as const : "building" as const,
      detail:
        calibrationSessionCount >= 5
          ? "Baseline calibration is stable enough for deeper prescription logic."
          : `Calibration is still building (${calibrationSessionCount}/5 sessions).`,
    },
    {
      label: "Objective test",
      type: "measured" as const,
      status: objectiveTest?.trustStatus || "building",
      detail:
        objectiveTest?.summary ||
        "Objective testing is optional. Add it only if you want one extra measured sharpness marker in today’s decision layer.",
    },
  ];

  const confidenceTone =
    trustSummary.confidenceLevel === "HIGH"
      ? "text-emerald-300 border-emerald-500/20 bg-emerald-500/10"
      : trustSummary.confidenceLevel === "MEDIUM"
        ? "text-amber-300 border-amber-500/20 bg-amber-500/10"
        : "text-red-300 border-red-500/20 bg-red-500/10";

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Trust Layer
          </p>
          <h2 className="mt-2 text-lg font-bold text-white tracking-tight">
            Why CREEDA is making this call
          </h2>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            The decision is built from the freshest signals CREEDA has for this athlete right now.
          </p>
        </div>
        <div className={`px-3 py-2 rounded-2xl border text-right ${confidenceTone}`}>
          <p className="text-[9px] font-black uppercase tracking-[0.24em]">Confidence</p>
          <p className="mt-1 text-sm font-bold">{trustSummary.confidenceLevel}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <span
            key={`${source.label}-${source.type}`}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
              source.status === "active"
                ? "border-white/[0.08] bg-white/[0.04] text-white"
                : source.status === "building" || source.status === "limited"
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                  : "border-white/[0.06] bg-white/[0.02] text-slate-500"
            }`}
          >
            {source.label}
            <span className="text-[9px] opacity-70">{source.type.replace("_", "-")}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <TrustMetric label="Confidence score" value={`${Math.round(trustSummary.confidenceScore)}%`} icon={BarChart3} />
        <TrustMetric label="Data completeness" value={`${Math.round(trustSummary.dataCompleteness)}%`} icon={Activity} />
        <TrustMetric label="Data quality" value={trustSummary.dataQuality} icon={Activity} />
        <TrustMetric
          label="Adherence"
          value={`${Math.round(decision.adherence.adherenceScore * 100)}%`}
          icon={ClipboardCheck}
        />
        <TrustMetric
          label="Context load"
          value={contextSummary?.loadLabel || "Optional"}
          icon={Brain}
        />
        <TrustMetric
          label="Measured signal"
          value={objectiveTest?.primarySignal?.formattedHeadline || "Optional"}
          icon={Timer}
        />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {objectiveTest?.primarySignal?.displayName || "Measured objective signal"}
          </p>
          {objectiveTest?.classification && (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
              {objectiveTest.classification}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          {objectiveTest?.summary || "Objective testing is optional. Add a measured session only if you want CREEDA to compare your readiness with one extra objective anchor."}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {objectiveTest?.completedAt
              ? `Latest ${objectiveTest.primarySignal?.displayName || "session"} ${objectiveTest.completedAt.slice(0, 10)}`
              : "No saved session"}
          </p>
          <Link
            href="/athlete/tests"
            className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200"
          >
            {objectiveTest?.freshness === "fresh" ? "Retest" : "Open test"}
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">India-context signal</p>
          {contextSummary?.latestSignal && (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
              {contextSummary.loadLabel} load
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          {contextSummary?.summary || "Optional: log heat, commute, fasting, air quality, or schedule pressure only when the day is unusual. CREEDA uses it to explain the call more precisely, not to create more compulsory work."}
        </p>
        {contextSummary?.latestSignal && (
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Latest context day {contextSummary.latestSignal.logDate}
          </p>
        )}
      </div>

      {trustSummary.whyTodayChanged.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Why today changed</p>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            {trustSummary.whyTodayChanged.join(" ")}
          </p>
        </div>
      )}

      {trustSummary.nextBestInputs.length > 0 && (
        <div className="rounded-2xl border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--chakra-neon)]">Best next inputs</p>
          <p className="mt-2 text-xs text-blue-100/80 leading-relaxed">
            {trustSummary.nextBestInputs.join(" ")}
          </p>
        </div>
      )}

      {healthSummary?.connected && healthSummary.latestMetricDate && (
        <p className="text-xs text-slate-500 leading-relaxed">
          Latest synced health day: {healthSummary.latestMetricDate}.
        </p>
      )}

      {healthSummary?.lastError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300 leading-relaxed">
          Latest sync issue: {healthSummary.lastError}
        </div>
      )}
    </div>
  );
}

function getTrustSummary(decision: CreedaDecision) {
  return (
    decision.trustSummary ?? {
      confidenceLevel: decision.confidenceLevel,
      confidenceScore: decision.confidenceScore,
      dataCompleteness: decision.dataCompleteness,
      dataQuality:
        decision.dataCompleteness >= 80 ? "COMPLETE" : decision.dataCompleteness >= 50 ? "PARTIAL" : "WEAK",
      signals: [
        { label: "Daily check-in", type: "self_reported" as const, status: "active" as const },
        { label: "Recent logs", type: "estimated" as const, status: "active" as const },
      ],
      whyTodayChanged: decision.confidenceReasons || [],
      nextBestInputs: [],
    }
  );
}

function TrustMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Zap;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-lg font-black text-white">{value}</p>
    </div>
  );
}
