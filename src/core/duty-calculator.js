/**
 * Duty Calculator Service
 * Calculates total landed cost for cross-border trade
 * Sources: URA Online Tariff, EAC CET, country-specific rates
 */

const { HsCodeService, EAC_DUTY_RATES } = require('./hs-codes');

// Country-specific VAT rates
const VAT_RATES = {
  UG: 18,   // Uganda
  KE: 16,   // Kenya
  TZ: 18,   // Tanzania
  RW: 18,   // Rwanda
  BI: 18,   // Burundi
  SS: 15,   // South Sudan
  ET: 15,   // Ethiopia
  CD: 16,   // DRC
  NG: 7.5,  // Nigeria
  GH: 15,   // Ghana
};

// Common non-tariff barriers (estimated costs in USD)
const NTB_COSTS = {
  BUSIA: { inspection: 15, documentation: 10, delay_per_day: 50 },
  MALABA: { inspection: 15, documentation: 10, delay_per_day: 50 },
  NAMANGA: { inspection: 12, documentation: 8, delay_per_day: 40 },
  SUAM: { inspection: 10, documentation: 8, delay_per_day: 35 },
  MOYALE: { inspection: 12, documentation: 10, delay_per_day: 45 },
};

// Simplified trade regime thresholds (EAC)
const STR_THRESHOLDS = {
  UG: { max_value_usd: 2000, max_duty_free: 100 }, // Uganda simplified regime
  KE: { max_value_usd: 2000, max_duty_free: 100 },
  TZ: { max_value_usd: 2000, max_duty_free: 100 },
};

class DutyCalculator {
  constructor() {
    this.hsService = new HsCodeService();
  }

