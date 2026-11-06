<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { IconSearch } from "@tabler/icons-vue";
import type { MenuCari } from "@/config/menuItems";

const props = defineProps<{ modelValue: boolean; daftar: MenuCari[] }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "pilih", item: MenuCari): void;
}>();

const kata = ref("");
const aktif = ref(0);
const inputRef = ref<{ focus: () => void } | null>(null);

const hasil = computed<MenuCari[]>(() => {
  const token = kata.value.toLowerCase().split(/\s+/).filter(Boolean);
  if (token.length === 0) return [];
  const skor = (m: MenuCari) =>
    token.every((t) => m.judul.toLowerCase().includes(t)) ? 0 : 1;
  return props.daftar
    .filter((m) => {
      const teks = `${m.judul} ${m.jalur}`.toLowerCase();
      return token.every((t) => teks.includes(t));
    })
    .sort((a, b) => skor(a) - skor(b))
    .slice(0, 30);
});

watch(hasil, () => {
  aktif.value = 0;
});

watch(aktif, () => {
  void nextTick(() => {
    document
      .querySelector(".cari-item.aktif")
      ?.scrollIntoView({ block: "nearest" });
  });
});

// Dialog Vuetify memfokus kontennya sendiri saat terbuka, jadi fokus input
// ditunda sebentar sampai transisi selesai.
watch(
  () => props.modelValue,
  (buka) => {
    if (!buka) return;
    kata.value = "";
    aktif.value = 0;
    setTimeout(() => inputRef.value?.focus(), 80);
  },
);

const pilih = (m: MenuCari | undefined) => {
  if (!m) return;
  emit("update:modelValue", false);
  emit("pilih", m);
};

const geser = (arah: 1 | -1) => {
  if (hasil.value.length === 0) return;
  aktif.value = Math.min(
    Math.max(aktif.value + arah, 0),
    hasil.value.length - 1,
  );
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="cari-card">
      <div class="cari-head">
        <IconSearch :size="16" :stroke-width="1.6" class="cari-ikon" />
        <v-text-field
          ref="inputRef"
          v-model="kata"
          placeholder="Cari menu, mis. kartu stok"
          variant="plain"
          density="compact"
          hide-details
          autocomplete="off"
          @keydown.down.prevent="geser(1)"
          @keydown.up.prevent="geser(-1)"
          @keydown.enter.prevent="pilih(hasil[aktif])"
        />
      </div>
      <v-divider />
      <div class="cari-list">
        <div v-if="!kata.trim()" class="cari-info">
          Ketik nama menu atau bagiannya. Pakai ↑ ↓ lalu Enter.
        </div>
        <div v-else-if="hasil.length === 0" class="cari-info">
          Menu tidak ditemukan.
        </div>
        <button
          v-for="(m, i) in hasil"
          :key="`${m.jalur}|${m.judul}`"
          type="button"
          class="cari-item"
          :class="{ aktif: i === aktif }"
          @click="pilih(m)"
          @mousemove="aktif = i"
        >
          <span class="cari-judul">{{ m.judul }}</span>
          <span class="cari-jalur">{{ m.jalur }}</span>
        </button>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.cari-card {
  font-size: 11px;
  border-radius: 10px;
}
.cari-head {
  display: flex;
  align-items: center;
  padding: 6px 12px;
}
.cari-ikon {
  margin-right: 8px;
  flex-shrink: 0;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.cari-head :deep(input) {
  font-size: 11px;
}
.cari-list {
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px;
}
.cari-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface));
}
.cari-item.aktif {
  background: rgba(var(--v-theme-primary), 0.1);
}
.cari-judul {
  font-weight: 600;
}
.cari-jalur,
.cari-info {
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.cari-info {
  padding: 14px 10px;
}
</style>
