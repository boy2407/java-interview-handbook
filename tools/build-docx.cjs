// Convert content/ch*.md (simplified markdown per FORMAT_SPEC.md) into a single .docx file
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, LevelFormat, TableOfContents, Footer, Header, PageNumber,
  PageBreak, TabStopType,
} = require('docx');

const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'public', 'cam-nang-java-backend.docx');
const CONTENT_DIR = path.join(__dirname, '..', 'content');

const FONT = 'Calibri';
const MONO = 'Consolas';
const PAGE_W = 11906, PAGE_H = 16838, MARGIN = 1134; // A4, 2cm margins
const CONTENT_W = PAGE_W - 2 * MARGIN;
const C = { navy: '1F3864', blue: '2E75B6', gray: '595959', codeBg: 'F4F6F8', codeBorder: 'C9D1DA', tblHead: 'DCE6F1', tblBorder: 'A6B4C4' };

const CALLOUTS = {
  EXPECT: { label: 'NGƯỜI PHỎNG VẤN MUỐN KIỂM TRA', color: '1F4E79', bg: 'EAF1FB' },
  TIP:    { label: 'MẸO TỪ NGƯỜI PHỎNG VẤN',       color: '375623', bg: 'EEF6E8' },
  TRAP:   { label: 'BẪY THƯỜNG GẶP',                color: 'A50021', bg: 'FDEDEE' },
  DEEP:   { label: 'CÂU HỎI ĐÀO SÂU',               color: '5B2C83', bg: 'F3ECF9' },
  NOTE:   { label: 'GHI CHÚ',                       color: '7F6000', bg: 'FFF6DB' },
  RECALL: { label: 'NHẮC LẠI KIẾN THỨC',            color: '0F6B6B', bg: 'E6F4F3' },
};

// ---------- inline ----------
function inline(text, base = {}) {
  const runs = [];
  const re = /(`[^`]+`|\*\*.+?\*\*|\*[^*\s][^*]*?\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith('`')) {
      runs.push(new TextRun({ text: tok.slice(1, -1), ...base, font: MONO, size: (base.size || 22) - 2, color: base.color || 'C7254E' }));
    } else if (tok.startsWith('**')) {
      runs.push(...inline(tok.slice(2, -2), { ...base, bold: true }));
    } else {
      runs.push(...inline(tok.slice(1, -1), { ...base, italics: true }));
    }
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), ...base }));
  return runs;
}

// ---------- block builders ----------
let listInstance = 0;
const para = (text, opts = {}) => new Paragraph({ children: inline(text, opts.run), spacing: { after: 120, line: 288 }, ...opts.p });

function listItem(text, level, kind, instance, run) {
  const ref = kind === 'num' ? 'numbers' : kind === 'check' ? 'checks' : 'bullets';
  return new Paragraph({
    children: inline(text, run),
    numbering: { reference: ref, level, instance: kind === 'num' ? instance : undefined },
    spacing: { after: 60, line: 276 },
  });
}

function codeBlock(lang, lines) {
  // single-cell table: avoids docx-js <w:pBdr> ordering bug and keeps a seamless background
  const border = { style: BorderStyle.SINGLE, size: 4, color: C.codeBorder };
  const paras = lines.map((ln, i) => {
    const t = ln.trimStart();
    const isComment = t.startsWith('//') || t.startsWith('--') || (t.startsWith('#') && lang !== 'java') || t.startsWith('/*') || t.startsWith('*');
    return new Paragraph({
      children: [new TextRun({ text: ln.length ? ln : ' ', font: MONO, size: 18, color: isComment ? '6A737D' : '1F2328' })],
      spacing: { before: 0, after: 0, line: 240 },
      keepNext: i < lines.length - 1 && lines.length <= 30,
      keepLines: true,
    });
  });
  return [
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [CONTENT_W],
      rows: [new TableRow({ cantSplit: lines.length <= 30, children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.codeBg },
        borders: { top: border, bottom: border, right: border, left: { style: BorderStyle.SINGLE, size: 18, color: C.blue } },
        margins: { top: 80, bottom: 80, left: 160, right: 120 },
        children: paras,
      })] })],
    }),
    new Paragraph({ children: [], spacing: { after: 120 } }),
  ];
}

