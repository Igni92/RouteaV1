/**
 * Dashboard.test.tsx — Jest + React Testing Library
 * AGENT-FRONTEND-MANAGER
 *
 * Coverage targets: >80% for Dashboard, KPICard, RouteList, Map
 * mapbox-gl is mocked via __mocks__/mapbox-gl.js
 * WebSocket client is mocked inline
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import driversReducer from '../redux/driversSlice';
import routesReducer from '../redux/routesSlice';
import deliveriesReducer from '../redux/deliveriesSlice';
import uiReducer, { showToast, dismissToast } from '../redux/uiSlice';
import Dashboard from '../components/Dashboard';
import KPICard from '../components/KPICard';
import RouteList from '../components/RouteList';
import type { RouteWithDetails, DeliveryWithWindow, Driver } from '@shared/types';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock WebSocket client — prevents real connections in tests
jest.mock('../services/websocketClient', () => ({
  wsClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

// Mock API client — prevents real HTTP calls
jest.mock('../services/apiClient', () => ({
  driversApi: {
    list: jest.fn().mockResolvedValue({ data: { data: [] } }),
  },
  routesApi: {
    list: jest.fn().mockResolvedValue({ data: { data: [] } }),
    create: jest.fn().mockResolvedValue({ data: { id: 'route-1' } }),
  },
  deliveriesApi: {
    list: jest.fn().mockResolvedValue({ data: { data: [] } }),
  },
  dashboardApi: {
    getKPI: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

// ── Test factory ───────────────────────────────────────────────────────────────

function buildStore(overrides: Record<string, unknown> = {}) {
  return configureStore({
    reducer: {
      drivers: driversReducer,
      routes: routesReducer,
      deliveries: deliveriesReducer,
      ui: uiReducer,
    },
    preloadedState: overrides,
  });
}

function renderWithStore(ui: React.ReactElement, store = buildStore()) {
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </Provider>,
    ),
    store,
  };
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

const baseDriver: Driver = {
  id: 'driver-1',
  company_id: 'co-1',
  name: 'Jean Dupont',
  phone: '0612345678',
  email: null,
  vehicle_id: 'vehicle-1',
  license_number: 'ABC123',
  rating: 4.2,
  rgpd_consent: true,
  rgpd_consent_at: null,
  fcm_token: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const baseRoute: RouteWithDetails = {
  id: 'route-1',
  company_id: 'co-1',
  date: '2026-02-20',
  driver_id: 'driver-1',
  vehicle_id: 'vehicle-1',
  deliveries_ordered: ['delivery-1', 'delivery-2'],
  status: 'in_progress',
  started_at: '2026-02-20T08:00:00Z',
  completed_at: null,
  estimated_total_km: 42.5,
  estimated_total_minutes: 90,
  drivers: { name: 'Jean Dupont', phone: '0612345678', fcm_token: null },
  vehicles: { registration_plate: 'AA-123-BB', brand: 'Renault', model: 'Master' },
  created_at: '2026-02-20T07:00:00Z',
  updated_at: '2026-02-20T08:00:00Z',
};

const baseDelivery: DeliveryWithWindow = {
  id: 'delivery-1',
  company_id: 'co-1',
  order_id: null,
  reception_window_id: 'rw-1',
  client_deadline: '12:00',
  address: '10 Rue de la Paix, Paris',
  latitude: 48.87,
  longitude: 2.33,
  weight_kg: 12.5,
  estimated_time_at_site: 15,
  status: 'in_route',
  priority: 1,
  notes: null,
  created_at: '2026-02-20T06:00:00Z',
  updated_at: '2026-02-20T08:00:00Z',
  reception_windows: {
    store_name: 'Boulangerie Martin',
    store_address: '10 Rue de la Paix, Paris',
    store_phone: null,
    store_lat: 48.87,
    store_lng: 2.33,
    open_time: '08:00',
    close_time: '12:00',
  },
};

const completedDelivery: DeliveryWithWindow = {
  ...baseDelivery,
  id: 'delivery-2',
  status: 'completed',
  reception_windows: { ...baseDelivery.reception_windows, store_name: 'Épicerie du Coin' },
};

// ── KPICard tests ──────────────────────────────────────────────────────────────

describe('KPICard', () => {
  it('renders label and value', () => {
    render(<KPICard label="Livrées" value={5} icon="✅" color="primary" />);
    expect(screen.getByText('Livrées')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading=true', () => {
    render(<KPICard label="En route" value={0} icon="🚗" color="secondary" isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('En route')).not.toBeInTheDocument();
  });

  it('shows positive trend with green color', () => {
    render(<KPICard label="Livrées" value={10} icon="✅" color="primary" trend={15} />);
    expect(screen.getByText(/\+15%/)).toBeInTheDocument();
    expect(screen.getByText(/\+15%/).closest('div')).toHaveClass('text-green-600');
  });

  it('shows negative trend with red color', () => {
    render(<KPICard label="Livrées" value={8} icon="✅" color="primary" trend={-5} />);
    expect(screen.getByText(/-5%/)).toBeInTheDocument();
    expect(screen.getByText(/-5%/).closest('div')).toHaveClass('text-red-600');
  });

  it('has correct aria-label region', () => {
    render(<KPICard label="Alertes" value={2} icon="⚠️" color="error" />);
    expect(screen.getByRole('region', { name: 'Alertes' })).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<KPICard label="Taux" value="85%" icon="📊" color="primary" />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });
});

// ── RouteList tests ────────────────────────────────────────────────────────────

describe('RouteList', () => {
  const deliveriesByRoute = { 'route-1': [baseDelivery, completedDelivery] };

  it('renders empty state when no routes', () => {
    render(
      <BrowserRouter>
        <RouteList
          routes={[]}
          deliveriesByRoute={{}}
          selectedRouteId={null}
          onRouteSelect={jest.fn()}
          onDriverClick={jest.fn()}
        />
      </BrowserRouter>,
    );
    expect(screen.getByText(/Aucune tournée/)).toBeInTheDocument();
  });

  it('renders driver name for each route', () => {
    render(
      <BrowserRouter>
        <RouteList
          routes={[baseRoute]}
          deliveriesByRoute={deliveriesByRoute}
          selectedRouteId={null}
          onRouteSelect={jest.fn()}
          onDriverClick={jest.fn()}
        />
      </BrowserRouter>,
    );
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
  });

  it('shows vehicle registration plate', () => {
    render(
      <BrowserRouter>
        <RouteList
          routes={[baseRoute]}
          deliveriesByRoute={deliveriesByRoute}
          selectedRouteId={null}
          onRouteSelect={jest.fn()}
          onDriverClick={jest.fn()}
        />
      </BrowserRouter>,
    );
    expect(screen.getByText(/AA-123-BB/)).toBeInTheDocument();
  });

  it('expands deliveries on route click', () => {
    render(
      <BrowserRouter>
        <RouteList
          routes={[baseRoute]}
          deliveriesByRoute={deliveriesByRoute}
          selectedRouteId={null}
          onRouteSelect={jest.fn()}
          onDriverClick={jest.fn()}
        />
      </BrowserRouter>,
    );

    // Click the route header button
    const routeButton = screen.getByRole('button', { name: /Tournée de Jean Dupont/ });
    fireEvent.click(routeButton);

    expect(screen.getByText('Boulangerie Martin')).toBeInTheDocument();
    expect(screen.getByText('Épicerie du Coin')).toBeInTheDocument();
  });

  it('calls onRouteSelect when route is clicked', () => {
    const onRouteSelect = jest.fn();
    render(
      <BrowserRouter>
        <RouteList
          routes={[baseRoute]}
          deliveriesByRoute={deliveriesByRoute}
          selectedRouteId={null}
          onRouteSelect={onRouteSelect}
          onDriverClick={jest.fn()}
        />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Tournée de Jean Dupont/ }));
    expect(onRouteSelect).toHaveBeenCalledWith('route-1');
  });

  it('calls onDriverClick when driver name is clicked', () => {
    const onDriverClick = jest.fn();
    render(
      <BrowserRouter>
        <RouteList
          routes={[baseRoute]}
          deliveriesByRoute={deliveriesByRoute}
          selectedRouteId={null}
          onRouteSelect={jest.fn()}
          onDriverClick={onDriverClick}
        />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Voir le profil de Jean Dupont/ }));
    expect(onDriverClick).toHaveBeenCalledWith('driver-1');
  });

  it('highlights selected route', () => {
    render(
      <BrowserRouter>
        <RouteList
          routes={[baseRoute]}
          deliveriesByRoute={deliveriesByRoute}
          selectedRouteId="route-1"
          onRouteSelect={jest.fn()}
          onDriverClick={jest.fn()}
        />
      </BrowserRouter>,
    );
    // Selected route has border-blue-400
    const container = screen.getByRole('button', { name: /Tournée de Jean Dupont/ }).closest('.rounded-lg');
    expect(container).toHaveClass('border-blue-400');
  });

  it('shows progress count (1/2 livraisons)', () => {
    render(
      <BrowserRouter>
        <RouteList
          routes={[baseRoute]}
          deliveriesByRoute={deliveriesByRoute}
          selectedRouteId={null}
          onRouteSelect={jest.fn()}
          onDriverClick={jest.fn()}
        />
      </BrowserRouter>,
    );
    expect(screen.getByText(/1\/2 livraisons/)).toBeInTheDocument();
  });
});

// ── Dashboard tests ────────────────────────────────────────────────────────────

describe('Dashboard', () => {
  it('renders dashboard container', () => {
    const { getByTestId } = renderWithStore(<Dashboard />);
    expect(getByTestId('dashboard')).toBeInTheDocument();
  });

  it('renders KPI section label', async () => {
    renderWithStore(<Dashboard />);
    expect(screen.getByText('Bilan du jour')).toBeInTheDocument();
  });

  it('renders Tournées section label', () => {
    renderWithStore(<Dashboard />);
    expect(screen.getByText('Tournées')).toBeInTheDocument();
  });

  it('shows 4 KPI cards', () => {
    renderWithStore(<Dashboard />);
    expect(screen.getByText('Livrées')).toBeInTheDocument();
    expect(screen.getByText('En route')).toBeInTheDocument();
    expect(screen.getByText('En attente')).toBeInTheDocument();
    expect(screen.getByText('Alertes')).toBeInTheDocument();
  });

  it('renders KPIs with correct values from delivery state', async () => {
    const store = buildStore({
      deliveries: {
        items: [baseDelivery, completedDelivery],
        status: 'succeeded',
        error: null,
      },
    });

    renderWithStore(<Dashboard />, store);

    // completed = 1
    expect(await screen.findByRole('region', { name: 'Livrées' })).toBeInTheDocument();
    const livreesCard = screen.getByRole('region', { name: 'Livrées' });
    expect(within(livreesCard).getByText('1')).toBeInTheDocument();
  });

  it('renders empty route list with empty routes state', () => {
    renderWithStore(<Dashboard />);
    expect(screen.getByText(/Aucune tournée/)).toBeInTheDocument();
  });

  it('renders route in route list when routes are loaded', () => {
    const store = buildStore({
      routes: {
        items: [baseRoute],
        selectedId: null,
        status: 'succeeded',
        optimizing: false,
        optimizationError: null,
      },
      deliveries: {
        items: [baseDelivery, completedDelivery],
        status: 'succeeded',
        error: null,
      },
    });

    renderWithStore(<Dashboard />, store);
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
  });

  it('opens driver modal when driver name clicked', () => {
    const store = buildStore({
      routes: {
        items: [baseRoute],
        selectedId: null,
        status: 'succeeded',
        optimizing: false,
        optimizationError: null,
      },
      deliveries: { items: [], status: 'succeeded', error: null },
      drivers: {
        items: [baseDriver],
        locations: {},
        onlineStatus: {},
        status: 'succeeded',
        error: null,
      },
    });

    renderWithStore(<Dashboard />, store);

    // Click the driver profile button
    const driverBtn = screen.getByRole('button', { name: /Voir le profil de Jean Dupont/ });
    fireEvent.click(driverBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Jean Dupont/)).toBeInTheDocument();
  });

  it('closes driver modal when escape key pressed', () => {
    const store = buildStore({
      routes: {
        items: [baseRoute],
        selectedId: null,
        status: 'succeeded',
        optimizing: false,
        optimizationError: null,
      },
      deliveries: { items: [], status: 'succeeded', error: null },
      drivers: {
        items: [baseDriver],
        locations: {},
        onlineStatus: {},
        status: 'succeeded',
        error: null,
      },
      ui: {
        selectedRouteId: null,
        selectedDriverId: 'driver-1',
        selectedDeliveryId: null,
        isDriverModalOpen: true,
        selectedDate: '2026-02-20',
        sidebarCollapsed: false,
        mapCenter: { lat: 48.7627, lng: 2.3486 },
        mapZoom: 11,
        wsStatus: 'disconnected',
        toasts: [],
      },
    });

    renderWithStore(<Dashboard />, store);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ── Toast Container tests ──────────────────────────────────────────────────────

describe('Toast notifications (via Dashboard)', () => {
  it('shows toast when added to state', () => {
    const store = buildStore({
      ui: {
        selectedRouteId: null,
        selectedDriverId: null,
        selectedDeliveryId: null,
        isDriverModalOpen: false,
        selectedDate: '2026-02-20',
        sidebarCollapsed: false,
        mapCenter: { lat: 48.7627, lng: 2.3486 },
        mapZoom: 11,
        wsStatus: 'connected',
        toasts: [{ id: 'toast-1', level: 'info', message: 'Connexion WebSocket établie' }],
      },
    });

    renderWithStore(<Dashboard />, store);
    expect(screen.getByText('Connexion WebSocket établie')).toBeInTheDocument();
  });

  it('dismisses toast when close button clicked', () => {
    const store = buildStore({
      ui: {
        selectedRouteId: null,
        selectedDriverId: null,
        selectedDeliveryId: null,
        isDriverModalOpen: false,
        selectedDate: '2026-02-20',
        sidebarCollapsed: false,
        mapCenter: { lat: 48.7627, lng: 2.3486 },
        mapZoom: 11,
        wsStatus: 'connected',
        toasts: [{ id: 'toast-err', level: 'error', message: 'Erreur critique' }],
      },
    });

    renderWithStore(<Dashboard />, store);
    expect(screen.getByText('Erreur critique')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Fermer la notification/ });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Erreur critique')).not.toBeInTheDocument();
  });

  it('shows error toast with red background class', () => {
    const store = buildStore({
      ui: {
        selectedRouteId: null,
        selectedDriverId: null,
        selectedDeliveryId: null,
        isDriverModalOpen: false,
        selectedDate: '2026-02-20',
        sidebarCollapsed: false,
        mapCenter: { lat: 48.7627, lng: 2.3486 },
        mapZoom: 11,
        wsStatus: 'connected',
        toasts: [{ id: 'toast-2', level: 'error', message: 'Erreur serveur' }],
      },
    });

    renderWithStore(<Dashboard />, store);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-red-600');
  });
});

// ── Redux uiSlice unit tests ────────────────────────────────────────────────────

describe('uiSlice actions', () => {
  it('showToast adds toast to state', () => {
    const store = buildStore();
    store.dispatch(showToast({ id: 'test-1', level: 'info', message: 'Hello' }));
    const { toasts } = store.getState().ui;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Hello');
  });

  it('dismissToast removes toast from state', () => {
    const store = buildStore();
    store.dispatch(showToast({ id: 'test-2', level: 'warning', message: 'Test' }));
    store.dispatch(dismissToast('test-2'));
    expect(store.getState().ui.toasts).toHaveLength(0);
  });
});
