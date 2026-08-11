<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { cetakBarcodeKaosanService as svc } from "@/services/garmen/cetakBarcodeKaosanService";
import { exportExcelSingle } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { IconBarcode } from "@tabler/icons-vue";

const MENU_ID = "130";
const router = useRouter();
const toast = useToast();

// ── Helpers tanggal lokal (anti mundur 1 hari) ──
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Filter — default HARI INI s.d. HARI INI (replikasi startdate.Date:=Date) ──
const tglAwal = ref(todayLocal());
const tglAkhir = ref(todayLocal());

// ── Browse ──
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  clearSelection,
} = useBrowse<any>({
  menuId: MENU_ID,
  immediate: true,
  fetchApi: async () => {
    const res = await svc.getBrowse(tglAwal.value, tglAkhir.value);
    return res.data.data ?? [];
  },
});

watch([tglAwal, tglAkhir], () => fetchData());

const selectedItem = computed(() => selected.value?.[0] ?? null);

// ── Expand detail ──
const detailCache = ref<Record<string, any[]>>({});
const loadingDetail = ref<Set<string>>(new Set());
const expandedItems = ref<any[]>([]);

const onExpandChange = async (newExpanded: any[]) => {
  expandedItems.value = newExpanded;
  const newNomors = newExpanded.map((i: any) => (i.raw || i).Nomor);
  for (const nomor of newNomors) {
    if (!detailCache.value[nomor] && !loadingDetail.value.has(nomor)) {
      loadingDetail.value = new Set([...loadingDetail.value, nomor]);
      try {
        const res = await svc.getDetail(nomor);
        detailCache.value[nomor] = res.data.data ?? [];
      } catch {
        detailCache.value[nomor] = [];
      } finally {
        loadingDetail.value.delete(nomor);
        loadingDetail.value = new Set(loadingDetail.value);
      }
    }
  }
};

// ── Actions: Baru / Ubah / Hapus ──
const goNew = () => {
  router.push({ name: "CetakBarcodeKaosanFormCreate" });
};

const goEdit = () => {
  if (!selectedItem.value) return;
  router.push({
    name: "CetakBarcodeKaosanFormEdit",
    query: { nomor: selectedItem.value.Nomor },
  });
};

const onDelete = async () => {
  if (!selectedItem.value) return;
  if (!confirm(`Yakin hapus ${selectedItem.value.Nomor}?`)) return;
  try {
    await svc.deleteData(selectedItem.value.Nomor);
    toast.success("Data berhasil dihapus.");
    clearSelection();
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};

// ── Export & Export Detail (client-side, tidak ada endpoint export
// khusus karena tidak ada di referensi Delphi — dirakit dari
// getBrowse + getDetail per baris) ──
const isExporting = ref(false);
const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");
  isExporting.value = true;
  try {
    await exportExcelSingle(
      `Cetak_Barcode_Kaosan_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      "Barcode Kaosan",
      [
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
        { header: "Cab", key: "Cab", width: 10, align: "center" },
        { header: "User", key: "UserNama", width: 20 },
      ],
      items.value,
      "Cetak Barcode Kaosan",
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const isExportingDetail = ref(false);
const onExportDetail = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");
  isExportingDetail.value = true;
  try {
    const allDetails: any[] = [];
    for (const item of items.value) {
      let detail = detailCache.value[item.Nomor];
      if (!detail) {
        const res = await svc.getDetail(item.Nomor);
        detail = res.data.data ?? [];
      }
      detail.forEach((d: any) => {
        allDetails.push({
          Nomor: item.Nomor,
          Tanggal: formatTanggal(item.Tanggal),
          Cab: item.Cab,
          User: item.UserNama,
          Spk: d.Spk,
          Barcode: d.Barcode,
          Nama: d.Nama,
          Ukuran: d.Ukuran,
          Awal: d.Awal,
          Akhir: d.Akhir,
          Jumlah: d.Jumlah,
          PackingList: d.PackingList,
        });
      });
    }
    await exportExcelSingle(
      `Cetak_Barcode_Kaosan_Detail_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      "Barcode Kaosan Detail",
      [
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
        { header: "Cab", key: "Cab", width: 10, align: "center" },
        { header: "User", key: "User", width: 16 },
        { header: "SPK", key: "Spk", width: 20 },
        { header: "Barcode", key: "Barcode", width: 20 },
        { header: "Nama", key: "Nama", width: 32 },
        { header: "Ukuran", key: "Ukuran", width: 12 },
        {
          header: "Awal",
          key: "Awal",
          width: 12,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Akhir",
          key: "Akhir",
          width: 12,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Jumlah",
          key: "Jumlah",
          width: 12,
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Packing List", key: "PackingList", width: 20 },
      ],
      allDetails,
      "Detail Cetak Barcode Kaosan",
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// ── Headers master ──
const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Cab", key: "Cab", width: "70px" },
  { title: "User", key: "UserNama", width: "140px" },
];
</script>

<template>
  <BaseBrowse
    title="Cetak Barcode Kaosan"
    menu-id="130"
    :icon="IconBarcode"
    :is-loading="isLoading"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :selected="selected"
    :show-expand="true"
    :loading-details="loadingDetail"
    search-placeholder="Cari nomor..."
    @update:selected="selected = $event"
    @add="goNew"
    @edit="goEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="onExport"
    :expanded="expandedItems"
    @update:expanded="onExpandChange"
  >
    <template #filter-left>
      <label class="flbl">Filter Periode</label>
      <input type="date" v-model="tglAwal" class="finp" />
      <span class="flbl">s.d.</span>
      <input type="date" v-model="tglAkhir" class="finp" />
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="teal"
        :disabled="!canExport"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        Export Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <!-- Expanded detail -->
    <template #detail="{ item }">
      <table class="dtbl">
        <thead>
          <tr>
            <th style="width: 26px">#</th>
            <th style="width: 130px">SPK</th>
            <th style="width: 130px">Barcode</th>
            <th style="min-width: 220px">Nama</th>
            <th style="width: 90px">Ukuran</th>
            <th style="width: 80px; text-align: right">Awal</th>
            <th style="width: 80px; text-align: right">Akhir</th>
            <th style="width: 80px; text-align: right">Jumlah</th>
            <th style="width: 120px">Packing List</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="detailCache[item.Nomor]?.length">
            <tr v-for="(d, j) in detailCache[item.Nomor]" :key="j">
              <td style="text-align: center; color: #9e9e9e; font-size: 10px">
                {{ j + 1 }}
              </td>
              <td
                style="font-family: monospace; font-size: 10px; color: #1565c0"
              >
                {{ d.Spk }}
              </td>
              <td style="font-family: monospace; font-size: 10px">
                {{ d.Barcode }}
              </td>
              <td>{{ d.Nama }}</td>
              <td>{{ d.Ukuran }}</td>
              <td style="text-align: right">{{ num(d.Awal) }}</td>
              <td style="text-align: right">{{ num(d.Akhir) }}</td>
              <td style="text-align: right">{{ num(d.Jumlah) }}</td>
              <td>{{ d.PackingList }}</td>
            </tr>
          </template>
          <tr v-else-if="loadingDetail.has(item.Nomor)">
            <td
              colspan="9"
              style="text-align: center; padding: 8px; color: #9e9e9e"
            >
              Memuat...
            </td>
          </tr>
          <tr v-else>
            <td
              colspan="9"
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
    </template>
  </BaseBrowse>
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
.dtbl {
  border-collapse: collapse;
  font-size: 11px;
  min-width: 700px;
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
}
</style>
