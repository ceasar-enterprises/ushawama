/**
 * Trucking Match Engine — connect trucks & trucking companies to cargo,
 * including return/backhaul loads right after a delivery.
 */

export type TruckStatus = 'available' | 'loading' | 'hauling' | 'at_destination';

export type CargoStatus = 'open' | 'assigned' | 'delivered';

export type Truck = {
  id: string;
  ownerId: string;
  company: string;
  driver: string;
  plate: string;
  capacityTonnes: number;
  route: string[];
  currentLocation: string;
  cargoOnBoardId?: string;
  status: TruckStatus;
  verified: boolean;
  phone: string;
  lastHaul?: string;
};

export type Cargo = {
  id: string;
  shipperId: string;
  shipperName: string;
  cargoType: string;
  weightTonnes: number;
  pickup: string;
  dropoff: string;
  border: string;
  offeredFee: number;
  currency: 'USD' | 'UGX' | 'KES' | 'TZS' | 'RWF';
  status: CargoStatus;
  truckId?: string;
  phone: string;
  postedAt: string;
};

export type CargoInput = {
  shipperName: string;
  cargoType: string;
  weightTonnes: number;
  pickup: string;
  dropoff: string;
  border: string;
  offeredFee: number;
  currency: Cargo['currency'];
  phone: string;
};

export type TruckMatch = { truck: Truck; score: number; reasons: string[] };
export type CargoMatch = { cargo: Cargo; score: number; reasons: string[] };

export const EAC_TOWNS = [
  'Kampala', 'Mbale', 'Busia', 'Malaba', 'Jinja',
  'Nairobi', 'Mombasa', 'Kitale', 'Namanga', 'Arusha',
];

export const BORDERS = ['Busia', 'Malaba', 'Namanga', 'Suam', 'Moyale'];

const del = (hours: number, days = 0) =>
  new Date(Date.now() - (hours * 60 + days * 1440) * 60000).toISOString();

const SEED_TRUCKS: Truck[] = [
  {
    id: 'trk_1', ownerId: 'truckco_1', company: 'Nile Hauliers Ltd', driver: 'Peter Okello',
    plate: 'UAY 340F', capacityTonnes: 32, route: ['Kampala', 'Busia', 'Nairobi'],
    currentLocation: 'Kampala', status: 'available', verified: true, phone: '+256 772 112 200',
  },
  {
    id: 'trk_2', ownerId: 'truckco_1', company: 'Nile Hauliers Ltd', driver: 'John Bwire',
    plate: 'UBC 118J', capacityTonnes: 20, route: ['Nairobi', 'Malaba', 'Kampala'],
    currentLocation: 'Nairobi', status: 'available', verified: true, phone: '+256 772 112 200',
  },
  {
    id: 'trk_3', ownerId: 'truckco_2', company: 'Equator Trucking Co', driver: 'Duncan Otieno',
    plate: 'KCZ 774B', capacityTonnes: 28, route: ['Mombasa', 'Nairobi', 'Malaba', 'Kampala'],
    currentLocation: 'Mombasa', status: 'available', verified: true, phone: '+254 711 445 998',
  },
  {
    id: 'trk_4', ownerId: 'truckco_2', company: 'Equator Trucking Co', driver: 'Naomi Wanjiku',
    plate: 'KDB 205P', capacityTonnes: 14, route: ['Kampala', 'Namanga', 'Arusha'],
    currentLocation: 'Kampala', status: 'available', verified: false, phone: '+254 711 445 998',
  },
  {
    id: 'trk_5', ownerId: 'truckco_3', company: 'Lake Victoria Freight', driver: 'Isaac Mwangi',
    plate: 'KCU 912X', capacityTonnes: 25, route: ['Mombasa', 'Nairobi', 'Busia', 'Kampala'],
    currentLocation: 'Nairobi', status: 'available', verified: true, phone: '+256 700 901 234',
  },
  {
    id: 'trk_6', ownerId: 'truckco_4', company: 'Katwe Transporters', driver: 'Sandra Akello',
    plate: 'UBC 663R', capacityTonnes: 18, route: ['Kampala', 'Mbale', 'Suam', 'Kitale'],
    currentLocation: 'Mbale', status: 'available', verified: false, phone: '+256 702 333 111',
  },
];

