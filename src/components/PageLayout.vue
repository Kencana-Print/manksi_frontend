<script setup lang="ts">
import { computed } from "vue";
import { IconFileText } from "@tabler/icons-vue";

interface Props {
  title: string;
  icon?: any;
  loading?: boolean;
  desktopMode?: boolean;
  maxWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  icon: IconFileText, // default Tabler component
  loading: false,
  desktopMode: true,
  maxWidth: "100%",
});

const isTablerIcon = computed(() => typeof props.icon !== "string");

const emit = defineEmits<{
  "update:loading": [value: boolean];
}>();

const containerClass = computed(() => ({
  "page-container": true,
  "desktop-mode": props.desktopMode,
  "modern-mode": !props.desktopMode,
}));

const loadingModel = computed({
  get: () => props.loading,
  set: (value: boolean) => emit("update:loading", value),
});
</script>

<template>
  <div :class="containerClass" :style="{ maxWidth: maxWidth }">
    <!-- ── Title bar (kiri: ikon + judul, kanan: slot header-actions) ── -->
    <!-- Ini BUKAN scroll container, jadi sticky di children akan bekerja -->
    <div class="page-header">
      <div class="page-title-section">
        <component
          v-if="isTablerIcon"
          :is="icon"
          :size="18"
          :stroke-width="1.6"
          class="title-icon"
        />
        <v-icon v-else size="small" class="title-icon">{{ icon }}</v-icon>
        <h1 class="page-title">{{ title }}</h1>
      </div>

      <!--
        Slot header-actions ada di sini.
        Karena .page-header berada di LUAR .content-wrapper (yang overflow:auto),
        header ini sudah otomatis "sticky" — dia tidak ikut scroll sama sekali.
        BaseBrowse tidak perlu position:sticky lagi.
      -->
      <div class="header-actions" v-if="$slots['header-actions']">
        <slot name="header-actions" />
      </div>
    </div>

    <!-- ── Area Konten ── -->
    <div class="content-area">
      <!-- Loading Overlay -->
      <v-overlay
        v-model="loadingModel"
        contained
        persistent
        class="d-flex align-center justify-center"
      >
        <v-progress-circular indeterminate color="primary" />
      </v-overlay>

      <!--
        .content-wrapper adalah satu-satunya scroll container.
        Komponen anak (BaseBrowse) mengatur overflow di dalamnya sendiri
        via table-wrap, sehingga wrapper ini cukup flex column tanpa overflow.
      -->
      <div class="content-wrapper">
        <slot />
      </div>

      <!-- Footer / Status Bar -->
      <div v-if="$slots.footer" class="content-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Container utama ── */
.page-container {
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  width: 100%;
}

.desktop-mode {
  height: calc(100vh - 64px);
  padding: 8px 12px;
  gap: 6px;
}

.modern-mode {
  padding: 24px;
  gap: 16px;
}

/* ── Header: judul + tombol aksi ── */
.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 36px;
}

.page-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.page-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.modern-mode .page-title {
  font-size: 1.25rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Area konten ── */
.content-area {
  flex: 1 1 0;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  overflow: hidden;
}

.content-wrapper {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: var(--wrapper-padding, 16px);
  overflow: hidden;
}

.desktop-mode .content-wrapper {
  --wrapper-padding: 0;
}

/* ── Footer / Status Bar ── */
.content-footer {
  flex-shrink: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
