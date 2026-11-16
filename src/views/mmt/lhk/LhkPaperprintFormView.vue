<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah' : 'Baru') + ' LHK Paperprint'"
    menu-id="5513"
    :icon="IconBuildingFactory"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- 1. SLOT HEADER ACTIONS: Tombol Aksi di Bagian Atas Form -->
    <template #header-actions>
      <v-btn
        size="small"
        color="orange-darken-3"
        variant="tonal"
        class="mr-2"
        :loading="isSaving"
        @click="validateBeforeSave('DRAFT')"
      >
        <v-icon start size="16">mdi-content-save-edit-outline</v-icon>
        Simpan Draft
      </v-btn>

      <v-btn
        size="small"
        color="primary"
        variant="elevated"
        class="mr-2"
        :loading="isSaving"
        @click="validateBeforeSave('POSTED')"
      >
        <v-icon start size="16">mdi-send-check-outline</v-icon>
        Simpan Posted
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

    <!-- SLOT KOLOM KIRI: Informasi Utama & Media Roll -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="text-caption font-weight-bold mb-3 text-primary">
          INFORMASI LHK PAPERPRINT
        </div>

        <v-text-field
          label="Nomor LHK"
          v-model="formData.lsb_nomor"
          readonly
          density="compact"
          variant="outlined"
          class="mb-2"
          hide-details
        />
        <v-text-field
          label="Tanggal"
          v-model="formData.lsb_tanggal"
          type="date"
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details
        />

        <v-row dense class="mb-4">
          <v-col cols="4">
            <v-text-field
              label="Shift"
              v-model.number="formData.lsb_shift"
              type="number"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>
          <v-col cols="4">
            <v-text-field
              label="Mesin"
              v-model="formData.mesin_nama"
              placeholder="Pilih Mesin..."
              variant="outlined"
              density="compact"
              color="primary"
              hide-details
              readonly
              append-inner-icon="mdi-magnify"
              style="cursor: pointer"
              @click="lookup.mesin = true"
              @click:append-inner="lookup.mesin = true"
            />
          </v-col>
          <v-col cols="4">
            <v-text-field
              label="Gudang"
              v-model="formData.lsb_gdg_kode"
              readonly
              density="compact"
              variant="outlined"
              append-inner-icon="mdi-magnify"
              hide-details
              style="cursor: pointer"
              @click="openGudangSearch"
              @click:append-inner="openGudangSearch"
            />
          </v-col>
        </v-row>

        <div class="text-caption font-weight-bold mb-2 text-success mt-4">
          INFORMASI MEDIA / ROLL
        </div>
        <v-text-field
          label="Scan Barcode Roll"
          v-model="formData.barcode_input"
          placeholder="Scan di sini..."
          prepend-inner-icon="mdi-barcode-scan"
          variant="outlined"
          density="compact"
          color="primary"
          class="mb-2"
          hide-details
          @keyup.enter="handleBarcodeScan"
          autocomplete="off"
        />
        <v-text-field
          label="Nama Barang"
          v-model="formData.brg_nama"
          readonly
          density="compact"
          variant="filled"
          class="mb-2"
          hide-details
        />
        <v-text-field
          label="Stok Awal Bahan (M)"
          :model-value="formData.Panjang_bahan"
          readonly
          density="compact"
          variant="filled"
          class="mb-2"
          hide-details
          suffix="M"
        />
        <v-text-field
          label="Lebar Bahan (M)"
          v-model="formData.Lebar_bahan"
          readonly
          density="compact"
          variant="filled"
          class="mb-2"
          hide-details
          suffix="M"
        />

        <v-row dense class="mt-6">
          <v-col cols="6">
            <v-btn
              block
              size="small"
              color="orange-darken-3"
              variant="tonal"
              style="text-transform: none; font-weight: bold"
              @click="validateBeforeSave('DRAFT')"
            >
              Set Draft
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn
              block
              size="small"
              color="primary"
              variant="elevated"
              style="text-transform: none; font-weight: bold"
              @click="validateBeforeSave('POSTED')"
            >
              Set Posted
            </v-btn>
          </v-col>
        </v-row>
      </div>
    </template>

    <!-- SLOT KOLOM KANAN: Tabel & Canvas Layout -->
    <template #right-column>
      <div class="d-flex flex-column fill-height">
        <v-card border flat class="d-flex flex-column table-card mb-4">
          <div class="pa-2 bg-blue-grey-lighten-5 d-flex align-center">
            <span
              class="text-subtitle-2 font-weight-bold text-blue-grey-darken-4"
            >
              Daftar Pekerjaan PaperPrint (Combine SPK)
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
              <v-btn
                color="success"
                size="small"
                prepend-icon="mdi-plus"
                style="height: 30px !important; text-transform: none"
                @click="openSpkSearch"
              >
                Tambah SPK
              </v-btn>
              <v-text-field
                v-model="formData.barcode_spk"
                placeholder="Scan Barcode SPK..."
                prepend-inner-icon="mdi-barcode-scan"
                variant="outlined"
                density="compact"
                hide-details
                style="max-width: 220px"
                @keyup.enter="handleSpkScan"
                autocomplete="off"
                :disabled="!formData.brg_kode"
              />
            </div>
          </div>

          <div class="table-container flex-grow-1">
            <table class="manksi-table">
              <thead>
                <tr>
                  <th width="35">No</th>
                  <th width="110">PO Internal</th>
                  <th width="60">Size PO</th>
                  <th width="120">Nomor SPK</th>
                  <th>Nama Pekerjaan</th>
                  <th width="110">Komponen</th>
                  <th width="55">Size</th>
                  <th width="55">P (M)</th>
                  <th width="55">L (M)</th>
                  <th width="110">Orientasi</th>
                  <th width="55">Pad(M)</th>
                  <th width="50">Order</th>
                  <th width="55">Sdh Ctk</th>
                  <th width="55">Kurang</th>

                  <!-- 🌟 KOLOM TILE (Pengganti Porsi / Pengatur Jumlah Per Baris/Tumpukan) -->
                  <th width="55" title="Jumlah Tile / Tumpukan per baris">
                    Tile
                  </th>

                  <th width="55">Cetak</th>
                  <th width="65" title="Total Hasil Fisik">Hasil Fisik</th>
                  <th width="80">Total M²</th>
                  <th width="35"></th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="(item, index) in formData.details" :key="index">
                  <!-- 1. No -->
                  <td class="text-center">{{ index + 1 }}</td>

                  <!-- 2. PO Internal -->
                  <td class="fw-bold px-1" style="background-color: #fcf8e3">
                    <div class="d-flex align-center">
                      <input
                        type="text"
                        v-model="item.poi_nomor"
                        placeholder="Pilih PO..."
                        readonly
                        class="cell-input cursor-pointer fw-bold text-amber-darken-4"
                        @click="openPoiSearchRow(index)"
                      />
                    </div>
                  </td>

                  <!-- 3. Size PO -->
                  <td class="text-center bg-grey-lighten-4">
                    {{ item.poi_size || "-" }}
                  </td>

                  <!-- 4. Nomor SPK -->
                  <td class="fw-bold text-blue-darken-4 px-2">
                    {{ item.spk_nomor }}
                  </td>

                  <!-- 5. Nama Pekerjaan -->
                  <td
                    class="px-2 text-truncate"
                    style="max-width: 140px"
                    :title="item.spk_nama"
                  >
                    {{ item.spk_nama }}
                  </td>

                  <!-- 6. Komponen -->
                  <td
                    class="px-2 text-truncate font-weight-bold"
                    style="max-width: 120px"
                    :class="
                      item.spk_komponen === 'ALL SET'
                        ? 'text-teal-darken-3'
                        : 'text-indigo-darken-3'
                    "
                  >
                    {{ item.spk_komponen || "ALL SET" }}
                  </td>

                  <!-- 7. SIZE (BAGIAN INI YANG SEBELUMNYA TERLEWAT / TERTUKAR) -->
                  <td class="text-center font-weight-bold bg-grey-lighten-4">
                    {{ item.Size || item.poid_size || "-" }}
                  </td>

                  <!-- 8. P (M) -->
                  <td>
                    <input
                      type="number"
                      v-model.number="item.spk_panjang"
                      class="cell-input tr font-weight-bold"
                      @input="recalculateCombine"
                    />
                  </td>

                  <!-- 9. L (M) -->
                  <td>
                    <input
                      type="number"
                      v-model.number="item.spk_lebar"
                      class="cell-input tr font-weight-bold"
                      @input="recalculateCombine"
                    />
                  </td>

                  <!-- 10. Orientasi -->
                  <td>
                    <select
                      v-model="item.orientasi"
                      class="cell-input"
                      @change="recalculateCombine"
                    >
                      <option value="lebar">L. SPK (Normal)</option>
                      <option value="panjang">P. SPK (Diputar)</option>
                    </select>
                  </td>

                  <!-- 11. Pad(M) -->
                  <td class="bg-blue-lighten-5">
                    <input
                      type="text"
                      :value="item.padding"
                      class="cell-input tr font-weight-bold"
                      @input="handlePaddingTableInput($event, item)"
                    />
                  </td>

                  <!-- 12. Order -->
                  <td
                    class="text-right px-2 text-grey-darken-1 font-weight-bold"
                  >
                    {{ item.spk_jmlorder || 0 }}
                  </td>

                  <!-- 13. Sdh Ctk -->
                  <td
                    class="text-right px-2 text-blue-darken-1 font-weight-bold"
                  >
                    {{ item.spk_sudah_cetak || 0 }}
                  </td>

                  <!-- 14. Kurang -->
                  <td
                    class="text-right px-2 text-red-darken-1 font-weight-bold"
                  >
                    {{ item.spk_kurang_cetak || 0 }}
                  </td>

                  <!-- 15. Tile -->
                  <td class="bg-amber-lighten-5">
                    <input
                      type="number"
                      v-model.number="item.tile"
                      class="cell-input text-center font-weight-bold text-orange-darken-4"
                      min="1"
                      @input="recalculateCombine"
                      @wheel="$event.target.blur()"
                    />
                  </td>

                  <!-- 16. Cetak -->
                  <td class="bg-yellow-lighten-5">
                    <input
                      type="number"
                      v-model.number="item.jumlah_sublim"
                      class="cell-input text-center font-weight-bold"
                      @input="recalculateCombine"
                      @wheel="$event.target.blur()"
                    />
                  </td>

                  <!-- 17. Hasil Fisik -->
                  <td
                    class="text-center font-weight-bold bg-grey-lighten-4 text-blue-darken-3"
                  >
                    {{ item.jumlah_sublim || 0 }} Pcs
                  </td>

                  <!-- 18. Total M² -->
                  <td class="text-right font-weight-bold px-2 text-deep-purple">
                    {{ (item.spk_jmlmeter || 0).toFixed(2).replace(".", ",") }}
                    M²
                  </td>

                  <!-- 19. Aksi -->
                  <td class="text-center">
                    <v-btn
                      size="x-small"
                      variant="text"
                      color="error"
                      @click="
                        formData.details.splice(index, 1);
                        recalculateCombine();
                      "
                    >
                      <v-icon size="14">mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- FOOTER SUMMARY: Kalkulasi Sisa Bahan & BS -->
          <div class="pa-3 bg-grey-lighten-4 border-t footer-container">
            <v-row dense align="center">
              <v-col cols="12" sm="5" class="border-e pr-4">
                <v-row no-gutters>
                  <v-col cols="6" class="border-e pr-2">
                    <span
                      class="text-caption text-grey-darken-1 font-weight-bold"
                    >
                      Sisa Otomatis:
                    </span>
                    <div
                      class="text-h6 font-weight-black lh-1"
                      :class="
                        sisaStokOtomatisM < 0 ? 'text-red' : 'text-success'
                      "
                    >
                      {{ sisaStokOtomatisM.toFixed(2) }} M
                    </div>
                    <span class="text-xxs text-grey d-block mt-2">
                      P. Pakai Sistem: {{ totalPanjangTerpakai.toFixed(2) }} M
                    </span>
                    <span class="text-xxs text-red d-block">
                      P. BS Terpotong:
                      {{
                        (parseFloat(formData.panjang_bs as any) || 0).toFixed(2)
                      }}
                      M
                    </span>
                  </v-col>
                  <v-col cols="6" class="pl-2">
                    <span
                      class="text-caption font-weight-bold text-blue-darken-3"
                    >
                      Sisa Manual (Fisik):
                    </span>
                    <v-text-field
                      v-model.number="formData.sisa_panjang_manual"
                      placeholder="Isi sisa meter..."
                      density="compact"
                      variant="outlined"
                      hide-details
                      type="number"
                      class="mt-1 bg-white"
                      suffix="M"
                    />
                  </v-col>
                </v-row>
              </v-col>
              <v-col cols="12" sm="3" class="border-e px-4">
                <span class="text-caption text-grey-darken-1 font-weight-bold">
                  Sisa Samping Lebar:
                </span>
                <div class="text-h6 text-teal-darken-2 font-weight-black">
                  {{ (formData.Lebar_bahan - totalLebarGabungan).toFixed(2) }} M
                </div>
              </v-col>
              <v-col cols="12" sm="4" class="pl-4">
                <span class="text-caption font-weight-bold text-red">
                  BS / Rusak (Mengurangi Bahan):
                </span>
                <v-row dense class="mt-1">
                  <v-col cols="6">
                    <v-text-field
                      :model-value="formData.panjang_bs"
                      label="P. BS (M)"
                      density="compact"
                      variant="outlined"
                      hide-details="auto"
                      placeholder="Contoh: 0.5"
                      class="bg-white"
                      @input="handleBsInput"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      :model-value="formData.lebar_bs"
                      label="L. BS (M)"
                      density="compact"
                      variant="outlined"
                      hide-details="auto"
                      placeholder="Contoh: 0.2"
                      class="bg-white"
                      @input="handleBsLebarInput"
                    />
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </div>
        </v-card>

        <!-- VISUALISASI CANVAS LAYOUT -->
        <v-card flat border class="flex-shrink-0">
          <v-card-title
            class="text-subtitle-2 bg-grey-lighten-3 pa-2 d-flex align-center"
          >
            Visualisasi Layout Produksi Sublim (Meter Base)
            <v-spacer />
            <v-btn
              size="x-small"
              color="indigo"
              class="mr-2"
              @click="autoFillLayout(false)"
            >
              <v-icon size="12" class="me-1">mdi-sparkles</v-icon> Auto Optimize
            </v-btn>
            <v-btn
              size="x-small"
              color="grey-darken-1"
              variant="outlined"
              @click="resetManualLayout"
            >
              <v-icon size="12" class="me-1">mdi-refresh</v-icon> Reset Position
            </v-btn>
          </v-card-title>
          <v-card-text class="pa-2 scroll-wrapper">
            <div class="roll-horizontal-wrapper">
              <div class="roll-material" :style="rollStyle">
                <div
                  v-for="(block, bIdx) in layoutRows"
                  :key="bIdx"
                  class="product-unit"
                  :style="{
                    width: `${block.w * SCALE}px`,
                    height: `${block.h * SCALE}px`,
                    position: 'absolute',
                    left: `${(manualOffsets[bIdx]?.x !== undefined ? manualOffsets[bIdx].x : block.x) * SCALE}px`,
                    top: `${(manualOffsets[bIdx]?.y !== undefined ? manualOffsets[bIdx].y : block.y) * SCALE}px`,
                    transform: `rotate(${manualOffsets[bIdx]?.rotation ?? 0}deg)`,
                    backgroundColor: '#e3f2fd',
                    border: '1px solid #2196f3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'move',
                    zIndex: 10,
                  }"
                  @mousedown="startDrag($event, bIdx)"
                  @dblclick="handleDoubleClick(bIdx)"
                >
                  <span
                    class="box-label"
                    :class="{ 'label-rotated': block.rotated }"
                  >
                    {{ block.label }}
                  </span>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </template>
  </BaseForm>

  <!-- MODAL LOOKUP -->
  <GudangLookupView
    :isVisible="isGudangLookupVisible"
    @close="isGudangLookupVisible = false"
    @select="handleGudangSelect"
  />

  <PoiLookupModal
    :isVisible="isPoiLookupVisible"
    @close="isPoiLookupVisible = false"
    @select="handlePoiSelect"
  />

  <MesinLookupView
    :is-visible="lookup.mesin"
    @close="lookup.mesin = false"
    @select="handleMesinSelect"
  />

  <SpkLookupView
    :isVisible="isSpkLookupVisible"
    @close="isSpkLookupVisible = false"
    @select="handleSpkSelect"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { format } from "date-fns";
