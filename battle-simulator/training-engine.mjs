/* GloryKings Training Lab.
 * Training-only proposed economy. No account, inventory or purchase writes.
 * Resource eras use TRAINING BUILDING level, independently from troop forge.
 * This module does not change the existing battle engine or historic reports.
 */
import {
  UNITS, ECONOMY, GOLD_TIERS, RESOURCES, trainingQuote, freeze,
} from './engine.mjs?v=20261118.3';

export {GOLD_TIERS, RESOURCES};
export const TRAINING_VERSION = 'GK_TRAINING_LAB_1.0.0';

export const PROVENANCE = freeze({
  resourceEras: 'owner_decision_2026_11_18',
  resourceBudget: 'previous_simulator_proposal',
  basicResourceShares: 'proposal_70_percent_wheat_wood_15_clay_15_iron',
  combat: 'existing_battle_simulator_catalog_not_verified_against_production',
  capacity: 'previous_project_report_037_not_live_verified',
  capacityUnit: 'troops_or_machines_per_training_batch_not_population',
  stableUnlock: 'owner_decision_castle_3',
  otherBuildingUnlocks: 'not_asserted',
  gold: 'optional_finish_time_resources_still_required',
  resourceValueConvention: 'equal_resource_count_budget_not_market_exchange_value',
});

export const BUILDING_CONFIG = freeze({
  barracks: {
    id: 'barracks', name: 'الثكنة', baseCapacity: 100,
    unitIds: ['LightInfantry', 'Archer', 'SpearInfantry'],
    opensAtCastle: null,
  },
  stable: {
    id: 'stable', name: 'الإسطبل', baseCapacity: 150,
    unitIds: ['LightCavalry', 'CamelCavalry', 'HeavyCavalry', 'ArcherCavalry'],
    opensAtCastle: 3,
  },
  workshop: {
    id: 'workshop', name: 'ورشة العربات', baseCapacity: 75,
    unitIds: ['BatteringRam', 'FireCatapult'],
    opensAtCastle: null,
  },
});

const roleText = {
  LightInfantry: 'مشاة مضادة للفرسان، بهجوم منخفض',
  Archer: 'رماة مشاة، دفاعهم العام أعلى من دفاعهم ضد الفرسان',
  SpearInfantry: 'مشاة هجومية، بدفاع منخفض',
  LightCavalry: 'فرسان هجومية، بدفاع محدود',
  CamelCavalry: 'فرسان دفاعية تتخصص في صد الفرسان',
  HeavyCavalry: 'فرسان ثقيلة، قوية في الدفاع ضد المشاة',
  ArcherCavalry: 'رماة فرسان متوازنة في الهجوم والدفاع',
  BatteringRam: 'آلة حصار لإضعاف السور، بقوة اشتباك هجومية منخفضة',
  FireCatapult: 'آلة حصار نارية للقصف',
};

// Deliberately allowlist training/combat fields. No troop movement or cargo fields.
export const TRAINING_UNITS = freeze(UNITS.map(u => ({
  id: u.id, name: u.name, short: u.short, icon: u.icon,
  building: ECONOMY[u.id].building, category: ECONOMY[u.id].category,
  role: roleText[u.id], attack: u.attack, def: u.def, cavDef: u.cavDef,
  baseSeconds: ECONOMY[u.id].baseSeconds,
})));
const unitMap = Object.fromEntries(TRAINING_UNITS.map(u => [u.id, u]));

