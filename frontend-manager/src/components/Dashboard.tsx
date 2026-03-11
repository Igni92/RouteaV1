/**
 * Dashboard — Main manager layout: Map (70%) + Right panel (30%)
 * AGENT-FRONTEND-MANAGER
 *
 * Renders KPI cards, RouteList, live Map, DriverModal, and toast notifications.
 * Reads all state from Redux store. No props.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';
import type { RootState, AppDispatch } from '../redux/store';
import { selectRoute, openDriverModal, closeDriverModal, selectDelivery, dismissToast } from '../redux/uiSlice';
import { fetchDrivers } from '../redux/driversSlice';
import { fetchRoutes } from '../redux/routesSlice';
import { fetchDeliveries } from '../redux/deliveriesSlice';
import { wsClient } from '../services/websocketClient';
import Map from './Map';
import KPICard from './KPICard';
import RouteList from './RouteList';
import type { DriverMapMarker } from '@shared/types';

// ── Toast Container ────────────────────────────────────────────────────────────

const ToastContainer: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toasts = useSelector((s: RootState) => s.ui.toasts);

  useEffect(() => {
    toasts.forEach((toast) => {
      const timer = setTimeout(() => {
        dispatch(dismissToast(toast.id));
      }, 5000);
      return () => clearTimeout(timer);
    });
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      role="log"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium min-w-[280px] max-w-sm',
            toast.level === 'error'   && 'bg-red-600 text-white',
            toast.level === 'warning' && 'bg-amber-500 text-white',
            toast.level === 'info'    && 'bg-blue-600 text-white',
          )}
          role="alert"
        >
          <span aria-hidden="true">
            {toast.level === 'error' ? '❌' : toast.level === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => dispatch(dismissToast(toast.id))}
            className="opacity-75 hover:opacity-100 focus:outline-none ml-2"
            aria-label="Fermer la notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

// ── Driver Modal ───────────────────────────────────────────────────────────────

const DriverModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isDriverModalOpen, selectedDriverId } = useSelector((s: RootState) => s.ui);
  const drivers = useSelector((s: RootState) => s.drivers.items);
  const routes = useSelector((s: RootState) => s.routes.items);

  const driver = drivers.find((d) => d.id === selectedDriverId);
  const driverRoute = routes.find((r) => r.driver_id === selectedDriverId);

  const handleClose = useCallback(() => dispatch(closeDriverModal()), [dispatch]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isDriverModalOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDriverModalOpen, handleClose]);

  if (!isDriverModalOpen || !driver) return null;

  const statusCfg = {
    planned:     { label: 'Planifiée',   color: 'text-gray-500' },
    in_progress: { label: 'En cours',   color: 'text-blue-600' },
    completed:   { label: 'Terminée',   color: 'text-green-600' },
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-20 right-4 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 p-5"
        role="dialog"
        aria-modal="true"
        aria-label={`Profil chauffeur: ${driver.name}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-xl font-bold text-green-700">
              {driver.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{driver.name}</div>
              <div className="text-xs text-gray-500">{driver.phone}</div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={i < Math.round(driver.rating) ? 'text-amber-400' : 'text-gray-300'}
              aria-hidden="true"
            >
              ★
            </span>
          ))}
          <span className="text-sm text-gray-500 ml-1">{driver.rating.toFixed(1)}</span>
        </div>

        {/* Current route */}
        {driverRoute ? (
          <div className="border-t border-gray-100 pt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Tournée du jour
            </div>
            <div className="text-sm text-gray-700">
              <span className={statusCfg[driverRoute.status]?.color ?? 'text-gray-500'}>
                {statusCfg[driverRoute.status]?.label}
              </span>
            </div>
            {driverRoute.estimated_total_km && (
              <div className="text-xs text-gray-500 mt-1">
                ~{Math.round(driverRoute.estimated_total_km)} km ·{' '}
                ~{Math.round((driverRoute.estimated_total_minutes ?? 0) / 60)}h
                {String((driverRoute.estimated_total_minutes ?? 0) % 60).padStart(2, '0')}
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-gray-100 pt-4 text-sm text-gray-400">
            Aucune tournée assignée aujourd'hui
          </div>
        )}
      </div>
    </>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux selectors
  const drivers = useSelector((s: RootState) => s.drivers.items);
  const driverLocations = useSelector((s: RootState) => s.drivers.locations);
  const driverOnlineStatus = useSelector((s: RootState) => s.drivers.onlineStatus);
  const routes = useSelector((s: RootState) => s.routes.items);
  const routesStatus = useSelector((s: RootState) => s.routes.status);
  const deliveries = useSelector((s: RootState) => s.deliveries.items);
  const selectedRouteId = useSelector((s: RootState) => s.ui.selectedRouteId);
  const selectedDate = useSelector((s: RootState) => s.ui.selectedDate);

  // ── Initial data fetch ────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchDrivers());
    dispatch(fetchRoutes({ date: selectedDate }));
    dispatch(fetchDeliveries({}));
  }, [dispatch, selectedDate]);

  // ── Auto-refresh every 60 seconds ─────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchRoutes({ date: selectedDate }));
      dispatch(fetchDeliveries({}));
    }, 60_000);
    return () => clearInterval(interval);
  }, [dispatch, selectedDate]);

  // ── WebSocket connection ──────────────────────────────────────────────────

  useEffect(() => {
    wsClient.connect(dispatch);
    return () => wsClient.disconnect();
  }, [dispatch]);

  // ── Driver map markers ────────────────────────────────────────────────────

  const driverMarkers = useMemo<DriverMapMarker[]>(() =>
    drivers
      .filter((d) => d.is_active)
      .map((d) => {
        const loc = driverLocations[d.id];
        if (!loc) return null;
        const isOnline = driverOnlineStatus[d.id] ?? false;
        const hasActiveRoute = routes.some(
          (r) => r.driver_id === d.id && r.status === 'in_progress',
        );
        return {
          driver_id: d.id,
          driver_name: d.name,
          lat: loc.lat,
          lng: loc.lng,
          status: isOnline ? (hasActiveRoute ? 'delivering' : 'online') : 'offline',
          current_delivery_id: null,
          last_update: loc.timestamp,
        };
      })
      .filter((m): m is DriverMapMarker => m !== null),
    [drivers, driverLocations, driverOnlineStatus, routes],
  );

  // ── Deliveries grouped by route ────────────────────────────────────────────

  const deliveriesByRoute = useMemo(() => {
    const map: Record<string, typeof deliveries> = {};
    routes.forEach((route) => {
      const ordered = route.deliveries_ordered
        .map((id) => deliveries.find((d) => d.id === id))
        .filter((d): d is (typeof deliveries)[0] => d !== undefined);
      map[route.id] = ordered;
    });
    return map;
  }, [routes, deliveries]);

  // ── KPI computations ──────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const completed  = deliveries.filter((d) => d.status === 'completed').length;
    const inRoute    = deliveries.filter((d) => d.status === 'in_route' || d.status === 'arrived').length;
    const failed     = deliveries.filter((d) => d.status === 'failed').length;
    const pending    = deliveries.filter((d) => d.status === 'pending' || d.status === 'assigned').length;
    return { completed, inRoute, failed, pending };
  }, [deliveries]);

  const isLoading = routesStatus === 'loading';

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDriverClick = useCallback(
    (driverId: string) => dispatch(openDriverModal(driverId)),
    [dispatch],
  );

  const handleDeliveryClick = useCallback(
    (deliveryId: string) => dispatch(selectDelivery(deliveryId)),
    [dispatch],
  );

  const handleRouteSelect = useCallback(
    (routeId: string) => dispatch(selectRoute(routeId)),
    [dispatch],
  );

  return (
    <div className="flex flex-1 overflow-hidden" data-testid="dashboard">
      {/* ── Map panel (flex-1) ─────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <Map
          drivers={driverMarkers}
          deliveries={deliveries}
          selectedRouteId={selectedRouteId}
          onDriverClick={handleDriverClick}
          onDeliveryClick={handleDeliveryClick}
        />
      </div>

      {/* ── Right panel (fixed 380px) ─────────────────────────────────────── */}
      <aside
        className="w-[380px] flex-shrink-0 bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden"
        aria-label="Panneau de contrôle"
      >
        {/* KPI cards */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Bilan du jour
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <KPICard
              label="Livrées"
              value={kpi.completed}
              icon="✅"
              color="primary"
              isLoading={isLoading}
            />
            <KPICard
              label="En route"
              value={kpi.inRoute}
              icon="🚗"
              color="secondary"
              isLoading={isLoading}
            />
            <KPICard
              label="En attente"
              value={kpi.pending}
              icon="⏱️"
              color="muted"
              isLoading={isLoading}
            />
            <KPICard
              label="Alertes"
              value={kpi.failed}
              icon="⚠️"
              color={kpi.failed > 0 ? 'error' : 'muted'}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Route list */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Tournées
          </h2>
          <RouteList
            routes={routes}
            deliveriesByRoute={deliveriesByRoute}
            selectedRouteId={selectedRouteId}
            onRouteSelect={handleRouteSelect}
            onDriverClick={handleDriverClick}
          />
        </div>
      </aside>

      {/* ── Overlays ────────────────────────────────────────────────────────── */}
      <DriverModal />
      <ToastContainer />
    </div>
  );
};

export default Dashboard;
