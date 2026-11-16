<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah' : 'Baru') + ' Rekap & Approval Tekstil'"
    menu-id="5510"
    :icon="IconChecks"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #header-actions>
      <!-- Simpan Draft -->
      <v-btn
        size="small"
        color="orange-darken-3"
        variant="tonal"
        class="mr-2 text-none font-weight-medium"
        :loading="isSaving"
        :disabled="detailData.length === 0"
        @click="validateBeforeSave('DRAFT')"
      >
        <template #prepend>
          <IconDeviceFloppy :size="16" />
        </template>
        Simpan Draft
      </v-btn>

      <!-- Simpan & Approve -->
      <v-btn
        size="small"
        color="primary"
        variant="elevated"
        class="mr-2 text-none font-weight-bold"
        :loading="isSaving"
        :disabled="detailData.length === 0"
        @click="validateBeforeSave('APPROVE')"
      >
        <template #prepend>
          <IconCheck :size="16" />
        </template>
        Simpan & Approve
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        class="mr-2 text-none"
        @click="showCancelDialog = true"
      >
        Batal
      </v-btn>

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

    <template #default>
      <div class="pa-2 approval-form-wrapper">
        <!-- Informasi Header Rekap -->
        <div class="desktop-form-section mb-3">
          <div class="section-label mb-2">Informasi Utama Approval Tekstil</div>
          <v-row dense>
            <v-col cols="12" md="3">
              <label class="text-caption font-weight-medium text-grey-darken-2">No. Approval</label>
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
            <v-col cols="12" md="3">
              <label class="text-caption font-weight-medium text-grey-darken-2">Tanggal Rekap</label>
              <v-text-field
                v-model="formData.tanggal"
                type="date"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2">
              <label class="text-caption font-weight-medium text-grey-darken-2">Shift</label>
              <v-select
                v-model.number="formData.shift"
                :items="[1, 2, 3]"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="4">
              <label class="text-caption font-weight-medium text-grey-darken-2">Pemeriksa / Admin</label>
              <v-text-field
                v-model="formData.admin"
                readonly
                density="compact"
                variant="outlined"
                hide-details
                class="bg-grey-lighten-4"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Pemakaian Tinta (Tekstil) -->
        <div class="desktop-form-section mb-3">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="section-label mb-0 d-flex align-center">
              <IconPalette :size="16" class="mr-1 text-primary" />
              Pemakaian Tinta Tekstil (Liter)
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

        <!-- Daftar Pekerjaan Tekstil -->
        <div class="desktop-form-section">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="section-label mb-0 d-flex align-center">
              <IconCheck :size="16" class="mr-1 text-primary" />
              Daftar Pekerjaan Tekstil ({{ detailData.length }} Item)
            </div>
            <div class="d-flex ga-2">
              <v-btn
                size="small"
                color="secondary"
                variant="outlined"
                class="text-none"
                @click="openSpkSearch"
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
                @click="isLhkTekstilVisible = true"
              >
                <template #prepend>
                  <IconSearch :size="14" />
                </template>
                Pilih LHK Tekstil (F1)
              </v-btn>
            </div>
          </div>

          <v-data-table
            :headers="headers"
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

            <template #[`item.lhk_nomor`]="{ item }">
              <v-chip
                v-if="(item.raw || item).lhk_nomor && (item.raw || item).lhk_nomor !== 'MANUAL'"
                size="x-small"
                color="primary"
                variant="tonal"
              >
                {{ (item.raw || item).lhk_nomor }}
              </v-chip>
              <span v-else class="text-caption text-grey italic">MANUAL</span>
            </template>

            <template #[`item.lhk_mesin`]="{ item }">
              <span class="font-weight-bold text-blue-darken-3 text-caption">
                {{ (item.raw || item).lhk_mesin || "-" }}
              </span>
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

            <template #[`item.nomor_spk`]="{ item }">
              <span class="font-weight-bold text-primary text-caption">{{ (item.raw || item).nomor_spk }}</span>
            </template>

            <template #[`item.keterangan`]="{ item }">
              <span class="text-caption" :title="(item.raw || item).keterangan">{{ (item.raw || item).keterangan }}</span>
            </template>

            <template #[`item.qty`]="{ item, index }">
              <v-text-field
                v-model.number="detailData[index].qty"
                type="number"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 90px"
                class="text-right"
                @update:model-value="calculateRowM2(index)"
              />
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

            <!-- Footer Total -->
            <template #body.append v-if="detailData.length > 0">
              <tr class="bg-blue-lighten-5 font-weight-bold">
                <td colspan="7" class="text-end text-uppercase pr-4">Total:</td>
                <td class="text-right text-primary">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.qty) || 0), 0)
                      .toLocaleString()
                  }}
                </td>
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

  <LhkTekstilLookupModal
    :is-visible="isLhkTekstilVisible"
    :initial-tanggal="formData.tanggal"
    :initial-shift="formData.shift"
    @close="isLhkTekstilVisible = false"
    @select="handleLhkTekstilSelect"
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
import LhkTekstilLookupModal from "@/modal/LhkTekstilLookupModal.vue";
import {
  IconChecks,
  IconCheck,
  IconX,
  IconPlus,
  IconTrash,
  IconSearch,
  IconPalette,
  IconDeviceFloppy,
} from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const isLoading = ref(false);
const isSaving = ref(false);
const isEditMode = ref(false);
const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const pendingStatus = ref("APPROVE");

