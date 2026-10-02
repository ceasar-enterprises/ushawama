/**
 * HS Code Lookup Service (portable: works in React Native and Node 18+)
 * Uses global fetch for network + in-memory cache for offline fallback.
 * Sources: HS Code Atlas, Harmonized System API, URA Online Tariff
 */

const API_BASE = 'https://hscodeatlas.com/api';
const SEARCH_API = 'https://hs.datahub.io/api/v1/products/search';

// EAC Common External Tariff rates (simplified — real rates from URA)
const EAC_DUTY_RATES = {
  // Chapter 01-24: Agricultural products
  '01': { description: 'Live animals', duty: 0, vat: 18 },
  '02': { description: 'Meat and edible offal', duty: 25, vat: 18 },
  '03': { description: 'Fish and aquatic invertebrates', duty: 25, vat: 18 },
  '04': { description: 'Dairy produce; birds eggs', duty: 60, vat: 18 },
  '06': { description: 'Live trees and plants', duty: 10, vat: 18 },
  '07': { description: 'Edible vegetables', duty: 25, vat: 18 },
  '08': { description: 'Edible fruit and nuts', duty: 25, vat: 18 },
  '09': { description: 'Coffee, tea, spices', duty: 0, vat: 18 },
  '10': { description: 'Cereals', duty: 60, vat: 18 },
  '12': { description: 'Oil seeds', duty: 10, vat: 18 },
  '14': { description: 'Vegetable plaiting materials', duty: 10, vat: 18 },
  '15': { description: 'Fats and oils', duty: 25, vat: 18 },
  '19': { description: 'Preparations of cereals', duty: 60, vat: 18 },
  '21': { description: 'Miscellaneous edible preparations', duty: 60, vat: 18 },
  '22': { description: 'Beverages, spirits and vinegar', duty: 60, vat: 18 },
  '24': { description: 'Tobacco and manufactured substitutes', duty: 60, vat: 18 },
  // Chapter 25-97: Industrial products
  '25': { description: 'Salt; sulphur; earths; cement', duty: 10, vat: 18 },
  '26': { description: 'Ores, slag and ash', duty: 0, vat: 18 },
  '27': { description: 'Mineral fuels, oils', duty: 25, vat: 18 },
  '28': { description: 'Inorganic chemicals', duty: 10, vat: 18 },
  '29': { description: 'Organic chemicals', duty: 10, vat: 18 },
  '30': { description: 'Pharmaceutical products', duty: 0, vat: 18 },
  '31': { description: 'Fertilizers', duty: 10, vat: 18 },
  '32': { description: 'Tanning or dyeing extracts', duty: 10, vat: 18 },
  '33': { description: 'Essential oils and resinoids', duty: 10, vat: 18 },
  '34': { description: 'Soap, organic surface-active agents', duty: 25, vat: 18 },
  '35': { description: 'Albuminoidal substances; modified starches', duty: 10, vat: 18 },
  '36': { description: 'Explosives; pyrotechnic products', duty: 10, vat: 18 },
  '37': { description: 'Photographic or cinematographic goods', duty: 25, vat: 18 },
  '38': { description: 'Miscellaneous chemical products', duty: 10, vat: 18 },
  '39': { description: 'Plastics and articles thereof', duty: 25, vat: 18 },
  '40': { description: 'Rubber and articles thereof', duty: 25, vat: 18 },
  '41': { description: 'Raw hides and skins', duty: 10, vat: 18 },
  '42': { description: 'Articles of leather', duty: 25, vat: 18 },
  '43': { description: 'Furskins and artificial fur', duty: 25, vat: 18 },
  '44': { description: 'Wood and articles of wood', duty: 10, vat: 18 },
  '45': { description: 'Cork and articles of cork', duty: 10, vat: 18 },
  '46': { description: 'Basketware and wickerwork', duty: 10, vat: 18 },
  '47': { description: 'Pulp of wood', duty: 0, vat: 18 },
  '48': { description: 'Paper and paperboard', duty: 25, vat: 18 },
  '49': { description: 'Printed books, newspapers', duty: 0, vat: 18 },
  '50': { description: 'Silk', duty: 25, vat: 18 },
  '51': { description: 'Wool, fine or coarse animal hair', duty: 25, vat: 18 },
  '52': { description: 'Cotton', duty: 10, vat: 18 },
  '53': { description: 'Other vegetable textile fibres', duty: 10, vat: 18 },
  '54': { description: 'Man-made filaments', duty: 25, vat: 18 },
  '55': { description: 'Man-made staple fibres', duty: 25, vat: 18 },
  '56': { description: 'Wadding, felt and nonwovens', duty: 25, vat: 18 },
  '57': { description: 'Carpets and other textile floor coverings', duty: 25, vat: 18 },
  '58': { description: 'Special woven fabrics', duty: 25, vat: 18 },
  '59': { description: 'Impregnated, coated, covered or laminated textile fabrics', duty: 25, vat: 18 },
  '60': { description: 'Knitted or crocheted fabrics', duty: 25, vat: 18 },
  '61': { description: 'Articles of apparel, knitted or crocheted', duty: 25, vat: 18 },
  '62': { description: 'Articles of apparel, not knitted or crocheted', duty: 25, vat: 18 },
  '63': { description: 'Other made up textile articles', duty: 25, vat: 18 },
  '64': { description: 'Footwear, gaiters and the like', duty: 25, vat: 18 },
  '65': { description: 'Headgear and parts thereof', duty: 25, vat: 18 },
  '66': { description: 'Umbrellas, sun umbrellas, walking-sticks', duty: 25, vat: 18 },
  '67': { description: 'Prepared feathers and down', duty: 25, vat: 18 },
  '68': { description: 'Articles of stone, plaster, cement', duty: 10, vat: 18 },
  '69': { description: 'Ceramic products', duty: 25, vat: 18 },
  '70': { description: 'Glass and glassware', duty: 25, vat: 18 },
  '71': { description: 'Natural or cultured pearls, precious stones', duty: 25, vat: 18 },
  '72': { description: 'Iron and steel', duty: 25, vat: 18 },
  '73': { description: 'Articles of iron or steel', duty: 25, vat: 18 },
  '74': { description: 'Copper and articles thereof', duty: 10, vat: 18 },
  '75': { description: 'Nickel and articles thereof', duty: 10, vat: 18 },
  '76': { description: 'Aluminium and articles thereof', duty: 25, vat: 18 },
  '78': { description: 'Lead and articles thereof', duty: 10, vat: 18 },
  '79': { description: 'Zinc and articles thereof', duty: 10, vat: 18 },
  '80': { description: 'Tin and articles thereof', duty: 10, vat: 18 },
  '81': { description: 'Other base metals', duty: 10, vat: 18 },
  '82': { description: 'Tools, implements, cutlery, spoons and forks, of base metal', duty: 25, vat: 18 },
  '83': { description: 'Miscellaneous articles of base metal', duty: 25, vat: 18 },
  '84': { description: 'Nuclear reactors, boilers, machinery and mechanical appliances', duty: 25, vat: 18 },
  '85': { description: 'Electrical machinery and equipment', duty: 25, vat: 18 },
  '86': { description: 'Railway or tramway locomotives', duty: 10, vat: 18 },
  '87': { description: 'Vehicles other than railway', duty: 25, vat: 18 },
  '88': { description: 'Aircraft, spacecraft, and parts thereof', duty: 0, vat: 18 },
  '89': { description: 'Ships, boats and floating structures', duty: 10, vat: 18 },
  '90': { description: 'Optical, photographic, measuring, precision instruments', duty: 10, vat: 18 },
  '91': { description: 'Clocks and watches and parts thereof', duty: 25, vat: 18 },
  '92': { description: 'Musical instruments', duty: 25, vat: 18 },
  '93': { description: 'Arms and ammunition', duty: 25, vat: 18 },
  '94': { description: 'Furniture; bedding; lamps and lighting', duty: 25, vat: 18 },
  '95': { description: 'Toys, games and sports requisites', duty: 25, vat: 18 },
  '96': { description: 'Miscellaneous manufactured articles', duty: 25, vat: 18 },
  '97': { description: 'Works of art, collectors pieces and antiques', duty: 0, vat: 18 },
};

