# Torn PDA Arcade Changelog

## v0.10.7
- Reworked mobile joystick tracking to use touch identifiers independently from the FIRE button.
- Corrected aircraft style selection and score-based transitions every 5,000 points.
- Health packs collected at 100 HP award 100 score points.

## v0.10.6
- Fixed joystick multitouch ownership when lifting and repositioning the movement thumb while holding FIRE.
- Reset movement on pointer release, cancellation, lost capture, or window blur.

## v0.10.5
- Removed continuous engine sound; explosion and healing sounds remain.
- Added immediate aircraft stage checks when kill points are awarded at 5,000-point intervals.

## v0.10.4
- Aircraft designs now advance every 5,000 points, with exit-right and reentry-left transition animation.
- Includes v0.10.3 fixes that silence the engine on pause, game over, minimize, and exit.
- Includes v0.10.2 reduced engine/movement sound volume.

## v0.10.1
- Critical fix for literal escaped-newline sequences introduced in v0.10.0 that prevented the userscript from parsing and loading.

## v0.10.0
- Added eight-stage aircraft design progression, advancing every 1,000 points and looping after the final design.
- Increased player aircraft maneuver speed from 235 to 270.
- Added persistent volume and sound toggle controls.
- Added movement/engine, explosion, and healing pickup sounds using Web Audio.

## v0.9.0
- Added remaining-time status for flight, jail, and hospital conditions.
- Games pause when the active Torn condition ends and prompt to continue or leave.
- Manual exit prompts to save unfinished game progress.
- Saved Flight Arcade state resumes from the saved position on the next launch.
- Death/game over clears the saved run.

## v0.8.0
- Added per-game **Show in Game List** setting.
- Game visibility preferences persist independently.

## v0.7.0
- Introduced the modular Arcade game registry.
- Converted Flight Arcade into a registered game module.
- Game Manager dynamically discovers registered games.

## v0.6.0
- Added selected Game Manager tab highlighting.
- Enemies escaping the left edge now explode and damage the player.
- Destroyed enemies drop collectible +10 health pickups.

## v0.5.0
- Replaced launcher controls with an always-visible draggable crosshair.
- Added Games and Settings tabs to the Game Manager.
- Removed displayed flight route/status information.

## v0.4.0
- Added Flight-only / Always launch availability.
- Added stricter Torn flight detection.
- Added draggable launcher position persistence.

## v0.3.0
- Added analog joystick/swipe movement.
- Added result chat sharing, donation link, and auto-update metadata.

## v0.2.0
- Improved flight detection, mobile controls/layout, and Torn PDA update support.

## v0.1.0
- Initial Torn PDA Flight Game release.
