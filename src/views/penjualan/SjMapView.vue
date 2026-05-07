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

const router = useRouter();
const toast = useToast();

// 1. Pastikan state expanded didefinisikan sebagai array
const expanded = ref([]);

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
const formatDate = (d: Date) => d.toISOString().substring(0, 10);

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
  startDate: formatDate(firstDay),
  endDate: formatDate(today),
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
      <div
        class="d-flex align-center gap-2 mr-4 bg-white px-2 py-1 border rounded"
      >
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="text-caption">s.d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
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
      {{ item.Tanggal ? item.Tanggal.substring(0, 10) : "" }}
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
      <div class="pa-2 bg-grey-lighten-4">
        <table class="sub-table">
          <thead>
            <tr>
              <th width="150">Nomor Memo</th>
              <th>Nama Pekerjaan</th>
              <th width="150">Ukuran</th>
              <th width="100" class="text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in item.children" :key="d['Nomor Memo']">
              <td class="font-weight-bold text-primary">
                {{ d["Nomor Memo"] }}
              </td>
              <td>{{ d.Nama }}</td>
              <td>{{ d.Ukuran }}</td>
              <td class="text-right font-weight-bold">{{ d.Jumlah }}</td>
            </tr>
            <tr v-if="!item.children || item.children.length === 0">
              <td colspan="4" class="text-center pa-4 text-grey">
                Data detail tidak ditemukan
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #filter-right>
      <div class="d-flex align-center gap-3 text-caption ml-4">
        <div class="d-flex align-center gap-1">
          <div class="dot bg-blue"></div>
          Nunggu Acc
        </div>
        <div class="d-flex align-center gap-1">
          <div class="dot bg-green"></div>
          Sudah Acc
        </div>
        <div class="d-flex align-center gap-1">
          <div class="dot bg-red"></div>
          Tolak
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
.date-inp {
  border: none;
  outline: none;
  font-size: 12px;
  width: 110px;
}
.nomor-badge {
  padding: 2px 8px;
  font-weight: 700;
  border-radius: 4px;
  display: inline-block;
  font-family: monospace;
}
.cell-wait {
  background-color: #2196f3;
  color: white;
}
.cell-tolak {
  background-color: #f44336;
  color: white;
}
.cell-acc {
  background-color: #4caf50;
  color: white;
}

.sub-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #ccc;
  background: white;
}
.sub-table th {
  background: #f5f5f5;
  padding: 6px 10px;
  font-size: 11px;
  text-align: left;
  border-bottom: 2px solid #ddd;
}
.sub-table td {
  padding: 6px 10px;
  font-size: 11px;
  border-bottom: 1px solid #eee;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
</style>
