<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { sjTakNormalFormService as svc } from "@/services/penjualan/sjTakNormalFormService";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import GudangJadiSearchModal from "@/components/lookups/GudangJadiSearchModal.vue";
import InvProformaSearchModal from "@/components/lookups/InvProformaSearchModal.vue";
import BarangInvProSearchModal from "@/components/lookups/BarangInvProSearchModal.vue";
import { IconTruckOff, IconSearch, IconAlertTriangle } from "@tabler/icons-vue";

// ── Types ───────────────────────────────────────────────────────────────
interface DetailRow {
  _key: number;
  Kode: string;
  Nama: string;
  Ukuran: string;
  JenisOrder: string;
  Jumlah: number;
  Koli: number;
  Keterangan: string;
}

interface FormData {
  NomorSJ: string;
  Divisi: string;
  Tanggal: string;
  KodePerush: string;
  NamaPerush: string;
  KodeCus: string;
  NamaCus: string;
  AlamatCus: string;
  KotaCus: string;
  GudangKode: string;
  GudangNama: string;
  Keterangan: string;
  InvPro: string;
  Detail: DetailRow[];
}

// ── Setup ────────────────────────────────────────────────────────────────
const router = useRouter();
const route = useRoute();
const toast = useToast();

const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

let _key = 1;
const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

const divisiList = ref<{ kode: number; nama: string }[]>([]);

// ── Default Gudang per divisi ─────────────────────────────────────────
// CATATAN: Delphi refreshdata() cuma cek divisi='1', sedangkan
// cbDivisiChange cek divisi='1' OR '5' -> inkonsistensi kecil di
// Delphi. Disatukan pakai aturan yg lebih permisif di kedua tempat.
const defaultGudangByDivisi = (divisiStr: string) => {
  if (divisiStr === "1" || divisiStr === "5")
    return { kode: "WH002", nama: "GUDANG JADI P2" };
  return { kode: "GJ001", nama: "GUDANG BARANG JADI JERON" };
};

const initDivisi = "1";
const initGudang = defaultGudangByDivisi(initDivisi);

const init: FormData = {
  NomorSJ: "",
  Divisi: initDivisi,
  Tanggal: todayLocal(),
  KodePerush: "",
  NamaPerush: "",
  KodeCus: "",
  NamaCus: "",
  AlamatCus: "",
  KotaCus: "",
  GudangKode: initGudang.kode,
  GudangNama: initGudang.nama,
  Keterangan: "",
  InvPro: "",
  Detail: [],
};

// ── State kontrol create/edit — DITENTUKAN SAAT RUNTIME oleh nomor
// yang diketik (bukan murni dari route seperti form lain) ──────────────
const nomorLocked = ref(false); // terkunci begitu blur, apapun hasilnya
const isExistingRecord = ref(false); // true kalau nomor ditemukan di DB
const isLoadingCheck = ref(false);

// ── useForm — dipakai HANYA utk plumbing dialog save/cancel/close ────
// isEditMode bawaan composable TIDAK dipakai utk branching save/update
// (pakai isExistingRecord lokal), karena keputusan create/edit di form
// ini ditentukan runtime dari isian nomor, bukan dari route semata.
const {
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<FormData>({
  menuId: "154",
  initialData: init,
  immediate: false,
  // fetchApi dihapus — loading data ditangani manual via checkNomor()
  submitApi: async (data): Promise<any> => {
    const payload = {
      ...data,
      Detail: data.Detail.filter((r) => r.Kode).map(({ _key: _k, ...r }) => r),
    };
    return isExistingRecord.value ? svc.update(payload) : svc.save(payload);
  },
  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || fd.value.NomorSJ;
    savedNomor.value = nomor;
    showPrintDialog.value = true;
  },
});

const fd = formData;
const showPrintDialog = ref(false);
const savedNomor = ref("");

