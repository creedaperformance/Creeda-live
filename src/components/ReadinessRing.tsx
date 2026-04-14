'use client'

import { useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { Zap, Activity, ShieldAlert, Loader2 } from 'lucide-react'

interface ReadinessRingProps {
  score: number;         
  status?: string;       
  isLoading?: boolean;
}

export const ReadinessRing = memo(function ReadinessRing({ 
  score, 
  status = 'Syncing',
  isLoading = false
}: ReadinessRingProps) {
  
  const statusColor = useMemo(() => {
    if (score >= 80) return 'text-[var(--chakra-neon)]'; 
    if (score >= 60) return 'text-[var(--saffron)]';
    return 'text-red-400';
  }, [score]);

  const glowColor = useMemo(() => {
    if (score >= 80) return 'var(--chakra-glow)';
    if (score >= 60) return 'var(--saffron-glow)';
    return 'rgba(239,68,68,0.35)';
  }, [score]);

  if (isLoading) {
    return (
      <div className="relative h-64 w-64 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-[var(--saffron)] animate-spin" />
        <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-[var(--saffron)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Outer glow */}
      <div
        className="absolute inset-[-8px] rounded-full opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
      />

      <svg className="h-64 w-64 transform -rotate-90">
        <circle
          cx="128"
          cy="128"
          r="90"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="12"
          fill="transparent"
        />
        <motion.circle
          cx="128"
          cy="128"
          r="90"
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray="565.48"
          initial={{ strokeDashoffset: 565.48 }}
          animate={{ strokeDashoffset: 565.48 - (565.48 * score / 100) }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          className={statusColor}
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 mb-1">
           {score >= 80 ? (
             <Zap className="h-4 w-4 text-[var(--chakra-neon)]" />
           ) : score >= 60 ? (
             <Activity className="h-4 w-4 text-[var(--saffron)]" />
           ) : (
             <ShieldAlert className="h-4 w-4 text-red-400" />
           )}
           <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Live Status</span>
        </div>
        
        <div className="flex items-baseline">
          <span className="text-6xl font-black text-white tracking-tight">
            {score}
          </span>
          <span className="text-xl text-white/30 ml-1">%</span>
        </div>
        
        <div className="mt-3 px-3 py-1 rounded-full bg-[#111118] border border-white/[0.08]">
           <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
              {status}
           </span>
        </div>
      </div>
    </div>
  )
});
