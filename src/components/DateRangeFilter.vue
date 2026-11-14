<script setup lang="ts">
import { ref, watch } from "vue";

// Filter periode tanggal standar seluruh browse MMT (disamakan dengan BAST-MAP).
// - Tampilan & label identik: "Periode Mulai:" ... "s/d".
// - Anti keystroke-junk: nilai intermediate saat ketik manual (mis. tanggal
//   belum lengkap seperti "01" yang terbaca 0/kosong) DITAHAN lokal dan TIDAK
//   di-emit ke parent (jadi tidak memicu fetch dengan tanggal sampah).
//   Hanya "" (dikosongkan) atau tanggal kalender valid yyyy-MM-dd yang di-emit.
// - Emit di-debounce 400ms agar fetch tidak terpanggil tiap ketikan.

const props = defineProps<{
  startDate: string;
  endDate: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:startDate", v: string): void;
  (e: "update:endDate", v: string): void;
}>();

const isCompleteDate = (v: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
};

// "" = boleh (filter dikosongkan); selain itu harus tanggal valid.
const isEmittable = (v: string): boolean => v === "" || isCompleteDate(v);

const localStart = ref(props.startDate ?? "");
const localEnd = ref(props.endDate ?? "");
const lastEmittedStart = ref(props.startDate ?? "");
const lastEmittedEnd = ref(props.endDate ?? "");

let timerStart: ReturnType<typeof setTimeout> | null = null;
let timerEnd: ReturnType<typeof setTimeout> | null = null;

// Sinkron dari parent (mis. reset filter programatik).
watch(
  () => props.startDate,
  (v) => {
    lastEmittedStart.value = v ?? "";
    if (timerStart) {
      clearTimeout(timerStart);
      timerStart = null;
    }
    localStart.value = v ?? "";
  },
);
watch(
  () => props.endDate,
  (v) => {
    lastEmittedEnd.value = v ?? "";
    if (timerEnd) {
      clearTimeout(timerEnd);
      timerEnd = null;
    }
    localEnd.value = v ?? "";
  },
);

const scheduleEmit = (
  kind: "start" | "end",
  getLocal: () => string,
  getLast: () => string,
  setLast: (v: string) => void,
  emitFn: (v: string) => void,
) => {
  const timer = kind === "start" ? timerStart : timerEnd;
  if (timer) clearTimeout(timer);
  const t = setTimeout(() => {
    const v = getLocal();
    if (v !== getLast() && isEmittable(v)) {
      setLast(v);
      emitFn(v);
    }
  }, 400);
  if (kind === "start") timerStart = t;
  else timerEnd = t;
};

const onStartInput = (v: string) => {
  localStart.value = v ?? "";
  scheduleEmit(
    "start",
    () => localStart.value,
    () => lastEmittedStart.value,
    (x) => (lastEmittedStart.value = x),
    (x) => emit("update:startDate", x),
  );
};

const onEndInput = (v: string) => {
  localEnd.value = v ?? "";
  scheduleEmit(
    "end",
    () => localEnd.value,
    () => lastEmittedEnd.value,
    (x) => (lastEmittedEnd.value = x),
    (x) => emit("update:endDate", x),
  );
};

// Bila blur dalam keadaan invalid (ketikan tak selesai), kembalikan ke
// nilai terakhir yang valid agar tampilan tak menggantung.
const revertInvalid = (kind: "start" | "end") => {
  if (kind === "start") {
    if (!isEmittable(localStart.value)) localStart.value = lastEmittedStart.value;
  } else {
    if (!isEmittable(localEnd.value)) localEnd.value = lastEmittedEnd.value;
  }
};
</script>

<template>
  <v-label class="filter-label text-caption">Periode Mulai:</v-label>
  <v-text-field
    :model-value="localStart"
    @update:model-value="onStartInput"
    @blur="revertInvalid('start')"
    type="date"
    density="compact"
    hide-details
    variant="outlined"
    :disabled="disabled"
    style="max-width: 150px"
  />

  <v-label class="mx-2 text-caption">s/d</v-label>

  <v-text-field
    :model-value="localEnd"
    @update:model-value="onEndInput"
    @blur="revertInvalid('end')"
    type="date"
    density="compact"
    hide-details
    variant="outlined"
    :disabled="disabled"
    style="max-width: 150px"
  />
</template>
