<template>
  <BaseForm
    :title="formTitle"
    menu-id="5514"
    :icon="IconBuildingFactory"
    :is-loading="isSaving"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- HEADER ACTIONS -->
    <template #header-actions>
      <v-btn
        size="small"
        color="primary"
        variant="elevated"
        class="mr-2"
        :loading="isSaving"
        :disabled="!isFormValid"
        @click="showSaveDialog = true"
      >
        <v-icon start size="16">mdi-content-save-check</v-icon>
        Simpan Data
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        class="mr-2"
        @click="showCancelDialog = true"
      >
        Batal
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        color="error"
        @click="showCloseDialog = true"
      >
        <v-icon start size="16">mdi-close</v-icon>
        Tutup
      </v-btn>
    </template>

    <!-- LEFT COLUMN: INFORMASI HEADER RTR SUBLIM -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="text-caption font-weight-bold mb-3 text-primary">
          INFORMASI HEADER RTR SUBLIM
        </div>

        <v-text-field
          label="Nomor Transaksi"
          v-model="formData.nomor"
          readonly
          density="compact"
          variant="outlined"
          class="mb-3 bg-grey-lighten-3"
          hide-details
        />
        <v-text-field
          label="Tanggal"
          v-model="formData.tanggal"
          type="date"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details
        />
        <v-text-field
          label="Gudang"
          v-model="formData.gdgKode"
          readonly
          placeholder="Klik untuk pilih gudang"
          density="compact"
          variant="outlined"
          append-inner-icon="mdi-magnify"
          class="mb-3"
          hide-details
          style="cursor: pointer"
          @click="lookup.gudang = true"
          @click:append-inner="lookup.gudang = true"
        />
        <v-text-field
          label="Nama Gudang"
          v-model="formData.gdgNama"
          readonly
          density="compact"
          variant="filled"
          class="mb-3"
          hide-details
        />
      </div>
    </template>

    <!-- RIGHT COLUMN: DETAIL HASIL KERJA SUBLIMASI -->
    <template #right-column>
      <div class="d-flex flex-column fill-height">
        <v-card border flat class="d-flex flex-column table-card mb-4">
          <div class="pa-2 bg-blue-grey-lighten-5 d-flex align-center">
            <span
              class="text-subtitle-2 font-weight-bold text-blue-grey-darken-4"
            >
              Detail Hasil Kerja Sublimasi
            </span>
            <v-spacer />
            <div class="d-flex align-center ga-2">
              <v-btn
                color="blue-darken-3"
                size="small"
                prepend-icon="mdi-package-variant"
                style="height: 30px !important; text-transform: none"
                @click="openPoiSearch"
              >
                Lookup PO Internal
              </v-btn>

              <!-- 🌟 TOMBOL BARU LOOKUP PAPERPRINT -->
              <v-btn
                color="purple-darken-3"
                size="small"
                prepend-icon="mdi-printer"
                style="height: 30px !important; text-transform: none"
                @click="openPaperprintSearch"
              >
                Lookup LHK Paperprint
              </v-btn>

              <v-btn
                color="success"
                size="small"
                prepend-icon="mdi-plus"
                style="height: 30px !important; text-transform: none"
                @click="openSpkSearch"
              >
                Tambah SPK Sublim
              </v-btn>
            </div>
          </div>

          <div class="table-container flex-grow-1">
            <table class="manksi-table">
              <thead>
                <tr>
                  <th class="sticky-col-1 text-center">No</th>
                  <th class="sticky-col-2">PO Internal</th>
                  <th class="sticky-col-3 text-center">Size</th>
                  <th class="sticky-col-4">Komponen</th>
                  <th class="sticky-col-5">No. SPK</th>
                  <th style="white-space: nowrap; min-width: 120px">No. LHK Paperprint</th>
                  <th style="min-width: 220px">Nama Order</th>
                  <th style="width: 130px; min-width: 130px">Bahan Keluar</th>
                  <th style="width: 80px; min-width: 80px" class="text-right">Bahan Awal</th>
                  <th style="width: 65px; min-width: 65px" class="text-right">Panjang</th>
                  <th style="width: 65px; min-width: 65px" class="text-right">Lebar</th>
                  <th style="white-space: nowrap; min-width: 85px" class="text-right">Jumlah Order</th>
                  <th style="white-space: nowrap; min-width: 85px" class="text-right">Sudah Cetak</th>
                  <th style="white-space: nowrap; min-width: 105px" class="text-right">Jumlah Cetak RTR</th>
                  <th style="width: 70px; min-width: 70px" class="text-right">Jml BS</th>
                  <th style="width: 85px; min-width: 85px" class="text-right">Total m²</th>
                  <th style="width: 85px; min-width: 85px">Mesin</th>
                  <th style="width: 120px; min-width: 120px">Keterangan</th>
                  <th style="width: 40px; min-width: 40px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in detailData" :key="index">
                  <td class="text-center sticky-col-1">{{ index + 1 }}</td>

                  <td class="cell-yellow px-1 sticky-col-2">
                    <input
                      type="text"
                      v-model="item.poi_nomor"
                      readonly
                      placeholder="Pilih PO..."
                      :title="item.poi_nomor || 'Pilih PO...'"
                      class="cell-input cursor-pointer fw-bold text-amber-darken-4 font-mono text-truncate"
                      @click="openPoiSearchRow(index)"
                    />
                  </td>

                  <td class="text-center bg-grey-lighten-4 sticky-col-3">
                    <input
                      type="text"
                      v-model="item.poi_size"
                      class="cell-input text-center font-weight-bold"
                    />
                  </td>

                  <td class="sticky-col-4">
                    <input
                      type="text"
                      v-model="item.nama_komponen"
                      placeholder="All Set / Badan..."
                      class="cell-input"
                    />
                  </td>

                  <td class="cell-yellow px-1 sticky-col-5">
                    <input
                      type="text"
                      v-model="item.spk_nomor"
                      readonly
                      placeholder="Pilih SPK..."
                      :title="item.spk_nomor || 'Pilih SPK...'"
                      class="cell-input cursor-pointer fw-bold text-blue-darken-4 font-mono text-truncate"
                      @click="openSpkSearchRow(index)"
                    />
                  </td>

                  <td class="cell-yellow px-1" style="white-space: nowrap">
                    <input
                      type="text"
                      v-model="item.lhk_paperprint"
                      readonly
                      placeholder="Pilih LHK Paperprint..."
                      :title="item.lhk_paperprint || 'Pilih LHK Paperprint...'"
                      :style="{ minWidth: getDynamicColWidth(item.lhk_paperprint, 14) }"
                      class="cell-input cursor-pointer fw-bold text-purple-darken-3 font-mono"
                      @click="openPaperprintSearchRow(index)"
                    />
                  </td>

                  <td class="px-2 text-truncate" :title="item.spk_nama" style="min-width: 220px">
                    {{ item.spk_nama }}
                  </td>

                  <td class="px-1" style="width: 130px; min-width: 130px">
                    <div
                      v-if="item.barang_id"
                      class="text-xxs text-grey-darken-3 font-weight-bold"
                    >
                      [{{ item.barang_id }}]
                    </div>
                    <span class="font-weight-medium text-indigo-darken-3">
                      {{ item.jenis_bahan || "-" }}
                    </span>
                    <div v-if="item.no_realisasi" class="text-xxs text-grey">
                      {{ item.no_realisasi }}
                    </div>
                  </td>

                  <td
                    class="text-right px-2 font-weight-bold text-teal-darken-2"
                    style="width: 80px; min-width: 80px"
                  >
                    {{
                      item.bahan_awal
                        ? Number(item.bahan_awal).toFixed(2)
                        : "0.00"
                    }}
                    M
                  </td>

                  <td style="width: 65px; min-width: 65px">
                    <input
                      type="number"
                      v-model.number="item.panjang"
                      class="cell-input tr font-weight-bold"
                      @input="calculateSublimMeter(item)"
                      @wheel="$event.target.blur()"
                    />
                  </td>

                  <td style="width: 65px; min-width: 65px">
                    <input
                      type="number"
                      v-model.number="item.lebar"
                      class="cell-input tr font-weight-bold"
                      @input="calculateSublimMeter(item)"
                      @wheel="$event.target.blur()"
                    />
                  </td>

                  <!-- 1. JUMLAH ORDER -->
                  <td class="text-right px-2 font-weight-bold bg-grey-lighten-4" style="min-width: 85px">
                    {{ formatNumber(item.qty_order) }}
                  </td>

                  <!-- 2. SUDAH CETAK -->
                  <td class="text-right px-2 font-weight-medium bg-grey-lighten-4 text-blue-grey-darken-2" style="min-width: 85px">
                    {{ formatNumber(item.sudah_cetak) }}
                  </td>

                  <!-- 3. JUMLAH CETAK RTR -->
                  <td
                    style="min-width: 105px"
                    :class="
                      item.qty_order > 0 && item.jumlah_rtr > (item.qty_order - (item.sudah_cetak || 0))
                        ? 'bg-red-lighten-5'
                        : 'bg-yellow-lighten-5'
                    "
                  >
                    <input
                      type="number"
                      v-model.number="item.jumlah_rtr"
                      class="cell-input tr font-weight-bold"
                      :class="
                        item.qty_order > 0 && item.jumlah_rtr > (item.qty_order - (item.sudah_cetak || 0))
                          ? 'text-red font-weight-black'
                          : ''
                      "
                      @input="calculateSublimMeter(item)"
                      @wheel="$event.target.blur()"
                    />
                  </td>

                  <td class="cell-yellow" style="width: 70px; min-width: 70px">
                    <input
                      type="number"
                      v-model.number="item.jumlah_bs"
                      class="cell-input tr font-weight-bold text-red-darken-2"
                      @input="calculateSublimMeter(item)"
                      @wheel="$event.target.blur()"
                    />
                  </td>

                  <td
                    class="text-right font-weight-bold px-2 text-blue-darken-2"
                    style="width: 85px; min-width: 85px"
                  >
                    {{ Number(item.jumlah_meter || 0).toFixed(2) }}
                  </td>

                  <td class="cell-yellow">
                    <input
                      type="text"
                      v-model="item.lokasi"
                      readonly
                      placeholder="Mesin..."
                      class="cell-input cursor-pointer"
                      @click="openMesinLookup(index)"
                    />
                  </td>

                  <td class="cell-yellow">
                    <input
                      type="text"
                      v-model="item.keterangan"
                      placeholder="Catatan..."
                      class="cell-input"
                    />
                  </td>

                  <td class="text-center">
                    <v-btn
                      icon="mdi-delete"
                      size="x-small"
                      color="error"
                      variant="text"
                      @click="removeRow(index)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-card>
      </div>
    </template>
  </BaseForm>

  <!-- MODAL LOOKUP -->
  <PoiLookupModal
    :is-visible="lookup.poi"
    @close="lookup.poi = false"
    @select="handlePoiSelect"
  />
  <SpkLookupModal
    :is-visible="lookup.spk"
    @close="lookup.spk = false"
    @select="handleSpkSelect"
  />

  <!-- 🌟 MODAL LOOKUP PAPERPRINT -->
  <PaperprintLookupModal
    :is-visible="lookup.paperprint"
    @close="lookup.paperprint = false"
    @select="handlePaperprintSelect"
  />

  <GudangLookupModal
    :is-visible="lookup.gudang"
    @close="lookup.gudang = false"
    @select="handleGudangSelect"
  />
  <MesinLookupModal
    :is-visible="lookup.mesin"
    type="R"
    @close="lookup.mesin = false"
    @select="handleMesinSelect"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { format } from "date-fns";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { IconBuildingFactory } from "@tabler/icons-vue";

