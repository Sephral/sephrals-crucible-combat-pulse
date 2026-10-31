import {MODULE_ID, TESTED_VERSIONS, isCrucible} from "./config.mjs";
import {registerDebug} from "./debug.mjs";
import {saveDebugFile} from "./debug-file.mjs";
import {registerHubModule} from "./hub.mjs";
import {onUpdateCombat as recordEscalation} from "./escalation.mjs";
import {onDeleteCombat, onUpdateCombat as watchHeroism, trackAllCombats, trackHeroism} from "./heroism.mjs";
import {applyModuleLanguage} from "./language.mjs";
import {escalationState, heroismState} from "./rules.mjs";
import {noticeNewVersions, runSelfTest} from "./selftest.mjs";
import {registerSettings} from "./settings.mjs";
import {
  escalationOf, forecast, heroismOf, onRenderCombatTracker, refreshTrackers, scheduleTurnRefresh
} from "./tracker.mjs";
import {registerUsage} from "./usage.mjs";

Hooks.once("init", () => {
  if ( !isCrucible() ) return;
  registerHubModule({moduleId: MODULE_ID, tested: TESTED_VERSIONS});
  registerSettings();
  registerDebug();
  registerUsage(MODULE_ID, {
    features: ["heroismPoint", "escalationRecorded", "settingsGear"],
    settings: ["forecastVisibility", "heroismAlert", "forecast"]
  });

  Hooks.on("renderCombatTracker", onRenderCombatTracker);
  Hooks.on("updateCombat", recordEscalation);
  Hooks.on("updateCombat", watchHeroism);
  Hooks.on("createCombat", trackHeroism);
  Hooks.on("deleteCombat", onDeleteCombat);
  Hooks.on("createCombatant", combatant => trackHeroism(combatant.parent));
  Hooks.on("deleteCombatant", combatant => trackHeroism(combatant.parent));

  // The initiative forecast follows AP, statuses and equipment of the combatants
  Hooks.on("updateActor", onActorChange);
  for ( const event of ["create", "update", "delete"] ) {
    Hooks.on(`${event}ActiveEffect`, effect => onActorChange(effect.parent));
    Hooks.on(`${event}Item`, item => onActorChange(item.parent));
  }

  game.modules.get(MODULE_ID).api = {
    /** The initiative a combatant would roll if the round ended now. */
    forecast,
    /** The Heroism meter of a combat. */
    heroism: combat => heroismOf(combat ?? game.combat),
    /** The escalation of a round, and who it hit in the current round of a combat. */
    escalation: combat => {
      combat ??= game.combat;
      return combat ? {...escalationState(combat.round), record: escalationOf(combat)} : null;
    },
    /** Pure rule helpers. */
    rules: {heroismState, escalationState},
    /** Redraw the module's parts of the combat tracker. */
    refresh: refreshTrackers,
    /** Check the Crucible integration (GM). */
    runSelfTest,
    /** Save the debug file of Sephral's modules (GM): about one chat message, or without an id the latest picture. */
    saveDebugFile: messageId => saveDebugFile(messageId ?? null, {moduleId: MODULE_ID})
  };
});

/** Applying a fixed module language loads its file; the version notice waits for it. */
let languageReady = Promise.resolve();

Hooks.once("i18nInit", () => {
  if ( !isCrucible() ) return;
  languageReady = applyModuleLanguage(game.settings.get(MODULE_ID, "uiLanguage"));
});

Hooks.once("ready", async () => {
  if ( !isCrucible() ) return;
  await languageReady;
  trackAllCombats();
  refreshTrackers();
  noticeNewVersions();
});

/* -------------------------------------------- */

/**
 * Redraw the forecast badges when an actor in the viewed combat changes.
 * @param {Actor|null} actor
 */
function onActorChange(actor) {
  if ( !(actor instanceof Actor) ) return;
  const combat = ui.combat?.viewed;
  if ( !combat?.combatants.some(c => c.actor === actor) ) return;
  scheduleTurnRefresh();
}
