<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah' : 'Baru') + ' LHK Approval Cetak'"
    menu-id="5508"
    :icon="IconPhoto"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- CUSTOM HEADER ACTIONS -->
    <template #header-actions>
      <!-- Simpan Draft -->
      <v-btn
        size="small"
        color="orange-darken-3"
        variant="tonal"
        class="mr-2 text-none font-weight-medium"
        :loading="isSaving"
        @click="validateBeforeSave('DRAFT')"
      >
        <template #prepend>
          <IconDeviceFloppy :size="16" />
        </template>
        Simpan Draft
      </v-btn>

      <!-- Simpan Posted / Approve -->
      <v-btn
        size="small"
        color="primary"
        variant="elevated"
        class="mr-2 text-none font-weight-bold"
        :loading="isSaving"
        @click="validateBeforeSave('POSTED')"
      >
        <template #prepend>
          <IconSend :size="16" />
        </template>
        Simpan & Approve
      </v-btn>

      <!-- Batal -->
      <v-btn
        size="small"
        variant="outlined"
        class="mr-2 text-none"
        @click="showCancelDialog = true"
      >
        Batal
      </v-btn>

      <!-- Tutup -->
      <v-btn
        size="small"
        variant="tonal"
        color="error"
        class="text-none"
        @click="showCloseDialog = true"
      >
        <template #prepend>
          <IconX :size="15" />
        </template>
        Tutup
      </v-btn>
    </template>

    <!-- CONTENT -->
    <template #default>
      <div class="pa-2 approval-form-wrapper">
        <!-- Section 1: Informasi Header Rekap Cetak -->
        <div class="desktop-form-section mb-3">
          <div class="section-label">Informasi Utama Approval Cetak</div>
          <v-row dense class="mt-1">
            <v-col cols="12" md="2">
              <label class="text-caption font-weight-medium text-grey-darken-2">No. Rekap Cetak</label>
              <v-text-field
                :model-value="formData.nomor"
                readonly
                density="compact"
                variant="outlined"
                flat
                hide-details
                class="bg-grey-lighten-4 font-weight-bold"
                placeholder="AUTO"
              />
            </v-col>
            <v-col cols="12" md="2">
              <label class="text-caption font-weight-medium text-grey-darken-2">Tanggal Rekap</label>
              <v-text-field
                v-model="formData.tanggal"
                type="date"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <label class="text-caption font-weight-medium text-grey-darken-2">Mesin Utama</label>
              <v-text-field
                v-model="formData.mesin"
                readonly
                density="compact"
                variant="outlined"
                append-inner-icon="mdi-magnify"
                hide-details
                placeholder="Pilih Mesin..."
                class="cursor-pointer"
                @click="openMesinSearch(null)"
              />
            </v-col>
            <v-col cols="12" md="1">
              <label class="text-caption font-weight-medium text-grey-darken-2">Shift</label>
              <v-select
                v-model.number="formData.shift"
                :items="[1, 2, 3]"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2">
              <label class="text-caption font-weight-medium text-grey-darken-2">Operator / Admin</label>
              <v-text-field
                v-model="formData.operator"
                density="compact"
                variant="outlined"
                hide-details
                placeholder="Nama Operator/Admin"
              />
            </v-col>
            <v-col cols="12" md="2">
              <label class="text-caption font-weight-medium text-grey-darken-2">Gudang</label>
              <v-text-field
                v-model="formData.gdg_kode"
                density="compact"
                variant="outlined"
                hide-details
                readonly
                class="bg-grey-lighten-4"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Section 2: Pemakaian Tinta -->
        <div class="desktop-form-section mb-3">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="section-label mb-0 d-flex align-center">
              <IconPalette :size="16" class="mr-1 text-primary" />
              Pemakaian Tinta (Liter)
            </div>
            <v-btn
              size="x-small"
              color="primary"
              variant="tonal"
              @click="addInkRow"
            >
              <template #prepend>
                <IconPlus :size="14" />
              </template>
              Tambah Mesin Tinta
            </v-btn>
          </div>

          <v-table density="compact" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th style="width: 220px">Mesin</th>
                <th style="width: 140px" class="text-center">Cyan (C)</th>
                <th style="width: 140px" class="text-center">Magenta (M)</th>
                <th style="width: 140px" class="text-center">Yellow (Y)</th>
                <th style="width: 140px" class="text-center">Black (K)</th>
                <th style="width: 60px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(ink, idx) in inkDetails" :key="idx">
                <td>
                  <v-text-field
                    v-model="ink.msn_kode"
                    readonly
                    density="compact"
                    variant="outlined"
                    append-inner-icon="mdi-magnify"
                    hide-details
                    placeholder="Pilih Mesin..."
                    class="cursor-pointer"
                    @click="openMesinSearch(idx + 1000)"
                  />
                </td>
                <td>
                  <v-text-field
                    v-model.number="ink.c"
                    type="number"
                    step="0.01"
                    density="compact"
                    variant="outlined"
                    hide-details
                    color="cyan"
                    class="text-right"
                  />
                </td>
                <td>
                  <v-text-field
                    v-model.number="ink.m"
                    type="number"
                    step="0.01"
                    density="compact"
                    variant="outlined"
                    hide-details
                    color="pink"
                    class="text-right"
                  />
                </td>
                <td>
                  <v-text-field
                    v-model.number="ink.y"
                    type="number"
                    step="0.01"
                    density="compact"
                    variant="outlined"
                    hide-details
                    color="amber-darken-2"
                    class="text-right"
                  />
                </td>
                <td>
                  <v-text-field
                    v-model.number="ink.k"
                    type="number"
                    step="0.01"
                    density="compact"
                    variant="outlined"
                    hide-details
                    color="black"
                    class="text-right"
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    icon
                    size="x-small"
                    color="error"
                    variant="text"
                    :disabled="inkDetails.length <= 1"
                    @click="removeInkRow(idx)"
                  >
                    <IconTrash :size="16" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- Section 3: Daftar Rincian Pekerjaan Cetak -->
        <div class="desktop-form-section">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="section-label mb-0 d-flex align-center">
              <IconPrinter :size="16" class="mr-1 text-primary" />
              Daftar Pekerjaan Cetak ({{ detailData.length }} Item)
            </div>
            <div class="d-flex ga-2">
              <v-btn
                size="small"
                color="secondary"
                variant="outlined"
                class="text-none"
                @click="openSpkSearch(null)"
              >
                <template #prepend>
                  <IconPlus :size="14" />
                </template>
                Tambah SPK Manual
              </v-btn>
              <v-btn
                size="small"
                color="primary"
                variant="elevated"
                class="text-none font-weight-bold"
                @click="openLhkLookup"
              >
                <template #prepend>
                  <IconSearch :size="14" />
                </template>
                Pilih LHK Mesin (F1)
              </v-btn>
            </div>
          </div>

          <v-data-table
            :headers="detailHeaders"
            :items="detailData"
            :items-per-page="-1"
            item-value="_rowId"
            density="compact"
            fixed-header
            class="border rounded desktop-table table-scrollable"
            hide-default-footer
          >
            <template #[`item.no`]="{ index }">
              <span class="text-caption font-weight-medium">{{ index + 1 }}</span>
            </template>

            <template #[`item.lhk_rekap`]="{ item }">
              <span class="text-caption font-weight-bold text-grey-darken-2">
                {{ isEditMode ? ((item.raw || item).lhk_rekap || formData.nomor) : "NEW" }}
              </span>
            </template>

            <template #[`item.lhkmesin`]="{ item }">
              <v-chip
                size="x-small"
                :color="(item.raw || item).isManual ? 'grey-darken-1' : 'primary'"
                variant="tonal"
                class="font-weight-medium"
              >
                {{ (item.raw || item).lhkmesin || "MANUAL" }}
              </v-chip>
            </template>

            <template #[`item.shift`]="{ item }">
              <span class="text-caption">{{ (item.raw || item).shift }}</span>
            </template>

            <template #[`item.mesin`]="{ item, index }">
              <div
                class="d-flex align-center cursor-pointer text-primary text-caption font-weight-medium"
                @click="openMesinSearch(index)"
              >
                <span>{{ (item.raw || item).mesin || "-" }}</span>
                <IconSearch :size="12" class="ml-1 opacity-70" />
              </div>
            </template>

            <template #[`item.spk_nomor`]="{ item }">
              <span class="font-weight-bold text-primary text-caption">{{ (item.raw || item).spk_nomor }}</span>
            </template>

            <template #[`item.spk_nama`]="{ item }">
              <span class="text-caption" :title="(item.raw || item).spk_nama">{{ (item.raw || item).spk_nama }}</span>
            </template>

            <template #[`item.panjang_spk`]="{ item }">
              <span class="text-caption">{{ Number((item.raw || item).panjang_spk || 0).toFixed(2) }}</span>
            </template>

            <template #[`item.lebar_spk`]="{ item }">
              <span class="text-caption">{{ Number((item.raw || item).lebar_spk || 0).toFixed(2) }}</span>
            </template>

            <template #[`item.jumlah_cetak`]="{ item, index }">
              <v-text-field
                v-model.number="detailData[index].jumlah_cetak"
                type="number"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 90px"
                class="text-right"
                @update:model-value="calculateRowM2(index)"
              />
            </template>

            <template #[`item.toleransi`]="{ item }">
              <span class="text-caption font-weight-medium">{{ Number((item.raw || item).toleransi || 0).toFixed(4) }}</span>
            </template>

            <template #[`item.toleransi2`]="{ item }">
              <span class="text-caption font-weight-medium">{{ Number((item.raw || item).toleransi2 || 0).toFixed(4) }}</span>
            </template>

            <template #[`item.total_m2`]="{ item }">
              <span class="font-weight-bold text-caption text-blue-darken-2">
                {{ Number((item.raw || item).total_m2 || 0).toFixed(2) }} m²
              </span>
            </template>

            <template #[`item.actions`]="{ index }">
              <v-btn
                icon
                size="x-small"
                color="error"
                variant="text"
                @click="removeRow(index)"
              >
                <IconTrash :size="15" />
              </v-btn>
            </template>

            <!-- Total Baris Bawah -->
            <template #body.append v-if="detailData.length > 0">
              <tr class="bg-blue-lighten-5 font-weight-bold">
                <td colspan="9" class="text-end text-uppercase pr-4">Total:</td>
                <td class="text-right text-primary">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.jumlah_cetak) || 0), 0)
                      .toLocaleString()
                  }}
                </td>
                <td colspan="2"></td>
                <td class="text-right text-blue-darken-3">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.total_m2) || 0), 0)
                      .toFixed(2)
                  }} m²
                </td>
                <td></td>
              </tr>
            </template>
          </v-data-table>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- Modals -->
  <MesinLookupView
    :is-visible="isMesinLookupVisible"
    @close="isMesinLookupVisible = false"
    @select="handleMesinSelect"
  />

  <SpkLookupView
    :is-visible="isSpkLookupVisible"
    @close="isSpkLookupVisible = false"
    @select="handleSpkSelect"
  />

  <LhkMesinLookupModal
    :is-visible="isLhkLookupVisible"
    @close="isLhkLookupVisible = false"
    @select="handleLhkSelect"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { format } from "date-fns";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import MesinLookupView from "@/modal/MesinLookupModal.vue";