// ── Populate form dari hasil checkNomor (dipakai baik utk edit-route
// maupun typed-nomor yg ternyata sudah ada) ──────────────────────────
const applyExistingData = (header: any, detail: any[]) => {
  fd.value.NomorSJ = header.sj_nomor || "";
  fd.value.Divisi = String(header.sj_divisi || initDivisi);
  fd.value.Tanggal = header.sj_tanggal || todayLocal();
  fd.value.KodePerush = header.sj_perush_kode || "";
  fd.value.NamaPerush = header.perush_nama || "";
  fd.value.KodeCus = header.sj_cus_kode || "";
  fd.value.NamaCus = header.cus_nama || "";
  fd.value.AlamatCus = header.sj_alamat_customer || header.cus_alamat || "";
  fd.value.KotaCus = header.sj_kota_customer || header.cus_kota || "";
  fd.value.GudangKode = header.sj_gdg_kode || "";
  fd.value.GudangNama = header.gdg_nama || "";
  fd.value.Keterangan = header.sj_keterangan || "";
  fd.value.InvPro = header.sj_inv_pro || "";
  fd.value.Detail = (detail || []).map((r: any) => ({
    _key: _key++,
    Kode: r.sjd_spk_nomor || "",
    Nama: r.nama_barang || "",
    Ukuran: r.sjd_ukuran || "",
    JenisOrder: r.jenis_order || "",
    Jumlah: Number(r.sjd_jumlah) || 0,
    Koli: Number(r.sjd_koli) || 0,
    Keterangan: r.sjd_keterangan || "",
  }));
};

// ── Nomor SJ — MANUAL, wajib diisi dulu sebelum field lain aktif ────
const isLoadingForm = ref(true);

const onNomorBlur = async () => {
  const nomor = fd.value.NomorSJ.trim();
  if (!nomor) return; // sesuai Delphi: kosong -> tetap fokus di situ

  nomorLocked.value = true;
  isLoadingCheck.value = true;
  try {
    const res = await svc.checkNomor(nomor);
    const d = res.data.data;
    if (d.exists) {
      applyExistingData(d.header, d.detail);
      isExistingRecord.value = true;
      ensureEmptyRow();
    } else {
      // Nomor baru — sesuai Delphi, TIDAK ada pesan "belum ada",
      // langsung dianggap record baru dengan nomor ini.
      fd.value.NomorSJ = nomor;
      isExistingRecord.value = false;
      ensureEmptyRow();
    }
  } catch {
    toast.error("Gagal cek nomor.");
    nomorLocked.value = false;
  } finally {
    isLoadingCheck.value = false;
  }
};

// ── Lookup Modals — Perusahaan ────────────────────────────────────────
const showPerushModal = ref(false);

const selectPerush = (item: any) => {
  fd.value.KodePerush = item.perush_kode || item.Kode || "";
  fd.value.NamaPerush = item.perush_nama || item.Nama || "";
  showPerushModal.value = false;
};

const onPerushEnter = async () => {
  const kode = fd.value.KodePerush.trim();
  if (!kode) return;
  try {
    const res = await svc.searchPerusahaan(kode);
    const list = res.data.data || [];
    const exact = list.find(
      (p: any) => p.perush_kode?.toLowerCase() === kode.toLowerCase(),
    );
    const found = exact || list[0];
    if (found) {
      fd.value.KodePerush = found.perush_kode;
      fd.value.NamaPerush = found.perush_nama;
    } else {
      toast.error(`Perusahaan "${kode}" tidak ditemukan.`);
      fd.value.KodePerush = "";
      fd.value.NamaPerush = "";
    }
  } catch {
    toast.error("Gagal mencari perusahaan.");
  }
};

// ── Gudang ────────────────────────────────────────────────────────────
const showGudangModal = ref(false);

const selectGudang = (item: any) => {
  fd.value.GudangKode = item.Kode;
  fd.value.GudangNama = item.Nama;
  showGudangModal.value = false;
};

