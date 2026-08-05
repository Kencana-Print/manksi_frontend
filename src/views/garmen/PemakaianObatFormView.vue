<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import { pemakaianObatFormService } from "@/services/garmen/pemakaianObatFormService";
import { IconFlask, IconSearch, IconTrash } from "@tabler/icons-vue";

interface KomponenRow {
  kode: string;
  nama: string;
  hasil: number;
}

interface DetailRow {
  jenis: string;
  okode: string;
  satuan: string;
  jumlah: number;
  qty: number;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const nomorParam = computed(() => route.params.nomor as string | undefined);
const isEditMode = computed(() => !!nomorParam.value);

const isLoading = ref(true);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const showPrintDialog = ref(false);
const savedNomor = ref("");

function getLocalDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// --- STATE HEADER ---
const nomor = ref("");
const tanggal = ref(getLocalDate());
const cabang = ref("");
const spkNomor = ref("");
const namaBarang = ref(""); // "Product" - readonly, hasil resolve SPK
const jenisBarang = ref(""); // "Jenis Produk" - readonly
const jumlahSpk = ref<number | null>(null); // "Jumlah Spk" - readonly, hasil resolve SPK
const lini = ref("");
const keterangan = ref("");

// --- META ---
const cabangOptions = ref<string[]>([]);
const liniOptions = ref<string[]>([]);
const jenisObatOptions = ref<{ kode: string; nama: string; satuan: string }[]>(
  [],
);

// ⚠️ Field ini di source Delphi (.pas) sebenarnya cbCab/ob_cab —
// dilabeli "Gudang" di UI Delphi tapi secara data & opsi (P01/P04)
// persis pola Cabang, bukan gudang beneran. Direplikasi sebagai Cabang.
const isCabangLocked = computed(() => isEditMode.value);

// --- KOMPONEN (grid kecil) ---
const komponenRows = ref<KomponenRow[]>([]);
const blankKomponen = (): KomponenRow => ({ kode: "", nama: "", hasil: 0 });
const ensureTrailingKomponen = () => {
  const last = komponenRows.value[komponenRows.value.length - 1];
  if (!last || last.kode) komponenRows.value.push(blankKomponen());
};
const totalHasil = computed(() =>
  komponenRows.value.reduce(
    (s, r) => (r.kode ? s + Number(r.hasil || 0) : s),
    0,
  ),
);

// --- DETAIL OBAT (grid utama) ---
const detailRows = ref<DetailRow[]>([]);
const blankDetail = (): DetailRow => ({
  jenis: "",
  okode: "",
  satuan: "",
  jumlah: 0,
  qty: 0,
});
const ensureTrailingDetail = () => {
  const last = detailRows.value[detailRows.value.length - 1];
  if (!last || last.jenis) detailRows.value.push(blankDetail());
};
const totalJumlah = computed(() =>
  detailRows.value.reduce(
    (s, r) => (r.jenis ? s + Number(r.jumlah || 0) : s),
    0,
  ),
);
const totalQty = computed(() =>
  detailRows.value.reduce((s, r) => (r.jenis ? s + Number(r.qty || 0) : s), 0),
);

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

// ══ Refs focus-chain ══
const spkNomorRef = ref<HTMLInputElement | null>(null);
const keteranganRef = ref<HTMLInputElement | null>(null);
const komponenKodeRefs = ref<Record<number, HTMLInputElement | null>>({});
const komponenHasilRefs = ref<Record<number, HTMLInputElement | null>>({});
const detailJumlahRefs = ref<Record<number, HTMLInputElement | null>>({});

// --- LOAD META ---
const loadMeta = async () => {
  const res = await pemakaianObatFormService.getMeta();
  cabangOptions.value = res.data.data.cabangOptions;
  liniOptions.value = res.data.data.liniOptions;
  jenisObatOptions.value = res.data.data.jenisObatOptions;
};

// --- LOAD DATA ---
const loadData = async () => {
  isLoading.value = true;
  try {
    await loadMeta();

    if (isEditMode.value) {
      const res = await pemakaianObatFormService.getFormData(nomorParam.value!);
      const d = res.data.data;
      nomor.value = d.ob_nomor;
      tanggal.value = String(d.ob_tanggal).substring(0, 10);
      cabang.value = d.ob_cab;
      spkNomor.value = d.ob_spk_nomor;
      namaBarang.value = d.namaSpk;
      jenisBarang.value = d.jenisOrder;
      jumlahSpk.value = d.spkJumlah;
      lini.value = d.ob_lini;
      keterangan.value = d.ob_keterangan || "";

      komponenRows.value = (d.komponen || []).map((k: any) => ({
        kode: k.kode,
        nama: k.nama,
        hasil: Number(k.hasil) || 0,
      }));
      ensureTrailingKomponen();

      detailRows.value = (d.details || []).map((r: any) => ({
        jenis: r.jenis,
        okode: r.okode,
        satuan: r.satuan,
        jumlah: Number(r.jumlah) || 0,
        qty: Number(r.qty) || 0,
      }));
      ensureTrailingDetail();
    } else {
      cabang.value = cabangOptions.value[0] || "";
      lini.value = liniOptions.value[0] || "";
      komponenRows.value = [blankKomponen()];
      detailRows.value = [blankDetail()];
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    router.push("/garmen/pemakaian-obat");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// --- SPK ---
const spkModalOpen = ref(false);

const resolveSpkNomor = async (nomorSpk: string) => {
  try {
    const res = await pemakaianObatFormService.resolveSpk(nomorSpk);
    const d = res.data.data;
    namaBarang.value = d.namaBarang;
    jenisBarang.value = d.jenisBarang;
    jumlahSpk.value = d.jumlah;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nomor SPK tersebut tidak ada.");
    namaBarang.value = "";
    jenisBarang.value = "";
    jumlahSpk.value = null;
    if (!isEditMode.value) spkNomorRef.value?.focus();
  }
};

const onSpkBlur = () => {
  if (!spkNomor.value.trim()) {
    namaBarang.value = "";
    jenisBarang.value = "";
    jumlahSpk.value = null;
    return;
  }
  resolveSpkNomor(spkNomor.value.trim());
};

const onSpkSelected = (item: any) => {
  spkNomor.value = item.Nomor;
  resolveSpkNomor(item.Nomor);
};

const onSpkKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    spkModalOpen.value = true;
  }
};

// --- KOMPONEN ---
const komponenModalOpen = ref(false);
const activeKomponenIdx = ref<number | null>(null);

const openKomponenModal = (idx: number) => {
  if (komponenRows.value[idx].nama) return;
  activeKomponenIdx.value = idx;
  komponenModalOpen.value = true;
};

const applyKomponenToRow = (idx: number, kode: string, nama: string) => {
  const dupIdx = komponenRows.value.findIndex(
    (r, i) => i !== idx && r.kode === kode,
  );
  if (dupIdx !== -1) {
    toast.warning(`Komponen ini sudah di input, di baris ${dupIdx + 1}`);
    komponenRows.value[idx].kode = "";
    return;
  }
  komponenRows.value[idx] = { kode, nama, hasil: 0 };
  ensureTrailingKomponen();
  nextTick(() => komponenHasilRefs.value[idx]?.focus());
};

const onKomponenSelected = (item: any) => {
  const idx = activeKomponenIdx.value;
  if (idx === null) return;
  applyKomponenToRow(idx, item.Kode, item.Nama);
};

const onKomponenKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openKomponenModal(idx);
  }
};

