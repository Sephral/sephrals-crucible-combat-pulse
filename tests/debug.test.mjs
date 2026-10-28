import assert from "node:assert/strict";
import test from "node:test";

// tracker.mjs and the modules it imports touch these Foundry APIs at import time
globalThis.foundry = {
  utils: {debounce: fn => fn, deepClone: value => structuredClone(value), escapeHTML: value => value},
  applications: {api: {ApplicationV2: class {}}}
};
globalThis._loc = (key, data) => (data ? `${key} ${data.file}` : key);

const {MODULE_ID} = await import("../scripts/config.mjs");
const {describeCombat, registerDebug} = await import("../scripts/debug.mjs");

/** A combat in round 8 with a hero and an adversary. */
function fakeCombat() {
  const combatants = [{id: "c1", actor: {type: "hero"}}, {id: "c2", actor: {type: "adversary"}}];
  return {
    id: "fight",
    started: true,
    round: 8,
    turn: 1,
    system: {heroism: {actions: 5}},
    combatants: Object.assign(combatants, {size: combatants.length}),
    getFlag: () => ({round: 8, first: "c1", last: "c2"})
  };
}

test("the debug file part names the combat, its Heroism, escalation and forecast", () => {
  const state = describeCombat(fakeCombat());
  assert.equal(state.id, "fight");
  assert.equal(state.round, 8);
  assert.equal(state.combatants, 2);
  assert.equal(state.heroes, 1);
  assert.equal(state.heroism.actions, 5);
  assert.deepEqual(state.escalation.record, {round: 8, first: "c1", last: "c2", amount: 8});
  assert.deepEqual(state.forecast.map(entry => [entry.id, entry.actorType, entry.fixed]), [["c1", "hero", null], ["c2", "adversary", null]]);
  assert.equal(describeCombat(null), null);
});

test("the module registers its part of the shared debug file", () => {
  globalThis.game = {system: {version: "0.11.2"}, version: "14.369", combats: new Map(), combat: null};
  registerDebug();
  const provider = globalThis.sephralsDebugFiles.providers.get(MODULE_ID);
  assert.equal(provider.label(), "SCCP.DEBUG.Entry");
  assert.equal(provider.notice("x.json"), "SCCP.DEBUG.Saved x.json");
  assert.deepEqual(provider.recent().details.installed, {crucible: "0.11.2", core: "14.369"});
  assert.equal(provider.message, undefined, "the module reads no chat messages");
  delete globalThis.game;
});
