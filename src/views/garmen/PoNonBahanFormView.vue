<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { useTabsStore } from "@/stores/tabsStore";
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
const tabsStore = useTabsStore();

const isEditMode = computed(() => !!route.params.nomor);
const formJenis = ref(
  typeof route.params.jenis === "string" ? route.params.jenis : "ACCESORIES",
);
const todayLocal = new Date().toLocaleDateString("sv-SE");

// --- LOOKUP CONTROL STATE ---
const showMintaModal = ref(false);
const showSupModal = ref(false);

const defaultData = {
  header: {
    po_nomor: "",
    po_jenis: formJenis.value,
    po_tanggal: todayLocal,
    po_kecab: "",
    po_sup_kode: "",
    sup_nama: "",
    sup_alamat: "",
    sup_kota: "",
    po_ppn: 0,
    po_ket: "",
    po_status: "",
    pin_status: "",
    isTutupBuku: false,
    hasBpb: false,
  },
  items: [] as any[],
};

// Input "Panggil Permintaan" (bukan bagian formData)
const mintaInput = ref("");

const showPrintDialog = ref(false);
const nomorToPrint = ref("");

// Hak Akses Flags dari Token User
// ⚠️ Sama pola PO Bahan: panel Supplier disembunyikan (bukan
// dihapus dari formData) kalau user gak punya izin lihatSup —
// replikasi semangat `if zLihatSup=0` di ufrmBrowsePO (walau form
// PO Garmen sendiri di Delphi tidak eksplisit nge-toggle gbsup.Visible,
// diseragamkan dengan pola PO Bahan sesuai keputusan). TIDAK ada
// bypass tambahan berdasarkan bagian user (mis. "FINANCE") — cukup
// flag lihatSup murni, konsisten sama semua modul lain yang sudah
// diaudit.
const canSeeSup = computed(() => authStore.user?.flags.lihatSup === 1);
const canSeeBeli = computed(() => authStore.user?.flags.lihatBeli === 1);

