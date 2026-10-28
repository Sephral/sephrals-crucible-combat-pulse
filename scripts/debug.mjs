/**
 * The part of Combat Pulse in the debug file of Sephral's modules: verified and installed versions and the current
 * combat with its Heroism meter, escalation and initiative forecast. The module reads no chat messages.
 */

import {MODULE_ID, TESTED_VERSIONS} from "./config.mjs";
import {registerDebugProvider} from "./debug-file.mjs";
import {escalationState} from "./rules.mjs";
import {escalationOf, forecast, heroismOf} from "./tracker.mjs";

/**
 * Run a check that may fail on an unusual combat and keep the error instead.
 * @param {Function} fn
 * @returns {*}
 */
function attempt(fn) {
  try {
    return fn();
  } catch(err) {
    return {error: String(err?.stack ?? err)};
  }
}

/**
 * The current combat in short: ids, round, the Heroism meter, the escalation and the forecast of every combatant.
 * @param {Combat|null} combat
 * @returns {object|null}
 */
export function describeCombat(combat) {
  if ( !combat ) return null;
  return {
    id: combat.id,
    started: !!combat.started,
    round: combat.round,
    turn: combat.turn,
    combatants: combat.combatants.size,
    heroes: combat.combatants.filter(c => c.actor?.type === "hero").length,
    heroism: attempt(() => heroismOf(combat)),
    escalation: attempt(() => ({...escalationState(combat.round), record: escalationOf(combat)})),
    forecast: combat.combatants.map(c => {
      const entry = attempt(() => forecast(c));
      return {id: c.id, actorType: c.actor?.type ?? null, fixed: entry?.fixed ?? null, reason: entry?.reason ?? null,
        flat: entry?.flat ?? null, average: entry?.average ?? null, boons: entry?.boons?.total ?? null,
        banes: entry?.banes?.total ?? null, error: entry?.error ?? null};
    })
  };
}

/**
 * The state of the module in short.
 * @returns {object}
 */
export function describeState() {
  return {
    tested: TESTED_VERSIONS,
    installed: {crucible: game.system.version, core: game.version},
    combats: game.combats?.size ?? 0,
    combat: describeCombat(game.combat ?? null)
  };
}

/**
 * Register the module's part. Call in "init".
 */
export function registerDebug() {
  registerDebugProvider({
    moduleId: MODULE_ID,
    label: () => _loc("SCCP.DEBUG.Entry"),
    notice: file => _loc("SCCP.DEBUG.Saved", {file}),
    recent: () => ({details: describeState()})
  });
}
