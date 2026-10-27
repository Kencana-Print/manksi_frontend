<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  perawatanService,
  type PerawatanFormData,
  type PerawatanDetailItem,
} from "@/services/ga/perawatanService";
import KendaraanSearchModal from "@/components/lookups/KendaraanSearchModal.vue";
import {
  IconTool,
  IconSearch,
  IconTrash,
  IconPlus,
  IconListDetails,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const editNomor = computed(() =>
  decodeURIComponent(String(route.params.nomor || "")),
);
const isEdit = computed(() => !!editNomor.value);

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const initialData: PerawatanFormData = {
  nomor: "",
  tanggal: todayStr(),
  bengkel: "",
  keterangan: "",
  nopol: "",
  km: 0,
  stat: "",
  namaKendaraan: "",
  items: [
    {
      nama: "",
      satuan: "PCS",
      qty: 1,
      nominal: 0,
      tglBeli: todayStr(),
    },
  ],
};

const {
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  goBack,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<PerawatanFormData>({
  menuId: "611",
  initialData,
  submitApi: async (data) => {
    const validItems = (data.items || []).filter(
      (i) => (i.nama || "").trim() !== "",
    );

    const payload: PerawatanFormData = {
      ...data,
      bengkel: (data.bengkel || "").trim().toUpperCase(),
      keterangan: (data.keterangan || "").trim().toUpperCase(),
      nopol: (data.nopol || "").trim().toUpperCase(),
      km: Number(data.km) || 0,
      items: validItems.map((item) => ({
        ...item,
        nama: (item.nama || "").trim().toUpperCase(),
        satuan: (item.satuan || "").trim().toUpperCase(),
        qty: Number(item.qty) || 0,
        nominal: Number(item.nominal) || 0,
        tglBeli: item.tglBeli || todayStr(),
      })),
    };

    if (isEdit.value) {
      return perawatanService.update(editNomor.value, payload);
    } else {
      return perawatanService.create(payload);
    }
  },
  onSuccess: (res: any) => {
    const nomorSaved =
      res?.data?.data?.nomor || formData.value.nomor || editNomor.value || "";
    toast.success(
      isEdit.value
        ? `Perawatan ${editNomor.value} berhasil diperbarui.`
        : `Berhasil disimpan: ${nomorSaved}`,
    );
    router.push({ name: "GaPerawatan" });
  },
});

// ── Helpers Pemisah Ribuan ──────────────────────────────────────────
const formatThousand = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === "" || val === 0) return "";
  const num = typeof val === "string" ? Number(val.replace(/\D/g, "")) : Number(val);
  if (isNaN(num) || num === 0) return "";
  return num.toLocaleString("id-ID");
};

const onKmInput = (e: Event) => {
  const el = e.target as HTMLInputElement;
  const digits = el.value.replace(/\D/g, "");
  const num = digits ? Number(digits) : 0;
  formData.value.km = num;
  el.value = num ? num.toLocaleString("id-ID") : "";
};

const onNominalInput = (e: Event, item: PerawatanDetailItem) => {
  const el = e.target as HTMLInputElement;
  const digits = el.value.replace(/\D/g, "");
  const num = digits ? Number(digits) : 0;
  item.nominal = num;
  el.value = num ? num.toLocaleString("id-ID") : "";
};

// ── Detail Items Actions ──────────────────────────────────────────────
const addRow = () => {
  if (!formData.value.items) {
    formData.value.items = [];
  }
  formData.value.items.push({
    nama: "",
    satuan: "PCS",
    qty: 1,
    nominal: 0,
    tglBeli: todayStr(),
  });
};

const removeRow = (idx: number) => {
  if (!formData.value.items || formData.value.items.length <= 1) {
    formData.value.items = [
      { nama: "", satuan: "PCS", qty: 1, nominal: 0, tglBeli: todayStr() },
    ];
    return;
  }
  formData.value.items.splice(idx, 1);
};

