/**
 * Map — Mapbox GL JS live map with driver markers and delivery pins
 * AGENT-FRONTEND-MANAGER
 *
 * Uses Mapbox GL JS directly (no react-map-gl wrapper).
 * Mapbox token loaded from VITE_MAPBOX_TOKEN env variable.
 */

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { DriverMapMarker, DeliveryWithWindow } from '@shared/types';
import { mapDefaults } from '../styles/theme';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MapProps {
  drivers: DriverMapMarker[];
  deliveries: DeliveryWithWindow[];
  selectedRouteId: string | null;
  onDriverClick: (driverId: string) => void;
  onDeliveryClick: (deliveryId: string) => void;
}

// ── Marker color helpers ───────────────────────────────────────────────────────

function getDriverColor(status: DriverMapMarker['status']): string {
  switch (status) {
    case 'delivering': return '#22C55E'; // green — delivering
    case 'online':     return '#0EA5E9'; // blue — idle
    case 'offline':    return '#6B7280'; // gray — offline
    default:           return '#6B7280';
  }
}

function getDeliveryColor(status: DeliveryWithWindow['status']): string {
  switch (status) {
    case 'completed': return '#22C55E';
    case 'in_route':
    case 'arrived':   return '#0EA5E9';
    case 'failed':    return '#DC2626';
    default:          return '#9CA3AF';
  }
}

function createDriverElement(marker: DriverMapMarker): HTMLElement {
  const el = document.createElement('div');
  el.className = 'driver-marker';
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `Chauffeur: ${marker.driver_name}`);
  el.setAttribute('tabindex', '0');

  const color = getDriverColor(marker.status);
  const isPulsing = marker.status === 'delivering';

  el.style.cssText = [
    'width: 28px',
    'height: 28px',
    'border-radius: 50%',
    `background-color: ${color}`,
    'border: 3px solid white',
    'box-shadow: 0 2px 6px rgba(0,0,0,0.3)',
    'cursor: pointer',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'font-size: 12px',
    'color: white',
    'font-weight: bold',
    isPulsing ? 'animation: gfPulse 1.5s infinite' : '',
  ].filter(Boolean).join(';');

  el.textContent = marker.driver_name.charAt(0).toUpperCase();
  return el;
}

function createDeliveryElement(delivery: DeliveryWithWindow): HTMLElement {
  const el = document.createElement('div');
  el.className = 'delivery-pin';
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `Livraison: ${delivery.reception_windows.store_name}`);
  el.setAttribute('tabindex', '0');

  const color = getDeliveryColor(delivery.status);

  el.style.cssText = [
    'width: 14px',
    'height: 14px',
    'border-radius: 50%',
    `background-color: ${color}`,
    'border: 2px solid white',
    'box-shadow: 0 1px 4px rgba(0,0,0,0.3)',
    'cursor: pointer',
  ].join(';');

  return el;
}

// ── Component ──────────────────────────────────────────────────────────────────

const Map: React.FC<MapProps> = ({
  drivers,
  deliveries,
  selectedRouteId,
  onDriverClick,
  onDeliveryClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const driverMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const deliveryMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // ── Initialize map ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token) {
      console.error('[Map] VITE_MAPBOX_TOKEN is not set');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapDefaults.style,
      center: [mapDefaults.center.lng, mapDefaults.center.lat],
      zoom: mapDefaults.zoom,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Inject pulse animation CSS once
    if (!document.getElementById('gf-map-styles')) {
      const style = document.createElement('style');
      style.id = 'gf-map-styles';
      style.textContent = `
        @keyframes gfPulse {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70% { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `;
      document.head.appendChild(style);
    }

    mapRef.current = map;

    return () => {
      driverMarkersRef.current.forEach((m) => m.remove());
      deliveryMarkersRef.current.forEach((m) => m.remove());
      driverMarkersRef.current.clear();
      deliveryMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Sync driver markers ─────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(driverMarkersRef.current.keys());
    const newIds = new Set(drivers.map((d) => d.driver_id));

    // Remove stale markers
    existingIds.forEach((id) => {
      if (!newIds.has(id)) {
        driverMarkersRef.current.get(id)?.remove();
        driverMarkersRef.current.delete(id);
      }
    });

    drivers.forEach((driver) => {
      const existing = driverMarkersRef.current.get(driver.driver_id);

      if (existing) {
        existing.setLngLat([driver.lng, driver.lat]);
        const el = existing.getElement();
        el.style.backgroundColor = getDriverColor(driver.status);
      } else {
        const el = createDriverElement(driver);

        const handleClick = () => onDriverClick(driver.driver_id);
        el.addEventListener('click', handleClick);
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([driver.lng, driver.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 20 }).setHTML(
              `<strong>${driver.driver_name}</strong><br/>
               <span style="color:#6B7280;font-size:12px;">
                 ${
                   driver.status === 'delivering'
                     ? '🟢 En livraison'
                     : driver.status === 'online'
                     ? '🔵 Disponible'
                     : '⚫ Hors ligne'
                 }
               </span>`,
            ),
          )
          .addTo(map);

        driverMarkersRef.current.set(driver.driver_id, marker);
      }
    });
  }, [drivers, onDriverClick]);

  // ── Sync delivery markers ───────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(deliveryMarkersRef.current.keys());
    const newIds = new Set(deliveries.map((d) => d.id));

    // Remove stale markers
    existingIds.forEach((id) => {
      if (!newIds.has(id)) {
        deliveryMarkersRef.current.get(id)?.remove();
        deliveryMarkersRef.current.delete(id);
      }
    });

    deliveries.forEach((delivery) => {
      const existing = deliveryMarkersRef.current.get(delivery.id);

      if (existing) {
        existing.getElement().style.backgroundColor = getDeliveryColor(delivery.status);
      } else {
        const el = createDeliveryElement(delivery);

        const handleClick = () => onDeliveryClick(delivery.id);
        el.addEventListener('click', handleClick);
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([delivery.longitude, delivery.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 12 }).setHTML(
              `<strong>${delivery.reception_windows.store_name}</strong><br/>
               <span style="color:#6B7280;font-size:12px;">
                 ${delivery.reception_windows.open_time}–${delivery.reception_windows.close_time}
               </span>`,
            ),
          )
          .addTo(map);

        deliveryMarkersRef.current.set(delivery.id, marker);
      }
    });
  }, [deliveries, selectedRouteId, onDeliveryClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      role="application"
      aria-label="Carte des tournées en temps réel"
    />
  );
};

export default Map;
