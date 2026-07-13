<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useForm } from "@/composables/useForm";
import { mintaBahanFormService } from "@/services/garmen/mintaBahanFormService";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import api from "@/services/api";
import {
  IconBox,
  IconSearch,
  IconTrash,
  IconPlus,
  IconCircleCheck,
  IconPrinter,
} from "@tabler/icons-vue";

interface DetailItem {
  kode: string;
  nama: string;
  satuan: string;
  babaran: number;
  pcs: number;
  butuh: number;
  jumlah: number;
  komponen: string;
  ket: string;
}

const route = useRoute(); // <-- Pastikan ini didefinisikan
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";

  const d = new Date(value);

  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// 1. Initial State
const initialData = {
  nomor: "",
  tanggal: formatDateLocal(new Date()),
  cabang: authStore.userCabang || "P04",
  divisi: "CUTING",
  spk: "",
  namaSpk: "",
  jumlahSpk: 0,
  keterangan: "BARU",
  mkbNomor: "",
  mkbTanggal: "",
  status: "OPEN",
  pin_acc: "",
  pin_dipakai: "",
  details: [] as DetailItem[],
};

// 2. Setup useForm
const {
  formData,
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
  fetchData,
} = useForm({
  menuId: "127",
  initialData,
  fetchApi: async () => {
    const res = await mintaBahanFormService.getDetail(
      route.params.nomor as string,
    );
    const h = res.data.data.header;
    return {
      nomor: h.min_nomor,
      tanggal: formatDateLocal(h.min_tanggal),
      cabang: h.min_cab,
      divisi: h.min_divisi,
      spk: h.min_spk_nomor,
      namaSpk: h.namaspk,
      jumlahSpk: h.jumlahspk,
      keterangan: h.min_ket,
      mkbNomor: h.mkb_nomor,
      mkbTanggal: formatDateLocal(h.mkb_tanggal),
      status: h.min_close === 0 ? "OPEN" : "CLOSED",
      pin_acc: h.pin_acc,
      pin_dipakai: h.pin_dipakai,
      details: res.data.data.details,
    };
  },
  submitApi: async (data: typeof initialData): Promise<unknown> => {
    const nomor = isEditMode.value ? (route.params.nomor as string) : undefined;

    // Eksekusi Save
    const res = await mintaBahanFormService.saveData(data, nomor);

    // Tangkap nomor kembalian dari backend
    savedNomor.value = res.data?.data?.nomor || nomor || data.nomor;

    // Munculkan dialog konfirmasi cetak
    showPrintConfirm.value = true;

    return res;
  },
});

const showSpkModal = ref(false);
const komponenOptions = ref<string[]>([]);
const ketOptions = ["BARU", "GANTI BS", "GANTI HILANG", "TAMBAHAN", "LAINNYA"];
const divisiOptions = ["CUTING", "SUBLIM", "PROOF"];

const cabangOptions = ref<string[]>([]);

// --- STATE MODAL BAHAN ---
const showBahanModal = ref(false);
const activeDetailIndex = ref(-1); // Mencatat baris mana yang sedang diedit

const showPrintConfirm = ref(false);
const savedNomor = ref("");

onMounted(async () => {
  // 1. Fetch Komponen untuk Grid
  try {
    const res = await mintaBahanFormService.getKomponen();
    komponenOptions.value = res.data.data;
  } catch {}

  // 2. Fetch Cabang dengan Filter (Kode P kecuali P03)
  try {
    const res = await api.get("/lookups/cabang-pabrik");
    const allCabang = res.data.data;

    const filtered = allCabang
      .filter((c: any) => c.Kode.startsWith("P") && c.Kode !== "P03")
      .map((c: any) => c.Kode);

    const userCab = authStore.userCabang;

    if (userCab === "P01" || userCab === "P04" || userCab === "P05") {
      cabangOptions.value = [userCab];
      formData.value.cabang = userCab;
    } else {
      cabangOptions.value = filtered;
      if (!isEditMode.value) formData.value.cabang = "P04";
    }
  } catch (e) {
    cabangOptions.value = ["P01", "P04", "P05"]; // Fallback
  }

  // --- 3. TAMBAHKAN KODE INI UNTUK MEMICU REQUEST DATA EDIT ---
  if (isEditMode.value) {
    await fetchData();
  }
  // -----------------------------------------------------------
});

const addRow = () => {
  const newIndex = formData.value.details.length;
  formData.value.details.push({
    kode: "",
    nama: "",
    satuan: "",
    babaran: 0,
    pcs: 0,
    butuh: 0,
    jumlah: 0,
    komponen: "BODY",
    ket: "",
  });
  // Opsional: Langsung buka lookup untuk baris baru
  openBahanLookup(newIndex);
};

