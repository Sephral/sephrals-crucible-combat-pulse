/**
 * The additions to the combat tracker: a pulse strip under Crucible's Heroism meter (exact Heroism progress and the
 * Morale escalation) and badges in the combatant rows (escalation of this round and the initiative forecast).
 * Everything is added to the rendered tracker, so a refresh never re-renders Foundry's application.
 */

import {MODULE_ID, isCrucible, setting} from "./config.mjs";
import {
  DICE, averageRoll, canSeeForecast, countSources, dicePool, escalationState, heroismState, poolLabel, signed
} from "./rules.mjs";

/** Ids of boon and bane sources the system adds to initiative rolls, localized by the module. */
const KNOWN_SOURCES = ["action", "slow", "broken", "bulky", "rank"];

/**
 * Escape a value for HTML.
 * @param {*} value
 * @returns {string}
 */
const escape = value => foundry.utils.escapeHTML(String(value ?? ""));

/* -------------------------------------------- */

/**
 * Does the module show anything for this combat? Crucible's social and exploration challenges have no Heroism meter.
 * @param {Combat|null} combat
 * @returns {boolean}
 */
export function isPulseCombat(combat) {
  return !!combat && (combat.type === "combat") && !!combat.system?.heroism;
}

/**
 * The Heroism meter of a combat.
 * @param {Combat} combat
 * @returns {import("./rules.mjs").HeroismState|null}
 */
export function heroismOf(combat) {
  const heroism = combat?.system?.heroism;
  if ( !heroism ) return null;
  const heroes = combat.combatants.filter(c => c.actor?.type === "hero").length;
  return heroismState(heroism, heroes);
}

/**
 * The escalation recorded for the current round of a combat, see escalation.mjs.
 * @param {Combat} combat
 * @returns {{round: number, first: string|null, last: string|null, amount: number}|null}
 */
export function escalationOf(combat) {
  const state = escalationState(combat?.round);
  if ( !state?.active ) return null;
  const record = combat.getFlag(MODULE_ID, "escalation");
  if ( record?.round !== combat.round ) return null;
  return {round: record.round, first: record.first ?? null, last: record.last ?? null, amount: state.amount};
}

/* -------------------------------------------- */

/**
 * @typedef InitiativeForecast
 * @property {number|null} fixed     A fixed initiative (0 when incapacitated, 1 when unaware)
 * @property {string} [reason]       Why the initiative is fixed
 * @property {{total: number, sources: object[]}} boons
 * @property {{total: number, sources: object[]}} banes
 * @property {number[]} faces        The dice of the roll
 * @property {number} flat           Ability, skill and enchantment bonus
 * @property {number} average        The average result
 */

/**
 * Forecast the initiative roll a combatant would make if the round ended now. Crucible re-rolls every initiative at
 * the start of a round and builds the roll from the current state: unspent AP give boons, slow weapons, bulky armor
 * and Broken give banes, elite and boss adversaries get boons, talents may add more. The roll is built by the system
 * itself and never evaluated.
 * @param {Combatant} combatant
 * @returns {InitiativeForecast|null}
 */
export function forecast(combatant) {
  if ( !combatant?.actor || (typeof combatant.getInitiativeRoll !== "function") ) return null;
  let roll;
  try {
    roll = combatant.getInitiativeRoll();
  } catch(err) {
    console.warn(`${MODULE_ID} | Could not build the initiative roll of ${combatant.name}`, err);
    return null;
  }
  const data = roll?.data ?? {};
  const empty = {total: 0, sources: [], capped: []};
  if ( data.incapacitated ) return {fixed: 0, reason: "incapacitated", boons: empty, banes: empty, faces: [], flat: 0,
    average: 0};
  if ( data.unaware ) return {fixed: 1, reason: "unaware", boons: empty, banes: empty, faces: [], flat: 0, average: 1};
  const boons = countSources(data.boons, DICE.maxBoons);
  const banes = countSources(data.banes, DICE.maxBanes);
  const rolled = (roll.dice ?? []).flatMap(d => Array(Math.max(d.number ?? 1, 0)).fill(d.faces));
  const faces = rolled.length ? rolled : dicePool(boons.total, banes.total);
  const flat = (Number(data.ability) || 0) + (Number(data.skill) || 0) + (Number(data.enchantment) || 0);
  return {fixed: null, boons, banes, faces, flat, average: averageRoll(faces, flat)};
}

/* -------------------------------------------- */
/*  HTML                                        */
/* -------------------------------------------- */

/**
 * The Heroism chip of the pulse strip.
 * @param {Combat} combat
 * @returns {string}
 */
