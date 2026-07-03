<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { praSjFormService as svc } from "@/services/penjualan/praSuratJalanFormService";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import GudangJadiSearchModal from "@/components/lookups/GudangJadiSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import {
  IconFileDots,
  IconSearch,
  IconMapPin,
  IconAlertTriangle,
} from "@tabler/icons-vue";

// ── Types ───────────────────────────────────────────────────────────────
interface DetailRow {
  _key: number;
  Kode: string;
  Nama: string;
  Ukuran: string;
  Jumlah: number;
  Koli: number;
  Pra: number;
  Sudah: number;
  Kurang: number;
  Keterangan: string;
}

interface FormData {
  NomorPra: string;
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
  NomorSJ: string;
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

// ── Default Gudang per divisi — sesuai Delphi cbDivisiChange ─────────────
const defaultGudangByDivisi = (divisiStr: string) => {
  if (divisiStr === "1") return { kode: "WH002", nama: "GUDANG JADI P2" };
  if (divisiStr === "5") return { kode: "WH-010", nama: "GUDANG JADI MMT" };
  return { kode: "GJ001", nama: "GUDANG BARANG JADI JERON" };
};

const initDivisi = "1";
const initGudang = defaultGudangByDivisi(initDivisi);

const init: FormData = {
  NomorPra: "",
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
  NomorSJ: "",
  Detail: [],
};

// ── useForm ──────────────────────────────────────────────────────────────
const {
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<FormData>({
  menuId: "168",
  initialData: init,
  immediate: false,

  fetchApi: async (): Promise<FormData> => {
    const praSjEdit = route.query.praSj as string;
    const res = await svc.getById(praSjEdit);
    const d = res.data.data;
    const h = d.header;
    return {
      NomorPra: h.sj_pra || "",
      Divisi: String(h.sj_divisi || initDivisi),
      Tanggal: h.sj_tanggal || todayLocal(),
      KodePerush: h.sj_perush_kode || "",
      NamaPerush: h.perush_nama || "",
      KodeCus: h.sj_cus_kode || "",
      NamaCus: h.cus_nama || "",
      AlamatCus: h.sj_alamat_customer || h.cus_alamat || "",
      KotaCus: h.sj_kota_customer || h.cus_kota || "",
      GudangKode: h.sj_gdg_kode || "",
      GudangNama: h.gdg_nama || "",
      Keterangan: h.sj_keterangan || "",
      NomorSJ: h.sj_sj || "",
      Detail: (d.detail || []).map((r: any) => ({
        _key: _key++,
        Kode: r.sjd_spk_nomor || "",
        Nama: r.nama_barang || "",
        Ukuran: r.sjd_ukuran || "",
        Jumlah: Number(r.sjd_jumlah) || 0,
        Koli: Number(r.sjd_koli) || 0,
        Pra: Number(r.pra) || 0,
        Sudah: Number(r.sudah) || 0,
        Kurang: Number(r.kurang) || 0,
        Keterangan: r.sjd_keterangan || "",
      })),
    };
  },

  submitApi: async (data): Promise<any> => {
    const payload = {
      ...data,
      NomorPra: route.query.praSj || data.NomorPra,
      Detail: data.Detail.filter((r) => r.Nama && Number(r.Jumlah) !== 0).map(
        ({ _key: _k, ...r }) => r,
      ),
    };
    return isEditMode.value ? svc.update(payload) : svc.save(payload);
  },

  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    toast.success(`Data ${nomor} berhasil disimpan.`);
    router.push({ name: "PraSJBrowse" });
  },
});

const fd = formData;
const divisiStr = computed(() => String(fd.value.Divisi).charAt(0));

// ── Watch divisi → update default gudang (hanya saat create) ────────────
watch(
  () => fd.value.Divisi,
  (val) => {
    if (!isEditMode.value) {
      const g = defaultGudangByDivisi(String(val).charAt(0));
      fd.value.GudangKode = g.kode;
      fd.value.GudangNama = g.nama;
    }
  },
);

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

// ── Customer — dengan konfirmasi ganti kalau detail sudah ada ──────────
const showCusModal = ref(false);
const showCustomerChangeDialog = ref(false);
const pendingCustomerItem = ref<any>(null);

const applyCustomer = (item: any) => {
  fd.value.KodeCus = item.Kode || item.cus_kode || "";
  fd.value.NamaCus = item.Nama || item.cus_nama || "";
  fd.value.AlamatCus = item.Alamat || item.cus_alamat || "";
  fd.value.KotaCus = item.Kota || item.cus_kota || "";
};

const onCusEnter = async () => {
  const kode = fd.value.KodeCus.trim();
  if (!kode) return;
  const adaDetail = fd.value.Detail.some((r) => r.Nama);
  try {
    const res = await svc.getCustomerInfo(kode);
    const c = res.data.data;
    if (adaDetail) {
      pendingCustomerItem.value = c;
      showCustomerChangeDialog.value = true;
      return;
    }
    applyCustomer(c);
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || `Customer "${kode}" tidak ditemukan.`,
    );
    fd.value.KodeCus = "";
    fd.value.NamaCus = "";
  }
};

