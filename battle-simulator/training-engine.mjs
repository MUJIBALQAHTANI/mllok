/* GloryKings Training — owner rules dated 2026-11-19.
 * Source image values, owner decisions and proposed balancing are distinguished.
 * Training-only preview: no inventory, account or production-game writes.
 */
export function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const TRAINING_VERSION = 'GK_TRAINING_APPROVED_4.0.0';
export const RESOURCES = freeze(['wheat', 'wood', 'clay', 'iron']);
export const RULES = freeze({
  forgePowerPerLevel: .05, forgeResourcePerLevel: .06, forgeEffortPerLevel: .04,
  secondsPerGold: 96, maxTimeReduction: .8,
  // baseReductionPercent remains a compatibility alias for the TIME reduction only.
  baseReductionPercent: 70, timeBaseReductionPercent: 70, baseTimeFactor: .3,
  resourceIncreasePercent: 70, resourceIncreaseFactor: 1.7,
  previousBaseResourceFactor: .3, baseResourceFactor: .51,
  timeCurveLinearShare: .4, timeCurveQuadraticShare: .6,
  resourceEraBasis: 'training_building_level', forgeBaseline: 0,
  maxBuildingLevel: 30, maxForgeLevel: 30, maxCount: 1000000,
  resourceRounding: 'ceil_each_resource_per_unit_then_multiply_quantity',
  timeRounding: 'ceil_once_per_actual_batch', goldRounding: 'ceil_once_per_actual_batch',
});
export const GOLD_TIERS = freeze([
  {from: 1, to: 100, discountPercent: 0},
  {from: 101, to: 1000, discountPercent: 2},
  {from: 1001, to: 5000, discountPercent: 5},
  {from: 5001, to: 10000, discountPercent: 10},
  {from: 10001, to: 50000, discountPercent: 15},
  {from: 50001, to: 1000000, discountPercent: 20},
]);
export const PROVENANCE = freeze({
  ownerRulesDate: '2026-11-19',
  resourceEras: 'owner_decision_training_building_1_4_5_9_10_30',
  resourceCosts: 'owner_reference_values_times_0_30_then_owner_70_percent_increase_to_current_resources_equals_0_51',
  resourceIncrease: 'owner_decision_resources_only_70_percent_above_exact_V3_base_before_forge_and_single_per_unit_ceiling',
  baseReduction: 'owner_decision_70_percent_off_reference_time_unchanged_from_V3_resources_now_separate',
  siegeResourcesAndTime: 'proposal_ram_600_600_300_150_480s_catapult_750_750_375_190_600s',
  infantryCombatAndTime: 'owner_image_IMG_2651(1).jpeg',
  cavalryCombatAndTime: 'owner_image_IMG_2653.jpeg_mapped_to_three_GloryKings_names',
  siegeCombat: 'retained_previous_simulator_catalog_not_live_verified',
  movementAndCargo: 'owner_decision_fixed_infantry_10_10_cavalry_20_20_siege_3_30',
  forgePower: 'owner_image_IMG_2655.jpeg_level1_0_to5_level2_5_to10',
  forgeResourcesAndTime: 'retained_previous_proposal_6pct_resources_4pct_effort_rebased_to_forge0',
  timeMaximum: 'owner_decision_80_percent_duration_reduction_at_building30',
  timeCurve: 'proposal_40percent_linear_60percent_quadratic_growth',
  capacity: 'owner_images_IMG_2657_to_IMG_2665_barracks300_stable150_workshop75_growth25percent',
  capacityUnit: 'troops_or_machines_per_training_batch_not_source_image_population',
  gold: 'proposal_96_effective_seconds_per_gold_marginal_tiers_per_batch_resources_still_required',
  cavalryUnlock: 'owner_decision_hero_palace_3_7_10',
  workshopUnlock: 'owner_level10_interpreted_as_castle_level',
  conflicts: [
    'Camel iron at level7 conflicts with global no-iron-before10; global resource rule takes precedence.',
    'Unlock requirements and training-building resource eras are independent. Four resources apply from training building10, not from forge1 alone.',
  ],
  excludedSourceRows: ['population_capacity', 'wheat_upkeep', 'training_per_24h', 'costs_per_24h', 'old_building_speed_bonus', 'old_building_resource_prices', 'conflicting_old_unlocks'],
});