function heroismChip(combat) {
  const h = heroismOf(combat);
  if ( !h ) return "";
  const heroes = combat.combatants.filter(c => c.actor?.type === "hero").length || 1;
  const tooltip = [
    `<strong>${_loc("SCCP.Heroism.Title")}</strong>`,
    _loc("SCCP.Heroism.Rule", {required: h.required, heroes}),
    _loc("SCCP.Heroism.Total", {actions: h.actions, earned: h.earned})
  ].map(line => `<p>${line}</p>`).join("");
  return `<div class="sccp-chip sccp-heroism" data-tooltip-html="${escape(tooltip)}" data-tooltip-direction="LEFT">
    <i class="fa-solid fa-star" inert></i>
    <span class="sccp-value">${_loc("SCCP.Heroism.Progress", {progress: h.progress, required: h.required})}</span>
    <span class="sccp-muted">${_loc("SCCP.Heroism.Remaining", {remaining: h.remaining})}</span>
  </div>`;
}

/**
 * The escalation chip of the pulse strip.
 * @param {Combat} combat
 * @returns {string}
 */
function escalationChip(combat) {
  const state = escalationState(combat.round);
  if ( !state ) return "";
  const lines = [`<strong>${_loc("SCCP.Escalation.Title")}</strong>`, _loc("SCCP.Escalation.Rule")];
  let value;
  let muted;
  if ( state.active ) {
    value = _loc("SCCP.Escalation.Active", {amount: state.amount});
    muted = _loc("SCCP.Escalation.Next", {amount: state.nextAmount});
    const record = escalationOf(combat);
    const name = id => {
      const c = id ? combat.combatants.get(id) : null;
      if ( !c || (c.hidden && !game.user.isGM) ) return null;
      return escape(c.name);
    };
    const first = name(record?.first);
    const last = name(record?.last);
    if ( first ) lines.push(_loc("SCCP.Escalation.First", {name: first, amount: state.amount}));
    if ( last ) lines.push(_loc("SCCP.Escalation.Last", {name: last, amount: state.amount}));
  }
  else {
    value = _loc("SCCP.Escalation.Upcoming", {round: state.round + state.roundsLeft});
    muted = _loc("SCCP.Escalation.RoundsLeft", {rounds: state.roundsLeft});
  }
  const tooltip = lines.map(line => `<p>${line}</p>`).join("");
  return `<div class="sccp-chip sccp-escalation ${state.active ? "active" : ""}" data-tooltip-html="${escape(tooltip)}"
    data-tooltip-direction="LEFT">
    <i class="fa-solid fa-fire" inert></i>
    <span class="sccp-value">${value}</span>
    <span class="sccp-muted">${muted}</span>
  </div>`;
}

/**
 * A localized label for a boon or bane source.
 * @param {{id: string, label: string}} source
 * @returns {string}
 */
function sourceLabel(source) {
  if ( KNOWN_SOURCES.includes(source.id) ) return _loc(`SCCP.Forecast.Sources.${source.id}`, {label: source.label});
  return source.label;
}

/**
 * The initiative forecast badge of a combatant.
 * @param {InitiativeForecast} f
 * @returns {string}
 */
function forecastBadge(f) {
  const lines = [`<strong>${_loc("SCCP.Forecast.Title")}</strong>`, _loc("SCCP.Forecast.Hint")];
  let text;
  if ( f.fixed !== null ) {
    text = `<span class="sccp-fixed">= ${f.fixed}</span>`;
    lines.push(_loc(`SCCP.Forecast.Fixed.${f.reason}`, {value: f.fixed}));
  }
  else {
    const parts = [];
    if ( f.boons.total ) parts.push(`<span class="sccp-boons">▲${f.boons.total}</span>`);
    if ( f.banes.total ) parts.push(`<span class="sccp-banes">▼${f.banes.total}</span>`);
    text = parts.length ? parts.join("") : `<span class="sccp-even">${signed(0)}</span>`;
    const pool = `${poolLabel(f.faces)} ${f.flat < 0 ? "−" : "+"} ${Math.abs(f.flat)}`;
    lines.push(_loc("SCCP.Forecast.Roll", {pool: escape(pool), average: Math.round(f.average)}));
    const list = (label, sources) => {
      if ( !sources.length ) return;
      const items = sources.map(s => `${escape(sourceLabel(s))} ${s.number}`).join(", ");
      lines.push(`${label}: ${items}`);
    };
    list(_loc("SCCP.Forecast.Boons"), f.boons.sources);
    list(_loc("SCCP.Forecast.Banes"), f.banes.sources);
    const capped = [...f.boons.capped, ...f.banes.capped];
    if ( capped.length ) lines.push(_loc("SCCP.Forecast.Capped", {max: DICE.maxBoons,
      sources: capped.map(s => escape(sourceLabel(s))).join(", ")}));
  }
  const tooltip = lines.map(line => `<p>${line}</p>`).join("");
  return `<span class="sccp-badge sccp-forecast" data-tooltip-html="${escape(tooltip)}"
    aria-label="${escape(_loc("SCCP.Forecast.Title"))}">${text}</span>`;
}

/**
 * The escalation badge of the first or last combatant.
 * @param {number} amount   Positive for the first, negative for the last combatant
 * @returns {string}
 */
function escalationBadge(amount) {
  const tooltip = _loc(amount > 0 ? "SCCP.Escalation.BadgeGain" : "SCCP.Escalation.BadgeLoss",
    {amount: Math.abs(amount)});
  return `<span class="sccp-badge sccp-escalation-badge ${amount > 0 ? "gain" : "loss"}"
    data-tooltip-html="${escape(tooltip)}"><i class="fa-solid fa-fire" inert></i>${signed(amount)}</span>`;
}