const isLhkTekstilVisible = ref(false);
const isMesinLookupVisible = ref(false);
const isSpkLookupVisible = ref(false);
const activeRowIndex = ref<number | null>(null);

const formData = reactive({
  nomor: "AUTO",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  shift: 1,
  admin: authStore.user?.nama || authStore.user?.name || "ADMIN",
  gdg_kode: "GPM",
});

const inkDetails = ref<any[]>([{ msn_kode: "", c: 0, m: 0, y: 0, k: 0 }]);
const detailData = ref<any[]>([]);

const headers = [
  { title: "No", key: "no", width: "45px", sortable: false },
  { title: "No. LHK Tekstil", key: "lhk_nomor", width: "130px" },
  { title: "No. LHK Mesin", key: "lhk_mesin", width: "140px" },
  { title: "Shift", key: "shift", width: "65px", align: "center" as const },
  { title: "Mesin", key: "mesin", width: "95px" },
  { title: "No. SPK", key: "nomor_spk", width: "140px" },
  { title: "Nama Produk", key: "keterangan", minWidth: "180px" },
  { title: "Qty", key: "qty", width: "100px", align: "end" as const },
  { title: "Meter²", key: "total_m2", width: "110px", align: "end" as const },
  { title: "", key: "actions", width: "45px", sortable: false, align: "center" as const },
];

const addInkRow = () => {
  inkDetails.value.push({ msn_kode: "", c: 0, m: 0, y: 0, k: 0 });
};

const removeInkRow = (index: number) => {
  if (inkDetails.value.length > 1) {
    inkDetails.value.splice(index, 1);
  }
};

const openMesinSearch = (index: number | null = null) => {
  activeRowIndex.value = index;
  isMesinLookupVisible.value = true;
};

const handleMesinSelect = (mesin: any) => {
  const kodeMesin = mesin.msn_kode || mesin.Kode;
  if (activeRowIndex.value !== null) {
    if (activeRowIndex.value >= 1000) {
      inkDetails.value[activeRowIndex.value - 1000].msn_kode = kodeMesin;
    } else if (detailData.value[activeRowIndex.value]) {
      detailData.value[activeRowIndex.value].mesin = kodeMesin;
    }
  }
  isMesinLookupVisible.value = false;
  activeRowIndex.value = null;
};

const openSpkSearch = () => {
  isSpkLookupVisible.value = true;
};

