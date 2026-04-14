'use client'

import type { ElementType, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  Flame,
  HeartPulse,
  Moon,
  ShieldAlert,
  Timer,
  Zap,
} from 'lucide-react'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { ReadinessOrb } from '@/components/neon/ReadinessOrb'
import { ConfettiBurst } from '@/components/neon/ConfettiBurst'
import { createClient } from '@/lib/supabase/client'
import { scrollToTop } from '@/lib/utils'

import { submitAthleteDailyCheckIn } from './actions'

const sleepQualities = ['Poor', 'Okay', 'Good', 'Excellent'] as const
const sleepDurations = ['<6', '6-7', '7-8', '8-9', '9+'] as const
const sleepLatencies = ['<15 min', '15-30 min', '30-60 min', '>60 min'] as const
const energyLevels = ['Drained', 'Low', 'Moderate', 'High', 'Peak'] as const
const sorenessLevels = ['None', 'Low', 'Moderate', 'High'] as const
const stressLevels = ['Low', 'Moderate', 'High', 'Very High'] as const
const motivationLevels = ['Low', 'Moderate', 'High'] as const
const sessionCompletions = ['completed', 'competition', 'rest', 'missed'] as const
const sessionTypes = ['Skill', 'Strength', 'Speed', 'Endurance', 'Recovery'] as const
const painStatuses = ['none', 'mild', 'moderate', 'severe'] as const
const painLocations = ['Neck', 'Shoulder', 'Back', 'Hip', 'Knee', 'Ankle'] as const
const heatLevels = ['normal', 'warm', 'hot', 'extreme'] as const
const humidityLevels = ['low', 'moderate', 'high'] as const
const aqiBands = ['good', 'moderate', 'poor', 'very_poor'] as const
const fastingStates = ['none', 'light', 'strict'] as const
const scheduleStressOptions = [
  { label: 'Easy day', value: 0 },
  { label: 'Light', value: 1 },
  { label: 'Moderate', value: 2 },
  { label: 'High', value: 3 },
  { label: 'Very high', value: 4 },
  { label: 'Overloaded', value: 5 },
] as const

type AthleteCheckInFormState = {
  sleepQuality: '' | (typeof sleepQualities)[number]
  sleepDuration: '' | (typeof sleepDurations)[number]
  sleepLatency: '' | (typeof sleepLatencies)[number]
  energyLevel: '' | (typeof energyLevels)[number]
  muscleSoreness: '' | (typeof sorenessLevels)[number]
  lifeStress: '' | (typeof stressLevels)[number]
  motivation: '' | (typeof motivationLevels)[number]
  sessionCompletion: '' | (typeof sessionCompletions)[number]
  sessionType: '' | (typeof sessionTypes)[number]
  yesterdayDemand: number
  yesterdayDuration: number
  painStatus: '' | (typeof painStatuses)[number]
  painLocation: string[]
  competitionToday: boolean
  competitionTomorrow: boolean
  competitionYesterday: boolean
  heatLevel: '' | (typeof heatLevels)[number]
  humidityLevel: '' | (typeof humidityLevels)[number]
  aqiBand: '' | (typeof aqiBands)[number]
  commuteMinutes: number
  examStressScore: number
  fastingState: '' | (typeof fastingStates)[number]
  shiftWork: boolean
  sessionNotes: string
}

const steps = [
  { title: 'Sleep', subtitle: 'How did last night actually go?', icon: Moon },
  { title: 'Body', subtitle: 'How fresh or heavy does your body feel today?', icon: HeartPulse },
  { title: 'Mind', subtitle: 'Stress and motivation change the session as much as soreness does.', icon: Brain },
  { title: 'Yesterday', subtitle: 'Tell CREEDA what load you actually absorbed yesterday.', icon: Flame },
  { title: 'Pain + Schedule', subtitle: 'Flag pain and competition pressure before today’s load is set.', icon: ShieldAlert },
  { title: 'Context', subtitle: 'Optional real-world friction like heat, commute, fasting, and schedule pressure.', icon: Brain },
  { title: 'Review', subtitle: 'Check the summary, then build today’s plan.', icon: CheckCircle2 },
] as const