import SpkLookupView from "@/modal/SpkLookupModal.vue";
import LhkMesinLookupModal from "@/modal/LhkMesinLookupModal.vue";
import {
  IconPhoto,
  IconDeviceFloppy,
  IconSend,
  IconX,
  IconPlus,
  IconTrash,
  IconSearch,
  IconPrinter,
  IconPalette,
} from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

// --- State ---
const isLoading = ref(false);
const isSaving = ref(false);
const isEditMode = ref(false);
const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const pendingStatus = ref("POSTED");

const isLhkLookupVisible = ref(false);
const isMesinLookupVisible = ref(false);
const isSpkLookupVisible = ref(false);
const activeRowIndex = ref<number | null>(null);

const formData = reactive({
  nomor: "AUTO",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  gdg_kode: "GPM",
  shift: 1,
  operator: "",
  mesin: "",
});

const inkDetails = ref<any[]>([{ msn_kode: "", c: 0, m: 0, y: 0, k: 0 }]);
const detailData = ref<any[]>([]);

// --- Headers ---
const detailHeaders = [
  { title: "No", key: "no", width: "45px", sortable: false },
  { title: "No. LHK Cetak", key: "lhk_rekap", width: "130px" },
  { title: "No. LHK Mesin", key: "lhkmesin", width: "130px" },
  { title: "Shift", key: "shift", width: "65px", align: "center" as const },
  { title: "Mesin", key: "mesin", width: "95px" },
  { title: "No. SPK", key: "spk_nomor", width: "140px" },
  { title: "Nama Produk / Order", key: "spk_nama", minWidth: "180px" },
  { title: "Panjang", key: "panjang_spk", width: "80px", align: "end" as const },
  { title: "Lebar", key: "lebar_spk", width: "80px", align: "end" as const },
  { title: "Qty Cetak", key: "jumlah_cetak", width: "100px", align: "end" as const },
  { title: "Tol 1 (m)", key: "toleransi", width: "90px", align: "end" as const },
  { title: "Tol 2 (m)", key: "toleransi2", width: "90px", align: "end" as const },
  { title: "Meter (m²)", key: "total_m2", width: "100px", align: "end" as const },
  { title: "", key: "actions", width: "45px", sortable: false, align: "center" as const },
];

