# Changelog

All notable changes to Wicked Campaigns are documented here, newest first.

## v14.2.0 — 2026-08-07

Everything in this release comes out of the 2026-08-06 Session Zero playtest.

### Players can use the card table

- Right-clicking a card on the Complete Card Management layer now opens the card HUD for players, not just the GM. Previously nothing happened at all: Foundry's HUD permission needs Owner-level ownership on the parent card stack, and the deck shipped at None.
- The deck and the scene's discard pile are raised to Observer when a game starts, so decks imported before this release are fixed in place too.
- Observer is deliberate rather than Owner: players get the menu, but still cannot drag, rotate, flip, re-sort or delete anything on the table. Controls they cannot use are hidden rather than left to fail.
- Players get **View Card Image**, **Open Session Notes** and the **relationship d8**. Recording a card's headline answer stays with the GM, since that is what moves the tier counters.

### The relationship d8 is a real roll

- It posts a chat card and throws 3D dice like any other roll, instead of showing results only inside its own dialog. One pooled roll, so every die is thrown together rather than queued player by player.

### Shared session notes

- The Session Zero Summary is now readable by the whole table, and anyone who can read it can append their own note to any recorded answer. Notes are threaded under the answer they respond to, signed by the Foundry user who wrote them, and included in the PDF export.
- Player notes are relayed through the active GM rather than granting players write access, which also stops simultaneous notes from overwriting one another.
- Older summaries, created before this existed, show a **Share with Table** button.

### A shared game tracker

- Players get a live read-only copy of the tracker: whose turn it is, and how many Villain / Moons / Mobius / Arcana / Rose cards the table has spent against their limits. The GM keeps drag-to-reorder, turn controls and End Session.
- Each card type's procedure is now on the tracker as a tooltip.

### New deck art, and the Arcana re-themed

- The Queen of Storms Prelude Deck ships with an entirely new card set. Each card now carries its own flavour text, its prompt and its procedure printed on the face.
- All 22 Major Arcana are re-themed away from Rider-Waite and renamed to match: The Fool becomes The Maelstrom, Death becomes The Black Rider, The Star becomes The Eclipse, and so on. Each keeps its tarot number as its card value.

### New GM tools

- **Keystone Cards** — mark the clearest example of each card type. A Reset promotes one marked card per suit, chosen at random, to lead that suit, so players always meet a type through its best example while the GM still gets a different opening each run.
- **Draw Arcana** — deal the closing Arcana wherever it sits in the deck, so the final beat is a decision rather than a consequence of how the deck thinned.
- **Draw a Card** — deal any specific card by name.
- **Return to Deck** and **Return All Cards to Deck** — card placement is finally reversible. A misdeal no longer needs discarding your way out of it.
- **Refresh from Compendium** — update a world's deck to the shipped version in place, keeping its position on the scene, its folder, its ownership and its keystone markings.

### Deck order

- Reset now stacks the Major Arcana at the bottom so they are drawn last, instead of second from the top. They are the most open-ended cards in the deck, which made them the worst possible opener.

### Housekeeping

- Max Moons and Max Mobius cards now default to 4.
- The Queen of Storms card game ships as one self-contained adventure — scene, deck and discard pile, wired together — so an import gives a working table.
- The redundant Wicked Cards compendium has been removed; the adventure is now the single source of the deck.
- Removed a stray per-user ownership entry from 32 compendium documents.
- Added a root `llms.txt` so assistants such as Pseudo can answer questions about this module.

## v14.0.5 — 2026-07-28
- Added three new cards (with art) to the Tarot — Queen of Storms deck.
- Updated content in The Unknown Lands adventure and a couple of scenes.

## v14.0.3 — 2026-07-27
- Corrected `compatibility.verified` to the exact Foundry build number (the fix landed after v14.0.2 was already tagged, so this release actually ships it).

## v14.0.2 — 2026-07-27
- Added voice dictation (mic button + Alt+M) to the Session Zero Record Answer editor.

## v14.0.1 — 2026-07-27
- Added a `bugs` field pointing to Discord.
- Switched to a Foundry-generation-led versioning scheme (`14.0.x`) and set up the manifest-based release workflow.
