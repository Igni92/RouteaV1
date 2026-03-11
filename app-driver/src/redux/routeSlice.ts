/**
 * routeSlice — Current route order + GPS tracking state
 * AGENT-APP-DRIVER
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Route, RouteStatus } from '@shared/types';
import { getRouteForDriver, updateRouteStatus } from '../services/api';
import { STORAGE_KEYS } from '../services/api';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RouteState {
  current: Route | null;
  deliveriesOrdered: string[];
  status: RouteStatus | null;
  startedAt: string | null;
  completedAt: string | null;
  gpsSequence: number;
  isTrackingGps: boolean;
  loadingStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ── Initial state ──────────────────────────────────────────────────────────────

const initialState: RouteState = {
  current: null,
  deliveriesOrdered: [],
  status: null,
  startedAt: null,
  completedAt: null,
  gpsSequence: 0,
  isTrackingGps: false,
  loadingStatus: 'idle',
  error: null,
};

// ── Thunks ─────────────────────────────────────────────────────────────────────

export const fetchRoute = createAsyncThunk(
  'route/fetch',
  async (driverId: string) => {
    const date = format(new Date(), 'yyyy-MM-dd');
    const route = await getRouteForDriver(driverId, date);
    if (route) {
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTE, JSON.stringify(route));
    }
    return route;
  },
);

export const loadCachedRoute = createAsyncThunk(
  'route/loadCached',
  async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ROUTE);
    return raw ? (JSON.parse(raw) as Route) : null;
  },
);

export const startRoute = createAsyncThunk(
  'route/start',
  async (routeId: string) => {
    const startedAt = new Date().toISOString();
    await updateRouteStatus(routeId, 'in_progress', startedAt);
    return startedAt;
  },
);

export const completeRoute = createAsyncThunk(
  'route/complete',
  async (routeId: string) => {
    const completedAt = new Date().toISOString();
    await updateRouteStatus(routeId, 'completed', undefined, completedAt);
    return completedAt;
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────────

const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    setDeliveriesOrdered(state, action: PayloadAction<string[]>) {
      state.deliveriesOrdered = action.payload;
    },
    incrementGpsSequence(state) {
      state.gpsSequence += 1;
    },
    setGpsTracking(state, action: PayloadAction<boolean>) {
      state.isTrackingGps = action.payload;
    },
    resetRoute() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoute.pending, (state) => {
        state.loadingStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchRoute.fulfilled, (state, action) => {
        state.loadingStatus = 'succeeded';
        if (action.payload) {
          state.current = action.payload;
          state.deliveriesOrdered = action.payload.deliveries_ordered;
          state.status = action.payload.status;
          state.startedAt = action.payload.started_at;
          state.completedAt = action.payload.completed_at;
        }
      })
      .addCase(fetchRoute.rejected, (state, action) => {
        state.loadingStatus = 'failed';
        state.error = action.error.message ?? 'Failed to fetch route';
      })
      .addCase(loadCachedRoute.fulfilled, (state, action) => {
        if (action.payload && !state.current) {
          state.current = action.payload;
          state.deliveriesOrdered = action.payload.deliveries_ordered;
          state.status = action.payload.status;
          state.loadingStatus = 'succeeded';
        }
      })
      .addCase(startRoute.fulfilled, (state, action) => {
        state.status = 'in_progress';
        state.startedAt = action.payload;
        state.isTrackingGps = true;
        if (state.current) {
          state.current.status = 'in_progress';
          state.current.started_at = action.payload;
        }
      })
      .addCase(completeRoute.fulfilled, (state, action) => {
        state.status = 'completed';
        state.completedAt = action.payload;
        state.isTrackingGps = false;
        if (state.current) {
          state.current.status = 'completed';
          state.current.completed_at = action.payload;
        }
      });
  },
});

export const {
  setDeliveriesOrdered,
  incrementGpsSequence,
  setGpsTracking,
  resetRoute,
} = routeSlice.actions;

export default routeSlice.reducer;