// --- Toleransi Formula ---
const calculateToleransi = (paddingAtas: number, paddingSamping: number) => {
  const padAtas = Number(paddingAtas) || 0;
  const padSamping = Number(paddingSamping) || 0;
  const tol1 = Number(((padAtas * 2) / 100).toFixed(4));
  const tol2 = Number(((padSamping * 2) / 100).toFixed(4));
  return { toleransi: tol1, toleransi2: tol2 };
};

// --- Handlers Tinta ---
const addInkRow = () => {
  inkDetails.value.push({ msn_kode: "", c: 0, m: 0, y: 0, k: 0 });
};

const removeInkRow = (index: number) => {
  if (inkDetails.value.length > 1) {
    inkDetails.value.splice(index, 1);
  }
};

const syncInkMachines = () => {
  const machines = Array.from(
    new Set(
      detailData.value
        .map((d) => d.mesin)
        .filter((m) => m && m !== "-" && m !== "MANUAL")
    )
  );

  machines.forEach((m) => {
    const exists = inkDetails.value.some((ink) => ink.msn_kode === m);
    if (!exists) {
      if (inkDetails.value.length === 1 && !inkDetails.value[0].msn_kode) {
        inkDetails.value[0].msn_kode = m;
      } else {
        inkDetails.value.push({ msn_kode: m, c: 0, m: 0, y: 0, k: 0 });
      }
    }
  });
};