const grandTotalBiaya = computed(() => {
  return (formData.value.items || []).reduce((acc, item) => {
    const q = Number(item.qty) || 0;
    const n = Number(item.nominal) || 0;
    return acc + q * n;
  }, 0);
});

// ── Lookup Modal Kendaraan (F1 Delphi) ────────────────────────────────
const showKendaraanModal = ref(false);

const openKendaraanLookup = () => {
  showKendaraanModal.value = true;
};

const onKendaraanSelected = (item: any) => {
  formData.value.nopol = (item.Nopol || "").toUpperCase();
  formData.value.stat = item.Stat || "";
  formData.value.namaKendaraan = item.Keterangan || "";
  if (item.KmTerakhir && !formData.value.km) {
    formData.value.km = item.KmTerakhir;
  }
  showKendaraanModal.value = false;
};

const onNopolKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    openKendaraanLookup();
  }
};

const onNopolBlur = async () => {
  const nopol = (formData.value.nopol || "").trim().toUpperCase();
  if (!nopol) return;

  try {
    const res = await perawatanService.searchKendaraan(nopol);
    const matches = res.data?.data || [];
    const exact = matches.find(
      (m: any) => m.Nopol?.toUpperCase() === nopol,
    );
    if (exact) {
      formData.value.stat = exact.Stat;
      formData.value.namaKendaraan = exact.Keterangan;
      if (exact.KmTerakhir && !formData.value.km) {
        formData.value.km = exact.KmTerakhir;
      }
    }
  } catch {
    // Abaikan jika error
  }
};

// ── Validasi Sesuai Delphi 7 ──────────────────────────────────────────
const onValidate = () => {
  if (!formData.value.nopol?.trim()) {
    toast.warning("No Polisi harus diisi.");
    return;
  }
  const kmVal = Number(formData.value.km) || 0;
  if (kmVal <= 0) {
    toast.warning("KM harus diisi dan lebih dari 0.");
    return;
  }

  const validItems = (formData.value.items || []).filter(
    (i) => (i.nama || "").trim() !== "",
  );
  if (!validItems.length) {
    toast.warning("Minimal isi 1 baris rincian perawatan (Nama harus diisi).");
    return;
  }

  showSaveDialog.value = true;
};

