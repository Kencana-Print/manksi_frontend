<script setup lang="ts">
import { computed, watch } from "vue";
import { IconPrinter } from "@tabler/icons-vue";

const props = defineProps<{
  formData: any;
}>();

const isGarmen = computed(() => String(props.formData.Divisi) === "4");

// ─── Keterangan Tambahan ──────────────────────────────────────────────────────
const keteranganOptions = [
  { id: 1, text: "Ukuran kaos {P} x {L} cm." },
  { id: 2, text: "Sablon tidak luntur." },
  { id: 3, text: "Harga Include ongkos kirim (Free Ongkir)." },
  { id: 4, text: "Bisa Packing sesuai alokasi." },
  { id: 5, text: "Selalu ada laporan setelah barang diterima." },
  { id: 6, text: "Garansi barang sesuai yang dipesan." },
];

const KETERANGAN_SPANDUK = {
  id: 7,
  text: "Dikarenakan proses drying, ukuran jadi spanduk/umbul akan mengalami penyusutan ±5 cm.",
};

// Computed keterangan yang tampil — filter berdasarkan divisi
const visibleKeterangan = computed(() => {
  const base = keteranganOptions; // id 1-6
  if (String(props.formData.Divisi) === "1") {
    return [...base, KETERANGAN_SPANDUK];
  }
  return base;
});

const selectedIds = computed({
  get: () => {
    if (!props.formData.TambahanText) return [];
    return props.formData.TambahanText.split(",").map(Number);
  },
  set: (val: number[]) => {
    props.formData.TambahanText = val.sort((a, b) => a - b).join(",");
  },
});

const isChecked = (id: number) => selectedIds.value.includes(id);
const toggleCheck = (id: number) => {
  const current = [...selectedIds.value];
  const idx = current.indexOf(id);
  if (idx > -1) current.splice(idx, 1);
  else current.push(id);
  selectedIds.value = current;
};

// Auto-centang opsi 7 saat divisi berubah ke 1
watch(
  () => props.formData.Divisi,
  (val) => {
    if (String(val) === "1") {
      // Auto-centang keterangan spanduk jika belum ada
      if (!selectedIds.value.includes(7)) {
        const current = [...selectedIds.value, 7];
        selectedIds.value = current;
      }
    } else {
      // Hapus keterangan spanduk jika pindah dari divisi 1
      if (selectedIds.value.includes(7)) {
        selectedIds.value = selectedIds.value.filter((id: number) => id !== 7);
      }
    }
  },
  { immediate: true },
);

// ─── Ketentuan Sample (hardcode, divisi 4 saja) ───────────────────────────────
const SAMPLE_OPTIONS = [
  { id: 1, jenis: "Baju Uniform (Kemeja)", biaya: 400000 },
  { id: 2, jenis: "Celana", biaya: 300000 },
  { id: 3, jenis: "Celemek", biaya: 200000 },
  { id: 4, jenis: "Jaket", biaya: 500000 },
  { id: 5, jenis: "Jas Almamater", biaya: 500000 },
  { id: 6, jenis: "Kaos Krah", biaya: 350000 },
  { id: 7, jenis: "Kaos Oblong", biaya: 200000 },
  { id: 8, jenis: "Rompi", biaya: 500000 },
  { id: 9, jenis: "Wearpack", biaya: 900000 },
];

// Simpan di SampleText — format: "1,3,5" (id yang dicentang)
const selectedSampleIds = computed({
  get: () => {
    if (!props.formData.SampleText) return [];
    return props.formData.SampleText.split(",")
      .map(Number)
      .filter((n: number) => !isNaN(n) && n > 0);
  },
  set: (val: number[]) => {
    props.formData.SampleText = val.sort((a, b) => a - b).join(",");
  },
});

const isSampleChecked = (id: number) => selectedSampleIds.value.includes(id);
const toggleSample = (id: number) => {
  const current = [...selectedSampleIds.value];
  const idx = current.indexOf(id);
  if (idx > -1) current.splice(idx, 1);
  else current.push(id);
  selectedSampleIds.value = current;
};

// ─── Ketentuan Sample — Spanduk (divisi 1) & MMT (divisi 5) ──────────────────
// Beda dari Garmen: isinya kalimat lengkap, bukan pasangan Jenis+Biaya,
// jadi ditampilkan sebagai checkbox-list (mirip Keterangan Tambahan),
// bukan tabel. Tetap disimpan di field SampleText yang sama (comma-
// separated id) — aman karena cuma satu grup yang aktif per form.
const SAMPLE_OPTIONS_SPANDUK = [
  { id: 1, text: "Pembuatan sampel dikenakan biaya Rp 1.000.000 / desain." },
  { id: 2, text: "Jika ACC bisa dijadikan DP." },
  {
    id: 3,
    text: "Jika ada revisi desain dikenakan biaya ganti film Rp 500.000.",
  },
];
const SAMPLE_OPTIONS_MMT = [
  { id: 1, text: "Harga sesuai pricelist ritailer." },
];

const isSpanduk = computed(() => String(props.formData.Divisi) === "1");
const isMmt = computed(() => String(props.formData.Divisi) === "5");

const sampleListOptions = computed(() => {
  if (isSpanduk.value) return SAMPLE_OPTIONS_SPANDUK;
  if (isMmt.value) return SAMPLE_OPTIONS_MMT;
  return [];
});

