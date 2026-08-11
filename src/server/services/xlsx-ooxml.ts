/**
 * Byte-preserving OOXML worksheet cell helpers for DTR XLSX patching.
 * Uses @xmldom/xmldom; never evaluates formulas or user content as markup.
 */

import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

const SPREADSHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

/** xmldom Document (avoid conflict with DOM lib Document). */
type XlsxXmlDocument = ReturnType<DOMParser["parseFromString"]>;
type XlsxXmlElement = NonNullable<ReturnType<XlsxXmlDocument["createElementNS"]>>;

export function parseCellRef(ref: string): {
  col: string;
  row: number;
  colIndex: number;
} {
  const match = /^([A-Z]+)(\d+)$/.exec(ref.trim().toUpperCase());
  if (!match) {
    throw new Error(`Invalid cell reference: ${ref}`);
  }
  const col = match[1]!;
  const row = Number(match[2]);
  return { col, row, colIndex: columnLettersToIndex(col) };
}

export function columnLettersToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

export function columnIndexToLetters(index: number): string {
  if (index < 1) throw new Error(`Invalid column index: ${index}`);
  let n = index;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function needsXmlSpacePreserve(text: string): boolean {
  return text.length > 0 && (/^\s|\s$/.test(text) || text.includes("  "));
}

function getElementsByLocalName(
  parent: XlsxXmlElement,
  localName: string,
): XlsxXmlElement[] {
  const out: XlsxXmlElement[] = [];
  const children = parent.childNodes;
  for (let i = 0; i < children.length; i += 1) {
    const node = children.item(i);
    if (node && node.nodeType === 1) {
      const el = node as XlsxXmlElement;
      if (el.localName === localName || el.nodeName === localName) {
        out.push(el);
      }
    }
  }
  return out;
}

function findSheetData(doc: XlsxXmlDocument): XlsxXmlElement {
  const sheetData = doc.getElementsByTagName("sheetData").item(0);
  if (!sheetData) {
    throw new Error("Worksheet is missing sheetData.");
  }
  return sheetData;
}

function findRow(sheetData: XlsxXmlElement, rowNumber: number): XlsxXmlElement | null {
  const rows = sheetData.getElementsByTagName("row");
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows.item(i)!;
    if (row.getAttribute("r") === String(rowNumber)) return row;
  }
  return null;
}

function ensureRow(
  doc: XlsxXmlDocument,
  sheetData: XlsxXmlElement,
  rowNumber: number,
): XlsxXmlElement {
  const existing = findRow(sheetData, rowNumber);
  if (existing) return existing;

  const row = doc.createElementNS(SPREADSHEET_NS, "row");
  row.setAttribute("r", String(rowNumber));

  const rows = sheetData.getElementsByTagName("row");
  let insertBefore: XlsxXmlElement | null = null;
  for (let i = 0; i < rows.length; i += 1) {
    const candidate = rows.item(i)!;
    const r = Number(candidate.getAttribute("r") ?? 0);
    if (r > rowNumber) {
      insertBefore = candidate;
      break;
    }
  }
  if (insertBefore) {
    sheetData.insertBefore(row, insertBefore);
  } else {
    sheetData.appendChild(row);
  }
  return row;
}

function findCell(row: XlsxXmlElement, ref: string): XlsxXmlElement | null {
  const cells = row.getElementsByTagName("c");
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells.item(i)!;
    if (cell.getAttribute("r") === ref) return cell;
  }
  return null;
}

function ensureCell(
  doc: XlsxXmlDocument,
  row: XlsxXmlElement,
  ref: string,
): XlsxXmlElement {
  const existing = findCell(row, ref);
  if (existing) return existing;

  const { colIndex } = parseCellRef(ref);
  const cell = doc.createElementNS(SPREADSHEET_NS, "c");
  cell.setAttribute("r", ref);

  const cells = row.getElementsByTagName("c");
  let insertBefore: XlsxXmlElement | null = null;
  for (let i = 0; i < cells.length; i += 1) {
    const candidate = cells.item(i)!;
    const candidateRef = candidate.getAttribute("r") ?? "";
    try {
      if (parseCellRef(candidateRef).colIndex > colIndex) {
        insertBefore = candidate;
        break;
      }
    } catch {
      // ignore malformed sibling refs
    }
  }
  if (insertBefore) {
    row.insertBefore(cell, insertBefore);
  } else {
    row.appendChild(cell);
  }
  return cell;
}

function removeChildElements(cell: XlsxXmlElement, localNames: string[]): void {
  for (const name of localNames) {
    for (const child of getElementsByLocalName(cell, name)) {
      cell.removeChild(child);
    }
  }
}

function getOrCreateWorksheetDoc(sheetXml: string): XlsxXmlDocument {
  const doc = new DOMParser().parseFromString(sheetXml, "text/xml");
  const parseError = doc.getElementsByTagName("parsererror").item(0);
  if (parseError) {
    throw new Error("Failed to parse worksheet XML.");
  }
  return doc;
}

