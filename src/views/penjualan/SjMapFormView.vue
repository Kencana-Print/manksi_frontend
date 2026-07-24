<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import {
  IconTruckDelivery,
  IconShieldCheck,
  IconPrinter,
  IconSearch,
} from "@tabler/icons-vue";

import MapSearchModal from "@/components/lookups/MapSearchModal.vue";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";

interface SjHeader {
  sj_nomor: string;
  sj_tanggal: string;
  sj_divisi: string;
  sj_perush_kode: string;
  perush_nama: string;
  sj_cus_kode: string;
  cus_nama: string;
  sj_alamat_customer: string;
  sj_kota_customer: string;
  sj_up: string;
  sj_keterangan: string;
}

interface SjDetail {
  kode: string;
  nama: string;
  ukuran: string;
  bahan: string;
  jumlah: number;
  jumlah_kirim: number;
  kurang: number;
}

interface SjForm {
  header: SjHeader;
  details: SjDetail[];
  pinStatus: any;
}

type RouteParams = {
  nomor?: string;
};

const toast = useToast();

const onCusKodeEnter = async () => {
  const kode = (formData.value.header.sj_cus_kode || "").trim();
  if (!kode) {
    formData.value.header.cus_nama = "";
    return;
  }
  try {
    const res = await api.get("/lookups/customer", {
      params: { q: kode, limit: 1 },
    });
    const items = res.data.data.items || res.data.data || [];
    const exact = items.find(
      (c: any) =>
        (c.cus_kode || c.Kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (exact) {
      const aktif = exact.cus_aktif ?? exact.Aktif ?? 0;
      if (aktif === 1 || aktif === "1") {
        toast.warning("Status Customer Pasif.");
        formData.value.header.sj_cus_kode = "";
        formData.value.header.cus_nama = "";
        return;
      }
      formData.value.header.sj_cus_kode = exact.cus_kode || exact.Kode;
      formData.value.header.cus_nama = exact.cus_nama || exact.Nama;
      formData.value.header.sj_alamat_customer =
        exact.cus_alamat || exact.Alamat || "";
      formData.value.header.sj_kota_customer =
        exact.cus_kota || exact.Kota || "";

      if (formData.value.details.filter((d) => d.kode).length === 0) {
        formData.value.details = [
          {
            kode: "",
            nama: "",
            ukuran: "",
            bahan: "",
            jumlah: 0,
            jumlah_kirim: 0,
            kurang: 0,
          },
        ];
      }
    } else {
      toast.error("Kode customer tidak ditemukan.");
      formData.value.header.sj_cus_kode = "";
      formData.value.header.cus_nama = "";
    }
  } catch {
    toast.error("Gagal memvalidasi kode customer.");
  }
};

// ─────────────────────────────────────────────
// KEYBOARD HANDLERS: PERUSAHAAN
// ─────────────────────────────────────────────

const onPerushKodeEnter = async () => {
  const kode = (formData.value.header.sj_perush_kode || "")
    .trim()
    .toUpperCase();
  if (!kode) {
    showPerushModal.value = true;
    return;
  }

  try {
    isLoading.value = true;
    const res = await api.get(
      `/lookups/perusahaan/${encodeURIComponent(kode)}`,
    );
    const item = res.data.data;
    formData.value.header.sj_perush_kode = item.perush_kode;
    formData.value.header.perush_nama = item.perush_nama;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Kode perusahaan tidak ditemukan.",
    );
    formData.value.header.sj_perush_kode = "";
    formData.value.header.perush_nama = "";
  } finally {
    isLoading.value = false;
  }
};

// ─────────────────────────────────────────────
// KEYBOARD HANDLERS: MAP DI GRID
// ─────────────────────────────────────────────

const onMapKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    activeRowIdx.value = idx;
    showMapModal.value = true;
  }
};