// --- HELPER FORMATTING UTK METRIC DAN KATA DI TEMPLATE ---
const formatQty = (val: any) => {
  return Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const subtotal = computed(() =>
  formData.value.items.reduce(
    (sum: number, item: any) => sum + (Number(item.total) || 0),
    0,
  ),
);
const ppnNilai = computed(
  () => (subtotal.value * (Number(formData.value.header.po_ppn) || 0)) / 100,
);
const grandTotal = computed(() => subtotal.value + ppnNilai.value);

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

// Format angka dengan separator ribuan untuk display
const formatHarga = (val: any) => {
  const num = Number(val) || 0;
  if (num === 0) return "";
  return new Intl.NumberFormat("id-ID").format(num);
};

// Saat input harga — simpan nilai mentah ke item, recalc total
const onHargaInput = (e: Event, idx: number) => {
  const raw = (e.target as HTMLInputElement).value
    .replace(/\./g, "")
    .replace(/,/g, "");
  const num = Number(raw) || 0;
  formData.value.items[idx].harga = num;
  recalcTotal(idx);
};

// Saat focus — tampilkan angka polos tanpa separator
const onHargaFocus = (e: Event, idx: number) => {
  const input = e.target as HTMLInputElement;
  const num = Number(formData.value.items[idx].harga) || 0;
  input.value = num === 0 ? "" : String(num);
  input.select();
};

// Saat blur — format ulang dengan separator
const onHargaBlur = (e: Event, idx: number) => {
  const input = e.target as HTMLInputElement;
  const num = Number(formData.value.items[idx].harga) || 0;
  input.value = num === 0 ? "" : new Intl.NumberFormat("id-ID").format(num);
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
  onFormReset: () => {
    formJenis.value =
      typeof route.params.jenis === "string"
        ? route.params.jenis
        : "ACCESORIES";
    formData.value.header = {
      po_nomor: "",
      po_jenis: formJenis.value,
      po_tanggal: todayLocal,
      po_kecab: "",
      po_sup_kode: "",
      sup_nama: "",
      sup_alamat: "",
      sup_kota: "",
      po_ppn: 0,
      po_ket: "",
      po_status: "",
      pin_status: "",
      isTutupBuku: false,
      hasBpb: false,
    };
    formData.value.items = [];
    mintaInput.value = "";
    showMintaModal.value = false;
    showSupModal.value = false;
    showPrintDialog.value = false;
    nomorToPrint.value = "";
  },
  fetchApi: async () => {
    const res = await poNonBahanFormService.getDetail(
      route.params.nomor as string,
    );
    const d = res.data.data;
    formJenis.value = d.header.po_jenis;

    return {
      header: { ...d.header, po_ppn: Number(d.header.po_ppn) || 0 },
      items: d.detail.map((item: any) => ({
        mbNomor: item.mbNomor || "",
        Kode: item.Kode || item.kode || "",
        Nama: item.Nama,
        Satuan: item.Satuan,
        ket: item.ket,
        kegunaan: item.kegunaan,
        minta: item.minta,
        sudah: item.sudah,
        belum: item.belum,
        bpb: item.bpb,
        jumlah: item.jumlah,
        harga: item.harga,
        total: (Number(item.jumlah) || 0) * (Number(item.harga) || 0),
      })),
    };
  },
  submitApi: async (data: any) => {
    return await poNonBahanFormService.saveData({
      isEdit: isEditMode.value,
      po_nomor: data.header.po_nomor,
      po_jenis: formJenis.value,
      po_tanggal: data.header.po_tanggal,
      po_kecab: data.header.po_kecab,
      po_ppn: Number(data.header.po_ppn) || 0,
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
  ["SPAREPART", "ATK/RTK", "ASET"].includes(String(formJenis.value)),
);

// --- LOOKUP CALLBACKS ---
const bolehPanggil = computed(
  () => !formData.value.header.hasBpb && !formData.value.header.isTutupBuku,
);

// Tambah item satu nomor permintaan ke grid. Boleh berkali-kali dengan nomor
// berbeda; item yang sudah ada di grid (permintaan + kode) dilewati.
const tambahPermintaan = async (nomorInput: string) => {
  const nomor = nomorInput.trim();
  const hdr = formData.value.header;
  if (!nomor || !bolehPanggil.value) return;

  try {
    isLoading.value = true;
    const res = await poNonBahanFormService.getPermintaanDetail(
      nomor,
      hdr.po_nomor,
    );
    const rows: any[] = res.data.data || [];
    const kecab = rows[0]?.kecab || "";
    if (hdr.po_kecab && kecab && hdr.po_kecab !== kecab) {
      toast.warning(
        `Cabang tujuan permintaan ${nomor} (${kecab}) berbeda dengan PO ini (${hdr.po_kecab}). Tidak bisa digabung.`,
      );
      return;
    }
    const ada = new Set(
      formData.value.items.map((i: any) => `${i.mbNomor}|${i.Kode}`),
    );
    const baru = rows.filter((r) => !ada.has(`${r.mbNomor}|${r.Kode}`));
    if (!baru.length) {
      toast.info("Semua item permintaan ini sudah ada di PO.");
      return;
    }
    if (!hdr.po_kecab) hdr.po_kecab = kecab;
    formData.value.items.push(...baru);
    mintaInput.value = "";
  } catch (e: any) {
    toast.error(e.response?.data?.message || "No. Permintaan tidak ditemukan.");
  } finally {
    isLoading.value = false;
  }
};

// Pilihan dari modal
const setPermintaan = (v: any) => tambahPermintaan(v.Nomor);

const setSupplier = (v: any) => {
  formData.value.header.po_sup_kode = v.Kode;
  formData.value.header.sup_nama = v.Nama;
  formData.value.header.sup_alamat = v.Alamat;
  formData.value.header.sup_kota = v.Kota;
};

// F1 → buka modal
const onMintaKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (bolehPanggil.value) showMintaModal.value = true;
  }
};

// Enter → panggil nomor yang diketik
const onMintaEnter = () => tambahPermintaan(mintaInput.value);

// Hapus baris; kalau grid kosong, cabang tujuan dilepas supaya bisa pilih permintaan cabang lain
const removeRow = (idx: number) => {
  formData.value.items.splice(idx, 1);
  if (!formData.value.items.length) formData.value.header.po_kecab = "";
};

// F1 → buka modal supplier
const onSupKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (!formData.value.header.hasBpb) showSupModal.value = true;
  }
};

