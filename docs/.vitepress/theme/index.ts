import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { useRoute } from 'vitepress';
import { h, watch, nextTick } from 'vue';
import QuizToggle from './QuizToggle.vue';
import { enhancePage } from './progress';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('QuizToggle', QuizToggle);
  },
  setup() {
    const route = useRoute();
    // On route change (including SPA navigation without reload) -> re-attach checklist + self-check buttons.
    watch(
      () => route.path,
      () => nextTick(enhancePage),
      { immediate: true },
    );
  },
  Layout: () => h(DefaultTheme.Layout, null, {
    'nav-bar-content-after': () => h(QuizToggle),
  }),
} satisfies Theme;
