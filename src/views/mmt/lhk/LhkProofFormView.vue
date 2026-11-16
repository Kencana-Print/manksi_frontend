<template>
  <PageLayout :title="formTitle" icon="mdi-printer-3d-nozzle-alert-outline">
    <template #header-actions>
      <v-btn
        size="small"
        color="orange-darken-2"
        @click="handleSave('DRAFT')"
        :loading="isSaving"
        :disabled="isSaving || !isFormValid"
      >
        <v-icon start>mdi-file-clock</v-icon> Simpan Sementara
      </v-btn>

      <v-btn
        size="small"
        color="primary"
        @click="handleSave('POSTED')"
        :loading="isSaving"
        :disabled="isSaving || !isFormValid"
        class="ml-2"
      >
        <v-icon start>mdi-content-save-check</v-icon> Simpan Hasil
      </v-btn>

      <v-btn
        size="small"
        @click="handleCancel"
        :disabled="isSaving"
        class="ml-2"
      >
        <v-icon start>mdi-close</v-icon> Batal
      </v-btn>
    </template>

    <div class="form-grid-container">
      <div class="left-column">
        <v-card class="mb-3" flat border>
          <v-card-title
            class="text-subtitle-2 pa-2 custom-header-blue text-white"
          >
            Informasi LHK Proofing
          </v-card-title>
          <v-card-text class="pa-3">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  label="Nomor LHK"
                  v-model="formData.nomor"
                  readonly
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-3 bg-grey-lighten-4 custom-label-blue"
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  label="Tanggal"
                  v-model="formData.tanggal"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-3 custom-label-blue"
                />
              </v-col>

              <v-col cols="6">
                <v-text-field
                  label="Shift"
                  v-model.number="formData.shift"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-3 custom-label-blue"
                />
              </v-col>

              <v-col cols="6">
                <v-text-field
                  label="Operator"
                  v-model="formData.operator"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-3 custom-label-blue"
                />
              </v-col>

              <v-col cols="12">
                <v-select
                  label="Jenis LHK"
                  v-model="formData.jenis"
                  :items="jenisOptions"
                  item-title="text"
                  item-value="value"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-3 custom-label-blue"
                  @update:modelValue="recalculateCombine"
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  label="Mesin"
                  v-model="formData.mesin"
                  append-inner-icon="mdi-magnify"
                  @click:append-inner="openMesinSearch"
                  variant="outlined"
                  density="compact"
                  hide-details
                  readonly
                  style="cursor: pointer"
                  class="mb-3 custom-label-blue cell-yellow-input"
                  placeholder="Klik kaca pembesar untuk pilih mesin..."
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  label="Keterangan LHK"
                  v-model="formData.keterangan"
                  placeholder="Input keterangan tambahan di sini..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-3 custom-label-blue"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="mb-3" flat border>
          <v-card-title
            class="text-subtitle-2 pa-2 custom-header-blue text-white"
          >
            Scan Material (Roll Bahan)
          </v-card-title>

          <v-card-text class="pa-3">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  label="Scan Barcode Roll"
                  v-model="formData.barcode_input"
                  placeholder="Scan di sini..."
                  prepend-inner-icon="mdi-barcode-scan"
                  variant="outlined"
                  density="compact"
                  color="primary"
                  hide-details
                  class="mb-3 custom-label-blue cell-yellow-input"
                  @keyup.enter="handleBarcodeScan"
                  autocomplete="off"
                />
              </v-col>

              <v-col cols="6">
                <v-text-field
                  label="P. Bahan Awal (M)"
                  v-model="formData.Panjang_bahan"
                  readonly
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="bg-grey-lighten-4 text-end font-mono custom-label-blue"
                />
              </v-col>

              <v-col cols="6">
                <v-text-field
                  label="L. Bahan Awal (M)"
                  v-model="formData.Lebar_bahan"
                  readonly
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="bg-grey-lighten-4 text-end font-mono custom-label-blue"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </div>

      <div class="right-column">
        <v-card flat border class="d-flex flex-column mb-4">
          <v-card-title
            class="text-subtitle-1 d-flex align-center pa-2 custom-header-blue text-white"
          >
            Daftar Produksi Gabungan SPK
            <v-spacer />
            <div class="d-flex align-center ga-2">
              <v-btn
                size="small"
                color="success"
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
                flat
                class="bg-white rounded text-xs"
                style="width: 200px"
                @keyup.enter="handleSpkScan"
              />
            </div>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-data-table
              :headers="detailHeaders"
              :items="detailData"
              :items-per-page="-1"
              class="detail-entry-table modern-blue-table"
              hide-default-footer
              density="compact"
              fixed-header
            >
              <template #[`item.no`]="{ index }">{{ index + 1 }}</template>

              <!-- Panjang SPK: Editable jika jenis Paperprint (P) atau Sublim (S) -->
              <template #[`item.panjang_spk`]="{ item }">
                <v-text-field
                  v-if="formData.jenis === 'P' || formData.jenis === 'S'"
                  v-model.number="item.panjang_spk"
                  type="number"
                  density="compact"
                  variant="underlined"
                  hide-details
                  @update:modelValue="recalculateCombine"
                  class="text-end font-mono"
                  style="min-width: 60px"
                />
                <div v-else class="text-end font-mono pr-2 text-slate-700">
                  {{ item.panjang_spk || "0" }}
                </div>
              </template>

              <!-- Lebar SPK: Editable jika jenis Paperprint (P) atau Sublim (S) -->
              <template #[`item.lebar_spk`]="{ item }">
                <v-text-field
                  v-if="formData.jenis === 'P' || formData.jenis === 'S'"
                  v-model.number="item.lebar_spk"
                  type="number"
                  density="compact"
                  variant="underlined"
                  hide-details
                  @update:modelValue="recalculateCombine"
                  class="text-end font-mono"
                  style="min-width: 60px"
                />
                <div v-else class="text-end font-mono pr-2 text-slate-700">
                  {{ item.lebar_spk || "0" }}
                </div>
              </template>

              <template #[`item.padding`]="{ item }">
                <v-text-field
                  v-model.number="item.padding"
                  type="number"
                  density="compact"
                  variant="underlined"
                  @update:modelValue="recalculateCombine"
                  hide-details
                  class="text-end font-mono"
                />
              </template>

              <template #[`item.jumlah`]="{ item }">
                <div
                  class="text-end font-weight-medium text-slate-600 font-mono pr-2"
                >
                  {{ item.jumlah || "0" }}
                </div>
              </template>

              <template #[`item.luas_satuan`]="{ item }">
                <div class="text-end text-slate-500 font-mono pr-2">
                  {{ item.luas_satuan || "0.000" }}
                </div>
              </template>

              <template #[`item.total_luas`]="{ item }">
                <div
                  class="text-end font-weight-bold text-sky-700 font-mono pr-2"
                >
                  {{ item.total_luas || "0.00" }}
                </div>
              </template>

              <template #[`item.orientasi`]="{ item }">
                <v-select
                  v-model="item.orientasi"
                  :items="[
                    { title: 'L. SPK (Normal)', value: 'lebar' },
                    { title: 'P. SPK (Diputar)', value: 'panjang' },
                  ]"
                  density="compact"
                  variant="underlined"
                  hide-details
                  @update:modelValue="recalculateCombine"
                  class="text-xs"
                />
              </template>

              <template #[`item.tile`]="{ item }">
                <v-text-field
                  v-model.number="item.tile"
                  type="number"
                  density="compact"
                  variant="underlined"
                  @update:modelValue="recalculateCombine"
                  hide-details
                  class="text-end font-mono"
                />
              </template>

              <template v-for="n in 7" :key="n" #[`item.cetak${n}`]="{ item }">
                <v-text-field
                  v-model.number="item['cetak' + n]"
                  type="number"
                  density="compact"
                  variant="underlined"
                  @update:modelValue="recalculateCombine"
                  hide-details
                  class="text-end font-mono cetak-field"
                />
              </template>

              <template #[`item.totalcetak`]="{ item }">
                <div
                  :class="
                    item.totalcetak > item.kurangcetak_asli
                      ? 'text-red font-weight-bold'
                      : 'text-blue-darken-3 font-weight-bold'
                  "
                >
                  {{ item.totalcetak }}
                  <v-tooltip
                    v-if="item.totalcetak > item.kurangcetak_asli"
                    activator="parent"
                    location="top"
                  >
                    Melebihi sisa order (Sisa: {{ item.kurangcetak_asli }})
                  </v-tooltip>
                </div>
              </template>

              <template #[`item.sudahcetak`]="{ item }">
                <div class="text-end text-slate-500 font-mono pr-2">
                  {{ item.sudahcetak || 0 }}
                </div>
              </template>

              <template #[`item.kurangcetak`]="{ item }">
                <div
                  class="text-end font-weight-bold font-mono pr-2"
                  :class="item.kurangcetak < 0 ? 'text-red' : 'text-slate-700'"
                >
                  {{ item.kurangcetak }}
                </div>
              </template>

              <template #[`item.actions`]="{ index }">
                <v-btn
                  icon="mdi-delete-outline"
                  size="x-small"
                  color="red"
                  variant="text"
                  @click="removeDetail(index)"
                />
              </template>

              <template #bottom>
                <div class="pa-3 bg-slate-50 border-t footer-container">
                  <v-row dense align="center">
                    <v-col cols="12" sm="4" class="border-e px-3">
                      <v-row no-gutters>
                        <v-col cols="6" class="border-e pr-2">
                          <span
                            class="text-caption text-slate-500 font-weight-bold"
                            >Sisa Sistem (Otomatis):</span
                          >
                          <div class="text-h6 text-green-600 font-weight-black">
                            {{ sisaStokOtomatis.toFixed(2) }} M
                          </div>
                          <span class="text-xxs text-slate-400 block"
                            >P. Pakai:
                            {{ totalPanjangTerpakai.toFixed(2) }} M</span
                          >
                        </v-col>

                        <v-col cols="6" class="pl-2">
                          <span
                            class="text-caption font-weight-bold text-sky-700"
                            >Sisa Fisik (Manual):</span
                          >
                          <v-text-field
                            v-model.number="formData.sisa_panjang_manual"
                            placeholder="Input sisa..."
                            density="compact"
                            variant="outlined"
                            hide-details
                            type="number"
                            class="mt-1 bg-white cell-yellow-input"
                            suffix="M"
                          />
                          <span
                            class="text-xxs font-weight-bold text-primary block mt-1"
                          >
                            P. Pakai Final:
                            {{ displayPanjangTerpakai.toFixed(2) }} M
                          </span>
                        </v-col>
                      </v-row>
                    </v-col>

                    <v-col cols="12" sm="3" class="px-3 border-e">
                      <div class="d-flex flex-column">
                        <span
                          class="text-caption text-slate-500 font-weight-bold"
                          >Sisa Samping (Lebar):</span
                        >
                        <span class="text-h6 text-teal-700 font-weight-black">
                          {{
                            (formData.Lebar_bahan - totalLebarGabungan).toFixed(
                              2,
                            )
                          }}
                          M
                        </span>
                        <v-text-field
                          v-model.number="formData.sisa_lebar_manual"
                          label="Sisa Lebar Manual"
                          density="compact"
                          variant="underlined"
                          hide-details
                          type="number"
                        />
                      </div>
                    </v-col>

                    <v-col cols="12" sm="5" class="px-3">
                      <v-row dense>
                        <v-col cols="6" class="text-right border-e pr-3">
                          <span
                            class="text-caption text-amber-800 font-weight-bold"
                            >Estimasi Afal:</span
                          >
                          <div
                            class="text-subtitle-2 font-weight-bold text-amber-600"
                          >
                            {{ panjangSisaLayoutGanjil.toFixed(2) }} x
                            {{ lebarSisaLayoutGanjil.toFixed(2) }}
                          </div>
                          <div class="d-flex gap-1 mt-1">
                            <v-text-field
                              v-model.number="formData.panjang_nyempil_manual"
                              placeholder="P"
                              density="compact"
                              variant="underlined"
                              hide-details
                            />
                            <v-text-field
                              v-model.number="formData.lebar_nyempil_manual"
                              placeholder="L"
                              density="compact"
                              variant="underlined"
                              hide-details
                            />
                          </div>
                        </v-col>

                        <v-col cols="6" class="pl-3">
                          <span class="text-caption font-weight-bold text-red"
                            >Bahan Rusak (BS):</span
                          >
                          <v-text-field
                            v-model.number="formData.panjang_bs"
                            placeholder="P. BS"
                            density="compact"
                            variant="outlined"
                            hide-details="auto"
                            type="number"
                            class="mb-1 bg-white"
                          />
                          <v-text-field
                            v-model.number="formData.lebar_bs"
                            placeholder="L. BS"
                            density="compact"
                            variant="outlined"
                            hide-details="auto"
                            type="number"
                            class="bg-white"
                          />
                        </v-col>
                      </v-row>
                    </v-col>
                  </v-row>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>

        <v-card flat border class="overflow-hidden">
          <v-card-title
            class="text-subtitle-2 bg-slate-100 pa-2 d-flex align-center text-slate-700 border-b"
          >
            <v-icon start size="small">mdi-eye-outline</v-icon>
            Estimasi Canvas Nesting Layout Proofing
            <v-spacer />
            <v-btn
              size="x-small"
              color="indigo"
              variant="elevated"
              prepend-icon="mdi-auto-fix"
              class="mr-2"
              @click="autoFillLayout"
            >
              Auto Optimize
            </v-btn>
            <v-btn
              size="x-small"
              color="slate-600"
              variant="outlined"
              prepend-icon="mdi-refresh"
              @click="resetManualLayout"
            >
              Reset Posisi
            </v-btn>
          </v-card-title>

          <v-card-text class="pa-4 bg-slate-50">
            <div class="roll-horizontal-wrapper">
              <div class="roll-material" :style="rollStyle">
                <div
                  v-for="(item, idx) in layoutRows"
                  :key="idx"
                  class="product-unit"
                  :style="{
                    width: `${item.w * SCALE}px`,
                    height: `${item.h * SCALE}px`,
                    position: 'absolute',
                    left: `${(manualOffsets[idx]?.x !== undefined ? manualOffsets[idx].x : item.x) * SCALE}px`,
                    top: `${(manualOffsets[idx]?.y !== undefined ? manualOffsets[idx].y : item.y) * SCALE}px`,
                    transform: `rotate(${manualOffsets[idx]?.rotation ?? 0}deg)`,
                    backgroundColor: '#e0f2fe',
                    border: '1px solid #0284c7',
                    color: '#0369a1',
                  }"
                  @mousedown="startDrag($event, idx)"
                  @dblclick="handleDoubleClick(idx)"
                >
                  <span
                    class="box-label"
                    :class="{ 'label-rotated': item.rotated }"
                  >
                    {{ item.label }}
                  </span>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <MesinLookupView
      :isVisible="isMesinLookupVisible"
      @close="isMesinLookupVisible = false"
      @select="handleMesinSelect"
    />
    <SpkLookupView
      :isVisible="isSpkLookupVisible"
      @close="isSpkLookupVisible = false"
      @select="handleSpkSelect"
    />
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { format } from "date-fns";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import MesinLookupView from "@/modal/MesinLookupModal.vue";
import SpkLookupView from "@/modal/SpkMemoLookupModal.vue";
import PageLayout from "@/components/PageLayout.vue";
import { useAuthStore } from "@/stores/authStore";

