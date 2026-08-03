<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import api from "@/services/api";
import {
  IconScissors,
  IconPrinter,
  IconInfoCircle,
  IconTrash,
  IconPlus,
  IconSearch,
} from "@tabler/icons-vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";

interface CetakBordirRow {
  Kode: string;
  Nama: string;
  Proses: string;
  Penempatan: string;
  Ukuran: string;
}

const props = defineProps<{
  formData: any;
  isEdit: boolean;
}>();

const activeTab = ref("potong");
const isLoading = ref(false);
const loadError = ref("");

const identifier = computed(
  () => props.formData.so_map || props.formData.so_nomor || "",
);
const identifierLabel = computed(() =>
  props.formData.so_map
    ? `MAP ${props.formData.so_map}`
    : `SO ${props.formData.so_nomor}`,
);

const ensureKomponenStruct = () => {
  if (!props.formData.KomponenSpk) {
    props.formData.KomponenSpk = { ListPotong: [], ListCetakBordir: [] };
  }
};

const prosesOptions = computed(() => {
  const opsi: string[] = [];
  if (props.formData.so_sablon === "Y") opsi.push("SABLON");
  if (props.formData.so_bordir === "Y") opsi.push("BORDIR");
  if (props.formData.so_sublim === "Y") opsi.push("SUBLIM");
  if (opsi.length === 0) opsi.push("DTF");
  return opsi;
});

const loadKomponenFromProof = async () => {
  loadError.value = "";
  ensureKomponenStruct();
  if (!identifier.value) {
    props.formData.KomponenSpk.ListPotong = [];
    props.formData.KomponenSpk.ListCetakBordir = [];
    return;
  }
  isLoading.value = true;
  try {
    const res = await api.get(
      `/ppic/spk/form/komponen-from-proof/${encodeURIComponent(identifier.value)}`,
    );
    const proofPotong = res.data.data.ListPotong || [];
    const proofCetakBordir = res.data.data.ListCetakBordir || [];

    // POTONG — full replace, tidak ada field manual di baris ini.
    props.formData.KomponenSpk.ListPotong = proofPotong.map((p: any) => ({
      Kode: p.Kode,
      Nama: p.Nama,
    }));

    // SECOND PROCESS — Kode/Nama ikut Proof, tapi Proses/Penempatan/Ukuran
    // yang sudah diisi user sebelumnya (mode edit, atau di sesi ini)
    // dipertahankan, dicocokkan per Kode.
    const existingByKode = new Map<string, CetakBordirRow>(
      (props.formData.KomponenSpk.ListCetakBordir || []).map((r: any) => [
        r.Kode,
        r,
      ]),
    );
    props.formData.KomponenSpk.ListCetakBordir = proofCetakBordir.map(
      (p: any) => {
        const existing = existingByKode.get(p.Kode);
        return {
          Kode: p.Kode,
          Nama: p.Nama,
          Proses: existing?.Proses || p.Proses,
          Penempatan: existing?.Penempatan || "",
          Ukuran: existing?.Ukuran || "",
        };
      },
    );
  } catch (e: any) {
    console.error("Gagal load komponen dari Proof:", e);
    loadError.value =
      e.response?.data?.message || e.message || "Gagal memuat data.";
    props.formData.KomponenSpk.ListPotong = [];
    props.formData.KomponenSpk.ListCetakBordir = [];
  } finally {
    isLoading.value = false;
  }
};

// ── Lookup Bahan (F1/Enter/klik) untuk Kode komponen ──
const showBahanModal = ref(false);
const activeTarget = ref<"potong" | "cetakbordir">("potong");
const activeRowIndex = ref(-1);

const openBahanLookup = (target: "potong" | "cetakbordir", idx: number) => {
  activeTarget.value = target;
  activeRowIndex.value = idx;
  showBahanModal.value = true;
};