// 3. Logika Bisnis (SPK & Kalkulasi)
const onSpkSelected = async (spk: any) => {
  formData.value.spk = spk.Nomor;
  showSpkModal.value = false;
  try {
    const res = await mintaBahanFormService.getSpkInfo(
      spk.Nomor,
      formData.value.cabang,
      formData.value.keterangan,
    );
    const data = res.data.data;
    formData.value.namaSpk = data.spkInfo.Nama;
    formData.value.jumlahSpk = data.spkInfo.Jumlah;

    if (data.mkbHeader) {
      formData.value.mkbNomor = data.mkbHeader.nomor;
      formData.value.mkbTanggal = data.mkbHeader.tanggal;
      formData.value.details = data.mkbDetails;
    } else {
      formData.value.details = [
        {
          kode: "",
          nama: "",
          satuan: "",
          babaran: 0,
          pcs: 0,
          butuh: 0,
          jumlah: 0,
          komponen: "BODY",
          ket: "",
        },
      ];
    }
  } catch (e: any) {
    toast.warning(e.response?.data?.message || "Gagal mengambil info SPK.");
  }
};

// Fungsi untuk membuka modal bahan dari baris tertentu
const openBahanLookup = (index: number) => {
  if (!formData.value.spk) {
    return toast.warning("Pilih SPK diisi dulu ya!");
  }
  activeDetailIndex.value = index;
  showBahanModal.value = true;
};

// Fungsi saat bahan dipilih dari modal
const onBahanSelected = (item: any) => {
  if (activeDetailIndex.value === -1) return;

  // Cek duplikasi kode di baris lain (Logic Delphi: loadkode)
  const isDuplicate = formData.value.details.some(
    (d: DetailItem, idx: number) =>
      d.kode === item.Kode && idx !== activeDetailIndex.value,
  );

  if (isDuplicate) {
    toast.error(`Kode ${item.Kode} sudah di input di baris lain.`);
    return;
  }

  const row = formData.value.details[activeDetailIndex.value];
  row.kode = item.Kode;
  row.nama = item.Nama;
  row.satuan = item.Satuan;

  showBahanModal.value = false;
  activeDetailIndex.value = -1;
};

const calculateJumlah = (item: any) => {
  const pcs = Number(item.pcs) || 0;
  const babaran = Number(item.babaran) || 0;
  if (babaran === 0) return;
  item.jumlah =
    item.satuan?.toUpperCase() === "KG"
      ? Number((pcs / babaran).toFixed(2))
      : Number((pcs * babaran).toFixed(2));
};

const validateBeforeSave = () => {
  if (!formData.value.spk) return toast.warning("Pilih SPK terlebih dahulu.");
  if (formData.value.details.some((d: DetailItem) => !d.kode || d.jumlah <= 0))
    return toast.warning("Lengkapi detail barang.");
  showSaveDialog.value = true;
};