import { useToast } from "vue-toastification";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import PoiLookupModal from "@/modal/PoInternalLookupView.vue";
import GudangLookupView from "@/modal/GudangLookupView.vue";
import SpkLookupView from "@/modal/SpkSublimLookupModal.vue";
import MesinLookupView from "@/modal/MesinLookupModal.vue";

import { IconBuildingFactory } from "@tabler/icons-vue";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const SCALE = 60;

const manualOffsets = reactive<
  Record<number, { x: number; y: number; rotation: number }>
>({});
const totalPanjangTerpakai = ref(0);
const totalLebarGabungan = ref(0);
const isGudangLookupVisible = ref(false);
const isSpkLookupVisible = ref(false);
const isPoiLookupVisible = ref(false);
const activePoiRowIdx = ref(-1);

const lookup = reactive({
  mesin: false,
  spk: false,
  gudang: false,
  poi: false,
});

const initialData = {
  lsb_nomor: "AUTO",
  lsb_tanggal: format(new Date(), "yyyy-MM-dd"),
  lsb_shift: 1,
  mesin_kode: "SB01",
  mesin_nama: "",
  lsb_gdg_kode: "GPM",
  gdg_nama: "",
  barcode_input: "",
  barcode_spk: "",
  brg_kode: "",
  brg_nama: "",
  Panjang_bahan: 0,
  Lebar_bahan: 0,
  sisa_panjang_manual: null as number | null,
  panjang_bs: "",
  lebar_bs: "",
  lstatus: "DRAFT",
  details: [] as any[],
};

