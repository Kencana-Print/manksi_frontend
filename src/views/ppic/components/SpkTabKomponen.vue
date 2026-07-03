<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import { spkFormService } from "@/services/ppic/spkFormService";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import {
  IconScissors,
  IconPrinter,
  IconPlus,
  IconTrash,
  IconSearch,
} from "@tabler/icons-vue";

const props = defineProps<{
  formData: any;
  isEdit: boolean;
}>();

const toast = useToast();
const activeTab = ref("potong");

const lookupOptions = ref<any[]>([]);
const lookupBordirOptions = ref<any[]>([]);

const showBahanModal = ref(false);
const activeBahanType = ref<"ListPotong" | "ListCetakBordir">("ListPotong");
const activeBahanIndex = ref(-1);

const loadLookups = async () => {
  try {
    const [resAll, resBordir] = await Promise.all([
      spkFormService.getKomponenMaster(),
      spkFormService.getKomponenMaster(true),
    ]);
    lookupOptions.value = resAll.data.data;
    lookupBordirOptions.value = resBordir.data.data;
  } catch {
    toast.error("Gagal memuat lookup bahan.");
  }
};

const ensureKomponenStruct = () => {
  if (!props.formData.KomponenSpk) {
    props.formData.KomponenSpk = { ListPotong: [], ListCetakBordir: [] };
  }
};

// ── Pastikan selalu ada minimal 1 baris kosong di kedua list ──
const ensureTrailingEmptyRowPotong = () => {
  ensureKomponenStruct();
  const rows = props.formData.KomponenSpk.ListPotong;
  const last = rows[rows.length - 1];
  if (rows.length === 0 || (last && last.Kode)) {
    rows.push({ Kode: null, Nama: "" });
  }
};

const ensureTrailingEmptyRowCetakBordir = () => {
  ensureKomponenStruct();
  const rows = props.formData.KomponenSpk.ListCetakBordir;
  const last = rows[rows.length - 1];
  if (
    rows.length === 0 ||
    (last && (last.Kode || last.Penempatan || last.Ukuran))
  ) {
    rows.push({
      Kode: null,
      Nama: "",
      Proses: prosesOptions.value[0] || "DTF",
      Penempatan: "",
      Ukuran: "",
    });
  }
};

// onMounted sebagai jaring pengaman utama — tidak bergantung sepenuhnya pada watcher,
// karena formData bisa diisi parent (mode edit) atau SpkTabOrder (mode create) dengan
// timing yang berbeda-beda relatif terhadap mount komponen ini.
onMounted(() => {
  loadLookups();
  ensureKomponenStruct();
  ensureTrailingEmptyRowPotong();
  ensureTrailingEmptyRowCetakBordir();
});

watch(
  () => props.formData.so_nomor,
  (nomor) => {
    if (nomor) {
      ensureKomponenStruct();
      ensureTrailingEmptyRowPotong();
      ensureTrailingEmptyRowCetakBordir();
    }
  },
);

const prosesOptions = computed(() => {
  const opsi: string[] = [];
  if (props.formData.so_sablon === "Y") opsi.push("SABLON");
  if (props.formData.so_bordir === "Y") opsi.push("BORDIR");
  if (props.formData.so_sublim === "Y") opsi.push("SUBLIM");

  // DTF hanya kalau tidak ada proses dari SO
  if (opsi.length === 0) opsi.push("DTF");

  return opsi;
});

const listPotong = computed<any[]>(
  () => props.formData.KomponenSpk?.ListPotong || [],
);
const listCetakBordir = computed<any[]>(
  () => props.formData.KomponenSpk?.ListCetakBordir || [],
);

const lookupKodeBahan = (kode: string, isBordir: boolean) => {
  const options = isBordir ? lookupBordirOptions.value : lookupOptions.value;
  const input = kode.trim().toUpperCase();

  // 1. Exact match dulu (kode lengkap)
  let found = options.find((i: any) => (i.Kode || "").toUpperCase() === input);
  if (found) return found;

  // 2. Kalau input hanya digit (3-6 angka), cocokkan dengan suffix kode
  if (/^\d{1,6}$/.test(input)) {
    const padded = input.padStart(6, "0"); // "450" → "000450"
    found = options.find((i: any) => {
      const kodeUpper = (i.Kode || "").toUpperCase();
      return kodeUpper.endsWith(padded) || kodeUpper.endsWith(input);
    });
    if (found) return found;
  }

  return null;
};

// ── POTONG ──
const onKodePotongEnter = (idx: number) => {
  ensureKomponenStruct();
  const row = props.formData.KomponenSpk.ListPotong[idx];
  const kode = row.Kode?.trim();
  if (!kode) {
    row.Nama = "";
    return;
  }
  const found = lookupKodeBahan(kode, false);
  if (found) {
    row.Kode = found.Kode;
    row.Nama = found.Nama;
    ensureTrailingEmptyRowPotong();
  } else {
    toast.error("Kode komponen tidak ditemukan.");
    row.Kode = null;
    row.Nama = "";
  }
};

