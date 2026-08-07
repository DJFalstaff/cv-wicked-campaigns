# Changelog

All notable changes to Wicked Campaigns are documented here, newest first.

## v14.1.0 — 2026-08-07

From the 2026-08-06 Session Zero playtest.

**Players can now use the card table.**
- Right-clicking a card on the Complete Card Management layer opens the card HUD for players, not just the GM. Previously nothing happened at all: Foundry's HUD permission requires Owner-level ownership on the parent card stack, and the deck shipped at None.
- The packed Tarot — Queen of Storms deck now ships at Observer (and no longer carries a hardcoded user id from the author's own world). Starting a Session Zero game also raises the deck and the scene's discard pile to Observer, so decks imported before this release are fixed in place.
- Observer, deliberately not Owner: players get the menu, but still cannot drag, rotate, flip, re-sort or delete anything on the table. CCM's own write controls are hidden from anyone who can't use them, instead of showing buttons that fail.
- Players get **View Card Image** (the zoomable viewer) and the **relationship d8**. Recording a card's headline answer stays with the GM, since that's what moves the tier counters.

**The relationship d8 is a real roll.**
- It now posts a chat card and throws 3D dice like any other roll, instead of showing its results only inside its own dialog. One pooled roll, so every die is thrown together rather than queued one player at a time.

**Shared session notes.**
- The Session Zero Summary is now Observer-visible to the table, and anyone who can see it can append their own note to any recorded answer and read everyone else's. Notes are threaded under the answer they respond to, attributed to the Foundry user who wrote them, and included in the PDF export.
- Player notes are relayed through the active GM rather than granting players write access to the journal, which also prevents concurrent edits silently overwriting each other.
- Note content is sanitized on the way in.

**Shared game tracker.**
- Players now get a live read-only copy of the Session Zero tracker: whose turn it is, and how many Villain / Moons / Mobius / Arcana / Rose cards the table has spent against their limits. The GM keeps drag-to-reorder, turn controls and End Session.
- Each card type's procedure is now on the tracker as a tooltip ("Mobius — everyone answers, clockwise from whoever drew the card"), rather than only in the rules.
- Both copies refresh live as answers are recorded and turns advance.

**Deck order.**
- Reset Deck now stacks the Major Arcana at the *bottom* so they are drawn last, instead of second from the top. The Arcana are by design the most open-ended cards in the deck, which made them the worst possible opener; asking them last means the fiction is established and players have learned the deck's meter first. New order: theme on top in value order, then skulls shuffled, then moons/mobius/roses shuffled together, then the major arcana shuffled at the bottom.

**Defaults.**
- Max Moons and Max Mobius cards now default to 4 (were 3).

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
