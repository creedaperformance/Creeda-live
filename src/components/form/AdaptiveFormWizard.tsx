'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { BodyMapSelector } from '@/components/form/BodyMapSelector'
import { ChipSelector } from '@/components/form/ChipSelector'
import { EmojiScale } from '@/components/form/EmojiScale'
import { ProgressBar } from '@/components/form/ProgressBar'
import { SliderInput } from '@/components/form/SliderInput'
import { StepCard } from '@/components/form/StepCard'
import { Button } from '@/components/ui/button'
import { trackAdaptiveFormEvent } from '@/forms/actions'
import type { AdaptiveEntryMode } from '@/forms/analytics'
import { getVisibleSteps, shouldShowField } from '@/forms/engine/adaptiveQuestionEngine'
import { calculateConfidence } from '@/forms/engine/confidenceEngine'
import { clearDraft, readDraft, writeDraft } from '@/forms/engine/formStateStore'
import { getCompletionPercentage, getNextQuestions } from '@/forms/engine/progressiveProfiler'
import type { AnswerRecord, FormFieldDefinition, FormFlowDefinition } from '@/forms/types'

interface AdaptiveFormWizardProps {
  flow: FormFlowDefinition
  submitAction: (payload: AnswerRecord) => Promise<Record<string, unknown>>
  context?: AnswerRecord
  initialValues?: AnswerRecord
  initialQuestionId?: string | null
  trackedQuestionIds?: string[]
  entrySource?: string
  entryMode?: AdaptiveEntryMode
  userId?: string | null
  successFallbackPath?: string
}

function isAnswered(field: FormFieldDefinition, value: unknown) {
  if (field.inputType === 'toggle' && field.required) return value === true
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && value !== null && value !== ''
}

function buildDefaultValue(field: FormFieldDefinition) {
  if (field.inputType === 'multi-chip' || field.inputType === 'body-map') return []
  if (field.inputType === 'toggle') return false
  if (field.inputType === 'slider' || field.inputType === 'number') return field.min ?? 0
  return ''
}