const SEED_CARGO: Cargo[] = [
  {
    id: 'crg_1', shipperId: 'shp_1', shipperName: 'Kampala Restaurateurs Co-op',
    cargoType: 'Maize (bags)', weightTonnes: 18, pickup: 'Kampala', dropoff: 'Nairobi',
    border: 'Busia', offeredFee: 450, currency: 'USD', status: 'open', phone: '+256 701 234 567',
    postedAt: del(6),
  },
  {
    id: 'crg_2', shipperId: 'shp_2', shipperName: 'Elgon Coffee Exporters',
    cargoType: 'Coffee', weightTonnes: 12, pickup: 'Mbale', dropoff: 'Nairobi',
    border: 'Busia', offeredFee: 320, currency: 'USD', status: 'open', phone: '+256 774 900 100',
    postedAt: del(3),
  },
  {
    id: 'crg_3', shipperId: 'shp_3', shipperName: 'Sima Warehouse Ltd',
    cargoType: 'Cement', weightTonnes: 26, pickup: 'Nairobi', dropoff: 'Kampala',
    border: 'Malaba', offeredFee: 380, currency: 'USD', status: 'open', phone: '+254 722 400 300',
    postedAt: del(1),
  },
  {
    id: 'crg_4', shipperId: 'shp_4', shipperName: 'Bandari Freight Agents',
    cargoType: 'Electronics', weightTonnes: 8, pickup: 'Mombasa', dropoff: 'Kampala',
    border: 'Busia', offeredFee: 600, currency: 'USD', status: 'open', phone: '+254 733 800 900',
    postedAt: del(2),
  },
  {
    id: 'crg_5', shipperId: 'shp_5', shipperName: 'Sunbelt Wholesale',
    cargoType: 'Charcoal', weightTonnes: 10, pickup: 'Nairobi', dropoff: 'Kampala',
    border: 'Busia', offeredFee: 220, currency: 'USD', status: 'open', phone: '+254 700 200 400',
    postedAt: del(5),
  },
  {
    id: 'crg_6', shipperId: 'shp_6', shipperName: 'Mara Valley Greens',
    cargoType: 'Vegetables (chilled)', weightTonnes: 6, pickup: 'Nairobi', dropoff: 'Arusha',
    border: 'Namanga', offeredFee: 180, currency: 'USD', status: 'open', phone: '+254 712 600 800',
    postedAt: del(8),
  },
  {
    id: 'crg_7', shipperId: 'shp_7', shipperName: 'Mbale Feeds Mill',
    cargoType: 'Animal feed', weightTonnes: 15, pickup: 'Mbale', dropoff: 'Kitale',
    border: 'Suam', offeredFee: 260, currency: 'USD', status: 'open', phone: '+256 778 500 600',
    postedAt: del(4),
  },
];

export class TruckingEngine {
  private trucks: Truck[] = [...SEED_TRUCKS];
  private cargo: Cargo[] = [...SEED_CARGO];

  getTrucks(): Truck[] {
    return this.trucks.slice();
  }

  getCargo(): Cargo[] {
    return this.cargo.slice();
  }

  getTruck(id: string): Truck | undefined {
    return this.trucks.find(t => t.id === id);
  }

  getCargoById(id: string): Cargo | undefined {
    return this.cargo.find(c => c.id === id);
  }

