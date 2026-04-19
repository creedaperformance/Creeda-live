"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiBurstProps {
  trigger: boolean;
  colors?: string[];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
}

const DEFAULT_COLORS = ["#FF5F1F", "#00E5FF", "#FF8C5A", "#0055FF", "#1DB954", "#FFFFFF"];

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  trigger,
  colors = DEFAULT_COLORS,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idCounter = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const burst = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const newParticles: Particle[] = [];
    for (let i = 0; i < 16; i++) {
      idCounter.current += 1;
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.5;
      const distance = 40 + Math.random() * 80;
      newParticles.push({
        id: idCounter.current,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        delay: Math.random() * 0.15,
      });
    }
    setParticles(newParticles);

    timeoutRef.current = setTimeout(() => {
      setParticles([]);
      timeoutRef.current = null;
    }, 800);
  }, [colors]);

  // Trigger on prop change
  const lastTrigger = useRef(false);

  useEffect(() => {
    if (trigger && !lastTrigger.current) {
      lastTrigger.current = true;
      const frame = window.requestAnimationFrame(() => {
        burst();
      });

      return () => window.cancelAnimationFrame(frame);
    }

    if (!trigger) {
      lastTrigger.current = false;
    }
  }, [burst, trigger]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: p.delay, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 6px ${p.color}`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
