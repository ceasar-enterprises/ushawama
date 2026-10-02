/**
 * Operations Command Engine — command centre data layer for Ushawama:
 * live shipment tracking, ticketing, customs clearing, cost estimates and
 * warehousing. All local/in-memory (mirrors the trucking/trade engine pattern).
 */

/* ────────────────────────────── Shipments (live tracking) ────────────────── */

export type ShipmentStage = 'booked' | 'in_transit' | 'at_border' | 'cleared' | 'delivered';

export type ShipmentTimelineStep = {
  key: string;
  label: string;
  done: boolean;
  at?: string;
};

export type Shipment = {
  id: string;
  ref: string;
  cargoType: string;
  weightTonnes: number;
  origin: string;
  destination: string;
  border: string;
  carrier: string;
  plate: string;
  driver: string;
  phone: string;
  status: ShipmentStage;
  progressPct: number;
  eta: string;
  stops: string[];
  currentLocation: string;
  timeline: ShipmentTimelineStep[];
  notify: boolean;
};

/* ───────────────────────────────────── Tickets ───────────────────────────── */

export type TicketCategory = 'customs' | 'delivery' | 'payment' | 'warehouse' | 'app';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type Ticket = {
  id: string;
  ref: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketInput = {
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
};

/* ────────────────────────────────── Estimates ────────────────────────────── */

export type EstimateLine = {
  key: string;
  label: string;
  amount: number;
  note?: string;
};

export type EstimateInput = {
  cargoType: string;
  valueUSD: number;
  weightTonnes: number;
  origin: string;
  destination: string;
  border: string;
  monthsInWarehouse: number;
};

export type Estimate = {
  id: string;
  ref: string;
  cargoType: string;
  border: string;
  freightUSD: number;
  dutyUSD: number;
  vatUSD: number;
  feesUSD: number;
  warehousingUSD: number;
  totalUSD: number;
  lines: EstimateLine[];
  createdAt: string;
};

/* ───────────────────────────────── Customs ───────────────────────────────── */

export type CustomsDocState = 'missing' | 'uploaded' | 'verified';
export type CustomsStatus = 'draft' | 'submitted' | 'in_review' | 'duty_due' | 'released';

export type CustomsDoc = {
  key: string;
  name: string;
  state: CustomsDocState;
};

export type CustomsFiling = {
  id: string;
  ref: string;
  declarationId: string;
  cargo: string;
  border: string;
  regime: 'formal' | 'simplified';
  importer: string;
  agent: string;
  status: CustomsStatus;
  dutyDue: number;
  dutyPaid: number;
  currency: 'USD';
  stages: { key: string; label: string; done: boolean; active?: boolean; at?: string }[];
  documents: CustomsDoc[];
  updatedAt: string;
};

/* ──────────────────────────────── Warehouse ──────────────────────────────── */

export type Warehouse = {
  id: string;
  name: string;
  city: string;
  capacityTonne: number;
  usedTonne: number;
  ratePerTonnePerMonth: number;
};

export type StockItem = {
  id: string;
  ref: string;
  cargoType: string;
  quantity: string;
  bin: string;
  warehouseId: string;
  arrival: string;
  expires?: string;
  owner: string;
};

/* ───────────────────────────── Command summary ───────────────────────────── */

export type OpsAlert = {
  id: string;
  kind: 'urgent' | 'warn' | 'info' | 'good';
  text: string;
};

export type CommandSummary = {
  shipments: { total: number; inTransit: number; atBorder: number; delivered: number };
  tickets: { open: number; urgent: number };
  customs: { active: number; dutyDue: number };
  warehouse: { usedPct: number };
  estimates: { count: number };
  alerts: OpsAlert[];
};

/* ────────────────────────────────── Helpers ──────────────────────────────── */

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600000).toISOString();

const REF = (prefix: string) =>
  `${prefix}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`;

/* ────────────────────────────────── Seed data ────────────────────────────── */

export const EAC_TOWNS = [
  'Kampala', 'Busia', 'Malaba', 'Jinja', 'Mbale',
  'Nairobi', 'Mombasa', 'Kitale', 'Namanga', 'Arusha',
];

