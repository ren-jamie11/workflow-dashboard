/* Workflow Hub — 报价 (Step 1) price calculation, shared by tools/step1.html and the hub's 下单计划 picker.
   The fee / cost / minimum-price logic is copied UNCHANGED from `Pricer_Updated.html` (the reference: 2027 non-peak fees,
   optional unit weight), except that the assumptions `A` and the unit weight `wt` (oz, null = not entered) are passed in
   instead of read from the page's closure, and computeRow sets the fee SEASON (the page's Peak switch) from its argument. Keep the arithmetic identical so the prices match that file to the cent. */
(function () {
'use strict';

  /* ================= 计算逻辑（与 Pricer_Updated.html 完全一致） ================= */
  const EPS = 1e-6;

  const OZ_PER_KG = 35.27396195;

  // Fee season. Peak runs Oct 15 – Jan 14. Non-peak = 2027 rates (Jan 15 – Oct 14, 2027).
  let SEASON = 'nonpeak';   /* HUB: set by computeRow */

  // `fees` / `over` always return the rates for the selected SEASON.
  const TIERS = {
    small: {
      name:'Small standard',
      limits:[2,4,6,8,10,12,14,16],
      labels:['2 oz or less','2+ to 4 oz','4+ to 6 oz','6+ to 8 oz','8+ to 10 oz','10+ to 12 oz','12+ to 14 oz','14+ to 16 oz'],
      feesBy:{
        nonpeak:{
          low: [2.64,2.72,2.80,2.83,2.87,2.92,2.96,2.99],
          mid: [3.75,3.78,3.92,3.97,4.06,4.16,4.30,4.32],
          high:[4.31,4.34,4.47,4.53,4.62,4.73,4.85,4.88]
        },
        peak:{
          low: [2.62,2.68,2.76,2.86,2.98,3.03,3.14,3.17],
          mid: [3.51,3.61,3.65,3.74,3.89,3.99,4.13,4.18],
          high:[3.77,3.87,3.91,4.00,4.15,4.25,4.39,4.44]
        }
      },
      get fees(){ return this.feesBy[SEASON]; }
    },
    large: {
      name:'Large standard',
      limits:[4,8,12,16,20,24,28,32,36,40,44,48],
      labels:['4 oz or less','4+ to 8 oz','8+ to 12 oz','12+ to 16 oz','1+ to 1.25 lb','1.25+ to 1.5 lb','1.5+ to 1.75 lb','1.75+ to 2 lb','2+ to 2.25 lb','2.25+ to 2.5 lb','2.5+ to 2.75 lb','2.75+ to 3 lb'],
      feesBy:{
        nonpeak:{
          low: [2.91,3.13,3.38,3.78,4.22,4.60,4.75,5.00,5.10,5.28,5.44,5.85],
          mid: [3.79,4.01,4.26,4.67,5.19,5.57,5.72,5.98,6.08,6.26,6.42,6.85],
          high:[4.35,4.57,4.83,5.23,5.75,6.14,6.29,6.54,6.64,6.83,6.99,7.41]
        },
        peak:{
          low: [3.15,3.39,3.66,4.07,4.52,4.91,5.07,5.33,5.47,5.67,5.84,6.26],
          mid: [3.97,4.21,4.48,4.89,5.34,5.73,5.89,6.15,6.29,6.49,6.66,7.08],
          high:[4.23,4.47,4.74,5.15,5.60,5.99,6.15,6.41,6.55,6.75,6.92,7.34]
        }
      },
      overBy:{                                   // + $0.08 per 4 oz above 3 lb, up to 20 lb (both seasons)
        nonpeak:{ low:6.15, mid:7.16, high:7.73 },
        peak:   { low:6.69, mid:7.51, high:7.77 }
      },
      get fees(){ return this.feesBy[SEASON]; },
      get over(){ return this.overBy[SEASON]; },
      maxOz:320
    }
  };

  const fmtLb = v => String(+v.toFixed(2));
  const ceil2 = v => Math.ceil(v*100 - 1e-7)/100;

  function overLabel(n){ return fmtLb(3+(n-1)/4) + '+ to ' + fmtLb(3+n/4) + ' lb'; }

  // Weight band for a shipping weight (oz). Returns current fee and the next band down.
  function bandOf(tierKey, oz, pb){
    const T = TIERS[tierKey];
    for (let i=0;i<T.limits.length;i++){
      if (oz <= T.limits[i] + EPS){
        return {
          label:T.labels[i], fee:T.fees[pb][i],
          lower: i===0 ? null : { oz:T.limits[i-1], label:T.labels[i-1], fee:T.fees[pb][i-1] }
        };
      }
    }
    if (tierKey==='large' && oz <= T.maxOz + EPS){
      const n = Math.ceil((oz-48)/4 - EPS);
      const fee = T.over[pb] + n*0.08;
      const lower = n===1
        ? { oz:48, label:T.labels[11], fee:T.fees[pb][11] }
        : { oz:48+(n-1)*4, label:overLabel(n-1), fee:T.over[pb] + (n-1)*0.08 };
      return { label:overLabel(n), fee, lower };
    }
    return null;
  }

  // Dimensional weight in oz. (Amazon's 2 in minimum width/height applies only to bulky and extra-large tiers, not standard.)
  function dimOz(cm){
    return cm[0]*cm[1]*cm[2]/Math.pow(2.54,3)/139*16;
  }
  function rawDimOz(cm){ return cm[0]*cm[1]*cm[2]/Math.pow(2.54,3)/139*16; }

  function priceBand(p){
    if (!(p >= 0) || isNaN(p)) return { key:'mid', defaulted:true };
    if (p < 10) return { key:'low', defaulted:false };
    if (p <= 50) return { key:'mid', defaulted:false };
    return { key:'high', defaulted:false };
  }

  function compute(dims, unitOz, price){
    const inch = dims.map(c=>c/2.54).sort((a,b)=>b-a);
    const [l,m,s] = inch;
    const pb = priceBand(price);
    const notes = [];
    const fitsSmall = l<=15+EPS && m<=12+EPS && s<=0.75+EPS;
    const fitsLarge = l<=18+EPS && m<=14+EPS && s<=8+EPS;
    const dim = dimOz(dims);
    let tier, shipOz, basis;

    if (fitsSmall && (unitOz==null || unitOz <= 16+EPS)){
      tier='small';
      if (unitOz==null){
        shipOz = rawDimOz(dims); basis='Estimate (no weight entered)';
        notes.push({warn:true, text:'Small standard fees are billed on actual weight. This estimate uses dimensional weight instead.'});
      } else { shipOz = unitOz; basis='Unit weight'; }
    } else if (fitsLarge){
      tier='large';
      shipOz = Math.max(unitOz ?? 0, dim);
      basis = (unitOz!=null && unitOz > dim) ? 'Unit weight' : 'Dimensional weight';
      if (shipOz > TIERS.large.maxOz + EPS) tier = null;
    } else tier = null;


    if (!tier){
      return { tier:null, inch, dim, unitOz, notes };
    }
    const band = bandOf(tier, shipOz, pb.key);
    return { tier, inch, dim, unitOz, shipOz, basis, band, pb:pb.key, notes, price: pb.defaulted || !(price > 0) ? null : price };
  }

  // Volumetric shipping weight (kg, L×W×H ÷ 5000). With a shrink scenario, the box is cut until its
  // dimensional weight sits exactly on the target tier line, so its volume (and freight cost) is fixed by that line,
  // whichever side(s) you cut.
  function volKgOf(dims, scen){
    const cm3 = scen ? scen.oz/16 * 139 * Math.pow(2.54,3) : dims[0]*dims[1]*dims[2];
    return cm3/5000;
  }

  // Freight to the US is billed on chargeable weight: the greater of volumetric and actual weight.
  function freightKg(dims, scen, WT){   /* HUB: WT passed in */
    const vol = volKgOf(dims, scen), act = WT != null ? WT/OZ_PER_KG : 0;
    return { kg: Math.max(vol, act), actual: act > vol + EPS };
  }

  // All per-unit costs in USD at a given retail price. `scen` (optional) = a selected cheaper tier { oz, label }.
  function costsAt(dims, unitRmb, price, scen, A, WT){   /* HUB: A, WT passed in */
    const r = compute(dims, WT, price);
    if (!r.tier) return null;
    const fk = freightKg(dims, scen, WT), volKg = fk.kg;
    const c = {
      r, volKg, actualKg: fk.actual, scen: scen || null,
      unit: unitRmb / A.fx,
      ship: volKg * A.shipRmbKg / A.fx,
      fee: scen ? bandOf(r.tier, scen.oz, r.pb).fee : r.band.fee,
      comm: price * A.comm/100,
      ads: price * A.ads/100,
      wh: price * A.wh/100
    };
    c.fuel = c.fee * A.fuel/100;   // fuel & logistics surcharge: % of the fulfillment fee (US, from Apr 17, 2026)
    c.total = c.unit + c.ship + c.fee + c.fuel + c.comm + c.ads + c.wh;
    c.margin = price - c.total;
    c.pct = price > 0 ? c.margin / price : 0;
    return c;
  }

  // Lowest price (to the cent) whose gross margin meets the target.
  // The fulfillment fee depends on the price band, so solve per band and keep the first one that's consistent.
  function minPrice(dims, unitRmb, scen, A, WT){   /* HUB: A, WT passed in */
    const varPct = (A.comm + A.ads + A.wh + A.target)/100;
    if (varPct >= 1) return { err:'Commission, ads, warehousing and target margin add up to 100% or more, so no price can reach the target.' };
    const fixed = unitRmb/A.fx + freightKg(dims, scen, WT).kg*A.shipRmbKg/A.fx;
    for (const probe of [5, 20, 60]){            // representative price in each band: <$10, $10–$50, >$50
      const r = compute(dims, WT, probe);
      if (!r.tier) return { err:'oversize' };
      const fee = scen ? bandOf(r.tier, scen.oz, r.pb).fee : r.band.fee;
      let p = ceil2((fixed + fee*(1 + A.fuel/100))/(1 - varPct));
      for (let k=0;k<3;k++){                     // confirm at the rounded price with that price's real fee
        const c = costsAt(dims, unitRmb, p, scen, A, WT);
        if (c.pct >= A.target/100 - 1e-9) return { price:p };
        p = ceil2(p + 0.01);
      }
    }
    return { err:'No price found.' };
  }
  /* ============================================================== */

  /* One 报价 line → the table's columns. peak = the line's fee season (falsy = non-peak).
     weightLb = the line's actual packaged weight in lb (the 计费重量 cell; blank / ≤ 0 = not entered → dimensional
     weight, as in Pricer_Updated.html with no unit weight). Out: weightLb = the billed (shipping) weight, dimLb = the
     dimensional weight, basis = 'Unit weight' when the actual weight is billed.
     deliveryFee (尾程运费) = the FBA fee + its fuel surcharge (baseFee + fuel); it is in cost too.
     price / cost / deliveryFee are null when oversize or unsolvable. */
  function computeRow(factoryPrice, length, width, height, A, peak, weightLb){
    SEASON = peak ? 'peak' : 'nonpeak';
    const dims = [length, width, height];
    const WT = weightLb > 0 ? weightLb * 16 : null;
    const m = minPrice(dims, factoryPrice, undefined, A, WT);
    const dimLb = dimOz(dims)/16;
    const out = { weightLb: WT != null ? Math.max(WT/16, dimLb) : dimLb, dimLb, basis: null,
                  shippingFee: freightKg(dims, undefined, WT).kg * A.shipRmbKg / A.fx,
                  deliveryFee: null, baseFee: null, fuel: null, cost: null, price: null, oversize: m.err === 'oversize', err: null };
    if (m.err) { if (!out.oversize) out.err = m.err; return out; }
    const c = costsAt(dims, factoryPrice, m.price, undefined, A, WT);
    out.weightLb = c.r.shipOz/16;
    out.basis = c.r.basis;
    out.shippingFee = c.ship;
    out.baseFee = c.fee;
    out.fuel = c.fuel;
    out.deliveryFee = c.fee + c.fuel;
    out.cost = c.unit + c.ship + c.fee + c.fuel;
    out.price = m.price;
    return out;
  }

  /* settings.step1 → the assumptions computeRow expects (defaults = Pricer_Updated.html's) */
  const DEFAULTS = { fx:6.7, shipRmbKg:6, fuel:3.5, comm:15, ads:12, wh:5, target:18 };
  function params(P){
    P = P || {};
    const A = {};
    for (const k in DEFAULTS){
      const v = parseFloat(P[k]);
      A[k] = v >= 0 && !(k === 'fx' && v === 0) ? v : DEFAULTS[k];
    }
    return A;
  }

  window.PRICING = { computeRow, params, DEFAULTS };
})();