function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} يجب أن يكون عددًا صحيحًا بين ${min} و${max}`);
  }
  return value;
}

function buildingConfig(building) {
  if (typeof building !== 'string' || !Object.hasOwn(BUILDING_CONFIG, building)) {
    throw new Error('مبنى التدريب غير صالح');
  }
  return BUILDING_CONFIG[building];
}

function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('مدخلات التدريب غير صالحة');
  }
  const {unitId, count, forge, buildingLevel, building} = input;
  if (typeof unitId !== 'string' || !Object.hasOwn(unitMap, unitId)) {
    throw new Error('اختر نوع جندي صالحًا');
  }
  const expected = unitMap[unitId].building;
  if (building !== undefined && buildingConfig(building).id !== expected) {
    throw new Error('هذا الجندي لا يُدرّب في المبنى المختار');
  }
  return {
    unitId,
    count: integer(count, 1, 1000000, 'عدد التدريب'),
    forge: integer(forge, 1, 30, 'مستوى حداد الجندي'),
    buildingLevel: integer(buildingLevel, 1, 30, 'مستوى مبنى التدريب'),
    building: expected,
  };
}

export function resourceEra(level) {
  integer(level, 1, 30, 'مستوى مبنى التدريب');
  if (level < 5) return freeze({
    id: 'wheat_wood', label: 'قمح وخشب', minLevel: 1, maxLevel: 4,
    unlockedResources: ['wheat', 'wood'],
  });
  if (level < 10) return freeze({
    id: 'clay', label: 'قمح وخشب وطين', minLevel: 5, maxLevel: 9,
    unlockedResources: ['wheat', 'wood', 'clay'],
  });
  return freeze({
    id: 'iron', label: 'قمح وخشب وطين وحديد', minLevel: 10, maxLevel: 30,
    unlockedResources: [...RESOURCES],
  });
}

export function capacity(building, level) {
  const config = buildingConfig(building);
  integer(level, 1, 30, 'مستوى مبنى التدريب');
  // Exact floor(base * (5 / 4)^(L - 1)); no floating-point boundary drift.
  const exponent = BigInt(level - 1);
  return Number(BigInt(config.baseCapacity) * (5n ** exponent) / (4n ** exponent));
}

function apportionedResources(original, unlocked) {
  const budget = RESOURCES.reduce((sum, key) => sum + original[key], 0);
  let weights;
  if (original.clay === 0 && original.iron === 0) {
    // Proposed full-era distribution: 70% wheat+wood in their old ratio,
    // 15% clay and 15% iron. Integer weights sum to 20 * budget.
    weights = {
      wheat: 14 * original.wheat, wood: 14 * original.wood,
      clay: 3 * budget, iron: 3 * budget,
    };
  } else {
    // Full-era advanced units retain their previous component prices exactly.
    weights = {...original};
  }
  const denominator = unlocked.reduce((sum, key) => sum + BigInt(weights[key]), 0n);
  const rows = unlocked.map((key, index) => {
    const numerator = BigInt(budget) * BigInt(weights[key]);
    return {key, index, value: Number(numerator / denominator), remainder: numerator % denominator};
  });
  const missing = budget - rows.reduce((sum, row) => sum + row.value, 0);
  const ranked = [...rows].sort((a, b) => a.remainder === b.remainder
    ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (let i = 0; i < missing; i++) ranked[i].value++;
  const resources = Object.fromEntries(RESOURCES.map(key => [key, 0]));
  for (const row of rows) resources[row.key] = row.value;
  return {resources, budget, weights};
}

export function quoteTraining(input) {
  const normalized = validate(input);
  const {unitId, count, forge, buildingLevel, building} = normalized;
  const unit = unitMap[unitId], config = buildingConfig(building);
  const era = resourceEra(buildingLevel), limit = capacity(building, buildingLevel);
  const base = trainingQuote({unitId, count: 1, forge, buildingLevel});
  const allocation = apportionedResources(base.unitResources, era.unlockedResources);
  const unitResources = allocation.resources;
  const resources = Object.fromEntries(RESOURCES.map(key => [key, unitResources[key] * count]));
  const fullBatches = Math.floor(count / limit), remainder = count % limit;
  const plan = [];
  function addBatch(batchCount, repeats) {
    if (!repeats || !batchCount) return;
    const q = trainingQuote({unitId, count: batchCount, forge, buildingLevel});
    plan.push({
      count: batchCount, repeats, seconds: q.seconds, gold: q.gold,
      goldBeforeDiscount: q.goldBeforeDiscount,
      undiscountedGold: q.undiscountedGold,
      discountedGold: q.discountedGold,
      effectiveDiscountPercent: q.effectiveDiscountPercent,
      theoreticalDiscountPercent: q.theoreticalDiscountPercent,
      tiers: q.tiers,
      resources: Object.fromEntries(RESOURCES.map(key => [key, unitResources[key] * batchCount])),
    });
  }
  addBatch(limit, fullBatches);
  addBatch(remainder, remainder ? 1 : 0);
  const sum = key => plan.reduce((value, batch) => value + batch[key] * batch.repeats, 0);
  const totalGold = sum('gold'), seconds = sum('seconds');
  const goldBeforeDiscount = sum('goldBeforeDiscount');
  const undiscountedGold = sum('undiscountedGold');
  const multiplierHundredths = 100 + 5 * (forge - 1);
  const combatFields = {attack: unit.attack, defense: unit.def, cavalryDefense: unit.cavDef};
  const perUnit = Object.fromEntries(Object.entries(combatFields).map(([key, value]) => [key, value * multiplierHundredths / 100]));
  const total = Object.fromEntries(Object.entries(combatFields).map(([key, value]) => [key, value * multiplierHundredths * count / 100]));
  return freeze({
    version: TRAINING_VERSION, source: 'training_simulator_proposal',
    ...normalized,
    name: unit.name, category: unit.category, role: unit.role, buildingName: config.name,
    era, unlockedResources: [...era.unlockedResources], unitResources, resources,
    resourceBudgetPerUnit: allocation.budget, resourceTotal: allocation.budget * count,
    resourceWeights: allocation.weights,
    combat: {perUnit, total}, forgeBonusPercent: 5 * (forge - 1),
    forgeFactor: multiplierHundredths / 100,
    resourceFactor: base.resourceFactor, effortFactor: base.effortFactor,
    buildingBonusPercent: base.speedPercent, buildingFactor: base.speedFactor,
    capacity: limit, capacitySource: PROVENANCE.capacity,
    capacityUnit: PROVENANCE.capacityUnit,
    batches: fullBatches + (remainder ? 1 : 0), fullBatches, remainder,
    batchPlan: plan, batchGold: plan[0].gold,
    totalGold, goldBeforeDiscount, goldSaved: goldBeforeDiscount - totalGold,
    undiscountedGold, discountedGold: sum('discountedGold'),
    averageGold: totalGold / count,
    effectiveDiscountPercent: undiscountedGold ? Math.max(0, 100 * (1 - totalGold / undiscountedGold)) : 0,
    theoreticalDiscountPercent: undiscountedGold ? Math.max(0, 100 * (1 - sum('discountedGold') / undiscountedGold)) : 0,
    seconds, perUnitTime: base.unitSeconds, singleUnitSeconds: base.seconds,
    normalGold: 0, canTrainSingleBatch: count <= limit,
    queueAssumption: 'empty_building_queue_sequential_batches_no_idle_gaps',
  });
}

export function levelRows(input) {
  const normalized = validate(input);
  const axis = input.axis ?? 'building';
  if (!['building', 'forge'].includes(axis)) throw new Error('محور المقارنة غير صالح');
  return freeze(Array.from({length: 30}, (_, index) => {
    const level = index + 1;
    return {level, ...quoteTraining({
      ...normalized,
      buildingLevel: axis === 'building' ? level : normalized.buildingLevel,
      forge: axis === 'forge' ? level : normalized.forge,
    })};
  }));
}

export function encodeTraining(input) {
  const normalized = validate(input);
  return btoa(JSON.stringify({version: TRAINING_VERSION, ...normalized}))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeTraining(encoded) {
  if (typeof encoded !== 'string' || !encoded.length || encoded.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new Error('رابط التدريب غير صالح');
  }
  let value;
  try { value = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { throw new Error('تعذر قراءة رابط التدريب'); }
  if (!value || value.version !== TRAINING_VERSION) throw new Error('إصدار رابط التدريب غير مدعوم');
  return freeze(validate(value));
}