watch(
  () => fd.value.Divisi,
  (val) => {
    if (!isExistingRecord.value) {
      const g = defaultGudangByDivisi(String(val).charAt(0));
      fd.value.GudangKode = g.kode;
      fd.value.GudangNama = g.nama;
    }
  },
);

// ── Customer — dengan cek mismatch terhadap SPK baris pertama grid ────
// Sesuai Delphi edtCusKodeExit. DIPERBAIKI: Delphi asli tidak
// mem-populate ulang info customer setelah konfirmasi ganti (bug),
// di sini tetap di-load supaya tidak nyisain field kosong.
const showCusModal = ref(false);
const showCustomerMismatchDialog = ref(false);
const pendingCustomerKode = ref("");

const applyCustomerByKode = async (kode: string): Promise<boolean> => {
  try {
    const res = await svc.getCustomerInfo(kode);
    const c = res.data.data;
    fd.value.KodeCus = c.cus_kode;
    fd.value.NamaCus = c.cus_nama;
    fd.value.AlamatCus = c.cus_alamat;
    fd.value.KotaCus = c.cus_kota;
    return true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || `Kode tidak ditemukan`);
    return false;
  }
};

const onCusBlur = async () => {
  const kode = fd.value.KodeCus.trim();
  if (!kode) return;

  const firstRow = fd.value.Detail.find((r) => r.Kode);
  if (firstRow) {
    const res = await svc.getSpkCustomer(firstRow.Kode);
    const spkCusKode = res.data.data.cusKode;
    if (spkCusKode && spkCusKode !== kode) {
      pendingCustomerKode.value = kode;
      showCustomerMismatchDialog.value = true;
      return;
    }
  }

  const ok = await applyCustomerByKode(kode);
  if (!ok) {
    fd.value.KodeCus = "";
    fd.value.NamaCus = "";
  }
};

const onCustomerSelect = async (item: any) => {
  const kode = item.Kode || item.cus_kode || "";
  const firstRow = fd.value.Detail.find((r) => r.Kode);
  if (firstRow) {
    const res = await svc.getSpkCustomer(firstRow.Kode);
    const spkCusKode = res.data.data.cusKode;
    if (spkCusKode && spkCusKode !== kode) {
      pendingCustomerKode.value = kode;
      showCustomerMismatchDialog.value = true;
      showCusModal.value = false;
      return;
    }
  }
  const ok = await applyCustomerByKode(kode);
  if (ok) showCusModal.value = false;
};

const confirmCustomerMismatch = async () => {
  fd.value.Detail = [];
  ensureEmptyRow();
  await applyCustomerByKode(pendingCustomerKode.value);
  showCustomerMismatchDialog.value = false;
  pendingCustomerKode.value = "";
};

const cancelCustomerMismatch = async () => {
  // Sesuai Delphi: revert ke customer milik SPK baris pertama
  const firstRow = fd.value.Detail.find((r) => r.Kode);
  if (firstRow) {
    const res = await svc.getSpkCustomer(firstRow.Kode);
    const spkCusKode = res.data.data.cusKode;
    if (spkCusKode) await applyCustomerByKode(spkCusKode);
  }
  showCustomerMismatchDialog.value = false;
  pendingCustomerKode.value = "";
};

// ── Invoice Proforma — F1, TIDAK ada validasi khusus di Delphi ───────
const showInvProModal = ref(false);

const selectInvPro = (item: any) => {
  fd.value.InvPro = item.Nomor;
  showInvProModal.value = false;
};

// ── Grid Detail Barang ────────────────────────────────────────────────
const ensureEmptyRow = () => {
  const last = fd.value.Detail[fd.value.Detail.length - 1];
  if (!last || last.Kode) {
    fd.value.Detail.push({
      _key: _key++,
      Kode: "",
      Nama: "",
      Ukuran: "",
      JenisOrder: "",
      Jumlah: 0,
      Koli: 0,
      Keterangan: "",
    });
  }
};

