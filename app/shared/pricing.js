/* Workflow Hub — 报价 (Step 1) price calculation, shared by tools/step1.html and the hub's 下单计划 picker.
   computeRow is moved UNCHANGED from the original single-product calculator (Step 1 - *.html). */
(function () {
'use strict';

  /* ================= 计算逻辑（与原单品计算器完全一致） ================= */
  function computeRow(factoryPrice, length, width, height, P){
    const { shippingPrice, exchangeRate, profitMargin, storageFee, isPeak } = P;

    // 计算重量（体积重）
    const weightKg = (length * width * height) / 5000;
    const weightLb = weightKg * 2.2;
    const weightOz = weightLb * 16;

    // 计算头程运费
    const shippingVolume = (length * width * height) / 6000;
    const shippingFee = (shippingVolume * shippingPrice) / exchangeRate;

    // 转换为英寸并排序
    const dimensions = [length/2.54, width/2.54, height/2.54].sort((a,b)=>b-a);
    const longest = dimensions[0], middle = dimensions[1], shortest = dimensions[2];

    // 计算尾程运费
    let deliveryFee = 0;

    // 小号标准尺寸
    if (longest <= 15 && middle <= 12 && shortest <= 0.75) {
      const factoryPriceUSD = factoryPrice / exchangeRate;
      let assumeDeliveryFee = 0;
      if (weightOz <= 2) assumeDeliveryFee = 2.43;
      else if (weightOz <= 4) assumeDeliveryFee = 2.49;
      else if (weightOz <= 6) assumeDeliveryFee = 2.56;
      else if (weightOz <= 8) assumeDeliveryFee = 2.66;
      else if (weightOz <= 10) assumeDeliveryFee = 2.77;
      else if (weightOz <= 12) assumeDeliveryFee = 2.82;
      else if (weightOz <= 14) assumeDeliveryFee = 2.92;
      else assumeDeliveryFee = 2.95;

      const tempCost = shippingFee + storageFee + factoryPriceUSD + assumeDeliveryFee;
      const tempPrice = profitMargin > 0 ? tempCost / (1 - profitMargin / 100) : 0;

      if (tempPrice < 5) {
        if (weightOz <= 2) deliveryFee = 2.43;
        else if (weightOz > 2 && weightOz <= 4) deliveryFee = 2.49;
        else if (weightOz > 4 && weightOz <= 6) deliveryFee = 2.56;
        else if (weightOz > 6 && weightOz <= 8) deliveryFee = 2.66;
        else if (weightOz > 8 && weightOz <= 10) deliveryFee = 2.77;
        else if (weightOz > 10 && weightOz <= 12) deliveryFee = 2.82;
        else if (weightOz > 12 && weightOz <= 14) deliveryFee = 2.92;
        else if (weightOz > 14 && weightOz <= 16) deliveryFee = 2.95;
      } else if (tempPrice <= 25) {
        if (weightOz <= 2) deliveryFee = isPeak ? 3.25 : 3.32;
        else if (weightOz > 2 && weightOz <= 4) deliveryFee = isPeak ? 3.34 : 3.42;
        else if (weightOz > 4 && weightOz <= 6) deliveryFee = isPeak ? 3.44 : 3.45;
        else if (weightOz > 6 && weightOz <= 8) deliveryFee = isPeak ? 3.53 : 3.54;
        else if (weightOz > 8 && weightOz <= 10) deliveryFee = isPeak ? 3.64 : 3.68;
        else if (weightOz > 10 && weightOz <= 12) deliveryFee = isPeak ? 3.74 : 3.78;
        else if (weightOz > 12 && weightOz <= 14) deliveryFee = isPeak ? 3.82 : 3.91;
        else if (weightOz > 14 && weightOz <= 16) deliveryFee = isPeak ? 3.87 : 3.96;
      } else {
        if (weightOz <= 2) deliveryFee = 3.58;
        else if (weightOz > 2 && weightOz <= 4) deliveryFee = 3.68;
        else if (weightOz > 4 && weightOz <= 6) deliveryFee = 3.71;
        else if (weightOz > 6 && weightOz <= 8) deliveryFee = 3.80;
        else if (weightOz > 8 && weightOz <= 10) deliveryFee = 3.94;
        else if (weightOz > 10 && weightOz <= 12) deliveryFee = 4.04;
        else if (weightOz > 12 && weightOz <= 14) deliveryFee = 4.17;
        else if (weightOz > 14 && weightOz <= 16) deliveryFee = 4.22;
      }
    }
    // 大号标准尺寸
    else if (longest <= 18 && middle <= 14 && shortest <= 8) {
      const factoryPriceUSD = factoryPrice / exchangeRate;
      let assumeDeliveryFee = 0;
      if (weightOz <= 4) assumeDeliveryFee = 2.91;
      else if (weightOz <= 8) assumeDeliveryFee = 3.13;
      else if (weightOz <= 12) assumeDeliveryFee = 3.38;
      else if (weightOz <= 16) assumeDeliveryFee = 3.78;
      else if (weightLb <= 1.25) assumeDeliveryFee = 4.22;
      else if (weightLb <= 1.5) assumeDeliveryFee = 4.60;
      else if (weightLb <= 1.75) assumeDeliveryFee = 4.75;
      else if (weightLb <= 2) assumeDeliveryFee = 5.00;
      else if (weightLb <= 2.25) assumeDeliveryFee = 5.10;
      else if (weightLb <= 2.5) assumeDeliveryFee = 5.28;
      else if (weightLb <= 2.75) assumeDeliveryFee = 5.44;
      else if (weightLb <= 3) assumeDeliveryFee = 5.85;
      else assumeDeliveryFee = 6.15;

      const tempCost = shippingFee + storageFee + factoryPriceUSD + assumeDeliveryFee;
      const tempPrice = profitMargin > 0 ? tempCost / (1 - profitMargin / 100) : 0;

      if (tempPrice < 5) {
        if (weightOz <= 4) deliveryFee = 2.91;
        else if (weightOz > 4 && weightOz <= 8) deliveryFee = 3.13;
        else if (weightOz > 8 && weightOz <= 12) deliveryFee = 3.38;
        else if (weightOz > 12 && weightOz <= 16) deliveryFee = 3.78;
        else if (weightLb > 1 && weightLb <= 1.25) deliveryFee = 4.22;
        else if (weightLb > 1.25 && weightLb <= 1.5) deliveryFee = 4.60;
        else if (weightLb > 1.5 && weightLb <= 1.75) deliveryFee = 4.75;
        else if (weightLb > 1.75 && weightLb <= 2) deliveryFee = 5.00;
        else if (weightLb > 2 && weightLb <= 2.25) deliveryFee = 5.10;
        else if (weightLb > 2.25 && weightLb <= 2.5) deliveryFee = 5.28;
        else if (weightLb > 2.5 && weightLb <= 2.75) deliveryFee = 5.44;
        else if (weightLb > 2.75 && weightLb <= 3) deliveryFee = 5.85;
        else if (weightLb > 3 && weightLb <= 20) {
          const baseFee = 6.15;
          const extraWeight = Math.max(0, weightLb - 3);
          const extraFee = Math.ceil(extraWeight * 16 / 4) * 0.08;
          deliveryFee = baseFee + extraFee;
        }
      } else if (tempPrice <= 25) {
        if (weightOz <= 4) deliveryFee = isPeak ? 3.92 : 3.73;
        else if (weightOz > 4 && weightOz <= 8) deliveryFee = isPeak ? 4.16 : 3.95;
        else if (weightOz > 8 && weightOz <= 12) deliveryFee = isPeak ? 4.43 : 4.20;
        else if (weightOz > 12 && weightOz <= 16) deliveryFee = isPeak ? 4.84 : 4.60;
        else if (weightLb > 1 && weightLb <= 1.25) deliveryFee = isPeak ? 5.29 : 5.04;
        else if (weightLb > 1.25 && weightLb <= 1.5) deliveryFee = isPeak ? 5.68 : 5.42;
        else if (weightLb > 1.5 && weightLb <= 1.75) deliveryFee = isPeak ? 5.84 : 5.57;
        else if (weightLb > 1.75 && weightLb <= 2) deliveryFee = isPeak ? 6.10 : 5.82;
        else if (weightLb > 2 && weightLb <= 2.25) deliveryFee = isPeak ? 6.24 : 5.92;
        else if (weightLb > 2.25 && weightLb <= 2.5) deliveryFee = isPeak ? 6.44 : 6.10;
        else if (weightLb > 2.5 && weightLb <= 2.75) deliveryFee = isPeak ? 6.61 : 6.26;
        else if (weightLb > 2.75 && weightLb <= 3) deliveryFee = isPeak ? 7.03 : 6.67;
        else if (weightLb > 3 && weightLb <= 20) {
          const baseFee = isPeak ? 7.46 : 6.97;
          const extraWeight = Math.max(0, weightLb - 3);
          const extraFee = Math.ceil(extraWeight * 16 / 4) * 0.08;
          deliveryFee = baseFee + extraFee;
        }
      } else {
        if (weightOz <= 4) deliveryFee = 3.99;
        else if (weightOz > 4 && weightOz <= 8) deliveryFee = 4.21;
        else if (weightOz > 8 && weightOz <= 12) deliveryFee = 4.46;
        else if (weightOz > 12 && weightOz <= 16) deliveryFee = 4.86;
        else if (weightLb > 1 && weightLb <= 1.25) deliveryFee = 5.30;
        else if (weightLb > 1.25 && weightLb <= 1.5) deliveryFee = 5.68;
        else if (weightLb > 1.5 && weightLb <= 1.75) deliveryFee = 5.83;
        else if (weightLb > 1.75 && weightLb <= 2) deliveryFee = 6.08;
        else if (weightLb > 2 && weightLb <= 2.25) deliveryFee = 6.18;
        else if (weightLb > 2.25 && weightLb <= 2.5) deliveryFee = 6.36;
        else if (weightLb > 2.5 && weightLb <= 2.75) deliveryFee = 6.52;
        else if (weightLb > 2.75 && weightLb <= 3) deliveryFee = 6.93;
        else if (weightLb > 3 && weightLb <= 20) {
          const baseFee = 7.23;
          const extraWeight = Math.max(0, weightLb - 3);
          const extraFee = Math.ceil(extraWeight * 16 / 4) * 0.08;
          deliveryFee = baseFee + extraFee;
        }
      }
    }
    // 超大件
    else if (longest > 59 || middle > 33 || shortest > 33 || (longest + middle + shortest >= 130) || weightLb >= 50) {
      const roundedWeight = Math.ceil(weightLb);
      if (roundedWeight < 50) {
        const baseFee = isPeak ? 29.06 : 26.33;
        deliveryFee = baseFee + (roundedWeight - 1) * 0.38;
      } else if (roundedWeight > 50 && roundedWeight <= 70) {
        const baseFee = isPeak ? 42.93 : 37.32;
        deliveryFee = baseFee + (roundedWeight - 51) * 0.75;
      } else if (roundedWeight > 70 && roundedWeight <= 150) {
        const baseFee = isPeak ? 59.23 : 51.32;
        deliveryFee = baseFee + (roundedWeight - 71) * 0.75;
      } else if (roundedWeight > 150) {
        const baseFee = isPeak ? 203.46 : 194.95;
        deliveryFee = baseFee + (roundedWeight - 151) * 0.19;
      }
    }
    // 小号大件
    else if (longest <= 37 && middle <= 28 && shortest <= 20) {
      const roundedWeight = Math.ceil(weightLb);
      let packagingFee = 0;
      if (roundedWeight <= 5) packagingFee = 1.51;
      else if (roundedWeight <= 10) packagingFee = 1.68;
      else if (roundedWeight <= 15) packagingFee = 1.97;
      else if (roundedWeight <= 20) packagingFee = 2.60;
      else if (roundedWeight <= 25) packagingFee = 2.92;
      else if (roundedWeight <= 30) packagingFee = 3.47;
      else if (roundedWeight <= 35) packagingFee = 3.60;
      else if (roundedWeight <= 40) packagingFee = 3.78;
      else if (roundedWeight <= 45) packagingFee = 3.80;
      else packagingFee = 4.04;

      if (roundedWeight <= 50) {
        const baseFee = isPeak ? 10.65 : 7.55;
        deliveryFee = baseFee + (roundedWeight - 1) * 0.38 + packagingFee;
      }
    }
    // 大号大件
    else if (longest <= 59 && middle <= 33 && shortest <= 33 && weightLb <= 50) {
      const roundedWeight = Math.ceil(weightLb);
      let packagingFee = 0;
      if (roundedWeight <= 5) packagingFee = 1.51;
      else if (roundedWeight <= 10) packagingFee = 1.68;
      else if (roundedWeight <= 15) packagingFee = 1.97;
      else if (roundedWeight <= 20) packagingFee = 2.60;
      else if (roundedWeight <= 25) packagingFee = 2.92;
      else if (roundedWeight <= 30) packagingFee = 3.47;
      else if (roundedWeight <= 35) packagingFee = 3.60;
      else if (roundedWeight <= 40) packagingFee = 3.78;
      else if (roundedWeight <= 45) packagingFee = 3.80;
      else packagingFee = 4.04;

      if (roundedWeight <= 50) {
        const baseFee = isPeak ? 10.65 : 9.35;
        deliveryFee = baseFee + (roundedWeight - 1) * 0.38 + packagingFee;
      }
    }

    // 计算成本
    const factoryPriceUSD = factoryPrice / exchangeRate;
    const cost = shippingFee + storageFee + factoryPriceUSD + deliveryFee;

    // 计算建议售价
    const price = cost / (1 - profitMargin / 100);

    return { weightLb, shippingFee, storageFee, deliveryFee, cost, price, uncovered: deliveryFee === 0 };
  }
  /* ============================================================== */

  /* settings.step1 → the numbers computeRow expects (same defaults as step1.html) */
  function params(P){
    P = P || {};
    return {
      shippingPrice: parseFloat(P.shippingPrice) || 0,
      exchangeRate:  parseFloat(P.exchangeRate)  || 7,
      profitMargin:  parseFloat(P.profitMargin)  || 0,
      storageFee:    parseFloat(P.storageFee)    || 0,
      isPeak:        !!P.isPeak
    };
  }

  window.PRICING = { computeRow, params };
})();