export const BUILDING_CONFIG = freeze({
  barracks: {id: 'barracks', name: 'الثكنة', baseCapacity: 300, unitIds: ['LightInfantry', 'Archer', 'SpearInfantry'], opensAtCastle: null},
  stable: {id: 'stable', name: 'الإسطبل', baseCapacity: 150, unitIds: ['LightCavalry', 'CamelCavalry', 'HeavyCavalry'], opensAtCastle: 3},
  workshop: {id: 'workshop', name: 'ورشة العربات', baseCapacity: 75, unitIds: ['BatteringRam', 'FireCatapult'], opensAtCastle: 10},
});

const definitions = [
  ['LightInfantry', 'أبو هراوة', 'هراوة', 'barracks', 'مشاة هجومية', 'مشاة اقتصادية للهجوم؛ دفاعها ضد الفرسان محدود', 52.4, 29.4, 12.2, 96, 100, 100, 50, 25, null, 'المهاجم بهراوة'],
  ['Archer', 'رامي السهام', 'رامي', 'barracks', 'مشاة مضادة للفرسان', 'وحدة دفاعية تتخصص في صد الفرسان', 17.9, 46.6, 75.4, 151, 160, 160, 85, 40, null, 'حامل الرمح'],
  ['SpearInfantry', 'أبو فأسين', 'فأسين', 'barracks', 'مشاة هجومية', 'هجوم قوي مع دفاع متساوٍ ضد المشاة والفرسان', 75.4, 40.9, 40.9, 162, 250, 250, 120, 65, null, 'المقاتل بالفأس'],
  ['LightCavalry', 'فارس العرب', 'العرب', 'stable', 'فرسان هجومية', 'فرسان للهجوم بدفاع متوسط', 109.8, 69.6, 52.4, 284, 360, 360, 190, 95, 3, 'التوأم الحديدي تيريون'],
  ['CamelCavalry', 'فارس الجمل', 'الجمل', 'stable', 'فرسان دفاعية', 'فرسان دفاعية؛ أقوى دفاع مشاة بين الفرسان الثلاثة', 76, 150.7, 116.2, 380, 430, 430, 215, 110, 7, 'فارس البيداء'],
  ['HeavyCavalry', 'سلاح الفرسان', 'الثقيل', 'stable', 'فرسان هجومية ثقيلة', 'أعلى هجوم بين الفرسان الثلاثة، بتكلفة ومدة أكبر', 243.3, 111.1, 105.3, 463, 550, 550, 270, 140, 10, 'كورِنثي ساحق'],
  ['BatteringRam', 'كبش الحصار', 'كبش', 'workshop', 'آلة حصار', 'آلة لإضعاف السور؛ هجوم الاشتباك المباشر منخفض', 2, 20, 50, 480, 600, 600, 300, 150, null, 'القيم القتالية من المحاكي السابق'],
  ['FireCatapult', 'المنجنيق', 'منجنيق', 'workshop', 'آلة حصار', 'آلة قصف؛ أثر السور يحسب في قسم السور', 95, 90, 55, 600, 750, 750, 375, 190, null, 'القيم القتالية من المحاكي السابق'],
];
export const TRAINING_UNITS = freeze(definitions.map(([id, name, short, building, category, role, attack, def, cavDef, baseSeconds, wheat, wood, clay, iron, heroUnlock, referenceName]) => {
  const siege = building === 'workshop';
  return {
    id, name, short, building, category, role, attack, def, cavDef,
    referenceBaseSeconds: baseSeconds, baseSeconds: baseSeconds * 3 / 10,
    referenceBaseResources: {wheat, wood, clay, iron},
    previousBaseResources: {wheat: wheat * 3 / 10, wood: wood * 3 / 10, clay: clay * 3 / 10, iron: iron * 3 / 10},
    baseResources: {wheat: wheat * 51 / 100, wood: wood * 51 / 100, clay: clay * 51 / 100, iron: iron * 51 / 100},
    baseReductionPercent: 70, timeBaseReductionPercent: 70,
    resourceIncreasePercent: 70, resourceIncreaseFactor: 1.7,
    previousBaseResourceFactor: .3, baseResourceFactor: .51,
    movementSpeed: siege ? 3 : building === 'stable' ? 20 : 10,
    cargo: siege ? 30 : building === 'stable' ? 20 : 10,
    unlock: heroUnlock ? {building: 'heroPalace', name: 'قصر الأبطال', level: heroUnlock} : siege ? {building: 'castle', name: 'القلعة', level: 10} : null,
    referenceName, proposal: siege,
    sources: {
      combat: siege ? PROVENANCE.siegeCombat : building === 'barracks' ? PROVENANCE.infantryCombatAndTime : PROVENANCE.cavalryCombatAndTime,
      time: siege ? 'previous_proposal_then_owner_70_percent_reduction' : 'owner_reference_image_then_owner_70_percent_reduction',
      resources: siege ? 'previous_proposal_times_0_30_then_current_resources_increased_70_percent' : 'owner_explicit_values_times_0_30_then_current_resources_increased_70_percent',
    },
  };
}));
const unitMap = Object.fromEntries(TRAINING_UNITS.map(unit => [unit.id, unit]));
const ceilRatio = (n, d) => (n + d - 1n) / d;
const sumResources = resources => RESOURCES.reduce((sum, key) => sum + resources[key], 0);

