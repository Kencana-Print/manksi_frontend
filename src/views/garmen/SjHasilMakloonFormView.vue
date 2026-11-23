<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { format } from "date-fns";
import BaseForm from "@/components/BaseForm.vue";
import { sjHasilMakloonService } from "@/services/garmen/sjHasilMakloonService";
import { useAuthStore } from "@/stores/authStore";
import { useTabsStore } from "@/stores/tabsStore";
import {
  IconTruckDelivery,
  IconDeviceFloppy,
  IconX,
  IconTrash,
} from "@tabler/icons-vue";

interface SjHasilItem {
  DtfMaklonId?: number | string;
  DtfMaklonHasilId?: number | string;
  KodeHasil: string;
  NamaHasil: string;
  KodePolos?: string;
  NamaPolos?: string;
  Satuan: string;
  QtyHasil: number;
  BsAfval: number;
  LhkNomor: string;
  LhkUrut?: number;
  MkldId?: number | null;
  Sumber?: string;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const tabsStore = useTabsStore();

const rawQueryIds = (route.query.ids as string) || "";
const initialIds = rawQueryIds
  ? rawQueryIds.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

const isDirectInput = ref(initialIds.length === 0);
const isLoading = ref(false);
const isLoadingAvailable = ref(false);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const errorMessage = ref("");

const availableMaklons = ref<any[]>([]);
const selectedMklNomor = ref<string | null>(null);

const userCab = computed(() =>
  String(authStore.userCabang || authStore.user?.cabang || authStore.user?.cab || "")
    .replace(/-/g, "")
    .trim()
    .toUpperCase(),
);
const isHoOrAdmin = computed(() => {
  const c = userCab.value;
  const kode = String(authStore.user?.kode || "").toUpperCase();
  return !c || c === "HO" || c === "ALL" || kode === "ADMIN" || kode === "DEVELOPER";
});

const formData = reactive({
  MklNomor: "",
  CabAsal: "",
  NamaCabAsal: "",
  Sumber: "P05",
  Tanggal: format(new Date(), "yyyy-MM-dd"),
  Items: [] as SjHasilItem[],
});

const totalQtyHasil = computed(() =>
  formData.Items.reduce((sum, item) => sum + (Number(item.QtyHasil) || 0), 0),
);

const totalBs = computed(() =>
  formData.Items.reduce((sum, item) => sum + (Number(item.BsAfval) || 0), 0),
);

const formatNumber = (val?: any) => {
  const n = Number(val);
  return Number.isFinite(n) ? n.toLocaleString("id-ID") : "0";
};

const removeItem = (idx: number) => {
  formData.Items.splice(idx, 1);
};

// Ambil daftar Maklon yang memiliki LHK outstanding untuk opsi dropdown
const fetchAvailableMaklons = async () => {
  isLoadingAvailable.value = true;
  try {
    const res = await sjHasilMakloonService.getAvailableMaklon({
      cab: !isHoOrAdmin.value ? userCab.value : undefined,
      semuaCabang: isHoOrAdmin.value,
    });
    const list = res.data?.data || res.data || [];
    availableMaklons.value = list.map((m: any) => ({
      MklNomor: m.MklNomor,
      Sumber: m.Sumber,
      label: `${m.MklNomor} — ${m.NamaCabAsal || m.CabAsal} ➜ ${m.NamaCabTujuan || m.CabTujuan} (${m.Keterangan || "-"})`,
      subtitle: `Total Hasil: ${Number(m.TotalQtyHasil || 0).toLocaleString("id-ID")} pcs (${m.JmlLhk || 1} LHK) [${m.Sumber === 'P05' ? 'MMT (P05)' : m.Sumber === 'P02' ? 'Spanduk (P02)' : (m.Sumber || 'DTF')}]`,
      raw: m,
    }));
  } catch (err: any) {
    console.error("Gagal memuat daftar Maklon available:", err);
    toast.error("Gagal memuat daftar Maklon yang tersedia.");
  } finally {
    isLoadingAvailable.value = false;
  }
};

const onSelectMaklon = async (nomor: string | null) => {
  if (!nomor) {
    formData.MklNomor = "";
    formData.CabAsal = "";
    formData.NamaCabAsal = "";
    formData.Sumber = "";
    formData.Items = [];
    return;
  }
  await loadData({ mklNomor: nomor });
};

const loadData = async ({ ids = [] as (string | number)[], mklNomor = "" }) => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const res = await sjHasilMakloonService.getCreateData(ids, mklNomor);
    const { header, items } = res.data?.data ?? res.data;

