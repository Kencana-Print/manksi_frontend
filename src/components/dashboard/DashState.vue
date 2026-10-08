<script setup lang="ts">
import { inject, ref } from "vue";
import type { Ref } from "vue";

const hasFailures = inject<Readonly<Ref<boolean>>>(
  "dashHasFailures",
  ref(false),
);

withDefaults(
  defineProps<{
    kind: "loading" | "empty" | "error";
    rows?: number;
    message?: string;
    hint?: string;
    retryLabel?: string;
  }>(),
  { rows: 4, message: "", hint: "", retryLabel: "Coba lagi" },
);
const emit = defineEmits<{ (e: "retry"): void }>();
const widths = ["92%", "78%", "86%", "64%", "74%"];
</script>

<template>
  <div
    v-if="kind === 'loading'"
    class="ds-skel"
    role="status"
    aria-live="polite"
  >
    <span class="ds-sr">Memuat data</span>
    <div v-for="n in rows" :key="n" class="ds-skel-row">
      <span class="ds-skel-bar ds-skel-bar--tag" />
      <span
        class="ds-skel-bar"
        :style="{ width: widths[(n - 1) % widths.length] }"
      />
    </div>
  </div>
  <div
    v-else
    class="ds-msg"
    :class="`ds-msg--${kind}`"
    :role="kind === 'error' ? 'alert' : undefined"
  >
    <div class="ds-msg-title">
      {{
        message || (kind === "error" ? "Gagal memuat data." : "Belum ada data.")
      }}
    </div>
    <div
      v-if="kind === 'empty' && hasFailures"
      class="ds-msg-hint ds-msg-hint--warn"
    >
      Ada panel yang gagal dimuat, data ini mungkin belum lengkap.
    </div>
    <div v-if="hint || kind === 'error'" class="ds-msg-hint">
      {{ hint || "Periksa koneksi, lalu coba lagi." }}
    </div>
    <button
      v-if="kind === 'error'"
      type="button"
      class="ds-msg-btn"
      @click="emit('retry')"
    >
      {{ retryLabel }}
    </button>
  </div>
</template>

<style scoped>
.ds-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.ds-skel {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ds-skel-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ds-skel-bar {
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(
    90deg,
    var(--dsh-fill) 25%,
    var(--dsh-line) 37%,
    var(--dsh-fill) 63%
  );
  background-size: 400% 100%;
  animation: ds-shimmer 1.4s ease infinite;
}
.ds-skel-bar--tag {
  width: 54px;
  flex-shrink: 0;
}
@keyframes ds-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
.ds-msg {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}
.ds-msg-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--dsh-ink-2);
}
.ds-msg--error .ds-msg-title {
  font-weight: 600;
  color: var(--dsh-bad);
}
.ds-msg-hint {
  font-size: 11px;
  color: var(--dsh-ink-3);
}
.ds-msg-hint--warn {
  color: var(--dsh-warn);
}
.ds-msg-btn {
  margin-top: 8px;
  min-height: 32px;
  padding: 0 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--dsh-accent);
  background: var(--dsh-surface);
  border: 1px solid var(--dsh-line);
  border-radius: 6px;
  cursor: pointer;
}
.ds-msg-btn:hover {
  border-color: var(--dsh-accent);
}
.ds-msg-btn:focus-visible {
  outline: 2px solid var(--dsh-accent);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .ds-skel-bar {
    animation: none;
  }
}
</style>
