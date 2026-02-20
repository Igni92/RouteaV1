/**
 * Color constants — GERVIFRAIS Driver App
 * AGENT-APP-DRIVER
 *
 * Supports both light and dark mode.
 * Dark mode is critical for night-shift drivers.
 */

// ── Brand colors ───────────────────────────────────────────────────────────────

export const PRIMARY   = '#22C55E';  // Green  — success, CTA, progress
export const SECONDARY = '#0EA5E9';  // Blue   — info, navigation
export const WARNING   = '#FBBF24';  // Amber  — delays, attention
export const ERROR     = '#DC2626';  // Red    — problems, failures

// ── Background ─────────────────────────────────────────────────────────────────

export const BG_DARK         = '#0F172A';  // Dark mode page background
export const BG_DARK_CARD    = '#1E293B';  // Dark mode card background
export const BG_DARK_INPUT   = '#334155';  // Dark mode input background
export const BG_LIGHT        = '#F8FAFC';  // Light mode page background
export const BG_LIGHT_CARD   = '#FFFFFF';  // Light mode card background

// ── Text ───────────────────────────────────────────────────────────────────────

export const TEXT_DARK   = '#F1F5F9';  // Text on dark backgrounds
export const TEXT_LIGHT  = '#1E293B';  // Text on light backgrounds
export const TEXT_MUTED  = '#94A3B8';  // Secondary/muted text (both modes)
export const TEXT_WHITE  = '#FFFFFF';  // Pure white text (on colored buttons)

// ── Border ─────────────────────────────────────────────────────────────────────

export const BORDER_DARK  = '#334155';
export const BORDER_LIGHT = '#E2E8F0';

// ── Semantic colors ────────────────────────────────────────────────────────────

export const STATUS_COMPLETED = PRIMARY;   // '#22C55E'
export const STATUS_IN_ROUTE  = SECONDARY; // '#0EA5E9'
export const STATUS_PENDING   = TEXT_MUTED;// '#94A3B8'
export const STATUS_FAILED    = ERROR;     // '#DC2626'
export const STATUS_DELAYED   = WARNING;   // '#FBBF24'

// ── Button sizes (used as height) ─────────────────────────────────────────────

export const BTN_HEIGHT_LG = 56;  // Primary action buttons (ARRIVÉ, NAVIGUER)
export const BTN_HEIGHT_MD = 50;  // Standard buttons
export const BTN_HEIGHT_SM = 44;  // Secondary / tertiary buttons

// ── Font sizes ─────────────────────────────────────────────────────────────────

export const FONT_XL  = 24;  // Screen titles
export const FONT_LG  = 20;  // Card titles, large labels
export const FONT_MD  = 16;  // Body text (minimum for driving readability)
export const FONT_SM  = 14;  // Secondary text
export const FONT_XS  = 12;  // Timestamps, muted labels

// ── Spacing ────────────────────────────────────────────────────────────────────

export const SPACE_XS = 4;
export const SPACE_SM = 8;
export const SPACE_MD = 16;
export const SPACE_LG = 20;
export const SPACE_XL = 32;

// ── Border radius ──────────────────────────────────────────────────────────────

export const RADIUS_SM = 8;
export const RADIUS_MD = 12;
export const RADIUS_LG = 16;
export const RADIUS_XL = 24;
export const RADIUS_FULL = 9999;

// ── Theme helper ───────────────────────────────────────────────────────────────

export interface Theme {
  bg: string;
  card: string;
  input: string;
  text: string;
  textMuted: string;
  border: string;
}

export function getTheme(colorScheme: 'light' | 'dark' | null | undefined): Theme {
  const isDark = colorScheme === 'dark';
  return {
    bg:        isDark ? BG_DARK        : BG_LIGHT,
    card:      isDark ? BG_DARK_CARD   : BG_LIGHT_CARD,
    input:     isDark ? BG_DARK_INPUT  : BG_LIGHT_CARD,
    text:      isDark ? TEXT_DARK      : TEXT_LIGHT,
    textMuted: TEXT_MUTED,
    border:    isDark ? BORDER_DARK    : BORDER_LIGHT,
  };
}
