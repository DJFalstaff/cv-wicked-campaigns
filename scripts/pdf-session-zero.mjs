import { loadJsPDF, imageToDataUrl, stripHtml, WICKED_DARK_THEME, PdfLayout } from "./pdf-common.mjs";

// PDF export for the Session Zero Summary journal: the shared record of a card game, its recorded
// answers and the notes threaded under them.

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

    // Threaded notes are part of the record, not decoration - a summary exported without them
    // would quietly drop everything the other players contributed. Indented under their answer and
    // attributed, matching how the sheet renders them. Measured here so the block-height maths
    // below accounts for them and a long thread doesn't overrun the next entry.
    const noteBlocks = (entry.notes || []).map((note) => ({
      label: `${note.authorName || "Someone"}:`,
      lines: doc.splitTextToSize(stripHtml(note.html) || "(empty note)", textWidth - 8),
    }));
    const noteLineHeight = 8.5 * 1.2;
    const notesHeight = noteBlocks.reduce((sum, b) => sum + (b.lines.length + 1) * noteLineHeight, 0);

    const titleHeight = 12 * 1.15;
    const playerHeight = entry.playerName ? 8.5 * 1.3 : 0;
    const involvesHeight = involvesText ? 8 * 1.3 : 0;
    const answerHeight = answerLines.length * (9.5 * 1.15);
    const blockHeight = Math.max(thumbH, titleHeight + playerHeight + involvesHeight + answerHeight + notesHeight + 6);
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
    ty += answerLines.length * (9.5 * 1.15);

    for (const block of noteBlocks) {
      ty += noteLineHeight;
      doc.setFont(undefined, "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...WICKED_DARK_THEME.muted);
      doc.text(block.label, textX + 8, ty);

      doc.setFont(undefined, "normal");
      doc.setTextColor(...WICKED_DARK_THEME.text);
      doc.text(block.lines, textX + 8, ty + noteLineHeight);
      ty += block.lines.length * noteLineHeight;
    }
    doc.setFont(undefined, "normal");

    layout.y = topY + blockHeight + 14;
  }

  const fileName = `${(summary.name || "session-zero-summary").replace(/[^\w\- ]+/g, "").trim() || "session-zero-summary"}.pdf`;
  doc.save(fileName);
}
