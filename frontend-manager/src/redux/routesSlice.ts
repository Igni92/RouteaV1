/**
 * routesSlice — Redux state for route management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Route, RouteWithDetails, CreateRouteInput } from '@shared/types';
import { routesApi } from '../services/apiClient';

// ── State shape ───────────────────────────────────────────────────────────────

export interface RoutesState {
  items: RouteWithDetails[];
  selectedId: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastFetched: string | null;
  optimizing: boolean;
  optimizationError: string | null;
}

const initialState: RoutesState = {
  items: [],
  selectedId: null,
  status: 'idle',
  error: null,
  lastFetched: null,
  optimizing: false,
  optimizationError: null,
};

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchRoutes = createAsyncThunk(
  'routes/fetchAll',
  async (params: { date?: string; status?: string } = {}) => {
    const result = await routesApi.list({ ...params, per_page: 50 });
    return result.data;
  },
);

export const createRoute = createAsyncThunk(
  'routes/create',
  async (input: CreateRouteInput) => {
    return routesApi.create(input);
  },
);

export const optimizeRoute = createAsyncThunk(
  'routes/optimize',
  async ({ id, deliveryIds, numDrivers }: { id: string; deliveryIds: string[]; numDrivers?: number }) => {
    const result = await routesApi.optimize(id, deliveryIds, numDrivers);
    return result;
  },
);

export const deleteRoute = createAsyncThunk(
  'routes/delete',
  async (id: string) => {
    await routesApi.delete(id);
    return id;
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const routesSlice = createSlice({
  name: 'routes',
  initialState,
  reducers: {
    selectRoute(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    clearError(state) {
      state.error = null;
      state.optimizationError = null;
    },
  },
  extraReducers: (builder) => {
    // fetchRoutes
    builder
      .addCase(fetchRoutes.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRoutes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(fetchRoutes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to fetch routes';
      });

    // createRoute
    builder
      .addCase(createRoute.fulfilled, (state, action) => {
        // Add the stub route to the list (typed as RouteWithDetails for list compatibility)
        state.items.unshift(action.payload as unknown as RouteWithDetails);
      });

    // optimizeRoute
    builder
      .addCase(optimizeRoute.pending, (state) => {
        state.optimizing = true;
        state.optimizationError = null;
      })
      .addCase(optimizeRoute.fulfilled, (state, action) => {
        state.optimizing = false;
        // Update the route in the list with optimized deliveries_ordered
        const idx = state.items.findIndex((r) => r.id === action.payload.route.id);
        if (idx !== -1) {
          state.items[idx] = { ...state.items[idx], ...action.payload.route };
        }
      })
      .addCase(optimizeRoute.rejected, (state, action) => {
        state.optimizing = false;
        state.optimizationError = action.error.message ?? 'Optimization failed';
      });

    // deleteRoute
    builder
      .addCase(deleteRoute.fulfilled, (state, action) => {
        state.items = state.items.filter((r) => r.id !== action.payload);
        if (state.selectedId === action.payload) state.selectedId = null;
      });
  },
});

export const { selectRoute, clearError } = routesSlice.actions;
export default routesSlice.reducer;