// --- Handlers Lookup ---
const openLhkLookup = () => {
  isLhkLookupVisible.value = true;
};

const openMesinSearch = (index: number | null = null) => {
  activeRowIndex.value = index;
  isMesinLookupVisible.value = true;
};

const openSpkSearch = (index: number | null = null) => {
  activeRowIndex.value = index;
  isSpkLookupVisible.value = true;
};

const handleMesinSelect = (mesin: any) => {
  const kodeMesin = mesin.msn_kode || mesin.Kode;
  if (activeRowIndex.value !== null) {
    if (activeRowIndex.value >= 1000) {
      inkDetails.value[activeRowIndex.value - 1000].msn_kode = kodeMesin;
    } else if (detailData.value[activeRowIndex.value]) {
      detailData.value[activeRowIndex.value].mesin = kodeMesin;
    }
  } else {
    formData.mesin = kodeMesin;
  }
  isMesinLookupVisible.value = false;
  activeRowIndex.value = null;
  syncInkMachines();
};

const handleSpkSelect = (rawSpk: any) => {
  const spk = rawSpk?.raw || rawSpk;
  const p = parseFloat(spk.Panjang || spk.panjang || 0);
  const l = parseFloat(spk.Lebar || spk.lebar || 0);
  const padAtas = Number(spk.padding_atas ?? spk.Padding ?? 0);
  const padSamping = Number(spk.padding_samping ?? 0);
  const { toleransi, toleransi2 } = calculateToleransi(padAtas, padSamping);
  const effP = p + toleransi;
  const effL = l + toleransi2;

  const newRow = {
    _rowId: `spk-${Date.now()}-${Math.random()}`,
    lhk_rekap: isEditMode.value ? formData.nomor : "NEW",
    lhkmesin: "MANUAL",
    shift: formData.shift,
    mesin: formData.mesin || "-",
    spk_nomor: spk.SPK || spk.Spk || spk.spk_nomor || spk.Nomor || spk.NomorSPK || "-",
    spk_nama: spk.Nama || spk.spk_nama || spk.NamaOrder || spk.nama_spk || "-",
    panjang_spk: p,
    lebar_spk: l,
    jumlah_cetak: 1,
    toleransi,
    toleransi2,
    total_m2: Number((effP * effL * 1).toFixed(2)),
    isManual: true,
  };

  if (activeRowIndex.value !== null && detailData.value[activeRowIndex.value]) {
    detailData.value[activeRowIndex.value] = {
      ...detailData.value[activeRowIndex.value],
      ...newRow,
    };
    detailData.value = [...detailData.value];
  } else {
    detailData.value = [...detailData.value, newRow];
  }
  isSpkLookupVisible.value = false;
  activeRowIndex.value = null;
  syncInkMachines();
  toast.success("SPK Manual berhasil ditambahkan.");
};

