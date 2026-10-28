/**
 * Settings of the module. Like in every Sephral module, all options appear in Foundry's settings dialog under this
 * module, starting with the module language. World settings apply to everyone and are only shown to the GM; client
 * settings follow the user.
 */

import {MODULE_ID} from "./config.mjs";
import {registerDebugMenu} from "./debug-file.mjs";
import {FOLLOW_FOUNDRY, applyModuleLanguage} from "./language.mjs";
import {runSelfTest} from "./selftest.mjs";
import {refreshTrackers} from "./tracker.mjs";

/**
 * @typedef SettingDefinition
 * @property {Function} type                  Boolean, String or Number
 * @property {*} default
 * @property {Record<string, string>} [choices]
 * @property {"world"|"user"|"client"} [scope="world"]
 * @property {Function} [onChange]
 */

/** Redraw the trackers after a display setting changed. */
const redraw = () => refreshTrackers();

/**
 * The settings of the module, in the order they appear in the settings dialog.
 * @type {Record<string, SettingDefinition>}
 */
export const SETTINGS = {
  uiLanguage: {type: String, default: FOLLOW_FOUNDRY, scope: "client", onChange: onLanguageChange, choices: {
    [FOLLOW_FOUNDRY]: "SCCP.LANGUAGE.default", de: "SCCP.LANGUAGE.de", en: "SCCP.LANGUAGE.en"}},
  heroismDetail: {type: Boolean, default: true, scope: "client", onChange: redraw},
  heroismAlert: {type: String, default: "notify", scope: "client", choices: {
    notify: "SCCP.SETTINGS.heroismAlert.notify", flash: "SCCP.SETTINGS.heroismAlert.flash",
    off: "SCCP.SETTINGS.heroismAlert.off"}},
  escalation: {type: Boolean, default: true, scope: "client", onChange: redraw},
  forecast: {type: Boolean, default: true, scope: "client", onChange: redraw},
  forecastVisibility: {type: String, default: "heroes", onChange: redraw, choices: {
    gm: "SCCP.SETTINGS.forecastVisibility.gm", owner: "SCCP.SETTINGS.forecastVisibility.owner",
    heroes: "SCCP.SETTINGS.forecastVisibility.heroes", all: "SCCP.SETTINGS.forecastVisibility.all"}}
};

/* -------------------------------------------- */

/**
 * Switch the module strings when the user picks another module language, and redraw what shows them.
 * @param {string} value
 */
function onLanguageChange(value) {
  applyModuleLanguage(value).then(() => {
    refreshTrackers();
    if ( game.settings.sheet?.rendered ) game.settings.sheet.render();
  });
}

/* -------------------------------------------- */

/**
 * The menu button which runs the self-test. Foundry only accepts application classes as menus; this one runs the test
 * instead of opening a window.
 */
class PulseSelfTestMenu extends foundry.applications.api.ApplicationV2 {
  /** @override */
  async render() {
    if ( game.user.isGM ) await runSelfTest();
    return this;
  }
}

/* -------------------------------------------- */

/**
 * Register all settings of the module and the menu buttons for the self-test and the debug file.
 */
export function registerSettings() {
  for ( const [key, def] of Object.entries(SETTINGS) ) {
    game.settings.register(MODULE_ID, key, {
      name: `SCCP.SETTINGS.${key}.name`,
      hint: `SCCP.SETTINGS.${key}.hint`,
      scope: def.scope ?? "world",
      config: true,
      type: def.type,
      choices: def.choices,
      default: def.default,
      onChange: def.onChange
    });
  }

  // The newer Crucible and Foundry versions the GM was already told about
  game.settings.register(MODULE_ID, "acknowledgedVersions", {scope: "client", config: false, type: String, default: ""});

  game.settings.registerMenu(MODULE_ID, "selfTest", {
    name: "SCCP.SELFTEST.Title",
    label: "SCCP.SELFTEST.Run",
    hint: "SCCP.SELFTEST.Hint",
    icon: "fa-solid fa-stethoscope",
    type: PulseSelfTestMenu,
    restricted: true
  });

  // The button saves the debug file of Sephral's modules instead of opening a window
  registerDebugMenu(MODULE_ID, {name: "SCCP.DEBUG.Title", label: "SCCP.DEBUG.Save", hint: "SCCP.DEBUG.Hint"});
}
