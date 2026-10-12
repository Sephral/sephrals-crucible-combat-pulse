/**
 * Constants and small helpers shared by the scripts of the module.
 */

/** The id of this module. */
export const MODULE_ID = "sephrals-crucible-combat-pulse";

/** The versions of Crucible and Foundry the module was verified against (see the self-test). */
export const TESTED_VERSIONS = {crucible: "0.11.1", core: "14.369"};

/**
 * Is this a Crucible world? Every hook of the module returns early when it is not.
 * @returns {boolean}
 */
export function isCrucible() {
  return game.system?.id === "crucible";
}

/**
 * Read a setting of this module.
 * @param {string} key
 * @returns {*}
 */
export function setting(key) {
  return game.settings.get(MODULE_ID, key);
}