const STEP_PURPOSES = [
  'Used to estimate recovery quality before today begins.',
  'Used to update readiness and fatigue state.',
  'Used to adjust today’s load, complexity, and mental demand.',
  'Used to understand the real stress your body absorbed yesterday.',
  'Used to tighten pain protection, injury risk, and competition context.',
  'Optional. Used only when real-world context like heat, commute, fasting, or schedule stress should help explain the call.',
  'Used to confirm what CREEDA will score today before it writes the plan.',
] as const

type SubmitResult =
  | { success: true; readinessScore: number; decision: string; action: string; reason: string }
  | { error: string }

export default function AthleteCheckInPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [answeredFields, setAnsweredFields] = useState<Set<string>>(new Set())
  const [confettiTrigger, setConfettiTrigger] = useState(false)
  const [formData, setFormData] = useState<AthleteCheckInFormState>({
    sleepQuality: '',
    sleepDuration: '',
    sleepLatency: '',
    energyLevel: '',
    muscleSoreness: '',
    lifeStress: '',
    motivation: '',
    sessionCompletion: '',
    sessionType: '',
    yesterdayDemand: 6,
    yesterdayDuration: 60,
    painStatus: '',
    painLocation: [] as string[],
    competitionToday: false,
    competitionTomorrow: false,
    competitionYesterday: false,
    heatLevel: '',
    humidityLevel: '',
    aqiBand: '',
    commuteMinutes: 0,
    examStressScore: 0,
    fastingState: '',
    shiftWork: false,
    sessionNotes: '',
  })

  useEffect(() => {
    scrollToTop()
  }, [step])

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(data)
    }

    fetchProfile()
  }, [])

  const progress = Math.round(((step + 1) / steps.length) * 100)
  const sessionCaptured = formData.sessionCompletion === 'completed' || formData.sessionCompletion === 'competition'

  function patchForm(values: Partial<AthleteCheckInFormState>) {
    setFormData((current) => ({ ...current, ...values }))
    setAnsweredFields((current) => {
      const next = new Set(current)
      Object.keys(values).forEach((key) => next.add(key))
      return next
    })
    setError(null)
  }

  function validateStep(currentStep: number) {
    if (currentStep === 0) {
      return ['sleepQuality', 'sleepDuration', 'sleepLatency'].every((field) => answeredFields.has(field))
    }

    if (currentStep === 1) {
      return ['energyLevel', 'muscleSoreness'].every((field) => answeredFields.has(field))
    }

    if (currentStep === 2) {
      return ['lifeStress', 'motivation'].every((field) => answeredFields.has(field))
    }

    if (currentStep === 3) {
      if (!answeredFields.has('sessionCompletion')) return false
      if (!sessionCaptured) return true
      return ['sessionType', 'yesterdayDemand', 'yesterdayDuration'].every((field) => answeredFields.has(field))
    }

    if (currentStep === 4) {
      if (!answeredFields.has('painStatus')) return false
      if (formData.painStatus !== 'none' && formData.painLocation.length === 0) return false
      return true
    }

    if (currentStep === 5) {
      return true
    }

    return true
  }

  function handleNext() {
    if (!validateStep(step)) {
      setError(
        step === 4 && formData.painStatus !== 'none'
          ? 'Add the pain location so CREEDA can adjust today’s decision properly.'
          : 'Answer the questions on this screen before continuing.'
      )
      return
    }
    setStep((current) => Math.min(steps.length - 1, current + 1))
  }

  function handleBack() {
    setStep((current) => Math.max(0, current - 1))
  }

  function togglePainLocation(location: string) {
    patchForm({
      painLocation: formData.painLocation.includes(location)
        ? formData.painLocation.filter((item) => item !== location)
        : [...formData.painLocation, location],
    })
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const response = await submitAthleteDailyCheckIn(formData)
    setLoading(false)

    if (!response || 'error' in response) {
      setError(response?.error || 'Failed to save your daily check-in.')
      return
    }

    setResult({
      success: true,
      readinessScore: response.readinessScore,
      decision: response.decision,
      action: response.action,
      reason: response.reason,
    })
  }

  if (result && 'success' in result && result.success) {
    return (
      <DashboardLayout type="athlete" user={profile}>
        <div className="min-h-[80vh] max-w-md mx-auto px-4 flex flex-col items-center justify-center text-center">
          <ReadinessOrb score={result.readinessScore} status={result.decision} />
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--saffron)] mb-3 mt-4">
            Today&apos;s Plan
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight mb-3">{result.decision}</h1>
          <p className="text-sm text-white/50 leading-relaxed mb-4">{result.action}</p>
          <p className="text-xs text-white/30 leading-relaxed mb-8">{result.reason}</p>
          <Button
            onClick={() => router.push('/athlete/dashboard')}
            className="w-full h-14 rounded-2xl bg-[var(--saffron)] text-black font-black uppercase tracking-widest text-xs shadow-[0_0_30px_var(--saffron-glow)]"
          >
            Open Dashboard
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const ActiveIcon = steps[step].icon

  return (
    <DashboardLayout type="athlete" user={profile}>
      <ConfettiBurst trigger={confettiTrigger} />
      <div className="max-w-md mx-auto px-4 pb-28">
        <div className="pt-6 pb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Athlete Daily Check-In
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--saffron)]">
              {progress}% complete
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--saffron)] to-[var(--chakra-neon)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mb-8">
          <div className="h-16 w-16 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[var(--saffron)] mb-5">
            <ActiveIcon className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">{steps[step].title}</h1>
          <p className="text-sm text-slate-400 leading-relaxed mt-2">{steps[step].subtitle}</p>
          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--saffron)]">Used For</p>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">{STEP_PURPOSES[step]}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="space-y-8"
          >
            <Section label="Sleep quality" icon={Moon}>
              <CardGrid>
                {sleepQualities.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={item}
                    active={formData.sleepQuality === item}
                    onClick={() => {
                      patchForm({ sleepQuality: item })
                      if (item === 'Excellent' || item === 'Good') {
                        setConfettiTrigger(true)
                        setTimeout(() => setConfettiTrigger(false), 100)
                      }
                    }}
                  />
                ))}
              </CardGrid>
            </Section>

            <Section label="Sleep duration" icon={Timer}>
              <CardGrid>
                {sleepDurations.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={`${item} hrs`}
                    active={formData.sleepDuration === item}
                    onClick={() => patchForm({ sleepDuration: item })}
                  />
                ))}
              </CardGrid>
            </Section>

            <Section label="Time to fall asleep" icon={Moon}>
              <CardGrid columns="grid-cols-2">
                {sleepLatencies.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={item}
                    active={formData.sleepLatency === item}
                    onClick={() => patchForm({ sleepLatency: item })}
                  />
                ))}
              </CardGrid>
            </Section>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="space-y-8"
          >
            <Section label="Energy level" icon={Zap}>
              <div className="grid grid-cols-1 gap-3">
                {energyLevels.map((item) => (
                  <ChoiceRow
                    key={item}
                    label={item}
                    active={formData.energyLevel === item}
                    onClick={() => {
                      patchForm({ energyLevel: item })
                      if (item === 'Peak' || item === 'High') {
                        setConfettiTrigger(true)
                        setTimeout(() => setConfettiTrigger(false), 100)
                      }
                    }}
                  />
                ))}
              </div>
            </Section>

            <Section label="Muscle soreness" icon={Activity}>
              <CardGrid>
                {sorenessLevels.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={item}
                    active={formData.muscleSoreness === item}
                    onClick={() => patchForm({ muscleSoreness: item })}
                  />
                ))}
              </CardGrid>
            </Section>
          </motion.div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <Section label="Life stress" icon={Brain}>
              <CardGrid>
                {stressLevels.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={item}
                    active={formData.lifeStress === item}
                    onClick={() => patchForm({ lifeStress: item })}
                  />
                ))}
              </CardGrid>
            </Section>

            <Section label="Motivation to train" icon={Flame}>
              <CardGrid columns="grid-cols-3">
                {motivationLevels.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={item}
                    active={formData.motivation === item}
                    onClick={() => patchForm({ motivation: item })}
                  />
                ))}
              </CardGrid>
            </Section>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <Section label="What happened yesterday?" icon={CalendarDays}>
              <div className="grid grid-cols-2 gap-3">
                {sessionCompletions.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={titleCase(item)}
                    active={formData.sessionCompletion === item}
                    onClick={() =>
                      patchForm({
                        sessionCompletion: item,
                        sessionType: item === 'completed' || item === 'competition' ? formData.sessionType : '',
                        yesterdayDemand: item === 'completed' || item === 'competition' ? formData.yesterdayDemand : 0,
                        yesterdayDuration: item === 'completed' || item === 'competition' ? formData.yesterdayDuration : 0,
                      })
                    }
                  />
                ))}
              </div>
            </Section>

            {sessionCaptured ? (
              <>
                <Section label="Session type" icon={Flame}>
                  <div className="flex flex-wrap gap-2">
                    {sessionTypes.map((item) => (
                      <Chip
                        key={item}
                        label={item}
                        active={formData.sessionType === item}
                        onClick={() => patchForm({ sessionType: item })}
                      />
                    ))}
                  </div>
                </Section>

                <RangeBlock
                  label="Session demand"
                  icon={Flame}
                  value={formData.yesterdayDemand}
                  min={0}
                  max={10}
                  step={1}
                  unit="/10"
                  onChange={(value) => patchForm({ yesterdayDemand: value })}
                />

                <RangeBlock
                  label="Session duration"
                  icon={Timer}
                  value={formData.yesterdayDuration}
                  min={0}
                  max={240}
                  step={5}
                  unit="min"
                  onChange={(value) => patchForm({ yesterdayDuration: value })}
                />
              </>
            ) : (
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm text-slate-400 leading-relaxed">
                CREEDA will log zero training load for yesterday and adjust the decision around recovery and consistency instead.
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            <Section label="Pain status" icon={AlertTriangle}>
              <CardGrid>
                {painStatuses.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={titleCase(item)}
                    active={formData.painStatus === item}
                    onClick={() =>
                      patchForm({
                        painStatus: item,
                        painLocation: item === 'none' ? [] : formData.painLocation,
                      })
                    }
                  />
                ))}
              </CardGrid>
            </Section>

            {formData.painStatus !== '' && formData.painStatus !== 'none' && (
              <Section label="Pain location" icon={ShieldAlert}>
                <div className="flex flex-wrap gap-2">
                  {painLocations.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      active={formData.painLocation.includes(item)}
                      onClick={() => togglePainLocation(item)}
                    />
                  ))}
                </div>
              </Section>
            )}

            <Section label="Competition context" icon={CalendarDays}>
              <div className="space-y-3">
                <ToggleRow
                  label="Competition today"
                  active={formData.competitionToday}
                  onClick={() => patchForm({ competitionToday: !formData.competitionToday })}
                />
                <ToggleRow
                  label="Competition tomorrow"
                  active={formData.competitionTomorrow}
                  onClick={() => patchForm({ competitionTomorrow: !formData.competitionTomorrow })}
                />
                <ToggleRow
                  label="Competition yesterday"
                  active={formData.competitionYesterday}
                  onClick={() => patchForm({ competitionYesterday: !formData.competitionYesterday })}
                />
              </div>
            </Section>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-100/80 leading-relaxed">
              This step is optional. Use it only on days when heat, air quality, commute load, fasting, or schedule stress should help explain the decision.
            </div>

            <Section label="Heat load" icon={Flame}>
              <CardGrid>
                {heatLevels.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={titleCase(item)}
                    active={formData.heatLevel === item}
                    onClick={() => patchForm({ heatLevel: formData.heatLevel === item ? '' : item })}
                  />
                ))}
              </CardGrid>
            </Section>

            <Section label="Humidity" icon={Activity}>
              <CardGrid columns="grid-cols-3">
                {humidityLevels.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={titleCase(item)}
                    active={formData.humidityLevel === item}
                    onClick={() => patchForm({ humidityLevel: formData.humidityLevel === item ? '' : item })}
                  />
                ))}
              </CardGrid>
            </Section>

            <Section label="Air quality" icon={ShieldAlert}>
              <CardGrid>
                {aqiBands.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={item === 'very_poor' ? 'Very Poor' : titleCase(item)}
                    active={formData.aqiBand === item}
                    onClick={() => patchForm({ aqiBand: formData.aqiBand === item ? '' : item })}
                  />
                ))}
              </CardGrid>
            </Section>

            <RangeBlock
              label="Commute minutes"
              icon={Timer}
              value={formData.commuteMinutes}
              min={0}
              max={180}
              step={5}
              unit="min"
              onChange={(value) => patchForm({ commuteMinutes: value })}
            />

            <Section label="Exam / schedule stress" icon={Brain}>
              <CardGrid columns="grid-cols-2">
                {scheduleStressOptions.map((item) => (
                  <ChoiceCard
                    key={item.value}
                    label={item.label}
                    active={formData.examStressScore === item.value}
                    onClick={() => patchForm({ examStressScore: item.value })}
                  />
                ))}
              </CardGrid>
            </Section>

            <Section label="Fasting" icon={Moon}>
              <CardGrid columns="grid-cols-3">
                {fastingStates.map((item) => (
                  <ChoiceCard
                    key={item}
                    label={titleCase(item)}
                    active={formData.fastingState === item}
                    onClick={() => patchForm({ fastingState: formData.fastingState === item ? '' : item })}
                  />
                ))}
              </CardGrid>
            </Section>

            <Section label="Shift work or late hours" icon={CalendarDays}>
              <ToggleRow
                label="Today includes shift work, night duty, or unusually late hours"
                active={formData.shiftWork}
                onClick={() => patchForm({ shiftWork: !formData.shiftWork })}
              />
            </Section>

            <Section label="Optional context note" icon={Brain}>
              <textarea
                value={formData.sessionNotes}
                onChange={(event) => patchForm({ sessionNotes: event.target.value.slice(0, 300) })}
                placeholder="Anything unusual? Travel, exam week, very hot conditions, or unusual fatigue."
                className="w-full min-h-[100px] rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/[0.15] resize-none"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This note is optional and saved as context. It helps explain the call more clearly when the day is unusual.
              </p>
            </Section>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
              <SummaryRow label="Sleep" value={`${formData.sleepQuality} • ${formData.sleepDuration} hrs`} />
              <SummaryRow label="Body" value={`${formData.energyLevel} energy • ${formData.muscleSoreness} soreness`} />
              <SummaryRow label="Mind" value={`${formData.lifeStress} stress • ${formData.motivation} motivation`} />
              <SummaryRow
                label="Load"
                value={
                  sessionCaptured
                    ? `${titleCase(formData.sessionCompletion)} • ${formData.sessionType} • ${formData.yesterdayDemand}/10 for ${formData.yesterdayDuration} min`
                    : titleCase(formData.sessionCompletion || 'rest')
                }
              />
              <SummaryRow
                label="Pain"
                value={
                  formData.painStatus === 'none'
                    ? 'No pain flagged'
                    : `${titleCase(formData.painStatus || 'none')} • ${formData.painLocation.join(', ')}`
                }
              />
              <SummaryRow label="Context" value={formatAthleteContextSummary(formData)} />
            </div>

            <div className="rounded-3xl border border-[var(--saffron)]/20 bg-[var(--saffron)]/8 p-5 text-sm text-white/50 leading-relaxed">
              CREEDA will use this check-in to set today&apos;s athlete decision and sync the same result into your dashboard.
            </div>
          </div>
        )}
        </AnimatePresence>


        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-8">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-14 flex-1 rounded-2xl border-white/[0.1] bg-transparent text-slate-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}

          {step < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              className="h-14 flex-[1.6] rounded-2xl bg-[var(--saffron)] text-black font-black uppercase tracking-widest text-[10px]"
            >
              {step === steps.length - 2 ? 'Review Check-In' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="h-14 flex-[1.6] rounded-2xl bg-[var(--saffron)] text-black font-black uppercase tracking-widest text-[10px]"
            >
              {loading ? 'Building Today’s Decision...' : 'Submit Check-In'}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function Section({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: ElementType
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[var(--saffron)]">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">{label}</p>
      </div>
      {children}
    </section>
  )
}

function CardGrid({
  children,
  columns = 'grid-cols-2',
}: {
  children: React.ReactNode
  columns?: string
}) {
  return <div className={`grid ${columns} gap-3`}>{children}</div>
}

function ChoiceCard({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[72px] rounded-[1.5rem] border px-4 py-4 text-sm font-bold transition-all ${
        active
          ? 'border-[var(--saffron)] bg-[var(--saffron)]/12 text-white shadow-[0_0_24px_var(--saffron-glow)]'
          : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]'
      }`}
    >
      {label}
    </button>
  )
}

function ChoiceRow({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-[1.5rem] border px-5 py-4 text-left text-sm font-bold transition-all ${
        active
          ? 'border-[var(--saffron)] bg-[var(--saffron)]/12 text-white'
          : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]'
      }`}
    >
      {label}
    </button>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
        active
          ? 'border-[var(--saffron)] bg-[var(--saffron)] text-black'
          : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]'
      }`}
    >
      {label}
    </button>
  )
}

function ToggleRow({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-[1.5rem] border px-5 py-4 flex items-center justify-between text-sm font-bold transition-all ${
        active
          ? 'border-[var(--saffron)] bg-[var(--saffron)]/12 text-white'
          : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]'
      }`}
    >
      <span>{label}</span>
      <div
        className={`h-6 w-11 rounded-full transition-all ${active ? 'bg-[var(--saffron)]' : 'bg-white/[0.08]'}`}
      >
        <div
          className={`h-5 w-5 rounded-full bg-white mt-0.5 transition-all ${active ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </div>
    </button>
  )
}

function RangeBlock({
  label,
  icon: Icon,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  icon: ElementType
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}) {
  return (
    <Section label={label} icon={Icon}>
      <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] px-5 py-6">
        <div className="flex items-end justify-between mb-5">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">{label}</span>
          <span className="text-3xl font-black text-white">
            {value}
            <span className="text-xs text-slate-500 ml-1">{unit}</span>
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-[var(--saffron)]"
        />
      </div>
    </Section>
  )
}

function formatAthleteContextSummary(formData: AthleteCheckInFormState) {
  const parts = [
    formData.heatLevel ? titleCase(formData.heatLevel) : '',
    formData.humidityLevel ? `${titleCase(formData.humidityLevel)} humidity` : '',
    formData.aqiBand ? `${formData.aqiBand === 'very_poor' ? 'Very poor' : titleCase(formData.aqiBand)} air` : '',
    formData.commuteMinutes > 0 ? `${formData.commuteMinutes} min commute` : '',
    formData.examStressScore > 0 ? `${scheduleStressOptions.find((item) => item.value === formData.examStressScore)?.label || 'Stress'} schedule load` : '',
    formData.fastingState ? `${titleCase(formData.fastingState)} fasting` : '',
    formData.shiftWork ? 'Shift work' : '',
  ].filter(Boolean)

  if (!parts.length && !formData.sessionNotes.trim()) {
    return 'No extra context logged'
  }

  return [...parts, formData.sessionNotes.trim()].filter(Boolean).join(' • ')
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">{label}</span>
      <span className="text-sm text-white text-right leading-relaxed">{value}</span>
    </div>
  )
}

function titleCase(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