// --- Config Core ---
const route = useRoute();
const router = useRouter();
const toast = useToast();
const API_BASE_URL = "/mmt/lhk-proof";
const SCALE = 60;

// --- States Handler ---
const isSaving = ref(false);
const isEditMode = ref(false);
const isMesinLookupVisible = ref(false);
const isSpkLookupVisible = ref(false);
const authStore = useAuthStore();
const manualOffsets = reactive<
  Record<number, { x: number; y: number; rotation: number }>
>({});

const formData = reactive({
  nomor: "AUTO",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  shift: 1,
  operator: "",
  mesin: "",
  barcode_input: "",
  Panjang_bahan: 0,
  Lebar_bahan: 0,
  sku_aktif: "",
  kode_bahan_aktif: "",
  sisa_panjang_manual: null as number | null,
  sisa_lebar_manual: null as number | null,
  panjang_nyempil_manual: null as number | null,
  lebar_nyempil_manual: null as number | null,
  panjang_bs: 0 as number | string,
  lebar_bs: 0 as number | string,
  barcode_spk: "",
  jenis: "M",
  keterangan: "",
});

const detailData = ref<any[]>([]);

const detailHeaders = [
  { title: "No", key: "no", width: "40px" },
  { title: "Nomor SPK", key: "nomor_spk", width: "110px" },
  { title: "Nama Produk", key: "nama_spk", width: "180px" },
  { title: "P. SPK", key: "panjang_spk", align: "end" as const, width: "65px" },
  { title: "L. SPK", key: "lebar_spk", align: "end" as const, width: "65px" },
  { title: "Orientasi", key: "orientasi", width: "125px" },
  { title: "Pad(cm)", key: "padding", width: "65px" },
  { title: "Order", key: "jumlah", align: "end", width: "65px" },
  { title: "Sdh Cetak", key: "sudahcetak", align: "end", width: "80px" },
  { title: "Kurang", key: "kurangcetak_asli", align: "end", width: "80px" },
  { title: "Total Input", key: "totalcetak", align: "end", width: "80px" },
  { title: "Luas (m²)", key: "total_luas", align: "end", width: "90px" },
  { title: "Tile", key: "tile", width: "55px" },
  ...Array.from({ length: 7 }, (_, i) => ({
    title: `C${i + 1}`,
    key: `cetak${i + 1}`,
    width: "45px",
  })),
  { title: "", key: "actions", width: "40px" },
];

