// Attach per-page behavior after VitePress renders content:
// 1) Review checklist: read/write tick state in localStorage, show a progress bar.
// 2) Self-check mode: insert a "show answer" button before each .qa-answer block.
// Safe under SSR (no window) and when localStorage is blocked (private mode).

const CK_KEY = 'jih-checklist';

function safeGetStore(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function safeSetStore(store: Record<string, boolean>) {
  try {
    localStorage.setItem(CK_KEY, JSON.stringify(store));
  } catch {
    /* ignore if saving fails; checkboxes still work for the current session */
  }
}

function setupChecklist(container: HTMLElement) {
  const boxes = container.querySelectorAll<HTMLInputElement>('input.ck-box[data-ck-id]');
  if (!boxes.length) return;

  const store = safeGetStore();
  const updateBar = () => {
    let bar = container.querySelector<HTMLDivElement>('.ck-progress');
    const total = boxes.length;
    let done = 0;
    boxes.forEach((b) => { if (b.checked) done++; });
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'ck-progress';
      bar.innerHTML = '<div class="ck-progress-track"><div class="ck-progress-fill"></div></div><span class="ck-progress-text"></span>';
      boxes[0].closest('label')?.parentElement?.insertBefore(bar, boxes[0].closest('label'));
    }
    const fill = bar.querySelector<HTMLDivElement>('.ck-progress-fill')!;
    const text = bar.querySelector<HTMLSpanElement>('.ck-progress-text')!;
    const pct = total ? Math.round((done / total) * 100) : 0;
    fill.style.width = `${pct}%`;
    text.textContent = `Đã nắm ${done}/${total} mục (${pct}%)`;
  };

  boxes.forEach((box) => {
    const id = box.dataset.ckId!;
    box.checked = !!store[id];
    box.addEventListener('change', () => {
      store[id] = box.checked;
      safeSetStore(store);
      updateBar();
    });
  });

  updateBar();
}

function setupAnswerToggles(container: HTMLElement) {
  const answers = container.querySelectorAll<HTMLElement>('.qa-answer');
  answers.forEach((el) => {
    if (el.dataset.qaWired === '1') return;
    el.dataset.qaWired = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qa-reveal';
    btn.textContent = 'Hiện gợi ý trả lời';
    btn.addEventListener('click', () => {
      el.classList.add('qa-revealed');
    });
    el.parentElement?.insertBefore(btn, el);
  });
}

export function enhancePage() {
  if (typeof document === 'undefined') return;
  const content = document.querySelector<HTMLElement>('.vp-doc');
  if (!content) return;
  setupChecklist(content);
  setupAnswerToggles(content);
}
