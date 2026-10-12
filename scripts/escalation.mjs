/**
 * Morale escalation: from round 7 on, Crucible gives the first combatant in the turn order Morale equal to the round
 * and takes the same amount from the last one who is not incapacitated. The system does not record who it hit, and a
 * Delay changes the turn order later in the round. So the active GM stores the two combatants on the combat right
 * after the round started, picked exactly like the system picks them.
 */

import {MODULE_ID, isCrucible} from "./config.mjs";
import {escalationState, escalationTargets} from "./rules.mjs";

/**
 * Hook "updateCombat": record the escalation of a new round.
 * @param {Combat} combat
 * @param {object} changes
 */
export function onUpdateCombat(combat, changes) {
  if ( !isCrucible() || !("round" in changes) || !game.user.isActiveGM ) return;
  if ( combat.type !== "combat" ) return;
  const state = escalationState(combat.round);
  if ( !state?.active ) return;
  const targets = escalationTargets(combat.turns, turn => turn.actor?.isIncapacitated === true);
  if ( !targets ) return;
  const record = {round: combat.round, first: targets.first?.id ?? null, last: targets.last?.id ?? null};
  const current = combat.getFlag(MODULE_ID, "escalation");
  if ( foundry.utils.equals(current ?? {}, record) ) return;
  combat.setFlag(MODULE_ID, "escalation", record).catch(err => {
    console.warn(`${MODULE_ID} | Could not record the escalation of round ${record.round}`, err);
  });
}