const doPrint = () => {
  showPrintConfirm.value = false;
  window.open(
    `/garmen/bahan-baku/minta-bahan/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.push("/garmen/bahan-baku/minta-bahan"); // Kembali ke browse setelah cetak
};

const doNotPrint = () => {
  showPrintConfirm.value = false;
  router.push("/garmen/bahan-baku/minta-bahan"); // Kembali ke browse
};

// Jika user ganti keterangan (misal dari TAMBAHAN ke BARU), validasi SPK ulang
watch(
  () => formData.value.keterangan,
  () => {
    if (formData.value.spk) {
      onSpkSelected({
        Nomor: formData.value.spk,
        Nama: formData.value.namaSpk,
        Jumlah: formData.value.jumlahSpk,
      });
    }
  },
);
</script>

<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah' : 'Baru') + ' Permintaan Bahan Baku'"
    menu-id="127"
    :icon="IconBox"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @validate-save="validateBeforeSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="text-caption font-weight-bold mb-3 text-primary">
          HEADER
        </div>

        <v-text-field
          v-model="formData.nomor"
          label="No. Permintaan"
          density="compact"
          variant="outlined"
          readonly
          placeholder="Otomatis"
          hide-details
          class="mb-2"
        />
        <v-text-field
          v-model="formData.tanggal"
          type="date"
          label="Tanggal"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />
        <v-select
          v-model="formData.divisi"
          :items="divisiOptions"
          label="Divisi"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />
        <v-select
          v-model="formData.cabang"
          :items="cabangOptions"
          label="Cabang"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
          :readonly="
            authStore.userCabang === 'P01' || authStore.userCabang === 'P04'
          "
        />

        <v-text-field
          v-model="formData.spk"
          label="Nomor SPK"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
          readonly
          @click:append-inner="showSpkModal = true"
          color="primary"
        >
          <template #append-inner>
            <IconSearch
              :size="16"
              :stroke-width="1.7"
              style="cursor: pointer"
              @click="showSpkModal = true"
            />
          </template>
        </v-text-field>

        <v-textarea
          v-model="formData.namaSpk"
          label="Nama SPK"
          density="compact"
          variant="outlined"
          rows="2"
          readonly
          hide-details
          class="mb-2 bg-grey-lighten-5"
        />
        <v-text-field
          v-model="formData.jumlahSpk"
          label="Qty SPK"
          density="compact"
          variant="outlined"
          readonly
          hide-details
          class="mb-2 bg-grey-lighten-5"
          suffix="PCS"
        />
        <v-select
          v-model="formData.keterangan"
          :items="ketOptions"
          label="Keterangan"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />

        <div
          class="pa-2 rounded border bg-blue-lighten-5 mt-2"
          v-if="formData.mkbNomor"
        >
          <div class="text-caption font-weight-bold">
            MKB: {{ formData.mkbNomor }}
          </div>
          <div class="text-caption text-grey-darken-1">
            {{ formData.mkbTanggal }}
          </div>
        </div>
      </div>
    </template>

    <template #right-column>
      <v-card border flat class="d-flex flex-column fill-height">
        <div class="table-container flex-grow-1">
          <table class="manksi-table">
            <thead>
              <tr>
                <th width="40">No</th>
                <th width="110">Kode</th>
                <th>Nama Bahan</th>
                <th width="60">Sat</th>
                <th width="80">Babaran</th>
                <th width="80">Pcs</th>
                <th width="90">Jumlah</th>
                <th width="120">Komponen</th>
                <th>Ket</th>
                <th width="40"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in formData.details" :key="index">
                <td class="text-center">{{ Number(index) + 1 }}</td>
                <td class="pa-0" style="position: relative">
                  <div class="d-flex align-center fill-height px-1">
                    <input
                      v-model="item.kode"
                      class="cell-input fw-bold text-primary flex-grow-1"
                      readonly
                      placeholder="Cari..."
                      @click="openBahanLookup(Number(index))"
                    />
                    <v-btn
                      size="x-small"
                      variant="text"
                      density="comfortable"
                      color="primary"
                      @click="openBahanLookup(Number(index))"
                    >
                      <IconSearch :size="14" :stroke-width="1.7" />
                    </v-btn>
                  </div>
                </td>

                <td>
                  <input v-model="item.nama" class="cell-input" readonly />
                </td>
                <td class="text-center">{{ item.satuan }}</td>
                <td>
                  <input
                    type="number"
                    v-model.number="item.babaran"
                    class="cell-input tr"
                    @input="calculateJumlah(item)"
                    v-select-on-focus
                  />
                </td>
                <td>
                  <input
                    type="number"
                    v-model.number="item.pcs"
                    class="cell-input tr"
                    @input="calculateJumlah(item)"
                    v-select-on-focus
                  />
                </td>
                <td class="bg-yellow-lighten-5">
                  <input
                    type="number"
                    v-model.number="item.jumlah"
                    class="cell-input tr fw-bold"
                    v-select-on-focus
                  />
                </td>
                <td>
                  <select v-model="item.komponen" class="cell-input">
                    <option
                      v-for="opt in komponenOptions"
                      :key="opt"
                      :value="opt"
                    >
                      {{ opt }}
                    </option>
                  </select>
                </td>
                <td><input v-model="item.ket" class="cell-input" /></td>
                <td class="text-center">
                  <v-btn
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="formData.details.splice(index, 1)"
                  >
                    <IconTrash :size="14" :stroke-width="1.7" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <v-divider />
        <div class="pa-2 d-flex bg-grey-lighten-4 align-center">
          <v-btn
            size="x-small"
            color="primary"
            variant="flat"
            @click="
              formData.details.push({
                komponen: 'BODY',
                pcs: formData.jumlahSpk,
              })
            "
          >
            <template #prepend
              ><IconPlus :size="14" :stroke-width="2"
            /></template>
            Tambah Baris
          </v-btn>
          <v-spacer />
          <div class="text-caption font-weight-bold">
            Total Qty:
            {{
              formData.details
                .reduce(
                  (a: number, b: DetailItem) => a + (Number(b.jumlah) || 0),
                  0,
                )
                .toFixed(2)
            }}
          </div>
        </div>
      </v-card>
    </template>
  </BaseForm>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="spk-map"
    @selected="onSpkSelected"
  />
  <BahanSearchModal
    v-model="showBahanModal"
    mode="all"
    @selected="onBahanSelected"
  />

  <v-dialog v-model="showPrintConfirm" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white text-subtitle-1 font-weight-bold pa-3"
      >
        Simpan Berhasil
      </v-card-title>
      <v-card-text class="pa-4 text-center mt-2">
        <IconCircleCheck :size="48" color="green" class="mb-3" />
        <div class="text-body-1 font-weight-medium">
          Permintaan Bahan berhasil disimpan!
        </div>
        <div class="text-body-2 text-grey mt-1">
          Apakah Anda ingin mencetak dokumen ini sekarang?
        </div>
      </v-card-text>
      <v-card-actions class="bg-grey-lighten-4 pa-3">
        <v-btn color="grey-darken-2" variant="outlined" @click="doNotPrint"
          >Tutup</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="elevated" @click="doPrint">
          <template #prepend
            ><IconPrinter :size="15" :stroke-width="1.7"
          /></template>
          Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.manksi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.manksi-table th {
  background: #1565c0;
  color: white;
  padding: 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.manksi-table td {
  border: 1px solid #e0e0e0;
  padding: 0;
  height: 28px;
}
.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  padding: 0 6px;
  outline: none;
  background: transparent;
}
.cell-input:focus {
  background: #e3f2fd;
}
.table-container {
  overflow: auto;
  height: 100%;
}
.tr {
  text-align: right;
}
.fw-bold {
  font-weight: bold;
}
</style>