import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import PoiLookupModal from "@/modal/PoInternalLookupView.vue";
import SpkLookupModal from "@/modal/SpkSublimLookupModal.vue";
import GudangLookupModal from "@/modal/GudangLookupView.vue";
import MesinLookupModal from "@/modal/MesinLookupModal.vue";

// 🌟 Import Modal Lookup Paperprint
// (Sesuaikan path-nya jika nama file/folder berbeda)
import PaperprintLookupModal from "@/modal/LhkPaperprintLookupModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const activeRowIdx = ref(-1);
const detailData = ref<any[]>([]);

const lookup = reactive({
  poi: false,
  spk: false,
  paperprint: false, // 🌟 Tambahkan State Paperprint
  gudang: false,
  mesin: false,
});

const initialData = {
  nomor: "AUTO",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  gdgKode: "GPM",
  gdgNama: "GUDANG PRODUKSI SUBLIM",
};

const ensureMeter = (val: any) => {
  const num = parseFloat(val) || 0;
  return num > 10 ? parseFloat((num / 100).toFixed(2)) : num;
};

const getDynamicColWidth = (val?: string, minChars = 11) => {
  const str = String(val || "").trim();
  const len = Math.max(minChars, str.length + 1);
  return `${Math.round(len * 8.2 + 14)}px`;
};

