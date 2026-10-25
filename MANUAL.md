# Sephral’s Crucible Combat Pulse: Manual

This manual covers the details. For a quick overview see the [README](README.md).

## In the combat tracker

Everything appears in the combat tracker, in the sidebar and in the popout, as soon as a fight is running.

* **Heroism in numbers:** under Crucible's Heroism meter a chip shows the AP on the meter and how many are still missing, for example *14 / 24 AP, 10 to go*. Every confirmed action that damages, heals or affects another creature adds its AP cost. Every 12 AP per hero, every combatant with a Heroism maximum gains 1 Heroism. Hover the chip for the rule and the total of the fight.
* **Heroism alert:** when the meter is full, the meter flashes and everyone gets a notification. Each user can keep only the flash or turn it off.
* **Escalation:** before round 7 a chip counts down to the Morale escalation. From round 7 on it shows the current amount and the next one. At the start of each round the first combatant in the turn order gains Morale equal to the round number, and the last one who is not incapacitated loses the same amount. A badge in their rows shows who gained and who lost, also after someone delays.
* **Initiative forecast:** Crucible rolls initiative again at the start of every round. A badge next to each combatant shows the boons and banes the next roll would have if the round ended now: unspent AP, slow weapons, bulky armor, Broken, the rank of elite and boss adversaries and talents. Crucible builds this roll itself, the module only reads it and never rolls it. Hover the badge for the dice pool, the average and the sources. Incapacitated and unaware combatants show their fixed initiative.
* **The gear** at the end of the chips opens the settings of the module.

The module never rolls dice and never changes an actor, a combat or a roll. It only shows what Crucible already knows.

## Settings

All options are in *Game Settings → Configure Settings → Sephral’s Crucible Combat Pulse*:

| Setting | What it does |
| --- | --- |
| Module language | Follow Foundry, German or English, for you |
| Show Heroism progress | The AP chip under Crucible's meter (for you) |
| Heroism alert | Flash and notification, only the flash, or nothing (for you) |
| Show escalation | The escalation chip and the badges (for you) |
| Show initiative forecast | The forecast badges (for you) |
| Who sees the forecast | Only the GM, owners of the character, everyone for heroes and the GM for adversaries, or everyone. The forecast shows unspent AP, so the GM decides (GM) |
| Self test | Checks the parts of Crucible the module relies on (GM) |

## Usage statistics

The module can take part in a small usage report shared by all of Sephral’s modules. Nothing is counted or sent until the GM agrees: shortly after the world starts, the active GM is asked, and the question comes back at every start until there is an answer. The answer counts for all of Sephral’s modules in the world. *Share usage statistics* in the module settings turns the report on or off at any time, and *Manage statistics* below it shows what the report contains right now.

With the GM’s consent only the active GM’s browser counts, and it sends at most one report a day. The question lists everything the report contains, from the Foundry version to a random world ID. For Combat Pulse it holds:

* on how many of the last 30 days the module was used
* how often a Heroism point is earned in a tracked combat, the Morale escalation is recorded and the settings gear in the tracker is used
* the settings *Who sees the forecast*, *Heroism alert* and *Show initiative forecast* (only the chosen option)
* where errors occur in the module code: file, line and error type, never the error message

No names, chat messages, notes, dice results or other content of the world are sent.

## Self test

Crucible is still in development and changes its internals between versions. After an update of Crucible or Foundry the GM gets a short notice. The self test in the settings checks the Heroism meter, the escalation, the initiative roll and the dice limits of Crucible and posts the result as a chat message only the GM sees. Run it with a combat running, then it also checks the current fight.

## API

`game.modules.get("sephrals-crucible-combat-pulse").api` offers:

| Function | What it does |
| --- | --- |
| `forecast(combatant)` | The initiative a combatant would roll if the round ended now |
| `heroism(combat)` | The Heroism meter of a combat, the current one by default |
| `escalation(combat)` | The escalation of the current round and who it hit |
| `rules` | The pure rule helpers for the Heroism meter and the escalation |
| `refresh()` | Redraws the module's parts of the combat tracker |
| `runSelfTest()` | Runs the self test (GM) |

## Limits

* The module works in Crucible worlds on Foundry 14 only. In other worlds it stays inert.
* The forecast shows the state of this moment. Actions taken before the round ends still change the next roll.
