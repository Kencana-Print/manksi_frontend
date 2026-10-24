<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  bastMapSpandukService,
  pesanError,
  type BastMapRow,
} from "@/services/spanduk/bastMapSpandukService";
import { IconPrinter } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { setKeputusan } from "@/services/spanduk/bastMapSpandukFormService";

const toast = useToast();
const router = useRouter();
const menuId = "4";

// Tanggal lokal (toISOString memakai UTC, lewat tengah malam WIB jadi mundur sehari)
const getLocalDate = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${t}`;
};

const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  onProgress: false,
});

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await bastMapSpandukService.getBrowse({
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
      onProgressOnly: filterState.value.onProgress,
    });
    return res.data.data || [];
  },
  immediate: true,
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Status BAST", key: "CetakBAST", width: "100px", align: "center" },
  { title: "Keputusan", key: "Keputusan", width: "120px", align: "center" },
  { title: "Nama Pekerjaan", key: "NamaPekerjaan", width: "250px" },
  { title: "Nama Ext", key: "NamaExt", width: "250px" },
  { title: "Ukuran", key: "Ukuran", width: "150px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "right" },
  { title: "Keterangan", key: "Keterangan", width: "200px" },
  { title: "Kendala", key: "kendalaProduksi", width: "200px" },
];

const goAdd = () => router.push({ name: "SpandukBastMapCreate" });
const goEdit = (item: BastMapRow) =>
  router.push({ name: "SpandukBastMapEdit", params: { nomor: item.Nomor } });
const cetak = () => {
  const row = selected.value[0];
  if (!row) return;
  if (!row.CetakBAST) {
    toast.warning("MAP ini belum memiliki BAST.");
    return;
  }
  window.open(
    `/spanduk/bast-map/print/${encodeURIComponent(row.Nomor)}`,
    "_blank",
  );
};
// ── KEPUTUSAN BAST N ──
const showKeputusan = ref(false);
const isSavingKeputusan = ref(false);
const formKeputusan = ref<{ keputusan: "LANJUT" | "ULANG"; alasan: string }>({
  keputusan: "LANJUT",
  alasan: "",
});

const bukaKeputusan = () => {
  const row = selected.value[0];
  if (!row) return;
  if (Number(row.SemuaN) !== 1) {
    toast.warning("Keputusan hanya untuk BAST yang seluruh kesesuaiannya N.");
    return;
  }
  formKeputusan.value = {
    keputusan: row.Keputusan === "ULANG" ? "ULANG" : "LANJUT",
    alasan: row.AlasanKeputusan ?? "",
  };
  showKeputusan.value = true;
};

const simpanKeputusan = async () => {
  const row = selected.value[0];
  if (!row) return;
  const alasan = formKeputusan.value.alasan.trim();
  if (!alasan) {
    toast.warning("Alasan wajib diisi.");
    return;
  }
  isSavingKeputusan.value = true;
  try {
    await setKeputusan(row.Nomor, {
      keputusan: formKeputusan.value.keputusan,
      alasan,
    });
    toast.success("Keputusan disimpan.");
    showKeputusan.value = false;
    selected.value = [];
    await fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal menyimpan keputusan."));
  } finally {
    isSavingKeputusan.value = false;
  }
};

// OnProgres 'N' = merah, 'Y' = biru (sama dengan Delphi garmen)
const getRowTextColor = (item: { raw?: BastMapRow } | BastMapRow) => {
  const row = "raw" in item && item.raw ? item.raw : (item as BastMapRow);
  if (row.OnProgres === "N") return "text-red-darken-2";
  if (row.OnProgres === "Y") return "text-blue-darken-2";
  return "";
};

// ── HAPUS ── (konfirmasi sudah ditangani BaseBrowse)
const goDelete = async (item: BastMapRow) => {
  try {
    await bastMapSpandukService.remove(item.Nomor);
    toast.success("BAST berhasil dihapus.");
    selected.value = [];
    await fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal menghapus."));
  }
};

// ── EXPORT ──
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Tipe", key: "Tipe", width: 10, align: "center" },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Status BAST", key: "CetakBAST", width: 14, align: "center" },
      { header: "Keputusan", key: "Keputusan", width: 12, align: "center" },
      { header: "Alasan Keputusan", key: "AlasanKeputusan", width: 30 },
      { header: "Nama Pekerjaan", key: "NamaPekerjaan", width: 30 },
      { header: "Nama Ext", key: "NamaExt", width: 30 },
      { header: "Ukuran", key: "Ukuran", width: 16 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Keterangan", key: "Keterangan", width: 24 },
      { header: "Kendala", key: "kendalaProduksi", width: 24 },
    ];
    const rows = items.value.map((r) => ({
      ...r,
      Tanggal: formatTanggal(r.Tanggal),
    }));
    await exportExcelSingle(
      `BAST_MAP_Spanduk_${filterState.value.startDate}_to_${filterState.value.endDate}.xlsx`,
      "BAST MAP",
      columns,
      rows,
      `BAST MAP SPANDUK | Periode: ${formatTanggal(filterState.value.startDate)} s.d ${formatTanggal(filterState.value.endDate)}`,
    );
    toast.success("Berhasil export.");
  } catch {
    toast.error("Gagal export.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Cetak BAST MAP"
    :menu-id="menuId"
    :icon="IconPrinter"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filterState="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-text-color-fn="getRowTextColor"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @export="onExport"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Tanggal MAP</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
          :disabled="filterState.onProgress"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
          :disabled="filterState.onProgress"
        />
      </div>

      <v-checkbox
        v-model="filterState.onProgress"
        label="Tampilkan saja BAST MAP On Progress"
        density="compact"
        hide-details
        class="ml-4 cust-cb"
        @change="fetchData"
      ></v-checkbox>

      <div class="filter-divider"></div>

      <div class="legend-group">
        <div class="legend-item">
          <div class="legend-box bg-red"></div>
          <span>= On Progress</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-blue"></div>
          <span>= Sudah Approval</span>
        </div>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        variant="flat"
        color="blue-grey"
        :disabled="selected.length === 0"
        @click="cetak"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        variant="flat"
        color="orange-darken-2"
        :disabled="
          selected.length === 0 || !canEdit || selected[0]?.SemuaN !== 1
        "
        @click="bukaKeputusan"
      >
        Keputusan
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.CetakBAST="{ item }">
      <v-chip
        v-if="item.CetakBAST"
        color="success"
        size="x-small"
        label
        class="font-weight-bold"
        >SUDAH</v-chip
      >
    </template>
    <template #item.Keputusan="{ item }">
      <v-chip
        v-if="item.Keputusan"
        :color="item.Keputusan === 'LANJUT' ? 'success' : 'error'"
        size="x-small"
        label
        class="font-weight-bold"
        :title="item.AlasanKeputusan ?? ''"
      >
        {{ item.Keputusan === "LANJUT" ? "LANJUT" : "PRODUKSI ULANG" }}
      </v-chip>
      <span
        v-else-if="item.SemuaN === 1"
        class="text-red-darken-2 text-caption"
      >
        Belum diputuskan
      </span>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showKeputusan" max-width="440" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-orange-darken-2 text-white pa-3">
        Keputusan BAST MAP {{ selected[0]?.Nomor }}
      </v-card-title>
      <v-card-text class="pa-4">
        <v-radio-group
          v-model="formKeputusan.keputusan"
          density="compact"
          hide-details
        >
          <v-radio label="Lanjut (boleh ke Mutasi Marketing)" value="LANJUT" />
          <v-radio label="Produksi ulang (tertahan)" value="ULANG" />
        </v-radio-group>
        <v-textarea
          v-model="formKeputusan.alasan"
          label="Alasan (wajib)"
          rows="3"
          maxlength="200"
          counter
          class="mt-3"
          hide-details="auto"
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          :disabled="isSavingKeputusan"
          @click="showKeputusan = false"
        >
          Batal
        </v-btn>
        <v-spacer />
        <v-btn
          color="orange-darken-2"
          variant="elevated"
          :loading="isSavingKeputusan"
          @click="simpanKeputusan"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.filter-divider {
  width: 1px;
  height: 24px;
  background-color: #d0d0d0;
  margin: 0 12px;
}
.legend-group {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  font-weight: 500;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
.bg-red {
  background-color: #d32f2f;
}
.bg-blue {
  background-color: #1976d2;
}
.cust-cb :deep(.v-label) {
  font-size: 11px !important;
  font-weight: 600;
  opacity: 1;
  color: #333;
}
.cust-cb :deep(.v-selection-control) {
  min-height: unset;
}
</style>
