/**
 * Duty Calculator — TypeScript adapter
 * Bridges the core DutyCalculator (Node.js/CommonJS) into React Native.
 * On mobile the HS API calls still work; offline falls back to local EAC rates.
 */

import { HsCodeService, EAC_DUTY_RATES } from './hs-codes';
import {
  DutyCalculator as _DutyCalc,
  VAT_RATES,
  NTB_COSTS,
  STR_THRESHOLDS,
} from './duty-calculator';

const calc = new _DutyCalc();

export type DutyParams = {
  productDescription: string;
  hsCode?: string;
  quantity: number;
  unit: string;
  unitPriceUSD: number;
  origin: string;
  destination: string;
  border: string;
  tradeRegime: 'formal' | 'simplified';
};

export type DutyResult = {
  product: string;
  hsCode: string;
  hsDescription: string;
  quantity: number;
  unit: string;
  unitPriceUSD: number;
  totalValueUSD: number;
  cifValue: number;
  fees: {
    customsDuty: number;
    vat: number;
    inspection: number;
    documentation: number;
    certificateOfOrigin: number;
    spsCertificate: number;
    total: number;
  };
  totalLandedCost: number;
  totalPerUnit: number;
  origin: string;
  destination: string;
  border: string;
  tradeRegime: string;
  isIntraEAC: boolean;
  isSTR: boolean;
  isAgricultural: boolean;
  dutyRate: string;
  vatRate: string;
  warnings: Array<{ type: string; message: string }>;
};

export type QuickEstimate = {
  product: string;
  hsCode?: string;
  hsDescription?: string;
  estimated: boolean;
  dutyRate?: string;
  vatRate?: string;
  message?: string;
  note?: string;
};

export async function calculateDuty(params: DutyParams): Promise<DutyResult> {
  return calc.calculate(params as any) as Promise<DutyResult>;
}

export async function quickEstimate(
  productName: string,
  destination = 'KE',
  origin = 'UG',
): Promise<QuickEstimate> {
  return calc.quickEstimate(productName, destination, origin) as Promise<QuickEstimate>;
}

export function getChapterInfo(hsCode: string) {
  return calc.hsService.getChapterInfo(hsCode);
}

export { EAC_DUTY_RATES, VAT_RATES, NTB_COSTS, STR_THRESHOLDS };
