<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { bpbNonBahanFormService } from "@/services/garmen/bpbNonBahanFormService";
import { IconPackage, IconSearch, IconPrinter } from "@tabler/icons-vue";

// Lookups
import PermintaanBeliSearchModal from "@/components/lookups/PermintaanBeliSearchModal.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import PoNonBahanSearchModal from "@/components/lookups/PoNonBahanSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const formJenis = ref(
  typeof route.query.jenis === "string" ? route.query.jenis : "ACCESORIES",
);

// ── Tanggal lokal (hindari UTC shift) ──
const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const todayLocal = toLocalDate(new Date());

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
};

// --- STATE MODAL & FLAGS ---
const showMintaModal = ref(false);
const showPoModal = ref(false);
const showSupModal = ref(false);
const showPrintDialog = ref(false);
const nomorToPrint = ref("");
const activeSpkIndex = ref(-1);
const showSpkModal = ref(false);

// Initial Data Structure (Sesuai BaseForm)
const defaultData = {
  header: {
    bpb_nomor: "",
    bpb_jenis: formJenis.value,
    bpb_tanggal: todayLocal,
    bpb_mb_nomor: "",
    bpb_po_nomor: "",
    bpb_sup_kode: "",
    sup_nama: "",
    sup_alamat: "",
    sup_kota: "",
    bpb_ket: "",
    ketpo: "",
    tglminta: "",
    tglpo: "",
    isTutupBuku: false,
    hasVoucher: false,
    pin_status: "",
  },
  detail: [] as any[],
};

// Hak Akses Flags
const canSeeSup = computed(() => !!authStore.user?.flags?.lihatSup);
const canSeeBeli = computed(() => !!authStore.user?.flags?.lihatBeli);
const isDetailRinci = computed(() =>
  ["SPAREPART", "ATK/RTK"].includes(String(formJenis.value)),
);
const isSupLocked = computed(
  () =>
    !!formData.value.header.bpb_po_nomor ||
    !!formData.value.header.bpb_mb_nomor || // ← lock juga saat permintaan diisi
    formData.value.header.hasVoucher,
);

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "67",
  initialData: JSON.parse(JSON.stringify(defaultData)), // Hindari referensi reaktif asal
  fetchApi: async () => {
    const res = await bpbNonBahanFormService.getDetail(
      route.params.nomor as string,
    );
    const d = res.data.data;
    formJenis.value = d.header.bpb_jenis; // Sinkronkan jenis dari DB

    return {
      header: {
        ...d.header,
        bpb_tanggal: d.header.bpb_tanggal_fmt || todayLocal,
      },
      detail: d.detail || [],
    };
  },
  submitApi: async (data: any) => {
    return await bpbNonBahanFormService.saveData({
      isEdit: isEditMode.value,
      bpb_nomor: data.header.bpb_nomor,
      bpb_jenis: formJenis.value,
      bpb_tanggal: data.header.bpb_tanggal,
      bpb_mb_nomor: data.header.bpb_mb_nomor,
      bpb_po_nomor: data.header.bpb_po_nomor,
      bpb_sup_kode: data.header.bpb_sup_kode,
      bpb_ket: data.header.bpb_ket,
      detail: data.detail,
      user: authStore.user, // Gabungkan user ke dalam payload
    });
  },
  onSuccess: (res: any) => {
    toast.success("BPB Berhasil disimpan!");
    nomorToPrint.value =
      res.data?.data?.bpb_nomor || formData.value.header.bpb_nomor;
    showPrintDialog.value = true;
  },
});

// --- LOOKUP CALLBACKS (Logic Kunci 1:1 Delphi) ---
const setPermintaan = async (v: any) => {
  formData.value.header.bpb_mb_nomor = v.Nomor;
  // Jika isi permintaan, kosongkan & lock input PO + Supplier
  formData.value.header.bpb_po_nomor = "";
  formData.value.header.tglpo = "";
  formData.value.header.ketpo = "";
  formData.value.header.bpb_sup_kode = "";
  formData.value.header.sup_nama = "";
  formData.value.header.sup_alamat = "";
  formData.value.header.sup_kota = "";

  try {
    isLoading.value = true;
    const res = await bpbNonBahanFormService.getPermintaanDetail(
      v.Nomor,
      formData.value.header.bpb_nomor,
    );
    formData.value.header.tglminta = res.data.data.header.tglminta;
    formData.value.detail = res.data.data.detail;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal memuat rincian permintaan.",
    );
  } finally {
    isLoading.value = false;
  }
};