// ── Lifecycle onMounted ───────────────────────────────────────────────
onMounted(async () => {
  if (isEdit.value) {
    try {
      const res = await perawatanService.getById(editNomor.value);
      const d = res.data.data;
      if (!d) throw new Error("Data tidak ditemukan");

      formData.value = {
        nomor: d.nomor,
        tanggal: d.tanggal,
        bengkel: d.bengkel || "",
        keterangan: d.keterangan || "",
        nopol: d.nopol || "",
        km: Number(d.km) || 0,
        stat: d.stat || "",
        namaKendaraan: d.namaKendaraan || "",
        items: (d.items || []).map((x) => ({
          nama: x.Nama,
          satuan: x.Satuan,
          qty: Number(x.Qty) || 0,
          nominal: Number(x.Nominal) || 0,
          tglBeli: x.TglBeli || todayStr(),
        })),
      };

      if (!formData.value.items.length) {
        formData.value.items = [
          { nama: "", satuan: "PCS", qty: 1, nominal: 0, tglBeli: todayStr() },
        ];
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Gagal memuat data Perawatan.",
      );
      goBack();
    }
  } else {
    // Mode Tambah Baru: Nomor kosong, baru tercipta saat simpan
    formData.value.nomor = "";
  }
});
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Ubah Perawatan' : 'Perawatan'"
    menu-id="611"
    :icon="IconTool"
    :is-saving="isSaving"
    :item-name="isEdit ? `Perawatan ${editNomor}` : 'Perawatan Baru'"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidate"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="delphi-container">
      <!-- Judul Form Delphi 7 (lbljudul: Perawatan) -->
      <div class="delphi-header-title">Perawatan</div>
      <div class="delphi-top-line"></div>

      <!-- Panel 1: Header Inputs (2 Kolom Layout Delphi 7) -->
      <div class="delphi-panel-header">
        <!-- Kolom Kiri -->
        <div class="header-col">
          <!-- Row: Nomor (Baru tercipta saat simpan) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Nomor</label>
            <div class="delphi-val">
              <input
                type="text"
                :value="isEdit ? formData.nomor : ''"
                class="delphi-ctrl ctrl-nomor"
                disabled
                placeholder=""
              />
            </div>
          </div>

          <!-- Row: Tanggal -->
          <div class="delphi-row">
            <label class="delphi-lbl">Tanggal</label>
            <div class="delphi-val">
              <input
                type="date"
                v-model="formData.tanggal"
                class="delphi-ctrl ctrl-date"
              />
            </div>
          </div>

          <!-- Row: Bengkel (Otomatis Huruf Kapital) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Bengkel</label>
            <div class="delphi-val">
              <input
                type="text"
                v-model="formData.bengkel"
                class="delphi-ctrl ctrl-long"
                maxlength="50"
                placeholder="Nama bengkel..."
                style="text-transform: uppercase"
                @input="formData.bengkel = ($event.target as HTMLInputElement).value.toUpperCase()"
              />
            </div>
          </div>

          <!-- Row: Keterangan (Otomatis Huruf Kapital) -->
          <div class="delphi-row">
            <label class="delphi-lbl">Keterangan</label>
            <div class="delphi-val">
              <input
                type="text"
                v-model="formData.keterangan"
                class="delphi-ctrl ctrl-long"
                maxlength="100"
                placeholder="Uraian perawatan..."
                style="text-transform: uppercase"
                @input="formData.keterangan = ($event.target as HTMLInputElement).value.toUpperCase()"
              />
            </div>
          </div>
        </div>

        <!-- Kolom Kanan -->
        <div class="header-col">
          <!-- Row: No.Polisi (Lookup F1 Kendaraan) -->
          <div class="delphi-row">
            <label class="delphi-lbl">No.Polisi</label>
            <div class="delphi-val">
              <div class="cell-kode-wrap ctrl-nopol-wrap">
                <input
                  type="text"
                  v-model="formData.nopol"
                  class="cell-input"
                  placeholder="F1 / Nopol"
                  style="
                    text-transform: uppercase;
                    font-weight: 600;
                    color: #1565c0;
                  "
                  @keydown="onNopolKeydown"
                  @keydown.enter.prevent="onNopolBlur"
                  @blur="onNopolBlur"
                  @input="formData.nopol = ($event.target as HTMLInputElement).value.toUpperCase()"
                />
                <button
                  type="button"
                  class="cell-search-btn"
                  @click="openKendaraanLookup"
                  title="Bantuan Kendaraan (F1)"
                >
                  <IconSearch :size="13" color="#1565c0" />
                </button>
              </div>
            </div>
          </div>

          <!-- Row: Status Kendaraan -->
          <div class="delphi-row">
            <label class="delphi-lbl">Status</label>
            <div class="delphi-val">
              <input
                type="text"
                :value="formData.stat"
                class="delphi-ctrl ctrl-readonly"
                disabled
                placeholder="Otomatis"
              />
            </div>
          </div>

          <!-- Row: Nama Kendaraan -->
          <div class="delphi-row">
            <label class="delphi-lbl">Nama Kendaraan</label>
            <div class="delphi-val">
              <input
                type="text"
                :value="formData.namaKendaraan"
                class="delphi-ctrl ctrl-readonly"
                disabled
                placeholder="Otomatis"
              />
            </div>
          </div>

          <!-- Row: KM (Pemisah Ribuan) -->
          <div class="delphi-row">
            <label class="delphi-lbl">KM</label>
            <div class="delphi-val d-flex align-center">
              <input
                type="text"
                inputmode="numeric"
                :value="formatThousand(formData.km)"
                class="delphi-ctrl ctrl-km"
                placeholder="0"
                @input="onKmInput"
                @focus="($event.target as HTMLInputElement).select()"
              />
              <span class="unit-lbl ml-2">KM</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel 4: Detail Table Grid Sesuai Delphi 7 (AdvPanel4) -->
      <div class="mt-4">
        <v-card border flat class="d-flex flex-column rounded">
          <!-- Header Bar Gelap dengan Tombol Tambah Baris -->
          <div
            class="bg-blue-grey-darken-3 text-white px-3 py-2 font-weight-bold text-caption d-flex align-center justify-space-between"
          >
            <div class="d-flex align-center">
              <IconListDetails :size="15" :stroke-width="1.8" class="mr-2" />
              <span>Rincian Barang / Jasa Perawatan</span>
            </div>
            <v-btn
              type="button"
              size="x-small"
              color="success"
              variant="flat"
              class="text-none font-weight-bold"
              @click.stop="addRow"
            >
              <template #prepend>
                <IconPlus :size="13" :stroke-width="2.2" />
              </template>
              Tambah Baris
            </v-btn>
          </div>

          <!-- Table Grid Sesuai Kolom Delphi: No, Nama, Satuan, Qty, Nominal, Total, Tgl Beli, Aksi -->
          <div style="overflow-x: auto; background: #fff">
            <table class="manksi-table">
              <thead>
                <tr>
                  <th style="width: 45px; text-align: center">No.</th>
                  <th style="min-width: 250px">Nama</th>
                  <th style="width: 100px">Satuan</th>
                  <th style="width: 80px; text-align: right">Qty</th>
                  <th style="width: 140px; text-align: right">Nominal (Rp)</th>
                  <th style="width: 150px; text-align: right">Total (Rp)</th>
                  <th style="width: 130px; text-align: center">Tgl Beli</th>
                  <th style="width: 55px; text-align: center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in formData.items" :key="index">
                  <!-- Kolom No -->
                  <td class="text-center bg-grey-lighten-4 font-weight-bold">
                    {{ Number(index) + 1 }}
                  </td>

                  <!-- Kolom Nama (Otomatis Huruf Kapital) -->
                  <td class="bg-yellow-lighten-5">
                    <input
                      v-model="item.nama"
                      class="cell-input"
                      placeholder="Nama sparepart / jasa..."
                      style="text-transform: uppercase"
                      @input="item.nama = ($event.target as HTMLInputElement).value.toUpperCase()"
                    />
                  </td>

                  <!-- Kolom Satuan (Otomatis Huruf Kapital) -->
                  <td class="bg-yellow-lighten-5">
                    <input
                      v-model="item.satuan"
                      class="cell-input"
                      placeholder="PCS / LTR..."
                      style="text-transform: uppercase"
                      @input="item.satuan = ($event.target as HTMLInputElement).value.toUpperCase()"
                    />
                  </td>

                  <!-- Kolom Qty -->
                  <td class="bg-yellow-lighten-5">
                    <input
                      type="number"
                      v-model.number="item.qty"
                      class="cell-input text-right"
                      min="0"
                      step="any"
                    />
                  </td>

                  <!-- Kolom Nominal (Pemisah Ribuan) -->
                  <td class="bg-yellow-lighten-5">
                    <input
                      type="text"
                      inputmode="numeric"
                      :value="formatThousand(item.nominal)"
                      class="cell-input text-right font-mono"
                      placeholder="0"
                      @input="onNominalInput($event, item)"
                      @focus="($event.target as HTMLInputElement).select()"
                    />
                  </td>

                  <!-- Kolom Total (Qty * Nominal) -->
                  <td class="text-right font-mono font-weight-bold px-2 bg-grey-lighten-5">
                    {{
                      (
                        (Number(item.qty) || 0) * (Number(item.nominal) || 0)
                      ).toLocaleString("id-ID")
                    }}
                  </td>

                  <!-- Kolom Tgl Beli -->
                  <td class="text-center px-1">
                    <input
                      type="date"
                      v-model="item.tglBeli"
                      class="cell-input text-center"
                    />
                  </td>

                  <!-- Kolom Aksi Hapus -->
                  <td class="text-center">
                    <v-btn
                      type="button"
                      size="x-small"
                      variant="text"
                      color="error"
                      title="Hapus baris"
                      @click.stop="removeRow(Number(index))"
                    >
                      <IconTrash :size="15" :stroke-width="1.8" />
                    </v-btn>
                  </td>
                </tr>
              </tbody>

              <!-- Footer Summary Total Biaya Perawatan -->
              <tfoot>
                <tr class="bg-grey-lighten-4 font-weight-bold">
                  <td colspan="5" class="text-right px-3 py-2">
                    TOTAL BIAYA PERAWATAN:
                  </td>
                  <td class="text-right px-3 py-2 text-primary font-mono text-subtitle-2">
                    Rp {{ grandTotalBiaya.toLocaleString("id-ID") }}
                  </td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </v-card>
      </div>
    </div>

    <!-- Modal Pencarian Kendaraan (F1) -->
    <KendaraanSearchModal
      v-model="showKendaraanModal"
      @selected="onKendaraanSelected"
    />
  </BaseForm>