const onCustomerSelect = async (item: any) => {
  const kode = item.Kode || item.cus_kode || "";
  const adaDetail = fd.value.Detail.some((r) => r.Nama);
  if (adaDetail) {
    try {
      const res = await svc.getCustomerInfo(kode);
      pendingCustomerItem.value = res.data.data;
      showCustomerChangeDialog.value = true;
      showCusModal.value = false;
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Customer tidak ditemukan.");
    }
    return;
  }
  try {
    const res = await svc.getCustomerInfo(kode);
    applyCustomer(res.data.data);
    showCusModal.value = false;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Customer tidak ditemukan.");
  }
};

const confirmCustomerChange = () => {
  if (pendingCustomerItem.value) {
    applyCustomer(pendingCustomerItem.value);
    fd.value.Detail = [];
    ensureEmptyRow();
  }
  showCustomerChangeDialog.value = false;
  pendingCustomerItem.value = null;
};
const cancelCustomerChange = () => {
  showCustomerChangeDialog.value = false;
  pendingCustomerItem.value = null;
};

// ── Alokasi History ──────────────────────────────────────────────────
const showAlokasiModal = ref(false);
const alokasiList = ref<any[]>([]);
const isLoadingAlokasi = ref(false);

const openAlokasiHistory = async () => {
  if (!fd.value.KodeCus) {
    toast.warning("Customer diisi dulu.");
    return;
  }
  showAlokasiModal.value = true;
  isLoadingAlokasi.value = true;
  try {
    const res = await svc.getAlokasiHistory(fd.value.KodeCus);
    alokasiList.value = res.data.data || [];
  } catch {
    toast.error("Gagal memuat alokasi history.");
  } finally {
    isLoadingAlokasi.value = false;
  }
};

const selectAlokasi = (item: any) => {
  fd.value.AlamatCus = item.Alamat || "";
  fd.value.KotaCus = item.Kota || "";
  showAlokasiModal.value = false;
};

// ── Grid Detail (SO) ──────────────────────────────────────────────────
const ensureEmptyRow = () => {
  const last = fd.value.Detail[fd.value.Detail.length - 1];
  if (!last || last.Kode) {
    fd.value.Detail.push({
      _key: _key++,
      Kode: "",
      Nama: "",
      Ukuran: "",
      Jumlah: 0,
      Koli: 0,
      Pra: 0,
      Sudah: 0,
      Kurang: 0,
      Keterangan: "",
    });
  }
};

const isLoadingSo = ref(false);
const soInputValues = ref<Record<number, string>>({});
const activeRowKey = ref<number | null>(null);
const showSoModal = ref(false);

const addSoToGrid = async (soNomor: string) => {
  if (!fd.value.KodePerush) {
    toast.warning("Perusahaan silahkan di isi dulu");
    return;
  }
  if (!fd.value.KodeCus) {
    toast.warning("Customer silahkan di isi dulu");
    return;
  }

  isLoadingSo.value = true;
  try {
    const existingRows = fd.value.Detail.filter((r) => r.Kode).map((r) => ({
      Kode: r.Kode,
      Ukuran: r.Ukuran,
    }));
    const res = await svc.getDetailSo({
      soNomor,
      cusKode: fd.value.KodeCus,
      divisi: divisiStr.value,
      currentPraSj: fd.value.NomorPra,
      existingRows,
    });
    const rows: any[] = res.data.data || [];
    for (const r of rows) {
      fd.value.Detail.push({ ...r, _key: _key++ });
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "SO Tidak ditemukan.");
  } finally {
    isLoadingSo.value = false;
    ensureEmptyRow();
  }
};