const jenisOptions = [
  { text: "MMT", value: "M" },
  { text: "TEKSTIL", value: "T" },
  { text: "PAPERPRINT", value: "P" },
  { text: "SUBLIM", value: "S" },
];

const totalPanjangTerpakai = ref(0);
const totalLebarGabungan = ref(0);
const lebarSisaLayoutGanjil = ref(0);
const panjangSisaLayoutGanjil = ref(0);

const sisaStokOtomatis = computed(() => {
  return Math.max(0, formData.Panjang_bahan - totalPanjangTerpakai.value);
});

const displayPanjangTerpakai = computed(() => {
  if (
    formData.sisa_panjang_manual !== null &&
    formData.sisa_panjang_manual > 0
  ) {
    return formData.Panjang_bahan - formData.sisa_panjang_manual;
  }
  return totalPanjangTerpakai.value;
});

const updateSisaFromLayout = () => {
  let maxRight = 0;
  let maxBottom = 0;

  layoutRows.value.forEach((item, idx) => {
    const posX = manualOffsets[idx]?.x ?? item.x;
    const posY = manualOffsets[idx]?.y ?? item.y;
    if (posX + item.w > maxRight) maxRight = posX + item.w;
    if (posY + item.h > maxBottom) maxBottom = posY + item.h;
  });

  totalPanjangTerpakai.value = maxRight;
  totalLebarGabungan.value = maxBottom;

  const sisaLebar = formData.Lebar_bahan - maxBottom;
  if (sisaLebar > 0.1) {
    lebarSisaLayoutGanjil.value = sisaLebar;
    panjangSisaLayoutGanjil.value = maxRight;
  }
};

