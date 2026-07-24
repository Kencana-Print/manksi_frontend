<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { sjMapService } from "@/services/penjualan/sjMapService";
import * as XLSX from "xlsx";
import {
  IconTruckDelivery,
  IconPrinter,
  IconTable,
  IconKey,
  IconLockOpen,
  IconSend,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

// 1. Pastikan state expanded didefinisikan sebagai array
const expanded = ref([]);

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
const toInputDate = (value: Date) => value.toISOString().slice(0, 10);

// --- STATE PENGAJUAN PIN 5 ---
const showPinModal = ref(false);
const isPinLoading = ref(false);
const pinData = ref({
  nomor: "",
  tanggal: "",
  customer: "",
  alasan: "",
  urut: 0,
});

const filterState = ref({
  startDate: toInputDate(firstDay),
  endDate: toInputDate(today),
});

const {
  items,
  isLoading,
  selected,
  fetchData,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  exportToExcel,
} = useBrowse({
  menuId: "163",
  fetchApi: async () => {
    const res = await sjMapService.getBrowseData(
      filterState.value.startDate,
      filterState.value.endDate,
    );
    return res.data.data;
  },
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  { title: "Divisi", key: "Divisi", width: "100px" },
  { title: "Customer", key: "Customer", width: "200px" },
  { title: "Keterangan", key: "Keterangan" },
  { title: "Qty Kirim", key: "QtyKirim", align: "end", width: "100px" },
  { title: "Created", key: "Created", width: "150px" },
];

const onAdd = () => router.push("/penjualan/sj-map/create");
const onEdit = (row: any) => {
  if (row.Ngedit === "WAIT")
    return toast.error("Data sedang diajukan (Menunggu ACC).");
  router.push(`/penjualan/sj-map/edit/${encodeURIComponent(row.Nomor)}`);
};

const onDelete = async (row: any) => {
  try {
    await sjMapService.deleteData(row.Nomor);
    toast.success("Surat Jalan berhasil dihapus");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal hapus data.");
  }
};

const actCetak = () => {
  if (selected.value.length === 0)
    return toast.warning("Pilih data yang akan dicetak.");
  const nomor = selected.value[0].Nomor;
  window.open(`/penjualan/sj-map/print/${encodeURIComponent(nomor)}`, "_blank");
};

const actExportDetail = () => {
  if ((items.value ?? []).length === 0)
    return toast.warning("Tidak ada data untuk di-export.");

  const exportData: any[] = [];

  (items.value ?? []).forEach((h) => {
    // Jika ada detail (children), buat baris untuk setiap detail
    if (h.children && h.children.length > 0) {
      h.children.forEach((d: any) => {
        exportData.push({
          "No Surat Jalan": h.Nomor,
          Tanggal: h.Tanggal?.substring(0, 10),
          Divisi: h.Divisi,
          Customer: h.Customer,
          "Keterangan SJ": h.Keterangan,
          "Nomor Memo": d["Nomor Memo"],
          "Nama Barang": d.Nama,
          Ukuran: d.Ukuran,
          "Qty Kirim": d.Jumlah,
          "User Created": h.Created,
        });
      });
    } else {
      // Jika header tidak punya detail (kasus jarang)
      exportData.push({
        "No Surat Jalan": h.Nomor,
        Tanggal: h.Tanggal?.substring(0, 10),
        Divisi: h.Divisi,
        Customer: h.Customer,
        "Keterangan SJ": h.Keterangan,
        "Nomor Memo": "-",
        "Nama Barang": "-",
        "Qty Kirim": 0,
      });
    }
  });

  const actPengajuan = async () => {
    if (selected.value.length === 0)
      return toast.warning("Pilih data terlebih dahulu.");
    const row = selected.value[0];

    isPinLoading.value = true;
    try {
      // Cek urutan pengajuan terakhir di backend
      const res = await sjMapService.getPin5Status(row.Nomor);
      const status = res.data.data;

      pinData.value.nomor = row.Nomor;
      pinData.value.tanggal = row.Tanggal;
      pinData.value.customer = row.Customer;

      if (!status) {
        pinData.value.urut = 1;
        pinData.value.alasan = "";
      } else {
        // Jika sudah pernah diajukan tapi belum dipakai (masih WAIT/ACC/TOLAK)
        if (!status.pin_dipakai) {
          pinData.value.urut = status.pin_urut;
          pinData.value.alasan = status.pin_alasan;
        } else {
          // Jika sudah pernah diajukan dan sudah dipakai, tambah urutan baru
          pinData.value.urut = status.pin_urut + 1;
          pinData.value.alasan = "";
        }
      }
      showPinModal.value = true;
    } catch (e: any) {
      toast.error("Gagal mengecek status pengajuan.");
    } finally {
      isPinLoading.value = false;
    }
  };

  const submitPengajuan = async () => {
    if (!pinData.value.alasan.trim())
      return toast.warning("Alasan harus diisi.");

    isPinLoading.value = true;
    try {
      await sjMapService.ajukanPerubahan(pinData.value);
      toast.success("Berhasil diajukan. Silakan tunggu ACC.");
      showPinModal.value = false;
      fetchData(); // Refresh grid agar warna berubah jadi Biru (WAIT)
    } catch (e: any) {
      toast.error(
        "Gagal melakukan pengajuan: " +
          (e.response?.data?.message || e.message),
      );
    } finally {
      isPinLoading.value = false;
    }
  };

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SJ_MAP_DETAIL");
  XLSX.writeFile(
    wb,
    `SJ_MAP_Detail_${filterState.value.startDate}_to_${filterState.value.endDate}.xlsx`,
  );
  toast.success("Export Detail Berhasil");
};

const actPengajuan = async () => {
  if (selected.value.length === 0)
    return toast.warning("Pilih data terlebih dahulu.");
  const row = selected.value[0];

  isPinLoading.value = true;
  try {
    // Cek urutan pengajuan terakhir di backend
    const res = await sjMapService.getPin5Status(row.Nomor);
    const status = res.data.data;

    pinData.value.nomor = row.Nomor;
    pinData.value.tanggal = row.Tanggal;
    pinData.value.customer = row.Customer;

    if (!status) {
      pinData.value.urut = 1;
      pinData.value.alasan = "";
    } else {
      // Jika sudah pernah diajukan tapi belum dipakai (masih WAIT/ACC/TOLAK)
      if (!status.pin_dipakai) {
        pinData.value.urut = status.pin_urut;
        pinData.value.alasan = status.pin_alasan;
      } else {
        // Jika sudah pernah diajukan dan sudah dipakai, tambah urutan baru
        pinData.value.urut = status.pin_urut + 1;
        pinData.value.alasan = "";
      }
    }
    showPinModal.value = true;
  } catch (e: any) {
    toast.error("Gagal mengecek status pengajuan.");
  } finally {
    isPinLoading.value = false;
  }
};

const submitPengajuan = async () => {
  if (!pinData.value.alasan.trim()) return toast.warning("Alasan harus diisi.");

  isPinLoading.value = true;
  try {
    await sjMapService.ajukanPerubahan(pinData.value);
    toast.success("Berhasil diajukan. Silakan tunggu ACC.");
    showPinModal.value = false;
    fetchData(); // Refresh grid agar warna berubah jadi Biru (WAIT)
  } catch (e: any) {
    toast.error(
      "Gagal melakukan pengajuan: " + (e.response?.data?.message || e.message),
    );
  } finally {
    isPinLoading.value = false;
  }
};

// Fungsi warna background baris
const handleRowProps = (data: any) => {
  const row = data.item?.raw || data.item;
  if (row.Ngedit === "WAIT") return { class: "bg-blue-lighten-5" };
  if (row.Ngedit === "TOLAK") return { class: "bg-red-lighten-5" };
  if (row.Ngedit === "ACC") return { class: "bg-green-lighten-5" };
  return {};
};

const getNomorClass = (ngedit: string) => {
  if (ngedit === "WAIT") return "cell-wait";
  if (ngedit === "TOLAK") return "cell-tolak";
  if (ngedit === "ACC") return "cell-acc";
  return "";
};
</script>

<template>
  <BaseBrowse
    title="Surat Jalan MAP"
    menu-id="163"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    v-model:selected="selected"
    v-model:expanded="expanded"
    v-model:filter-state="filterState"
    :show-expand="true"
    :row-props-fn="handleRowProps"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="exportToExcel('SJ_MAP')"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="f-date"
          @change="fetchData"
        />
        <span class="f-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="f-date"
          @change="fetchData"
        />
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <div :class="['nomor-badge', getNomorClass(item.Ngedit)]">
        {{ item.Nomor }}
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="actCetak"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>

      <v-btn size="small" color="indigo" @click="actExportDetail">
        <template #prepend
          ><IconTable :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>

      <v-btn
        size="small"
        color="purple"
        :disabled="selected.length === 0"
        @click="actPengajuan"
      >
        <template #prepend><IconKey :size="15" :stroke-width="1.7" /></template>
        Pengajuan
      </v-btn>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="tbl-header">Detail Memo — {{ item.Nomor }}</div>
        <div class="tbl-wrap">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 160px">Nomor Memo</th>
                <th style="min-width: 220px">Nama Pekerjaan</th>
                <th style="width: 130px">Ukuran</th>
                <th style="width: 90px; text-align: right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="d in item.children"
                :key="d['Nomor Memo']"
                class="tr-det"
              >
                <td class="fw text-primary fw-mono">{{ d["Nomor Memo"] }}</td>
                <td>{{ d.Nama }}</td>
                <td>{{ d.Ukuran }}</td>
                <td class="tr fw">{{ d.Jumlah }}</td>
              </tr>
              <tr v-if="!item.children?.length">
                <td
                  colspan="4"
                  class="text-center text-grey py-3 text-caption font-italic"
                >
                  Data detail tidak ditemukanconst handleRowProps = (data: any)
                  => {
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <template #filter-right>
      <div class="legend-box">
        <div class="legend-row">
          <span class="legend-title">Back (No. SJ):</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #1565c0"></div>
            Nunggu Acc
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2e7d32"></div>
            Sudah Acc
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #c62828"></div>
            Tolak
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showPinModal" max-width="450px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-purple text-white text-subtitle-1 font-weight-bold pa-3 d-flex align-center"
      >
        <IconLockOpen
          :size="18"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        Pengajuan Perubahan Data
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="text-caption mb-1">
          Nomor SJ: <b>{{ pinData.nomor }}</b>
        </div>
        <div class="text-caption mb-3">Customer: {{ pinData.customer }}</div>

        <v-textarea
          v-model="pinData.alasan"
          label="Tulis alasan perubahan data..."
          variant="outlined"
          density="compact"
          rows="3"
          auto-grow
          hide-details
          autofocus
          class="bg-white"
        ></v-textarea>

        <div class="text-caption text-right mt-1 text-grey">
          Urutan Pengajuan: {{ pinData.urut }}
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 bg-grey-lighten-4 border-t">
        <v-btn variant="text" color="error" @click="showPinModal = false"
          >Batal</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn
          color="purple"
          variant="elevated"
          :loading="isPinLoading"
          @click="submitPengajuan"
        >
          <template #prepend
            ><IconSend :size="15" :stroke-width="1.7"
          /></template>
          Kirim Ajukan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Filter bar ── */
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
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1565c0;
}

/* ── Legend ── */
.legend-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
.legend-title {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
  flex-shrink: 0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #424242;
  white-space: nowrap;
}
.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* ── Expand ── */
.expand-wrap {
  background: #eceff1;
}
.tbl-header {
  background: #37474f;
  color: white;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
}
.tbl-wrap {
  overflow-x: auto;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #f0f4f8;
  border: 1px solid #bdbdbd;
  padding: 5px 6px;
  font-size: 10px;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt tbody td {
  border: 1px solid #e8e8e8;
  height: 26px;
  padding: 0 6px;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tr-det td {
  background: #fafafa;
}
.tr-det:hover td {
  background: #e3f2fd;
}

/* ── Nomor badge ── */
.nomor-badge {
  padding: 2px 8px;
  font-weight: 700;
  border-radius: 4px;
  display: inline-block;
  font-family: monospace;
}
.cell-wait {
  background: #2196f3;
  color: white;
}
.cell-tolak {
  background: #f44336;
  color: white;
}
.cell-acc {
  background: #4caf50;
  color: white;
}

/* ── Utility ── */
.fw {
  font-weight: 700;
}
.fw-mono {
  font-family: monospace;
  font-size: 11px;
}
.tr {
  text-align: right;
}
.text-primary {
  color: #1565c0;
}
</style>