const ensureMeter = (val: any) => {
  const num = parseFloat(val) || 0;
  // Jika nilai lebih dari 10, asumsikan dalam satuan centimeter dan ubah ke meter
  return num > 10 ? parseFloat((num / 100).toFixed(2)) : num;
};

const fetchApi = async () => {
  const nomorLhk = route.params.nomor as string;
  if (!nomorLhk) return initialData;

  const res = await api.get(`/mmt/lhk-paperprint/detail/${nomorLhk}`);
  const listData = res.data?.data || res.data || [];

  if (!Array.isArray(listData) || listData.length === 0) {
    toast.error("Data tidak ditemukan di database");
    return initialData;
  }

  const firstRow = listData[0];

  let tanggalTerformat = format(new Date(), "yyyy-MM-dd");
  const rawTanggal = firstRow.Tanggal || firstRow.lsb_tanggal;
  if (rawTanggal) {
    const parsedDate = new Date(rawTanggal);
    if (!isNaN(parsedDate.getTime())) {
      tanggalTerformat = format(parsedDate, "yyyy-MM-dd");
    }
  }

  return {
    lsb_nomor: firstRow.Nomor || firstRow.lsb_nomor || nomorLhk,
    lsb_tanggal: tanggalTerformat,
    lsb_shift: parseInt(firstRow.Shift || firstRow.lsb_shift) || 1,
    mesin_kode:
      firstRow.Kode_Mesin || firstRow.lmesin || firstRow.lsbd_lokasi || "SB01",
    mesin_nama: firstRow.Nama_Mesin || firstRow.mesin_nama || "",
    lsb_gdg_kode: firstRow.Kode_Gudang || firstRow.lsb_gdg_kode || "GPM",
    gdg_nama: firstRow.Nama_Gudang || firstRow.gdg_nama || "",
    barcode_input:
      firstRow.Barcode_Roll || firstRow.lsb_barcode || firstRow.Bahan || "",
    barcode_spk: "",
    brg_kode:
      firstRow.Kode_Bahan || firstRow.lsb_brg_kode || firstRow.Bahan || "",
    brg_nama: firstRow.Nama_Bahan || firstRow.brg_nama || "",

    Panjang_bahan: parseFloat(
      firstRow.panjang_awal ||
        firstRow.Panjang_Awal ||
        firstRow.lsbd_ambilbahan ||
        firstRow.Panjang_bahan ||
        0,
    ),
    Lebar_bahan: parseFloat(
      firstRow.Lebar_Bahan || firstRow.lebar_bahan || firstRow.Lebar_bahan || 0,
    ),

    sisa_panjang_manual:
      firstRow.sisa_panjang_manual !== undefined &&
      firstRow.sisa_panjang_manual !== null
        ? parseFloat(firstRow.sisa_panjang_manual)
        : null,

    panjang_bs: firstRow.lsb_panjang_bs ?? firstRow.Panjang_BS ?? "",
    lebar_bs: firstRow.lsb_lebar_bs ?? firstRow.Lebar_BS ?? "",
    lstatus: firstRow.STATUS || firstRow.lstatus || "DRAFT",

    details: listData.map((item: any) => {
      const order = parseInt(
        item.J_Order ||
          item.lsbd_jumlah_order ||
          item.Jumlah ||
          item.spk_jmlorder ||
          0,
      );
      const sdhCetak = parseFloat(
        item.Sudah_Cetak || item.spk_sudah_cetak || item.sudahcetak || 0,
      );
      const inputCetak = parseInt(
        item.Jumlah || item.jumlah_sublim || item.lsbd_jumlah || 0,
      );

      // Ambil nilai tile (fallback ke multiplier lama atau 1 jika kosong)
      const tileVal = parseInt(
        item.tile || item.multiplier || item.lsbd_multiplier || 1,
      );

      const kurangAsli =
        item.kurangcetak_asli !== undefined
          ? parseFloat(item.kurangcetak_asli)
          : order - sdhCetak + inputCetak * tileVal;

      return {
        poi_nomor:
          item.Poi_Nomor ||
          item.poi_nomor ||
          item.lsbd_poi_nomor ||
          item.No_PO_Internal ||
          "",
        poi_size:
          item.Poi_Size ||
          item.poi_size ||
          item.lsbd_poid_size ||
          item.Size ||
          "",
        spk_nomor: item.Nomor_SPK || item.spk_nomor || item.lsbd_spk_nomor,
        spk_nama: item.Nama_SPK || item.spk_nama || item.lsbd_spk_nama,
        spk_komponen:
          item.lsbd_komponen ||
          item.spk_komponen ||
          item.Komponen ||
          item.Nama_Komponen ||
          item.nama_komponen ||
          "ALL SET",
        spk_panjang: ensureMeter(
          item.Panjang || item.spk_panjang || item.lsbd_panjang || 0,
        ),
        spk_lebar: ensureMeter(
          item.Lebar || item.spk_lebar || item.lsbd_lebar || 0,
        ),
        spk_jmlorder: order,
        spk_sudah_cetak: sdhCetak,
        kurangcetak_asli: kurangAsli,
        tile: tileVal,
        jumlah_sublim: inputCetak,
        spk_kurang_cetak: kurangAsli - inputCetak * tileVal,
        padding: item.Padding || item.padding || "0.03",
        orientasi: item.Orientasi || item.orientasi || "lebar",
        spk_jmlmeter: parseFloat(
          item.Jumlah_Meter || item.spk_jmlmeter || item.lsbd_j_meter || 0,
        ),
      };
    }),
  };
};

