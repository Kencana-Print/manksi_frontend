<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  IconShoppingCart,
  IconPrinter,
  IconLock,
  IconLockOpen,
} from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";
import { useAuthStore } from "@/stores/authStore";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

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
  { title: "Nomor PO", key: "Nomor", width: "160px" },
  { title: "Tanggal PO", key: "Tanggal", width: "110px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "110px", align: "center" },
  { title: "Kode Sup", key: "KodeSup", width: "90px" },
  { title: "Supplier", key: "Nama", minWidth: "200px" },
  { title: "Cabang", key: "Cab", width: "80px", align: "center" },
  { title: "Status", key: "Status", width: "100px", align: "center" },
  { title: "Tax", key: "IsTax", width: "70px", align: "center" },
  { title: "Acc", key: "Acc", width: "70px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse<any>({
  menuId: "5504",
  fetchApi: async () => {
    const res = await api.get("/mmt/po-bahan-mmt", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
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

// --- EXPAND LOGIC (DETAIL PO BAHAN MMT) ---
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref(new Set<string>());

const formatNumber = (val: number | string | null | undefined) => {
  const n = Number(val) || 0;
  return n.toLocaleString("id-ID");
};

const formatRupiah = (val: number | string | null | undefined) => {
  const n = Number(val) || 0;
  return `Rp ${n.toLocaleString("id-ID")}`;
};

const onUpdateExpanded = async (newExpanded: any[]) => {
  expanded.value = newExpanded;
  for (const it of newExpanded) {
    const nomor = getItemNomor(it);
    if (!nomor) continue;
    if (detailCache.value[nomor] || loadingDetails.value.has(nomor)) continue;

    loadingDetails.value.add(nomor);
    try {
      const res = await api.get("/mmt/po-bahan-mmt/detail", {
        params: { nomor },
      });
      detailCache.value[nomor] = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
    } catch (err) {
      toast.error(`Gagal memuat detail PO ${nomor}`);
      detailCache.value[nomor] = [];
    } finally {
      loadingDetails.value.delete(nomor);
    }
  }
};

const selectedItem = computed(() => {
  if (!selected.value || selected.value.length !== 1) return null;
  const raw = selected.value[0]?.raw || selected.value[0];
  return raw;
});

const selectedNomor = computed(() => {
  return getItemNomor(selectedItem.value);
});

const selectedStatus = computed(() => {
  return selectedItem.value?.Status || "";
});

const isPOOpen = computed(() => selectedStatus.value === "OPEN");

const isToggleCloseDisabled = computed(() => {
  if (!selectedItem.value || !selectedNomor.value) return true;
  // Sesuai sistem MMT: hanya status ONPROSES yang tidak dapat di-toggle
  return selectedStatus.value === "ONPROSES";
});

const toggleActionLabel = computed(() => {
  if (!selectedItem.value) return "Close / Open PO";
  return isPOOpen.value ? "Close PO" : "Open PO";
});

const handleNew = () => {
  router.push("/mmt/finance/po-bahan/create");
};

const handleEdit = (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) {
    toast.warning("Silakan pilih data PO yang ingin diubah.");
    return;
  }
  const raw = target?.raw || target;
  if (raw?.Status === "CLOSE") {
    toast.warning(
      "PO berstatus CLOSE. Lakukan 'Open PO' terlebih dahulu jika ingin mengubah data."
    );
    return;
  }
  router.push(`/mmt/finance/po-bahan/edit/${encodeURIComponent(nomor)}`);
};

const handleDelete = async (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;

  const raw = target?.raw || target;
  if (raw?.Status === "CLOSE") {
    toast.warning("PO berstatus CLOSE dan tidak dapat dihapus.");
    return;
  }

  if (!confirm(`Hapus data PO Bahan nomor ${nomor}?`)) return;
  try {
    await api.delete(`/mmt/po-bahan-mmt/${encodeURIComponent(nomor)}`);
    toast.success("PO Bahan berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

const handleToggleClose = async () => {
  const nomor = selectedNomor.value;
  const status = selectedStatus.value;

  if (!nomor || !status) {
    toast.warning("Silakan pilih satu transaksi PO terlebih dahulu.");
    return;
  }

  if (status === "ONPROSES") {
    toast.warning("PO sedang berjalan (ONPROSES) dan tidak dapat diubah statusnya.");
    return;
  }

  // Jika saat ini OPEN, aksi berikutnya adalah CLOSE. Jika status CLOSE, aksi berikutnya adalah OPEN.
  const action = isPOOpen.value ? "CLOSE" : "OPEN";
  const rawItem = selectedItem.value?.raw || selectedItem.value;
  const isAutoClose = Boolean(
    rawItem?.IsAutoClosed ||
      (Number(rawItem?.QtyPoTotal) > 0 && Number(rawItem?.UnitKurang) === 0)
  );

  let confirmText = `Yakin ingin menutup (Close PO) nomor ${nomor}?`;
  if (action === "OPEN") {
    if (isAutoClose) {
      confirmText = `PERHATIAN:\nBarang pada PO nomor ${nomor} sudah diterima 100% (unit_kurang = 0).\n\nSistem MMT secara otomatis mengunci status PO sebagai CLOSE karena seluruh barang telah lengkap diterima.\n\nApakah Anda tetap ingin membuka (Open PO) di database?`;
    } else {
      confirmText = `Yakin ingin membuka kembali (Open PO) nomor ${nomor}?`;
    }
  }

  if (!confirm(confirmText)) return;

  try {
    const userKode =
      authStore.user?.kode ||
      authStore.user?.nama ||
      "SYSTEM";

    const res = await api.put(`/mmt/po-bahan-mmt/${encodeURIComponent(nomor)}/toggle-close`, {
      action: action,
      user: userKode,
    });

    const resData = res.data;
    if (resData?.warning || (action === "OPEN" && resData?.isAutoClosed)) {
      toast.warning(
        resData?.warning ||
          resData?.message ||
          `Perhatian: PO nomor ${nomor} berhasil di-Open di database, namun status otomatis tetap CLOSE karena seluruh barang sudah diterima 100% (unit_kurang = 0).`,
        { timeout: 8000 }
      );
    } else {
      toast.success(
        resData?.message ||
          `PO nomor ${nomor} berhasil di-${action === "CLOSE" ? "Close" : "Open"}.`
      );
    }

    // Refresh data tabel & pertahankan seleksi baris agar tombol langsung sinkron dan tetap aktif
    await fetchData();
    if (nomor) {
      const updated = items.value?.find((it: any) => getItemNomor(it) === nomor);
      if (updated) {
        selected.value = [updated];
      }
    }
  } catch (err: any) {
    toast.error(err.response?.data?.message || `Gagal ${action} PO.`);
  }
};

const handlePrint = (item: any) => {
  const target = item || selected.value[0];
  const nomor = getItemNomor(target);
  if (!nomor) return;
  router.push(`/mmt/finance/po-bahan/print/${encodeURIComponent(nomor)}`);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "OPEN":
      return "success";
    case "ONPROSES":
      return "warning";
    case "CLOSE":
      return "grey-darken-1";
    default:
      return "default";
  }
};
</script>

<template>
  <BaseBrowse
    title="PO Bahan MMT"
    menu-id="5504"
    item-value="Nomor"
    :icon="IconShoppingCart"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    show-expand
    v-model:expanded="expanded"
    :loading-details="loadingDetails"
    @update:expanded="onUpdateExpanded"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @add="handleNew"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('PO_Bahan_MMT')"
  >
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

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="info"
        variant="elevated"
        :disabled="selected.length !== 1"
        @click="handlePrint(selected[0])"
      >
        <IconPrinter :size="15" class="mr-1" /> Cetak PO
      </v-btn>

      <v-btn
        v-if="canEdit"
        size="small"
        :color="isPOOpen ? 'warning' : 'teal'"
        variant="elevated"
        :disabled="isToggleCloseDisabled"
        @click="handleToggleClose"
      >
        <component
          :is="isPOOpen ? IconLock : IconLockOpen"
          :size="15"
          class="mr-1"
        />
        {{ toggleActionLabel }}
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>

    <template #item.Dateline="{ item }">
      {{ formatTanggal((item.raw || item).Dateline) }}
    </template>

    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :color="getStatusColor((item.raw || item).Status)"
        class="font-weight-bold"
      >
        {{ (item.raw || item).Status }}
        <v-tooltip
          v-if="(item.raw || item).Status === 'CLOSE'"
          activator="parent"
          location="top"
        >
          <span v-if="(item.raw || item).IsAutoClosed">
            Ditutup otomatis oleh sistem: Barang sudah diterima 100% (unit_kurang = 0)
          </span>
          <span v-else>
            Ditutup manual oleh pengguna (Close PO)
          </span>
        </v-tooltip>
      </v-chip>
    </template>

    <!-- Expanded Row: Detail Item PO Bahan MMT -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div
          v-if="loadingDetails.has(getItemNomor(item))"
          class="expand-loading"
        >
          <v-progress-circular
            indeterminate
            color="primary"
            size="20"
            class="mr-2"
          />
          <span>Memuat rincian item PO {{ getItemNomor(item) }}...</span>
        </div>
        <div v-else>
          <div class="expand-title mb-2">
            Rincian Item PO - {{ getItemNomor(item) }}
          </div>
          <table class="detail-table">
            <thead>
              <tr>
                <th style="width: 40px" class="text-center">No</th>
                <th style="width: 130px">Kode Bahan</th>
                <th>Nama Bahan / Deskripsi</th>
                <th style="width: 70px" class="text-center">Satuan</th>
                <th style="width: 80px" class="text-right">Qty PO</th>
                <th style="width: 90px" class="text-right">Qty Terima</th>
                <th style="width: 110px" class="text-right">Harga</th>
                <th style="width: 70px" class="text-right">Disc (%)</th>
                <th style="width: 120px" class="text-right">Total</th>
                <th style="width: 140px">No. SPK</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, idx) in detailCache[getItemNomor(item)] || []"
                :key="d.kode || idx"
              >
                <td class="text-center">{{ d.no || idx + 1 }}</td>
                <td class="font-weight-medium text-primary">{{ d.kode }}</td>
                <td>{{ d.namaext || d.nama || "-" }}</td>
                <td class="text-center">{{ d.Satuan || d.satuan || "-" }}</td>
                <td class="text-right font-weight-bold text-blue-darken-3">
                  {{ formatNumber(d.QTY ?? d.jumlah) }}
                </td>
                <td
                  class="text-right font-weight-medium"
                  :class="
                    Number(d.QtyBPB || 0) > 0
                      ? 'text-green-darken-3'
                      : 'text-grey'
                  "
                >
                  {{ formatNumber(d.QtyBPB || 0) }}
                </td>
                <td class="text-right">{{ formatRupiah(d.harga) }}</td>
                <td class="text-right">
                  {{ Number(d.diskon || 0) > 0 ? `${d.diskon}%` : "-" }}
                </td>
                <td class="text-right font-weight-bold">
                  {{ formatRupiah(d.total) }}
                </td>
                <td>{{ d.spk || "-" }}</td>
              </tr>
              <tr v-if="!(detailCache[getItemNomor(item)]?.length)">
                <td colspan="10" class="text-center text-grey pa-3">
                  Tidak ada data rincian item barang.
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

.expand-wrap {
  padding: 10px 14px;
  background: #f8fafc;
}
.expand-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  color: #64748b;
  font-size: 11.5px;
}
.expand-title {
  font-size: 11px;
  font-weight: 700;
  color: #1e3a8a;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  font-size: 11px;
}
.detail-table th {
  background: #334155;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: 600;
  font-size: 11px;
}
.detail-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 11px;
  color: #1e293b;
}
.detail-table tbody tr:hover {
  background: #f1f5f9;
}
</style>
