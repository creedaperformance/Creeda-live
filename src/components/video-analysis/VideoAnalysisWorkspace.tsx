'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Activity, ArrowLeft, CheckCircle, Play, RefreshCw, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { MediaPipeEngine as EngineType } from '@/lib/vision/MediaPipeEngine'
import { LandmarkSmoother } from '@/lib/vision/geometry'
import {
  assessVideoCapture,
  createAnalysisState,
  runDeterministicRules,
  updateCaptureMetrics,
  type AnalysisState,
  type FeedbackEvent,
  LA,
} from '@/lib/vision/rules'
import { buildVideoAnalysisArtifacts } from '@/lib/video-analysis/reporting'
import { canonicalizeSportId, resolveVideoAnalysisProfile, type VideoAnalysisRole } from '@/lib/video-analysis/catalog'
import {
  formatClipDuration,
  formatClipResolution,
  loadClipMetadata,
  MAX_VIDEO_ANALYSIS_SECONDS,
  MIN_VIDEO_ANALYSIS_SECONDS,
  validateClipFile,
  validateClipMetadata,
  type ClipMetadata,
} from '@/lib/video-analysis/clipValidation'

type ProfileState = {
  role: VideoAnalysisRole
  position: string | null
}

interface Props {
  role: VideoAnalysisRole
}

function cloneAnalysisState(state: AnalysisState): AnalysisState {
  return {
    ...state,
    issuesDetected: new Set(state.issuesDetected),
    feedbackLog: [...state.feedbackLog],
    visionFaults: [...state.visionFaults],
  }
}

