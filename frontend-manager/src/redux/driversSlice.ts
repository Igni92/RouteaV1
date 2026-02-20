/**
 * driversSlice — Redux state for drivers + real-time GPS locations
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Driver, RedisDriverLocation, WsDriverLocation } from '@shared/types';
import { driversApi } from '../services/apiClient';

// ── State shape ───────────────────────────────────────────────────────────────

export interface DriversState {
  items: Driver[];
  /** driver_id → latest GPS from WebSocket / Redis */
  locations: Record<string, RedisDriverLocation>;
  /** driver_id → is recently online (TTL-based) */
  onlineStatus: Record<string, boolean>;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: DriversState = {
  items: [],
  locations: {},
  onlineStatus: {},
  status: 'idle',
  error: null,
};

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchDrivers = createAsyncThunk('drivers/fetchAll', async () => {
  const result = await driversApi.list({ is_active: true, per_page: 100 });
  return result.data;
});

// ── Slice ─────────────────────────────────────────────────────────────────────

const driversSlice = createSlice({
  name: 'drivers',
  initialState,
  reducers: {
    /** Called when a WsDriverLocation message arrives from WebSocket */
    updateDriverLocation(state, action: PayloadAction<WsDriverLocation>) {
      const msg = action.payload;
      const existing = state.locations[msg.driver_id];

      // Sequence deduplication: reject stale updates
      if (existing && msg.sequence <= existing.sequence) {
        // Detect sequence reset (app restart)
        const diff = existing.sequence - msg.sequence;
        if (diff <= 1000) return; // stale — discard
        // else: sequence reset — accept
      }

      state.locations[msg.driver_id] = {
        driver_id: msg.driver_id,
        lat: msg.lat,
        lng: msg.lng,
        accuracy: msg.accuracy,
        speed: msg.speed,
        sequence: msg.sequence,
        timestamp: msg.timestamp,
        route_id: null,
      };
      state.onlineStatus[msg.driver_id] = true;
    },

    /** Mark a driver offline (called after TTL period with no GPS update) */
    markDriverOffline(state, action: PayloadAction<string>) {
      state.onlineStatus[action.payload] = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDrivers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDrivers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchDrivers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to fetch drivers';
      });
  },
});

export const { updateDriverLocation, markDriverOffline } = driversSlice.actions;
export default driversSlice.reducer;
