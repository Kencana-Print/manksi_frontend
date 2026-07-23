<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { sjTakNormalService as svc } from "@/services/penjualan/sjTakNormalService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconTruckOff,
  IconPrinter,
  IconFileExport,
  IconListDetails,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

// ── Helpers ────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Filter — default hari ini s.d. hari ini ─────────────────
const tglAwal = ref(todayLocal());
const tglAkhir = ref(todayLocal());

const filterState = computed(() => ({
  tglAwal: tglAwal.value,
  tglAkhir: tglAkhir.value,
}));
const onFilterStateRestore = (val: any) => {
  if (val?.tglAwal) tglAwal.value = val.tglAwal;
  if (val?.tglAkhir) tglAkhir.value = val.tglAkhir;
};

// ── useBrowse ──────────────────────────────────────────────
const { items, isLoading, selected, canInsert, canEdit, canDelete, fetchData } =
  useBrowse({
    menuId: "154",
    fetchApi: async () => {
      const res = await svc.getBrowse(tglAwal.value, tglAkhir.value);
      return res.data.data ?? [];
    },
  });

const selectedItem = computed(() => selected.value[0] ?? null);

// ── Expand detail ────────────────────────────────────────────
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Set<string>>(new Set());
const expandedItems = ref<any[]>([]);

const onExpandChange = async (newExpanded: any[]) => {
  expandedItems.value = newExpanded;
  const newKeys = newExpanded.map((i: any) => (i.raw || i).Nomor);
  for (const nomor of newKeys) {
    if (!detailCache.value[nomor] && !loadingDetails.value.has(nomor)) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const res = await svc.getBrowseDetail(
          tglAwal.value,
          tglAkhir.value,
          nomor,
        );
        detailCache.value[nomor] = res.data.data ?? [];
      } catch {
        detailCache.value[nomor] = [];
      } finally {
        loadingDetails.value.delete(nomor);
        loadingDetails.value = new Set(loadingDetails.value);
      }
    }
  }
};

// ── Headers ────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "90px" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Kode Cus", key: "KdCus", width: "90px" },
  { title: "Customer", key: "Customer", minWidth: "180px" },
  { title: "Alamat", key: "Alamat", minWidth: "200px" },
  { title: "Kota", key: "Kota", width: "120px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "140px" },
  { title: "Gudang", key: "Gudang", minWidth: "140px" },
  { title: "Qty Kirim", key: "QtyKirim", width: "90px", align: "end" },
  { title: "Created", key: "Created", width: "140px" },
];

// ── Auto refresh ───────────────────────────────────────────
watch([tglAwal, tglAkhir], fetchData);
onMounted(fetchData);

// ── Navigate ─────────────────────────────────────────────────
// CATATAN: route & view Form/Print belum dibuat — akan error sampai
// SjTakNormalFormView.vue & SjTakNormalPrintView.vue dibuat.
const goNew = () => {
  router.push({ name: "SjTakNormalFormCreate" });
};

const goEdit = async () => {
  if (!selectedItem.value) return;
  try {
    const res = await svc.cekBisaUbah(selectedItem.value.Nomor);
    const cek = res.data.data;
    if (!cek.bisa) {
      toast.error(cek.reason);
      return;
    }
    router.push({
      name: "SjTakNormalFormEdit",
      query: { nomor: selectedItem.value.Nomor },
    });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal cek data.");
  }
};

// ── Delete ─────────────────────────────────────────────────
const checkBisaHapus = async (item: any): Promise<boolean> => {
  try {
    const res = await svc.cekBisaHapus(item.Nomor);
    const cek = res.data.data;
    if (!cek.bisaHapus) {
      toast.error(cek.reason);
      return false;
    }
    return true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal cek data.");
    return false;
  }
};