function AnalyzeContent({ role }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedSport = canonicalizeSportId(searchParams?.get('sport') || '') || 'other'
  const profile = useMemo(() => resolveVideoAnalysisProfile(selectedSport), [selectedSport])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const engineRef = useRef<EngineType | null>(null)
  const smootherRef = useRef<LandmarkSmoother>(new LandmarkSmoother(3))
  const analysisRef = useRef<AnalysisState>(createAnalysisState(selectedSport))
  const reqRef = useRef<number>(0)
  const lastVideoTimeRef = useRef<number>(-1)

  const [userProfile, setUserProfile] = useState<ProfileState>({ role, position: null })
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isEngineReady, setIsEngineReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [engineError, setEngineError] = useState<string | null>(null)
  const [engineNotice, setEngineNotice] = useState<string | null>(null)
  const [engineMode, setEngineMode] = useState<'CPU' | 'GPU' | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [clipMetadata, setClipMetadata] = useState<ClipMetadata | null>(null)
  const [analysisState, setAnalysisState] = useState<AnalysisState>(createAnalysisState(selectedSport))
  const [activeFeedback, setActiveFeedback] = useState<FeedbackEvent | null>(null)
  const captureAssessment = useMemo(
    () => assessVideoCapture(analysisState, selectedSport),
    [analysisState, selectedSport]
  )
  const analysisUnavailable = Boolean(engineError) && !isEngineReady

  const backHref = `/${role}/scan`
  const dashboardHref = `/${role}/dashboard`

  const syncEngineStatus = useCallback((engine: EngineType) => {
    const status = engine.getStatus()

    setIsEngineReady(status.isReady)
    setEngineMode(status.delegate)

    if (status.delegate === 'CPU') {
      setEngineNotice(
        status.fallbackUsed
          ? 'Running in compatibility mode for this browser.'
          : 'Running in CPU compatibility mode on this device.'
      )
      return
    }

    setEngineNotice(null)
  }, [])

  const resetTrackedAnalysis = useCallback(() => {
    analysisRef.current = createAnalysisState(selectedSport)
    setAnalysisState(cloneAnalysisState(analysisRef.current))
    smootherRef.current.reset()
    setActiveFeedback(null)
    setProgress(0)
    setCaptureError(null)
    lastVideoTimeRef.current = -1
  }, [selectedSport])

  useEffect(() => {
    setClipMetadata(null)
    resetTrackedAnalysis()
  }, [resetTrackedAnalysis])

  useEffect(() => {
    let active = true

    const hydrateProfile = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !active) return

      const { data } = await supabase
        .from('profiles')
        .select('role, position')
        .eq('id', user.id)
        .maybeSingle()

      if (active && data) {
        setUserProfile({
          role: data.role === 'individual' ? 'individual' : 'athlete',
          position: data.position ? String(data.position) : null,
        })
      }
    }

    hydrateProfile()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  useEffect(() => {
    let active = true

    const init = async () => {
      try {
        setIsLoading(true)
        setEngineError(null)
        setEngineNotice(null)
        setIsEngineReady(false)
        const { MediaPipeEngine } = await import('@/lib/vision/MediaPipeEngine')
        const engine = MediaPipeEngine.getInstance()
        await engine.initialize()
        if (!active) return
        engineRef.current = engine
        syncEngineStatus(engine)
      } catch (error) {
        console.error('Failed to initialize MediaPipe engine', error)
        if (active) {
          setIsEngineReady(false)
          setEngineError('The video-analysis engine could not be started on this device.')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    init()

    return () => {
      active = false
      if (reqRef.current) cancelAnimationFrame(reqRef.current)
    }
  }, [syncEngineStatus])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileValidationError = validateClipFile(file)
    if (fileValidationError) {
      setCaptureError(fileValidationError)
      event.target.value = ''
      return
    }

    const url = URL.createObjectURL(file)

    try {
      const metadata = await loadClipMetadata(url)
      const metadataValidationError = validateClipMetadata(metadata)

      if (metadataValidationError) {
        URL.revokeObjectURL(url)
        setCaptureError(metadataValidationError)
        event.target.value = ''
        return
      }

      resetTrackedAnalysis()
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      setClipMetadata(metadata)
      setVideoUrl(url)
    } catch {
      URL.revokeObjectURL(url)
      setCaptureError('CREEDA could not read this video. Re-export it as MP4, MOV, or WEBM and try again')
      event.target.value = ''
    }
  }

  const syncVisibleState = useCallback(() => {
    setAnalysisState(cloneAnalysisState(analysisRef.current))
  }, [])

  const handleEngineRuntimeFailure = useCallback(
    (error: unknown) => {
      const engine = engineRef.current
      const errorMessage = error instanceof Error ? error.message : String(error)
      const looksGraphicsFailure = /activetexture|emscripten_gl|webgl|kgpuservice|startgraph failed/i.test(errorMessage)
      const canAttemptRecovery = Boolean(engine && looksGraphicsFailure)

      if (canAttemptRecovery) {
        console.warn('Video analysis frame failed, attempting compatibility fallback', error)
      } else {
        console.error('Video analysis frame failed', error)
      }
      setIsPlaying(false)
      setActiveFeedback(null)

      if (!engine) {
        setIsEngineReady(false)
        setEngineError('CREEDA could not continue the analysis on this device.')
        return
      }

      setIsLoading(true)

      void engine
        .recoverFromRuntimeFailure(error)
        .then((recovered) => {
          if (recovered) {
            syncEngineStatus(engine)
            setEngineError(null)
            resetTrackedAnalysis()

            const video = videoRef.current
            if (video) {
              video.currentTime = 0
              void video.play()
                .then(() => {
                  setIsPlaying(true)
                })
                .catch(() => {
                  setCaptureError('CREEDA switched to compatibility mode. Tap play to continue the scan.')
                })
            } else {
              setCaptureError('CREEDA switched to compatibility mode. Tap play to continue the scan.')
            }
            return
          }

          setIsEngineReady(false)
          setEngineError('CREEDA could not continue the analysis on this device.')
        })
        .finally(() => {
          setIsLoading(false)
        })
    },
    [resetTrackedAnalysis, syncEngineStatus]
  )

  const runAnalysisFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const engine = engineRef.current

    if (!video || !canvas || !engine || video.paused || video.ended) {
      setIsPlaying(false)
      return
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime

      const ctx = canvas.getContext('2d')
      if (ctx) {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        analysisRef.current.processedFrames += 1
        let result: ReturnType<EngineType['detect']>

        try {
          result = engine.detect(video, performance.now())
        } catch (error) {
          handleEngineRuntimeFailure(error)
          return
        }

        setProgress((video.currentTime / Math.max(video.duration || 1, 1)) * 100)

        if (result.landmarks && result.landmarks.length > 0) {
          const smoothed = smootherRef.current.smooth(result.landmarks[0])
          const current = analysisRef.current
          updateCaptureMetrics(smoothed, current)
          const feedback = runDeterministicRules(selectedSport, smoothed, current)

          if (feedback) {
            setActiveFeedback({ ...feedback, timestampMs: Math.round(video.currentTime * 1000) })
            if (feedback.isError) current.warnings += 1
            else current.positive += 1
            current.feedbackLog.push({ ...feedback, timestampMs: Math.round(video.currentTime * 1000) })
          }

          drawSkeletons(ctx, smoothed, canvas.width, canvas.height, feedback?.isError)
        }

        syncVisibleState()
      }
    }
  }, [handleEngineRuntimeFailure, selectedSport, syncVisibleState])

  useEffect(() => {
    if (isPlaying) {
      const step = () => {
        runAnalysisFrame()
        const video = videoRef.current
        if (video && !video.paused && !video.ended) {
          reqRef.current = requestAnimationFrame(step)
        }
      }

      reqRef.current = requestAnimationFrame(step)
    } else if (reqRef.current) {
      cancelAnimationFrame(reqRef.current)
    }

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current)
    }
  }, [isPlaying, runAnalysisFrame])

  const togglePlay = () => {
    if (!videoRef.current) return

    if (videoRef.current.paused) {
      void videoRef.current.play()
      setIsPlaying(true)
      return
    }

    videoRef.current.pause()
    setIsPlaying(false)
  }

  const handleSave = async () => {
    if (!captureAssessment.usable) {
      setCaptureError(captureAssessment.reason)
      return
    }

    setIsLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsLoading(false)
      router.push('/login')
      return
    }

    const snapshot = cloneAnalysisState(analysisRef.current)
    const structured = buildVideoAnalysisArtifacts({
      sportId: selectedSport,
      subjectRole: role,
      subjectPosition: userProfile.position,
      frameCount: snapshot.frameCount,
      warnings: snapshot.warnings,
      positive: snapshot.positive,
      issuesDetected: Array.from(snapshot.issuesDetected),
      feedbackLog: snapshot.feedbackLog,
      visionFaults: snapshot.visionFaults,
    })

    const baseInsert = {
      user_id: user.id,
      sport: structured.sportId,
      frame_count: snapshot.frameCount,
      warnings: snapshot.warnings,
      positive: snapshot.positive,
      issues_detected: Array.from(snapshot.issuesDetected),
      feedback_log: snapshot.feedbackLog,
    }

    const richInsert = {
      ...baseInsert,
      sport_label: structured.sportLabel,
      analyzer_family: structured.analyzerFamily,
      subject_role: structured.subjectRole,
      subject_position: structured.subjectPosition,
      vision_faults: snapshot.visionFaults,
      summary: structured.summary,
      recommendations: structured.recommendations,
    }

    let insertResult = await supabase.from('video_analysis_reports').insert(richInsert).select('*').single()

    if (insertResult.error) {
      console.warn('[video-analysis] rich report insert failed, falling back to base shape', insertResult.error)
      insertResult = await supabase.from('video_analysis_reports').insert(baseInsert).select('*').single()
    }

    if (snapshot.visionFaults.length > 0) {
      const faultRows = snapshot.visionFaults.map((fault) => ({
        user_id: user.id,
        sport: structured.sportId,
        fault: fault.fault,
        risk_mapping: fault.riskMapping,
        corrective_drills: fault.correctiveDrills,
        severity: fault.severity,
        session_date: new Date().toISOString(),
      }))

      const { error: faultError } = await supabase.from('vision_faults').insert(faultRows)
      if (faultError) {
        console.warn('[video-analysis] failed to persist vision faults', faultError)
      }
    }

    setIsLoading(false)

    if (insertResult.error || !insertResult.data?.id) {
      router.push(backHref)
      return
    }

    router.push(`${backHref}/report/${insertResult.data.id}`)
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] flex flex-col text-white">
      <div className="flex items-center justify-between px-5 pt-14 pb-4 bg-[var(--background)]/90 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <Link href={backHref} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{profile.sportLabel} Analysis</h1>
            <p className="text-[10px] text-white/45 font-medium">
              {profile.familyLabel} • {profile.captureView}
            </p>
            {isLoading ? (
              <p className="text-[10px] text-orange-300 flex items-center gap-1 font-semibold mt-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Loading engine...
              </p>
            ) : engineError ? (
              <p className="text-[10px] text-red-300 font-semibold mt-1">{engineError}</p>
            ) : engineNotice ? (
              <p className="text-[10px] text-amber-300 flex items-center gap-1 font-semibold mt-1">
                <CheckCircle className="h-3 w-3" /> {engineNotice}
              </p>
            ) : (
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold mt-1">
                <CheckCircle className="h-3 w-3" /> Engine ready{engineMode ? ` (${engineMode})` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 px-5 mt-2 overflow-hidden flex flex-col">
        {!videoUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/[0.08] rounded-3xl bg-white/[0.02] mb-10">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              data-testid="video-upload-input"
            />

            <div className="h-20 w-20 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
              <Upload className="h-10 w-10 text-orange-300" />
            </div>

            <h2 className="text-xl font-bold mb-2">Upload a short clip</h2>
            <p className="text-sm text-white/40 text-center max-w-[320px] mb-4 font-medium">
              {profile.shortPrompt}
            </p>
            <p className="text-[11px] text-white/35 text-center max-w-[320px] mb-6 leading-relaxed">
              Upload a {MIN_VIDEO_ANALYSIS_SECONDS}-{MAX_VIDEO_ANALYSIS_SECONDS} second MP4, MOV, or WEBM clip. CREEDA only saves clips when it can clearly detect one person, full-body visibility, and enough movement for the selected sport.
            </p>

            <div className="w-full max-w-[320px] rounded-2xl border border-white/[0.06] bg-black/20 p-4 mb-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Capture tips</p>
              <ul className="space-y-2 text-xs text-slate-300/80">
                {profile.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="text-orange-300 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || !isEngineReady}
              className="w-full max-w-[240px] h-14 rounded-full bg-orange-500 text-black font-bold text-base hover:brightness-110 disabled:opacity-50"
            >
              Select Video
            </Button>

            {captureError && (
              <div
                data-testid="capture-error"
                className="mt-4 w-full max-w-[320px] rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100"
              >
                {captureError}. Upload a clearer clip to continue.
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 relative">
            <div className="relative w-full flex-1 bg-black rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl">
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                controls={false}
                className="hidden"
                onEnded={() => setIsPlaying(false)}
              />

              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" />

              {activeFeedback && isPlaying && (
                <div
                  className={`absolute top-4 left-4 right-4 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl ${
                    activeFeedback.isError
                      ? 'bg-red-500/20 border-red-500/50 text-red-100'
                      : 'bg-green-500/20 border-green-500/50 text-green-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Activity className={`h-5 w-5 mt-0.5 shrink-0 ${activeFeedback.isError ? 'text-red-400' : 'text-green-400'}`} />
                    <p className="text-sm font-bold leading-snug">{activeFeedback.message}</p>
                  </div>
                </div>
              )}

              <button
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause analysis playback' : 'Play analysis'}
                disabled={analysisUnavailable}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 hover:bg-black/30 transition-colors group disabled:cursor-not-allowed disabled:bg-black/40"
              >
                {!isPlaying && (
                  <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                )}
              </button>

              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                <div className="h-full bg-orange-500 transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="mt-4 p-5 rounded-3xl bg-[var(--background-elevated)] border border-white/[0.04] shrink-0 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Session Analysis</h3>
                <span className="text-[10px] bg-white/5 text-white/50 px-2 py-1 rounded-full">{analysisState.frameCount} Tracked Frames</span>
              </div>

              {clipMetadata && (
                <div className="mb-4 flex flex-wrap gap-2 text-[10px] text-slate-300">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                    Clip {formatClipDuration(clipMetadata.durationSec)}
                  </span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                    Resolution {formatClipResolution(clipMetadata)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-white/40 font-semibold mb-1">Corrections</p>
                  <p className="text-2xl font-black text-red-400">{analysisState.warnings}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-white/40 font-semibold mb-1">Positive Reads</p>
                  <p className="text-2xl font-black text-emerald-300">{analysisState.positive}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {analysisState.visionFaults.slice(0, 3).map((fault) => (
                  <span
                    key={`${fault.fault}-${fault.severity}`}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/[0.08] bg-white/[0.03] text-slate-300"
                  >
                    {fault.fault}
                  </span>
                ))}
              </div>

              {analysisUnavailable && (
                <div
                  data-testid="capture-assessment"
                  className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
                    Analysis unavailable
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">This device could not start CREEDA&apos;s movement engine</p>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                    Try a supported mobile browser or another device with graphics acceleration enabled. CREEDA will not save a report from an unsupported analysis session.
                  </p>
                </div>
              )}

              {!analysisUnavailable && progress > 99 && (
                <div
                  data-testid="capture-assessment"
                  className={`mt-4 rounded-2xl border p-4 ${
                    captureAssessment.usable
                      ? 'border-emerald-500/20 bg-emerald-500/10'
                      : 'border-red-500/20 bg-red-500/10'
                  }`}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-[0.24em] ${
                      captureAssessment.usable ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {captureAssessment.usable ? 'Clip accepted' : 'Clip rejected'}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{captureAssessment.reason}</p>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">{captureAssessment.detail}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300">
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                      Pose {captureAssessment.poseCoveragePct}%
                    </span>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                      Full body {captureAssessment.fullBodyCoveragePct}%
                    </span>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                      Motion {captureAssessment.motionEvidence}
                    </span>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                      Pattern {captureAssessment.patternEvidence}
                    </span>
                  </div>
                </div>
              )}

              {captureError && (
                <div data-testid="capture-error" className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                  {captureError}. Upload a clearer clip to continue.
                </div>
              )}

              {(progress > 99 || analysisUnavailable) && (
                <Button
                  onClick={handleSave}
                  disabled={isLoading || analysisUnavailable || !captureAssessment.usable}
                  data-testid="save-video-report"
                  className="w-full mt-4 h-12 rounded-xl bg-white/[0.06] text-white font-bold text-sm hover:bg-white/10"
                >
                  {isLoading
                    ? 'Saving...'
                    : analysisUnavailable
                      ? 'Analysis unavailable on this device'
                      : captureAssessment.usable
                        ? 'Save Report & View Action Plan'
                        : 'Upload a usable clip to continue'}
                </Button>
              )}

              {(progress > 99 || analysisUnavailable) && (
                <Link
                  href={dashboardHref}
                  className="mt-3 block text-center text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Return to dashboard instead
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export function VideoAnalysisWorkspace(props: Props) {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[var(--background)] flex items-center justify-center text-white">Loading...</div>}>
      <AnalyzeContent {...props} />
    </Suspense>
  )
}

function drawSkeletons(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; visibility?: number }>,
  width: number,
  height: number,
  isError = false
) {
  // Neon-Desi Futurism: Chakra-Blue for normal, Saffron for error
  const primaryColor = isError ? '#FF5F1F' : '#00E5FF'
  const nodeColor = isError ? '#FF8C5A' : '#FFFFFF'

  // Add bloom/glow effect
  ctx.shadowBlur = 12
  ctx.shadowColor = primaryColor

  ctx.lineWidth = 5
  ctx.strokeStyle = primaryColor
  ctx.fillStyle = nodeColor

  const connections = [
    [LA.LEFT_SHOULDER, LA.RIGHT_SHOULDER],
    [LA.LEFT_SHOULDER, LA.LEFT_ELBOW],
    [LA.LEFT_ELBOW, LA.LEFT_WRIST],
    [LA.RIGHT_SHOULDER, LA.RIGHT_ELBOW],
    [LA.RIGHT_ELBOW, LA.RIGHT_WRIST],
    [LA.LEFT_SHOULDER, LA.LEFT_HIP],
    [LA.RIGHT_SHOULDER, LA.RIGHT_HIP],
    [LA.LEFT_HIP, LA.RIGHT_HIP],
    [LA.LEFT_HIP, LA.LEFT_KNEE],
    [LA.LEFT_KNEE, LA.LEFT_ANKLE],
    [LA.RIGHT_HIP, LA.RIGHT_KNEE],
    [LA.RIGHT_KNEE, LA.RIGHT_ANKLE],
  ]

  ctx.beginPath()
  connections.forEach(([i, j]) => {
    const p1 = landmarks[i]
    const p2 = landmarks[j]
    if (p1.visibility && p1.visibility < 0.5) return
    if (p2.visibility && p2.visibility < 0.5) return

    ctx.moveTo(p1.x * width, p1.y * height)
    ctx.lineTo(p2.x * width, p2.y * height)
  })
  ctx.stroke()

  // Reset shadow for nodes
  ctx.shadowBlur = 6
  ctx.shadowColor = primaryColor

  landmarks.forEach((point) => {
    if (point.visibility && point.visibility < 0.5) return
    ctx.beginPath()
    ctx.arc(point.x * width, point.y * height, 5, 0, Math.PI * 2)
    ctx.fill()
  })

  // Reset shadow
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
}