const submitApi = async (): Promise<unknown> => {
  try {
    recalculateCombine();

    // Beri jeda/pastikan reaktifitas selesai jika recalculateCombine bersifat asinkron/nextTick
    await nextTick();

    const currentUser =
      authStore.user?.kdUser || authStore.user?.username || "SYSTEM";

    const sisaInput = formData.value.sisa_panjang_manual;

    // Debugging nilai yang tertangkap saat tombol simpan diklik
    console.log("DEBUG - Sisa Otomatis Ref:", sisaStokOtomatisM.value);
    console.log(
      "DEBUG - Total Panjang Terpakai Ref:",
      totalPanjangTerpakai.value,
    );

    const sisaOtomatisVal = parseFloat(
      Number(sisaStokOtomatisM.value || 0).toFixed(2),
    );

    const pPakaiSistemVal = parseFloat(
      Number(totalPanjangTerpakai.value || 0).toFixed(2),
    );

    const sisaFinalM =
      sisaInput !== null &&
      sisaInput !== undefined &&
      String(sisaInput).trim() !== ""
        ? parseFloat(Number(sisaInput).toFixed(2))
        : sisaOtomatisVal;

    const formattedDetails = formData.value.details.map((d: any) => ({
      ...d,
      lsbd_poi_nomor: d.poi_nomor || "",
      lsbd_poid_size: d.poi_size || "",
      spk_nomor: d.spk_nomor || d.Nomor_SPK || "",
      spk_nama: d.spk_nama || d.Nama_SPK || "",
      spk_komponen: d.spk_komponen || "ALL SET",
      lsbd_komponen: d.spk_komponen || "ALL SET",
      spk_jmlorder: parseInt(d.spk_jmlorder || 0),
      jumlah_sublim: parseInt(d.jumlah_sublim || 0),
      tile: parseInt(d.tile || 1),
      multiplier: parseInt(d.multiplier || 1),
      spk_panjang: parseFloat(d.spk_panjang || 0),
      spk_lebar: parseFloat(d.spk_lebar || 0),
      spk_jmlmeter: parseFloat(d.spk_jmlmeter || 0),
      lokasi: formData.value.mesin_kode,
      jenis_bahan: d.jenis_bahan || formData.value.brg_kode,
      lsbd_ambilbahan: parseFloat((formData.value.Panjang_bahan as any) || 0),

      // Dipaksa mengambil nilai global terbaru
      lsbd_panjang_pakai: pPakaiSistemVal,
      lsbd_sisameter: sisaFinalM,
    }));

    const payload = {
      header: {
        ...formData.value,
        kdUser: currentUser,
        barcode_input: (formData.value.barcode_input || "").trim(),
        brg_kode: (formData.value.brg_kode || "").trim(),
        lmesin: formData.value.mesin_kode,
        lstatus: formData.value.lstatus,
        panjang_bs: formData.value.panjang_bs
          ? parseFloat(formData.value.panjang_bs)
          : 0,
        lebar_bs: formData.value.lebar_bs
          ? parseFloat(formData.value.lebar_bs)
          : 0,
        sisa_panjang_manual: formData.value.sisa_panjang_manual,
        sisabahan: sisaFinalM,
        total_panjang_terpakai: pPakaiSistemVal,
      },
      details: formattedDetails,
      existingNomor: isEditMode.value ? formData.value.lsb_nomor : null,
    };

    console.log("FINAL PAYLOAD DIKIRIM:", payload);

    return await api.post("/mmt/lhk-paperprint", payload);
  } catch (error: any) {
    console.error("ERROR API:", error.response?.data || error.message);
    throw error;
  }
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
  fetchData,
} = useForm({
  menuId: "129",
  initialData,
  fetchApi,
  submitApi,
});