const SEED_SHIPMENTS: Shipment[] = [
  {
    id: 'shp_1', ref: 'SH-2026-2041', cargoType: 'Coffee (green, 60kg bags)', weightTonnes: 12,
    origin: 'Mbale', destination: 'Nairobi', border: 'Busia', carrier: 'Nile Hauliers Ltd',
    plate: 'UBC 118J', driver: 'John Bwire', phone: '+256 772 112 200',
    status: 'in_transit', progressPct: 46, eta: hoursFromNow(9),
    stops: ['Mbale', 'Tororo', 'Busia', 'Malaba', 'Nairobi'], currentLocation: 'Tororo',
    timeline: [
      { key: 'booked', label: 'Booked at Mbale depot', done: true, at: hoursAgo(14) },
      { key: 'in_transit', label: 'Loaded and moving', done: true, at: hoursAgo(10) },
      { key: 'at_border', label: 'At Busia border', done: false },
      { key: 'cleared', label: 'Customs cleared', done: false },
      { key: 'delivered', label: 'Delivered to Nairobi', done: false },
    ],
    notify: true,
  },
  {
    id: 'shp_2', ref: 'SH-2026-2038', cargoType: 'Maize (bags)', weightTonnes: 18,
    origin: 'Kampala', destination: 'Kampala', border: 'Busia', carrier: 'Equator Trucking Co',
    plate: 'KCZ 774B', driver: 'Duncan Otieno', phone: '+254 711 445 998',
    status: 'at_border', progressPct: 72, eta: hoursFromNow(20),
    stops: ['Kampala', 'Busia', 'Nairobi'], currentLocation: 'Busia (entry)',
    timeline: [
      { key: 'booked', label: 'Booked at Kampala', done: true, at: hoursAgo(30) },
      { key: 'in_transit', label: 'Loaded and moving', done: true, at: hoursAgo(26) },
      { key: 'at_border', label: 'At Busia — awaiting clearance', done: true, at: hoursAgo(6) },
      { key: 'cleared', label: 'Customs cleared', done: false },
      { key: 'delivered', label: 'Delivered', done: false },
    ],
    notify: true,
  },
  {
    id: 'shp_3', ref: 'SH-2026-2029', cargoType: 'Electronics (palletised)', weightTonnes: 8,
    origin: 'Mombasa', destination: 'Kampala', border: 'Malaba', carrier: 'Lake Victoria Freight',
    plate: 'KCU 912X', driver: 'Isaac Mwangi', phone: '+256 700 901 234',
    status: 'cleared', progressPct: 88, eta: hoursFromNow(6),
    stops: ['Mombasa', 'Nairobi', 'Malaba', 'Kampala'], currentLocation: 'Malaba (cleared)',
    timeline: [
      { key: 'booked', label: 'Booked at Mombasa', done: true, at: hoursAgo(60) },
      { key: 'in_transit', label: 'Loaded and moving', done: true, at: hoursAgo(52) },
      { key: 'at_border', label: 'At Malaba border', done: true, at: hoursAgo(12) },
      { key: 'cleared', label: 'Customs cleared', done: true, at: hoursAgo(3) },
      { key: 'delivered', label: 'Delivered to Kampala', done: false },
    ],
    notify: true,
  },
  {
    id: 'shp_4', ref: 'SH-2026-2021', cargoType: 'Vegetables (chilled)', weightTonnes: 6,
    origin: 'Nairobi', destination: 'Arusha', border: 'Namanga', carrier: 'Equator Trucking Co',
    plate: 'KDB 205P', driver: 'Naomi Wanjiku', phone: '+254 711 445 998',
    status: 'delivered', progressPct: 100, eta: hoursAgo(4),
    stops: ['Nairobi', 'Namanga', 'Arusha'], currentLocation: 'Arusha',
    timeline: [
      { key: 'booked', label: 'Booked at Nairobi', done: true, at: hoursAgo(38) },
      { key: 'in_transit', label: 'Loaded and moving', done: true, at: hoursAgo(34) },
      { key: 'at_border', label: 'At Namanga border', done: true, at: hoursAgo(20) },
      { key: 'cleared', label: 'Customs cleared', done: true, at: hoursAgo(16) },
      { key: 'delivered', label: 'Delivered to Arusha', done: true, at: hoursAgo(4) },
    ],
    notify: false,
  },
];

