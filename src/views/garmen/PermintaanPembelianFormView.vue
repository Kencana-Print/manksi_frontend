<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconShoppingCart, IconSearch } from "@tabler/icons-vue";
import { permintaanPembelianFormService } from "@/services/garmen/permintaanPembelianFormService";

// Gunakan Search Modal yang sudah ada untuk pencarian barang
import BarangGarmenSearchModal from "@/components/lookups/BarangGarmenSearchModal.vue";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
// Ambil jenis dari Query Params jika Baru, atau akan di-override data DB jika Edit
const formJenis = ref(
  typeof route.query.jenis === "string" ? route.query.jenis : "ACCESORIES",
);

const todayLocal = new Date().toISOString().substring(0, 10);

// --- STATE MODAL & GRID ---
const showBarangModal = ref(false);
const activeGridIndex = ref(-1);

const defaultData = {
  header: {
    mb_nomor: "",
    mb_jenis: formJenis.value,
    mb_tanggal: todayLocal,
    mb_mintake: "HO", // HO, P01, P02, P03, P04
    mb_priority: "URGENT",
    mb_ket: "",
    status: "", // Untuk validasi
  },
  items: [
    {
      kode: "",
      nama: "",
      satuan: "",
      jumlah: 0,
      harga: 0,
      total: 0,
      ket: "",
      kegunaan: "",
      realisasi: 0,
    },
  ] as any[],
  realisasi: [] as any[],
};

const showPrintDialog = ref(false);
const nomorToPrint = ref("");

const isFinance = computed(() => authStore.user?.bagian === "FINANCE");

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
  menuId: "65",
  initialData: defaultData,
  fetchApi: async () => {
    const res = await permintaanPembelianFormService.getDetail(
      route.params.nomor as string,
    );
    const d = res.data.data;
    formJenis.value = d.header.mb_jenis;
    return {
      header: {
        ...d.header,
        mb_tanggal: d.header.mb_tanggal_fmt || todayLocal,
        status: d.header.mb_status || "",
        statusPin: d.statusPin || "",
      },
      items: d.items || [],
      realisasi: d.realisasi || [],
    };
  },
  submitApi: async (data: any) => {
    return await permintaanPembelianFormService.saveData({
      isEdit: isEditMode.value,
      header: data.header,
      items: data.items,
    });
  },
  // UBAH ONSUCCESS MENJADI SEPERTI INI:
  onSuccess: (res: any) => {
    toast.success("Permintaan berhasil disimpan!");
    // Ambil nomor dari response backend atau dari form jika edit
    const noTersimpan = res.data?.data?.nomor || formData.value.header.mb_nomor;
    nomorToPrint.value = noTersimpan;
    showPrintDialog.value = true; // Munculkan dialog Vue
  },
});

// --- DYNAMIC COLUMNS (Meniru Delphi) ---
const isDetailRinci = computed(() =>
  ["SPAREPART", "ATK/RTK"].includes(String(formJenis.value)),
);

// --- GRID HANDLERS ---
const addItem = () => {
  formData.value.items.push({
    kode: "",
    nama: "",
    satuan: "",
    jumlah: 0,
    harga: 0,
    total: 0,
    ket: "", // Spesifikasi
    kegunaan: "", // Kegunaan
    realisasi: 0,
  });
};

const removeItem = (idx: number) => {
  formData.value.items.splice(idx, 1);
};

const openLookupBarang = (idx: number) => {
  activeGridIndex.value = idx;
  showBarangModal.value = true;
};

const setBarang = (v: any) => {
  const i = activeGridIndex.value;
  if (i < 0) return;

  const kodeBaru = v.Kode || v.brg_kode;

  // 1. Mencegah duplikasi kode barang dalam grid
  const isDuplicate = formData.value.items.some(
    (d: any, idx: number) => idx !== i && d.kode === kodeBaru,
  );
  if (isDuplicate) {
    return toast.error(`Kode ${kodeBaru} sudah diinput di baris lain.`);
  }

  // 2. Set nilai ke grid
  formData.value.items[i].kode = kodeBaru;
  formData.value.items[i].nama = v.Nama || v.brg_nama;
  formData.value.items[i].satuan = v.Satuan || v.brg_satuan;
  formData.value.items[i].harga = 0; // Default
  recalcTotal(i);

  // 3. Otomatis tambah baris baru JIKA user baru saja mengisi baris paling bawah
  if (i === formData.value.items.length - 1) {
    addItem();
  }
};

