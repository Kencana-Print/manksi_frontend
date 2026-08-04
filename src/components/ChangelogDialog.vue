<script setup lang="ts">
import { computed } from "vue";
import type { ChangelogEntry } from "@/services/system/versionService";
import { IconSparkles, IconBugOff, IconAdjustments } from "@tabler/icons-vue";

const model = defineModel<boolean>({ default: false });

const props = defineProps<{
  entries: ChangelogEntry[];
  isLoaded: boolean;
  // ⚠️ baru: kalau true, tampilkan banner + tombol reload di atas/bawah
  showReloadPrompt?: boolean;
}>();

const emit = defineEmits<{ reload: []; dismiss: [] }>();

type ChangelogType = "added" | "fixed" | "changed";

const typeConfig: Record<
  ChangelogType,
  { label: string; color: string; icon: any }
> = {
  added: { label: "Baru", color: "#2e7d32", icon: IconSparkles },
  fixed: { label: "Perbaikan", color: "#c62828", icon: IconBugOff },
  changed: { label: "Perubahan", color: "#1565c0", icon: IconAdjustments },
};

const entries = computed(() =>
  props.showReloadPrompt ? props.entries.slice(0, 1) : props.entries,
);
</script>

<template>
  <v-dialog v-model="model" max-width="520px" scrollable persistent>
    <v-card rounded="lg">
      <v-card-title
        class="d-flex align-center pa-4"
        style="
          border-bottom: 1px solid
            rgba(var(--v-border-color), var(--v-border-opacity));
        "
      >
        <span class="text-subtitle-1 font-weight-bold">Riwayat Update</span>
        <v-spacer />
        <v-btn
          v-if="!showReloadPrompt"
          icon
          size="small"
          variant="text"
          @click="model = false"
        >
          <v-icon size="18">mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <!-- Banner khusus kalau dibuka dari notifikasi "update tersedia" -->
      <div v-if="showReloadPrompt" class="reload-banner">
        <v-icon size="18" color="white" class="mr-2">
          mdi-cloud-download-outline
        </v-icon>
        Versi baru tersedia. Lihat perubahannya di bawah, lalu muat ulang kapan
        pun kamu siap.
      </div>

      <v-card-text class="pa-0" style="max-height: 65vh">
        <div v-if="!isLoaded" class="text-center text-grey py-6">
          Memuat riwayat update...
        </div>
        <template v-else>
          <div
            v-for="(entry, idx) in entries"
            :key="entry.version"
            class="changelog-entry"
          >
            <div class="changelog-header">
              <span class="changelog-version">v{{ entry.version }}</span>
              <span v-if="idx === 0" class="changelog-badge-new">Terbaru</span>
              <span class="changelog-date ml-auto">{{ entry.date }}</span>
            </div>
            <ul class="changelog-list">
              <li
                v-for="(c, i) in entry.changes"
                :key="i"
                class="changelog-item"
              >
                <span
                  class="changelog-tag"
                  :style="{
                    background: typeConfig[c.type].color + '18',
                    color: typeConfig[c.type].color,
                  }"
                >
                  {{ typeConfig[c.type].label }}
                </span>
                <span class="changelog-text">{{ c.text }}</span>
              </li>
            </ul>
          </div>
          <div v-if="!entries.length" class="text-center text-grey py-6">
            Belum ada riwayat perubahan.
          </div>
        </template>
      </v-card-text>

      <v-card-actions
        v-if="showReloadPrompt"
        class="pa-3"
        style="
          border-top: 1px solid
            rgba(var(--v-border-color), var(--v-border-opacity));
        "
      >
        <v-btn variant="text" @click="emit('dismiss')">Nanti Saja</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="emit('reload')">
          Muat Ulang Sekarang
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.reload-banner {
  background: rgb(var(--v-theme-primary));
  color: white;
  font-size: 12px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
}
.changelog-entry {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.changelog-entry:last-child {
  border-bottom: none;
}
.changelog-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.changelog-version {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  font-family: monospace;
}
.changelog-badge-new {
  font-size: 9px;
  font-weight: 700;
  background: #2e7d32;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.changelog-date {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.changelog-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.changelog-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
}
.changelog-tag {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 1px;
  white-space: nowrap;
}
.changelog-text {
  color: rgb(var(--v-theme-on-surface));
}
</style>