const handleSpkSelect = (rawSpk: any) => {
  const spk = rawSpk?.raw || rawSpk;
  const p = parseFloat(spk.Panjang || spk.panjang || 0);
  const l = parseFloat(spk.Lebar || spk.lebar || 0);

  const newRow = {
    _rowId: `tekstil-manual-${Date.now()}-${Math.random()}`,
    lhk_nomor: "MANUAL",
    lhk_mesin: "MANUAL",
    shift: formData.shift,
    nomor_spk: spk.SPK || spk.spk_nomor || spk.Nomor || spk.NomorSPK || "-",
    keterangan: spk.Nama || spk.spk_nama || spk.NamaOrder || "Input Manual",
    qty: 1,
    lebar: l,
    panjang: p,
    total_m2: Number((p * l).toFixed(2)),
    isManual: true,
    brg_kode: spk.brg_kode || spk.Kode_Bahan || "",
    barcode: spk.Barcode || "",
    mesin: formData.mesin || "",
  };

  detailData.value = [...detailData.value, newRow];
  isSpkLookupVisible.value = false;
  toast.success("SPK Manual berhasil ditambahkan.");
};

const calculateRowM2 = (index: number) => {
  const row = detailData.value[index];
  if (!row) return;
  const qty = Number(row.qty) || 0;
  const lebar = Number(row.lebar) || 0;
  const panjang = Number(row.panjang) || 0;
  if (panjang > 0 && lebar > 0) {
    row.total_m2 = Number((panjang * lebar * qty).toFixed(2));
  }
};

const handleLhkTekstilSelect = async (selectedItems: any[]) => {
  for (const item of selectedItems) {
    if (item.Gudang || item.gdg_kode) {
      formData.gdg_kode = item.Gudang || item.gdg_kode;
    }

    const isExist = detailData.value.some((d) => d.lhk_mesin === item.Nomor);
    if (!isExist) {
      try {
        let targetDetails: any[] = [];
        try {
          const res = await api.get("/mmt/lhk-tekstil-mmt/details", {
            params: { nomor: item.Nomor },
          });
          targetDetails =
            res.data?.details || res.data?.data?.details || res.data || [];
        } catch {
          try {
            const res2 = await api.get(
              `/mmt/lhk-tekstil-mmt/detail/${encodeURIComponent(item.Nomor)}`,
            );
            targetDetails =
              res2.data?.details || res2.data?.data?.details || res2.data || [];
          } catch {
            const res3 = await api.get(
              `/mmt/lhk-tekstil-mmt/${encodeURIComponent(item.Nomor)}`,
            );
            targetDetails =
              res3.data?.data?.details || res3.data?.details || [];
          }
        }

        if (Array.isArray(targetDetails) && targetDetails.length > 0) {
          targetDetails.forEach((dtl: any) => {
            const rowQty = Number(
              dtl.totalcetak || dtl.Jml_Cetak || dtl.ltd_totalcetak || dtl.qty || 0,
            );
            const rowPanjang = Number(
              dtl.panjang_spk || dtl.Panjang || dtl.ltd_panjang_spk || dtl.panjang || 0,
            );
            const rowLebar = Number(
              dtl.lebar_spk || dtl.Lebar || dtl.ltd_lebar_spk || dtl.lebar || 0,
            );
            const rowM2 = Number(
              dtl.total_m2 ||
                (rowPanjang > 0 && rowLebar > 0 && rowQty > 0
                  ? (rowPanjang * rowLebar * rowQty).toFixed(2)
                  : 0),
            );

            const msn = dtl.Mesin || dtl.mesin || item.Mesin || "";
            detailData.value.push({
              _rowId: `tekstil-${item.Nomor}-${dtl.Nomor_SPK || Date.now()}-${Math.random()}`,
              lhk_nomor: "",
              lhk_mesin: item.Nomor,
              shift: dtl.Shift || item.Shift || formData.shift,
              mesin: msn,
              nomor_spk: dtl.Nomor_SPK || dtl.nomor_spk || "-",
              keterangan:
                dtl.Nama_SPK ||
                dtl.nama_spk ||
                dtl.brg_nama ||
                `${item.Nama_Bahan || "-"} (${item.Barcode || "-"})`,
              qty: rowQty,
              lebar: rowLebar,
              panjang: rowPanjang,
              total_m2: rowM2,
              brg_kode: dtl.Kode_Bahan || dtl.brg_kode || item.Kode_Bahan || "",
              barcode: item.Barcode || "",
              isManual: false,
            });

            // Otomatis daftarkan mesin ke tabel tinta jika belum ada
            if (msn && !inkDetails.value.some((ink) => ink.msn_kode === msn)) {
              if (inkDetails.value.length === 1 && !inkDetails.value[0].msn_kode) {
                inkDetails.value[0].msn_kode = msn;
              } else {
                inkDetails.value.push({ msn_kode: msn, c: 0, m: 0, y: 0, k: 0 });
              }
            }
          });
        } else {
          const rowQty = Number(item.TotalCetak || item.qty || 1);
          const rowLebar = Number(item.Lebar || 0);
          const rowKurang = Number(item.KurangCetak || 0);
          const rowPanjang =
            rowQty > 0 && rowKurang > 0 && rowLebar > 0
              ? Number((rowKurang / (rowQty * rowLebar)).toFixed(2))
              : 0;

          const msn = item.Mesin || "";
          detailData.value.push({
            lhk_nomor: "",
            lhk_mesin: item.Nomor,
            shift: item.Shift || formData.shift,
            keterangan: `${item.Nama_Bahan || "-"} (${item.Barcode || "-"})`,
            total_m2: rowKurang > 0 ? rowKurang : 0,
            brg_kode: item.Kode_Bahan || "",
            barcode: item.Barcode || "",
            mesin: msn,
            nomor_spk: item.NomorSPK || item.nomor_spk || "-",
            qty: rowQty,
            lebar: rowLebar,
            panjang: rowPanjang,
            isManual: false,
          });

          if (msn && !inkDetails.value.some((ink) => ink.msn_kode === msn)) {
            if (inkDetails.value.length === 1 && !inkDetails.value[0].msn_kode) {
              inkDetails.value[0].msn_kode = msn;
            } else {
              inkDetails.value.push({ msn_kode: msn, c: 0, m: 0, y: 0, k: 0 });
            }
          }
        }
      } catch (err) {
        console.error(
          `Gagal memuat rincian SPK untuk dokumen ${item.Nomor}:`,
          err,
        );
        toast.error(`Gagal memuat rincian SPK untuk dokumen ${item.Nomor}`);
      }
    }
  }
  isLhkTekstilVisible.value = false;
  toast.success("Data LHK berhasil ditambahkan.");
};

