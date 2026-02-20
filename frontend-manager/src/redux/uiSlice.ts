/**
 * uiSlice — Redux state for UI interactions (selected items, modals, toasts)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Toast {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface UIState {
  selectedRouteId: string | null;
  selectedDriverId: string | null;
  selectedDeliveryId: string | null;
  isDriverModalOpen: boolean;
  selectedDate: string;        // "YYYY-MM-DD"
  sidebarCollapsed: boolean;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  wsStatus: 'disconnected' | 'connecting' | 'connected';
  toasts: Toast[];
}

const today = format(new Date(), 'yyyy-MM-dd');

const initialState: UIState = {
  selectedRouteId: null,
  selectedDriverId: null,
  selectedDeliveryId: null,
  isDriverModalOpen: false,
  selectedDate: today,
  sidebarCollapsed: false,
  mapCenter: { lat: 48.7627, lng: 2.3486 }, // GERVIFRAIS HQ
  mapZoom: 10,
  wsStatus: 'disconnected',
  toasts: [],
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    selectRoute(state, action: PayloadAction<string | null>) {
      state.selectedRouteId = action.payload;
    },

    openDriverModal(state, action: PayloadAction<string>) {
      state.selectedDriverId = action.payload;
      state.isDriverModalOpen = true;
    },

    closeDriverModal(state) {
      state.isDriverModalOpen = false;
      state.selectedDriverId = null;
    },

    selectDelivery(state, action: PayloadAction<string | null>) {
      state.selectedDeliveryId = action.payload;
    },

    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
    },

    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },

    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },

    setMapView(state, action: PayloadAction<{ lat: number; lng: number; zoom?: number }>) {
      state.mapCenter = { lat: action.payload.lat, lng: action.payload.lng };
      if (action.payload.zoom !== undefined) state.mapZoom = action.payload.zoom;
    },

    setWsStatus(state, action: PayloadAction<'disconnected' | 'connecting' | 'connected'>) {
      state.wsStatus = action.payload;
    },

    showToast(state, action: PayloadAction<Toast>) {
      // Limit to 5 toasts max
      if (state.toasts.length >= 5) state.toasts.shift();
      state.toasts.push(action.payload);
    },

    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },

    clearAllToasts(state) {
      state.toasts = [];
    },
  },
});

export const {
  selectRoute,
  openDriverModal,
  closeDriverModal,
  selectDelivery,
  setSelectedDate,
  toggleSidebar,
  setSidebarCollapsed,
  setMapView,
  setWsStatus,
  showToast,
  dismissToast,
  clearAllToasts,
} = uiSlice.actions;

export default uiSlice.reducer;