const isLoadingBarang = ref(false);
const barangInputValues = ref<Record<number, string>>({});
const showBarangModal = ref(false);
const activeRowKey = ref<number | null>(null);

const addBarangByKode = async (kode: string, rowKey?: number) => {
  const dup = fd.value.Detail.find((r) => r.Kode === kode);
  if (dup) {
    toast.warning("Kode ini sudah di inputkan.");
    return;
  }

  isLoadingBarang.value = true;
  try {
    const res = await svc.loadBarangDetail(kode, fd.value.Divisi);
    const b = res.data.data;

    if (rowKey !== undefined) {
      const idx = fd.value.Detail.findIndex(
        (r) => r._key === rowKey && !r.Kode,
      );
      if (idx !== -1) fd.value.Detail.splice(idx, 1);
    }

    fd.value.Detail.push({
      _key: _key++,
      Kode: b.Kode,
      Nama: b.Nama,
      Ukuran: b.Ukuran,
      JenisOrder: b.JenisOrder,
      Jumlah: 0,
      Koli: 0,
      Keterangan: "",
    });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Barang Tidak di temukan");
  } finally {
    isLoadingBarang.value = false;
    ensureEmptyRow();
  }
};

const onBarangInputEnter = async (rowKey: number) => {
  const val = (barangInputValues.value[rowKey] || "").trim();
  if (!val) return;
  await addBarangByKode(val, rowKey);
  barangInputValues.value[rowKey] = "";
};

const openBarangModal = (rowKey?: number) => {
  if (!fd.value.KodePerush) {
    toast.warning("Perusahaan silahkan di isi dulu");
    return;
  }
  if (!fd.value.KodeCus) {
    toast.warning("Customer silahkan di isi dulu");
    return;
  }
  activeRowKey.value = rowKey ?? null;
  showBarangModal.value = true;
};

// fetchFn utk BarangInvProSearchModal — dua mode sesuai Delphi:
//  - InvPro kosong -> cari dari tbarang filter divisi
//  - InvPro terisi -> HANYA barang yg ada di invoice proforma tsb
const barangFetchFn = async (q: string, page: number, limit: number) => {
  const res = await svc.searchBarang({
    invPro: fd.value.InvPro,
    cusKode: fd.value.KodeCus,
    divisi: fd.value.Divisi,
    q,
    page,
    limit,
  });
  return res.data.data;
};

const selectBarang = async (item: any) => {
  showBarangModal.value = false;
  await addBarangByKode(item.Kode, activeRowKey.value ?? undefined);
  activeRowKey.value = null;
};

// Hapus baris — sesuai Delphi, TANPA konfirmasi
const removeRow = (row: DetailRow) => {
  if (!row.Kode) return;
  const idx = fd.value.Detail.indexOf(row);
  if (idx !== -1) fd.value.Detail.splice(idx, 1);
  ensureEmptyRow();
};

// ── Total — Delphi hitung() cuma dipanggil sekali sblm print, di sini
// dibuat reaktif (peningkatan UX, tidak ada risiko fungsional) ────────
const totalJumlah = computed(() =>
  fd.value.Detail.reduce((s, r) => s + Number(r.Jumlah || 0), 0),
);

// ── Validasi — sesuai Delphi VK_F10 (TIDAK ada tutup buku/kurang/PIN5)
const validateSave = () => {
  if (!fd.value.NomorSJ) {
    toast.warning("Nomor SJ wajib diisi.");
    return;
  }
  if (!fd.value.NamaPerush) {
    toast.warning("Perusahaan belum di isi");
    return;
  }
  if (!fd.value.GudangKode) {
    toast.warning("Gudang tidak boleh kosong");
    return;
  }
  if (!fd.value.NamaCus) {
    toast.warning("Customer belum di isi");
    return;
  }

  const valid = fd.value.Detail.filter((r) => r.Kode);
  if (!valid.length) {
    toast.warning("Surat Jalan tidak ada detail,tidak dapat di simpan");
    return;
  }

  showSaveDialog.value = true;
};