const applyBahanToRow = (item: any) => {
  const idx = activeRowIndex.value;
  if (idx < 0) return;

  if (activeTarget.value === "potong") {
    if (props.formData.KomponenSpk.ListPotong[idx]) {
      props.formData.KomponenSpk.ListPotong[idx].Kode = item.Kode;
      props.formData.KomponenSpk.ListPotong[idx].Nama = item.Nama;
    }
  } else {
    if (props.formData.KomponenSpk.ListCetakBordir[idx]) {
      props.formData.KomponenSpk.ListCetakBordir[idx].Kode = item.Kode;
      props.formData.KomponenSpk.ListCetakBordir[idx].Nama = item.Nama;
    }
  }
};

// Validasi kalau user ketik langsung lalu tekan Enter (tanpa buka modal)
const validateKodeOnEnter = async (
  target: "potong" | "cetakbordir",
  idx: number,
) => {
  const row =
    target === "potong"
      ? props.formData.KomponenSpk.ListPotong[idx]
      : props.formData.KomponenSpk.ListCetakBordir[idx];
  let input = (row?.Kode || "").trim();
  if (!input) {
    if (row) row.Nama = "";
    return;
  }

  // ⚠️ BARU: auto-expand suffix angka (mis. "400" → "LL-000400"),
  // sama pola dengan onKodeBahan di MutasiProduksiFormView.
  if (/^\d{1,6}$/.test(input)) {
    const padded = input.padStart(6, "0");
    try {
      const res = await api.get("/lookups/bahan", {
        params: { q: padded, limit: 5, mode: "komponen" },
      });
      const items = res.data.data?.items || [];
      // cocokkan Kode yang 6 digit terakhirnya persis sama dengan suffix
      const found = items.find((i: any) =>
        (i.Kode || "").toUpperCase().endsWith(padded),
      );
      if (found) {
        row.Kode = found.Kode;
        row.Nama = found.Nama;
        return;
      }
    } catch {
      /* fallback ke pesan gagal di bawah */
    }
    row.Nama = "";
    return;
  }

  // Kode lengkap — lookup langsung
  try {
    const res = await api.get("/lookups/bahan", {
      params: { q: input, limit: 1, mode: "komponen" },
    });
    const found = (res.data.data?.items || [])[0];
    if (found && found.Kode?.toUpperCase() === input.toUpperCase()) {
      row.Kode = found.Kode;
      row.Nama = found.Nama;
    } else {
      row.Nama = "";
    }
  } catch {
    row.Nama = "";
  }
};

const addPotongRow = () => {
  ensureKomponenStruct();
  props.formData.KomponenSpk.ListPotong.push({ Kode: "", Nama: "" });
};

const removePotongRow = (idx: number) => {
  ensureKomponenStruct();
  props.formData.KomponenSpk.ListPotong.splice(idx, 1);
};

const removeCetakBordirRow = (idx: number) => {
  ensureKomponenStruct();
  props.formData.KomponenSpk.ListCetakBordir.splice(idx, 1);
};

const addCetakBordirRow = () => {
  ensureKomponenStruct();
  props.formData.KomponenSpk.ListCetakBordir.push({
    Kode: "",
    Nama: "",
    Proses: prosesOptions.value[0] || "SABLON",
    Penempatan: "",
    Ukuran: "",
  });
};

const onKodeF1 = (
  e: KeyboardEvent,
  target: "potong" | "cetakbordir",
  idx: number,
) => {
  if (e.key === "F1") {
    e.preventDefault();
    openBahanLookup(target, idx);
  }
};

onMounted(loadKomponenFromProof);
watch(identifier, loadKomponenFromProof);

const listPotong = computed(() => props.formData.KomponenSpk?.ListPotong || []);
const listCetakBordir = computed(
  () => props.formData.KomponenSpk?.ListCetakBordir || [],
);
</script>

