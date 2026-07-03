<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { IconPlus, IconTrash } from "@tabler/icons-vue";
import api from "@/services/api";

const props = defineProps<{
  formData: any;
  isEdit: boolean;
}>();

const ensureTrailingEmptyRow = () => {
  if (!props.formData.KeteranganKhusus) props.formData.KeteranganKhusus = [];
  const list = props.formData.KeteranganKhusus;
  const last = list[list.length - 1];
  if (list.length === 0 || (last && last.trim())) {
    list.push("");
  }
};

const initKetKomponen = async () => {
  if (props.formData.KetKomponenList?.length > 0) return;
  try {
    const res = await api.get("/ppic/spk/form/ket-komponen-master");
    props.formData.KetKomponenList = res.data.data.map((k: any) => ({
      kode: k.kode,
      nama: k.nama,
      checked: false,
      ket: "",
    }));
  } catch {
    /* biarkan kosong */
  }
};

// ─── MKA dari BAST MAP (accessories + babaran) — read-only referensi ───
const mkaFromMap = ref<{
  aksesoris: {
    kode: string;
    nama: string;
    satuan: string;
    note: string;
    qty: number;
  }[];
  komponen: {
    kode: string;
    komponen: string;
    warna: string;
    babaran: number;
    babarank: number;
  }[];
  sizeBreakdown: { komponen: string; size: string; babaran: number }[]; // ← tambahan
}>({ aksesoris: [], komponen: [], sizeBreakdown: [] }); // ← tambahan default
const isLoadingMka = ref(false);
const hasMkaFromMap = computed(
  () =>
    mkaFromMap.value.aksesoris.length > 0 ||
    mkaFromMap.value.komponen.length > 0,
);

const loadMkaFromMap = async () => {
  const mapNomor = props.formData.so_map;
  if (!mapNomor) {
    mkaFromMap.value = { aksesoris: [], komponen: [], sizeBreakdown: [] };
    return;
  }
  isLoadingMka.value = true;
  try {
    const res = await api.get(
      `/ppic/spk/form/mka-from-map/${encodeURIComponent(mapNomor)}`,
    );
    mkaFromMap.value = res.data.data;
  } catch {
    mkaFromMap.value = { aksesoris: [], komponen: [], sizeBreakdown: [] };
  } finally {
    isLoadingMka.value = false;
  }
};

// onMounted sebagai jaring pengaman — watcher so_nomor saja bisa terlewat kalau
// SpkTabOrder mengisi formData.so_nomor setelah komponen ini sudah ter-mount.
onMounted(() => {
  ensureTrailingEmptyRow();
  initKetKomponen();
  loadMkaFromMap();
});
watch(
  () => props.formData.so_nomor,
  (nomor) => {
    if (nomor) ensureTrailingEmptyRow();
  },
);
watch(
  () => props.formData.so_map,
  () => loadMkaFromMap(),
);

const removeRow = (idx: number) => {
  props.formData.KeteranganKhusus.splice(idx, 1);
  if (props.formData.KeteranganKhusus.length === 0) {
    ensureTrailingEmptyRow();
  }
};

const addRow = () => {
  if (!props.formData.KeteranganKhusus) props.formData.KeteranganKhusus = [];
  props.formData.KeteranganKhusus.push("");
};
</script>

