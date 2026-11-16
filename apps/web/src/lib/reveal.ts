import type { Directive } from "vue";

/**
 * v-reveal: o elemento entra suave (sobe e aparece) quando chega na tela.
 * Aceita um atraso em ms: v-reveal="120". Sem IntersectionObserver, ou com
 * movimento reduzido, aparece direto.
 */
let observer: IntersectionObserver | null = null;

function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-visible");
        observer!.unobserve(e.target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  return observer;
}

export const reveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, { value }) {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;
    el.classList.add("reveal");
    if (value) el.style.transitionDelay = `${value}ms`;
    getObserver().observe(el);
  },
  unmounted(el) {
    observer?.unobserve(el);
  },
};
