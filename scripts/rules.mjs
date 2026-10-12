/**
 * Pure rule helpers: the Heroism meter, the Morale escalation and the dice pool of a Crucible check, computed like the
 * system does it (Crucible 0.11.1: models/combat-combat.mjs, documents/combatant.mjs, dice/standard-check.mjs).
 * Nothing here touches Foundry globals, so the tests can run in Node.
 */

/** AP of confirmed actions per hero which fill the Heroism meter once: 4 AP per hero over 3 rounds. */
export const HEROISM_RATE = 12;

/** Morale escalation applies from this round on. */
export const ESCALATION_START = 7;

/** Crucible's limits for boons and banes and the die steps of the 3d8 pool. */
export const DICE = {maxBoons: 6, maxBanes: 6, step: 2, minDie: 4, maxDie: 12, base: 8, size: 3};

/* -------------------------------------------- */

/**
 * @typedef HeroismState
 * @property {number} actions     AP recorded on the meter in this combat
 * @property {number} required    AP per Heroism point
 * @property {number} previous    The threshold reached last
 * @property {number} next        The next threshold
 * @property {number} progress    AP since the last threshold
 * @property {number} remaining   AP missing to the next threshold
 * @property {number} earned      Heroism points generated in this combat
 * @property {number} pct         Progress to the next point between 0 and 1
 */

/**
 * The state of the Heroism meter.
 * @param {object} heroism                The heroism data of the combat (system.heroism)
 * @param {number} heroism.actions        Recorded AP
 * @param {number} [heroism.required]     AP per point as the system derived it
 * @param {number} heroCount              Hero combatants, used when the system value is missing
 * @returns {HeroismState}
 */
export function heroismState({actions=0, required}={}, heroCount=1) {
  actions = Math.max(Number(actions) || 0, 0);
  required = (Number(required) > 0) ? Number(required) : (Math.max(heroCount, 1) * HEROISM_RATE);
  const earned = Math.floor(actions / required);
  const previous = earned * required;
  const next = previous + required;
  return {actions, required, previous, next, earned, progress: actions - previous, remaining: next - actions,
    pct: (actions - previous) / required};
}

/* -------------------------------------------- */

/**
 * @typedef EscalationState
 * @property {boolean} active       Escalation applies in this round
 * @property {number} round         The current round
 * @property {number|null} amount   Morale gained by the first and lost by the last combatant this round
 * @property {number} nextAmount    The amount of the next round
 * @property {number|null} roundsLeft  Rounds until the escalation starts (inactive only)
 */

/**
 * The Morale escalation for a round.
 * @param {number} round
 * @param {number} [start]
 * @returns {EscalationState|null}  Null before the combat started
 */
export function escalationState(round, start=ESCALATION_START) {
  round = Number(round) || 0;
  if ( round < 1 ) return null;
  if ( round < start ) return {active: false, round, amount: null, nextAmount: start, roundsLeft: start - round};
  return {active: true, round, amount: round, nextAmount: round + 1, roundsLeft: null};
}

/**
 * Who the escalation hits at the start of a round: the first combatant in the turn order gains Morale, the last one
 * who is not incapacitated loses it. Like the system, the search for the last one stops before the first turn, and a
 * round with fewer than two combatants has no escalation.
 * @template T
 * @param {T[]} turns                       The turn order
 * @param {(turn: T) => boolean} isIncapacitated
 * @returns {{first: T|null, last: T|null}|null}
 */
export function escalationTargets(turns, isIncapacitated) {
  if ( !Array.isArray(turns) || (turns.length < 2) ) return null;
  let last = null;
  for ( let i = turns.length - 1; i > 0; i-- ) {
    if ( !isIncapacitated(turns[i]) ) {
      last = turns[i];
      break;
    }
  }
  return {first: turns[0] ?? null, last};
}

/* -------------------------------------------- */

/**
 * Count boons or banes like the system: every source counts with its number (default 1), and the sum is capped. The
 * system already caps the numbers when it builds a roll, so a source beyond the cap arrives with 0; such sources are
 * listed as capped.
 * @param {Record<string, {label?: string, number?: number}>} sources
 * @param {number} [max]
 * @returns {{total: number, sources: {id: string, label: string, number: number}[], capped: {id: string, label: string}[]}}
 */
export function countSources(sources, max=DICE.maxBoons) {
  let total = 0;
  const list = [];
  const capped = [];
  for ( const [id, source] of Object.entries(sources ?? {}) ) {
    const label = String(source?.label ?? id);
    let number = Number(source?.number ?? 1) || 0;
    if ( total + number > max ) number = max - total;
    if ( number <= 0 ) {
      if ( total >= max ) capped.push({id, label});
      continue;
    }
    total += number;
    list.push({id, label, number});
  }
  return {total, sources: list, capped};
}

/**
 * The dice of a Crucible check: 3d8, boons grow the dice from the left, banes shrink them from the right.
 * @param {number} boons
 * @param {number} banes
 * @returns {number[]}  The faces of the three dice
 */
export function dicePool(boons, banes) {
  const pool = Array(DICE.size).fill(DICE.base);
  let d = 0;
  for ( let i = 0; (i < Math.min(boons, DICE.maxBoons)) && (d < DICE.size); i++ ) {
    pool[d] += DICE.step;
    if ( pool[d] === DICE.maxDie ) d++;
  }
  d = DICE.size - 1;
  for ( let i = 0; (i < Math.min(banes, DICE.maxBanes)) && (d >= 0); i++ ) {
    pool[d] -= DICE.step;
    if ( pool[d] === DICE.minDie ) d--;
  }
  return pool;
}

/**
 * The average result of dice and a flat bonus.
 * @param {number[]} faces
 * @param {number} [flat]
 * @returns {number}
 */
export function averageRoll(faces, flat=0) {
  return faces.reduce((total, f) => total + ((f + 1) / 2), 0) + flat;
}

/**
 * A pool as text, for example "d12 + d8 + d6".
 * @param {number[]} faces
 * @returns {string}
 */
export function poolLabel(faces) {
  return faces.map(f => `d${f}`).join(" + ");
}

/* -------------------------------------------- */

/**
 * May this user see the initiative forecast of a combatant?
 * @param {"gm"|"owner"|"heroes"|"all"} mode   The world setting
 * @param {object} viewer
 * @param {boolean} viewer.isGM
 * @param {boolean} viewer.isOwner   The user owns the combatant's actor
 * @param {boolean} viewer.isHero    The combatant is a hero
 * @returns {boolean}
 */
export function canSeeForecast(mode, {isGM=false, isOwner=false, isHero=false}={}) {
  if ( isGM ) return true;
  switch ( mode ) {
    case "owner": return isOwner;
    case "heroes": return isOwner || isHero;
    case "all": return true;
    default: return false;
  }
}

/**
 * Format a signed number with a real minus sign.
 * @param {number} value
 * @returns {string}
 */
export function signed(value) {
  if ( value > 0 ) return `+${value}`;
  if ( value < 0 ) return `−${Math.abs(value)}`;
  return "±0";
}