const setPo = async (v: any) => {
  formData.value.header.bpb_po_nomor = v.Nomor;

  try {
    isLoading.value = true;
    const res = await bpbNonBahanFormService.getPoDetail(
      v.Nomor,
      formData.value.header.bpb_nomor,
    );
    const hdr = res.data.data.header;

    // Autofill Permintaan, Tgl, Ket PO, & Supplier dari PO (lock Permintaan)
    formData.value.header.bpb_mb_nomor = hdr.po_mb_nomor;
    formData.value.header.tglminta = hdr.tglminta;
    formData.value.header.tglpo = hdr.tglpo;
    formData.value.header.ketpo = hdr.ketpo;
    formData.value.header.bpb_sup_kode = hdr.po_sup_kode;
    formData.value.header.sup_nama = hdr.sup_nama;
    formData.value.header.sup_alamat = hdr.sup_alamat;
    formData.value.header.sup_kota = hdr.sup_kota;

    formData.value.detail = res.data.data.detail;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat rincian PO.");
  } finally {
    isLoading.value = false;
  }
};

const setSupplier = (v: any) => {
  formData.value.header.bpb_sup_kode = v.Kode;
  formData.value.header.sup_nama = v.Nama;
  formData.value.header.sup_alamat = v.Alamat;
  formData.value.header.sup_kota = v.Kota;
};

const openSpkModal = (idx: number) => {
  activeSpkIndex.value = idx;
  showSpkModal.value = true;
};

const setSpk = (v: any) => {
  const i = activeSpkIndex.value;
  if (i < 0) return;
  formData.value.detail[i].spk = v.Nomor;
  formData.value.detail[i].namaspk = v.Nama;
};

// --- VALIDATION BEFORE SAVE ---
const validateSave = () => {
  // 1. PIN status
  const pin = formData.value.header.pin_status;
  if (["MINTA", "WAIT", "TOLAK"].includes(pin))
    return toast.error(
      "Transaksi tsb sudah diclose.\nSilahkan minta approve untuk bisa menyimpan perubahan data.",
    );

  // 2. Tutup buku (sudah di backend, tapi beri warning awal di frontend)
  if (formData.value.header.isTutupBuku && pin !== "ACC")
    return toast.error(
      "Anda tidak boleh input di tanggal periode yg sudah diclose.",
    );

  // 3. Detail kosong
  const hasDetail = formData.value.detail.some(
    (d: any) => d.Nama && d.Nama !== "",
  );
  if (!hasDetail) return toast.warning("Detail harus diisi.");

  // 4. Total qty = 0
  const totalQty = formData.value.detail.reduce(
    (s: number, d: any) => s + Number(d.jumlah || 0),
    0,
  );
  if (totalQty === 0)
    return toast.warning("Jumlah kosong semua, belum bisa disimpan.");

  // 5. Voucher — paling akhir sebelum konfirmasi
  if (formData.value.header.hasVoucher)
    return toast.error(
      "BPB tsb sudah dibuatkan Voucher Pembelian.\nTidak bisa disimpan.",
    );

  // 6. Bersihkan baris kosong lalu konfirmasi
  formData.value.detail = formData.value.detail.filter(
    (d: any) => d.Kode?.trim() && Number(d.jumlah || 0) !== 0,
  );
  showSaveDialog.value = true;
};

// --- DIALOG CETAK ---
const onPrintConfirm = () => {
  const safeNomor = encodeURIComponent(nomorToPrint.value);
  window.open(`/garmen/barang/bpb-nonbahan/print/${safeNomor}`, "_blank");
  showPrintDialog.value = false;
  router.push({ name: "BpbNonBahanGarmenBrowse" });
};

const onPrintCancel = () => {
  showPrintDialog.value = false;
  router.push({ name: "BpbNonBahanGarmenBrowse" });
};

