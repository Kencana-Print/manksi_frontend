<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconArrowBackUp, IconPrinter } from "@tabler/icons-vue";
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
  { title: "Nomor Retur", key: "Nomor", width: "160px" },
  {
    title: "Tanggal",
    key: "Tanggal",
    width: "120px",
    align: "center" as const,
  },
  {
    title: "Gudang Asal",
    key: "GudangAsal",
    width: "120px",
    align: "center" as const,
  },
  { title: "Gudang Tujuan", key: "NamaGudangTujuan", minWidth: "160px" },
  {
    title: "Nomor SPK",
    key: "NomorSPK",
    width: "140px",
    align: "center" as const,
  },
  { title: "Tipe", key: "TypeLabel", width: "120px", align: "center" as const },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
];

interface DetailRetur {
  Nomor?: string;
  Kode?: string;
  sku?: string;
  Barcode?: string;
  barcode?: string;
  Nama_Bahan?: string;
  nama?: string;
  Jumlah?: number | string;
  qty?: number | string;
  Satuan?: string;
  satuan?: string;
  Panjang?: number | string;
  panjang?: number | string;
  Lebar?: number | string;
  lebar?: number | string;
  Expired?: string;
  KeteranganDetail?: string;
  keterangan?: string;
}

// --- EXPAND LOGIC (DETAIL RETUR PRODUKSI / DROPDOWN SELARAS MMT) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, DetailRetur[]>>({});
const loadingDetails = ref<Record<string, boolean>>({});

