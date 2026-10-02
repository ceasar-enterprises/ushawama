/**
 * useTrucking — React hook for truck/cargo matching.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  TruckingEngine,
  Truck,
  Cargo,
  CargoInput,
  TruckMatch,
  CargoMatch,
} from './engine';

export function useTrucking(companyId: string) {
  const [engine] = useState(() => new TruckingEngine());
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [cargo, setCargo] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTrucks(engine.getTrucks());
      setCargo(engine.getCargo());
    } finally {
      setLoading(false);
    }
  }, [engine]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const postCargo = useCallback(async (input: CargoInput) => {
    const created = await engine.postCargo(companyId, input);
    await refresh();
    return created;
  }, [engine, companyId, refresh]);

  const dispatch = useCallback(async (truckId: string, cargoId: string) => {
    await engine.dispatch(truckId, cargoId);
    await refresh();
  }, [engine, refresh]);

  const completeDelivery = useCallback(async (truckId: string, cargoId: string) => {
    const result = engine.completeDelivery(truckId, cargoId);
    await refresh();
    return result;
  }, [engine, refresh]);

  const matchTrucksForCargo = useCallback(
    (cargoId: string, limit = 3): TruckMatch[] => engine.matchTrucksForCargo(cargoId, limit),
    [engine],
  );

  const matchCargoForTruck = useCallback(
    (truckId: string, limit = 3): CargoMatch[] => engine.matchCargoForTruck(truckId, limit),
    [engine],
  );

  return {
    trucks,
    cargo,
    loading,
    refresh,
    postCargo,
    dispatch,
    completeDelivery,
    matchTrucksForCargo,
    matchCargoForTruck,
  };
}