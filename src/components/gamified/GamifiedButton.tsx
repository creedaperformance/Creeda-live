"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TOKENS } from "@/lib/design_system_lock";

interface GamifiedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "PRIMARY" | "GHOST" | "OUTLINE" | "EMERALD" | "ORANGE" | "RED" | "SECONDARY" | "CHAKRA";
  size?: "SM" | "MD" | "LG" | "XL";
  glow?: boolean;
}

export const GamifiedButton: React.FC<GamifiedButtonProps> = ({
  children,
  className,
  variant = "PRIMARY",
  size = "MD",
  glow = true,
  ...props
}) => {
  const variantStyles = {
    PRIMARY: "bg-[var(--saffron)] text-black hover:brightness-110 border-[var(--saffron)]/30",
    SECONDARY: "bg-[#1A1A24] text-slate-200 border-white/[0.08] hover:bg-[#111118]",
    CHAKRA: "bg-[var(--chakra-neon)]/10 text-[var(--chakra-neon)] border-[var(--chakra-neon)]/30 hover:bg-[var(--chakra-neon)]/20",
    EMERALD: "bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-400/30",
    ORANGE: "bg-[var(--saffron)] text-black hover:brightness-110 border-[var(--saffron)]/30",
    RED: "bg-red-600 text-white hover:bg-red-500 border-red-400/30",
    GHOST: "bg-transparent text-white/70 hover:bg-white/5 border-transparent",
    OUTLINE: "bg-transparent text-white border-white/[0.08] hover:border-[var(--saffron)]/30 hover:bg-[var(--saffron)]/5",
  };

  const sizeStyles = {
    SM: "px-4 py-2 text-xs",
    MD: "px-6 py-3 text-sm",
    LG: "px-8 py-4 text-base",
    XL: "px-10 py-5 text-lg font-black tracking-widest uppercase",
  };

  const glowMap: Record<string, string | undefined> = {
    PRIMARY: TOKENS.EFFECTS.GLOW_SAFFRON,
    CHAKRA: TOKENS.EFFECTS.GLOW_CHAKRA,
    EMERALD: TOKENS.EFFECTS.GLOW_EMERALD,
    ORANGE: TOKENS.EFFECTS.GLOW_SAFFRON,
    RED: TOKENS.EFFECTS.GLOW_RED,
  };

  const glowShadow = glowMap[variant];

  return (
    <button
      className={cn(
        "relative rounded-2xl border transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none group overflow-hidden",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      style={glow && glowShadow ? { boxShadow: glowShadow } : undefined}
      {...props}
    >
      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>
      
      {/* Hover reflection */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
};
