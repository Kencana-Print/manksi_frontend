<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { poNonBahanFormService } from "@/services/garmen/poNonBahanFormService";
import { IconFileInvoice, IconSearch, IconPrinter } from "@tabler/icons-vue";

// Import komponen lookup search modal yang sudah ada di proyek Anda
import PermintaanBeliSearchModal from "@/components/lookups/PermintaanBeliSearchModal.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const formJenis = ref(
  typeof route.query.jenis === "string" ? route.query.jenis : "ACCESORIES",
);
const todayLocal = new Date().toISOString().substring(0, 10);

// --- LOOKUP CONTROL STATE ---
const showMintaModal = ref(false);
const showSupModal = ref(false);

const defaultData = {
  header: {
    po_nomor: "",
    po_jenis: formJenis.value,
    po_tanggal: todayLocal,
    po_mb_nomor: "",
    tglminta: "",
    mb_cab: "",
    po_sup_kode: "",
    sup_nama: "",
    sup_alamat: "",
    sup_kota: "",
    po_ket: "",
    po_status: "",
    pin_status: "",
    isTutupBuku: false,
    hasBpb: false,
  },
  items: [] as any[],
};

const showPrintDialog = ref(false);
const nomorToPrint = ref("");

// Hak Akses Flags dari Token User
const canSeeSup = computed(() => !!authStore.user?.flags?.lihatSup);
const canSeeBeli = computed(() => !!authStore.user?.flags?.lihatBeli);