const sisaStokOtomatisM = computed(() => {
  const rawBs = formData.value.panjang_bs;
  const bsPanjang = rawBs && !isNaN(parseFloat(rawBs)) ? parseFloat(rawBs) : 0;
  return (
    (formData.value.Panjang_bahan || 0) - totalPanjangTerpakai.value - bsPanjang
  );
});

const isFormValid = computed(() => {
  return (
    formData.value.details.length > 0 &&
    formData.value.brg_kode !== "" &&
    formData.value.mesin_kode !== "" &&
    formData.value.details.every((d: any) => d.jumlah_sublim > 0)
  );
});

const validateBeforeSave = (status: string) => {
  if (!formData.value.mesin_kode) {
    return toast.error("Silakan pilih mesin terlebih dahulu!");
  }
  if (!formData.value.barcode_input || !formData.value.brg_kode) {
    return toast.error("Silakan scan barcode material roll terlebih dahulu!");
  }
  if (formData.value.details.length === 0) {
    return toast.error("Daftar pekerjaan/SPK tidak boleh kosong!");
  }
  if (
    formData.value.panjang_bs === null ||
    formData.value.panjang_bs === "" ||
    formData.value.lebar_bs === null ||
    formData.value.lebar_bs === ""
  ) {
    return toast.error(
      "Ukuran BS (Panjang & Lebar) wajib diisi! (Ketik 0 jika tidak ada BS).",
    );
  }
  if (status === "POSTED" && !isFormValid.value) {
    return toast.error("Cek kembali kelengkapan data atau QTY pekerjaan.");
  }

  formData.value.lstatus = status;
  showSaveDialog.value = true;
};

// 2. Fungsi Recalculate Combine (Perhitungan berdasarkan Tile & Cetak)
const recalculateCombine = () => {
  let subtotalSistemSemuaBaris = 0;

  formData.value.details.forEach((d: any) => {
    const pSpk = parseFloat(d.spk_panjang) || 0;
    const lSpk = parseFloat(d.spk_lebar) || 0;
    const cetakLayout = parseFloat(d.jumlah_sublim) || 0; // Qty Cetak
    const tileInput = parseInt(d.tile) || 1; // Jumlah Tile
    const padM = parseFloat(d.padding) || 0; // Padding (hanya untuk layout, tidak masuk M²)

    const order = parseFloat(d.spk_jmlorder) || 0;
    const sdhCetak = parseFloat(d.spk_sudah_cetak) || 0;

    if (d.kurangcetak_asli === undefined) {
      d.kurangcetak_asli = order - sdhCetak;
    }

    const totalFisikRiil = cetakLayout; // Hasil fisik = cetak
    d.spk_kurang_cetak = d.kurangcetak_asli - totalFisikRiil;

    // 🌟 RUMUS M² MURNI: P_SPK x L_SPK x QTY CETAK (Tanpa Padding)
    d.spk_jmlmeter = pSpk * lSpk * totalFisikRiil;

    // Hitung langkah maju roll (Panjang terpakai) dengan tetap memperhitungkan padding layout
    const jumlahLangkahMaju = Math.ceil(cetakLayout / Math.max(tileInput, 1));

    if (d.orientasi === "panjang") {
      // Jika orientasi diputar, lebar SPK ditambah padding layout ke roll
      subtotalSistemSemuaBaris += (lSpk + padM) * jumlahLangkahMaju;
    } else {
      // Jika orientasi normal, panjang SPK ditambah padding layout ke roll
      subtotalSistemSemuaBaris += (pSpk + padM) * jumlahLangkahMaju;
    }
  });

  totalPanjangTerpakai.value = Number(subtotalSistemSemuaBaris.toFixed(2));

  nextTick(() => {
    autoFillLayout(true);
  });
};