class HsCodeService {
  constructor() {
    this.cache = {};
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  async _fetch(url, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), (options && options.timeout) || 8000);
    try {
      const res = await fetch(url, { ...(options || {}), signal: controller.signal });
      const text = await res.text();
      try { return JSON.parse(text); } catch { return text; }
    } finally {
      clearTimeout(timeout);
    }
  }

  async search(query, lang = 'en') {
    const key = `search_${lang}_${query.toLowerCase()}`;
    const cached = this.cache[key];
    if (cached && Date.now() - cached.ts < this.cacheExpiry) {
      return cached.results;
    }

    let results = [];
    try {
      // Try HS Code Atlas first
      const atlasUrl = `${API_BASE}/search?q=${encodeURIComponent(query)}`;
      const atlasData = await this._fetch(atlasUrl);
      if (Array.isArray(atlasData)) {
        results = atlasData.map((r) => ({
          code: r.code || r.hscode,
          description: r.description || r.product_description,
          level: r.level || '6',
          source: 'hscodeatlas',
        }));
      }
    } catch (e) {
      console.log('[HS] Atlas API failed, trying fallback');
    }

    if (results.length === 0) {
      try {
        // Fallback to datahub.io
        const hubUrl = `${SEARCH_API}?q=${encodeURIComponent(query)}`;
        const hubData = await this._fetch(hubUrl);
        if (hubData && hubData.results) {
          results = hubData.results.map((r) => ({
            code: r.code,
            description: r.description,
            level: r.level || '6',
            source: 'datahub',
          }));
        }
      } catch (e) {
        console.log('[HS] Datahub API failed too');
      }
    }

    if (results.length === 0) {
      // Local search as final fallback
      results = this._localSearch(query);
    }

    this.cache[key] = { results, ts: Date.now() };
    return results;
  }

  _localSearch(query) {
    const q = query.toLowerCase();
    const matches = [];
    for (const [chapter, info] of Object.entries(EAC_DUTY_RATES)) {
      if (info.description.toLowerCase().includes(q) ||
          chapter.toLowerCase().includes(q)) {
        matches.push({
          code: chapter,
          description: info.description,
          level: '2',
          source: 'local',
          duty: info.duty,
          vat: info.vat,
        });
      }
    }
    return matches;
  }

  async getByCode(code) {
    const key = `code_${code}`;
    const cached = this.cache[key];
    if (cached && Date.now() - cached.ts < this.cacheExpiry) {
      return cached.result;
    }

    try {
      const url = `${API_BASE}/hs-code/${code}`;
      const data = await this._fetch(url);
      const result = {
        code: data.code || code,
        description: data.description,
        children: data.children || [],
        parent: data.parent,
        source: 'api',
      };

      this.cache[key] = { result, ts: Date.now() };
      return result;
    } catch (e) {
      return this._localLookup(code);
    }
  }

  _localLookup(code) {
    const chapter = code.substring(0, 2);
    const rate = EAC_DUTY_RATES[chapter];
    if (!rate) return null;
    return {
      code,
      description: rate.description,
      duty: rate.duty,
      vat: rate.vat,
      source: 'local',
      note: 'Duty rate from EAC Common External Tariff (simplified)',
    };
  }

  getChapterInfo(hsCode) {
    const chapter = hsCode.substring(0, 2);
    return EAC_DUTY_RATES[chapter] || null;
  }

  async classify(productDescription) {
    try {
      const data = await this._fetch(`${API_BASE}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: productDescription }),
        timeout: 10000,
      });
      return data;
    } catch (e) {
      return this._localSearch(productDescription)[0] || null;
    }
  }
}

module.exports = { HsCodeService, EAC_DUTY_RATES };