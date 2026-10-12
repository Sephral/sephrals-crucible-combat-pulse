import assert from "node:assert/strict";
import test from "node:test";
import {
  averageRoll, canSeeForecast, countSources, dicePool, escalationState, escalationTargets, heroismState, poolLabel,
  signed
} from "../scripts/rules.mjs";

test("Heroism meter uses the system's AP per point when given", () => {
  const h = heroismState({actions: 30, required: 24}, 4);
  assert.equal(h.required, 24);
  assert.equal(h.earned, 1);
  assert.equal(h.previous, 24);
  assert.equal(h.next, 48);
  assert.equal(h.progress, 6);
  assert.equal(h.remaining, 18);
  assert.equal(h.pct, 0.25);
});

test("Heroism meter falls back to 12 AP per hero", () => {
  assert.equal(heroismState({actions: 0}, 3).required, 36);
  assert.equal(heroismState({actions: 0}, 0).required, 12);
  const h = heroismState({actions: 35}, 3);
  assert.equal(h.earned, 0);
  assert.equal(h.remaining, 1);
});

test("escalation starts in round 7", () => {
  assert.equal(escalationState(0), null);
  assert.deepEqual(escalationState(4), {active: false, round: 4, amount: null, nextAmount: 7, roundsLeft: 3});
  assert.deepEqual(escalationState(6), {active: false, round: 6, amount: null, nextAmount: 7, roundsLeft: 1});
  assert.deepEqual(escalationState(7), {active: true, round: 7, amount: 7, nextAmount: 8, roundsLeft: null});
});

test("escalation hits the first and the last combatant who can act", () => {
  const turns = [{id: "a"}, {id: "b"}, {id: "c", down: true}];
  const targets = escalationTargets(turns, t => !!t.down);
  assert.equal(targets.first.id, "a");
  assert.equal(targets.last.id, "b");
});

test("escalation search stops before the first turn, like the system", () => {
  const turns = [{id: "a"}, {id: "b", down: true}];
  assert.deepEqual(escalationTargets(turns, t => !!t.down), {first: turns[0], last: null});
  assert.equal(escalationTargets([{id: "a"}], () => false), null);
});

test("boons count per source and are capped at 6", () => {
  const result = countSources({action: {label: "Reserved Action", number: 5}, rank: {label: "Boss", number: 4},
    other: {label: "Talent"}});
  assert.equal(result.total, 6);
  assert.deepEqual(result.sources.map(s => [s.id, s.number]), [["action", 5], ["rank", 1]]);
  assert.deepEqual(result.capped.map(s => s.id), ["other"]);
  // The system caps the numbers itself: a source beyond the cap arrives with 0
  const system = countSources({action: {label: "Reserved Action", number: 6}, rank: {label: "Elite", number: 0}});
  assert.equal(system.total, 6);
  assert.deepEqual(system.capped, [{id: "rank", label: "Elite"}]);
  assert.equal(countSources({}).total, 0);
  assert.equal(countSources({x: {label: "One"}}).total, 1);
});

test("dice pool grows from the left and shrinks from the right", () => {
  assert.deepEqual(dicePool(0, 0), [8, 8, 8]);
  assert.deepEqual(dicePool(1, 0), [10, 8, 8]);
  assert.deepEqual(dicePool(3, 0), [12, 10, 8]);
  assert.deepEqual(dicePool(6, 0), [12, 12, 12]);
  assert.deepEqual(dicePool(0, 2), [8, 8, 4]);
  assert.deepEqual(dicePool(0, 3), [8, 6, 4]);
  assert.deepEqual(dicePool(2, 1), [12, 8, 6]);
  assert.deepEqual(dicePool(9, 9), [12, 8, 4]);
});

test("average roll and labels", () => {
  assert.equal(averageRoll([8, 8, 8], 3), 16.5);
  assert.equal(averageRoll([12, 10, 8]), 16.5);
  assert.equal(poolLabel([12, 8, 6]), "d12 + d8 + d6");
  assert.equal(signed(3), "+3");
  assert.equal(signed(-2), "−2");
  assert.equal(signed(0), "±0");
});

test("forecast visibility", () => {
  assert.equal(canSeeForecast("gm", {isGM: true}), true);
  assert.equal(canSeeForecast("gm", {isOwner: true}), false);
  assert.equal(canSeeForecast("owner", {isOwner: true}), true);
  assert.equal(canSeeForecast("owner", {isHero: true}), false);
  assert.equal(canSeeForecast("heroes", {isHero: true}), true);
  assert.equal(canSeeForecast("heroes", {}), false);
  assert.equal(canSeeForecast("all", {}), true);
});
