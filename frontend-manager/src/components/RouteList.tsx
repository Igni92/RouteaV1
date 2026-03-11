/**
 * RouteList — Right-panel route list with expandable delivery cards
 * AGENT-FRONTEND-MANAGER
 */

import React, { useState } from 'react';
import clsx from 'clsx';
import type { RouteWithDetails, DeliveryWithWindow, DeliveryStatus } from '@shared/types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RouteListProps {
  routes: RouteWithDetails[];
  deliveriesByRoute: Record<string, DeliveryWithWindow[]>;
  selectedRouteId: string | null;
  onRouteSelect: (routeId: string) => void;
  onDriverClick: (driverId: string) => void;
}

interface DeliveryCardProps {
  delivery: DeliveryWithWindow;
  index: number;
  isCurrentStop: boolean;
}

// ── Status display config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DeliveryStatus, { icon: string; label: string; color: string }> = {
  completed: { icon: '✅', label: 'Livrée',    color: 'text-green-600' },
  in_route:  { icon: '🔵', label: 'En route',  color: 'text-blue-500' },
  arrived:   { icon: '📍', label: 'Arrivée',   color: 'text-blue-500' },
  pending:   { icon: '⏱️', label: 'En attente', color: 'text-gray-500' },
  assigned:  { icon: '📋', label: 'Assignée',  color: 'text-gray-500' },
  failed:    { icon: '❌', label: 'Échouée',   color: 'text-red-600' },
};

const ROUTE_STATUS_CONFIG = {
  planned:     { label: 'Planifiée',   color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'En cours',   color: 'bg-blue-100 text-blue-700' },
  completed:   { label: 'Terminée',   color: 'bg-green-100 text-green-700' },
};

// ── DeliveryCard ───────────────────────────────────────────────────────────────

const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, index, isCurrentStop }) => {
  const cfg = STATUS_CONFIG[delivery.status] ?? STATUS_CONFIG.pending;

  return (
    <div
      className={clsx(
        'px-3 py-2 rounded flex items-start gap-2 text-sm transition-colors',
        isCurrentStop ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50',
      )}
      role="listitem"
      aria-label={`Arrêt ${index + 1}: ${delivery.reception_windows.store_name}`}
    >
      {/* Stop number */}
      <span className="text-xs font-semibold text-gray-400 mt-0.5 min-w-[18px]">
        {index + 1}.
      </span>

      {/* Store name + window */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 truncate">
          {delivery.reception_windows.store_name}
        </div>
        <div className="text-xs text-gray-500">
          {delivery.reception_windows.open_time}–{delivery.reception_windows.close_time}
        </div>
      </div>

      {/* Status */}
      <span
        className={clsx('flex items-center gap-1 font-medium whitespace-nowrap', cfg.color)}
        aria-label={cfg.label}
      >
        <span aria-hidden="true">{cfg.icon}</span>
        <span className="text-xs hidden sm:inline">{cfg.label}</span>
      </span>
    </div>
  );
};

// ── RouteItem ──────────────────────────────────────────────────────────────────

interface RouteItemProps {
  route: RouteWithDetails;
  deliveries: DeliveryWithWindow[];
  isSelected: boolean;
  onSelect: () => void;
  onDriverClick: () => void;
}

const RouteItem: React.FC<RouteItemProps> = ({
  route,
  deliveries,
  isSelected,
  onSelect,
  onDriverClick,
}) => {
  const [expanded, setExpanded] = useState(isSelected);
  const statusCfg = ROUTE_STATUS_CONFIG[route.status];

  const completedCount = deliveries.filter((d) => d.status === 'completed').length;
  const currentStopIdx = deliveries.findIndex(
    (d) => d.status === 'in_route' || d.status === 'arrived',
  );

  const handleToggle = () => {
    setExpanded((prev) => !prev);
    onSelect();
  };

  return (
    <div
      className={clsx(
        'rounded-lg border transition-all',
        isSelected ? 'border-blue-400 shadow-sm' : 'border-gray-200',
      )}
    >
      {/* Route header */}
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls={`route-deliveries-${route.id}`}
        aria-label={`Tournée de ${route.drivers.name}`}
      >
        {/* Online dot */}
        <span className="mt-1 h-3 w-3 rounded-full bg-green-500 flex-shrink-0" aria-hidden="true" />

        <div className="flex-1 min-w-0">
          {/* Driver name */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="font-semibold text-gray-900 hover:text-blue-600 focus:outline-none focus:underline text-sm"
              onClick={(e) => { e.stopPropagation(); onDriverClick(); }}
              aria-label={`Voir le profil de ${route.drivers.name}`}
            >
              {route.drivers.name}
            </button>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', statusCfg.color)}>
              {statusCfg.label}
            </span>
          </div>

          {/* Vehicle */}
          <div className="text-xs text-gray-500 mt-0.5">
            {route.vehicles.brand} {route.vehicles.model} · {route.vehicles.registration_plate}
          </div>

          {/* Progress */}
          {deliveries.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {completedCount}/{deliveries.length} livraisons
            </div>
          )}
        </div>

        {/* Expand chevron */}
        <span
          className={clsx('text-gray-400 transition-transform mt-1', expanded && 'rotate-180')}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {/* Delivery list */}
      {expanded && (
        <div
          id={`route-deliveries-${route.id}`}
          className="px-3 pb-3 flex flex-col gap-1.5"
          role="list"
          aria-label={`Arrêts de ${route.drivers.name}`}
        >
          {deliveries.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-1">Aucune livraison assignée</p>
          ) : (
            deliveries.map((delivery, idx) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                index={idx}
                isCurrentStop={idx === currentStopIdx}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ── RouteList ──────────────────────────────────────────────────────────────────

const RouteList: React.FC<RouteListProps> = ({
  routes,
  deliveriesByRoute,
  selectedRouteId,
  onRouteSelect,
  onDriverClick,
}) => {
  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <span className="text-4xl mb-2" aria-hidden="true">🚚</span>
        <p className="text-sm">Aucune tournée pour cette date</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      role="list"
      aria-label="Liste des tournées"
    >
      {routes.map((route) => (
        <RouteItem
          key={route.id}
          route={route}
          deliveries={deliveriesByRoute[route.id] ?? []}
          isSelected={route.id === selectedRouteId}
          onSelect={() => onRouteSelect(route.id)}
          onDriverClick={() => onDriverClick(route.driver_id)}
        />
      ))}
    </div>
  );
};

export default RouteList;