const handleLhkSelect = async (selectedNomors: string[]) => {
  if (!selectedNomors.length) return;

  // Filter nomor yang sudah ada agar tidak terjadi duplikasi input
  const newNomors = selectedNomors.filter(
    (nomor) => !detailData.value.some((d) => d.lhkmesin === nomor)
  );

  const duplicateCount = selectedNomors.length - newNomors.length;
  if (duplicateCount > 0) {
    toast.info(`${duplicateCount} dokumen LHK sudah ada di daftar pengerjaan.`);
  }

  if (newNomors.length === 0) {
    isLhkLookupVisible.value = false;
    return;
  }

  isLoading.value = true;
  try {
    let res: any = null;
    try {
      const response = await api.get(`/mmt/lhk-cetak/detail-lookup`, {
        params: { nomor: newNomors.join(",") },
      });
      res = response.data?.data || response.data;
    } catch {
      // Fallback: ambil detail LHK per nomor jika endpoint batch lookup berbeda
      const detailsList: any[] = [];
      let headerData: any = null;
      for (const nomor of newNomors) {
        try {
          const singleRes = await api.get(`/mmt/lhk-cetak/details`, {
            params: { nomor },
          });
          const dtls =
            singleRes.data?.details ||
            singleRes.data?.data?.details ||
            singleRes.data ||
            [];
          if (Array.isArray(dtls)) {
            dtls.forEach((d: any) => {
              detailsList.push({
                ...d,
                referensi_lhk: nomor,
                spk_nomor: d.nomor_spk || d.Nomor_SPK || d.spk_nomor,
                nama_spk: d.nama_spk || d.Nama_SPK || d.spk_nama,
                totalcetak: d.totalcetak ?? d.Jml_Cetak ?? d.qty_cetak,
              });
            });
          }
        } catch (e) {
          console.warn(`Gagal memuat detail LHK ${nomor}:`, e);
        }
      }
      res = { header: headerData, details: detailsList };
    }

    if (res?.header) {
      if (!formData.operator) formData.operator = res.header.Operator || "";
      if (!formData.mesin) formData.mesin = res.header.Mesin || "";
      if (res.header.Gudang) formData.gdg_kode = res.header.Gudang;
      if (res.header.Shift) formData.shift = Number(res.header.Shift) || formData.shift;
    }

    if (res && Array.isArray(res.details) && res.details.length > 0) {
      res.details.forEach((d: any) => {
        const pAtas = Number(d.padding_atas ?? d.Padding ?? 3);
        const pSamping = Number(d.padding_samping ?? 1);
        const { toleransi, toleransi2 } = calculateToleransi(pAtas, pSamping);

        const p = Number(d.panjang ?? d.Panjang ?? d.spk_panjang ?? 0);
        const l = Number(d.lebar ?? d.Lebar ?? d.spk_lebar ?? 0);
        const qty = Number(d.totalcetak ?? d.Jml_Cetak ?? d.qty_cetak ?? 0);

        const rowM2 =
          d.ld_luas_m2 !== undefined && d.ld_luas_m2 !== null
            ? Number(d.ld_luas_m2)
            : Number(((p + toleransi) * (l + toleransi2) * qty).toFixed(2));

        const itemShift = Number(d.shift ?? d.Shift ?? formData.shift) || formData.shift;
        const itemMesin = d.mesin || d.Mesin || formData.mesin || "-";
        const itemOperator = d.operator || d.Operator || formData.operator || "";

        if (!formData.mesin && itemMesin !== "-") formData.mesin = itemMesin;
        if (!formData.operator && itemOperator) formData.operator = itemOperator;

        detailData.value.push({
          _rowId: `lhk-${d.referensi_lhk || d.Nomor_LHK || Date.now()}-${Math.random()}`,
          lhk_rekap: isEditMode.value ? formData.nomor : "NEW",
          lhkmesin: d.referensi_lhk || d.Nomor_LHK || d.nomor || "MANUAL",
          shift: itemShift,
          mesin: itemMesin,
          spk_nomor: d.spk_nomor || d.Nomor_SPK || "-",
          spk_nama: d.nama_spk || d.Nama_SPK || d.NamaOrder || "-",
          panjang_spk: p,
          lebar_spk: l,
          operator: itemOperator,
          jumlah_cetak: qty,
          toleransi,
          toleransi2,
          total_m2: rowM2,
          isManual: false,
        });
      });

      syncInkMachines();
      toast.success(`${newNomors.length} dokumen LHK berhasil ditambahkan.`);
    } else {
      toast.warning("Tidak ada rincian data pada LHK yang dipilih.");
    }
  } catch (error) {
    console.error("Lookup Detail Error:", error);
    toast.error("Gagal menarik data rincian LHK.");
  } finally {
    isLoading.value = false;
    isLhkLookupVisible.value = false;
  }
};