// --- HELPER FORMATTING UTK METRIC DAN KATA DI TEMPLATE ---
const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`; // Mengubah visual ke standar DD-MM-YYYY
};

const formatQty = (val: any) => {
  return Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

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
  menuId: "66",
  initialData: defaultData,
  fetchApi: async () => {
    const res = await poNonBahanFormService.getDetail(
      route.params.nomor as string,
    );
    const d = res.data.data;
    formJenis.value = d.header.po_jenis;

    return {
      header: d.header,
      items: d.detail.map((item: any) => ({
        Kode: item.pod_brg_kode,
        Nama: item.Nama,
        Satuan: item.Satuan,
        ket: item.pod_ket,
        kegunaan: item.pod_kegunaan,
        minta: item.minta,
        sudah: item.sudah,
        belum: item.belum,
        bpb: item.bpb,
        jumlah: item.pod_jumlah,
        harga: item.pod_harga,
        total: item.pod_jumlah * item.pod_harga,
      })),
    };
  },
  submitApi: async (data: any) => {
    return await poNonBahanFormService.saveData({
      isEdit: isEditMode.value,
      po_nomor: data.header.po_nomor,
      po_jenis: formJenis.value,
      po_tanggal: data.header.po_tanggal,
      po_mb_nomor: data.header.po_mb_nomor,
      po_kecab: data.header.mb_cab,
      po_ket: data.header.po_ket,
      po_sup_kode: data.header.po_sup_kode,
      detail: data.items,
    });
  },
  onSuccess: (res: any) => {
    toast.success("PO Berhasil disimpan!");
    const noTersimpan =
      res.data?.data?.po_nomor || formData.value.header.po_nomor;
    nomorToPrint.value = noTersimpan;
    showPrintDialog.value = true;
  },
});

const isDetailRinci = computed(() =>
  ["SPAREPART", "ATK/RTK"].includes(String(formJenis.value)),
);

// --- LOOKUP CALLBACKS ---
const setPermintaan = async (v: any) => {
  formData.value.header.po_mb_nomor = v.Nomor;
  formData.value.header.tglminta = v.Tanggal;
  formData.value.header.mb_cab = v.Cab || v.mb_cab;

  try {
    isLoading.value = true;
    const res = await poNonBahanFormService.getPermintaanDetail(
      v.Nomor,
      formData.value.header.po_nomor,
    );
    formData.value.items = res.data.data;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal memuat rincian permintaan.",
    );
  } finally {
    isLoading.value = false;
  }
};

const setSupplier = (v: any) => {
  formData.value.header.po_sup_kode = v.Kode;
  formData.value.header.sup_nama = v.Nama;
  formData.value.header.sup_alamat = v.Alamat;
  formData.value.header.sup_kota = v.Kota;
};

const recalcTotal = (idx: number) => {
  const row = formData.value.items[idx];
  row.total = (Number(row.jumlah) || 0) * (Number(row.harga) || 0);
};

// --- VALIDATION BEFORE SAVE (1:1 Delphi Logic) ---
const validateSave = () => {
  if (formData.value.header.isTutupBuku) {
    return toast.error(
      "Transaksi tsb sudah diclose.\nSilahkan minta approve PIN untuk bisa menyimpan perubahan data.",
    );
  }
  if (!formData.value.header.po_sup_kode) {
    toast.warning("Supplier harus di isi. Tidak bisa disimpan.");
    return;
  }
  if (
    formData.value.header.po_status &&
    formData.value.header.po_status.trim() !== ""
  ) {
    return toast.warning(
      `Sudah ${formData.value.header.po_status}, tidak dapat diubah.`,
    );
  }
  if (formData.value.header.hasBpb) {
    return toast.error(
      "PO tsb sudah ada penerimaan BPB.\nTidak bisa disimpan.",
    );
  }

  const validDetails = formData.value.items.filter(
    (d: any) => d.Kode && d.jumlah > 0,
  );
  if (validDetails.length === 0)
    return toast.warning("Detail jumlah barang harus diisi.");

  for (let i = 0; i < formData.value.items.length; i++) {
    const row = formData.value.items[i];
    if (Number(row.jumlah) !== 0 && Number(row.harga) === 0) {
      return toast.warning(
        `Harga harus di isi untuk barang pada baris ke-${i + 1}`,
      );
    }
  }

  formData.value.items = validDetails;
  showSaveDialog.value = true;
};

const onPrintConfirm = () => {
  window.open(
    `/garmen/barang/po-nonbahan/print/${encodeURIComponent(nomorToPrint.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  router.push({ name: "PoNonBahanGarmenBrowse" });
};

const onPrintCancel = () => {
  showPrintDialog.value = false;
  router.push({ name: "PoNonBahanGarmenBrowse" });
};
</script>

<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah PO ' : 'PO ') + formJenis"
    menu-id="66"
    :icon="IconFileInvoice"
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
    <template #left-column>
      <div class="desktop-form-section header-section hide-details">
        <div class="fr">
          <label class="lbl">Nomor PO</label>
          <input
            :value="formData.header.po_nomor"
            class="inp ro text-primary font-weight-bold"
            placeholder="<-- Otomatis"
            readonly
          />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.header.po_tanggal"
            class="idate"
            :readonly="formData.header.isTutupBuku"
          />
        </div>

        <div class="sep mt-2 mb-2" />

        <div class="fr">
          <label class="lbl">No. Permintaan</label>
          <div class="cell-grp w-100">
            <input
              v-model="formData.header.po_mb_nomor"
              class="inp ro"
              placeholder="F1 / Cari..."
              readonly
            />
            <button
              type="button"
              class="ci-btn"
              :disabled="isEditMode"
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
          <label class="lbl">Cabang Tujuan</label>
          <input :value="formData.header.mb_cab" class="inp ro" readonly />
        </div>

        <template v-if="canSeeSup">
          <div class="sep mt-2 mb-2" />
          <div class="fr">
            <label class="lbl">Supplier</label>
            <div class="cell-grp w-100">
              <input
                v-model="formData.header.po_sup_kode"
                class="inp ro font-weight-bold text-primary"
                placeholder="F1 / Cari..."
                readonly
              />
              <button
                type="button"
                class="ci-btn"
                :disabled="formData.header.hasBpb"
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
          <label class="lbl pt-1">Keterangan</label>
          <textarea
            v-model="formData.header.po_ket"
            class="ta"
            rows="3"
            placeholder="Notes PO..."
            :readonly="formData.header.isTutupBuku"
          />
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="right-content-wrapper d-flex flex-column h-100 gap-2 pa-2">
        <div class="tbl-header blue">
          <span class="font-weight-bold"
            >Rincian Komponen / Barang Non-Baku</span
          >
          <span
            v-if="formData.header.hasBpb"
            class="text-amber-lighten-4 text-caption font-italic"
            >* Sebagian baris terkunci BPB</span
          >
        </div>
        <div class="tbl-wrap flex-grow-1">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 40px" class="text-center">No</th>
                <th style="width: 100px">Kode</th>
                <th style="min-width: 200px">Nama Barang</th>
                <th style="width: 60px" class="text-center">Satuan</th>
                <th style="width: 80px" class="text-right">Qty Minta</th>
                <th style="width: 80px" class="text-right">Sudah PO</th>
                <th style="width: 80px" class="text-right">Belum PO</th>
                <th style="width: 80px" class="text-right">Qty BPB</th>
                <th
                  style="width: 90px; background: #ffeb3b"
                  class="text-right text-dark"
                >
                  Qty PO
                </th>
                <th
                  v-if="canSeeBeli"
                  style="width: 100px; background: #ffeb3b"
                  class="text-right text-dark"
                >
                  Harga
                </th>
                <th v-if="canSeeBeli" style="width: 110px" class="text-right">
                  Total
                </th>
                <th v-if="isDetailRinci" style="min-width: 130px">
                  Spesifikasi
                </th>
                <th v-if="isDetailRinci" style="min-width: 130px">Kegunaan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in formData.items" :key="idx">
                <td class="text-center gt-lbl">{{ Number(idx) + 1 }}</td>
                <td class="fw-mono text-primary px-2 font-weight-bold">
                  {{ item.Kode }}
                </td>
                <td class="px-2 font-weight-bold truncate">{{ item.Nama }}</td>
                <td class="text-center text-grey-darken-1">
                  {{ item.Satuan }}
                </td>
                <td class="text-right px-2 ro text-grey">
                  {{ formatQty(item.minta) }}
                </td>
                <td class="text-right px-2 ro text-grey">
                  {{ formatQty(item.sudah) }}
                </td>
                <td class="text-right px-2 ro text-blue font-weight-bold">
                  {{ formatQty(item.belum) }}
                </td>
                <td class="text-right px-2 ro font-weight-bold text-success">
                  {{ formatQty(item.bpb) }}
                </td>

                <td class="p0">
                  <input
                    v-model.number="item.jumlah"
                    type="number"
                    class="ci text-right font-weight-bold"
                    :class="{ ro: item.bpb > 0 || formData.header.isTutupBuku }"
                    :readonly="item.bpb > 0 || formData.header.isTutupBuku"
                    @input="recalcTotal(Number(idx))"
                  />
                </td>
                <td v-if="canSeeBeli" class="p0">
                  <input
                    v-model.number="item.harga"
                    type="number"
                    class="ci text-right"
                    :class="{ ro: item.bpb > 0 || formData.header.isTutupBuku }"
                    :readonly="item.bpb > 0 || formData.header.isTutupBuku"
                    @input="recalcTotal(Number(idx))"
                  />
                </td>
                <td
                  v-if="canSeeBeli"
                  class="text-right px-2 font-weight-bold text-error ro"
                >
                  {{ formatQty(item.total) }}
                </td>

                <td v-if="isDetailRinci" class="p0">
                  <input v-model="item.ket" class="ci" placeholder="..." />
                </td>
                <td v-if="isDetailRinci" class="p0">
                  <input v-model="item.kegunaan" class="ci" placeholder="..." />
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
  <SupplierSearchModal
    v-model="showSupModal"
    :jenis="formJenis"
    @selected="setSupplier"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconPrinter :size="18" class="mr-2" /> Konfirmasi Cetak
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        PO Non-Bahan berhasil disimpan dengan nomor
        <span class="font-weight-bold text-primary">{{ nomorToPrint }}</span
        >.<br /><br />
        Apakah Anda ingin langsung mencetak dokumen PO ini?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" @click="onPrintCancel">Tidak</v-btn>
        <v-btn color="primary" variant="elevated" @click="onPrintConfirm"
          >Ya, Cetak PO</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Layouting Mandiri Menggunakan Standar Form Garmen */
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
  width: 110px;
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
  font-size: 12px;
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
}
.gt tbody td {
  border: 1px solid #e0e0e0;
  height: 28px;
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
.det-wrap {
  padding: 8px 12px;
  background: #f5f6f8;
}
.table-scroll-x {
  overflow-x: auto;
  max-width: 100%;
}
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