const formatNumber = (val?: any) => {
  const n = Number(val);
  return Number.isFinite(n) ? n.toLocaleString("id-ID") : "0";
};

// --- FETCH API UNTUK MODE EDIT ---
const fetchApi = async () => {
  const nomorParams = route.params.nomor as string;
  if (!nomorParams) return initialData;

  const response = await api.get(`/mmt/lhk-sublim/detail/${nomorParams}`);
  const headerData = response.data?.header;
  const rawDetails = response.data?.data || response.data?.details || response.data || [];

  if (!headerData && (!Array.isArray(rawDetails) || rawDetails.length === 0)) {
    toast.error("Data LHK Sublim tidak ditemukan.");
    return initialData;
  }

  const firstRow = Array.isArray(rawDetails) && rawDetails.length > 0 ? rawDetails[0] : {};

  // Ambil tanggal dari header atau firstRow
  const rawTanggal = headerData?.Tanggal || headerData?.tanggal || firstRow.Tanggal || firstRow.tanggal;
  let tanggalTerformat = format(new Date(), "yyyy-MM-dd");

  if (rawTanggal) {
    const s = String(rawTanggal).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      tanggalTerformat = s.substring(0, 10);
    } else {
      const parsed = new Date(rawTanggal);
      if (!isNaN(parsed.getTime())) {
        tanggalTerformat = format(parsed, "yyyy-MM-dd");
      }
    }
  }

  detailData.value = rawDetails.map((d: any) => ({
    spk_nomor: d.Nomor_SPK || d.spk_nomor || "",
    spk_nama: d.Nama_SPK || d.spk_nama || "",
    panjang: ensureMeter(parseFloat(d.Panjang || d.panjang) || 0),
    lebar: ensureMeter(parseFloat(d.Lebar || d.lebar) || 0),
    qty_order: parseFloat(d.J_Order || d.qty_order) || 0,
    sudah_cetak: parseFloat(d.Sudah_Cetak || d.sudah_cetak) || 0,
    jumlah_rtr: parseFloat(d.Jumlah || d.jumlah_rtr) || 0,
    jumlah_bs: parseFloat(d.Jumlah_bs || d.jumlah_bs) || 0,
    jumlah_meter: parseFloat(d.Jumlah_meter || d.jumlah_meter) || 0,
    poi_nomor: d.No_PO_Internal || d.poi_nomor || "",
    poi_size: d.Size || d.poi_size || "",
    lokasi: d.Lokasi || d.lokasi || "",
    jenis_bahan: d.Jenis_Bahan || d.jenis_bahan || "",
    no_realisasi: d.No_Realisasi || d.no_realisasi || "",
    bahan_awal: parseFloat(d.Bahan_Awal || d.bahan_awal) || 0,
    nama_komponen: d.Nama_Komponen || d.nama_komponen || "ALL SET",
    lhk_paperprint: d.Lhk_Paperprint || d.lhk_paperprint || "",
    keterangan: d.Keterangan || d.keterangan || "",
  }));

  const resultHeader = {
    nomor: headerData?.nomor || firstRow.Nomor || firstRow.nomor || nomorParams,
    tanggal: tanggalTerformat,
    gdgKode: headerData?.Kode_Gudang || firstRow.Kode_Gudang || firstRow.gdgKode || "GPM",
    gdgNama:
      headerData?.Nama_Gudang || firstRow.Nama_Gudang || firstRow.gdgNama || "GUDANG PRODUKSI SUBLIM",
  };

  formData.value = { ...resultHeader };
  return resultHeader;
};