/* -------------------------------------------- */
/*  Rendering                                   */
/* -------------------------------------------- */

/**
 * Add the pulse strip to the header of a tracker.
 * @param {HTMLElement} root
 * @param {Combat|null} combat
 */
function renderHeader(root, combat) {
  for ( const old of root.querySelectorAll(".sccp-pulse") ) old.remove();
  if ( !isPulseCombat(combat) ) return;
  const header = root.querySelector(".combat-tracker-header");
  if ( !header ) return;
  const chips = [];
  if ( setting("heroismDetail") ) chips.push(heroismChip(combat));
  if ( setting("escalation") ) chips.push(escalationChip(combat));
  const html = chips.filter(Boolean).join("");
  if ( !html ) return;
  const strip = document.createElement("div");
  strip.className = "sccp-pulse";
  strip.innerHTML = html;
  // Right under Crucible's Heroism meter, which the system adds to the header on every render
  const meter = header.querySelector(".heroism-meter");
  if ( meter ) meter.after(strip);
  else header.append(strip);
  if ( Date.now() < flashUntil ) applyFlash(root);
}

/**
 * Add the badges to the combatant rows of a tracker.
 * @param {HTMLElement} root
 * @param {Combat|null} combat
 */
function renderTurns(root, combat) {
  for ( const old of root.querySelectorAll(".sccp-turn") ) old.remove();
  if ( !isPulseCombat(combat) ) return;
  const showForecast = setting("forecast");
  const mode = setting("forecastVisibility");
  const escalation = setting("escalation") ? escalationOf(combat) : null;
  for ( const li of root.querySelectorAll("li.combatant[data-combatant-id]") ) {
    const combatant = combat.combatants.get(li.dataset.combatantId);
    if ( !combatant ) continue;
    const badges = [];
    if ( escalation && (combatant.id === escalation.first) ) badges.push(escalationBadge(escalation.amount));
    else if ( escalation && (combatant.id === escalation.last) ) badges.push(escalationBadge(-escalation.amount));
    const visible = canSeeForecast(mode, {isGM: game.user.isGM, isOwner: combatant.isOwner,
      isHero: combatant.actor?.type === "hero"});
    if ( showForecast && visible ) {
      const f = forecast(combatant);
      if ( f ) badges.push(forecastBadge(f));
    }
    if ( !badges.length ) continue;
    const div = document.createElement("div");
    div.className = "sccp-turn";
    div.innerHTML = badges.join("");
    const initiative = li.querySelector(".token-initiative");
    if ( initiative ) initiative.before(div);
    else li.append(div);
  }
}

/**
 * The rendered combat trackers: the sidebar tab and its popout.
 * @returns {CombatTracker[]}
 */
function trackers() {
  const apps = [ui.combat, ui.combat?.popout];
  return apps.filter(app => app?.rendered && app.element);
}

/**
 * Hook: add the module's parts when a combat tracker renders.
 * @param {CombatTracker} app
 */
export function onRenderCombatTracker(app) {
  if ( !isCrucible() || !app?.element ) return;
  const combat = app.viewed ?? null;
  renderHeader(app.element, combat);
  renderTurns(app.element, combat);
}

/**
 * Redraw the module's parts in every rendered tracker without rendering Foundry's application.
 * @param {object} [options]
 * @param {boolean} [options.header=true]
 * @param {boolean} [options.turns=true]
 */
export function refreshTrackers({header=true, turns=true}={}) {
  if ( !isCrucible() ) return;
  for ( const app of trackers() ) {
    const combat = app.viewed ?? null;
    if ( header ) renderHeader(app.element, combat);
    if ( turns ) renderTurns(app.element, combat);
  }
}

/**
 * Redraw the badges soon; several actor and effect updates of one action collapse into one redraw.
 */
export const scheduleTurnRefresh = foundry.utils.debounce(() => refreshTrackers({header: false}), 100);

/** Until when the Heroism meter flashes; a tracker rendered in the meantime flashes as well. */
let flashUntil = 0;

/**
 * Add the flash animation to the Heroism meter and the module's chip of a tracker.
 * @param {HTMLElement} root
 */
function applyFlash(root) {
  for ( const el of root.querySelectorAll(".heroism-meter, .sccp-heroism") ) {
    el.classList.remove("sccp-flash");
    void el.offsetWidth; // Restart the animation
    el.classList.add("sccp-flash");
  }
}

/**
 * Let the Heroism meter and the module's chip flash. The combat update which awarded the point also renders the
 * tracker again, so the flash is kept for a moment and applied to the new elements as well.
 */
export function flashHeroism() {
  flashUntil = Date.now() + 1800;
  for ( const app of trackers() ) applyFlash(app.element);
  setTimeout(() => {
    for ( const el of document.querySelectorAll(".sccp-flash") ) el.classList.remove("sccp-flash");
  }, 2000);
}
