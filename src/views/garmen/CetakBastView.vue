<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import { bastService } from "@/services/garmen/bastService";
import { bastMapSpandukService } from "@/services/spanduk/bastMapSpandukService";
import { bastMapMmtService } from "@/services/mmt/bastMapMmtService";
import {
  IconClipboardCheck,
  IconPrinter,
  IconFileSpreadsheet,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const MENU_ID = "117";

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type DivisiType = "GARMEN" | "SPANDUK" | "MMT";

interface DivisiOption {
  label: string;
  value: DivisiType;
}

const divisiOptions: DivisiOption[] = [
  { label: "Garmen / Kaosan", value: "GARMEN" },
  { label: "Spanduk", value: "SPANDUK" },
  { label: "MMT / Sublim", value: "MMT" },
];

const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  divisi: "GARMEN" as DivisiType,
  onProgress: false,
  cabangFilter: "",
  workshopFilter: "",
  sublimFilter: "",
});

onMounted(() => {
  const userDivisi = String(authStore.user?.divisi || "").toUpperCase();
  const userBagian = String(authStore.user?.bagian || "").toUpperCase();
  const userCabang = String(authStore.user?.cabang || "").toUpperCase();

  if (userDivisi.includes("SPANDUK") || userBagian.includes("SPANDUK")) {
    filterState.value.divisi = "SPANDUK";
  } else if (
    userDivisi.includes("MMT") ||
    userBagian.includes("MMT") ||
    userCabang === "P05"
  ) {
    filterState.value.divisi = "MMT";
  } else {
    filterState.value.divisi = "GARMEN";
  }
});

const {
  items,
  isLoading,
  selected,
  fetchData,
  canInsert,
  canEdit,
  canDelete,
  canExport,
} = useBrowse({
  menuId: MENU_ID,
  fetchApi: async () => {
    const div = filterState.value.divisi;
    if (div === "SPANDUK") {
      const res = await bastMapSpandukService.getBrowse({
        startDate: filterState.value.startDate,
        endDate: filterState.value.endDate,
        onProgressOnly: filterState.value.onProgress,
      });
      return res.data.data || [];
    }

    if (div === "MMT") {
      const res = await bastMapMmtService.getBrowseList({
        startDate: filterState.value.startDate,
        endDate: filterState.value.endDate,
        onProgress: filterState.value.onProgress,
        cabang: filterState.value.cabangFilter,
        workshop: filterState.value.workshopFilter,
        sublim: filterState.value.sublimFilter,
      });
      return res.data.data || res.data || [];
    }

    // Default: GARMEN
    const res = await bastService.getBrowseList({
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
      onProgress: filterState.value.onProgress,
    });
    return res.data.data || [];
  },
});

