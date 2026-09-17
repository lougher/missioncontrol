#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEALS_FILE = path.join(ROOT, 'property_deals.json');
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const CONCURRENCY = 8;

function moneyNumber(value = '') {
    return Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;
}

function moneyLabel(value) {
    return value > 0 ? `£${Math.round(value).toLocaleString('en-GB')}` : '';
}

function decodeHtml(value = '') {
    return String(value)
        .replace(/&pound;/gi, '£')
        .replace(/&#163;/gi, '£')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
}

function parseRightmove(html, httpStatus) {
    if (httpStatus !== 200) return { status: 'unavailable', note: `Rightmove returned HTTP ${httpStatus}` };
    const text = decodeHtml(html);
    const unavailable = /property (?:is )?no longer available|we couldn't find what you're looking for|page not found/i.test(text);
    if (unavailable) return { status: 'unavailable', note: 'Rightmove says the advert is no longer available' };
    const price = text.match(/data-testid="primaryPrice"[\s\S]{0,180}?<span>(£[\d,]+)/i)?.[1]
        || text.match(/for (?:Guide Price )?(£[\d,]+)\. Marketed by/i)?.[1]
        || '';
    const soldStc = /data-style="statusLozenge"[^>]*>[\s\S]{0,100}?SOLD STC|>\s*SOLD STC\s*</i.test(text);
    const underOffer = /data-style="statusLozenge"[^>]*>[\s\S]{0,100}?UNDER OFFER|>\s*UNDER OFFER\s*</i.test(text);
    return {
        status: soldStc ? 'sold_stc' : underOffer ? 'under_offer' : 'live',
        price: moneyNumber(price),
        note: soldStc ? 'Rightmove marks this property Sold STC' : underOffer ? 'Rightmove marks this property Under Offer' : 'Live on Rightmove'
    };
}

function parseOnTheMarket(html, httpStatus) {
    if (httpStatus !== 200) return { status: 'unavailable', note: `OnTheMarket returned HTTP ${httpStatus}` };
    const text = decodeHtml(html);
    const unavailable = /property (?:is )?no longer available|page not found|property not found/i.test(text);
    if (unavailable) return { status: 'unavailable', note: 'OnTheMarket says the advert is no longer available' };
    const analyticsStatus = text.match(/"http-status":"\d+","status":"([^"]+)"/i)?.[1]?.toLowerCase();
    const labelText = text.match(/"labelText":"([^"]+)"/i)?.[1]?.toLowerCase() || '';
    const price = text.match(/data-test="property-price"[^>]*>(£[\d,]+)/i)?.[1]
        || text.match(/"http-status":"\d+","status":"[^"]+"[^}]*?"price":"([\d,]+)"/i)?.[1]
        || '';
    const soldStc = /sold stc|sale agreed/i.test(labelText) || ['sstc', 'sold_stc', 'sale_agreed'].includes(analyticsStatus);
    const underOffer = /under offer/i.test(labelText) || analyticsStatus === 'under_offer';
    const live = analyticsStatus === 'live' || Boolean(price);
    return {
        status: soldStc ? 'sold_stc' : underOffer ? 'under_offer' : live ? 'live' : 'unknown',
        price: moneyNumber(price),
        note: soldStc ? 'OnTheMarket marks this property Sold STC' : underOffer ? 'OnTheMarket marks this property Under Offer' : live ? 'Live on OnTheMarket' : 'Could not confirm OnTheMarket availability'
    };
}

function parseRex(html, httpStatus) {
    if (httpStatus !== 200) return { status: 'unavailable', note: `Agent brochure returned HTTP ${httpStatus}` };
    const text = decodeHtml(html);
    const price = text.match(/(?:Asking Price|Guide Price|Offers[^<]{0,40})?[\s\S]{0,80}?(£[\d,]{5,})/i)?.[1] || '';
    return { status: 'unknown', price: moneyNumber(price), note: 'Agent brochure is reachable; live sale status is not exposed' };
}

async function inspectDeal(deal) {
    const checkedAt = new Date().toISOString();
    try {
        const response = await fetch(deal.url, {
            redirect: 'follow',
            headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
            signal: AbortSignal.timeout(20000)
        });
        const html = await response.text();
        const parsed = deal.url.includes('rightmove.co.uk')
            ? parseRightmove(html, response.status)
            : deal.url.includes('onthemarket.com')
                ? parseOnTheMarket(html, response.status)
                : parseRex(html, response.status);
        return { ...parsed, checkedAt };
    } catch (error) {
        return { status: 'unknown', price: 0, note: `Availability check failed: ${error.message}`, checkedAt };
    }
}