  /**
   * Calculate total landed cost for a product crossing a border
   * @param {Object} params
   * @param {string} params.productDescription - What's being traded
   * @param {string} params.hsCode - HS code (optional, will look up if not provided)
   * @param {number} params.quantity - Number of units
   * @param {string} params.unit - Unit of measurement (kg, piece, litre, etc.)
   * @param {number} params.unitPriceUSD - Price per unit in USD
   * @param {string} params.origin - Origin country code (UG, KE, TZ, etc.)
   * @param {string} params.destination - Destination country code
   * @param {string} params.border - Border crossing (BUSIA, MALABA, etc.)
   * @param {string} params.tradeRegime - 'formal' or 'simplified'
   * @returns {Object} Total cost breakdown
   */
  async calculate(params) {
    const {
      productDescription,
      hsCode,
      quantity = 1,
      unit = 'piece',
      unitPriceUSD,
      origin,
      destination,
      border,
      tradeRegime = 'formal'
    } = params;

    // Get HS code and duty rate
    let hsInfo = null;
    let dutyRate = 0;

    if (hsCode) {
      hsInfo = await this.hsService.getByCode(hsCode);
      const chapter = hsCode.substring(0, 2);
      const chapterInfo = EAC_DUTY_RATES[chapter];
      if (chapterInfo) dutyRate = chapterInfo.duty;
    } else if (productDescription) {
      const results = await this.hsService.search(productDescription);
      if (results.length > 0) {
        hsInfo = results[0];
        const chapter = results[0].code.substring(0, 2);
        const chapterInfo = EAC_DUTY_RATES[chapter];
        if (chapterInfo) dutyRate = chapterInfo.duty;
      }
    }

    // Check if within simplified trade regime threshold
    const totalValueUSD = quantity * unitPriceUSD;
    const isSTR = tradeRegime === 'simplified' && totalValueUSD <= (STR_THRESHOLDS[destination]?.max_value_usd || 2000);

    // Calculate costs
    const cifValue = totalValueUSD; // CIF = Cost, Insurance, Freight (simplified: use unit price)

    // Duty
    let customsDuty = 0;
    if (!isSTR) {
      customsDuty = cifValue * (dutyRate / 100);
    }

    // VAT (on duty + CIF value)
    const vatRate = VAT_RATES[destination] || 18;
    const vatBase = cifValue + customsDuty;
    const vat = vatBase * (vatRate / 100);

    // Non-tariff barrier costs
    const ntb = NTB_COSTS[border] || { inspection: 10, documentation: 5, delay_per_day: 30 };

    // SPS (Sanitary and Phytosanitary) certificate — for agricultural products
    const isAgricultural = hsInfo && ['01', '02', '03', '04', '06', '07', '08', '09', '10', '12'].includes(
      (hsInfo.code || '').substring(0, 2)
    );
    const spsCost = isAgricultural ? 25 : 0;

    // Certificate of origin (for preferential rates under EAC)
    const isIntraEAC = ['UG', 'KE', 'TZ', 'RW', 'BI'].includes(origin) &&
                       ['UG', 'KE', 'TZ', 'RW', 'BI'].includes(destination);
    const certOriginCost = isIntraEAC ? 15 : 25;

    // Total fees
    const fees = {
      customsDuty: Math.round(customsDuty * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      inspection: ntb.inspection,
      documentation: ntb.documentation,
      certificateOfOrigin: certOriginCost,
      spsCertificate: spsCost,
      total: 0
    };
    fees.total = Object.values(fees).reduce((a, b) => a + b, 0);

    // Total landed cost
    const totalLandedCost = cifValue + fees.total;
    const totalPerUnit = totalLandedCost / quantity;

    return {
      // Input summary
      product: productDescription,
      hsCode: hsInfo?.code || 'unknown',
      hsDescription: hsInfo?.description || 'Classification pending',
      quantity,
      unit,
      unitPriceUSD,
      totalValueUSD,

      // Cost breakdown
      cifValue: Math.round(cifValue * 100) / 100,
      fees,
      totalLandedCost: Math.round(totalLandedCost * 100) / 100,
      totalPerUnit: Math.round(totalPerUnit * 100) / 100,

      // Context
      origin,
      destination,
      border,
      tradeRegime: isSTR ? 'simplified' : 'formal',
      isIntraEAC,
      isSTR,
      isAgricultural,

      // Rates applied
      dutyRate: `${dutyRate}%`,
      vatRate: `${vatRate}%`,

      // Warnings
      warnings: this._generateWarnings(params, hsInfo, dutyRate, totalValueUSD)
    };
  }

  _generateWarnings(params, hsInfo, dutyRate, totalValueUSD) {
    const warnings = [];

    if (!hsInfo) {
      warnings.push({
        type: 'info',
        message: 'HS code not found. Duty rate estimated. Verify with URA before importing.'
      });
    }

    if (dutyRate >= 60) {
      warnings.push({
        type: 'high-duty',
        message: `High duty rate (${dutyRate}%). Consider finding alternative products or suppliers.`
      });
    }

    if (totalValueUSD > 2000) {
      warnings.push({
        type: 'str-threshold',
        message: 'Value exceeds Simplified Trade Regime threshold. Full customs declaration required.'
      });
    }

    if (params.destination === 'UG' && !params.hsCode) {
      warnings.push({
        type: 'ura-required',
        message: 'URA requires correct HS code for import declaration. Visit singlewindow.go.ug to verify.'
      });
    }

    return warnings;
  }

  /**
   * Get quick duty estimate (no HS code needed)
   * Useful for voice queries: "How much duty to bring beans to Kenya?"
   */
  async quickEstimate(productName, destination = 'KE', origin = 'UG') {
    const searchResults = await this.hsService.search(productName);
    if (searchResults.length === 0) {
      return {
        product: productName,
        estimated: true,
        message: 'Product not found. Duty rate typically 10-25% for most goods.',
        estimatedDutyRate: '15%',
        note: 'This is an estimate. Get exact rate with HS code.'
      };
    }

    const bestMatch = searchResults[0];
    const chapter = bestMatch.code.substring(0, 2);
    const chapterInfo = EAC_DUTY_RATES[chapter];
    const dutyRate = chapterInfo?.duty || 15;

    return {
      product: productName,
      hsCode: bestMatch.code,
      hsDescription: bestMatch.description,
      estimated: false,
      dutyRate: `${dutyRate}%`,
      vatRate: `${VAT_RATES[destination] || 18}%`,
      note: `For ${destination === 'KE' ? 'Kenya' : destination === 'TZ' ? 'Tanzania' : destination} import. Verify with customs.`
    };
  }
}

module.exports = { DutyCalculator, VAT_RATES, NTB_COSTS, STR_THRESHOLDS };