// ── Print ─────────────────────────────────────────────────────────────
const skipPrint = () => {
  showPrintDialog.value = false;
  router.push({ name: "SjTakNormalBrowse" });
};
const doCetak = () => {
  const url = router.resolve({
    name: "SjTakNormalPrint",
    query: { nomor: savedNomor.value },
  }).href;
  window.open(url, "_blank");
  showPrintDialog.value = false;
  router.push({ name: "SjTakNormalBrowse" });
};

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  const divRes = await svc.getDivisiList();
  divisiList.value = divRes.data.data || [];

  const nomorEdit = route.query.nomor as string;
  if (nomorEdit) {
    fd.value.NomorSJ = nomorEdit;
    nomorLocked.value = true;
    isLoadingCheck.value = true;
    try {
      const res = await svc.checkNomor(nomorEdit);
      const d = res.data.data;
      if (d.exists) {
        applyExistingData(d.header, d.detail);
        isExistingRecord.value = true;
      } else {
        toast.warning("Nomor tersebut belum ada, dianggap sebagai baru.");
        isExistingRecord.value = false;
      }
    } catch {
      toast.error("Gagal memuat data.");
    } finally {
      isLoadingCheck.value = false;
    }
    ensureEmptyRow();
  } else {
    fd.value.Tanggal = todayLocal();
    if (divisiList.value.length) {
      fd.value.Divisi = String(divisiList.value[0].kode);
      const g = defaultGudangByDivisi(String(divisiList.value[0].kode));
      fd.value.GudangKode = g.kode;
      fd.value.GudangNama = g.nama;
    }
    ensureEmptyRow();
  }
  isLoadingForm.value = false;
});
</script>