// --- SUBMIT API PENYIMPANAN DATA ---
const submitApi = async () => {
  const payload = {
    header: formData.value,
    details: detailData.value.map((item) => ({
      nomor_spk: item.spk_nomor,
      nama_spk: item.spk_nama,
      panjang: item.panjang,
      lebar: item.lebar,
      j_order: item.qty_order,
      sudah_cetak: item.sudah_cetak || 0,
      jumlah_rtr: item.jumlah_rtr,
      jumlah_bs: item.jumlah_bs,
      lokasi: item.lokasi,
      jenis_bahan: item.jenis_bahan,
      no_realisasi: item.no_realisasi,
      bahan_awal: item.bahan_awal,
      poi_nomor: item.poi_nomor,
      poi_size: item.poi_size,
      nama_komponen: item.nama_komponen,
      lhk_paperprint: item.lhk_paperprint || "",
      keterangan: item.keterangan,
    })),
    existingNomor: isEditMode.value ? formData.value.nomor : null,
  };

  return await api.post("/mmt/lhk-sublim", payload);
};

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
} = useForm({
  menuId: "130",
  initialData,
  fetchApi,
  submitApi,
  successRouteName: "LhkSublimBrowse",
});

const formTitle = computed(() =>
  isEditMode.value
    ? `Ubah LHK Sublim: ${formData.value.nomor}`
    : "Baru LHK Sublim",
);

