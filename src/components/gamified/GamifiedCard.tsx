"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TOKENS } from "@/lib/design_system_lock";

interface GamifiedCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  accent?: keyof typeof TOKENS.COLORS.ACCENTS;
  hover?: boolean;
  glowColor?: string;
}

export const GamifiedCard: React.FC<GamifiedCardProps> = ({
  children,
  className,
  glow = false,
  accent = "PRIMARY",
  hover = true,
  glowColor,
}) => {
  const accentColor = glowColor || TOKENS.COLORS.ACCENTS[accent];
  
  return (
    <div
      className={cn(
        "relative rounded-[2rem] border border-white/[0.06] bg-[#111118]/80 backdrop-blur-xl overflow-hidden transition-all duration-500",
        hover && "hover:border-[var(--saffron)]/30 hover:bg-[#111118] group",
        glow && "shadow-2xl",
        className
      )}
      style={{
        boxShadow: (glow || glowColor) ? `0 0 30px ${accentColor}${glowColor ? '30' : '20'}` : undefined,
      } as React.CSSProperties}
    >
      {/* Neon-Desi Accent Line */}
      <div 
        className="absolute top-0 left-0 w-full h-[2px] opacity-20 group-hover:opacity-80 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
      
      {/* Corner Accent */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-25 transition-opacity">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M0 1H19V20" stroke={accentColor} strokeWidth="2"/>
        </svg>
      </div>

      <div className="relative z-10 p-6 md:p-8">
        {children}
      </div>
    </div>
  );
};