const formatQty = (val: any) => {
  return Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

watch(
  () => formData.value.detail.map((d: any) => d.spk),
  (newVals, oldVals) => {
    newVals.forEach((spk: string, i: number) => {
      if (!spk && oldVals[i]) {
        formData.value.detail[i].namaspk = "";
      }
    });
  },
);
</script>

<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah BPB ' : 'BPB ') + formJenis"
    menu-id="67"
    :icon="IconPackage"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #dialog-warning>
      <v-alert
        v-if="formData.header.hasVoucher"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-2 text-caption"
      >
        BPB ini sudah tercatat dalam
        <strong>Voucher Pembelian (Invoice)</strong>. Data tidak dapat diubah.
      </v-alert>
      <v-alert
        v-else-if="formData.header.isTutupBuku"
        type="warning"
        variant="tonal"
        density="compact"
        class="mt-2 text-caption"
      >
        Periode tutup buku. Anda harus mengajukan PIN untuk mengubah data ini.
      </v-alert>
    </template>

    <template #left-column>
      <div class="desktop-form-section header-section hide-details">
        <div class="fr">
          <label class="lbl">Nomor BPB</label>
          <input
            :value="formData.header.bpb_nomor"
            class="inp ro text-primary font-weight-bold"
            placeholder="<-- Otomatis"
            readonly
          />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.header.bpb_tanggal"
            class="idate"
            :readonly="
              formData.header.isTutupBuku || formData.header.hasVoucher
            "
          />
        </div>

        <div class="sep mt-2 mb-2" />

        <div class="fr">
          <label class="lbl">No. Permintaan</label>
          <div class="cell-grp w-100">
            <input
              v-model="formData.header.bpb_mb_nomor"
              class="inp ro"
              placeholder="F1 / Cari..."
              readonly
            />
            <button
              type="button"
              class="ci-btn"
              :disabled="isEditMode || formData.header.bpb_mb_nomor !== ''"
              @click="showMintaModal = true"
            >
              <IconSearch :size="12" />
            </button>
          </div>
        </div>
        <div class="fr mt-1">
          <label class="lbl">Tgl Permintaan</label>
          <input
            :value="formatDateLocal(formData.header.tglminta)"
            class="inp ro"
            readonly
          />
        </div>

        <div class="fr mt-1">
          <label class="lbl">No. PO</label>
          <div class="cell-grp w-100">
            <input
              v-model="formData.header.bpb_po_nomor"
              class="inp ro"
              placeholder="F1 / Cari..."
              readonly
            />
            <button
              type="button"
              class="ci-btn"
              :disabled="isEditMode || formData.header.bpb_mb_nomor !== ''"
              @click="showPoModal = true"
            >
              <IconSearch :size="12" />
            </button>
          </div>
        </div>
        <div class="fr mt-1">
          <label class="lbl">Tgl PO</label>
          <input
            :value="formatDateLocal(formData.header.tglpo)"
            class="inp ro"
            readonly
          />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Ket. PO</label>
          <input :value="formData.header.ketpo" class="inp ro" readonly />
        </div>

        <template v-if="canSeeSup">
          <div class="sep mt-2 mb-2" />
          <div class="fr">
            <label class="lbl">Supplier</label>
            <div class="cell-grp w-100">
              <input
                v-model="formData.header.bpb_sup_kode"
                class="inp ro font-weight-bold text-primary"
                placeholder="F1 / Cari..."
                readonly
              />
              <button
                type="button"
                class="ci-btn"
                :disabled="isSupLocked"
                @click="showSupModal = true"
              >
                <IconSearch :size="12" />
              </button>
            </div>
          </div>
          <div class="fr mt-1">
            <label class="lbl">Nama Supplier</label>
            <input :value="formData.header.sup_nama" class="inp ro" readonly />
          </div>
          <div class="fr mt-1">
            <label class="lbl">Alamat / Kota</label>
            <input
              :value="
                formData.header.sup_alamat
                  ? `${formData.header.sup_alamat}, ${formData.header.sup_kota}`
                  : ''
              "
              class="inp ro"
              readonly
            />
          </div>
        </template>

        <div class="sep mt-2 mb-2" />
        <div class="fr" style="align-items: flex-start">
          <label class="lbl pt-1">Ket. BPB</label>
          <textarea
            v-model="formData.header.bpb_ket"
            class="ta"
            rows="3"
            placeholder="Notes Penerimaan..."
            :readonly="
              formData.header.isTutupBuku || formData.header.hasVoucher
            "
          />
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="right-content-wrapper d-flex flex-column h-100 gap-2 pa-2">
        <div class="tbl-header blue">
          <span class="font-weight-bold">Rincian Barang Diterima (BPB)</span>
        </div>
        <div class="tbl-wrap flex-grow-1">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 40px" class="text-center">No</th>
                <th style="width: 100px">Kode</th>
                <th style="min-width: 200px">Nama Bahan</th>
                <th style="width: 60px" class="text-center">Satuan</th>
                <th style="width: 80px" class="text-right">Minta/PO</th>
                <th style="width: 80px" class="text-right">Sudah</th>
                <th style="width: 80px" class="text-right">Kurang</th>
                <th
                  style="width: 90px; background: #ffeb3b"
                  class="text-right text-dark"
                >
                  Jumlah Terima
                </th>
                <th v-if="formJenis === 'ACCESORIES'" style="width: 110px">
                  SPK
                </th>
                <th v-if="formJenis === 'ACCESORIES'" style="min-width: 140px">
                  Nama SPK
                </th>
                <th v-if="isDetailRinci" style="min-width: 130px">
                  Spesifikasi
                </th>
                <th v-if="isDetailRinci" style="min-width: 130px">Kegunaan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in formData.detail" :key="idx">
                <td class="text-center gt-lbl">{{ Number(idx) + 1 }}</td>
                <td class="fw-mono text-primary px-2 font-weight-bold">
                  {{ item.Kode || item.pod_brg_kode || item.bpbd_brg_kode }}
                </td>
                <td class="px-2 font-weight-bold truncate" :title="item.Nama">
                  {{ item.Nama }}
                </td>
                <td class="text-center text-grey-darken-1">
                  {{ item.Satuan }}
                </td>
                <td class="text-right px-2 ro text-grey">
                  {{ formatQty(item.minta) }}
                </td>
                <td class="text-right px-2 ro text-grey">
                  {{ formatQty(item.sudah) }}
                </td>
                <td class="text-right px-2 ro text-error font-weight-bold">
                  {{ formatQty(item.kurang) }}
                </td>

                <td class="p0">
                  <input
                    v-model.number="item.jumlah"
                    type="number"
                    class="ci text-right font-weight-bold text-success"
                    :class="{
                      ro:
                        formData.header.isTutupBuku ||
                        formData.header.hasVoucher,
                    }"
                    :readonly="
                      formData.header.isTutupBuku || formData.header.hasVoucher
                    "
                  />
                </td>

                <td v-if="formJenis === 'ACCESORIES'" class="p0">
                  <div class="cell-grp">
                    <input
                      :value="item.spk || item.Spk"
                      class="ci fw-mono"
                      readonly
                      @click="openSpkModal(Number(idx))"
                      style="cursor: pointer"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      :disabled="
                        formData.header.isTutupBuku ||
                        formData.header.hasVoucher
                      "
                      @click.stop="openSpkModal(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td
                  v-if="formJenis === 'ACCESORIES'"
                  class="px-2 ro truncate"
                  :title="item.namaspk || item.NamaSpk"
                >
                  {{ item.namaspk || item.NamaSpk || "-" }}
                </td>

                <td v-if="isDetailRinci" class="p0">
                  <input v-model="item.ket" class="ci ro" readonly />
                </td>
                <td v-if="isDetailRinci" class="p0">
                  <input v-model="item.kegunaan" class="ci ro" readonly />
                </td>
              </tr>
              <tr v-if="formData.detail.length === 0">
                <td
                  :colspan="
                    isDetailRinci ? 10 : formJenis === 'ACCESORIES' ? 10 : 8
                  "
                  class="text-center text-grey font-italic py-4 ro"
                >
                  Pilih No. Permintaan atau No. PO untuk menampilkan barang.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <PermintaanBeliSearchModal
    v-model="showMintaModal"
    :jenis="formJenis"
    @selected="setPermintaan"
  />
  <PoNonBahanSearchModal
    v-model="showPoModal"
    :jenis="formJenis"
    @selected="setPo"
  />
  <SupplierSearchModal
    v-model="showSupModal"
    :jenis="formJenis"
    @selected="setSupplier"
  />
  <SpkSearchModal v-model="showSpkModal" @selected="setSpk" />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconPrinter :size="18" class="mr-2" /> Konfirmasi Cetak
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        BPB Non-Bahan berhasil disimpan dengan nomor
        <span class="font-weight-bold text-primary">{{ nomorToPrint }}</span
        >.<br /><br />
        Apakah Anda ingin langsung mencetak dokumen ini?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" @click="onPrintCancel">Tidak</v-btn>
        <v-btn color="primary" variant="elevated" @click="onPrintConfirm"
          >Ya, Cetak</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.header-section {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}