const { items, isLoading, selected, canInsert, canEdit, canDelete, fetchData } =
  useBrowse<any>({
    menuId: "5539",
    fetchApi: async () => {
      detailCache.value = {};
      const res = await api.get("/mmt/bahan-baku-produksi/retur-produksi", {
        params: { startDate: startDate.value, endDate: endDate.value },
      });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
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

const getItemDetails = (item: any): DetailRetur[] => {
  const raw = item?.raw || item;
  const nomor = getItemNomor(raw);
  if (detailCache.value[nomor] && detailCache.value[nomor].length > 0) {
    return detailCache.value[nomor];
  }
  const details = raw?.Detail || raw?.details || raw?.Details;
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

    const existing = (items.value || []).find(
      (it: any) => getItemNomor(it) === nomor,
    );
    const existingRaw = existing?.raw || existing;
    const exDetails =
      existingRaw?.Detail || existingRaw?.details || existingRaw?.Details;
    if (Array.isArray(exDetails) && exDetails.length > 0) {
      detailCache.value = { ...detailCache.value, [nomor]: exDetails };
      continue;
    }

    if (loadingDetails.value[nomor]) continue;

    loadingDetails.value = { ...loadingDetails.value, [nomor]: true };
    try {
      const res = await api.get(
        `/mmt/bahan-baku-produksi/retur-produksi/${encodeURIComponent(nomor)}`,
      );
      const d = res.data?.data || res.data;
      const details = d?.details || d?.Detail || d?.Details || [];
      detailCache.value = { ...detailCache.value, [nomor]: details };
      if (typeof raw === "object" && raw !== null) {
        raw.Detail = details;
      }
    } catch (err) {
      console.error(`Gagal load detail retur produksi ${nomor}:`, err);
      detailCache.value = { ...detailCache.value, [nomor]: [] };
    } finally {
      loadingDetails.value = { ...loadingDetails.value, [nomor]: false };
    }
  }
};

const handleNew = () => {
  router.push("/mmt/bahan-baku-produksi/retur-permintaan-produksi/create");
};

const handleEdit = (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;
  router.push(
    `/mmt/bahan-baku-produksi/retur-permintaan-produksi/edit/${encodeURIComponent(nomor)}`,
  );
};

const handleDelete = async (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;

  if (!confirm(`Hapus data retur permintaan produksi nomor ${nomor}?`)) return;
  try {
    await api.delete(
      `/mmt/bahan-baku-produksi/retur-produksi/${encodeURIComponent(nomor)}`,
    );
    toast.success("Retur permintaan produksi berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

const handlePrint = (item?: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) {
    toast.warning("Silakan pilih data retur terlebih dahulu.");
    return;
  }
  router.push(
    `/mmt/bahan-baku-produksi/retur-permintaan-produksi/print/${encodeURIComponent(nomor)}`,
  );
};
</script>

<template>
  <BaseBrowse
    title="Retur Produksi"
    menu-id="5539"
    item-value="Nomor"
    :icon="IconArrowBackUp"
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
      {{
        formatTanggal(
          (item.raw || item).TanggalAsli || (item.raw || item).Tanggal,
        )
      }}
    </template>

    <template #item.TypeLabel="{ item }">
      <v-chip
        size="x-small"
        :color="
          (item.raw || item).TypeLabel === 'PRODUKSI' ? 'primary' : 'teal'
        "
        class="font-weight-bold"
      >
        {{ (item.raw || item).TypeLabel || "PRODUKSI" }}
      </v-chip>
    </template>

    <!-- Sub-Tabel Expandable Rincian Bahan Retur (Fitur Dropdown Selaras Sistem MMT) -->
    <template #detail="{ item }">
      <div class="expand-detail-container pa-3">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="text-caption font-weight-bold text-primary">
            Rincian Barang Retur: {{ getItemNomor(item) }} (Dari:
            {{ (item.raw || item).GudangAsal || "-" }} ke:
            {{
              (item.raw || item).NamaGudangTujuan ||
              (item.raw || item).GudangTujuan ||
              "-"
            }})
          </div>
          <div class="text-caption text-grey-darken-1 font-weight-medium">
            SPK: {{ (item.raw || item).NomorSPK || "-" }} | Keterangan:
            {{ (item.raw || item).Keterangan || "-" }}
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
          Memuat rincian bahan retur...
        </div>

        <div
          v-else-if="getItemDetails(item).length === 0"
          class="text-caption text-grey py-2"
        >
          Tidak ada rincian bahan pada dokumen retur ini.
        </div>

        <v-table
          v-else
          density="compact"
          class="sub-detail-table border rounded"
        >
          <thead>
            <tr>
              <th style="width: 40px" class="text-center">No</th>
              <th style="width: 150px">Barcode Rol</th>
              <th style="width: 130px">Kode Bahan</th>
              <th>Nama Bahan</th>
              <th style="width: 75px" class="text-end">Panjang</th>
              <th style="width: 75px" class="text-end">Lebar</th>
              <th style="width: 70px" class="text-center">Satuan</th>
              <th
                style="width: 95px"
                class="text-end font-weight-bold text-primary"
              >
                Qty Retur
              </th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, dIdx) in getItemDetails(item)" :key="dIdx">
              <td class="text-center">{{ dIdx + 1 }}</td>
              <td
                class="font-monospace text-caption font-weight-bold text-primary"
              >
                {{ d.Barcode || (d as any).barcode || "-" }}
              </td>
              <td class="font-weight-medium">
                {{ d.Kode || (d as any).kode || (d as any).sku || "-" }}
              </td>
              <td>
                {{ d.Nama_Bahan || (d as any).nama || (d as any).Nama || "-" }}
              </td>
              <td class="text-end text-caption">
                {{
                  Number(d.Panjang || (d as any).panjang || 0) > 0
                    ? Number(d.Panjang || (d as any).panjang).toFixed(2)
                    : "-"
                }}
              </td>
              <td class="text-end text-caption">
                {{
                  Number(d.Lebar || (d as any).lebar || 0) > 0
                    ? Number(d.Lebar || (d as any).lebar).toFixed(2)
                    : "-"
                }}
              </td>
              <td class="text-center">
                {{ d.Satuan || (d as any).satuan || "-" }}
              </td>
              <td class="text-end font-weight-bold text-primary">
                {{
                  Number(
                    d.Jumlah ?? (d as any).jumlah ?? (d as any).qty ?? 0,
                  ).toLocaleString("id-ID")
                }}
              </td>
              <td class="text-grey-darken-1">
                {{
                  d.KeteranganDetail ||
                  (d as any).keterangan ||
                  (d as any).ket ||
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

.expand-detail-container {
  background-color: #f8fafc;
  border-left: 3px solid #1565c0;
}
.sub-detail-table {
  background: white !important;
  font-size: 11px;
}
.sub-detail-table th {
  background-color: #f1f5f9 !important;
  font-weight: 600;
  color: #475569;
  font-size: 11px !important;
  height: 30px !important;
}
.sub-detail-table td {
  font-size: 11px !important;
  height: 28px !important;
}
</style>