function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${label} يجب أن يكون عددًا صحيحًا بين ${min} و${max}`);
  return value;
}
function buildingConfig(building) {
  if (typeof building !== 'string' || !Object.hasOwn(BUILDING_CONFIG, building)) throw new Error('مبنى التدريب غير صالح');
  return BUILDING_CONFIG[building];
}
function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('مدخلات التدريب غير صالحة');
  const {unitId, count, forge, buildingLevel, building} = input;
  if (typeof unitId !== 'string' || !Object.hasOwn(unitMap, unitId)) throw new Error('اختر نوع جندي صالحًا من الأنواع الثمانية');
  const expected = unitMap[unitId].building;
  if (building !== undefined && buildingConfig(building).id !== expected) throw new Error('هذا الجندي لا يُدرّب في المبنى المختار');
  return {unitId, count: integer(count, 1, 1000000, 'عدد التدريب'), forge: integer(forge, 0, 30, 'مستوى حداد الجندي'), buildingLevel: integer(buildingLevel, 1, 30, 'مستوى مبنى التدريب'), building: expected,
    heroPalaceLevel: integer(input.heroPalaceLevel === undefined ? 30 : input.heroPalaceLevel, 1, 30, 'مستوى قصر الأبطال'), castleLevel: integer(input.castleLevel === undefined ? 30 : input.castleLevel, 1, 30, 'مستوى القلعة')};
}

export function resourceEra(level) {
  integer(level, 1, 30, 'مستوى مبنى التدريب');
  if (level < 5) return freeze({id: 'wheat_wood', label: 'قمح وخشب', minLevel: 1, maxLevel: 4, unlockedResources: ['wheat', 'wood']});
  if (level < 10) return freeze({id: 'clay', label: 'قمح وخشب وطين', minLevel: 5, maxLevel: 9, unlockedResources: ['wheat', 'wood', 'clay']});
  return freeze({id: 'iron', label: 'قمح وخشب وطين وحديد', minLevel: 10, maxLevel: 30, unlockedResources: [...RESOURCES]});
}
export function capacity(building, level) {
  const config = buildingConfig(building); integer(level, 1, 30, 'مستوى مبنى التدريب');
  const exponent = BigInt(level - 1);
  return Number(BigInt(config.baseCapacity) * 5n ** exponent / 4n ** exponent);
}
function durationRatio(level) {
  const k = BigInt(integer(level, 1, 30, 'مستوى مبنى التدريب') - 1);
  // Exact version of 1 - .8 * (.4*x + .6*x*x), x=(L-1)/29.
  return {numerator: 21025n - 232n * k - 12n * k * k, denominator: 21025n};
}
export function buildingTimeReduction(level) {
  const r = durationRatio(level); return Number(r.denominator - r.numerator) / Number(r.denominator);
}
export function buildingTimeDetails(level) {
  const reduction = buildingTimeReduction(level);
  const ratio = durationRatio(level);
  const prior = level > 1 ? buildingTimeReduction(level - 1) : 0;
  const next = level < 30 ? buildingTimeReduction(level + 1) : reduction;
  return freeze({level, reductionPercent: reduction * 100, timeFactor: Number(ratio.numerator) / Number(ratio.denominator),
    baseReductionPercent: 70, timeBaseReductionPercent: 70, totalTimeReductionVsReferencePercent: 70 + 30 * reduction,
    totalTimeFactorVsReference: Number(3n * ratio.numerator) / Number(10n * ratio.denominator),
    incrementPercentagePoints: (reduction - prior) * 100, nextReductionPercent: next * 100,
    nextIncrementPercentagePoints: level < 30 ? (next - reduction) * 100 : 0});
}
function availabilityFor(unit, normalized) {
  const requirements = [], config = buildingConfig(unit.building);
  if (config.opensAtCastle) requirements.push({building: 'castle', name: 'القلعة', required: config.opensAtCastle, current: normalized.castleLevel, met: normalized.castleLevel >= config.opensAtCastle});
  if (unit.unlock?.building === 'heroPalace') requirements.push({building: 'heroPalace', name: 'قصر الأبطال', required: unit.unlock.level, current: normalized.heroPalaceLevel, met: normalized.heroPalaceLevel >= unit.unlock.level});
  const reasons = requirements.filter(r => !r.met).map(r => `يتطلب ${r.name} مستوى ${r.required}`);
  return {available: reasons.length === 0, reasons, requirements, previewOnly: reasons.length > 0};
}

export function quoteTraining(input) {
  const normalized = validate(input);
  const {unitId, count, forge, buildingLevel, building} = normalized;
  const unit = unitMap[unitId], config = buildingConfig(building), era = resourceEra(buildingLevel);
  const limit = capacity(building, buildingLevel), ratio = durationRatio(buildingLevel);
  const resourceHundredths = 100 + 6 * forge, effortHundredths = 100 + 4 * forge;
  // V4 increases the exact V3 resource base by 70%: reference * .30 * 1.70 = reference * .51.
  // Apply forge next, then round each per-unit resource once. Time remains at reference * .30.
  const unitResources = Object.fromEntries(RESOURCES.map(key => [key, era.unlockedResources.includes(key) ? Number(ceilRatio(BigInt(unit.referenceBaseResources[key]) * 51n * BigInt(resourceHundredths), 10000n)) : 0]));
  const resources = Object.fromEntries(RESOURCES.map(key => [key, unitResources[key] * count]));
  const workNumerator = BigInt(unit.referenceBaseSeconds) * 3n * BigInt(effortHundredths) * ratio.numerator;
  const workDenominator = 1000n * ratio.denominator;
  const perUnitTime = Number(workNumerator) / Number(workDenominator);
  const fullBatches = Math.floor(count / limit), remainder = count % limit, plan = [];
  function addBatch(batchCount, repeats) {
    if (!batchCount || !repeats) return;
    const tiers = GOLD_TIERS.map(tier => ({...tier, count: Math.max(0, Math.min(batchCount, tier.to) - tier.from + 1)})).filter(tier => tier.count > 0);
    const weighted = tiers.reduce((value, tier) => value + BigInt(tier.count * (100 - tier.discountPercent)), 0n);
    const goldDenominator = workDenominator * 96n * 100n;
    const goldNumerator = workNumerator * weighted, rawNumerator = workNumerator * BigInt(batchCount) * 100n;
    const gold = Number(ceilRatio(goldNumerator, goldDenominator));
    const undiscountedGold = Number(rawNumerator) / Number(goldDenominator), discountedGold = Number(goldNumerator) / Number(goldDenominator);
    plan.push({count: batchCount, repeats, seconds: Number(ceilRatio(workNumerator * BigInt(batchCount), workDenominator)), gold,
      goldBeforeDiscount: Number(ceilRatio(rawNumerator, goldDenominator)), undiscountedGold, discountedGold,
      effectiveDiscountPercent: Math.max(0, 100 * (1 - gold / undiscountedGold)),
      theoreticalDiscountPercent: 100 * (1 - Number(weighted) / (100 * batchCount)), tiers,
      resources: Object.fromEntries(RESOURCES.map(key => [key, unitResources[key] * batchCount]))});
  }
  addBatch(limit, fullBatches); addBatch(remainder, remainder ? 1 : 0);
  const sum = key => plan.reduce((value, row) => value + row[key] * row.repeats, 0);
  const totalGold = sum('gold'), seconds = sum('seconds'), goldBeforeDiscount = sum('goldBeforeDiscount');
  const undiscountedGold = sum('undiscountedGold'), discountedGold = sum('discountedGold');
  const powerHundredths = 100 + 5 * forge;
  const baseCombat = {attack: unit.attack, defense: unit.def, cavalryDefense: unit.cavDef};
  const perUnit = Object.fromEntries(Object.entries(baseCombat).map(([key, value]) => [key, Math.round(value * 10) * powerHundredths / 1000]));
  const total = Object.fromEntries(Object.entries(baseCombat).map(([key, value]) => [key, Math.round(value * 10) * powerHundredths * count / 1000]));
  const timeDetails = buildingTimeDetails(buildingLevel), beforeBuilding = unit.referenceBaseSeconds * 3 * effortHundredths / 1000;
  const referenceBeforeBuilding = unit.referenceBaseSeconds * effortHundredths / 100;
  return freeze({
    version: TRAINING_VERSION, source: 'owner_rules_and_documented_proposals', ...normalized,
    name: unit.name, category: unit.category, role: unit.role, buildingName: config.name,
    era, unlockedResources: [...era.unlockedResources], baseUnitResources: {...unit.baseResources}, previousBaseUnitResources: {...unit.previousBaseResources}, referenceBaseUnitResources: {...unit.referenceBaseResources}, unitResources, resources,
    resourceIncreasePercent: 70, resourceIncreaseFactor: 1.7, previousBaseResourceFactor: .3, baseResourceFactor: .51,
    resourceBudgetPerUnit: sumResources(unitResources), resourceTotal: sumResources(resources),
    combat: {base: baseCombat, perUnit, total}, forgeBonusPercent: 5 * forge, forgeFactor: powerHundredths / 100,
    resourceFactor: resourceHundredths / 100, effortFactor: effortHundredths / 100,
    baseSeconds: unit.baseSeconds, referenceBaseSeconds: unit.referenceBaseSeconds, baseReductionPercent: 70, timeBaseReductionPercent: 70,
    timeBeforeBuildingSeconds: beforeBuilding, referenceTimeBeforeBuildingSeconds: referenceBeforeBuilding,
    unitTimeSavedSeconds: beforeBuilding - perUnitTime, unitTimeSavedVsReferenceSeconds: referenceBeforeBuilding - perUnitTime,
    totalTimeReductionVsReferencePercent: timeDetails.totalTimeReductionVsReferencePercent,
    totalTimeFactorVsReference: timeDetails.totalTimeFactorVsReference,
    trainingReductionPercent: timeDetails.reductionPercent, timeFactor: timeDetails.timeFactor, buildingTime: timeDetails,
    buildingBonusPercent: timeDetails.reductionPercent, buildingFactor: timeDetails.timeFactor,
    movementSpeed: unit.movementSpeed, cargo: unit.cargo, totalCargo: unit.cargo * count,
    availability: availabilityFor(unit, normalized),
    capacity: limit, capacitySource: PROVENANCE.capacity, capacityUnit: PROVENANCE.capacityUnit,
    capacityNextLevel: buildingLevel < 30 ? capacity(building, buildingLevel + 1) : null,
    batches: fullBatches + (remainder ? 1 : 0), fullBatches, remainder, batchPlan: plan, batchGold: plan[0].gold,
    totalGold, goldBeforeDiscount, goldSaved: goldBeforeDiscount - totalGold, undiscountedGold, discountedGold,
    averageGold: totalGold / count,
    effectiveDiscountPercent: Math.max(0, 100 * (1 - totalGold / undiscountedGold)),
    theoreticalDiscountPercent: Math.max(0, 100 * (1 - discountedGold / undiscountedGold)),
    seconds, perUnitTime, singleUnitSeconds: Number(ceilRatio(workNumerator, workDenominator)),
    normalGold: 0, canTrainSingleBatch: count <= limit,
    queueAssumption: 'empty_building_queue_sequential_batches_no_idle_gaps',
  });
}

export function levelRows(input) {
  const normalized = validate(input), axis = input.axis ?? 'building';
  if (!['building', 'forge'].includes(axis)) throw new Error('محور المقارنة غير صالح');
  return freeze(Array.from({length: axis === 'building' ? 30 : 31}, (_, index) => {
    const level = axis === 'building' ? index + 1 : index;
    return {level, ...quoteTraining({...normalized, buildingLevel: axis === 'building' ? level : normalized.buildingLevel, forge: axis === 'forge' ? level : normalized.forge})};
  }));
}
export function encodeTraining(input) {
  return btoa(JSON.stringify({version: TRAINING_VERSION, ...validate(input)})).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeTraining(encoded) {
  if (typeof encoded !== 'string' || !encoded.length || encoded.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('رابط التدريب غير صالح');
  let value;
  try { value = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { throw new Error('تعذر قراءة رابط التدريب'); }
  if (!value || value.version !== TRAINING_VERSION) throw new Error('إصدار رابط التدريب قديم؛ أنشئ حسبة جديدة بقواعد الاعتماد الأخيرة');
  return freeze(validate(value));
}

/* Append to training-engine.mjs. Uses its current TRAINING_UNITS and freeze.
 * This is a conditional wall calculator, not a battle or survivor predictor.
 * Wall level/HP anchors are owner decisions; the retained siege limits and
 * suppression/damage coefficients remain a proposed simulation model.
 */
export function quoteWall(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('مدخلات السور غير صالحة');
  const wallInt = (value, min, max, label) => {
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${label} يجب أن يكون عددًا صحيحًا بين ${min} و${max}`);
    return value;
  };
  const level = wallInt(input.level, 0, 30, 'مستوى السور'), max = level * 1000;
  const hp = wallInt(input.hp, 0, max, 'متانة السور');
  const unit = TRAINING_UNITS.find(candidate => candidate.id === input.defenderUnitId);
  if (!unit) throw new Error('اختر جنديًا مدافعًا من الأنواع الحالية');
  const defenderCount = wallInt(input.defenderCount, 0, 1000000, 'عدد المدافعين');
  const defenderForge = wallInt(input.defenderForge, 0, 30, 'حداد المدافع');
  const arrivingRams = wallInt(input.arrivingRams, 0, 1000000, 'الكباش المشاركة');
  const survivingRams = wallInt(input.survivingRams, 0, arrivingRams, 'الكباش الناجية');
  const ramForge = wallInt(input.ramForge, 0, 30, 'حداد الكباش');
  const survivingCatapults = wallInt(input.survivingCatapults, 0, 1000000, 'المنجنيقات الناجية');
  const catapultForge = wallInt(input.catapultForge, 0, 30, 'حداد المنجنيق');
  const usedDirect = wallInt(input.usedDirect, 0, max, 'ضرر الدقيقة السابقة');
  const usedHour = wallInt(input.usedHour, 0, max, 'ضرر الساعة السابقة');
  if (usedDirect > usedHour) throw new Error('ضرر الدقيقة لا يمكن أن يتجاوز مجموع ضرر الساعة');
  if (typeof input.attackerWon !== 'boolean') throw new Error('حدد نتيجة الهجوم المشروطة بوضوح');
  const attackerWon = input.attackerWon;
  const normalized = {level, hp, defenderUnitId: unit.id, defenderCount, defenderForge, arrivingRams, survivingRams, ramForge, survivingCatapults, catapultForge, attackerWon, usedDirect, usedHour};

  // Forge zero is the base in the current training catalog. Never import the
  // old battle engine's forge-one baseline or its obsolete nine-unit catalog.
  const ramHundredths = 100 + 5 * ramForge, catapultHundredths = 100 + 5 * catapultForge;
  const effectiveRams100 = BigInt(arrivingRams) * BigInt(ramHundredths);
  const wallNumerator = level ? BigInt(level * hp) * (effectiveRams100 + BigInt(2000 * level)) : 0n;
  const wallDenominator = level ? BigInt(100 * max) * 2n * (effectiveRams100 + BigInt(1000 * level)) : 1n;
  const suppression = level ? Number(effectiveRams100) / Number(2n * (effectiveRams100 + BigInt(1000 * level))) : 0;
  const appliedPercent = Number(wallNumerator) * 100 / Number(wallDenominator);

  const survivingRams100 = BigInt(survivingRams) * BigInt(ramHundredths);
  const survivingCatapults100 = BigInt(survivingCatapults) * BigInt(catapultHundredths);
  // Structural damage uses the declared surviving engines after a declared
  // attacker victory. It does not infer victory or survivors from troop power.
  const directRaw = attackerWon ? Number((12n * survivingRams100 + 6n * survivingCatapults100) / 100n) : 0;
  const directCap = Math.floor(max / 10), hourCap = Math.floor(max / 4);
  const remainingDirectBudget = Math.max(0, directCap - usedDirect);
  const remainingHourBudget = Math.max(0, hourCap - usedHour);
  const direct = Math.min(directRaw, hp, remainingDirectBudget, remainingHourBudget);
  let firePotential = 0;
  if (attackerWon && direct > 0) {
    // Keep all fire candidates in hundredths until the final floor, including
    // the half-direct limit. No intermediate floating-point damage rounding.
    const candidates = [3n * survivingCatapults100, BigInt(max) * 2n, BigInt(direct) * 50n, BigInt(hp - direct) * 100n, BigInt(Math.max(0, remainingHourBudget - direct)) * 100n];
    firePotential = Number(candidates.reduce((lowest, value) => value < lowest ? value : lowest) / 100n);
  }
  const wall = {
    level, max, hp, nominalPercent: level,
    intactPercent: max ? 100 * hp / max : 0,
    availablePercent: max ? level * hp / max : 0,
    ramEffectiveCount: Number(effectiveRams100) / 100,
    suppressionPercent: suppression * 100, appliedPercent,
    directRaw, direct, prevented: directRaw - direct, firePotential, fireMinutes: 30,
    hpAfter: hp - direct, hpAfterFire: hp - direct - firePotential,
    directCap, hourCap, usedDirect, usedHour, remainingDirectBudget, remainingHourBudget,
  };

  const forgeHundredths = 100 + 5 * defenderForge;
  const base = {attack: unit.attack, defense: unit.def, cavalryDefense: unit.cavDef};
  const perUnit = {}, total = {}, fortifiedPerUnit = {}, fortifiedTotal = {};
  for (const [key, baseValue] of Object.entries(base)) {
    const baseTenths = BigInt(Math.round(baseValue * 10));
    const forgedNumerator = baseTenths * BigInt(forgeHundredths);
    perUnit[key] = Number(forgedNumerator) / 1000;
    total[key] = Number(forgedNumerator * BigInt(defenderCount)) / 1000;
    if (key === 'attack') {
      fortifiedPerUnit[key] = perUnit[key]; fortifiedTotal[key] = total[key];
    } else {
      const numerator = forgedNumerator * (wallDenominator + wallNumerator), denominator = 1000n * wallDenominator;
      fortifiedPerUnit[key] = Number(numerator) / Number(denominator);
      fortifiedTotal[key] = Number(numerator * BigInt(defenderCount)) / Number(denominator);
    }
  }
  return freeze({
    version: 'GK_WALL_CONDITIONAL_1', source: 'retained_siege_proposal_not_production',
    conditional: true, input: normalized, wall,
    defender: {unitId: unit.id, name: unit.name, count: defenderCount, forge: defenderForge, forgeBonusPercent: 5 * defenderForge, forgeFactor: forgeHundredths / 100, base, perUnit, total, fortifiedPerUnit, fortifiedTotal},
  });
}