const onKomponenKodeBlur = async (idx: number) => {
  const kode = (komponenRows.value[idx].kode || "").trim();
  if (!kode || komponenRows.value[idx].nama) return;
  try {
    const res = await pemakaianObatFormService.resolveKomponen(kode);
    applyKomponenToRow(idx, res.data.data.kode, res.data.data.nama);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Komponen ini belum ada.");
    komponenRows.value[idx].kode = "";
  }
};

const deleteKomponenDialog = ref(false);
const komponenToDeleteIdx = ref<number | null>(null);
const requestRemoveKomponen = (idx: number) => {
  komponenToDeleteIdx.value = idx;
  deleteKomponenDialog.value = true;
};
const confirmRemoveKomponen = () => {
  if (komponenToDeleteIdx.value === null) return;
  komponenRows.value.splice(komponenToDeleteIdx.value, 1);
  ensureTrailingKomponen();
  deleteKomponenDialog.value = false;
  komponenToDeleteIdx.value = null;
};

// --- DETAIL OBAT ---
const onJenisChange = (idx: number, e: Event) => {
  const nama = (e.target as HTMLSelectElement).value;
  const row = detailRows.value[idx];

  if (!nama) {
    row.jenis = "";
    row.okode = "";
    row.satuan = "";
    return;
  }

  const opt = jenisObatOptions.value.find((o) => o.nama === nama);
  if (!opt) {
    toast.error("Jenis obat tidak ada.");
    row.jenis = "";
    row.okode = "";
    return;
  }

  const dupIdx = detailRows.value.findIndex(
    (r, i) => i !== idx && r.okode === opt.kode,
  );
  if (dupIdx !== -1) {
    toast.warning(`Jenis Obat ini sudah di input, di baris ${dupIdx + 1}`);
    row.jenis = "";
    return;
  }

  row.jenis = opt.nama;
  row.okode = opt.kode;
  row.satuan = opt.satuan;
  ensureTrailingDetail();
  nextTick(() => detailJumlahRefs.value[idx]?.focus());
};