const onSoInputEnter = async (rowKey: number) => {
  const val = (soInputValues.value[rowKey] || "").trim();
  if (!val) return;

  const idx = fd.value.Detail.findIndex((r) => r._key === rowKey && !r.Kode);
  if (idx !== -1) fd.value.Detail.splice(idx, 1);

  await addSoToGrid(val);
  soInputValues.value[rowKey] = "";
};

const openSoModal = (rowKey?: number) => {
  if (!fd.value.KodePerush) {
    toast.warning("Perusahaan silahkan di isi dulu");
    return;
  }
  if (!fd.value.KodeCus) {
    toast.warning("Customer silahkan di isi dulu");
    return;
  }
  activeRowKey.value = rowKey ?? null;
  showSoModal.value = true;
};

const selectSo = async (item: any) => {
  showSoModal.value = false;
  if (activeRowKey.value !== null) {
    const idx = fd.value.Detail.findIndex(
      (r) => r._key === activeRowKey.value && !r.Kode,
    );
    if (idx !== -1) fd.value.Detail.splice(idx, 1);
    activeRowKey.value = null;
  }
  await addSoToGrid(item.Nomor);
};

// Delete baris — sesuai Delphi cxGrdMasterKeyUp, PAKAI konfirmasi
const showDeleteRowDialog = ref(false);
const pendingDeleteRow = ref<DetailRow | null>(null);

const requestRemoveRow = (row: DetailRow) => {
  if (!row.Kode) return;
  pendingDeleteRow.value = row;
  showDeleteRowDialog.value = true;
};
const confirmRemoveRow = () => {
  if (pendingDeleteRow.value) {
    const idx = fd.value.Detail.indexOf(pendingDeleteRow.value);
    if (idx !== -1) fd.value.Detail.splice(idx, 1);
    ensureEmptyRow();
  }
  showDeleteRowDialog.value = false;
  pendingDeleteRow.value = null;
};

// ── Computed ─────────────────────────────────────────────────────────────
const totalJumlah = computed(() =>
  fd.value.Detail.reduce((s, r) => s + Number(r.Jumlah || 0), 0),
);

