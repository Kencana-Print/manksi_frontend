<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import * as XLSX from "xlsx";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "140";

const getLocalDate = () => new Date().toISOString().substring(0, 10);

const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  notApproved: false, // Flag untuk tombol "Show All Not Approved"
});

// ── STATE DETAIL (Lazy Load) ──
const expandedItems = ref<any[]>([]);
const loadedDetails = ref<Record<string, any[]>>({});
const isDetailLoading = ref<Record<string, boolean>>({});
const isExporting = ref(false);

const { items, isLoading, selected, fetchData, exportToExcel } = useBrowse({
  menuId,
  fetchApi: async () => {
    expandedItems.value = [];
    loadedDetails.value = {};
    const res = await api.get("/garmen/po-internal-map/approve", {
      params: {
        startDate: filterState.value.startDate,
        endDate: filterState.value.endDate,
        notApproved: filterState.value.notApproved,
      },
    });
    return res.data.data || [];
  },
  immediate: true,
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Dari", key: "Dari", width: "120px" },
  { title: "Tujuan", key: "Tujuan", width: "120px" },
  { title: "Approved", key: "Approved", width: "100px", align: "center" },
];

const onExpandedUpdate = async (newExpandedArray: any[]) => {
  expandedItems.value = newExpandedArray;
  for (const item of newExpandedArray) {
    const nomorSJ = item.Nomor || item.raw?.Nomor;
    if (!nomorSJ) continue;
    if (!loadedDetails.value[nomorSJ] && !isDetailLoading.value[nomorSJ]) {
      isDetailLoading.value[nomorSJ] = true;
      try {
        const res = await api.get(
          `/garmen/po-internal-map/approve/${encodeURIComponent(nomorSJ)}/detail`,
        );
        loadedDetails.value[nomorSJ] = res.data.data;
      } catch (e) {
        loadedDetails.value[nomorSJ] = [];
      } finally {
        isDetailLoading.value[nomorSJ] = false;
      }
    }
  }
};

// ── LOGIKA APPROVAL ──
const executeApprove = async () => {
  if (selected.value.length === 0) return;
  const item = selected.value[0];

  if (item.Approved === "Y") {
    toast.warning("Surat Jalan ini sudah di-approve.");
    return;
  }

  if (!confirm(`Yakin ingin menyetujui (Approve) Surat Jalan ${item.Nomor}?`))
    return;

  isLoading.value = true;
  try {
    await api.post(
      `/garmen/po-internal-map/approve/${encodeURIComponent(item.Nomor)}/approve`,
    );
    toast.success("Berhasil disetujui.");
    fetchData(); // Refresh list
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal melakukan approval.");
  } finally {
    isLoading.value = false;
  }
};

const toggleShowNotApproved = () => {
  filterState.value.notApproved = !filterState.value.notApproved;
  fetchData();
};

const getRowProps = (data: any) => {
  const row = data.item?.raw || data.item;
  // Delphi: Approved='N' then Font.Color := clred
  if (row.Approved === "N")
    return { class: "text-red-darken-2 font-weight-bold" };
  return {};
};

const exportDetail = async () => {
  isExporting.value = true;
  try {
    const res = await api.get("/garmen/po-internal-map/approve/export-detail", {
      params: {
        ...filterState.value,
        notApproved: filterState.value.notApproved,
      },
    });
    const worksheet = XLSX.utils.json_to_sheet(res.data.data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Approval_SJ_Detail");
    XLSX.writeFile(
      workbook,
      `approval_sj_map_detail_${new Date().getTime()}.xlsx`,
    );
    toast.success("Export berhasil.");
  } catch (e) {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};
</script>

<template>
  <BaseBrowse
    title="Approval Surat Jalan MAP"
    :menu-id="menuId"
    icon="mdi-check-decagram-outline"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filterState="filterState"
    v-model:expanded="expandedItems"
    show-expand
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @update:expanded="onExpandedUpdate"
    @export="exportToExcel('APPROVAL_SJ_MAP')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
          :disabled="filterState.notApproved"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
          :disabled="filterState.notApproved"
        />
      </div>

      <div class="filter-divider"></div>

      <div class="legend-group">
        <div class="legend-item">
          <div class="legend-box bg-red"></div>
          <span>= Belum Approve</span>
        </div>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        variant="flat"
        :color="filterState.notApproved ? 'orange-darken-2' : 'blue-grey'"
        prepend-icon="mdi-alert-circle-outline"
        @click="toggleShowNotApproved"
      >
        {{
          filterState.notApproved ? "Show All Data" : "Show All Not Approved"
        }}
      </v-btn>

      <v-btn
        size="small"
        variant="flat"
        color="success"
        prepend-icon="mdi-check-circle"
        :disabled="selected.length === 0 || selected[0].Approved === 'Y'"
        @click="executeApprove"
      >
        Approve
      </v-btn>

      <v-btn
        size="small"
        variant="flat"
        color="green-darken-1"
        prepend-icon="mdi-file-excel"
        :loading="isExporting"
        @click="exportDetail"
        >Export Detail</v-btn
      >
    </template>

    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.Approved="{ item }">
      <v-chip
        :color="item.Approved === 'Y' ? 'success' : 'error'"
        size="x-small"
        label
        class="font-weight-bold"
      >
        {{ item.Approved === "Y" ? "APPROVED" : "PENDING" }}
      </v-chip>
    </template>

    <template #detail="{ item }">
      <div class="detail-container">
        <div v-if="isDetailLoading[item.Nomor]" class="text-center py-2">
          <v-progress-circular indeterminate size="20" color="primary" />
        </div>
        <table v-else class="detail-table">
          <thead>
            <tr>
              <th style="width: 140px">No PO</th>
              <th style="width: 140px">MAP</th>
              <th>Nama MAP</th>
              <th style="width: 150px">Bahan</th>
              <th style="width: 80px">Ukuran</th>
              <th style="width: 70px; text-align: right">Jumlah</th>
              <th style="text-align: left; width: 250px">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in loadedDetails[item.Nomor] || []" :key="d.MAP">
              <td class="text-center">{{ d.Nomor_PO }}</td>
              <td class="text-center font-weight-bold">{{ d.MAP }}</td>
              <td>{{ d.Nama_MAP }}</td>
              <td>{{ d.Bahan }}</td>
              <td class="text-center">{{ d.Ukuran }}</td>
              <td class="text-right font-weight-bold">{{ d.Jumlah }}</td>
              <td>{{ d.Keterangan }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>
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
.detail-container {
  padding: 8px 12px 12px 48px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border: 1px solid #cfd8dc;
  font-size: 11px;
}
.detail-table th {
  background-color: #eceff1;
  padding: 6px 8px;
  font-weight: 700;
  border: 1px solid #cfd8dc;
}
.detail-table td {
  padding: 6px 8px;
  border: 1px solid #eceff1;
}
</style>
