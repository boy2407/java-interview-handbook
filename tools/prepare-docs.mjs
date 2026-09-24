// Convert content/*.md (simplified markdown per FORMAT_SPEC.md) into docs/*.md pages for VitePress.
// Run: node tools/prepare-docs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const DOCS_DIR = path.join(ROOT, 'docs');

// slug + sidebar group for each source file, in reading order
const PAGES = [
  { file: 'ch00.md', slug: 'loi-mo-dau', group: 'Bắt đầu' },
  { file: 'fb1.md', slug: 'nen-tang-1', group: 'Nền tảng Fresher' },
  { file: 'fb2.md', slug: 'nen-tang-2', group: 'Nền tảng Fresher' },
  { file: 'ch01.md', slug: 'chuong-01', group: 'Chuyên sâu' },
  { file: 'ch02.md', slug: 'chuong-02', group: 'Chuyên sâu' },
  { file: 'ch03.md', slug: 'chuong-03', group: 'Chuyên sâu' },
  { file: 'ch04.md', slug: 'chuong-04', group: 'Chuyên sâu' },
  { file: 'ch05.md', slug: 'chuong-05', group: 'Chuyên sâu' },
  { file: 'ch06.md', slug: 'chuong-06', group: 'Chuyên sâu' },
  { file: 'ch07.md', slug: 'chuong-07', group: 'Chuyên sâu' },
  { file: 'ch08.md', slug: 'chuong-08', group: 'Chuyên sâu' },
  { file: 'ch09.md', slug: 'chuong-09', group: 'Chuyên sâu' },
  { file: 'ch10.md', slug: 'chuong-10', group: 'Chuyên sâu' },
  { file: 'ch11.md', slug: 'chuong-11', group: 'Chuyên sâu' },
  { file: 'ch12.md', slug: 'chuong-12', group: 'Chuyên sâu' },
  { file: 'ch13.md', slug: 'chuong-13', group: 'Chuyên sâu' },
  { file: 'ch14.md', slug: 'phu-luc', group: 'Phụ lục' },
];

const CALLOUT_CONTAINER = {
  EXPECT: ['info', 'Người phỏng vấn muốn kiểm tra'],
  TIP: ['tip', 'Mẹo từ người phỏng vấn'],
  TRAP: ['danger', 'Bẫy thường gặp'],
  DEEP: ['details', 'Câu hỏi đào sâu'],
  NOTE: ['warning', 'Ghi chú'],
  RECALL: ['recall', 'Nhắc lại kiến thức'],
};

function escYaml(s) {
  return s.replace(/"/g, '\\"');
}

// Split text into blocks on blank lines, keeping multi-line code fences as a single block.
function splitBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  let buf = [];
  let inFence = false;
  const flush = () => { if (buf.length) { blocks.push(buf.join('\n')); buf = []; } };
  for (const line of lines) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    if (!inFence && line.trim() === '') { flush(); continue; }
    buf.push(line);
  }
  flush();
  return blocks;
}

function transformCallouts(md) {
  // > [!KIND]\n> line 1\n> line 2 ...  ->  ::: kind Label\nline 1\nline 2\n:::
  const blocks = splitBlocks(md);
  const out = [];
  for (const block of blocks) {
    if (block.startsWith('>')) {
      const raw = block.split('\n').map(l => l.replace(/^>\s?/, ''));
      const m = raw[0].match(/^\[!(\w+)\]\s*(.*)$/);
      if (m) {
        const kind = m[1].toUpperCase();
        const [container, label] = CALLOUT_CONTAINER[kind] || ['tip', kind];
        if (m[2]) raw[0] = m[2]; else raw.shift();
        out.push(`::: ${container} ${label}\n${raw.join('\n')}\n:::`);
        continue;
      }
    }
    out.push(block);
  }
  return out.join('\n\n');
}

// Wrap the answer after "### Câu hỏi: ...?" (up to the next heading) in a ::: answer container
// so self-check mode can hide/show it.
function wrapAnswers(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^### Câu hỏi\b/.test(line)) {
      out.push(line);
      i++;
      let body = [];
      let inFence = false;
      while (i < lines.length && (inFence || !/^#{1,3} /.test(lines[i]))) {
        if (/^```/.test(lines[i].trim())) inFence = !inFence;
        body.push(lines[i]);
        i++;
      }
      // drop trailing blank lines from the body
      while (body.length && body[body.length - 1].trim() === '') body.pop();
      // "Read the code" questions: the part before the **Đáp án:** line is the prompt, always shown
      const marker = body.findIndex(l => l.trim().startsWith('**Đáp án:**'));
      if (marker >= 0) {
        out.push(...body.slice(0, marker));
        body = body.slice(marker);
      }
      // 4-colon fence because it may contain TIP/TRAP/NOTE/DEEP callouts using 3-colon fences (nesting)
      out.push('', ':::: answer', ...body, '::::', '');
      continue;
    }
    out.push(line);
    i++;
  }
  return out.join('\n');
}

// - [ ] item  ->  checkbox with data-ck to persist progress in localStorage
function transformChecklist(md, pageSlug) {
  const lines = md.split('\n');
  let ckIndex = 0;
  let inFence = false;
  return lines.map(line => {
    if (/^```/.test(line.trim())) inFence = !inFence;
    if (inFence) return line;
    const m = line.match(/^(\s*)- \[ \] (.*)$/);
    if (!m) return line;
    const id = `${pageSlug}-${ckIndex++}`;
    return `${m[1]}<label class="ck"><input type="checkbox" class="ck-box" data-ck-id="${id}"> <span>${m[2]}</span></label>`;
  }).join('\n');
}

function firstHeadingTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Trang';
}

fs.mkdirSync(DOCS_DIR, { recursive: true });

const navItems = [];
for (const { file, slug, group } of PAGES) {
  const srcPath = path.join(CONTENT_DIR, file);
  if (!fs.existsSync(srcPath)) { console.warn('Missing source file:', file); continue; }
  let md = fs.readFileSync(srcPath, 'utf8').replace(/\r/g, '');
  const title = firstHeadingTitle(md);

  md = transformCallouts(md);
  md = wrapAnswers(md);
  md = transformChecklist(md, slug);

  const frontmatter = [
    '---',
    `title: "${escYaml(title)}"`,
    'outline: [2, 3]',
    '---',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(DOCS_DIR, `${slug}.md`), frontmatter + md + '\n');
  navItems.push({ file, slug, group, title });
}

fs.writeFileSync(
  path.join(DOCS_DIR, '.vitepress', 'nav-data.json'),
  JSON.stringify(navItems, null, 2),
);

console.log(`Generated ${navItems.length} pages into docs/.`);