const calculateRowM2 = (index: number) => {
  const row = detailData.value[index];
  if (!row) return;
  const p = Number(row.panjang_spk) || 0;
  const l = Number(row.lebar_spk) || 0;
  const qty = Number(row.jumlah_cetak) || 0;
  const tol1 = Number(row.toleransi) || 0;
  const tol2 = Number(row.toleransi2) || 0;
  row.total_m2 = Number(((p + tol1) * (l + tol2) * qty).toFixed(2));
};

const removeRow = (idx: number) => {
  detailData.value.splice(idx, 1);
  syncInkMachines();
};

// --- Validation & Save ---
const validateBeforeSave = (status: string) => {
  if (detailData.value.length === 0) {
    toast.error("Daftar rincian pengerjaan masih kosong!");
    return;
  }

  const invalidInk = inkDetails.value.find(
    (ink) =>
      (ink.c > 0 || ink.m > 0 || ink.y > 0 || ink.k > 0) && !ink.msn_kode
  );
  if (invalidInk) {
    toast.error("Ada pemakaian tinta tetapi mesin belum dipilih!");
    return;
  }

  pendingStatus.value = status;
  showSaveDialog.value = true;
};

const handleSave = async (status: string) => { return executeSave(status); };
const loaddataall = async (nomor: string) => { return loadDataAll(nomor); };
const executeSave = async () => {
  isSaving.value = true;
  try {
    const payload = {
      header: {
        lch_tanggal: formData.tanggal,
        lch_gdg_prod: formData.gdg_kode,
        lch_shift: formData.shift,
        lch_operator: formData.operator,
        lch_mesin: formData.mesin,
        luser_modified: authStore.user?.kdUser || "SYSTEM",
        lstatus: pendingStatus.value,
      },
      details: detailData.value.map((d) => ({
        ...d,
        operator: d.operator || formData.operator,
        mesin: d.mesin,
        lcd_lnomor: d.lhkmesin,
        lcd_lshift: d.shift || formData.shift,
        toleransi: Number(d.toleransi) || 0,
        toleransi2: Number(d.toleransi2) || 0,
        lcd_toleransi: Number(d.toleransi) || 0,
        lcd_toleransi2: Number(d.toleransi2) || 0,
        panjang: Number(d.panjang_spk) || 0,
        lebar: Number(d.lebar_spk) || 0,
        jumlah_cetak: Number(d.jumlah_cetak) || 0,
        Jml_Cetak: Number(d.jumlah_cetak) || 0,
        total_m2: Number(d.total_m2) || 0,
        m2_cetak: Number(d.total_m2) || 0,
      })),
      inkData: inkDetails.value
        .filter((ink) => ink.msn_kode !== "")
        .map((ink) => ({
          msn_kode: ink.msn_kode,
          c: Number(ink.c) || 0,
          m: Number(ink.m) || 0,
          y: Number(ink.y) || 0,
          k: Number(ink.k) || 0,
        })),
      existingNomor:
        isEditMode.value && formData.nomor !== "AUTO" ? formData.nomor : null,
    };

    const res = await api.post("/mmt/lhk-cetak-mmt", payload);

    if (res.data?.data?.success || res.data?.success || res.status === 200 || res.status === 201) {
      toast.success(res.data?.message || "Data berhasil disimpan.");
      router.push("/mmt/lhk/cetak-mmt");
    } else {
      toast.error(res.data?.message || "Gagal menyimpan data.");
    }
  } catch (error: any) {
    console.error("Save Error:", error);
    toast.error(
      error.response?.data?.message || "Terjadi kesalahan saat menyimpan data."
    );
  } finally {
    isSaving.value = false;
    showSaveDialog.value = false;
  }
};

