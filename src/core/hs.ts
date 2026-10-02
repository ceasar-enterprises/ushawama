/**
 * HS Code Service — TypeScript adapter
 * Bridges the core HsCodeService into React Native.
 */

import { HsCodeService as _HsCodeService, EAC_DUTY_RATES } from './hs-codes';

const service = new _HsCodeService();

export type HsSearchResult = {
  code: string;
  description: string;
  level: string;
  source: string;
  duty?: number;
  vat?: number;
};

export type HsCodeDetail = {
  code: string;
  description: string;
  children?: string[];
  parent?: string;
  source: string;
  duty?: number;
  vat?: number;
  note?: string;
};

export async function searchHsCodes(query: string, lang = 'en'): Promise<HsSearchResult[]> {
  return service.search(query, lang) as Promise<HsSearchResult[]>;
}

export async function getHsCode(code: string): Promise<HsCodeDetail | null> {
  return service.getByCode(code) as Promise<HsCodeDetail | null>;
}

export async function classifyProduct(description: string): Promise<HsSearchResult | null> {
  return service.classify(description) as Promise<HsSearchResult | null>;
}

export function getChapterInfo(hsCode: string) {
  return service.getChapterInfo(hsCode);
}

export { EAC_DUTY_RATES };
