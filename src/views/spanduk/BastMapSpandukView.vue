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
import { IconPrinter, IconCalendar } from "@tabler/icons-vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { setKeputusan } from "@/services/spanduk/bastMapSpandukFormService";
import { formatTanggalSingkat } from "@/utils/dateFormat";

const toast = useToast();
const router = useRouter();
const menuId = "4";
const BATAS_HARI_BAST = 3;

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

const inpAwal = ref<HTMLInputElement | null>(null);
const inpAkhir = ref<HTMLInputElement | null>(null);

const bukaPicker = (el: HTMLInputElement | null) => {
  if (!el || filterState.value.onProgress) return;
  el.showPicker();
};

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
  { title: "LHK Proof", key: "NomorProof", width: "190px" },
  {
    title: "Umur MAP (hari kerja)",
    key: "HariBAST",
    width: "150px",
    align: "center",
  },
  { title: "Nama Pekerjaan", key: "NamaPekerjaan", width: "250px" },
  { title: "Nama Ext", key: "NamaExt", width: "250px" },
  { title: "Ukuran", key: "Ukuran", width: "150px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "right" },
  { title: "Keterangan", key: "Keterangan", width: "200px" },
  { title: "Kendala", key: "kendalaProduksi", width: "200px" },
];

const goAdd = () => router.push({ name: "SpandukBastMapCreate" });
const goEdit = (item: BastMapRow) => {
  if (!item.CetakBAST && !item.NomorProof) {
    toast.warning(
      `MAP ${item.Nomor} belum punya LHK Proof. Jika bukan MAP lama, BAST akan ditolak.`,
      { timeout: 6000 },
    );
  }
  router.push({ name: "SpandukBastMapEdit", params: { nomor: item.Nomor } });
};
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
  if (!row.CetakBAST) {
    toast.warning("MAP ini belum memiliki BAST.");
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
      {
        header: "Umur MAP (hari kerja)",
        key: "HariBAST",
        width: 18,
        align: "center",
      },
      { header: "Nama Pekerjaan", key: "NamaPekerjaan", width: 30 },
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
      { header: "Status BAST", key: "CetakBAST", width: 14, align: "center" },
      { header: "Keputusan", key: "Keputusan", width: 12, align: "center" },
      { header: "Alasan Keputusan", key: "AlasanKeputusan", width: 30 },
    ];
    const rows = items.value.map((r) => ({
      ...r,
      Tanggal: formatTanggalSingkat(r.Tanggal),
    }));
    await exportExcelSingle(
      `BAST_MAP_Spanduk_${filterState.value.startDate}_to_${filterState.value.endDate}.xlsx`,
      "BAST MAP",
      columns,
      rows,
      `BAST MAP SPANDUK | Periode: ${formatTanggalSingkat(filterState.value.startDate)} s.d ${formatTanggalSingkat(filterState.value.endDate)}`,
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
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @export="onExport"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Tanggal MAP</span>
        <div
          class="date-box"
          :class="{ 'date-box-off': filterState.onProgress }"
          role="button"
          tabindex="0"
          @click="bukaPicker(inpAwal)"
          @keydown.enter.prevent="bukaPicker(inpAwal)"
        >
          <span>{{ formatTanggalSingkat(filterState.startDate) }}</span>
          <IconCalendar :size="14" :stroke-width="1.7" />
          <input
            ref="inpAwal"
            type="date"
            v-model="filterState.startDate"
            class="date-native"
            tabindex="-1"
            @change="fetchData"
          />
        </div>
        <span class="filter-sep">s/d</span>
        <div
          class="date-box"
          :class="{ 'date-box-off': filterState.onProgress }"
          role="button"
          tabindex="0"
          @click="bukaPicker(inpAkhir)"
          @keydown.enter.prevent="bukaPicker(inpAkhir)"
        >
          <span>{{ formatTanggalSingkat(filterState.endDate) }}</span>
          <IconCalendar :size="14" :stroke-width="1.7" />
          <input
            ref="inpAkhir"
            type="date"
            v-model="filterState.endDate"
            class="date-native"
            tabindex="-1"
            @change="fetchData"
          />
        </div>
      </div>

      <v-checkbox
        v-model="filterState.onProgress"
        label="Tampilkan saja BAST MAP On Progress"
        density="compact"
        hide-details
        class="ml-4 cust-cb"
        @change="fetchData"
      ></v-checkbox>
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
        :disabled="selected.length === 0 || !canEdit || !selected[0]?.CetakBAST"
        @click="bukaKeputusan"
      >
        Keputusan
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggalSingkat(item.Tanggal) }}
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
    <template #item.NomorProof="{ item }">
      <span v-if="item.NomorProof" class="proof-wrap">
        <span
          v-for="(no, i) in item.NomorProof.split(',')"
          :key="`${no}-${i}`"
          class="proof-item"
          >{{ no.trim() }}</span
        >
      </span>
      <span v-else class="text-red-darken-2 text-caption">Belum ada</span>
    </template>
    <template #item.HariBAST="{ item }">
      <v-chip
        v-if="item.HariBAST !== null"
        :color="item.HariBAST > BATAS_HARI_BAST ? 'error' : 'success'"
        size="x-small"
        label
        class="font-weight-bold"
        :title="
          item.CetakBAST
            ? 'Selisih MAP dibuat s.d. BAST dibuat'
            : 'Selisih MAP dibuat s.d. hari ini'
        "
      >
        {{ item.HariBAST
        }}{{ item.HariBAST > BATAS_HARI_BAST ? " · Terlambat" : "" }}
      </v-chip>
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
          <v-radio
            label="Lanjut (boleh ke Form Mutasi (Sample))"
            value="LANJUT"
          />
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
.date-box {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 28px;
  min-width: 108px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  background: white;
  cursor: pointer;
  user-select: none;
}
.date-box:focus-visible {
  outline: 2px solid #1565c0;
}
.date-box-off {
  opacity: 0.5;
  cursor: not-allowed;
}
.date-native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
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
.proof-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0 8px;
  white-space: normal;
  line-height: 1.3;
  padding: 2px 0;
}
.proof-item {
  white-space: nowrap;
}
</style>
