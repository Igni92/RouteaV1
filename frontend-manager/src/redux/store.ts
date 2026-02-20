/**
 * Redux Store — GERVIFRAIS Manager Dashboard
 */

import { configureStore } from '@reduxjs/toolkit';
import driversReducer from './driversSlice';
import routesReducer from './routesSlice';
import deliveriesReducer from './deliveriesSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    drivers: driversReducer,
    routes: routesReducer,
    deliveries: deliveriesReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