    if (!header || !items || !items.length) {
      throw new Error("Tidak ada data LHK yang ditemukan untuk Maklon ini.");
    }

    formData.MklNomor = header.mkl_nomor;
    formData.CabAsal = header.mkl_cab_asal;
    formData.NamaCabAsal = header.NamaCabAsal || header.mkl_cab_asal;
    formData.Sumber = items[0]?.Sumber || "P05";
    formData.Tanggal = format(new Date(), "yyyy-MM-dd");
    selectedMklNomor.value = header.mkl_nomor;

    formData.Items = items.map((r: any) => ({
      DtfMaklonId: r.DtfMaklonId,
      DtfMaklonHasilId: r.DtfMaklonHasilId,
      KodeHasil: r.KodeHasil,
      NamaHasil: r.NamaHasil || r.KodeHasil,
      KodePolos: r.KodePolos,
      NamaPolos: r.NamaPolos || r.KodePolos,
      Satuan: r.Satuan || "PCS",
      QtyHasil: Number(r.QtyHasil) || 0,
      BsAfval: Number(r.BsAfval) || 0,
      LhkNomor: r.LhkNomor || "",
      LhkUrut: r.LhkUrut || 0,
      MkldId: r.MkldId || null,
      Sumber: r.Sumber || "P05",
    }));
  } catch (err: any) {
    console.error("Gagal memuat data create SJ Hasil Maklon:", err);
    errorMessage.value = err.response?.data?.message || err.message || "Gagal memuat data.";
    toast.error(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (initialIds.length > 0) {
    await loadData({ ids: initialIds });
  } else {
    await fetchAvailableMaklons();
  }
});

const kembaliKeBrowse = () => {
  const currentPath = route.path;
  router
    .push({ name: "SjHasilMakloonBrowse" })
    .catch(() => {})
    .then(() => {
      tabsStore.closeTab(currentPath);
    });
};

const onClickSave = () => {
  if (!formData.MklNomor) {
    toast.warning("Silakan pilih No. Maklon terlebih dahulu.");
    return;
  }
  if (!formData.Items.length) {
    toast.warning("Daftar item tidak boleh kosong.");
    return;
  }
  if (totalQtyHasil.value <= 0 && totalBs.value <= 0) {
    toast.warning("Qty Diterima atau BS harus lebih dari 0.");
    return;
  }
  showSaveDialog.value = true;
};