const onMapEnter = async (idx: number) => {
  const nomor = (formData.value.details[idx]?.kode || "").trim().toUpperCase();
  if (!nomor) {
    activeRowIdx.value = idx;
    showMapModal.value = true;
    return;
  }

  if (!formData.value.header.sj_cus_kode) {
    return toast.warning("Pilih Customer terlebih dahulu.");
  }

  try {
    isLoading.value = true;
    const res = await api.get("/penjualan/sj-map/form/item-details", {
      params: {
        nomorMap: nomor,
        cusKode: formData.value.header.sj_cus_kode,
        divisi: formData.value.header.sj_divisi,
      },
    });
    const data = res.data.data;

    // Cek duplikat
    if (
      formData.value.details.some(
        (d: any, i: number) => d.kode === data.kode && i !== idx,
      )
    ) {
      toast.error("Nomor MAP ini sudah diinputkan.");
      formData.value.details[idx].kode = "";
      return;
    }

    formData.value.details[idx] = { ...data, jumlah: data.kurang };

    // Auto trailing row
    const last = formData.value.details[formData.value.details.length - 1];
    if (last && last.kode) {
      formData.value.details.push({
        kode: "",
        nama: "",
        ukuran: "",
        bahan: "",
        jumlah: 0,
        jumlah_kirim: 0,
        kurang: 0,
      });
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nomor MAP tidak ditemukan.");
    formData.value.details[idx].kode = "";
  } finally {
    isLoading.value = false;
  }
};

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";

  const d = new Date(value);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const initialData = {
  header: {
    sj_nomor: "",
    sj_tanggal: new Date().toISOString().substring(0, 10),
    sj_divisi: "1",
    sj_perush_kode: "",
    perush_nama: "",
    sj_cus_kode: "",
    cus_nama: "",
    sj_alamat_customer: "",
    sj_kota_customer: "",
    sj_up: "",
    sj_keterangan: "",
  },
  details: [],
  pinStatus: null,
};

// --- STATE SETELAH SIMPAN ---
const showPrintDialog = ref(false);
const lastSavedNomor = ref("");

const {
  isEditMode,
  isLoading,
  isSaving,
  formData,
  params,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
  goBack,
} = useForm<SjForm, RouteParams>({
  menuId: "163",
  initialData,
  fetchApi: async (): Promise<SjForm> => {
    const res: { data: { data: any } } = await api.get(
      `/penjualan/sj-map/form/${encodeURIComponent(params.nomor || "")}`,
    );

    const raw: any = res.data.data;

    const mappedDetails = (raw.details || []).map(
      (d: any): SjDetail => ({
        kode: d.SJD_MSPK_Nomor || d.sjd_mspk_nomor,
        nama: d.mspk_nama,
        ukuran: d.SJD_Ukuran || d.sjd_ukuran || "",
        bahan: d.mspk_kain,
        jumlah: Number(d.SJD_Jumlah || d.sjd_jumlah) || 0,
        jumlah_kirim: Number(d.jml_kirim_lama) || 0,
        kurang: Number(d.sisa_order) || 0,
      }),
    );

    // Tambah baris kosong di akhir untuk siap input baru
    mappedDetails.push({
      kode: "",
      nama: "",
      ukuran: "",
      bahan: "",
      jumlah: 0,
      jumlah_kirim: 0,
      kurang: 0,
    });

    return {
      header: {
        sj_nomor: raw.header.SJ_Nomor,
        sj_tanggal: formatDateLocal(raw.header.SJ_Tanggal),
        sj_divisi: String(raw.header.sj_divisi),
        sj_perush_kode: raw.header.SJ_Perush_kode,
        perush_nama: raw.header.perush_nama,
        sj_cus_kode: raw.header.SJ_cus_kode,
        cus_nama: raw.header.cus_nama,
        sj_alamat_customer:
          raw.header.sj_alamat_customer || raw.header.cus_alamat,
        sj_kota_customer: raw.header.sj_kota_customer || raw.header.cus_kota,
        sj_up: raw.header.sj_up,
        sj_keterangan: raw.header.SJ_Keterangan,
      },
      details: (raw.details || []).map(
        (d: any): SjDetail => ({
          kode: d.SJD_MSPK_Nomor,
          nama: d.mspk_nama,
          ukuran: d.SJD_Ukuran,
          bahan: d.mspk_kain,
          jumlah: Number(d.SJD_Jumlah || d.sjd_jumlah) || 0,
          jumlah_kirim: Number(d.jml_kirim_lama) || 0,
          kurang: Number(d.sisa_order) || 0,
        }),
      ),
      pinStatus: raw.pinStatus,
    };
  },
  submitApi: async (data: SjForm): Promise<unknown> => {
    return await api.post("/penjualan/sj-map/form", {
      header: data.header,
      details: data.details.filter((d) => d.kode), // ← buang baris kosong
      pinStatus: data.pinStatus,
      isEdit: isEditMode.value,
    });
  },
  onSuccess: (res: any) => {
    toast.success(res.data.message);
    lastSavedNomor.value = res.data.nomor;
    showPrintDialog.value = true;
  },
});

const showMapModal = ref(false);
const showPerushModal = ref(false);
const showCusModal = ref(false);
const activeRowIdx = ref(-1);
const showCusConfirm = ref(false);
const pendingCusItem = ref<any>(null);
const divisiOptions = ref<any[]>([]);

const onPerushSelected = (item: any) => {
  // Mapping field dari PerusahaanSearchModal (perush_kode & perush_nama)
  formData.value.header.sj_perush_kode = item.perush_kode;
  formData.value.header.perush_nama = item.perush_nama;
};

const onCusSelected = (item: any) => {
  const filledDetails = formData.value.details.filter((d) => d.kode);
  if (filledDetails.length > 0) {
    pendingCusItem.value = item;
    showCusConfirm.value = true;
  } else {
    applyCustomer(item);
  }
};

const applyCustomer = (item: any) => {
  formData.value.header.sj_cus_kode = item.Kode;
  formData.value.header.cus_nama = item.Nama;
  formData.value.header.sj_alamat_customer = item.Alamat;
  formData.value.header.sj_kota_customer = item.Kota; // Sekarang Kota terisi karena backend sudah diupdate
  formData.value.details = [
    {
      kode: "",
      nama: "",
      ukuran: "",
      bahan: "",
      jumlah: 0,
      jumlah_kirim: 0,
      kurang: 0,
    },
  ];
  showCusConfirm.value = false;
};

const onMapSelected = async (item: any) => {
  try {
    const res = await api.get("/penjualan/sj-map/form/item-details", {
      params: {
        nomorMap: item.Nomor,
        cusKode: formData.value.header.sj_cus_kode,
        divisi: formData.value.header.sj_divisi,
      },
    });
    const data = res.data.data;

    // Validasi duplikasi
    if (
      formData.value.details.some(
        (d: any, idx: number) =>
          d.kode === data.kode && idx !== activeRowIdx.value,
      )
    ) {
      return toast.error("Nomor MAP ini sudah diinputkan.");
    }

    // Update baris yang aktif
    formData.value.details[activeRowIdx.value] = {
      ...data, // Berisi: kode, nama, ukuran, bahan, jumlah_kirim, kurang
      jumlah: data.kurang, // Isi otomatis jumlah kirim dengan sisa order
    };

    const details = formData.value.details;
    const last = details[details.length - 1];
    if (last && last.kode) {
      details.push({
        kode: "",
        nama: "",
        ukuran: "",
        bahan: "",
        jumlah: 0,
        jumlah_kirim: 0,
        kurang: 0,
      });
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memproses MAP.");
  }
};

const addRow = () => {
  if (!formData.value.header.sj_cus_kode)
    return toast.warning("Pilih Customer terlebih dahulu.");

  // Cek apakah baris terakhir masih kosong — jangan tambah lagi
  const last = formData.value.details[formData.value.details.length - 1];
  if (last && !last.kode) return; // baris kosong sudah ada

  formData.value.details.push({
    kode: "",
    nama: "",
    ukuran: "",
    bahan: "",
    jumlah: 0,
    jumlah_kirim: 0,
    kurang: 0,
  });
};
const removeRow = (i: number) => formData.value.details.splice(i, 1);

const validateSave = () => {
  // Logika Delphi: Cek Closing Periode
  const tglSj = new Date(formData.value.header.sj_tanggal);
  const now = new Date();

  // Sesuai logic F10: jika status PIN bukan ACC dan tanggal sudah lewat periode closing
  // (Asumsi variable xminta5 di delphi kita mapping ke formData.pinStatus)
  const pinAcc = formData.value.pinStatus?.pin_acc === "Y";

  if (!formData.value.header.perush_nama)
    return toast.error("Perusahaan belum diisi");
  if (!formData.value.header.cus_nama)
    return toast.error("Customer belum diisi");
  const filledDetails = formData.value.details.filter((d) => d.kode);
  for (const d of filledDetails) {
    if (Number(d.jumlah) > Number(d.kurang)) {
      return toast.error(
        `Jumlah Kirim MAP ${d.kode} melebihi sisa order (${d.kurang})`,
      );
    }
  }

  // Validasi jumlah kirim vs sisa order
  for (const d of formData.value.details) {
    if (Number(d.jumlah) > Number(d.kurang)) {
      return toast.error(
        `Jumlah Kirim MAP ${d.kode} melebihi sisa order (${d.kurang})`,
      );
    }
  }

  showSaveDialog.value = true;
};

// Fungsi aksi di dalam dialog cetak
const confirmPrint = () => {
  window.open(
    `/penjualan/sj-map/print/${encodeURIComponent(lastSavedNomor.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  goBack(); // Kembali ke halaman browse
};

const skipPrint = () => {
  showPrintDialog.value = false;
  goBack(); // Kembali ke halaman browse tanpa cetak
};

const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = res.data.data
      .filter((d: any) => d.kode !== 0)
      .map((d: any) => ({
        value: String(d.kode),
        label: `${d.kode} - ${d.nama}`,
      }));
  } catch {
    console.error("Gagal memuat divisi");
  }
};

onMounted(() => {
  loadDivisi();
  if (isEditMode.value) {
    fetchData();
  } else {
    // Mode baru: sediakan 1 baris kosong siap pakai
    formData.value.details.push({
      kode: "",
      nama: "",
      ukuran: "",
      bahan: "",
      jumlah: 0,
      jumlah_kirim: 0,
      kurang: 0,
    });
  }
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Surat Jalan MAP' : 'Buat Surat Jalan MAP Baru'"
    menu-id="163"
    :icon="IconTruckDelivery"
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
    <!-- ── Kolom kiri: semua field header ── -->
    <template #left-column>
      <div class="sj-card">
        <div class="sec-title">Info Surat Jalan</div>

        <div class="f-row">
          <label class="f-lbl">Divisi</label>
          <select v-model="formData.header.sj_divisi" class="f-inp f-sel">
            <option v-for="d in divisiOptions" :key="d.value" :value="d.value">
              {{ d.label }}
            </option>
          </select>
        </div>

        <div class="f-row">
          <label class="f-lbl">Nomor</label>
          <input
            v-model="formData.header.sj_nomor"
            class="f-inp f-ro"
            readonly
            :placeholder="!isEditMode ? '← Kosong = Baru' : ''"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Perusahaan</label>
          <div class="inp-grp" style="flex: 1">
            <input
              v-model="formData.header.sj_perush_kode"
              class="f-inp"
              style="
                width: 60px;
                flex: none;
                background: #ddeeff;
                font-weight: 600;
                text-transform: uppercase;
              "
              placeholder="Kode"
              :readonly="isEditMode"
              :class="{ 'f-ro': isEditMode }"
              @keydown.f1.prevent="showPerushModal = true"
              @keydown.enter.prevent="onPerushKodeEnter"
            />
            <input
              v-model="formData.header.perush_nama"
              class="f-inp f-ro"
              readonly
              style="flex: 1"
              placeholder="Nama perusahaan..."
            />
            <button
              type="button"
              class="btn-lkp"
              title="Cari Perusahaan (F1)"
              :disabled="isEditMode"
              @mousedown.prevent="showPerushModal = true"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="f-row">
          <label class="f-lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.header.sj_tanggal"
            class="f-date"
            style="width: 140px"
          />
        </div>

        <div class="f-divider" />

        <div class="sec-title">Customer</div>

        <div class="f-row">
          <label class="f-lbl">Customer</label>
          <div class="inp-grp" style="flex: 1">
            <input
              v-model="formData.header.sj_cus_kode"
              class="f-inp"
              style="
                width: 60px;
                flex: none;
                background: #ddeeff;
                font-weight: 600;
              "
              placeholder="Kode"
              @keydown.enter.prevent="onCusKodeEnter"
              @blur="onCusKodeEnter"
            />
            <input
              v-model="formData.header.cus_nama"
              class="f-inp f-ro"
              readonly
              style="flex: 1"
              placeholder="Cari Customer..."
            />
            <button
              type="button"
              class="btn-lkp"
              @mousedown.prevent="showCusModal = true"
            >
              🔍
            </button>
          </div>
        </div>

        <!-- Alamat + Kota tanpa label (indent sejajar kolom value) -->
        <div class="f-row">
          <span class="f-lbl" />
          <input
            v-model="formData.header.sj_alamat_customer"
            class="f-inp f-ro"
            readonly
            style="flex: 1"
            placeholder="Alamat..."
          />
        </div>
        <div class="f-row">
          <span class="f-lbl" />
          <input
            v-model="formData.header.sj_kota_customer"
            class="f-inp f-ro"
            readonly
            style="flex: 1"
            placeholder="Kota..."
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">UP</label>
          <input
            v-model="formData.header.sj_up"
            class="f-inp"
            style="flex: 1"
            placeholder="Nama penerima..."
          />
        </div>

        <div class="f-divider" />

        <div class="f-row" style="align-items: flex-start">
          <label class="f-lbl" style="padding-top: 3px">Keterangan</label>
          <textarea
            v-model="formData.header.sj_keterangan"
            class="f-textarea"
            rows="3"
            style="flex: 1"
          ></textarea>
        </div>

        <!-- PIN Status -->
        <div v-if="formData.pinStatus" class="pin-panel">
          <IconShieldCheck :size="16" color="#1565c0" class="mr-1" />
          <div>
            Status PIN:
            <strong>{{
              formData.pinStatus.pin_acc === "Y" ? "DISETUJUI" : "MENUNGGU"
            }}</strong
            ><br />
            Alasan: {{ formData.pinStatus.pin_alasan }}
          </div>
        </div>
      </div>
    </template>

    <!-- ── Kolom kanan: tabel detail MAP ── -->
    <template #right-column>
      <div
        class="sj-card"
        style="display: flex; flex-direction: column; height: 100%"
      >
        <div class="sec-title">Detail Barang MAP</div>

        <div style="flex: 1; overflow-y: auto; min-height: 0">
          <table class="sj-table">
            <thead>
              <tr>
                <th style="width: 32px">No</th>
                <th style="width: 180px">Kode MAP</th>
                <th style="text-align: left">Nama Pekerjaan</th>
                <th style="width: 100px; text-align: left">Ukuran</th>
                <th style="width: 130px; text-align: left">Bahan</th>
                <th class="th-yellow" style="width: 90px; text-align: right">
                  Jumlah
                </th>
                <th style="width: 70px; text-align: right">Jml Kirim</th>
                <th style="width: 70px; text-align: right">Kurang</th>
                <th style="width: 30px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in formData.details" :key="i">
                <td class="tc">{{ i + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="d.kode"
                      class="cell-inp"
                      style="
                        font-weight: 600;
                        color: #1565c0;
                        text-transform: uppercase;
                      "
                      placeholder="F1 / nomor MAP"
                      @keydown="onMapKeydown($event, i)"
                      @keydown.enter.prevent="onMapEnter(i)"
                    />
                    <button
                      type="button"
                      class="cell-lkp"
                      title="Cari MAP (F1)"
                      @mousedown.prevent="
                        activeRowIdx = i;
                        showMapModal = true;
                      "
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                </td>
                <td>
                  <div style="font-weight: 500; font-size: 11px">
                    {{ d.nama }}
                  </div>
                </td>
                <td class="p0">
                  <input
                    v-model="d.ukuran"
                    class="cell-inp"
                    placeholder="Ukuran..."
                    style="width: 100%; height: 28px; padding: 0 6px"
                  />
                </td>
                <td style="font-size: 11px; color: #555">{{ d.bahan }}</td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="d.jumlah"
                    class="cell-inp tr"
                    style="
                      font-weight: 600;
                      background: #fffde7;
                      width: 100%;
                      height: 28px;
                      padding: 0 6px;
                      box-sizing: border-box;
                    "
                    v-select-on-focus
                  />
                </td>
                <td class="tr muted">{{ d.jumlah_kirim }}</td>
                <td class="tr" style="font-weight: 600">{{ d.kurang }}</td>
                <td class="tc">
                  <button type="button" class="del-btn" @click="removeRow(i)">
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="formData.details.length === 0">
                <td colspan="8" class="empty-row">
                  Belum ada barang. Klik "+ Tambah Baris" untuk menambahkan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          <button type="button" class="add-btn" @click="addRow">
            + Tambah Baris (MAP)
          </button>
        </div>
      </div>
    </template>
  </BaseForm>

  <v-dialog v-model="showCusConfirm" max-width="400px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-warning text-white pa-3 text-subtitle-1"
        >Ganti Customer?</v-card-title
      >
      <v-card-text class="pa-4"
        >Customer berubah. Hapus semua detail barang MAP yang sudah
        dipilih?</v-card-text
      >
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showCusConfirm = false">Batal</v-btn>
        <v-btn
          color="error"
          variant="elevated"
          @click="applyCustomer(pendingCusItem)"
          >Ya, Hapus Detail</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconPrinter
          :size="18"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        Simpan Berhasil
      </v-card-title>

      <v-card-text class="pa-5 text-center">
        <div class="text-body-2 mb-2">
          Data Surat Jalan <b>{{ lastSavedNomor }}</b> telah tersimpan.
        </div>
        <div class="font-weight-bold">
          Apakah Anda ingin mencetak dokumen ini sekarang?
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="grey-darken-1" @click="skipPrint"
          >TIDAK (KEMBALI)</v-btn
        >
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="confirmPrint">
          <template #prepend
            ><IconPrinter :size="15" :stroke-width="1.7"
          /></template>
          YA, CETAK
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <PerusahaanSearchModal
    v-model="showPerushModal"
    @selected="onPerushSelected"
  />
  <CustomerSearchModal v-model="showCusModal" @selected="onCusSelected" />
  <MapSearchModal
    v-model="showMapModal"
    :cus-kode="formData.header.sj_cus_kode"
    :perush-kode="formData.header.sj_perush_kode"
    :divisi="formData.header.sj_divisi"
    source="SJ_MAP"
    @selected="onMapSelected"
  />
</template>

<style scoped>
/* ── Override BaseForm grid — kiri lebih lebar untuk semua field header ── */
:deep(.form-grid-container.two-column) {
  grid-template-columns: 360px 1fr !important;
}

/* ── Card wrapper ── */
.sj-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-top: 3px solid #1565c0;
  border-radius: 6px;
  padding: 10px 12px;
  height: 100%;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}

.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1565c0;
  margin-bottom: 6px;
}
.f-divider {
  height: 1px;
  background: #eeeeee;
  margin: 8px 0;
}

/* ── Field rows ── */
.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}
.f-lbl {
  width: 85px;
  flex-shrink: 0;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}

.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
  box-sizing: border-box;
  font-family: inherit;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #616161 !important;
  cursor: default;
}
.f-sel {
  cursor: pointer;
  flex: 1;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
}
.f-textarea {
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 5px 6px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  resize: none;
  box-sizing: border-box;
  color: #212121;
}
.f-textarea:focus {
  border-color: #1565c0;
}

.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.inp-grp .f-inp {
  border: none;
  height: 24px;
  border-radius: 0;
}
.btn-lkp {
  width: 28px;
  min-width: 28px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp:hover:not(:disabled) {
  background: #bbdefb;
}
.btn-lkp:disabled {
  opacity: 0.4;
  cursor: default;
}

.pin-panel {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 10px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 4px;
  font-size: 10px;
  color: #0d47a1;
}

/* ── Tabel detail ── */
.sj-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  table-layout: fixed;
}
.sj-table thead tr {
  background: #1565c0;
}
.sj-table th {
  padding: 5px 7px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-align: center;
  border: 1px solid #0d47a1;
  white-space: nowrap;
}
.th-yellow {
  background: #f9a825 !important;
  color: #4a2e00 !important;
  border-color: #e65100 !important;
}
.sj-table td {
  border-bottom: 1px solid #eeeeee;
  padding: 3px 6px;
  vertical-align: middle;
  overflow: hidden;
}
.sj-table tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.sj-table tbody tr:hover td {
  background: #e3f2fd !important;
}

.p0 {
  padding: 0 !important;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.muted {
  color: #9e9e9e;
}

.cell-grp {
  display: flex;
  align-items: center;
  height: 28px;
  background: white;
  border: none;
  overflow: hidden;
}

.cell-inp {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 28px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 6px;
  font-family: inherit;
  color: #212121;
  box-sizing: border-box;
}
.cell-inp.tr {
  text-align: right;
}
.cell-inp:focus {
  background: #fffde7 !important;
  box-shadow: inset 0 0 0 1.5px #f9a825;
}
.cell-lkp {
  width: 28px;
  min-width: 28px;
  height: 100%;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bbdefb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cell-lkp:hover {
  background: #bbdefb;
}
.del-btn {
  width: 22px;
  height: 22px;
  background: #ffebee;
  border: none;
  border-radius: 3px;
  color: #c62828;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}
.del-btn:hover {
  background: #ffcdd2;
}

.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-size: 11px;
  padding: 20px !important;
  font-style: italic;
}

.table-footer {
  padding: 8px 0 2px;
  border-top: 1px solid #eeeeee;
  flex-shrink: 0;
}
.add-btn {
  padding: 4px 12px;
  background: transparent;
  border: 1px dashed #1565c0;
  border-radius: 3px;
  color: #1565c0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.add-btn:hover {
  background: #e3f2fd;
}
</style>
