/**
 * Heroism alert: when the meter of a combat reaches its next threshold, Crucible gives every combatant with a Heroism
 * maximum one point, quietly. Every client watches the meter and lets it flash, optionally with a notification.
 */

import {isCrucible, setting} from "./config.mjs";
import {flashHeroism, heroismOf, isPulseCombat} from "./tracker.mjs";

/** The number of Heroism points each combat has generated so far, by combat id. */
const earned = new Map();

/**
 * Remember the current state of a combat.
 * @param {Combat} combat
 */
export function trackHeroism(combat) {
  if ( !isPulseCombat(combat) ) return;
  earned.set(combat.id, heroismOf(combat)?.earned ?? 0);
}

/**
 * Remember the state of every combat of the world.
 */
export function trackAllCombats() {
  if ( !isCrucible() ) return;
  for ( const combat of game.combats ) trackHeroism(combat);
}

/**
 * Hook "updateCombat": announce a new Heroism point.
 * @param {Combat} combat
 * @param {object} changes
 */
export function onUpdateCombat(combat, changes) {
  if ( !isCrucible() || !isPulseCombat(combat) ) return;
  const previous = earned.get(combat.id);
  trackHeroism(combat);
  const heroism = changes.system?.heroism;
  if ( !heroism || !("awarded" in heroism) || (previous === undefined) ) return;
  const now = earned.get(combat.id);
  if ( now <= previous ) return;
  const mode = setting("heroismAlert");
  if ( mode === "off" ) return;
  flashHeroism();
  if ( mode === "notify" ) ui.notifications.info(_loc("SCCP.Heroism.Gained"));
}

/**
 * Hook "deleteCombat": forget a combat.
 * @param {Combat} combat
 */
export function onDeleteCombat(combat) {
  earned.delete(combat.id);
}
