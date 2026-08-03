<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { cetakBkbjService as svc } from "@/services/garmen/cetakBkbjService";
import { exportExcelSingle } from "@/utils/excelExport";
import { IconFileInvoice } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const MENU_ID = "143";
const router = useRouter();
const toast = useToast();

// ── Helpers ────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const firstOfMonth = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

// ── Filter ─────────────────────────────────────────────────
const tglAwal = ref(firstOfMonth());
const tglAkhir = ref(todayLocal());
const gudangOptions = [
  { value: "GJ001", label: "GJ001 - Gudang Barang Jadi Jeron" },
  { value: "WH-010", label: "WH-010" }, // ⚠️ nama gudang WH-010 belum dikonfirmasi
];
const filterGudang = ref("GJ001");

// ── Browse ─────────────────────────────────────────────────
const { items, isLoading, selected, canExport, fetchData, clearSelection } =
  useBrowse<any>({
    menuId: MENU_ID,
    immediate: true,
    fetchApi: async () => {
      const res = await svc.getBrowse(
        tglAwal.value,
        tglAkhir.value,
        filterGudang.value,
      );
      return res.data.data ?? [];
    },
  });

watch([tglAwal, tglAkhir, filterGudang], () => fetchData());

const selectedItem = computed(() => selected.value?.[0] ?? null);

// ── Cetak (dialog konfirmasi, bukan window.confirm) ─────────
const showCetakDialog = ref(false);
const isCetakLoading = ref(false);

const onCetakClick = () => {
  if (!selectedItem.value) return;
  showCetakDialog.value = true;
};

const confirmCetak = async () => {
  if (!selectedItem.value) return;
  isCetakLoading.value = true;
  try {
    const g = selectedItem.value.Gudang;
    const t = selectedItem.value.Tanggal;
    const e = selectedItem.value.Expedisi;

    await svc.prosesCetak(g, t, e);

    const url = router.resolve({
      name: "CetakBkbjPrint",
      query: { gudang: g, tanggal: t, expedisi: e },
    }).href;
    window.open(url, "_blank");

    showCetakDialog.value = false;
    clearSelection();
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal memproses cetak.");
  } finally {
    isCetakLoading.value = false;
  }
};

// ── Export ─────────────────────────────────────────────────
const onExport = async () => {
  try {
    const res = await svc.getExportData(
      tglAwal.value,
      tglAkhir.value,
      filterGudang.value,
    );
    await exportExcelSingle(
      `BKBJ_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      "BKBJ",
      [
        { header: "Gudang", key: "Gudang", width: 12 },
        { header: "Tanggal", key: "Tanggal", width: 12 },
        { header: "Expedisi", key: "Expedisi", width: 25 },
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "Tgl Print", key: "TglPrint", width: 12 },
      ],
      res.data.data ?? [],
      "Cetak Bukti Keluar Barang Jadi",
    );
  } catch {
    toast.error("Gagal export.");
  }
};

// ── Headers ────────────────────────────────────────────────
const headers = [
  { title: "Gudang", key: "Gudang", width: "90px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Expedisi", key: "Expedisi", minWidth: "200px" },
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tgl Print", key: "TglPrint", width: "100px" },
];
</script>

<template>
  <BaseBrowse
    title="Cetak Bukti Keluar Barang Jadi (BKBJ)"
    menu-id="143"
    :icon="IconFileInvoice"
    :is-loading="isLoading"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    :selected="selected"
    search-placeholder="Cari expedisi, nomor..."
    @update:selected="selected = $event"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <label class="flbl">Periode</label>
      <input type="date" v-model="tglAwal" class="finp" />
      <span class="flbl">s.d.</span>
      <input type="date" v-model="tglAkhir" class="finp" />

      <label class="flbl" style="margin-left: 8px">Gudang</label>
      <select v-model="filterGudang" class="finp">
        <option
          v-for="opt in gudangOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
    </template>

    <!-- tombol Export bawaan sudah otomatis muncul dari :can-export -->
    <template #extra-actions>
      <v-btn
        size="small"
        color="orange"
        :disabled="!selectedItem"
        @click="onCetakClick"
      >
        Cetak
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.Nomor="{ item }">
      <span
        :style="
          item.Nomor
            ? 'color:#1565c0;font-weight:600;font-family:monospace'
            : 'color:#9e9e9e'
        "
      >
        {{ item.Nomor || "-" }}
      </span>
    </template>

    <template #item.TglPrint="{ item }">
      {{ item.TglPrint ? formatTanggal(item.TglPrint) : "-" }}
    </template>
  </BaseBrowse>

  <!-- Dialog Konfirmasi Cetak (ganti window.confirm) -->
  <v-dialog v-model="showCetakDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Konfirmasi Cetak
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Yakin akan dicetak untuk expedisi
        <b>{{ selectedItem?.Expedisi }}</b> tanggal
        <b>{{ selectedItem ? formatTanggal(selectedItem.Tanggal) : "" }}</b
        >?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn
          variant="text"
          size="small"
          :disabled="isCetakLoading"
          @click="showCetakDialog = false"
        >
          Batal
        </v-btn>
        <v-btn
          variant="flat"
          size="small"
          color="orange"
          :loading="isCetakLoading"
          @click="confirmCetak"
        >
          Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.flbl {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.finp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.finp:focus {
  border-color: #1565c0;
}
</style>
