# Wicked Codex — moved

This spec has been re-homed. The codex is being built inside **Campaign Forge**, not Wicked Campaigns.

**Authoritative spec:** `cv-campaign-forge/docs/CODEX.md`

Decided 2026-08-04. The short version:

- The codex is upstream of the Wicked Campaigns → Campaign Forge feature migration. Moving Lifepath and Biography across *before* it exists would import a `campaign-codex` dependency into a module that currently requires nothing but the system.
- It is the feature that makes the name "Campaign Forge" literal.
- Nothing in the design is dnd5e-specific, so it is held system-clean inside a dnd5e-gated module — extraction stays a file move if a second system ever needs it.

Nothing in this document was lost: §1's two findings, the link model, the search design, the theming cascade and the hardened container flow all carried over unchanged. What changed is where it lives, the subtype declaration (bare keys — Foundry namespaces with the package id), the system-cleanliness boundary, and a QA suite scoped into v1.

Wicked Campaigns keeps its `campaign-codex` dependency until the six migration items in §7 of the new spec land.
