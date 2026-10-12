# Sephral’s Crucible Combat Pulse

Crucible fights have a pulse that nobody at the table sees: the Heroism meter fills with every confirmed action, the Morale escalation kicks in from round 7, and every unspent AP turns into a boon on the next initiative roll. Sephral’s Crucible Combat Pulse puts all of this into the combat tracker, so players can plan around it and the GM no longer has to count.

## Discord

[![Join Discord](https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?logo=discord&logoColor=white)](https://discord.gg/7BjCgDYaBP)

Questions, feedback, and module support are welcome on [Discord](https://discord.gg/7BjCgDYaBP).

## More modules

[![More modules by Sephral](https://img.shields.io/badge/GitHub-More%20modules%20by%20Sephral-181717?logo=github&logoColor=white)](https://github.com/Sephral)

More modules by Sephral for Foundry VTT are listed on [github.com/Sephral](https://github.com/Sephral).

## Demo

![SCCP demo](media/demo.gif)

The demo uses three heroes, three adversaries and the arena map of Crucible's playtest adventure. If the embedded preview is not available in your GitHub view, please check the media folder.

## Features

* **Heroism in numbers:** under Crucible's Heroism meter the tracker shows the AP on the meter, the AP per point and how many are still missing, for example *14 / 24 AP, 10 to go*. The tooltip explains which actions count.
* **Heroism alert:** when the meter is full, it flashes and everyone gets a short notification that every combatant with a Heroism maximum gained a point.
* **Escalation at a glance:** a countdown to round 7, then the current amount and the next one. In escalation rounds the first and the last combatant get a badge with the Morale they gained or lost, even after someone delays.
* **Initiative forecast:** Crucible rolls initiative again every round. A badge next to each combatant shows the boons and banes of the next roll if the round ended now: unspent AP, slow weapons, bulky armor, Broken, elite and boss ranks and boons from talents. Hover for the dice and the average result.
* **No surprises for the players:** the GM decides who sees the forecast, because it reveals unspent AP. By default everyone sees it for heroes and only the GM for adversaries.
* **English and German:** the module language follows Foundry or can be set per user.

## Usage

Enable the module in your Crucible world and start a fight. Everything appears in the combat tracker (sidebar and popout). Each user can switch the parts on and off for themselves.

The forecast is built by Crucible itself from the current state of each combatant, so talents that change initiative are included. The module never rolls dice and never changes a combat, an actor or a roll. The only thing it stores is who the escalation hit at the start of a round, written by the GM's client on the combat.

## Settings

All options are in *Game Settings → Configure Settings → Sephral’s Crucible Combat Pulse*:

* Module language (follow Foundry, German or English)
* Heroism progress and the Heroism alert (flash and notification, only flash, nothing)
* Escalation display
* Initiative forecast, and who sees it (only the GM, owners, everyone for heroes, everyone)
* A self test for the GM

## Requirements

* Foundry VTT 14 and the Crucible system 0.11
* Verified with Foundry 14.369 and Crucible 0.11.1. Crucible is still in development. After an update of Crucible or Foundry the GM gets a short notice, and the self test in the module settings checks that the Heroism meter, the escalation and the initiative roll still work the way the module expects.

Install the module with its manifest URL `https://github.com/Sephral/sephrals-crucible-combat-pulse/releases/latest/download/module.json`.

## License

See [LICENSE.md](LICENSE.md).
