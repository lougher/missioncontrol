#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORKSPACE = path.resolve(ROOT, '..');
const DEALS_FILE = process.env.HMO_DEALS_FILE || path.join(ROOT, 'property_deals.json');
const TRACKER_FILE = process.env.HMO_TRACKER_FILE || path.join(WORKSPACE, 'property-deals', 'cardiff-hmo-tracker-state.json');
const MIN_ROI = 10;

function readJson(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJsonAtomic(file, data) {
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n');
    fs.renameSync(temp, file);
}

const db = readJson(DEALS_FILE, { meta: {}, deals: [] });
const tracker = readJson(TRACKER_FILE, { seen: [] });
const rejectedIds = [];

db.deals = (Array.isArray(db.deals) ? db.deals : []).filter(deal => {
    if (deal.admission_source !== 'daily-hmo-scan') return true;
    const roi = Number(deal.analysis?.roi);
    const qualifies = Number.isFinite(roi) && roi > MIN_ROI;
    if (!qualifies) rejectedIds.push(String(deal.id || deal.url || 'unknown'));
    return qualifies;
});

for (const item of Array.isArray(tracker.seen) ? tracker.seen : []) {
    if (item.admission_source !== 'daily-hmo-scan') continue;
    const roi = Number(item.analysis?.roi);
    item.eligible_for_dashboard = Number.isFinite(roi) && roi > MIN_ROI;
    if (!item.eligible_for_dashboard && !item.screened_out_reason) {
        item.screened_out_reason = Number.isFinite(roi)
            ? `Recalculated true net ROI ${roi}% does not exceed ${MIN_ROI}%`
            : 'True net ROI could not be calculated from credible inputs';
    }
}

db.meta = {
    ...(db.meta || {}),
    new_deal_min_roi_pct: MIN_ROI,
    new_deal_min_roi_operator: 'strictly_greater_than',
    new_deal_rule_effective_date: '2026-10-10',
    good_deal_roi_pct: 20
};

writeJsonAtomic(DEALS_FILE, db);
writeJsonAtomic(TRACKER_FILE, tracker);
process.stdout.write(JSON.stringify({ minimumRoi: MIN_ROI, removedDashboardDeals: rejectedIds, dashboardDealCount: db.deals.length }) + '\n');
