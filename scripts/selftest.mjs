/**
 * Self-test: checks the Crucible internals the module relies on. Meant to be run after every Crucible or Foundry
 * update; the GM also gets a notice once when a newer version than the verified one is installed.
 */

import {MODULE_ID, TESTED_VERSIONS} from "./config.mjs";
import {DICE, HEROISM_RATE} from "./rules.mjs";
import {forecast, heroismOf} from "./tracker.mjs";

/**
 * Check the system internals.
 * @returns {{problems: string[], checks: number}}
 */
function checkIntegrations() {
  const problems = [];
  let checks = 0;
  const check = (ok, key, data) => {
    checks++;
    if ( !ok ) problems.push(_loc(`SCCP.SELFTEST.${key}`, data));
  };

  check(game.system.id === "crucible", "NotCrucible");
  const model = CONFIG.Combat.dataModels?.combat;
  check(!!model?.schema?.getField?.("heroism.actions") && !!model.schema.getField("heroism.awarded"), "HeroismModel");
  check(typeof model?.prototype?._onStartRound === "function", "EscalationHook");
  check(typeof CONFIG.Combatant.documentClass?.prototype?.getInitiativeRoll === "function", "InitiativeRoll");

  const sys = globalThis.SYSTEM?.DICE ?? globalThis.crucible?.CONST?.DICE;
  const diceOk = !!sys && (sys.MAX_BOONS === DICE.maxBoons) && (sys.MAX_BANES === DICE.maxBanes)
    && (sys.DIE_STEP === DICE.step) && (sys.MIN_DIE === DICE.minDie) && (sys.MAX_DIE === DICE.maxDie);
  check(diceOk, "Dice");

  // The current combat, when there is one
  const combat = game.combat;
  if ( combat?.type === "combat" ) {
    const derived = combat.system?.heroism?.required;
    const heroes = combat.combatants.filter(c => c.actor?.type === "hero").length || 1;
    check(Number.isFinite(derived) && (derived === heroes * HEROISM_RATE), "HeroismRate",
      {derived: derived ?? "–", expected: heroes * HEROISM_RATE});
    check(!!heroismOf(combat), "HeroismState");
    const combatant = combat.combatants.find(c => c.actor);
    if ( combatant ) {
      const f = forecast(combatant);
      check(!!f && ((f.fixed !== null) || (f.faces.length === DICE.size)), "Forecast", {name: combatant.name});
    }
    if ( ui.combat?.rendered && (ui.combat.viewed === combat) ) {
      check(!!ui.combat.element.querySelector(".heroism-meter"), "Meter");
    }
  }
  return {problems, checks};
}

/* -------------------------------------------- */

/**
 * The installed versions next to the tested ones.
 * @returns {string}
 */
function versionLine() {
  const current = {crucible: game.system.version, core: game.version};
  return Object.entries(TESTED_VERSIONS)
    .map(([id, tested]) => _loc("SCCP.SELFTEST.Version", {id, current: current[id] ?? "–", tested}))
    .join(", ");
}

/* -------------------------------------------- */

/**
 * Run the self-test and report the result as a notification and a whispered chat message.
 * @param {object} [options]
 * @param {boolean} [options.report=true]   Post the chat report
 * @returns {Promise<{problems: string[], checks: number}>}
 */
export async function runSelfTest({report=true}={}) {
  const {problems, checks} = checkIntegrations();
  const versions = versionLine();
  const summary = problems.length
    ? _loc("SCCP.SELFTEST.Problems", {problems: problems.length, checks})
    : _loc("SCCP.SELFTEST.Passed", {checks});

  console.group(`${MODULE_ID} | Self-test`);
  console.log(versions);
  if ( problems.length ) console.warn("Problems:", problems);
  console.groupEnd();

  if ( problems.length ) ui.notifications.warn(summary, {permanent: true});
  else ui.notifications.info(summary);

  if ( report ) {
    const escape = foundry.utils.escapeHTML;
    let content = `<h3>${_loc("SCCP.SELFTEST.Title")}</h3><p>${escape(summary)}</p><p><small>${escape(versions)}</small></p>`;
    if ( problems.length ) content += `<ul>${problems.map(p => `<li>${escape(p)}</li>`).join("")}</ul>`;
    if ( !game.combat ) content += `<p><small>${_loc("SCCP.SELFTEST.NoCombat")}</small></p>`;
    const cls = foundry.documents.ChatMessage.implementation;
    await cls.create({content, whisper: [game.user.id], speaker: {alias: game.modules.get(MODULE_ID).title}});
  }
  return {problems, checks};
}

/* -------------------------------------------- */

/**
 * Tell the GM once when Crucible or Foundry is newer than the versions the module was verified against.
 */
export function noticeNewVersions() {
  if ( !game.user.isGM ) return;
  const current = {crucible: game.system.version, core: game.version};
  const newer = Object.entries(current)
    .filter(([id, version]) => version && foundry.utils.isNewerVersion(version, TESTED_VERSIONS[id]))
    .map(([id, version]) => `${id} ${version}`);
  if ( !newer.length ) return;
  const signature = newer.join(",");
  if ( game.settings.get(MODULE_ID, "acknowledgedVersions") === signature ) return;
  game.settings.set(MODULE_ID, "acknowledgedVersions", signature);
  ui.notifications.info(_loc("SCCP.SELFTEST.NewVersions", {versions: newer.join(", ")}), {permanent: true});
}