const SEED_TICKETS: Ticket[] = [
  {
    id: 'tck_1', ref: 'TCK-2026-0312', title: 'Maize shipment stuck at Busia — clearance, please',
    category: 'customs', priority: 'urgent', status: 'in_progress',
    description: 'Truck KCZ 774B has been at Busia entry for 6 hours with no agent assigned.',
    createdAt: hoursAgo(5), updatedAt: hoursAgo(2),
  },
  {
    id: 'tck_2', ref: 'TCK-2026-0311', title: 'Payment invoice mismatch', category: 'payment',
    priority: 'high', status: 'open',
    description: 'Invoice INV-88123 shows UGX 2,400,000 but I was charged UGX 2,500,000.',
    createdAt: hoursAgo(26), updatedAt: hoursAgo(26),
  },
  {
    id: 'tck_3', ref: 'TCK-2026-0308', title: 'Warehouse bin access after hours', category: 'warehouse',
    priority: 'medium', status: 'resolved',
    description: 'Access refused at Katwe depot after 8pm. Resolved - guard was not briefed.',
    createdAt: hoursAgo(50), updatedAt: hoursAgo(20),
  },
  {
    id: 'tck_4', ref: 'TCK-2026-0305', title: 'App: voice search stops mid-sentence', category: 'app',
    priority: 'low', status: 'open',
    description: 'Occurs on Android after ~15s of dictation.',
    createdAt: hoursAgo(90), updatedAt: hoursAgo(60),
  },
];

const SEED_CUSTOMS: CustomsFiling[] = [
  {
    id: 'cus_1', ref: 'CUS-2026-0451', declarationId: 'UG/2026/0451',
    cargo: 'Coffee (green) — 12 t', border: 'Busia', regime: 'formal',
    importer: 'Elgon Coffee Exporters', agent: 'Ushawama Agent Desk',
    status: 'in_review', dutyDue: 640, dutyPaid: 0, currency: 'USD',
    stages: [
      { key: 'documents', label: 'Documents', done: true, at: hoursAgo(28) },
      { key: 'verification', label: 'Verification', done: true, active: true, at: hoursAgo(6) },
      { key: 'duty', label: 'Pay duty', done: false },
      { key: 'release', label: 'Release', done: false },
    ],
    documents: [
      { key: 'invoice', name: 'Commercial Invoice', state: 'verified' },
      { key: 'packing', name: 'Packing List', state: 'verified' },
      { key: 'coo', name: 'Certificate of Origin', state: 'verified' },
      { key: 'sps', name: 'SPS Certificate', state: 'missing' },
    ],
    updatedAt: hoursAgo(6),
  },
  {
    id: 'cus_2', ref: 'CUS-2026-0449', declarationId: 'UG/2026/0449',
    cargo: 'Maize (bags) — 18 t', border: 'Busia', regime: 'simplified',
    importer: 'Kampala Restaurateurs Co-op', agent: 'Self',
    status: 'duty_due', dutyDue: 285, dutyPaid: 0, currency: 'USD',
    stages: [
      { key: 'documents', label: 'Documents', done: true, at: hoursAgo(20) },
      { key: 'verification', label: 'Verification', done: true, at: hoursAgo(10) },
      { key: 'duty', label: 'Pay duty', done: false, active: true },
      { key: 'release', label: 'Release', done: false },
    ],
    documents: [
      { key: 'invoice', name: 'Commercial Invoice', state: 'verified' },
      { key: 'packing', name: 'Packing List', state: 'uploaded' },
      { key: 'coo', name: 'Certificate of Origin', state: 'missing' },
    ],
    updatedAt: hoursAgo(3),
  },
  {
    id: 'cus_3', ref: 'CUS-2026-0433', declarationId: 'UG/2026/0433',
    cargo: 'Electronics (palletised) — 8 t', border: 'Malaba', regime: 'formal',
    importer: 'Bandari Freight Agents', agent: 'Ushawama Agent Desk',
    status: 'released', dutyDue: 1080, dutyPaid: 1080, currency: 'USD',
    stages: [
      { key: 'documents', label: 'Documents', done: true, at: hoursAgo(48) },
      { key: 'verification', label: 'Verification', done: true, at: hoursAgo(30) },
      { key: 'duty', label: 'Pay duty', done: true, at: hoursAgo(12) },
      { key: 'release', label: 'Release', done: true, at: hoursAgo(4) },
    ],
    documents: [
      { key: 'invoice', name: 'Commercial Invoice', state: 'verified' },
      { key: 'packing', name: 'Packing List', state: 'verified' },
      { key: 'coo', name: 'Certificate of Origin', state: 'verified' },
    ],
    updatedAt: hoursAgo(4),
  },
];