const autoFillLayout = (isSilent = false) => {
  Object.keys(manualOffsets).forEach((key) => delete manualOffsets[key]);
  if (detailData.value.length === 0 || formData.Lebar_bahan <= 0) return;

  const maxBahanLebar = Number(formData.Lebar_bahan);
  let unitGlobalIdx = 0;
  let currentStartX = 0;
  let currentY = 0;
  let maxColumnWidth = 0;
  let maxOverallX = 0;

  detailData.value.forEach((spk) => {
    const totalCetak = Number(spk.totalcetak) || 0;
    const tile = Number(spk.tile) || 1;
    if (totalCetak <= 0) return;

    const padM = (spk.padding * 2) / 100;
    const w =
      spk.orientasi === "lebar" ? spk.panjang_spk + padM : spk.lebar_spk + padM;
    const h =
      spk.orientasi === "lebar" ? spk.lebar_spk + padM : spk.panjang_spk + padM;
    const totalKolomSPK = Math.ceil(totalCetak / tile);
    let unitsPlaced = 0;

    for (let col = 0; col < totalKolomSPK; col++) {
      const tinggiBlokIni = tile * h;
      if (currentY + tinggiBlokIni > maxBahanLebar + 0.01) {
        currentStartX = maxOverallX;
        currentY = 0;
        maxColumnWidth = 0;
      }

      for (let row = 0; row < tile; row++) {
        if (unitsPlaced < totalCetak) {
          const posX = currentStartX + col * w;
          const posY = currentY + row * h;

          manualOffsets[unitGlobalIdx] = { x: posX, y: posY, rotation: 0 };
          if (posX + w > maxOverallX) maxOverallX = posX + w;

          unitGlobalIdx++;
          unitsPlaced++;
        }
      }
      if (w > maxColumnWidth) maxColumnWidth = w;
      if (col === totalKolomSPK - 1) currentY += tinggiBlokIni;
    }
  });

  updateSisaFromLayout();
  if (!isSilent) toast.success("Kombinasi layout optimal diterapkan!");
};

