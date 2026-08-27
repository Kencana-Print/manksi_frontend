<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkGudangService } from "@/services/garmen/spkGudangService";
import { exportExcelSingle } from "@/utils/excelExport";
import { IconClipboardList, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

// Default filter: awal bulan s.d. hari ini
const today = new Date();
const padDate = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;

const firstDayOfMonth = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const todayStr = toLocalDate(today);

const SESSION_KEY = "spk_gudang_browse_filter";
const savedFilter = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
})();

const dtAwal = ref(savedFilter.dtAwal || firstDayOfMonth);
const dtAkhir = ref(savedFilter.dtAkhir || todayStr);

watch([dtAwal, dtAkhir], () => {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ dtAwal: dtAwal.value, dtAkhir: dtAkhir.value }),
  );
  fetchData();
});

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selectedItem,
  fetchData,
} = useBrowse({
  menuId: "79",
  fetchApi: async () => {
    const res = await spkGudangService.getBrowse({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
    });
    return res.data.data;
  },
  immediate: false,
});

// --- Headers ---
// Ngedit tidak ditampilkan sebagai kolom (sama seperti Delphi — kolom
// disembunyikan), tapi tetap dipakai untuk pewarnaan sel Nomor.
const headers = [
  { title: "Nomor", key: "Nomor", width: "140px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "100px", align: "center" },
  { title: "Jenis Kaos", key: "JenisKaos", width: "120px" },
  { title: "Lengan", key: "Lengan", width: "90px" },
  { title: "Jenis Kain", key: "JenisKain", width: "150px" },
  { title: "Finishing", key: "Finishing", width: "120px" },
  { title: "Workshop", key: "Workshop", width: "120px" },
  { title: "Keterangan", key: "Keterangan", width: "220px" },
  { title: "User", key: "UserCreate", width: "80px" },
  { title: "Created", key: "Created", width: "140px", align: "center" },
];

// --- Expand detail ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !detailLoading.value[item.Nomor],
  );
  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    detailLoading.value[nomor] = true;
    try {
      const res = await spkGudangService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data || [];
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

// --- Pewarnaan sel Nomor sesuai status pengajuan perubahan data ---
// Replikasi cxGrdMasterCustomDrawCell Delphi: warna cuma di kolom Nomor,
// bukan seluruh baris. WAIT=biru, TOLAK=merah, ACC=hijau, kosong=default.
const nomorCellClass = (ngedit: string) => {
  if (ngedit === "WAIT") return "cell-wait";
  if (ngedit === "TOLAK") return "cell-tolak";
  if (ngedit === "ACC") return "cell-acc";
  return "";
};

// --- Handlers ---
onMounted(() => fetchData());

const onAdd = () => {
  router.push("/garmen/spk-gudang/create");
};

const onEdit = (item: any) => {
  router.push(`/garmen/spk-gudang/edit/${encodeURIComponent(item.Nomor)}`);
};

const onDelete = async (item: any) => {
  try {
    await spkGudangService.deleteData(item.Nomor);
    toast.success("SPK Gudang berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};

const onPrint = () => {
  if (!selectedItem.value) return;
  window.open(
    `/garmen/spk-gudang/print/${encodeURIComponent(selectedItem.value.Nomor)}`,
    "_blank",
  );
};

const onExportHeader = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");
  try {
    const res = await spkGudangService.exportHeader({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
    });
    await exportExcelSingle(
      `SpkGudang_Header_${dtAwal.value}_${dtAkhir.value}.xlsx`,
      "SPK Gudang",
      [
        { header: "Nomor", key: "Nomor", width: 18 },
        { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
        { header: "Dateline", key: "Dateline", width: 12, align: "center" },
        { header: "Jenis Kaos", key: "JenisKaos", width: 16 },
        { header: "Lengan", key: "Lengan", width: 12 },
        { header: "Jenis Kain", key: "JenisKain", width: 20 },
        { header: "Finishing", key: "Finishing", width: 16 },
        { header: "Workshop", key: "Workshop", width: 16 },
        { header: "Keterangan", key: "Keterangan", width: 30 },
        { header: "User", key: "UserCreate", width: 12 },
      ],
      res.data.data,
      `SPK Gudang Periode ${dtAwal.value} s/d ${dtAkhir.value}`,
    );
  } catch (e: any) {
    toast.error("Gagal export header.");
  }
};

const onExportDetail = async () => {
  try {
    const res = await spkGudangService.exportDetail({
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
    });
    if (!res.data.data?.length)
      return toast.warning("Tidak ada detail untuk diekspor.");
    await exportExcelSingle(
      `SpkGudang_Detail_${dtAwal.value}_${dtAkhir.value}.xlsx`,
      "SPK Gudang Detail",
      [
        { header: "Nomor", key: "Nomor", width: 18 },
        { header: "No. SPK", key: "Spk", width: 18 },
        { header: "Nama SPK", key: "NamaSpk", width: 35 },
        {
          header: "Qty",
          key: "Qty",
          width: 10,
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Kode Kaosan", key: "KodeKaosan", width: 16 },
      ],
      res.data.data,
      `SPK Gudang Detail Periode ${dtAwal.value} s/d ${dtAkhir.value}`,
    );
  } catch (e: any) {
    toast.error("Gagal export detail.");
  }
};

const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";
</script>

<template>
  <BaseBrowse
    title="SPK Gudang"
    menu-id="79"
    :icon="IconClipboardList"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="onExportHeader"
  >
    <!-- Filter -->
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="dtAwal" class="f-inp" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="dtAkhir" class="f-inp" />
      </div>
    </template>

    <!-- Tombol ekstra: Cetak + Export Detail -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend
          ><i class="ti ti-printer" style="font-size: 15px"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-2"
        :disabled="!canExport"
        @click="onExportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>
        Export Detail
      </v-btn>
    </template>

    <!-- Kolom custom -->
    <template #item.Nomor="{ item }">
      <span :class="nomorCellClass(item.Ngedit)" class="nomor-cell">{{
        item.Nomor
      }}</span>
    </template>
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.Dateline="{ item }">
      {{ formatTanggal(item.Dateline) }}
    </template>
    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>

    <!-- Expand detail -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="detailLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">Detail SPK — {{ item.Nomor }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th>No. SPK</th>
                <th>Nama SPK</th>
                <th>Kode Kaosan</th>
                <th class="tr">Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailCache[item.Nomor]" :key="i">
                <td class="mono">{{ d.Spk }}</td>
                <td>{{ d.NamaSpk }}</td>
                <td class="mono">{{ d.KodeKaosan }}</td>
                <td class="tr fw">{{ numFmt(d.Qty) }}</td>
              </tr>
              <tr v-if="!detailCache[item.Nomor]?.length">
                <td
                  colspan="4"
                  class="tc text-grey pa-3"
                  style="font-size: 11px"
                >
                  Tidak ada detail.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-sep {
  font-size: 11px;
  color: #555;
}

.nomor-cell {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
}
.cell-wait {
  background: #1565c0;
  color: #fff !important;
  font-weight: 600;
}
.cell-tolak {
  background: #c62828;
  color: #fff !important;
  font-weight: 600;
}
.cell-acc {
  background: #2e7d32;
  color: #fff !important;
  font-weight: 600;
}

.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #1565c0;
}
.mb-2 {
  margin-bottom: 8px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
}
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 11px;
}
.detail-table tbody tr:hover td {
  background: #f5f5f5;
}
.tr {
  text-align: right !important;
}
.tc {
  text-align: center !important;
}
.fw {
  font-weight: 700;
}
.mono {
  font-family: monospace;
  font-size: 10px;
}
</style>