const isFormValid = computed(
  () => detailData.value.length > 0 && formData.value.gdgKode !== "",
);

const calculateSublimMeter = (item: any) => {
  if (
    item.jumlah_rtr === "" ||
    item.jumlah_rtr === null ||
    item.jumlah_rtr === undefined
  )
    item.jumlah_rtr = 0;
  if (
    item.jumlah_bs === "" ||
    item.jumlah_bs === null ||
    item.jumlah_bs === undefined
  )
    item.jumlah_bs = 0;

  const p = parseFloat(item.panjang) || 0;
  const l = parseFloat(item.lebar) || 0;
  const qtyRtr = parseFloat(item.jumlah_rtr) || 0;
  const qtyBs = parseFloat(item.jumlah_bs) || 0;

  item.jumlah_meter = p * l * (qtyRtr + qtyBs);

  const sisa = (item.qty_order || 0) - (item.sudah_cetak || 0);
  if (sisa > 0 && qtyRtr > sisa) {
    toast.warning(
      `Peringatan: Jumlah cetak RTR (${qtyRtr} pcs) melebihi sisa order (${sisa} pcs)!`,
    );
  }
};

// 🌟 FUNGSI HANDLE UNTUK PAPERPRINT
const handlePaperprintSelect = (payload: any) => {
  if (!payload) return;

  // Tangkap data array dari objek payload (berdasarkan mapping emit di komponen Lookup)
  const items: any[] = Array.isArray(payload?.data) ? payload.data : [];

  items.forEach((item: any, index: number) => {
    if (!item) return;

    // Memetakan nilai properti dari Paperprint ke Format Form Sublim
    const qtyOrder = parseFloat(
      item.spk_jmlorder || item.Qty_Order || item.Jumlah_Order || item.Jumlah || 0,
    );
    const sdhCetak = parseFloat(
      item.Sudah_Cetak || item.sudah_cetak || item.sudah_sublim || 0,
    );
    const sisa = qtyOrder - sdhCetak;
    const qtyPaperprint = parseFloat(
      item.jumlah_sublim || item.Jumlah || (sisa > 0 ? sisa : qtyOrder) || 0,
    );

    const panjang = ensureMeter(
      parseFloat(item.Panjang || item.spk_panjang) || 0,
    );
    const lebar = ensureMeter(parseFloat(item.Lebar || item.spk_lebar) || 0);

    const lhkNo = item.lhk_asal || item.Nomor_Paperprint || item.no_paperprint || item.Nomor || "";

    const mappedData = {
      poi_nomor: item.poi_nomor || item.Poi_Nomor || "",
      poi_size: item.poid_size || item.Size || item.Poi_Size || "",
      spk_nomor: item.spk_nomor || item.SPK || item.Nomor_SPK || "",
      spk_nama: item.spk_nama || item.Nama || item.Nama_SPK || "",
      nama_komponen: item.nama_komponen || item.Nama_Komponen || "ALL SET",
      lhk_paperprint: lhkNo,
      panjang: panjang,
      lebar: lebar,

      qty_order: qtyOrder || qtyPaperprint,
      sudah_cetak: sdhCetak,
      jumlah_rtr: qtyPaperprint,
      jumlah_bs: 0,

      barang_id: item.Barang_ID || "",
      jenis_bahan: item.Nama_Bahan || item.jenis_bahan || "",
      no_realisasi: item.Nomor_Realisasi || item.no_realisasi || "",
      bahan_awal: parseFloat(item.Bahan_Awal || 0),
      lokasi: "",
      jumlah_meter: 0,
      keterangan: item.lhk_asal ? `(Dari LHK: ${item.lhk_asal})` : "",
    };

    if (activeRowIdx.value !== -1 && index === 0) {
      detailData.value[activeRowIdx.value] = {
        ...detailData.value[activeRowIdx.value],
        ...mappedData,
      };
      calculateSublimMeter(detailData.value[activeRowIdx.value]);
    } else {
      detailData.value.push(mappedData);
      calculateSublimMeter(detailData.value[detailData.value.length - 1]);
    }
  });

  activeRowIdx.value = -1;
  lookup.paperprint = false;
};

