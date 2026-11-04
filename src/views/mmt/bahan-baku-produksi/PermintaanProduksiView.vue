<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconBuildingFactory2, IconPrinter } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "120px", align: "center" as const },
  { title: "Gudang", key: "Gudang", width: "110px", align: "center" as const },
  { title: "Lokasi", key: "Lokasi", width: "100px", align: "center" as const },
  { title: "Tipe", key: "Tipe", width: "100px", align: "center" as const },
  { title: "Status", key: "Status", width: "100px", align: "center" as const },
  { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
];

interface DetailPermintaan {
  Nomor?: string;
  Kode?: string;
  Nama_Bahan?: string;
  Satuan?: string;
  Jumlah?: number | string;
  Panjang?: number | string;
  Lebar?: number | string;
  Nomor_SPK?: string;
  Keterangan?: string;
  komponen?: string;
  babaran?: number | string;
  pcs?: number | string;
}

// --- EXPAND LOGIC (DETAIL PERMINTAAN PRODUKSI / DROPDOWN) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, DetailPermintaan[]>>({});
const loadingDetails = ref<Record<string, boolean>>({});

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  fetchData,
} = useBrowse<any>({
  menuId: "5536",
  fetchApi: async () => {
    detailCache.value = {};
    const res = await api.get("/mmt/bahan-baku-produksi/permintaan-produksi", {
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const getItemNomor = (item: any): string => {
  if (!item) return "";
  if (typeof item === "string") return item;
  const raw = item.raw || item;
  return raw.Nomor || raw.nomor || "";
};

const selectedItem = computed(() => {
  if (!selected.value || selected.value.length !== 1) return null;
  return selected.value[0]?.raw || selected.value[0];
});

const getItemDetails = (item: any): DetailPermintaan[] => {
  const raw = item?.raw || item;
  const nomor = getItemNomor(raw);
  if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
    return detailCache.value[nomor];
  }
  const details = raw?.Details || raw?.details || raw?.Detail;
  if (Array.isArray(details) && details.length > 0) {
    return details;
  }
  return detailCache.value[nomor] || [];
};

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const expItem of newExpanded) {
    const raw = expItem?.raw || expItem;
    const nomor = getItemNomor(raw);
    if (!nomor) continue;

    if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
      continue;
    }

    const existing = (items.value || []).find((it: any) => getItemNomor(it) === nomor);
    const existingRaw = existing?.raw || existing;
    const exDetails = existingRaw?.Details || existingRaw?.details || existingRaw?.Detail;
    if (Array.isArray(exDetails) && exDetails.length > 0) {
      detailCache.value = { ...detailCache.value, [nomor]: exDetails };
      continue;
    }

    if (loadingDetails.value[nomor]) continue;

    loadingDetails.value = { ...loadingDetails.value, [nomor]: true };
    try {
      const res = await api.get(
        `/mmt/bahan-baku-produksi/permintaan-produksi/${encodeURIComponent(nomor)}`
      );
      const d = res.data?.data || res.data;
      const details = d?.Details || d?.details || d?.Detail || [];
      detailCache.value = { ...detailCache.value, [nomor]: details };
      if (typeof raw === "object" && raw !== null) {
        raw.Details = details;
      }
    } catch (err) {
      console.error(`Gagal load detail permintaan produksi ${nomor}:`, err);
      detailCache.value = { ...detailCache.value, [nomor]: [] };
    } finally {
      loadingDetails.value = { ...loadingDetails.value, [nomor]: false };
    }
  }
};

const handleNew = () => {
  router.push("/mmt/bahan-baku-produksi/permintaan-produksi/create");
};

const handleEdit = (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;
  router.push(
    `/mmt/bahan-baku-produksi/permintaan-produksi/edit/${encodeURIComponent(nomor)}`
  );
};

const handleDelete = async (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;

  if (!confirm(`Hapus data permintaan produksi nomor ${nomor}?`)) return;
  try {
    await api.delete(
      `/mmt/bahan-baku-produksi/permintaan-produksi/${encodeURIComponent(nomor)}`
    );
    toast.success("Permintaan produksi berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

const handlePrint = (item?: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) {
    toast.warning("Silakan pilih data permintaan produksi terlebih dahulu.");
    return;
  }
  router.push(
    `/mmt/bahan-baku-produksi/permintaan-produksi/print/${encodeURIComponent(nomor)}`
  );
};
</script>

<template>
  <BaseBrowse
    title="Permintaan Produksi"
    menu-id="5536"
    item-value="Nomor"
    :icon="IconBuildingFactory2"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :show-expand="true"
    :expanded="expanded"
    @update:expanded="onUpdateExpanded"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="false"
    @refresh="fetchData"
    @add="handleNew"
    @edit="handleEdit"
    @delete="handleDelete"
  >
    <!-- Header Extra Actions (Sejajar dengan fitur CRUD, menggantikan fitur export) -->
    <template #extra-actions>
      <v-btn
        size="small"
        color="secondary"
        variant="tonal"
        class="text-none font-weight-medium"
        :disabled="!selectedItem"
        @click="handlePrint(selectedItem)"
      >
        <template #prepend>
          <IconPrinter :size="15" />
        </template>
        Cetak
      </v-btn>
    </template>

    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>

    <!-- Kolom Tipe -->
    <template #item.Tipe="{ item }">
      <v-chip
        size="x-small"
        :color="
          (item.raw || item).Tipe === 'MMT'
            ? 'primary'
            : (item.raw || item).Tipe === 'OBAT'
              ? 'purple'
              : 'teal'
        "
        class="font-weight-bold"
      >
        {{ (item.raw || item).Tipe || "MMT" }}
      </v-chip>
    </template>

    <!-- Kolom Status -->
    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :color="
          (item.raw || item).Status === 'OPEN' ? 'warning' : 'success'
        "
        class="font-weight-bold"
      >
        {{ (item.raw || item).Status || "OPEN" }}
      </v-chip>
    </template>

    <!-- Sub-Tabel Expandable Rincian Bahan (Fitur Dropdown Selaras Sistem MMT) -->
    <template #detail="{ item }">
      <div class="expand-detail-container pa-3">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="text-caption font-weight-bold text-primary">
            Rincian Bahan Permintaan: {{ getItemNomor(item) }} (Gudang: {{
              (item.raw || item).Gudang || "-"
            }} - Tipe: {{ (item.raw || item).Tipe || "MMT" }})
          </div>
          <div class="text-caption text-grey-darken-1 font-weight-medium">
            Keterangan: {{ (item.raw || item).Keterangan || "-" }}
          </div>
        </div>

        <div
          v-if="
            loadingDetails[getItemNomor(item)] &&
            getItemDetails(item).length === 0
          "
          class="d-flex align-center py-3 text-caption text-grey"
        >
          <v-progress-circular
            indeterminate
            size="16"
            width="2"
            color="primary"
            class="mr-2"
          />
          Memuat rincian bahan...
        </div>

        <div
          v-else-if="getItemDetails(item).length === 0"
          class="text-caption text-grey py-2"
        >
          Tidak ada rincian bahan pada dokumen permintaan ini.
        </div>

        <v-table
          v-else
          density="compact"
          class="sub-detail-table border rounded"
        >
          <thead>
            <tr>
              <th style="width: 40px" class="text-center">No</th>
              <th style="width: 130px">Kode Bahan</th>
              <th>Nama Bahan</th>
              <th style="width: 75px" class="text-end">Panjang</th>
              <th style="width: 75px" class="text-end">Lebar</th>
              <th style="width: 70px" class="text-center">Satuan</th>
              <th
                style="width: 95px"
                class="text-end font-weight-bold text-primary"
              >
                Qty Minta
              </th>
              <th style="width: 150px">No. SPK</th>
              <th style="width: 110px">Komponen</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, dIdx) in getItemDetails(item)"
              :key="dIdx"
            >
              <td class="text-center">{{ dIdx + 1 }}</td>
              <td class="font-weight-medium text-primary">
                {{ d.Kode || (d as any).kode || (d as any).sku || "-" }}
              </td>
              <td>
                {{
                  d.Nama_Bahan ||
                  (d as any).nama ||
                  (d as any).Nama ||
                  "-"
                }}
              </td>
              <td class="text-end text-caption">
                {{ Number(d.Panjang || (d as any).panjang || 0) > 0 ? Number(d.Panjang || (d as any).panjang).toFixed(2) : "-" }}
              </td>
              <td class="text-end text-caption">
                {{ Number(d.Lebar || (d as any).lebar || 0) > 0 ? Number(d.Lebar || (d as any).lebar).toFixed(2) : "-" }}
              </td>
              <td class="text-center">
                {{ d.Satuan || (d as any).satuan || "-" }}
              </td>
              <td class="text-end font-weight-bold text-primary">
                {{
                  Number(
                    d.Jumlah ?? (d as any).jumlah ?? (d as any).qtyMinta ?? 0
                  ).toLocaleString("id-ID")
                }}
              </td>
              <td class="font-monospace text-caption">
                {{
                  d.Nomor_SPK ||
                  (d as any).spk ||
                  (d as any).spk_nomor ||
                  "-"
                }}
              </td>
              <td>
                {{ d.komponen || (d as any).Komponen || "-" }}
              </td>
              <td class="text-grey-darken-1">
                {{
                  d.Keterangan ||
                  (d as any).ket ||
                  (d as any).keterangan ||
                  "-"
                }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  margin-right: 2px;
}
.filter-sep {
  font-size: 11px;
  color: #777;
}
.date-inp {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  color: #212121;
}

/* Sub-tabel Expandable Rincian */
.expand-detail-container {
  background-color: #f8fafc;
  border-top: 1px dashed #cbd5e1;
  border-bottom: 1px dashed #cbd5e1;
}

.sub-detail-table {
  background-color: #ffffff !important;
}

.sub-detail-table th {
  background-color: #f1f5f9 !important;
  color: #334155 !important;
  font-weight: 700 !important;
  font-size: 11px !important;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  height: 32px !important;
}

.sub-detail-table td {
  font-size: 11px !important;
  height: 30px !important;
  color: #1e293b;
}
</style>
