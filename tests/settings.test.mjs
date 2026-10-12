import assert from "node:assert/strict";
import test from "node:test";

// settings.mjs and the modules it imports touch these Foundry APIs at import time
globalThis.foundry = {
  utils: {debounce: fn => fn, deepClone: value => structuredClone(value)},
  applications: {api: {ApplicationV2: class {}}}
};

const {MODULE_ID} = await import("../scripts/config.mjs");
const {FOLLOW_FOUNDRY, UI_LANGUAGES, applyModuleLanguage, forcedLanguage, mergeStrings} =
  await import("../scripts/language.mjs");
const {SETTINGS, registerSettings} = await import("../scripts/settings.mjs");

/**
 * Register the settings with a stub of game.settings which records every call.
 * @returns {{settings: Map<string, object>, menus: Map<string, object>}}
 */
function register() {
  const settings = new Map();
  const menus = new Map();
  globalThis.game = {settings: {
    register: (module, key, data) => settings.set(`${module}.${key}`, data),
    registerMenu: (module, key, data) => menus.set(`${module}.${key}`, data)
  }};
  registerSettings();
  delete globalThis.game;
  const strip = map => new Map([...map].map(([key, data]) => [key.replace(`${MODULE_ID}.`, ""), data]));
  assert.ok([...settings.keys(), ...menus.keys()].every(key => key.startsWith(`${MODULE_ID}.`)));
  return {settings: strip(settings), menus: strip(menus)};
}

test("the module language comes first and follows Foundry by default", () => {
  const {settings} = register();
  assert.equal([...settings.keys()][0], "uiLanguage");
  const uiLanguage = settings.get("uiLanguage");
  assert.equal(uiLanguage.scope, "client");
  assert.equal(uiLanguage.default, FOLLOW_FOUNDRY);
  assert.deepEqual(Object.keys(uiLanguage.choices), [FOLLOW_FOUNDRY, "de", "en"]);
  assert.deepEqual(UI_LANGUAGES, ["en", "de"]);
});

test("every setting is registered with its scope, default and choices", () => {
  const {settings} = register();
  const summary = Object.fromEntries([...settings].map(([key, data]) => [key,
    [data.scope, data.default, data.config, data.choices ? Object.keys(data.choices) : null]]));
  assert.deepEqual(summary, {
    uiLanguage: ["client", FOLLOW_FOUNDRY, true, [FOLLOW_FOUNDRY, "de", "en"]],
    heroismDetail: ["client", true, true, null],
    heroismAlert: ["client", "notify", true, ["notify", "flash", "off"]],
    escalation: ["client", true, true, null],
    forecast: ["client", true, true, null],
    forecastVisibility: ["world", "heroes", true, ["gm", "owner", "heroes", "all"]],
    acknowledgedVersions: ["client", "", false, null]
  });
  for ( const key of Object.keys(SETTINGS) ) {
    assert.equal(settings.get(key).name, `SCCP.SETTINGS.${key}.name`);
    assert.equal(settings.get(key).hint, `SCCP.SETTINGS.${key}.hint`);
  }
});

test("the self test is a GM menu backed by an application class", () => {
  const {menus} = register();
  assert.deepEqual([...menus.keys()], ["selfTest"]);
  const menu = menus.get("selfTest");
  assert.equal(menu.restricted, true);
  assert.ok(menu.type.prototype instanceof foundry.applications.api.ApplicationV2);
});

test("forcedLanguage only forces the shipped languages", () => {
  assert.equal(forcedLanguage("de"), "de");
  assert.equal(forcedLanguage("en"), "en");
  assert.equal(forcedLanguage(FOLLOW_FOUNDRY), null);
  assert.equal(forcedLanguage("fr"), null);
  assert.equal(forcedLanguage(undefined), null);
});

test("mergeStrings lays the forced file over Foundry's strings", () => {
  const loaded = {Heroism: {Title: "Heldenmut", Next: "Nächster"}, Only: "nur geladen"};
  const forced = {Heroism: {Title: "Heroism"}};
  assert.deepEqual(mergeStrings(loaded, forced), {Heroism: {Title: "Heroism", Next: "Nächster"}, Only: "nur geladen"});
  assert.deepEqual(loaded.Heroism, {Title: "Heldenmut", Next: "Nächster"}, "the loaded strings stay untouched");
  assert.deepEqual(mergeStrings(undefined, forced), forced);
});

test("applyModuleLanguage forces a language and restores Foundry's strings", async () => {
  globalThis.game = {i18n: {translations: {SCCP: {Heroism: {Title: "Heldenmut", Next: "Nächster"}}, CORE: {x: 1}}}};
  globalThis.fetch = async url => {
    assert.match(String(url), /lang\/en\.json$/);
    return {ok: true, json: async () => ({SCCP: {Heroism: {Title: "Heroism"}}})};
  };
  await applyModuleLanguage("en");
  assert.deepEqual(game.i18n.translations.SCCP, {Heroism: {Title: "Heroism", Next: "Nächster"}});
  assert.deepEqual(game.i18n.translations.CORE, {x: 1});

  await applyModuleLanguage(FOLLOW_FOUNDRY);
  assert.deepEqual(game.i18n.translations.SCCP, {Heroism: {Title: "Heldenmut", Next: "Nächster"}});
  delete globalThis.game;
  delete globalThis.fetch;
});