// ─── Reset SampleText saat pindah grup divisi ────────────────────────────────
// Mencegah id "nyangkut" dari grup lain (mis. Garmen id 3 = "Celemek")
// kebawa tersimpan/tercetak dengan makna yang salah kalau divisi diganti.
const divisiGroup = (d: any) => {
  const s = String(d);
  if (s === "4") return "garmen";
  if (s === "1") return "spanduk";
  if (s === "5") return "mmt";
  return "none";
};
watch(
  () => props.formData.Divisi,
  (newVal, oldVal) => {
    if (oldVal === undefined) return; // load awal, jangan clear
    if (divisiGroup(newVal) !== divisiGroup(oldVal)) {
      selectedSampleIds.value = [];
    }
  },
);

const fmtRupiah = (n: number) =>
  "Rp. " + n.toLocaleString("id-ID").replace(/,/g, ".");

// Untuk cetak — export computed yang bisa diakses parent
// (dipakai di print view nanti via SampleText)
</script>

<template>
  <div class="tpk-layout">
    <div class="tpk-columns">
      <!-- ── Kiri: Keterangan Tambahan ── -->
      <div class="desktop-form-section">
        <div class="form-title">Keterangan Tambahan</div>
        <div class="keterangan-list mt-3">
          <!-- Opsi 1: Ukuran kaos dengan input P x L -->
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
          <!-- Opsi 2-7 -->
          <div
            v-for="opt in visibleKeterangan.filter((o) => o.id !== 1)"
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

      <!-- ── Kanan: Ketentuan Sample ── -->
      <div v-if="isGarmen" class="desktop-form-section">
        <div class="form-title">Ketentuan Sample</div>
        <p class="sample-subtitle">Rincian Biaya Sampel :</p>
        <table class="sample-table">
          <thead>
            <tr>
              <th style="width: 32px"></th>
              <th>Jenis Barang</th>
              <th class="tr">Biaya Sampel</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="opt in SAMPLE_OPTIONS" :key="opt.id">
              <td class="tc">
                <input
                  type="checkbox"
                  :checked="isSampleChecked(opt.id)"
                  @change="toggleSample(opt.id)"
                  class="sample-chk"
                />
              </td>
              <td :class="{ fw: isSampleChecked(opt.id) }">{{ opt.jenis }}</td>
              <td class="tr" :class="{ fw: isSampleChecked(opt.id) }">
                {{ fmtRupiah(opt.biaya) }}
              </td>
            </tr>
          </tbody>
        </table>
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mt-4 text-caption"
          :icon="IconPrinter"
        >
          Baris yang dicentang akan dicetak di bagian Note surat penawaran.
        </v-alert>

        <div v-if="selectedSampleIds.length > 0" class="sample-mandatory-note">
          ✓ Ketentuan berikut akan otomatis ditambahkan saat dicetak:<br />
          <i
            >"Revisi sampel diberikan maksimal 2 (dua) kali tanpa biaya
            tambahan."</i
          >
        </div>
      </div>

      <!-- ── Kanan: Ketentuan Sample — Spanduk / MMT (checkbox-list) ── -->
      <div v-else-if="isSpanduk || isMmt" class="desktop-form-section">
        <div class="form-title">Ketentuan Sample</div>
        <div class="keterangan-list mt-3">
          <div v-for="opt in sampleListOptions" :key="opt.id" class="k-row">
            <span class="k-num">{{ opt.id }}.</span>
            <label class="chk">
              <input
                type="checkbox"
                :checked="isSampleChecked(opt.id)"
                @change="toggleSample(opt.id)"
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
          Ketentuan yang dicentang akan dicetak di bagian Note surat penawaran.
        </v-alert>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tpk-layout {
  padding: 8px;
  height: 100%;
  overflow-y: auto;
}
.tpk-columns {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.desktop-form-section {
  flex: 1;
  min-width: 320px;
  padding: 24px 28px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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

/* Keterangan Tambahan */
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

/* Ketentuan Sample */
.sample-subtitle {
  font-size: 12px;
  color: #555;
  margin: 12px 0 8px;
}
.sample-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.sample-table thead th {
  background: #f5f5f5;
  border: 1px solid #ddd;
  padding: 6px 10px;
  font-weight: 700;
  font-size: 11px;
  text-align: left;
  color: #424242;
}
.sample-table thead th.tr {
  text-align: right;
}
.sample-table tbody td {
  border: 1px solid #e0e0e0;
  padding: 5px 10px;
  color: #333;
}
.sample-table tbody tr:hover td {
  background: #f5f9ff;
}
.sample-chk {
  width: 14px;
  height: 14px;
  accent-color: #1565c0;
  cursor: pointer;
  display: block;
  margin: 0 auto;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 600;
}
.gap-1 {
  gap: 8px;
}
.mt-3 {
  margin-top: 12px;
}
.mt-4 {
  margin-top: 16px;
}
.mt-6 {
  margin-top: 24px;
}
.ml-2 {
  margin-left: 8px;
}
.d-flex {
  display: flex;
}
.align-center {
  align-items: center;
}
.sample-mandatory-note {
  margin-top: 10px;
  padding: 8px 12px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 6px;
  font-size: 11.5px;
  color: #5d4037;
  line-height: 1.5;
}
</style>