</template>

<style scoped>
/* ── Wrapper Form Delphi 7 ── */
.delphi-container {
  background-color: #ffffff;
  padding: 16px 24px 80px 24px;
  font-family: Tahoma, "Segoe UI", Arial, sans-serif;
  color: #000000;
  box-sizing: border-box;
}

.delphi-header-title {
  font-size: 16px;
  font-weight: bold;
  color: #000000;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.delphi-top-line {
  height: 2px;
  background-color: #808080;
  margin-bottom: 16px;
}

/* ── Panel Header 2 Kolom ── */
.delphi-panel-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.header-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Baris Label & Input Delphi ── */
.delphi-row {
  display: flex;
  align-items: center;
}

.delphi-lbl {
  width: 120px;
  font-size: 12px;
  color: #000000;
  flex-shrink: 0;
  user-select: none;
}

.delphi-val {
  flex-grow: 1;
}

/* ── Input Controls Delphi 7 ── */
.delphi-ctrl {
  font-size: 12px;
  font-family: Tahoma, sans-serif;
  color: #000000;
  background-color: #ffffff;
  border: 1px solid #7f9db9;
  padding: 2px 6px;
  height: 24px;
  outline: none;
  box-sizing: border-box;
}

.delphi-ctrl:focus {
  border-color: #0055ea;
  box-shadow: 0 0 0 1px #0055ea;
}