const onDelete = async (item: any) => {
  try {
    await svc.deleteData(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal hapus.");
  }
};

// ── Cetak ──────────────────────────────────────────────────
const onCetak = async () => {
  if (!selectedItem.value) return;
  try {
    const res = await svc.cekBisaCetak(selectedItem.value.Nomor);
    const cek = res.data.data;
    if (!cek.bisa) {
      toast.error(cek.reason);
      return;
    }
    const url = router.resolve({
      name: "SjTakNormalPrint",
      query: { nomor: selectedItem.value.Nomor },
    }).href;
    window.open(url, "_blank");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal cek data.");
  }
};

// ── Export ─────────────────────────────────────────────────
const isExporting = ref(false);
const isExportingDetail = ref(false);

const onExport = async () => {
  isExporting.value = true;
  try {
    const res = await svc.getExportData(tglAwal.value, tglAkhir.value);
    const data = res.data.data ?? [];
    await exportExcelSingle(
      `SJ_Tak_Normal_${tglAwal.value}_${tglAkhir.value}`,
      "SJ Tak Normal",
      [
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Divisi", key: "Divisi" },
        { header: "Kode Cus", key: "KdCus" },
        { header: "Customer", key: "Customer" },
        { header: "Alamat", key: "Alamat" },
        { header: "Kota", key: "Kota" },
        { header: "Keterangan", key: "Keterangan" },
        { header: "Gudang", key: "Gudang" },
        { header: "Qty Kirim", key: "QtyKirim", align: "right" },
        { header: "Created", key: "Created" },
      ],
      data,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await svc.getExportDetail(tglAwal.value, tglAkhir.value);
    const data = res.data.data ?? [];
    await exportExcelSingle(
      `SJ_Tak_Normal_Detail_${tglAwal.value}_${tglAkhir.value}`,
      "Detail",
      [
        { header: "Nomor SJ", key: "Nomor" },
        { header: "Kode", key: "Kode" },
        { header: "Nama", key: "Nama" },
        { header: "Ukuran", key: "Ukuran" },
        { header: "Panjang", key: "Panjang", align: "right" },
        { header: "Lebar", key: "Lebar", align: "right" },
        { header: "Jumlah", key: "Jumlah", align: "right" },
        { header: "Keterangan", key: "Keterangan" },
      ],
      data,
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Surat Jalan Tak Normal"
    menu-id="154"
    :icon="IconTruckOff"
    :is-loading="isLoading"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :before-delete="checkBisaHapus"
    search-placeholder="Cari nomor, customer, keterangan..."
    :selected="selected"
    :show-expand="true"
    :loading-details="loadingDetails"
    :expanded="expandedItems"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestore"
    @update:selected="selected = $event"
    @update:expanded="onExpandChange"
    @add="goNew"
    @edit="goEdit"
    @delete="onDelete"
    @refresh="fetchData"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <label class="flbl">Tanggal</label>
      <input type="date" v-model="tglAwal" class="finp" />
      <span class="fsep">s.d.</span>
      <input type="date" v-model="tglAkhir" class="finp" />
    </template>

    <!-- ── Extra actions ── -->
    <template #extra-actions>
      <v-btn
        size="small"
        variant="outlined"
        color="primary"
        :disabled="!selectedItem"
        @click="onCetak"
      >
        <IconPrinter :size="14" style="margin-right: 4px" />
        Cetak
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExporting"
        @click="onExport"
      >
        <IconFileExport :size="14" style="margin-right: 4px" />
        Export
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <IconListDetails :size="14" style="margin-right: 4px" />
        Export Detail
      </v-btn>
    </template>

    <!-- ── Custom cell rendering ── -->
    <template #item.QtyKirim="{ item }">
      {{ num(item.QtyKirim) }}
    </template>
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div class="dtbl-wrap">
        <table class="dtbl">
          <thead>
            <tr>
              <th style="width: 26px">#</th>
              <th style="width: 130px">Kode</th>
              <th style="min-width: 200px">Nama</th>
              <th style="width: 100px">Ukuran</th>
              <th style="width: 80px; text-align: right">Panjang</th>
              <th style="width: 80px; text-align: right">Lebar</th>
              <th style="width: 80px; text-align: right">Jumlah</th>
              <th style="min-width: 140px">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="detailCache[item.Nomor]?.length">
              <tr v-for="(d, j) in detailCache[item.Nomor]" :key="j">
                <td style="text-align: center; color: #9e9e9e; font-size: 10px">
                  {{ j + 1 }}
                </td>
                <td
                  style="
                    font-family: monospace;
                    font-size: 10px;
                    color: #1565c0;
                  "
                >
                  {{ d.Kode }}
                </td>
                <td>{{ d.Nama }}</td>
                <td>{{ d.Ukuran }}</td>
                <td style="text-align: right">{{ d.Panjang || "-" }}</td>
                <td style="text-align: right">{{ d.Lebar || "-" }}</td>
                <td style="text-align: right">{{ num(d.Jumlah) }}</td>
                <td>{{ d.Keterangan }}</td>
              </tr>
            </template>
            <tr v-else-if="loadingDetails.has(item.Nomor)">
              <td
                colspan="8"
                style="text-align: center; padding: 8px; color: #9e9e9e"
              >
                Memuat...
              </td>
            </tr>
            <tr v-else>
              <td
                colspan="8"
                style="
                  text-align: center;
                  padding: 8px;
                  color: #9e9e9e;
                  font-style: italic;
                "
              >
                Tidak ada detail
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.flbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.finp {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.finp:focus {
  border-color: #1565c0;
}
.fsep {
  font-size: 11px;
  color: #777;
}

.dtbl-wrap {
  overflow-x: auto;
  max-width: 100%;
  margin: 6px 0 6px 32px;
  width: calc(100% - 32px);
  border-radius: 4px;
}
.dtbl {
  min-width: 700px;
  border-collapse: collapse;
  font-size: 11px;
  width: 100%;
}
.dtbl th {
  background: #455a64;
  color: white;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.dtbl td {
  padding: 3px 6px;
  border-bottom: 0.3px solid #ececec;
  white-space: nowrap;
}
</style>