const executeCancel = () => {
  showCancelDialog.value = false;
  router.push("/mmt/lhk/cetak-mmt");
};

const executeClose = () => {
  showCloseDialog.value = false;
  router.push("/mmt/lhk/cetak-mmt");
};

const loadDataAll = async (nomor: string) => {
  isLoading.value = true;
  try {
    const response = await api.get(`/mmt/lhk-cetak-mmt/${nomor}`);
    const res = response.data?.data || response.data;
    if (res) {
      isEditMode.value = true;
      formData.nomor = res.Nomor || nomor;
      formData.tanggal = res.Tanggal ? format(new Date(res.Tanggal), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      formData.gdg_kode = res.Gdg_Kode || res.Gudang || "GPM";
      formData.shift = Number(res.Shift) || 1;
      formData.operator = res.Operator || res.details?.[0]?.Operator || "";
      formData.mesin = res.details?.[0]?.Mesin || res.Mesin || "";

      if (res.details && Array.isArray(res.details)) {
        detailData.value = res.details.map((d: any, idx: number) => ({
          _rowId: `loaded-${d.Nomor || idx}-${Date.now()}-${idx}`,
          lhk_rekap: d.Nomor || res.Nomor,
          lhkmesin: d.Nomor_lhk_mesin || "MANUAL",
          shift: Number(d.Shift) || formData.shift,
          mesin: d.Mesin || "-",
          operator: d.Operator || res.Operator || "",
          spk_nomor: d.Nomor_SPK,
          spk_nama: d.Nama_SPK,
          jumlah_cetak: Number(d.Jml_Cetak) || 0,
          toleransi: Number(d.toleransi) || 0,
          toleransi2: Number(d.toleransi2) || 0,
          total_m2: Number(d.m2_cetak) || 0,
          panjang_spk: Number(d.Panjang) || 0,
          lebar_spk: Number(d.Lebar) || 0,
          isManual: d.Nomor_lhk_mesin === "MANUAL" || !d.Nomor_lhk_mesin,
        }));
      }

      if (res.inks && Array.isArray(res.inks) && res.inks.length > 0) {
        inkDetails.value = res.inks.map((ink: any) => ({
          msn_kode: ink.Msn_Kode,
          c: Number(ink.Ink_C) || 0,
          m: Number(ink.Ink_M) || 0,
          y: Number(ink.Ink_Y) || 0,
          k: Number(ink.Ink_K) || 0,
        }));
      } else {
        inkDetails.value = [{ msn_kode: "", c: 0, m: 0, y: 0, k: 0 }];
      }
    }
  } catch (error) {
    console.error("Load Data Error:", error);
    toast.error("Gagal memuat data LHK Approval Cetak.");
  } finally {
    isLoading.value = false;
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (
      !isLhkLookupVisible.value &&
      !isMesinLookupVisible.value &&
      !isSpkLookupVisible.value
    ) {
      openLhkLookup();
    }
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  const id = route.params.nomor;
  if (id && id !== "create" && id !== "new") {
    loadDataAll(id as string);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.approval-form-wrapper {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 24px;
}

.table-scrollable :deep(.v-table__wrapper) {
  max-height: 420px;
  overflow-y: auto !important;
  overflow-x: auto !important;
}

.table-scrollable :deep(thead th) {
  position: sticky !important;
  top: 0 !important;
  z-index: 2 !important;
  background-color: #f1f5f9 !important;
}

.desktop-form-section {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
}
.section-label {
  font-size: 13px;
  font-weight: 700;
  color: #1e3a8a;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 4px;
}
.desktop-table {
  font-size: 11px;
}
:deep(.desktop-table th),
:deep(.desktop-table td) {
  font-size: 11px !important;
  white-space: nowrap;
}
:deep(.desktop-table thead tr) {
  background-color: #f5f5f5 !important;
}
:deep(.desktop-table thead th) {
  font-weight: 700 !important;
  color: #333 !important;
}
:deep(.v-table th),
:deep(.v-table td) {
  font-size: 11px !important;
}
:deep(.v-table thead tr) {
  background-color: #f5f5f5 !important;
}
:deep(.v-table thead th) {
  font-weight: 700 !important;
  color: #333 !important;
}
:deep(.v-chip) {
  font-size: 10px !important;
  height: 22px !important;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
