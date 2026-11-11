<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SupplierFormDialog from "@/components/dialogs/SupplierFormDialog.vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconTruck } from "@tabler/icons-vue";

interface RekeningRow {
  Bank: string;
  AtasNama: string;
  Rekening: string;
}

interface SupplierRow {
  Kode: string;
  Nama: string;
  Aktif: string;
  RekeningList?: RekeningRow[];
  [key: string]: unknown;
}

const toast = useToast();

const authStore = useAuthStore();

// Harus sama dengan BAGIAN_LIHAT_REKENING di backend (backend yang menentukan
// data terkirim atau tidak; ini hanya mengatur tampilan kolom).
const BAGIAN_LIHAT_REKENING = [
  "PEMBELIAN",
  "FINANCE",
  "EDP",
  "DIREKSI",
  "AUDIT",
];
const canLihatRekening = computed(() =>
  BAGIAN_LIHAT_REKENING.includes((authStore.user?.bagian || "").toUpperCase()),
);

const browseRef = ref<{
  getFilteredItems: () => Record<string, unknown>[];
} | null>(null);

// ID 12 untuk Master Supplier
const { items, isLoading, canInsert, canEdit, canExport, selected, fetchData } =
  useBrowse({
    menuId: "12",
    fetchApi: async () => {
      const res = await api.get("/master/supplier");
      return res.data.data;
    },
  });

const headers = computed(() => [
  { title: "KODE", key: "Kode", width: "100px" },
  { title: "NAMA", key: "Nama", minWidth: "200px" },
  { title: "ALAMAT", key: "Alamat", minWidth: "250px" },
  { title: "KOTA", key: "Kota", width: "120px" },
  ...(canLihatRekening.value
    ? [
        {
          title: "JML REK",
          key: "JmlRekening",
          width: "80px",
          align: "center" as const,
        },
      ]
    : []),
  { title: "TELP", key: "Telp", width: "120px" },
  { title: "FAX", key: "Fax", width: "120px" },
  { title: "CONTACT", key: "Contact", width: "120px" },
  { title: "HP", key: "HP", width: "120px" },
  { title: "TARGET MITRA", key: "TargetMitra", width: "120px", align: "right" },
  { title: "KETERANGAN", key: "Keterangan", minWidth: "200px" },
  { title: "AKTIF", key: "Aktif", width: "80px", align: "center" },
  { title: "USER CREATE", key: "Usr", width: "110px" },
  { title: "DATE CREATE", key: "Created", width: "150px" },
]);

// --- EXPAND (DETAIL REKENING) ---
// Rekening sudah ikut terkirim di tiap baris (RekeningList), jadi tidak perlu fetch per baris.
const expandedRows = ref<SupplierRow[]>([]);

const onUpdateExpanded = (newExpanded: SupplierRow[]) => {
  expandedRows.value = newExpanded;
};

const muatUlang = () => {
  expandedRows.value = [];
  return fetchData();
};

// Pewarnaan jika Aktif = 'N' / Pasif
const rowPropsFn = (data: { item: SupplierRow & { raw?: SupplierRow } }) => {
  const item = data.item?.raw || data.item;
  if (item.Aktif === "N") return { class: "text-red font-weight-bold" };
  return {};
};

const showDialog = ref(false);
const isNewMode = ref(true);
const editData = ref(null);

const handleAdd = () => {
  isNewMode.value = true;
  editData.value = null;
  showDialog.value = true;
};

const handleEdit = async (item: SupplierRow) => {
  try {
    isNewMode.value = false;
    // Panggil API getById untuk mengambil data Rekening Bank yang ada di tabel detail
    const res = await api.get(`/master/supplier/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal memuat detail supplier");
  }
};

// Export: satu baris per rekening (supplier tanpa rekening tetap satu baris),
// mengikuti search + filter kolom yang sedang tampil di browse.
const onExport = async () => {
  const rows = (browseRef.value?.getFilteredItems() ?? []) as SupplierRow[];
  if (!rows.length) return toast.warning("Tidak ada data untuk diexport.");

  const kosong: RekeningRow = { Bank: "", AtasNama: "", Rekening: "" };
  const data = rows.flatMap((r) => {
    const list =
      canLihatRekening.value && r.RekeningList?.length
        ? r.RekeningList
        : [kosong];
    return list.map((x) => ({
      ...r,
      Bank: x.Bank,
      AtasNama: x.AtasNama,
      Rekening: x.Rekening,
    }));
  });

  const columns: ExcelColumn[] = [
    { header: "KODE", key: "Kode", width: 12 },
    { header: "NAMA", key: "Nama", width: 34 },
    { header: "ALAMAT", key: "Alamat", width: 40 },
    { header: "KOTA", key: "Kota", width: 16 },
    ...(canLihatRekening.value
      ? [
          { header: "BANK", key: "Bank", width: 16 },
          { header: "ATAS NAMA", key: "AtasNama", width: 28 },
          { header: "REKENING", key: "Rekening", width: 22 },
        ]
      : []),
    { header: "TELP", key: "Telp", width: 16 },
    { header: "FAX", key: "Fax", width: 16 },
    { header: "CONTACT", key: "Contact", width: 16 },
    { header: "HP", key: "HP", width: 16 },
    { header: "TARGET MITRA", key: "TargetMitra", width: 14, align: "right" },
    { header: "KETERANGAN", key: "Keterangan", width: 30 },
    { header: "AKTIF", key: "Aktif", width: 8, align: "center" },
    { header: "USER CREATE", key: "Usr", width: 14 },
    { header: "DATE CREATE", key: "Created", width: 20 },
  ];

   try {
    await exportExcelSingle(
      "Data_Master_Supplier.xlsx",
      "Master Supplier",
      columns,
      data,
      "Data Master Supplier",
    );
    toast.success("Berhasil export Master Supplier.");
  } catch {
    toast.error("Gagal export Master Supplier.");
  }
};
</script>

<template>
  <BaseBrowse
    ref="browseRef"
    title="Master Supplier"
    menu-id="12"
    :icon="IconTruck"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="false"
    :can-export="canExport"
    :row-props-fn="rowPropsFn"
    item-value="Kode"
    :show-expand="canLihatRekening"
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="muatUlang"
    @add="handleAdd"
    @edit="handleEdit"
    @export="onExport"
  >
    <template #filter-right>
      <div class="d-flex align-center bg-white pa-1 px-3 rounded border mr-2">
        <div class="d-flex align-center">
          <div
            class="legend-box bg-red mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption font-weight-bold text-red">Pasif</span>
        </div>
      </div>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">Rekening Bank - {{ item.Nama }}</div>
        <table v-if="item.RekeningList?.length" class="detail-table">
          <thead>
            <tr>
              <th width="40" class="text-center">No</th>
              <th width="160">Bank</th>
              <th>Atas Nama</th>
              <th width="200">No. Rekening</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in item.RekeningList" :key="i">
              <td class="text-center">{{ Number(i) + 1 }}</td>
              <td>{{ r.Bank }}</td>
              <td>{{ r.AtasNama }}</td>
              <td>{{ r.Rekening }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="expand-kosong">Belum ada rekening bank.</div>
      </div>
    </template>
  </BaseBrowse>

  <SupplierFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    @saved="muatUlang"
  />
</template>

<style scoped>
.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 11px;
  font-weight: bold;
  color: #1565c0;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  max-width: 800px;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.expand-kosong {
  font-size: 11px;
  color: #607d8b;
}
</style>
