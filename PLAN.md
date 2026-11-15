# Move sets: plan sheet

Rewritten from the to-do list picture so it is clear what has to be built, in
what order, and what is still undecided.

Status words: **done** = in this repository, **partly** = something exists
that can be reused, **to build** = nothing yet, **unclear** = needs an answer
first (see the questions at the bottom).

## 1. How a set works

There are 5 sets. Every set has the same four slots:

| Slot | What it is | How strong |
|---|---|---|
| Basic | The normal attack. Every third use is a slightly bigger or different version (example given: a music set shoots a note, and the third one is a different, bigger note) | Small |
| Normal 1 | A real move (examples given: several sword strikes; jump up and slam the ground) | Medium |
| Normal 2 | A second real move | Medium |
| Finisher | The grand move (example given: spawning a dragon) | Big |

So each set needs one counter per player: "how many basics have I done", which
makes the third one special.

## 2. The sets

| # | Set | Status |
|---|---|---|
| 1 | Dragon | Finisher done, basic partly, two normals to build |
| 2 | Steampunk | To build (his favourite) |
| 3 | Angels vs Demons | Only the name so far |
| 4 | Nightmare | Only the name so far |
| 5 | Not chosen yet | Unclear |

## 3. Dragon set

| Slot | Move | What happens | Status |
|---|---|---|---|
| Basic | Claw | Small claw effects, about the size of the `!claw` we have. Use 1: slash. Use 2: slash. Use 3: spinning slash | **Partly.** `dragon_claw/` already does slash, spin, slash in one go. It has to be cut into three separate short attacks and made smaller |
| Normal 1 | Dragon jaw | The player spreads the arms. A dragon jaw (upper and lower) appears in front, open. The player closes the arms, the jaw snaps shut, and everything inside takes damage | To build |
| Normal 2 | Wing lunge | Dragon wings appear on the player for a moment. Lunge forward with a trail behind. If the lunge hits a mob or player: grab them, fly up into the sky, then beat them down into the ground. The landing is an impact that also damages everyone around it. Reference: video #5 | To build |
| Finisher | Dragon Pulse | Ritual circle, dragon rises, dives on the target, beam explosion | **Done** (`dragon_pulse/`, `!dp`, `!clash`) |

## 4. Steampunk set

| Slot | Move | What happens | Status |
|---|---|---|---|
| Basic | Gear throw | Throw a gear. It spins as it flies and bursts into gold dust where it hits. Third use: one big gear with a bigger trail | To build |
| Normal 1 | Gear orbit | Several gears appear and spin around the player in different planes: diagonal, upright and flat. They hurt anything close. After a while they fly off and home in on nearby enemies for weak damage | To build |
| Normal 2 | Grinder | Throw a projectile at the spot you aim at. It becomes a big gear lying on the floor. While it turns, mobs are pulled in. Then gears drop from the sky onto it from all sides | To build |
| Finisher | Cog mark | Dash 10 blocks in an instant with a big trail (video #2), with cogs like in video #3. Everyone in the area you passed cannot move and gets a cog above the head. After 2 seconds of being frozen and marked, a slash combo hits them (as in video #2) and the marks explode | To build |

He also wrote that one of the Steampunk moves could be replaced by "something
like this" with a picture, and that he is not sure what it would do. The clock
idea from earlier (cogs build a clock, the hand slashes) could go here. Unclear.

## 5. Optional fixes to moves we already have

He marked these as optional, so they come after the new moves unless he says
otherwise.

| Move | Wish | Meaning |
|---|---|---|
| Dragon Pulse | "Circles more rigid so it's cleaner" | The ritual circles should look tidier: exact rings, less clutter |
| Dragon Pulse | "Thinner but longer dragon" (a maybe) | Stretch the body, make it slimmer |
| Dragon Pulse | "Slow it down so we can appreciate it" | The whole move plays slower |
| Dragon Claw | "Bigger movements or something else" | The body animation should move more |

## 6. Rules that apply to everything

- Normal moves reach 15 blocks at most. Finishers may go further.
- Stay under 400 meshes at once.
- Each move is one paste file for World Code (512,000 characters in total;
  32,000 for a code block), without `//` comments.
- Each move in its own folder, with a test and a preview picture, pushed to
  GitHub.
- Models are meshes, with particles and node meshes where they fit.

## 7. Order of work

1. **Set framework.** One small piece of code shared by all sets: which set a
   player has, the four slots, the "every third basic" counter, and how the
   moves are triggered. Everything else plugs into this.
2. **Dragon basic.** Cut the existing claw into slash, slash, spinning slash.
   Smallest job, and it proves the framework.
3. **Dragon jaw.**
4. **Dragon wing lunge.** The grab and carry is the hardest part of the Dragon
   set. That finishes Dragon.
5. **Steampunk basic** (gear throw). The gear model made here is reused by all
   other Steampunk moves.
6. **Gear orbit**, then **Grinder**, then **Cog mark**. That finishes Steampunk.
7. Optional fixes from section 5.
8. Angels vs Demons, Nightmare and the fifth set, once their moves are written
   down.

## 8. Questions for him

These block work, most urgent first.

1. **The videos.** #1 (how sets work), #2 (dash trail and slash combo), #3
   (cogs), #5 (wing lunge). They cannot be watched from this workspace, so for
   each one we need a short description or a few screenshots.
2. **How are moves triggered?** Chat commands like now (`!claw`), held items
   with clicks, or keys? And how does a player pick a set?
3. **Does the third basic replace the normal one or come on top of it?**
   For Dragon: is use 3 only the spinning slash?
4. **Dragon jaw:** how big, and how far in front of the player?
5. **Wing lunge:** how high does it carry the target, and what if the lunge
   hits nothing?
6. **Cog mark:** is "cannot move" allowed against players, or mobs only?
   How wide is the area along the dash?
7. **The Steampunk replacement picture:** which move does it replace, and
   what should it do?
8. **Angels vs Demons, Nightmare, set 5:** which moves?
9. **Damage numbers:** rough damage for basic, normal and finisher, so the
   sets are balanced against each other.
10. Still open from before: does Dragon Pulse's range of 40 stay, since it is
    a finisher?