// ── Validasi — sesuai Delphi VK_F10 (TIDAK ada tutup buku/PIN5) ──────────
const validateSave = () => {
  if (fd.value.NomorSJ) {
    toast.error("Sudah jadi Surat jalan.\nTidak bisa diUbah.");
    return;
  }
  if (!fd.value.NamaPerush) {
    toast.warning("Perusahaan belum di isi.");
    return;
  }
  if (!fd.value.GudangKode) {
    toast.warning("Gudang tidak boleh kosong.");
    return;
  }
  if (!fd.value.NamaCus) {
    toast.warning("Customer belum di isi.");
    return;
  }

  const valid = fd.value.Detail.filter((r) => r.Nama && Number(r.Jumlah) !== 0);
  if (!valid.length) {
    toast.warning("Detail harus diisi.");
    return;
  }

  for (const r of valid) {
    if (Number(r.Jumlah) > Number(r.Kurang)) {
      toast.warning(
        `Jumlah tidak boleh melebihi kekurangannya (SO ${r.Kode}).`,
      );
      return;
    }
  }

  if (totalJumlah.value === 0) {
    toast.warning("Jumlah SJ masih kosong semua.");
    return;
  }

  showSaveDialog.value = true;
};

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  const divRes = await svc.getDivisiList();
  divisiList.value = divRes.data.data || [];

  if (route.query.praSj) {
    await fetchData();
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
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Pra Surat Jalan' : 'Tambah Pra Surat Jalan'"
    menu-id="168"
    :icon="IconFileDots"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Pra Surat Jalan"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div v-if="fd.NomorSJ" class="sudah-sj-banner">
        <IconAlertTriangle :size="14" />
        Pra SJ ini sudah dikonversi jadi Surat Jalan
        <b>{{ fd.NomorSJ }}</b> — tidak bisa diubah.
      </div>

      <div class="desktop-form-section">
        <div class="sec-title">Header</div>

        <div class="fg">
          <label class="lb w90">Divisi</label>
          <select
            v-model="fd.Divisi"
            class="inp sel"
            :disabled="isEditMode"
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
          <label class="lb w90">Nomor Pra SJ</label>
          <input
            :value="fd.NomorPra || '(Otomatis)'"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>

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
              :readonly="isEditMode"
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
              :disabled="isEditMode"
              @click="showPerushModal = true"
            >
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="fg mt4">
          <label class="lb w90">Tanggal</label>
          <input type="date" v-model="fd.Tanggal" class="inp" style="flex: 1" />
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
          <label class="lb w90">Keterangan</label>
          <input
            v-model="fd.Keterangan"
            class="inp"
            style="flex: 1"
            placeholder="Keterangan..."
          />
        </div>
      </div>

      <!-- Customer -->
      <div class="desktop-form-section">
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
              @keydown.enter.prevent="onCusEnter"
              @keydown.f1.prevent="showCusModal = true"
              @blur="onCusEnter"
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

        <div class="fg mt6">
          <button class="abtn" @click="openAlokasiHistory">
            <IconMapPin :size="11" style="margin-right: 3px" /> Alokasi
          </button>
        </div>
      </div>

      <!-- Ringkasan -->
      <div class="desktop-form-section">
        <div class="sec-title">Ringkasan</div>
        <div class="rk-row">
          <span class="rk-lbl">Total Jumlah</span>
          <span class="rk-val rk-bold rk-primary">{{ num(totalJumlah) }}</span>
        </div>
      </div>
    </template>

    <template #right-column>
      <div
        class="desktop-form-section"
        style="flex: 1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="dtbar">
          <span class="sec-title">Detail SO</span>
          <span class="note ml8">Enter/F1 = pilih SO</span>
          <button
            class="tbtn tbtn-green"
            style="margin-left: auto"
            @click="openSoModal()"
          >
            + SO (F1)
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
          <div v-if="isLoadingSo" class="grid-loading-overlay">
            <v-progress-circular
              indeterminate
              color="primary"
              size="24"
              width="2"
            />
            <span>Memuat data SO...</span>
          </div>

          <div class="gwrap">
            <table class="gtbl">
              <thead>
                <tr>
                  <th style="width: 24px">#</th>
                  <th style="width: 130px">No. SO</th>
                  <th style="min-width: 160px">Nama SO</th>
                  <th style="width: 90px">Ukuran</th>
                  <th style="width: 80px" class="tr hl-col">Jumlah</th>
                  <th style="width: 72px" class="tr hl-col">Koli</th>
                  <th style="width: 80px" class="tr">Sudah PraSJ</th>
                  <th style="width: 80px" class="tr">Sudah SJ</th>
                  <th style="width: 80px" class="tr">Kurang</th>
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
                    row.Kode && Number(row.Jumlah) > Number(row.Kurang)
                      ? 'row-over'
                      : '',
                  ]"
                >
                  <td class="tc muted" style="font-size: 10px">
                    {{ row.Kode ? i + 1 : "" }}
                  </td>
                  <td>
                    <template v-if="!row.Kode">
                      <div style="display: flex; align-items: center; gap: 2px">
                        <input
                          v-model="soInputValues[row._key]"
                          class="ci mono"
                          placeholder="Ketik SO/Enter, F1=Cari"
                          style="flex: 1; font-size: 10px"
                          @keydown.enter.prevent="onSoInputEnter(row._key)"
                          @keydown.f1.prevent="openSoModal(row._key)"
                        />
                        <button
                          class="ibtn-sm"
                          tabindex="-1"
                          @click.stop="openSoModal(row._key)"
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
                      :value="row.Kode ? num(row.Pra) : ''"
                      readonly
                      class="ci tr ro"
                    />
                  </td>
                  <td>
                    <input
                      :value="row.Kode ? num(row.Sudah) : ''"
                      readonly
                      class="ci tr ro"
                    />
                  </td>
                  <td>
                    <input
                      v-if="row.Kode"
                      :value="num(row.Kurang)"
                      readonly
                      class="ci tr ro"
                      :style="
                        Number(row.Kurang) < 0
                          ? 'color:#c62828;font-weight:700'
                          : ''
                      "
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
                      @click="requestRemoveRow(row)"
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
    </template>
  </BaseForm>

  <!-- ── Modals ── -->
  <PerusahaanSearchModal v-model="showPerushModal" @selected="selectPerush" />
  <CustomerSearchModal v-model="showCusModal" @selected="onCustomerSelect" />
  <GudangJadiSearchModal
    v-model="showGudangModal"
    :divisi="Number(divisiStr)"
    @selected="selectGudang"
  />
  <SpkSearchModal
    v-model="showSoModal"
    filter-mode="sj"
    :cus-kode="fd.KodeCus"
    :perush-kode="fd.KodePerush"
    :divisi="fd.Divisi"
    @selected="selectSo"
  />

  <!-- Modal Alokasi History -->
  <v-dialog v-model="showAlokasiModal" max-width="540px">
    <div class="lookup-card">
      <div class="lookup-header">
        <IconMapPin :size="14" />
        Alokasi History — {{ fd.NamaCus || fd.KodeCus }}
        <v-spacer />
        <button class="lookup-close" @click="showAlokasiModal = false">
          ✕
        </button>
      </div>
      <div v-if="isLoadingAlokasi" class="alokasi-loading">
        <v-progress-circular
          indeterminate
          color="primary"
          size="28"
          width="3"
        />
        <span>Memuat history alokasi...</span>
      </div>
      <template v-else>
        <div class="lookup-table-wrap">
          <div v-if="!alokasiList.length" class="lookup-state">
            Tidak ada history alamat untuk customer ini
          </div>
          <table v-else class="lookup-table">
            <thead>
              <tr>
                <th style="width: 130px">Kota</th>
                <th>Alamat</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(a, i) in alokasiList"
                :key="i"
                class="lookup-row"
                @click="selectAlokasi(a)"
              >
                <td style="font-weight: 600; color: #1565c0">{{ a.Kota }}</td>
                <td>{{ a.Alamat }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </v-dialog>

  <!-- Dialog Konfirmasi Ganti Customer -->
  <v-dialog v-model="showCustomerChangeDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-warning text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Konfirmasi Ganti Customer
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Detail sudah ada.<br />
        Mengganti customer ke
        <b>{{ pendingCustomerItem?.cus_nama }}</b>
        akan menghapus semua detail yang sudah diisi.<br /><br />
        Yakin ingin melanjutkan?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="cancelCustomerChange"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="warning"
          @click="confirmCustomerChange"
        >
          Ya, Ganti Customer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Konfirmasi Hapus Baris -->
  <v-dialog v-model="showDeleteRowDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-error text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Konfirmasi
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Delete Record?<br />
        <b>{{ pendingDeleteRow?.Kode }}</b>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showDeleteRowDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="error"
          @click="confirmRemoveRow"
          >Ya, Hapus</v-btn
        >
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
.mt6 {
  margin-top: 6px;
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

.sudah-sj-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffebee;
  color: #c62828;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 6px;
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

.abtn {
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #90caf9;
  border-radius: 3px;
  background: #e3f2fd;
  color: #1565c0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.abtn:hover {
  background: #bbdefb;
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
.row-over td {
  background: #fff3e0 !important;
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

.lookup-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  max-height: 80vh;
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  gap: 6px;
  flex-shrink: 0;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
  padding: 0;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 120px;
}
.lookup-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  color: #9e9e9e;
  font-size: 12px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead tr {
  position: sticky;
  top: 0;
  background: #1565c0;
  z-index: 1;
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: left;
  white-space: nowrap;
}
.lookup-table td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover td {
  background: #e3f2fd;
}

.alokasi-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #1565c0;
  font-size: 12px;
  font-weight: 600;
  min-height: 160px;
}
</style>
