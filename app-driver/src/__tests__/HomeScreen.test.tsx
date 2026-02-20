/**
 * HomeScreen.test.tsx — Jest + React Testing Library (Native)
 * AGENT-APP-DRIVER
 *
 * Tests: delivery list render, progress bar, navigation, actions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import driverReducer from '../redux/driversSlice';
import deliveriesReducer from '../redux/deliveriesSlice';
import routeReducer from '../redux/routeSlice';
import photosReducer from '../redux/photoSlice';
import HomeScreen from '../screens/HomeScreen';
import type { DeliveryWithWindow, Driver, Route } from '@shared/types';

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../services/navigationService', () => ({
  openNavigationPicker: jest.fn(),
  makeCall: jest.fn(),
}));

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [{ granted: false }, jest.fn()]),
}));

// ── Test fixtures ──────────────────────────────────────────────────────────────

const makeDelivery = (overrides: Partial<DeliveryWithWindow> = {}): DeliveryWithWindow => ({
  id: `delivery-${Math.random().toString(36).slice(2)}`,
  company_id: 'co-1',
  order_id: null,
  reception_window_id: 'rw-1',
  client_deadline: '10:00',
  address: '10 Rue de la Paix, Paris',
  latitude: 48.8566,
  longitude: 2.3522,
  weight_kg: 10,
  estimated_time_at_site: 15,
  status: 'assigned',
  priority: 1,
  notes: null,
  created_at: '2026-02-20T06:00:00Z',
  updated_at: '2026-02-20T06:00:00Z',
  reception_windows: {
    store_name: 'Boulangerie Martin',
    store_address: '10 Rue de la Paix, Paris',
    store_phone: '01 23 45 67 89',
    store_lat: 48.8566,
    store_lng: 2.3522,
    open_time: '08:00',
    close_time: '12:00',
  },
  ...overrides,
});

const delivery1 = makeDelivery({ id: 'del-1', status: 'in_route', reception_windows: { store_name: 'Boulangerie Martin', store_address: '10 Rue de la Paix, Paris', store_phone: null, store_lat: 48.856, store_lng: 2.352, open_time: '08:00', close_time: '12:00' } });
const delivery2 = makeDelivery({ id: 'del-2', status: 'completed', reception_windows: { store_name: 'Épicerie du Coin', store_address: '5 Av Victor Hugo', store_phone: null, store_lat: 48.860, store_lng: 2.355, open_time: '09:00', close_time: '13:00' } });
const delivery3 = makeDelivery({ id: 'del-3', status: 'assigned', reception_windows: { store_name: 'Superette Roux', store_address: '20 Bd Haussmann', store_phone: null, store_lat: 48.862, store_lng: 2.348, open_time: '10:00', close_time: '14:00' } });
const delivery4 = makeDelivery({ id: 'del-4', status: 'completed', reception_windows: { store_name: 'Marché Leblanc', store_address: '3 Rue du Moulin', store_phone: null, store_lat: 48.854, store_lng: 2.360, open_time: '07:00', close_time: '11:00' } });

// ── Store factory ──────────────────────────────────────────────────────────────

function buildStore(deliveryOverrides = {}, routeOverrides = {}) {
  return configureStore({
    reducer: {
      driver: driverReducer,
      deliveries: deliveriesReducer,
      route: routeReducer,
      photos: photosReducer,
    },
    preloadedState: {
      deliveries: {
        items: [delivery1, delivery2, delivery3, delivery4],
        statuses: {},
        currentIndex: 0,
        date: '2026-02-20',
        loadingStatus: 'succeeded' as const,
        error: null,
        ...deliveryOverrides,
      },
      route: {
        current: null,
        deliveriesOrdered: ['del-1', 'del-2', 'del-3', 'del-4'],
        status: 'in_progress' as const,
        startedAt: '2026-02-20T08:00:00Z',
        completedAt: null,
        gpsSequence: 0,
        isTrackingGps: true,
        loadingStatus: 'succeeded' as const,
        error: null,
        ...routeOverrides,
      },
    },
  });
}

// ── Render helper ──────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();

function renderHomeScreen(store = buildStore()) {
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen as any} />
          <Stack.Screen name="Arrived" component={() => null} />
          <Stack.Screen name="DeliveryDetails" component={() => null} />
          <Stack.Screen name="Problem" component={() => null} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('HomeScreen', () => {
  it('renders without crashing', () => {
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('home-scroll')).toBeTruthy();
  });

  it('renders GERVIFRAIS header', () => {
    renderHomeScreen();
    expect(screen.getByText('GERVIFRAIS')).toBeTruthy();
  });

  it('renders progress bar', () => {
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('shows 2/4 completed in progress (del-2 and del-4 completed)', () => {
    renderHomeScreen();
    expect(screen.getByText('2/4 livraisons')).toBeTruthy();
  });

  it('renders current delivery card highlighted', () => {
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('current-delivery-card')).toBeTruthy();
  });

  it('shows LIVRAISON EN COURS badge on current delivery', () => {
    renderHomeScreen();
    expect(screen.getByText('LIVRAISON EN COURS')).toBeTruthy();
  });

  it('shows current delivery store name', () => {
    renderHomeScreen();
    expect(screen.getByText('Boulangerie Martin')).toBeTruthy();
  });

  it('renders other delivery cards', () => {
    renderHomeScreen();
    expect(screen.getByText(/Épicerie du Coin/)).toBeTruthy();
    expect(screen.getByText(/Superette Roux/)).toBeTruthy();
  });

  it('shows ARRIVÉ button for current delivery', () => {
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('arrived-btn')).toBeTruthy();
  });

  it('shows NAVIGUER button for current delivery', () => {
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('navigate-btn')).toBeTruthy();
  });

  it('shows ⚠️ Problème button', () => {
    const { getByTestId } = renderHomeScreen();
    expect(getByTestId('problem-btn')).toBeTruthy();
  });

  it('NAVIGUER button calls openNavigationPicker', () => {
    const { openNavigationPicker } = require('../services/navigationService');
    const { getByTestId } = renderHomeScreen();
    fireEvent.press(getByTestId('navigate-btn'));
    expect(openNavigationPicker).toHaveBeenCalledWith(
      delivery1.latitude,
      delivery1.longitude,
      delivery1.address,
    );
  });

  it('renders progress 0/4 when no deliveries completed', () => {
    const store = buildStore({
      items: [
        makeDelivery({ id: 'a1', status: 'assigned' }),
        makeDelivery({ id: 'a2', status: 'assigned' }),
        makeDelivery({ id: 'a3', status: 'assigned' }),
        makeDelivery({ id: 'a4', status: 'assigned' }),
      ],
    });
    renderHomeScreen(store);
    expect(screen.getByText('0/4 livraisons')).toBeTruthy();
  });

  it('shows empty state when no deliveries', () => {
    const store = buildStore({ items: [] }, { deliveriesOrdered: [] });
    renderHomeScreen(store);
    expect(screen.getByText(/Aucune livraison/)).toBeTruthy();
  });

  it('shows all deliveries section label', () => {
    renderHomeScreen();
    expect(screen.getByText(/Toutes les livraisons/)).toBeTruthy();
  });

  it('shows reception window times', () => {
    renderHomeScreen();
    expect(screen.getByText(/08:00–12:00/)).toBeTruthy();
  });

  it('shows client deadline', () => {
    renderHomeScreen();
    expect(screen.getByText(/Deadline: 10:00/)).toBeTruthy();
  });
});

// ── Redux slice unit tests ─────────────────────────────────────────────────────

describe('deliveriesSlice', () => {
  it('advanceToNext moves currentIndex to next non-completed delivery', () => {
    const store = buildStore({
      items: [delivery1, delivery2, delivery3, delivery4],
      currentIndex: 0,
      statuses: { 'del-1': 'completed' as const },
    });

    store.dispatch({ type: 'deliveries/advanceToNext' });
    expect(store.getState().deliveries.currentIndex).toBe(2); // del-3 is next non-completed
  });

  it('setCurrentIndex updates currentIndex', () => {
    const store = buildStore();
    store.dispatch({ type: 'deliveries/setCurrentIndex', payload: 2 });
    expect(store.getState().deliveries.currentIndex).toBe(2);
  });

  it('setDeliveryStatus updates statuses record', () => {
    const store = buildStore();
    store.dispatch({ type: 'deliveries/setDeliveryStatus', payload: { id: 'del-1', status: 'completed' } });
    expect(store.getState().deliveries.statuses['del-1']).toBe('completed');
  });
});