const startDrag = (event: MouseEvent, idx: number) => {
  const item = layoutRows.value[idx];
  const startX = event.clientX;
  const startY = event.clientY;
  const initialX = manualOffsets[idx]?.x ?? item.x;
  const initialY = manualOffsets[idx]?.y ?? item.y;
  const currentRot = manualOffsets[idx]?.rotation ?? 0;

  const onMouseMove = (e: MouseEvent) => {
    const dx = (e.clientX - startX) / SCALE;
    const dy = (e.clientY - startY) / SCALE;
    manualOffsets[idx] = {
      x: initialX + dx,
      y: initialY + dy,
      rotation: currentRot,
    };
    updateSisaFromLayout();
  };

  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const resetManualLayout = () => {
  Object.keys(manualOffsets).forEach((key) => delete manualOffsets[key]);
  toast.info("Layout dikembalikan ke posisi default");
};

const handleDoubleClick = (idx: number) => {
  if (!manualOffsets[idx]) {
    manualOffsets[idx] = {
      x: layoutRows.value[idx].x,
      y: layoutRows.value[idx].y,
      rotation: 0,
    };
  }
  manualOffsets[idx].rotation = (manualOffsets[idx].rotation || 0) + 90;
  updateSisaFromLayout();
};

const isFormValid = computed(() => {
  return !!(
    formData.operator &&
    formData.mesin &&
    formData.barcode_input &&
    detailData.value.length > 0
  );
});

const recalculateCombine = () => {
  totalPanjangTerpakai.value = 0;
  totalLebarGabungan.value = 0;
  if (!detailData.value.length || Number(formData.Lebar_bahan) <= 0) return;

  const maxRollHeight = Number(formData.Lebar_bahan);
  let currentXOffset = 0;
  let nextXOffset = 0;
  let currentUsedHeight = 0;

  detailData.value.forEach((d) => {
    let totalCetakInput = 0;
    for (let i = 1; i <= 7; i++) {
      totalCetakInput += parseFloat(d[`cetak${i}`]) || 0;
    }

    if (totalCetakInput > d.kurangcetak_asli) {
      toast.warning(`SPK ${d.nomor_spk} melebihi sisa order produksi.`);
    }

    d.totalcetak = totalCetakInput;
    d.kurangcetak =
      (parseFloat(d.jumlah) || 0) -
      (parseFloat(d.sudahcetak) || 0) -
      totalCetakInput;

    if (totalCetakInput <= 0 || (parseFloat(d.tile) || 0) <= 0) {
      d.luas_satuan = 0;
      d.total_luas = 0;
      return;
    }

    const panjang = parseFloat(d.panjang_spk) || 0;
    const lebar = parseFloat(d.lebar_spk) || 0;
    const tile = parseFloat(d.tile) || 0;
    const padM = ((parseFloat(d.padding) || 0) * 2) / 100;

    const dimMenyamping =
      d.orientasi === "lebar" ? lebar + padM : panjang + padM;
    const dimMemanjang =
      d.orientasi === "lebar" ? panjang + padM : lebar + padM;

    const luasSatuan = (panjang + padM) * (lebar + padM);
    d.luas_satuan = Number(luasSatuan.toFixed(3));
    d.total_luas = Number((luasSatuan * totalCetakInput).toFixed(2));

    const totalHeightSPK = tile * dimMenyamping;
    const totalWidthSPK = Math.ceil(totalCetakInput / tile) * dimMemanjang;

    if (currentUsedHeight + totalHeightSPK > maxRollHeight + 0.01) {
      currentXOffset = nextXOffset;
      currentUsedHeight = 0;
    }
    currentUsedHeight += totalHeightSPK;
    nextXOffset = Math.max(nextXOffset, currentXOffset + totalWidthSPK);
  });

  totalPanjangTerpakai.value = nextXOffset;
  nextTick(() => {
    autoFillLayout(true);
  });
};

const handleBarcodeScan = async () => {
  const code = formData.barcode_input?.trim();
  if (!code) return;

  try {
    const res = await api.get(`/mmt/stok-gudang/${code}`);
    const apiResult = res.data;

    if (apiResult.success && apiResult.data) {
      const wrapper = apiResult.data;
      const coreData = wrapper.data;

      // WAJIB GPM: bahan di gudang lain (mis. WH-16) tidak bisa dipakai LHK.
      const gdgBahan = String(coreData?.Kode_Gudang || "")
        .trim()
        .toUpperCase();
      if (wrapper.status !== "READY" || gdgBahan !== "GPM") {
        toast.error(
          `⛔ Barang masih di gudang ${coreData?.Kode_Gudang || gdgBahan || "lain"}! Silahkan masukkan ke gudang produksi (GPM) terlebih dahulu.`,
        );
        formData.sku_aktif = "";
        formData.kode_bahan_aktif = "";
        formData.Lebar_bahan = 0;
        formData.Panjang_bahan = 0;
        return;
      }
        formData.sku_aktif = coreData.Barcode || code;
        formData.kode_bahan_aktif = coreData.Kode;

        formData.Lebar_bahan = parseFloat(
          coreData.Lebar || coreData.mst_lebar || 0,
        );

        if (!isEditMode.value || !formData.Panjang_bahan) {
          let panjangMentah = parseFloat(coreData.Sisa_Panjang) || 0;

          if (formData.jenis === "T") {
            formData.Panjang_bahan = parseFloat(
              (panjangMentah * 0.9).toFixed(2),
            );
          } else {
            formData.Panjang_bahan = panjangMentah;
          }
        }

        recalculateCombine();
      }
    } catch (e) {
    console.error("Error scan barcode:", e);
  }
};

const handleSpkScan = async () => {
  const code = formData.barcode_spk?.trim();
  if (!code) return;

  if (detailData.value.some((d) => d.nomor_spk === code)) {
    toast.warning(`SPK ${code} sudah ada dalam antrean kerja.`);
    formData.barcode_spk = "";
    return;
  }

  try {
    isSaving.value = true;
    const res = await api.get(`/mmt/SPK/${code}`);
    const spk = res.data.data || res.data;

    if (spk) {
      const newEntry: any = {
        nomor_spk: spk.Spk || spk.Nomor || code,
        nama_spk: spk.Nama || spk.spk_nama || "",
        panjang_spk: parseFloat(spk.Panjang || 0),
        lebar_spk: parseFloat(spk.Lebar || 0),
        jumlah: parseFloat(spk.Jumlah || 0),
        sudahcetak: parseFloat(spk.Sudah_Cetak || 0),
        kurangcetak_asli: parseFloat(spk.Kurang_Cetak || 0),
        padding: 3,
        tile: 1,
        orientasi: "lebar",
        totalcetak: 0,
        luas_satuan: 0,
        total_luas: 0,
      };
      for (let i = 1; i <= 7; i++) newEntry[`cetak${i}`] = 0;

      detailData.value.push(newEntry);
      recalculateCombine();
      toast.success(`SPK ${code} berhasil dimasukkan.`);
      formData.barcode_spk = "";
    }
  } catch (e) {
    toast.error("Gagal mengambil data SPK.");
    formData.barcode_spk = "";
  } finally {
    isSaving.value = false;
  }
};

const handleSpkSelect = (spk: any) => {
  const code = spk.Spk || spk.SPK;
  if (detailData.value.some((d) => d.nomor_spk === code)) {
    toast.warning(`SPK ${code} sudah dimasukkan.`);
    return;
  }

  const pSpk = parseFloat(spk.Panjang) || 0;
  const lSpk = parseFloat(spk.Lebar) || 0;

  const newEntry: any = {
    nomor_spk: code,
    nama_spk: spk.Nama || spk.spk_nama || "",
    panjang_spk: pSpk === 0 ? 1.0 : pSpk,
    lebar_spk: lSpk === 0 ? 1.0 : lSpk,
    jumlah: parseFloat(spk.Jumlah || spk.Jumlah_Order || 1),
    sudahcetak: parseFloat(spk.Sudah_Cetak || 0),
    kurangcetak_asli: parseFloat(spk.Kurang_Cetak || 1),
    padding: 3,
    tile: 1,
    orientasi: "lebar",
    totalcetak: 0,
    luas_satuan: 0,
    total_luas: 0,
  };
  for (let i = 1; i <= 7; i++) newEntry[`cetak${i}`] = 0;

  detailData.value.push(newEntry);
  recalculateCombine();
  isSpkLookupVisible.value = false;
};

const loaddataall = async (nomor: string) => {
  isSaving.value = true;
  try {
    const response = await api.get(`${API_BASE_URL}/${nomor}`);
    const res = response.data.data || response.data;

    if (res && res.header) {
      const h = res.header;

      formData.nomor = h.lpr_nomor;
      formData.tanggal = h.lpr_tanggal;
      formData.jenis = h.lpr_jenis || "M";
      formData.shift = h.lpr_shift || 1;
      formData.operator = h.lpr_operator || "";
      formData.mesin = h.lpr_mesin || "";
      formData.barcode_input = h.lpr_barcode || "";
      formData.keterangan = h.lpr_keterangan || "";
      formData.panjang_bs = h.lpanjang_bs || 0;
      formData.lebar_bs = h.llebar_bs || 0;

      detailData.value = [];

      if (Array.isArray(res.details) && res.details.length > 0) {
        const firstDetail = res.details[0];

        let pAwalHistori = parseFloat(
          firstDetail.panjang_roll_awal ||
            firstDetail.ld_ambilbahan ||
            firstDetail.lprd_panjang_awal ||
            firstDetail.AmbilBahanPanjang ||
            h.Panjang_Awal ||
            0,
        );

        let lAwalHistori = parseFloat(
          firstDetail.AmbilBahanLebar || firstDetail.lprd_lebar || 0,
        );

        if (formData.jenis === "T") {
          pAwalHistori = parseFloat((pAwalHistori * 0.9).toFixed(2));
        }

        formData.Panjang_bahan = pAwalHistori;
        if (lAwalHistori > 0) {
          formData.Lebar_bahan = lAwalHistori;
        }

        formData.sisa_panjang_manual = null;
        formData.sisa_lebar_manual = null;
        formData.sku_aktif =
          firstDetail.barcode_detail ||
          firstDetail.lprd_barcode ||
          formData.barcode_input;
        formData.kode_bahan_aktif =
          firstDetail.Jenis_Bahan || firstDetail.lprd_bahan || "";

        res.details.forEach((d: any) => {
          const detailObj: any = {
            nomor_spk: d.Nomor_SPK || d.lprd_spk_nomor,
            nama_spk: d.Nama_SPK || d.spk_nama || "",
            panjang_spk: parseFloat(d.Panjang || d.lprd_panjang || 0),
            lebar_spk: parseFloat(d.Lebar || d.lprd_lebar || 0),
            padding: parseFloat(d.lprd_padd ?? d.Padding ?? 3),
            tile: d.Tile || d.lprd_tile || 1,
            jumlah: parseFloat(d.J_Order || d.lprd_j_order || 0),
            orientasi: d.Orientasi || d.lprd_orientasi || "lebar",
            sudahcetak: parseFloat(d.Sudah_Cetak_Sebelumnya || 0),
            kurangcetak_asli: parseFloat(d.Kurang_Cetak || 0),
            totalcetak: parseFloat(d.J_Proof || d.lprd_j_proof || 0),
            lokasi: d.Lokasi || d.lprd_lokasi || "",
            jenis_bahan: d.Jenis_Bahan || d.lprd_bahan || "",
            keterangan: d.Keterangan || d.lprd_keterangan || "",
          };

          for (let i = 1; i <= 7; i++) {
            detailObj[`cetak${i}`] = parseFloat(d[`cetak${i}`]) || 0;
          }

          detailData.value.push(detailObj);
        });
      }

      nextTick(async () => {
        if (formData.barcode_input) {
          await handleBarcodeScan();
        }
        recalculateCombine();
      });
    }
  } catch (error) {
    console.error("Error load data:", error);
    toast.error("Gagal memuat detail data proof lama.");
  } finally {
    isSaving.value = false;
  }
};

const handleSave = async (statusValue: "DRAFT" | "POSTED" = "DRAFT") => {
  recalculateCombine();

  if (Number(formData.Panjang_bahan) <= 0) {
    toast.error(
      "Gagal Simpan: Panjang bahan induk kosong. Harap scan barcode material.",
    );
    return;
  }

  if (formData.panjang_bs === "" || formData.lebar_bs === "") {
    toast.error(
      "Gagal Simpan: Ukuran reject/BS wajib diisi. Input angka 0 jika nihil.",
    );
    return;
  }

  if (!isFormValid.value) {
    toast.error(
      "Harap isi operator, mesin, barcode gulungan, dan minimal 1 SPK.",
    );
    return;
  }

  if (
    statusValue === "POSTED" &&
    !confirm(
      "Status POSTED akan memotong stok fisik bahan secara permanen. Lanjutkan?",
    )
  ) {
    return;
  }

  isSaving.value = true;

  try {
    const currentUser = authStore.user?.kdUser || "SYSTEM";

    let sisaPanjangFinal = sisaStokOtomatis.value;

    if (
      formData.sisa_panjang_manual !== null &&
      formData.sisa_panjang_manual !== undefined &&
      Number(formData.sisa_panjang_manual) > 0
    ) {
      sisaPanjangFinal = Number(formData.sisa_panjang_manual);
    }

    const sisaLebarFinal = formData.sisa_lebar_manual ?? formData.Lebar_bahan;

    const payload = {
      header: {
        nomor: formData.nomor,
        tanggal: formData.tanggal,
        gdgKode: "GPM",
        jenis: formData.jenis,
        shift: formData.shift,
        operator: formData.operator,
        mesin: formData.mesin,
        barcode_input: formData.barcode_input,
        keterangan: formData.keterangan,
        user: currentUser,
        panjang_bs: Number(formData.panjang_bs) || 0,
        lebar_bs: Number(formData.lebar_bs) || 0,
        lstatus: statusValue,
      },
      details: detailData.value.map((d) => {
        const detailEntry: any = {
          nomor_spk: d.nomor_spk,
          panjang: Number(d.panjang_spk) || 0,
          lebar: Number(d.lebar_spk) || 0,
          aktual_proof: Number(d.totalcetak) || 0,
          barcode_detail: formData.barcode_input,
          jenis_bahan: d.jenis_bahan || d.nomor_spk,
          lokasi: formData.mesin,
          keterangan: d.keterangan || "",
          panjang_roll_awal: Number(formData.Panjang_bahan) || 0,
          sisabahan: parseFloat(Number(sisaPanjangFinal).toFixed(2)),
          sisabahanlebar: parseFloat(Number(sisaLebarFinal).toFixed(2)),
          lprd_padd: Number(d.padding) || 0,
        };

        for (let i = 1; i <= 7; i++) {
          detailEntry[`cetak${i}`] = Number(d[`cetak${i}`]) || 0;
        }

        return detailEntry;
      }),
    };

    const response = await api.post("/mmt/lhk-proof", payload);
    if (response.data.success) {
      toast.success(
        "Dokumen LHK Proofing berhasil dibukukan dengan status: " + statusValue,
      );
      router.push({ name: 'LhkProofBrowse' });
    }
  } catch (error: any) {
    if (error.response) {
      toast.error(
        error.response.data?.message ||
          "Terjadi kesalahan pada server backend.",
      );
    } else {
      console.error("Client side error:", error);
      toast.error(
        "Gagal memproses data di aplikasi / halaman tujuan tidak ditemukan.",
      );
    }
  } finally {
    isSaving.value = false;
  }
};

const layoutRows = computed(() => {
  const blocks: any[] = [];
  if (detailData.value.length === 0 || formData.Lebar_bahan <= 0) return blocks;

  detailData.value.forEach((spk, spkIdx) => {
    if (spk.totalcetak <= 0 || spk.tile <= 0) return;
    const padM = (spk.padding * 2) / 100;
    const visualW =
      spk.orientasi === "lebar" ? spk.panjang_spk + padM : spk.lebar_spk + padM;
    const visualH =
      spk.orientasi === "lebar" ? spk.lebar_spk + padM : spk.panjang_spk + padM;

    for (let i = 0; i < spk.totalcetak; i++) {
      blocks.push({
        label: `SPK ${spkIdx + 1}`,
        w: visualW,
        h: visualH,
        x: 0,
        y: 0,
        rotated: spk.orientasi === "panjang",
      });
    }
  });
  return blocks;
});

const rollStyle = computed(() => ({
  height: `${formData.Lebar_bahan * SCALE}px`,
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#ffffff",
  border: "1px solid #999",
  padding: "2px",
  width: "max-content",
  alignItems: "flex-start",
}));

const openMesinSearch = () => (isMesinLookupVisible.value = true);
const openSpkSearch = () => (isSpkLookupVisible.value = true);
const handleMesinSelect = (m: any) => {
  formData.mesin = m.Kode || m.kode;
  isMesinLookupVisible.value = false;
};
const removeDetail = (idx: number) => {
  detailData.value.splice(idx, 1);
  recalculateCombine();
};
const handleCancel = () => router.back();

const formTitle = computed(() => {
  return isEditMode.value
    ? `Edit LHK Proofing: ${formData.nomor}`
    : "Input LHK Proofing Baru";
});

watch(
  () => formData.jenis,
  () => {
    if (formData.barcode_input) {
      handleBarcodeScan();
    }
  },
);

onMounted(() => {
  const nomorEdit = route.params.nomor;
  if (nomorEdit && nomorEdit !== "create" && nomorEdit !== "new") {
    isEditMode.value = true;
    loaddataall(nomorEdit as string);
  }
});
</script>

<style scoped>
.form-grid-container {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.left-column {
  width: 310px;
  flex-shrink: 0;
}
.right-column {
  flex: 1;
  min-width: 0;
}
.custom-header-blue {
  background-color: #0284c7 !important;
  color: #ffffff !important;
  font-weight: bold !important;
}
.custom-label-blue :deep(.v-label) {
  font-size: 11px;
  font-weight: 600;
  color: #334155 !important;
}
.modern-blue-table :deep(thead th) {
  background-color: #f0f9ff !important;
  border: 1px solid #bae6fd !important;
  color: #0369a1 !important;
  font-weight: bold !important;
  font-size: 11px !important;
  text-transform: uppercase !important;
  height: 34px !important;
}
.modern-blue-table :deep(td) {
  border: 0.5px solid #e2e8f0 !important;
  padding: 0 !important;
  height: 32px !important;
  color: #0f172a !important;
}
.cell-yellow {
  background-color: #fef08a !important;
}
.cell-yellow-input :deep(.v-field) {
  background-color: #fef08a/20 !important;
}
.table-input-inline :deep(.v-field__input) {
  padding: 4px 8px !important;
  min-height: 28px !important;
  font-size: 11.5px !important;
}
.cetak-field {
  width: 45px;
}
.footer-container {
  position: sticky;
  bottom: 0;
  z-index: 2;
  border-top: 2px solid #cbd5e1 !important;
}
.roll-material {
  height: v-bind('formData.Lebar_bahan * SCALE + "px"');
  position: relative;
  background-color: white;
  width: max-content;
  min-width: v-bind('totalPanjangTerpakai * SCALE + "px"');
  border: 1px solid #333;
  background-image:
    linear-gradient(90deg, #f1f5f9 1px, transparent 1px),
    linear-gradient(#f1f5f9 1px, transparent 1px);
  background-size: 10px 10px;
}
.product-unit {
  user-select: none;
  touch-action: none;
  transform-origin: center center;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  z-index: 10;
}
.box-label {
  font-size: 9px;
  font-weight: bold;
  pointer-events: none;
  white-space: nowrap;
}
.label-rotated {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}
.text-red-bold {
  color: #ef4444 !important;
  font-weight: bold;
}
</style>
