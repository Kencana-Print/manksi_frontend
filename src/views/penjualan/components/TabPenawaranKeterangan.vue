<script setup lang="ts">
import { computed, watch } from "vue";
import { IconPrinter } from "@tabler/icons-vue";

const props = defineProps<{
  formData: any;
}>();

// Daftar pilihan keterangan standar sesuai gambar
const keteranganOptions = [
  { id: 1, text: "Ukuran kaos {P} x {L} cm." },
  { id: 2, text: "Sablon tidak luntur." },
  { id: 3, text: "Harga Include ongkos kirim (Free Ongkir)." },
  { id: 4, text: "Bisa Packing sesuai alokasi." },
  { id: 5, text: "Selalu ada laporan setelah barang diterima." },
  { id: 6, text: "Garansi barang sesuai yang dipesan." },
];

// Computed untuk mem-parsing data "1,3,4" dari database menjadi array ID yang dicentang
const selectedIds = computed({
  get: () => {
    if (!props.formData.TambahanText) return [];
    return props.formData.TambahanText.split(",").map(Number);
  },
  set: (val: number[]) => {
    // Urutkan dan gabungkan kembali menjadi string "1,2,5"
    props.formData.TambahanText = val.sort((a, b) => a - b).join(",");
  },
});

// Helper untuk mengecek apakah ID tertentu dicentang
const isChecked = (id: number) => selectedIds.value.includes(id);

// Handler saat checkbox diklik
const toggleCheck = (id: number) => {
  const current = [...selectedIds.value];
  const idx = current.indexOf(id);
  if (idx > -1) {
    current.splice(idx, 1); // Hapus jika sudah ada
  } else {
    current.push(id); // Tambah jika belum ada
  }
  selectedIds.value = current;
};

// Khusus opsi 1 (Ukuran), kita perlu input Panjang dan Lebar dari formData
const textForOption1 = computed(() => {
  return `Ukuran kaos ${props.formData.Panjang || 0} x ${props.formData.Lebar || 0} cm.`;
});
</script>

<template>
  <div class="tpk-layout">
    <div class="desktop-form-section">
      <div class="form-title">Keterangan Tambahan</div>

      <div class="keterangan-list mt-3">
        <div class="k-row">
          <span class="k-num">1.</span>
          <label class="chk font-weight-bold">
            <input
              type="checkbox"
              :checked="isChecked(1)"
              @change="toggleCheck(1)"
            />
            Ukuran kaos
          </label>
          <div class="d-flex align-center gap-1 ml-2">
            <input
              type="number"
              v-model.number="formData.Panjang"
              class="k-inp tr"
              placeholder="0"
              :disabled="!isChecked(1)"
              v-select-on-focus
            />
            <span class="text-caption text-grey-darken-1">x</span>
            <input
              type="number"
              v-model.number="formData.Lebar"
              class="k-inp tr"
              placeholder="0"
              :disabled="!isChecked(1)"
              v-select-on-focus
            />
            <span class="text-caption text-grey-darken-1">cm.</span>
          </div>
        </div>

        <div
          v-for="opt in keteranganOptions.slice(1)"
          :key="opt.id"
          class="k-row"
        >
          <span class="k-num">{{ opt.id }}.</span>
          <label class="chk">
            <input
              type="checkbox"
              :checked="isChecked(opt.id)"
              @change="toggleCheck(opt.id)"
            />
            {{ opt.text }}
          </label>
        </div>
      </div>

      <v-alert
        type="info"
        variant="tonal"
        density="compact"
        class="mt-6 text-caption"
        :icon="IconPrinter"
      >
        Keterangan yang dicentang akan dicetak pada bagian bawah surat
        penawaran.
      </v-alert>
    </div>
  </div>
</template>

<style scoped>
.tpk-layout {
  padding: 8px;
  height: 100%;
}

.desktop-form-section {
  padding: 24px 32px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: white !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
  max-width: 800px;
}

.form-title {
  font-size: 14px;
  font-weight: 700;
  color: #1565c0;
  border-bottom: 2px solid #1976d2;
  padding-bottom: 6px;
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.keterangan-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.k-row {
  display: flex;
  align-items: center;
}

.k-num {
  font-size: 13px;
  font-weight: 600;
  color: #424242;
  width: 24px;
}

.chk {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  user-select: none;
}
.chk:hover {
  color: #1565c0;
}
.chk input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #1565c0;
  cursor: pointer;
}

.k-inp {
  width: 60px;
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.k-inp:focus {
  border-color: #1976d2;
}
.k-inp:disabled {
  background-color: #f5f5f5;
  color: #9e9e9e;
  border-color: #e0e0e0;
  cursor: not-allowed;
}

.tr {
  text-align: right;
}
.gap-1 {
  gap: 8px;
}
</style>
