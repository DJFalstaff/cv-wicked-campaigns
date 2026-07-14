// Builds a PDF combining the actor's dnd5e sheet stats with the full Wicked Campaigns
// background (family, friends, enemies, romance, faith, personality, life events). Uses jsPDF,
// vendored locally and loaded on demand via a plain <script> tag (its UMD build isn't a real ES
// module, so a dynamic import() wouldn't expose anything useful) - this way it costs nothing
// unless a GM/player actually clicks the export button.

const JSPDF_SRC = "modules/cv-wicked-campaigns/scripts/vendor/jspdf.umd.min.js";
let jsPDFLoadPromise = null;

async function loadJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  if (!jsPDFLoadPromise) {
    jsPDFLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = JSPDF_SRC;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load the PDF library."));
      document.head.appendChild(script);
    });
  }
  await jsPDFLoadPromise;
  return window.jspdf.jsPDF;
}

// Every embeddable image gets normalized to a (downscaled) PNG data URL here, regardless of
// source format - jsPDF's own WEBP support is a pure-JS decoder that's dramatically slower than
// the browser's native one (a deck's worth of card art, ~20+ WEBP images, could add 20-30+
// seconds of decode time otherwise). Routing through createImageBitmap + canvas lets the browser
// do that decode instead, so jsPDF only ever has to read straightforward PNG bytes. Downscaling to
// `maxDim` matters just as much as the format swap: source art can be 1000-2000px+ per side, and
// re-encoding that at full resolution for a ~50-90pt thumbnail bloats both encode time and the
// final file size by orders of magnitude (one real deck's worth of card art produced a 270MB PDF
// before this was added) for zero visible quality gain at that display size.
async function imageToDataUrl(src, maxDim = 300) {
  if (!src) return null;
  try {
    const resp = await fetch(src);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    if (blob.type === "image/svg+xml") return null;
    const bitmap = await createImageBitmap(blob).catch(() => null);
    if (!bitmap) return null;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    // JPEG has no alpha channel, so paint a solid backdrop first - card art and portraits are
    // opaque rectangular images anyway, and JPEG compresses this kind of photographic/painted
    // content far smaller than PNG (which is what actually kept file size sane once images were
    // no longer embedded at full source resolution).
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch (err) {
    return null;
  }
}

function sign(n) {
  const num = Number(n) || 0;
  return num >= 0 ? `+${num}` : `${num}`;
}

// Matches the module's actual on-screen dark palette (rgba(11,10,19,0.9) app background, #c9a054
// gold headings, #d5d5d5 body text, #b5b5b5 muted meta text) - shared by both PDF exports so they
// look like the sheets they're pulled from rather than a generic light printout.
const WICKED_DARK_THEME = {
  background: [11, 10, 19],
  heading: [201, 160, 84],
  text: [213, 213, 213],
  muted: [181, 181, 181],
  rule: [201, 160, 84],
};

// Thin wrapper around jsPDF handling page-break tracking and consistent text styling, so the two
// render functions below can just describe content without worrying about pagination or fonts.
class PdfLayout {
  constructor(doc, theme = null, footerText = null) {
    // `theme` is { background, heading, text, muted, rule } RGB triplets ([r,g,b]) - painted as a
    // full-page fill plus default text/rule colors on every page, including ones added later via
    // ensureSpace's page breaks. Both exports pass WICKED_DARK_THEME today; theme=null (plain
    // black-on-white, every color call skipped below) is kept as a fallback rather than deleted,
    // in case a future export wants the light/printable look instead.
    //
    // `footerText`, if given, is stamped once per page (here for page 1, and again inside
    // ensureSpace whenever a new page starts) - every page gets exactly one "start", so this is
    // the only place the stamp needs to happen for it to appear on every page including the last.
    this.doc = doc;
    this.theme = theme;
    this.footerText = footerText;
    this.margin = 40;
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.y = this.margin;
    this._paintPageBackground();
    this._stampFooter();
  }
  _paintPageBackground() {
    if (!this.theme?.background) return;
    this.doc.setFillColor(...this.theme.background);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, "F");
  }
  _stampFooter() {
    if (!this.footerText) return;
    this.doc.setFont(undefined, "italic");
    this.doc.setFontSize(8);
    this._setTextColor(this.theme?.muted || [140, 140, 140]);
    this.doc.text(this.footerText, this.pageWidth / 2, this.pageHeight - this.margin / 2, { align: "center" });
    this.doc.setFont(undefined, "normal");
  }
  _setTextColor(rgb) {
    if (this.theme || rgb) this.doc.setTextColor(...(rgb || [0, 0, 0]));
  }
  ensureSpace(needed) {
    if (this.y + needed > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.y = this.margin;
      this._paintPageBackground();
      this._stampFooter();
    }
  }
  heading(text, { size = 14, gapBefore = 10, gapAfter = 6, color } = {}) {
    this.ensureSpace(size + gapBefore + gapAfter);
    this.y += gapBefore;
    this.doc.setFont(undefined, "bold");
    this.doc.setFontSize(size);
    this._setTextColor(color || this.theme?.heading);
    this.doc.text(text, this.margin, this.y);
    this.y += gapAfter + size * 0.3;
    this.doc.setFont(undefined, "normal");
    this.doc.setFontSize(10);
  }
  rule(color) {
    this.ensureSpace(10);
    this.doc.setDrawColor(...(color || this.theme?.rule || [180, 180, 180]));
    this.doc.line(this.margin, this.y, this.margin + this.contentWidth, this.y);
    this.y += 12;
  }
  text(text, { size = 10, bold = false, gap = 4, color } = {}) {
    if (!text) return;
    this.doc.setFont(undefined, bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this._setTextColor(color || this.theme?.text);
    const lines = this.doc.splitTextToSize(String(text), this.contentWidth);
    const lineHeight = size * 1.15;
    this.ensureSpace(lines.length * lineHeight);
    this.doc.text(lines, this.margin, this.y);
    this.y += lines.length * lineHeight + gap;
    this.doc.setFont(undefined, "normal");
  }
  labeledText(label, value, opts = {}) {
    if (!value) return;
    this.text(`${label}: ${value}`, opts);
  }
  // Lays a row of {label, value} pairs out in even columns - used for the AC/HP/Speed strip and
  // the ability score block, where a single wrapped paragraph would read poorly.
  statRow(pairs) {
    const size = 8.5;
    this.ensureSpace(size * 2 + 18);
    const colWidth = this.contentWidth / pairs.length;
    pairs.forEach(([label, value], i) => {
      const x = this.margin + i * colWidth;
      this.doc.setFont(undefined, "normal");
      this.doc.setFontSize(size);
      this._setTextColor(this.theme?.muted);
      this.doc.text(String(label).toUpperCase(), x, this.y);
      this.doc.setFont(undefined, "bold");
      this.doc.setFontSize(13);
      this._setTextColor(this.theme?.heading);
      this.doc.text(String(value), x, this.y + 16);
    });
    this.y += 26;
    this.doc.setFont(undefined, "normal");
    this.doc.setFontSize(10);
  }
}

function gatherCharacterStats(actor) {
  const s = actor.system;
  const raceItem = actor.items.find((i) => i.type === "race");
  const bgItem = actor.items.find((i) => i.type === "background");
  const classText = Object.values(actor.classes || {})
    .map((c) => `${c.name} ${c.system?.levels ?? ""}`.trim())
    .filter(Boolean)
    .join(" / ");

  const abilities = Object.entries(s.abilities || {}).map(([key, a]) => ({
    key,
    label: CONFIG.DND5E?.abilities?.[key]?.label || key.toUpperCase(),
    value: a.value,
    mod: a.mod,
    save: a.save?.value ?? a.mod,
    saveProficient: !!a.proficient,
  }));

  const skills = Object.entries(s.skills || {})
    .filter(([, sk]) => sk.proficient >= 1)
    .map(([key, sk]) => ({
      label: CONFIG.DND5E?.skills?.[key]?.label || key,
      total: sk.total,
      expertise: sk.proficient >= 2,
    }));

  const currency = Object.entries(s.currency || {}).filter(([, v]) => v);

  return {
    name: actor.name,
    race: raceItem?.name || "",
    background: bgItem?.name || "",
    classText,
    alignment: s.details?.alignment || "",
    age: s.details?.age || "",
    gender: s.details?.gender || "",
    height: s.details?.height || "",
    weight: s.details?.weight || "",
    eyes: s.details?.eyes || "",
    hair: s.details?.hair || "",
    skin: s.details?.skin || "",
    ac: s.attributes?.ac?.value ?? "",
    hp: s.attributes?.hp,
    speed: s.attributes?.movement?.walk ?? 0,
    speedUnits: s.attributes?.movement?.units || "ft",
    initiative: s.attributes?.init?.total ?? 0,
    proficiencyBonus: s.attributes?.prof ?? 0,
    abilities,
    skills,
    currency,
  };
}

// Some damage formulas (unarmed strike, natural weapons) come with unresolved roll-data
// variables like "1 + @mod" - dnd5e only resolves those at actual roll time. Resolved by hand
// here with the weapon's own roll data (includes the "mod" alias dnd5e already computes for it),
// same technique GG Sheet Export uses for the same problem.
function resolveFormula(formula, item, actor) {
  if (!formula || !String(formula).includes("@")) return formula;
  try {
    const rollData = item.getRollData?.() ?? actor.getRollData();
    return Roll.replaceFormulaData(formula, rollData, { missing: "0" });
  } catch (err) {
    return formula;
  }
}

// to-hit/damage labels moved from a flat `labels` object to per-activity data at some point in
// dnd5e's item schema - checked in that order, falling back to activities only when labels come
// back empty, so this keeps working across the versions this module has actually been run on.
function gatherAttacks(actor) {
  return actor.items
    .filter((i) => i.type === "weapon")
    .map((w) => {
      let toHit = w.labels?.toHit ?? "";
      let damage = w.labels?.damage ?? "";
      if (!damage && Array.isArray(w.labels?.derivedDamage)) {
        damage = w.labels.derivedDamage.map((d) => `${d.formula} ${d.damageType ?? ""}`.trim()).join(" + ");
      }
      if ((!toHit || !damage) && w.system?.activities) {
        try {
          for (const act of w.system.activities) {
            toHit ||= act.labels?.toHit ?? "";
            damage ||= act.labels?.damage ?? "";
          }
        } catch (err) {
          // structure differs by dnd5e version - fall through with whatever we already have
        }
      }
      return {
        name: w.name,
        equipped: !!w.system?.equipped,
        toHit: toHit || "-",
        damage: resolveFormula(damage, w, actor) || "-",
      };
    })
    .sort((a, b) => (a.equipped === b.equipped ? 0 : a.equipped ? -1 : 1));
}

const FEATURE_ORIGIN_LABELS = { race: "Race", class: "Class", subclass: "Class", background: "Background", feat: "Feat" };

function gatherFeatureGroups(actor) {
  const groups = new Map();
  for (const item of actor.items.filter((i) => i.type === "feat")) {
    const label = FEATURE_ORIGIN_LABELS[item.system?.type?.value] || "Other";
    if (!groups.has(label)) groups.set(label, []);
    const uses = item.system?.uses;
    groups.get(label).push({ name: item.name, uses: uses?.max ? `${uses.value ?? 0}/${uses.max}` : "" });
  }
  return [...groups.entries()].map(([label, feats]) => ({ label, feats }));
}

// Spell preparation moved from system.preparation.{mode,prepared} to system.{method,prepared} in
// dnd5e 5.1 - checked in that order so this keeps working on either shape.
function gatherSpells(actor) {
  const s = actor.system;
  const spellItems = actor.items.filter((i) => i.type === "spell");
  const levels = [];
  for (let lvl = 0; lvl <= 9; lvl++) {
    const spells = spellItems
      .filter((sp) => (sp.system?.level ?? 0) === lvl)
      .map((sp) => {
        const sd = sp.system ?? {};
        let method, isPrepared;
        if (sd.method !== undefined) {
          method = sd.method;
          isPrepared = sd.prepared;
        } else {
          const prep = sd.preparation ?? {};
          method = prep.mode;
          isPrepared = prep.prepared;
        }
        const usesPrep = method === "prepared" || method === "spell" || method === undefined;
        const rawProps = sd.properties;
        const props = rawProps instanceof Set ? [...rawProps] : (Array.isArray(rawProps) ? rawProps : []);
        return {
          name: sp.name,
          prepared: usesPrep ? !!isPrepared : true,
          concentration: props.includes("concentration"),
          ritual: props.includes("ritual"),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    if (spells.length) {
      const slot = s.spells?.[`spell${lvl}`];
      const max = slot?.max ?? 0;
      levels.push({
        level: lvl,
        label: lvl === 0 ? "Cantrips" : `Level ${lvl}`,
        slots: lvl > 0 && max ? `${slot.value ?? 0}/${max}` : "",
        spells,
      });
    }
  }
  const pact = s.spells?.pact;
  return {
    levels,
    pactSlots: pact?.max ? `${pact.value ?? 0}/${pact.max} (Level ${pact.level ?? "?"})` : "",
  };
}

const INVENTORY_TYPES = ["weapon", "equipment", "consumable", "tool", "loot", "container"];
const INVENTORY_TYPE_LABELS = { weapon: "Weapons", equipment: "Equipment", consumable: "Consumables", tool: "Tools", container: "Containers", loot: "Loot" };

function gatherInventory(actor) {
  const items = actor.items
    .filter((i) => INVENTORY_TYPES.includes(i.type))
    .map((i) => ({
      name: i.name,
      type: i.type,
      qty: i.system?.quantity ?? 1,
      weight: Number(i.system?.weight?.value) || 0,
      equipped: !!i.system?.equipped,
    }));
  const groups = INVENTORY_TYPES
    .map((type) => ({
      label: INVENTORY_TYPE_LABELS[type],
      rows: items
        .filter((i) => i.type === type)
        .sort((a, b) => (a.equipped === b.equipped ? a.name.localeCompare(b.name) : a.equipped ? -1 : 1)),
    }))
    .filter((g) => g.rows.length);
  const totalWeight = items.reduce((n, i) => n + i.weight * i.qty, 0);
  return { groups, totalWeight };
}

function renderAttacks(layout, attacks) {
  if (!attacks.length) return;
  layout.heading("Attacks", { size: 12 });
  for (const a of attacks) {
    const marker = a.equipped ? "●" : "○";
    layout.text(`${marker} ${a.name} — ${a.toHit} to hit, ${a.damage}`, { size: 9.5, gap: 2 });
  }
}

function renderFeatures(layout, featureGroups) {
  if (!featureGroups.length) return;
  layout.heading("Features", { size: 12 });
  for (const g of featureGroups) {
    const line = g.feats.map((f) => (f.uses ? `${f.name} (${f.uses})` : f.name)).join("   •   ");
    layout.labeledText(g.label, line, { size: 9.5 });
  }
}

function renderSpells(layout, spellData) {
  if (!spellData.levels.length) return;
  layout.heading("Spells", { size: 12 });
  if (spellData.pactSlots) layout.text(`Pact Slots: ${spellData.pactSlots}`, { size: 9, color: layout.theme?.muted, gap: 4 });
  for (const lvl of spellData.levels) {
    const heading = lvl.slots ? `${lvl.label} (${lvl.slots})` : lvl.label;
    layout.text(heading, { bold: true, size: 10, gap: 2 });
    const line = lvl.spells
      .map((sp) => {
        const marker = sp.prepared ? "●" : "○";
        const tags = [sp.concentration && "C", sp.ritual && "R"].filter(Boolean).join("");
        return `${marker} ${sp.name}${tags ? ` (${tags})` : ""}`;
      })
      .join("   ");
    layout.text(line, { size: 9, gap: 6 });
  }
}

function renderInventory(layout, invData) {
  if (!invData.groups.length) return;
  layout.heading("Inventory", { size: 12 });
  for (const g of invData.groups) {
    layout.text(g.label, { bold: true, size: 10, gap: 2 });
    const line = g.rows
      .map((i) => {
        const marker = i.equipped ? "●" : "○";
        const w = i.weight ? ` (${Math.round(i.weight * i.qty * 100) / 100} lb)` : "";
        return `${marker} ${i.qty}x ${i.name}${w}`;
      })
      .join("   ");
    layout.text(line, { size: 9, gap: 6 });
  }
  if (invData.totalWeight) {
    layout.text(`Total Weight: ${Math.round(invData.totalWeight * 100) / 100} lb`, { size: 9.5, bold: true, gap: 6 });
  }
}

async function renderHeader(layout, stats, actorImg) {
  const size = 70;
  const imgData = await imageToDataUrl(actorImg);
  if (imgData) {
    try {
      layout.doc.addImage(imgData, "JPEG", layout.pageWidth - layout.margin - size, layout.y, size, size);
    } catch (err) {
      console.warn("Wicked Campaigns | Failed to embed actor portrait in PDF", err);
    }
  }

  const savedWidth = layout.contentWidth;
  layout.contentWidth = savedWidth - (imgData ? size + 12 : 0);

  layout.heading(stats.name, { size: 20, gapBefore: 0 });
  const subtitle = [stats.race, stats.classText, stats.background].filter(Boolean).join("  •  ");
  if (subtitle) layout.text(subtitle, { size: 11, gap: 2, color: layout.theme?.muted });
  if (stats.alignment) layout.text(stats.alignment, { size: 10, gap: 8, color: layout.theme?.muted });

  const bioLine = [
    stats.gender && `Gender: ${stats.gender}`,
    stats.age && `Age: ${stats.age}`,
    stats.height && `Height: ${stats.height}`,
    stats.weight && `Weight: ${stats.weight}`,
    stats.eyes && `Eyes: ${stats.eyes}`,
    stats.hair && `Hair: ${stats.hair}`,
    stats.skin && `Skin: ${stats.skin}`,
  ].filter(Boolean).join("   ");
  if (bioLine) layout.text(bioLine, { size: 9, gap: 10, color: layout.theme?.muted });

  layout.contentWidth = savedWidth;
  if (imgData) layout.y = Math.max(layout.y, layout.margin + size + 10);
}

function renderCharacterStats(layout, stats) {
  layout.rule();
  layout.statRow([
    ["AC", stats.ac],
    ["HP", stats.hp ? `${stats.hp.value}/${stats.hp.max}` : "-"],
    ["Speed", `${stats.speed} ${stats.speedUnits}`],
    ["Initiative", sign(stats.initiative)],
    ["Prof. Bonus", sign(stats.proficiencyBonus)],
  ]);
  layout.rule();

  layout.heading("Ability Scores", { size: 12 });
  layout.statRow(stats.abilities.map((a) => [a.label, `${a.value} (${sign(a.mod)})`]));
  const saveLine = stats.abilities
    .filter((a) => a.saveProficient)
    .map((a) => `${a.label} ${sign(a.save)}`)
    .join("   ");
  if (saveLine) layout.text(`Proficient Saves: ${saveLine}`, { size: 9, gap: 8, color: layout.theme?.muted });

  if (stats.skills.length) {
    layout.heading("Proficient Skills", { size: 12 });
    const skillLine = stats.skills
      .map((sk) => `${sk.label} ${sign(sk.total)}${sk.expertise ? " (Expertise)" : ""}`)
      .join("   •   ");
    layout.text(skillLine, { size: 9, gap: 8, color: layout.theme?.muted });
  }

  if (stats.currency.length) {
    layout.heading("Currency", { size: 12 });
    layout.text(stats.currency.map(([k, v]) => `${v} ${k.toUpperCase()}`).join("   "), { size: 9, gap: 8, color: layout.theme?.muted });
  }
}

function renderBackgroundSection(layout, backstoryFlags) {
  const {
    family = [], parents = [], siblings = [], friends = [], enemies = [],
    lover = null, faith = null, personality = [], lifeEvents = [],
  } = backstoryFlags;

  const hasAny = family.length || parents.length || siblings.length || friends.length ||
    enemies.length || lover || faith || personality.length || lifeEvents.length;

  layout.heading("Background", { size: 16, gapBefore: 18 });
  if (!hasAny) {
    layout.text("No lifepath background saved yet for this character.", { size: 10 });
    return;
  }

  for (const f of family) layout.labeledText(f.label, f.text, { size: 9.5 });

  for (const p of parents) {
    if (!p.name && !p.bond && !p.description) continue;
    layout.text(p.role === "mother" ? "Mother" : "Father", { bold: true, size: 10, gap: 1 });
    layout.labeledText("Name", p.name, { size: 9.5 });
    layout.labeledText("Relationship/Bond", p.bond, { size: 9.5 });
    layout.labeledText("Description", p.description, { size: 9.5, gap: 6 });
  }

  if (siblings.length) {
    layout.heading("Siblings", { size: 12 });
    for (const s of siblings) {
      const status = s.alive === false ? " (deceased)" : "";
      layout.text(`${s.name || "(unnamed)"}${status}`, { bold: true, size: 9.5, gap: 1 });
      layout.labeledText("Occupation/Status", s.relation, { size: 9.5 });
      layout.labeledText("Relationship", s.bond, { size: 9.5, gap: 6 });
    }
  }

  if (friends.length) {
    layout.heading("Friends", { size: 12 });
    for (const f of friends) {
      const tags = [f.race, f.profession].filter(Boolean).join(", ");
      layout.text(`${f.name || "(unnamed)"}${tags ? ` — ${tags}` : ""}`, { bold: true, size: 9.5, gap: 1 });
      layout.labeledText("Situation", f.situation, { size: 9.5, gap: 6 });
    }
  }

  if (enemies.length) {
    layout.heading("Enemies", { size: 12 });
    for (const e of enemies) {
      const tags = [e.race, e.profession].filter(Boolean).join(", ");
      layout.text(`${e.name || "(unnamed)"}${tags ? ` — ${tags}` : ""}`, { bold: true, size: 9.5, gap: 1 });
      layout.labeledText("Situation", e.situation, { size: 9.5, gap: 6 });
    }
  }

  if (lover) {
    layout.heading("Romance", { size: 12 });
    const tags = [lover.gender, lover.race, lover.profession].filter(Boolean).join(", ");
    layout.text(`${lover.name || "(unnamed)"}${tags ? ` — ${tags}` : ""}`, { bold: true, size: 9.5, gap: 1 });
    layout.labeledText("Appearance", lover.appearance, { size: 9.5 });
    layout.labeledText("Detail", lover.romanceDetail, { size: 9.5, gap: 6 });
  }

  if (faith) {
    layout.heading("Faith", { size: 12 });
    layout.text(faith.deityName || "(unnamed deity)", { bold: true, size: 9.5, gap: 1 });
    layout.text(faith.description, { size: 9.5, gap: 6 });
  }

  if (personality.length) {
    layout.heading("Personality", { size: 12 });
    for (const p of personality) layout.labeledText(p.label, p.text, { size: 9.5 });
  }

  if (lifeEvents.length) {
    layout.heading("Life Events", { size: 12 });
    lifeEvents.forEach((e, i) => {
      const tag = e.luck === "lucky" ? "Lucky" : "Unlucky";
      layout.labeledText(`${tag} Event ${i + 1}`, e.text, { size: 9.5 });
    });
  }
}

export async function exportBackgroundPdf(actor, backstoryDoc) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const footerText = `${actor.name} - Exported with Wicked Campaigns - ${new Date().toLocaleDateString()}`;
  const layout = new PdfLayout(doc, WICKED_DARK_THEME, footerText);

  const stats = gatherCharacterStats(actor);
  await renderHeader(layout, stats, actor.img);
  renderCharacterStats(layout, stats);
  renderAttacks(layout, gatherAttacks(actor));
  renderFeatures(layout, gatherFeatureGroups(actor));
  renderSpells(layout, gatherSpells(actor));
  renderInventory(layout, gatherInventory(actor));

  const backstoryFlags = backstoryDoc ? {
    family: backstoryDoc.getFlag("cv-wicked-campaigns", "lifepathFamily") || [],
    parents: backstoryDoc.getFlag("cv-wicked-campaigns", "lifepathParents") || [],
    siblings: backstoryDoc.getFlag("cv-wicked-campaigns", "lifepathSiblings") || [],
    friends: backstoryDoc.getFlag("cv-wicked-campaigns", "lifepathFriends") || [],
    enemies: backstoryDoc.getFlag("cv-wicked-campaigns", "lifepathEnemies") || [],
    lover: backstoryDoc.getFlag("cv-wicked-campaigns", "lifepathLover") || null,
    faith: backstoryDoc.getFlag("cv-wicked-campaigns", "lifepathFaith") || null,
    personality: backstoryDoc.getFlag("cv-wicked-campaigns", "lifepathPersonality") || [],
    lifeEvents: backstoryDoc.getFlag("cv-wicked-campaigns", "lifepathLifeEvents") || [],
  } : {};

  renderBackgroundSection(layout, backstoryFlags);

  const fileName = `${(actor.name || "character").replace(/[^\w\- ]+/g, "").trim() || "character"}.pdf`;
  doc.save(fileName);
}

function stripHtml(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  return (wrapper.textContent || "").replace(/\s+/g, " ").trim();
}

export async function exportSessionZeroSummaryPdf(summary) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const footerText = `${summary.name} - Exported with Wicked Campaigns - ${new Date().toLocaleDateString()}`;
  const layout = new PdfLayout(doc, WICKED_DARK_THEME, footerText);

  const data = summary.getFlag("campaign-codex", "data") || {};
  const entries = data.entries || [];

  layout.heading(summary.name, { size: 18, gapBefore: 0 });
  layout.text(`${entries.length} answer${entries.length === 1 ? "" : "s"} recorded`, { size: 10, color: WICKED_DARK_THEME.muted, gap: 10 });
  layout.rule();

  if (!entries.length) {
    layout.text("No answers recorded yet.", { size: 10 });
  }

  // Fetched/decoded up front and in parallel (distinct card images are often repeated across
  // entries too, so this also skips redundant work for those) rather than one at a time inside
  // the layout loop below, where every image's network+decode latency would otherwise stack up
  // sequentially.
  const uniqueCardImages = [...new Set(entries.map((e) => e.cardImage).filter(Boolean))];
  const cardImageData = new Map(
    await Promise.all(uniqueCardImages.map(async (src) => [src, await imageToDataUrl(src)])),
  );

  // Each entry is a fixed-height block (thumbnail left, title/player/answer text right) - the
  // whole block's height is reserved via one ensureSpace() call up front (using the layout's real
  // margin/contentWidth), then everything inside is written with direct doc.text() calls at
  // pre-computed coordinates. Deliberately doesn't delegate to layout.heading()/text() for the
  // inner column, since those call ensureSpace() themselves - if a page break fired mid-entry
  // while this.margin were temporarily overridden to the text column's x, the new page's cursor
  // would reset to the wrong margin.
  const thumbW = 50;
  const thumbH = 70;
  const textX = layout.margin + thumbW + 12;
  const textWidth = layout.contentWidth - thumbW - 12;
  for (const entry of entries) {
    const answerText = stripHtml(entry.answerHtml) || "(no answer text)";
    doc.setFont(undefined, "normal");
    doc.setFontSize(9.5);
    const answerLines = doc.splitTextToSize(answerText, textWidth);
    const involvesText = entry.linkedPlayers?.length ? `Involves: ${entry.linkedPlayers.map((p) => p.name).join(", ")}` : "";
    const titleHeight = 12 * 1.15;
    const playerHeight = entry.playerName ? 8.5 * 1.3 : 0;
    const involvesHeight = involvesText ? 8 * 1.3 : 0;
    const answerHeight = answerLines.length * (9.5 * 1.15);
    const blockHeight = Math.max(thumbH, titleHeight + playerHeight + involvesHeight + answerHeight + 6);
    layout.ensureSpace(blockHeight + 14);

    const topY = layout.y;
    const imgData = entry.cardImage ? cardImageData.get(entry.cardImage) : null;
    if (imgData) {
      try {
        doc.addImage(imgData, "JPEG", layout.margin, topY, thumbW, thumbH);
      } catch (err) {
        console.warn("Wicked Campaigns | Failed to embed card image in PDF", err);
      }
    }

    let ty = topY + titleHeight;
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...WICKED_DARK_THEME.heading);
    doc.text(entry.title || "(untitled)", textX, ty);

    if (entry.playerName) {
      ty += playerHeight;
      doc.setFont(undefined, "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...WICKED_DARK_THEME.muted);
      doc.text(entry.playerName, textX, ty);
    }

    if (involvesText) {
      ty += involvesHeight;
      doc.setFont(undefined, "italic");
      doc.setFontSize(8);
      doc.setTextColor(...WICKED_DARK_THEME.muted);
      doc.text(involvesText, textX, ty);
      doc.setFont(undefined, "normal");
    }

    ty += 6;
    doc.setFontSize(9.5);
    doc.setTextColor(...WICKED_DARK_THEME.text);
    doc.text(answerLines, textX, ty + 9.5 * 1.15 * 0.8);

    layout.y = topY + blockHeight + 14;
  }

  const fileName = `${(summary.name || "session-zero-summary").replace(/[^\w\- ]+/g, "").trim() || "session-zero-summary"}.pdf`;
  doc.save(fileName);
}
