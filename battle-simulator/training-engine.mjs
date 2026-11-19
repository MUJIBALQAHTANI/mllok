/* GloryKings Training — owner rules dated 2026-11-19.
 * Source image values, owner decisions and proposed balancing are distinguished.
 * Training-only preview: no inventory, account or production-game writes.
 */
export function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const TRAINING_VERSION = 'GK_TRAINING_APPROVED_2.0.0';
export const RESOURCES = freeze(['wheat', 'wood', 'clay', 'iron']);
export const RULES = freeze({
  forgePowerPerLevel: .05, forgeResourcePerLevel: .06, forgeEffortPerLevel: .04,
  secondsPerGold: 96, maxTimeReduction: .8,
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
  resourceCosts: 'owner_values_for_six_units_each_wheat_and_wood_separately',
  siegeResourcesAndTime: 'proposal_ram_600_600_300_150_480s_catapult_750_750_375_190_600s',
  infantryCombatAndTime: 'owner_image_IMG_2651(1).jpeg',
  cavalryCombatAndTime: 'owner_image_IMG_2653.jpeg_mapped_to_three_GloryKings_names',
  siegeCombat: 'retained_previous_simulator_catalog_not_live_verified',
  movementAndCargo: 'owner_decision_fixed_infantry_10_10_cavalry_20_20_siege_3_30',
  forgePower: 'owner_image_IMG_2655.jpeg_level1_0_to5_level2_5_to10',
  forgeResourcesAndTime: 'retained_previous_proposal_6pct_resources_4pct_effort_rebased_to_forge0',
  timeMaximum: 'owner_decision_80_percent_duration_reduction_at_building30',
  timeCurve: 'proposal_40percent_linear_60percent_quadratic_growth',
  capacity: 'previous_project_report_037_not_live_verified',
  capacityUnit: 'troops_or_machines_per_training_batch_not_source_image_population',
  gold: 'proposal_96_effective_seconds_per_gold_marginal_tiers_per_batch_resources_still_required',
  cavalryUnlock: 'owner_decision_hero_palace_3_7_10',
  workshopUnlock: 'owner_level10_interpreted_as_castle_level',
  conflicts: [
    'Camel iron at level7 conflicts with global no-iron-before10; global resource rule takes precedence.',
    'Unlock requirements and training-building resource eras are independent. Four resources apply from training building10, not from forge1 alone.',
  ],
  excludedSourceRows: ['population_capacity', 'wheat_upkeep', 'training_per_24h', 'costs_per_24h'],
});

export const BUILDING_CONFIG = freeze({
  barracks: {id: 'barracks', name: 'الثكنة', baseCapacity: 100, unitIds: ['LightInfantry', 'Archer', 'SpearInfantry'], opensAtCastle: null},
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
  ['FireCatapult', 'المنجنيق', 'منجنيق', 'workshop', 'آلة حصار', 'آلة قصف؛ أثر السور يحسب في محاكي المعارك', 95, 90, 55, 600, 750, 750, 375, 190, null, 'القيم القتالية من المحاكي السابق'],
];
export const TRAINING_UNITS = freeze(definitions.map(([id, name, short, building, category, role, attack, def, cavDef, baseSeconds, wheat, wood, clay, iron, heroUnlock, referenceName]) => {
  const siege = building === 'workshop';
  return {
    id, name, short, building, category, role, attack, def, cavDef, baseSeconds,
    baseResources: {wheat, wood, clay, iron},
    movementSpeed: siege ? 3 : building === 'stable' ? 20 : 10,
    cargo: siege ? 30 : building === 'stable' ? 20 : 10,
    unlock: heroUnlock ? {building: 'heroPalace', name: 'قصر الأبطال', level: heroUnlock} : siege ? {building: 'castle', name: 'القلعة', level: 10} : null,
    referenceName, proposal: siege,
    sources: {
      combat: siege ? PROVENANCE.siegeCombat : building === 'barracks' ? PROVENANCE.infantryCombatAndTime : PROVENANCE.cavalryCombatAndTime,
      time: siege ? 'proposed' : 'owner_reference_image', resources: siege ? 'proposed' : 'owner_explicit_values',
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
  const unitResources = Object.fromEntries(RESOURCES.map(key => [key, era.unlockedResources.includes(key) ? Number(ceilRatio(BigInt(unit.baseResources[key] * resourceHundredths), 100n)) : 0]));
  const resources = Object.fromEntries(RESOURCES.map(key => [key, unitResources[key] * count]));
  const workNumerator = BigInt(unit.baseSeconds * effortHundredths) * ratio.numerator;
  const workDenominator = 100n * ratio.denominator;
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
  const timeDetails = buildingTimeDetails(buildingLevel), beforeBuilding = unit.baseSeconds * effortHundredths / 100;
  return freeze({
    version: TRAINING_VERSION, source: 'owner_rules_and_documented_proposals', ...normalized,
    name: unit.name, category: unit.category, role: unit.role, buildingName: config.name,
    era, unlockedResources: [...era.unlockedResources], baseUnitResources: {...unit.baseResources}, unitResources, resources,
    resourceBudgetPerUnit: sumResources(unitResources), resourceTotal: sumResources(resources),
    combat: {base: baseCombat, perUnit, total}, forgeBonusPercent: 5 * forge, forgeFactor: powerHundredths / 100,
    resourceFactor: resourceHundredths / 100, effortFactor: effortHundredths / 100,
    baseSeconds: unit.baseSeconds, timeBeforeBuildingSeconds: beforeBuilding, unitTimeSavedSeconds: beforeBuilding - perUnitTime,
    trainingReductionPercent: timeDetails.reductionPercent, timeFactor: timeDetails.timeFactor, buildingTime: timeDetails,
    buildingBonusPercent: timeDetails.reductionPercent, buildingFactor: timeDetails.timeFactor,
    movementSpeed: unit.movementSpeed, cargo: unit.cargo, totalCargo: unit.cargo * count,
    availability: availabilityFor(unit, normalized),
    capacity: limit, capacitySource: PROVENANCE.capacity, capacityUnit: PROVENANCE.capacityUnit,
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