export function serializeWorksheet(doc: XlsxXmlDocument): string {
  return new XMLSerializer().serializeToString(doc);
}

function withCell(
  sheetXml: string,
  ref: string,
  mutate: (doc: XlsxXmlDocument, cell: XlsxXmlElement) => void,
): string {
  const { row } = parseCellRef(ref);
  const doc = getOrCreateWorksheetDoc(sheetXml);
  const sheetData = findSheetData(doc);
  const rowEl = ensureRow(doc, sheetData, row);
  const cell = ensureCell(doc, rowEl, ref);
  mutate(doc, cell);
  return serializeWorksheet(doc);
}

function writeInlineStringToCell(
  doc: XlsxXmlDocument,
  cell: XlsxXmlElement,
  value: string,
): void {
  removeChildElements(cell, ["v", "is", "f"]);
  cell.setAttribute("t", "inlineStr");
  const is = doc.createElementNS(SPREADSHEET_NS, "is");
  const t = doc.createElementNS(SPREADSHEET_NS, "t");
  if (needsXmlSpacePreserve(value)) {
    t.setAttribute("xml:space", "preserve");
  }
  t.appendChild(doc.createTextNode(value));
  is.appendChild(t);
  cell.appendChild(is);
}

function writeNumberToCell(
  doc: XlsxXmlDocument,
  cell: XlsxXmlElement,
  value: number,
): void {
  removeChildElements(cell, ["v", "is", "f"]);
  cell.removeAttribute("t");
  const v = doc.createElementNS(SPREADSHEET_NS, "v");
  v.appendChild(doc.createTextNode(String(value)));
  cell.appendChild(v);
}

function clearCellInPlace(cell: XlsxXmlElement): void {
  removeChildElements(cell, ["v", "is", "f"]);
  cell.removeAttribute("t");
}

function preserveFormulaInPlace(
  doc: XlsxXmlDocument,
  cell: XlsxXmlElement,
  ref: string,
  expectedFormula?: string,
  options?: { clearCachedValue?: boolean; cachedValue?: string },
): void {
  const formulas = getElementsByLocalName(cell, "f");
  if (formulas.length === 0) {
    if (!expectedFormula) {
      throw new Error(`Cell ${ref} has no formula to preserve.`);
    }
    const f = doc.createElementNS(SPREADSHEET_NS, "f");
    f.appendChild(doc.createTextNode(expectedFormula));
    cell.appendChild(f);
  } else {
    const text = formulas[0]!.textContent ?? "";
    if (expectedFormula && text.replace(/^=/, "") !== expectedFormula.replace(/^=/, "")) {
      throw new Error(
        `Cell ${ref} formula mismatch: expected ${expectedFormula}, found ${text}`,
      );
    }
  }

  if (options?.clearCachedValue) {
    removeChildElements(cell, ["v"]);
  } else if (options?.cachedValue !== undefined) {
    removeChildElements(cell, ["v"]);
    const v = doc.createElementNS(SPREADSHEET_NS, "v");
    v.appendChild(doc.createTextNode(options.cachedValue));
    cell.appendChild(v);
  }
}

export type BatchCellOp =
  | { ref: string; kind: "inline"; value: string }
  | { ref: string; kind: "number"; value: number }
  | { ref: string; kind: "clear" }
  | {
      ref: string;
      kind: "preserveFormula";
      formula?: string;
      clearCachedValue?: boolean;
      cachedValue?: string;
    };

/** Apply many cell mutations with a single parse/serialize cycle. */
export function applyCellOperations(sheetXml: string, ops: BatchCellOp[]): string {
  const doc = getOrCreateWorksheetDoc(sheetXml);
  const sheetData = findSheetData(doc);
  for (const op of ops) {
    const { row } = parseCellRef(op.ref);
    const rowEl = ensureRow(doc, sheetData, row);
    const cell = ensureCell(doc, rowEl, op.ref);
    if (op.kind === "inline") {
      writeInlineStringToCell(doc, cell, op.value);
    } else if (op.kind === "number") {
      writeNumberToCell(doc, cell, op.value);
    } else if (op.kind === "clear") {
      clearCellInPlace(cell);
    } else {
      preserveFormulaInPlace(doc, cell, op.ref, op.formula, {
        clearCachedValue: op.clearCachedValue,
        cachedValue: op.cachedValue,
      });
    }
  }
  return serializeWorksheet(doc);
}

/**
 * Write an inline string cell. Preserves existing `s` style ID.
 * Removes incompatible `v` / `is` / `f` / `t` value nodes owned by this write.
 */
export function setInlineString(sheetXml: string, ref: string, value: string): string {
  return withCell(sheetXml, ref, (doc, cell) => {
    writeInlineStringToCell(doc, cell, value);
  });
}

/** Write a numeric cell. Preserves style; removes prior value/formula nodes. */
export function setNumber(sheetXml: string, ref: string, value: number): string {
  return withCell(sheetXml, ref, (doc, cell) => {
    writeNumberToCell(doc, cell, value);
  });
}