// Sinkron 2-arah Jumlah <-> Qty/Gram, HANYA kalau satuan===KG
// (replikasi cljumlah/clQty PropertiesEditValueChanged persis)
const onJumlahInput = (row: DetailRow) => {
  if (row.satuan === "KG") {
    row.qty = Number(row.jumlah || 0) * 1000;
  }
};
const onQtyInput = (row: DetailRow) => {
  if (row.satuan === "KG") {
    row.jumlah = Number(row.qty || 0) / 1000;
  }
};

const deleteDetailDialog = ref(false);
const detailToDeleteIdx = ref<number | null>(null);
const requestRemoveDetail = (idx: number) => {
  detailToDeleteIdx.value = idx;
  deleteDetailDialog.value = true;
};
const confirmRemoveDetail = () => {
  if (detailToDeleteIdx.value === null) return;
  detailRows.value.splice(detailToDeleteIdx.value, 1);
  ensureTrailingDetail();
  deleteDetailDialog.value = false;
  detailToDeleteIdx.value = null;
};

// --- VALIDASI LOKAL --- (replikasi persis btnSimpanClick)
const onValidateSave = () => {
  if (!namaBarang.value) {
    toast.error("Spk belum di isi.");
    spkNomorRef.value?.focus();
    return;
  }

  const filledKomponen = komponenRows.value.filter((r) => r.kode);
  if (filledKomponen.length === 0) {
    return toast.error("Komponen harus diisi.");
  }
  for (const r of filledKomponen) {
    if (!r.hasil || Number(r.hasil) === 0) {
      return toast.error("Hasil produksi harus diisi.");
    }
  }

  const filledDetail = detailRows.value.filter((r) => r.jenis);
  if (filledDetail.length === 0) {
    return toast.error("Detail harus diisi.");
  }
  for (const r of filledDetail) {
    if (!r.okode) {
      return toast.error("Jenis obat tidak terdaftar.");
    }
    if (!r.jumlah || Number(r.jumlah) === 0) {
      return toast.error("Jumlah harus diisi.");
    }
  }

  showSaveDialog.value = true;
};

// --- SUBMIT SIMPAN ---
const onConfirmSave = async () => {
  isSaving.value = true;
  try {
    const payload = {
      tanggal: tanggal.value,
      spkNomor: spkNomor.value,
      namaBarang: namaBarang.value,
      lini: lini.value,
      keterangan: keterangan.value,
      cabang: cabang.value,
      komponen: komponenRows.value
        .filter((r) => r.kode)
        .map((r) => ({ kode: r.kode, hasil: r.hasil })),
      details: detailRows.value
        .filter((r) => r.jenis)
        .map((r) => ({ jenis: r.jenis, okode: r.okode, jumlah: r.jumlah })),
    };

    let resultNomor = nomor.value;
    if (isEditMode.value) {
      const res = await pemakaianObatFormService.update(nomor.value, payload);
      resultNomor = res.data.data.nomor;
    } else {
      const res = await pemakaianObatFormService.create(payload);
      resultNomor = res.data.data.nomor;
    }

    showSaveDialog.value = false;
    savedNomor.value = resultNomor;
    showPrintDialog.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Simpan");
  } finally {
    isSaving.value = false;
  }
};

// --- BATAL / TUTUP ---
const onConfirmCancel = () => {
  showCancelDialog.value = false;
  loadData();
};
const onConfirmClose = () => {
  router.push("/garmen/pemakaian-obat");
};