.header-section :deep(.fr) {
  margin-bottom: 6px;
}
.fr {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  min-height: 26px;
}
.lbl {
  width: 100px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.inp,
.idate,
.ta {
  flex: 1;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.inp:focus,
.idate:focus,
.ta:focus {
  border-color: #1565c0;
}
.ro {
  background: #eeeeee !important;
  color: #555555 !important;
}
.ta {
  resize: vertical;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  width: 100%;
}

.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px 4px 0 0;
}
.tbl-header.blue {
  background: #1565c0;
  color: white;
}
.tbl-wrap {
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  overflow: auto;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 11px;
}
.gt thead th {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  padding: 6px 8px;
  font-weight: 700;
  color: #424242;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt tbody td {
  border: 1px solid #e0e0e0;
  height: 28px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gt-lbl {
  font-size: 11px;
  color: #9e9e9e;
}
.p0 {
  padding: 0 !important;
}
.ci {
  width: 100%;
  height: 27px;
  border: none;
  background: transparent;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
.ci:focus:not(.ro) {
  background: #fffde7;
}
.cell-grp {
  display: flex;
  align-items: center;
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}
.cell-grp .inp {
  border: none;
  height: 100%;
}
.ci-btn {
  width: 26px;
  height: 100%;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-btn:hover:not(:disabled) {
  background: #e0e0e0;
}
.ci-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.fw-mono {
  font-family: monospace;
}
.truncate {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