function tableBlock(rows) {
  const parse = r => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
  const head = parse(rows[0]);
  const body = rows.slice(2).map(parse);
  const n = head.length;
  // column width based on content length (with a minimum)
  const lens = head.map((h, i) => Math.max(h.length, ...body.map(r => (r[i] || '').length)));
  const weights = lens.map(l => Math.max(8, Math.min(l, 60)));
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map(w => Math.floor(CONTENT_W * w / sum));
  widths[n - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
  const b = { style: BorderStyle.SINGLE, size: 4, color: C.tblBorder };
  const borders = { top: b, bottom: b, left: b, right: b };
  const cell = (txt, i, isHead) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    borders,
    shading: isHead ? { type: ShadingType.CLEAR, color: 'auto', fill: C.tblHead } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: inline(txt || '', { size: 20, bold: isHead || undefined, color: isHead ? C.navy : undefined }), spacing: { after: 0, line: 264 } })],
  });
  return [
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, i, true)) }),
        ...body.map(r => new TableRow({ cantSplit: true, children: head.map((_, i) => cell(r[i], i, false)) })),
      ],
    }),
    new Paragraph({ children: [], spacing: { after: 120 } }),
  ];
}

function calloutBlock(kind, lines) {
  const cfg = CALLOUTS[kind] || CALLOUTS.NOTE;
  const run = { size: 21 };
  const children = [new Paragraph({ children: [new TextRun({ text: cfg.label, bold: true, color: cfg.color, size: 18 })], spacing: { after: 80 }, keepNext: true })];
  const inst = ++listInstance;
  for (const l of lines) {
    if (!l.trim()) continue;
    let m;
    if ((m = l.match(/^(\s*)- (.*)$/))) children.push(listItem(m[2], m[1].length >= 2 ? 1 : 0, 'bullet', 0, run));
    else if ((m = l.match(/^\s*\d+\. (.*)$/))) children.push(listItem(m[1], 0, 'num', inst, run));
    else children.push(new Paragraph({ children: inline(l, run), spacing: { after: 80, line: 276 } }));
  }
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return [
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [CONTENT_W],
      rows: [new TableRow({ cantSplit: false, children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: cfg.bg },
        borders: { top: none, bottom: none, right: none, left: { style: BorderStyle.SINGLE, size: 24, color: cfg.color } },
        margins: { top: 100, bottom: 60, left: 180, right: 140 },
        children,
      })] })],
    }),
    new Paragraph({ children: [], spacing: { after: 120 } }),
  ];
}