  async postCargo(shipperId: string, input: CargoInput): Promise<Cargo> {
    const cargo: Cargo = {
      id: `crg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      shipperId,
      shipperName: input.shipperName,
      cargoType: input.cargoType,
      weightTonnes: input.weightTonnes,
      pickup: input.pickup,
      dropoff: input.dropoff,
      border: input.border,
      offeredFee: input.offeredFee,
      currency: input.currency,
      status: 'open',
      phone: input.phone,
      postedAt: new Date().toISOString(),
    };
    this.cargo.unshift(cargo);
    return cargo;
  }

  matchTrucksForCargo(cargoId: string, limit = 3): TruckMatch[] {
    const cargo = this.getCargoById(cargoId);
    if (!cargo || cargo.status !== 'open') return [];
    return this.trucks
      .filter(t => t.status === 'available' || t.status === 'at_destination')
      .map(truck => this.scoreTruck(truck, cargo))
      .filter(m => m.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  matchCargoForTruck(truckId: string, limit = 3): CargoMatch[] {
    const truck = this.getTruck(truckId);
    if (!truck) return [];
    return this.cargo
      .filter(c => c.status === 'open')
      .map(cargo => this.scoreCargo(truck, cargo))
      .filter(m => m.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async dispatch(truckId: string, cargoId: string): Promise<void> {
    const truck = this.getTruck(truckId);
    const cargo = this.getCargoById(cargoId);
    if (!truck || !cargo) return;
    truck.cargoOnBoardId = cargo.id;
    truck.status = 'hauling';
    truck.currentLocation = cargo.pickup;
    cargo.truckId = truck.id;
    cargo.status = 'assigned';
  }

  completeDelivery(truckId: string, cargoId: string): {
    truck: Truck;
    cargo: Cargo;
    returnLoads: CargoMatch[];
  } | null {
    const truck = this.getTruck(truckId);
    const cargo = this.getCargoById(cargoId);
    if (!truck || !cargo) return null;

    cargo.status = 'delivered';
    truck.cargoOnBoardId = undefined;
    truck.status = 'at_destination';
    truck.currentLocation = cargo.dropoff;
    truck.lastHaul = cargo.cargoType;

    const returnLoads = this.cargo
      .filter(c => c.status === 'open' && (c.pickup === cargo.dropoff || this.onRoute(truck.route, c.pickup)))
      .map(c => this.scoreCargo(truck, c))
      .filter(m => m.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return { truck, cargo, returnLoads };
  }

  private onRoute(route: string[], town: string): boolean {
    if (route.includes(town)) return true;
    const re = new RegExp(town, 'i');
    return route.some(stop => re.test(stop));
  }

  private scoreTruck(truck: Truck, cargo: Cargo): TruckMatch {
    let score = 0;
    const reasons: string[] = [];

    const capacityRatio = truck.capacityTonnes / cargo.weightTonnes;
    if (capacityRatio >= 1) {
      score += 30;
      reasons.push('Fits in capacity');
    } else {
      score += Math.round(20 * capacityRatio);
      reasons.push('Partial capacity only');
    }

    if (truck.currentLocation === cargo.pickup) {
      score += 30;
      reasons.push('Ready at pickup point');
    } else if (this.onRoute(truck.route, cargo.pickup)) {
      score += 18;
      reasons.push('Passes pickup point');
    } else {
      score += 5;
      reasons.push('Off normal route');
    }

    if (this.onRoute(truck.route, cargo.dropoff)) {
      score += 20;
      reasons.push('Dropoff on route');
    } else if (this.onRoute(truck.route, cargo.border)) {
      score += 12;
      reasons.push('Border on route');
    }

    if (this.onRoute(truck.route, cargo.border)) score += 10;
    if (truck.verified) {
      score += 5;
      reasons.push('Verified company');
    }
    if (truck.currentLocation === cargo.pickup) {
      score += 5;
      reasons.push('Likely return load — no empty run');
    }

    return { truck, score: Math.min(100, score), reasons };
  }

  private scoreCargo(truck: Truck, cargo: Cargo): CargoMatch {
    const truckMatch = this.scoreTruck(truck, cargo);
    return { cargo, score: truckMatch.score, reasons: truckMatch.reasons };
  }
}