const removeRow = (idx: number) => {
  detailData.value.splice(idx, 1);
};

const validateBeforeSave = (status: string) => {
  if (detailData.value.length === 0) {
    toast.error("Daftar rincian pengerjaan masih kosong!");
    return;
  }

  const invalidInk = inkDetails.value.find(
    (ink) =>
      (Number(ink.c) > 0 ||
        Number(ink.m) > 0 ||
        Number(ink.y) > 0 ||
        Number(ink.k) > 0) &&
      !ink.msn_kode
  );
  if (invalidInk) {
    toast.error("Ada pemakaian tinta tetapi mesin belum dipilih!");
    return;
  }

  pendingStatus.value = status;
  showSaveDialog.value = true;
};

const executeSave = async () => {
  isSaving.value = true;
  try {
    const payload = {
      header: {
        nomor: isEditMode.value && formData.nomor !== "AUTO" ? formData.nomor : "AUTO",
        tanggal: formData.tanggal,
        shift: Number(formData.shift) || 1,
        admin: authStore.user?.kode || authStore.user?.nama || "ADMIN",
        gdgKode: formData.gdg_kode || "GPM",
        luser_modified: authStore.user?.kode || "SYSTEM",
        lstatus: pendingStatus.value,
      },
      details: detailData.value.map((d) => ({
        lhk_nomor: d.lhk_nomor || "",
        lhk_mesin: d.lhk_mesin || "MANUAL",
        shift: Number(d.shift) || Number(formData.shift) || 1,
        mesin: d.mesin || "",
        nomor_spk: d.nomor_spk || "",
        brg_kode: d.brg_kode || "",
        qty: Number(d.qty) || 0,
        total_m2: Number(d.total_m2) || 0,
        lebar: Number(d.lebar) || 0,
        panjang: Number(d.panjang) || 0,
      })),
      inkData: inkDetails.value
        .filter((ink) => {
          const hasMachine = ink.msn_kode && ink.msn_kode.trim() !== "";
          const hasValues =
            Number(ink.c) > 0 ||
            Number(ink.m) > 0 ||
            Number(ink.y) > 0 ||
            Number(ink.k) > 0;
          return hasMachine && hasValues;
        })
        .map((ink) => ({
          msn_kode: ink.msn_kode,
          tipe: "Tekstil",
          c: Number(ink.c) || 0,
          m: Number(ink.m) || 0,
          y: Number(ink.y) || 0,
          k: Number(ink.k) || 0,
        })),
    };

    const res = await api.post("/mmt/lhk-tekstil-mmt/approve", payload);

    if (res.data?.success || res.data?.data?.success || res.status === 200 || res.status === 201) {
      toast.success(res.data?.message || "Data approval tekstil berhasil disimpan.");
      router.push("/mmt/lhk/tekstil/approve");
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
  router.push("/mmt/lhk/tekstil/approve");
};

const executeClose = () => {
  showCloseDialog.value = false;
  router.push("/mmt/lhk/tekstil/approve");
};

const loadDataAll = async (nomor: string) => {
  isLoading.value = true;
  try {
    const response = await api.get(`/mmt/lhk-tekstil-mmt/approval/${encodeURIComponent(nomor)}`);
    const res = response.data?.data || response.data;
    if (res) {
      isEditMode.value = true;
      const header = res.header || res;
      formData.nomor = header.Nomor || nomor;
      formData.tanggal = header.Tanggal ? format(new Date(header.Tanggal), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      formData.shift = Number(header.Shift) || 1;
      formData.admin = header.Admin || formData.admin;

      if (res.details && Array.isArray(res.details)) {
        detailData.value = res.details.map((d: any) => {
          const isManualRow =
            !d.Nomor_Lhk_Mesin ||
            d.Nomor_Lhk_Mesin === "-" ||
            d.Nomor_Lhk_Mesin === "MANUAL";

          return {
            _rowId: `loaded-${d.Nomor_App || d.Nomor_SPK || nomor}-${Date.now()}`,
            lhk_nomor: d.Nomor_App || header.Nomor || nomor,
            lhk_mesin: isManualRow ? "MANUAL" : d.Nomor_Lhk_Mesin,
            shift: d.ShiftDetail || d.Shift || header.Shift || 1,
            mesin: d.Mesin || "-",
            nomor_spk: d.Nomor_SPK || "",
            keterangan: d.Nama_SPK || d.Nama_Bahan || "Input Manual",
            qty: Number(d.Jml_Cetak || d.qty || 0),
            total_m2: Number(d.Total_Panjang || d.total_m2 || 0),
            lebar: Number(d.Lebar || d.lebar || 0),
            panjang:
              Number(d.Jml_Cetak) > 0
                ? Number(d.Total_Panjang) / Number(d.Jml_Cetak)
                : 0,
            brg_kode: d.Kode_Bahan || d.brg_kode || "",
            isManual: isManualRow,
          };
        });
      }

      if (res.inks && Array.isArray(res.inks) && res.inks.length > 0) {
        inkDetails.value = res.inks.map((ink: any) => ({
          msn_kode: ink.Msn_Kode,
          c: Number(ink.Ink_C) || 0,
          m: Number(ink.Ink_M) || 0,
          y: Number(ink.Ink_Y) || 0,
          k: Number(ink.Ink_K) || 0,
        }));
      }
    }
  } catch (error) {
    console.error("Load Data Error:", error);
    toast.error("Gagal memuat data approval tekstil.");
  } finally {
    isLoading.value = false;
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    isLhkTekstilVisible.value = true;
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
.desktop-table :deep(table) {
  width: 100%;
}
.desktop-table :deep(th),
.desktop-table :deep(td) {
  font-size: 11px !important;
  white-space: nowrap;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