.delphi-ctrl:disabled {
  background-color: #d4d0c8;
  color: #444444;
  cursor: not-allowed;
  border-color: #abadb3;
}

.ctrl-nomor {
  width: 150px;
  font-weight: 600;
}

.ctrl-date {
  width: 140px;
}

.ctrl-long {
  width: 100%;
  max-width: 320px;
}

.ctrl-readonly {
  width: 100%;
  max-width: 260px;
}

.ctrl-km {
  width: 110px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.unit-lbl {
  font-size: 12px;
  font-weight: bold;
  color: #333333;
}

.ctrl-nopol-wrap {
  width: 160px;
  height: 24px;
  border: 1px solid #7f9db9;
  background-color: #ffffff;
}

/* ── Grid MANKSI Table ── */
.manksi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.manksi-table th {
  background: #f1f5f9 !important;
  color: #1e293b !important;
  border-bottom: 2px solid #cbd5e1;
  border-right: 1px solid #e2e8f0;
  padding: 8px 10px;
  text-align: left;
  font-weight: 700;
  font-size: 12px;
  white-space: nowrap;
}

.manksi-table td {
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  padding: 0;
  height: 32px;
  vertical-align: middle;
}

.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 8px;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.cell-input:focus {
  background-color: #fff3e0;
  box-shadow: inset 0 0 0 1px #ff9800;
}

.cell-kode-wrap {
  display: flex;
  align-items: center;
  height: 100%;
}

.cell-kode-wrap .cell-input {
  flex: 1;
}

.cell-search-btn {
  width: 26px;
  min-width: 26px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.cell-search-btn:hover {
  background: #bbdefb;
}

.font-mono {
  font-family: monospace;
}
</style>