// ---------- markdown parser ----------
function parseFile(md, isFirst) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  let numInst = null;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; numInst = null; continue; }
    let m;
    if ((m = line.match(/^# (.*)$/))) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(m[1])], pageBreakBefore: !isFirst }));
      i++; continue;
    }
    if ((m = line.match(/^## (.*)$/))) { out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: inline(m[1]), keepNext: true })); i++; continue; }
    if ((m = line.match(/^###+ (.*)$/))) { out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: inline(m[1]), keepNext: true })); i++; continue; }
    if ((m = line.match(/^```(\w*)/))) {
      const lang = m[1]; const buf = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++].replace(/\t/g, '    '));
      i++;
      out.push(...codeBlock(lang, buf));
      continue;
    }
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      const km = buf[0] && buf[0].match(/^\[!(\w+)\]\s*(.*)$/);
      const kind = km ? km[1].toUpperCase() : 'NOTE';
      if (km && km[2]) buf[0] = km[2]; else if (km) buf.shift();
      out.push(...calloutBlock(kind, buf));
      continue;
    }
    if (line.trim().startsWith('|')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) buf.push(lines[i++]);
      out.push(...tableBlock(buf));
      continue;
    }
    if ((m = line.match(/^(\s*)- \[[ xX]?\] (.*)$/))) { out.push(listItem(m[2], 0, 'check')); i++; continue; }
    if ((m = line.match(/^(\s*)[-*] (.*)$/))) { out.push(listItem(m[2], m[1].length >= 2 ? 1 : 0, 'bullet')); i++; continue; }
    if ((m = line.match(/^(\s*)\d+\. (.*)$/))) {
      if (m[1].length >= 2) { out.push(listItem(m[2], 1, 'bullet')); i++; continue; }
      if (numInst === null) numInst = ++listInstance;
      out.push(listItem(m[2], 0, 'num', numInst)); i++;
      // allow nested bullets separated by blank lines to keep numbering
      continue;
    }
    out.push(para(line));
    i++;
  }
  return out;
}

// ---------- cover ----------
function cover() {
  const center = (text, run, after = 200) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after }, children: [new TextRun({ text, ...run })] });
  return [
    new Paragraph({ children: [], spacing: { before: 2400 } }),
    center('CẨM NANG PHỎNG VẤN', { font: FONT, size: 30, color: C.blue, bold: true, characterSpacing: 40 }, 120),
    center('JAVA BACKEND', { font: FONT, size: 64, color: C.navy, bold: true }, 160),
    center('Từ nền tảng Fresher đến lập trình viên 2–4 năm kinh nghiệm', { font: FONT, size: 28, color: C.gray, italics: true }, 600),
    new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.blue, space: 1 } }, indent: { left: 3000, right: 3000 }, children: [] }),
    new Paragraph({ children: [], spacing: { after: 400 } }),
    center('Học gì · Học sâu tới đâu · Người phỏng vấn thực sự muốn nghe gì', { font: FONT, size: 24, color: C.gray }, 120),
    center('Java 17/21 · Spring Boot 3 · JPA · SQL · Concurrency · Microservices · System Design · Behavioral', { font: FONT, size: 20, color: C.gray }, 2800),
    center('Phiên bản 09/2026', { font: FONT, size: 20, color: C.gray }, 0),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ children: [new TextRun({ text: 'MỤC LỤC', bold: true, size: 32, color: C.navy })], spacing: { after: 240 } }),
    new TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '1-2' }),
  ];
}

// ---------- build ----------
// Order: preface → Fresher fundamentals (fb*) → chapters ch01..ch14
const chapters = fs.readdirSync(CONTENT_DIR).filter(f => /^ch\d+\.md$/.test(f)).sort();
const fresher = fs.readdirSync(CONTENT_DIR).filter(f => /^fb\d+\.md$/.test(f)).sort();
const files = [...chapters.filter(f => f === 'ch00.md'), ...fresher, ...chapters.filter(f => f !== 'ch00.md')];
const body = [];
files.forEach((f, idx) => body.push(...parseFile(fs.readFileSync(path.join(CONTENT_DIR, f), "utf8"), idx === 0)));

const bulletLevels = (sym) => [0, 1].map(level => ({
  level, format: LevelFormat.BULLET, text: sym[level], alignment: AlignmentType.LEFT,
  style: { paragraph: { indent: { left: 360 + level * 360, hanging: 260 } } },
}));

const doc = new Document({
  creator: 'Java Backend Interview Handbook',
  title: 'Cẩm nang phỏng vấn Java Backend (Fresher đến 2–4 năm kinh nghiệm)',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, color: C.navy, font: FONT },
        paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.blue, space: 6 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, color: C.blue, font: FONT },
        paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 23, bold: true, color: C.navy, font: FONT },
        paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: bulletLevels(['•', '–']) },
      { reference: 'checks', levels: bulletLevels(['☐', '☐']) },
      { reference: 'numbers', levels: [0, 1].map(level => ({ level, format: LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360 + level * 360, hanging: 300 } } } })) },
    ],
  },
  sections: [
    { properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      children: cover() },
    { properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }, pageNumbers: { start: 1 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Cẩm nang phỏng vấn Java Backend · Fresher đến 2–4 năm kinh nghiệm', size: 16, color: '8C8C8C' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '8C8C8C' })] })] }) },
      children: body },
  ],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log('Wrote', OUT, files.join(',')); });