const SEED_WAREHOUSES: Warehouse[] = [
  { id: 'wh_1', name: 'Busia Trade Hub', city: 'Busia', capacityTonne: 400, usedTonne: 264, ratePerTonnePerMonth: 9 },
  { id: 'wh_2', name: 'Katwe Distribution Depot', city: 'Kampala', capacityTonne: 650, usedTonne: 388, ratePerTonnePerMonth: 7 },
  { id: 'wh_3', name: 'Malaba Transit Terminal', city: 'Malaba', capacityTonne: 300, usedTonne: 141, ratePerTonnePerMonth: 8 },
];

const SEED_STOCK: StockItem[] = [
  {
    id: 'stk_1', ref: 'STK-2041', cargoType: 'Coffee (green bags)', quantity: '14 t',
    bin: 'B-12', warehouseId: 'wh_1', arrival: hoursAgo(72), expires: hoursFromNow(24 * 40), owner: 'Elgon Coffee Exporters',
  },
  {
    id: 'stk_2', ref: 'STK-2036', cargoType: 'Maize (bags)', quantity: '18 t',
    bin: 'A-04', warehouseId: 'wh_1', arrival: hoursAgo(30), owner: 'Kampala Restaurateurs Co-op',
  },
  {
    id: 'stk_3', ref: 'STK-2028', cargoType: 'Electronics (palletised)', quantity: '8 t',
    bin: 'C-01', warehouseId: 'wh_2', arrival: hoursAgo(55), expires: hoursFromNow(24 * 60), owner: 'Bandari Freight Agents',
  },
  {
    id: 'stk_4', ref: 'STK-2022', cargoType: 'Charcoal', quantity: '10 t',
    bin: 'B-31', warehouseId: 'wh_3', arrival: hoursAgo(120), owner: 'Sunbelt Wholesale',
  },
  {
    id: 'stk_5', ref: 'STK-2016', cargoType: 'Animal feed', quantity: '15 t',
    bin: 'A-09', warehouseId: 'wh_2', arrival: hoursAgo(160), expires: hoursFromNow(24 * 12), owner: 'Mbale Feeds Mill',
  },
  {
    id: 'stk_6', ref: 'STK-2009', cargoType: 'Vegetables (chilled)', quantity: '6 t',
    bin: 'C-22', warehouseId: 'wh_3', arrival: hoursAgo(200), expires: hoursFromNow(24 * 3), owner: 'Mara Valley Greens',
  },
];

const DUTY_RATE = 0.08;
const VAT_RATE = 0.18;

/* ────────────────────────────────── Engine ───────────────────────────────── */

export class OpsEngine {
  private shipments: Shipment[] = [...SEED_SHIPMENTS];
  private tickets: Ticket[] = [...SEED_TICKETS];
  private customs: CustomsFiling[] = [...SEED_CUSTOMS];
  private warehouse: Warehouse[] = [...SEED_WAREHOUSES];
  private stock: StockItem[] = [...SEED_STOCK];
  private estimates: Estimate[] = [];