<template>
  <div class="komp-layout">
    <div class="komp-info-banner">
      <IconInfoCircle :size="14" class="mr-1" />
      Kode &amp; Nama Komponen diambil otomatis dari Proof Garmen untuk
      <b>{{ identifierLabel || "(belum ada referensi)" }}</b
      >. Untuk Second Process, Proses/Penempatan/Ukuran tetap wajib diisi manual
      per baris.
    </div>
    <div v-if="loadError" class="komp-error-banner">⚠ {{ loadError }}</div>

    <div class="komp-tabs">
      <div class="komp-tabs-left">
        <button
          class="komp-tab-btn"
          :class="{ active: activeTab === 'potong' }"
          @click="activeTab = 'potong'"
        >
          <IconScissors :size="14" class="mr-1" /> POTONG
          <span v-if="listPotong.length" class="tab-badge">{{
            listPotong.length
          }}</span>
        </button>
        <button
          class="komp-tab-btn"
          :class="{ active: activeTab === 'cetakbordir' }"
          @click="activeTab = 'cetakbordir'"
        >
          <IconPrinter :size="14" class="mr-1" /> SECOND PROCESS
          <span v-if="listCetakBordir.length" class="tab-badge">{{
            listCetakBordir.length
          }}</span>
        </button>
      </div>
      <button
        type="button"
        class="btn-add-row"
        @click="activeTab === 'potong' ? addPotongRow() : addCetakBordirRow()"
      >
        <IconPlus :size="13" class="mr-1" /> Tambah Baris
      </button>
    </div>

    <div class="komp-body">
      <div v-if="isLoading" class="loading-row">
        Memuat data dari Proof Garmen...
      </div>

      <template v-else>
        <!-- POTONG — Kode/Nama otomatis dari Proof, tapi bisa ditambah/hapus manual -->
        <div v-show="activeTab === 'potong'" class="komp-pane">
          <table class="komp-table">
            <thead>
              <tr>
                <th style="width: 40px">No</th>
                <th style="width: 160px">Kode</th>
                <th>Nama Komponen</th>
                <th style="width: 36px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in listPotong" :key="'p' + idx">
                <td class="text-center">{{ Number(idx) + 1 }}</td>
                <td>
                  <div class="igrp-komp">
                    <input
                      v-model="item.Kode"
                      class="cell-inp mono-inp"
                      placeholder="Kode"
                      @keydown="onKodeF1($event, 'potong', Number(idx))"
                      @keydown.enter.prevent="
                        validateKodeOnEnter('potong', Number(idx))
                      "
                    />
                    <button
                      type="button"
                      class="blkp-komp"
                      title="Cari Bahan (F1)"
                      @click="openBahanLookup('potong', Number(idx))"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    :value="item.Nama"
                    readonly
                    class="cell-inp cell-ro"
                    placeholder="Nama otomatis dari Kode"
                  />
                </td>
                <td class="text-center">
                  <button
                    type="button"
                    class="btn-del"
                    title="Hapus baris"
                    @click="removePotongRow(Number(idx))"
                  >
                    <IconTrash :size="13" color="#c62828" />
                  </button>
                </td>
              </tr>
              <tr v-if="listPotong.length === 0">
                <td colspan="4" class="empty-row">
                  Belum ada data. Klik "Tambah Baris" untuk menambah manual,
                  atau data akan otomatis terisi kalau Proof Garmen sudah
                  diinput.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- SECOND PROCESS — Kode/Nama readonly, Proses/Penempatan/Ukuran manual -->
        <div v-show="activeTab === 'cetakbordir'" class="komp-pane">
          <table class="komp-table">
            <thead>
              <tr>
                <th style="width: 40px">No</th>
                <th style="width: 130px">Kode</th>
                <th style="min-width: 160px">Nama Komponen</th>
                <th style="width: 110px">Proses</th>
                <th style="width: 160px">Penempatan</th>
                <th style="width: 130px">Ukuran</th>
                <th style="width: 36px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in listCetakBordir" :key="'cb' + idx">
                <td class="text-center">{{ Number(idx) + 1 }}</td>
                <td>
                  <div class="igrp-komp">
                    <input
                      v-model="item.Kode"
                      class="cell-inp mono-inp"
                      placeholder="Kode"
                      @keydown="onKodeF1($event, 'cetakbordir', Number(idx))"
                      @keydown.enter.prevent="
                        validateKodeOnEnter('cetakbordir', Number(idx))
                      "
                    />
                    <button
                      type="button"
                      class="blkp-komp"
                      title="Cari Bahan (F1)"
                      @click="openBahanLookup('cetakbordir', Number(idx))"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    :value="item.Nama"
                    readonly
                    class="cell-inp cell-ro"
                    placeholder="Nama otomatis dari Kode"
                  />
                </td>
                <td>
                  <select v-model="item.Proses" class="cell-sel">
                    <option v-for="p in prosesOptions" :key="p" :value="p">
                      {{ p }}
                    </option>
                  </select>
                </td>
                <td>
                  <input
                    v-model="item.Penempatan"
                    class="cell-inp"
                    placeholder="Mis: Kanan Atas"
                  />
                </td>
                <td>
                  <input
                    v-model="item.Ukuran"
                    class="cell-inp"
                    placeholder="Mis: 10x10 cm"
                  />
                </td>
                <td class="text-center">
                  <button
                    type="button"
                    class="btn-del"
                    title="Hapus baris"
                    @click="removeCetakBordirRow(Number(idx))"
                  >
                    <IconTrash :size="13" color="#c62828" />
                  </button>
                </td>
              </tr>
              <tr v-if="listCetakBordir.length === 0">
                <td colspan="7" class="empty-row">
                  Belum ada data. Klik "Tambah Baris" untuk menambah manual,
                  atau data akan otomatis terisi kalau Proof Garmen sudah
                  diinput.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>

  <BahanSearchModal
    v-model="showBahanModal"
    mode="komponen"
    @selected="applyBahanToRow"
  />
