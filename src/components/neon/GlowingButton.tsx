"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "saffron" | "chakra";
  size?: "sm" | "md" | "lg";
}

export const GlowingButton: React.FC<GlowingButtonProps> = ({
  children,
  variant = "saffron",
  size = "md",
  className,
  ...props
}) => {
  const isSaffron = variant === "saffron";

  const sizeStyles = {
    sm: "px-5 py-2.5 text-[10px]",
    md: "px-7 py-3.5 text-xs",
    lg: "px-9 py-4.5 text-sm",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="inline-block"
    >
      <button
        className={cn(
          "relative overflow-hidden rounded-2xl border font-bold tracking-wider uppercase transition-all duration-300",
          "bg-[var(--void-900,#0A0A0E)]",
          isSaffron
            ? "border-[var(--saffron)]/40 text-[var(--saffron)] hover:shadow-[0_0_25px_rgba(255,95,31,0.4)]"
            : "border-[var(--chakra-neon)]/40 text-[var(--chakra-neon)] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)]",
          sizeStyles[size],
          "disabled:opacity-50 disabled:pointer-events-none",
          className
        )}
        {...props}
      >
        {/* Hover shimmer overlay */}
        <div className="absolute inset-0 bg-white/[0.03] opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </button>
    </motion.div>
  );
};