const executeSave = async () => {
  showSaveDialog.value = false;
  isSaving.value = true;
  try {
    const payload = {
      tanggal: formData.Tanggal,
      mklNomor: formData.MklNomor,
      mkl_nomor: formData.MklNomor,
      ids: formData.Items.map((i) => i.DtfMaklonHasilId || i.DtfMaklonId),
      items: formData.Items.map((i) => ({
        dtf_maklon_hasil_id:
          i.Sumber === "DTF" && typeof i.DtfMaklonHasilId === "number"
            ? i.DtfMaklonHasilId
            : null,
        dtf_maklon_id:
          i.Sumber === "DTF" && typeof i.DtfMaklonId === "number"
            ? i.DtfMaklonId
            : null,
        mkld_id: i.MkldId || null,
        kode_jadi: i.KodeHasil,
        KodePolos: i.KodePolos || "",
        Satuan: i.Satuan || "PCS",
        qty_terima: Number(i.QtyHasil) || 0,
        qty_bs: Number(i.BsAfval) || 0,
        lhk_nomor: i.LhkNomor || "",
        sumber: i.Sumber || "P05",
      })),
    };

    const res = await sjHasilMakloonService.create(payload);
    const nomor = res.data?.data?.nomor || "";
    toast.success(`SJ Hasil Maklon ${nomor} berhasil disimpan.`);

    if (nomor) {
      const url = router.resolve({
        name: "SjHasilMakloonPrint",
        params: { nomor },
      }).href;
      window.open(url, "_blank");
    }

    kembaliKeBrowse();
  } catch (err: any) {
    console.error("Gagal menyimpan SJ Hasil Maklon:", err);
    toast.error(
      err.response?.data?.message || err.message || "Gagal menyimpan SJ Hasil Maklon.",
    );
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <BaseForm
    title="Buat Surat Jalan Hasil Maklon"
    menu-id="182"
    :icon="IconTruckDelivery"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Surat Jalan Hasil Maklon"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @validate-save="onClickSave"
    @confirm-save="executeSave"
    @confirm-cancel="kembaliKeBrowse"
    @confirm-close="kembaliKeBrowse"
  >
    <!-- Header Actions -->
    <template #header-actions>
      <v-btn
        size="small"
        color="primary"
        @click="onClickSave"
        :loading="isSaving"
        :disabled="isLoading || !formData.Items.length"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconDeviceFloppy :size="15" :stroke-width="1.7" />
          </span>
        </template>
        Simpan SJ
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        class="mx-1"
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
        <template #prepend>
          <span class="d-flex align-center">
            <IconX :size="15" :stroke-width="2" />
          </span>
        </template>
        Tutup
      </v-btn>
    </template>

    <!-- Kolom Kiri: Header Info Maklon Induk -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="text-caption font-weight-bold mb-3 text-primary d-flex align-center">
          <IconTruckDelivery :size="16" class="mr-1" />
          INFO MAKLON INDUK
        </div>

        <div v-if="isDirectInput || !initialIds.length" class="mb-3">
          <v-autocomplete
            v-model="selectedMklNomor"
            :items="availableMaklons"
            item-title="label"
            item-value="MklNomor"
            label="Pilih No. Maklon..."
            placeholder="Cari Maklon yang selesai LHK..."
            density="compact"
            variant="outlined"
            hide-details
            clearable
            :loading="isLoadingAvailable"
            @update:model-value="onSelectMaklon"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :subtitle="item.raw.subtitle">
                <template #prepend>
                  <v-chip
                    size="x-small"
                    :color="item.raw.Sumber === 'P05' ? 'purple-darken-1' : 'blue-darken-1'"
                    variant="flat"
                    class="mr-2 font-weight-bold"
                  >
                    {{ item.raw.Sumber }}
                  </v-chip>
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>
        </div>

        <v-text-field
          v-else
          label="No. Maklon"
          :model-value="formData.MklNomor"
          readonly
          variant="filled"
          density="compact"
          hide-details
          class="mb-2 font-weight-bold mono"
        />

        <v-text-field
          label="Gudang Penerima (Cabang Asal)"
          :model-value="formData.CabAsal ? `${formData.CabAsal} — ${formData.NamaCabAsal || '-'}` : '-'"
          readonly
          variant="filled"
          density="compact"
          hide-details
          class="mb-2"
        />

        <v-text-field
          label="Tanggal SJ"
          v-model="formData.Tanggal"
          type="date"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />

        <v-text-field
          label="Divisi / Sumber"
          :model-value="formData.Sumber === 'P05' ? 'Mesin Cetak MMT (P05)' : formData.Sumber === 'P02' ? 'Cetak Spanduk (P02)' : formData.Sumber === 'DTF' ? 'DTF Garmen' : (formData.Sumber || '-')"
          readonly
          variant="filled"
          density="compact"
          hide-details
          class="mb-2"
        />

        <v-text-field
          label="Total Qty Diterima"
          :model-value="formatNumber(totalQtyHasil)"
          readonly
          variant="filled"
          density="compact"
          hide-details
          class="mb-2 font-weight-bold text-success text-right-input"
        />

        <v-text-field
          label="Total BS / Afval"
          :model-value="formatNumber(totalBs)"
          readonly
          variant="filled"
          density="compact"
          hide-details
          class="font-weight-bold text-error text-right-input"
        />
      </div>
    </template>

    <!-- Kolom Kanan: Rincian Hasil Maklon (Dapat diedit Qty Terima & BS) -->
    <template #right-column>
      <v-card elevation="1" rounded="lg" border class="items-table-card">
        <v-toolbar color="primary" density="compact" flat style="height: 38px;">
          <IconTruckDelivery class="ml-3 mr-2" :size="18" />
          <span class="text-caption font-weight-bold">
            Daftar Item Barang Jadi Hasil Maklon
          </span>
          <v-spacer />
          <v-chip size="x-small" color="white" variant="tonal" class="mr-3 font-weight-bold">
            {{ formData.Items.length }} item
          </v-chip>
        </v-toolbar>

        <div class="items-table-scroll-wrap">
          <table class="manksi-table">
            <thead>
              <tr>
                <th style="width: 40px" class="text-center">No.</th>
                <th>Item Barang Jadi</th>
                <th style="width: 130px" class="text-right">Qty Diterima</th>
                <th style="width: 110px" class="text-right">BS / Afval</th>
                <th style="width: 80px" class="text-center">Satuan</th>
                <th style="width: 180px">No. LHK</th>
                <th style="width: 50px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in formData.Items" :key="idx">
                <td class="text-center text-grey-darken-1">{{ idx + 1 }}</td>
                <td>
                  <div class="font-weight-bold text-purple-darken-3 mono">{{ item.KodeHasil }}</div>
                  <div class="row-subtext">{{ item.NamaHasil }}</div>
                  <div v-if="item.NamaPolos && item.NamaPolos !== item.NamaHasil" class="text-caption text-grey">
                    Bahan: {{ item.NamaPolos }}
                  </div>
                </td>
                <td class="text-right bg-green-lighten-5">
                  <input
                    type="number"
                    min="0"
                    v-model.number="item.QtyHasil"
                    class="cell-input tr font-weight-bold text-success"
                  />
                </td>
                <td class="text-right bg-red-lighten-5">
                  <input
                    type="number"
                    min="0"
                    v-model.number="item.BsAfval"
                    class="cell-input tr font-weight-bold text-error"
                  />
                </td>
                <td class="text-center">{{ item.Satuan || "PCS" }}</td>
                <td>
                  <span class="mono text-caption">{{ item.LhkNomor || "-" }}</span>
                  <v-chip
                    v-if="item.Sumber"
                    size="x-small"
                    :color="item.Sumber === 'P05' ? 'purple-darken-1' : 'blue-darken-1'"
                    variant="tonal"
                    class="ml-1 font-weight-bold"
                  >
                    {{ item.Sumber }}
                  </v-chip>
                </td>
                <td class="text-center">
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    color="error"
                    title="Hapus baris dari Surat Jalan ini"
                    @click="removeItem(idx)"
                  >
                    <IconTrash :size="15" />
                  </v-btn>
                </td>
              </tr>
              <tr v-if="formData.Items.length === 0">
                <td colspan="7" class="text-center pa-4 text-grey">
                  {{ formData.MklNomor ? "Tidak ada item barang dalam daftar." : "Silakan pilih No. Maklon terlebih dahulu." }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Sticky Footer Summary -->
        <div class="d-flex align-center justify-space-between px-4 py-2 bg-grey-lighten-4 border-t">
          <span class="text-caption text-grey-darken-1">
            * Kolom Qty Diterima dan BS / Afval dapat diedit sesuai hasil fisik yang diterima.
          </span>
          <div class="d-flex ga-4 align-center">
            <span class="text-caption font-weight-bold">
              Total Terima:
              <span class="text-success text-subtitle-2 font-weight-bold ml-1">
                {{ formatNumber(totalQtyHasil) }}
              </span>
            </span>
            <span class="text-caption font-weight-bold">
              Total BS:
              <span class="text-error text-subtitle-2 font-weight-bold ml-1">
                {{ formatNumber(totalBs) }}
              </span>
            </span>
          </div>
        </div>
      </v-card>
    </template>
  </BaseForm>
</template>

<style scoped>
.mono {
  font-family: monospace;
}
.row-subtext {
  font-size: 11px;
  color: #757575;
}
.header-section {
  border-top: 3px solid #1976d2 !important;
}

.items-table-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 420px;
  overflow: hidden;
}

.items-table-scroll-wrap {
  flex: 1 1 auto;
  overflow-y: auto;
  max-height: calc(100vh - 280px);
  min-height: 250px;
  scrollbar-width: thin;
}

.items-table-scroll-wrap::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.items-table-scroll-wrap::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.items-table-scroll-wrap::-webkit-scrollbar-thumb {
  background: #b0bec5;
  border-radius: 3px;
}
.items-table-scroll-wrap::-webkit-scrollbar-thumb:hover {
  background: #78909c;
}

.manksi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.manksi-table th {
  background: #f5f5f5 !important;
  color: #424242;
  font-weight: 600;
  padding: 8px 10px;
  border-bottom: 2px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 2;
  text-align: left;
}

.manksi-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
  height: 38px;
  vertical-align: middle;
}

.manksi-table tr:hover {
  background-color: #fafafa;
}

.cell-input {
  width: 100%;
  height: 100%;
  border: 1px solid #c8e6c9;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  background: white;
  font-size: 12px;
  box-sizing: border-box;
}

.cell-input:focus {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.tr {
  text-align: right;
}

.text-right-input :deep(input) {
  text-align: right !important;
}

:deep(.v-text-field--readonly .v-field) {
  background-color: #f5f5f5 !important;
}
</style>
