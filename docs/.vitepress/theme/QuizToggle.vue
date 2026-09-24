<script setup lang="ts">
// Toggle for self-check mode: when on, every sample answer block (.qa-answer) is hidden
// and replaced by a "show answer" button, so users answer on their own before revealing it.
import { ref, onMounted, watch } from 'vue';

const KEY = 'jih-quiz-mode';
const enabled = ref(false);

function applyClass() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('quiz-mode', enabled.value);
}

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function persist(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* localStorage may be blocked (private mode) — ignore; we just lose the remembered choice */
  }
}

onMounted(() => {
  enabled.value = read();
  applyClass();
});

watch(enabled, (v) => {
  applyClass();
  persist(v);
});

function toggle() {
  enabled.value = !enabled.value;
}
</script>

<template>
  <button
    class="quiz-toggle"
    type="button"
    :aria-pressed="enabled"
    :title="enabled ? 'Đang bật: đáp án bị ẩn cho tới khi bạn bấm xem' : 'Bật để tự kiểm tra: ẩn đáp án, tự trả lời trước khi xem gợi ý'"
    @click="toggle"
  >
    <span class="quiz-toggle-dot" :class="{ on: enabled }" />
    <span class="quiz-toggle-label">Tự kiểm tra</span>
  </button>
</template>