function createSessionId(flowId: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${flowId}:${crypto.randomUUID()}`
  }

  return `${flowId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
}

export function AdaptiveFormWizard({
  flow,
  submitAction,
  context = {},
  initialValues = {},
  initialQuestionId,
  trackedQuestionIds = [],
  entrySource = 'direct',
  entryMode = 'direct',
  userId,
  successFallbackPath,
}: AdaptiveFormWizardProps) {
  const router = useRouter()
  const submitAbortRef = useRef<AbortController | null>(null)

  function resolveInitialStepIndex(resolvedAnswers: AnswerRecord) {
    const visible = getVisibleSteps(flow, resolvedAnswers, context)
    if (!visible.length) return 0

    const targetQuestionId =
      initialQuestionId ?? getNextQuestions({ flow, answers: resolvedAnswers, context })[0]?.id ?? null

    if (!targetQuestionId) return 0

    const matchedIndex = visible.findIndex((step) => step.fieldIds.includes(targetQuestionId))
    return matchedIndex >= 0 ? matchedIndex : 0
  }

  const [initialState] = useState(() => {
    const draft = readDraft(flow.id, userId)
    const resumedFromDraft = draft?.version === flow.version
    const answers = resumedFromDraft ? { ...draft?.answers, ...initialValues } : initialValues

    return {
      answers,
      stepIndex: resolveInitialStepIndex(answers),
      resumedFromDraft,
    }
  })
  const [answers, setAnswers] = useState<AnswerRecord>(initialState.answers)
  const [stepIndex, setStepIndex] = useState<number>(initialState.stepIndex)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [advancedLogging, setAdvancedLogging] = useState(false)
  const [sessionId] = useState(() => createSessionId(flow.id))
  const [startedAt] = useState(() => Date.now())
  const initialAnswersRef = useRef(initialState.answers)
  const openEventSentRef = useRef(false)
  const viewedKeysRef = useRef(new Set<string>())
  const completedStepKeysRef = useRef(new Set<string>())
  const resolvedQuestionIdsRef = useRef(new Set<string>())
  const completedEventSentRef = useRef(false)
  const stepCompletionCountRef = useRef(0)
  const trackedQuestionSetRef = useRef(new Set(trackedQuestionIds))

  const liveContext = {
    ...context,
    trackTrainingToday: advancedLogging,
    hasOutstandingTrainingCapture: advancedLogging,
  }

  const visibleSteps = getVisibleSteps(flow, answers, liveContext)
  const safeStepIndex = Math.min(stepIndex, Math.max(visibleSteps.length - 1, 0))
  const currentStep = visibleSteps[safeStepIndex]
  const currentFields = currentStep
    ? currentStep.fieldIds
        .map((fieldId) => flow.fields.find((entry) => entry.id === fieldId))
        .filter((field): field is FormFieldDefinition => Boolean(field))
        .filter((field) => shouldShowField(field, answers, liveContext))
    : []
  const currentFieldIds = currentFields.map((field) => field.id)
  const currentFieldKey = currentFieldIds.join('|')
  const progress = visibleSteps.length ? Math.round(((safeStepIndex + 1) / visibleSteps.length) * 100) : 0
  const confidence = calculateConfidence({
    flow,
    answers,
    context: liveContext,
    totalFieldCount: flow.fields.length,
    inferredFieldCount: flow.fields.filter((field) => field.category === 'inferred').length,
  })
  const nextQuestions = getNextQuestions({ flow, answers, context: liveContext })

  useEffect(() => {
    writeDraft(flow.id, flow.version, answers, userId)
  }, [answers, flow.id, flow.version, userId])

  function getPathContext() {
    if (typeof window === 'undefined') {
      return {
        pathname: null,
        search: null,
      }
    }

    return {
      pathname: window.location.pathname,
      search: window.location.search || null,
    }
  }

  function trackStepCompletion(stepId: string, fieldIds: string[], isFinalStep: boolean) {
    const stepKey = `${stepId}:${safeStepIndex}:${fieldIds.join('|')}`
    const pathContext = getPathContext()

    if (!completedStepKeysRef.current.has(stepKey)) {
      completedStepKeysRef.current.add(stepKey)
      stepCompletionCountRef.current += 1

      void trackAdaptiveFormEvent({
        eventName: 'adaptive_form_step_completed',
        role: flow.userType,
        flowId: flow.id,
        flowVersion: flow.version,
        flowKind: flow.kind,
        sessionId,
        stepId,
        questionId: fieldIds[0] ?? null,
        entrySource,
        entryMode,
        eventProperties: {
          ...pathContext,
          stepIndex: safeStepIndex,
          visibleStepCount: visibleSteps.length,
          questionIds: fieldIds,
          isFinalStep,
          advancedLogging,
          timeFromOpenMs: Date.now() - startedAt,
        },
      })
    }

    const remainingTrackedIds = trackedQuestionIds.filter((questionId) => !resolvedQuestionIdsRef.current.has(questionId))
    const resolvedIds = fieldIds.filter(
      (questionId) => {
        const field = flow.fields.find((entry) => entry.id === questionId)
        if (!field) return false

        return (
          trackedQuestionSetRef.current.has(questionId) &&
          !resolvedQuestionIdsRef.current.has(questionId) &&
          isAnswered(field, answers[questionId])
        )
      }
    )

    resolvedIds.forEach((questionId) => {
      resolvedQuestionIdsRef.current.add(questionId)

      void trackAdaptiveFormEvent({
        eventName: 'adaptive_next_question_resolved',
        role: flow.userType,
        flowId: flow.id,
        flowVersion: flow.version,
        flowKind: flow.kind,
        sessionId,
        stepId,
        questionId,
        entrySource,
        entryMode,
        eventProperties: {
          ...pathContext,
          resolvedAfterMs: Date.now() - startedAt,
          remainingTrackedQuestionCount: remainingTrackedIds.filter((id) => id !== questionId).length,
          remainingTrackedQuestionIds: remainingTrackedIds.filter((id) => id !== questionId),
        },
      })
    })
  }

  useEffect(() => {
    if (openEventSentRef.current) return

    openEventSentRef.current = true
    const initialContext = {
      ...context,
      trackTrainingToday: false,
      hasOutstandingTrainingCapture: false,
    }
    const initialCompletion = getCompletionPercentage({
      flow,
      answers: initialAnswersRef.current,
      context: initialContext,
    })
    const initialConfidence = calculateConfidence({
      flow,
      answers: initialAnswersRef.current,
      context: initialContext,
      totalFieldCount: flow.fields.length,
      inferredFieldCount: flow.fields.filter((field) => field.category === 'inferred').length,
    })
    const pathContext = getPathContext()

    void trackAdaptiveFormEvent({
      eventName: 'adaptive_form_opened',
      role: flow.userType,
      flowId: flow.id,
      flowVersion: flow.version,
      flowKind: flow.kind,
      sessionId,
      questionId: initialQuestionId ?? null,
      entrySource,
      entryMode,
      eventProperties: {
        ...pathContext,
        initialStepIndex: initialState.stepIndex,
        initialQuestionId,
        trackedQuestionIds,
        trackedQuestionCount: trackedQuestionIds.length,
        resumedFromDraft: initialState.resumedFromDraft,
        hasInitialValues: Object.keys(initialAnswersRef.current).length > 0,
        visibleStepCount: getVisibleSteps(flow, initialAnswersRef.current, initialContext).length,
        initialCompletionScore: initialCompletion,
        initialConfidenceScore: initialConfidence.score,
      },
    })

    if (entryMode === 'enrichment') {
      void trackAdaptiveFormEvent({
        eventName: 'adaptive_enrichment_opened',
        role: flow.userType,
        flowId: flow.id,
        flowVersion: flow.version,
        flowKind: flow.kind,
        sessionId,
        questionId: initialQuestionId ?? trackedQuestionIds[0] ?? null,
        entrySource,
        entryMode,
        eventProperties: {
          ...pathContext,
          trackedQuestionIds,
          trackedQuestionCount: trackedQuestionIds.length,
          resumedFromDraft: initialState.resumedFromDraft,
        },
      })
    }
  }, [context, entryMode, entrySource, flow, initialQuestionId, initialState.resumedFromDraft, initialState.stepIndex, sessionId, trackedQuestionIds])

  useEffect(() => {
    if (!currentStep) return

    const stepViewKey = `${currentStep.id}:${safeStepIndex}:${currentFieldKey}`
    if (viewedKeysRef.current.has(stepViewKey)) return

    viewedKeysRef.current.add(stepViewKey)
    const pathContext = getPathContext()

    void trackAdaptiveFormEvent({
      eventName: 'adaptive_form_step_viewed',
      role: flow.userType,
      flowId: flow.id,
      flowVersion: flow.version,
      flowKind: flow.kind,
      sessionId,
      stepId: currentStep.id,
      questionId: currentFieldIds[0] ?? null,
      entrySource,
      entryMode,
      eventProperties: {
        ...pathContext,
        stepIndex: safeStepIndex,
        visibleStepCount: visibleSteps.length,
        questionIds: currentFieldIds,
        mandatory: currentStep.mandatory,
        optional: currentStep.optional,
        conditional: currentStep.conditional,
        advancedLogging,
        timeFromOpenMs: Date.now() - startedAt,
      },
    })
  }, [advancedLogging, currentFieldIds, currentFieldKey, currentStep, entryMode, entrySource, flow.id, flow.kind, flow.userType, flow.version, safeStepIndex, sessionId, startedAt, visibleSteps.length])

  function updateAnswer(fieldId: string, value: unknown) {
    setAnswers((current) => ({ ...current, [fieldId]: value }))
    setError(null)
  }

  function validateCurrentStep() {
    if (!currentStep) return false

    const missing = currentFields.filter((field) => field.required && !isAnswered(field, answers[field.id]))
    if (missing.length > 0) {
      setError(`Please finish ${missing[0].label.toLowerCase()} before continuing.`)
      return false
    }

    return true
  }

  async function handleNext() {
    if (!validateCurrentStep()) return

    if (safeStepIndex >= visibleSteps.length - 1) {
      submitAbortRef.current?.abort()
      const submitController = new AbortController()
      submitAbortRef.current = submitController
      setLoading(true)
      setError(null)

      try {
        const response = await submitAction(answers)
        if (submitController.signal.aborted) return

        if ('error' in response && response.error) {
          setError(String(response.error))
          return
        }

        if (currentStep) {
          trackStepCompletion(currentStep.id, currentFieldIds, true)
        }

        if (!completedEventSentRef.current) {
          completedEventSentRef.current = true
          const pathContext = getPathContext()

          void trackAdaptiveFormEvent({
            eventName: 'adaptive_form_completed',
            role: flow.userType,
            flowId: flow.id,
            flowVersion: flow.version,
            flowKind: flow.kind,
            sessionId,
            stepId: currentStep?.id ?? null,
            questionId: currentFieldIds[0] ?? null,
            entrySource,
            entryMode,
            eventProperties: {
              ...pathContext,
              durationMs: Date.now() - startedAt,
              stepViews: viewedKeysRef.current.size,
              stepCompletions: stepCompletionCountRef.current,
              trackedQuestionCount: trackedQuestionIds.length,
              resolvedTrackedQuestionCount: resolvedQuestionIdsRef.current.size,
              resolvedTrackedQuestionIds: Array.from(resolvedQuestionIdsRef.current),
              advancedLogging,
              finalCompletionScore: getCompletionPercentage({ flow, answers, context: liveContext }),
              finalConfidenceScore: confidence.score,
            },
          })
        }

        clearDraft(flow.id, userId)
        setResult(response)
      } catch (error) {
        if (!submitController.signal.aborted) {
          setError(error instanceof Error ? error.message : 'We could not submit this form. Please try again.')
        }
      } finally {
        if (submitAbortRef.current === submitController) {
          submitAbortRef.current = null
        }

        if (!submitController.signal.aborted) {
          setLoading(false)
        }
      }

      return
    }

    if (currentStep) {
      trackStepCompletion(currentStep.id, currentFieldIds, false)
    }

    setStepIndex((current) => Math.min(current + 1, Math.max(visibleSteps.length - 1, 0)))
  }

  useEffect(() => {
    return () => {
      submitAbortRef.current?.abort()
    }
  }, [])

  function renderField(field: FormFieldDefinition) {
    const value = answers[field.id] ?? buildDefaultValue(field)

    if (field.inputType === 'chips') {
      return (
        <ChipSelector
          options={field.options ?? []}
          value={value as string | number | boolean}
          onChange={(next) => updateAnswer(field.id, next)}
        />
      )
    }

    if (field.inputType === 'multi-chip') {
      return (
        <ChipSelector
          options={field.options ?? []}
          value={(value as Array<string | number | boolean>) ?? []}
          onChange={(next) => updateAnswer(field.id, next)}
          multiple
        />
      )
    }

    if (field.inputType === 'emoji') {
      return (
        <EmojiScale
          options={field.options ?? []}
          value={value as string | number | boolean}
          onChange={(next) => updateAnswer(field.id, next)}
        />
      )
    }

    if (field.inputType === 'slider') {
      return (
        <SliderInput
          min={field.min ?? 0}
          max={field.max ?? 10}
          step={field.step ?? 1}
          unit={field.unit}
          value={Number(value)}
          onChange={(next) => updateAnswer(field.id, next)}
        />
      )
    }

    if (field.inputType === 'body-map') {
      return (
        <BodyMapSelector
          options={field.options ?? []}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(next) => updateAnswer(field.id, next)}
          maxSelections={field.maxSelections}
        />
      )
    }

    if (field.inputType === 'toggle') {
      const active = value === true

      return (
        <button
          type="button"
          onClick={() => updateAnswer(field.id, !active)}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
            active
              ? 'border-[#6ee7b7] bg-[#6ee7b7]/12 text-white'
              : 'border-white/12 bg-white/4 text-white/75 hover:border-white/22'
          }`}
        >
          <span className="max-w-[85%] text-sm font-semibold leading-6">{field.label}</span>
          <span className="text-xs font-black uppercase tracking-[0.18em]">{active ? 'On' : 'Off'}</span>
        </button>
      )
    }

    if (field.inputType === 'textarea') {
      return (
        <textarea
          value={String(value)}
          onChange={(event) => updateAnswer(field.id, event.target.value)}
          placeholder={field.placeholder}
          className="min-h-28 w-full rounded-2xl border border-white/12 bg-white/4 px-4 py-4 text-sm text-white outline-none placeholder:text-white/35"
        />
      )
    }

    return (
      <input
        type={field.inputType === 'number' ? 'number' : field.inputType === 'phone' ? 'tel' : field.inputType === 'time' ? 'time' : 'text'}
        value={String(value)}
        min={field.min}
        max={field.max}
        onChange={(event) =>
          updateAnswer(field.id, field.inputType === 'number' ? Number(event.target.value) : event.target.value)
        }
        placeholder={field.placeholder}
        className="h-14 w-full rounded-2xl border border-white/12 bg-white/4 px-4 text-sm text-white outline-none placeholder:text-white/35"
      />
    )
  }

  if (result) {
    const destination = String(result.destination ?? successFallbackPath ?? '#')
    const summary = 'summary' in result ? (result.summary as Record<string, unknown>) : null

    return (
      <div className="mx-auto max-w-xl space-y-5">
        <StepCard
          eyebrow="Complete"
          title={
            typeof result.decision === 'string'
              ? String(result.decision)
              : flow.kind === 'daily'
                ? 'Check-in complete'
                : 'Setup complete'
          }
          helper={
            typeof result.reason === 'string'
              ? String(result.reason)
              : flow.kind === 'daily'
                ? 'Your daily signal has been processed.'
                : 'You can improve accuracy later without blocking your first result.'
          }
        >
          <div className="space-y-4">
            {'readinessScore' in result ? (
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Readiness</div>
                <div className="mt-2 text-4xl font-black text-white">{String(result.readinessScore)}</div>
              </div>
            ) : null}

            {summary?.readinessScore ? (
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4 text-sm text-white/78">
                <div className="font-semibold text-white">Starting readiness: {String(summary.readinessScore)}</div>
                {summary.primaryGap ? <div className="mt-2">Main opportunity: {String(summary.primaryGap)}</div> : null}
              </div>
            ) : null}

            <Button
              type="button"
              onClick={() => {
                if (destination !== '#') router.push(destination)
              }}
              className="h-12 w-full rounded-2xl bg-[#00d4ff] font-bold text-slate-950 hover:bg-[#38e0ff]"
            >
              {flow.kind === 'daily' ? 'Back to dashboard' : 'Open dashboard'}
            </Button>
          </div>
        </StepCard>
      </div>
    )
  }

  if (!currentStep) return null

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
        <ProgressBar value={progress} label={`${flow.title} progress`} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              {flow.kind === 'daily' ? 'Signal confidence' : 'Profile confidence'}
            </div>
            <div className="mt-2 text-2xl font-black text-white">{confidence.score}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Accuracy next</div>
            <div className="mt-2 text-sm font-semibold text-white/82">
              {nextQuestions[0]?.label ?? 'You are in a strong place already.'}
            </div>
          </div>
        </div>

        {flow.kind === 'daily' ? (
          <button
            type="button"
            onClick={() => setAdvancedLogging((current) => !current)}
            className={`mt-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              advancedLogging
                ? 'border-[#fbbf24] bg-[#fbbf24]/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/72'
            }`}
          >
            <span className="text-sm font-semibold">Add training details too</span>
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">
              {advancedLogging ? 'On' : 'Off'}
            </span>
          </button>
        ) : null}
      </div>

      <StepCard
        eyebrow={`${safeStepIndex + 1} / ${visibleSteps.length}`}
        title={currentStep.title}
        helper={currentStep.helperCopy ?? currentStep.goal}
        footer={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={safeStepIndex === 0 || loading}
              className="h-11 flex-1 rounded-2xl border-white/12 bg-white/0 text-white hover:bg-white/6"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => void handleNext()}
              disabled={loading}
              className="h-11 flex-1 rounded-2xl bg-[#00d4ff] font-bold text-slate-950 hover:bg-[#38e0ff]"
            >
              {loading ? 'Saving...' : safeStepIndex >= visibleSteps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {currentFields.map((field) => (
            <div key={field.id} className="space-y-3">
              {field.inputType !== 'toggle' ? (
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">{field.label}</div>
                  <div className="text-sm leading-6 text-white/62">{field.helper}</div>
                </div>
              ) : null}
              {renderField(field)}
            </div>
          ))}

          {error ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </div>
      </StepCard>
    </div>
  )
}
