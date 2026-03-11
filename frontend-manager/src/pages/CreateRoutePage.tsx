/**
 * CreateRoutePage — Multi-step form for creating and optimizing routes
 * AGENT-FRONTEND-MANAGER
 *
 * Steps:
 *   1. Select date + drivers
 *   2. Select deliveries (table with checkboxes)
 *   3. Preview → call OPTIMIZE API
 *   4. Review optimized routes + map
 *   5. Validate & Send → POST /api/routes, redirect to dashboard
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';
import type { RootState, AppDispatch } from '../redux/store';
import { fetchDrivers } from '../redux/driversSlice';
import { fetchDeliveries } from '../redux/deliveriesSlice';
import { createRoute, optimizeRoute } from '../redux/routesSlice';
import { showToast } from '../redux/uiSlice';
import { routesApi } from '../services/apiClient';
import { format } from 'date-fns';
import type { Driver, DeliveryWithWindow, OptimizedRoute } from '@shared/types';

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = [
  'Date & Chauffeurs',
  'Livraisons',
  'Aperçu',
  'Résultat optimisé',
  'Validation',
];

const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <ol className="flex items-center gap-0 mb-8" aria-label="Étapes de création">
    {STEPS.map((label, idx) => {
      const done = idx < current;
      const active = idx === current;
      return (
        <React.Fragment key={idx}>
          <li
            className="flex flex-col items-center"
            aria-current={active ? 'step' : undefined}
          >
            <div
              className={clsx(
                'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2',
                done   && 'bg-green-500 border-green-500 text-white',
                active && 'bg-blue-500 border-blue-500 text-white',
                !done && !active && 'bg-white border-gray-300 text-gray-400',
              )}
            >
              {done ? '✓' : idx + 1}
            </div>
            <span className={clsx('text-xs mt-1 text-center max-w-[80px]', active ? 'text-blue-600 font-medium' : 'text-gray-400')}>
              {label}
            </span>
          </li>
          {idx < STEPS.length - 1 && (
            <div className={clsx('flex-1 h-0.5 mx-1 mb-5', done ? 'bg-green-400' : 'bg-gray-200')} />
          )}
        </React.Fragment>
      );
    })}
  </ol>
);

// ── Step 1: Date + Drivers ─────────────────────────────────────────────────────

interface Step1Props {
  date: string;
  setDate: (d: string) => void;
  selectedDriverIds: string[];
  setSelectedDriverIds: (ids: string[]) => void;
  drivers: Driver[];
  onNext: () => void;
}

const Step1: React.FC<Step1Props> = ({ date, setDate, selectedDriverIds, setSelectedDriverIds, drivers, onNext }) => {
  const toggleDriver = (id: string) => {
    setSelectedDriverIds(
      selectedDriverIds.includes(id)
        ? selectedDriverIds.filter((d) => d !== id)
        : [...selectedDriverIds, id],
    );
  };

  const canNext = date && selectedDriverIds.length > 0;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Étape 1 — Date et chauffeurs</h2>

      <div className="mb-6">
        <label htmlFor="route-date" className="block text-sm font-medium text-gray-700 mb-1">
          Date de la tournée
        </label>
        <input
          id="route-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          min={format(new Date(), 'yyyy-MM-dd')}
        />
      </div>

      <div>
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Chauffeurs disponibles ({drivers.filter((d) => d.is_active).length})
          </legend>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {drivers.filter((d) => d.is_active).map((driver) => (
              <label
                key={driver.id}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded p-2"
              >
                <input
                  type="checkbox"
                  checked={selectedDriverIds.includes(driver.id)}
                  onChange={() => toggleDriver(driver.id)}
                  className="h-4 w-4 text-blue-500 rounded"
                  aria-label={`Sélectionner ${driver.name}`}
                />
                <span className="text-sm font-medium text-gray-800">{driver.name}</span>
                <span className="text-xs text-gray-500">{driver.phone}</span>
                <span className="ml-auto text-xs text-amber-500">★ {driver.rating.toFixed(1)}</span>
              </label>
            ))}
            {drivers.filter((d) => d.is_active).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Aucun chauffeur actif</p>
            )}
          </div>
        </fieldset>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
};

// ── Step 2: Select Deliveries ──────────────────────────────────────────────────

interface Step2Props {
  deliveries: DeliveryWithWindow[];
  selectedDeliveryIds: string[];
  setSelectedDeliveryIds: (ids: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}

const Step2: React.FC<Step2Props> = ({
  deliveries,
  selectedDeliveryIds,
  setSelectedDeliveryIds,
  onBack,
  onNext,
}) => {
  const unassigned = deliveries.filter((d) => d.status === 'pending' || d.status === 'assigned');

  const toggleAll = () => {
    if (selectedDeliveryIds.length === unassigned.length) {
      setSelectedDeliveryIds([]);
    } else {
      setSelectedDeliveryIds(unassigned.map((d) => d.id));
    }
  };

  const toggle = (id: string) => {
    setSelectedDeliveryIds(
      selectedDeliveryIds.includes(id)
        ? selectedDeliveryIds.filter((d) => d !== id)
        : [...selectedDeliveryIds, id],
    );
  };

  const allSelected = selectedDeliveryIds.length === unassigned.length && unassigned.length > 0;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Étape 2 — Sélection des livraisons ({selectedDeliveryIds.length} sélectionnées)
      </h2>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm" role="grid" aria-label="Liste des livraisons">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Tout sélectionner"
                  className="h-4 w-4"
                />
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Magasin</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Fenêtre</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">Poids</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600">Priorité</th>
            </tr>
          </thead>
          <tbody>
            {unassigned.map((delivery) => (
              <tr
                key={delivery.id}
                className={clsx(
                  'border-b border-gray-100 hover:bg-gray-50 cursor-pointer',
                  selectedDeliveryIds.includes(delivery.id) && 'bg-blue-50',
                )}
                onClick={() => toggle(delivery.id)}
                aria-selected={selectedDeliveryIds.includes(delivery.id)}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedDeliveryIds.includes(delivery.id)}
                    onChange={() => toggle(delivery.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Sélectionner ${delivery.reception_windows.store_name}`}
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">
                  {delivery.reception_windows.store_name}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {delivery.reception_windows.open_time}–{delivery.reception_windows.close_time}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">
                  {delivery.weight_kg ? `${delivery.weight_kg} kg` : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={clsx(
                    'inline-block px-2 py-0.5 rounded text-xs font-medium',
                    delivery.priority === 1 ? 'bg-red-100 text-red-700' :
                    delivery.priority === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600',
                  )}>
                    P{delivery.priority}
                  </span>
                </td>
              </tr>
            ))}
            {unassigned.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                  Aucune livraison en attente
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none">
          ← Retour
        </button>
        <button
          onClick={onNext}
          disabled={selectedDeliveryIds.length === 0}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Aperçu →
        </button>
      </div>
    </div>
  );
};

// ── Step 3: Preview & Optimize ─────────────────────────────────────────────────

interface Step3Props {
  deliveries: DeliveryWithWindow[];
  selectedDeliveryIds: string[];
  selectedDriverIds: string[];
  drivers: Driver[];
  onBack: () => void;
  onOptimize: () => Promise<void>;
  isOptimizing: boolean;
}

const Step3: React.FC<Step3Props> = ({
  deliveries,
  selectedDeliveryIds,
  selectedDriverIds,
  drivers,
  onBack,
  onOptimize,
  isOptimizing,
}) => {
  const selected = deliveries.filter((d) => selectedDeliveryIds.includes(d.id));
  const selectedDrivers = drivers.filter((d) => selectedDriverIds.includes(d.id));
  const totalWeight = selected.reduce((sum, d) => sum + (d.weight_kg ?? 0), 0);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Étape 3 — Aperçu</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500 mb-1">Chauffeurs</div>
          <div className="font-semibold text-gray-800">{selectedDrivers.length}</div>
          <ul className="text-xs text-gray-500 mt-1">
            {selectedDrivers.map((d) => <li key={d.id}>{d.name}</li>)}
          </ul>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500 mb-1">Livraisons</div>
          <div className="font-semibold text-gray-800">{selected.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalWeight > 0 ? `${totalWeight.toFixed(1)} kg total` : 'Poids non renseigné'}
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="text-sm font-medium text-gray-600 mb-2">Livraisons sélectionnées</div>
        <ul className="flex flex-col gap-1">
          {selected.map((d, i) => (
            <li key={d.id} className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 text-xs">{i + 1}.</span>
              <span className="font-medium text-gray-700">{d.reception_windows.store_name}</span>
              <span className="text-gray-400 text-xs ml-auto">
                {d.reception_windows.open_time}–{d.reception_windows.close_time}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none">
          ← Retour
        </button>
        <button
          onClick={onOptimize}
          disabled={isOptimizing}
          className="px-6 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {isOptimizing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Optimisation...
            </span>
          ) : (
            '🔄 OPTIMISER'
          )}
        </button>
      </div>
    </div>
  );
};

// ── Step 4: Review optimized routes ───────────────────────────────────────────

interface Step4Props {
  optimizedRoutes: OptimizedRoute[];
  deliveries: DeliveryWithWindow[];
  drivers: Driver[];
  onBack: () => void;
  onNext: () => void;
}

const Step4: React.FC<Step4Props> = ({ optimizedRoutes, deliveries, drivers, onBack, onNext }) => {
  const deliveryMap = useMemo(() => {
    const m: Record<string, DeliveryWithWindow> = {};
    deliveries.forEach((d) => { m[d.id] = d; });
    return m;
  }, [deliveries]);

  const driverMap = useMemo(() => {
    const m: Record<string, Driver> = {};
    drivers.forEach((d) => { m[d.id] = d; });
    return m;
  }, [drivers]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Étape 4 — Routes optimisées ({optimizedRoutes.length} tournée{optimizedRoutes.length > 1 ? 's' : ''})
      </h2>

      <div className="flex flex-col gap-4 mb-6">
        {optimizedRoutes.map((route, idx) => {
          const driver = driverMap[route.driver_id];
          return (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-gray-800">
                  {driver?.name ?? 'Chauffeur inconnu'}
                </div>
                <div className="text-xs text-gray-500 flex gap-4">
                  <span>~{Math.round(route.estimated_total_km)} km</span>
                  <span>~{Math.round(route.estimated_total_minutes / 60)}h{String(Math.round(route.estimated_total_minutes) % 60).padStart(2, '0')}</span>
                </div>
              </div>
              <ol className="flex flex-col gap-1">
                {route.deliveries_ordered.map((id, stopIdx) => {
                  const delivery = deliveryMap[id];
                  if (!delivery) return null;
                  return (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 text-xs w-5">{stopIdx + 1}.</span>
                      <span className="text-gray-700">{delivery.reception_windows.store_name}</span>
                      <span className="ml-auto text-xs text-gray-400">
                        {delivery.reception_windows.open_time}–{delivery.reception_windows.close_time}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none">
          ← Modifier
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Valider →
        </button>
      </div>
    </div>
  );
};

// ── Step 5: Validate & Send ────────────────────────────────────────────────────

interface Step5Props {
  optimizedRoutes: OptimizedRoute[];
  drivers: Driver[];
  date: string;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

const Step5: React.FC<Step5Props> = ({
  optimizedRoutes,
  drivers,
  date,
  onBack,
  onSubmit,
  isSubmitting,
}) => {
  const driverMap = useMemo(() => {
    const m: Record<string, Driver> = {};
    drivers.forEach((d) => { m[d.id] = d; });
    return m;
  }, [drivers]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Étape 5 — Confirmation</h2>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800 font-medium">
          ✅ Prêt à envoyer {optimizedRoutes.length} tournée{optimizedRoutes.length > 1 ? 's' : ''} pour le {date}
        </p>
        <ul className="mt-2 text-xs text-green-700 list-disc pl-4">
          {optimizedRoutes.map((r, i) => (
            <li key={i}>
              {driverMap[r.driver_id]?.name ?? 'Chauffeur inconnu'} —{' '}
              {r.deliveries_ordered.length} arrêt{r.deliveries_ordered.length > 1 ? 's' : ''}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Les notifications seront envoyées aux chauffeurs via l'application mobile.
      </p>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none">
          ← Retour
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-6 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {isSubmitting ? 'Envoi...' : '🚀 Envoyer les tournées'}
        </button>
      </div>
    </div>
  );
};

// ── CreateRoutePage ────────────────────────────────────────────────────────────

const CreateRoutePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const drivers = useSelector((s: RootState) => s.drivers.items);
  const deliveries = useSelector((s: RootState) => s.deliveries.items);
  const { optimizing } = useSelector((s: RootState) => s.routes);

  const [step, setStep] = useState(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchDrivers());
    dispatch(fetchDeliveries({}));
  }, [dispatch]);

  const handleOptimize = async () => {
    if (selectedDeliveryIds.length === 0) return;

    // Create a temporary route to optimize (uses first driver + vehicle as placeholder)
    // The optimization API expects a route id, so we create one first
    try {
      const result = await dispatch(createRoute({
        date,
        driver_id: selectedDriverIds[0],
        vehicle_id: '', // placeholder — will be set during optimization
        deliveries_ordered: selectedDeliveryIds,
      })).unwrap();

      const optimizeResult = await dispatch(optimizeRoute({
        id: result.id,
        deliveryIds: selectedDeliveryIds,
      })).unwrap();

      setOptimizedRoutes(optimizeResult.routes);
      setStep(3);
    } catch (err) {
      dispatch(showToast({
        id: `optimize-err-${Date.now()}`,
        level: 'error',
        message: 'Erreur lors de l\'optimisation. Veuillez réessayer.',
      }));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create each optimized route via API
      for (const route of optimizedRoutes) {
        await routesApi.create({
          date,
          driver_id: route.driver_id,
          vehicle_id: route.vehicle_id,
          deliveries_ordered: route.deliveries_ordered,
        });
      }

      dispatch(showToast({
        id: `routes-created-${Date.now()}`,
        level: 'info',
        message: `${optimizedRoutes.length} tournée(s) créée(s) avec succès !`,
      }));

      navigate('/');
    } catch {
      dispatch(showToast({
        id: `submit-err-${Date.now()}`,
        level: 'error',
        message: 'Erreur lors de la création des tournées.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700 focus:outline-none text-sm"
            aria-label="Retour au tableau de bord"
          >
            ← Retour
          </button>
          <h1 className="text-xl font-bold text-gray-900">Créer une tournée</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <StepIndicator current={step} />

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          {step === 0 && (
            <Step1
              date={date}
              setDate={setDate}
              selectedDriverIds={selectedDriverIds}
              setSelectedDriverIds={setSelectedDriverIds}
              drivers={drivers}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <Step2
              deliveries={deliveries}
              selectedDeliveryIds={selectedDeliveryIds}
              setSelectedDeliveryIds={setSelectedDeliveryIds}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step3
              deliveries={deliveries}
              selectedDeliveryIds={selectedDeliveryIds}
              selectedDriverIds={selectedDriverIds}
              drivers={drivers}
              onBack={() => setStep(1)}
              onOptimize={handleOptimize}
              isOptimizing={optimizing}
            />
          )}
          {step === 3 && (
            <Step4
              optimizedRoutes={optimizedRoutes}
              deliveries={deliveries}
              drivers={drivers}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <Step5
              optimizedRoutes={optimizedRoutes}
              drivers={drivers}
              date={date}
              onBack={() => setStep(3)}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRoutePage;
