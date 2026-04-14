/**
 * CREEDA DESIGN SYSTEM LOCK
 * Version: 3.0 — Neon-Desi Futurism
 * 
 * Dark void base + glowing saffron/orange + chakra-blue gradients
 * + subtle cricket/kabaddi energy. Sports science meets 2026 gaming + Reels.
 *
 * Any UI changes to these tokens must go through a formal override process.
 */

export const DESIGN_LOCK = {
  VERSION: "3.0",
  LAST_SYNC: "2026-04-14",
  AESTHETIC: "NEON_DESI_FUTURISM",
  THEME_STATUS: "LOCKED",
};

export const TOKENS = {
  COLORS: {
    BACKGROUND: {
      DEFAULT: "#0A0A0E",   // Void 900
      SECONDARY: "#111118", // Void 800
      TERTIARY: "#1A1A24",  // Void 700
      GLASS: "rgba(17, 17, 24, 0.6)",
    },
    ACCENTS: {
      PRIMARY: "#FF5F1F",   // Saffron Glow — primary action, energy, streaks
      SECONDARY: "#00E5FF", // Chakra Neon — recovery, analytics, tech
      EMERALD: "#1DB954",   // Success / Optimal
      ORANGE: "#FF8C5A",    // Saffron Muted / Secondary text accent
      RED: "#EF4444",       // High Risk / Error
      DEEP_BLUE: "#0055FF", // Deep gradient anchor
    },
    TEXT: {
      HEADER: "#FFFFFF",
      BODY: "#94A3B8",       // Slate 400
      MUTED: "#64748B",      // Slate 500
    },
    BORDER: {
      DEFAULT: "rgba(255, 255, 255, 0.06)",
      ACTIVE: "#FF5F1F",
      ALERT: "rgba(255, 95, 31, 0.5)",
    }
  },
  TYPOGRAPHY: {
    HEADER_FONT: "var(--font-poppins)",
    BODY_FONT: "var(--font-poppins)",
    HINDI_FONT: "var(--font-noto-devanagari)",
    HEADER_WEIGHT: "900",
    BODY_WEIGHT: "400",
    LETTER_SPACING_HEADER: "-0.02em",
    LETTER_SPACING_HUD: "0.24em",
  },
  SPACING: {
    RADIUS_CARD: "2rem",
    RADIUS_BUTTON: "1rem",
    GAP_DASHBOARD: "2rem",
  },
  EFFECTS: {
    GLOW_SAFFRON: "0 0 15px rgba(255, 95, 31, 0.4)",
    GLOW_CHAKRA: "0 0 15px rgba(0, 229, 255, 0.4)",
    GLOW_EMERALD: "0 0 20px rgba(29, 185, 84, 0.3)",
    GLOW_RED: "0 0 20px rgba(239, 68, 68, 0.3)",
    GLOW_PRIMARY: "0 0 20px rgba(255, 95, 31, 0.3)",
  },
  GRADIENTS: {
    DESI_AURA: "linear-gradient(135deg, #FF5F1F 0%, #0055FF 100%)",
    READINESS_SURGE: "linear-gradient(to top, #0A0A0E, #FF5F1F)",
    CHAKRA: "linear-gradient(135deg, #00E5FF 0%, #0055FF 100%)",
    GLASS: "linear-gradient(114.9deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
  }
};

/**
 * Design Override Hook (For future expansion ONLY)
 * Use case: Explicit role-based overrides if absolutely necessary.
 */
export const validateUIChange = (tokenKey: string, overrideFlag: boolean = false) => {
  if (!overrideFlag) {
    console.warn(`[DESIGN_LOCK] Attempted to modify ${tokenKey} without override flag. Reverting to Neon-Desi Futurism standard.`);
    return false;
  }
  return true;
};
