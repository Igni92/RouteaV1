/**
 * deliveriesSlice — Today's deliveries + statuses + current index
 * AGENT-APP-DRIVER
 *
 * Statuses are tracked separately for optimistic updates while offline.
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeliveryWithWindow, DeliveryStatus, DeliveryEventType } from '@shared/types';
import { getDeliveriesForRoute, postDeliveryEvent } from '../services/api';
import { STORAGE_KEYS } from '../services/api';
import { queueDeliveryEvent, getIsOnline } from '../services/offlineService';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DeliveriesState {
  items: DeliveryWithWindow[];
  statuses: Record<string, DeliveryStatus>;  // optimistic overrides
  currentIndex: number;
  date: string;
  loadingStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ── Initial state ──────────────────────────────────────────────────────────────

const initialState: DeliveriesState = {
  items: [],
  statuses: {},
  currentIndex: 0,
  date: format(new Date(), 'yyyy-MM-dd'),
  loadingStatus: 'idle',
  error: null,
};

// ── Thunks ─────────────────────────────────────────────────────────────────────

export const fetchDeliveries = createAsyncThunk(
  'deliveries/fetch',
  async (routeId: string) => {
    const deliveries = await getDeliveriesForRoute(routeId);
    await AsyncStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(deliveries));
    return deliveries;
  },
);

export const loadCachedDeliveries = createAsyncThunk(
  'deliveries/loadCached',
  async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DELIVERIES);
    return raw ? (JSON.parse(raw) as DeliveryWithWindow[]) : [];
  },
);

export const markDeliveryArrived = createAsyncThunk(
  'deliveries/markArrived',
  async (payload: {
    deliveryId: string;
    driverId: string;
    routeId: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const eventPayload = {
      driver_id: payload.driverId,
      route_id: payload.routeId,
      latitude: payload.latitude,
      longitude: payload.longitude,
    };

    if (getIsOnline()) {
      await postDeliveryEvent(payload.deliveryId, 'arrived', eventPayload);
    } else {
      await queueDeliveryEvent({
        deliveryId: payload.deliveryId,
        eventType: 'arrived',
        ...eventPayload,
        timestamp: new Date().toISOString(),
      });
    }

    return payload.deliveryId;
  },
);

export const markDeliveryCompleted = createAsyncThunk(
  'deliveries/markCompleted',
  async (payload: {
    deliveryId: string;
    driverId: string;
    routeId: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const eventPayload = {
      driver_id: payload.driverId,
      route_id: payload.routeId,
      latitude: payload.latitude,
      longitude: payload.longitude,
    };

    if (getIsOnline()) {
      await postDeliveryEvent(payload.deliveryId, 'completed', eventPayload);
    } else {
      await queueDeliveryEvent({
        deliveryId: payload.deliveryId,
        eventType: 'completed',
        ...eventPayload,
        timestamp: new Date().toISOString(),
      });
    }

    return payload.deliveryId;
  },
);

export const reportProblem = createAsyncThunk(
  'deliveries/reportProblem',
  async (payload: {
    deliveryId: string;
    driverId: string;
    routeId: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const eventPayload = {
      driver_id: payload.driverId,
      route_id: payload.routeId,
      notes: payload.notes,
      latitude: payload.latitude,
      longitude: payload.longitude,
    };

    if (getIsOnline()) {
      await postDeliveryEvent(payload.deliveryId, 'problem', eventPayload);
    } else {
      await queueDeliveryEvent({
        deliveryId: payload.deliveryId,
        eventType: 'problem',
        ...eventPayload,
        timestamp: new Date().toISOString(),
      });
    }

    return payload.deliveryId;
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────────

const deliveriesSlice = createSlice({
  name: 'deliveries',
  initialState,
  reducers: {
    setCurrentIndex(state, action: PayloadAction<number>) {
      state.currentIndex = action.payload;
    },
    advanceToNext(state) {
      const nextIncomplete = state.items.findIndex((d, idx) => {
        if (idx <= state.currentIndex) return false;
        const status = state.statuses[d.id] ?? d.status;
        return status !== 'completed' && status !== 'failed';
      });
      if (nextIncomplete !== -1) {
        state.currentIndex = nextIncomplete;
      }
    },
    setDeliveryStatus(state, action: PayloadAction<{ id: string; status: DeliveryStatus }>) {
      state.statuses[action.payload.id] = action.payload.status;
    },
    setDate(state, action: PayloadAction<string>) {
      state.date = action.payload;
    },
    resetDeliveries() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveries.pending, (state) => {
        state.loadingStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchDeliveries.fulfilled, (state, action) => {
        state.loadingStatus = 'succeeded';
        state.items = action.payload;
        // Reset statuses (server is source of truth)
        state.statuses = {};
        // Find first non-completed as current
        const firstPending = action.payload.findIndex(
          (d) => d.status !== 'completed' && d.status !== 'failed',
        );
        state.currentIndex = firstPending >= 0 ? firstPending : 0;
      })
      .addCase(fetchDeliveries.rejected, (state, action) => {
        state.loadingStatus = 'failed';
        state.error = action.error.message ?? 'Failed to fetch deliveries';
      })
      .addCase(loadCachedDeliveries.fulfilled, (state, action) => {
        if (action.payload.length > 0 && state.items.length === 0) {
          state.items = action.payload;
          state.loadingStatus = 'succeeded';
        }
      })
      .addCase(markDeliveryArrived.fulfilled, (state, action) => {
        state.statuses[action.payload] = 'arrived';
      })
      .addCase(markDeliveryCompleted.fulfilled, (state, action) => {
        state.statuses[action.payload] = 'completed';
      })
      .addCase(reportProblem.fulfilled, (state, action) => {
        state.statuses[action.payload] = 'failed';
      });
  },
});

export const {
  setCurrentIndex,
  advanceToNext,
  setDeliveryStatus,
  setDate,
  resetDeliveries,
} = deliveriesSlice.actions;

export default deliveriesSlice.reducer;