const onKodePotongF1 = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openBahanModalPotong(idx);
  }
};

const openBahanModalPotong = (index: number) => {
  ensureKomponenStruct();
  activeBahanType.value = "ListPotong";
  activeBahanIndex.value = index;
  showBahanModal.value = true;
};

const addRowPotong = () => {
  ensureKomponenStruct();
  props.formData.KomponenSpk.ListPotong.push({ Kode: null, Nama: "" });
};

const removeRowPotong = (index: number) => {
  props.formData.KomponenSpk.ListPotong.splice(index, 1);
  if (props.formData.KomponenSpk.ListPotong.length === 0) {
    ensureTrailingEmptyRowPotong();
  }
};

// ── CETAK + BORDIR (gabungan) ──
const onKodeCetakBordirEnter = (idx: number) => {
  ensureKomponenStruct();
  const row = props.formData.KomponenSpk.ListCetakBordir[idx];
  const kode = row.Kode?.trim();
  if (!kode) {
    row.Nama = "";
    return;
  }
  const found = lookupKodeBahan(kode, true) || lookupKodeBahan(kode, false);
  if (found) {
    const isDuplicate = props.formData.KomponenSpk.ListCetakBordir.some(
      (r: any, i: number) =>
        r.Kode === found.Kode && r.Proses === row.Proses && i !== idx,
    );
    if (isDuplicate) {
      toast.warning(
        `Kode ${found.Kode} dengan proses ${row.Proses} sudah ada di baris lain.`,
      );
      row.Kode = null;
      row.Nama = "";
      return;
    }
    row.Kode = found.Kode;
    row.Nama = found.Nama;
    ensureTrailingEmptyRowCetakBordir();
  } else {
    toast.error("Kode komponen tidak ditemukan.");
    row.Kode = null;
    row.Nama = "";
  }
};

const onKodeCetakBordirF1 = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openBahanModalCetakBordir(idx);
  }
};

const openBahanModalCetakBordir = (index: number) => {
  ensureKomponenStruct();
  activeBahanType.value = "ListCetakBordir";
  activeBahanIndex.value = index;
  showBahanModal.value = true;
};

const addRowCetakBordir = () => {
  ensureKomponenStruct();
  props.formData.KomponenSpk.ListCetakBordir.push({
    Kode: null,
    Nama: "",
    Proses: prosesOptions.value[0] || "DTF",
    Penempatan: "",
    Ukuran: "",
  });
};

const removeRowCetakBordir = (index: number) => {
  props.formData.KomponenSpk.ListCetakBordir.splice(index, 1);
  if (props.formData.KomponenSpk.ListCetakBordir.length === 0) {
    ensureTrailingEmptyRowCetakBordir();
  }
};

// ── Handle pilih bahan dari modal ──
const handleBahanSelected = (bahan: any) => {
  ensureKomponenStruct();
  const type = activeBahanType.value;
  const index = activeBahanIndex.value;
  const list =
    type === "ListPotong"
      ? props.formData.KomponenSpk.ListPotong
      : props.formData.KomponenSpk.ListCetakBordir;

  if (type === "ListPotong") {
    const isDuplicate = list.some(
      (row: any, i: number) => row.Kode === bahan.Kode && i !== index,
    );
    if (isDuplicate) {
      toast.warning(`Kode ${bahan.Kode} sudah ada di baris lain.`);
      return;
    }
  }

  list[index].Kode = bahan.Kode;
  list[index].Nama = bahan.Nama;

  if (type === "ListPotong") {
    ensureTrailingEmptyRowPotong();
  } else {
    ensureTrailingEmptyRowCetakBordir();
  }
};
</script>