  /* Shipments */
  getShipments(): Shipment[] {
    return this.shipments.slice();
  }

  toggleNotify(id: string): void {
    const s = this.shipments.find(x => x.id === id);
    if (s) s.notify = !s.notify;
  }

  /* Tickets */
  getTickets(): Ticket[] {
    return [...this.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createTicket(input: TicketInput): Promise<Ticket> {
    const now = new Date().toISOString();
    const t: Ticket = {
      id: `tck_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ref: REF('TCK'),
      title: input.title.trim(),
      category: input.category,
      priority: input.priority,
      status: 'open',
      description: input.description.trim(),
      createdAt: now,
      updatedAt: now,
    };
    this.tickets.unshift(t);
    return t;
  }

  setTicketStatus(id: string, status: TicketStatus): void {
    const t = this.tickets.find(x => x.id === id);
    if (t) {
      t.status = status;
      t.updatedAt = new Date().toISOString();
    }
  }

  /* Estimates */
  getEstimates(): Estimate[] {
    return [...this.estimates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  buildEstimate(input: EstimateInput): Estimate {
    const cif = input.valueUSD;
    const freight = Math.round(140 + input.weightTonnes * 16);
    const duty = Math.round(cif * DUTY_RATE);
    const vat = Math.round((cif + duty) * VAT_RATE);
    const inspection = Math.round(cif * 0.03);
    const documentation = 18;
    const insurance = Math.round(cif * 0.01);
    const handling = Math.round(input.weightTonnes * 5);
    const warehousing =
      input.monthsInWarehouse > 0 ? Math.round(input.weightTonnes * 8 * input.monthsInWarehouse) : 0;

    const fees = inspection + documentation + insurance + handling;

    return {
      id: `est_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ref: REF('EST'),
      cargoType: input.cargoType.trim(),
      border: input.border,
      freightUSD: freight,
      dutyUSD: duty,
      vatUSD: vat,
      feesUSD: fees,
      warehousingUSD: warehousing,
      totalUSD: freight + duty + vat + fees + warehousing,
      createdAt: new Date().toISOString(),
      lines: [
        { key: 'freight', label: `Road freight (${input.origin} → ${input.destination})`, amount: freight, note: `${input.weightTonnes} t` },
        { key: 'duty', label: `Customs duty (${Math.round(DUTY_RATE * 100)}% of CIF)`, amount: duty, note: 'EAC CET rate' },
        { key: 'vat', label: `VAT (${Math.round(VAT_RATE * 100)}%)`, amount: vat },
        { key: 'fees', label: 'Inspection, docs, insurance & handling', amount: fees },
        ...(warehousing > 0
          ? [{ key: 'wh', label: `Warehousing (${input.monthsInWarehouse} mo @ $8/t)`, amount: warehousing }]
          : []),
      ],
    };
  }

  async saveEstimate(input: EstimateInput): Promise<Estimate> {
    const est = this.buildEstimate(input);
    this.estimates.unshift(est);
    return est;
  }

  /* Customs */
  getCustoms(): CustomsFiling[] {
    return [...this.customs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  setDocState(id: string, docKey: string, state: CustomsDocState): void {
    const f = this.customs.find(x => x.id === id);
    const doc = f?.documents.find(d => d.key === docKey);
    if (f && doc && doc.state !== 'verified') doc.state = state;
  }

  payDuty(id: string): void {
    const f = this.customs.find(x => x.id === id);
    if (!f) return;
    f.dutyPaid = f.dutyDue;
    for (const s of f.stages) {
      if (s.key === 'duty') { s.done = true; s.active = false; }
      if (s.key === 'release') { s.active = true; }
    }
    f.status = 'in_review';
    f.updatedAt = new Date().toISOString();
  }

  release(id: string): void {
    const f = this.customs.find(x => x.id === id);
    if (!f) return;
    f.status = 'released';
    for (const s of f.stages) {
      s.done = true;
      s.active = false;
      s.at = s.at ?? new Date().toISOString();
    }
    f.updatedAt = new Date().toISOString();
  }

  /* Warehouse */
  getWarehouses(): Warehouse[] {
    return this.warehouse.slice();
  }

  getStock(): StockItem[] {
    return [...this.stock].sort((a, b) => (a.expires ?? '').localeCompare(b.expires ?? ''));
  }

  async checkInStock(input: { cargoType: string; quantity: string; warehouseId: string; owner: string }): Promise<StockItem> {
    const w = this.warehouse.find(x => x.id === input.warehouseId);
    const tonnes = parseFloat(input.quantity) || 0;
    const item: StockItem = {
      id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ref: REF('STK'),
      cargoType: input.cargoType.trim(),
      quantity: `${Math.round(tonnes * 10) / 10} t`,
      bin: `B-${String(1 + Math.floor(Math.random() * 40)).padStart(2, '0')}`,
      warehouseId: input.warehouseId,
      arrival: new Date().toISOString(),
      owner: input.owner.trim(),
    };
    if (w) w.usedTonne = Math.min(w.capacityTonne, w.usedTonne + tonnes);
    this.stock.unshift(item);
    return item;
  }

  releaseStock(id: string): void {
    const item = this.stock.find(x => x.id === id);
    const w = item && this.warehouse.find(x => x.id === item.warehouseId);
    if (item && w) {
      w.usedTonne = Math.max(0, w.usedTonne - (parseFloat(item.quantity) || 0));
      this.stock = this.stock.filter(x => x.id !== id);
    }
  }

  /* Summary */
  getSummary(): CommandSummary {
    const inTransit = this.shipments.filter(s => s.status === 'in_transit').length;
    const atBorder = this.shipments.filter(s => s.status === 'at_border').length;
    const delivered = this.shipments.filter(s => s.status === 'delivered').length;
    const openTickets = this.tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
    const urgent = openTickets.filter(t => t.priority === 'urgent' || t.priority === 'high');
    const activeCustoms = this.customs.filter(c => c.status !== 'released');
    const dutyDue = activeCustoms
      .filter(c => c.status === 'duty_due')
      .reduce((sum, c) => sum + (c.dutyDue - c.dutyPaid), 0);
    const usedPct = Math.round(
      (this.warehouse.reduce((s, w) => s + w.usedTonne, 0) /
        this.warehouse.reduce((s, w) => s + w.capacityTonne, 0)) * 100,
    );
    const expiringSoon = this.stock.filter(s => {
      if (!s.expires) return false;
      return new Date(s.expires).getTime() - Date.now() < 24 * 3600000 * 14;
    }).length;

    const alerts: OpsAlert[] = [];
    const borderShipment = this.shipments.find(s => s.status === 'at_border');
    if (borderShipment) {
      alerts.push({
        id: 'a_border',
        kind: 'warn',
        text: `${borderShipment.ref} ${borderShipment.cargoType.toLowerCase()} waiting at ${borderShipment.border} for clearance.`,
      });
    }
    const openUrgent = this.tickets.find(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed');
    if (openUrgent) {
      alerts.push({ id: 'a_ticket', kind: 'urgent', text: `Urgent ticket ${openUrgent.ref}: ${openUrgent.title}.` });
    }
    if (expiringSoon > 0) {
      alerts.push({ id: 'a_expire', kind: 'info', text: `${expiringSoon} stock item${expiringSoon > 1 ? 's' : ''} expiring within 14 days.` });
    }
    if (dutyDue > 0) {
      alerts.push({ id: 'a_duty', kind: 'info', text: `Duty payment of $${dutyDue} due to release cargo at the border.` });
    }
    if (alerts.length === 0) {
      alerts.push({ id: 'a_good', kind: 'good', text: 'All corridors clear. No action needed right now.' });
    }

    return {
      shipments: { total: this.shipments.length, inTransit, atBorder, delivered },
      tickets: { open: openTickets.length, urgent: urgent.length },
      customs: { active: activeCustoms.length, dutyDue },
      warehouse: { usedPct },
      estimates: { count: this.estimates.length },
      alerts,
    };
  }
}