const autoFillLayout = (isSilent = false) => {
  Object.keys(manualOffsets).forEach(
    (key) => delete manualOffsets[Number(key)],
  );

  if (
    !formData.value.details ||
    formData.value.details.length === 0 ||
    formData.value.Lebar_bahan <= 0
  ) {
    totalLebarGabungan.value = 0;
    totalPanjangTerpakai.value = 0;
    return;
  }

  const maxLebarBahan = Number(formData.value.Lebar_bahan); // Batas maksimal lebar roll
  let unitGlobalIdx = 0;
  let maxOverallX = 0;
  let maxOverallY = 0; // 🌟 Ini akan menampung batas tinggi/lebar vertikal terjauh yang terpakai

  let currentX = 0;
  let currentY = 0;
  let maxColumnWidth = 0;

  formData.value.details.forEach((spk: any) => {
    const cetakQty = Number(spk.jumlah_sublim) || 0;
    const tileInput = Number(spk.tile) || 1;
    if (cetakQty <= 0) return;

    const padM = parseFloat(spk.padding) || 0;
    const pSpk = parseFloat(spk.spk_panjang) || 0;
    const lSpk = parseFloat(spk.spk_lebar) || 0;

    const unitW = spk.orientasi === "panjang" ? lSpk : pSpk + padM;
    const rawUnitH = spk.orientasi === "panjang" ? pSpk : lSpk + padM;

    const effectiveUnitH =
      tileInput > 0 && rawUnitH * tileInput > maxLebarBahan
        ? maxLebarBahan / tileInput
        : rawUnitH;

    let stackedCountInColumn = 0;

    for (let i = 0; i < cetakQty; i++) {
      if (stackedCountInColumn >= tileInput) {
        currentX += maxColumnWidth > 0 ? maxColumnWidth : unitW;
        currentY = 0;
        stackedCountInColumn = 0;
        maxColumnWidth = 0;
      }

      if (!manualOffsets[unitGlobalIdx]) {
        manualOffsets[unitGlobalIdx] = {
          x: currentX,
          y: currentY,
          rotation: spk.orientasi === "panjang" ? 90 : 0,
        };
      }

      const edgeRight = currentX + unitW;

      // 🌟 Hitung total batas bawah yang terpakai pada sumbu Y (lebar)
      const edgeBottom = currentY + rawUnitH;

      if (edgeRight > maxOverallX) maxOverallX = edgeRight;
      if (edgeBottom > maxOverallY) maxOverallY = edgeBottom;

      if (unitW > maxColumnWidth) {
        maxColumnWidth = unitW;
      }

      currentY += effectiveUnitH;
      stackedCountInColumn++;

      unitGlobalIdx++;
    }

    if (stackedCountInColumn > 0) {
      currentX += maxColumnWidth;
      currentY = 0;
      stackedCountInColumn = 0;
      maxColumnWidth = 0;
    }
  });

  totalPanjangTerpakai.value = Number(maxOverallX.toFixed(2));

  // 🌟 PERBAIKAN UTAMA: Simpan tinggi vertikal terpakai yang sebenarnya ke totalLebarGabungan
  totalLebarGabungan.value = Number(
    Math.min(maxOverallY, maxLebarBahan).toFixed(2),
  );

  if (!isSilent)
    toast.success(
      "Layout diperbarui: Sisa samping lebar terkalkulasi otomatis.",
    );
};

const handleBsInput = (event: any) => {
  let val = event.target.value.replace(",", ".");
  formData.value.panjang_bs = val;
  recalculateCombine();
};

const handleBsLebarInput = (event: any) => {
  formData.value.lebar_bs = event.target.value.replace(",", ".");
};

const handlePaddingTableInput = (event: any, item: any) => {
  item.padding = event.target.value.replace(",", ".");
  recalculateCombine();
};

