<script setup lang="ts">
import { computed } from "vue";

interface Props {
  title: string;
  icon?: string;
  loading?: boolean;
  desktopMode?: boolean;
  maxWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  icon: "mdi-file-document-outline",
  loading: false,
  desktopMode: true,
  maxWidth: "100%",
});

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
        <v-icon size="small" class="title-icon">{{ icon }}</v-icon>
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
  height: calc(100vh - 64px); /* sesuai app bar height 64px */
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
  color: #555;
}

.page-title {
  font-size: 1rem;
  font-weight: 600;
  color: #212121;
  margin: 0;
}

.modern-mode .page-title {
  font-size: 1.25rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Tidak perlu sticky — sudah di luar scroll container */
}

/* ── Area konten ── */
.content-area {
  flex: 1 1 0;
  min-height: 0; /* wajib untuk flex child bisa scroll */
  position: relative;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  overflow: hidden; /* clip konten agar tidak keluar border-radius */
}

/*
  .content-wrapper TIDAK overflow:auto di sini.
  Biarkan komponen anak (BaseBrowse) yang mengatur scrollnya sendiri
  via .table-wrap dan .browse-content.
  Ini mencegah double scroll container yang membingungkan sticky.
*/
.content-wrapper {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: var(--wrapper-padding, 16px);
  overflow: hidden; /* biarkan anak yang scroll */
}

.desktop-mode .content-wrapper {
  --wrapper-padding: 0;
}

/* ── Footer / Status Bar ── */
.content-footer {
  flex-shrink: 0;
  border-top: 1px solid #e0e0e0;
}
</style>
