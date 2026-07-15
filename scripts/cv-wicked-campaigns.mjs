/**
 * Wicked Campaigns Module
 * A campaign management and helper module for Foundry VTT V14.
 */
// Test comment: verifying the commit -> confirm -> push workflow.

import { exportBackgroundPdf, exportSessionZeroSummaryPdf } from "./pdf-export.mjs";

// ---- Constants -----------------------------------------------------------
const STEP_COUNT = 12;
const STEP_TITLES = {
  1: "Alignment",
  2: "Gender",
  3: "Height",
  4: "Weight",
  5: "Age",
  6: "Part 1 · Family",
  7: "Part 2 · Friends & Enemies",
  8: "Part 3 · Romance",
  9: "Part 4 · Appearance",
  10: "Part 5 · Personality",
  11: "Part 6 · Life Events",
  12: "Optional · Trait Pairs",
};

const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];
const GENDERS = ["Male", "Female", "Unique"];
const HEIGHT_BANDS = [
  { band: "Short",   min: 59, max: 65 },
  { band: "Average", min: 66, max: 72 },
  { band: "Tall",    min: 73, max: 79 },
];
// ---- Chase Tracker: bundled complication tables ---------------------------
// Ten 1d12 tables (6 real complications on 1-6, "no complication" on 7-12,
// matching the density of the DMG's own Urban/Wilderness Chase Complications
// tables) covering terrain/travel modes those two don't. Seeded once into the
// wicked-roll-tables compendium - see seedChaseComplicationTables().
const CHASE_COMPLICATION_TABLE_DEFS = [
  {
    name: "Rooftop Chase Complications",
    results: [
      { range: [1, 1], text: "Make a [[/save dex dc=10]] saving throw to leap a gap between buildings. On a failed save, you fall short and take [[/damage 2d6 type=bludgeoning]] damage, landing on the floor below." },
      { range: [2, 2], text: "Make a [[/save dex dc=10]] saving throw as loose or broken roof tiles shift underfoot. On a failed save, you have the &Reference[Prone] condition." },
      { range: [3, 3], text: "Make a [[/save dex dc=10]] or [[/save int dc=10]] saving throw (your choice) to navigate a maze of laundry lines and drying sheets. On a failed save, they count as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [4, 4], text: "Make a [[/save con dc=10]] saving throw as a chimney vents a blast of hot steam or smoke. On a failed save, you have the &Reference[Blinded] condition until the end of your turn." },
      { range: [5, 5], text: "Make a [[/save dex dc=15]] saving throw as a skylight or weak section of roofing gives way beneath you. On a failed save, you take [[/damage 2d4 type=slashing]] damage and have the &Reference[Prone] condition." },
      { range: [6, 6], text: "Make a [[/save dex dc=10]] saving throw to keep your footing as a flock of startled birds bursts into your path. On a failed save, you have the &Reference[Prone] condition." },
      { range: [7, 12], text: "There is no complication." },
    ],
  },
  {
    name: "Sewer & Tunnel Chase Complications",
    results: [
      { range: [1, 1], text: "Make a [[/save str dc=10]] saving throw to squeeze quickly through a narrow stretch of tunnel. On a failed save, it counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [2, 2], text: "Make a [[/save dex dc=10]] saving throw as the floor drops away into deeper water. On a failed save, you fall 10 feet into filthy water and take [[/damage 1d4 type=bludgeoning]] damage." },
      { range: [3, 3], text: "Make a [[/save con dc=10]] saving throw against the foul, stagnant air. On a failed save, you have the &Reference[Poisoned] condition until the end of your next turn." },
      { range: [4, 4], text: "Make a [[/save dex dc=10]] saving throw as a rusted grate or rotten walkway collapses underfoot. On a failed save, you have the &Reference[Prone] condition and take [[/damage 1d4 type=bludgeoning]] damage." },
      { range: [5, 5], text: "Make a [[/save dex dc=10]] saving throw to avoid a swarm of rats scurrying across your path. On a failed save, it counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [6, 6], text: "Make a [[/save dex dc=10]] saving throw to keep hold of your light source as dripping water or a gust of foul wind threatens to snuff it out. On a failed save, you have the &Reference[Blinded] condition until you spend an action relighting it." },
      { range: [7, 12], text: "There is no complication." },
    ],
  },
  {
    name: "Shipboard Chase Complications",
    results: [
      { range: [1, 1], text: "Make a [[/save dex dc=10]] saving throw to keep your footing as a sudden swell rocks the ship. On a failed save, you have the &Reference[Prone] condition." },
      { range: [2, 2], text: "Make a [[/save dex dc=10]] or [[/save str dc=10]] saving throw (your choice) to navigate coiled rigging tangled underfoot. On a failed save, it counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [3, 3], text: "Make a [[/save dex dc=10]] saving throw as cargo crates shift and slide across the deck. On a failed save, you take [[/damage 1d6 type=bludgeoning]] damage and they count as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [4, 4], text: "Make a [[/save con dc=10]] saving throw as sea spray blinds you when a wave crashes over the rail. On a failed save, you have the &Reference[Blinded] condition until the end of your turn." },
      { range: [5, 5], text: "Make a [[/save dex dc=10]] saving throw on a deck slick with spilled oil or fish guts. On a failed save, you have the &Reference[Prone] condition." },
      { range: [6, 6], text: "Make a [[/save dex dc=15]] saving throw to scramble across a swaying plank or rope bridge between vessels. On a failed save, you fall into the water below." },
      { range: [7, 12], text: "There is no complication." },
    ],
  },
  {
    name: "Underwater Chase Complications",
    results: [
      { range: [1, 1], text: "Make a [[/save str dc=10]] saving throw to hold your course against a strong current. On a failed save, you are pushed 10 feet off course, which counts as 10 feet of &Reference[Difficult Terrain] to correct." },
      { range: [2, 2], text: "Make a [[/save str dc=10]] or [[/save dex dc=10]] saving throw (your choice) as a tangle of seaweed or kelp wraps around a limb. On a failed save, you have the &Reference[Restrained] condition until you or an ally spends an action freeing you." },
      { range: [3, 3], text: "Make a [[/save con dc=10]] saving throw as silt and sand cloud the water around you. On a failed save, you have the &Reference[Blinded] condition until the end of your turn." },
      { range: [4, 4], text: "Make a [[/save dex dc=10]] saving throw to avoid a school of startled fish or eels darting through the area. On a failed save, they count as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [5, 5], text: "Make a [[/save dex dc=15]] saving throw to avoid brushing against stinging coral or a jellyfish. On a failed save, you take [[/damage 1d6 type=poison]] damage." },
      { range: [6, 6], text: "Make a [[/save con dc=10]] saving throw as your air runs short from the exertion (if you lack a way to breathe underwater). On a failed save, you gain 1 level of Exhaustion." },
      { range: [7, 12], text: "There is no complication." },
    ],
  },
  {
    name: "Aerial Chase Complications",
    results: [
      { range: [1, 1], text: "Make a [[/save str dc=10]] saving throw to hold steady against a sudden gust. On a failed save, you are pushed 10 feet off your intended path." },
      { range: [2, 2], text: "Make a [[/save wis dc=10]] saving throw (Perception) to keep the quarry in sight through a bank of thick cloud. On a failed save, you have the &Reference[Blinded] condition until the end of your turn." },
      { range: [3, 3], text: "Make a [[/save dex dc=10]] saving throw to hold steady through a turbulent air pocket. On a failed save, you drop 10 feet and must spend 10 feet of movement regaining altitude." },
      { range: [4, 4], text: "Make a [[/save dex dc=10]] saving throw to avoid a flock of birds or flying vermin scattering into your path. On a failed save, they count as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [5, 5], text: "Make a [[/save dex dc=15]] saving throw as lightning flickers through nearby storm clouds. On a failed save, you take [[/damage 2d6 type=lightning]] damage." },
      { range: [6, 6], text: "Make a [[/save con dc=10]] saving throw against the thin air at altitude. On a failed save, you have the &Reference[Poisoned] condition until the end of your next turn." },
      { range: [7, 12], text: "There is no complication." },
    ],
  },
  {
    name: "Desert Chase Complications",
    results: [
      { range: [1, 1], text: "Make a [[/save str dc=10]] saving throw as your feet sink into loose, shifting sand. On a failed save, it counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [2, 2], text: "Make a [[/save con dc=10]] saving throw as a sudden gust kicks up blinding dust and grit. On a failed save, you have the &Reference[Blinded] condition until the end of your turn." },
      { range: [3, 3], text: "Make a [[/save con dc=10]] saving throw against the scorching heat. On a failed save, you have disadvantage on the next ability check you make before the chase ends." },
      { range: [4, 4], text: "Make a [[/save dex dc=10]] saving throw as a buried ruin or rock formation catches your foot. On a failed save, you have the &Reference[Prone] condition." },
      { range: [5, 5], text: "Make a [[/save dex dc=15]] saving throw as a sinkhole opens beneath you. On a failed save, you fall 10 feet and take [[/damage 1d6 type=bludgeoning]] damage." },
      { range: [6, 6], text: "Make a [[/save con dc=10]] saving throw against the sun glare off pale stone or sand. On a failed save, you have disadvantage on Wisdom (Perception) checks until the end of your next turn." },
      { range: [7, 12], text: "There is no complication." },
    ],
  },
  {
    name: "Arctic & Ice Chase Complications",
    results: [
      { range: [1, 1], text: "Make a [[/save dex dc=10]] saving throw as the ground turns to slick ice underfoot. On a failed save, you have the &Reference[Prone] condition." },
      { range: [2, 2], text: "Make a [[/save str dc=10]] saving throw as deep snowdrifts swallow your steps. On a failed save, it counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [3, 3], text: "Make a [[/save con dc=10]] saving throw as a sudden whiteout squall reduces visibility to nothing. On a failed save, you have the &Reference[Blinded] condition until the end of your turn." },
      { range: [4, 4], text: "Make a [[/save dex dc=15]] saving throw as thin ice gives way beneath you. On a failed save, you fall through into frigid water and take [[/damage 1d6 type=cold]] damage." },
      { range: [5, 5], text: "Make a [[/save con dc=10]] saving throw against the biting wind sapping your grip and footing. On a failed save, you have disadvantage on the next ability check you make before the chase ends." },
      { range: [6, 6], text: "Make a [[/save dex dc=10]] saving throw as an icicle or overhang breaks loose above you. On a failed save, you take [[/damage 1d6 type=bludgeoning]] damage." },
      { range: [7, 12], text: "There is no complication." },
    ],
  },
  {
    name: "Swamp & Marsh Chase Complications",
    results: [
      { range: [1, 1], text: "Make a [[/save str dc=10]] saving throw as thick mud grabs at your legs. On a failed save, it counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [2, 2], text: "Make a [[/save dex dc=10]] saving throw as a hidden root or vine snags your foot. On a failed save, you have the &Reference[Prone] condition." },
      { range: [3, 3], text: "Make a [[/save str dc=10]] or [[/save dex dc=10]] saving throw (your choice) to keep moving at speed through murky, chest-deep water. On a failed save, it counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [4, 4], text: "Make a [[/save con dc=10]] saving throw as a cloud of biting insects descends on you. On a failed save, you have disadvantage on the next ability check you make before the chase ends." },
      { range: [5, 5], text: "Make a [[/save con dc=15]] saving throw as you disturb a patch of poisonous marsh gas. On a failed save, you take [[/damage 1d6 type=poison]] damage." },
      { range: [6, 6], text: "Make a [[/save dex dc=10]] saving throw as rotten, waterlogged planks give way underfoot. On a failed save, you have the &Reference[Prone] condition and take [[/damage 1d4 type=bludgeoning]] damage." },
      { range: [7, 12], text: "There is no complication." },
    ],
  },
  {
    name: "Mounted Chase Complications",
    results: [
      { range: [1, 1], text: "Make a [[/save dex dc=10]] saving throw to keep your seat as your mount startles at a sudden noise or movement. On a failed save, you have the &Reference[Prone] condition, thrown from the saddle." },
      { range: [2, 2], text: "Make a [[/save dex dc=10]] saving throw as loose gravel or uneven ground unsettles your mount's footing. On a failed save, it counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [3, 3], text: "Make a [[/save dex dc=10]] saving throw to steer clear as another rider or beast cuts across your path. On a failed save, you collide and take [[/damage 1d4 type=bludgeoning]] damage." },
      { range: [4, 4], text: "Make a [[/save dex dc=10]] saving throw as low-hanging branches whip at you while you ride. On a failed save, you take [[/damage 1d4 type=slashing]] damage." },
      { range: [5, 5], text: "Make a [[/save wis dc=15]] (Animal Handling) or [[/save dex dc=15]] saving throw (your choice) to keep control as your mount balks at a hazard and rears. On a failed save, you have the &Reference[Prone] condition and your mount doesn't move this round." },
      { range: [6, 6], text: "Make a [[/save dex dc=10]] saving throw as loose tack or a slipping saddle throws off your balance. On a failed save, you have disadvantage on the next ability check you make before the chase ends." },
      { range: [7, 12], text: "There is no complication." },
    ],
  },
  {
    name: "Festival Crowd Chase Complications",
    results: [
      { range: [1, 1], text: "Make a [[/save str dc=10]], [[/save dex dc=10]], or [[/save cha dc=10]] saving throw (your choice) to get past a parade float or performer troupe blocking the way. On a failed save, it counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [2, 2], text: "Make a [[/save dex dc=10]] saving throw as a merchant's stall of wares spills into your path. On a failed save, you have the &Reference[Prone] condition." },
      { range: [3, 3], text: "Make a [[/save dex dc=10]] saving throw as a street performer's act startles you mid-stride. On a failed save, you have the &Reference[Prone] condition." },
      { range: [4, 4], text: "Make a [[/save dex dc=10]] saving throw to shrug free without slowing as a pickpocket or overeager reveler grabs at you. On a failed save, the crowd counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [5, 5], text: "Make a [[/save str dc=15]] or [[/save cha dc=15]] saving throw (your choice) to force through a tight crush of revelers packed shoulder to shoulder. On a failed save, you take [[/damage 1d4 type=bludgeoning]] damage and it counts as 10 feet of &Reference[Difficult Terrain] for you." },
      { range: [6, 6], text: "Make a [[/save con dc=10]] saving throw as confetti, smoke, or fireworks briefly blind you. On a failed save, you have the &Reference[Blinded] condition until the end of your turn." },
      { range: [7, 12], text: "There is no complication." },
    ],
  },
];

const AGE_STAGES = [
  { stage: "Young Adult", min: 18, max: 25 },
  { stage: "Adult",       min: 26, max: 39 },
  { stage: "Middle Aged", min: 40, max: 59 },
  { stage: "Old",         min: 60, max: 80 },
];


const BRANCH = {
  parents: { die: 20, options: [
    { value: "disaster", label: "Something happened to a parent",          lo: 1,  hi: 8 },
    { value: "alive",    label: "Both parents are alive and well",          lo: 9,  hi: 19 },
    { value: "special",  label: "Something special about your parents",     lo: 20, hi: 20 },
  ]},
  standing: { die: 20, options: [
    { value: "good", label: "Good standing",                                lo: 1,  hi: 10 },
    { value: "bad",  label: "Bad standing — at risk of losing everything",  lo: 11, hi: 20 },
  ]},
  romance: { die: 10, options: [
    { value: "healthy",     label: "In a healthy romance",                  lo: 1, hi: 2 },
    { value: "lookout",     label: "On the lookout",                        lo: 3, hi: 6 },
    { value: "tragic",      label: "Recovering from a romantic disaster",   lo: 7, hi: 8 },
    { value: "problematic", label: "In a love affair, but with problems",   lo: 9, hi: 10 },
  ]},
};

// Birth order: weighted 1d100 -> the character's position among their siblings.
const BIRTH_ORDER = [
  { n: 1, lo: 1,  hi: 25 },
  { n: 2, lo: 26, hi: 50 },
  { n: 3, lo: 51, hi: 70 },
  { n: 4, lo: 71, hi: 85 },
  { n: 5, lo: 86, hi: 95 },
  { n: 6, lo: 96, hi: 100 },
];

// Sibling structure odds — all rolled on 1d100, thresholds per the lifepath tables.
const SIBLING_DEATH_PCT = 15;         // a sibling is deceased if roll <= this
const SIBLINGS_NONE_RANGE = [76, 90]; // "No siblings" (only child); outside this you have some
const SIBLINGS_UNKNOWN_MIN = 91;      // 91-100: you have siblings "...as far as you know"
const TWIN_FRATERNAL_MIN = 96;        // 96-98: fraternal twin (adjacent siblings only)
const TWIN_IDENTICAL_MIN = 99;        // 99-100: identical twin
const HALF_SIBLING_MIN = 91;          // 91-100: half-sibling (non-adjacent siblings only)

const ROMANCE_LABEL = {
  healthy: "Currently in a healthy romance",
  lookout: "On the lookout for love",
  tragic: "Recovering from a romantic disaster",
  problematic: "In a love affair, but there are problems",
};

const ROMANCE_DETAIL = {
  healthy:     { table: "romanceHealthy",     label: "How it began" },
  lookout:     { table: "romanceLookout",     label: "What you seek" },
  tragic:      { table: "romanceTragic",      label: "The tragedy" },
  problematic: { table: "romanceProblematic", label: "The complication" },
};

const TRAIT_PAIRS = [
  ["Amorous", "Chaste"], ["Forgiving", "Vengeful"], ["Generous", "Selfish"],
  ["Honest", "Deceitful"], ["Just", "Arbitrary"], ["Merciful", "Cruel"],
  ["Modest", "Proud"], ["Prudent", "Reckless"], ["Temperate", "Indulgent"],
  ["Trusting", "Suspicious"],
];

// ---- Helpers -------------------------------------------------------------
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isINameTheeActive = () => game.modules.get("cv-iname-thee")?.active === true;
const isCCMActive = () => game.modules.get("complete-card-management")?.active === true;

// Icon + label per relationship category, keyed by the role stripped of its trailing "-N" index
// (so "sibling-0", "sibling-1", ... all resolve to the same "sibling" entry). Shared by the
// inline card buttons below and BackstorySheet's own toolbar, so both show the same icon/wording.
const ROLE_META = {
  mother: { icon: "fa-venus", label: "Mother" },
  father: { icon: "fa-mars", label: "Father" },
  sibling: { icon: "fa-people-arrows", label: "Sibling" },
  friend: { icon: "fa-handshake", label: "Friend" },
  enemy: { icon: "fa-sword", label: "Enemy" },
  lover: { icon: "fa-heart", label: "Lover" },
};
const roleMeta = (role) => ROLE_META[String(role).replace(/-\d+$/, "")] ?? { icon: "fa-signature", label: "NPC" };

// A small button baked directly into the generated biography HTML (see _buildBiographyHtml) so a
// GM looking at the finished backstory can spin a named person - mother, father, a sibling, a
// friend/enemy, a lover - into a full NPC via iName Thee, without retyping who they are. Only
// rendered when iName Thee is active and there's an actual name to seed with (not a placeholder).
// `role` is a stable key ("mother", "father", "sibling-0", "friend-1", "lover", ...) later used to
// remember which actor a given person already became, so a second click updates instead of duplicating.
// Deliberately NOT gated on game.user.isGM here: this markup gets baked once into the stored
// description HTML by whoever runs the wizard (often the player, not the GM), then viewed by
// anyone later - baking in a saver-time GM check would mean a GM who opens a player-generated
// backstory afterward never sees the buttons at all. GM-only enforcement instead happens at
// render/view time (character sheet DOM cleanup) and at click time (sendToINameThee).
const iNameTheeBtn = (role, name, concept) => {
  if (!isINameTheeActive() || !name) return "";
  const { icon, label } = roleMeta(role);
  return `<button type="button" class="wicked-iname-thee-btn" data-action="send-to-iname-thee" ` +
    `data-iname-role="${esc(role)}" data-iname-name="${esc(name)}" data-iname-concept="${esc(concept)}" ` +
    `data-tooltip="Generate a full ${label} NPC sheet for ${esc(name)} with iName Thee">` +
    `<i class="fa-solid ${icon}"></i></button>`;
};
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const trunc = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const formatHeight = (inches) => `${Math.floor(inches / 12)}'${inches % 12}"`;
const pickTwoDistinct = (min, max) => {
  if (max <= min) return [min, min];
  const a = randInt(min, max);
  let b = randInt(min, max);
  let guard = 0;
  while (b === a && guard++ < 25) b = randInt(min, max);
  return [a, b].sort((x, y) => x - y);
};

// ---- @Say Pronunciation Enricher ------------------------------------------
// Syntax: @Say[modules/cv-wicked-campaigns/audio/mireth-mcdain.ogg]{Mireth McDain}
const SAY_ENRICHER_PATTERN = /@Say\[(?<path>[^\]]+)\](?:\{(?<label>[^}]+)\})?/g;

function enrichSayLink(match) {
  const { path, label } = match.groups;
  const anchor = document.createElement("a");
  anchor.classList.add("wicked-say-link");
  anchor.dataset.audioPath = path;
  anchor.dataset.tooltip = "Click to hear pronunciation";
  anchor.innerHTML = `<i class="fa-solid fa-volume-high"></i> ${esc(label ?? path)}`;
  return anchor;
}

// ---- Styles --------------------------------------------------------------
const STYLE_ID = "qos-lifepath-styles";
const STYLE_VERSION = "8";
function injectStyles() {
  let style = document.getElementById(STYLE_ID);
  if (style && style.dataset.qbwVersion === STYLE_VERSION) return;
  if (!style) { style = document.createElement("style"); style.id = STYLE_ID; document.head.appendChild(style); }
  style.dataset.qbwVersion = STYLE_VERSION;
  style.textContent = `
    .qos-lifepath-wizard .window-content {
      padding: 0;
      background: var(--color-bg-app, #1b1c20);
      color: var(--color-text, #f0f0f0);
      display: flex;
      flex-direction: column;
    }
    .qbw {
      --gold: var(--dnd5e-color-gold, #c9a054);
      --gold-dim: var(--dnd5e-color-gold-dim, #9a7d2e);
      --ink: var(--color-text, #f0f0f0);
      --ink-dim: var(--color-text-muted, #a59c83);
      --panel: var(--color-bg-app, #1b1c20);
      --panel-2: var(--color-bg-input, rgba(0, 0, 0, 0.25));
      --line: var(--color-border, #444);
      color: var(--ink);
      font-size: 13px;
      line-height: 1.5;
    }
    .qbw-header {
      padding: 14px 18px 10px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--line);
    }
    .qbw-step-no {
      font-size: 11px;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: var(--gold-dim);
    }
    .qbw-title {
      margin: 2px 0 10px;
      font-family: "Cinzel", "Trajan Pro", Georgia, serif;
      font-weight: 600;
      font-size: 21px;
      letter-spacing: .04em;
      color: var(--gold);
    }
    .qbw-progress {
      height: 6px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 3px;
      overflow: hidden;
    }
    .qbw-progress-bar {
      height: 100%;
      background: var(--gold);
      transition: width .25s ease;
    }
    .qbw-main {
      display: flex;
      flex-direction: row;
      align-items: stretch;
      height: 60vh;
    }
    .qbw-body {
      flex: 3 1 0;
      min-height: 0;
      padding: 16px 18px;
      overflow-y: auto;
    }
    .qbw-aside {
      flex: 2 1 0;
      min-height: 0;
      padding: 14px 16px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.25);
      border-left: 1px solid var(--line);
    }
    .qbw-aside-head {
      font-family: "Cinzel", "Trajan Pro", Georgia, serif;
      color: var(--gold-dim);
      font-size: 11px;
      letter-spacing: .16em;
      text-transform: uppercase;
      margin: 0 0 12px;
      padding-bottom: 7px;
      border-bottom: 1px solid var(--line);
    }
    .qbw-aside-head i {
      margin-right: 6px;
    }
    .qbw-label {
      display: block;
      font-size: 11px;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--ink-dim);
      margin: 0 0 6px;
    }
    .qbw-hint {
      font-size: 11.5px;
      color: var(--ink-dim);
      margin: 6px 0 0;
      font-style: italic;
    }
    .qbw-row {
      display: flex;
      gap: 8px;
      align-items: stretch;
      margin-bottom: 12px;
    }
    .qbw-select, .qbw-num {
      width: 100%;
      background: var(--panel-2);
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 13px;
      font-family: inherit;
    }
    .qbw-num {
      width: 70px;
      flex: 0 0 auto;
    }
    .qbw-select:focus, .qbw-num:focus {
      outline: none;
      border-color: var(--gold);
      box-shadow: 0 0 0 2px rgba(201, 160, 84, 0.2);
    }
    .qbw-select option {
      background: var(--color-bg-app, #1b1c20);
      color: var(--ink);
    }
    .qbw-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      background: var(--color-bg-btn, rgba(255, 255, 255, 0.05));
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12.5px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 500;
      transition: background 0.1s ease, border-color 0.1s ease;
    }
    .qbw-btn:hover {
      border-color: var(--gold);
      background: var(--color-bg-btn-hover, rgba(255, 255, 255, 0.1));
    }
    .qbw-btn:disabled {
      opacity: .4;
      cursor: not-allowed;
      background: rgba(255, 255, 255, 0.02);
      border-color: var(--line);
    }
    .qbw-btn i {
      font-size: 11px;
    }
    .qbw-primary {
      background: var(--dnd5e-color-gold, #c9a054);
      color: #111;
      border-color: var(--dnd5e-color-gold-dim, #9a7d2e);
      font-weight: 600;
      text-shadow: none;
    }
    .qbw-primary:hover {
      background: var(--dnd5e-color-gold-hover, #dfb462);
      color: #000;
    }
    .qbw-divider {
      height: 1px;
      background: var(--line);
      margin: 14px 0;
    }
    /* sections + cards */
    .qbw-section-title {
      font-family: "Cinzel", "Trajan Pro", Georgia, serif;
      color: var(--gold);
      font-size: 15px;
      letter-spacing: .04em;
      margin: 20px 0 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid var(--line);
    }
    .qbw-section-title:first-child {
      margin-top: 0;
    }
    .qbw-sub {
      font-size: 11px;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--gold-dim);
      margin: 14px 0 8px;
    }
    .qbw-card {
      background: rgba(0, 0, 0, 0.15);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px 12px;
      margin: 8px 0;
    }
    .qbw-card-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .qbw-card-title {
      font-weight: 600;
      color: var(--ink);
      font-size: 11.5px;
      letter-spacing: .08em;
      text-transform: uppercase;
      flex: 1 1 auto;
    }
    .qbw-card.is-deceased {
      opacity: .72;
      border-style: dashed;
    }
    .qbw-tag {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 7px;
      border-radius: 4px;
      font-size: 9.5px;
      letter-spacing: .06em;
      background: rgba(201, 160, 84, 0.15);
      color: var(--gold);
      vertical-align: middle;
      text-transform: uppercase;
    }
    .qbw-tag-dead {
      background: rgba(190, 70, 70, 0.15);
      color: #f0c2c2;
    }
    .qbw-tag-fraternal, .qbw-tag-identical {
      background: rgba(90, 150, 210, 0.15);
      color: #bcd8f2;
    }
    .qbw-tag-half {
      background: rgba(160, 110, 200, 0.15);
      color: #dcc2f0;
    }
    .qbw-sib-order {
      font-size: 13px;
      color: var(--ink);
      margin: 4px 0 10px;
    }
    .qbw-card-attrs {
      display: flex;
      align-items: center;
      gap: 18px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .qbw-mini {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--ink);
    }
    .qbw-mini-note {
      font-size: 11px;
      color: var(--gold-dim);
      font-style: italic;
    }
    .qbw-inline {
      display: inline-block;
      width: auto;
      min-width: 88px;
      margin: 0 2px;
      padding: 3px 8px;
      vertical-align: middle;
    }
    .qbw-iconbtn {
      background: none;
      border: 1px solid var(--line);
      color: var(--ink-dim);
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 11px;
      transition: color 0.1s, border-color 0.1s;
    }
    .qbw-iconbtn:hover {
      color: var(--gold);
      border-color: var(--gold);
    }
    .qbw-count {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .qbw-check {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--ink);
      margin: 6px 0;
      cursor: pointer;
    }
    .qbw-check input {
      accent-color: var(--gold);
      width: 16px;
      height: 16px;
    }
    .qbw-modes {
      display: flex;
      gap: 6px;
      margin: 10px 0;
    }
    /* trait pairs */
    .qbw-pair {
      display: grid;
      grid-template-columns: 1fr 24px 1fr;
      align-items: center;
      gap: 6px 10px;
      padding: 9px 0;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
    }
    .qbw-pair-l {
      text-align: right;
      font-size: 12.5px;
    }
    .qbw-pair-r {
      text-align: left;
      font-size: 12.5px;
    }
    .qbw-pair-mid {
      text-align: center;
      color: var(--ink-dim);
    }
    .qbw-pair-name {
      color: var(--ink);
    }
    .qbw-pair-val {
      color: var(--gold);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .qbw-slider {
      grid-column: 1 / -1;
      width: 100%;
      accent-color: var(--gold);
      cursor: pointer;
    }
    .qbw-budget {
      font-size: 11.5px;
      color: var(--ink-dim);
      margin-top: 10px;
      font-style: italic;
    }
    /* live preview pane */
    .qbw-preview {
      font-size: 12.5px;
      color: var(--ink-dim);
    }
    .qbw-empty-note {
      color: var(--ink-dim);
      font-style: italic;
    }
    .qbw-preview h1 {
      font-size: 16px;
      color: var(--gold);
      font-family: "Cinzel", Georgia, serif;
      margin: 0 0 8px;
    }
    .qbw-preview h2 {
      font-size: 12px;
      color: var(--gold-dim);
      margin: 12px 0 4px;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .qbw-preview h3 {
      font-size: 12px;
      color: var(--ink);
      margin: 8px 0 3px;
    }
    .qbw-preview p {
      margin: 3px 0;
    }
    .qbw-preview ul {
      margin: 3px 0 3px 18px;
      padding: 0;
    }
    .qbw-preview li {
      margin: 2px 0;
    }
    .qbw-preview strong {
      color: var(--ink);
    }
    .qbw-foot-check {
      font-size: 11.5px;
      color: var(--ink-dim);
      margin: 0;
    }
    .qbw-foot-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      padding: 3px 9px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .qbw-foot-status.is-ok {
      color: #bfe6c6;
      background: rgba(76, 160, 90, 0.16);
    }
    .qbw-foot-status.is-err {
      color: #f0c2c2;
      background: rgba(190, 70, 70, 0.16);
    }
    .qbw-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 18px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid var(--line);
    }
    .qbw-spacer {
      flex: 1 1 auto;
    }
    .qbw-input {
      width: 100%;
      background: var(--panel-2);
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 13px;
      font-family: inherit;
    }
    .qbw-input:focus {
      outline: none;
      border-color: var(--gold);
      box-shadow: 0 0 0 2px rgba(201, 160, 84, 0.2);
    }
    .qbw-group {
      margin-top: 10px;
    }
    .qbw-group-label {
      font-size: 10.5px;
      letter-spacing: .14em;
      text-transform: uppercase;
      color: var(--gold-dim);
      margin: 0 0 5px;
    }
    .qbw-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .qbw-chip {
      background: var(--panel-2);
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 5px 12px;
      font-size: 12.5px;
      cursor: pointer;
      min-width: 58px;
      text-align: center;
      transition: all .12s;
      font-variant-numeric: tabular-nums;
      font-family: inherit;
    }
    .qbw-chip:hover {
      border-color: var(--gold);
      color: #fff;
      background: var(--color-bg-btn-hover, rgba(255, 255, 255, 0.1));
    }
    .qbw-chip.is-active {
      background: var(--gold);
      color: #111;
      border-color: var(--gold-dim);
      font-weight: 600;
    }
    .qbw-personal-summary h3 {
      font-family: "Cinzel", "Trajan Pro", Georgia, serif;
      font-size: 13px;
      color: var(--gold);
      margin-top: 0;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 4px;
    }
    .qbw-personal-summary ul {
      list-style: none;
      padding: 0;
      margin: 0 0 10px 0;
    }
    .qbw-personal-summary li {
      font-size: 11.5px;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .qbw-personal-summary li strong {
      color: var(--gold-dim);
    }
  `;
}

// ---- Campaign Codex Integration -------------------------------------------
// Wicked Campaigns requires Campaign Codex to be installed and active; backstories
// are saved as Campaign Codex "backstory" journal entries so they show up in its
// searchable Table of Contents instead of piling up as pages in one shared journal.
const CC_MODULE_ID = "campaign-codex";
const CC_BACKSTORY_TYPE = "backstory";
// Campaign Codex's TOC/group views use `doc.iconOverride || TemplateComponents.getAsset(...)`
// for their display icon; setting this flag is the documented way to get a real icon
// instead of the generic fallback for a type Campaign Codex doesn't know about.
const BACKSTORY_ICON = "fas fa-book-skull";
const PARTY_ICON = "fas fa-users";
const CC_SESSION_ZERO_TYPE = "session-zero-summary";
const SESSION_ZERO_ICON = "fas fa-clipboard-question";

function isCampaignCodexActive() {
  return game.modules.get(CC_MODULE_ID)?.active === true;
}

// ---- Campaign Codex Integration: Video Player Widget ----------------------
// Registered against Campaign Codex's own widgetManager (exposed at
// game.modules.get("campaign-codex").api) so it shows up in every sheet's widget
// tray alongside their built-in widgets - see registerVideoPlayerWidget() in the
// ready hook. Playback is independent per viewer (no cross-client sync) and never
// autoplays, matching how a plain <video>/YouTube embed behaves by default.
// Handles a single video, a bare playlist link (youtube.com/playlist?list=... has no v= at all),
// and a video-within-a-playlist link (watch?v=X&list=Y) - returns null only if neither a video
// nor a playlist id could be found.
function parseYouTubeUrl(url) {
  const str = String(url || "").trim();
  if (!str) return null;

  const videoMatch = str.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const listMatch = str.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  const videoId = videoMatch ? videoMatch[1] : null;
  const playlistId = listMatch ? listMatch[1] : null;

  if (!videoId && !playlistId) return null;
  return { videoId, playlistId };
}

function buildYouTubeEmbedUrl({ videoId, playlistId } = {}) {
  if (videoId && playlistId) return `https://www.youtube-nocookie.com/embed/${videoId}?list=${playlistId}`;
  if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;
  if (playlistId) return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}`;
  return null;
}

function buildVideoPlayerWidgetClass(CampaignCodexWidgetBase) {
  return class VideoPlayerWidget extends CampaignCodexWidgetBase {
    async _prepareContext() {
      const data = (await this.getData()) || {};
      const sourceType = data.sourceType === "youtube" ? "youtube" : "local";
      const src = String(data.src || "").trim();
      const youtube = sourceType === "youtube" ? parseYouTubeUrl(src) : null;
      return {
        sourceType,
        src,
        youtubeEmbedUrl: youtube ? buildYouTubeEmbedUrl(youtube) : null,
        hasVideo: sourceType === "youtube" ? !!youtube : !!src,
      };
    }

    async render() {
      const data = await this._prepareContext();
      let bodyHtml;

      if (!data.hasVideo) {
        bodyHtml = this.isGM
          ? `<div class="cc-video-empty">
              <i class="fa-solid fa-clapperboard"></i>
              <span>No video set</span>
              <div class="cc-video-choose-actions">
                <button type="button" data-action="choose-local"><i class="fa-solid fa-folder-open"></i> Local File</button>
                <button type="button" data-action="choose-youtube" title="Video, playlist, or a video-within-a-playlist link"><i class="fa-brands fa-youtube"></i> YouTube Link</button>
              </div>
            </div>`
          : `<div class="cc-video-empty"><span>No video available.</span></div>`;
      } else if (data.sourceType === "youtube") {
        bodyHtml = `<div class="cc-video-embed-wrap">
            <iframe src="${data.youtubeEmbedUrl}" title="YouTube video" frameborder="0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>`;
      } else {
        bodyHtml = `<video controls src="${foundry.utils.escapeHTML(data.src)}"></video>`;
      }

      const gmControls = this.isGM && data.hasVideo
        ? `<div class="cc-video-controls">
            <i class="fa-solid fa-pen" data-action="change-video" title="Change Video"></i>
            <i class="fa-solid fa-trash" data-action="remove-video" title="Remove Video"></i>
          </div>`
        : "";

      return `<div class="cc-widget-video-player" id="widget-${this.widgetId}">${gmControls}${bodyHtml}</div>`;
    }

    async activateListeners(htmlElement) {
      if (!this.isGM) return;
      htmlElement.querySelector('[data-action="choose-local"]')?.addEventListener("click", () => this._chooseLocalFile(htmlElement));
      htmlElement.querySelector('[data-action="choose-youtube"]')?.addEventListener("click", () => this._chooseYoutubeLink(htmlElement));
      htmlElement.querySelector('[data-action="change-video"]')?.addEventListener("click", () => this._changeVideo(htmlElement));
      htmlElement.querySelector('[data-action="remove-video"]')?.addEventListener("click", () => this._removeVideo(htmlElement));
    }

    _chooseLocalFile(htmlElement) {
      new FilePicker({
        type: "video",
        callback: async (path) => {
          if (!path) return;
          await this.saveData({ sourceType: "local", src: path });
          await this._refreshWidget(htmlElement);
        },
      }).browse();
    }

    async _chooseYoutubeLink(htmlElement) {
      const url = await foundry.applications.api.DialogV2.prompt({
        window: { title: "YouTube Video or Playlist Link" },
        content: `<div class="form-group"><label>YouTube URL</label><input type="text" name="youtubeUrl" placeholder="Video, playlist, or a video-within-a-playlist link" autofocus></div>`,
        ok: {
          icon: "fas fa-check",
          label: "Save",
          callback: (event, button) => button.form.elements.youtubeUrl.value.trim(),
        },
        rejectClose: false,
      }).catch(() => null);
      if (!url) return;

      if (!parseYouTubeUrl(url)) {
        ui.notifications.warn("That doesn't look like a valid YouTube video or playlist link.");
        return;
      }

      await this.saveData({ sourceType: "youtube", src: url });
      await this._refreshWidget(htmlElement);
    }

    async _changeVideo(htmlElement) {
      await this.saveData({ sourceType: "local", src: "" });
      await this._refreshWidget(htmlElement);
    }

    async _removeVideo(htmlElement) {
      const confirmed = await this.confirmationDialog("Remove this video?");
      if (!confirmed) return;
      await this.removeData();
      await this._refreshWidget(htmlElement);
    }
  };
}

function registerVideoPlayerWidget() {
  const ccApi = game.modules.get(CC_MODULE_ID)?.api;
  if (!ccApi?.widgetManager || !ccApi?.CampaignCodexWidget) {
    console.warn("Wicked Campaigns | Campaign Codex's widget API wasn't found - skipping Video Player widget registration.");
    return;
  }
  const VideoPlayerWidget = buildVideoPlayerWidgetClass(ccApi.CampaignCodexWidget);
  ccApi.widgetManager.registerWidget("WC-Video Player", VideoPlayerWidget);
}

// Serializes mutations to a WC- widget's saved data through a single per-instance queue.
// Foundry's document update replaces a saved array wholesale rather than deep-merging into
// individual elements, so widget mutations here read-modify-write the whole array - which
// means two edits fired close together (e.g. removing two pills back to back) would otherwise
// each read their own stale snapshot and clobber each other's change on save. The widget
// instance itself is reused across re-renders (see WidgetManager #_ensureWidgetInstance), so a
// queue stored on the instance correctly persists across separate DOM events.
function queueWidgetWrite(instance, fn) {
  const run = () => Promise.resolve().then(fn);
  instance._writeQueue = (instance._writeQueue || Promise.resolve()).then(run, run);
  return instance._writeQueue;
}

// ---- Campaign Codex Integration: Mannerisms Widget -------------------------
// A half-width widget (see the [data-widget-type="WC-Mannerisms"] flex override in
// cv-wicked-campaigns.css) with an editable title and a set of plain-text pill tags -
// e.g. "sarcastic", "chews on quills". Meant to sit next to other half-width WC- widgets
// in the same widget row. Compact by default (what players always see); a GM-only pencil
// icon toggles per-widget edit mode, which reveals the add/remove/title controls.
function buildMannerismsWidgetClass(CampaignCodexWidgetBase) {
  return class MannerismsWidget extends CampaignCodexWidgetBase {
    async _prepareContext() {
      const data = (await this.getData()) || {};
      const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Mannerisms";
      const editMode = this.isGM && data.editMode === true;
      const pills = Array.isArray(data.pills) ? data.pills.filter((p) => typeof p === "string" && p.trim()) : [];
      return { title, editMode, pills };
    }

    async render() {
      const data = await this._prepareContext();

      const titleHtml = data.editMode
        ? `<input type="text" class="mannerism-title-input" data-action="edit-title" value="${foundry.utils.escapeHTML(data.title)}" placeholder="Title" maxlength="60">`
        : `<h3 class="mannerism-title">${foundry.utils.escapeHTML(data.title)}</h3>`;

      const editToggle = this.isGM
        ? `<i class="fa-solid ${data.editMode ? "fa-check" : "fa-pen"} mannerism-edit-toggle" data-action="toggle-edit" title="${data.editMode ? "Done" : "Edit"}"></i>`
        : "";

      const pillsHtml = data.pills.map((label, index) => `
          <span class="mannerism-pill">
            <span class="mannerism-pill-label">${foundry.utils.escapeHTML(label)}</span>
            ${data.editMode ? `<i class="fa-solid fa-xmark mannerism-pill-remove" data-action="remove-pill" data-index="${index}" title="Remove"></i>` : ""}
          </span>
        `).join("");

      const pillsBody = data.pills.length
        ? `<div class="mannerism-pills">${pillsHtml}</div>`
        : `<div class="mannerism-empty">${data.editMode ? "No mannerisms yet." : "No mannerisms recorded."}</div>`;

      const addRow = data.editMode
        ? `<div class="mannerism-add-row">
            <input type="text" class="mannerism-add-input" data-action="pill-input" placeholder="Add a mannerism..." maxlength="50">
            <button type="button" class="mannerism-add-btn" data-action="add-pill" title="Add"><i class="fa-solid fa-plus"></i></button>
          </div>`
        : "";

      return `<div class="cc-widget-mannerisms" id="widget-${this.widgetId}">
          <div class="mannerism-header">${titleHtml}${editToggle}</div>
          ${pillsBody}
          ${addRow}
        </div>`;
    }

    async activateListeners(htmlElement) {
      if (!this.isGM) return;

      htmlElement.querySelector('[data-action="toggle-edit"]')?.addEventListener("click", async () => {
        await queueWidgetWrite(this, async () => {
          const data = (await this.getData()) || {};
          await this.saveData({ ...data, editMode: !(data.editMode === true) });
        });
        await this._refreshWidget(htmlElement);
      });

      htmlElement.querySelector('[data-action="edit-title"]')?.addEventListener("change", async (event) => {
        const title = event.target.value;
        await queueWidgetWrite(this, async () => {
          const data = (await this.getData()) || {};
          await this.saveData({ ...data, title: title.trim() || "Mannerisms" });
        });
      });

      const addInput = htmlElement.querySelector('[data-action="pill-input"]');
      const submitAdd = async () => {
        const value = addInput.value.trim();
        if (!value) return;
        await this._addPill(value, htmlElement);
      };
      htmlElement.querySelector('[data-action="add-pill"]')?.addEventListener("click", submitAdd);
      addInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submitAdd();
        }
      });

      htmlElement.querySelectorAll('[data-action="remove-pill"]').forEach((el) => {
        el.addEventListener("click", async () => {
          await this._removePill(Number(el.dataset.index), htmlElement);
        });
      });
    }

    async _addPill(label, htmlElement) {
      let blocked = false;
      await queueWidgetWrite(this, async () => {
        const data = (await this.getData()) || {};
        const pills = Array.isArray(data.pills) ? [...data.pills] : [];
        if (pills.some((p) => p.toLowerCase() === label.toLowerCase())) {
          ui.notifications.warn(`"${label}" is already in the list.`);
          blocked = true;
          return;
        }
        pills.push(label);
        await this.saveData({ ...data, pills });
      });
      if (!blocked) await this._refreshWidget(htmlElement);
    }

    async _removePill(index, htmlElement) {
      await queueWidgetWrite(this, async () => {
        const data = (await this.getData()) || {};
        const pills = Array.isArray(data.pills) ? [...data.pills] : [];
        if (index < 0 || index >= pills.length) return;
        pills.splice(index, 1);
        await this.saveData({ ...data, pills });
      });
      await this._refreshWidget(htmlElement);
    }
  };
}

function registerMannerismsWidget() {
  const ccApi = game.modules.get(CC_MODULE_ID)?.api;
  if (!ccApi?.widgetManager || !ccApi?.CampaignCodexWidget) {
    console.warn("Wicked Campaigns | Campaign Codex's widget API wasn't found - skipping Mannerisms widget registration.");
    return;
  }
  const MannerismsWidget = buildMannerismsWidgetClass(ccApi.CampaignCodexWidget);
  ccApi.widgetManager.registerWidget("WC-Mannerisms", MannerismsWidget);
}

// ---- Campaign Codex Integration: Personality Widget ------------------------
// A half-width widget (see [data-widget-type="WC-Personality"] in cv-wicked-campaigns.css),
// same shell as the Mannerisms widget, but each pill carries its own GM-picked color -
// matching the existing hand-written "Personality" trait pills already used on NPC sheets
// (e.g. Jemma Brightflame's Info tab: distinct saturated background per trait, white text).
function buildPersonalityWidgetClass(CampaignCodexWidgetBase) {
  return class PersonalityWidget extends CampaignCodexWidgetBase {
    async _prepareContext() {
      const data = (await this.getData()) || {};
      const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Personality";
      const editMode = this.isGM && data.editMode === true;
      const pills = Array.isArray(data.pills)
        ? data.pills.filter((p) => p && typeof p.label === "string" && p.label.trim())
        : [];
      return { title, editMode, pills };
    }

    async render() {
      const data = await this._prepareContext();

      const titleHtml = data.editMode
        ? `<input type="text" class="personality-title-input" data-action="edit-title" value="${foundry.utils.escapeHTML(data.title)}" placeholder="Title" maxlength="60">`
        : `<h3 class="personality-title">${foundry.utils.escapeHTML(data.title)}</h3>`;

      const editToggle = this.isGM
        ? `<i class="fa-solid ${data.editMode ? "fa-check" : "fa-pen"} personality-edit-toggle" data-action="toggle-edit" title="${data.editMode ? "Done" : "Edit"}"></i>`
        : "";

      const pillsHtml = data.pills.map((pill, index) => {
        const color = /^#[0-9a-f]{6}$/i.test(pill.color || "") ? pill.color : "#4a4a4a";
        return `
          <span class="personality-pill" style="background: ${color}; border-color: color-mix(in srgb, ${color} 70%, black);">
            <span class="personality-pill-label">${foundry.utils.escapeHTML(pill.label)}</span>
            ${data.editMode ? `<i class="fa-solid fa-xmark personality-pill-remove" data-action="remove-pill" data-index="${index}" title="Remove"></i>` : ""}
          </span>
        `;
      }).join("");

      const pillsBody = data.pills.length
        ? `<div class="personality-pills">${pillsHtml}</div>`
        : `<div class="personality-empty">${data.editMode ? "No traits yet." : "No personality traits recorded."}</div>`;

      const addRow = data.editMode
        ? `<div class="personality-add-row">
            <input type="text" class="personality-add-input" data-action="pill-input" placeholder="Add a trait..." maxlength="30">
            <input type="color" class="personality-add-color" data-action="pill-color" value="#4a4a4a" title="Pill color">
            <button type="button" class="personality-add-btn" data-action="add-pill" title="Add"><i class="fa-solid fa-plus"></i></button>
          </div>`
        : "";

      return `<div class="cc-widget-personality" id="widget-${this.widgetId}">
          <div class="personality-header">${titleHtml}${editToggle}</div>
          ${pillsBody}
          ${addRow}
        </div>`;
    }

    async activateListeners(htmlElement) {
      if (!this.isGM) return;

      htmlElement.querySelector('[data-action="toggle-edit"]')?.addEventListener("click", async () => {
        await queueWidgetWrite(this, async () => {
          const data = (await this.getData()) || {};
          await this.saveData({ ...data, editMode: !(data.editMode === true) });
        });
        await this._refreshWidget(htmlElement);
      });

      htmlElement.querySelector('[data-action="edit-title"]')?.addEventListener("change", async (event) => {
        const title = event.target.value;
        await queueWidgetWrite(this, async () => {
          const data = (await this.getData()) || {};
          await this.saveData({ ...data, title: title.trim() || "Personality" });
        });
      });

      const addInput = htmlElement.querySelector('[data-action="pill-input"]');
      const addColor = htmlElement.querySelector('[data-action="pill-color"]');
      const submitAdd = async () => {
        const label = addInput.value.trim();
        if (!label) return;
        await this._addPill(label, addColor.value, htmlElement);
      };
      htmlElement.querySelector('[data-action="add-pill"]')?.addEventListener("click", submitAdd);
      addInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submitAdd();
        }
      });

      htmlElement.querySelectorAll('[data-action="remove-pill"]').forEach((el) => {
        el.addEventListener("click", async () => {
          await this._removePill(Number(el.dataset.index), htmlElement);
        });
      });
    }

    async _addPill(label, color, htmlElement) {
      let blocked = false;
      await queueWidgetWrite(this, async () => {
        const data = (await this.getData()) || {};
        const pills = Array.isArray(data.pills) ? [...data.pills] : [];
        if (pills.some((p) => p.label.toLowerCase() === label.toLowerCase())) {
          ui.notifications.warn(`"${label}" is already in the list.`);
          blocked = true;
          return;
        }
        pills.push({ label, color: /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#4a4a4a" });
        await this.saveData({ ...data, pills });
      });
      if (!blocked) await this._refreshWidget(htmlElement);
    }

    async _removePill(index, htmlElement) {
      await queueWidgetWrite(this, async () => {
        const data = (await this.getData()) || {};
        const pills = Array.isArray(data.pills) ? [...data.pills] : [];
        if (index < 0 || index >= pills.length) return;
        pills.splice(index, 1);
        await this.saveData({ ...data, pills });
      });
      await this._refreshWidget(htmlElement);
    }
  };
}

function registerPersonalityWidget() {
  const ccApi = game.modules.get(CC_MODULE_ID)?.api;
  if (!ccApi?.widgetManager || !ccApi?.CampaignCodexWidget) {
    console.warn("Wicked Campaigns | Campaign Codex's widget API wasn't found - skipping Personality widget registration.");
    return;
  }
  const PersonalityWidget = buildPersonalityWidgetClass(ccApi.CampaignCodexWidget);
  ccApi.widgetManager.registerWidget("WC-Personality", PersonalityWidget);
}

// ---- Campaign Codex Integration: Motives Widget -----------------------------
// A half-width widget showing a standalone list of want/aversion "motive" bars, -20 to +20 -
// visually similar to the NPC actor sheet's Motives tab, but purely a display tool: no roll
// buttons, no hidden/partial/public visibility gating, and its own separate data (not linked
// to any actor - same standalone-data approach as Mannerisms/Personality). The compact view
// (what players always see, and what GMs see outside of edit mode) renders each motive as a
// marker on a fixed red-to-green gradient meter; edit mode (GM-only, toggled per-widget) adds
// the same preset/custom add flow and slider+number value editing as the sheet's Motives tab.
const MOTIVE_WIDGET_PRESETS = [
  "Money", "Safety", "Glory", "Food", "Status", "Revenge", "Power",
  "Curiosity", "Honor", "Friendship", "Pleasure", "Romance"
];

// Same HSL formula as the NPC sheet's motive sliders/token bars, reused here so the marker
// color on the compact meter matches the sheet's language for "how intense is this drive".
function motiveWidgetColor(value) {
  const v = Math.max(-20, Math.min(20, Number(value) || 0));
  if (v > 0) {
    const intensity = v / 20;
    return `hsl(${45 + (120 - 45) * intensity}, ${55 + 25 * intensity}%, ${40 + 5 * intensity}%)`;
  } else if (v < 0) {
    const intensity = Math.abs(v) / 20;
    return `hsl(${35 - 35 * intensity}, ${65 + 25 * intensity}%, ${40 + 5 * intensity}%)`;
  }
  return "hsl(0, 0%, 50%)";
}

function buildMotivesWidgetClass(CampaignCodexWidgetBase) {
  return class MotivesWidget extends CampaignCodexWidgetBase {
    async _prepareContext() {
      const data = (await this.getData()) || {};
      const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Motives";
      const editMode = this.isGM && data.editMode === true;
      const motives = Array.isArray(data.motives)
        ? data.motives.filter((m) => m && typeof m.label === "string" && m.label.trim())
        : [];
      return {
        title,
        editMode,
        motives: motives.map((m) => ({
          label: m.label,
          value: Math.max(-20, Math.min(20, Number(m.value) || 0)),
        })),
      };
    }

    async render() {
      const data = await this._prepareContext();

      const titleHtml = data.editMode
        ? `<input type="text" class="motivesw-title-input" data-action="edit-title" value="${foundry.utils.escapeHTML(data.title)}" placeholder="Title" maxlength="60">`
        : `<h3 class="motivesw-title">${foundry.utils.escapeHTML(data.title)}</h3>`;

      const editToggle = this.isGM
        ? `<i class="fa-solid ${data.editMode ? "fa-check" : "fa-pen"} motivesw-edit-toggle" data-action="toggle-edit" title="${data.editMode ? "Done" : "Edit"}"></i>`
        : "";

      const rowsHtml = data.motives.map((m, index) => {
        if (data.editMode) {
          return `
            <div class="motivesw-row motivesw-row-edit">
              <input type="text" class="motivesw-label-input" data-action="edit-label" data-index="${index}" value="${foundry.utils.escapeHTML(m.label)}" placeholder="Motive Name">
              <input type="range" min="-20" max="20" class="motivesw-slider-input" data-index="${index}" value="${m.value}">
              <input type="number" min="-20" max="20" class="motivesw-value-input" data-index="${index}" value="${m.value}">
              <i class="fa-solid fa-trash motivesw-remove" data-action="remove-motive" data-index="${index}" title="Remove"></i>
            </div>`;
        }
        const pct = ((m.value + 20) / 40) * 100;
        const color = motiveWidgetColor(m.value);
        return `
          <div class="motivesw-row">
            <span class="motivesw-label" title="${foundry.utils.escapeHTML(m.label)}">${foundry.utils.escapeHTML(m.label)}</span>
            <div class="motivesw-meter">
              <div class="motivesw-meter-marker" style="left: ${pct}%; background: ${color};"></div>
            </div>
            <span class="motivesw-value">${m.value > 0 ? "+" : ""}${m.value}</span>
          </div>`;
      }).join("");

      const bodyHtml = data.motives.length
        ? `<div class="motivesw-list">${rowsHtml}</div>`
        : `<div class="motivesw-empty">${data.editMode ? "No motives yet." : "No motives recorded."}</div>`;

      const addRow = data.editMode
        ? `<div class="motivesw-add-row">
            <select class="motivesw-preset-select" data-action="preset-select">
              ${MOTIVE_WIDGET_PRESETS.map((p) => `<option value="${p}">${p}</option>`).join("")}
              <option value="custom">Custom...</option>
            </select>
            <input type="text" class="motivesw-custom-input" data-action="custom-input" placeholder="Enter motive..." style="display:none;">
            <button type="button" class="motivesw-add-btn" data-action="add-motive" title="Add"><i class="fa-solid fa-plus"></i></button>
          </div>`
        : "";

      return `<div class="cc-widget-motives" id="widget-${this.widgetId}">
          <div class="motivesw-header">${titleHtml}${editToggle}</div>
          ${bodyHtml}
          ${addRow}
        </div>`;
    }

    async activateListeners(htmlElement) {
      if (!this.isGM) return;

      htmlElement.querySelector('[data-action="toggle-edit"]')?.addEventListener("click", async () => {
        await queueWidgetWrite(this, async () => {
          const data = (await this.getData()) || {};
          await this.saveData({ ...data, editMode: !(data.editMode === true) });
        });
        await this._refreshWidget(htmlElement);
      });

      htmlElement.querySelector('[data-action="edit-title"]')?.addEventListener("change", async (event) => {
        const title = event.target.value.trim();
        await queueWidgetWrite(this, async () => {
          const data = (await this.getData()) || {};
          await this.saveData({ ...data, title: title || "Motives" });
        });
      });

      const presetSelect = htmlElement.querySelector('[data-action="preset-select"]');
      const customInput = htmlElement.querySelector('[data-action="custom-input"]');
      presetSelect?.addEventListener("change", () => {
        customInput.style.display = presetSelect.value === "custom" ? "inline-block" : "none";
      });

      htmlElement.querySelector('[data-action="add-motive"]')?.addEventListener("click", async () => {
        let label = presetSelect?.value || "";
        if (label === "custom") {
          label = customInput?.value.trim() || "";
          if (customInput) customInput.value = "";
        }
        if (!label) return;
        await this._addMotive(label, htmlElement);
      });

      htmlElement.querySelectorAll('[data-action="remove-motive"]').forEach((el) => {
        el.addEventListener("click", async () => {
          await this._removeMotive(Number(el.dataset.index), htmlElement);
        });
      });

      htmlElement.querySelectorAll('[data-action="edit-label"]').forEach((input) => {
        input.addEventListener("change", async (event) => {
          await this._updateMotiveLabel(Number(input.dataset.index), event.target.value.trim(), htmlElement);
        });
      });

      htmlElement.querySelectorAll(".motivesw-slider-input").forEach((slider) => {
        const index = Number(slider.dataset.index);
        const numInput = htmlElement.querySelector(`.motivesw-value-input[data-index="${index}"]`);
        slider.addEventListener("input", () => {
          if (numInput) numInput.value = slider.value;
        });
        slider.addEventListener("change", async () => {
          await this._updateMotiveValue(index, Number(slider.value), htmlElement);
        });
      });

      htmlElement.querySelectorAll(".motivesw-value-input").forEach((numInput) => {
        const index = Number(numInput.dataset.index);
        numInput.addEventListener("change", async () => {
          const val = Math.max(-20, Math.min(20, Number(numInput.value) || 0));
          numInput.value = val;
          const slider = htmlElement.querySelector(`.motivesw-slider-input[data-index="${index}"]`);
          if (slider) slider.value = val;
          await this._updateMotiveValue(index, val, htmlElement);
        });
      });
    }

    async _addMotive(label, htmlElement) {
      let blocked = false;
      await queueWidgetWrite(this, async () => {
        const data = (await this.getData()) || {};
        const motives = Array.isArray(data.motives) ? [...data.motives] : [];
        if (motives.some((m) => m.label.toLowerCase() === label.toLowerCase())) {
          ui.notifications.warn(`"${label}" is already in the list.`);
          blocked = true;
          return;
        }
        motives.push({ label, value: 0 });
        await this.saveData({ ...data, motives });
      });
      if (!blocked) await this._refreshWidget(htmlElement);
    }

    async _removeMotive(index, htmlElement) {
      await queueWidgetWrite(this, async () => {
        const data = (await this.getData()) || {};
        const motives = Array.isArray(data.motives) ? [...data.motives] : [];
        if (index < 0 || index >= motives.length) return;
        motives.splice(index, 1);
        await this.saveData({ ...data, motives });
      });
      await this._refreshWidget(htmlElement);
    }

    async _updateMotiveLabel(index, label, htmlElement) {
      if (!label) return;
      let blocked = false;
      await queueWidgetWrite(this, async () => {
        const data = (await this.getData()) || {};
        const motives = Array.isArray(data.motives) ? [...data.motives] : [];
        if (index < 0 || index >= motives.length) return;
        if (motives.some((m, i) => i !== index && m.label.toLowerCase() === label.toLowerCase())) {
          ui.notifications.warn(`"${label}" is already in the list.`);
          blocked = true;
          return;
        }
        motives[index] = { ...motives[index], label };
        await this.saveData({ ...data, motives });
      });
      if (blocked) await this._refreshWidget(htmlElement);
    }

    async _updateMotiveValue(index, value, htmlElement) {
      await queueWidgetWrite(this, async () => {
        const data = (await this.getData()) || {};
        const motives = Array.isArray(data.motives) ? [...data.motives] : [];
        if (index < 0 || index >= motives.length) return;
        motives[index] = { ...motives[index], value: Math.max(-20, Math.min(20, value)) };
        await this.saveData({ ...data, motives });
      });
    }
  };
}

function registerMotivesWidget() {
  const ccApi = game.modules.get(CC_MODULE_ID)?.api;
  if (!ccApi?.widgetManager || !ccApi?.CampaignCodexWidget) {
    console.warn("Wicked Campaigns | Campaign Codex's widget API wasn't found - skipping Motives widget registration.");
    return;
  }
  const MotivesWidget = buildMotivesWidgetClass(ccApi.CampaignCodexWidget);
  ccApi.widgetManager.registerWidget("WC-Motives", MotivesWidget);
}

// Wicked Campaigns' house look for Campaign Codex. Applied once per world on
// first ready (see the "appliedDefaultCCTheme" setting below) so a GM gets a
// styled Campaign Codex out of the box, without permanently overriding a
// theme they've since customized further through CC's own "Configure Colors"
// menu. `color-accent80/30/10` are deliberately omitted: setting `color-accent`
// makes Campaign Codex derive and set those three itself (settings.js).
const WICKED_CC_THEME = {
  "themeEnabled": true,
  "color-primary": "#0b0317",
  "color-slate": "#5a6268",
  "color-textMuted": "#292929",
  "color-sidebarBg": "#0b0317",
  "color-sidebarText": "#ffffff",
  "color-success": "#28a745",
  "color-danger": "#dc3545",
  "color-accent": "#7d6f4f",
  "color-mainBg": "#b1a491",
  "color-mainText": "#000000",
  "color-border": "#444444",
  "color-cardBg": "#e1bf84",
  "color-fontHeading": "Modesto Condensed",
  "color-fontBody": "",
  "color-backgroundImage": "",
  "color-backgroundImageTile": false,
  "color-backgroundOpacity": 100,
  "color-anchorImage": false,
  "color-themeOverrideToLight": "light",
  "useStyledTocButton": true,
};

async function applyDefaultCampaignCodexTheme() {
  if (!isCampaignCodexActive()) return;
  for (const [key, value] of Object.entries(WICKED_CC_THEME)) {
    await game.settings.set(CC_MODULE_ID, key, value);
  }
  console.log("Wicked Campaigns | Applied the default Campaign Codex color theme.");

  await ChatMessage.create({
    content: `
        <div class="dnd5e chat-card wicked-trait-card" style="font-family: 'Signika', sans-serif; background: #1c1c1c; border: 1px solid rgba(201, 160, 84, 0.25); border-radius: 6px; padding: 0.75rem 1rem;">
            <div class="card-content" style="padding: 0.5rem 0; text-align: center;">
                <h3 style="font-family: 'Cinzel', Georgia, serif; color: #c9a054; margin: 0 0 0.5rem 0; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                    <i class="fa-solid fa-palette"></i> Campaign Codex Theme Applied
                </h3>
                <p style="margin: 0.25rem 0 0.75rem 0; font-size: 0.9rem; color: #d5d5d5;">
                    Wicked Campaigns applied its default Campaign Codex color theme to this world (first time only). You can adjust or revert it any time via Campaign Codex's own <strong>Configure Colors</strong> settings menu.
                </p>
            </div>
        </div>
    `,
    speaker: { alias: "Wicked Campaigns" },
    whisper: ChatMessage.getWhisperRecipients("GM"),
  });
}

// Wicked Campaigns ships example lore/backstories/party content in its own
// "wicked-lore" JournalEntry compendium. Registering it as an "included
// journal compendium" is how Campaign Codex surfaces compendium content in
// its Table of Contents and Quest Board without importing anything into the
// world. Applied once per world; merges into whatever the GM already has
// selected rather than replacing it, so it never un-checks another pack.
const WICKED_LORE_PACK_COLLECTION = "cv-wicked-campaigns.wicked-lore";

async function includeWickedLoreCompendium() {
  if (!isCampaignCodexActive()) return;
  const current = game.settings.get(CC_MODULE_ID, "includedJournalCompendiums") || {};
  if (current[WICKED_LORE_PACK_COLLECTION]) return;
  await game.settings.set(CC_MODULE_ID, "includedJournalCompendiums", {
    ...current,
    [WICKED_LORE_PACK_COLLECTION]: true,
  });
  console.log("Wicked Campaigns | Included the wicked-lore compendium in the Campaign Codex Table of Contents.");
}

// Campaign Codex's TOC tag-cloud filter builds one icon per *type* via its
// own internal icon lookup, which only recognizes its own built-in types and
// has no override hook (unlike the per-document icon-override flag used for
// the entry list). This patches the rendered pill icons for our two custom
// types after each render, rather than reaching into Campaign Codex's actual
// source — if a future Campaign Codex update changes this panel's markup,
// this just silently stops matching (icon reverts to "?"), nothing breaks.
const TOC_TAG_PILL_ICONS = {
  "type:backstory": BACKSTORY_ICON,
  "type:party": PARTY_ICON,
  "type:session-zero-summary": SESSION_ZERO_ICON,
};

Hooks.on("renderCampaignCodexTOCSheet", (app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  for (const [tagId, iconClass] of Object.entries(TOC_TAG_PILL_ICONS)) {
    const pillIcon = root.querySelector(`.tag-pill[data-tag-id="${tagId}"] i`);
    if (pillIcon) pillIcon.setAttribute("class", iconClass);
  }
});

// Backstories link to a Campaign Codex NPC entry, not the actor directly -
// NPC entries already handle player characters (that's what
// game.campaignCodex.findOrCreateNPCJournalForActor is for), and CC's own
// linkActorFlags() already gives the actor sheet a "Codex" button to jump to
// its NPC entry. We piggyback entirely on that instead of maintaining our
// own parallel actor-linking system.
function findNpcJournalForActorSync(actor) {
  if (!actor) return null;
  return game.journal.find((j) =>
    j.getFlag(CC_MODULE_ID, "type") === "npc" &&
    j.getFlag(CC_MODULE_ID, "data")?.linkedActor === actor.uuid
  ) || null;
}

// The backstory is linked into the NPC entry's own generic "Journals" tab
// (flags.campaign-codex.data.linkedStandardJournals) - a built-in, type-
// agnostic linking feature Campaign Codex already ships, rather than a
// bespoke relationship flag of our own.
function findBackstoryForNpcJournalSync(npcJournal) {
  const linkedUuids = npcJournal?.getFlag(CC_MODULE_ID, "data")?.linkedStandardJournals || [];
  for (const uuid of linkedUuids) {
    const doc = fromUuidSync(uuid);
    if (doc?.getFlag(CC_MODULE_ID, "type") === CC_BACKSTORY_TYPE) return doc;
  }
  return null;
}

function findBackstoryForActorSync(actor) {
  return findBackstoryForNpcJournalSync(findNpcJournalForActorSync(actor));
}

async function getOrCreateBackstoryJournal(npcJournal) {
  const existing = findBackstoryForNpcJournalSync(npcJournal);
  if (existing) {
    if (!existing.getFlag(CC_MODULE_ID, "icon-override")) {
      await existing.setFlag(CC_MODULE_ID, "icon-override", BACKSTORY_ICON).catch(() => {});
    }
    return existing;
  }

  if (!game.user.isGM) {
    ui.notifications.warn(`Your Personal Info and Background were saved, but the Campaign Codex backstory entry could not be created because it requires GM permissions. This normally sets itself up automatically the next time your GM has the world open - if it still isn't showing up after that, ask your GM to check the browser console (F12) for a "Wicked Campaigns" error.`, { permanent: true });
    return null;
  }

  // Match the NPC entry's own ownership: anyone who can see the NPC entry
  // can read its linked backstory too, and only its editors can change it.
  const ownership = foundry.utils.deepClone(npcJournal.ownership || { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER });

  const journal = await JournalEntry.create({
    name: `${npcJournal.name} - Story`,
    img: npcJournal.img,
    folder: getWickedCampaignsFolder(CC_BACKSTORY_TYPE)?.id,
    ownership,
    flags: {
      [CC_MODULE_ID]: {
        type: CC_BACKSTORY_TYPE,
        data: { description: "" },
        "icon-override": BACKSTORY_ICON,
      },
      "cv-wicked-campaigns": { linkedNpcUuid: npcJournal.uuid },
      core: { sheetClass: "cv-wicked-campaigns.BackstorySheet" },
    },
  });

  const npcData = npcJournal.getFlag(CC_MODULE_ID, "data") || {};
  const linkedStandardJournals = foundry.utils.deepClone(npcData.linkedStandardJournals || []);
  linkedStandardJournals.push(journal.uuid);
  await npcJournal.update({ "flags.campaign-codex.data.linkedStandardJournals": linkedStandardJournals });

  await addBackstoryToParty(journal.uuid);

  return journal;
}

// Find-or-create the Campaign Codex NPC + backstory journals for a player-owned PC and grant the
// player ownership. GM-only: journal creation and ownership writes both require it. Idempotent -
// the find-or-create calls short-circuit when the entries already exist and the ownership sync
// no-ops when it's already correct - so this is safe to run repeatedly (on createActor, on every
// GM load, or in response to a player's live provisioning request).
async function provisionCampaignCodexEntryForActor(actor) {
  const npcJournal = await game.campaignCodex.findOrCreateNPCJournalForActor(actor);
  if (!npcJournal) return;
  const backstoryJournal = await getOrCreateBackstoryJournal(npcJournal);
  // Granting ownership is itself a document-ownership write, which only the GM (or an existing
  // owner) can perform - doing it on the GM's client is what lets the player's own future save
  // succeed instead of hitting the same permission wall one step later.
  await syncActorLinkedOwnership(actor, npcJournal, backstoryJournal);
}

// A non-GM can't create the Campaign Codex journals or grant themselves ownership. Rather than
// leave them stuck until a full world reload, ask the active GM's client to provision it live over
// the socket (handled in the ready hook), and tell the player to save again once it's set up. If
// no GM is online, the catch-up pass on the next GM load covers it instead.
function requestGmCampaignCodexProvision(actor) {
  game.socket.emit(CARD_IMAGE_SHARE_CHANNEL, { type: "requestCampaignCodexProvision", actorUuid: actor.uuid });
  ui.notifications.warn(`Your Personal Info and Background were saved to ${actor.name}. Its Campaign Codex entry needs a GM to finish setting up - if one is online, that is happening now, so save again in a moment. If it still does not take, ask your GM to reload the world or check the console (F12) for a "Wicked Campaigns" error.`, { permanent: true });
}

// Both the NPC entry and its backstory journal require GM-level document-creation permission,
// which a player never has - so instead of waiting for a player to hit that wall while saving
// their backstory (see the "Ask your GM..." warnings below), provision both up front the moment a
// new PC exists. By the time a player opens their sheet, there's nothing left to lazily create.
// Existing PCs from before this hook existed - or that gain a player owner only later - are caught
// by the catch-up pass that runs on every GM load (see the ready hook).
Hooks.on("createActor", async (actor) => {
  if (!game.user.isGM || actor.type !== "character" || !actor.hasPlayerOwner) return;
  if (!isCampaignCodexActive()) return;
  try {
    await provisionCampaignCodexEntryForActor(actor);
  } catch (err) {
    console.error("Wicked Campaigns | Failed to auto-create Campaign Codex entry for new character.", actor, err);
  }
});

// Surgically replaces one friend/enemy card's rendered "Situation" line in the already-rendered
// biography HTML, by position (the Nth card matching `cardSelector` matches that section's
// array[Nth]) - used by the iName Thee Helper's accept flow so the displayed prose stays in sync
// with the structured flag data without having to regenerate/reconcile the whole biography HTML.
function patchSituationInHtml(html, cardSelector, cardIndex, newSituationText) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  const card = wrapper.querySelectorAll(cardSelector)[cardIndex];
  if (!card) return html; // card no longer exists (edited/removed) - leave html untouched
  const details = card.querySelector(".fe-details");
  if (details) details.innerHTML = newSituationText ? `<p><strong>Situation:</strong> ${esc(newSituationText)}</p>` : "";
  return wrapper.innerHTML;
}

// The lover's romance-detail text lives in a different spot than friend/enemy situations - it's
// the trailing part of the single "Romance Status" card's value (after the status label), not
// inside the lover's own .wicked-partner-card at all (that card only shows Appearance).
function patchLoverRomanceDetailInHtml(html, newDetailText) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  const card = [...wrapper.querySelectorAll(".wicked-family-card")]
    .find((c) => c.querySelector(".card-label")?.textContent?.trim() === "Romance Status");
  const valueEl = card?.querySelector(".card-value");
  const strongEl = valueEl?.querySelector("strong");
  if (!valueEl || !strongEl) return html;
  valueEl.innerHTML = strongEl.outerHTML + (newDetailText ? ` — ${esc(newDetailText)}` : "");
  return wrapper.innerHTML;
}

function patchLoverAppearanceInHtml(html, newText) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  const details = wrapper.querySelector(".wicked-partner-card .partner-details");
  if (!details) return html;
  details.innerHTML = newText ? `<p><strong>Appearance:</strong> ${esc(newText)}</p>` : "<p><em>No description details.</em></p>";
  return wrapper.innerHTML;
}

function patchFaithDescriptionInHtml(html, newText) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  const details = wrapper.querySelector(".wicked-faith-card .faith-details");
  if (!details) return html;
  details.innerHTML = newText ? `<p>${esc(newText)}</p>` : "";
  return wrapper.innerHTML;
}

// Personality fields all live as sibling <p><strong>Label:</strong> value</p> lines inside one
// shared card, and P() skips empty fields entirely at render time - so this has to match by the
// field's own label text rather than by position, which wouldn't stay stable across accepts.
function patchPersonalityFieldInHtml(html, label, newText) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  const paragraphs = [...wrapper.querySelectorAll(".wicked-family-card .card-value p")];
  const p = paragraphs.find((el) => el.querySelector("strong")?.textContent?.trim() === `${label}:`);
  const strongEl = p?.querySelector("strong");
  if (!p || !strongEl) return html;
  p.innerHTML = strongEl.outerHTML + ` ${esc(newText)}`;
  return wrapper.innerHTML;
}

function patchLifeEventTextInHtml(html, index, newText) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  const textEl = wrapper.querySelectorAll(".wicked-event-card")[index]?.querySelector(".event-text");
  if (!textEl) return html;
  textEl.textContent = newText || "";
  return wrapper.innerHTML;
}

// The three general "family" genCards (Parents Status / Family Standing / Family Goal) share the
// same .wicked-family-card + .card-label/.card-value shape as the Romance Status card above, so
// this matches by label the same way patchLoverRomanceDetailInHtml does, but replaces the whole
// value instead of preserving a leading <strong> prefix (these cards have none).
function patchFamilyCardByLabel(html, label, newText) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  const card = [...wrapper.querySelectorAll(".wicked-family-card")]
    .find((c) => c.querySelector(".card-label")?.textContent?.trim() === label);
  const valueEl = card?.querySelector(".card-value");
  if (!valueEl) return html;
  valueEl.textContent = newText || "";
  return wrapper.innerHTML;
}

// Mother/father share the exact same .wicked-parent-card markup, disambiguated by which role's
// card it is. Both lines always render as <strong>Label:</strong> text (even when empty), so this
// matches by label rather than position, and appends the paragraph if it isn't there yet - which is
// how "Description" gets created the very first time the Helper adds it (it never exists otherwise).
function patchParentFieldInHtml(html, role, label, newText) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  const card = [...wrapper.querySelectorAll(".wicked-parent-card")]
    .find((c) => c.querySelector(".parent-role")?.textContent?.trim().toLowerCase().startsWith(role));
  const details = card?.querySelector(".parent-details");
  if (!details) return html;
  const p = [...details.querySelectorAll("p")].find((el) => el.querySelector("strong")?.textContent?.trim() === `${label}:`);
  if (p) {
    p.innerHTML = `<strong>${label}:</strong> ${esc(newText || "")}`;
  } else {
    const newP = document.createElement("p");
    newP.innerHTML = `<strong>${label}:</strong> ${esc(newText || "")}`;
    details.appendChild(newP);
  }
  return wrapper.innerHTML;
}

// Sibling cards are positional (the Nth .wicked-sibling-card matches lifepathSiblings[Nth]), but
// each card holds two independently-enhanceable lines - same label-matching approach as
// patchParentFieldInHtml above, scoped to that one card's .sibling-details.
function patchSiblingFieldInHtml(html, index, label, newText) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  const card = wrapper.querySelectorAll(".wicked-sibling-card")[index];
  const details = card?.querySelector(".sibling-details");
  if (!details) return html;
  const p = [...details.querySelectorAll("p")].find((el) => el.querySelector("strong")?.textContent?.trim() === `${label}:`);
  if (p) {
    p.innerHTML = `<strong>${label}:</strong> ${esc(newText || "")}`;
  } else {
    const newP = document.createElement("p");
    newP.innerHTML = `<strong>${label}:</strong> ${esc(newText || "")}`;
    details.appendChild(newP);
  }
  return wrapper.innerHTML;
}

// Shared instruction template for every HELPER_SECTIONS entry below - the boilerplate (mandatory
// enhancement, clash-fixing priority, avoid-repeat handling) is written once here; each section
// only declares which field to rewrite, what it needs to stay consistent with, and a couple of
// concrete example problems to watch for. Adding a future section (personality, life events, etc.)
// is then just a few lines of field names, not a fresh hand-written paragraph. Enhancement is
// unconditional (every item comes back rewritten, not just clash cases) - `changed: false` isn't a
// valid outcome here, unlike a plain consistency-check-only tool would allow.
function buildSectionInstruction({ sectionLabel, targetField, contextFields, problemHints }) {
  const contextStr = contextFields?.length ? contextFields.join(" and ") : "the rest of the character's backstory";
  const hintsStr = problemHints?.length ? ` For example: ${problemHints.join("; ")}.` : "";
  return (
    `For the "${sectionLabel}" section: rewrite every item's "${targetField}" into a short, enhanced paragraph ` +
    `(2-3 sentences) that ties in its ${contextStr} and adds genuine color or texture - do this for every ` +
    `item, not just ones that need fixing. If "${targetField}" contradicts or clashes with ${contextStr}, ` +
    `prioritize resolving that clash as part of the rewrite.${hintsStr} Keep it tight and on point - don't ` +
    `ramble or pad it out just to hit a length. If the item includes "avoidTexts" (phrasings already proposed ` +
    `for it before, separated by " | "), the new version must be meaningfully different from all of them - ` +
    `not just a reworded version of the same idea. Always return changed: true with a real rewritten ` +
    `proposedText for every item - never return changed: false or leave proposedText identical to the original.`
  );
}

// Registry describing every section the iName Thee Helper can check. `getEntries`/`setEntries`
// normalize each section's stored shape down to "a flat array", so #onINameTheeHelper and the
// review app can treat every section identically regardless of whether the underlying data is
// itself an array (friends, enemies, lifeEvents), a single object-or-null (lover), or a synthetic
// list built from several scalar fields (personality). `dataKey` lets two sections that read/write
// the *same* underlying flag (lover + loverAppearance) share one working copy when both have
// accepted changes in the same batch, instead of one silently clobbering the other's edit.
// `getDisplayName` overrides the review card's title when a section's entries don't have a natural
// "name" field (personality, life events, faith).
const HELPER_SECTIONS = {
  friends: {
    label: "friend",
    getEntries: (doc) => doc.getFlag("cv-wicked-campaigns", "lifepathFriends") || [],
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathFriends": entries }),
    buildItem: (e) => ({ name: e.name || "", profession: e.profession || "", situation: e.situation || "" }),
    getText: (e) => e?.situation || "",
    setText: (e, text) => { e.situation = text; },
    patchHtml: (html, entry, index, text) => patchSituationInHtml(html, ".wicked-fe-card.is-friend", index, text),
    instructions: buildSectionInstruction({
      sectionLabel: "friends",
      targetField: "situation",
      contextFields: ["profession"],
      problemHints: [
        `a situation implying a different occupation or role than the stated profession (e.g. "became a ` +
        `devoted cleric" for someone whose profession is "Bandit")`,
      ],
    }),
  },
  enemies: {
    label: "enemy",
    getEntries: (doc) => doc.getFlag("cv-wicked-campaigns", "lifepathEnemies") || [],
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathEnemies": entries }),
    buildItem: (e) => ({ name: e.name || "", profession: e.profession || "", situation: e.situation || "" }),
    getText: (e) => e?.situation || "",
    setText: (e, text) => { e.situation = text; },
    patchHtml: (html, entry, index, text) => patchSituationInHtml(html, ".wicked-fe-card.is-enemy", index, text),
    instructions: buildSectionInstruction({
      sectionLabel: "enemies",
      targetField: "situation",
      contextFields: ["profession"],
      problemHints: ["a situation implying a different occupation or role than the stated profession"],
    }),
  },
  lover: {
    label: "lover",
    dataKey: "lifepathLover",
    getEntries: (doc) => {
      const lover = doc.getFlag("cv-wicked-campaigns", "lifepathLover");
      return lover ? [lover] : [];
    },
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathLover": entries[0] ?? null }),
    buildItem: (e) => ({ name: e.name || "", profession: e.profession || "", romanceDetail: e.romanceDetail || "" }),
    getText: (e) => e?.romanceDetail || "",
    setText: (e, text) => { e.romanceDetail = text; },
    patchHtml: (html, entry, index, text) => patchLoverRomanceDetailInHtml(html, text),
    instructions: buildSectionInstruction({
      sectionLabel: "lover",
      targetField: "romanceDetail",
      contextFields: ["profession"],
      problemHints: ["a romanceDetail implying a different occupation or role than the stated profession"],
    }),
  },
  loverAppearance: {
    label: "lover's appearance",
    dataKey: "lifepathLover", // shares lifepathLover with the "lover" section above
    getEntries: (doc) => {
      const lover = doc.getFlag("cv-wicked-campaigns", "lifepathLover");
      return lover ? [lover] : [];
    },
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathLover": entries[0] ?? null }),
    buildItem: (e) => ({ name: e.name || "", race: e.race || "", gender: e.gender || "", appearance: e.appearance || "" }),
    getText: (e) => e?.appearance || "",
    setText: (e, text) => { e.appearance = text; },
    patchHtml: (html, entry, index, text) => patchLoverAppearanceInHtml(html, text),
    instructions: buildSectionInstruction({
      sectionLabel: "loverAppearance",
      targetField: "appearance",
      contextFields: ["race", "gender"],
      problemHints: ["an appearance description that doesn't fit the stated race (e.g. describing distinctly human features for a non-humanoid ancestry)"],
    }),
  },
  faith: {
    label: "faith",
    getEntries: (doc) => {
      const faith = doc.getFlag("cv-wicked-campaigns", "lifepathFaith");
      return faith ? [faith] : [];
    },
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathFaith": entries[0] ?? null }),
    getDisplayName: (e) => e?.deityName || "Faith",
    buildItem: (e) => ({ deityName: e.deityName || "(unnamed)", description: e.description || "" }),
    getText: (e) => e?.description || "",
    setText: (e, text) => { e.description = text; },
    patchHtml: (html, entry, index, text) => patchFaithDescriptionInHtml(html, text),
    instructions: buildSectionInstruction({
      sectionLabel: "faith",
      targetField: "description",
      contextFields: ["deityName"],
      problemHints: ["a description that doesn't fit a deity of the stated name/domain, or reads as generic rather than specific to this deity"],
    }),
  },
  personality: {
    label: "personality trait",
    getEntries: (doc) => doc.getFlag("cv-wicked-campaigns", "lifepathPersonality") || [],
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathPersonality": entries }),
    getDisplayName: (e) => e?.label || "Personality",
    buildItem: (e) => ({ trait: e.label || "", text: e.text || "" }),
    getText: (e) => e?.text || "",
    setText: (e, text) => { e.text = text; },
    patchHtml: (html, entry, index, text) => patchPersonalityFieldInHtml(html, entry.label, text),
    instructions: buildSectionInstruction({
      sectionLabel: "personality",
      targetField: "text",
      contextFields: [], // no single paired field - each trait just needs its own texture/detail
      problemHints: ["a one-word or overly terse entry that could use a little more concrete, specific detail"],
    }),
  },
  lifeEvents: {
    label: "life event",
    getEntries: (doc) => doc.getFlag("cv-wicked-campaigns", "lifepathLifeEvents") || [],
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathLifeEvents": entries }),
    getDisplayName: (e, index) => `${e?.luck === "lucky" ? "Lucky" : "Unlucky"} Event ${index + 1}`,
    buildItem: (e) => ({ luck: e.luck || "", text: e.text || "" }),
    getText: (e) => e?.text || "",
    setText: (e, text) => { e.text = text; },
    patchHtml: (html, entry, index, text) => patchLifeEventTextInHtml(html, index, text),
    instructions: buildSectionInstruction({
      sectionLabel: "lifeEvents",
      targetField: "text",
      contextFields: ["luck"],
      problemHints: [`an event description that reads as the wrong tone for its "luck" value (a triumphant win tagged "unlucky", or a disaster tagged "lucky")`],
    }),
  },
  family: {
    label: "family",
    getEntries: (doc) => doc.getFlag("cv-wicked-campaigns", "lifepathFamily") || [],
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathFamily": entries }),
    getDisplayName: (e) => e?.label || "Family",
    buildItem: (e) => ({ aspect: e.label || "", text: e.text || "" }),
    getText: (e) => e?.text || "",
    setText: (e, text) => { e.text = text; },
    patchHtml: (html, entry, index, text) => patchFamilyCardByLabel(html, entry.label, text),
    instructions: buildSectionInstruction({
      sectionLabel: "family",
      targetField: "text",
      contextFields: [],
      problemHints: [`a family goal or crisis that contradicts the family's stated standing (e.g. a goal to "amass a great fortune" for a family described as destitute and at risk)`],
    }),
  },
  parentBond: {
    label: "parent",
    dataKey: "lifepathParents",
    getEntries: (doc) => doc.getFlag("cv-wicked-campaigns", "lifepathParents") || [],
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathParents": entries }),
    getDisplayName: (e) => e?.name || (e?.role === "mother" ? "Mother" : "Father"),
    buildItem: (e) => ({ role: e.role || "", name: e.name || "", bond: e.bond || "" }),
    getText: (e) => e?.bond || "",
    setText: (e, text) => { e.bond = text; },
    patchHtml: (html, entry, index, text) => patchParentFieldInHtml(html, entry.role, "Relationship/Bond", text),
    instructions: buildSectionInstruction({
      sectionLabel: "parentBond",
      targetField: "bond",
      contextFields: ["name"],
      problemHints: ["a warm, loving bond description for a parent whose other details (a family disaster, crisis, or secret) suggest estrangement or tragedy, or vice versa"],
    }),
  },
  parentDescription: {
    label: "parent description",
    dataKey: "lifepathParents", // shares lifepathParents with the "parentBond" section above
    getEntries: (doc) => doc.getFlag("cv-wicked-campaigns", "lifepathParents") || [],
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathParents": entries }),
    getDisplayName: (e) => e?.name || (e?.role === "mother" ? "Mother" : "Father"),
    buildItem: (e) => ({ role: e.role || "", name: e.name || "", bond: e.bond || "", description: e.description || "" }),
    getText: (e) => e?.description || "",
    setText: (e, text) => { e.description = text; },
    patchHtml: (html, entry, index, text) => patchParentFieldInHtml(html, entry.role, "Description", text),
    instructions: buildSectionInstruction({
      sectionLabel: "parentDescription",
      targetField: "description",
      contextFields: ["name", "bond"],
      problemHints: ["a description that contradicts the established relationship/bond or the family's circumstances"],
    }),
  },
  siblingOccupation: {
    label: "sibling occupation",
    dataKey: "lifepathSiblings",
    getEntries: (doc) => doc.getFlag("cv-wicked-campaigns", "lifepathSiblings") || [],
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathSiblings": entries }),
    getDisplayName: (e) => e?.name || "Sibling",
    buildItem: (e) => ({ name: e.name || "", relation: e.relation || "" }),
    getText: (e) => e?.relation || "",
    setText: (e, text) => { e.relation = text; },
    patchHtml: (html, entry, index, text) => patchSiblingFieldInHtml(html, index, "Occupation/Status", text),
    instructions: buildSectionInstruction({
      sectionLabel: "siblingOccupation",
      targetField: "relation",
      contextFields: ["name"],
      problemHints: ["an occupation/status implying wealth or prestige that contradicts a family described as poor or in crisis"],
    }),
  },
  siblingRelationship: {
    label: "sibling relationship",
    dataKey: "lifepathSiblings", // shares lifepathSiblings with the "siblingOccupation" section above
    getEntries: (doc) => doc.getFlag("cv-wicked-campaigns", "lifepathSiblings") || [],
    setEntries: (entries) => ({ "flags.cv-wicked-campaigns.lifepathSiblings": entries }),
    getDisplayName: (e) => e?.name || "Sibling",
    buildItem: (e) => ({ name: e.name || "", relation: e.relation || "", bond: e.bond || "" }),
    getText: (e) => e?.bond || "",
    setText: (e, text) => { e.bond = text; },
    patchHtml: (html, entry, index, text) => patchSiblingFieldInHtml(html, index, "Relationship", text),
    instructions: buildSectionInstruction({
      sectionLabel: "siblingRelationship",
      targetField: "bond",
      contextFields: ["name", "relation"],
      problemHints: ["a warm sibling relationship that contradicts a stated rivalry or estrangement noted elsewhere"],
    }),
  },
};

async function saveBackstoryToCampaignCodex(actor, html, relatedPeople = [], friends = [], enemies = [], lover = null, faith = null, personality = [], lifeEvents = [], family = [], parents = [], siblings = []) {
  if (!isCampaignCodexActive()) {
    console.warn("Wicked Campaigns | Campaign Codex is not active; skipping backstory codex entry.");
    ui.notifications.warn("Campaign Codex must be installed and active to save a browsable backstory entry. Your background was still saved to the character.");
    return;
  }

  let npcJournal = findNpcJournalForActorSync(actor);
  if (!npcJournal) {
    if (!game.user.isGM) {
      requestGmCampaignCodexProvision(actor);
      return;
    }
    npcJournal = await game.campaignCodex.findOrCreateNPCJournalForActor(actor);
  }
  if (!npcJournal) return;

  // Ownership normally arrives ahead of time via the createActor/backfill auto-provisioning
  // (see below) - this is a fallback for a journal that predates that, or that hasn't caught
  // up yet, so a player gets a clear message instead of a raw "lacks permission" error out of
  // the rename/update calls that follow.
  if (!game.user.isGM && !npcJournal.testUserPermission(game.user, "OWNER")) {
    requestGmCampaignCodexProvision(actor);
    return;
  }

  // Campaign Codex names a freshly-created NPC entry "<Actor> - Journal" by default - drop the
  // suffix right after creation so it just reads "<Actor>". Only fires while the name still
  // matches that exact default, so a GM's own later rename is never overwritten.
  if (npcJournal.name === `${actor.name} - Journal`) {
    await npcJournal.update({ name: actor.name });
  }

  const journal = await getOrCreateBackstoryJournal(npcJournal);
  if (!journal) return;

  // Must run before the update below, not after - JournalEntry#update requires OWNER
  // ownership, so a player can't write their own backstory until this has granted it at
  // least once (e.g. via the createActor/backfill auto-provisioning, or right here as a
  // fallback for journals that predate that ownership grant).
  await syncActorLinkedOwnership(actor, npcJournal, journal);

  const updateData = {
    "flags.campaign-codex.data.description": html,
    // Kept as its own flag, not inside the description above - ProseMirror (which renders that
    // field on this journal's own sheet) strips any interactive markup baked into it, so the
    // "Send to iName Thee" buttons live here instead, read directly by BackstorySheet's toolbar.
    "flags.cv-wicked-campaigns.relatedPeople": relatedPeople,
    // Structured, round-trippable friend/enemy/lover data - the rendered prose above has the same
    // info baked into HTML, but the iName Thee Helper needs clean fields to send for review and
    // to patch back into the description on accept.
    "flags.cv-wicked-campaigns.lifepathFriends": friends,
    "flags.cv-wicked-campaigns.lifepathEnemies": enemies,
    "flags.cv-wicked-campaigns.lifepathLover": lover,
    "flags.cv-wicked-campaigns.lifepathFaith": faith,
    "flags.cv-wicked-campaigns.lifepathPersonality": personality,
    "flags.cv-wicked-campaigns.lifepathLifeEvents": lifeEvents,
    "flags.cv-wicked-campaigns.lifepathFamily": family,
    "flags.cv-wicked-campaigns.lifepathParents": parents,
    "flags.cv-wicked-campaigns.lifepathSiblings": siblings,
  };
  // Name is deliberately NOT force-synced here past creation - it's set once above ("<NPC> -
  // Story") and left alone afterward so a GM's manual rename (via BackstorySheet's rename
  // action) sticks across re-rolls instead of being overwritten on every save.
  if (journal.img !== npcJournal.img) updateData.img = npcJournal.img;
  await journal.update(updateData);
}

// Only mother/father/siblings actually live inside this family, so only their concepts get this
// context appended - a friend, enemy, or lover isn't defined by the PC's family circumstances the
// same way, and tacking it onto every role would just dilute what actually matters for them.
function familyContextSuffix(parts) {
  const text = (parts || []).filter(Boolean).join(" ");
  return text ? ` Family background: ${text}` : "";
}

// Every "Send to iName Thee" button bakes its concept text into a data-iname-concept attribute
// when the biography HTML is rendered (see iNameTheeBtnTracked) - fine at that instant, but the
// iName Thee Helper's accept flow only patches the *visible* paragraph text for an enhanced field
// (patchSituationInHtml, patchSiblingFieldInHtml, etc.), never that hidden attribute sitting
// elsewhere in the same card. So a friend/enemy/sibling/parent/lover whose situation, bond, or
// description gets enhanced after the button was first rendered would silently keep sending iName
// Thee the pre-enhancement text forever. Rebuilding the concept here, live, from the same
// structured flags the Helper actually writes to - rather than trusting whatever's frozen in the
// DOM - means the button always reflects whatever the backstory *currently* says, enhanced or not.
// Mirrors the exact phrasing _buildBiographyHtml() uses when it first bakes these strings, so nothing
// changes for a backstory the Helper has never touched. Returns "" (never null/undefined) when the
// role can't be resolved, so callers can safely `|| concept` back to the static fallback.
function buildLiveINameTheeConcept(backstory, role) {
  if (!backstory || !role) return "";
  const get = (key) => backstory.getFlag("cv-wicked-campaigns", key);
  const familySuffix = () => familyContextSuffix((get("lifepathFamily") || []).map((e) => e.text));

  if (role === "mother" || role === "father") {
    const parents = get("lifepathParents") || [];
    const p = parents.find((x) => x.role === role);
    if (!p?.name) return "";
    return `${p.name}, the player character's ${role}.` +
      (p.bond ? ` Relationship/bond: ${p.bond}.` : "") +
      (p.description ? ` ${p.description}` : "") +
      familySuffix();
  }

  if (role.startsWith("sibling-")) {
    const idx = Number(role.slice("sibling-".length));
    const s = (get("lifepathSiblings") || [])[idx];
    if (!s?.name) return "";
    const who = s.who || (s.sex === "male" ? "brother" : s.sex === "female" ? "sister" : "sibling");
    // s.kindLabel ("identical twin"/"fraternal twin"/"half-sibling") is absent on data saved
    // before this field existed - omitted rather than guessed, since twin/half status depends on
    // birth-order position relative to the PC and there's no safe way to infer it after the fact.
    const kindStr = s.kindLabel ? `, ${s.kindLabel}` : "";
    return `${s.name}, the player character's ${who}${kindStr}.` +
      (s.relation ? ` Occupation/status: ${s.relation}.` : "") +
      (s.bond ? ` Relationship: ${s.bond}.` : "") +
      (s.alive === false ? " Deceased." : "") +
      familySuffix();
  }

  if (role.startsWith("friend-") || role.startsWith("enemy-")) {
    const isFriend = role.startsWith("friend-");
    const idx = Number(role.slice(role.indexOf("-") + 1));
    const e = (get(isFriend ? "lifepathFriends" : "lifepathEnemies") || [])[idx];
    if (!e?.name) return "";
    return `${e.name}, a${isFriend ? "" : "n"} ${isFriend ? "friend" : "enemy"} of the player character.` +
      [e.sex, e.race, e.profession].filter(Boolean).map((v) => ` ${v}.`).join("") +
      (e.situation ? ` Situation: ${e.situation}.` : "");
  }

  if (role === "lover") {
    const lover = get("lifepathLover");
    if (!lover?.name) return "";
    const isTragic = lover.romanceStatus === "tragic";
    return `${lover.name}, the player character's ${isTragic ? "deceased former lover" : "lover/romantic partner"}.` +
      [lover.gender, lover.race, lover.profession].filter(Boolean).map((v) => ` ${v}.`).join("") +
      (lover.appearance ? ` Appearance: ${lover.appearance}.` : "") +
      (lover.romanceDetail ? ` ${lover.romanceDetail}` : "");
  }

  return "";
}

// Shared by WickedCharacterSheet's inline card buttons and BackstorySheet's own toolbar - checks
// whether this role already has a linked actor (from a previous click) and seeds iName Thee into
// Update mode against it if so, otherwise Create mode. `backstory` is the backstory journal that
// owns the relatedActorLinks flag; `actorName` is only used for prompt context (the PC this person
// is connected to), not looked up here since callers resolve it differently.
async function sendToINameThee({ backstory, actorName, role, name, concept }) {
  concept = buildLiveINameTheeConcept(backstory, role) || concept;
  // Creating NPCs is GM-only - enforced here regardless of iName Thee's own "allow players"
  // setting, since that setting also covers unrelated player-facing features (like PC self-rename)
  // and leaving it on for those shouldn't silently open this up too.
  if (!game.user.isGM) {
    ui.notifications.warn("Only the GM can generate NPCs this way.");
    return;
  }
  const api = game.modules.get("cv-iname-thee")?.api;
  if (!api?.openWithSeed) {
    ui.notifications.warn("iName Thee is not active.");
    return;
  }
  if (!backstory || !role || !name) return;

  const existingUuid = backstory.getFlag("cv-wicked-campaigns", "relatedActorLinks")?.[role];
  const existingActor = existingUuid ? await fromUuid(existingUuid).catch(() => null) : null;

  const prompt = `${concept} Related to the player character ${actorName}.`;
  await api.openWithSeed({
    tabId: "npc",
    prompt,
    fixedName: name,
    targetUuid: existingActor?.uuid ?? null,
    context: { backstoryUuid: backstory.uuid, role },
  });
}

// ---- Party Sheet (GM-only roster of linked backstories) -------------------
// Multiple parties can exist side by side (e.g. separate campaigns sharing
// one world). Each party roster is paired 1:1 with its own "party state"
// document (fate pool / peril), linked by flag in both directions - the
// state document stays fully player-writable so a player can spend a fate
// point without a GM online, while the roster itself stays GM-only. Exactly
// one party is "active" at a time (ACTIVE_PARTY_SETTING); that's the one
// character sheets and the fate pool widgets read from by default.
const CC_PARTY_TYPE = "party";
// Deliberately NOT given a campaign-codex type flag: state documents are
// internal plumbing, never meant to be opened directly, so they should never
// show up in the TOC.
const PARTY_STATE_FLAG = "isPartyState";
const ACTIVE_PARTY_SETTING = "activePartyUuid";

// Mirrors Campaign Codex's own ensureCampaignCodexFolders()/getCampaignCodexFolder()
// pattern (see campaign-codex/scripts/helper.js), but for our custom types -
// CC only auto-organizes its own 7 built-in types, so "backstory" and "party"
// need the same treatment from us. Respects CC's own "useOrganizedFolders"
// world setting rather than adding a second toggle, and also backfills any
// existing backstory/party/party-state journals that predate this feature or
// were created outside the normal flow.
const WICKED_FOLDER_COLOR = "#000000";
const WICKED_FOLDER_NAMES = {
  [CC_BACKSTORY_TYPE]: "Wicked Campaigns - Backstories",
  [CC_PARTY_TYPE]: "Wicked Campaigns - Parties",
  [CC_SESSION_ZERO_TYPE]: "Wicked Campaigns - Session Zero Summaries",
};
// Party-state journals deliberately carry no campaign-codex type flag (see above), so
// they can't be keyed into WICKED_FOLDER_NAMES the same way - they get their own folder,
// matched by PARTY_STATE_FLAG instead.
const WICKED_PARTY_STATE_FOLDER_NAME = "Wicked Campaigns - Party States";

function getWickedCampaignsFolder(type) {
  if (!game.settings.get("campaign-codex", "useOrganizedFolders")) return null;
  const folderName = WICKED_FOLDER_NAMES[type];
  if (!folderName) return null;
  return game.folders.find((f) => f.name === folderName && f.type === "JournalEntry") || null;
}

function getWickedPartyStateFolder() {
  if (!game.settings.get("campaign-codex", "useOrganizedFolders")) return null;
  return game.folders.find((f) => f.name === WICKED_PARTY_STATE_FOLDER_NAME && f.type === "JournalEntry") || null;
}

// Creates the folder if missing, and also corrects its color if it already exists with a
// stale one (e.g. from before WICKED_FOLDER_COLOR was locked to black) - Foundry only seeds
// a folder's properties from code once, on creation, so this re-check is what keeps it
// self-healing across reloads instead of silently drifting.
async function ensureFolder(name, folderType) {
  let folder = game.folders.find((f) => f.name === name && f.type === "JournalEntry");
  if (!folder) {
    folder = await Folder.create({
      name,
      type: "JournalEntry",
      color: WICKED_FOLDER_COLOR,
      flags: { "cv-wicked-campaigns": { type: folderType, autoOrganize: true } },
    });
    console.log(`Wicked Campaigns | Created folder: ${name}`);
  } else if (folder.color !== WICKED_FOLDER_COLOR) {
    await folder.update({ color: WICKED_FOLDER_COLOR });
  }
  return folder;
}

async function ensureWickedCampaignsFolders() {
  if (!game.settings.get("campaign-codex", "useOrganizedFolders")) return;

  for (const [type, folderName] of Object.entries(WICKED_FOLDER_NAMES)) {
    const folder = await ensureFolder(folderName, type);
    const strays = game.journal.filter((j) =>
      j.getFlag(CC_MODULE_ID, "type") === type && j.folder?.id !== folder.id
    );
    for (const journal of strays) {
      await journal.update({ folder: folder.id });
    }
  }

  const stateFolder = await ensureFolder(WICKED_PARTY_STATE_FOLDER_NAME, "party-state");
  const strayStates = game.journal.filter((j) =>
    j.getFlag("cv-wicked-campaigns", PARTY_STATE_FLAG) === true && j.folder?.id !== stateFolder.id
  );
  for (const journal of strayStates) {
    await journal.update({ folder: stateFolder.id });
  }
}

function getAllPartyRosters() {
  return game.journal.filter((j) => j.getFlag(CC_MODULE_ID, "type") === CC_PARTY_TYPE);
}

function findPartyStateForRoster(roster) {
  const stateUuid = roster?.getFlag("cv-wicked-campaigns", "partyStateUuid");
  if (!stateUuid) return null;
  const state = fromUuidSync(stateUuid);
  return state?.getFlag("cv-wicked-campaigns", PARTY_STATE_FLAG) === true ? state : null;
}

function findActivePartyRosterSync() {
  const activeUuid = game.settings.get("cv-wicked-campaigns", ACTIVE_PARTY_SETTING);
  if (activeUuid) {
    const active = fromUuidSync(activeUuid);
    if (active?.getFlag(CC_MODULE_ID, "type") === CC_PARTY_TYPE) return active;
  }
  // Active pointer is unset or stale (e.g. that party was deleted) - fall
  // back to whatever party roster happens to exist, if any.
  return getAllPartyRosters()[0] || null;
}

// Self-heals a roster whose paired Fate State document is missing (e.g. accidentally deleted) by
// creating a fresh one (fatePool 0, inPeril false) and re-pairing it via partyStateUuid - mirrors
// the existing self-heal for a missing roster in getOrCreateActivePartyRoster(). Only a GM can
// create the replacement, same as every other world-write in this module. `silent` is used by
// createPartyPair(), where a "missing" state is just the normal first-creation case, not a repair.
async function ensurePartyState(roster, { silent = false } = {}) {
  if (!roster) return null;
  const existing = findPartyStateForRoster(roster);
  if (existing) return existing;
  if (!game.user.isGM) return null;

  const state = await JournalEntry.create({
    name: `${roster.name} - Fate State`,
    folder: getWickedPartyStateFolder()?.id,
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
    flags: {
      "cv-wicked-campaigns": {
        [PARTY_STATE_FLAG]: true,
        partyUuid: roster.uuid,
        fatePool: 0,
        inPeril: false,
      },
    },
  });
  await roster.update({ "flags.cv-wicked-campaigns.partyStateUuid": state.uuid });

  if (!silent) {
    console.warn(`Wicked Campaigns | "${roster.name}" was missing its Fate State document - created a replacement.`, roster.uuid);
    ui.notifications.warn(`"${roster.name}"'s Fate Pool state was missing and has been repaired. Its Fate Pool was reset to 0.`);
  }
  return state;
}

async function createPartyPair(name = "The Party") {
  const roster = await JournalEntry.create({
    name,
    folder: getWickedCampaignsFolder(CC_PARTY_TYPE)?.id,
    // Default stays NONE so non-members never see it; syncPartyOwnership()
    // grants Observer to each member's owning player as they join, and
    // revokes it if they later leave the roster.
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
    flags: {
      [CC_MODULE_ID]: {
        type: CC_PARTY_TYPE,
        data: { members: [], description: "" },
        "icon-override": PARTY_ICON,
      },
      core: { sheetClass: "cv-wicked-campaigns.PartySheet" },
    },
  });

  await ensurePartyState(roster, { silent: true });
  return roster;
}

async function getOrCreateActivePartyRoster() {
  const existing = findActivePartyRosterSync();
  if (existing) {
    if (game.user.isGM && game.settings.get("cv-wicked-campaigns", ACTIVE_PARTY_SETTING) !== existing.uuid) {
      await game.settings.set("cv-wicked-campaigns", ACTIVE_PARTY_SETTING, existing.uuid);
    }
    return existing;
  }

  if (!game.user.isGM) return null;

  const roster = await createPartyPair("The Party");
  await game.settings.set("cv-wicked-campaigns", ACTIVE_PARTY_SETTING, roster.uuid);
  return roster;
}

async function getOrCreateActivePartyState() {
  const roster = await getOrCreateActivePartyRoster();
  if (!roster) {
    ui.notifications.warn("No active party is set up yet. Ask your GM to open their character sheet first!");
    return null;
  }
  return ensurePartyState(roster);
}

function refreshFatePoolConsumers() {
  const CharacterActorSheet = dnd5e?.applications?.actor?.CharacterActorSheet;
  for (const app of foundry.applications.instances.values()) {
    if (CharacterActorSheet && app instanceof CharacterActorSheet) app.render();
    if (app instanceof PartySheet) app.render(true);
  }
  const manager = foundry.applications.instances.get("fate-pool-manager");
  if (manager) manager.render(true);
}

async function setActivePartyRoster(rosterUuid) {
  if (!game.user.isGM) return;
  await game.settings.set("cv-wicked-campaigns", ACTIVE_PARTY_SETTING, rosterUuid);
  refreshFatePoolConsumers();
}

async function addBackstoryToParty(backstoryUuid) {
  const party = await getOrCreateActivePartyRoster();
  if (!party) return;
  const members = foundry.utils.deepClone(party.getFlag(CC_MODULE_ID, "data")?.members || []);
  if (!members.includes(backstoryUuid)) {
    members.push(backstoryUuid);
    await party.update({ "flags.campaign-codex.data.members": members });
  }
  await syncPartyOwnership(party);
}

// ---- Player visibility sync ------------------------------------------------
// Compendium content can only be all-or-nothing per pack for players (see
// module.json), but world documents support real per-user ownership. Once a
// backstory/NPC/party lives in the world, a PC's owning player should be able
// to see their own stuff (and the party they're in) without seeing anyone
// else's - so whenever those links change, re-derive Observer access from
// whoever currently owns the linked actor, and strip any player-role entry
// that's no longer warranted (e.g. actor ownership was reassigned, or a
// member left the party).
function resolveOwningPlayerIds(actor) {
  if (!actor) return [];
  // testUserPermission (the actor's *effective* permission for each user), not a raw ownership-
  // key lookup - a player can own an actor via an "ownership.default" grant with no per-user
  // entry at all, which a plain Object.keys(actor.ownership) scan would silently miss.
  return game.users
    .filter((user) => !user.isGM && actor.testUserPermission(user, "OWNER"))
    .map((user) => user.id);
}

async function syncOwnershipForPlayers(doc, playerIds) {
  if (!doc) return false;
  const current = doc.ownership || {};
  const next = {};
  for (const [userId, level] of Object.entries(current)) {
    if (userId === "default") { next.default = level; continue; }
    // Preserve any GM-specific grants untouched; only player-role entries
    // are re-derived below.
    if (game.users.get(userId)?.isGM) next[userId] = level;
  }
  // OWNER, not OBSERVER - these players need to actually save their own backstory
  // (JournalEntry#update requires OWNER; OBSERVER is read-only), not just view it.
  for (const userId of playerIds) next[userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  if (JSON.stringify(next) === JSON.stringify(current)) return false;
  await doc.update({ ownership: next });
  return true;
}

async function syncActorLinkedOwnership(actor, npcJournal, backstoryJournal) {
  const playerIds = resolveOwningPlayerIds(actor);
  const npcChanged = await syncOwnershipForPlayers(npcJournal, playerIds);
  const backstoryChanged = await syncOwnershipForPlayers(backstoryJournal, playerIds);
  return npcChanged || backstoryChanged;
}

async function syncPartyOwnership(partyDoc) {
  if (!partyDoc) return false;
  const memberUuids = partyDoc.getFlag(CC_MODULE_ID, "data")?.members || [];
  const playerIds = new Set();
  for (const uuid of memberUuids) {
    const backstory = await fromUuid(uuid).catch(() => null);
    const npcUuid = backstory?.getFlag("cv-wicked-campaigns", "linkedNpcUuid");
    const npcJournal = npcUuid ? await fromUuid(npcUuid).catch(() => null) : null;
    const actorUuid = npcJournal?.getFlag(CC_MODULE_ID, "data")?.linkedActor;
    const actor = actorUuid ? await fromUuid(actorUuid).catch(() => null) : null;
    for (const id of resolveOwningPlayerIds(actor)) playerIds.add(id);
  }
  return syncOwnershipForPlayers(partyDoc, Array.from(playerIds));
}

// Manual fallback for the "Sync Permissions" button: re-derives ownership
// for every actor-linked NPC/backstory pair and every party roster in the
// world, in case actor ownership was reassigned or a roster was edited by
// hand since the last automatic sync.
async function syncAllCampaignCodexOwnership() {
  let count = 0;
  const npcJournals = game.journal.filter((j) =>
    j.getFlag(CC_MODULE_ID, "type") === "npc" && j.getFlag(CC_MODULE_ID, "data")?.linkedActor
  );
  for (const npcJournal of npcJournals) {
    const actorUuid = npcJournal.getFlag(CC_MODULE_ID, "data")?.linkedActor;
    const actor = actorUuid ? await fromUuid(actorUuid).catch(() => null) : null;
    if (!actor) continue;
    const backstory = findBackstoryForNpcJournalSync(npcJournal);
    if (await syncActorLinkedOwnership(actor, npcJournal, backstory)) count++;
  }
  for (const party of getAllPartyRosters()) {
    if (await syncPartyOwnership(party)) count++;
  }
  return count;
}

// ---- Backstory Sheet -------------------------------------------------------
// Renders the Campaign Codex "backstory" journal entries created by saveBackstoryToCampaignCodex().
const backstorySheetBase = foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2);

class BackstorySheet extends backstorySheetBase {
  // The inherited DocumentSheetV2 form handler already expands and applies
  // form data to the document, so no custom submit handler is needed here.
  static DEFAULT_OPTIONS = {
    classes: ["wicked-campaigns", "backstory-sheet"],
    window: { icon: "fa-solid fa-book-skull", resizable: true },
    position: { width: 720, height: 780 },
    form: { submitOnChange: true },
    actions: {
      openNpc: BackstorySheet.#onOpenNpc,
      "send-to-iname-thee": BackstorySheet.#onSendToINameThee,
      rename: BackstorySheet.#onRename,
      "iname-thee-helper": BackstorySheet.#onINameTheeHelper,
      "review-friend-suggestions": BackstorySheet.#onReviewFriendSuggestions,
    },
  };

  static PARTS = {
    main: { template: "modules/cv-wicked-campaigns/templates/backstory-sheet.hbs", scrollable: [""] },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = this.document.getFlag(CC_MODULE_ID, "data") || {};
    context.description = data.description || "";
    const linkedNpcUuid = this.document.getFlag("cv-wicked-campaigns", "linkedNpcUuid");
    context.linkedNpc = linkedNpcUuid ? await fromUuid(linkedNpcUuid).catch(() => null) : null;
    // Rendered as real buttons outside the <prose-mirror> element below - anything baked into
    // the description itself gets stripped by that editor (see sendToINameThee's comment).
    // Creating NPCs is GM-only, so the toolbar is hidden entirely for non-GM viewers.
    context.relatedPeople = this.document.getFlag("cv-wicked-campaigns", "relatedPeople") || [];
    context.isGM = game.user.isGM;

    const pendingSuggestions = this.document.getFlag("cv-wicked-campaigns", "pendingSuggestions") || {};
    context.hasPendingSuggestions = Object.values(pendingSuggestions).some((arr) => arr?.length);
    // Persisted (not local component state) so the "Oracles" banner survives the sheet being
    // closed and reopened while the reconcile call is still running - see #onINameTheeHelper.
    context.helperRunning = this.document.getFlag("cv-wicked-campaigns", "helperRunning") === true;

    const inameThee = game.modules.get("cv-iname-thee");
    const hasAnyRelationshipData = Object.values(HELPER_SECTIONS).some((cfg) => cfg.getEntries(this.document).length);
    // Only offered when there's nothing already pending review - avoids piling up multiple
    // overlapping runs before the first batch has even been looked at.
    context.showHelperButton =
      this.isEditable && hasAnyRelationshipData && !context.hasPendingSuggestions && !context.helperRunning &&
      !!inameThee?.active && game.settings.get("cv-wicked-campaigns", "inameTheeIntegration") &&
      !!game.users.activeGM && !!inameThee.api?.canUse?.();
    return context;
  }

  // This custom template has no name field at all (unlike the default JournalEntry sheet it
  // replaces), so without this there'd be no way to rename a backstory short of hunting for it
  // in the sidebar directory - this gives it a direct, discoverable path from the sheet itself.
  static async #onRename(event, target) {
    const current = this.document.name;
    const newName = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Rename Backstory" },
      content: `<div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(current)}" autofocus></div>`,
      ok: {
        icon: "fas fa-check",
        label: "Rename",
        callback: (event, button) => button.form.elements.name.value.trim(),
      },
      rejectClose: false,
    }).catch(() => null);
    if (!newName || newName === current) return;
    await this.document.update({ name: newName });
  }

  static async #onOpenNpc(event, target) {
    const doc = await fromUuid(target.dataset.uuid).catch(() => null);
    doc?.sheet?.render(true);
  }

  static async #onSendToINameThee(event, target) {
    const { inameRole: role, inameName: name, inameConcept: concept } = target.dataset;
    const linkedNpcUuid = this.document.getFlag("cv-wicked-campaigns", "linkedNpcUuid");
    const npcJournal = linkedNpcUuid ? await fromUuid(linkedNpcUuid).catch(() => null) : null;
    const actorUuid = npcJournal?.getFlag(CC_MODULE_ID, "data")?.linkedActor;
    const actor = actorUuid ? await fromUuid(actorUuid).catch(() => null) : null;
    await sendToINameThee({ backstory: this.document, actorName: actor?.name ?? "the player character", role, name, concept });
  }

  // Fires the reconcile call in the background and returns immediately - the sheet stays usable
  // while it runs. Completion shows a toast and (via re-render) the persistent "Review
  // Suggestions" badge, sourced from the pendingSuggestions flag set once results land. Checks
  // every HELPER_SECTIONS entry that actually has data on this backstory, in one combined call.
  static async #onINameTheeHelper(event, target) {
    const inameThee = game.modules.get("cv-iname-thee");
    if (!inameThee?.active || !inameThee.api?.reconcileBackstory) {
      ui.notifications.warn("iName Thee is not active.");
      return;
    }

    const doc = this.document;
    const sectionsToCheck = Object.keys(HELPER_SECTIONS).filter((id) => HELPER_SECTIONS[id].getEntries(doc).length);
    if (!sectionsToCheck.length) {
      ui.notifications.info("There's nothing on this backstory yet for the Helper to review - run the Lifepath Wizard first.");
      return;
    }

    // Last few phrasings already proposed per section+index (regardless of accept/reject) -
    // without this, re-running tends to get back the same "most likely" answer every time, since
    // nothing in the prompt signals this is a repeat attempt (same trick as iName Thee's own
    // avoid-repeat-names list for candidate generation, just scoped per-item instead of per-tab).
    const history = doc.getFlag("cv-wicked-campaigns", "suggestionHistory") || {};
    // The reconcile API only echoes back a single flat `index` per result, with no concept of
    // "section" - so items across every section share one globally-unique index here, and this
    // map translates each one back to {section, localIndex} once results come in.
    const items = [];
    const indexMap = [];
    const sectionInstructions = {};
    for (const sectionId of sectionsToCheck) {
      const cfg = HELPER_SECTIONS[sectionId];
      sectionInstructions[sectionId] = cfg.instructions;
      cfg.getEntries(doc).forEach((entry, localIndex) => {
        const item = { index: items.length, section: sectionId, ...cfg.buildItem(entry) };
        const avoid = history[sectionId]?.[localIndex];
        if (avoid?.length) item.avoidTexts = avoid.join(" | ");
        indexMap.push({ section: sectionId, localIndex });
        items.push(item);
      });
    }

    const data = doc.getFlag(CC_MODULE_ID, "data") || {};
    const docName = doc.name;
    const docUuid = doc.uuid;
    ui.notifications.info(`iName Thee Helper is reviewing "${docName}" in the background…`);
    await doc.setFlag("cv-wicked-campaigns", "helperRunning", true);

    inameThee.api.reconcileBackstory({ backstoryHtml: data.description || "", sections: sectionsToCheck, items, sectionInstructions })
      .then(async (results) => {
        const list = results || [];
        const changed = list.filter((r) => r.changed && r.proposedText?.trim());
        // An item can be "not suggested" for two different reasons: the AI reviewed it and found
        // nothing wrong (changed: false), or the AI just never returned that index at all (schema
        // non-compliance further down the pipeline). Both used to look identical from here - this
        // distinguishes them so it's not a silent guess whether every item was actually reviewed.
        const reviewedIndices = new Set(list.map((r) => r.index));
        const skippedCount = items.length - reviewedIndices.size;
        const unchangedCount = list.length - changed.length;
        console.log(
          `Wicked Campaigns | iName Thee Helper reviewed ${reviewedIndices.size}/${items.length} item(s) for "${docName}" ` +
          `— ${changed.length} suggested, ${unchangedCount} needed no change` +
          `${skippedCount ? `, ${skippedCount} not returned by the AI at all` : ""}.`
        );
        const skippedNote = skippedCount
          ? ` (${skippedCount} item${skippedCount === 1 ? " wasn't" : "s weren't"} returned by the AI at all — see console)`
          : "";

        const freshDoc = await fromUuid(docUuid).catch(() => null); // re-fetch: the sheet/document may have closed or changed by now
        if (!freshDoc) return;

        const bySection = {}; // section -> [{index (local, not global), changed, proposedText}]
        if (changed.length) {
          const historyUpdate = foundry.utils.deepClone(history);
          for (const r of changed) {
            const map = indexMap[r.index];
            if (!map) continue;
            const { section, localIndex } = map;
            (bySection[section] || (bySection[section] = [])).push({ index: localIndex, changed: true, proposedText: r.proposedText });

            const sectionHistory = historyUpdate[section] || (historyUpdate[section] = {});
            const arr = sectionHistory[localIndex] || (sectionHistory[localIndex] = []);
            arr.push(r.proposedText);
            if (arr.length > 3) arr.shift();
          }
          await freshDoc.setFlag("cv-wicked-campaigns", "suggestionHistory", historyUpdate);
        }

        if (!changed.length) {
          ui.notifications.info(`iName Thee Helper found no clashes to fix in "${docName}"${skippedNote}.`);
          return;
        }
        await freshDoc.setFlag("cv-wicked-campaigns", "pendingSuggestions", bySection);
        const sectionLabels = Object.keys(bySection)
          .map((s) => `${bySection[s].length} ${HELPER_SECTIONS[s].label}${bySection[s].length === 1 ? "" : "s"}`)
          .join(", ");
        ui.notifications.info(`iName Thee Helper has suggestions ready for "${docName}" (${sectionLabels})${skippedNote}.`);
        freshDoc.sheet?.render(false);
      })
      .catch((err) => {
        ui.notifications.warn(`iName Thee Helper failed for "${docName}": ${err?.message ?? "Something went wrong."}`);
      })
      .finally(async () => {
        // Runs on every outcome (success, "no clashes", or failure) so the "Oracles" banner never
        // gets stuck up - re-fetched rather than reusing `doc`/`freshDoc` since either closure's
        // copy may be stale by now, and the document may have been deleted entirely.
        const closingDoc = await fromUuid(docUuid).catch(() => null);
        await closingDoc?.unsetFlag("cv-wicked-campaigns", "helperRunning").catch(() => {});
      });
  }

  static async #onReviewFriendSuggestions() {
    new HelperSuggestionsReviewApp(this.document).render(true);
  }
}

// Old-vs-proposed review for the iName Thee Helper's results, across every section (friends,
// enemies, lover) in one mixed list - Accept/Reject per suggestion, or Accept All/Reject All for
// the whole batch at once. Never auto-closes on its own; it stays open (showing "no pending
// suggestions" once the batch is cleared) so you're not stuck reopening it after every single
// decision - only the window's own close button dismisses it. Reads/writes the Backstory
// document's own flags directly, so it stays correct even if reopened after the sheet (or this
// app) was closed mid-review.
const helperSuggestionsReviewBase = foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2);

class HelperSuggestionsReviewApp extends helperSuggestionsReviewBase {
  constructor(backstory, options = {}) {
    super(options);
    this.backstory = backstory;
  }

  static DEFAULT_OPTIONS = {
    id: "friend-suggestions-review",
    classes: ["wicked-campaigns", "friend-suggestions-review"],
    window: { title: "iName Thee Helper — Review Suggestions", icon: "fa-solid fa-wand-magic-sparkles", resizable: true },
    position: { width: 520, height: 480 },
    actions: {
      accept: HelperSuggestionsReviewApp.#onAccept,
      reject: HelperSuggestionsReviewApp.#onReject,
      acceptAll: HelperSuggestionsReviewApp.#onAcceptAll,
      rejectAll: HelperSuggestionsReviewApp.#onRejectAll,
    },
  };

  static PARTS = {
    main: { template: "modules/cv-wicked-campaigns/templates/friend-suggestions-review.hbs", scrollable: [""] },
  };

  async _prepareContext(options) {
    const pending = this.backstory.getFlag("cv-wicked-campaigns", "pendingSuggestions") || {};
    const items = [];
    for (const [sectionId, suggestions] of Object.entries(pending)) {
      const cfg = HELPER_SECTIONS[sectionId];
      if (!cfg || !suggestions?.length) continue;
      const entries = cfg.getEntries(this.backstory);
      for (const s of suggestions) {
        const entry = entries[s.index];
        items.push({
          section: sectionId,
          sectionLabel: cfg.label,
          index: s.index,
          name: cfg.getDisplayName ? cfg.getDisplayName(entry, s.index) : (entry?.name || `(unknown ${cfg.label})`),
          currentSituation: cfg.getText(entry),
          proposedSituation: s.proposedText,
        });
      }
    }
    return { items };
  }

  static async #onAccept(event, target) {
    await this._resolveOne(target.dataset.section, Number(target.dataset.index), true);
  }

  static async #onReject(event, target) {
    await this._resolveOne(target.dataset.section, Number(target.dataset.index), false);
  }

  static async #onAcceptAll() {
    await this._resolveAll(true);
  }

  static async #onRejectAll() {
    await this._resolveAll(false);
  }

  async _resolveOne(section, index, accepted) {
    const doc = this.backstory;
    const pending = doc.getFlag("cv-wicked-campaigns", "pendingSuggestions") || {};
    const sectionPending = pending[section] || [];
    const suggestion = sectionPending.find((s) => s.index === index);
    if (!suggestion) return;

    if (accepted) await this._applyChanges(doc, { [section]: [suggestion] });

    const remaining = sectionPending.filter((s) => s.index !== index);
    await (remaining.length
      ? doc.setFlag("cv-wicked-campaigns", `pendingSuggestions.${section}`, remaining)
      : doc.unsetFlag("cv-wicked-campaigns", `pendingSuggestions.${section}`));

    await this.render();
    await doc.sheet?.render(false);
    this._bringToFrontSoon();
  }

  async _resolveAll(accepted) {
    const doc = this.backstory;
    const pending = doc.getFlag("cv-wicked-campaigns", "pendingSuggestions") || {};
    if (!Object.values(pending).some((arr) => arr?.length)) return;

    if (accepted) await this._applyChanges(doc, pending);

    await doc.unsetFlag("cv-wicked-campaigns", "pendingSuggestions");
    await this.render();
    await doc.sheet?.render(false);
    this._bringToFrontSoon();
  }

  // The Backstory sheet re-rendering above steals focus/z-order back at some unpredictable later
  // point (confirmed live - likely its ProseMirror editor re-initializing and auto-focusing
  // asynchronously), well past any single short delay. Re-asserting bringToFront a few times over
  // ~1.5s is a pragmatic way to reliably win that race without depending on exactly when the
  // sheet's internal refocus happens.
  _bringToFrontSoon() {
    for (const delay of [50, 150, 400, 900, 1500]) {
      setTimeout(() => this.rendered && this.bringToFront(), delay);
    }
  }

  // Applies every accepted suggestion (potentially spanning multiple sections) to the relevant
  // lifepath* flags + the rendered HTML in one single document update, rather than one write per
  // suggestion or per section.
  async _applyChanges(doc, bySection) {
    const updateData = {};
    const data = doc.getFlag(CC_MODULE_ID, "data") || {};
    let html = data.description || "";
    // Sections sharing a dataKey (lover + loverAppearance both read/write lifepathLover) reuse the
    // same working clone so accepting changes from both in one batch doesn't have the second
    // section's setEntries() clobber the first section's edit with a stale re-fetch of the doc.
    const workingEntries = new Map();
    for (const [section, suggestions] of Object.entries(bySection)) {
      const cfg = HELPER_SECTIONS[section];
      if (!cfg || !suggestions?.length) continue;
      const dataKey = cfg.dataKey || section;
      let entries = workingEntries.get(dataKey);
      if (!entries) {
        entries = foundry.utils.deepClone(cfg.getEntries(doc));
        workingEntries.set(dataKey, entries);
      }
      for (const s of suggestions) {
        if (!entries[s.index]) continue;
        cfg.setText(entries[s.index], s.proposedText);
        html = cfg.patchHtml(html, entries[s.index], s.index, s.proposedText);
      }
      Object.assign(updateData, cfg.setEntries(entries));
    }
    updateData["flags.campaign-codex.data.description"] = html;
    await doc.update(updateData);
  }
}

// ---- Party Sheet -----------------------------------------------------------
// GM-only roster of linked backstory entries, plus GM shortcuts for the fate
// pool / peril status that actually live on the separate party-state journal.
const partySheetBase = foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2);

class PartySheet extends partySheetBase {
  static DEFAULT_OPTIONS = {
    classes: ["wicked-campaigns", "party-sheet"],
    window: { icon: "fa-solid fa-users", resizable: true },
    position: { width: 760, height: 680 },
    actions: {
      spendFate: PartySheet.#onSpendFate,
      addFate: PartySheet.#onAddFate,
      subFate: PartySheet.#onSubFate,
      toggleInPeril: PartySheet.#onToggleInPeril,
      openMember: PartySheet.#onOpenMember,
      removeMember: PartySheet.#onRemoveMember,
      makeActive: PartySheet.#onMakeActive,
      rename: PartySheet.#onRename,
    },
  };

  static PARTS = {
    main: { template: "modules/cv-wicked-campaigns/templates/party-sheet.hbs", scrollable: [""] },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    // Fate pool / peril live on this party's own paired party-state journal,
    // independent of whichever party is currently marked "active".
    const state = findPartyStateForRoster(this.document);
    context.fatePool = state?.getFlag("cv-wicked-campaigns", "fatePool") ?? 0;
    context.inPeril = state?.getFlag("cv-wicked-campaigns", "inPeril") ?? false;
    context.editable = this.isEditable;
    context.isGM = game.user.isGM;
    context.isActiveParty = findActivePartyRosterSync()?.uuid === this.document.uuid;

    const memberUuids = this.document.getFlag(CC_MODULE_ID, "data")?.members || [];
    const members = await Promise.all(memberUuids.map(async (uuid) => {
      const doc = await fromUuid(uuid).catch(() => null);
      if (!doc) return null;
      const linkedNpcUuid = doc.getFlag("cv-wicked-campaigns", "linkedNpcUuid");
      const npcJournal = linkedNpcUuid ? await fromUuid(linkedNpcUuid).catch(() => null) : null;
      return {
        uuid: doc.uuid,
        name: doc.name,
        img: doc.getFlag(CC_MODULE_ID, "image") || npcJournal?.img || doc.img || "icons/svg/book.svg",
      };
    }));
    context.members = members.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;
    const roster = this.element.querySelector(".party-roster");
    if (!roster) return;
    new foundry.applications.ux.DragDrop.implementation({
      dropSelector: ".party-roster",
      permissions: { drop: () => this.isEditable },
      callbacks: { drop: this._onDropMember.bind(this) },
    }).bind(this.element);
  }

  async _onDropMember(event) {
    event.preventDefault();
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (_error) {
      return;
    }
    if (data?.type !== "JournalEntry" || !data.uuid) return;

    const doc = await fromUuid(data.uuid).catch(() => null);
    if (!doc) return;
    if (doc.getFlag(CC_MODULE_ID, "type") !== CC_BACKSTORY_TYPE) {
      ui.notifications.warn(`${doc.name} isn't a Backstory codex entry.`);
      return;
    }

    const members = foundry.utils.deepClone(this.document.getFlag(CC_MODULE_ID, "data")?.members || []);
    if (members.includes(doc.uuid)) return;
    members.push(doc.uuid);
    await this.document.update({ "flags.campaign-codex.data.members": members });
  }

  static async #onSpendFate() {
    const state = await ensurePartyState(this.document);
    if (!state) {
      ui.notifications.warn("This party's Fate Pool state is missing. Ask your GM to open this party's sheet to repair it.");
      return;
    }
    const current = state.getFlag("cv-wicked-campaigns", "fatePool") ?? 0;
    if (current <= 0 && !game.user.isGM) {
      ui.notifications.warn("The Fate Pool is empty!");
      return;
    }
    await updateFatePoolForState(state, -1, `Spent from ${this.document.name}`);
  }

  static async #onAddFate() {
    if (!game.user.isGM) return;
    await updateFatePoolForState(await ensurePartyState(this.document), 1, `GM Action (${this.document.name})`);
  }

  static async #onSubFate() {
    if (!game.user.isGM) return;
    await updateFatePoolForState(await ensurePartyState(this.document), -1, `GM Action (${this.document.name})`);
  }

  static async #onToggleInPeril() {
    if (!game.user.isGM) return;
    const state = await ensurePartyState(this.document);
    const current = state?.getFlag("cv-wicked-campaigns", "inPeril") ?? false;
    await setInPerilForState(state, !current);
  }

  static async #onOpenMember(event, target) {
    const doc = await fromUuid(target.dataset.uuid).catch(() => null);
    doc?.sheet?.render(true);
  }

  static async #onRemoveMember(event, target) {
    event.preventDefault();
    if (!this.isEditable) return;
    const uuid = target.dataset.uuid;
    const members = (this.document.getFlag(CC_MODULE_ID, "data")?.members || []).filter((m) => m !== uuid);
    await this.document.update({ "flags.campaign-codex.data.members": members });
  }

  static async #onMakeActive() {
    if (!game.user.isGM) return;
    await setActivePartyRoster(this.document.uuid);
    this.render(true);
  }

  // Same gap BackstorySheet had: this custom sheet has no name field of its own, so without
  // this there'd be no way to rename the roster short of hunting for it in the sidebar directory.
  // Safe to rename freely - nothing keys off the literal "The Party" string, only its uuid/flags.
  static async #onRename(event, target) {
    const current = this.document.name;
    const newName = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Rename Party" },
      content: `<div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(current)}" autofocus></div>`,
      ok: {
        icon: "fas fa-check",
        label: "Rename",
        callback: (event, button) => button.form.elements.name.value.trim(),
      },
      rejectClose: false,
    }).catch(() => null);
    if (!newName || newName === current) return;
    await this.document.update({ name: newName });
  }
}

// ---- Session Zero Summary Sheet -------------------------------------------
// A GM-facing (by default) read log of a Session Zero Q&A game - fed by the
// Complete Card Management deck/card actions further down this file. Entries
// are append-only: each pairs the card's face image with a GM-typed title
// and answer, plus whoever's turn it was in the combat tracker at record time.
const sessionZeroSheetBase = foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2);

class SessionZeroSheet extends sessionZeroSheetBase {
  static DEFAULT_OPTIONS = {
    classes: ["wicked-campaigns", "session-zero-sheet"],
    window: { icon: "fa-solid fa-clipboard-question", resizable: true },
    position: { width: 640, height: 760 },
    actions: {
      rename: SessionZeroSheet.#onRename,
      "export-pdf": SessionZeroSheet.#onExportPdf,
      "view-card-image": SessionZeroSheet.#onViewCardImage,
    },
  };

  static PARTS = {
    main: { template: "modules/cv-wicked-campaigns/templates/session-zero-sheet.hbs", scrollable: [".session-zero-entries"] },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = this.document.getFlag(CC_MODULE_ID, "data") || {};
    context.entries = (data.entries || []).map((entry) => ({
      ...entry,
      timestampLabel: entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "",
    }));
    context.editable = this.isEditable;
    return context;
  }

  // Same reasoning as BackstorySheet/PartySheet's #onRename: this custom template has no name
  // field of its own, so without this there'd be no way to rename a summary short of hunting for
  // it in the sidebar directory.
  static async #onRename(event, target) {
    const current = this.document.name;
    const newName = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Rename Session Zero Summary" },
      content: `<div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(current)}" autofocus></div>`,
      ok: {
        icon: "fas fa-check",
        label: "Rename",
        callback: (event, button) => button.form.elements.name.value.trim(),
      },
      rejectClose: false,
    }).catch(() => null);
    if (!newName || newName === current) return;
    await this.document.update({ name: newName });
  }

  static async #onExportPdf() {
    ui.notifications.info(`Building PDF for "${this.document.name}"…`);
    try {
      await exportSessionZeroSummaryPdf(this.document);
    } catch (err) {
      console.error("Wicked Campaigns | Failed to export Session Zero summary PDF", err);
      ui.notifications.error(`Failed to build PDF: ${err?.message ?? "Something went wrong."}`);
    }
  }

  // Same viewer every other card image in the module opens through (CardHud's own "View Card
  // Image" button, the lib-wrapper replacement for Foundry's native ImagePopout) - reused here
  // rather than falling back to a plain browser image tab, so a recorded answer's card art gets
  // the same zoomable viewer treatment everywhere it shows up.
  static #onViewCardImage(event, target) {
    const src = target.dataset.src;
    if (!src) return;
    CardImageViewerApp.open(src, target.dataset.title || "");
  }
}

// Sortable rather than locale-formatted (unlike the per-entry timestamps shown in the summary
// sheet itself) so multiple summaries also sort chronologically by name in the sidebar directory,
// not just alphabetically-identically.
function formatSortableTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Creates a new Session Zero Summary journal. Unlike Backstory/Party, these are deliberately
// multi-instance with no "active one" concept - a GM can have as many running (or finished) as
// they like, purely for reading back later, so there's no getOrCreate/singleton wrapper here.
// `limits`, when provided, is the { villainMax, arcanaPerPlayerMax, moonsMax, mobiusMax } object
// collected by the Session Zero setup dialog - stored on the summary itself so the Reassign Turn
// Order panel and the post-answer threshold checks can both read it back from one place.
async function createSessionZeroSummary(name = "Session Zero Summary", limits = null) {
  return JournalEntry.create({
    name,
    folder: getWickedCampaignsFolder(CC_SESSION_ZERO_TYPE)?.id,
    // GM-only by default per spec; a GM can manually widen visibility later via the sheet's own
    // standard Foundry ownership configuration, same as any other JournalEntry.
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
    flags: {
      [CC_MODULE_ID]: {
        type: CC_SESSION_ZERO_TYPE,
        data: { entries: [] },
        "icon-override": SESSION_ZERO_ICON,
      },
      "cv-wicked-campaigns": limits ? {
        sessionZeroLimits: limits,
        // Each suit's discard prompt fires exactly once per game, regardless of the GM's answer.
        // "sessionComplete" is a separate, derived flag (see checkSessionZeroThresholds) - true
        // once every *configured* tier above has fired its own discard prompt.
        sessionZeroDiscardPrompted: { villain: false, majorArcana: false, moons: false, mobius: false, roses: false, sessionComplete: false },
      } : {},
      core: { sheetClass: "cv-wicked-campaigns.SessionZeroSheet" },
    },
  });
}

async function addSessionZeroEntry(summary, entry) {
  const data = summary.getFlag(CC_MODULE_ID, "data") || {};
  const entries = foundry.utils.deepClone(data.entries || []);
  entries.push(entry);
  await summary.update({ "flags.campaign-codex.data.entries": entries });
}

// ---- Wizard Class --------------------------------------------------------
class LifepathWizard extends foundry.applications.api.ApplicationV2 {
  constructor(targetActor, tables, options = {}) {
    super({ id: `qos-lifepath-${targetActor.id}`, ...options });
    this.actor = targetActor;
    this.tableText = tables.text;
    this.tableWeights = tables.weights;
    this.tableDocs = tables.docs;
    this.step = 1;
    this.saveResult = null;
    const details = targetActor.system?.details || {};
    this.data = {
      // Personal Info (Biography)
      alignment: details.alignment || "",
      gender: details.gender || "",
      height: details.height || "",
      weight: details.weight || "",
      age: details.age || "",
      weightTouched: !!details.weight,
      heightOptions: [],
      ageOptions: [],

      // Lifepath
      status: "", childhood: "",
      parentsBranch: "", parentalDisaster: "", familySecret: "",
      standingBranch: "", familyCrisis: "",
      familyGoal: "", siblings: [], birthOrder: 0, siblingsUnknown: false,
      motherName: "", fatherName: "",
      motherBond: "", fatherBond: "",
      // Helper-only fields - never set by the wizard itself, only ever written by the iName Thee
      // Helper's "add a new field" flow, so these always start blank here.
      motherDescription: "", fatherDescription: "",
      friends: [], enemies: [],
      romanceStatus: "", romanceDetail: "",
      loverName: "", loverGender: "", loverRace: "", loverProfession: "", loverAppearance: "",
      hairColor: details.hair || "", hairStyle: "", eyeColor: details.eyes || "", skin: details.skin || "", personalStyle: "",
      trait: "", values: "", valuedObject: "", lostIt: "", fear: "", valuedPerson: "", quirk: "", faith: details.faith || "",
      useTraitPairs: false, traitMode: "selected", traitPairs: {},
      lifeEvents: [],
    };
    const flags = targetActor.flags?.["cv-wicked-campaigns"] || {};
    this.data.loverGender = details.loverGender || flags.loverGender || "";
    this.data.motherName = details.motherName || flags.motherName || this._withFamilyLastName(this.generateNames("female", { firstNameOnly: true }));
    this.data.fatherName = details.fatherName || flags.fatherName || this._withFamilyLastName(this.generateNames("male", { firstNameOnly: true }));
    const hasExistingTraits = !!flags.useTraitPairs;
    this.data.useTraitPairs = hasExistingTraits;
    if (hasExistingTraits) {
      this.data.traitPairs = foundry.utils.deepClone(flags.traitPairs || {});
      for (let i = 0; i < TRAIT_PAIRS.length; i++) {
        if (this.data.traitPairs[i] === undefined) this.data.traitPairs[i] = 10;
      }
    } else {
      for (let i = 0; i < TRAIT_PAIRS.length; i++) this.data.traitPairs[i] = 10;
    }
    this._generateHeightOptions();
    this._generateAgeOptions();
  }

  _generateHeightOptions() {
    this.data.heightOptions = HEIGHT_BANDS.map((b) => ({
      band: b.band,
      picks: pickTwoDistinct(b.min, b.max).map(formatHeight),
    }));
  }

  _generateAgeOptions() {
    this.data.ageOptions = AGE_STAGES.map((s) => ({
      stage: s.stage,
      picks: pickTwoDistinct(s.min, s.max).map(String),
    }));
  }

  _parseHeightInches(str) {
    if (!str) return null;
    const m = String(str).match(/(\d+)\s*(?:'|’|ft|feet|foot)\s*(\d+)?/i);
    if (m) return parseInt(m[1], 10) * 12 + (m[2] ? parseInt(m[2], 10) : 0);
    return null;
  }

  _defaultWeightFromHeight() {
    const inches = this._parseHeightInches(this.data.height) ?? 68; // fallback 5'8"
    return `${Math.round((22 * inches * inches) / 703)} lbs`;
  }

  _randomField(field) {
    this._touch();
    switch (field) {
      case "alignment": this.data.alignment = pick(ALIGNMENTS); break;
      case "gender": {
        const r = Math.random();
        this.data.gender = r < 0.01 ? "Unique" : (r < 0.505 ? "Male" : "Female");
        break;
      }
    }
  }

  static DEFAULT_OPTIONS = {
    id: "qos-lifepath",
    classes: ["qos-lifepath-wizard"],
    tag: "div",
    window: { title: "Lifepath Wizard", icon: "fa-solid fa-scroll", resizable: true },
    position: { width: 900, height: "auto" },
  };

  get title() { return `Lifepath Wizard — ${this.actor?.name ?? ""}`; }

  // Dozens of call sites throughout this wizard call this.render() as each step/field changes,
  // and steps vary wildly in height - with "auto" height, Foundry recenters the window on every
  // one of them, fighting the GM/player having dragged it (same issue as DramaSetupDialog etc.).
  // Overriding render() once here fixes every call site instead of wrapping each individually.
  async render(...args) {
    const { top, left } = this.position;
    const result = await super.render(...args);
    if (Number.isFinite(top) && Number.isFinite(left)) this.setPosition({ top, left });
    return result;
  }

  async _renderHTML() {
    injectStyles();
    const s = this.step;
    const pct = Math.round((s / STEP_COUNT) * 100);
    const header = `
      <header class="qbw-header">
        <div class="qbw-step-no">Step ${s} of ${STEP_COUNT}</div>
        <h2 class="qbw-title">${STEP_TITLES[s]}</h2>
        <div class="qbw-progress"><div class="qbw-progress-bar" style="width:${pct}%"></div></div>
      </header>`;
    return `<div class="qbw">${header}
      <div class="qbw-main">
        <section class="qbw-body">${this._renderBody()}</section>
        <aside class="qbw-aside">${this._renderAside()}</aside>
      </div>
      ${this._renderFooter()}</div>`;
  }

  _replaceHTML(result, content) {
    const SCROLLERS = [".qbw-body", ".qbw-aside"];
    const tops = {};
    for (const sel of SCROLLERS) { const p = content.querySelector(sel); if (p) tops[sel] = p.scrollTop; }
    content.innerHTML = result;
    for (const sel of SCROLLERS) { const n = content.querySelector(sel); if (n && tops[sel]) n.scrollTop = tops[sel]; }
  }

  _tableRow(field, label, table) {
    const list = this.tableText[table] || [];
    const cur = this.data[field];
    const opts = ['<option value="">— choose or roll —</option>'].concat(
      list.map((txt, i) => `<option value="${esc(txt)}" ${txt === cur ? "selected" : ""}>${i + 1}. ${esc(txt)}</option>`)
    ).join("");
    return `<label class="qbw-label">${esc(label)}</label>
      <div class="qbw-row">
        <select class="qbw-select" data-field="${field}">${opts}</select>
        <button type="button" class="qbw-btn" data-act="roll" data-field="${field}" data-table="${table}"><i class="fa-solid fa-dice-d20"></i> Roll</button>
      </div>`;
  }

  _branchRow(field, name, label) {
    const b = BRANCH[name];
    const cur = this.data[field];
    const opts = ['<option value="">— choose or roll —</option>'].concat(
      b.options.map((o) => `<option value="${o.value}" ${o.value === cur ? "selected" : ""}>${esc(o.label)}</option>`)
    ).join("");
    return `<label class="qbw-label">${esc(label)}</label>
      <div class="qbw-row">
        <select class="qbw-select" data-field="${field}" data-rerender="1">${opts}</select>
        <button type="button" class="qbw-btn" data-act="rollbranch" data-field="${field}" data-branch="${name}"><i class="fa-solid fa-dice-d20"></i> Roll d${b.die}</button>
      </div>`;
  }

  _selectRow(field, options) {
    const current = this.data[field];
    const opts = ['<option value="">— choose —</option>']
      .concat(options.map((o) => `<option value="${esc(o)}" ${o === current ? "selected" : ""}>${esc(o)}</option>`))
      .join("");
    return `
      <label class="qbw-label">${STEP_TITLES[this.step]}</label>
      <div class="qbw-row">
        <select class="qbw-select" data-field="${field}">${opts}</select>
        <button type="button" class="qbw-btn" data-act="random" data-field="${field}">
          <i class="fa-solid fa-dice-d20"></i> Random
        </button>
      </div>`;
  }

  _chipGroups(groups, field, labelKey) {
    return groups.map((g) => `
      <div class="qbw-group">
        <div class="qbw-group-label">${esc(g[labelKey])}</div>
        <div class="qbw-chips">
          ${g.picks.map((p) => `<button type="button" class="qbw-chip ${p === this.data[field] ? "is-active" : ""}" data-act="preset" data-field="${field}" data-value="${esc(p)}">${esc(p)}</button>`).join("")}
        </div>
      </div>`).join("");
  }

  _renderBody() {
    switch (this.step) {
      case 1: return this._selectRow("alignment", ALIGNMENTS) + `
        <div class="qbw-divider" style="margin: 20px 0;"></div>
        <div style="display: flex; justify-content: center; width: 100%;">
          <button type="button" class="qbw-btn qbw-primary qbw-full-width" style="height: 38px; font-size: 0.95rem; border: 1px solid var(--dnd5e-color-gold, #c9a054);" data-act="roll-all-backstory">
            <i class="fa-solid fa-dice-d20"></i> Roll Complete Backstory
          </button>
        </div>`;
      case 2: return this._selectRow("gender", GENDERS) +
        `<div class="qbw-hint">If Unique is picked or generated, it's up to you to customize it later.</div>`;
      case 3: return `
        <label class="qbw-label">Generated options</label>
        ${this._chipGroups(this.data.heightOptions, "height", "band")}
        <button type="button" class="qbw-btn qbw-reroll" data-act="reroll" data-field="height">
          <i class="fa-solid fa-rotate"></i> Reroll options
        </button>
        <div class="qbw-divider"></div>
        <label class="qbw-label">Your height</label>
        <input type="text" class="qbw-input" data-field="height" value="${esc(this.data.height)}" placeholder="e.g. 5'8&quot;">
        <div class="qbw-hint">Pick a generated option above or type your own (human range 4'11"–6'7").</div>`;
      case 4: {
        if (!this.data.weightTouched) this.data.weight = this._defaultWeightFromHeight();
        return `
          <label class="qbw-label">Weight</label>
          <div class="qbw-row">
            <input type="text" class="qbw-input" data-field="weight" value="${esc(this.data.weight)}" placeholder="e.g. 150 lbs">
            <button type="button" class="qbw-btn" data-act="reset-weight">
              <i class="fa-solid fa-rotate"></i> Randomize
            </button>
          </div>
          <div class="qbw-hint">Defaults to a healthy weight for the chosen height (${esc(this.data.height || "—")}). Edit freely.</div>`;
      }
      case 5: return `
        <label class="qbw-label">Generated options</label>
        ${this._chipGroups(this.data.ageOptions, "age", "stage")}
        <button type="button" class="qbw-btn qbw-reroll" data-act="reroll" data-field="age">
          <i class="fa-solid fa-rotate"></i> Reroll options
        </button>
        <div class="qbw-divider"></div>
        <label class="qbw-label">Your age</label>
        <input type="text" class="qbw-input" data-field="age" value="${esc(this.data.age)}" placeholder="e.g. 27">
        <div class="qbw-hint">Pick a generated option above or type your own.</div>`;
      case 6: return this._renderFamily();
      case 7: return this._renderFriendsEnemies();
      case 8: return this._renderRomance();
      case 9: return this._renderAppearance();
      case 10: return this._renderPersonality();
      case 11: return this._renderLifeEvents();
      case 12: return this._renderTraitPairs();
      default: return "";
    }
  }

  _renderFamily() {
    const d = this.data;
    let h = `<div class="qbw-section-title">Family &amp; Money</div>`;
    h += this._tableRow("status", "Social standing (Table 1)", "status");
    h += this._tableRow("childhood", "Childhood event (1A)", "childhood");
    h += `<div class="qbw-section-title">Parents</div>`;
    h += this._branchRow("parentsBranch", "parents", "Family situation (1B)");
    if (d.parentsBranch === "disaster") h += this._tableRow("parentalDisaster", "What happened to your parents? (1C)", "parentalDisaster");
    else if (d.parentsBranch === "special") h += this._tableRow("familySecret", "Your family's secret (1D)", "familySecret");
    else if (d.parentsBranch === "alive") h += `<div class="qbw-hint">Both parents are alive and well — no further roll.</div>`;
    h += `<label class="qbw-label">Mother's Name</label>
      <div class="qbw-row">
        <input type="text" class="qbw-input" data-field="motherName" value="${esc(d.motherName || "")}" placeholder="[Mother Name]">
        <button type="button" class="qbw-btn" data-act="roll-parent-name" data-gender="female" data-field="motherName"><i class="fa-solid fa-dice-d20"></i> Roll</button>
      </div>`;
    h += this._tableRow("motherBond", "Bond with your mother (0R)", "familyBond");
    h += `<label class="qbw-label">Father's Name</label>
      <div class="qbw-row">
        <input type="text" class="qbw-input" data-field="fatherName" value="${esc(d.fatherName || "")}" placeholder="[Father Name]">
        <button type="button" class="qbw-btn" data-act="roll-parent-name" data-gender="male" data-field="fatherName"><i class="fa-solid fa-dice-d20"></i> Roll</button>
      </div>`;
    h += this._tableRow("fatherBond", "Bond with your father (0R)", "familyBond");
    h += `<div class="qbw-hint">A bond is kept for each parent whether they are living or not.</div>`;
    h += `<div class="qbw-section-title">Standing &amp; Legacy</div>`;
    h += this._branchRow("standingBranch", "standing", "Family standing (1E)");
    if (d.standingBranch === "bad") h += this._tableRow("familyCrisis", "Current family crisis (1F)", "familyCrisis");
    else if (d.standingBranch === "good") h += `<div class="qbw-hint">Your family status is good — no crisis.</div>`;
    h += this._tableRow("familyGoal", "Family goal (1G)", "familyGoal");
    h += this._renderSiblings();
    return h;
  }

  _listCard(listKey, idx, title, fields) {
    const entry = this.data[listKey][idx];
    let body = "";
    for (const [sub, label, table] of fields) {
      const list = this.tableText[table] || [];
      const cur = entry[sub] || "";
      const opts = ['<option value="">— choose or roll —</option>'].concat(
        list.map((txt, i) => `<option value="${esc(txt)}" ${txt === cur ? "selected" : ""}>${i + 1}. ${esc(txt)}</option>`)
      ).join("");
      body += `<label class="qbw-label" style="margin-top:6px">${esc(label)}</label>
        <div class="qbw-row">
          <select class="qbw-select" data-list="${listKey}" data-idx="${idx}" data-sub="${sub}">${opts}</select>
          <button type="button" class="qbw-btn" data-act="roll-list" data-list="${listKey}" data-idx="${idx}" data-sub="${sub}" data-table="${table}"><i class="fa-solid fa-dice-d20"></i> Roll</button>
        </div>`;
    }
    return `<div class="qbw-card">
      <div class="qbw-card-head">
        <span class="qbw-card-title">${esc(title)} ${idx + 1}</span>
        <button type="button" class="qbw-iconbtn" data-act="reroll-entry" data-list="${listKey}" data-idx="${idx}"><i class="fa-solid fa-rotate"></i> Reroll</button>
        <button type="button" class="qbw-iconbtn" data-act="remove-entry" data-list="${listKey}" data-idx="${idx}"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <label class="qbw-label">Name</label>
      <div class="qbw-row">
        <input type="text" class="qbw-input" data-list="${listKey}" data-idx="${idx}" data-sub="name" value="${esc(entry.name || "")}" placeholder="[${title} Name]">
        <button type="button" class="qbw-btn" data-act="roll-fe-name" data-list="${listKey}" data-idx="${idx}"><i class="fa-solid fa-dice-d20"></i> Roll</button>
      </div>
      ${body}
      <div class="qbw-card-attrs">
        <label class="qbw-mini">Sex
          <select class="qbw-select qbw-inline" data-list="${listKey}" data-idx="${idx}" data-sub="sex">
            <option value="male" ${entry.sex === "male" ? "selected" : ""}>Male</option>
            <option value="female" ${entry.sex === "female" ? "selected" : ""}>Female</option>
          </select>
        </label>
      </div>
    </div>`;
  }

  _renderFriendsEnemies() {
    const d = this.data;
    const friendFields = [["situation", "Situation (Table 2)", "friendSituation"], ["race", "Identity (2B)", "feRace"], ["profession", "Profession (2C)", "feProfession"]];
    const enemyFields  = [["situation", "Situation (2A)", "enemySituation"], ["race", "Identity (2B)", "feRace"], ["profession", "Profession (2C)", "feProfession"]];
    let h = `<div class="qbw-section-title">Friends</div>
      <div class="qbw-count">
        <span class="qbw-label" style="margin:0">Count</span>
        <input type="number" class="qbw-num" min="0" max="20" value="${d.friends.length}" data-countfield="friends">
        <button type="button" class="qbw-btn" data-act="rollcount" data-list="friends" data-die="6"><i class="fa-solid fa-dice-d6"></i> Roll 1d6</button>
        <button type="button" class="qbw-btn" data-act="gen" data-list="friends"><i class="fa-solid fa-arrows-rotate"></i> Generate</button>
        <button type="button" class="qbw-btn" data-act="add" data-list="friends"><i class="fa-solid fa-plus"></i> Add</button>
      </div>`;
    if (!d.friends.length) h += `<div class="qbw-hint">Roll 1d6 (or set a count) to generate friends.</div>`;
    h += d.friends.map((_, i) => this._listCard("friends", i, "Friend", friendFields)).join("");
    h += `<div class="qbw-section-title">Enemies</div>
      <div class="qbw-count">
        <span class="qbw-label" style="margin:0">Count</span>
        <input type="number" class="qbw-num" min="0" max="20" value="${d.enemies.length}" data-countfield="enemies">
        <button type="button" class="qbw-btn" data-act="rollcount" data-list="enemies" data-die="4"><i class="fa-solid fa-dice-d4"></i> Roll 1d4</button>
        <button type="button" class="qbw-btn" data-act="gen" data-list="enemies"><i class="fa-solid fa-arrows-rotate"></i> Generate</button>
        <button type="button" class="qbw-btn" data-act="add" data-list="enemies"><i class="fa-solid fa-plus"></i> Add</button>
      </div>`;
    if (!d.enemies.length) h += `<div class="qbw-hint">Roll 1d4 (or set a count) to generate enemies.</div>`;
    h += d.enemies.map((_, i) => this._listCard("enemies", i, "Enemy", enemyFields)).join("");
    return h;
  }

  _renderSiblings() {
    const d = this.data;
    const Y = d.siblings.length + 1;
    let X = Number(d.birthOrder) || 0;
    if (X > Y) { X = Y; d.birthOrder = X; }
    const rolled = X >= 1;
    const onlyChild = rolled && d.siblings.length === 0;
    let h = `<div class="qbw-section-title">Siblings</div>`;

    if (d.siblingsUnknown) {
      h += `<div class="qbw-sib-order">You may have siblings — <strong>as far as you know</strong> — but none are known to you.</div>`;
    } else if (!rolled) {
      h += `<div class="qbw-hint">Roll to see whether you have siblings, your birth order, and your family.</div>`;
    } else if (onlyChild) {
      h += `<div class="qbw-sib-order">You are an <strong>only child</strong>.</div>`;
    } else {
      const xOpts = [];
      for (let p = 1; p <= Y; p++) xOpts.push(`<option value="${p}" ${p === X ? "selected" : ""}>${ordinal(p)}</option>`);
      h += `<div class="qbw-sib-order">You are the
        <select class="qbw-select qbw-inline" data-field="birthOrder" data-rerender="1">${xOpts.join("")}</select>
        of <strong>${Y}</strong> children.</div>`;
    }

    h += `<div class="qbw-count">
      <button type="button" class="qbw-btn" data-act="roll-family"><i class="fa-solid fa-dice-d20"></i> Roll Siblings &amp; Family</button>
      ${rolled ? `<button type="button" class="qbw-btn" data-act="add" data-list="siblings"><i class="fa-solid fa-plus"></i> Add younger sibling</button>` : ""}
    </div>`;

    if (rolled && d.siblings.length) {
      const positions = [];
      for (let p = 1; p <= Y; p++) if (p !== X) positions.push(p);
      h += d.siblings.map((_, i) => this._siblingCard(i, positions[i], X)).join("");
    }
    return h;
  }

  _siblingCard(idx, position, X) {
    const s = this.data.siblings[idx];
    const older = position < X;
    const dead = s.alive === false;
    const kind = this._siblingKind(s, position, X);
    const idTwin = kind.key === "identical";
    const sexVal = idTwin ? this._pcSex() : (s.sex || "");
    const rowFor = (sub, label, table) => {
      const list = this.tableText[table] || [];
      const cur = s[sub] || "";
      const opts = ['<option value="">— choose or roll —</option>'].concat(
        list.map((txt, i) => `<option value="${esc(txt)}" ${txt === cur ? "selected" : ""}>${i + 1}. ${esc(txt)}</option>`)
      ).join("");
      return `<label class="qbw-label" style="margin-top:6px">${esc(label)}</label>
        <div class="qbw-row">
          <select class="qbw-select" data-list="siblings" data-idx="${idx}" data-sub="${sub}">${opts}</select>
          <button type="button" class="qbw-btn" data-act="roll-sib" data-idx="${idx}" data-sub="${sub}" data-table="${table}"><i class="fa-solid fa-dice-d20"></i> Roll</button>
        </div>`;
    };
    return `<div class="qbw-card${dead ? " is-deceased" : ""}">
      <div class="qbw-card-head">
        <span class="qbw-card-title">${ordinal(position)} child <span class="qbw-tag">${older ? "older" : "younger"}</span>${kind.label ? `<span class="qbw-tag qbw-tag-${kind.key}">${esc(kind.label)}</span>` : ""}${dead ? '<span class="qbw-tag qbw-tag-dead">deceased</span>' : ""}</span>
        <button type="button" class="qbw-iconbtn" data-act="reroll-entry" data-list="siblings" data-idx="${idx}"><i class="fa-solid fa-rotate"></i> Reroll</button>
        <button type="button" class="qbw-iconbtn" data-act="remove-entry" data-list="siblings" data-idx="${idx}"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <label class="qbw-label">Name</label>
      <div class="qbw-row">
        <input type="text" class="qbw-input" data-list="siblings" data-idx="${idx}" data-sub="name" value="${esc(s.name || "")}" placeholder="[Sibling Name]">
        <button type="button" class="qbw-btn" data-act="roll-sib-name" data-idx="${idx}"><i class="fa-solid fa-dice-d20"></i> Roll</button>
      </div>
      ${rowFor("relation", "Sibling (1H)", "siblings")}
      ${rowFor("bond", "Relationship bond (0R)", "familyBond")}
      <div class="qbw-card-attrs">
        <label class="qbw-mini">Sex
          <select class="qbw-select qbw-inline" data-list="siblings" data-idx="${idx}" data-sub="sex" ${idTwin ? "disabled" : ""}>
            <option value="male" ${sexVal === "male" ? "selected" : ""}>Male</option>
            <option value="female" ${sexVal === "female" ? "selected" : ""}>Female</option>
          </select>
        </label>
        ${idTwin ? `<span class="qbw-mini-note">matches you — identical twin</span>` : ""}
        <label class="qbw-check" style="margin:0">
          <input type="checkbox" data-list="siblings" data-idx="${idx}" data-sub="alive" data-rerender="1" ${dead ? "" : "checked"}>
          Living (1d100 &gt; ${SIBLING_DEATH_PCT})
        </label>
      </div>
    </div>`;
  }

  _renderRomance() {
    const d = this.data;
    let h = this._branchRow("romanceStatus", "romance", "Romance status (Table 3)");
    if (d.romanceStatus && ROMANCE_DETAIL[d.romanceStatus]) {
      const cfg = ROMANCE_DETAIL[d.romanceStatus];
      h += this._tableRow("romanceDetail", cfg.label, cfg.table);
    }
    if (d.romanceStatus && d.romanceStatus !== "lookout") {
      const isTragic = d.romanceStatus === "tragic";
      h += `<div class="qbw-section-title">${isTragic ? "Their Lost Lover" : "Their Lover"}</div>`;
      h += `<label class="qbw-label">Lover's Name</label>
        <div class="qbw-row">
          <input type="text" class="qbw-input" data-field="loverName" value="${esc(d.loverName)}" placeholder="${isTragic ? "[Lost Lover Name]" : "[Lover Name]"}">
          <button type="button" class="qbw-btn" data-act="roll-lover-name"><i class="fa-solid fa-dice-d20"></i> Roll</button>
        </div>`;
      h += `<div class="qbw-card-attrs" style="margin-top: 6px; margin-bottom: 8px;">
        <label class="qbw-mini">Sex
          <select class="qbw-select qbw-inline" data-field="loverGender">
            <option value="male" ${d.loverGender === "male" ? "selected" : ""}>Male</option>
            <option value="female" ${d.loverGender === "female" ? "selected" : ""}>Female</option>
            <option value="neutral" ${d.loverGender === "neutral" ? "selected" : ""}>Neutral</option>
          </select>
        </label>
      </div>`;
      h += this._tableRow("loverRace", "Cultural background (3E)", "loverRace");
      h += this._tableRow("loverProfession", "Profession (3F)", "loverProfession");
      h += this._tableRow("loverAppearance", "Appearance (3G)", "loverAppearance");
    } else if (d.romanceStatus === "lookout") {
      h += `<div class="qbw-hint">No current partner — nothing more to detail here.</div>`;
    }
    return h;
  }

  _renderAppearance() {
    let h = this._tableRow("hairColor", "Hair colour (Table 4)", "hairColor");
    h += this._tableRow("hairStyle", "Hair style (4A)", "hairStyle");
    h += this._tableRow("eyeColor", "Eye colour (4B)", "eyeColor");
    h += this._tableRow("skin", "Skin tone (4AA)", "skinTone");
    h += this._tableRow("personalStyle", "Personal style (4C)", "personalStyle");
    return h;
  }

  _renderPersonality() {
    let h = this._tableRow("trait", "Defining personality trait (Table 5)", "trait");
    h += this._tableRow("values", "What you value most (5A)", "values");
    h += this._tableRow("valuedObject", "Most valued object (5B)", "valuedObject");
    h += this._tableRow("lostIt", "If you lost it… (5C)", "lostIt");
    h += this._tableRow("fear", "Greatest fear (5D)", "fear");
    h += this._tableRow("valuedPerson", "Person you value most (5E)", "valuedPerson");
    h += this._tableRow("quirk", "Personality quirk (5F → 5G/5H)", "quirk");
    h += this._tableRow("faith", "Faith (5I)", "faith");
    return h;
  }

  _pairBudget() {
    let s = 0;
    for (let i = 0; i < TRAIT_PAIRS.length; i++) s += Math.abs((this.data.traitPairs[i] ?? 10) - 10);
    return s;
  }

  _renderTraitPairs() {
    const d = this.data;
    let h = `<label class="qbw-check">
        <input type="checkbox" data-field="useTraitPairs" data-rerender="1" ${d.useTraitPairs ? "checked" : ""}>
        Use the detailed Trait Pairs system
      </label>
      <div class="qbw-hint">Optional, more demanding alternative to the single Personality Trait. Each pair sums to 20.</div>`;
    if (!d.useTraitPairs) return h;
    h += `<div class="qbw-modes">
        <button type="button" class="qbw-btn ${d.traitMode === "random" ? "qbw-primary" : ""}" data-act="pairs-mode" data-mode="random">Random</button>
        <button type="button" class="qbw-btn ${d.traitMode === "selected" ? "qbw-primary" : ""}" data-act="pairs-mode" data-mode="selected">Selected</button>
      </div>`;
    if (d.traitMode === "random") {
      h += `<div class="qbw-count">
          <button type="button" class="qbw-btn qbw-primary" data-act="pairs-roll"><i class="fa-solid fa-dice"></i> Roll all (3d6 each)</button>
          <button type="button" class="qbw-btn" data-act="pairs-reset"><i class="fa-solid fa-rotate-left"></i> Reset to 10/10</button>
        </div>
        <div class="qbw-hint">Rolls 3d6 for the left trait of each pair; the right trait is 20 minus that.</div>`;
    } else {
      h += `<div class="qbw-count">
          <button type="button" class="qbw-btn" data-act="pairs-reset"><i class="fa-solid fa-rotate-left"></i> Reset to 10/10</button>
        </div>
        <div class="qbw-hint">Suggested budget: +3 to five traits, then distribute 15 more (raising one side lowers its opposite).</div>`;
    }
    h += TRAIT_PAIRS.map((pr, i) => {
      const l = d.traitPairs[i] ?? 10;
      return `<div class="qbw-pair">
          <div class="qbw-pair-l"><span class="qbw-pair-name">${pr[0]}</span> <span class="qbw-pair-val" data-pairleft="${i}">${l}</span></div>
          <div class="qbw-pair-mid">/</div>
          <div class="qbw-pair-r"><span class="qbw-pair-val" data-pairright="${i}">${20 - l}</span> <span class="qbw-pair-name">${pr[1]}</span></div>
          <input type="range" class="qbw-slider" min="0" max="20" value="${l}" data-pair="${i}">
        </div>`;
    }).join("");
    h += `<div class="qbw-budget">Points allocated: <span data-pairbudget>${this._pairBudget()}</span> / 30 (suggested)</div>`;
    return h;
  }

  _renderLifeEvents() {
    const d = this.data;
    let h = `<div class="qbw-hint">Ask your GM how many life events to roll. Each is Lucky (Table 6B) or Unlucky (6A).</div>
      <div class="qbw-count">
        <span class="qbw-label" style="margin:0">Count</span>
        <input type="number" class="qbw-num" min="0" max="20" value="${d.lifeEvents.length}" data-countfield="lifeEvents">
        <button type="button" class="qbw-btn" data-act="gen" data-list="lifeEvents" data-die="6"><i class="fa-solid fa-arrows-rotate"></i> Generate</button>
        <button type="button" class="qbw-btn" data-act="add" data-list="lifeEvents"><i class="fa-solid fa-plus"></i> Add</button>
      </div>`;
    if (!d.lifeEvents.length) h += `<div class="qbw-hint">Set a count and Generate, or add events one at a time.</div>`;
    h += d.lifeEvents.map((e, i) => {
      const luckOpts = ['<option value="">— luck —</option>',
        `<option value="unlucky" ${e.luck === "unlucky" ? "selected" : ""}>Unlucky (6A)</option>`,
        `<option value="lucky" ${e.luck === "lucky" ? "selected" : ""}>Lucky (6B)</option>`].join("");
      const tbl = e.luck === "lucky" ? "lucky" : (e.luck === "unlucky" ? "unlucky" : null);
      let textSel;
      if (tbl) {
        const list = this.tableText[tbl] || [];
        const opts = ['<option value="">— choose —</option>'].concat(
          list.map((txt, k) => `<option value="${esc(txt)}" ${txt === e.text ? "selected" : ""}>${k + 1}. ${esc(txt)}</option>`)
        ).join("");
        textSel = `<select class="qbw-select" data-list="lifeEvents" data-idx="${i}" data-sub="text">${opts}</select>`;
      } else {
        textSel = `<select class="qbw-select" disabled><option>Pick a luck type first</option></select>`;
      }
      return `<div class="qbw-card">
        <div class="qbw-card-head">
          <span class="qbw-card-title">Event ${i + 1}</span>
          <button type="button" class="qbw-iconbtn" data-act="reroll-entry" data-list="lifeEvents" data-idx="${i}"><i class="fa-solid fa-rotate"></i> Reroll</button>
          <button type="button" class="qbw-iconbtn" data-act="remove-entry" data-list="lifeEvents" data-idx="${i}"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="qbw-row" style="margin-bottom:6px">
          <select class="qbw-select" data-list="lifeEvents" data-idx="${i}" data-sub="luck" data-rerender="1" style="flex:0 0 150px">${luckOpts}</select>
        </div>
        ${textSel}
      </div>`;
    }).join("");
    return h;
  }

  _renderAside() {
    return `<div class="qbw-aside-head"><i class="fa-solid fa-feather"></i> Manuscript</div>
      <div class="qbw-preview" data-preview>${this._previewInner()}</div>`;
  }

  _previewInner() {
    const d = this.data;
    const personalInfoHtml = `
      <div class="qbw-personal-summary">
        <h3>Personal Info</h3>
        <ul>
          <li><strong>Alignment:</strong> ${esc(d.alignment) || "—"}</li>
          <li><strong>Gender:</strong> ${esc(d.gender) || "—"}</li>
          <li><strong>Height:</strong> ${esc(d.height) || "—"}</li>
          <li><strong>Weight:</strong> ${esc(d.weight) || "—"}</li>
          <li><strong>Hair:</strong> ${esc(d.hairColor) || "—"}</li>
          <li><strong>Eyes:</strong> ${esc(d.eyeColor) || "—"}</li>
          <li><strong>Skin:</strong> ${esc(d.skin) || "—"}</li>
          <li><strong>Age:</strong> ${esc(d.age) || "—"}</li>
          <li><strong>Faith:</strong> ${esc(d.faith) || "—"}</li>
        </ul>
      </div>
      <div class="qbw-divider" style="margin: 10px 0;"></div>
    `;
    const { html } = this._buildBiographyHtml();
    const backstoryPreview = html || '<span class="qbw-empty-note">Nothing yet — choose or roll on the left and the lifepath takes shape here.</span>';
    return personalInfoHtml + backstoryPreview;
  }

  _refreshPreview() {
    const el = this.element; if (!el) return;
    const p = el.querySelector("[data-preview]");
    if (p) p.innerHTML = this._previewInner();
  }

  _renderFooter() {
    const s = this.step;
    const status = this.saveResult
      ? `<span class="qbw-foot-status ${this.saveResult.ok ? "is-ok" : "is-err"}"><i class="fa-solid ${this.saveResult.ok ? "fa-circle-check" : "fa-circle-exclamation"}"></i> ${esc(trunc(this.saveResult.msg, 64))}</span>`
      : "";
    return `<footer class="qbw-footer">
      <button type="button" class="qbw-btn" data-act="back" ${s === 1 ? "disabled" : ""}><i class="fa-solid fa-arrow-left"></i> Back</button>
      <button type="button" class="qbw-btn" data-act="next" ${s === STEP_COUNT ? "disabled" : ""}>Next <i class="fa-solid fa-arrow-right"></i></button>
      <div class="qbw-spacer"></div>
      ${status}
      <button type="button" class="qbw-btn qbw-primary" data-act="save"><i class="fa-solid fa-floppy-disk"></i> Save to Character Sheet</button>
      <button type="button" class="qbw-btn" data-act="close"><i class="fa-solid fa-xmark"></i> Close</button>
    </footer>`;
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const el = this.element;
    if (!el || el.__qbwBound) return;
    el.__qbwBound = true;
    el.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-act]");
      if (!btn || !el.contains(btn)) return;
      ev.preventDefault();
      this._handleAction(btn.dataset.act, btn);
    });
    el.addEventListener("change", (ev) => {
      const t = ev.target;
      this._syncFromDom();
      if (t.dataset.list && t.dataset.idx !== undefined && t.dataset.sub) {
        const list = this.data[t.dataset.list]; const i = +t.dataset.idx;
        if (list && list[i]) {
          this._touch();
          if (t.dataset.sub === "luck") { list[i].text = ""; this.render(); return; }
          if (t.dataset.rerender) { this.render(); return; }
        }
        this._refreshPreview();
        return;
      }
      if (t.dataset.field) {
        this._touch();
        if (t.dataset.field === "romanceStatus") {
          this.data.romanceDetail = "";
          if (t.value && t.value !== "lookout" && !this.data.loverName) {
            const oppGender = this._getOppositeGender();
            this.data.loverGender = oppGender;
            this.data.loverName = this.generateNames(oppGender, { count: 1, firstNameOnly: false });
          }
        }
        if (t.dataset.rerender) { this.render(); return; }
      }
      this._refreshPreview();
    });
    el.addEventListener("input", (ev) => {
      const t = ev.target;
      const f = t.closest('input[type="text"][data-field]');
      if (f) {
        this._setField(f.dataset.field, f.value);
        if (f.dataset.field === "weight") this.data.weightTouched = true;
        this._refreshPreview();
      }
      const l = t.closest('input[type="text"][data-list][data-idx][data-sub]');
      if (l) {
        const list = this.data[l.dataset.list]; const i = +l.dataset.idx;
        if (list && list[i]) {
          list[i][l.dataset.sub] = l.value;
          this._touch();
          this._refreshPreview();
        }
      }
      if (t.dataset.pair !== undefined) {
        const i = +t.dataset.pair;
        const left = Math.max(0, Math.min(20, parseInt(t.value, 10) || 0));
        this.data.traitPairs[i] = left;
        this._touch();
        const ls = el.querySelector(`[data-pairleft="${i}"]`); if (ls) ls.textContent = left;
        const rs = el.querySelector(`[data-pairright="${i}"]`); if (rs) rs.textContent = 20 - left;
        const bd = el.querySelector("[data-pairbudget]"); if (bd) bd.textContent = this._pairBudget();
        if (this.data.useTraitPairs) this._refreshPreview();
      }
    });
  }

  _touch() { this.saveResult = null; }
  _setField(field, value) { this.data[field] = value; this._touch(); }

  _syncFromDom() {
    const el = this.element; if (!el) return;
    el.querySelectorAll("select[data-field], input[data-field]").forEach((f) => {
      if (f.type === "checkbox") this.data[f.dataset.field] = f.checked;
      else this.data[f.dataset.field] = f.value;
    });
    el.querySelectorAll("select[data-list][data-idx][data-sub], input[data-list][data-idx][data-sub]").forEach((f) => {
      const list = this.data[f.dataset.list]; const i = +f.dataset.idx;
      if (list && list[i]) list[i][f.dataset.sub] = (f.type === "checkbox") ? f.checked : f.value;
    });
    el.querySelectorAll("[data-pair]").forEach((f) => {
      this.data.traitPairs[+f.dataset.pair] = Math.max(0, Math.min(20, parseInt(f.value, 10) || 0));
    });
  }

  _goStep(n) {
    this._syncFromDom();
    this.step = Math.max(1, Math.min(STEP_COUNT, n));
    this.render();
  }

  _rollBranch(name) {
    const b = BRANCH[name];
    const r = randInt(1, b.die);
    return (b.options.find((o) => r >= o.lo && r <= o.hi) ?? b.options[0]).value;
  }

  _rollBirthOrder() {
    const r = randInt(1, 100);
    return (BIRTH_ORDER.find((o) => r >= o.lo && r <= o.hi) ?? BIRTH_ORDER[0]).n;
  }

  _rollHaveSiblings() {
    const r = randInt(1, 100);
    const none = r >= SIBLINGS_NONE_RANGE[0] && r <= SIBLINGS_NONE_RANGE[1];
    return { has: !none, unknown: r >= SIBLINGS_UNKNOWN_MIN };
  }

  _siblingKind(s, position, X) {
    const adjacent = position === X - 1 || position === X + 1;
    if (adjacent) {
      const r = s.twinRoll || 0;
      if (r >= TWIN_IDENTICAL_MIN) return { key: "identical", label: "identical twin" };
      if (r >= TWIN_FRATERNAL_MIN) return { key: "fraternal", label: "fraternal twin" };
      return { key: "full", label: "" };
    }
    return (s.halfRoll || 0) >= HALF_SIBLING_MIN ? { key: "half", label: "half-sibling" } : { key: "full", label: "" };
  }

  _pcSex() {
    const g = String(this.data?.gender || "").trim().toLowerCase();
    if (g === "male") return "male";
    if (g === "female") return "female";
    return "female";
  }

  _rollKey(key) {
    const names = this.tableText[key] || [];
    if (!names.length) {
      if (key === "familySecret") return "A mysterious family secret.";
      return "";
    }
    const weights = this.tableWeights[key] || [];
    let total = 0;
    for (let i = 0; i < names.length; i++) total += weights[i] || 1;
    let roll = Math.random() * total;
    for (let i = 0; i < names.length; i++) { roll -= (weights[i] || 1); if (roll < 0) return names[i]; }
    return names[names.length - 1];
  }

  // No AI involved - just splits the actor's Foundry document name on whitespace.
  // A single-word name (e.g. "Kai") has no last name; anything with 2+ words uses the final word.
  _getCharacterLastName() {
    const parts = String(this.actor?.name || "").trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : "";
  }

  _withFamilyLastName(firstName) {
    const lastName = this._getCharacterLastName();
    return lastName ? `${firstName} ${lastName}` : firstName;
  }

  generateNames(gender, options = {}) {
    const count = options.count === 5 ? 5 : 1;
    const firstNameOnly = !!options.firstNameOnly;

    let firstKey = "neutralNames";
    if (gender === "male") firstKey = "maleNames";
    else if (gender === "female") firstKey = "femaleNames";

    const results = [];
    for (let k = 0; k < count; k++) {
      let firstName = "";
      if (firstKey === "neutralNames" && !this.tableText["neutralNames"]) {
        const fallbackKey = Math.random() < 0.5 ? "femaleNames" : "maleNames";
        firstName = this._rollKey(fallbackKey) || "Robin";
      } else {
        firstName = this._rollKey(firstKey) || "Robin";
      }

      if (firstNameOnly) {
        results.push(firstName);
      } else {
        const lastName = this._rollKey("lastNames") || "Swift";
        results.push(`${firstName} ${lastName}`);
      }
    }

    return count === 1 ? results[0] : results;
  }

  _getOppositeGender() {
    const g = String(this.data?.gender || "").trim().toLowerCase();
    if (g.includes("female") || g.includes("woman") || g === "f") return "male";
    if (g.includes("male") || g.includes("man") || g === "m") return "female";
    return "neutral";
  }

  _randEntry(list) {
    if (list === "friends") {
      const sex = randInt(1, 2) === 1 ? "male" : "female";
      const name = this.generateNames(sex, { count: 1, firstNameOnly: false });
      return { name, sex, situation: this._rollKey("friendSituation"), race: this._rollKey("feRace"), profession: this._rollKey("feProfession") };
    }
    if (list === "enemies") {
      const sex = randInt(1, 2) === 1 ? "male" : "female";
      const name = this.generateNames(sex, { count: 1, firstNameOnly: false });
      return { name, sex, situation: this._rollKey("enemySituation"), race: this._rollKey("feRace"), profession: this._rollKey("feProfession") };
    }
    if (list === "siblings") {
      const sex = randInt(1, 2) === 1 ? "male" : "female";
      const name = this._withFamilyLastName(this.generateNames(sex, { count: 1, firstNameOnly: true }));
      return { name, sex, relation: this._rollKey("siblings"), bond: this._rollKey("familyBond"), alive: randInt(1, 100) > SIBLING_DEATH_PCT, twinRoll: randInt(1, 100), halfRoll: randInt(1, 100) };
    }
    if (list === "lifeEvents") { const luck = randInt(1, 6) <= 3 ? "unlucky" : "lucky"; return { luck, text: this._rollKey(luck) }; }
    return {};
  }

  _regenList(list, n) {
    this._syncFromDom();
    const arr = [];
    for (let k = 0; k < n; k++) arr.push(this._randEntry(list));
    this.data[list] = arr;
    this._touch();
  }

  _handleAction(act, btn) {
    switch (act) {
      case "next": this._goStep(this.step + 1); break;
      case "back": this._goStep(this.step - 1); break;
      case "close": this.close(); break;
      case "save": this._save(); break;

      case "roll": {
        this._syncFromDom();
        const v = this._rollKey(btn.dataset.table);
        if (v) this._setField(btn.dataset.field, v);
        this.render(); break;
      }
      case "rollbranch": {
        this._syncFromDom();
        const field = btn.dataset.field;
        const rolledVal = this._rollBranch(btn.dataset.branch);
        this._setField(field, rolledVal);
        if (field === "romanceStatus") {
          this.data.romanceDetail = "";
          if (rolledVal && rolledVal !== "lookout" && !this.data.loverName) {
            const oppGender = this._getOppositeGender();
            this.data.loverGender = oppGender;
            this.data.loverName = this.generateNames(oppGender, { count: 1, firstNameOnly: false });
          }
        }
        this.render(); break;
      }
      case "rollcount": this._regenList(btn.dataset.list, randInt(1, +btn.dataset.die)); this.render(); break;
      case "roll-family": {
        this._syncFromDom();
        const { has, unknown } = this._rollHaveSiblings();
        if (!has) {
          this.data.birthOrder = 1;
          this.data.siblings = [];
          this.data.siblingsUnknown = false;
        } else if (unknown) {
          this.data.birthOrder = 0;
          this.data.siblings = [];
          this.data.siblingsUnknown = true;
        } else {
          const X = this._rollBirthOrder();
          let younger = randInt(1, 6) - 1;
          if (X === 1 && younger === 0) younger = 1;
          const Y = X + younger;
          this.data.birthOrder = X;
          this.data.siblingsUnknown = false;
          const arr = [];
          for (let k = 0; k < Y - 1; k++) arr.push(this._randEntry("siblings"));
          this.data.siblings = arr;
        }
        this._touch(); this.render(); break;
      }
      case "roll-sib": {
        this._syncFromDom();
        const i = +btn.dataset.idx;
        const sub = btn.dataset.sub || "relation";
        const table = btn.dataset.table || "siblings";
        if (this.data.siblings[i]) this.data.siblings[i][sub] = this._rollKey(table);
        this._touch(); this.render(); break;
      }
      case "roll-list": {
        this._syncFromDom();
        const listKey = btn.dataset.list;
        const i = +btn.dataset.idx;
        const sub = btn.dataset.sub;
        const table = btn.dataset.table;
        if (this.data[listKey] && this.data[listKey][i]) {
          this.data[listKey][i][sub] = this._rollKey(table);
        }
        this._touch(); this.render(); break;
      }
      case "roll-parent-name": {
        this._syncFromDom();
        const gender = btn.dataset.gender;
        const field = btn.dataset.field;
        this.data[field] = this._withFamilyLastName(this.generateNames(gender, { count: 1, firstNameOnly: true }));
        this._touch(); this.render(); break;
      }
      case "roll-lover-name": {
        this._syncFromDom();
        const gender = this.data.loverGender || this._getOppositeGender();
        this.data.loverName = this.generateNames(gender, { count: 1, firstNameOnly: false });
        this._touch(); this.render(); break;
      }
      case "roll-sib-name": {
        this._syncFromDom();
        const i = +btn.dataset.idx;
        if (this.data.siblings[i]) {
          const gender = this.data.siblings[i].sex || "neutral";
          this.data.siblings[i].name = this._withFamilyLastName(this.generateNames(gender, { count: 1, firstNameOnly: true }));
        }
        this._touch(); this.render(); break;
      }
      case "roll-fe-name": {
        this._syncFromDom();
        const listKey = btn.dataset.list;
        const i = +btn.dataset.idx;
        if (this.data[listKey] && this.data[listKey][i]) {
          const gender = this.data[listKey][i].sex || "neutral";
          this.data[listKey][i].name = this.generateNames(gender, { count: 1, firstNameOnly: false });
        }
        this._touch(); this.render(); break;
      }
      case "gen": {
        const list = btn.dataset.list;
        const input = this.element.querySelector(`[data-countfield="${list}"]`);
        let n = parseInt(input?.value, 10);
        if (!Number.isFinite(n) || n < 0) n = this.data[list].length;
        this._regenList(list, Math.max(0, Math.min(20, n)));
        this.render(); break;
      }
      case "add": this._syncFromDom(); this.data[btn.dataset.list].push(this._randEntry(btn.dataset.list)); this._touch(); this.render(); break;
      case "reroll-entry": this._syncFromDom(); this.data[btn.dataset.list][+btn.dataset.idx] = this._randEntry(btn.dataset.list); this._touch(); this.render(); break;
      case "remove-entry": this._syncFromDom(); this.data[btn.dataset.list].splice(+btn.dataset.idx, 1); this._touch(); this.render(); break;

      case "pairs-mode": this._syncFromDom(); this.data.traitMode = btn.dataset.mode; this.render(); break;
      case "pairs-roll": for (let i = 0; i < TRAIT_PAIRS.length; i++) this.data.traitPairs[i] = randInt(1, 6) + randInt(1, 6) + randInt(1, 6); this._touch(); this.render(); break;
      case "pairs-reset": for (let i = 0; i < TRAIT_PAIRS.length; i++) this.data.traitPairs[i] = 10; this._touch(); this.render(); break;

      case "random": this._syncFromDom(); this._randomField(btn.dataset.field); this.render(); break;
      case "reroll":
        this._syncFromDom(); this._touch();
        if (btn.dataset.field === "height") this._generateHeightOptions();
        else if (btn.dataset.field === "age") this._generateAgeOptions();
        this.render();
        break;
      case "preset": this._syncFromDom(); this._setField(btn.dataset.field, btn.dataset.value); this.render(); break;
      case "reset-weight": {
        this._syncFromDom();
        const currentWeight = this.data.weight || this._defaultWeightFromHeight();
        const baseVal = parseInt(currentWeight, 10) || parseInt(this._defaultWeightFromHeight(), 10) || 150;
        const diff = randInt(-10, 10);
        this.data.weight = `${baseVal + diff} lbs`;
        this.data.weightTouched = true;
        this._touch();
        this.render();
        break;
      }
      case "roll-all-backstory": {
        this._syncFromDom();
        
        // 1. Personal Details
        if (!this.data.alignment) this.data.alignment = pick(ALIGNMENTS);
        if (!this.data.gender) {
          const r = Math.random();
          this.data.gender = r < 0.01 ? "Unique" : (r < 0.505 ? "Male" : "Female");
        }
        
        if (!this.data.heightOptions.length) this._generateHeightOptions();
        const hGroup = pick(this.data.heightOptions);
        this.data.height = pick(hGroup.picks);
        
        const currentWeight = this._defaultWeightFromHeight();
        const baseVal = parseInt(currentWeight, 10) || 150;
        this.data.weight = `${baseVal + randInt(-10, 10)} lbs`;
        this.data.weightTouched = true;
        
        if (!this.data.ageOptions.length) this._generateAgeOptions();
        const aGroup = pick(this.data.ageOptions);
        this.data.age = pick(aGroup.picks);
        
        // 2. Family
        this.data.status = this._rollKey("status");
        this.data.childhood = this._rollKey("childhood");
        
        this.data.parentsBranch = this._rollBranch("parents");
        if (this.data.parentsBranch === "disaster") {
          this.data.parentalDisaster = this._rollKey("parentalDisaster");
        } else if (this.data.parentsBranch === "special") {
          this.data.familySecret = this._rollKey("familySecret");
        }
        
        this.data.standingBranch = this._rollBranch("standing");
        if (this.data.standingBranch === "bad") {
          this.data.familyCrisis = this._rollKey("familyCrisis");
        }
        this.data.familyGoal = this._rollKey("familyGoal");
        
        this.data.motherBond = this._rollKey("familyBond");
        this.data.fatherBond = this._rollKey("familyBond");
        
        // Siblings
        const { has, unknown } = this._rollHaveSiblings();
        if (!has) {
          this.data.birthOrder = 1;
          this.data.siblings = [];
          this.data.siblingsUnknown = unknown;
        } else {
          const nSib = randInt(1, 8);
          const bo = randInt(1, nSib + 1);
          this.data.birthOrder = bo;
          this.data.siblingsUnknown = false;
          
          this.data.siblings = [];
          for (let k = 0; k < nSib; k++) {
            this.data.siblings.push(this._randEntry("siblings"));
          }
        }
        
        // 3. Friends & Enemies
        const nFriends = randInt(1, 3);
        this.data.friends = [];
        for (let k = 0; k < nFriends; k++) {
          this.data.friends.push(this._randEntry("friends"));
        }
        const nEnemies = randInt(1, 3);
        this.data.enemies = [];
        for (let k = 0; k < nEnemies; k++) {
          this.data.enemies.push(this._randEntry("enemies"));
        }
        
        // 4. Romance
        this.data.romanceStatus = this._rollBranch("romance");
        if (this.data.romanceStatus && this.data.romanceStatus !== "lookout") {
          const cfg = ROMANCE_DETAIL[this.data.romanceStatus];
          if (cfg) this.data.romanceDetail = this._rollKey(cfg.table);
          
          const oppGender = this._getOppositeGender();
          this.data.loverGender = oppGender;
          this.data.loverName = this.generateNames(oppGender, { count: 1, firstNameOnly: false });
          this.data.loverRace = this._rollKey("loverRace");
          this.data.loverProfession = this._rollKey("loverProfession");
          this.data.loverAppearance = this._rollKey("loverAppearance");
        } else {
          this.data.romanceDetail = "";
        }
        
        // 5. Characteristics
        this.data.hairColor = this._rollKey("hairColor");
        this.data.hairStyle = this._rollKey("hairStyle");
        this.data.eyeColor = this._rollKey("eyeColor");
        this.data.skin = this._rollKey("skinTone");
        this.data.personalStyle = this._rollKey("personalStyle");
        
        // 6. Personality & Traits
        const hasExistingTraits = !!this.actor.getFlag("cv-wicked-campaigns", "useTraitPairs");
        this.data.useTraitPairs = true;
        if (hasExistingTraits) {
          this.data.traitPairs = foundry.utils.deepClone(this.actor.getFlag("cv-wicked-campaigns", "traitPairs") || {});
          for (let i = 0; i < TRAIT_PAIRS.length; i++) {
            if (this.data.traitPairs[i] === undefined) this.data.traitPairs[i] = 10;
          }
        } else {
          for (let i = 0; i < TRAIT_PAIRS.length; i++) {
            this.data.traitPairs[i] = randInt(0, 20);
          }
        }
        this.data.trait = this._rollKey("trait");
        this.data.values = this._rollKey("values");
        this.data.valuedObject = this._rollKey("valuedObject");
        this.data.lostIt = this._rollKey("lostIt");
        this.data.fear = this._rollKey("fear");
        this.data.valuedPerson = this._rollKey("valuedPerson");
        this.data.quirk = this._rollKey("quirk");
        this.data.faith = this._rollKey("faith");
        
        // 7. Life Events
        this.data.lifeEvents = [];
        for (let k = 0; k < 3; k++) {
          this.data.lifeEvents.push(this._randEntry("lifeEvents"));
        }
        
        // 8. Go to Step 12 (Review & Save)
        this.step = STEP_COUNT;
        this._touch();
        this.render();
        break;
      }
    }
  }

  _buildBiographyHtml() {
    const d = this.data;
    const P = (label, val) => val ? `<p><strong>${label}:</strong> ${esc(val)}</p>` : "";
    let out = "";

    // Structured (non-HTML) record of every named person mentioned below, kept in lockstep
    // with the inline iNameTheeBtn() calls further down - this is what BackstorySheet's own
    // "Send to iName Thee" toolbar reads from, since anything baked into the HTML itself gets
    // stripped by that sheet's ProseMirror editor (buttons aren't a valid content node there).
    const relatedPeople = [];
    const iNameTheeBtnTracked = (role, name, concept) => {
      if (name) relatedPeople.push({ role, name, concept, ...roleMeta(role) });
      return iNameTheeBtn(role, name, concept);
    };

    let fam = "";
    const genCards = [];
    if (d.status) {
      genCards.push(`
      <div class="wicked-family-card">
        <div class="card-label">Social Standing</div>
        <div class="card-value">${esc(d.status)}</div>
      </div>`);
    }
    if (d.childhood) {
      genCards.push(`
      <div class="wicked-family-card">
        <div class="card-label">Childhood</div>
        <div class="card-value">${esc(d.childhood)}</div>
      </div>`);
    }
    // Kept as plain (unescaped) text here rather than baked-in HTML, so the exact same value can
    // also seed the "family" HELPER_SECTIONS entry below - including the "alive"/"good" branches,
    // which otherwise have no backing field at all (just this hardcoded one-liner) and would
    // silently have nothing for the Helper to send/enhance.
    let parentsVal = "";
    if (d.parentsBranch === "disaster") parentsVal = d.parentalDisaster || "A disaster befell one or both parents.";
    else if (d.parentsBranch === "special") parentsVal = d.familySecret ? `Family secret — ${d.familySecret}` : "There is something special about them.";
    else if (d.parentsBranch === "alive") parentsVal = "Both alive and well.";
    if (parentsVal) {
      genCards.push(`
      <div class="wicked-family-card">
        <div class="card-label">Parents Status</div>
        <div class="card-value">${esc(parentsVal)}</div>
      </div>`);
    }
    let standingVal = "";
    if (d.standingBranch === "bad") standingVal = d.familyCrisis ? `At risk — ${d.familyCrisis}` : "At risk — a crisis looms.";
    else if (d.standingBranch === "good") standingVal = "Secure, even amid hardship.";
    if (standingVal) {
      genCards.push(`
      <div class="wicked-family-card">
        <div class="card-label">Family Standing</div>
        <div class="card-value">${esc(standingVal)}</div>
      </div>`);
    }
    if (d.familyGoal) {
      genCards.push(`
      <div class="wicked-family-card">
        <div class="card-label">Family Goal</div>
        <div class="card-value">${esc(d.familyGoal)}</div>
      </div>`);
    }
    if (genCards.length) {
      fam += `<div class="wicked-family-grid">${genCards.join("")}</div>`;
    }

    // Parent Cards
    const familySuffix = familyContextSuffix([d.status, d.childhood, parentsVal, standingVal, d.familyGoal]);
    const motherConcept = `${d.motherName}, the player character's mother.` +
      (d.motherBond ? ` Relationship/bond: ${d.motherBond}.` : "") + (d.motherDescription ? ` ${d.motherDescription}` : "") + familySuffix;
    const fatherConcept = `${d.fatherName}, the player character's father.` +
      (d.fatherBond ? ` Relationship/bond: ${d.fatherBond}.` : "") + (d.fatherDescription ? ` ${d.fatherDescription}` : "") + familySuffix;
    fam += `
    <div class="wicked-parent-grid">
      <div class="wicked-parent-card">
        <div class="parent-role">Mother ${iNameTheeBtnTracked("mother", d.motherName, motherConcept)}</div>
        <div class="parent-name">${esc(d.motherName || "[Mother Name]")}</div>
        <div class="parent-details">
          <p><strong>Relationship/Bond:</strong> ${d.motherBond ? esc(d.motherBond) : "<em>Not yet detailed.</em>"}</p>
          <p><strong>Description:</strong> ${d.motherDescription ? esc(d.motherDescription) : "<em>Not yet detailed.</em>"}</p>
        </div>
      </div>
      <div class="wicked-parent-card">
        <div class="parent-role">Father ${iNameTheeBtnTracked("father", d.fatherName, fatherConcept)}</div>
        <div class="parent-name">${esc(d.fatherName || "[Father Name]")}</div>
        <div class="parent-details">
          <p><strong>Relationship/Bond:</strong> ${d.fatherBond ? esc(d.fatherBond) : "<em>Not yet detailed.</em>"}</p>
          <p><strong>Description:</strong> ${d.fatherDescription ? esc(d.fatherDescription) : "<em>Not yet detailed.</em>"}</p>
        </div>
      </div>
    </div>`;

    const bo = Number(d.birthOrder) || 0;
    if (d.siblingsUnknown && d.siblings.length === 0) {
      fam += `
      <div class="wicked-uncertain-siblings-card">
        <div class="card-title"><i class="fa-solid fa-circle-question"></i> Siblings Status</div>
        <p>Uncertain — you may have siblings, as far as you know.</p>
      </div>`;
    } else if (bo >= 1) {
      const Y = d.siblings.length + 1;
      if (Y === 1) {
        fam += `
        <div class="wicked-only-child-card">
          <div class="card-title"><i class="fa-solid fa-user"></i> Siblings Status</div>
          <p>An only child.</p>
        </div>`;
      } else {
        fam += `<p><strong>Birth order:</strong> ${ordinal(Math.min(bo, Y))} of ${Y} children.</p>`;
        const positions = [];
        for (let p = 1; p <= Y; p++) if (p !== Math.min(bo, Y)) positions.push(p);
        const X = Math.min(bo, Y);
        const pcSex = this._pcSex();
        const items = d.siblings.map((s, i) => {
          const pos = positions[i];
          const ord = pos < X ? "older" : "younger";
          const kind = this._siblingKind(s, pos, X);
          const sex = kind.key === "identical" ? pcSex : s.sex;
          const noun = sex === "male" ? "brother" : sex === "female" ? "sister" : "";
          const who = noun ? `${ord} ${noun}` : ord;
          // Persisted onto the sibling record (not just used for this render) so a live-rebuilt
          // "Send to iName Thee" concept can still say "older brother" instead of just "sibling",
          // and "identical twin"/"half-sibling" instead of nothing at all - twin/half status
          // depends on birth-order position relative to the PC (twins are only adjacent siblings),
          // which isn't otherwise derivable from lifepathSiblings alone.
          s.who = who;
          s.kindLabel = kind.label || "";
          const kindStr = kind.label ? `, ${kind.label}` : "";
          const rel = s.relation ? esc(s.relation) : "";
          const bond = s.bond ? esc(s.bond) : "";
          const dead = s.alive === false;
          
          const tags = [];
          tags.push(`<span class="sibling-tag-pill">${who}</span>`);
          if (kind.key && kind.key !== "full") {
            tags.push(`<span class="sibling-tag-pill ${kind.key}">${kind.label}</span>`);
          }
          if (dead) {
            tags.push(`<span class="sibling-tag-pill dead">deceased</span>`);
          }
          const tagsHtml = tags.join(" ");
          const siblingConcept = `${s.name}, the player character's ${who}${kindStr}.` +
            (rel ? ` Occupation/status: ${s.relation}.` : "") + (bond ? ` Relationship: ${s.bond}.` : "") + (dead ? " Deceased." : "") + familySuffix;

          return `
          <div class="wicked-sibling-card${dead ? " is-dead" : ""}">
            <div class="sibling-name">${esc(s.name || "[Sibling Name]")} ${iNameTheeBtnTracked(`sibling-${i}`, s.name, siblingConcept)}</div>
            <div class="sibling-header">
              <span class="sibling-ordinal">${ordinal(pos)} Child</span>
              ${tagsHtml}
            </div>
            <div class="sibling-details" style="margin-top: 0.5rem;">
              <p><strong>Occupation/Status:</strong> ${rel || "<em>Not yet detailed.</em>"}</p>
              <p><strong>Relationship:</strong> ${bond || "<em>Not yet detailed.</em>"}</p>
            </div>
          </div>`;
        }).join("");
        fam += `<div class="wicked-sibling-grid">${items}</div>`;
      }
    }
    if (fam) out += "<h2>Family</h2>" + fam;

    const renderFECard = (e, idx, isFriend) => {
      const typeClass = isFriend ? "is-friend" : "is-enemy";
      const namePlaceholder = isFriend ? "[Friend Name]" : "[Enemy Name]";
      const nameVal = e.name ? esc(e.name) : namePlaceholder;
      const tags = [];
      if (e.sex) tags.push(`<span class="fe-tag-pill">${esc(e.sex)}</span>`);
      if (e.race) tags.push(`<span class="fe-tag-pill">${esc(e.race)}</span>`);
      if (e.profession) tags.push(`<span class="fe-tag-pill">${esc(e.profession)}</span>`);
      const tagsHtml = tags.join(" ");
      const relationWord = isFriend ? "friend" : "enemy";
      const feConcept = `${e.name}, a${isFriend ? "" : "n"} ${relationWord} of the player character.` +
        [e.sex, e.race, e.profession].filter(Boolean).map((v) => ` ${v}.`).join("") +
        (e.situation ? ` Situation: ${e.situation}.` : "");

      return `
      <div class="wicked-fe-card ${typeClass}">
        <div class="fe-name">${nameVal} ${iNameTheeBtnTracked(`${relationWord}-${idx}`, e.name, feConcept)}</div>
        ${tagsHtml ? `<div class="fe-header">${tagsHtml}</div>` : ""}
        <div class="fe-details" style="margin-top: 0.5rem;">
          ${e.situation ? `<p><strong>Situation:</strong> ${esc(e.situation)}</p>` : ""}
        </div>
      </div>`;
    };

    let fe = "";
    if (d.friends.length) {
      fe += "<h3>Friends</h3>";
      const cards = d.friends.map((e, i) => renderFECard(e, i, true)).join("");
      fe += `<div class="wicked-fe-grid">${cards}</div>`;
    }
    if (d.enemies.length) {
      fe += "<h3>Enemies</h3>";
      const cards = d.enemies.map((e, i) => renderFECard(e, i, false)).join("");
      fe += `<div class="wicked-fe-grid">${cards}</div>`;
    }
    if (fe) out += "<h2>Friends &amp; Enemies</h2>" + fe;

    if (d.romanceStatus) {
      let rom = `
      <div class="wicked-family-grid">
        <div class="wicked-family-card">
          <div class="card-label">Romance Status</div>
          <div class="card-value"><strong>${esc(ROMANCE_LABEL[d.romanceStatus])}</strong>${d.romanceDetail ? ` — ${esc(d.romanceDetail)}` : ""}</div>
        </div>
      </div>`;
      if (d.romanceStatus !== "lookout") {
        const isTragic = d.romanceStatus === "tragic";
        const namePlaceholder = isTragic ? "[Lost Lover Name]" : "[Lover Name]";
        const nameVal = d.loverName ? esc(d.loverName) : namePlaceholder;
        
        const tags = [];
        if (d.loverGender) tags.push(`<span class="partner-tag-pill">${esc(d.loverGender)}</span>`);
        if (d.loverRace) tags.push(`<span class="partner-tag-pill">${esc(d.loverRace)}</span>`);
        if (d.loverProfession) tags.push(`<span class="partner-tag-pill">${esc(d.loverProfession)}</span>`);
        const tagsHtml = tags.join(" ");

        const loverConcept = `${d.loverName}, the player character's ${isTragic ? "deceased former lover" : "lover/romantic partner"}.` +
          [d.loverGender, d.loverRace, d.loverProfession].filter(Boolean).map((v) => ` ${v}.`).join("") +
          (d.loverAppearance ? ` Appearance: ${d.loverAppearance}.` : "") +
          (d.romanceDetail ? ` ${d.romanceDetail}` : "");

        rom += `
        <div class="wicked-partner-card${isTragic ? " is-tragic" : ""}">
          <div class="partner-role">${isTragic ? "Lost Lover" : "Lover"} ${iNameTheeBtnTracked("lover", d.loverName, loverConcept)}</div>
          <div class="partner-name">${nameVal}</div>
          ${tagsHtml ? `<div class="partner-header">${tagsHtml}</div>` : ""}
          <div class="partner-details" style="margin-top: 0.5rem;">
            ${d.loverAppearance ? `<p><strong>Appearance:</strong> ${esc(d.loverAppearance)}</p>` : "<p><em>No description details.</em></p>"}
          </div>
        </div>`;
      }
      out += "<h2>Romance</h2>" + rom;
    }

    // Appearance (hair/eyes/skin) isn't duplicated here anymore - the wizard
    // only uses those answers to help fill in the character sheet's own
    // native fields, which is where that data actually lives.

    if (d.faith) {
      const plainFaith = d.faith.replace(/<\/?p>/gi, "").trim();
      const dashMatch = plainFaith.match(/^(.+?)\s+—\s+(.+)$/);
      const faithCard = dashMatch
        ? `
        <div class="wicked-faith-card">
          <div class="faith-role">Deity</div>
          <div class="faith-name">${esc(dashMatch[1].trim())}</div>
          <div class="faith-details">
            <p>${esc(dashMatch[2].trim())}</p>
          </div>
        </div>`
        : `
        <div class="wicked-faith-card">
          <div class="faith-role">Faith</div>
          <div class="faith-details">
            <p>${esc(plainFaith)}</p>
          </div>
        </div>`;
      out += "<h2>Faith</h2>" + faithCard;
    }

    let per = "";
    // Trait pairs are deliberately not duplicated here - they live authoritatively on the
    // actor's own flags and render live on the character sheet's own Wicked Traits tab, so
    // baking a static copy into this HTML would just be a second, stale-risk copy of the same
    // data (same reasoning as the single Personality Trait/Appearance fields above).
    let perBody = P("Defining trait", d.trait) + P("Values most", d.values) + P("Most valued object", d.valuedObject)
      + P("If it were lost", d.lostIt) + P("Greatest fear", d.fear) + P("Person they value most", d.valuedPerson) + P("Quirk", d.quirk);
    if (perBody) {
      per = `
      <div class="wicked-family-card">
        <div class="card-label">Persona &amp; Values</div>
        <div class="card-value" style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem;">
          ${perBody}
        </div>
      </div>`;
    }
    if (per) out += "<h2>Personality</h2>" + per;

    let ev = "";
    if (d.lifeEvents.length) {
      const cards = d.lifeEvents.map((e, idx) => {
        if (!e.text) return "";
        const isLucky = e.luck === "lucky";
        const typeClass = isLucky ? "is-lucky" : "is-unlucky";
        const tagLabel = isLucky ? "Lucky Event" : "Unlucky Event";
        return `
        <div class="wicked-event-card ${typeClass}">
          <div class="event-title">Event ${idx + 1}</div>
          <div class="event-header">
            <span class="event-tag-pill">${tagLabel}</span>
          </div>
          <div class="event-text" style="margin-top: 0.5rem;">
            ${esc(e.text)}
          </div>
        </div>`;
      }).filter(Boolean).join("");
      if (cards) {
        ev = `<div class="wicked-event-grid">${cards}</div>`;
      }
    }
    if (ev) out += "<h2>Life Events</h2>" + ev;

    // Friends/enemies/lover/faith/personality/lifeEvents are returned separately (not just baked
    // into html) so they can be persisted as their own flags - the iName Thee Helper feature needs
    // clean fields to review/rewrite later, which the rendered prose alone can't give it back. No
    // lover at all (or still "on the lookout") means null - nothing for the Helper to check there.
    const lover = (d.romanceStatus && d.romanceStatus !== "lookout")
      ? {
          name: d.loverName, gender: d.loverGender, race: d.loverRace,
          profession: d.loverProfession, appearance: d.loverAppearance,
          romanceStatus: d.romanceStatus, romanceDetail: d.romanceDetail,
        }
      : null;

    // d.faith is one raw string, sometimes "Deity Name — description" and sometimes just plain
    // description with no named deity - split it the same way the HTML rendering above already
    // does, so the Helper can enhance the description without ever touching/inventing a deity name.
    let faith = null;
    if (d.faith) {
      const plainFaith = d.faith.replace(/<\/?p>/gi, "").trim();
      const dashMatch = plainFaith.match(/^(.+?)\s+—\s+(.+)$/);
      faith = dashMatch
        ? { deityName: dashMatch[1].trim(), description: dashMatch[2].trim() }
        : { deityName: "", description: plainFaith };
    }

    // Personality is several independent scalar fields on `d`, not already an array - reshaped
    // into {field, label, text} entries (only for fields that actually have a value, same as P()'s
    // own conditional rendering above) so it fits the same "array of reviewable entries" shape
    // every other HELPER_SECTIONS entry expects.
    const personalityFieldDefs = [
      { field: "trait", label: "Defining trait" },
      { field: "values", label: "Values most" },
      { field: "valuedObject", label: "Most valued object" },
      { field: "lostIt", label: "If it were lost" },
      { field: "fear", label: "Greatest fear" },
      { field: "valuedPerson", label: "Person they value most" },
      { field: "quirk", label: "Quirk" },
    ];
    const personality = personalityFieldDefs
      .filter(({ field }) => d[field])
      .map(({ field, label }) => ({ field, label, text: d[field] }));

    // Family background is a mix of independent scalar fields (status, childhood, familyGoal) and
    // two branch-dependent values (parentsVal, standingVal - computed above, already covering the
    // "good"/"alive" branches' hardcoded one-liners too, not just the "bad"/"disaster" ones that
    // have a real backing field) - reshaped into the same {field, label, text} entries shape as
    // personality, keyed by the exact .card-label text each one renders under above so
    // patchFamilyCardByLabel can find it later.
    const familyFieldDefs = [];
    if (d.status) familyFieldDefs.push({ field: "status", label: "Social Standing", text: d.status });
    if (d.childhood) familyFieldDefs.push({ field: "childhood", label: "Childhood", text: d.childhood });
    if (parentsVal) familyFieldDefs.push({ field: "parentsStatus", label: "Parents Status", text: parentsVal });
    if (standingVal) familyFieldDefs.push({ field: "familyStanding", label: "Family Standing", text: standingVal });
    if (d.familyGoal) familyFieldDefs.push({ field: "familyGoal", label: "Family Goal", text: d.familyGoal });

    // Mother/father share the same two enhanceable fields (an existing bond, plus a
    // Helper-only description that starts blank) - stored together under one flag so accepting
    // both in the same batch can't clobber each other (same dataKey-sharing pattern lover/
    // loverAppearance already use).
    const parents = [
      { role: "mother", name: d.motherName || "", bond: d.motherBond || "", description: d.motherDescription || "" },
      { role: "father", name: d.fatherName || "", bond: d.fatherBond || "", description: d.fatherDescription || "" },
    ];

    return {
      html: out, relatedPeople, friends: d.friends, enemies: d.enemies, lover, faith, personality,
      lifeEvents: d.lifeEvents, family: familyFieldDefs, parents, siblings: d.siblings,
    };
  }

  async _save() {
    const existingBackstory = findBackstoryForActorSync(this.actor);
    const hasExistingContent = !!existingBackstory?.getFlag(CC_MODULE_ID, "data")?.description;
    if (hasExistingContent) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Overwrite Existing Backstory?" },
        content: `<p>${this.actor.name} already has a backstory saved. Saving now will overwrite it with what's currently in the wizard. This can't be undone.</p>`,
        rejectClose: false,
      }).catch(() => false);
      if (!confirmed) return;
    }

    this._syncFromDom();
    const { html, relatedPeople, friends, enemies, lover, faith, personality, lifeEvents, family, parents, siblings } = this._buildBiographyHtml();
    try {
      const actorUpdates = {
        "system.details.alignment": this.data.alignment ?? "",
        "system.details.gender": this.data.gender ?? "",
        "system.details.height": this.data.height ?? "",
        "system.details.weight": this.data.weight ?? "",
        "system.details.age": this.data.age ?? "",
        "system.details.hair": this.data.hairColor ?? "",
        "system.details.eyes": this.data.eyeColor ?? "",
        "system.details.skin": this.data.skin ?? "",
        "system.details.faith": this.data.faith ? `${this.data.faith} (See the backstory sheet for more info)` : "",
        "system.details.ideal": "See the backstory sheet for more info",
        "system.details.trait": "See the backstory sheet for more info",
        "system.details.bond": "See the backstory sheet for more info",
        "system.details.appearance": "See the backstory sheet for more info",
        "system.details.flaw": "See the backstory sheet for more info",
        "system.details.biography.value": "See the backstory sheet for more info",
      };

      await this.actor.update(actorUpdates);

      if (html) {
        await this.actor.setFlag("cv-wicked-campaigns", "useTraitPairs", this.data.useTraitPairs);
        await this.actor.setFlag("cv-wicked-campaigns", "traitPairs", this.data.traitPairs);
        try {
          await saveBackstoryToCampaignCodex(this.actor, html, relatedPeople, friends, enemies, lover, faith, personality, lifeEvents, family, parents, siblings);
        } catch (jErr) {
          console.error("Wicked Campaigns | Failed to save backstory codex entry", jErr);
        }
      }

      // Force trigger character sheet re-render so it shows everything instantly
      if (this.actor.sheet) {
          this.actor.sheet.render(false);
      }
      
      this.saveResult = { ok: true, msg: `Personal Info and Background saved to ${this.actor.name}.` };
      ui.notifications.info(`Personal Info and Background saved to ${this.actor.name}.`);
    } catch (err) {
      console.error("Wicked Wizard | save failed", err);
      this.saveResult = { ok: false, msg: `Save failed: ${err.message}` };
      ui.notifications.error(`Wicked Wizard save failed: ${err.message}`);
    }
    this.render();
  }

  static async launch(actor) {
    const id = `qos-lifepath-${actor.id}`;
    const existing = foundry.applications?.instances?.get?.(id);
    if (existing) {
      existing.render(true);
      return existing;
    }

    const PACK_ID = "cv-wicked-campaigns.wicked-adventures";
    const ADVENTURE_NAME = "The Unknown Lands";
    const FLAG_MODULE_ID = "cv-queen-of-storms-compendiums";
    
    const pack = game.packs.get(PACK_ID);
    if (!pack) {
        ui.notifications.error(`Wicked Campaigns | Compendium "${PACK_ID}" not found.`);
        return;
    }

    ui.notifications.info("Wicked Campaigns | Loading Lifepath tables...");
    
    try {
        const docs = await pack.getDocuments();
        const adventure = docs.find(d => d.name === ADVENTURE_NAME);
        if (!adventure) {
            ui.notifications.error(`Wicked Campaigns | Adventure "${ADVENTURE_NAME}" not found in compendium "${PACK_ID}".`);
            return;
        }

        const tableDocs = {};
        const tableText = {};
        const tableWeights = {};

        const stripHtml = (s) => {
            const d = document.createElement("div");
            d.innerHTML = String(s ?? "");
            return (d.textContent || d.innerText || "").trim();
        };

        for (const t of adventure.tables) {
            let key = t.flags?.[FLAG_MODULE_ID]?.key;
            if (!key) {
                const n = t.name || "";
                if (n.includes("Skin Tone")) key = "skinTone";
                else if (n.includes("Faith")) key = "faith";
                else if (n === "Fantasy Female Names") key = "femaleNames";
                else if (n === "Fantasy Male Names") key = "maleNames";
                else if (n === "Fantasy Neutral Names") key = "neutralNames";
                else if (n === "Fantasy Last Names") key = "lastNames";
            }
            if (key) {
                tableDocs[key] = t;
            }
        }

        const mappings = game.settings.get("cv-wicked-campaigns", "tableMappings") || {};
        for (const grp of LIFEPATH_TABLES_LIST) {
            for (const item of grp.items) {
                const customTableId = mappings[item.key];
                let activeTable = null;
                if (customTableId) {
                    activeTable = game.tables.get(customTableId);
                }
                if (!activeTable) {
                    activeTable = game.tables.getName(item.defaultName);
                }
                if (activeTable) {
                    tableDocs[item.key] = activeTable;
                }
            }
        }

        for (const [key, doc] of Object.entries(tableDocs)) {
            const rows = [...doc.results].sort((a, b) => (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0));
            tableText[key] = rows.map((r) => stripHtml(r.description || r.name || ""));
            tableWeights[key] = rows.map((r) => Math.max(1, (r.range?.[1] ?? 1) - (r.range?.[0] ?? 1) + 1));
        }

        const wizard = new LifepathWizard(actor, { text: tableText, weights: tableWeights, docs: tableDocs });
        wizard.render({ force: true });
        return wizard;
    } catch (err) {
        console.error("Wicked Campaigns | Failed to load lifepath tables", err);
        ui.notifications.error("Wicked Campaigns | Could not load lifepath tables. See console for details.");
    }
  }
}

// `label` is short/display-only now - the "(Table X)" suffix these used to carry inline moved to
// its own `code` field, rendered as a small trailing badge instead of being duplicated a second
// time in the "Default: ..." hint line below the label (see table-config.hbs). `defaultName` is
// still the load-bearing lookup key startSessionZeroGame/table-loading code searches world tables
// for - unchanged.
const LIFEPATH_TABLES_LIST = [
  { group: "1. Social & Family Origin", items: [
    { key: "status", label: "Social Standing", code: "T1", defaultName: "Lifepath · Social Standing (T1)" },
    { key: "childhood", label: "Childhood Event", code: "1A", defaultName: "Lifepath · Childhood Event (1A)" },
    { key: "parentalDisaster", label: "Parental Tragedy", code: "1C", defaultName: "Lifepath · What Happened to Your Parents (1C)" },
    { key: "familySecret", label: "Family Secret", code: "1D", defaultName: "Lifepath · Family Secret (1D)" },
    { key: "familyCrisis", label: "Family Crisis", code: "1F", defaultName: "Lifepath · Family Crisis (1F)" },
    { key: "familyGoal", label: "Family Goal", code: "1G", defaultName: "Lifepath · Family Goal (1G)" },
    { key: "siblings", label: "Sibling Relationship", code: "1H", defaultName: "Lifepath · Siblings (1H)" },
    { key: "familyBond", label: "Family/Sibling Bond", code: "0R", defaultName: "Lifepath · Family Bond (0R)" }
  ]},
  { group: "2. Friends, Enemies & Romance", items: [
    { key: "friendSituation", label: "Friend Situation", code: "T2/2A", defaultName: "Lifepath · Friend Situation (T2/2A)" },
    { key: "enemySituation", label: "Enemy Situation", code: "T2/2A", defaultName: "Lifepath · Enemy Situation (T2/2A)" },
    { key: "feRace", label: "Friend/Enemy Ancestry/Identity", code: "2B", defaultName: "Lifepath · Friend/Enemy Identity (2B)" },
    { key: "feProfession", label: "Friend/Enemy Profession", code: "2C", defaultName: "Lifepath · Friend/Enemy Profession (2C)" },
    { key: "romanceHealthy", label: "Romance Detail: Healthy", code: "3A", defaultName: "Lifepath · Healthy Romance (3A)" },
    { key: "romanceLookout", label: "Romance Detail: Lookout", code: "3B", defaultName: "Lifepath · On the Lookout (3B)" },
    { key: "romanceTragic", label: "Romance Detail: Tragic", code: "3C", defaultName: "Lifepath · Tragic Romance (3C)" },
    { key: "romanceProblematic", label: "Romance Detail: Complication", code: "3D", defaultName: "Lifepath · Problematic Romance (3D)" },
    { key: "loverRace", label: "Lover Ancestry/Identity", code: "3E", defaultName: "Lifepath · Lover Identity (3E)" },
    { key: "loverProfession", label: "Lover Profession", code: "3F", defaultName: "Lifepath · Lover Profession (3F)" },
    { key: "loverAppearance", label: "Lover Appearance", code: "3G", defaultName: "Lifepath · Lover Appearance (3G)" }
  ]},
  { group: "3. Personal Characteristics", items: [
    { key: "hairColor", label: "Hair Color", code: "4", defaultName: "Lifepath · Hair Color (4)" },
    { key: "hairStyle", label: "Hair Style", code: "4A", defaultName: "Lifepath · Hair Style (4A)" },
    { key: "eyeColor", label: "Eye Color", code: "4B", defaultName: "Lifepath · Eye Color (4B)" },
    { key: "skinTone", label: "Skin Tone", code: "4AA", defaultName: "Lifepath · Skin Tone (4AA)" },
    { key: "personalStyle", label: "Personal Style", code: "4C", defaultName: "Lifepath · Personal Style (4C)" },
    { key: "trait", label: "Defining Personality Trait", code: "5", defaultName: "Lifepath · Personality Trait (5)" },
    { key: "values", label: "What is Valued Most", code: "5A", defaultName: "Lifepath · Values (5A)" },
    { key: "valuedObject", label: "Most Valued Object", code: "5B", defaultName: "Lifepath · Valued Object (5B)" },
    { key: "lostIt", label: "If It Were Lost...", code: "5C", defaultName: "Lifepath · If You Lost It (5C)" },
    { key: "fear", label: "Greatest Fear", code: "5D", defaultName: "Lifepath · Fear (5D)" },
    { key: "valuedPerson", label: "Person Valued Most", code: "5E", defaultName: "Lifepath · Valued Person (5E)" },
    { key: "quirk", label: "Personality Quirk", code: "5F–5H", defaultName: "Lifepath · Quirk (5F–5H)" },
    { key: "faith", label: "Faith", code: "5I", defaultName: "Lifepath · Faith (5I)" }
  ]},
  { group: "4. Names & Life Events", items: [
    { key: "femaleNames", label: "Fantasy Female Names", code: "", defaultName: "Fantasy Female Names" },
    { key: "maleNames", label: "Fantasy Male Names", code: "", defaultName: "Fantasy Male Names" },
    { key: "neutralNames", label: "Fantasy Neutral Names", code: "", defaultName: "Fantasy Neutral Names" },
    { key: "lastNames", label: "Fantasy Last Names", code: "", defaultName: "Fantasy Last Names" },
    { key: "lucky", label: "Lucky Life Events", code: "6B", defaultName: "Lifepath · Lucky Life Event (6B)" },
    { key: "unlucky", label: "Unlucky Life Events", code: "6A", defaultName: "Lifepath · Unlucky Life Event (6A)" }
  ]}
];

// Migrated from a legacy V1 FormApplication to standard ApplicationV2 - matches every other
// custom window in this module (FatePoolManager is the closest precedent: a standalone,
// non-document-linked config window). The "standard-form" class is what gives the plain
// form-group/form-fields/fieldset/legend markup below Foundry's own default spacing and
// theme-reactive styling for free, instead of the hand-rolled colors/!important overrides this
// sheet used to need.
class LifepathTableConfigApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "wicked-lifepath-table-config",
    classes: ["wicked-campaigns", "standard-form"],
    window: {
      title: "Configure Lifepath Roll Tables",
      icon: "fa-solid fa-dice",
      resizable: true,
    },
    position: {
      width: 600,
      height: 600,
    },
  };

  static PARTS = {
    form: { template: "modules/cv-wicked-campaigns/templates/table-config.hbs", scrollable: [".config-body"] },
  };

  async _prepareContext(options) {
    const mappings = game.settings.get("cv-wicked-campaigns", "tableMappings") || {};
    const worldTables = game.tables.contents
      .map((t) => ({ id: t.id, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const sections = LIFEPATH_TABLES_LIST.map((grp) => ({
      group: grp.group,
      items: grp.items.map((item) => ({
        key: item.key,
        label: item.label,
        code: item.code,
        defaultName: item.defaultName,
        selected: mappings[item.key] || "",
        worldTables,
      })),
    }));

    return { sections };
  }

  _onRender(context, options) {
    this.element.querySelector("form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const mappings = {};
      this.element.querySelectorAll("select[name]").forEach((select) => {
        if (select.value) mappings[select.name] = select.value;
      });
      await game.settings.set("cv-wicked-campaigns", "tableMappings", mappings);
      ui.notifications.info("Wicked Campaigns | Lifepath table mappings saved successfully.");
      this.close();
    });
  }
}

// ---- Hooks ---------------------------------------------------------------
Hooks.once('init', async function() {
    console.log('Wicked Campaigns | Initializing Wicked Campaigns module');

    game.settings.registerMenu("cv-wicked-campaigns", "tableConfig", {
      name: "Configure Lifepath Roll Tables",
      label: "Configure Tables",
      hint: "Select which world-level roll tables the Lifepath Wizard should use instead of the compendium defaults.",
      icon: "fas fa-dice",
      type: LifepathTableConfigApp,
      restricted: true
    });

    game.settings.register("cv-wicked-campaigns", "tableMappings", {
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });

    game.settings.register("cv-wicked-campaigns", ACTIVE_PARTY_SETTING, {
      scope: "world",
      config: false,
      type: String,
      default: ""
    });

    game.settings.register("cv-wicked-campaigns", "appliedDefaultCCTheme", {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    });

    game.settings.register("cv-wicked-campaigns", "appliedDefaultIncludedCompendium", {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    });

    // One-time backfill: provisions Campaign Codex entries for PCs that already existed before
    // the createActor auto-provisioning hook was added, same shape as the two flags above.
    game.settings.register("cv-wicked-campaigns", "appliedCampaignCodexOwnershipBackfillV2", {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    });

    // Gates the "iName Thee Helper" button on the Backstory sheet - off by default since it
    // depends on iName Thee being installed/active and a GM being online to relay through.
    game.settings.register("cv-wicked-campaigns", "inameTheeIntegration", {
      name: "iName Thee Integration",
      hint: "Enables the \"iName Thee Helper\" button on Backstory sheets, which asks iName Thee's AI to smooth logic clashes (e.g. a friend's situation contradicting their rolled profession). Requires iName Thee to be installed and active.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });

    // Same "checked live inside each handler" pattern as chaseTrackerEnabled/inameTheeIntegration
    // for the module's other big features, so a GM can turn any of them off without a reload.
    game.settings.register("cv-wicked-campaigns", "fatePoolEnabled", {
      name: "Fate Pool",
      hint: "Enables the Fate Pool and In Peril widgets, the Fate Pool Manager keybinding/hotkeys, and the Spend Fate Point button on character sheets.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register("cv-wicked-campaigns", "lifepathWizardEnabled", {
      name: "Lifepath Wizard",
      hint: "Enables the Lifepath Wizard button on character sheets for generating a full backstory.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register("cv-wicked-campaigns", "sessionZeroEnabled", {
      name: "Session Zero Card Game",
      hint: "Enables the Start/End Session Zero Game and Reset Deck buttons on Complete Card Management's deck HUD. Requires Complete Card Management to be installed and active.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register("cv-wicked-campaigns", "cardImageViewerEnabled", {
      name: "Card Image Viewer",
      hint: "Replaces Foundry's native image popout (actor portraits, item art, journal images, etc) everywhere with our zoomable viewer. Requires lib-wrapper to be installed and active.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    // Gates the chase keybinding and all Combat lifecycle hooks below - checked live inside each
    // handler (not by conditionally registering the hooks), so toggling takes effect immediately.
    game.settings.register("cv-wicked-campaigns", "chaseTrackerEnabled", {
      name: "Chase Tracker",
      hint: "Enables the Chase Tracker: turns a Combat into a chase with a GM control panel (turn order, gap tracking, dash/exhaustion, complications) and an auto-opening player HUD.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    // Curated {uuid, label} list of RollTables the chase setup dialog offers as complication
    // tables. Deliberately not flags on the tables themselves - the DMG's own tables live in a
    // locked, third-party compendium we shouldn't write into.
    game.settings.register("cv-wicked-campaigns", "chaseComplicationTables", {
      scope: "world",
      config: false,
      type: Array,
      default: []
    });

    // One-time seed guard for the 10 bundled complication tables + auto-registering the DMG's
    // Urban/Wilderness tables, same shape as appliedDefaultCCTheme above.
    game.settings.register("cv-wicked-campaigns", "chaseTablesSeeded", {
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    });

    // Saved chase setups: [{ id, name, tableUuid, participants: [{ actorUuid, role }] }].
    // References actors (not tokens) so a preset can be launched on any future scene.
    game.settings.register("cv-wicked-campaigns", "chasePresets", {
      scope: "world",
      config: false,
      type: Array,
      default: []
    });

    // Gates the drama tracker keybinding and all its Combat lifecycle hooks - same
    // checked-live-in-every-handler idiom as chaseTrackerEnabled above.
    game.settings.register("cv-wicked-campaigns", "dramaEnabled", {
      name: "Drama Tracker",
      hint: "Enables the Drama Tracker: turns a Combat into a scene with several NPCs a party can approach in any order (e.g. a masquerade ball) - discovery checks, per-motive DC modifiers, temptation saves, and per-NPC success/failure tracking, plus an auto-opening player HUD.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    // Saved drama tracker setups: [{ id, name, participants: [{ actorUuid, role }] }], where
    // role is "pc" or "npc" - same shape/portability rationale as chasePresets above.
    game.settings.register("cv-wicked-campaigns", "dramaPresets", {
      scope: "world",
      config: false,
      type: Array,
      default: []
    });

    game.settings.register("cv-wicked-campaigns", "motivesEnabled", {
      name: "NPC Motive Drivers",
      hint: "Enables the Motives & Desires tab on NPC sheets to track dynamic wants, needs, and fears.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: () => foundry.applications.settings.SettingsConfig.reloadConfirm({ world: true })
    });

    DocumentSheetConfig.registerSheet(JournalEntry, "cv-wicked-campaigns", PartySheet, {
      types: ["base"],
      label: "CV_WICKED_CAMPAIGNS.PartySheetLabel"
    });

    DocumentSheetConfig.registerSheet(JournalEntry, "cv-wicked-campaigns", BackstorySheet, {
      types: ["base"],
      label: "CV_WICKED_CAMPAIGNS.BackstorySheetLabel"
    });

    DocumentSheetConfig.registerSheet(JournalEntry, "cv-wicked-campaigns", SessionZeroSheet, {
      types: ["base"],
      label: "CV_WICKED_CAMPAIGNS.SessionZeroSheetLabel"
    });

    // @Say pronunciation links: click to play the referenced audio file.
    CONFIG.TextEditor.enrichers.push({
      id: "wicked-say",
      pattern: SAY_ENRICHER_PATTERN,
      enricher: async (match) => enrichSayLink(match)
    });

    document.addEventListener("click", (event) => {
      const link = event.target.closest(".wicked-say-link");
      if (!link) return;
      event.preventDefault();
      const path = link.dataset.audioPath;
      if (!path) return;
      foundry.audio.AudioHelper.play({ src: path, volume: 0.8, autoplay: true, loop: false }, false);
    });

    // Toggle between Token Controls and the Complete Card Management card layer.
    // From any layer other than "cards", jumps to "tokens" first.
    game.keybindings.register("cv-wicked-campaigns", "toggleTokenCardLayer", {
      name: "CV_WICKED_CAMPAIGNS.Keybindings.ToggleTokenCardLayer.Name",
      hint: "CV_WICKED_CAMPAIGNS.Keybindings.ToggleTokenCardLayer.Hint",
      editable: [{ key: "KeyZ", modifiers: ["Alt"] }],
      restricted: false,
      precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
      onDown: () => {
        if (!canvas?.ready) return;
        const target = ui.controls.control?.name === "tokens" ? "cards" : "tokens";
        ui.controls.activate({ control: target });
      }
    });

    // Keybinding to open Fate Pool Manager (GM only)
    game.keybindings.register("cv-wicked-campaigns", "openFatePoolManager", {
        name: "Open Fate Pool Manager",
        hint: "Open the Fate Pool manager dialog (GM only).",
        editable: [{ key: "KeyB", modifiers: ["SHIFT"] }],
        onDown: () => {
            if (!game.user.isGM || !game.settings.get("cv-wicked-campaigns", "fatePoolEnabled")) return;
            const openWindow = foundry.applications.instances.get("fate-pool-manager");
            if (openWindow) openWindow.close();
            else new FatePoolManager().render(true);
        },
        restricted: true
    });

    // Keybinding to Quick Add Fate Point (GM only)
    game.keybindings.register("cv-wicked-campaigns", "addFatePoint", {
        name: "Quick Add Fate Point",
        hint: "Instantly add 1 point to the Fate Pool (GM only).",
        editable: [{ key: "KeyB" }],
        onDown: () => {
            if (!game.user.isGM || !game.settings.get("cv-wicked-campaigns", "fatePoolEnabled")) return;
            updateFatePool(1, "Quick Add (Hot Key)");
        },
        restricted: true
    });

    // Keybinding to Quick Subtract Fate Point (GM only)
    game.keybindings.register("cv-wicked-campaigns", "subtractFatePoint", {
        name: "Quick Subtract Fate Point",
        hint: "Instantly subtract 1 point from the Fate Pool (GM only).",
        editable: [{ key: "KeyB", modifiers: ["ALT"] }],
        onDown: () => {
            if (!game.user.isGM || !game.settings.get("cv-wicked-campaigns", "fatePoolEnabled")) return;
            updateFatePool(-1, "Quick Subtract (Hot Key)");
        },
        restricted: true
    });

    // Keybinding to open Chase Setup (GM only)
    game.keybindings.register("cv-wicked-campaigns", "openChaseSetup", {
        name: "Open Chase Setup",
        hint: "Open the Chase Tracker setup dialog to start a new chase (GM only).",
        editable: [{ key: "KeyC", modifiers: ["SHIFT"] }],
        onDown: () => {
            if (!game.user.isGM || !game.settings.get("cv-wicked-campaigns", "chaseTrackerEnabled")) return;
            const activeChase = game.combats.find((c) => c.getFlag("cv-wicked-campaigns", "isChase"));
            if (activeChase) ChaseGMPanel.open(activeChase);
            else new ChaseSetupDialog().render(true);
        },
        restricted: true
    });

    // Keybinding to open Drama Tracker Setup (GM only)
    game.keybindings.register("cv-wicked-campaigns", "openDramaSetup", {
        name: "Open Drama Tracker Setup",
        hint: "Open the Drama Tracker setup dialog to start a new dramatic scene (GM only).",
        editable: [{ key: "KeyS", modifiers: ["SHIFT"] }],
        onDown: () => {
            if (!game.user.isGM || !game.settings.get("cv-wicked-campaigns", "dramaEnabled")) return;
            const active = game.combats.find((c) => c.getFlag("cv-wicked-campaigns", "isDrama"));
            if (active) DramaGMPanel.open(active);
            else new DramaSetupDialog().render(true);
        },
        restricted: true
    });

    // Register the Wicked Character Sheet: a subclass of dnd5e's own sheet
    // with our custom tabs added, registered as the default for PC actors
    // so players can still opt back into the vanilla sheet via Configure Sheet.
    const CharacterActorSheet = dnd5e?.applications?.actor?.CharacterActorSheet;
    if (CharacterActorSheet) {
        class WickedCharacterSheet extends CharacterActorSheet {
            static DEFAULT_OPTIONS = {
                ...super.DEFAULT_OPTIONS,
                classes: [...(super.DEFAULT_OPTIONS.classes ?? []), "wicked-character-sheet"],
                actions: {
                    ...super.DEFAULT_OPTIONS.actions,
                    "open-lifepath-wizard": function(event, target) {
                        if (!game.settings.get("cv-wicked-campaigns", "lifepathWizardEnabled")) return;
                        LifepathWizard.launch(this.actor);
                    },
                    "open-backstory-sheet": async function(event, target) {
                        const backstory = findBackstoryForActorSync(this.actor);
                        backstory?.sheet?.render(true);
                    },
                    "export-background-pdf": async function(event, target) {
                        const backstory = findBackstoryForActorSync(this.actor);
                        ui.notifications.info(`Building PDF for ${this.actor.name}…`);
                        try {
                            await exportBackgroundPdf(this.actor, backstory);
                        } catch (err) {
                            console.error("Wicked Campaigns | Failed to export background PDF", err);
                            ui.notifications.error(`Failed to build PDF: ${err?.message ?? "Something went wrong."}`);
                        }
                    },
                    "send-to-iname-thee": async function(event, target) {
                        const backstory = findBackstoryForActorSync(this.actor);
                        const { inameRole: role, inameName: name, inameConcept: concept } = target.dataset;
                        await sendToINameThee({ backstory, actorName: this.actor.name, role, name, concept });
                    },
                    "initialize-traits": async function(event, target) {
                        const defaultPairs = {};
                        for (let i = 0; i < TRAIT_PAIRS.length; i++) {
                            defaultPairs[i] = 10;
                        }
                        await this.actor.setFlag("cv-wicked-campaigns", "useTraitPairs", true);
                        await this.actor.setFlag("cv-wicked-campaigns", "traitPairs", defaultPairs);
                        ui.notifications.info("Personality Traits initialized with balanced starting values!");
                    },
                    "spend-fate-point": async function(event, target) {
                        if (!game.settings.get("cv-wicked-campaigns", "fatePoolEnabled")) return;
                        const current = getFatePoolSync();
                        if (current <= 0 && !game.user.isGM) {
                            ui.notifications.warn("The Fate Pool is empty!");
                            return;
                        }
                        await updateFatePool(-1, `Spent Fate Point (${this.actor.name})`);
                    },
                    "roll-trait": async function(event, target) {
                        const traitName = target.dataset.name;
                        const value = parseInt(target.dataset.value, 10) ?? 10;

                        const roll = await new Roll("1d20").evaluate({ async: true });

                        let isCritical = false;
                        let isFumble = false;
                        let isSuccess = false;

                        if (value >= 20) {
                            isSuccess = true;
                            if (roll.total === 20 || roll.total === value) {
                                isCritical = true;
                            }
                        } else {
                            if (roll.total === 20) {
                                isFumble = true;
                            } else if (roll.total === value) {
                                isCritical = true;
                                isSuccess = true;
                            } else if (roll.total < value) {
                                isSuccess = true;
                            }
                        }

                        let resultText = "";
                        let resultClass = "";
                        if (isCritical) {
                            resultText = "Critical Success!";
                            resultClass = "critical";
                        } else if (isFumble) {
                            resultText = "Fumble!";
                            resultClass = "fumble";
                        } else if (isSuccess) {
                            resultText = "Success";
                            resultClass = "success";
                        } else {
                            resultText = "Failure";
                            resultClass = "failure";
                        }

                        const content = `
                            <div class="dnd5e chat-card wicked-trait-card" style="font-family: 'Signika', sans-serif;">
                                <div class="card-content" style="padding: 0.5rem 0;">
                                    <p style="margin: 0 0 0.5rem 0; font-size: 0.95rem; text-align: center;">
                                        Rolling against <strong>${traitName}</strong> (Target: ${value})
                                    </p>
                                    <div class="wicked-trait-roll-box">
                                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                                            <i class="fa-solid fa-dice-d20" style="font-size: 1.35rem; color: #c9a054;"></i>
                                            <span class="roll-value">${roll.total}</span>
                                        </div>
                                        <div class="wicked-trait-divider"></div>
                                        <div class="wicked-trait-result ${resultClass}">
                                            ${resultText}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;

                        await roll.toMessage({
                            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                            flavor: `${this.actor.name} rolls their ${traitName} Trait`,
                            content: content
                        });
                    }
                }
            };

            static TABS = [
                ...super.TABS,
                { tab: "wicked-traits", label: "CV_WICKED_CAMPAIGNS.PersonalityTraits", icon: "fa-solid fa-yin-yang" },
                { tab: "wicked-background", label: "CV_WICKED_CAMPAIGNS.BackgroundTitle", icon: "fa-solid fa-book-skull" },
                { tab: "wicked-widgets", label: "CV_WICKED_CAMPAIGNS.WidgetsTitle", icon: "fa-solid fa-hexagon-nodes" }
            ];

            static PARTS = {
                ...super.PARTS,
                "wicked-traits": {
                    template: "modules/cv-wicked-campaigns/templates/wicked-traits.hbs",
                    container: { classes: ["tab-body"], id: "tabs" },
                    scrollable: [""]
                },
                "wicked-background": {
                    template: "modules/cv-wicked-campaigns/templates/wicked-background.hbs",
                    container: { classes: ["tab-body"], id: "tabs" },
                    scrollable: [""]
                },
                "wicked-widgets": {
                    template: "modules/cv-wicked-campaigns/templates/wicked-widgets.hbs",
                    container: { classes: ["tab-body"], id: "tabs" },
                    scrollable: [""]
                }
            };
        }

        DocumentSheetConfig.registerSheet(Actor, "cv-wicked-campaigns", WickedCharacterSheet, {
            types: ["character"],
            label: "CV_WICKED_CAMPAIGNS.SheetLabel",
            makeDefault: true
        });

        console.log('Wicked Campaigns | Registered Wicked Character Sheet');

        // Register the Wicked NPC Sheet
        const NPCActorSheet = dnd5e?.applications?.actor?.NPCActorSheet;
        if (NPCActorSheet && game.settings.get("cv-wicked-campaigns", "motivesEnabled")) {
            class WickedNPCActorSheet extends NPCActorSheet {
                static DEFAULT_OPTIONS = {
                    ...super.DEFAULT_OPTIONS,
                    classes: [...(super.DEFAULT_OPTIONS.classes ?? []), "wicked-npc-sheet"],
                    actions: {
                        ...super.DEFAULT_OPTIONS.actions,
                        "add-motive": async function(event, target) {
                            const container = event.target.closest("h3");
                            const selector = container?.querySelector("#motive-preset-selector");
                            const customInput = container?.querySelector("#motive-custom-input");
                            
                            let label = "New Motive";
                            if (selector) {
                                const val = selector.value;
                                if (val === "custom" && customInput && customInput.value.trim()) {
                                    label = customInput.value.trim();
                                    customInput.value = "";
                                } else if (val && val !== "custom") {
                                    label = val;
                                }
                            }

                            const motives = this.actor.getFlag("cv-wicked-campaigns", "motives") || {};
                            
                            // Prevent duplicates
                            const isDuplicate = Object.values(motives).some(data => data.label?.toLowerCase() === label.toLowerCase());
                            if (isDuplicate) {
                                ui.notifications.warn(`Wicked Campaigns | A motive named '${label}' already exists on this NPC.`);
                                return;
                            }

                            const key = `mot_${Date.now()}`;
                            await this.actor.setFlag("cv-wicked-campaigns", `motives.${key}`, {
                                label: label,
                                value: 0,
                                revealed: "hidden"
                            });
                        },
                        "delete-motive": async function(event, target) {
                            const key = target.dataset.key;
                            await this.actor.update({ [`flags.cv-wicked-campaigns.motives.-=${key}`]: null });
                        },
                        "roll-motive": async function(event, target) {
                            const name = target.dataset.name;
                            const value = parseInt(target.dataset.value, 10) || 0;
                            const rollType = target.dataset.rollType || "normal";
                            const targetValue = Math.abs(value);

                            // Roll-under save, so "Advantage" needs the formula that makes HIGH rolls
                            // more likely (2d20kh) - matching the normal D&D meaning of Advantage on a
                            // save (helps you resist), not the raw dice-mechanics meaning of "advantage
                            // at rolling low". Disadvantage is the reverse (2d20kl, more likely to
                            // succumb). See "Advantage & Disadvantage (Roll-Under Mechanics)" in
                            // motive_drivers_rules.html for the full explanation.
                            let formula = "1d20";
                            let typeLabel = "";
                            if (rollType === "advantage") {
                                formula = "2d20kh";
                                typeLabel = " (Advantage)";
                            } else if (rollType === "disadvantage") {
                                formula = "2d20kl";
                                typeLabel = " (Disadvantage)";
                            }

                            const roll = await new Roll(formula).evaluate({ async: true });
                            const isSuccess = roll.total <= targetValue;

                            const resultText = isSuccess ? "Driven to Act!" : "Indifferent / Resisted";

                            // Individual die results, with any discarded (2d20kh/kl) one struck through -
                            // makes it easy to eyeball that Advantage/Disadvantage is keeping the right
                            // die while testing.
                            const dieResultsHtml = (roll.dice[0]?.results || [])
                                .map((r) => `<span style="${r.active ? "" : "text-decoration: line-through; opacity: 0.5;"}">${r.result}</span>`)
                                .join(", ");

                            const content = `
                                <div class="dnd5e chat-card wicked-trait-card" style="font-family: 'Signika', sans-serif;">
                                    <div class="card-content" style="padding: 0.5rem 0;">
                                        <p style="margin: 0 0 0.5rem 0; font-size: 0.95rem; text-align: center;">
                                            Checking <strong>${name}</strong>${typeLabel} (Target: ${targetValue})
                                        </p>
                                        <div class="wicked-trait-roll-box" style="display: flex; align-items: center; justify-content: space-around; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px;">
                                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                                <i class="fa-solid fa-dice-d20" style="font-size: 1.35rem; color: #c9a054;"></i>
                                                <span class="roll-value" style="font-size: 1.2rem; font-weight: bold;">${roll.total}</span>
                                            </div>
                                            <div style="font-weight: bold; color: ${isSuccess ? '#f44336' : '#4caf50'};">${resultText}</div>
                                        </div>
                                        <p style="margin: 0.35rem 0 0; font-size: 0.7rem; opacity: 0.7; text-align: center;">
                                            <code>${formula}</code>${dieResultsHtml ? ` &rarr; ${dieResultsHtml}` : ""}
                                        </p>
                                    </div>
                                </div>
                            `;

                            await roll.toMessage({
                                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                                flavor: `${this.actor.name} rolls against their ${name} drive${typeLabel}`,
                                content: content
                            });
                        }
                    }
                };

                static TABS = [
                    ...super.TABS,
                    { tab: "wicked-motives", label: "CV_WICKED_CAMPAIGNS.NPCDrives", icon: "fa-solid fa-yin-yang" }
                ];

                static PARTS = {
                    ...super.PARTS,
                    "wicked-motives": {
                        template: "modules/cv-wicked-campaigns/templates/wicked-motives.hbs",
                        container: { classes: ["tab-body"], id: "tabs" },
                        scrollable: [""]
                    }
                };
            }

            DocumentSheetConfig.registerSheet(Actor, "cv-wicked-campaigns", WickedNPCActorSheet, {
                types: ["npc"],
                label: "CV_WICKED_CAMPAIGNS.NPCLabel",
                makeDefault: true
            });

            console.log('Wicked Campaigns | Registered Wicked NPC Sheet');
        }
    } else {
        console.warn('Wicked Campaigns | dnd5e CharacterActorSheet not found');
    }
});

Hooks.on("dnd5e.prepareSheetContext", (sheet, partId, context, options) => {
    if (partId === "wicked-background") {
        // Read live from the backstory entry rather than a stored copy on the
        // actor, so this can never show stale content if the backstory is
        // edited directly (e.g. via its own sheet, or by re-running the wizard).
        const backstory = findBackstoryForActorSync(sheet.actor);
        context.lifepathHtml = backstory?.getFlag(CC_MODULE_ID, "data")?.description || "";
        context.backstoryUuid = backstory?.uuid || "";
        context.lifepathWizardEnabled = game.settings.get("cv-wicked-campaigns", "lifepathWizardEnabled");
    } else if (partId === "wicked-traits") {
        context.useTraitPairs = sheet.actor.getFlag("cv-wicked-campaigns", "useTraitPairs") ?? false;
        const savedPairs = sheet.actor.getFlag("cv-wicked-campaigns", "traitPairs") || {};
        
        context.traitPairs = TRAIT_PAIRS.map((pr, i) => {
            const leftVal = savedPairs[i] ?? 10;
            const rightVal = 20 - leftVal;
            return {
                index: i,
                leftName: pr[0],
                leftValue: leftVal,
                rightName: pr[1],
                rightValue: rightVal
            };
        });
    } else if (partId === "wicked-widgets") {
        context.fatePool = getFatePoolSync();
        context.inPeril = getInPerilSync();
        context.fatePoolEnabled = game.settings.get("cv-wicked-campaigns", "fatePoolEnabled");
    } else if (partId === "wicked-motives") {
        context.isGM = game.user.isGM;
        const rawMotives = sheet.actor.getFlag("cv-wicked-campaigns", "motives") || {};
        context.motives = Object.entries(rawMotives).map(([id, data]) => {
            const val = data.value ?? 0;
            const absVal = Math.abs(val);
            const isFameOrInfamy = absVal >= 15;
            const isFullyRevealed = data.revealed === "public" || isFameOrInfamy;
            const visibleToPlayers = data.revealed === "public" || data.revealed === "partial" || isFameOrInfamy;
            
            // Calculate dynamic HSL color
            let color;
            if (val > 0) {
                const intensity = val / 20;
                color = `hsl(${45 + (120 - 45) * intensity}, ${55 + 25 * intensity}%, ${40 + 5 * intensity}%)`;
            } else if (val < 0) {
                const intensity = absVal / 20;
                color = `hsl(${35 - 35 * intensity}, ${65 + 25 * intensity}%, ${40 + 5 * intensity}%)`;
            } else {
                color = "hsl(0, 0%, 50%)";
            }

            return {
                id,
                label: data.label || "New Motive",
                value: val,
                revealed: data.revealed || "hidden",
                color,
                isFameOrInfamy,
                isFullyRevealed,
                visibleToPlayers
            };
        });
    }
});

function isChaseCombat(combat) {
  return combat?.getFlag("cv-wicked-campaigns", "isChase") === true;
}

// One-time seed: creates the 10 bundled complication tables in wicked-roll-tables, then registers
// them (plus the DMG's own Urban/Wilderness tables, if that module is active) into the
// chaseComplicationTables setting. Never writes into the DMG's own (locked) compendium - just
// records its tables' UUIDs alongside ours.
async function seedChaseComplicationTables() {
  const pack = game.packs.get("cv-wicked-campaigns.wicked-roll-tables");
  if (!pack) {
    console.warn("Wicked Campaigns | wicked-roll-tables compendium not found, skipping Chase Tracker table seed.");
    return;
  }

  const registry = foundry.utils.deepClone(game.settings.get("cv-wicked-campaigns", "chaseComplicationTables") || []);

  for (const def of CHASE_COMPLICATION_TABLE_DEFS) {
    const created = await RollTable.create({
      name: def.name,
      img: "icons/svg/d20-grey.svg",
      formula: "1d12",
      replacement: true,
      displayRoll: true,
      // TableResult's text content field is "description", not "text" (confirmed against the
      // DMG's own Urban/Wilderness Chase Complications data).
      results: def.results.map((r) => ({ type: "text", description: r.text, range: r.range, weight: 1 })),
    }, { pack: pack.collection });
    registry.push({ uuid: created.uuid, label: def.name });
  }

  if (game.modules.get("dnd-dungeon-masters-guide")?.active) {
    const dmgTables = [
      { id: "dmgUrbanChaseCom", label: "Urban Chase Complications" },
      { id: "dmgWildernessCha", label: "Wilderness Chase Complications" },
    ];
    for (const { id, label } of dmgTables) {
      const uuid = `Compendium.dnd-dungeon-masters-guide.tables.RollTable.${id}`;
      const doc = await fromUuid(uuid).catch(() => null);
      if (doc) registry.push({ uuid, label });
    }
  }

  await game.settings.set("cv-wicked-campaigns", "chaseComplicationTables", registry);
  console.log(`Wicked Campaigns | Seeded ${CHASE_COMPLICATION_TABLE_DEFS.length} Chase Complication tables.`);
}

Hooks.once('ready', async function() {
    console.log('Wicked Campaigns | Ready');
    initializeNPCTrackableMotives();
    patchMotiveTokenBars();
    patchMotiveActorAttribute();

    // Every client needs the widget class available to render it, not just the GM -
    // registered unconditionally here (gated only on Campaign Codex being active),
    // separate from the GM-only setup work below.
    if (isCampaignCodexActive()) {
        registerVideoPlayerWidget();
        registerMannerismsWidget();
        registerPersonalityWidget();
        registerMotivesWidget();
    }

    if (game.user.isGM) {
        try {
            await ensureWickedCampaignsFolders();
        } catch (err) {
            console.error("Wicked Campaigns | Failed to ensure/organize Wicked Campaigns folders.", err);
        }

        try {
            await getOrCreateActivePartyRoster();
        } catch (err) {
            console.error("Wicked Campaigns | Failed to pre-create the active Party codex entry.", err);
        }

        if (isCCMActive()) {
            Hooks.on("renderCardHud", onRenderCardHud);
        }

        if (isCampaignCodexActive() && !game.settings.get("cv-wicked-campaigns", "appliedDefaultCCTheme")) {
            try {
                await applyDefaultCampaignCodexTheme();
            } catch (err) {
                console.error("Wicked Campaigns | Failed to apply the default Campaign Codex theme.", err);
            } finally {
                await game.settings.set("cv-wicked-campaigns", "appliedDefaultCCTheme", true);
            }
        }

        if (isCampaignCodexActive() && !game.settings.get("cv-wicked-campaigns", "appliedDefaultIncludedCompendium")) {
            try {
                await includeWickedLoreCompendium();
            } catch (err) {
                console.error("Wicked Campaigns | Failed to include the wicked-lore compendium.", err);
            } finally {
                await game.settings.set("cv-wicked-campaigns", "appliedDefaultIncludedCompendium", true);
            }
        }

        // Catch-up pass for PCs that don't have (or don't own) their Campaign Codex entry yet -
        // e.g. created before the createActor hook existed, created while Campaign Codex was
        // inactive, or given a player owner only later. Runs on every GM load, not once: the
        // find-or-create calls short-circuit for PCs already set up, so re-running it is cheap and
        // idempotent, and it's the only thing that ever revisits a PC whose entry went missing
        // after the old one-time backfill had already run. (The world setting
        // "appliedCampaignCodexOwnershipBackfillV2" is left registered but no longer gates this.)
        if (isCampaignCodexActive()) {
            // Per-actor try/catch, not one around the whole loop - one actor throwing shouldn't
            // abort the rest.
            const pcs = game.actors.filter((a) => a.type === "character" && a.hasPlayerOwner);
            for (const actor of pcs) {
                try {
                    await provisionCampaignCodexEntryForActor(actor);
                } catch (err) {
                    console.error(`Wicked Campaigns | Failed to provision the Campaign Codex entry for "${actor.name}".`, err);
                }
            }
        }

        if (!game.settings.get("cv-wicked-campaigns", "chaseTablesSeeded")) {
            try {
                await seedChaseComplicationTables();
            } catch (err) {
                console.error("Wicked Campaigns | Failed to seed Chase Complication tables.", err);
            } finally {
                await game.settings.set("cv-wicked-campaigns", "chaseTablesSeeded", true);
            }
        }

        // Reopen the GM chase panel across a reload/reconnect if a chase is still active.
        if (game.settings.get("cv-wicked-campaigns", "chaseTrackerEnabled")) {
            const activeChase = game.combats.find(isChaseCombat);
            if (activeChase) ChaseGMPanel.open(activeChase);
        }

        // Same reconnect behavior for an active drama scene.
        if (game.settings.get("cv-wicked-campaigns", "dramaEnabled")) {
            const activeConflict = game.combats.find(isDramaCombat);
            if (activeConflict) DramaGMPanel.open(activeConflict);
        }
    } else {
        // Non-GM reconnect: reopen the player HUD if a chase/conflict is active and this user owns
        // a combatant in it - mirrors the createCombat auto-open below, just for page reloads.
        if (game.settings.get("cv-wicked-campaigns", "chaseTrackerEnabled")) {
            const activeChase = game.combats.find(isChaseCombat);
            if (activeChase && activeChase.combatants.some((c) => c.actor?.isOwner)) {
                ChasePlayerHUD.open(activeChase);
            }
        }

        if (game.settings.get("cv-wicked-campaigns", "dramaEnabled")) {
            const activeConflict = game.combats.find(isDramaCombat);
            if (activeConflict && activeConflict.combatants.some((c) => c.actor?.isOwner)) {
                DramaPlayerHUD.open(activeConflict);
            }
        }
    }

    // Registered for every client, not just the GM - the whole point is that players receive the
    // broadcast and open OUR viewer on their own screen, even though only the GM ever sees the
    // "Show Players" control that triggers it (that button is on our GM-only CardHud UI above).
    if (isCCMActive()) {
        game.socket.on(CARD_IMAGE_SHARE_CHANNEL, (payload) => {
            if (payload?.type === "shareCardImage") {
                CardImageViewerApp.open(payload.src, payload.title);
            }
        });
    }

    // Live provisioning: when a player saves a backstory but can't create or own its Campaign
    // Codex entry, they emit a request (see requestGmCampaignCodexProvision) that the single active
    // GM's client fulfils here - so it no longer has to wait for a full world reload. Gated to
    // game.users.activeGM so exactly one GM acts even when several are online.
    game.socket.on(CARD_IMAGE_SHARE_CHANNEL, async (payload) => {
        if (payload?.type !== "requestCampaignCodexProvision") return;
        if (game.user !== game.users.activeGM || !isCampaignCodexActive()) return;
        try {
            const actor = await fromUuid(payload.actorUuid);
            if (actor) await provisionCampaignCodexEntryForActor(actor);
        } catch (err) {
            console.error("Wicked Campaigns | Failed to provision a Campaign Codex entry from a player request.", err);
        }
    });
});

// ---- Chase Tracker: core logic --------------------------------------------
// DMG rule: a participant can Dash 3 + Con mod times (min 1) across the whole chase before
// needing a Con save; the DC rises by 1 for every dash past that threshold.
function chaseDashThreshold(conMod) {
    return Math.max(1, 3 + (conMod ?? 0));
}

function getChaseCandidateTokens() {
    if (canvas.tokens?.controlled?.length) return canvas.tokens.controlled;
    return canvas.tokens?.placeables ?? [];
}

// A dnd5e "group" actor (system.type.value === "encounter" for a monster group) has no combat
// stats of its own - it's a container of member actors, not a creature. A fleeing group moves at
// its slowest member's pace, so that's the default effective speed if it's chosen as the quarry.
function getGroupEffectiveSpeed(groupActor) {
    const members = (groupActor?.system?.members ?? []).map((m) => m.actor).filter(Boolean);
    const speeds = members.map((a) => a.system?.attributes?.movement?.walk).filter((s) => typeof s === "number" && s > 0);
    return speeds.length ? Math.min(...speeds) : 30;
}

// Convenience for "the quarry was a group actor and just got caught" - scatters each member's
// token around wherever the group's own token ended up, so the GM can drop straight into a normal
// encounter instead of manually placing every member by hand.
async function deployGroupMembersNearToken(groupActor, originTokenDoc) {
    const members = (groupActor?.system?.members ?? []).map((m) => m.actor).filter(Boolean);
    const scene = originTokenDoc?.parent;
    if (!members.length || !scene) return 0;

    const gridSize = scene.grid?.size ?? 100;
    const originX = originTokenDoc.x ?? 0;
    const originY = originTokenDoc.y ?? 0;

    const tokenData = [];
    for (let i = 0; i < members.length; i++) {
        const angle = (i / members.length) * Math.PI * 2;
        const offsetX = Math.round(Math.cos(angle) * gridSize * 1.5);
        const offsetY = Math.round(Math.sin(angle) * gridSize * 1.5);
        const doc = await members[i].getTokenDocument({ x: originX + offsetX, y: originY + offsetY });
        tokenData.push(doc.toObject());
    }

    await scene.createEmbeddedDocuments("Token", tokenData);
    return tokenData.length;
}

async function startChase({ tokenIds, quarryTokenId, tableUuid, quarrySpeedOverride }) {
    const tokens = tokenIds.map((id) => canvas.tokens.get(id)).filter(Boolean);
    if (!tokens.length) {
        ui.notifications.warn("Select at least one token to start a chase.");
        return null;
    }

    // The isChase/complicationTableUuid flags must be present in the CREATE data itself, not set
    // via a follow-up setFlag() - the createCombat hook (which every client uses to decide whether
    // to auto-open its chase window) fires at creation time, before any later update would land.
    const combat = await Combat.create({
        scene: canvas.scene?.id ?? null,
        flags: {
            "cv-wicked-campaigns": {
                isChase: true,
                complicationTableUuid: tableUuid ?? null,
            },
        },
    });

    const combatantData = tokens.map((token) => {
        const actor = token.actor;
        const conMod = actor ? Math.floor(((actor.system?.abilities?.con?.value ?? 10) - 10) / 2) : 0;
        const isQuarry = token.id === quarryTokenId;

        let speed = actor?.system?.attributes?.movement?.walk ?? 30;
        if (isQuarry && actor?.type === "group") {
            speed = Number.isFinite(quarrySpeedOverride) ? quarrySpeedOverride : getGroupEffectiveSpeed(actor);
        }

        return {
            tokenId: token.id,
            sceneId: token.scene?.id,
            actorId: actor?.id,
            flags: {
                "cv-wicked-campaigns": {
                    chaseRole: isQuarry ? "quarry" : "pursuer",
                    speed,
                    conMod,
                    dashesUsed: 0,
                    dashedThisRound: false,
                    gap: isQuarry ? 0 : 30,
                },
            },
        };
    });

    const created = await combat.createEmbeddedDocuments("Combatant", combatantData);
    const quarryCombatant = created.find((c) => c.getFlag("cv-wicked-campaigns", "chaseRole") === "quarry");
    await combat.setFlag("cv-wicked-campaigns", "quarryId", quarryCombatant?.id ?? null);

    await combat.rollAll();
    await combat.startCombat();

    ChaseGMPanel.open(combat);
    return combat;
}

// Rolls the failing save on the GM's own client rather than round-tripping to the owning
// player's client over the socket - simpler for a first pass, at the cost of the GM (not the
// player) seeing/clicking the roll dialog. dnd5e's own addRollExhaustion already folds the
// actor's current exhaustion penalty into the roll, so this stays correct as exhaustion stacks.
async function promptChaseExhaustionSave(combatant, dcBonus) {
    const actor = combatant.actor;
    if (!actor) return;
    const dc = 10 + dcBonus;
    const rolls = await actor.rollSavingThrow({ ability: "con", target: dc }, {}, {});
    const failed = !rolls?.[0]?.isSuccess;
    if (failed) {
        const current = actor.system?.attributes?.exhaustion ?? 0;
        await actor.update({ "system.attributes.exhaustion": current + 1 });
        ui.notifications.warn(`${actor.name} failed their DC ${dc} Constitution save and gained a level of Exhaustion from overexertion.`);
    }
}

// Fired whenever a chase's round advances (see the updateCombat hook below). Movement this round
// is speed x2 for anyone who dashed, x1 otherwise; the gap closes/opens by the difference between
// each pursuer's movement and the quarry's. GM-side only - see promptChaseExhaustionSave's note on
// why saves are rolled on the GM's client.
async function resolveChaseRound(combat) {
    if (!game.user.isGM || !isChaseCombat(combat)) return;

    const quarryId = combat.getFlag("cv-wicked-campaigns", "quarryId");
    const quarry = combat.combatants.get(quarryId);
    if (!quarry) return;

    const quarryFlags = quarry.flags?.["cv-wicked-campaigns"] ?? {};
    const quarryMoved = (quarryFlags.speed ?? 30) * (quarryFlags.dashedThisRound ? 2 : 1);

    const updates = [];
    const summaryLines = [];

    for (const pursuer of combat.combatants) {
        const flags = pursuer.flags?.["cv-wicked-campaigns"] ?? {};
        if (flags.chaseRole !== "pursuer") continue;

        const pursuerMoved = (flags.speed ?? 30) * (flags.dashedThisRound ? 2 : 1);
        const newGap = Math.max(0, (flags.gap ?? 0) - (pursuerMoved - quarryMoved));
        const newDashesUsed = (flags.dashesUsed ?? 0) + (flags.dashedThisRound ? 1 : 0);

        updates.push({
            _id: pursuer.id,
            "flags.cv-wicked-campaigns.gap": newGap,
            "flags.cv-wicked-campaigns.dashesUsed": newDashesUsed,
            "flags.cv-wicked-campaigns.dashedThisRound": false,
        });
        summaryLines.push(`<li>${pursuer.name}: gap ${flags.gap ?? 0} ft &rarr; ${newGap} ft</li>`);

        const threshold = chaseDashThreshold(flags.conMod);
        if (flags.dashedThisRound && newDashesUsed > threshold) {
            await promptChaseExhaustionSave(pursuer, newDashesUsed - threshold);
        }
    }

    const quarryThreshold = chaseDashThreshold(quarryFlags.conMod);
    const quarryNewDashesUsed = (quarryFlags.dashesUsed ?? 0) + (quarryFlags.dashedThisRound ? 1 : 0);
    updates.push({
        _id: quarry.id,
        "flags.cv-wicked-campaigns.dashesUsed": quarryNewDashesUsed,
        "flags.cv-wicked-campaigns.dashedThisRound": false,
    });
    if (quarryFlags.dashedThisRound && quarryNewDashesUsed > quarryThreshold) {
        await promptChaseExhaustionSave(quarry, quarryNewDashesUsed - quarryThreshold);
    }

    if (updates.length) await combat.updateEmbeddedDocuments("Combatant", updates);

    if (summaryLines.length) {
        await ChatMessage.create({
            content: `<div class="dnd5e chat-card wicked-trait-card" style="font-family:'Signika',sans-serif;background:#1c1c1c;border:1px solid rgba(201,160,84,0.25);border-radius:6px;padding:0.75rem 1rem;"><h3 style="font-family:'Cinzel',Georgia,serif;color:#c9a054;margin:0 0 0.5rem 0;font-size:1.1rem;text-transform:uppercase;letter-spacing:0.05em;"><i class="fa-solid fa-person-running"></i> Round ${combat.round} Resolved</h3><ul style="margin:0;padding-left:1.2rem;color:#d5d5d5;font-size:0.85rem;">${summaryLines.join("")}</ul></div>`,
            speaker: { alias: "Chase" },
        });
    }
}

// Clicking "Start" turns the Setup dialog into the GM Panel for the same scene - carrying the
// window's screen position across that handoff reads as a continuation rather than a new window
// popping up somewhere unrelated. Clamped since the GM Panel is a fixed, noticeably taller box
// (see ChaseGMPanel/DramaGMPanel DEFAULT_OPTIONS) than the Setup dialog's own "auto" height, so a
// dialog tucked near a screen edge doesn't drag the panel half off-screen with it.
function clampWindowPosition(top, left, width, height) {
    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxTop = Math.max(0, window.innerHeight - height);
    return { top: Math.min(Math.max(top, 0), maxTop), left: Math.min(Math.max(left, 0), maxLeft) };
}

// Handoff for the position above - set synchronously right before Combat.create() (which fires
// the createCombat hook that actually opens the GM Panel), consumed and cleared by that hook.
let pendingChasePanelPosition = null;
let pendingDramaPanelPosition = null;

class ChaseSetupDialog extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.loadedPresetId = null;
    }

    static DEFAULT_OPTIONS = {
        id: "chase-setup-dialog",
        classes: ["wicked-campaigns", "chase-setup-dialog"],
        window: { title: "Start a Chase", icon: "fa-solid fa-person-running" },
        position: { width: 380, height: "auto" },
        actions: {
            start: ChaseSetupDialog.#onStart,
            loadPreset: ChaseSetupDialog.#onLoadPreset,
            deletePreset: ChaseSetupDialog.#onDeletePreset,
            saveAsPreset: ChaseSetupDialog.#onSaveAsPreset,
        },
    };

    static PARTS = {
        main: { template: "modules/cv-wicked-campaigns/templates/chase-setup.hbs" },
    };

    async _prepareContext(options) {
        const tokens = getChaseCandidateTokens().filter((t) => t.actor);
        const registry = game.settings.get("cv-wicked-campaigns", "chaseComplicationTables") || [];
        const presets = game.settings.get("cv-wicked-campaigns", "chasePresets") || [];
        const preset = presets.find((p) => p.id === this.loadedPresetId) ?? null;

        const presetActorUuids = new Set((preset?.participants ?? []).map((p) => p.actorUuid));
        const quarryActorUuid = preset?.participants.find((p) => p.role === "quarry")?.actorUuid ?? null;
        const unmatchedCount = preset
            ? preset.participants.filter((p) => !tokens.some((t) => t.actor.uuid === p.actorUuid)).length
            : 0;

        return {
            participants: tokens.map((t, i) => {
                const isGroup = t.actor.type === "group";
                return {
                    id: t.id,
                    name: t.actor.name,
                    included: preset ? presetActorUuids.has(t.actor.uuid) : true,
                    isQuarry: preset ? t.actor.uuid === quarryActorUuid : i === 0,
                    isGroup,
                    suggestedSpeed: isGroup ? getGroupEffectiveSpeed(t.actor) : null,
                };
            }),
            tables: registry.map((t) => ({ ...t, isSelected: preset ? t.uuid === preset.tableUuid : false })),
            presets: presets.map((p) => ({ id: p.id, name: p.name, isLoaded: p.id === this.loadedPresetId })),
            hasParticipants: tokens.length > 0,
            hasTables: registry.length > 0,
            hasPresets: presets.length > 0,
            unmatchedCount,
            presetParticipantCount: preset?.participants.length ?? 0,
        };
    }

    _readFormSelections(form) {
        const quarryTokenId = form.querySelector('input[name="quarry"]:checked')?.value ?? null;
        const groupSpeedInput = quarryTokenId ? form.querySelector(`input[name="groupSpeed-${quarryTokenId}"]`) : null;
        const quarrySpeedOverride = groupSpeedInput ? Number(groupSpeedInput.value) : undefined;

        return {
            tokenIds: Array.from(form.querySelectorAll('input[name="include"]:checked')).map((el) => el.value),
            quarryTokenId,
            tableUuid: form.querySelector('select[name="tableUuid"]')?.value || null,
            quarrySpeedOverride: Number.isFinite(quarrySpeedOverride) ? quarrySpeedOverride : undefined,
        };
    }

    static async #onStart(event, target) {
        const { tokenIds, quarryTokenId, tableUuid, quarrySpeedOverride } = this._readFormSelections(target.closest("form"));
        if (!quarryTokenId) {
            ui.notifications.warn("Mark one participant as the quarry.");
            return;
        }

        pendingChasePanelPosition = { top: this.position.top, left: this.position.left };
        const combat = await startChase({ tokenIds, quarryTokenId, tableUuid, quarrySpeedOverride });
        if (combat) this.close();
    }

    // See DramaSetupDialog#rerenderKeepingPosition - same "auto" height, same fix.
    async #rerenderKeepingPosition() {
        const { top, left } = this.position;
        await this.render();
        if (Number.isFinite(top) && Number.isFinite(left)) this.setPosition({ top, left });
    }

    static async #onLoadPreset(event, target) {
        const id = target.closest("form").querySelector('select[name="presetId"]')?.value || null;
        if (!id) return;
        this.loadedPresetId = id;
        await this.#rerenderKeepingPosition();
    }

    static async #onDeletePreset(event, target) {
        const id = target.closest("form").querySelector('select[name="presetId"]')?.value || null;
        if (!id) return;

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: "Delete Preset" },
            content: "<p>Delete this saved chase preset? This cannot be undone.</p>",
            rejectClose: false,
        }).catch(() => false);
        if (!confirmed) return;

        const presets = (game.settings.get("cv-wicked-campaigns", "chasePresets") || []).filter((p) => p.id !== id);
        await game.settings.set("cv-wicked-campaigns", "chasePresets", presets);
        if (this.loadedPresetId === id) this.loadedPresetId = null;
        await this.#rerenderKeepingPosition();
    }

    static async #onSaveAsPreset(event, target) {
        const form = target.closest("form");
        const { tokenIds, quarryTokenId, tableUuid } = this._readFormSelections(form);

        if (!quarryTokenId || !tokenIds.length) {
            ui.notifications.warn("Include at least one participant and mark a quarry before saving a preset.");
            return;
        }

        const name = await foundry.applications.api.DialogV2.prompt({
            window: { title: "Save Chase Preset" },
            content: `<div class="form-group"><label>Preset Name</label><input type="text" name="presetName" value="New Chase Preset" autofocus></div>`,
            ok: {
                icon: "fas fa-check",
                label: "Save",
                callback: (event, button) => button.form.elements.presetName.value.trim(),
            },
            rejectClose: false,
        }).catch(() => null);
        if (!name) return;

        const participants = tokenIds.map((id) => {
            const token = canvas.tokens.get(id);
            return { actorUuid: token.actor.uuid, role: id === quarryTokenId ? "quarry" : "pursuer" };
        });

        const presets = foundry.utils.deepClone(game.settings.get("cv-wicked-campaigns", "chasePresets") || []);
        const preset = { id: foundry.utils.randomID(), name, tableUuid, participants };
        presets.push(preset);
        await game.settings.set("cv-wicked-campaigns", "chasePresets", presets);

        this.loadedPresetId = preset.id;
        ui.notifications.info(`Saved chase preset "${name}".`);
        await this.#rerenderKeepingPosition();
    }
}

class ChaseGMPanel extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(combat, options = {}) {
        super(options);
        this.combat = combat;
        this.order = combat.turns.map((c) => c.id);
    }

    static DEFAULT_OPTIONS = {
        id: "chase-gm-panel",
        classes: ["wicked-campaigns", "chase-gm-panel-dialog"],
        window: { title: "Chase Tracker", icon: "fa-solid fa-person-running", resizable: true },
        // A fixed height (rather than "auto") is what gives the turn list somewhere bounded to
        // scroll within - with "auto" the window just grows past the viewport and clips whatever
        // doesn't fit, with no way to reach it. Matches the fixed-height pattern already used by
        // SessionZeroSheet/LifepathTableConfigApp.
        position: { width: 440, height: 640 },
        actions: {
            nextTurn: ChaseGMPanel.#onNextTurn,
            previousTurn: ChaseGMPanel.#onPreviousTurn,
            toggleDash: ChaseGMPanel.#onToggleDash,
            adjustGap: ChaseGMPanel.#onAdjustGap,
            rollComplication: ChaseGMPanel.#onRollComplication,
            endChase: ChaseGMPanel.#onEndChase,
        },
    };

    static PARTS = {
        main: { template: "modules/cv-wicked-campaigns/templates/chase-gm-panel.hbs", scrollable: [".chase-turn-list"] },
    };

    async _prepareContext(options) {
        this.order = this.order.filter((id) => this.combat.combatants.has(id));
        for (const c of this.combat.turns) if (!this.order.includes(c.id)) this.order.push(c.id);

        const quarryId = this.combat.getFlag("cv-wicked-campaigns", "quarryId");
        const combatants = this.order.map((id) => this.combat.combatants.get(id)).filter(Boolean).map((c) => {
            const flags = c.flags?.["cv-wicked-campaigns"] ?? {};
            const threshold = chaseDashThreshold(flags.conMod);
            return {
                id: c.id,
                name: c.name,
                img: c.img,
                initiative: c.initiative,
                isCurrentTurn: c.id === this.combat.combatant?.id,
                isQuarry: c.id === quarryId,
                gap: flags.gap ?? 0,
                dashesUsed: flags.dashesUsed ?? 0,
                dashThreshold: threshold,
                dashedThisRound: !!flags.dashedThisRound,
                overThreshold: (flags.dashesUsed ?? 0) >= threshold,
                inDanger: c.id !== quarryId && (flags.gap ?? 0) <= 10,
            };
        });

        const tableUuid = this.combat.getFlag("cv-wicked-campaigns", "complicationTableUuid");
        const registry = game.settings.get("cv-wicked-campaigns", "chaseComplicationTables") || [];

        return {
            round: this.combat.round,
            combatants,
            tableLabel: registry.find((t) => t.uuid === tableUuid)?.label ?? "None linked",
        };
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        let dragId = null;
        this.element.querySelectorAll(".chase-turn-list li[data-combatant-id]").forEach((li) => {
            li.addEventListener("dragstart", (event) => {
                dragId = li.dataset.combatantId;
                event.dataTransfer.effectAllowed = "move";
            });
            li.addEventListener("dragover", (event) => event.preventDefault());
            li.addEventListener("drop", async (event) => {
                event.preventDefault();
                const targetId = li.dataset.combatantId;
                if (!dragId || dragId === targetId) return;
                const from = this.order.indexOf(dragId);
                const to = this.order.indexOf(targetId);
                if (from === -1 || to === -1) return;
                this.order.splice(from, 1);
                this.order.splice(to, 0, dragId);
                await this._applyOrder();
            });
        });
    }

    async _applyOrder() {
        const count = this.order.length;
        const updates = this.order.map((id, index) => ({ _id: id, initiative: count - index }));
        await this.combat.updateEmbeddedDocuments("Combatant", updates);
        this.render(true);
    }

    static async #onNextTurn() {
        await this.combat.nextTurn();
    }

    static async #onPreviousTurn() {
        await this.combat.previousTurn();
    }

    static async #onToggleDash(event, target) {
        const id = target.closest("[data-combatant-id]")?.dataset.combatantId;
        const combatant = this.combat.combatants.get(id);
        if (combatant) await combatant.setFlag("cv-wicked-campaigns", "dashedThisRound", target.checked);
    }

    static async #onAdjustGap(event, target) {
        const id = target.closest("[data-combatant-id]")?.dataset.combatantId;
        const combatant = this.combat.combatants.get(id);
        if (!combatant) return;
        const delta = Number(target.dataset.delta) || 0;
        const current = combatant.getFlag("cv-wicked-campaigns", "gap") ?? 0;
        await combatant.setFlag("cv-wicked-campaigns", "gap", Math.max(0, current + delta));
    }

    static async #onRollComplication() {
        const uuid = this.combat.getFlag("cv-wicked-campaigns", "complicationTableUuid");
        const table = uuid ? await fromUuid(uuid).catch(() => null) : null;
        if (!table) {
            ui.notifications.warn("No complication table linked to this chase.");
            return;
        }
        const draw = await table.draw();
        const description = draw?.results?.[0]?.description ?? "";
        await this.combat.setFlag("cv-wicked-campaigns", "lastComplicationText", description);
    }

    static async #onEndChase() {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: "End Chase" },
            content: "<p>End this chase? This deletes the chase's Combat encounter.</p>",
            rejectClose: false,
        }).catch(() => false);
        if (!confirmed) return;

        const quarryId = this.combat.getFlag("cv-wicked-campaigns", "quarryId");
        const quarryCombatant = this.combat.combatants.get(quarryId);
        const quarryActor = quarryCombatant?.actor;

        if (quarryActor?.type === "group") {
            const deploy = await foundry.applications.api.DialogV2.confirm({
                window: { title: "Deploy Group Members" },
                content: "<p>The quarry was a group actor. Place its member tokens on the scene to continue straight into an encounter?</p>",
                rejectClose: false,
            }).catch(() => false);
            if (deploy) {
                const count = await deployGroupMembersNearToken(quarryActor, quarryCombatant.token);
                if (count) ui.notifications.info(`Deployed ${count} member token${count === 1 ? "" : "s"} from "${quarryActor.name}".`);
            }
        }

        await this.combat.delete();
    }

    static open(combat, position = null) {
        const existing = foundry.applications.instances.get("chase-gm-panel");
        if (existing) {
            existing.combat = combat;
            existing.order = combat.turns.map((c) => c.id);
            existing.render(true);
            return existing;
        }
        const { width, height } = ChaseGMPanel.DEFAULT_OPTIONS.position;
        const hasPosition = Number.isFinite(position?.top) && Number.isFinite(position?.left);
        const options = hasPosition ? { position: clampWindowPosition(position.top, position.left, width, height) } : {};
        const app = new ChaseGMPanel(combat, options);
        app.render(true);
        return app;
    }

    static closeIfOpen() {
        foundry.applications.instances.get("chase-gm-panel")?.close();
    }
}

class ChasePlayerHUD extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(combat, options = {}) {
        super(options);
        this.combat = combat;
    }

    static DEFAULT_OPTIONS = {
        id: "chase-player-hud",
        classes: ["wicked-campaigns", "chase-player-hud-dialog"],
        window: { title: "Chase!", icon: "fa-solid fa-person-running", resizable: true },
        position: { width: 300, height: 420 },
        actions: {
            rollInitiative: ChasePlayerHUD.#onRollInitiative,
        },
    };

    static PARTS = {
        main: { template: "modules/cv-wicked-campaigns/templates/chase-player-hud.hbs", scrollable: [".chase-hud-turn-list"] },
    };

    async _prepareContext(options) {
        const ownCombatant = this.combat.combatants.find((c) => c.actor?.isOwner);
        const flags = ownCombatant?.flags?.["cv-wicked-campaigns"] ?? {};
        const threshold = chaseDashThreshold(flags.conMod);

        // The stored complication text carries the DMG-style [[/save ...]] / &Reference[...]
        // markup - enrich it the same way chat messages do, so it renders as clickable
        // roll/reference buttons instead of raw text.
        const rawComplication = this.combat.getFlag("cv-wicked-campaigns", "lastComplicationText") || null;
        const lastComplication = rawComplication
            ? await foundry.applications.ux.TextEditor.enrichHTML(rawComplication, { async: true })
            : null;

        return {
            round: this.combat.round,
            turns: this.combat.turns.map((c) => {
                const cFlags = c.flags?.["cv-wicked-campaigns"] ?? {};
                const isOwn = c.actor?.isOwner;
                return {
                    id: c.id,
                    name: (isOwn || game.user.isGM) ? c.name : (cFlags.chaseRole === "quarry" ? "The Quarry" : "Pursuer"),
                    isCurrentTurn: c.id === this.combat.combatant?.id,
                };
            }),
            hasOwnCombatant: !!ownCombatant,
            needsInitiative: !!ownCombatant && (ownCombatant.initiative === null || ownCombatant.initiative === undefined),
            gap: flags.gap ?? null,
            isQuarry: flags.chaseRole === "quarry",
            dashesUsed: flags.dashesUsed ?? 0,
            dashThreshold: threshold,
            lastComplication,
        };
    }

    static async #onRollInitiative() {
        const ownCombatant = this.combat.combatants.find((c) => c.actor?.isOwner);
        if (ownCombatant) await this.combat.rollInitiative([ownCombatant.id]);
    }

    static open(combat) {
        const existing = foundry.applications.instances.get("chase-player-hud");
        if (existing) {
            existing.combat = combat;
            existing.render(true);
            return existing;
        }
        const app = new ChasePlayerHUD(combat);
        app.render(true);
        return app;
    }

    static closeIfOpen() {
        foundry.applications.instances.get("chase-player-hud")?.close();
    }
}

function refreshOpenChaseApps(combat) {
    const gmPanel = foundry.applications.instances.get("chase-gm-panel");
    if (gmPanel?.combat?.id === combat.id) gmPanel.render();
    const playerHud = foundry.applications.instances.get("chase-player-hud");
    if (playerHud?.combat?.id === combat.id) playerHud.render();
}

Hooks.on("createCombat", (combat) => {
    if (!game.settings.get("cv-wicked-campaigns", "chaseTrackerEnabled") || !isChaseCombat(combat)) return;
    // GM-only here: combatants (and therefore ownership) don't exist yet at this point, since
    // they're added via a separate createEmbeddedDocuments call after Combat.create() resolves -
    // see the createCombatant hook below for the player side of auto-open.
    if (game.user.isGM) ChaseGMPanel.open(combat, pendingChasePanelPosition);
    pendingChasePanelPosition = null;
});

Hooks.on("createCombatant", (combatant) => {
    const combat = combatant.parent;
    if (!game.settings.get("cv-wicked-campaigns", "chaseTrackerEnabled") || !isChaseCombat(combat)) return;
    if (!game.user.isGM && combatant.actor?.isOwner) ChasePlayerHUD.open(combat);
    refreshOpenChaseApps(combat);
});

Hooks.on("updateCombat", (combat, changes) => {
    if (!isChaseCombat(combat)) return;
    if ("round" in changes) resolveChaseRound(combat);
    refreshOpenChaseApps(combat);
});

Hooks.on("updateCombatant", (combatant) => {
    if (!isChaseCombat(combatant.parent)) return;
    refreshOpenChaseApps(combatant.parent);
});

Hooks.on("deleteCombat", (combat) => {
    if (!isChaseCombat(combat)) return;
    ChaseGMPanel.closeIfOpen();
    ChasePlayerHUD.closeIfOpen();
});

// ---- Drama Tracker: core logic -----------------------------------
// Emulates a scene where the party can approach several NPCs in any order (e.g. a masquerade
// ball), using the existing Motive Drivers system (the NPC sheet's Motives tab) as the underlying
// resolution math: discovery checks reveal a motive per the tiers in the rules doc, social checks
// apply that motive's DC modifier (or go in blind), and each NPC tracks their own 3-success/
// 3-failure progress independently. Reuses Chase Tracker's architecture (Combat/Combatant for PC
// turn order, the three-tier Setup/GM Panel/Player HUD app pattern, named actor-UUID-referenced
// presets) but NPCs are a GM-managed roster rather than Combatants - there's no NPC "turn," since
// a PC's turn just means they act, against whichever NPC they approached that round.
//
// The roster is stored as an OBJECT keyed by actor id (flags.cv-wicked-campaigns.npcs.<actorId>),
// not an array - unlike Chase's array-based combatant data (which is fine, since combatants are
// mutated via their own embedded-document update API, not raw flag writes), a plain object lets
// success/failure adjustments use a single scoped flag path (Foundry deep-merges into objects but
// replaces arrays wholesale) without needing the read-modify-write queue the widgets required.

function isDramaCombat(combat) {
  return combat?.getFlag("cv-wicked-campaigns", "isDrama") === true;
}

function getDramaCandidateTokens() {
  if (canvas.tokens?.controlled?.length) return canvas.tokens.controlled;
  return canvas.tokens?.placeables ?? [];
}

// token.actor.uuid resolves to a scene/token-scoped compound UUID (Scene.X.Token.Y.Actor.Z) for
// any unlinked-actor token (the default for most NPCs) - only a linked token happens to give back
// the clean base Actor UUID. Presets need the latter (so they resolve on any future scene, after
// the original token's long gone) - TokenDocument#baseActor is the reliable way to get it
// regardless of link state.
function getBaseActorUuid(token) {
  return token?.document?.baseActor?.uuid ?? token?.actor?.uuid ?? null;
}

// Same fame-override / reveal-state computation already used by the NPC sheet's Motives tab and
// the token-bar trackability logic - kept as a local duplicate here rather than a new shared
// helper, matching how the codebase already repeats this exact computation in those two places.
function getMotiveVisibility(data) {
  const value = Math.max(-20, Math.min(20, Number(data?.value) || 0));
  const absVal = Math.abs(value);
  const isFameOrInfamy = absVal >= 15;
  const revealed = data?.revealed || "hidden";
  const isFullyRevealed = revealed === "public" || isFameOrInfamy;
  const visibleToPlayers = revealed === "public" || revealed === "partial" || isFameOrInfamy;
  return { value, absVal, isFameOrInfamy, revealed, isFullyRevealed, visibleToPlayers };
}

function cycleMotiveRevealTier(current) {
  if (current === "hidden") return "partial";
  if (current === "partial") return "public";
  return "hidden";
}

async function startDrama({ pcTokenIds, npcActorUuids, name, description }) {
  const pcTokens = pcTokenIds.map((id) => canvas.tokens.get(id)).filter((t) => t?.actor);
  if (!pcTokens.length) {
    ui.notifications.warn("Select at least one PC to start a drama scene.");
    return null;
  }
  if (!npcActorUuids.length) {
    ui.notifications.warn("Include at least one NPC in the scene.");
    return null;
  }

  const npcs = {};
  for (const actorUuid of npcActorUuids) {
    const actor = await fromUuid(actorUuid).catch(() => null);
    if (!actor) continue;
    npcs[actor.id] = { actorUuid, successes: 0, failures: 0 };
  }

  // isDrama/sceneName/description/npcs must be present in the CREATE data itself, not set via a
  // follow-up setFlag() - the createCombat hook (which every client uses to decide whether to
  // auto-open its window, and now also to show the opening banner) fires at creation time, before
  // any later update would land. Same requirement as startChase above.
  const combat = await Combat.create({
    scene: canvas.scene?.id ?? null,
    flags: {
      "cv-wicked-campaigns": {
        isDrama: true,
        sceneName: name || "Drama Scene",
        description: description || "",
        npcs,
      },
    },
  });

  const combatantData = pcTokens.map((token) => ({
    tokenId: token.id,
    sceneId: token.scene?.id,
    actorId: token.actor?.id,
  }));
  await combat.createEmbeddedDocuments("Combatant", combatantData);

  await combat.rollAll();
  await combat.startCombat();

  DramaGMPanel.open(combat);
  return combat;
}

// Full-viewport "curtain rises" announcement shown to every connected client (GM and all players,
// not just scene participants - it's for the whole table) when a Drama Scene starts. Uses the
// same gradient recipe as the character sheet's own header banner
// (brightenHexForBanner(wickedBannerGradientColor()), see handleActorSheetRender below) so it
// reads as part of the same visual system, just faded to a darker shade of that color instead of
// to fully transparent - the sheet's version is a decorative wash behind portrait art, this one
// has to stay legible with text over it. Fades out on its own after ~4 seconds.
function showDramaSceneBanner(sceneName, description) {
  const baseColor = brightenHexForBanner(wickedBannerGradientColor());
  const banner = document.createElement("div");
  banner.className = "drama-scene-banner";
  banner.style.setProperty("--drama-banner-color", baseColor);
  banner.innerHTML = `
    <i class="fa-solid fa-masks-theater"></i>
    <div class="drama-scene-banner-text">
      <div class="drama-scene-banner-title">${foundry.utils.escapeHTML(sceneName)}</div>
      ${description ? `<div class="drama-scene-banner-desc">${foundry.utils.escapeHTML(description)}</div>` : ""}
    </div>
  `;
  document.body.appendChild(banner);
  banner.addEventListener("animationend", () => banner.remove());
}

// A plain, non-interactive log message announcing the request - not dnd5e's own roll-request
// chat card. That system's roll button turned out to be a bare 30x30 icon buried in a chat
// card's status column (confirmed in live testing: it works, but is very easy to miss mid-scene).
// The actual roll now happens via a clearly-labeled button in the target PC's own Player HUD (see
// DramaPlayerHUD's pendingCheck handling) - this message is just a heads-up for the chat log.
async function postDramaCheckPrompt(actor, skill, dc, rollMode, purposeHtml) {
  const skillLabel = CONFIG.DND5E.skills[skill]?.label ?? skill;
  const modeLabel = rollMode === "advantage" ? " (Advantage)" : rollMode === "disadvantage" ? " (Disadvantage)" : "";
  await ChatMessage.create({
    content: `<div class="dnd5e chat-card wicked-trait-card" style="font-family:'Signika',sans-serif;"><p style="margin:0;">${purposeHtml}: <strong>${actor.name}</strong>, roll <strong>${skillLabel}</strong>${modeLabel} (DC ${dc}) from your Drama Tracker HUD.</p></div>`,
    speaker: { alias: "Drama Tracker" },
  });
}

// Option B for Rule 3 (Social Interaction) in the Motive Drivers rules doc: straight DC
// subtraction let a single extreme motive value swing a check to trivial or impossible. Strong
// motives (|value| >= 10) now grant Advantage (Attraction) or impose Disadvantage (Aversion)
// instead of moving the DC at all; weaker motives (1-9) only nudge the standard DC 12 baseline by
// +/-2. Never swings a check further than a small, bounded amount either direction.
function suggestDramaCheckDC(motiveValue) {
  const absValue = Math.abs(motiveValue);
  if (absValue >= 10) {
    return { dc: 12, rollMode: motiveValue > 0 ? "advantage" : "disadvantage" };
  }
  return { dc: motiveValue > 0 ? 10 : motiveValue < 0 ? 14 : 12, rollMode: "normal" };
}

class DramaSetupDialog extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.loadedPresetId = null;
    }

    static DEFAULT_OPTIONS = {
        id: "drama-setup-dialog",
        classes: ["wicked-campaigns", "drama-setup-dialog"],
        window: { title: "Start a Drama Scene", icon: "fa-solid fa-masks-theater" },
        position: { width: 380, height: "auto" },
        actions: {
            start: DramaSetupDialog.#onStart,
            loadPreset: DramaSetupDialog.#onLoadPreset,
            deletePreset: DramaSetupDialog.#onDeletePreset,
            saveAsPreset: DramaSetupDialog.#onSaveAsPreset,
        },
    };

    static PARTS = {
        main: { template: "modules/cv-wicked-campaigns/templates/drama-setup.hbs" },
    };

    // A token's actor already says whether it's a PC ("character") or an NPC ("npc") - no need to
    // ask the GM to classify each one by hand. Tokens of any other actor type (group, vehicle,
    // ...) are simply not shown; they don't make sense as drama participants either way.
    async _prepareContext(options) {
        const tokens = getDramaCandidateTokens().filter((t) => t.actor);
        const presets = game.settings.get("cv-wicked-campaigns", "dramaPresets") || [];
        const preset = presets.find((p) => p.id === this.loadedPresetId) ?? null;

        const pcUuids = new Set((preset?.participants ?? []).filter((p) => p.role === "pc").map((p) => p.actorUuid));
        const npcUuids = new Set((preset?.participants ?? []).filter((p) => p.role === "npc").map((p) => p.actorUuid));

        const pcTokens = tokens.filter((t) => t.actor.type === "character");
        const npcTokens = tokens.filter((t) => t.actor.type === "npc");

        const unmatchedCount = preset
            ? preset.participants.filter((p) => !tokens.some((t) => getBaseActorUuid(t) === p.actorUuid)).length
            : 0;

        return {
            sceneName: preset?.name ?? "",
            description: "",
            pcs: pcTokens.map((t) => ({ id: t.id, name: t.actor.name, included: preset ? pcUuids.has(getBaseActorUuid(t)) : true })),
            npcs: npcTokens.map((t) => ({ id: t.id, name: t.actor.name, included: preset ? npcUuids.has(getBaseActorUuid(t)) : true })),
            presets: presets.map((p) => ({ id: p.id, name: p.name, isLoaded: p.id === this.loadedPresetId })),
            hasPcs: pcTokens.length > 0,
            hasNpcs: npcTokens.length > 0,
            hasParticipants: pcTokens.length > 0 || npcTokens.length > 0,
            hasPresets: presets.length > 0,
            unmatchedCount,
            presetParticipantCount: preset?.participants.length ?? 0,
        };
    }

    _readFormSelections(form) {
        const name = form.querySelector('input[name="sceneName"]')?.value.trim() || "";
        const description = form.querySelector('input[name="description"]')?.value.trim() || "";
        const pcTokenIds = Array.from(form.querySelectorAll('input[name="pc"]:checked')).map((el) => el.value);
        const npcTokenIds = Array.from(form.querySelectorAll('input[name="npc"]:checked')).map((el) => el.value);
        return { name, description, pcTokenIds, npcTokenIds };
    }

    static async #onStart(event, target) {
        const { name, description, pcTokenIds, npcTokenIds } = this._readFormSelections(target.closest("form"));
        const npcActorUuids = npcTokenIds.map((id) => getBaseActorUuid(canvas.tokens.get(id))).filter(Boolean);

        pendingDramaPanelPosition = { top: this.position.top, left: this.position.left };
        const combat = await startDrama({ pcTokenIds, npcActorUuids, name, description });
        if (combat) this.close();
    }

    // The dialog's "auto" height means Foundry recomputes its centered position on every render
    // whenever the content's height changes (e.g. loading a preset adds/removes rows) - which
    // reads as the window jumping back to center even after the GM has dragged it elsewhere.
    // Capturing/reapplying top+left across the render sidesteps that regardless of what's
    // actually triggering the recompute.
    async #rerenderKeepingPosition() {
        const { top, left } = this.position;
        await this.render();
        if (Number.isFinite(top) && Number.isFinite(left)) this.setPosition({ top, left });
    }

    static async #onLoadPreset(event, target) {
        const id = target.closest("form").querySelector('select[name="presetId"]')?.value || null;
        if (!id) return;
        this.loadedPresetId = id;
        await this.#rerenderKeepingPosition();
    }

    static async #onDeletePreset(event, target) {
        const id = target.closest("form").querySelector('select[name="presetId"]')?.value || null;
        if (!id) return;

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: "Delete Preset" },
            content: "<p>Delete this saved drama preset? This cannot be undone.</p>",
            rejectClose: false,
        }).catch(() => false);
        if (!confirmed) return;

        const presets = (game.settings.get("cv-wicked-campaigns", "dramaPresets") || []).filter((p) => p.id !== id);
        await game.settings.set("cv-wicked-campaigns", "dramaPresets", presets);
        if (this.loadedPresetId === id) this.loadedPresetId = null;
        await this.#rerenderKeepingPosition();
    }

    static async #onSaveAsPreset(event, target) {
        const form = target.closest("form");
        const { pcTokenIds, npcTokenIds } = this._readFormSelections(form);

        if (!pcTokenIds.length || !npcTokenIds.length) {
            ui.notifications.warn("Include at least one PC and one NPC before saving a preset.");
            return;
        }

        const name = await foundry.applications.api.DialogV2.prompt({
            window: { title: "Save Drama Preset" },
            content: `<div class="form-group"><label>Preset Name</label><input type="text" name="presetName" value="New Drama Scene" autofocus></div>`,
            ok: {
                icon: "fas fa-check",
                label: "Save",
                callback: (event, button) => button.form.elements.presetName.value.trim(),
            },
            rejectClose: false,
        }).catch(() => null);
        if (!name) return;

        const participants = [
            ...pcTokenIds.map((id) => ({ actorUuid: getBaseActorUuid(canvas.tokens.get(id)), role: "pc" })),
            ...npcTokenIds.map((id) => ({ actorUuid: getBaseActorUuid(canvas.tokens.get(id)), role: "npc" })),
        ];

        const presets = foundry.utils.deepClone(game.settings.get("cv-wicked-campaigns", "dramaPresets") || []);
        const preset = { id: foundry.utils.randomID(), name, participants };
        presets.push(preset);
        await game.settings.set("cv-wicked-campaigns", "dramaPresets", presets);

        this.loadedPresetId = preset.id;
        ui.notifications.info(`Saved drama preset "${name}".`);
        await this.#rerenderKeepingPosition();
    }
}

class DramaGMPanel extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(combat, options = {}) {
        super(options);
        this.combat = combat;
    }

    static DEFAULT_OPTIONS = {
        id: "drama-gm-panel",
        classes: ["wicked-campaigns", "drama-gm-panel-dialog"],
        window: { title: "Drama Tracker", icon: "fa-solid fa-masks-theater", resizable: true },
        position: { width: 480, height: 680 },
        actions: {
            nextTurn: DramaGMPanel.#onNextTurn,
            previousTurn: DramaGMPanel.#onPreviousTurn,
            setTurn: DramaGMPanel.#onSetTurn,
            addNpc: DramaGMPanel.#onAddNpc,
            removeNpc: DramaGMPanel.#onRemoveNpc,
            adjustSuccess: DramaGMPanel.#onAdjustSuccess,
            adjustFailure: DramaGMPanel.#onAdjustFailure,
            toggleMotiveReveal: DramaGMPanel.#onToggleMotiveReveal,
            openNpcRevealDialog: DramaGMPanel.#onOpenNpcRevealDialog,
            openGeneralCheckDialog: DramaGMPanel.#onOpenGeneralCheckDialog,
            openMotiveCheckDialog: DramaGMPanel.#onOpenMotiveCheckDialog,
            endConflict: DramaGMPanel.#onEndConflict,
        },
    };

    static PARTS = {
        main: { template: "modules/cv-wicked-campaigns/templates/drama-gm-panel.hbs", scrollable: [".drama-npc-roster"] },
    };

    async _prepareContext(options) {
        const npcsFlag = this.combat.getFlag("cv-wicked-campaigns", "npcs") || {};
        const npcs = [];
        for (const [actorId, entry] of Object.entries(npcsFlag)) {
            const actor = game.actors.get(actorId) ?? await fromUuid(entry.actorUuid).catch(() => null);
            if (!actor) continue;

            const rawMotives = actor.getFlag("cv-wicked-campaigns", "motives") || {};
            const motives = Object.entries(rawMotives).map(([id, data]) => {
                const vis = getMotiveVisibility(data);
                return {
                    id,
                    label: data.label || "Motive",
                    value: vis.value,
                    revealed: vis.revealed,
                    isFameOrInfamy: vis.isFameOrInfamy,
                    // Famous/infamous motives are always public regardless of the stored reveal
                    // state (see getMotiveVisibility) - toggling them would have no visible effect,
                    // so only non-fame motives get an interactive toggle badge.
                    canToggle: !vis.isFameOrInfamy,
                    canTarget: vis.visibleToPlayers,
                };
            });

            const successes = Math.max(0, Math.min(3, entry.successes ?? 0));
            const failures = Math.max(0, Math.min(3, entry.failures ?? 0));

            npcs.push({
                actorId,
                name: actor.name,
                img: actor.img,
                successes,
                failures,
                successPips: [0, 1, 2].map((i) => i < successes),
                failurePips: [0, 1, 2].map((i) => i < failures),
                isWon: successes >= 3,
                isLost: failures >= 3,
                motives,
            });
        }
        npcs.sort((a, b) => a.name.localeCompare(b.name));

        const combatants = this.combat.turns.map((c) => ({
            id: c.id,
            name: c.name,
            img: c.img,
            isCurrentTurn: c.id === this.combat.combatant?.id,
        }));

        // Scoped to NPC actors with a token on the current scene - not every NPC actor in the
        // world (the bestiary alone would bury "who's actually at the ball" under every monster
        // stat block in the game). Deliberately ALL scene placeables regardless of what's
        // currently selected (unlike the setup dialog's token scoping) - the GM could easily have
        // an unrelated token selected while reaching for this dropdown, and that shouldn't hide
        // the NPC they're trying to add.
        const addableActors = (canvas.tokens?.placeables ?? [])
            .filter((t) => t.actor?.type === "npc" && !npcsFlag[t.actor.id])
            .map((t) => ({ id: t.actor.id, name: t.actor.name }))
            .filter((a, index, arr) => arr.findIndex((x) => x.id === a.id) === index)
            .sort((a, b) => a.name.localeCompare(b.name));

        return {
            sceneName: this.combat.getFlag("cv-wicked-campaigns", "sceneName") || "Drama Scene",
            round: this.combat.round,
            combatants,
            hasCombatants: combatants.length > 0,
            npcs,
            hasNpcs: npcs.length > 0,
            addableActors,
            hasAddableActors: addableActors.length > 0,
        };
    }

    static async #onNextTurn() {
        await this.combat.nextTurn();
    }

    static async #onPreviousTurn() {
        await this.combat.previousTurn();
    }

    // Lets the GM jump straight to any PC's turn by clicking their chip in the turn tracker,
    // rather than only stepping one at a time via next/previous - useful since who acts next in
    // a mingling scene isn't a strict marching order the way it is in a fight.
    static async #onSetTurn(event, target) {
        const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId;
        const index = this.combat.turns.findIndex((c) => c.id === combatantId);
        if (index === -1) return;
        await this.combat.update({ turn: index });
    }

    static async #onAddNpc(event, target) {
        const select = target.closest("form")?.querySelector('[data-role="add-npc-select"]')
            ?? this.element.querySelector('[data-role="add-npc-select"]');
        const actorId = select?.value;
        if (!actorId) return;
        const actor = game.actors.get(actorId);
        if (!actor) return;

        await this.combat.setFlag("cv-wicked-campaigns", `npcs.${actorId}`, {
            actorUuid: actor.uuid,
            successes: 0,
            failures: 0,
        });
    }

    static async #onRemoveNpc(event, target) {
        const actorId = target.closest("[data-npc-id]")?.dataset.npcId;
        if (!actorId) return;
        await this.combat.unsetFlag("cv-wicked-campaigns", `npcs.${actorId}`);
    }

    static async #onAdjustSuccess(event, target) {
        const actorId = target.closest("[data-npc-id]")?.dataset.npcId;
        const delta = Number(target.dataset.delta) || 0;
        const current = this.combat.getFlag("cv-wicked-campaigns", `npcs.${actorId}.successes`) ?? 0;
        const next = Math.max(0, Math.min(3, current + delta));
        await this.combat.setFlag("cv-wicked-campaigns", `npcs.${actorId}.successes`, next);
    }

    static async #onAdjustFailure(event, target) {
        const actorId = target.closest("[data-npc-id]")?.dataset.npcId;
        const delta = Number(target.dataset.delta) || 0;
        const current = this.combat.getFlag("cv-wicked-campaigns", `npcs.${actorId}.failures`) ?? 0;
        const next = Math.max(0, Math.min(3, current + delta));
        await this.combat.setFlag("cv-wicked-campaigns", `npcs.${actorId}.failures`, next);
    }

    // The reveal-state badge does exactly one thing now: cycle hidden -> partial -> public ->
    // hidden. No dialog, no chat message, no tie to any check result - the GM decides when to
    // flip it, independently of however they resolved a check narratively or via the roll-request
    // dialog below.
    static async #onToggleMotiveReveal(event, target) {
        const actorId = target.closest("[data-npc-id]")?.dataset.npcId;
        const motiveId = target.dataset.motiveId;
        const actor = game.actors.get(actorId);
        const motives = actor?.getFlag("cv-wicked-campaigns", "motives") || {};
        const data = motives[motiveId];
        if (!actor || !data) return;

        const nextTier = cycleMotiveRevealTier(data.revealed || "hidden");
        await actor.setFlag("cv-wicked-campaigns", `motives.${motiveId}.revealed`, nextTier);
    }

    // One reveal-check dialog per NPC card, not per motive: the GM picks any skill, sets a DC
    // (with Easy/Average/Hard quick-set buttons that just populate the field, not lock it), and a
    // roll mode, then stores the request as a pendingCheck flag on whichever PC currently has the
    // turn. That PC's own Player HUD picks it up and shows a "Roll <skill>" button (see
    // DramaPlayerHUD), which is what actually triggers the interactive roll on their client - not
    // a chat card button. The request isn't tied to any specific motive; after seeing the result,
    // the GM manually decides which motive(s) to reveal via the per-motive toggle badge.
    static async #onOpenNpcRevealDialog(event, target) {
        const actorId = target.closest("[data-npc-id]")?.dataset.npcId;
        const actor = game.actors.get(actorId);
        if (!actor) return;

        const currentPCActor = this.combat.combatant?.actor ?? null;
        const noPcWarning = currentPCActor
            ? ""
            : `<p style="color: #e08a75; font-size: 0.85rem; margin: 0 0 0.5rem;">No PC currently has the turn - advance to a PC's turn before sending a check.</p>`;

        const skillOptions = Object.entries(CONFIG.DND5E.skills)
            .map(([key, cfg]) => `<option value="${key}" ${key === "ins" ? "selected" : ""}>${cfg.label}</option>`)
            .join("");

        const choice = await foundry.applications.api.DialogV2.wait({
            window: { title: `Reveal Check: ${actor.name}` },
            classes: ["wicked-campaigns"],
            position: { width: 460 },
            content: `
                ${noPcWarning}
                <div class="form-group">
                    <label>Skill</label>
                    <select name="skill" style="width: 100%; font-size: 0.85rem; padding: 4px 6px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;">${skillOptions}</select>
                </div>
                <div class="form-group">
                    <label>DC</label>
                    <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                        <input type="number" name="dc" value="15" min="1" max="30" style="flex: 1; min-width: 64px; font-size: 1rem; padding: 6px 8px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; text-align: center;">
                        <button type="button" data-dc="10" class="drama-dc-quick" style="flex-shrink: 0; padding: 4px 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(201,160,84,0.2); border-radius: 4px; color: #c9a054; cursor: pointer;">Easy</button>
                        <button type="button" data-dc="15" class="drama-dc-quick" style="flex-shrink: 0; padding: 4px 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(201,160,84,0.2); border-radius: 4px; color: #c9a054; cursor: pointer;">Average</button>
                        <button type="button" data-dc="20" class="drama-dc-quick" style="flex-shrink: 0; padding: 4px 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(201,160,84,0.2); border-radius: 4px; color: #c9a054; cursor: pointer;">Hard</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Roll Mode</label>
                    <select name="rollMode" style="width: 100%; font-size: 0.85rem; padding: 4px 6px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;">
                        <option value="normal">Normal</option>
                        <option value="advantage">Advantage</option>
                        <option value="disadvantage">Disadvantage</option>
                    </select>
                </div>
            `,
            buttons: [
                {
                    action: "send",
                    label: "Send Check",
                    icon: "fa-solid fa-dice-d20",
                    callback: (evt, button) => ({ skill: button.form.elements.skill.value, dc: Number(button.form.elements.dc.value), rollMode: button.form.elements.rollMode.value }),
                },
            ],
            render: (event, dialog) => {
                dialog.element.querySelectorAll(".drama-dc-quick").forEach((btn) => {
                    btn.addEventListener("click", () => {
                        dialog.element.querySelector('input[name="dc"]').value = btn.dataset.dc;
                    });
                });
            },
            rejectClose: false,
        }).catch(() => null);

        if (!choice) return;

        const currentPCCombatant = this.combat.combatant ?? null;
        if (!currentPCCombatant?.actor) {
            ui.notifications.warn("No PC currently has the turn - advance to a PC's turn before sending a check.");
            return;
        }

        await currentPCCombatant.setFlag("cv-wicked-campaigns", "pendingCheck", {
            skill: choice.skill,
            dc: choice.dc,
            rollMode: choice.rollMode,
            npcName: actor.name,
        });
        await postDramaCheckPrompt(currentPCCombatant.actor, choice.skill, choice.dc, choice.rollMode, `Find out what motivates <strong>${actor.name}</strong>`);
    }

    // A plain skill check against the NPC, not tied to discovering or leveraging any specific
    // motive - e.g. a flat Perception or Insight roll, or a Persuasion attempt that isn't playing
    // to anything in particular. Same dialog shape as Reveal Check, just neutrally framed.
    static async #onOpenGeneralCheckDialog(event, target) {
        const actorId = target.closest("[data-npc-id]")?.dataset.npcId;
        const actor = game.actors.get(actorId);
        if (!actor) return;

        const currentPCActor = this.combat.combatant?.actor ?? null;
        const noPcWarning = currentPCActor
            ? ""
            : `<p style="color: #e08a75; font-size: 0.85rem; margin: 0 0 0.5rem;">No PC currently has the turn - advance to a PC's turn before sending a check.</p>`;

        const skillOptions = Object.entries(CONFIG.DND5E.skills)
            .map(([key, cfg]) => `<option value="${key}" ${key === "per" ? "selected" : ""}>${cfg.label}</option>`)
            .join("");

        const choice = await foundry.applications.api.DialogV2.wait({
            window: { title: `General Check: ${actor.name}` },
            classes: ["wicked-campaigns"],
            position: { width: 460 },
            content: `
                ${noPcWarning}
                <div class="form-group">
                    <label>Skill</label>
                    <select name="skill" style="width: 100%; font-size: 0.85rem; padding: 4px 6px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;">${skillOptions}</select>
                </div>
                <div class="form-group">
                    <label>DC</label>
                    <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                        <input type="number" name="dc" value="12" min="1" max="30" style="flex: 1; min-width: 64px; font-size: 1rem; padding: 6px 8px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; text-align: center;">
                        <button type="button" data-dc="10" class="drama-dc-quick" style="flex-shrink: 0; padding: 4px 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(201,160,84,0.2); border-radius: 4px; color: #c9a054; cursor: pointer;">Easy</button>
                        <button type="button" data-dc="15" class="drama-dc-quick" style="flex-shrink: 0; padding: 4px 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(201,160,84,0.2); border-radius: 4px; color: #c9a054; cursor: pointer;">Average</button>
                        <button type="button" data-dc="20" class="drama-dc-quick" style="flex-shrink: 0; padding: 4px 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(201,160,84,0.2); border-radius: 4px; color: #c9a054; cursor: pointer;">Hard</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Roll Mode</label>
                    <select name="rollMode" style="width: 100%; font-size: 0.85rem; padding: 4px 6px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;">
                        <option value="normal">Normal</option>
                        <option value="advantage">Advantage</option>
                        <option value="disadvantage">Disadvantage</option>
                    </select>
                </div>
            `,
            buttons: [
                {
                    action: "send",
                    label: "Send Check",
                    icon: "fa-solid fa-dice-d20",
                    callback: (evt, button) => ({ skill: button.form.elements.skill.value, dc: Number(button.form.elements.dc.value), rollMode: button.form.elements.rollMode.value }),
                },
            ],
            render: (event, dialog) => {
                dialog.element.querySelectorAll(".drama-dc-quick").forEach((btn) => {
                    btn.addEventListener("click", () => {
                        dialog.element.querySelector('input[name="dc"]').value = btn.dataset.dc;
                    });
                });
            },
            rejectClose: false,
        }).catch(() => null);

        if (!choice) return;

        const currentPCCombatant = this.combat.combatant ?? null;
        if (!currentPCCombatant?.actor) {
            ui.notifications.warn("No PC currently has the turn - advance to a PC's turn before sending a check.");
            return;
        }

        await currentPCCombatant.setFlag("cv-wicked-campaigns", "pendingCheck", {
            skill: choice.skill,
            dc: choice.dc,
            rollMode: choice.rollMode,
            npcName: actor.name,
        });
        await postDramaCheckPrompt(currentPCCombatant.actor, choice.skill, choice.dc, choice.rollMode, `Roll against <strong>${actor.name}</strong>`);
    }

    // Per-motive "leverage this in conversation" check - distinct from the NPC-level Reveal Check
    // dialog above (which is about *discovering* a motive, not exploiting a known one) and from
    // the NPC sheet's own standalone Temptation Save roll (a GM-only roll for the NPC's
    // autonomous behavior, already available from the sheet directly - no need to duplicate it
    // here). Pre-fills a suggested DC/roll mode from the motive's strength (see
    // suggestDramaCheckDC, matching the redesigned Rule 3), but both stay fully editable, and the
    // GM still picks the skill each time - Persuasion, Deception, and Intimidation fit differently
    // depending on how the player is actually working the NPC.
    static async #onOpenMotiveCheckDialog(event, target) {
        const actorId = target.closest("[data-npc-id]")?.dataset.npcId;
        const motiveId = target.dataset.motiveId;
        const actor = game.actors.get(actorId);
        const motives = actor?.getFlag("cv-wicked-campaigns", "motives") || {};
        const data = motives[motiveId];
        if (!actor || !data) return;

        const currentPCCombatant = this.combat.combatant ?? null;
        const noPcWarning = currentPCCombatant?.actor
            ? ""
            : `<p style="color: #e08a75; font-size: 0.85rem; margin: 0 0 0.5rem;">No PC currently has the turn - advance to a PC's turn before sending a check.</p>`;

        const motiveLabel = data.label || "Motive";
        const motiveValue = Number(data.value) || 0;
        const suggestion = suggestDramaCheckDC(motiveValue);
        const modeNote = suggestion.rollMode !== "normal" ? `, ${suggestion.rollMode}` : "";

        const skillOptions = Object.entries(CONFIG.DND5E.skills)
            .map(([key, cfg]) => `<option value="${key}" ${key === "per" ? "selected" : ""}>${cfg.label}</option>`)
            .join("");

        const choice = await foundry.applications.api.DialogV2.wait({
            window: { title: `Persuade: ${motiveLabel}` },
            classes: ["wicked-campaigns"],
            position: { width: 460 },
            content: `
                ${noPcWarning}
                <div class="form-group">
                    <label>Skill</label>
                    <select name="skill" style="width: 100%; font-size: 0.85rem; padding: 4px 6px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;">${skillOptions}</select>
                </div>
                <div class="form-group">
                    <label>DC</label>
                    <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                        <input type="number" name="dc" value="${suggestion.dc}" min="1" max="30" style="flex: 1; min-width: 64px; font-size: 1rem; padding: 6px 8px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; text-align: center;">
                        <button type="button" data-dc="10" class="drama-dc-quick" style="flex-shrink: 0; padding: 4px 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(201,160,84,0.2); border-radius: 4px; color: #c9a054; cursor: pointer;">Easy</button>
                        <button type="button" data-dc="15" class="drama-dc-quick" style="flex-shrink: 0; padding: 4px 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(201,160,84,0.2); border-radius: 4px; color: #c9a054; cursor: pointer;">Average</button>
                        <button type="button" data-dc="20" class="drama-dc-quick" style="flex-shrink: 0; padding: 4px 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(201,160,84,0.2); border-radius: 4px; color: #c9a054; cursor: pointer;">Hard</button>
                    </div>
                    <p style="font-size: 0.7rem; color: #a89a82; margin: 4px 0 0;">Suggested from ${motiveLabel} (${motiveValue}): DC ${suggestion.dc}${modeNote}.</p>
                </div>
                <div class="form-group">
                    <label>Roll Mode</label>
                    <select name="rollMode" style="width: 100%; font-size: 0.85rem; padding: 4px 6px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;">
                        <option value="normal" ${suggestion.rollMode === "normal" ? "selected" : ""}>Normal</option>
                        <option value="advantage" ${suggestion.rollMode === "advantage" ? "selected" : ""}>Advantage</option>
                        <option value="disadvantage" ${suggestion.rollMode === "disadvantage" ? "selected" : ""}>Disadvantage</option>
                    </select>
                </div>
            `,
            buttons: [
                {
                    action: "send",
                    label: "Send Check",
                    icon: "fa-solid fa-dice-d20",
                    callback: (evt, button) => ({ skill: button.form.elements.skill.value, dc: Number(button.form.elements.dc.value), rollMode: button.form.elements.rollMode.value }),
                },
            ],
            render: (event, dialog) => {
                dialog.element.querySelectorAll(".drama-dc-quick").forEach((btn) => {
                    btn.addEventListener("click", () => {
                        dialog.element.querySelector('input[name="dc"]').value = btn.dataset.dc;
                    });
                });
            },
            rejectClose: false,
        }).catch(() => null);

        if (!choice) return;

        if (!currentPCCombatant?.actor) {
            ui.notifications.warn("No PC currently has the turn - advance to a PC's turn before sending a check.");
            return;
        }

        await currentPCCombatant.setFlag("cv-wicked-campaigns", "pendingCheck", {
            skill: choice.skill,
            dc: choice.dc,
            rollMode: choice.rollMode,
            npcName: actor.name,
        });
        await postDramaCheckPrompt(currentPCCombatant.actor, choice.skill, choice.dc, choice.rollMode, `Leverage <strong>${actor.name}</strong>'s <strong>${motiveLabel}</strong>`);
    }

    static async #onEndConflict() {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: "End Drama Scene" },
            content: "<p>End this drama scene? This deletes the scene's Combat encounter. NPC motives and their reveal states are unaffected.</p>",
            rejectClose: false,
        }).catch(() => false);
        if (!confirmed) return;
        await this.combat.delete();
    }

    static open(combat, position = null) {
        const existing = foundry.applications.instances.get("drama-gm-panel");
        if (existing) {
            existing.combat = combat;
            existing.render(true);
            return existing;
        }
        const { width, height } = DramaGMPanel.DEFAULT_OPTIONS.position;
        const hasPosition = Number.isFinite(position?.top) && Number.isFinite(position?.left);
        const options = hasPosition ? { position: clampWindowPosition(position.top, position.left, width, height) } : {};
        const app = new DramaGMPanel(combat, options);
        app.render(true);
        return app;
    }

    static closeIfOpen() {
        foundry.applications.instances.get("drama-gm-panel")?.close();
    }
}

class DramaPlayerHUD extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(combat, options = {}) {
        super(options);
        this.combat = combat;
    }

    static DEFAULT_OPTIONS = {
        id: "drama-player-hud",
        classes: ["wicked-campaigns", "drama-player-hud-dialog"],
        window: { title: "Drama!", icon: "fa-solid fa-masks-theater", resizable: true },
        position: { width: 320, height: 460 },
        actions: {
            rollInitiative: DramaPlayerHUD.#onRollInitiative,
            rollPendingCheck: DramaPlayerHUD.#onRollPendingCheck,
        },
    };

    static PARTS = {
        main: { template: "modules/cv-wicked-campaigns/templates/drama-player-hud.hbs", scrollable: [".drama-hud-npc-list"] },
    };

    async _prepareContext(options) {
        const ownCombatant = this.combat.combatants.find((c) => c.actor?.isOwner);
        const npcsFlag = this.combat.getFlag("cv-wicked-campaigns", "npcs") || {};

        const npcs = [];
        for (const [actorId, entry] of Object.entries(npcsFlag)) {
            const actor = game.actors.get(actorId);
            if (!actor) continue;

            const rawMotives = actor.getFlag("cv-wicked-campaigns", "motives") || {};
            const motives = Object.entries(rawMotives)
                .map(([id, data]) => ({ id, ...getMotiveVisibility(data), label: data.label || "Motive" }))
                .filter((m) => m.visibleToPlayers);

            const successes = Math.max(0, Math.min(3, entry.successes ?? 0));
            const failures = Math.max(0, Math.min(3, entry.failures ?? 0));

            npcs.push({
                name: actor.name,
                img: actor.img,
                successPips: [0, 1, 2].map((i) => i < successes),
                failurePips: [0, 1, 2].map((i) => i < failures),
                motives: motives.map((m) => ({
                    label: m.label,
                    isFullyRevealed: m.isFullyRevealed,
                    value: m.value,
                })),
            });
        }
        npcs.sort((a, b) => a.name.localeCompare(b.name));

        const rawPendingCheck = ownCombatant?.getFlag("cv-wicked-campaigns", "pendingCheck") ?? null;
        const pendingCheck = rawPendingCheck
            ? {
                skillLabel: CONFIG.DND5E.skills[rawPendingCheck.skill]?.label ?? rawPendingCheck.skill,
                dc: rawPendingCheck.dc,
                modeLabel: rawPendingCheck.rollMode === "advantage" ? "Advantage" : rawPendingCheck.rollMode === "disadvantage" ? "Disadvantage" : "Normal",
            }
            : null;

        return {
            sceneName: this.combat.getFlag("cv-wicked-campaigns", "sceneName") || "Drama Scene",
            round: this.combat.round,
            turns: this.combat.turns.map((c) => ({
                id: c.id,
                name: c.name,
                isCurrentTurn: c.id === this.combat.combatant?.id,
            })),
            hasOwnCombatant: !!ownCombatant,
            needsInitiative: !!ownCombatant && (ownCombatant.initiative === null || ownCombatant.initiative === undefined),
            pendingCheck,
            hasPendingCheck: !!pendingCheck,
            npcs,
            hasNpcs: npcs.length > 0,
        };
    }

    static async #onRollInitiative() {
        const ownCombatant = this.combat.combatants.find((c) => c.actor?.isOwner);
        if (ownCombatant) await this.combat.rollInitiative([ownCombatant.id]);
    }

    // Triggers the actual interactive roll directly (same underlying Actor5e#rollSkill API dnd5e's
    // own request-card button uses under the hood) rather than routing through a chat card - see
    // the comment on postDramaCheckPrompt for why. Only clears the pendingCheck flag once a roll
    // actually happened, so cancelling the roll dialog leaves the button in place to try again.
    static async #onRollPendingCheck() {
        const ownCombatant = this.combat.combatants.find((c) => c.actor?.isOwner);
        const pending = ownCombatant?.getFlag("cv-wicked-campaigns", "pendingCheck");
        const actor = ownCombatant?.actor;
        if (!actor || !pending) return;

        const [roll] = (await actor.rollSkill({
            skill: pending.skill,
            target: pending.dc,
            advantage: pending.rollMode === "advantage",
            disadvantage: pending.rollMode === "disadvantage",
        })) ?? [];

        if (roll) await ownCombatant.unsetFlag("cv-wicked-campaigns", "pendingCheck");
    }

    static open(combat) {
        const existing = foundry.applications.instances.get("drama-player-hud");
        if (existing) {
            existing.combat = combat;
            existing.render(true);
            return existing;
        }
        const app = new DramaPlayerHUD(combat);
        app.render(true);
        return app;
    }

    static closeIfOpen() {
        foundry.applications.instances.get("drama-player-hud")?.close();
    }
}

function refreshOpenDramaApps(combat) {
    const gmPanel = foundry.applications.instances.get("drama-gm-panel");
    if (gmPanel?.combat?.id === combat.id) gmPanel.render();
    const playerHud = foundry.applications.instances.get("drama-player-hud");
    if (playerHud?.combat?.id === combat.id) playerHud.render();
}

Hooks.on("createCombat", (combat) => {
    if (!game.settings.get("cv-wicked-campaigns", "dramaEnabled") || !isDramaCombat(combat)) return;
    if (game.user.isGM) DramaGMPanel.open(combat, pendingDramaPanelPosition);
    pendingDramaPanelPosition = null;

    // For the whole table, not just scene participants - combatants don't even exist yet at this
    // point (added via a separate createEmbeddedDocuments call after Combat.create() resolves), so
    // there's no "does this player have a PC in the scene" check to make even if we wanted one.
    showDramaSceneBanner(
        combat.getFlag("cv-wicked-campaigns", "sceneName") || "Drama Scene",
        combat.getFlag("cv-wicked-campaigns", "description") || "",
    );
});

Hooks.on("createCombatant", (combatant) => {
    const combat = combatant.parent;
    if (!game.settings.get("cv-wicked-campaigns", "dramaEnabled") || !isDramaCombat(combat)) return;
    if (!game.user.isGM && combatant.actor?.isOwner) DramaPlayerHUD.open(combat);
    refreshOpenDramaApps(combat);
});

Hooks.on("updateCombat", (combat) => {
    if (!isDramaCombat(combat)) return;
    refreshOpenDramaApps(combat);
});

Hooks.on("updateCombatant", (combatant) => {
    if (!isDramaCombat(combatant.parent)) return;
    refreshOpenDramaApps(combatant.parent);
});

Hooks.on("deleteCombat", (combat) => {
    if (!isDramaCombat(combat)) return;
    DramaGMPanel.closeIfOpen();
    DramaPlayerHUD.closeIfOpen();
});

// Also refresh open Drama Tracker apps whenever an NPC's motives change (revealed state,
// value, label) - e.g. the GM edits a motive directly on the NPC sheet mid-scene rather than
// through the discovery-check buttons - so the GM panel/player HUD never show stale data.
Hooks.on("updateActor", (actor, changes) => {
    if (!game.settings.get("cv-wicked-campaigns", "dramaEnabled")) return;
    if (!foundry.utils.hasProperty(changes, "flags.cv-wicked-campaigns.motives")) return;
    const activeConflict = game.combats.find(isDramaCombat);
    if (activeConflict && activeConflict.getFlag("cv-wicked-campaigns", "npcs")?.[actor.id]) {
        refreshOpenDramaApps(activeConflict);
    }
});

// Neither dnd5e's own body.dnd5e-theme-light/-dark class NOR the underlying "dnd5e.theme"/core
// uiConfig settings are reliable signals here: the class can get stuck showing dark after a fresh
// page load even though the setting correctly reads "light" (reproduced live - a dnd5e timing
// quirk, worse when Foundry's own core theme differs from dnd5e's), and in that exact broken state
// dnd5e's OWN rendered background stays genuinely dark too, not just its class attribute. Trusting
// the setting in that case would make us apply light-mode TEXT colors on top of a background that
// never actually went light - dark text on a dark backdrop, worse than doing nothing. Measuring
// the sheet's actual computed background color instead is self-correcting by construction: if it
// reads as light right now, applying our light-mode colors right now is always correct, regardless
// of what any class or setting claims.
function sheetBackgroundIsLight(el) {
    const bg = getComputedStyle(el).backgroundColor;
    const m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;
    const [r, g, b] = m.slice(1).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 128;
}

// dnd5e paints its stock skull/demon banner via a single custom property,
// --dnd5e-character-background-image, consumed by a `.window-content::before` overlay (see
// dnd5e.css: `.dnd5e2.sheet.actor.character:not(.minimized) .window-content::before { background:
// var(--dnd5e-character-background-image) no-repeat top center / cover; ... }`, inside `@layer
// system`). Un-layered author CSS always wins over layered CSS regardless of specificity, and
// `background`/`background-image` happily accept a gradient() as their <image>, so redeclaring
// this one variable on our sheet root is enough to replace the image outright - no selector
// fighting, no !important. Color matches Campaign Codex's sidebar color when its own custom
// theming is active, so the two modules read as one coordinated skin; falls back to our own
// brand color otherwise.
function wickedBannerGradientColor() {
    if (isCampaignCodexActive() && game.settings.get(CC_MODULE_ID, "themeEnabled")) {
        return game.settings.get(CC_MODULE_ID, "color-sidebarBg") || "#130b1d";
    }
    return "#130b1d";
}

// Sidebar/brand colors here tend to be very dark (near-black) by design, which is exactly why
// mixing toward white doesn't read as "more purple" - it just pulls every channel toward 255
// roughly equally, shrinking the gap between them and washing the hue out to grey/pastel. HSL is
// the only space where "brighter but still clearly that color" is expressible: raise L (and back
// off S slightly less than that) while leaving H untouched, so the hue stays intact and only the
// lightness/vibrancy goes up.
function brightenHexForBanner(hex, targetLightness = 0.2, minSaturation = 0.5) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const num = parseInt(m[1], 16);
    const r = ((num >> 16) & 0xff) / 255, g = ((num >> 8) & 0xff) / 255, b = (num & 0xff) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    let h = 0;
    if (delta !== 0) {
        if (max === r) h = 60 * (((g - b) / delta) % 6);
        else if (max === g) h = 60 * ((b - r) / delta + 2);
        else h = 60 * ((r - g) / delta + 4);
        if (h < 0) h += 360;
    }
    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    const finalS = Math.max(s, minSaturation);
    const finalL = Math.max(l, targetLightness);

    const c = (1 - Math.abs(2 * finalL - 1)) * finalS;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const mAdj = finalL - c / 2;
    let [r2, g2, b2] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
        : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    const toHex = (v) => Math.round((v + mAdj) * 255).toString(16).padStart(2, "0");
    return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

function handleActorSheetRender(sheet, html, data) {
    console.log("Wicked Campaigns | handleActorSheetRender fired", { sheet, html, data });

    const el = html instanceof HTMLElement ? html : html[0];
    if (!el) return;

    // Applied directly to the sheet root based on its actual rendered background (see
    // sheetBackgroundIsLight) rather than any dnd5e class or setting, both of which can be stale
    // or self-contradictory right after a page load.
    sheet.element?.classList.toggle("wicked-theme-light", sheetBackgroundIsLight(sheet.element));

    // Only our own character sheet template gets the gradient swap - vanilla dnd5e actor sheets
    // (NPCs, other systems' actors reusing this hook) keep the stock banner untouched.
    if (sheet.element?.classList.contains("wicked-character-sheet")) {
        sheet.element.style.setProperty(
            "--dnd5e-character-background-image",
            `linear-gradient(180deg, ${brightenHexForBanner(wickedBannerGradientColor())}, transparent)`
        );
    }

    const isSheetEditable = !!(data?.editable ?? sheet.isEditable);
    console.log("Wicked Campaigns | handleActorSheetRender | isSheetEditable:", isSheetEditable, "editable:", data?.editable);

    // Creating NPCs is GM-only. These buttons are baked into the stored backstory HTML by
    // whoever last ran the wizard (often the player), so they can't be conditionally omitted at
    // save time - strip them from the DOM here instead, based on who's actually viewing right now.
    if (!game.user.isGM) {
        el.querySelectorAll(".wicked-iname-thee-btn").forEach((btn) => btn.remove());
    }

    // Find all sliders currently in the DOM
    const sliders = el.querySelectorAll(".wicked-trait-slider");
    console.log(`Wicked Campaigns | Found ${sliders.length} sliders in DOM.`);
    
    sliders.forEach(slider => {
        // Sync disabled status
        slider.disabled = !isSheetEditable;
        
        // Skip if we already bound listeners to this specific slider element instance
        if (slider.dataset.listenersBound) return;
        slider.dataset.listenersBound = "true";
        
        console.log(`Wicked Campaigns | Binding listeners directly to slider ${slider.dataset.pairIndex}`);
        
        // Bind change listener directly to slider to stop propagation before it reaches the form
        slider.addEventListener("change", async (event) => {
            event.stopPropagation();
            
            if (!isSheetEditable) {
                slider.disabled = true;
                return;
            }
            
            const index = slider.dataset.pairIndex;
            const val = parseInt(slider.value, 10);
            const savedPairs = sheet.actor.getFlag("cv-wicked-campaigns", "traitPairs") || {};
            savedPairs[index] = val;
            await sheet.actor.setFlag("cv-wicked-campaigns", "traitPairs", savedPairs);
            console.log(`Wicked Campaigns | Flag updated directly: traitPairs[${index}] = ${val}`);
        });
        
        // Bind input listener directly to slider to stop propagation before it reaches the form
        slider.addEventListener("input", (event) => {
            event.stopPropagation();
            
            if (!isSheetEditable) {
                slider.disabled = true;
                return;
            }
            
            const index = slider.dataset.pairIndex;
            const val = parseInt(slider.value, 10);
            const leftValEl = el.querySelector(`.wicked-left-value[data-pair-index="${index}"]`);
            const rightValEl = el.querySelector(`.wicked-right-value[data-pair-index="${index}"]`);
            const leftButton = el.querySelector(`.roll-trait-btn[data-pair-index="${index}"][data-side="left"]`);
            const rightButton = el.querySelector(`.roll-trait-btn[data-pair-index="${index}"][data-side="right"]`);
            
            if (leftValEl) leftValEl.textContent = val;
            if (rightValEl) rightValEl.textContent = 20 - val;
            if (leftButton) leftButton.dataset.value = val;
            if (rightButton) rightButton.dataset.value = 20 - val;
        });
    });

    // NPC Motive Drivers logic
    const motivesList = el.querySelector(".motives-list");
    if (motivesList) {
        console.log("Wicked Campaigns | Motives tab rendering detected. isSheetEditable:", isSheetEditable);

        // Toggle preset custom field visibility
        const presetSelector = el.querySelector("#motive-preset-selector");
        const customInput = el.querySelector("#motive-custom-input");
        if (presetSelector && customInput) {
            presetSelector.addEventListener("change", (event) => {
                if (presetSelector.value === "custom") {
                    customInput.style.display = "inline-block";
                } else {
                    customInput.style.display = "none";
                }
            });
        }

        // Helper to update range slider accent color and row left border color
        const updateSliderColor = (slider, val) => {
            let color;
            if (val > 0) {
                const intensity = val / 20;
                color = `hsl(${45 + (120 - 45) * intensity}, ${55 + 25 * intensity}%, ${40 + 5 * intensity}%)`;
            } else if (val < 0) {
                const intensity = Math.abs(val) / 20;
                color = `hsl(${35 - 35 * intensity}, ${65 + 25 * intensity}%, ${40 + 5 * intensity}%)`;
            } else {
                color = "hsl(0, 0%, 50%)";
            }
            slider.style.accentColor = color;
            
            // Update row's left border color dynamically
            const row = slider.closest(".motive-row");
            if (row) {
                row.style.setProperty("border-left-color", color, "important");
            }
        };

        const sliders = el.querySelectorAll(".motive-slider-input");
        console.log(`Wicked Campaigns | Found ${sliders.length} motive sliders.`);

        // Bind custom range sliders
        sliders.forEach(slider => {
            const key = slider.dataset.key;
            const numInput = el.querySelector(`.motive-value-input[data-key="${key}"]`);
            console.log(`Wicked Campaigns | Binding motive slider ${key}. Found numInput:`, !!numInput);
            
            // Sync disabled status
            slider.disabled = !isSheetEditable;
            if (numInput) numInput.disabled = !isSheetEditable;

            // Set initial color
            updateSliderColor(slider, parseInt(slider.value, 10));

            slider.addEventListener("input", (event) => {
                event.stopPropagation();
                if (!isSheetEditable) return;
                const val = parseInt(slider.value, 10);
                console.log(`Wicked Campaigns | Motive slider ${key} input: ${val}`);
                if (numInput) numInput.value = val;
                updateSliderColor(slider, val);
            });

            slider.addEventListener("change", async (event) => {
                event.stopPropagation();
                if (!isSheetEditable) return;
                const val = parseInt(slider.value, 10);
                console.log(`Wicked Campaigns | Saving motive ${key} value directly to flag: ${val}`);
                await sheet.actor.setFlag("cv-wicked-campaigns", `motives.${key}.value`, val);
            });
        });

        // Bind number input fields
        el.querySelectorAll(".motive-value-input").forEach(numInput => {
            const key = numInput.dataset.key;
            const slider = el.querySelector(`.motive-slider-input[data-key="${key}"]`);
            
            numInput.disabled = !isSheetEditable;

            numInput.addEventListener("change", async (event) => {
                event.stopPropagation();
                if (!isSheetEditable) return;
                let val = parseInt(numInput.value, 10) || 0;
                val = Math.max(-20, Math.min(20, val));
                numInput.value = val;
                if (slider) {
                    slider.value = val;
                    updateSliderColor(slider, val);
                }
                console.log(`Wicked Campaigns | Saving motive ${key} value from number input: ${val}`);
                await sheet.actor.setFlag("cv-wicked-campaigns", `motives.${key}.value`, val);
            });
        });

        // Bind motive label input fields
        el.querySelectorAll(".motive-label-input").forEach(input => {
            input.disabled = !isSheetEditable;

            input.addEventListener("change", async (event) => {
                event.stopPropagation();
                if (!isSheetEditable) return;
                const key = input.dataset.key;
                const val = input.value.trim();

                const motives = sheet.actor.getFlag("cv-wicked-campaigns", "motives") || {};
                
                // Check if any other motive has the same name
                const isDuplicate = Object.entries(motives).some(([k, data]) => {
                    return k !== key && data.label?.toLowerCase() === val.toLowerCase();
                });

                if (isDuplicate) {
                    ui.notifications.warn(`Wicked Campaigns | A motive named '${val}' already exists on this NPC.`);
                    input.value = motives[key]?.label || "";
                    return;
                }

                if (val) {
                    console.log(`Wicked Campaigns | Saving motive ${key} label: ${val}`);
                    await sheet.actor.setFlag("cv-wicked-campaigns", `motives.${key}.label`, val);
                }
            });
        });

        // Bind revealed state select fields
        el.querySelectorAll(".motive-revealed-input").forEach(select => {
            select.disabled = !isSheetEditable;

            select.addEventListener("change", async (event) => {
                event.stopPropagation();
                if (!isSheetEditable) return;
                const key = select.dataset.key;
                const val = select.value;
                console.log(`Wicked Campaigns | Saving motive ${key} revealed state: ${val}`);
                await sheet.actor.setFlag("cv-wicked-campaigns", `motives.${key}.revealed`, val);
            });
        });
    }
}

Hooks.on("renderActorSheet", handleActorSheetRender);
Hooks.on("renderCharacterActorSheet", handleActorSheetRender);
Hooks.on("renderBaseActorSheet", handleActorSheetRender);

Hooks.on("updateJournalEntry", (journal, change, options, userId) => {
    // Apps bound to the party state document itself (none currently exist)
    // would auto-refresh via Foundry's document.apps tracking; this handles
    // apps that read fate pool / peril state without being bound to it.
    if (journal.getFlag("cv-wicked-campaigns", PARTY_STATE_FLAG) === true) {
        // Character sheets and the Fate Pool Manager always show the *active*
        // party's state, so only refresh them if that's the one that changed -
        // a change to some other (inactive) party's state shouldn't touch them.
        const activeRoster = findActivePartyRosterSync();
        const isActiveState = activeRoster && findPartyStateForRoster(activeRoster)?.uuid === journal.uuid;
        if (isActiveState) refreshFatePoolConsumers();

        // A Party sheet shows its own party's state regardless of which party
        // is active, so refresh any open one whose paired state just changed.
        for (const app of foundry.applications.instances.values()) {
            if (app instanceof PartySheet && findPartyStateForRoster(app.document)?.uuid === journal.uuid) {
                app.render(true);
            }
        }
    }

    // The Reassign Turn Order panel stays open for the life of a Session Zero game and shows
    // live tier-tracker counts derived from the summary's entries - refresh it whenever its
    // linked summary changes (e.g. a new answer was just recorded).
    const reassignApp = foundry.applications.instances.get("turn-order-reassign");
    if (reassignApp?.summary?.uuid === journal.uuid) {
        reassignApp.render();
    }
});

// Fired by iName Thee (cv-iname-thee) after a GM commits a candidate that was seeded via
// openWithSeed(). `context` is whatever we handed it in the "send-to-iname-thee" action above -
// iName Thee never inspects it, just echoes it back - so this only reacts to seeds this module
// created (context.backstoryUuid/role present); any other module's use of iName Thee is ignored.
Hooks.on("cvINameTheeSeedCommitted", async ({ context, doc, mode }) => {
    if (!context?.backstoryUuid || !context?.role || !doc) return;
    const backstory = await fromUuid(context.backstoryUuid).catch(() => null);
    if (!backstory) return;

    const links = foundry.utils.deepClone(backstory.getFlag("cv-wicked-campaigns", "relatedActorLinks") || {});
    links[context.role] = doc.uuid;
    await backstory.setFlag("cv-wicked-campaigns", "relatedActorLinks", links);

    // Plain confirmation, not a claim of integration - this flag is only ever read by our own
    // "create vs. update" check above the next time this button is clicked for this role; the
    // new actor isn't wired into Campaign Codex or the PC's sheet in any other way.
    const linkedNpcUuid = backstory.getFlag("cv-wicked-campaigns", "linkedNpcUuid");
    const npcJournal = linkedNpcUuid ? await fromUuid(linkedNpcUuid).catch(() => null) : null;
    const actorUuid = npcJournal?.getFlag(CC_MODULE_ID, "data")?.linkedActor;
    const pcActor = actorUuid ? await fromUuid(actorUuid).catch(() => null) : null;

    const roleLabel = context.role.replace(/-\d+$/, "");
    const verb = mode === "update" ? "updated" : "created";
    ui.notifications.info(`${doc.name} ${verb} for ${pcActor?.name ?? "the player character"}'s ${roleLabel}.`);
});

function getFatePoolSync() {
    return findPartyStateForRoster(findActivePartyRosterSync())?.getFlag("cv-wicked-campaigns", "fatePool") ?? 0;
}

function getInPerilSync() {
    return findPartyStateForRoster(findActivePartyRosterSync())?.getFlag("cv-wicked-campaigns", "inPeril") ?? false;
}

function partyNameForState(state) {
    const rosterUuid = state?.getFlag("cv-wicked-campaigns", "partyUuid");
    return rosterUuid ? fromUuidSync(rosterUuid)?.name : null;
}

async function setInPerilForState(journal, value, userName = game.user.name) {
    if (!journal) return;
    const partyName = partyNameForState(journal);

    const isPeril = !!value;
    await journal.setFlag("cv-wicked-campaigns", "inPeril", isPeril);

    const icon = isPeril ? "fa-skull-crossbones" : "fa-dove";
    const headline = isPeril ? "The Party is In Peril!" : "The Party is Safe";
    const flavorText = isPeril
        ? "The stakes are high and death is on the line!"
        : "For now, fortune favors you. The road ahead is steady.";
    const badgeColor = isPeril ? "#f0c2c2" : "#c9a054";
    const badgeBg = isPeril ? "rgba(190, 70, 70, 0.18)" : "rgba(201, 160, 84, 0.15)";
    const badgeBorder = isPeril ? "rgba(190, 70, 70, 0.35)" : "rgba(201, 160, 84, 0.3)";

    const content = `
        <div class="dnd5e chat-card wicked-trait-card" style="font-family: 'Signika', sans-serif; background: #1c1c1c; border: 1px solid rgba(201, 160, 84, 0.25); border-radius: 6px; padding: 0.75rem 1rem;">
            <div class="card-content" style="padding: 0.5rem 0; text-align: center;">
                <h3 style="font-family: 'Cinzel', Georgia, serif; color: ${badgeColor}; margin: 0 0 0.5rem 0; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                    <i class="fa-solid ${icon}"></i> ${headline}
                </h3>
                <p style="margin: 0.25rem 0 0.75rem 0; font-size: 0.9rem; color: #d5d5d5;">
                    ${flavorText}
                </p>
                <div style="display: inline-block; padding: 3px 14px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                    ${isPeril ? "In Peril" : "Safe"}
                </div>
                <p style="margin: 0.75rem 0 0 0; font-size: 0.8rem; color: var(--color-text-dark-secondary, #888);">
                    <strong>Updated By:</strong> ${userName}
                </p>
            </div>
        </div>
    `;

    await ChatMessage.create({
        content: content,
        speaker: { alias: partyName ? `${partyName} - Standing` : "The Party's Standing" }
    });
}

async function setInPeril(value, userName = game.user.name) {
    return setInPerilForState(await getOrCreateActivePartyState(), value, userName);
}

async function updateFatePoolForState(journal, delta, reason = "Manual Update", userName = game.user.name) {
    if (!journal) return 0;
    const partyName = partyNameForState(journal);

    const current = journal.getFlag("cv-wicked-campaigns", "fatePool") ?? 0;
    const newTotal = current + delta;
    await journal.setFlag("cv-wicked-campaigns", "fatePool", newTotal);
    
    // Create the chat message log
    const changeText = delta >= 0 ? `+${delta}` : `${delta}`;
    const badgeClass = delta >= 0 ? "success" : "failure";
    const content = `
        <div class="dnd5e chat-card wicked-trait-card" style="font-family: 'Signika', sans-serif; background: #1c1c1c; border: 1px solid rgba(201, 160, 84, 0.25); border-radius: 6px; padding: 0.75rem 1rem;">
            <div class="card-content" style="padding: 0.5rem 0; text-align: center;">
                <h3 style="font-family: 'Cinzel', Georgia, serif; color: #c9a054; margin: 0 0 0.5rem 0; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                    <i class="fa-solid fa-clock-rotate-left"></i> Fate Pool Updated
                </h3>
                <div class="wicked-trait-roll-box" style="margin: 0.5rem 0;">
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <i class="fa-solid fa-yin-yang" style="font-size: 1.35rem; color: #c9a054;"></i>
                        <span class="roll-value" style="font-size: 1.5rem;">${newTotal}</span>
                    </div>
                    <div class="wicked-trait-divider"></div>
                    <div class="wicked-trait-result ${badgeClass}">
                        ${changeText}
                    </div>
                </div>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: var(--color-text-dark-secondary, #888);">
                    <strong>Reason:</strong> ${reason}<br>
                    <strong>Updated By:</strong> ${userName}
                </p>
            </div>
        </div>
    `;
    
    await ChatMessage.create({
        content: content,
        speaker: { alias: partyName ? `${partyName} - Fate Pool` : "Fate Pool" }
    });

    return newTotal;
}

async function updateFatePool(delta, reason = "Manual Update", userName = game.user.name) {
    return updateFatePoolForState(await getOrCreateActivePartyState(), delta, reason, userName);
}

class FatePoolManager extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "fate-pool-manager",
    classes: ["wicked-campaigns", "fate-pool-manager-dialog"],
    window: {
      title: "Fate Pool Manager",
      icon: "fa-solid fa-yin-yang"
    },
    position: {
      width: 320,
      height: "auto"
    }
  };

  static PARTS = {
    form: {
      template: "modules/cv-wicked-campaigns/templates/fate-pool-manager.hbs"
    }
  };

  // See LifepathWizard/DramaSetupDialog - "auto" height recenters the window on every render as
  // the fate total changes, fighting the GM having dragged it.
  async render(...args) {
    const { top, left } = this.position;
    const result = await super.render(...args);
    if (Number.isFinite(top) && Number.isFinite(left)) this.setPosition({ top, left });
    return result;
  }

  async _prepareContext(options) {
    const activeRoster = findActivePartyRosterSync();
    const parties = getAllPartyRosters()
      .map((roster) => ({ uuid: roster.uuid, name: roster.name, active: roster.uuid === activeRoster?.uuid }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return {
      fatePool: getFatePoolSync(),
      inPeril: getInPerilSync(),
      parties,
    };
  }

  _onRender(context, options) {
    const html = this.element;

    html.querySelector(".active-party-select")?.addEventListener("change", async (event) => {
      await setActivePartyRoster(event.target.value);
    });

    html.querySelector(".new-party")?.addEventListener("click", async () => {
      const name = await foundry.applications.api.DialogV2.prompt({
        window: { title: "Create New Party" },
        content: `<div class="form-group"><label>Party Name</label><input type="text" name="partyName" value="New Party" autofocus></div>`,
        ok: {
          icon: "fas fa-check",
          label: "Create",
          callback: (event, button) => button.form.elements.partyName.value.trim(),
        },
        rejectClose: false,
      }).catch(() => null);
      if (!name) return;
      const roster = await createPartyPair(name);
      await setActivePartyRoster(roster.uuid);
    });

    html.querySelector(".in-peril-toggle")?.addEventListener("change", async (event) => {
      await setInPeril(event.target.checked);
      this.render(true);
    });

    html.querySelector(".add-fate")?.addEventListener("click", async () => {
      const reason = html.querySelector(".fate-reason-input")?.value || "GM Action";
      await updateFatePool(1, reason);
      this.render(true);
    });

    html.querySelector(".sub-fate")?.addEventListener("click", async () => {
      const reason = html.querySelector(".fate-reason-input")?.value || "GM Action";
      await updateFatePool(-1, reason);
      this.render(true);
    });

    html.querySelector(".save-fate")?.addEventListener("click", async () => {
      const input = html.querySelector(".fate-value-input");
      const newValue = parseInt(input?.value, 10);
      if (isNaN(newValue)) return;
      
      const current = getFatePoolSync();
      const delta = newValue - current;
      if (delta === 0) {
        this.close();
        return;
      }
      
      const reason = html.querySelector(".fate-reason-input")?.value || "GM Set Total";
      await updateFatePool(delta, reason);
      this.close();
    });

    html.querySelector(".sync-permissions")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const count = await syncAllCampaignCodexOwnership();
        ui.notifications.info(count > 0
          ? `Synced player visibility on ${count} document${count === 1 ? "" : "s"}.`
          : "Player visibility is already up to date.");
      } finally {
        button.disabled = false;
      }
    });
  }
}

// ---- Complete Card Management Integration ----------------------------------
// Session Zero Q&A game: a GM right-clicks a placed deck on the CCM card layer to Start/End a
// game (creating, then later detaching, a Session Zero Summary), and right-clicks individual
// dealt cards while a game is active to record the answering player's response. All of this is
// wired up only if Complete Card Management is active (see isCCMActive() gate in the ready hook);
// entirely inert otherwise.

const CCM_ACTIVE_SESSION_FLAG = "activeSessionZeroUuid";
// Standard Foundry "module.<id>" socket namespace - the server relays anything emitted here to
// every other connected client, which is exactly the broadcast "Show Players" needs.
const CARD_IMAGE_SHARE_CHANNEL = "module.cv-wicked-campaigns";

function findActiveSessionZeroForDeck(deck) {
  const uuid = deck?.getFlag("cv-wicked-campaigns", CCM_ACTIVE_SESSION_FLAG);
  return uuid ? fromUuidSync(uuid) : null;
}

// A dealt Card's own `origin` field tracks the deck it was drawn from regardless of which
// hand/pile currently holds it - that's "which deck does this card belong to" for our purposes,
// not its current parent. Falls back to the current parent only if that parent is itself still a
// deck (i.e. the card hasn't been dealt anywhere yet).
function findOriginDeckForCard(card) {
  return card?.origin ?? (card?.parent?.type === "deck" ? card.parent : null);
}

// Opened automatically after Start Session Zero rolls initiative and starts combat - not awaited
// by the caller, so the summary/flag setup below still happens immediately regardless of how long
// the GM spends dragging. Foundry has no native "manual reorder" concept: turn order is purely
// derived from each combatant's initiative value, so every drop just rewrites everyone's
// initiative (top of the list = highest) to match. Applies live; there's no separate Save step.
const turnOrderReassignBase = foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2);

class TurnOrderReassignApp extends turnOrderReassignBase {
  constructor(combat, summary, deck, options = {}) {
    super(options);
    this.combat = combat;
    this.summary = summary;
    this.deck = deck;
    this.order = combat.turns.map((c) => c.id);
  }

  static DEFAULT_OPTIONS = {
    id: "turn-order-reassign",
    classes: ["wicked-campaigns", "turn-order-reassign-dialog"],
    window: { title: "Session Zero Game Tracker", icon: "fa-solid fa-arrow-down-up-across-line" },
    position: { width: 360, height: "auto" },
    actions: {
      endSession: TurnOrderReassignApp.#onEndSession,
      nextTurn: TurnOrderReassignApp.#onNextTurn,
      previousTurn: TurnOrderReassignApp.#onPreviousTurn,
    },
  };

  static PARTS = {
    main: { template: "modules/cv-wicked-campaigns/templates/turn-order-reassign.hbs" },
  };

  async _prepareContext(options) {
    const combatants = this.order.map((id) => this.combat.combatants.get(id)).filter(Boolean);
    const data = this.summary?.getFlag(CC_MODULE_ID, "data") || {};
    const entries = data.entries || [];
    const limits = this.summary?.getFlag("cv-wicked-campaigns", "sessionZeroLimits") || {};
    const countSuit = (suit) => entries.filter((e) => e.suit?.toLowerCase() === suit).length;

    return {
      combatants: combatants.map((c) => {
        const isPC = c.actor?.type === "character";
        const name = c.actor?.name ?? c.name;
        return {
          id: c.id,
          name: c.name,
          img: c.img,
          initiative: c.initiative,
          isPC,
          isCurrentTurn: c.id === this.combat.combatant?.id,
          arcanaCount: isPC ? entries.filter((e) => e.suit?.toLowerCase() === "major arcana" && e.playerName === name).length : null,
          arcanaMax: limits.arcanaPerPlayerMax ?? null,
          rosesCount: isPC ? entries.filter((e) => e.suit?.toLowerCase() === "roses" && e.playerName === name).length : null,
          rosesMax: limits.rosesPerPlayerMax ?? null,
        };
      }),
      hasLimits: !!this.summary,
      villainCount: countSuit("skulls"),
      villainMax: limits.villainMax ?? null,
      moonsCount: countSuit("moons"),
      moonsMax: limits.moonsMax ?? null,
      mobiusCount: countSuit("mobius"),
      mobiusMax: limits.mobiusMax ?? null,
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    let dragId = null;
    this.element.querySelectorAll(".turn-order-list li[data-combatant-id]").forEach((li) => {
      li.addEventListener("dragstart", (event) => {
        dragId = li.dataset.combatantId;
        event.dataTransfer.effectAllowed = "move";
      });
      li.addEventListener("dragover", (event) => event.preventDefault());
      li.addEventListener("drop", async (event) => {
        event.preventDefault();
        const targetId = li.dataset.combatantId;
        if (!dragId || dragId === targetId) return;
        const from = this.order.indexOf(dragId);
        const to = this.order.indexOf(targetId);
        if (from === -1 || to === -1) return;
        this.order.splice(from, 1);
        this.order.splice(to, 0, dragId);
        await this._applyOrder();
      });
    });
  }

  // See DramaSetupDialog#rerenderKeepingPosition - "auto" height recenters the window on every
  // render whenever content height changes, which fights against the GM having dragged it.
  async #rerenderKeepingPosition(force = false) {
    const { top, left } = this.position;
    await this.render(force);
    if (Number.isFinite(top) && Number.isFinite(left)) this.setPosition({ top, left });
  }

  async _applyOrder() {
    const count = this.order.length;
    const updates = this.order.map((id, index) => ({ _id: id, initiative: count - index }));
    await this.combat.updateEmbeddedDocuments("Combatant", updates);
    await this.#rerenderKeepingPosition(true);
  }

  // Delegates entirely to endSessionZeroGame() - same confirmation dialog and chat-wipe warning
  // as ending from the deck's own HUD button, just reachable without leaving this panel.
  static async #onEndSession() {
    await endSessionZeroGame(this.deck);
  }

  static async #onNextTurn() {
    await this.combat.nextTurn();
    await this.#rerenderKeepingPosition();
  }

  static async #onPreviousTurn() {
    await this.combat.previousTurn();
    await this.#rerenderKeepingPosition();
  }

  static open(combat, summary, deck) {
    new TurnOrderReassignApp(combat, summary, deck).render(true);
  }
}

// The scene's own "canvas pile" flag (set by Complete Card Management itself when a GM configures
// a discard pile for the scene) is the only reliable way to find "the" discard pile for a deck -
// there's no formal deck-to-pile link in Foundry's card system otherwise.
function findDiscardPileForScene(scene = canvas.scene) {
  const pileId = scene?.getFlag("complete-card-management", "canvasPile");
  return pileId ? game.cards.get(pileId) : null;
}

// Villain/Moons/Mobius are deck-wide counts checked the same way; Major Arcana is handled
// separately below since it's tracked per-player instead.
const SESSION_ZERO_DECK_WIDE_TIERS = [
  { key: "villain", suit: "skulls", label: "Villain" },
  { key: "moons", suit: "moons", label: "Moons" },
  { key: "mobius", suit: "mobius", label: "Mobius" },
];

// Shown once, the first time every *configured* tier (deck-wide + per-player) has hit its own
// limit and already been offered its own discard prompt - a separate, softer nudge rather than
// folding straight into endSessionZeroGame's own confirmation, so a GM who wants to keep playing
// past "complete" isn't forced through a second dialog just to say no.
async function promptEndSessionComplete(deck) {
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: "Session Zero Complete", icon: "fas fa-flag-checkered" },
    content: `<p>Every card limit for "${esc(deck.name)}" has been reached. The Session Zero game is complete.</p><p>End the game session now?</p>`,
    buttons: [
      { action: "end", label: "End Session", icon: "fas fa-flag-checkered", callback: () => "end" },
      { action: "later", label: "Not Yet", icon: "fas fa-times", callback: () => "later" },
    ],
    rejectClose: false,
  }).catch(() => "later");
  if (result === "end") await endSessionZeroGame(deck);
}

async function promptDiscardSuit(deck, suit, label) {
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `Discard Remaining ${label} Cards?`, icon: "fas fa-trash" },
    content: `<p>The ${label} card limit has been reached. Discard the rest of the ${label} cards from "${esc(deck.name)}" to the discard pile?</p>`,
    buttons: [
      { action: "discard", label: "Discard", icon: "fas fa-trash", callback: () => "discard" },
      { action: "keep", label: "Keep in Deck", icon: "fas fa-times", callback: () => "keep" },
    ],
    rejectClose: false,
  }).catch(() => "keep");
  if (result !== "discard") return;

  const pile = findDiscardPileForScene();
  if (!pile) {
    ui.notifications.warn(`No discard pile is configured for this scene (Complete Card Management's canvas pile isn't set).`);
    return;
  }
  const remaining = deck.availableCards.filter((c) => c.suit?.toLowerCase() === suit);
  if (remaining.length === 0) return;
  await deck.pass(pile, remaining.map((c) => c.id), { action: "discard" });
  ui.notifications.info(`Discarded ${remaining.length} remaining ${label} card${remaining.length === 1 ? "" : "s"} from "${deck.name}".`);
}

// General-purpose deck utility, independent of Session Zero entirely - suits are read live off
// whatever cards actually remain in the deck (deck.availableCards) rather than any hardcoded
// list, so this works for any Cards deck, not just the specific tarot deck Session Zero expects.
async function promptDiscardBySuitDialog(deck) {
  const suitCounts = new Map();
  for (const c of deck.availableCards) {
    if (!c.suit) continue;
    suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
  }
  if (!suitCounts.size) {
    ui.notifications.warn(`"${deck.name}" has no cards with a suit set to discard by.`);
    return;
  }

  const suitOptions = [...suitCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([suit, count]) => `<option value="${esc(suit)}">${esc(suit)} (${count})</option>`)
    .join("");

  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: `Discard by Suit: ${deck.name}`, icon: "fas fa-layer-group" },
    content: `
      <div class="form-group">
        <label>Suit</label>
        <select name="suit">${suitOptions}</select>
      </div>
      <p style="opacity: 0.8; font-size: 0.85em;">Discards every card of the chosen suit still in the deck to the scene's discard pile.</p>
    `,
    buttons: [
      { action: "discard", label: "Discard", icon: "fas fa-trash", callback: (event, button) => button.form.elements.suit.value },
    ],
    rejectClose: false,
  }).catch(() => null);
  if (!choice) return;

  const pile = findDiscardPileForScene();
  if (!pile) {
    ui.notifications.warn(`No discard pile is configured for this scene (Complete Card Management's canvas pile isn't set).`);
    return;
  }

  const toDiscard = deck.availableCards.filter((c) => c.suit === choice);
  if (!toDiscard.length) return;
  await deck.pass(pile, toDiscard.map((c) => c.id), { action: "discard" });
  ui.notifications.info(`Discarded ${toDiscard.length} "${choice}" card${toDiscard.length === 1 ? "" : "s"} from "${deck.name}".`);
}

// Runs after every recorded answer - checks the deck-wide tiers plus the per-player Major Arcana
// tier against their GM-set limits, and prompts to discard the remainder of a tier's cards the
// first time (and only the first time) its limit is reached.
async function checkSessionZeroThresholds(summary, deck) {
  if (!summary || !deck) return;
  const data = summary.getFlag(CC_MODULE_ID, "data") || {};
  const entries = data.entries || [];
  const limits = summary.getFlag("cv-wicked-campaigns", "sessionZeroLimits") || {};
  const prompted = foundry.utils.deepClone(summary.getFlag("cv-wicked-campaigns", "sessionZeroDiscardPrompted") || {});

  for (const tier of SESSION_ZERO_DECK_WIDE_TIERS) {
    if (prompted[tier.key]) continue;
    const max = limits[`${tier.key}Max`];
    if (!max) continue;
    const count = entries.filter((e) => e.suit?.toLowerCase() === tier.suit).length;
    if (count < max) continue;
    prompted[tier.key] = true;
    await summary.setFlag("cv-wicked-campaigns", "sessionZeroDiscardPrompted", prompted);
    await promptDiscardSuit(deck, tier.suit, tier.label);
  }

  // Major Arcana and Roses are both tracked per-player rather than deck-wide - "maxed" means every
  // PC combatant individually has at least the limit, not just the deck total.
  const perPlayerTiers = [
    { key: "majorArcana", suit: "major arcana", label: "Major Arcana", max: limits.arcanaPerPlayerMax },
    { key: "roses", suit: "roses", label: "Roses", max: limits.rosesPerPlayerMax },
  ];
  if (game.combat) {
    const pcCombatants = game.combat.combatants.filter((c) => c.actor?.type === "character");
    for (const tier of perPlayerTiers) {
      if (prompted[tier.key] || !tier.max) continue;
      const allMaxed = pcCombatants.length > 0 && pcCombatants.every((c) => {
        const name = c.actor?.name ?? c.name;
        const count = entries.filter((e) => e.suit?.toLowerCase() === tier.suit && e.playerName === name).length;
        return count >= tier.max;
      });
      if (!allMaxed) continue;
      prompted[tier.key] = true;
      await summary.setFlag("cv-wicked-campaigns", "sessionZeroDiscardPrompted", prompted);
      await promptDiscardSuit(deck, tier.suit, tier.label);
    }
  }

  // Once every tier the GM actually configured (limit > 0) has fired its own discard prompt above,
  // the whole game is "complete" - nudge the GM to wrap up, once, the first time that's true.
  if (!prompted.sessionComplete) {
    const configuredTierKeys = [
      ...SESSION_ZERO_DECK_WIDE_TIERS.filter((t) => limits[`${t.key}Max`]).map((t) => t.key),
      ...perPlayerTiers.filter((t) => t.max).map((t) => t.key),
    ];
    if (configuredTierKeys.length > 0 && configuredTierKeys.every((key) => prompted[key])) {
      prompted.sessionComplete = true;
      await summary.setFlag("cv-wicked-campaigns", "sessionZeroDiscardPrompted", prompted);
      await promptEndSessionComplete(deck);
    }
  }
}

// Asked once per Start, right after the GM confirms the PC roster - these four limits get stored
// on the summary and drive checkSessionZeroThresholds() for the rest of the game. Cancelling backs
// out of the whole Start operation cleanly, since nothing has been touched yet at this point.
async function promptSessionZeroLimits() {
  const content = `
    <div style="display: flex; flex-direction: column; gap: 0.6rem;">
      <div class="form-group">
        <label>Max Villain card count</label>
        <input type="number" name="villainMax" value="2" min="2">
      </div>
      <div class="form-group">
        <label>Max Major Arcana cards per player</label>
        <input type="number" name="arcanaPerPlayerMax" value="1" min="1">
      </div>
      <div class="form-group">
        <label>Max Moons cards</label>
        <input type="number" name="moonsMax" value="3" min="3">
      </div>
      <div class="form-group">
        <label>Max Mobius cards</label>
        <input type="number" name="mobiusMax" value="3" min="3">
      </div>
      <div class="form-group">
        <label>Max Rose cards per player</label>
        <input type="number" name="rosesPerPlayerMax" value="2" min="2">
      </div>
    </div>
  `;
  return foundry.applications.api.DialogV2.wait({
    window: { title: "Session Zero Setup", icon: "fa-solid fa-sliders" },
    content,
    buttons: [
      {
        action: "confirm",
        label: "Continue",
        icon: "fas fa-check",
        callback: (event, button) => ({
          villainMax: parseInt(button.form.elements.villainMax.value, 10) || 2,
          arcanaPerPlayerMax: parseInt(button.form.elements.arcanaPerPlayerMax.value, 10) || 1,
          moonsMax: parseInt(button.form.elements.moonsMax.value, 10) || 3,
          mobiusMax: parseInt(button.form.elements.mobiusMax.value, 10) || 3,
          rosesPerPlayerMax: parseInt(button.form.elements.rosesPerPlayerMax.value, 10) || 2,
        }),
      },
      { action: "cancel", label: "Cancel", icon: "fas fa-times", callback: () => null },
    ],
    rejectClose: false,
  }).catch(() => null);
}

// Confirms the PC roster with the GM, then adds/rolls/starts combat exactly like the GM's own
// tested macro before handing off to the summary/flag setup - find-or-create the scene's combat,
// skip tokens/initiative already set so re-running this is harmless, then only start combat if it
// hasn't already begun.
async function startSessionZeroGame(deck) {
  if (!game.user.isGM) return;
  if (findActiveSessionZeroForDeck(deck)) {
    ui.notifications.warn(`A Session Zero game is already running on "${deck.name}". End it before starting a new one.`);
    return;
  }

  if (!canvas.scene) {
    ui.notifications.warn("There is no active scene loaded on the canvas.");
    return;
  }

  const pcTokens = canvas.scene.tokens.filter((t) => t.actor && t.actor.type === "character");
  if (pcTokens.length === 0) {
    ui.notifications.warn("No Player Character tokens found on this scene.");
    return;
  }

  const content = `
    <div style="margin-bottom: 10px;">
      <p style="font-size: 1.1em; border-bottom: 1px solid var(--color-border-light); padding-bottom: 5px;">
        Current Scene: <b>${esc(canvas.scene.name)}</b>
      </p>
      <p>Found <b>${pcTokens.length}</b> Player Character${pcTokens.length === 1 ? "" : "s"} here:</p>
      <ul style="margin-top: 5px; margin-bottom: 15px;">
        ${pcTokens.map((t) => `<li>${esc(t.name)}</li>`).join("")}
      </ul>
      <p>Add them to the combat tracker, roll initiative, and start the Session Zero game?</p>
    </div>
  `;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: "Start Session Zero Card Game", icon: "fa-solid fa-user-group" },
    content,
    buttons: [
      { action: "start", label: "Add, Roll, & Start", icon: "fas fa-bolt", callback: () => "start" },
      { action: "cancel", label: "Cancel", icon: "fas fa-times", callback: () => "cancel" },
    ],
    rejectClose: false,
  }).catch(() => "cancel");
  if (result !== "start") return;

  const limits = await promptSessionZeroLimits();
  if (!limits) return;

  let combat = game.combats.find((c) => c.scene?.id === canvas.scene.id);
  if (!combat) combat = await Combat.create({ scene: canvas.scene.id, active: true });

  const existingTokenIds = new Set(combat.combatants.map((c) => c.tokenId));
  const tokensToAdd = pcTokens.filter((t) => !existingTokenIds.has(t.id));
  if (tokensToAdd.length > 0) {
    await combat.createEmbeddedDocuments("Combatant", tokensToAdd.map((t) => ({
      tokenId: t.id,
      sceneId: canvas.scene.id,
      actorId: t.actorId,
      hidden: t.hidden,
    })));
  }

  const pcCombatantsToRoll = combat.combatants.filter((c) => c.actor?.type === "character" && c.initiative === null);
  if (pcCombatantsToRoll.length > 0) {
    await combat.rollInitiative(pcCombatantsToRoll.map((c) => c.id));
  }

  if (!combat.started) await combat.startCombat();

  // Summary needs to exist before the reorder panel opens, since that panel now reads the
  // summary's limits/entries to show its live tier trackers.
  const summary = await createSessionZeroSummary(`Session Zero Summary - ${formatSortableTimestamp()}`, limits);
  await deck.setFlag("cv-wicked-campaigns", CCM_ACTIVE_SESSION_FLAG, summary.uuid);

  TurnOrderReassignApp.open(combat, summary, deck);

  ui.notifications.info(`Session Zero game started on "${deck.name}". Recording to "${summary.name}".`);
}

// Confirms with the GM before doing anything destructive - this deletes the active combat AND
// wipes every chat message in the world (not scoped to the card game), by explicit GM choice, so
// the confirmation copy is deliberately blunt about that scope rather than downplaying it.
// Shared by End Session Zero and Reset Deck (which implicitly ends any active game on that deck
// too, since continuing to record answers against a summary tied to a just-reset deck wouldn't
// make sense). Each caller handles its own confirmation dialog and chat wipe - this just performs
// the actual teardown, leaving the summary itself untouched so it's still readable afterward.
async function clearActiveSessionZero(deck) {
  const summary = findActiveSessionZeroForDeck(deck);
  if (!summary) return null;
  // The reorder/tracker panel is meant to stay open for the life of the game - close it here now
  // that the game is actually ending.
  await foundry.applications.instances.get("turn-order-reassign")?.close();
  if (game.combat) await game.combat.delete();
  await deck.unsetFlag("cv-wicked-campaigns", CCM_ACTIVE_SESSION_FLAG);
  return summary;
}

async function endSessionZeroGame(deck) {
  if (!game.user.isGM) return;
  const content = `
    <div style="margin-bottom: 10px;">
      <p>Are you sure you want to end the current card game?</p>
      <p style="color: var(--color-text-dark-warning); font-size: 0.9em; margin-top: 5px;">
        <b>Warning:</b> This will end the active card game and completely clear the chat log for all players.
      </p>
    </div>
  `;
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: "End Session Zero Card Game", icon: "fas fa-flag-checkered" },
    content,
    buttons: [
      { action: "end", label: "End Game", icon: "fas fa-check", callback: () => "end" },
      { action: "cancel", label: "Cancel", icon: "fas fa-times", callback: () => "cancel" },
    ],
    rejectClose: false,
  }).catch(() => "cancel");
  if (result !== "end") return;

  const summary = await clearActiveSessionZero(deck);
  await ChatMessage.deleteDocuments([], { deleteAll: true });
  ui.notifications.info(`The card game has been ended and the chat log cleared.${summary ? ` "${summary.name}" is preserved for reading back.` : ""}`);
}

// A lightweight, dependency-free replacement for relying on the world's configured image viewer
// (e.g. Gambit's) for just this one button - a resizable window (ApplicationV2 already gives us
// that for free) plus mouse-wheel zoom, which vanilla ImagePopout doesn't have.
const cardImageViewerBase = foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2);

class CardImageViewerApp extends cardImageViewerBase {
  constructor(src, imgTitle, options = {}) {
    super(options);
    this.src = src;
    this.imgTitle = imgTitle;
    // Mirrors Gambit's viewer: scale/tx/ty driven by a CSS transform (not width%/scroll), so zoom
    // can be anchored to the cursor and "fit to window" has a real meaning as the zoomed-out floor.
    this.panZoom = { scale: 1, baseScale: 1, minScale: 1, maxScale: 10, tx: 0, ty: 0, natW: 0, natH: 0, userHasZoomed: false };
  }

  static DEFAULT_OPTIONS = {
    id: "card-image-viewer",
    classes: ["wicked-campaigns", "card-image-viewer"],
    window: {
      icon: "fa-solid fa-magnifying-glass",
      resizable: true,
      controls: [{
        icon: "fa-solid fa-eye",
        label: "JOURNAL.ActionShow",
        action: "shareImage",
        visible: () => game.user.isGM,
      }],
    },
    position: { width: 420, height: 560 },
    actions: {
      shareImage: CardImageViewerApp.#onShareImage,
    },
  };

  static PARTS = {
    main: { template: "modules/cv-wicked-campaigns/templates/card-image-viewer.hbs" },
  };

  get title() {
    return this.imgTitle;
  }

  async _prepareContext(options) {
    return { src: this.src };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const img = this.element.querySelector("img");
    const wrapper = this.element.querySelector(".card-image-viewer-wrapper");
    if (!img || !wrapper) return;
    if (this._panZoomListenersAttached) return; // _onRender could in principle fire more than once
    this._panZoomListenersAttached = true;

    img.draggable = false; // don't fight our own pan handling with the browser's native image drag-ghost
    if (!img.complete || !img.naturalWidth) {
      await new Promise((resolve) => img.addEventListener("load", resolve, { once: true }));
    }
    this.panZoom.natW = img.naturalWidth;
    this.panZoom.natH = img.naturalHeight;
    img.style.width = `${this.panZoom.natW}px`;
    img.style.height = `${this.panZoom.natH}px`;

    // Foundry's automatic post-_onRender setPosition() call doesn't reliably land before we need
    // to measure the wrapper, so force it ourselves - re-applying the already-known position is
    // enough to make the window's real size available for the fit-to-window calculation below.
    this.setPosition();

    this._fitAndCenter(wrapper, img);

    wrapper.addEventListener("wheel", (event) => {
      event.preventDefault();
      const rect = wrapper.getBoundingClientRect();
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      this._zoomAt(wrapper, img, factor, event.clientX - rect.left, event.clientY - rect.top);
    }, { passive: false });

    wrapper.addEventListener("dblclick", () => this._fitAndCenter(wrapper, img));

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startTx = 0;
    let startTy = 0;

    const onMouseDown = (event) => {
      if (event.button !== 0) return;
      if (this.panZoom.scale <= this.panZoom.minScale + 1e-6) return; // fully fit - nothing to pan
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startTx = this.panZoom.tx;
      startTy = this.panZoom.ty;
      wrapper.style.cursor = "grabbing";
      event.preventDefault();
    };
    const onMouseMove = (event) => {
      if (!dragging) return;
      this.panZoom.tx = startTx + (event.clientX - startX);
      this.panZoom.ty = startTy + (event.clientY - startY);
      this._applyTransform(img);
    };
    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      this._constrainPan(wrapper);
      this._applyTransform(img);
      this._updateCursor(wrapper);
    };

    wrapper.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    // mousemove/mouseup are on window (dragging can continue past the wrapper's edge) so they
    // must be explicitly removed on close, or they'd linger and pile up across repeated opens.
    this._panCleanup = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    // Refit on window resize unless the user has manually zoomed, matching Gambit's behavior.
    this._resizeObserver = new ResizeObserver(() => {
      if (this.panZoom.userHasZoomed) {
        this._constrainPan(wrapper);
        this._applyTransform(img);
      } else {
        this._fitAndCenter(wrapper, img);
      }
    });
    this._resizeObserver.observe(wrapper);
  }

  async _onClose(options) {
    this._panCleanup?.();
    this._resizeObserver?.disconnect();
    await super._onClose(options);
  }

  _applyTransform(img) {
    img.style.transform = `translate(${this.panZoom.tx}px, ${this.panZoom.ty}px) scale(${this.panZoom.scale})`;
  }

  _updateCursor(wrapper) {
    wrapper.style.cursor = this.panZoom.scale > this.panZoom.minScale + 1e-6 ? "grab" : "default";
  }

  // Scale that fits the whole image inside the wrapper - also the zoomed-out floor, so you can
  // never zoom out past "the whole image is visible."
  _computeBaseScale(wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const { natW, natH } = this.panZoom;
    if (!rect.width || !rect.height || !natW || !natH) {
      this.panZoom.baseScale = this.panZoom.minScale = 1;
      return;
    }
    const fit = Math.min(rect.width / natW, rect.height / natH) * 0.995;
    this.panZoom.baseScale = Math.max(0.0001, fit);
    this.panZoom.minScale = this.panZoom.baseScale;
  }

  _centerAtCurrentScale(wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const { natW, natH, scale } = this.panZoom;
    this.panZoom.tx = (rect.width - natW * scale) / 2;
    this.panZoom.ty = (rect.height - natH * scale) / 2;
  }

  _fitAndCenter(wrapper, img) {
    this._computeBaseScale(wrapper);
    this.panZoom.scale = this.panZoom.baseScale;
    this.panZoom.userHasZoomed = false;
    this._centerAtCurrentScale(wrapper);
    this._applyTransform(img);
    this._updateCursor(wrapper);
  }

  // Clamp pan so the image can't be dragged fully off-screen; centers it on any axis where it's
  // smaller than the wrapper.
  _constrainPan(wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const { natW, natH, scale } = this.panZoom;
    const rw = natW * scale;
    const rh = natH * scale;
    this.panZoom.tx = rw <= rect.width ? (rect.width - rw) / 2 : Math.min(0, Math.max(rect.width - rw, this.panZoom.tx));
    this.panZoom.ty = rh <= rect.height ? (rect.height - rh) / 2 : Math.min(0, Math.max(rect.height - rh, this.panZoom.ty));
  }

  // Zoom by `factor`, keeping the content under (cx, cy) - wrapper-relative coordinates - fixed
  // on screen, the way Gambit's viewer anchors zoom to the cursor instead of a fixed point.
  _zoomAt(wrapper, img, factor, cx, cy) {
    this.panZoom.userHasZoomed = true;
    const { tx, ty, scale } = this.panZoom;
    const preX = (cx - tx) / scale;
    const preY = (cy - ty) / scale;
    const next = Math.min(this.panZoom.maxScale, Math.max(this.panZoom.minScale, scale * factor));

    if (next <= this.panZoom.minScale + 1e-6) {
      this.panZoom.scale = this.panZoom.minScale;
      this.panZoom.userHasZoomed = false;
      this._centerAtCurrentScale(wrapper);
    } else {
      this.panZoom.scale = next;
      this.panZoom.tx = cx - preX * next;
      this.panZoom.ty = cy - preY * next;
      this._constrainPan(wrapper);
    }
    this._applyTransform(img);
    this._updateCursor(wrapper);
  }

  // Broadcasts to every other connected client, whose own socket listener (registered once at
  // ready time, for players too) opens this same custom viewer on their screen - not Foundry's
  // native ImagePopout, since ours is meant to fully replace it.
  static #onShareImage() {
    game.socket.emit(CARD_IMAGE_SHARE_CHANNEL, {
      type: "shareCardImage",
      src: this.src,
      title: this.imgTitle,
    });
  }

  // Fixed id (see DEFAULT_OPTIONS) means only one instance can sanely exist at a time - close
  // whatever's already open first rather than leaving a stale window behind.
  static async open(src, imgTitle) {
    await foundry.applications.instances.get("card-image-viewer")?.close();
    new CardImageViewerApp(src, imgTitle).render(true);
  }
}

// Common raster/video extensions ImagePopout might be asked to show that our viewer can't
// (video) or that aren't really "an image" in the sense our viewer cares about.
const IMAGE_VIEWER_UNSUPPORTED_EXT = /\.(webm|mp4|m4v|ogv)$/i;

// Mirrors Gambit's own approach: intercept every place Foundry would open the native
// ImagePopout (actor portraits, item art, journal images, etc) and open our viewer instead, so
// ours is the image viewer used everywhere - not just from our own "View Card Image" button.
Hooks.once("init", () => {
  if (!game.modules.get("lib-wrapper")?.active) {
    console.warn("Wicked Campaigns | lib-wrapper is not active - our custom image viewer will only open from our own buttons, not as a replacement for Foundry's native image popout elsewhere.");
    return;
  }

  libWrapper.register(
    "cv-wicked-campaigns",
    "foundry.applications.apps.ImagePopout.prototype.render",
    function (wrapped, ...args) {
      const src = this.options?.src;
      if (!src || IMAGE_VIEWER_UNSUPPORTED_EXT.test(src)) return wrapped(...args);
      if (!game.settings.get("cv-wicked-campaigns", "cardImageViewerEnabled")) return wrapped(...args);
      CardImageViewerApp.open(src, this.options?.window?.title ?? this.title);
      return this;
    },
    "MIXED",
  );
});

// Two-column dialog: the card's currently-showing face on the left, a title field and a
// ProseMirror answer editor on the right. Opened only once a valid combatant has been confirmed
// (see #open below) - the combat tracker's current turn is how we know who's answering.
const sessionZeroAnswerBase = foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2);

class SessionZeroAnswerApp extends sessionZeroAnswerBase {
  constructor(card, summary, combatant, options = {}) {
    super(options);
    this.card = card;
    this.summary = summary;
    this.combatant = combatant;
  }

  static DEFAULT_OPTIONS = {
    id: "session-zero-answer",
    classes: ["wicked-campaigns", "session-zero-answer-dialog"],
    window: { title: "Record Answer", icon: "fa-solid fa-clipboard-question" },
    position: { width: 640, height: "auto" },
    actions: {
      submit: SessionZeroAnswerApp.#onSubmit,
      cancel: SessionZeroAnswerApp.#onCancel,
    },
  };

  static PARTS = {
    main: { template: "modules/cv-wicked-campaigns/templates/session-zero-answer.hbs" },
  };

  async _prepareContext(options) {
    // Same "every other PC in the combat" filter rollForOtherPlayers uses for its relationship
    // d8 check - reused here so tagging who a card is about draws from the same live roster.
    const combat = this.combatant.parent;
    const otherPlayers = (combat?.combatants ?? [])
      .filter((c) => c.actor?.type === "character" && c.id !== this.combatant.id)
      .map((c) => ({ id: c.id, name: c.actor?.name ?? c.name, img: c.actor?.img ?? c.img }));

    return {
      cardImage: this.card.img,
      cardName: this.card.name,
      playerName: this.combatant.actor?.name ?? this.combatant.name,
      playerImg: this.combatant.actor?.img ?? this.combatant.img,
      otherPlayers,
      hasOtherPlayers: otherPlayers.length > 0,
    };
  }

  static async #onSubmit(event, target) {
    const form = target.form;
    const title = form.elements.title.value.trim();
    if (!title) {
      ui.notifications.warn("Give the entry a title before recording it.");
      return;
    }

    const linkedPlayers = Array.from(form.querySelectorAll('input[name="linkedPlayer"]:checked')).map((el) => ({
      name: el.dataset.name,
      img: el.dataset.img,
    }));

    await addSessionZeroEntry(this.summary, {
      title,
      answerHtml: form.elements.answerHtml.value,
      cardImage: this.card.img,
      suit: this.card.suit ?? null,
      playerName: this.combatant.actor?.name ?? this.combatant.name,
      playerImg: this.combatant.actor?.img ?? this.combatant.img,
      linkedPlayers,
      timestamp: Date.now(),
    });
    ui.notifications.info(`Recorded "${title}" in "${this.summary.name}".`);
    await checkSessionZeroThresholds(this.summary, findOriginDeckForCard(this.card));
    this.close();
  }

  static #onCancel() {
    this.close();
  }

  // The only entry point - always resolves the current combatant itself rather than trusting a
  // stale one handed in from elsewhere, and blocks with a warning instead of opening the dialog
  // at all if there's nobody whose turn it currently is.
  static async open(card, summary) {
    const combatant = game.combat?.combatant;
    if (!combatant) {
      ui.notifications.warn("No active combatant - start combat and set whose turn it is before recording an answer.");
      return;
    }
    new SessionZeroAnswerApp(card, summary, combatant).render(true);
  }
}

// Rolls 1d8 for every PC combatant except whoever's turn it currently is (e.g. a "how do the rest
// of the table feel about this" check while one player answers a card). Results go to a dialog
// instead of the chat log, per spec, since this is meant for a quick private GM read rather than a
// permanent table record.
async function rollForOtherPlayers(combat) {
  if (!combat) {
    ui.notifications.warn("There is no active combat encounter.");
    return;
  }
  const currentCombatantId = combat.combatant?.id;
  const pcCombatants = combat.combatants.filter((c) => c.actor?.type === "character" && c.id !== currentCombatantId);
  if (pcCombatants.length === 0) {
    ui.notifications.warn("No other player characters found in the combat tracker.");
    return;
  }

  const confirmContent = `
    <div style="margin-bottom: 10px;">
      <p>You are about to roll a <b>1d8</b> for the following actors:</p>
      <ul style="margin-top: 5px;">
        ${pcCombatants.map((c) => `<li>${esc(c.actor.name)}</li>`).join("")}
      </ul>
      <p>Proceed with the roll?</p>
    </div>
  `;
  const confirmed = await foundry.applications.api.DialogV2.wait({
    window: { title: "Relationship d8 Check", icon: "fas fa-dice-d8" },
    content: confirmContent,
    buttons: [
      { action: "roll", label: "Roll Dice", icon: "fas fa-dice", callback: () => "roll" },
      { action: "cancel", label: "Cancel", icon: "fas fa-times", callback: () => "cancel" },
    ],
    rejectClose: false,
  }).catch(() => "cancel");
  if (confirmed !== "roll") return;

  const results = await Promise.all(pcCombatants.map(async (c) => {
    const roll = await new Roll("1d8").evaluate();
    return { name: c.actor.name, total: roll.total };
  }));
  results.sort((a, b) => b.total - a.total);

  const resultsContent = `
    <table style="width: 100%; text-align: left; border-collapse: collapse; margin-top: 5px;">
      <thead>
        <tr style="border-bottom: 2px solid var(--color-border-dark);">
          <th style="padding-bottom: 5px;">Character</th>
          <th style="text-align: right; padding-bottom: 5px;">Result</th>
        </tr>
      </thead>
      <tbody>
        ${results.map((r) => `
          <tr style="border-bottom: 1px solid var(--color-border-light);">
            <td style="padding: 3px 0;"><b>${esc(r.name)}</b></td>
            <td style="text-align: right; font-weight: bold; font-size: 1.2em; padding: 3px 0;">${r.total}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  await foundry.applications.api.DialogV2.wait({
    window: { title: "Roll Results", icon: "fas fa-dice-d8" },
    content: resultsContent,
    buttons: [{ action: "close", label: "Close", icon: "fas fa-check", default: true, callback: () => null }],
    rejectClose: false,
  }).catch(() => null);
}

// Cards with a numeric `value` go to the top of the deck in ascending order (lowest sort = drawn
// first, per core Cards#_drawCards's TOP/FIRST mode); everything else is randomized the same way
// core's own shuffle() does and placed after. Independent of Session Zero state - this is deck
// prep, not part of the recording flow, so it's always available on any deck.
// Three tiers, top to bottom: "theme" suit cards sorted ascending by value, then "major arcana"
// suit cards shuffled among themselves, then everything else shuffled normally. Suit match is
// case-insensitive since it's free text on the card, not an enum.
function shuffleGroup(group) {
  return group
    .map((c) => [foundry.dice.MersenneTwister.random(), c])
    .sort((a, b) => a[0] - b[0])
    .map(([, c]) => c);
}

// Recalls every dealt-out card (discard piles, hands, etc.) back into the deck, then applies the
// custom tier sort - confirmed with the GM first since forcibly pulling cards out of hands/piles
// mid-game is disruptive enough to warrant a prompt, unlike a plain re-sort.
async function resetDeck(deck) {
  if (!game.user.isGM) return;
  const activeSummary = findActiveSessionZeroForDeck(deck);

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: "Reset Deck?", icon: "fas fa-rotate-left" },
    content: `
      <p>This will recall every dealt card in "${esc(deck.name)}" back into the deck (including anything in hands or piles) and re-sort it: theme cards on top in order, then major arcana and skulls shuffled, then everything else shuffled.</p>
      <p style="color: var(--color-text-dark-warning); font-size: 0.9em; margin-top: 5px;">
        <b>Warning:</b> This will also completely clear the chat log for all players${activeSummary ? " and end the active Session Zero game on this deck" : ""}.
      </p>
    `,
    buttons: [
      { action: "reset", label: "Reset", icon: "fas fa-rotate-left", callback: () => "reset" },
      { action: "cancel", label: "Cancel", icon: "fas fa-times", callback: () => "cancel" },
    ],
    rejectClose: false,
  }).catch(() => "cancel");
  if (result !== "reset") return;

  if (activeSummary) await clearActiveSessionZero(deck);

  await deck.recall({ chatNotification: false });
  const cards = deck.cards.contents;

  const theme = cards
    .filter((c) => c.suit?.toLowerCase() === "theme")
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  const majorArcana = shuffleGroup(cards.filter((c) => c.suit?.toLowerCase() === "major arcana"));
  const skulls = shuffleGroup(cards.filter((c) => c.suit?.toLowerCase() === "skulls"));
  const rest = shuffleGroup(cards.filter((c) => !["theme", "major arcana", "skulls"].includes(c.suit?.toLowerCase())));

  const updates = [...theme, ...majorArcana, ...skulls, ...rest].map((c, index) => ({ _id: c.id, sort: index }));
  await deck.updateEmbeddedDocuments("Card", updates);
  await ChatMessage.deleteDocuments([], { deleteAll: true });
  ui.notifications.info(`"${deck.name}" has been reset and the chat log cleared.${activeSummary ? ` The Session Zero game has ended; "${activeSummary.name}" is preserved for reading back.` : ""}`);
}

// The CardHud's own template (card-hud.hbs) has an empty `.col.middle` div, deliberately unused
// by Complete Card Management - the same extension point core Foundry's TokenHUD uses for status
// effects. CardHud is a normal ApplicationV2/HandlebarsApplicationMixin app, so Foundry fires a
// "renderCardHud" hook automatically; nothing here touches CCM's own code.
function onRenderCardHud(hud, html) {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const middle = root?.querySelector(".col.middle");
  if (!middle) return;

  const card = hud.card;

  if (card instanceof Cards && card.type === "deck") {
    // Independent of Session Zero entirely - a general deck utility, not gated behind that
    // setting the way Start/End/Reset below are.
    const discardSuitButton = document.createElement("button");
    discardSuitButton.type = "button";
    discardSuitButton.className = "control-icon";
    discardSuitButton.dataset.tooltip = "Discard by Suit";
    discardSuitButton.innerHTML = `<i class="fa-solid fa-layer-group"></i>`;
    discardSuitButton.addEventListener("click", () => promptDiscardBySuitDialog(card));
    middle.appendChild(discardSuitButton);

    if (game.settings.get("cv-wicked-campaigns", "sessionZeroEnabled")) {
      const active = findActiveSessionZeroForDeck(card);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "control-icon";
      if (active) {
        button.dataset.tooltip = `End Session Zero Game (${active.name})`;
        button.innerHTML = `<i class="fa-solid fa-flag-checkered"></i>`;
        button.addEventListener("click", () => endSessionZeroGame(card));
      } else {
        button.dataset.tooltip = "Start Session Zero Game";
        button.innerHTML = `<i class="fa-solid fa-clipboard-question"></i>`;
        button.addEventListener("click", () => startSessionZeroGame(card));
      }
      middle.appendChild(button);

      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "control-icon";
      resetButton.dataset.tooltip = "Reset Deck (recall all cards, then theme on top, major arcana/skulls shuffled next, rest shuffled)";
      resetButton.innerHTML = `<i class="fa-solid fa-rotate-left"></i>`;
      resetButton.addEventListener("click", () => resetDeck(card));
      middle.appendChild(resetButton);
    }
    return;
  }

  if (card instanceof Card) {
    // Always available, independent of Session Zero state - same reasoning as the deck's Sort
    // button. Uses our own CardImageViewerApp rather than the world's configured image viewer, so
    // this doesn't depend on any third-party module (e.g. Gambit's) being installed.
    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "control-icon";
    viewButton.dataset.tooltip = "View Card Image";
    viewButton.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i>`;
    viewButton.addEventListener("click", () => CardImageViewerApp.open(card.img, card.name));
    middle.appendChild(viewButton);

    const summary = findActiveSessionZeroForDeck(findOriginDeckForCard(card));
    if (!summary) return; // No active Session Zero game on this card's deck - no further buttons.

    const recordButton = document.createElement("button");
    recordButton.type = "button";
    recordButton.className = "control-icon";
    recordButton.dataset.tooltip = "Record Answer";
    recordButton.innerHTML = `<i class="fa-solid fa-pen-to-square"></i>`;
    recordButton.addEventListener("click", () => SessionZeroAnswerApp.open(card, summary));
    middle.appendChild(recordButton);

    const rollButton = document.createElement("button");
    rollButton.type = "button";
    rollButton.className = "control-icon";
    rollButton.dataset.tooltip = "Roll d8 for Other Players";
    rollButton.innerHTML = `<i class="fa-solid fa-dice-d8"></i>`;
    rollButton.addEventListener("click", () => rollForOtherPlayers(game.combat));
    middle.appendChild(rollButton);
  }
}

// Recompute the full set of NPC Motive Driver bar-attribute paths from scratch. This must be a
// full rebuild rather than an incremental push/splice: a motive can drop out of trackability in
// ways incremental logic never caught (the motive gets deleted outright, or the actor itself gets
// deleted) - either left an orphaned path sitting in CONFIG.Actor.trackableAttributes.npc.bar for
// the rest of the session, which then renders as an unresolvable "Motive: Motive" in the Token
// Config Resources dropdown and can't draw a bar (its actor/flag no longer exists).
function rebuildMotiveTrackableAttributes() {
    if (!CONFIG.Actor.trackableAttributes.npc) {
        CONFIG.Actor.trackableAttributes.npc = { bar: [], value: [] };
    }
    if (!CONFIG.Actor.trackableAttributes.npc.bar) {
        CONFIG.Actor.trackableAttributes.npc.bar = [];
    }

    const bar = CONFIG.Actor.trackableAttributes.npc.bar;
    for (let i = bar.length - 1; i >= 0; i--) {
        if (bar[i].startsWith("flags.cv-wicked-campaigns.motives.")) bar.splice(i, 1);
    }

    if (!game.settings.get("cv-wicked-campaigns", "motivesEnabled")) return;

    for (const actor of game.actors) {
        if (actor.type !== "npc") continue;
        const motives = actor.getFlag("cv-wicked-campaigns", "motives") || {};
        for (const [id, data] of Object.entries(motives)) {
            const absVal = Math.abs(data.value ?? 0);
            const isFameOrInfamy = absVal >= 15;
            const isPubliclyTrackable = data.revealed === "public" || isFameOrInfamy;
            if (!isPubliclyTrackable) continue;
            const path = `flags.cv-wicked-campaigns.motives.${id}.value`;
            if (!bar.includes(path)) bar.push(path);
        }
    }
}

// Dynamic Token Trackability for NPC Motive Drivers
function initializeNPCTrackableMotives() {
    rebuildMotiveTrackableAttributes();

    // Wrap CONFIG.Token.documentClass.getTrackedAttributeChoices if not already wrapped
    const docClass = CONFIG.Token.documentClass;
    if (docClass && !docClass._originalGetTrackedAttributeChoices) {
        docClass._originalGetTrackedAttributeChoices = docClass.getTrackedAttributeChoices;
        docClass.getTrackedAttributeChoices = function(attributes) {
            const choices = docClass._originalGetTrackedAttributeChoices.call(this, attributes);
            for (const entry of choices) {
                if (entry.value.startsWith("flags.cv-wicked-campaigns.motives.")) {
                    const parts = entry.value.split(".");
                    const id = parts[3];
                    let label = "Motive";
                    for (const actor of game.actors) {
                        if (actor.type === "npc") {
                            const motives = actor.getFlag("cv-wicked-campaigns", "motives") || {};
                            if (motives[id]) {
                                label = motives[id].label;
                                break;
                            }
                        }
                    }
                    entry.label = `Motive: ${label}`;
                    entry.group = "NPC Motives";
                }
            }
            return choices;
        };
    }
}

// Patch the system's actual runtime Token classes to read/render motive flags as token bars.
// dnd5e replaces CONFIG.Token.documentClass/objectClass with its own TokenDocument5e/Token5e,
// each defining its own getBarAttribute/_drawBar - patching the base Foundry TokenDocument/Token
// classes is silently shadowed by those subclass methods and never runs. Must patch whatever
// CONFIG.Token.documentClass/objectClass actually resolve to, once they're finalized at ready.
function patchMotiveTokenBars() {
    const TokenDocClass = CONFIG.Token.documentClass;
    if (TokenDocClass && !TokenDocClass.prototype._wickedGetBarAttributePatched) {
        const originalGetBarAttribute = TokenDocClass.prototype.getBarAttribute;
        TokenDocClass.prototype.getBarAttribute = function(barName, {alternative}={}) {
            const attr = alternative || this[barName]?.attribute;
            if (attr && attr.startsWith("flags.cv-wicked-campaigns.motives.")) {
                if (!this.actor) return null;
                const val = foundry.utils.getProperty(this.actor, attr);
                if (val !== undefined) {
                    const numericVal = typeof val === "number" ? val : (val?.value ?? 0);
                    return {
                        type: "bar",
                        attribute: attr,
                        value: Math.abs(numericVal),
                        max: 20,
                        isMotive: true,
                        isAversion: numericVal < 0
                    };
                }
            }
            return originalGetBarAttribute.call(this, barName, {alternative});
        };
        TokenDocClass.prototype._wickedGetBarAttributePatched = true;
    }

    const TokenObjClass = CONFIG.Token.objectClass;
    if (TokenObjClass && !TokenObjClass.prototype._wickedDrawBarPatched) {
        const originalDrawBar = TokenObjClass.prototype._drawBar;
        TokenObjClass.prototype._drawBar = function(number, bar, data) {
            if (data && data.isMotive) {
                const customColor = data.isAversion ? 0xc62828 : 0x2e7d32; // Red for Aversion, Green for Want

                // dnd5e's Token5e._drawBar delegates to the base Token._drawBar for any
                // non-HP bar, which draws via bar.beginFill(...) - there is no separate
                // "V14 .fill()" drawing path to intercept here.
                const originalBeginFill = bar.beginFill;
                if (originalBeginFill) {
                    bar.beginFill = function(color, alpha) {
                        // Ignore black background fills
                        if (color !== 0x000000 && color !== 0) {
                            color = customColor;
                        }
                        return originalBeginFill.call(this, color, alpha);
                    };
                }

                const result = originalDrawBar.call(this, number, bar, data);

                // Restore the original drawing method
                if (originalBeginFill) bar.beginFill = originalBeginFill;

                return result;
            }
            return originalDrawBar.call(this, number, bar, data);
        };
        TokenObjClass.prototype._wickedDrawBarPatched = true;
    }
}

// Patch Actor#modifyTokenAttribute (dragging/editing a resource bar from the Token HUD) so
// motive bars work at all and preserve their Attraction/Aversion sign. The core implementation
// (and dnd5e's Actor5e, which falls through to it for anything but HP/item-uses) always reads
// via `this.system` and writes to `system.<attribute>.value` - since motives live under `flags`,
// that lookup returns undefined and crashes on `.value`. Our bars also only ever expose the
// unsigned intensity (0-20) to the HUD, so a naive fix would silently flip an Aversion into an
// Attraction the moment someone dragged/typed a new value; this preserves the existing sign.
function patchMotiveActorAttribute() {
    const ActorClass = CONFIG.Actor.documentClass;
    if (!ActorClass || ActorClass.prototype._wickedModifyTokenAttributePatched) return;

    const originalModifyTokenAttribute = ActorClass.prototype.modifyTokenAttribute;
    ActorClass.prototype.modifyTokenAttribute = async function(attribute, value, isDelta=false, isBar=true) {
        if (attribute && attribute.startsWith("flags.cv-wicked-campaigns.motives.")) {
            const current = Number(foundry.utils.getProperty(this, attribute)) || 0;
            const sign = current < 0 ? -1 : 1;
            const currentMagnitude = Math.abs(current);
            let newMagnitude = isDelta ? currentMagnitude + value : value;
            newMagnitude = Math.clamp(newMagnitude, 0, 20);
            const updated = newMagnitude === 0 ? 0 : sign * newMagnitude;
            if (updated === current) return this;
            return this.update({ [attribute]: updated });
        }
        return originalModifyTokenAttribute.call(this, attribute, value, isDelta, isBar);
    };
    ActorClass.prototype._wickedModifyTokenAttributePatched = true;
}

Hooks.on("updateActor", (actor, changes, options, userId) => {
    if (actor.type !== "npc") return;
    rebuildMotiveTrackableAttributes();
});

// An NPC with public/famous motives can be deleted outright - without this, its motive paths
// would linger forever in CONFIG.Actor.trackableAttributes.npc.bar (see rebuildMotiveTrackableAttributes).
Hooks.on("deleteActor", (actor, options, userId) => {
    if (actor.type !== "npc") return;
    rebuildMotiveTrackableAttributes();
});