// Dynamic Headers per Divisi
const headers = computed(() => {
  const div = filterState.value.divisi;

  if (div === "SPANDUK") {
    return [
      { title: "Nomor", key: "Nomor", width: "160px" },
      { title: "Tipe", key: "Tipe", width: "80px" },
      { title: "Tanggal", key: "Tanggal", width: "100px" },
      { title: "Status BAST", key: "CetakBAST", width: "100px", align: "center" as const },
      { title: "Keputusan", key: "Keputusan", width: "120px", align: "center" as const },
      { title: "LHK Proof", key: "NomorProof", width: "180px" },
      { title: "Umur MAP", key: "HariBAST", width: "100px", align: "center" as const },
      { title: "Nama Pekerjaan", key: "NamaPekerjaan", width: "240px" },
      { title: "Nama Ext", key: "NamaExt", width: "200px" },
      { title: "Ukuran", key: "Ukuran", width: "140px" },
      { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" as const },
      { title: "Keterangan", key: "Keterangan", width: "200px" },
      { title: "Kendala", key: "kendalaProduksi", width: "200px" },
    ];
  }

  if (div === "MMT") {
    return [
      { title: "Status BAST", key: "CetakBAST", width: "110px", align: "center" as const },
      { title: "Nomor", key: "Nomor", width: "160px" },
      { title: "Cabang", key: "Cabang", width: "80px", align: "center" as const },
      { title: "Workshop", key: "Workshop", width: "100px" },
      { title: "Sublim", key: "Sublim", width: "80px", align: "center" as const },
      { title: "Divisi", key: "Divisi", width: "90px" },
      { title: "Tipe", key: "Tipe", width: "80px" },
      { title: "Tanggal", key: "Tanggal", width: "100px" },
      { title: "Nama Pekerjaan", key: "NamaPekerjaan", width: "240px" },
      { title: "Nama Ext", key: "NamaExt", width: "200px" },
      { title: "Ukuran", key: "Ukuran", width: "140px" },
      { title: "Gramasi", key: "Gramasi", width: "120px" },
      { title: "Gramasi Aktual", key: "GramasiSetting_Aktual", width: "140px" },
      { title: "Kain", key: "Kain", width: "160px" },
      { title: "Finishing", key: "Finishing", width: "140px" },
      { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" as const },
      { title: "Keterangan", key: "Keterangan", width: "200px" },
      { title: "Kendala", key: "kendalaProduksi", width: "200px" },
    ];
  }

  // GARMEN
  return [
    { title: "Nomor", key: "Nomor", width: "160px" },
    { title: "Divisi", key: "Divisi", width: "100px" },
    { title: "Tipe", key: "Tipe", width: "80px" },
    { title: "Tanggal", key: "Tanggal", width: "100px" },
    { title: "Status BAST", key: "CetakBAST", width: "100px", align: "center" as const },
    { title: "Nama Pekerjaan", key: "NamaPekerjaan", width: "250px" },
    { title: "Nama Ext", key: "NamaExt", width: "200px" },
    { title: "Ukuran", key: "Ukuran", width: "140px" },
    { title: "Gramasi", key: "Gramasi", width: "120px" },
    { title: "Gramasi Aktual", key: "GramasiSetting_Aktual", width: "140px" },
    { title: "Kain", key: "Kain", width: "160px" },
    { title: "Finishing", key: "Finishing", width: "140px" },
    { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" as const },
    { title: "Keterangan", key: "Keterangan", width: "200px" },
    { title: "Kendala", key: "kendalaProduksi", width: "200px" },
  ];
});

const handleRowProps = (data: any) => {
  const row = data.item?.raw || data.item;
  if (filterState.value.divisi === "GARMEN") {
    if (row.OnProgres === "N") return { class: "text-red-darken-2" };
    if (row.OnProgres === "Y") return { class: "text-blue-darken-2" };
  }
  return {};
};

// ── Smart Navigation ──
const onAdd = () => {
  const div = filterState.value.divisi;
  if (div === "SPANDUK") {
    router.push({ name: "SpandukBastMapCreate" });
  } else if (div === "MMT") {
    router.push({ name: "BastMmtNew" });
  } else {
    router.push({ name: "CetakBastFormCreate" });
  }
};

const onEdit = (item: any) => {
  const div = filterState.value.divisi;
  if (div === "SPANDUK") {
    if (!item.CetakBAST && !item.NomorProof) {
      toast.warning(
        `MAP ${item.Nomor} belum punya LHK Proof. Jika bukan MAP lama, BAST akan ditolak.`,
        { timeout: 5000 },
      );
    }
    router.push({ name: "SpandukBastMapEdit", params: { nomor: item.Nomor } });
  } else if (div === "MMT") {
    router.push({
      name: "BastMmtEdit",
      params: { nomor: encodeURIComponent(item.Nomor) },
    });
  } else {
    router.push({
      name: "CetakBastFormEdit",
      params: { nomor: encodeURIComponent(item.Nomor) },
    });
  }
};

const onDelete = async (item: any) => {
  if (!confirm(`Yakin hapus BAST untuk MAP ${item.Nomor}?`)) return;

  try {
    const div = filterState.value.divisi;
    if (div === "SPANDUK") {
      await bastMapSpandukService.remove(item.Nomor);
    } else if (div === "MMT") {
      await bastMapMmtService.deleteBast(item.Nomor);
    } else {
      await bastService.deleteBast(item.Nomor);
    }
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};

const onPrint = () => {
  if (selected.value.length === 0) {
    toast.warning("Pilih salah satu data terlebih dahulu.");
    return;
  }
  const nomor = selected.value[0].Nomor;
  const div = filterState.value.divisi;

  if (div === "SPANDUK") {
    window.open(
      `/spanduk/bast-map/print/${encodeURIComponent(nomor)}`,
      "_blank",
    );
  } else if (div === "MMT") {
    window.open(
      `/mmt/bast-map/print/${encodeURIComponent(nomor)}`,
      "_blank",
    );
  } else {
    window.open(
      `/garmen/cetak-bast/print/${encodeURIComponent(nomor)}`,
      "_blank",
    );
  }
};

// ── Export Excel ──
const isExporting = ref(false);
const onExport = async () => {
  const currentItems = items.value ?? [];
  if (!currentItems.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }

  isExporting.value = true;
  try {
    const div = filterState.value.divisi;
    const exportColumns: ExcelColumn[] = headers.value.map((h) => ({
      header: h.title,
      key: h.key,
      width: 18,
      align: h.align === "end" ? "right" : h.align === "center" ? "center" : "left",
      numFmt: h.align === "end" ? "#,##0" : undefined,
    }));

    const formattedData = currentItems.map((item: any) => ({
      ...item,
      Tanggal: formatTanggal(item.Tanggal),
    }));

    await exportExcelSingle(
      `BAST_MAP_${div}_${filterState.value.startDate}_sd_${filterState.value.endDate}.xlsx`,
      `BAST ${div}`,
      exportColumns,
      formattedData,
      `DATA BAST MAP DIVISI ${div} | Periode: ${formatTanggal(filterState.value.startDate)} s.d ${formatTanggal(filterState.value.endDate)}`,
    );
    toast.success("Berhasil export data BAST.");
  } catch {
    toast.error("Gagal export data Excel.");
  } finally {
    isExporting.value = false;
  }
};

const onDivisiChange = () => {
  selected.value = [];
  fetchData();
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="CETAK BAST-MAP"
    :menu-id="MENU_ID"
    :icon="IconClipboardCheck"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="handleRowProps"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="onExport"
  >
    <!-- Filter bar -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <div class="filter-divider" />

      <!-- Radio Box Divisi (mirip MintaBarangView.vue) -->
      <div class="filter-group">
        <span class="filter-label">Divisi</span>
        <div class="radio-wrap">
          <label
            v-for="d in divisiOptions"
            :key="d.value"
            class="radio-label"
          >
            <input
              type="radio"
              v-model="filterState.divisi"
              :value="d.value"
              @change="onDivisiChange"
            />
            {{ d.label }}
          </label>
        </div>
      </div>

      <div class="filter-divider" />

      <div class="filter-group">
        <label class="radio-label">
          <input
            type="checkbox"
            v-model="filterState.onProgress"
            @change="fetchData"
          />
          On Progress
        </label>
      </div>

      <!-- Filter Tambahan Khusus MMT -->
      <template v-if="filterState.divisi === 'MMT'">
        <div class="filter-divider" />
        <div class="filter-group">
          <span class="filter-label">Sublim</span>
          <select
            v-model="filterState.sublimFilter"
            class="date-inp"
            style="width: 80px"
            @change="fetchData"
          >
            <option value="">ALL</option>
            <option value="Y">Y</option>
            <option value="N">Tidak</option>
          </select>
        </div>
      </template>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        class="ml-2"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend>
          <IconPrinter :size="15" :stroke-width="1.7" />
        </template>
        Cetak
      </v-btn>
    </template>

    <!-- Custom Render Kolom -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.CetakBAST="{ item }">
      <span
        v-if="item.CetakBAST"
        class="badge-bast-sudah"
      >
        SUDAH
      </span>
      <span v-else class="badge-bast-belum">BELUM</span>
    </template>

    <template #item.Sublim="{ item }">
      <span
        v-if="item.Sublim === 'Y'"
        class="badge-sublim"
      >
        Sublim
      </span>
      <span v-else class="text-grey">-</span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.filter-sep {
  font-size: 11px;
  color: #888;
}
.filter-divider {
  width: 1px;
  height: 22px;
  background: #d0d0d0;
  margin: 0 10px;
  flex-shrink: 0;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.date-inp:focus {
  border-color: #1976d2;
}

.radio-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  cursor: pointer;
  white-space: nowrap;
}
.radio-label input[type="radio"],
.radio-label input[type="checkbox"] {
  accent-color: #1565c0;
  cursor: pointer;
  width: 13px;
  height: 13px;
  margin: 0;
}

.badge-bast-sudah {
  background: #2e7d32;
  color: white;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
}
.badge-bast-belum {
  background: #fdd835;
  color: #333;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
}
.badge-sublim {
  background: #6a1b9a;
  color: white;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
}
</style>