<template>
  <div class="ket-layout">
    <!-- Kolom kiri: Special Process -->
    <div class="ket-col">
      <div class="section-card full-height">
        <div class="sec-header">
          <span class="sec-title">Keterangan Special Process (Opsional)</span>
          <button type="button" class="btn-add" @click="addRow">
            <IconPlus :size="13" class="mr-1" /> Tambah
          </button>
        </div>
        <table class="ket-table">
          <thead>
            <tr>
              <th style="width: 40px">No</th>
              <th>Keterangan</th>
              <th style="width: 40px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in formData.KeteranganKhusus" :key="idx">
              <td class="text-center">{{ Number(idx) + 1 }}</td>
              <td>
                <input
                  v-model="formData.KeteranganKhusus[idx]"
                  class="cell-inp"
                  placeholder="Tulis keterangan..."
                  @input="ensureTrailingEmptyRow"
                />
              </td>
              <td class="text-center">
                <button
                  v-if="formData.KeteranganKhusus.length > 1"
                  type="button"
                  class="btn-del"
                  @click="removeRow(Number(idx))"
                >
                  <IconTrash :size="13" color="#c62828" />
                </button>
              </td>
            </tr>
            <tr
              v-if="
                !formData.KeteranganKhusus ||
                formData.KeteranganKhusus.length === 0
              "
            >
              <td colspan="3" class="empty-row">Belum ada keterangan</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Kolom tengah: Keterangan Komponen MKA -->
    <div class="ket-col ket-col-wide">
      <!-- Checklist MKA manual (A/B/C...) — HANYA muncul kalau TIDAK ada
       data Accessories/Babaran dari BAST MAP. Kalau BAST MAP sudah
       diisi, itu dianggap sumber kebenaran, checklist manual tidak
       relevan lagi supaya tidak dobel-input. -->
      <div v-if="!hasMkaFromMap" class="section-card full-height">
        <div class="sec-header">
          <span class="sec-title" style="color: #2e7d32"
            >Keterangan Komponen (MKA)</span
          >
          <span style="font-size: 10px; color: #757575"
            >Centang yang dibutuhkan</span
          >
        </div>
        <table class="ket-table">
          <thead>
            <tr>
              <th style="width: 40px">Kode</th>
              <th style="width: 180px">Nama</th>
              <th style="width: 60px; text-align: center">Pakai</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in formData.KetKomponenList" :key="item.kode">
              <td class="text-center" style="font-weight: 700">
                {{ item.kode }}
              </td>
              <td>{{ item.nama }}</td>
              <td class="text-center">
                <input
                  type="checkbox"
                  v-model="item.checked"
                  style="width: 16px; height: 16px; cursor: pointer"
                />
              </td>
              <td>
                <input
                  v-model="item.ket"
                  class="cell-inp"
                  placeholder="Keterangan (opsional)"
                  :disabled="!item.checked"
                />
              </td>
            </tr>
            <tr v-if="!formData.KetKomponenList?.length">
              <td colspan="4" class="empty-row">Memuat...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Panel BAST MAP — muncul kalau ada data, MENGGANTIKAN checklist -->
      <div v-if="hasMkaFromMap" class="section-card full-height">
        <div class="sec-header">
          <span class="sec-title" style="color: #7b1fa2">
            Accessories &amp; Babaran (dari BAST MAP {{ formData.so_map }})
          </span>
          <v-progress-circular
            v-if="isLoadingMka"
            indeterminate
            size="14"
            width="2"
            color="primary"
          />
        </div>

        <div v-if="mkaFromMap.sizeBreakdown.length" class="mb-2">
          <div class="mka-subtitle">Babaran per Size</div>
          <table class="ket-table">
            <thead>
              <tr>
                <th style="width: 90px">Komponen</th>
                <th style="width: 70px">Size</th>
                <th style="width: 70px; text-align: right">Babaran</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in mkaFromMap.sizeBreakdown" :key="i">
                <td>{{ s.komponen }}</td>
                <td>{{ s.size }}</td>
                <td style="text-align: right">
                  {{ Number(s.babaran).toLocaleString("id-ID") }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="mkaFromMap.aksesoris.length">
          <div class="mka-subtitle">Accessories</div>
          <table class="ket-table">
            <thead>
              <tr>
                <th style="width: 60px">Kode</th>
                <th>Nama</th>
                <th style="width: 50px">Satuan</th>
                <th style="width: 60px; text-align: right">Qty/Kaos</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(a, i) in mkaFromMap.aksesoris" :key="i">
                <td style="font-family: monospace">{{ a.kode }}</td>
                <td>{{ a.nama }}</td>
                <td class="text-center">{{ a.satuan }}</td>
                <td style="text-align: right">{{ a.qty }}</td>
                <td>{{ a.note || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Kolom kanan: Gudang + Produksi -->
    <div class="ket-col ket-col-right">
      <div class="section-card ket-card">
        <div class="sec-title mb-2">Keterangan Gudang/Pembelian</div>
        <textarea
          v-model="formData.spk_ketbeli"
          class="ket-textarea"
          placeholder="Keterangan untuk gudang/pembelian..."
        />
      </div>
      <div class="section-card ket-card mt-2">
        <div class="sec-title mb-2">Keterangan Produksi</div>
        <textarea
          v-model="formData.spk_keterangan"
          class="ket-textarea"
          placeholder="Keterangan untuk produksi..."
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ket-layout {
  display: flex;
  gap: 10px;
  padding: 10px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  height: 100%;
  overflow-y: auto;
  align-items: stretch;
}
.ket-col {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.ket-col-wide {
  flex: 1.4;
}
.ket-col-right {
  flex: 0 0 280px;
}
.full-height {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.section-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 12px;
}
.ket-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.sec-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
}
.mka-subtitle {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.mb-2 {
  margin-bottom: 8px;
}
.mt-2 {
  margin-top: 8px;
}
.btn-add {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-add:hover {
  opacity: 0.9;
}
.ket-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.ket-table thead th {
  background: #f5f5f5;
  padding: 6px 8px;
  font-weight: 700;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}
.ket-table tbody td {
  padding: 5px 8px;
  border-bottom: 1px solid #eeeeee;
}
.cell-inp {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}
.cell-inp:focus {
  border-color: #1565c0;
}
.cell-inp:disabled {
  background: #f5f5f5;
  color: #999;
}
.text-center {
  text-align: center;
}
.btn-del {
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  padding: 3px 6px;
  cursor: pointer;
}
.btn-del:hover {
  background: #ffcdd2;
}
.empty-row {
  text-align: center;
  padding: 16px;
  color: #bdbdbd;
  font-style: italic;
}
.ket-textarea {
  width: 100%;
  flex: 1;
  min-height: 100px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 6px 8px;
  font-size: 11px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  color: #212121;
  box-sizing: border-box;
}
.ket-textarea:focus {
  border-color: #1565c0;
}
</style>