const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/pemakaian-obat/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.push("/garmen/pemakaian-obat");
};
const skipCetak = () => {
  showPrintDialog.value = false;
  router.push("/garmen/pemakaian-obat");
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Pemakaian Obat' : 'Pemakaian Obat'"
    menu-id="120"
    :icon="IconFlask"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidateSave"
    @confirm-save="onConfirmSave"
    @confirm-cancel="onConfirmCancel"
    @confirm-close="onConfirmClose"
  >
    <!-- LEFT COLUMN: Header -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="mb-3">
          <label class="f-label">Cabang</label>
          <select v-model="cabang" class="sel-inp" :disabled="isCabangLocked">
            <option v-for="c in cabangOptions" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>

        <div class="mb-3">
          <label class="f-label">Nomor</label>
          <v-text-field
            :model-value="nomor || '<-- Kosong = Baru'"
            variant="outlined"
            density="compact"
            readonly
            hide-details
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Tanggal</label>
          <v-text-field
            v-model="tanggal"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Nomor SPK</label>
          <div class="cell-grp">
            <input
              :ref="(el) => (spkNomorRef = el as any)"
              v-model="spkNomor"
              class="ci"
              placeholder="F1 / nomor SPK + Enter"
              autocomplete="off"
              @keydown="onSpkKeydown"
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @blur="onSpkBlur"
            />
            <button
              type="button"
              class="ci-btn"
              title="Cari SPK (F1)"
              @click="spkModalOpen = true"
            >
              <IconSearch :size="11" />
            </button>
          </div>
        </div>

        <div class="mb-3">
          <label class="f-label">Product</label>
          <v-text-field
            :model-value="namaBarang"
            variant="outlined"
            density="compact"
            readonly
            hide-details
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Jenis Produk</label>
          <v-text-field
            :model-value="jenisBarang"
            variant="outlined"
            density="compact"
            readonly
            hide-details
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Jumlah Spk</label>
          <v-text-field
            :model-value="jumlahSpk !== null ? numFmt(jumlahSpk) : ''"
            variant="outlined"
            density="compact"
            readonly
            hide-details
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Lini</label>
          <select v-model="lini" class="sel-inp">
            <option v-for="l in liniOptions" :key="l" :value="l">
              {{ l }}
            </option>
          </select>
        </div>

        <div class="mb-3">
          <label class="f-label">Keterangan</label>
          <v-text-field
            :ref="(el) => (keteranganRef = el as any)"
            v-model="keterangan"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="two-table-wrap">
        <!-- Tabel Komponen (kecil) -->
        <div class="table-panel komponen-panel">
          <div class="grid-title">Komponen</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="28" class="text-center">No</th>
                <th width="90">Kode</th>
                <th>Nama Komponen</th>
                <th width="90" class="tr">Hasil Produksi(Pcs)</th>
                <th width="28"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in komponenRows" :key="idx">
                <td class="text-center">{{ idx + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="row.kode"
                      :ref="(el) => (komponenKodeRefs[idx] = el as any)"
                      class="ci"
                      style="
                        text-transform: uppercase;
                        font-weight: 600;
                        color: #1565c0;
                      "
                      placeholder="F1 / kode"
                      :readonly="!!row.nama"
                      autocomplete="off"
                      @keydown="onKomponenKeydown($event, idx)"
                      @keydown.enter.prevent="
                        ($event.target as HTMLInputElement).blur()
                      "
                      @blur="onKomponenKodeBlur(idx)"
                    />
                    <button
                      v-if="!row.nama"
                      type="button"
                      class="ci-btn"
                      title="Cari Komponen (F1)"
                      @click="openKomponenModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>
                <td>{{ row.nama }}</td>
                <td>
                  <input
                    v-model.number="row.hasil"
                    :ref="(el) => (komponenHasilRefs[idx] = el as any)"
                    type="text"
                    inputmode="decimal"
                    class="cell-input tr"
                    :disabled="!row.nama"
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    v-if="row.kode"
                    icon
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="requestRemoveKomponen(idx)"
                  >
                    <IconTrash :size="14" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="total-label">Total</td>
                <td class="tr total-val">{{ numFmt(totalHasil) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Tabel Detail Obat (lebih besar) -->
        <div class="table-panel obat-panel">
          <div class="grid-title">Detail Pemakaian Obat</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="28" class="text-center">No</th>
                <th width="90">Kode</th>
                <th>Jenis Obat</th>
                <th width="70" class="text-center">Satuan</th>
                <th width="90" class="tr">Jumlah</th>
                <th width="90" class="tr">Qty/Gram</th>
                <th width="28"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in detailRows" :key="idx">
                <td class="text-center">{{ idx + 1 }}</td>
                <td class="mono-cell">{{ row.okode }}</td>
                <td class="p0">
                  <select
                    :value="row.jenis"
                    class="sel-cell"
                    @change="onJenisChange(idx, $event)"
                  >
                    <option value="">-- pilih jenis obat --</option>
                    <option
                      v-for="o in jenisObatOptions"
                      :key="o.kode"
                      :value="o.nama"
                    >
                      {{ o.nama }}
                    </option>
                  </select>
                </td>
                <td class="text-center">{{ row.satuan }}</td>
                <td>
                  <input
                    :ref="(el) => (detailJumlahRefs[idx] = el as any)"
                    v-model.number="row.jumlah"
                    type="text"
                    inputmode="decimal"
                    class="cell-input tr"
                    :disabled="!row.jenis"
                    @input="onJumlahInput(row)"
                  />
                </td>
                <td>
                  <input
                    v-model.number="row.qty"
                    type="text"
                    inputmode="decimal"
                    class="cell-input tr"
                    :disabled="!row.jenis"
                    @input="onQtyInput(row)"
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    v-if="row.jenis"
                    icon
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="requestRemoveDetail(idx)"
                  >
                    <IconTrash :size="14" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="total-label">Total</td>
                <td class="tr total-val">{{ numFmt(totalJumlah) }}</td>
                <td class="tr total-val">{{ numFmt(totalQty) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <SpkSearchModal
    v-model="spkModalOpen"
    filter-mode="spk-ppic"
    @selected="onSpkSelected"
  />
  <BahanSearchModal
    v-model="komponenModalOpen"
    mode="komponen"
    @selected="onKomponenSelected"
  />

  <v-dialog v-model="deleteKomponenDialog" max-width="360">
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 pa-4 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle-outline</v-icon>
        Ingin dihapus?
      </v-card-title>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="deleteKomponenDialog = false"
          >Batal</v-btn
        >
        <v-btn color="error" variant="elevated" @click="confirmRemoveKomponen"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteDetailDialog" max-width="360">
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 pa-4 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle-outline</v-icon>
        Ingin dihapus?
      </v-card-title>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="deleteDetailDialog = false">Batal</v-btn>
        <v-btn color="error" variant="elevated" @click="confirmRemoveDetail"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3"
        >Simpan Berhasil</v-card-title
      >
      <v-card-text class="pa-4 text-center">
        Tersimpan dengan Nomor <b>{{ savedNomor }}</b
        ><br />Ingin cetak transaksi ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="skipCetak">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak"
          >Ya, Cetak</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #555;
  margin-bottom: 4px;
}
.grid-title {
  font-size: 11px;
  font-weight: 700;
  color: #455a64;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.sel-inp {
  height: 36px;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 13px;
  background: white;
  outline: none;
}
.sel-inp:disabled {
  background: #f0f0f0;
  color: #757575;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 1;
}
.detail-table td {
  padding: 2px 4px;
  border-bottom: 1px solid #eee;
}
.detail-table tfoot td {
  border-top: 2px solid #546e7a;
  border-bottom: none;
  padding: 6px 8px;
}
.total-label {
  text-align: right;
  font-weight: 700;
  color: #455a64;
}
.total-val {
  font-weight: 700;
  color: #1565c0;
}
.cell-input {
  width: 100%;
  border: 1px solid transparent;
  padding: 4px 6px;
  font-size: 11px;
  outline: none;
  background: transparent;
}
.cell-input:not([disabled]):not([readonly]) {
  border-color: #ccc;
  background: white;
  border-radius: 3px;
}
.cell-input:focus {
  border-color: #1976d2;
}
.tr {
  text-align: right !important;
}
.mono-cell {
  font-family: monospace;
  color: #757575;
  padding-left: 6px;
}
.sel-cell {
  width: 100%;
  height: 25px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 11px;
  background: white;
  outline: none;
}
.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
}
.cell-grp .ci {
  flex: 1;
}
.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 5px;
  font-family: inherit;
  color: #212121;
}
.ci-btn {
  width: 22px;
  flex-shrink: 0;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-btn:hover {
  background: #e0e0e0;
}

.two-table-wrap {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.table-panel {
  min-width: 0; /* penting biar flex-child bisa shrink & scroll horizontal kalau perlu */
}
.komponen-panel {
  flex: 0 0 420px;
}
.obat-panel {
  flex: 1 1 auto;
}
@media (max-width: 1100px) {
  .two-table-wrap {
    flex-direction: column;
  }
  .komponen-panel {
    flex: 1 1 auto;
    width: 100%;
  }
}
</style>