/**
 * Clear owned cell value while preserving `r` and `s`.
 * Removes `t`, `v`, `is`, `f` so the cell becomes an empty styled stub.
 */
export function clearCellValue(sheetXml: string, ref: string): string {
  return withCell(sheetXml, ref, (_doc, cell) => {
    clearCellInPlace(cell);
  });
}

/**
 * Ensure a formula cell retains its formula text and optionally clear/update cached value.
 * Does not evaluate the formula.
 */
export function preserveFormula(
  sheetXml: string,
  ref: string,
  expectedFormula?: string,
  options?: { clearCachedValue?: boolean; cachedValue?: string },
): string {
  return withCell(sheetXml, ref, (doc, cell) => {
    preserveFormulaInPlace(doc, cell, ref, expectedFormula, options);
  });
}

/** Read logical cell display value for validation (inlineStr / shared index / number / formula cache). */
export function readCellLogicalValue(
  sheetXml: string,
  ref: string,
  sharedStrings?: string[],
): string | number | null {
  const doc = getOrCreateWorksheetDoc(sheetXml);
  return readCellLogicalValueFromDoc(doc, ref, sharedStrings);
}

export function readCellLogicalValueFromDoc(
  doc: XlsxXmlDocument,
  ref: string,
  sharedStrings?: string[],
): string | number | null {
  const sheetData = findSheetData(doc);
  const { row } = parseCellRef(ref);
  const rowEl = findRow(sheetData, row);
  if (!rowEl) return null;
  const cell = findCell(rowEl, ref);
  if (!cell) return null;

  const t = cell.getAttribute("t");
  const isNodes = getElementsByLocalName(cell, "is");
  if (t === "inlineStr" || isNodes.length > 0) {
    const tNodes = isNodes[0]?.getElementsByTagName("t");
    if (tNodes && tNodes.length > 0) {
      return Array.from(
        { length: tNodes.length },
        (_, i) => tNodes.item(i)?.textContent ?? "",
      ).join("");
    }
    return "";
  }

  const vNodes = getElementsByLocalName(cell, "v");
  const vText = vNodes[0]?.textContent ?? null;
  if (t === "s" && vText != null && sharedStrings) {
    const idx = Number(vText);
    return sharedStrings[idx] ?? null;
  }
  if (t === "str" || t === "b") {
    return vText;
  }
  if (vText == null || vText === "") {
    const f = getElementsByLocalName(cell, "f");
    if (f.length > 0) return null;
    return null;
  }
  if (t === "n" || t == null) {
    const n = Number(vText);
    return Number.isFinite(n) ? n : vText;
  }
  return vText;
}

export function parseWorksheetDocument(sheetXml: string): XlsxXmlDocument {
  return getOrCreateWorksheetDoc(sheetXml);
}

export function readCellFormula(sheetXml: string, ref: string): string | null {
  const doc = getOrCreateWorksheetDoc(sheetXml);
  const sheetData = findSheetData(doc);
  const { row } = parseCellRef(ref);
  const rowEl = findRow(sheetData, row);
  if (!rowEl) return null;
  const cell = findCell(rowEl, ref);
  if (!cell) return null;
  const f = getElementsByLocalName(cell, "f")[0];
  return f?.textContent ?? null;
}

export function readCellStyleId(sheetXml: string, ref: string): string | null {
  const doc = getOrCreateWorksheetDoc(sheetXml);
  const sheetData = findSheetData(doc);
  const { row } = parseCellRef(ref);
  const rowEl = findRow(sheetData, row);
  if (!rowEl) return null;
  const cell = findCell(rowEl, ref);
  return cell?.getAttribute("s") ?? null;
}

export function listMergeRanges(sheetXml: string): string[] {
  const doc = getOrCreateWorksheetDoc(sheetXml);
  const merges = doc.getElementsByTagName("mergeCell");
  const out: string[] = [];
  for (let i = 0; i < merges.length; i += 1) {
    const ref = merges.item(i)!.getAttribute("ref");
    if (ref) out.push(ref);
  }
  return out;
}

export function parseSharedStringsXml(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const sis = doc.getElementsByTagName("si");
  const out: string[] = [];
  for (let i = 0; i < sis.length; i += 1) {
    const si = sis.item(i)!;
    const tNodes = si.getElementsByTagName("t");
    let text = "";
    for (let j = 0; j < tNodes.length; j += 1) {
      text += tNodes.item(j)?.textContent ?? "";
    }
    out.push(text);
  }
  return out;
}

/** Blank specific shared-string entries by index without reordering. */
export function blankSharedStringEntries(xml: string, indices: number[]): string {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const sis = doc.getElementsByTagName("si");
  for (const index of indices) {
    const si = sis.item(index);
    if (!si) continue;
    const tNodes = si.getElementsByTagName("t");
    for (let j = 0; j < tNodes.length; j += 1) {
      const t = tNodes.item(j)!;
      while (t.firstChild) t.removeChild(t.firstChild);
    }
  }
  return new XMLSerializer().serializeToString(doc);
}
