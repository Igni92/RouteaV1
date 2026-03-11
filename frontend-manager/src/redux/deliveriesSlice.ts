/**
 * deliveriesSlice — Redux state for deliveries
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { DeliveryWithWindow, DeliveryStatus, WsDeliveryUpdate } from '@shared/types';
import { deliveriesApi } from '../services/apiClient';

// ── State shape ───────────────────────────────────────────────────────────────

export interface DeliveriesState {
  items: DeliveryWithWindow[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: DeliveriesState = {
  items: [],
  status: 'idle',
  error: null,
};

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchDeliveries = createAsyncThunk(
  'deliveries/fetchAll',
  async (params: { route_id?: string; date?: string; status?: string } = {}) => {
    const result = await deliveriesApi.list({ ...params, per_page: 200 });
    return result.data;
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const deliveriesSlice = createSlice({
  name: 'deliveries',
  initialState,
  reducers: {
    /**
     * Called when a WsDeliveryUpdate message arrives from WebSocket.
     * Updates a single delivery's status in place.
     */
    updateDeliveryStatus(state, action: PayloadAction<WsDeliveryUpdate>) {
      const { delivery_id, status } = action.payload;
      const idx = state.items.findIndex((d) => d.id === delivery_id);
      if (idx !== -1) {
        state.items[idx] = { ...state.items[idx], status };
      }
    },

    /** Replace the entire deliveries list (used after route optimization) */
    setDeliveries(state, action: PayloadAction<DeliveryWithWindow[]>) {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveries.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDeliveries.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchDeliveries.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to fetch deliveries';
      });
  },
});

export const { updateDeliveryStatus, setDeliveries } = deliveriesSlice.actions;
export default deliveriesSlice.reducer;