const handleSpkSelect = (payload: any) => {
  if (!payload) return;

  const items: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [payload?.data || payload];

  items.forEach((spkItem: any, index: number) => {
    if (!spkItem) return;

    const nomorSpk =
      spkItem.spk_nomor ||
      spkItem.SPK ||
      spkItem.Spk ||
      spkItem.poi_spk_nomor ||
      spkItem.Nomor_SPK ||
      spkItem.No_SPK ||
      spkItem.Id ||
      "";

    const namaSpk =
      spkItem.spk_nama ||
      spkItem.Nama ||
      spkItem.nama_pekerjaan ||
      spkItem.Nama_SPK ||
      "No Name";

    const namaKomponen =
      spkItem.spk_komponen ||
      spkItem.Nama_Komponen ||
      spkItem.nama_komponen ||
      spkItem.Bhn_Name ||
      spkItem.bhn_name ||
      "ALL SET";

    const qtyOrderSpk = parseInt(
      spkItem.spk_jmlorder ||
        spkItem.Jumlah ||
        spkItem.Qty_Order ||
        spkItem.J_Order ||
        spkItem.spk_qty ||
        spkItem.jumlah ||
        0,
    );

    const sdhCetak = parseFloat(
      spkItem.Sudah_Cetak || spkItem.spk_sudah_cetak || spkItem.sudahcetak || 0,
    );

    const kurangAsli = parseFloat(
      spkItem.spk_kurang_cetak ||
        spkItem.Kurang_Cetak ||
        spkItem.kurang_cetak ||
        qtyOrderSpk - sdhCetak,
    );

    const rawP = parseFloat(
      spkItem.spk_panjang || spkItem.Panjang || spkItem.lsbd_panjang || 0,
    );
    const rawL = parseFloat(
      spkItem.spk_lebar || spkItem.Lebar || spkItem.lsbd_lebar || 0,
    );

    const mappedData = {
      poi_nomor:
        spkItem.poi_nomor || spkItem.Poi_Nomor || spkItem.lsbd_poi_nomor || "",
      poi_size:
        spkItem.poi_size ||
        spkItem.poid_size ||
        spkItem.Poi_Size ||
        spkItem.Size ||
        spkItem.lsbd_poid_size ||
        "",
      spk_nomor: nomorSpk,
      spk_nama: namaSpk,
      nama_komponen: namaKomponen,
      lhk_paperprint:
        spkItem.Nomor_Paperprint ||
        spkItem.lhk_asal ||
        spkItem.lhk_paperprint ||
        "",
      panjang: ensureMeter(rawP),
      lebar: ensureMeter(rawL),
      qty_order: qtyOrderSpk,
      sudah_cetak: sdhCetak,
      jumlah_rtr: kurangAsli > 0 ? kurangAsli : qtyOrderSpk,
      jumlah_bs: parseFloat(spkItem.jumlah_bs || 0),
      barang_id: spkItem.Barang_ID || spkItem.barang_id || "",
      jenis_bahan:
        spkItem.Nama_Bahan_Realisasi ||
        spkItem.Bahan ||
        spkItem.jenis_bahan ||
        "",
      no_realisasi:
        spkItem.Nomor_Realisasi && spkItem.Nomor_Realisasi !== "-"
          ? spkItem.Nomor_Realisasi
          : spkItem.no_realisasi || "",
      bahan_awal: parseFloat(spkItem.Bahan_Awal || spkItem.bahan_awal || 0),
      lokasi: spkItem.lokasi || spkItem.Lokasi || "",
      jumlah_meter: 0,
      keterangan:
        index > 0 ? `Bahan Alternatif ${index + 1}` : spkItem.keterangan || "",
      is_child_bahan: index > 0,
    };

    if (activeRowIdx.value !== -1 && index === 0) {
      detailData.value[activeRowIdx.value] = {
        ...detailData.value[activeRowIdx.value],
        ...mappedData,
      };
      calculateSublimMeter(detailData.value[activeRowIdx.value]);
    } else {
      detailData.value.push(mappedData);
      calculateSublimMeter(detailData.value[detailData.value.length - 1]);
    }
  });

  activeRowIdx.value = -1;
  lookup.spk = false;
};