// ─────────────────────────────────────────────
// KEYBOARD HANDLERS: KODE BARANG DI GRID
// ─────────────────────────────────────────────

const onKodeKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openLookupBarang(idx);
  }
};

const onKodeEnter = async (idx: number) => {
  const kode = (formData.value.items[idx]?.kode || "").trim().toUpperCase();

  // Kosong → buka modal
  if (!kode) {
    openLookupBarang(idx);
    return;
  }

  try {
    isLoading.value = true;
    const res = await permintaanPembelianFormService.getBarangByKode(
      kode,
      formJenis.value,
      authStore.user?.cabang || "HO-",
      authStore.user?.bagian || "",
    );
    const item = res.data.data;

    // Cek duplikat
    const isDuplicate = formData.value.items.some(
      (d: any, i: number) => i !== idx && d.kode === item.Kode,
    );
    if (isDuplicate) {
      toast.error(`Kode ${item.Kode} sudah diinput di baris lain.`);
      formData.value.items[idx].kode = "";
      return;
    }

    formData.value.items[idx].kode = item.Kode;
    formData.value.items[idx].nama = item.Nama;
    formData.value.items[idx].satuan = item.Satuan;
    formData.value.items[idx].harga = 0;
    recalcTotal(idx);

    // Auto tambah baris jika ini baris terakhir
    if (idx === formData.value.items.length - 1) {
      addItem();
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode barang tidak ditemukan.");
    formData.value.items[idx].kode = "";
    formData.value.items[idx].nama = "";
    formData.value.items[idx].satuan = "";
  } finally {
    isLoading.value = false;
  }
};

const recalcTotal = (i: number) => {
  const row = formData.value.items[i];
  row.total = (Number(row.jumlah) || 0) * (Number(row.harga) || 0);
};

// Tabel 2 (Realisasi) merespon baris aktif di Tabel 1
const activeItemRealisasi = computed(() => {
  if (activeGridIndex.value < 0 || formData.value.items.length === 0) return [];
  const activeKode = formData.value.items[activeGridIndex.value]?.kode;
  if (!activeKode) return [];
  return formData.value.realisasi.filter((r: any) => r.kode === activeKode);
});

// --- VALIDATION ---
const validateSave = () => {
  // 1. Keterangan tidak boleh kosong
  if (!formData.value.header.mb_ket.trim()) {
    return toast.warning("Keterangan harus di isi.");
  }

  // 2. Validasi PIN 5 (xminta5 di Delphi)
  const pin = formData.value.header.statusPin;
  if (pin === "MINTA" || pin === "WAIT" || pin === "TOLAK") {
    return toast.error(
      "Transaksi tsb sudah diclose.\nSilahkan minta approve untuk bisa menyimpan perubahan data.",
    );
  }

  // 3. Validasi Detail (Minimal 1 baris terisi)
  const validDetails = formData.value.items.filter(
    (d: any) => d.kode && d.kode.trim() !== "",
  );
  if (validDetails.length === 0) {
    return toast.warning("Detail harus diisi.");
  }

  // 4. Validasi Jumlah (Tidak boleh 0)
  for (let i = 0; i < validDetails.length; i++) {
    const row = validDetails[i];
    if (Number(row.jumlah) <= 0) {
      return toast.warning(`Jumlah harus di isi! (Baris ke-${i + 1})`);
    }
  }

  // 5. Validasi Status Dokumen
  if (formData.value.header.status !== "") {
    return toast.warning(
      `Sudah ${formData.value.header.status}, tidak dapat diubah.`,
    );
  }

  // Jika lolos semua, buang baris kosong dan munculkan dialog simpan
  formData.value.items = validDetails;
  showSaveDialog.value = true;
};

// --- HANDLER DIALOG CETAK ---
const onPrintConfirm = () => {
  window.open(
    `/garmen/barang/permintaan-pembelian/print/${encodeURIComponent(nomorToPrint.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  router.push({ name: "PermintaanPembelianGarmen" });
};

const onPrintCancel = () => {
  showPrintDialog.value = false;
  router.push({ name: "PermintaanPembelianGarmen" });
};

// Menambah baris kosong di tabel realisasi
const addRealisasiRow = () => {
  formData.value.realisasi.push({
    kode: formData.value.items[activeGridIndex.value].kode,
    tanggal: todayLocal,
    jumlah: 0,
    ket: "",
  });
};

// Logic Hapus Baris Realisasi (Meniru cxGrdMain2KeyUp)
const removeRealisasiRow = (idx: number) => {
  if (!isFinance.value) return;
  if (confirm("Hapus Realisasi ini?")) {
    const row = activeItemRealisasi.value[idx];
    // Hapus dari state utama
    const globalIdx = formData.value.realisasi.findIndex((r: any) => r === row);
    formData.value.realisasi.splice(globalIdx, 1);
  }
};

// Simpan Realisasi per Item (Meniru btnsimpanClick)
const onSaveRealisasi = async () => {
  const activeItem = formData.value.items[activeGridIndex.value];

  if (!activeItem?.kode) {
    return toast.warning("Pilih barang terlebih dahulu");
  }

  try {
    // Ganti pemanggilan api.post langsung dengan service
    await permintaanPembelianFormService.saveRealisasi({
      nomor: formData.value.header.mb_nomor,
      kode: activeItem.kode,
      items: activeItemRealisasi.value,
    });

    toast.success("Realisasi item ini berhasil diperbarui");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal simpan realisasi");
  }
};

// ---- GAMBAR ----
const activeTab = ref<"transaksi" | "gambar">("transaksi");
const gambarFileInputRef = ref<HTMLInputElement | null>(null);
const gambarCacheBust = ref<number>(Date.now());
const isUploadingGambar = ref<boolean>(false);

// Baris grid yang jadi sumber gambar aktif di tab "Gambar"
// (activeGridIndex sudah ada, dipakai bareng untuk realisasi)

const activeItem = computed(() => {
  return formData.value.items[activeGridIndex.value] || null;
});

const gambarUrl = computed((): string => {
  const nomor = formData.value.header.mb_nomor;
  const kode = activeItem.value?.kode;
  if (!nomor || !kode) return "";
  return `/images/permintaan-pembelian/${nomor}${kode}.jpg?t=${gambarCacheBust.value}`;
});

const onGambarError = (e: Event): void => {
  const img = e.target as HTMLImageElement;
  img.src = ""; // tidak ada fallback legacy Delphi untuk modul ini (image dulu disimpan di path lokal aplikasi lama, bukan /file-gambar/)
};

const triggerGambarUpload = (): void => {
  const nomor = formData.value.header.mb_nomor;
  if (!nomor) {
    toast.warning("Simpan data terlebih dahulu sebelum upload gambar.");
    return;
  }
  if (!activeItem.value?.kode) {
    toast.warning("Pilih baris barang terlebih dahulu.");
    return;
  }
  gambarFileInputRef.value?.click();
};

const onGambarFileSelected = async (e: Event): Promise<void> => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.size > 1000000) {
    toast.error("Ukuran gambar tidak boleh > 1 Mb.");
    if (gambarFileInputRef.value) gambarFileInputRef.value.value = "";
    return;
  }

  const nomor = formData.value.header.mb_nomor;
  const kode = activeItem.value?.kode;
  if (!nomor || !kode) return;

  try {
    isUploadingGambar.value = true;
    const form = new FormData();
    form.append("gambar", file);
    await permintaanPembelianFormService.uploadGambarItem(nomor, kode, form);
    if (activeItem.value) activeItem.value.foto = "YA";
    gambarCacheBust.value = Date.now();
    toast.success("Gambar berhasil diupload");
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message
        : undefined;
    toast.error(msg || "Gagal upload gambar");
  } finally {
    isUploadingGambar.value = false;
    if (gambarFileInputRef.value) gambarFileInputRef.value.value = "";
  }
};

const onHapusGambarItem = async (): Promise<void> => {
  const nomor = formData.value.header.mb_nomor;
  const kode = activeItem.value?.kode;
  if (!nomor || !kode) return;
  if (!confirm("Hapus gambar?")) return;

  try {
    await permintaanPembelianFormService.deleteGambarItem(nomor, kode);
    if (activeItem.value) activeItem.value.foto = "";
    gambarCacheBust.value = Date.now();
    toast.success("Gambar berhasil dihapus");
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message
        : undefined;
    toast.error(msg || "Gagal hapus gambar");
  }
};
</script>

<template>
  <div class="tab-bar">
    <button
      type="button"
      class="tab-btn"
      :class="{ active: activeTab === 'transaksi' }"
      @click="activeTab = 'transaksi'"
    >
      Transaksi
    </button>
    <button
      type="button"
      class="tab-btn"
      :class="{ active: activeTab === 'gambar' }"
      @click="activeTab = 'gambar'"
    >
      Gambar
    </button>
  </div>

  <BaseForm
    v-show="activeTab === 'transaksi'"
    :title="
      isEditMode
        ? `Ubah Permintaan Pembelian ${formJenis}`
        : `Permintaan Pembelian ${formJenis}`
    "
    menu-id="65"
    :icon="IconShoppingCart"
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
    <!-- KOLOM KIRI (HEADER) -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.header.mb_nomor"
            class="inp ro text-primary font-weight-bold"
            placeholder="<-- Kosong=Baru"
            readonly
          />
        </div>
        <div class="fr mt-1">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.header.mb_tanggal"
            class="idate"
          />
        </div>

        <div class="sep mt-2 mb-2" />

        <div class="fr">
          <label class="lbl">Minta Ke</label>
          <select
            v-model="formData.header.mb_mintake"
            class="inp"
            style="width: 120px"
          >
            <option
              v-for="c in ['HO', 'P01', 'P02', 'P03', 'P04', 'P05']"
              :key="c"
              :value="c"
            >
              {{ c }}
            </option>
          </select>
        </div>
        <div class="fr mt-1">
          <label class="lbl">Priority</label>
          <select
            v-model="formData.header.mb_priority"
            class="inp"
            style="width: 120px"
          >
            <option value="URGENT">URGENT</option>
            <option value="TOP URGENT">TOP URGENT</option>
          </select>
        </div>

        <div class="fr mt-2" style="align-items: flex-start">
          <label class="lbl pt-1">Keterangan</label>
          <textarea
            v-model="formData.header.mb_ket"
            class="ta"
            rows="3"
            placeholder="Tujuan/Keterangan permintaan..."
          />
        </div>
      </div>
    </template>

    <!-- KOLOM KANAN (Tabel Permintaan & Tabel Realisasi) -->
    <template #right-column>
      <div class="right-content-wrapper d-flex flex-column h-100 gap-2 pa-2">
        <!-- GRID 1: BARANG YANG DIMINTA -->
        <div class="d-flex flex-column" style="flex: 1; min-height: 250px">
          <div class="tbl-header blue">
            <span class="font-weight-bold">1. Rincian Barang Diminta</span>
            <button type="button" class="btn-add" @click="addItem">
              + Tambah Baris
            </button>
          </div>
          <div class="tbl-wrap flex-grow-1">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 40px" class="text-center">No</th>
                  <th style="width: 110px">Kode</th>
                  <th style="min-width: 180px">Nama Barang</th>
                  <th v-if="isDetailRinci" style="min-width: 150px">
                    Spesifikasi
                  </th>
                  <th style="width: 60px" class="text-center">Sat</th>
                  <th
                    style="width: 90px; background: #2e7d32"
                    class="text-right text-white"
                  >
                    Est.Realisasi
                  </th>
                  <th
                    style="width: 90px; background: #ffeb3b"
                    class="text-right text-dark"
                  >
                    Jumlah
                  </th>
                  <th
                    v-if="isDetailRinci"
                    style="width: 100px; background: #ffeb3b"
                    class="text-right text-dark"
                  >
                    Harga
                  </th>
                  <th
                    v-if="isDetailRinci"
                    style="width: 110px"
                    class="text-right"
                  >
                    Total
                  </th>
                  <th
                    v-if="isDetailRinci"
                    style="min-width: 120px; background: #ffeb3b"
                    class="text-dark"
                  >
                    Kegunaan
                  </th>
                  <th style="width: 40px" class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, idx) in formData.items"
                  :key="idx"
                  :class="{ 'active-row': activeGridIndex === Number(idx) }"
                  @click="activeGridIndex = Number(idx)"
                >
                  <td class="text-center gt-lbl">{{ Number(idx) + 1 }}</td>
                  <td class="p0">
                    <div class="cell-grp">
                      <input
                        v-model="item.kode"
                        class="ci font-weight-bold text-primary"
                        placeholder="F1 / kode"
                        style="text-transform: uppercase"
                        @keydown="onKodeKeydown($event, Number(idx))"
                        @keydown.enter.prevent="onKodeEnter(Number(idx))"
                        @focus="activeGridIndex = Number(idx)"
                      />
                      <button
                        type="button"
                        class="ci-btn"
                        title="Cari Barang (F1)"
                        @click.stop="openLookupBarang(Number(idx))"
                      >
                        <IconSearch :size="12" color="#1565c0" />
                      </button>
                    </div>
                  </td>
                  <td class="p0">
                    <input v-model="item.nama" class="ci ro" readonly />
                  </td>

                  <td v-if="isDetailRinci" class="p0">
                    <input v-model="item.ket" class="ci" placeholder="..." />
                  </td>

                  <td class="p0">
                    <input
                      v-model="item.satuan"
                      class="ci ro text-center"
                      readonly
                    />
                  </td>
                  <td class="p0">
                    <input
                      :value="item.realisasi"
                      class="ci ro text-right font-weight-bold text-success"
                      readonly
                    />
                  </td>

                  <td class="p0">
                    <input
                      v-model.number="item.jumlah"
                      type="number"
                      class="ci text-right font-weight-bold"
                      @input="recalcTotal(Number(idx))"
                      v-select-on-focus
                    />
                  </td>

                  <td v-if="isDetailRinci" class="p0">
                    <input
                      v-model.number="item.harga"
                      type="number"
                      class="ci text-right"
                      @input="recalcTotal(Number(idx))"
                      v-select-on-focus
                    />
                  </td>
                  <td v-if="isDetailRinci" class="p0">
                    <input
                      :value="item.total"
                      class="ci ro text-right"
                      readonly
                    />
                  </td>
                  <td v-if="isDetailRinci" class="p0">
                    <input
                      v-model="item.kegunaan"
                      class="ci"
                      placeholder="..."
                    />
                  </td>

                  <td class="text-center p0">
                    <button
                      type="button"
                      class="btn-del"
                      @click.stop="removeItem(Number(idx))"
                      title="Hapus Baris"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                <tr v-if="formData.items.length === 0">
                  <td
                    :colspan="isDetailRinci ? 11 : 7"
                    class="empty-row text-center text-grey font-italic py-4"
                  >
                    Klik + Tambah Baris untuk mulai meminta barang
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- GRID 2: REALISASI PEMBELIAN (READONLY DI SINI) -->
        <div class="d-flex flex-column" style="height: 180px; flex-shrink: 0">
          <div class="tbl-header grey">
            <span class="font-weight-bold text-dark"
              >2. Realisasi Permintaan Pembelian</span
            >
            <div v-if="isFinance" class="d-flex gap-2">
              <button type="button" class="btn-add-sm" @click="addRealisasiRow">
                + Tambah Realisasi
              </button>
              <button
                type="button"
                class="btn-save-sm"
                @click="onSaveRealisasi"
              >
                Simpan Item Ini
              </button>
            </div>
          </div>
          <div class="tbl-wrap flex-grow-1">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 40px" class="text-center">No</th>
                  <th style="width: 100px" class="text-center">Tgl Beli</th>
                  <th style="width: 120px" class="text-right">
                    Qty Est.Realisasi
                  </th>
                  <th style="min-width: 250px">Keterangan Beli</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, idx) in activeItemRealisasi" :key="idx">
                  <td class="text-center gt-lbl">{{ Number(idx) + 1 }}</td>
                  <td class="text-center">{{ r.tanggal }}</td>
                  <td class="text-right font-weight-bold text-success">
                    {{ r.jumlah }}
                  </td>
                  <td>{{ r.ket }}</td>
                  <td>
                    <input v-model="r.ket" class="ci" :readonly="!isFinance" />
                  </td>
                  <td v-if="isFinance" class="text-center">
                    <button
                      @click="removeRealisasiRow(Number(idx))"
                      class="text-error"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                <tr v-if="activeItemRealisasi.length === 0">
                  <td
                    colspan="4"
                    class="empty-row text-center text-grey font-italic py-3"
                  >
                    Belum ada realisasi untuk item yang dipilih.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <div v-show="activeTab === 'gambar'" class="gambar-tab-wrap">
    <div v-if="!activeItem" class="text-center text-grey py-8">
      Pilih baris barang di tab Transaksi terlebih dahulu.
    </div>
    <template v-else>
      <p class="text-caption mb-2">
        Gambar untuk:
        <strong>{{ activeItem.kode }} - {{ activeItem.nama }}</strong>
      </p>
      <div class="gambar-preview-box">
        <img
          v-if="activeItem.foto === 'YA'"
          :src="gambarUrl"
          class="gambar-preview"
          @error="onGambarError"
          alt="Preview gambar"
        />
        <span v-else class="text-grey">Belum ada gambar</span>
      </div>
      <div class="gambar-actions">
        <input
          ref="gambarFileInputRef"
          type="file"
          accept="image/*"
          hidden
          @change="onGambarFileSelected"
        />
        <v-btn
          size="small"
          color="primary"
          :loading="isUploadingGambar"
          @click="triggerGambarUpload"
        >
          Upload Gambar
        </v-btn>
        <v-btn
          v-if="activeItem.foto === 'YA'"
          size="small"
          color="error"
          variant="outlined"
          @click="onHapusGambarItem"
        >
          Hapus Gambar
        </v-btn>
      </div>
    </template>
  </div>

  <BarangGarmenSearchModal
    v-model="showBarangModal"
    :jenis="formJenis"
    :cabang="authStore.user?.cabang || 'ALL'"
    @selected="setBarang"
  />

  <!-- DIALOG KONFIRMASI CETAK -->
  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconPrinter :size="18" class="mr-2" /> Konfirmasi Cetak
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        Data berhasil disimpan dengan nomor
        <span class="font-weight-bold text-primary">{{ nomorToPrint }}</span
        >.<br /><br />
        Apakah Anda ingin mencetak dokumen ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="onPrintCancel">Tidak, Kembali</v-btn>
        <v-btn color="primary" variant="elevated" @click="onPrintConfirm"
          >Ya, Cetak</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* REUSABLE STYLES MIRIP BASE BROWSE/FORM LAINNYA */
.header-section {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}
.fr {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 6px;
  min-height: 24px;
}
.lbl {
  width: 85px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.inp,
.idate,
.ta {
  flex: 1;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 11px;
  outline: none;
  background: white;
}
.inp:focus,
.idate:focus,
.ta:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f4f8 !important;
  color: #555 !important;
}
.ta {
  resize: vertical;
}
.sep {
  height: 1px;
  background: #eee;
  width: 100%;
}

.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 11px;
  border-radius: 4px 4px 0 0;
}
.tbl-header.blue {
  background: #1565c0;
  color: white;
}
.tbl-header.grey {
  background: #e0e0e0;
  color: #333;
  border: 1px solid #bdbdbd;
  border-bottom: none;
}

.btn-add {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
}
.btn-add:hover {
  background: rgba(255, 255, 255, 0.3);
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
  padding: 5px 6px;
  font-weight: 700;
  color: #424242;
  position: sticky;
  top: 0;
  z-index: 1;
}
.gt tbody td {
  border: 1px solid #e0e0e0;
  height: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.active-row td {
  background: #e3f2fd !important;
}

.p0 {
  padding: 0 !important;
}
.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}
.ci:focus:not(.ro) {
  background: #fffde7;
}
.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
  width: 100%;
  overflow: hidden;
}
.cell-grp .ci {
  flex: 1;
  min-width: 0;
}
.ci-btn {
  width: 24px;
  min-width: 24px;
  height: 25px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #ccc;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
}
.ci-btn:hover {
  background: #bbdefb;
}
.btn-del {
  width: 100%;
  height: 25px;
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  font-weight: bold;
}
.btn-del:hover {
  background: #ffebee;
}
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 6px 8px 0;
  background: #f5f5f5;
}
.tab-btn {
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #e0e0e0;
  border-bottom: none;
  background: #eee;
  color: #666;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
}
.tab-btn.active {
  background: white;
  color: #1565c0;
  border-color: #1565c0;
}
.gambar-tab-wrap {
  background: white;
  border: 1px solid #e0e0e0;
  padding: 16px;
  min-height: 400px;
}
.gambar-preview-box {
  width: 100%;
  max-width: 500px;
  min-height: 300px;
  border: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  background: #fafafa;
}
.gambar-preview {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}
.gambar-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
