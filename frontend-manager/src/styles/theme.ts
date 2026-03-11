/**
 * GERVIFRAIS — Design Tokens & Theme
 * Used by all components for consistent styling.
 * Mirrors Tailwind config values for use in JS contexts (Mapbox, etc.)
 */

// ── Color Palette ─────────────────────────────────────────────────────────────

export const colors = {
  primary:   '#22C55E',  // green  — completed, online driver
  secondary: '#0EA5E9',  // blue   — in_route, actions, buttons
  warning:   '#FBBF24',  // amber  — delayed, at site
  error:     '#DC2626',  // red    — failed, incident, offline
  text:      '#1F2937',  // dark gray — main body text
  textMuted: '#6B7280',  // gray   — secondary/helper text
  bg:        '#F3F4F6',  // very light gray — page background
  surface:   '#FFFFFF',  // white  — card / panel backgrounds
  border:    '#E5E7EB',  // light gray — dividers, borders
} as const;

// ── Status → Color + Icon mapping ────────────────────────────────────────────

import type { DeliveryStatus, RouteStatus } from '@shared/types';

export interface StatusStyle {
  color: string;
  bgClass: string;
  textClass: string;
  icon: string;
  label: string;
}

export const deliveryStatusStyles: Record<DeliveryStatus, StatusStyle> = {
  completed: {
    color: colors.primary,
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    icon: '✅',
    label: 'Livré',
  },
  in_route: {
    color: colors.secondary,
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    icon: '🔵',
    label: 'En route',
  },
  arrived: {
    color: colors.secondary,
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    icon: '📍',
    label: 'Sur place',
  },
  pending: {
    color: colors.textMuted,
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-500',
    icon: '⏱️',
    label: 'À faire',
  },
  assigned: {
    color: colors.textMuted,
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-500',
    icon: '📋',
    label: 'Assigné',
  },
  failed: {
    color: colors.error,
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    icon: '❌',
    label: 'Échoué',
  },
};

export const routeStatusStyles: Record<RouteStatus, StatusStyle> = {
  planned: {
    color: colors.textMuted,
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    icon: '📋',
    label: 'Planifiée',
  },
  in_progress: {
    color: colors.secondary,
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    icon: '🚗',
    label: 'En cours',
  },
  completed: {
    color: colors.primary,
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    icon: '✅',
    label: 'Terminée',
  },
};

// ── KPI Card configs ──────────────────────────────────────────────────────────

export type KPIColor = 'primary' | 'secondary' | 'warning' | 'error' | 'muted';

export const kpiColorMap: Record<KPIColor, { bg: string; text: string; border: string }> = {
  primary:   { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  secondary: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  warning:   { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  error:     { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  muted:     { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200' },
};

// ── Map constants ─────────────────────────────────────────────────────────────

export const mapDefaults = {
  center: [2.3486, 48.7627] as [number, number],  // GERVIFRAIS HQ — Chevilly-Larue
  zoom: 10,
  style: 'mapbox://styles/mapbox/streets-v12',
};

export const driverMarkerColors = {
  online_delivering: colors.primary,   // green — active
  online_idle:       colors.secondary, // blue  — online but not delivering
  offline:           colors.textMuted, // gray  — no recent GPS ping
};

// ── Spacing ───────────────────────────────────────────────────────────────────

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

// ── Typography ────────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  sizes: {
    xs:  '0.75rem',   // 12px
    sm:  '0.875rem',  // 14px
    base:'1rem',      // 16px
    lg:  '1.125rem',  // 18px
    xl:  '1.25rem',   // 20px
    '2xl':'1.5rem',   // 24px
  },
  weights: {
    normal:   '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
} as const;

// ── Breakpoints ───────────────────────────────────────────────────────────────

export const breakpoints = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1536px',
} as const;

// ── Layout constants ──────────────────────────────────────────────────────────

export const layout = {
  navbarHeight: '56px',
  rightPanelWidth: '380px',
  rightPanelWidthTablet: '300px',
} as const;