// Enter → fetch supplier langsung dari input kode
const onSupEnter = async () => {
  const kode = formData.value.header.po_sup_kode.trim();
  if (!kode || formData.value.header.hasBpb) return;

  try {
    isLoading.value = true;
    const res = await poNonBahanFormService.getSupplierByKode(kode);
    const sup = res.data.data;
    if (!sup) throw new Error("Supplier tidak ditemukan.");
    setSupplier(sup);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode supplier tidak ditemukan.");
    formData.value.header.po_sup_kode = "";
    formData.value.header.sup_nama = "";
    formData.value.header.sup_alamat = "";
    formData.value.header.sup_kota = "";
  } finally {
    isLoading.value = false;
  }
};

const recalcTotal = (idx: number) => {
  const row = formData.value.items[idx];
  row.total = (Number(row.jumlah) || 0) * (Number(row.harga) || 0);
};

// --- VALIDATION BEFORE SAVE (1:1 Delphi Logic) ---
const validateSave = () => {
  const hdr = formData.value.header;
  if (hdr.isTutupBuku) {
    return toast.error(
      "Transaksi tsb sudah diclose.\nSilahkan minta approve PIN untuk bisa menyimpan perubahan data.",
    );
  }
  if (!hdr.po_sup_kode) {
    toast.warning("Supplier harus di isi. Tidak bisa disimpan.");
    return;
  }
  if (hdr.po_status && hdr.po_status.trim() !== "") {
    return toast.warning(`Sudah ${hdr.po_status}, tidak dapat diubah.`);
  }
  if (hdr.hasBpb) {
    return toast.error(
      "PO tsb sudah ada penerimaan BPB.\nTidak bisa disimpan.",
    );
  }
  const ppn = Number(hdr.po_ppn) || 0;
  if (ppn < 0 || ppn > 100) {
    return toast.warning("PPN harus antara 0 sampai 100.");
  }

  const validDetails = formData.value.items.filter(
    (d: any) => d.Kode && d.jumlah > 0,
  );
  if (validDetails.length === 0)
    return toast.warning("Detail jumlah barang harus diisi.");

  for (let i = 0; i < validDetails.length; i++) {
    const row = validDetails[i];
    if (!row.mbNomor) {
      return toast.warning(
        `Barang pada baris ke-${i + 1} tidak punya No. Permintaan. Panggil ulang permintaannya.`,
      );
    }
    if (Number(row.harga) === 0) {
      return toast.warning(
        `Harga harus di isi untuk barang pada baris ke-${i + 1}`,
      );
    }
  }

  formData.value.items = validDetails;
  showSaveDialog.value = true;
};

