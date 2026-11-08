import "server-only";
import { deflateRawSync } from "node:zlib";

/**
 * An Excel workbook (.xlsx), written by hand: an owner's customers («تحميل البيانات», app/api/export).
 * Not a CSV — Excel in French (most computers here) opens a comma-separated file as one column, and
 * Arabic as gibberish without the right byte at its start. This opens the same in Excel, Google Sheets
 * and a phone's own viewer: every sheet right to left; a list's first row coloured, bold and frozen,
 * with a filter on each column; dates as real dates (Tunis time), so they sort. An .xlsx is a zip of a
 * few XML files, deflated here.
 */
export type Cell =
  | string
  | number
  | null
  /** a moment (an ISO string, shown in Tunis time): with its hour, or the day alone */
  | { at: string | null; time?: boolean }
  /** written bold; `big`: the sheet's title */
  | { bold: string | number; big?: boolean };

export type Sheet = {
  /** 31 characters at most, none of : \ / ? * [ ] */
  name: string;
  /** a list's head: coloured, frozen, a filter on each column (none: a sheet of lines, like a summary) */
  head?: string[];
  rows: Cell[][];
  /** each column's width, in characters */
  widths: number[];
};

// the styles (styles.xml, cellXfs): their places
const HEAD = 1;
const MOMENT = 2;
const DAY = 3;
const BOLD = 4;
const TITLE = 5;

const esc = (s: string) =>
  s
    // characters XML cannot hold at all
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** A, B … Z, AA */
const colName = (col: number) => {
  let s = "";
  for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const ref = (col: number, row: number) => `${colName(col)}${row}`;

const TUNIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
/** an instant → Excel's serial number of the same wall-clock moment in Tunis (days since 30 Dec 1899) */
function serial(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = Object.fromEntries(TUNIS.formatToParts(d).map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) / 86_400_000 + 25_569;
}

function cell(v: Cell, c: number, r: number, style = 0): string {
  const at = (s: number) => (s ? ` s="${s}"` : "");
  if (v === null || v === "") return "";
  if (typeof v === "number") return Number.isFinite(v) ? `<c r="${ref(c, r)}"${at(style)}><v>${v}</v></c>` : "";
  if (typeof v === "string") return `<c r="${ref(c, r)}" t="inlineStr"${at(style)}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  if ("at" in v) {
    const n = v.at ? serial(v.at) : null;
    if (n === null) return "";
    return `<c r="${ref(c, r)}" s="${v.time ? MOMENT : DAY}"><v>${v.time ? n.toFixed(6) : Math.floor(n)}</v></c>`;
  }
  return cell(v.bold, c, r, v.big ? TITLE : BOLD);
}

function sheetXml(s: Sheet): string {
  const line = (cells: Cell[], r: number, style = 0) => `<row r="${r}">${cells.map((v, c) => cell(v, c, r, style)).join("")}</row>`;
  const first = s.head ? 2 : 1;
  const body = `${s.head ? line(s.head, 1, HEAD) : ""}${s.rows.map((r, i) => line(r, i + first)).join("")}`;
  const pane = s.head ? `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` : "";
  const cols = s.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  // a filter over the whole list, its head included (never on an empty list: nothing to filter)
  const filter = s.head && s.rows.length ? `<autoFilter ref="A1:${ref(s.head.length - 1, s.rows.length + 1)}"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData>${body}</sheetData>${filter}</worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF6C47FF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF6C47FF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function parts(sheets: Sheet[]): [string, string][] {
  const names = sheets.map((s) => s.name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31));
  // a filter's range, named as Excel names it (hidden): without it Excel may drop the filter
  const defined = sheets
    .map((s, i) => (s.head && s.rows.length ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(names[i]!.replace(/'/g, "''"))}'!$A$1:$${colName(s.head.length - 1)}$${s.rows.length + 1}</definedName>` : ""))
    .join("");
  return [
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView rightToLeft="1" activeTab="0"/></bookViews><sheets>${names
        .map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join("")}</sheets>${defined ? `<definedNames>${defined}</definedNames>` : ""}</workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    ["xl/styles.xml", STYLES],
    ...sheets.map((s, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]),
  ];
}

/* ---------- the zip around it (deflated entries, UTF-8 names) ---------- */

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zip(files: [string, string][]): Buffer {
  const DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // a fixed date: the file says nothing about when
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of files) {
    const n = Buffer.from(name, "utf8");
    const raw = Buffer.from(text, "utf8");
    const data = deflateRawSync(raw, { level: 9 });
    const crc = crc32(raw);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(0x0800, 6);
    head.writeUInt16LE(8, 8);
    head.writeUInt16LE(0, 10);
    head.writeUInt16LE(DATE, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(data.length, 18);
    head.writeUInt32LE(raw.length, 22);
    head.writeUInt16LE(n.length, 26);
    head.writeUInt16LE(0, 28);
    locals.push(head, n, data);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(DATE, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(raw.length, 24);
    dir.writeUInt16LE(n.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, n);
    offset += head.length + n.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

/** The whole file: its sheets in order, the first one open. */
export function workbook(sheets: Sheet[]): Buffer {
  return zip(parts(sheets));
}