<template>
  <BaseForm
    :title="
      isExistingRecord
        ? 'Ubah Surat Jalan Tak Normal'
        : 'Tambah Surat Jalan Tak Normal'
    "
    menu-id="154"
    :icon="IconTruckOff"
    :is-loading="isLoadingForm"
    :is-saving="isSaving"
    item-name="Surat Jalan Tak Normal"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section">
        <div class="sec-title">Header</div>

        <div class="fg">
          <label class="lb w90">Divisi</label>
          <select
            v-model="fd.Divisi"
            class="inp sel"
            :disabled="isExistingRecord"
            style="flex: 1"
          >
            <option
              v-for="d in divisiList"
              :key="d.kode"
              :value="String(d.kode)"
            >
              {{ d.kode }} - {{ d.nama }}
            </option>
          </select>
        </div>

        <div class="fg mt4">
          <label class="lb w90">Nomor</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.NomorSJ"
              class="inp"
              style="flex: 1; text-transform: uppercase"
              :readonly="nomorLocked"
              placeholder="Ketik nomor SJ..."
              @keydown.enter.prevent="
                ($event.target as HTMLInputElement).blur()
              "
              @blur="onNomorBlur"
            />
          </div>
        </div>
        <div v-if="!nomorLocked" class="note-red-row">
          &lt;--- Isikan nomor dulu, lalu Enter / klik di luar kolom
        </div>

        <template v-if="nomorLocked">
          <div class="fg mt4">
            <label class="lb w90">Perusahaan</label>
            <div class="ig" style="flex: 1">
              <input
                v-model="fd.KodePerush"
                class="inp"
                style="
                  width: 46px;
                  flex-shrink: 0;
                  text-transform: uppercase;
                  padding: 0 3px;
                "
                placeholder="Kode"
                :readonly="isExistingRecord"
                @keydown.enter.prevent="onPerushEnter"
                @keydown.f1.prevent="showPerushModal = true"
                @blur="onPerushEnter"
              />
              <input
                :value="fd.NamaPerush"
                readonly
                class="inp ro"
                style="flex: 1"
                placeholder="Nama perusahaan..."
                tabindex="-1"
              />
              <button
                class="ibtn"
                :disabled="isExistingRecord"
                @click="showPerushModal = true"
              >
                <IconSearch :size="11" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="fg mt4">
            <label class="lb w90">Tanggal</label>
            <input
              type="date"
              v-model="fd.Tanggal"
              class="inp"
              style="flex: 1"
            />
          </div>

          <div class="fg mt4">
            <label class="lb w90">Gudang</label>
            <div class="ig" style="flex: 1">
              <input
                v-model="fd.GudangKode"
                class="inp"
                style="width: 65px; flex-shrink: 0; text-transform: uppercase"
                placeholder="Kode"
                readonly
              />
              <input
                :value="fd.GudangNama"
                readonly
                class="inp ro"
                style="flex: 1"
                placeholder="Nama gudang..."
                tabindex="-1"
              />
              <button class="ibtn" @click="showGudangModal = true">
                <IconSearch :size="11" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="fg mt4">
            <label class="lb w90">Inv. Proforma</label>
            <div class="ig" style="flex: 1">
              <input
                v-model="fd.InvPro"
                class="inp"
                style="flex: 1; text-transform: uppercase"
                placeholder="Ketik nomor / F1 cari..."
                @keydown.f1.prevent="showInvProModal = true"
              />
              <button class="ibtn" @click="showInvProModal = true">
                <IconSearch :size="11" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="fg mt4">
            <label class="lb w90">Keterangan</label>
            <input
              v-model="fd.Keterangan"
              class="inp"
              style="flex: 1"
              placeholder="Keterangan..."
            />
          </div>
        </template>
      </div>

      <!-- Customer -->
      <div v-if="nomorLocked" class="desktop-form-section">
        <div class="sec-title">Customer</div>

        <div class="fg">
          <label class="lb w90">Customer</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.KodeCus"
              class="inp"
              style="
                width: 46px;
                flex-shrink: 0;
                text-transform: uppercase;
                padding: 0 3px;
              "
              placeholder="Kode"
              @keydown.enter.prevent="onCusBlur"
              @keydown.f1.prevent="showCusModal = true"
              @blur="onCusBlur"
            />
            <input
              :value="fd.NamaCus"
              readonly
              class="inp ro"
              style="flex: 1"
              placeholder="Nama customer..."
              tabindex="-1"
            />
            <button class="ibtn" @click="showCusModal = true">
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="fg mt4">
          <label class="lb w90">Alamat</label>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 3px">
            <input
              v-model="fd.AlamatCus"
              class="inp"
              placeholder="Alamat pengiriman..."
            />
            <input v-model="fd.KotaCus" class="inp" placeholder="Kota..." />
          </div>
        </div>
      </div>

      <!-- Ringkasan -->
      <div v-if="nomorLocked" class="desktop-form-section">
        <div class="sec-title">Ringkasan</div>
        <div class="rk-row">
          <span class="rk-lbl">Total Jumlah</span>
          <span class="rk-val rk-bold rk-primary">{{ num(totalJumlah) }}</span>
        </div>
      </div>
    </template>

    <template #right-column>
      <div
        v-if="nomorLocked"
        class="desktop-form-section"
        style="flex: 1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="dtbar">
          <span class="sec-title">Detail Barang</span>
          <span class="note ml8">Enter/F1 = pilih barang</span>
          <button
            class="tbtn tbtn-green"
            style="margin-left: auto"
            @click="openBarangModal()"
          >
            + Barang (F1)
          </button>
        </div>

        <div
          style="
            position: relative;
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
          "
        >
          <div v-if="isLoadingBarang" class="grid-loading-overlay">
            <v-progress-circular
              indeterminate
              color="primary"
              size="24"
              width="2"
            />
            <span>Memuat data barang...</span>
          </div>

          <div class="gwrap">
            <table class="gtbl">
              <thead>
                <tr>
                  <th style="width: 24px">#</th>
                  <th style="width: 130px">Kode</th>
                  <th style="min-width: 160px">Nama</th>
                  <th style="width: 90px">Ukuran</th>
                  <th style="width: 90px">Jenis Order</th>
                  <th style="width: 80px" class="tr hl-col">Jumlah</th>
                  <th style="width: 72px" class="tr hl-col">Koli</th>
                  <th style="min-width: 120px">Keterangan</th>
                  <th style="width: 30px"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in fd.Detail"
                  :key="row._key"
                  :class="[
                    i % 2 === 1 && row.Kode ? 'rs' : '',
                    !row.Kode ? 'row-empty' : '',
                  ]"
                >
                  <td class="tc muted" style="font-size: 10px">
                    {{ row.Kode ? Number(i) + 1 : "" }}
                  </td>
                  <td>
                    <template v-if="!row.Kode">
                      <div style="display: flex; align-items: center; gap: 2px">
                        <input
                          v-model="barangInputValues[row._key]"
                          class="ci mono"
                          placeholder="Ketik kode/Enter, F1=Cari"
                          style="flex: 1; font-size: 10px"
                          @keydown.enter.prevent="onBarangInputEnter(row._key)"
                          @keydown.f1.prevent="openBarangModal(row._key)"
                        />
                        <button
                          class="ibtn-sm"
                          tabindex="-1"
                          @click.stop="openBarangModal(row._key)"
                        >
                          <IconSearch :size="9" color="#1565c0" />
                        </button>
                      </div>
                    </template>
                    <input v-else :value="row.Kode" readonly class="ci mono" />
                  </td>
                  <td><input :value="row.Nama" readonly class="ci" /></td>
                  <td><input :value="row.Ukuran" readonly class="ci" /></td>
                  <td>
                    <input :value="row.JenisOrder" readonly class="ci" />
                  </td>
                  <td>
                    <input
                      v-if="row.Kode"
                      v-model.number="row.Jumlah"
                      type="number"
                      class="ci tr hl"
                      @focus="sel"
                    />
                  </td>
                  <td>
                    <input
                      v-if="row.Kode"
                      v-model.number="row.Koli"
                      type="number"
                      class="ci tr hl"
                      @focus="sel"
                    />
                  </td>
                  <td>
                    <input
                      v-if="row.Kode"
                      v-model="row.Keterangan"
                      class="ci"
                    />
                  </td>
                  <td class="tc">
                    <button
                      v-if="row.Kode"
                      class="del-btn"
                      @click="removeRow(row)"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid-summary">
            <span
              >Total Jumlah: <b>{{ num(totalJumlah) }}</b></span
            >
          </div>
        </div>
      </div>

      <div v-else class="empty-hint">
        <IconAlertTriangle :size="28" style="opacity: 0.4" />
        <p>Isikan Nomor SJ terlebih dahulu di kolom sebelah kiri.</p>
      </div>
    </template>
  </BaseForm>

  <!-- ── Modals ── -->
  <PerusahaanSearchModal v-model="showPerushModal" @selected="selectPerush" />
  <CustomerSearchModal v-model="showCusModal" @selected="onCustomerSelect" />
  <GudangJadiSearchModal
    v-model="showGudangModal"
    :divisi="Number(fd.Divisi)"
    @selected="selectGudang"
  />
  <InvProformaSearchModal
    v-model="showInvProModal"
    :cus-kode="fd.KodeCus"
    @selected="selectInvPro"
  />
  <BarangInvProSearchModal
    v-model="showBarangModal"
    :fetch-fn="barangFetchFn"
    @selected="selectBarang"
  />

  <!-- Dialog Konfirmasi Mismatch Customer -->
  <v-dialog v-model="showCustomerMismatchDialog" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-warning text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Customer Berubah
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Customer berubah, Yakin ingin Lanjut?<br /><br />
        Detail barang yang sudah diisi akan dihapus.
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="cancelCustomerMismatch"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="warning"
          @click="confirmCustomerMismatch"
          >Ya, Lanjutkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Print -->
  <v-dialog v-model="showPrintDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak Surat Jalan Tak Normal
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Data <b>{{ savedNomor }}</b> berhasil disimpan.<br />Ingin mencetak?
      </v-card-text>
      <v-card-actions class="pa-3 border-t" style="gap: 6px">
        <v-btn variant="text" size="small" @click="skipPrint">Tidak</v-btn>
        <v-spacer />
        <v-btn variant="flat" size="small" color="primary" @click="doCetak">
          🖨️ Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.fg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mt4 {
  margin-top: 4px;
}
.ml8 {
  margin-left: 8px;
}
.lb {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.w90 {
  width: 90px;
  flex-shrink: 0;
}
.note {
  font-size: 10px;
  color: #777;
}
.note-red-row {
  font-size: 11px;
  color: #c62828;
  font-weight: 600;
  margin: 3px 0 0 96px;
}
.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.muted {
  color: #9e9e9e;
}
.mono {
  font-family: monospace;
}

.sec-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 3px;
}
.inp {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  font-family: inherit;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.sel {
  height: 24px;
  font-size: 12px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  outline: none;
  padding: 0 4px;
}
.ig {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  height: 24px;
  background: white;
  overflow: hidden;
}
.ig .inp {
  border: none;
  height: 22px;
  border-radius: 0;
  flex: 1;
  min-width: 0;
}
.ibtn {
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
}
.ibtn:hover {
  background: #bbdefb;
}
.ibtn-sm {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 2px;
  cursor: pointer;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.rk-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 22px;
}
.rk-lbl {
  font-size: 11px;
  color: #444;
  font-weight: 500;
}
.rk-val {
  font-size: 12px;
  color: #333;
  font-weight: 600;
}
.rk-bold {
  font-weight: 700;
}
.rk-primary {
  color: #1565c0;
  font-size: 13px;
}

.dtbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-shrink: 0;
}
.gwrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  min-height: 0;
}
.gtbl {
  border-collapse: collapse;
  font-size: 11px;
  min-width: max-content;
  width: 100%;
}
.gtbl th {
  background: #1565c0;
  color: white;
  padding: 3px 4px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.gtbl td {
  padding: 2px 2px;
  border-bottom: 0.3px solid #e0e0e0;
  vertical-align: middle;
}
.rs td {
  background: #fafafa;
}
.row-empty td {
  background: #fafffe !important;
}
.row-empty:hover td {
  background: #e8f5e9 !important;
}
.hl-col {
  background: #0d47a1 !important;
}

.ci {
  width: 100%;
  height: 22px;
  border: none;
  outline: none;
  padding: 0 3px;
  font-size: 11px;
  background: transparent;
  font-family: inherit;
}
.ci:focus {
  background: #fffde7;
  outline: 1px solid #1565c0;
  border-radius: 2px;
}
.ci[readonly] {
  color: #666;
  background: transparent;
}
.ci.tr {
  text-align: right;
}
.ci.hl {
  background: #fffde7 !important;
}

.del-btn {
  width: 18px;
  height: 18px;
  border: 1px solid #ffcdd2;
  border-radius: 2px;
  background: #ffebee;
  color: #c62828;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.del-btn:hover {
  background: #ffcdd2;
}

.grid-summary {
  background: #1565c0;
  color: white;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.grid-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #1565c0;
  font-weight: 600;
  border-radius: 3px;
}

.tbtn {
  height: 24px;
  padding: 0 8px;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.tbtn-green {
  background: #388e3c;
  color: white;
}

.empty-hint {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #9e9e9e;
  font-size: 12px;
  text-align: center;
  padding: 40px;
}
</style>
