/**
 * useOps — React hook for the operations command centre.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  OpsEngine,
  Shipment,
  Ticket,
  TicketInput,
  TicketStatus,
  Estimate,
  EstimateInput,
  CustomsFiling,
  CustomsDocState,
  StockItem,
  Warehouse,
  CommandSummary,
} from './engine';

export function useOps() {
  const [engine] = useState(() => new OpsEngine());
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customs, setCustoms] = useState<CustomsFiling[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [summary, setSummary] = useState<CommandSummary>(() => engine.getSummary());

  const refresh = useCallback(() => {
    setShipments(engine.getShipments());
    setTickets(engine.getTickets());
    setCustoms(engine.getCustoms());
    setWarehouses(engine.getWarehouses());
    setStock(engine.getStock());
    setEstimates(engine.getEstimates());
    setSummary(engine.getSummary());
  }, [engine]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* Shipments */
  const toggleNotify = useCallback(
    (id: string) => {
      engine.toggleNotify(id);
      refresh();
    },
    [engine, refresh],
  );

  /* Tickets */
  const createTicket = useCallback(
    async (input: TicketInput) => {
      const t = await engine.createTicket(input);
      refresh();
      return t;
    },
    [engine, refresh],
  );

  const setTicketStatus = useCallback(
    (id: string, status: TicketStatus) => {
      engine.setTicketStatus(id, status);
      refresh();
    },
    [engine, refresh],
  );

  /* Estimates */
  const buildEstimate = useCallback(
    (input: EstimateInput) => engine.buildEstimate(input),
    [engine],
  );

  const saveEstimate = useCallback(
    async (input: EstimateInput) => {
      const e = await engine.saveEstimate(input);
      refresh();
      return e;
    },
    [engine, refresh],
  );

  /* Customs */
  const setDocState = useCallback(
    (id: string, docKey: string, state: CustomsDocState) => {
      engine.setDocState(id, docKey, state);
      refresh();
    },
    [engine, refresh],
  );

  const payDuty = useCallback(
    (id: string) => {
      engine.payDuty(id);
      refresh();
    },
    [engine, refresh],
  );

  const release = useCallback(
    (id: string) => {
      engine.release(id);
      refresh();
    },
    [engine, refresh],
  );

  /* Warehouse */
  const checkInStock = useCallback(
    async (input: { cargoType: string; quantity: string; warehouseId: string; owner: string }) => {
      const item = await engine.checkInStock(input);
      refresh();
      return item;
    },
    [engine, refresh],
  );

  const releaseStock = useCallback(
    (id: string) => {
      engine.releaseStock(id);
      refresh();
    },
    [engine, refresh],
  );

  return {
    shipments,
    tickets,
    customs,
    warehouses,
    stock,
    estimates,
    summary,
    refresh,
    toggleNotify,
    createTicket,
    setTicketStatus,
    buildEstimate,
    saveEstimate,
    setDocState,
    payDuty,
    release,
    checkInStock,
    releaseStock,
  };
}