</template>

<style scoped>
.komp-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.komp-info-banner {
  display: flex;
  align-items: center;
  background: #e3f2fd;
  color: #0d47a1;
  border: 1px solid #90caf9;
  border-radius: 4px;
  padding: 7px 10px;
  font-size: 11px;
  margin-bottom: 8px;
  line-height: 1.4;
}
.komp-error-banner {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
  border-radius: 4px;
  padding: 7px 10px;
  font-size: 11px;
  margin-bottom: 8px;
  font-weight: 600;
}
.cell-sel,
.cell-inp {
  width: 100%;
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}
.btn-del {
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  padding: 3px 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-del:hover {
  background: #ffcdd2;
}
.cell-sel:focus,
.cell-inp:focus {
  border-color: #1565c0;
}
.komp-tab-btn {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  background: #e0e0e0;
  border: 1px solid #ccc;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  gap: 4px;
}
.komp-tab-btn.active {
  background: white;
  color: #1565c0;
  border-bottom: 2px solid white;
  margin-bottom: -1px;
}
.tab-badge {
  background: #1565c0;
  color: white;
  border-radius: 8px;
  padding: 0 5px;
  font-size: 10px;
}
.komp-tab-btn.active .tab-badge {
  background: #1565c0;
}
.komp-body {
  flex: 1;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 10px;
}
.loading-row {
  text-align: center;
  padding: 24px;
  color: #757575;
  font-style: italic;
}
.komp-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  font-size: 11px;
}
.komp-table thead th {
  background: #f5f5f5;
  padding: 6px 8px;
  font-weight: 700;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}
.komp-table tbody td {
  padding: 6px 8px;
  border-bottom: 1px solid #eeeeee;
}
.mono {
  font-family: monospace;
  color: #1565c0;
  font-weight: 600;
}
.text-center {
  text-align: center;
}
.proses-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.chip-sablon {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-bordir {
  background: #fce4ec;
  color: #ad1457;
}
.empty-row {
  text-align: center;
  padding: 16px;
  color: #bdbdbd;
  font-style: italic;
}
.komp-tabs {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 8px 8px 0;
  background: #eeeeee;
  border-bottom: 1px solid #bdbdbd;
}
.komp-tabs-left {
  display: flex;
  gap: 4px;
}
.btn-add-row {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px 4px 0 0;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 2px;
}
.btn-add-row:hover {
  opacity: 0.9;
}
.mono-inp {
  font-family: monospace;
  color: #1565c0;
  font-weight: 600;
}
.igrp-komp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.igrp-komp .cell-inp {
  border: none;
  height: 24px;
  border-radius: 0;
}
.blkp-komp {
  width: 26px;
  min-width: 26px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.blkp-komp:hover {
  background: #bbdefb;
}
.cell-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
  cursor: not-allowed;
}
</style>