const handlePoiSelect = async (payload: any) => {
  const dataPoi = payload?.data || payload;
  const poi = Array.isArray(dataPoi) ? dataPoi[0] : dataPoi;
  if (!poi) return;

  const rawP = parseFloat(poi.spk_panjang || poi.Panjang || 0);
  const rawL = parseFloat(poi.spk_lebar || poi.Lebar || 0);
  const qtyOrder = parseFloat(poi.poid_jumlah ?? poi.Qty_Order ?? poi.Jumlah ?? poi.sisa_qty ?? 0);
  const sdhCetak = parseFloat(poi.sudah_cetak || poi.Sudah_Cetak || 0);
  const sisa = parseFloat(poi.sisa_qty) || (qtyOrder - sdhCetak > 0 ? qtyOrder - sdhCetak : qtyOrder);

  const newRow = {
    poi_nomor: poi.poi_nomor || poi.Nomor_POI || "",
    poi_size: poi.poid_size || poi.poi_size || poi.Size || "",
    nama_komponen: poi.nama_komponen || poi.Nama_Komponen || "ALL SET",
    lhk_paperprint:
      poi.Nomor_Paperprint || poi.lhk_asal || poi.lhk_paperprint || "",
    spk_nomor: poi.poi_spk_nomor || poi.spk_nomor || "",
    spk_nama: poi.spk_nama || poi.Nama_SPK || "",
    panjang: ensureMeter(rawP),
    lebar: ensureMeter(rawL),
    qty_order: qtyOrder,
    sudah_cetak: sdhCetak,
    jumlah_rtr: sisa > 0 ? sisa : 0,
    jumlah_bs: 0,
    jumlah_meter: 0,
    lokasi: "",
    jenis_bahan: poi.nama_komponen || poi.poid_bhn_kode || "",
    barang_id: poi.barang_id || "",
    no_realisasi: poi.no_realisasi !== "-" ? poi.no_realisasi : "",
    bahan_awal: parseFloat(poi.bahan_awal) || 0,
    keterangan: "",
  };

  let targetIdx = activeRowIdx.value;

  if (activeRowIdx.value === -1) {
    detailData.value.push(newRow);
    targetIdx = detailData.value.length - 1;
  } else {
    detailData.value[activeRowIdx.value] = {
      ...detailData.value[activeRowIdx.value],
      ...newRow,
    };
  }

  if (targetIdx !== -1 && detailData.value[targetIdx]) {
    calculateSublimMeter(detailData.value[targetIdx]);
  }

  activeRowIdx.value = -1;
  lookup.poi = false;
};

const handleGudangSelect = (g: any) => {
  formData.value.gdgKode = g.Kode || g.Kode_Gudang;
  formData.value.gdgNama = g.Nama || g.Nama_Gudang;
  lookup.gudang = false;
};

const openMesinLookup = (idx: number) => {
  activeRowIdx.value = idx;
  lookup.mesin = true;
};

const handleMesinSelect = (m: any) => {
  if (activeRowIdx.value !== -1) {
    detailData.value[activeRowIdx.value].lokasi = m.Kode || m.kode_mesin;
  }
  lookup.mesin = false;
};