const onPrintConfirm = () => {
  const currentPath = route.path;
  window.open(
    `/garmen/barang/po-nonbahan/print/${encodeURIComponent(nomorToPrint.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  router
    .push({ name: "PoNonBahanGarmenBrowse" })
    .catch(() => {})
    .then(() => {
      tabsStore.closeTab(currentPath);
    });
};

const onPrintCancel = () => {
  const currentPath = route.path;
  showPrintDialog.value = false;
  router
    .push({ name: "PoNonBahanGarmenBrowse" })
    .catch(() => {})
    .then(() => {
      tabsStore.closeTab(currentPath);
    });
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
          <label class="lbl">Panggil Permintaan</label>
          <div class="cell-grp">
            <input
              v-model="mintaInput"
              class="inp"
              :class="{ ro: !bolehPanggil }"
              placeholder="F1 / ketik + Enter"
              :readonly="!bolehPanggil"
              @keydown="onMintaKeydown"
              @keydown.enter.prevent="onMintaEnter"
            />
            <button
              type="button"
              class="ci-btn"
              :disabled="!bolehPanggil"
              @click="showMintaModal = true"
              title="Cari No. Permintaan (F1)"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
        <div class="fr mt-1">
          <label class="lbl">Cabang Tujuan</label>
          <input :value="formData.header.po_kecab" class="inp ro" readonly />
        </div>

        <template v-if="canSeeSup">
          <div class="sep mt-2 mb-2" />
          <div class="fr">
            <label class="lbl">Supplier</label>
            <div class="cell-grp">
              <input
                v-model="formData.header.po_sup_kode"
                class="inp font-weight-bold text-primary"
                :class="{ ro: formData.header.hasBpb }"
                placeholder="F1 / kode + Enter"
                :readonly="formData.header.hasBpb"
                @keydown="onSupKeydown"
                @keydown.enter.prevent="onSupEnter"
              />
              <button
                type="button"
                class="ci-btn"
                :disabled="formData.header.hasBpb"
                @click="showSupModal = true"
                title="Cari Supplier (F1)"
              >
                <IconSearch :size="13" />
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

        <template v-if="canSeeBeli">
          <div class="fr mt-1">
            <label class="lbl">PPN %</label>
            <input
              v-model.number="formData.header.po_ppn"
              type="number"
              min="0"
              max="100"
              step="any"
              class="inp"
              :class="{ ro: !bolehPanggil }"
              style="max-width: 90px; flex: none"
              :readonly="!bolehPanggil"
              v-select-on-focus
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
                <th style="width: 130px">No. Permintaan</th>
                <th style="width: 100px">Kode</th>
                <th>Nama Barang</th>
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
                <th style="width: 36px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in formData.items"
                :key="`${item.mbNomor}|${item.Kode}`"
              >
                <td class="text-center gt-lbl">{{ Number(idx) + 1 }}</td>
                <td class="fw-mono px-2 text-grey-darken-2">
                  {{ item.mbNomor }}
                </td>
                <td class="fw-mono text-primary px-2 font-weight-bold">
                  {{ item.Kode }}
                </td>
                <td class="px-2 font-weight-bold nama-wrap">{{ item.Nama }}</td>
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
                    v-select-on-focus
                  />
                </td>
                <td v-if="canSeeBeli" class="p0">
                  <input
                    :value="formatHarga(item.harga)"
                    type="text"
                    inputmode="numeric"
                    class="ci text-right"
                    :class="{ ro: item.bpb > 0 || formData.header.isTutupBuku }"
                    :readonly="item.bpb > 0 || formData.header.isTutupBuku"
                    @focus="onHargaFocus($event, Number(idx))"
                    @blur="onHargaBlur($event, Number(idx))"
                    @input="onHargaInput($event, Number(idx))"
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

                <td class="text-center p0">
                  <button
                    type="button"
                    class="btn-del"
                    title="Hapus baris (bisa dipanggil lagi dari permintaannya)"
                    :disabled="
                      item.bpb > 0 ||
                      formData.header.isTutupBuku ||
                      formData.header.hasBpb
                    "
                    @click="removeRow(Number(idx))"
                  >
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="!formData.items.length">
                <td colspan="15" class="empty-row">
                  Panggil No. Permintaan terlebih dahulu (boleh lebih dari satu)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="canSeeBeli" class="sum-box">
          <div>
            <span>Subtotal</span><b>{{ formatCurrency(subtotal) }}</b>
          </div>
          <div>
            <span>PPN {{ Number(formData.header.po_ppn) || 0 }}%</span
            ><b>{{ formatCurrency(ppnNilai) }}</b>
          </div>
          <div class="sum-grand">
            <span>GRAND TOTAL</span><b>{{ formatCurrency(grandTotal) }}</b>
          </div>
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
  min-width: 1100px;
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
  align-items: stretch;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  background: white;
  flex: 1;
  min-width: 0;
}
.cell-grp .inp {
  border: none;
  height: 100%;
  flex: 1;
  min-width: 0;
  padding: 0 6px;
  background: transparent;
}
.ci-btn {
  width: 28px;
  min-width: 28px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #1565c0;
}
.ci-btn:hover:not(:disabled) {
  background: #bbdefb;
}
.ci-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

/* Nama barang wrap di layar kecil */
.nama-wrap {
  white-space: normal;
  word-break: break-word;
  line-height: 1.3;
  padding-top: 3px;
  padding-bottom: 3px;
}
.btn-del {
  width: 100%;
  height: 27px;
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  font-weight: bold;
}
.btn-del:hover:not(:disabled) {
  background: #ffebee;
}
.btn-del:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px 8px;
}
.sum-box {
  align-self: flex-end;
  min-width: 280px;
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
}
.sum-box > div {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}
.sum-grand {
  border-top: 1px solid #a5d6a7;
  margin-top: 3px;
  padding-top: 3px;
  color: #b71c1c;
}
</style>