function recalculateForPrice(deal, oldPrice, newPrice) {
    const inputs = deal.investment_inputs;
    if (!inputs || moneyNumber(inputs.purchase_price) !== oldPrice || !newPrice) return;
    inputs.purchase_price = newPrice;
    const deposit = newPrice * (Number(inputs.deposit_pct || 0) / 100);
    const mortgageAmount = newPrice - deposit;
    const taxLegals = newPrice * (Number(inputs.tax_legals_pct || 0) / 100);
    const mortgageMonthly = mortgageAmount * (Number(inputs.mortgage_interest_pct || 0) / 100) / 12;
    const monthlyRent = Number(inputs.achievable_rent || 0);
    const operatingCosts = monthlyRent * ((Number(inputs.management_fee_pct || 0) + Number(inputs.maintenance_voids_pct || 0)) / 100)
        + Number(inputs.utilities || 0) + Number(inputs.wifi || 0) + Number(inputs.council_tax || 0);
    const totalCashIn = deposit + taxLegals + Number(inputs.renovation || 0) + Number(inputs.furnishing_dressing || 0) + Number(inputs.finders_fee || 0);
    const netMonthly = monthlyRent - mortgageMonthly - operatingCosts;
    const annualNet = netMonthly * 12;
    const roi = totalCashIn > 0 ? annualNet / totalCashIn * 100 : 0;
    deal.analysis = {
        ...(deal.analysis || {}),
        purchase_price: newPrice,
        mortgage_monthly: Math.round(mortgageMonthly * 100) / 100,
        operating_costs_monthly: Math.round(operatingCosts * 100) / 100,
        net_cashflow_monthly: Math.round(netMonthly * 100) / 100,
        annual_net_cashflow: Math.round(annualNet * 100) / 100,
        total_cash_in: Math.round(totalCashIn * 100) / 100,
        roi: Math.round(roi * 10) / 10,
        verdict: roi >= 20 ? 'target' : roi >= 15 ? 'watchlist' : 'below target',
        target_gap_pct: roi >= 20 ? 0 : Math.round((20 - roi) * 10) / 10,
        gross_yield: newPrice > 0 ? Math.round((monthlyRent * 12 / newPrice * 100) * 100) / 100 : 0,
        net_yield: newPrice > 0 ? Math.round((annualNet / newPrice * 100) * 100) / 100 : 0,
        updated_at: new Date().toISOString()
    };
}

async function mapLimit(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await worker(items[index]);
        }
    }));
    return results;
}

async function main() {
    const db = JSON.parse(fs.readFileSync(DEALS_FILE, 'utf8'));
    const deals = Array.isArray(db.deals) ? db.deals : [];
    const checks = await mapLimit(deals, CONCURRENCY, inspectDeal);
    const summary = { live: 0, sold_stc: 0, under_offer: 0, unavailable: 0, unknown: 0, price_changes: 0 };

    deals.forEach((deal, index) => {
        const check = checks[index];
        const oldPrice = moneyNumber(deal.price);
        const newPrice = Number(check.price || 0);
        deal.listing_status = check.status;
        deal.listing_checked_at = check.checkedAt;
        deal.listing_status_note = check.note;
        if (check.status === 'live') deal.last_seen_live_at = check.checkedAt;
        if (newPrice && newPrice !== oldPrice) {
            deal.previous_price = deal.price;
            deal.price = moneyLabel(newPrice);
            deal.price_changed_at = check.checkedAt;
            deal.price_change_amount = newPrice - oldPrice;
            recalculateForPrice(deal, oldPrice, newPrice);
            summary.price_changes += 1;
        }
        deal.updated_at = check.checkedAt;
        summary[check.status] = (summary[check.status] || 0) + 1;
    });

    db.meta = { ...(db.meta || {}), listings_refreshed_at: new Date().toISOString(), listings_refresh_summary: summary };
    const tempFile = `${DEALS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2) + '\n');
    fs.renameSync(tempFile, DEALS_FILE);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