// 🌟 FUNGSI OPEN LOOKUP PAPERPRINT
const openPaperprintSearch = () => {
  activeRowIdx.value = -1;
  lookup.paperprint = true;
};
const openPaperprintSearchRow = (idx: number) => {
  activeRowIdx.value = idx;
  lookup.paperprint = true;
};

const openPoiSearch = () => {
  activeRowIdx.value = -1;
  lookup.poi = true;
};
const openPoiSearchRow = (idx: number) => {
  activeRowIdx.value = idx;
  lookup.poi = true;
};
const openSpkSearchRow = (idx: number) => {
  activeRowIdx.value = idx;
  lookup.spk = true;
};
const openSpkSearch = () => {
  activeRowIdx.value = -1;
  lookup.spk = true;
};
const removeRow = (idx: number) => detailData.value.splice(idx, 1);

onMounted(async () => {
  if (isEditMode.value) {
    await fetchApi();
  }
});
</script>

<style scoped>
.manksi-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
}
.manksi-table th {
  background: #1565c0;
  color: white;
  padding: 6px 8px;
  position: sticky;
  top: 0;
  z-index: 2;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
  font-weight: bold;
  white-space: nowrap;
  box-sizing: border-box;
}
.manksi-table th:first-child {
  border-left: 1px solid rgba(255, 255, 255, 0.2);
}
.manksi-table td {
  border-bottom: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
  padding: 0;
  height: 28px;
  white-space: nowrap;
  box-sizing: border-box;
}
.manksi-table td:first-child {
  border-left: 1px solid #e0e0e0;
}

/* Sticky Freeze Columns (No, PO Internal, Size, Komponen, No. SPK) */
.sticky-col-1 {
  position: sticky !important;
  left: 0px !important;
  width: 35px !important;
  min-width: 35px !important;
  max-width: 35px !important;
}

.sticky-col-2 {
  position: sticky !important;
  left: 35px !important;
  width: 130px !important;
  min-width: 130px !important;
  max-width: 130px !important;
}

.sticky-col-3 {
  position: sticky !important;
  left: 165px !important; /* 35 + 130 */
  width: 55px !important;
  min-width: 55px !important;
  max-width: 55px !important;
}

.sticky-col-4 {
  position: sticky !important;
  left: 220px !important; /* 165 + 55 */
  width: 110px !important;
  min-width: 110px !important;
  max-width: 110px !important;
}

.sticky-col-5 {
  position: sticky !important;
  left: 330px !important; /* 220 + 110 */
  width: 140px !important;
  min-width: 140px !important;
  max-width: 140px !important;
  box-shadow: 4px 0 6px -2px rgba(0, 0, 0, 0.22);
}

/* Layering z-index & backgrounds */
thead th.sticky-col-1,
thead th.sticky-col-2,
thead th.sticky-col-3,
thead th.sticky-col-4,
thead th.sticky-col-5 {
  top: 0 !important;
  z-index: 15 !important;
  background-color: #1565c0 !important;
}

thead th.sticky-col-5 {
  border-right: 2px solid #0d47a1 !important;
}

tbody td.sticky-col-1 {
  z-index: 5 !important;
  background-color: #ffffff !important;
}

tbody td.sticky-col-2 {
  z-index: 5 !important;
  background-color: #fcf8e3 !important;
}

tbody td.sticky-col-3 {
  z-index: 5 !important;
  background-color: #f5f5f5 !important;
}

tbody td.sticky-col-4 {
  z-index: 5 !important;
  background-color: #ffffff !important;
}

tbody td.sticky-col-5 {
  z-index: 5 !important;
  background-color: #fcf8e3 !important;
  border-right: 2px solid #1976d2 !important;
}

.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  padding: 0 6px;
  outline: none;
  background: transparent;
  box-sizing: border-box;
}
.font-mono {
  font-family: monospace, Consolas, "Courier New", sans-serif;
  letter-spacing: -0.2px;
}
.cell-input:focus {
  background: #e3f2fd;
}
.table-container {
  overflow: auto;
  max-height: calc(100vh - 220px);
}
.tr {
  text-align: right;
}
.fw-bold {
  font-weight: bold;
}
.cell-yellow {
  background-color: #fcf8e3 !important;
}
.text-xxs {
  font-size: 9px !important;
}
</style>
