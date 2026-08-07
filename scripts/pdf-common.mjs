// Shared plumbing for the module's PDF exports: the jsPDF loader, image helper, colour theme and
// the flowing-layout helper both exporters draw through. Split out so the character-sheet export
// and the Session Zero export can live in their own files without either importing the other.

// Builds a PDF combining the actor's dnd5e sheet stats with the full Wicked Campaigns
// background (family, friends, enemies, romance, faith, personality, life events). Uses jsPDF,
// vendored locally and loaded on demand via a plain <script> tag (its UMD build isn't a real ES
// module, so a dynamic import() wouldn't expose anything useful) - this way it costs nothing
// unless a GM/player actually clicks the export button.

const JSPDF_SRC = "modules/cv-wicked-campaigns/scripts/vendor/jspdf.umd.min.js";
let jsPDFLoadPromise = null;

export async function loadJsPDF() {
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
export async function imageToDataUrl(src, maxDim = 300) {
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

export function sign(n) {
  const num = Number(n) || 0;
  return num >= 0 ? `+${num}` : `${num}`;
}

// Matches the module's actual on-screen dark palette (rgba(11,10,19,0.9) app background, #c9a054
// gold headings, #d5d5d5 body text, #b5b5b5 muted meta text) - shared by both PDF exports so they
// look like the sheets they're pulled from rather than a generic light printout.
export const WICKED_DARK_THEME = {
  background: [11, 10, 19],
  heading: [201, 160, 84],
  text: [213, 213, 213],
  muted: [181, 181, 181],
  rule: [201, 160, 84],
};

// Thin wrapper around jsPDF handling page-break tracking and consistent text styling, so the two
// render functions below can just describe content without worrying about pagination or fonts.
export class PdfLayout {
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


export function stripHtml(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html ?? "");
  return (wrapper.textContent || "").replace(/\s+/g, " ").trim();
}
