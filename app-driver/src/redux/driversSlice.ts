/**
 * driversSlice — Current driver profile + vehicle + auth tokens
 * AGENT-APP-DRIVER
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Driver, Vehicle } from '@shared/types';
import { loginDriver, getDriver, setTokens, clearTokens } from '../services/api';
import { STORAGE_KEYS } from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DriverState {
  current: Driver | null;
  vehicle: Vehicle | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ── Initial state ──────────────────────────────────────────────────────────────

const initialState: DriverState = {
  current: null,
  vehicle: null,
  accessToken: null,
  refreshToken: null,
  status: 'idle',
  error: null,
};

// ── Thunks ─────────────────────────────────────────────────────────────────────

export const loginDriverThunk = createAsyncThunk(
  'driver/login',
  async (credentials: { email: string; password: string; fcm_token?: string }) => {
    const response = await loginDriver(credentials);
    await setTokens(response.tokens.access_token, response.tokens.refresh_token);
    // Cache driver profile
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVER, JSON.stringify(response.user));
    return response;
  },
);

export const loadCachedDriver = createAsyncThunk(
  'driver/loadCached',
  async () => {
    const [driverRaw, accessToken, refreshToken] = await AsyncStorage.multiGet([
      STORAGE_KEYS.DRIVER,
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
    ]);
    return {
      driver: driverRaw[1] ? JSON.parse(driverRaw[1]) as Driver : null,
      accessToken: accessToken[1],
      refreshToken: refreshToken[1],
    };
  },
);

export const fetchDriverProfile = createAsyncThunk(
  'driver/fetchProfile',
  async (driverId: string) => {
    const driver = await getDriver(driverId);
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVER, JSON.stringify(driver));
    return driver;
  },
);

export const logoutDriver = createAsyncThunk(
  'driver/logout',
  async () => {
    await clearTokens();
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.DRIVER,
      STORAGE_KEYS.ROUTE,
      STORAGE_KEYS.DELIVERIES,
    ]);
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────────

const driversSlice = createSlice({
  name: 'driver',
  initialState,
  reducers: {
    setVehicle(state, action: PayloadAction<Vehicle>) {
      state.vehicle = action.payload;
    },
    clearDriver(state) {
      state.current = null;
      state.vehicle = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // loginDriverThunk
      .addCase(loginDriverThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginDriverThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload.user as unknown as Driver;
        state.accessToken = action.payload.tokens.access_token;
        state.refreshToken = action.payload.tokens.refresh_token;
      })
      .addCase(loginDriverThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Login failed';
      })
      // loadCachedDriver
      .addCase(loadCachedDriver.fulfilled, (state, action) => {
        if (action.payload.driver) {
          state.current = action.payload.driver;
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
          state.status = 'succeeded';
        }
      })
      // fetchDriverProfile
      .addCase(fetchDriverProfile.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      // logoutDriver
      .addCase(logoutDriver.fulfilled, (state) => {
        Object.assign(state, initialState);
      });
  },
});

export const { setVehicle, clearDriver } = driversSlice.actions;
export default driversSlice.reducer;
