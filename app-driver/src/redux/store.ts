/**
 * Redux Store — GERVIFRAIS Driver App
 * AGENT-APP-DRIVER
 */

import { configureStore } from '@reduxjs/toolkit';
import driverReducer from './driversSlice';
import deliveriesReducer from './deliveriesSlice';
import routeReducer from './routeSlice';
import photosReducer from './photoSlice';

export const store = configureStore({
  reducer: {
    driver:     driverReducer,
    deliveries: deliveriesReducer,
    route:      routeReducer,
    photos:     photosReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Photos contain URIs which may be large strings
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