<template>
  <div class="komp-layout">
    <div class="komp-tabs">
      <button
        class="komp-tab-btn"
        :class="{ active: activeTab === 'potong' }"
        @click="activeTab = 'potong'"
      >
        <IconScissors :size="14" class="mr-1" /> POTONG
      </button>
      <button
        class="komp-tab-btn"
        :class="{ active: activeTab === 'cetakbordir' }"
        @click="activeTab = 'cetakbordir'"
      >
        <IconPrinter :size="14" class="mr-1" /> SECOND PROCESS
      </button>
    </div>

    <div class="komp-body">
      <!-- POTONG -->
      <div v-show="activeTab === 'potong'" class="komp-pane">
        <div class="komp-pane-header">
          <span class="komp-pane-title text-blue">
            <IconScissors :size="14" class="mr-1" /> Komponen Potong
          </span>
          <button type="button" class="btn-add" @click="addRowPotong">
            <IconPlus :size="13" class="mr-1" /> Tambah
          </button>
        </div>
        <table class="komp-table">
          <thead>
            <tr>
              <th style="width: 40px">No</th>
              <th style="width: 160px">Kode</th>
              <th>Nama Komponen</th>
              <th style="width: 50px">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in listPotong" :key="'p' + idx">
              <td class="text-center">{{ idx + 1 }}</td>
              <td>
                <div class="igrp">
                  <input
                    v-model="item.Kode"
                    class="cell-inp"
                    placeholder="Kode/F1"
                    @keydown="onKodePotongF1($event, idx)"
                    @keydown.enter.prevent="onKodePotongEnter(idx)"
                    @blur="onKodePotongEnter(idx)"
                  />
                  <button
                    type="button"
                    class="blkp"
                    title="Cari Komponen (F1)"
                    @mousedown.prevent="openBahanModalPotong(idx)"
                  >
                    <IconSearch :size="12" color="#1565c0" />
                  </button>
                </div>
              </td>
              <td>{{ item.Nama }}</td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn-del"
                  @click="removeRowPotong(idx)"
                >
                  <IconTrash :size="13" color="#c62828" />
                </button>
              </td>
            </tr>
            <tr v-if="listPotong.length === 0">
              <td colspan="4" class="empty-row">Belum ada data</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- CETAK + BORDIR -->
      <div v-show="activeTab === 'cetakbordir'" class="komp-pane">
        <div class="komp-pane-header">
          <span class="komp-pane-title text-orange">
            <IconPrinter :size="14" class="mr-1" /> Komponen Second Process
          </span>
          <button type="button" class="btn-add" @click="addRowCetakBordir">
            <IconPlus :size="13" class="mr-1" /> Tambah
          </button>
        </div>

        <div class="proses-info">
          <span class="proses-info-lbl">Proses dari SO:</span>
          <span
            v-for="p in prosesOptions"
            :key="p"
            class="proses-chip"
            :class="{ 'proses-chip--auto': p === 'DTF' }"
          >
            {{ p }}
          </span>
        </div>

        <table class="komp-table">
          <thead>
            <tr>
              <th style="width: 40px">No</th>
              <th style="width: 160px">Kode</th>
              <th>Nama Komponen</th>
              <th style="width: 110px">Proses</th>
              <th style="width: 140px">Penempatan</th>
              <th style="width: 110px">Ukuran</th>
              <th style="width: 50px">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in listCetakBordir" :key="'cb' + idx">
              <td class="text-center">{{ idx + 1 }}</td>
              <td>
                <div class="igrp">
                  <input
                    v-model="item.Kode"
                    class="cell-inp"
                    placeholder="Kode/F1"
                    @keydown="onKodeCetakBordirF1($event, idx)"
                    @keydown.enter.prevent="onKodeCetakBordirEnter(idx)"
                    @blur="onKodeCetakBordirEnter(idx)"
                  />
                  <button
                    type="button"
                    class="blkp"
                    title="Cari Komponen (F1)"
                    @mousedown.prevent="openBahanModalCetakBordir(idx)"
                  >
                    <IconSearch :size="12" color="#1565c0" />
                  </button>
                </div>
              </td>
              <td>{{ item.Nama }}</td>
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
                  @input="ensureTrailingEmptyRowCetakBordir"
                />
              </td>
              <td>
                <input
                  v-model="item.Ukuran"
                  class="cell-inp"
                  placeholder="Mis: 10x10 cm"
                  @input="ensureTrailingEmptyRowCetakBordir"
                />
              </td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn-del"
                  @click="removeRowCetakBordir(idx)"
                >
                  <IconTrash :size="13" color="#c62828" />
                </button>
              </td>
            </tr>
            <tr v-if="listCetakBordir.length === 0">
              <td colspan="7" class="empty-row">Belum ada data</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <BahanSearchModal
    v-model="showBahanModal"
    mode="komponen"
    @selected="handleBahanSelected"
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
.komp-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px 0;
  background: #eeeeee;
  border-bottom: 1px solid #bdbdbd;
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
}
.komp-tab-btn.active {
  background: white;
  color: #1565c0;
  border-bottom: 2px solid white;
  margin-bottom: -1px;
}
.komp-body {
  flex: 1;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 10px;
}
.komp-pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.komp-pane-title {
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
}
.text-blue {
  color: #1565c0;
}
.text-orange {
  color: #e65100;
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

.proses-info {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 6px 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.proses-info-lbl {
  font-weight: 700;
  color: #424242;
}
.proses-chip {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
  border-radius: 3px;
  padding: 2px 8px;
  font-weight: 700;
  font-size: 10px;
}
.proses-chip--auto {
  background: #e3f2fd;
  color: #1565c0;
  border-color: #90caf9;
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
  padding: 5px 8px;
  border-bottom: 1px solid #eeeeee;
}

/* Input group (kode + tombol cari) */
.igrp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.igrp .cell-inp {
  border: none;
  height: 24px;
}
.blkp {
  width: 24px;
  min-width: 24px;
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
.blkp:hover {
  background: #bbdefb;
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
.cell-sel:focus,
.cell-inp:focus {
  border-color: #1565c0;
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
</style>