const startDrag = (event: MouseEvent, idx: number) => {
  const startX = event.clientX;
  const startY = event.clientY;
  const initialX = manualOffsets[idx]?.x ?? 0;
  const initialY = manualOffsets[idx]?.y ?? 0;

  const onMouseMove = (e: MouseEvent) => {
    const dx = (e.clientX - startX) / SCALE;
    const dy = (e.clientY - startY) / SCALE;

    manualOffsets[idx] = {
      x: initialX + dx,
      y: initialY + dy,
      rotation: manualOffsets[idx]?.rotation ?? 0,
    };

    let maxRight = 0;
    let maxBottom = 0;

    layoutRows.value.forEach((block: any, bIndex: number) => {
      const posX =
        manualOffsets[bIndex]?.x !== undefined
          ? manualOffsets[bIndex].x
          : block.x;
      const posY =
        manualOffsets[bIndex]?.y !== undefined
          ? manualOffsets[bIndex].y
          : block.y;

      const edgeRight = posX + block.w;
      const edgeBottom = posY + block.h;

      if (edgeRight > maxRight) maxRight = edgeRight;
      if (edgeBottom > maxBottom) maxBottom = edgeBottom;
    });

    totalPanjangTerpakai.value = Number(maxRight.toFixed(2));
    totalLebarGabungan.value = Number(maxBottom.toFixed(2));
  };

  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const handleDoubleClick = (idx: number) => {
  if (manualOffsets[idx]) {
    manualOffsets[idx].rotation = (manualOffsets[idx].rotation + 90) % 360;
  }
};

const resetManualLayout = () => {
  Object.keys(manualOffsets).forEach(
    (key) => delete manualOffsets[Number(key)],
  );
  recalculateCombine();
};

const layoutRows = computed(() => {
  const blocks: any[] = [];
  formData.value.details.forEach((spk: any) => {
    const padM = parseFloat(spk.padding) || 0;
    const cetakQty = parseInt(spk.jumlah_sublim) || 0;

    const unitW =
      spk.orientasi === "panjang" ? spk.spk_lebar : spk.spk_panjang + padM;
    const unitH =
      spk.orientasi === "panjang" ? spk.spk_panjang + padM : spk.spk_lebar;

    for (let i = 0; i < cetakQty; i++) {
      blocks.push({
        label: `${spk.spk_nomor} (#${i + 1})`,
        w: unitW,
        h: unitH,
        x: 0,
        y: 0,
        rotated: spk.orientasi === "panjang",
      });
    }
  });
  return blocks;
});

const rollStyle = computed(() => ({
  height: `${formData.value.Lebar_bahan * SCALE}px`,
  width: `${Math.max(totalPanjangTerpakai.value, formData.value.Panjang_bahan) * SCALE}px`,
  position: "relative" as const,
  backgroundColor: "#ffffff",
  border: "2px solid #2c3e50",
  backgroundImage: "linear-gradient(90deg, #f1f1f1 1px, transparent 1px)",
  backgroundSize: `${SCALE}px 100%`,
}));

const handleBarcodeScan = async () => {
  const code = formData.value.barcode_input?.trim();
  if (!code) return;

  const regex = /^[a-zA-Z0-9-]+$/;
  if (!regex.test(code)) {
    toast.error("Format Barcode tidak valid!");
    clearBahan();
    return;
  }

  try {
    const res = await api.get(`/mmt/stok-gudang/${code}`);
    const responsePayload = res.data;

    if (!responsePayload || !responsePayload.success || !responsePayload.data) {
      toast.error("Barcode tidak terdaftar!");
      clearBahan();
      return;
    }

    const wrapperData = responsePayload.data;
    const info = wrapperData.data;
    const statusGudang = wrapperData.status;

    if (!info) {
      toast.error("Detail material kosong atau stok habis!");
      clearBahan();
      return;
    }

    formData.value.brg_kode = info.Kode || info.Barcode || "";
    formData.value.brg_nama =
      info.Nama_Bahan || info.Nama_Barang || info.Nama || "";

    if (!isEditMode.value || !formData.value.Panjang_bahan) {
      formData.value.Panjang_bahan = parseFloat(info.Sisa_Panjang) || 0;
    }

    formData.value.Lebar_bahan = parseFloat(info.Lebar) || 0;

    if (statusGudang === "READY") {
      formData.value.lsb_gdg_kode = info.Kode_Gudang || "GPM";
      toast.success("Material Ready di Gudang Produksi (GPM)");
    } else {
      // WAJIB GPM: tolak + kosongkan agar bahan tak bisa dipakai LHK.
      toast.error(
        `⛔ Barang masih di gudang ${info?.Kode_Gudang || "lain"}! Silahkan masukkan ke gudang produksi (GPM) terlebih dahulu.`,
      );
      clearBahan();
      return;
    }

    recalculateCombine();
  } catch (e) {
    toast.error("Gagal memuat data barcode");
    clearBahan();
  }
};

const openPoiSearch = () => {
  activePoiRowIdx.value = -1;
  isPoiLookupVisible.value = true;
};

const openPoiSearchRow = (idx: number) => {
  activePoiRowIdx.value = idx;
  isPoiLookupVisible.value = true;
};

const handlePoiSelect = (poiData: any) => {
  if (!poiData) return;
  // Dukung 1 PO → banyak size (seperti SPK): data bisa array
  const rawItems: any[] = Array.isArray(poiData)
    ? poiData
    : Array.isArray(poiData?.data)
      ? poiData.data
      : poiData?.data
        ? [poiData.data]
        : [poiData];
  if (rawItems.length === 0 || !rawItems[0]) return;

  let added = 0;
  let skipped = 0;
  const currentDetails = formData.value.details || [];

  for (const rawItem of rawItems) {
    if (!rawItem) continue;
    const targetPoiNomor = rawItem.poi_nomor || rawItem.Nomor_POI || rawItem.poiNomor || rawItem.poi_nomor;
    const targetPoiSize = rawItem.poid_size || rawItem.poi_size || rawItem.Size || "";
    const targetSpkNomor = rawItem.poi_spk_nomor || rawItem.spk_nomor || rawItem.Nomor_SPK || "";
    const targetKomponen = rawItem.spk_komponen || rawItem.Nama_Komponen || rawItem.nama_komponen || rawItem.Bhn_Name || "ALL SET";

    const qtyOrder = parseInt(rawItem.spk_qty ?? rawItem.poid_jumlah ?? rawItem.Jumlah ?? rawItem.J_Order ?? 0);
    const sdhCetak = parseFloat(rawItem.Sudah_Cetak || rawItem.spk_sudah_cetak || rawItem.sudahcetak || 0);
    const sisaQty = parseInt(rawItem.sisa_qty ?? rawItem.Kurang_Cetak ?? qtyOrder - sdhCetak);

    // Cek duplikat: PO + SPK + Size + Komponen (seperti SPK)
    const dSize = targetPoiSize || "-";
    const isDup = currentDetails.some((d: any) => d.poi_nomor === targetPoiNomor && (d.spk_nomor || "") === (targetSpkNomor || "") && (d.poi_size || "-") === dSize && (d.spk_komponen || "ALL SET") === targetKomponen);
    // juga cek yang baru ditambahkan di loop ini
    const isDupInBatch = added > 0 && formData.value.details.some((d: any) => d.poi_nomor === targetPoiNomor && (d.poi_size || "-") === dSize && (d.spk_komponen || "ALL SET") === targetKomponen);
    if (isDup || isDupInBatch) { skipped++; continue; }

    const newRow = {
      poi_nomor: targetPoiNomor,
      poi_size: targetPoiSize,
      spk_nomor: targetSpkNomor || "",
      spk_nama: rawItem.spk_nama || rawItem.Nama_SPK || rawItem.Nama || rawItem.spk_nama || "No Name",
      spk_komponen: targetKomponen,
      spk_panjang: parseFloat(rawItem.spk_panjang || rawItem.Panjang || rawItem.panjang || 0),
      spk_lebar: parseFloat(rawItem.spk_lebar || rawItem.Lebar || rawItem.lebar || 0),
      spk_jmlorder: qtyOrder,
      spk_sudah_cetak: sdhCetak,
      kurangcetak_asli: sisaQty > 0 ? sisaQty : qtyOrder,
      spk_kurang_cetak: 0,
      multiplier: 1,
      jumlah_sublim: 0,
      padding: "0.03",
      orientasi: "lebar",
      spk_jmlmeter: 0,
    };
    newRow.spk_jmlmeter = newRow.spk_panjang * newRow.spk_lebar * (newRow.jumlah_sublim * newRow.multiplier);

    if (activePoiRowIdx.value !== -1 && formData.value.details[activePoiRowIdx.value]) {
      formData.value.details[activePoiRowIdx.value] = { ...formData.value.details[activePoiRowIdx.value], ...newRow };
      activePoiRowIdx.value = -1;
    } else {
      formData.value.details.push(newRow);
    }
    added++;
  }

  recalculateCombine();
  isPoiLookupVisible.value = false;
  activePoiRowIdx.value = -1;
  if (added > 0) toast.success(`Berhasil menambahkan PO Internal ${rawItems[0]?.poi_nomor || ""} — ${added} baris (size/komponen)`);
  if (skipped > 0) toast.warning(`${skipped} baris dilewati karena duplikat`);
};

const handleSpkScan = async () => {
  const code = formData.value.barcode_spk?.trim();
  if (!code) return;

  if (formData.value.details.some((d: any) => d.spk_nomor === code)) {
    toast.warning("SPK sudah ada di daftar.");
    formData.value.barcode_spk = "";
    return;
  }

  try {
    const res = await api.get(`/mmt/SPK/${code}`);
    let spkData = res.data?.data?.data || res.data?.data || res.data;
    if (Array.isArray(spkData)) {
      spkData = spkData[0];
    }

    if (spkData) {
      injectSpkObject(spkData, code);
      formData.value.barcode_spk = "";
    } else {
      toast.error("Data SPK tidak ditemukan!");
    }
  } catch (e: any) {
    toast.error("Gagal memuat barcode SPK");
  }
};

const handleSpkSelect = (payload: any) => {
  if (!payload) return;

  const items: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [payload?.data || payload];

  items.forEach((spkItem: any) => {
    if (!spkItem) return;

    let itemObj = spkItem;
    if (itemObj.data && !itemObj.Panjang && !itemObj.spk_panjang) {
      itemObj = itemObj.data;
    }

    const targetNomor =
      itemObj.spk_nomor ||
      itemObj.SPK ||
      itemObj.Spk ||
      itemObj.poi_spk_nomor ||
      itemObj.Nomor_SPK ||
      itemObj.No_SPK ||
      itemObj.Id;

    const targetKomponen =
      itemObj.spk_komponen ||
      itemObj.Nama_Komponen ||
      itemObj.nama_komponen ||
      "ALL SET";

    // 🌟 Ambil size dari objek item yang dipilih
    const targetSize =
      itemObj.Size ||
      itemObj.size ||
      itemObj.poid_size ||
      itemObj.spks_size ||
      itemObj.ukuran ||
      "-";

    const currentDetails = formData.value.details || [];

    // 🌟 VALIDASI GABUNGAN: SPK + Komponen + Size
    const isDuplicate = currentDetails.some((d: any) => {
      const dSize = d.Size || d.poid_size || d.poi_size || "-";
      return (
        d.spk_nomor === targetNomor &&
        (d.spk_komponen || "ALL SET") === targetKomponen &&
        dSize === targetSize
      );
    });

    if (targetNomor && isDuplicate) {
      toast.warning(
        `SPK ${targetNomor} (${targetKomponen} - Size: ${targetSize}) sudah ada di daftar.`,
      );
      return;
    }

    injectSpkObject(itemObj);
  });

  isSpkLookupVisible.value = false;
};

const injectSpkObject = (spk: any, fallbackCode: string = "") => {
  if (!formData.value.details) {
    formData.value.details = [];
  }

  let item = spk;
  if (item && Array.isArray(item.data)) {
    item = item.data[0];
  } else if (Array.isArray(item)) {
    item = item[0];
  }

  if (!item) return;

  const nomorSpk =
    item.SPK ||
    item.spk_nomor ||
    item.Spk ||
    item.poi_spk_nomor ||
    item.Nomor_SPK ||
    item.No_SPK ||
    item.Id ||
    fallbackCode;

  const namaSpk =
    item.spk_nama ||
    item.Nama ||
    item.nama_pekerjaan ||
    item.Nama_SPK ||
    "No Name";

  const namaKomponen =
    item.spk_komponen ||
    item.Nama_Komponen ||
    item.nama_komponen ||
    item.Bhn_Name ||
    item.bhn_name ||
    "ALL SET";

  const resolvedSize =
    item.Size ||
    item.size ||
    item.poid_size ||
    item.spks_size ||
    item.ukuran ||
    item.Ukuran ||
    "-";

  const qtyOrderSpk = parseInt(
    item.spk_jmlorder ||
      item.Jumlah ||
      item.Qty_Order ||
      item.J_Order ||
      item.spk_qty ||
      item.jumlah ||
      0,
  );
  const sdhCetak = parseFloat(
    item.Sudah_Cetak || item.spk_sudah_cetak || item.sudahcetak || 0,
  );
  const kurangAsli = parseFloat(
    item.spk_kurang_cetak ||
      item.Kurang_Cetak ||
      item.kurang_cetak ||
      qtyOrderSpk - sdhCetak,
  );

  // 🌟 PENANGKAPAN PANJANG & LEBAR YANG LEBIH KUAT
  const rawP = parseFloat(
    item.spk_panjang ?? item.Panjang ?? item.panjang ?? item.ldg_panjang ?? 0,
  );
  const rawL = parseFloat(
    item.spk_lebar ?? item.Lebar ?? item.lebar ?? item.ldg_lebar ?? 0,
  );

  const newRow = {
    poi_nomor: item.poi_nomor || item.Poi_Nomor || "",
    poi_size: resolvedSize,
    Size: resolvedSize,
    poid_size: resolvedSize,

    spk_nomor: nomorSpk,
    spk_nama: namaSpk,
    spk_komponen: namaKomponen,
    spk_panjang: ensureMeter(rawP),
    spk_lebar: ensureMeter(rawL),
    spk_jmlorder: qtyOrderSpk,
    spk_sudah_cetak: sdhCetak,
    kurangcetak_asli: kurangAsli > 0 ? kurangAsli : qtyOrderSpk,
    spk_kurang_cetak: 0,
    multiplier: item.multiplier || 1,
    jumlah_sublim: 0,
    padding: item.padding || "0.03",
    orientasi: item.orientasi || "lebar",
    spk_jmlmeter: 0,
  };

  const effectiveQty = newRow.jumlah_sublim * newRow.multiplier;
  newRow.spk_jmlmeter = newRow.spk_panjang * newRow.spk_lebar * effectiveQty;

  formData.value.details.push(newRow);
  recalculateCombine();
  toast.success(
    `Berhasil menambah SPK ${newRow.spk_nomor} [Size: ${resolvedSize}] (P: ${ensureMeter(rawP)}, L: ${ensureMeter(rawL)})`,
  );
};

const clearBahan = () => {
  formData.value.brg_nama = "";
  formData.value.brg_kode = "";
  formData.value.Panjang_bahan = 0;
  formData.value.Lebar_bahan = 0;
};

const openGudangSearch = () => {
  isGudangLookupVisible.value = true;
};

const handleGudangSelect = (gdg: any) => {
  formData.value.lsb_gdg_kode = gdg.Kode || gdg.Kode_Gudang;
  isGudangLookupVisible.value = false;
};

const openSpkSearch = () => {
  isSpkLookupVisible.value = true;
};

const handleMesinSelect = (mesin: any) => {
  formData.value.mesin_kode = mesin.Kode || mesin.id || mesin.kode_mesin || "";
  formData.value.mesin_nama =
    mesin.Nama || mesin.nama || mesin.nama_mesin || "";
  lookup.mesin = false;
  toast.success(`Mesin ${formData.value.mesin_nama} dipilih`);
};

onMounted(async () => {
  if (isEditMode.value) {
    await fetchData();
    if (formData.value.barcode_input) {
      await handleBarcodeScan();
    }
    recalculateCombine();
  }
});
</script>

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
  text-transform: uppercase;
  font-weight: bold;
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
  padding: 0 4px;
  outline: none;
  background: transparent;
}
.cell-input:focus {
  background: #e3f2fd;
}
.table-container {
  overflow: auto;
  max-height: 240px;
}
.tr {
  text-align: right;
}
.fw-bold {
  font-weight: bold;
}
.footer-container {
  border-top: 2px solid #bbb !important;
}
.scroll-wrapper {
  overflow-x: auto;
  background-color: #f8f9fa;
  min-height: 140px;
  max-height: 200px;
  border: 1px inset #ddd;
}
.product-unit {
  user-select: none;
  touch-action: none;
  transform-origin: center center;
}
.box-label {
  font-size: 9px;
  font-weight: bold;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  padding: 2px;
}
.label-rotated {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}
</style>
