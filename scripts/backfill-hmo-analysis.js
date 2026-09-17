#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEALS_FILE = path.join(ROOT, 'property_deals.json');

function moneyNumber(value = '') {
    return Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;
}

function round(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

function benchmarkFor(deal) {
    const address = String(deal.address || '').toLowerCase();
    if (/fairwater|trem y coed|cf5/.test(address)) return { area: 'Cardiff West / CF5', roomRate: 500 };
    if (/australia road|manor way|newfoundland|caerphilly road|cf14/.test(address)) return { area: 'Heath / CF14', roomRate: 575 };
    if (/pen-y-lan|cressy|claude|connaught|mackintosh|cottrell|cf24/.test(address)) return { area: 'Roath / Penylan / CF24', roomRate: 545 };
    return { area: 'Cardiff', roomRate: 500 };
}

function calculate(deal, benchmark) {
    const purchasePrice = moneyNumber(deal.price);
    const bedrooms = Number(deal.bedrooms || 0);
    const achievableRent = bedrooms * benchmark.roomRate;
    const depositPct = 25;
    const taxLegalsPct = 6;
    const findersFee = 3000;
    const mortgageInterestPct = 5.5;
    const managementFeePct = 12;
    const maintenanceVoidsPct = 5;
    const deposit = purchasePrice * depositPct / 100;
    const taxLegals = purchasePrice * taxLegalsPct / 100;
    const mortgageMonthly = (purchasePrice - deposit) * mortgageInterestPct / 100 / 12;
    const operatingCostsMonthly = achievableRent * (managementFeePct + maintenanceVoidsPct) / 100;
    const netCashflowMonthly = achievableRent - mortgageMonthly - operatingCostsMonthly;
    const annualNetCashflow = netCashflowMonthly * 12;
    const totalCashIn = deposit + taxLegals + findersFee;
    const roi = totalCashIn > 0 ? annualNetCashflow / totalCashIn * 100 : 0;
    const updatedAt = new Date().toISOString();

    deal.investment_inputs = {
        purchase_price: purchasePrice,
        room_rate: benchmark.roomRate,
        achievable_rent: achievableRent,
        deposit_pct: depositPct,
        tax_legals_pct: taxLegalsPct,
        renovation: 0,
        furnishing_dressing: 0,
        finders_fee: findersFee,
        mortgage_interest_pct: mortgageInterestPct,
        management_fee_pct: managementFeePct,
        maintenance_voids_pct: maintenanceVoidsPct,
        utilities: 0,
        wifi: 0,
        council_tax: 0,
        target_roi_pct: 20
    };
    deal.analysis = {
        roi: round(roi, 1),
        verdict: roi >= 20 ? 'target' : roi >= 15 ? 'watchlist' : 'below target',
        target_gap_pct: roi >= 20 ? 0 : round(20 - roi, 1),
        purchase_price: purchasePrice,
        bedrooms,
        area: benchmark.area,
        tenant_type: 'professional assumed',
        utilities_wifi_council_tax_included: false,
        monthly_rent: achievableRent,
        annual_rent: achievableRent * 12,
        room_rent: benchmark.roomRate,
        room_rent_note: `${bedrooms} rooms at £${benchmark.roomRate}/room/month gives £${achievableRent.toLocaleString('en-GB')}/month achievable rent; provisional Cardiff-area benchmark because the listing did not include verified room rents.`,
        rent_source: `Provisional ${benchmark.area} professional room-rent benchmark; listing rents have not been verified.`,
        mortgage_monthly: round(mortgageMonthly),
        operating_costs_monthly: round(operatingCostsMonthly),
        net_cashflow_monthly: round(netCashflowMonthly),
        annual_net_cashflow: round(annualNetCashflow),
        total_cash_in: round(totalCashIn),
        gross_yield: purchasePrice > 0 ? round(achievableRent * 12 / purchasePrice * 100) : 0,
        net_yield: purchasePrice > 0 ? round(annualNetCashflow / purchasePrice * 100) : 0,
        target_roi_pct: 20,
        deposit_pct: depositPct,
        tax_legals_pct: taxLegalsPct,
        mortgage_interest_pct: mortgageInterestPct,
        management_fee_pct: managementFeePct,
        maintenance_voids_pct: maintenanceVoidsPct,
        analysis_quality: 'provisional_benchmark',
        assumptions: [
            'Provisional area room-rent benchmark; verify rents before relying on the result',
            '25% deposit / 75% LTV interest-only mortgage',
            '6% tax and legals',
            '£3,000 assumed sourcing/finder fee',
            '5.5% mortgage interest',
            '12% management fee and 5% maintenance/void allowance',
            'Utilities, wifi and council tax excluded because a professional tenant model is assumed'
        ],
        updated_at: updatedAt
    };
    deal.updated_at = updatedAt;
}

const db = JSON.parse(fs.readFileSync(DEALS_FILE, 'utf8'));
const deals = Array.isArray(db.deals) ? db.deals : [];
const incomplete = deals.filter(deal => !(Number(deal.analysis?.monthly_rent) > 0));

for (const deal of incomplete) calculate(deal, benchmarkFor(deal));

const tempFile = `${DEALS_FILE}.tmp`;
fs.writeFileSync(tempFile, `${JSON.stringify(db, null, 2)}\n`);
fs.renameSync(tempFile, DEALS_FILE);
process.stdout.write(`Backfilled ${incomplete.length} HMO analyses.\n`);
