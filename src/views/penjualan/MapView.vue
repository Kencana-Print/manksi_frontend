<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mapService } from "@/services/penjualan/mapService";
import { useAuthStore } from "@/stores/authStore";
import {
  IconClipboardText,
  IconPrinter,
  IconPhoto,
  IconChevronDown,
  IconFileDescription,
  IconDiscountCheck,
  IconLock,
  IconLockOpen,
  IconX,
  IconPhotoOff,
  IconExternalLink,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightCollapse,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const menuId = "162";

const showPrintDialog = ref(false);
const printNomorBrowse = ref("");

// Ganti cara mendapatkan 'today' agar menggunakan local timezone
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
});

// --- STATE UNTUK MODAL GAMBAR & ALASAN ---
const dialogGambar = ref(false);
const gambarUrl = ref("");

const dialogAlasan = ref(false);
const alasanText = ref("");
const alasanNomor = ref("");

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    // Memastikan startDate dan endDate benar-benar dikirim sesuai input lokal
    const payload = {
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
    };
    const res = await mapService.getBrowseList(payload);
    return res.data.data || [];
  },
  immediate: true,
});

// Definisi Kolom berdasarkan query Delphi
const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "MO", key: "MO", width: "100px" },
  { title: "CMO", key: "CMO", width: "100px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Dateline", key: "Dateline", width: "100px" },
  { title: "Tgl. BAST", key: "TglBast", width: "100px" },
  {
    title: "Selisih (BAST-MAP)",
    key: "SelisihBastMap",
    width: "130px",
    align: "right",
  },
  { title: "Berita Acara", key: "Berita_Acara", width: "120px" },
  { title: "Divisi", key: "Divisi", width: "100px" },
  { title: "Cab", key: "Cab", width: "60px" },
  { title: "Workshop", key: "Workshop", width: "120px" },
  { title: "Workshop SPK", key: "WorkshopSPK", width: "130px" },
  { title: "Aktif", key: "Aktif", width: "60px", align: "center" },
  { title: "Nama", key: "Nama", minWidth: "250px" },
  { title: "Surat Jalan", key: "Surat_Jalan", width: "140px" },
  { title: "Ukuran", key: "Ukuran", width: "120px" },
  { title: "Panjang", key: "Panjang", width: "80px", align: "right" },
  { title: "Lebar", key: "Lebar", width: "80px", align: "right" },
  { title: "Gramasi", key: "Gramasi", width: "120px" },
  { title: "Kain", key: "Kain", width: "180px" },
  { title: "Finishing", key: "Finishing", width: "180px" },
  { title: "Qty", key: "Jumlah", width: "60px", align: "right" },
  { title: "Kirim", key: "Kirim", width: "60px", align: "right" },
  { title: "Rencana", key: "Rencana", width: "80px", align: "right" },
  { title: "Customer", key: "Customer", minWidth: "200px" },
  { title: "Salesman", key: "Salesman", width: "120px" },
  { title: "Tipe", key: "Tipe", width: "100px" },
  { title: "Harga", key: "Harga", width: "100px", align: "right" },
  { title: "Harga Riil", key: "HargaRiil", width: "100px", align: "right" },
  { title: "Created", key: "Created", width: "150px" },
  { title: "Revisi", key: "Revisi", width: "70px", align: "center" },
  { title: "No. Referensi", key: "NoReferensi", width: "140px" },
  { title: "Estimasi Jadi", key: "EstimasiJadi", width: "100px" },
  { title: "Close", key: "CloseStatus", width: "70px", align: "center" },
  { title: "SPK", key: "SPK", width: "160px" },
  { title: "Tgl. Desain", key: "Design_Tanggal", width: "100px" },
  { title: "User Desain", key: "Design_User", width: "100px" },
  { title: "Note Desain", key: "Design_Note", width: "150px" },
  { title: "Ngedit", key: "Ngedit", width: "100px" },
  { title: "Desain Baru", key: "Design_Baru", width: "100px", align: "center" },
  { title: "Desain Done", key: "Design_Done", width: "100px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "300px" },
];

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const fmtDateTime = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const fmtNum = (val: number | string | null) => {
  if (!val) return "0";
  return new Intl.NumberFormat("id-ID").format(Number(val));
};

// Pewarnaan baris berdasarkan logika Delphi:
// - Aktif='Y' & Close='N' -> Merah
// - Aktif='N' -> Abu-abu
const getRowProps = (data: any) => {
  const row = data.item?.raw || data.item;
  if (row.Aktif === "N") return { class: "row-passive text-grey" };
  // Sesuai Delphi: Aktif = Y, CloseStatus = N --> Merah
  if (row.Aktif === "Y" && row.CloseStatus === "N")
    return { class: "row-active-open text-red-darken-2 font-weight-medium" };
  // Sisa (Aktif = Y, CloseStatus = Y) --> Hitam (bawaan)
  return {};
};

// Aksi Dasar
const goAdd = () =>
  router.push({ name: "MapFormCreate", query: { mode: "new" } });
const goEdit = (item: any) =>
  router.push({
    name: "MapFormEdit",
    params: { nomor: encodeURIComponent(item.Nomor) },
  });

const goDelete = async (item: any) => {
  isLoading.value = true;
  try {
    await mapService.deleteMap(encodeURIComponent(item.Nomor));
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isLoading.value = false;
  }
};

// Aksi Ekstra
const lihatGambar = () => {
  if (selected.value.length === 0) return;
  const nomor = selected.value[0].Nomor;

  // Arahkan langsung ke port 8888 yang baru kita buat
  gambarUrl.value = `http://103.94.238.252:8888/file-gambar/${nomor}.jpg`;

  dialogGambar.value = true;
};

const cetak = () => {
  if (selected.value.length === 0) return;
  const item = selected.value[0];

  // 1. Ambil bagian user dari authStore
  // Gunakan optional chaining (?.) untuk menghindari error jika user null
  const zBagian = authStore.user?.bagian?.toUpperCase() || "";

  // 2. Terapkan Validasi Delphi
  // If (zBagian<>'MARKETING') and (CDSMaster.FieldByname('CMO').AsString='') then
  //   MessageDlg('MAP tsb belum diapprove oleh Chief Marketing.\nTidak bisa dicetak.',mtWarning, [mbOK],0);
  if (zBagian !== "MARKETING" && (!item.CMO || item.CMO.trim() === "")) {
    toast.warning(
      "MAP tsb belum diapprove oleh Chief Marketing.\nTidak bisa dicetak.",
    );
    return; // Stop eksekusi di sini, dialog cetak tidak akan muncul
  }

  // 3. Lanjut buka modal jika lolos validasi
  printNomorBrowse.value = item.Nomor;
  showPrintDialog.value = true;
};

const pilihGambarVertikalBrowse = () => {
  showPrintDialog.value = false;
  window.open(
    `/penjualan/map/print/${encodeURIComponent(printNomorBrowse.value)}?layout=vertikal`,
    "_blank",
  );
};

const pilihGambarHorizontalBrowse = () => {
  showPrintDialog.value = false;
  window.open(
    `/penjualan/map/print/${encodeURIComponent(printNomorBrowse.value)}?layout=horizontal`,
    "_blank",
  );
};

const pengajuanPerubahan = () => {
  if (selected.value.length === 0) return;
  alasanNomor.value = selected.value[0].Nomor;
  alasanText.value = "";
  dialogAlasan.value = true;
};

const submitPengajuan = async () => {
  if (!alasanText.value.trim()) {
    toast.warning("Alasan harus diisi!");
    return;
  }

  isLoading.value = true;
  try {
    await mapService.requestPin5(alasanNomor.value, alasanText.value);
    toast.success("Berhasil diajukan. Menunggu ACC.");
    dialogAlasan.value = false;
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengajukan.");
  } finally {
    isLoading.value = false;
  }
};

const approvalMap = async () => {
  if (selected.value.length === 0) return;
  const item = selected.value[0];

  if (!confirm(`Yakin akan di-approve untuk MAP ${item.Nomor}?`)) return;

  isLoading.value = true;
  try {
    await mapService.approveCmo(item.Nomor);
    toast.success("Berhasil di-approve.");
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal approve.");
  } finally {
    isLoading.value = false;
  }
};

const toggleCloseData = async (isClose: "Y" | "N") => {
  if (selected.value.length === 0) return;
  const item = selected.value[0];

  const actionText = isClose === "Y" ? "di-Close" : "di-Open";
  if (!confirm(`Yakin ingin ${actionText}?`)) return;

  isLoading.value = true;
  try {
    await mapService.toggleClose(item.Nomor, isClose);
    toast.success(`Berhasil ${actionText}.`);
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || `Gagal ${actionText}.`);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Memo Approval Produk (MAP)"
    :menu-id="menuId"
    :icon="IconClipboardText"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filterState="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    can-export
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @export="exportToExcel('MAP')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <div class="filter-divider"></div>

      <div class="legend-group">
        <div class="legend-item">
          <div class="legend-box bg-grey"></div>
          <span>= Pasif</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-red"></div>
          <span>= Aktif dan Open</span>
        </div>
        <div class="legend-item">
          <div class="legend-box bg-black"></div>
          <span>= Close (Aktif dan Sudah Jadi SPK)</span>
        </div>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        variant="flat"
        color="blue-grey"
        :disabled="selected.length === 0"
        @click="cetak"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        size="small"
        variant="flat"
        color="teal-darken-1"
        :disabled="selected.length === 0"
        @click="lihatGambar"
      >
        <template #prepend
          ><IconPhoto :size="15" :stroke-width="1.7"
        /></template>
        Lihat Gambar
      </v-btn>

      <v-menu v-if="selected.length > 0">
        <template v-slot:activator="{ props }">
          <v-btn color="primary" variant="flat" size="small" v-bind="props">
            Aksi MAP
            <template #append
              ><IconChevronDown :size="14" :stroke-width="2"
            /></template>
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item @click="pengajuanPerubahan">
            <template #prepend
              ><IconFileDescription :size="16" :stroke-width="1.7"
            /></template>
            <v-list-item-title>Pengajuan Perubahan</v-list-item-title>
          </v-list-item>
          <v-list-item @click="approvalMap">
            <template #prepend
              ><IconDiscountCheck :size="16" :stroke-width="1.7"
            /></template>
            <v-list-item-title>Approval MAP</v-list-item-title>
          </v-list-item>
          <v-divider></v-divider>
          <v-list-item @click="toggleCloseData('Y')">
            <template #prepend
              ><IconLock :size="16" :stroke-width="1.7"
            /></template>
            <v-list-item-title>Close Data</v-list-item-title>
          </v-list-item>
          <v-list-item @click="toggleCloseData('N')">
            <template #prepend
              ><IconLockOpen :size="16" :stroke-width="1.7"
            /></template>
            <v-list-item-title>Open Data</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.Dateline="{ item }">{{ fmtDate(item.Dateline) }}</template>
    <template #item.TglBast="{ item }">{{ fmtDate(item.TglBast) }}</template>
    <template #item.EstimasiJadi="{ item }">{{
      fmtDate(item.EstimasiJadi)
    }}</template>
    <template #item.Design_Tanggal="{ item }">{{
      fmtDate(item.Design_Tanggal)
    }}</template>

    <template #item.Created="{ item }">{{
      fmtDateTime(item.Created)
    }}</template>

    <template #item.Panjang="{ item }">{{ fmtNum(item.Panjang) }}</template>
    <template #item.Lebar="{ item }">{{ fmtNum(item.Lebar) }}</template>
    <template #item.Jumlah="{ item }">{{ fmtNum(item.Jumlah) }}</template>
    <template #item.Kirim="{ item }">{{ fmtNum(item.Kirim) }}</template>
    <template #item.Rencana="{ item }">{{ fmtNum(item.Rencana) }}</template>
    <template #item.Harga="{ item }">{{ fmtNum(item.Harga) }}</template>
    <template #item.HargaRiil="{ item }">{{ fmtNum(item.HargaRiil) }}</template>

    <template #item.Keterangan="{ item }">
      <div
        style="
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
          font-size: 11px;
        "
        :title="item.Keterangan"
      >
        {{ item.Keterangan }}
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <div class="d-flex align-center gap-2">
        <span class="font-weight-bold">{{ item.Nomor }}</span>
        <v-chip
          v-if="item.Ngedit === 'WAIT'"
          color="warning"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >WAIT</v-chip
        >
        <v-chip
          v-if="item.Ngedit === 'TOLAK'"
          color="error"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >TOLAK</v-chip
        >
        <v-chip
          v-if="item.Ngedit === 'ACC'"
          color="success"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >ACC</v-chip
        >
      </div>
    </template>

    <template #item.Nama="{ item }">
      <div
        :class="{
          'bg-yellow pa-1 rounded font-weight-bold':
            item.Design_Baru === 'Y' && item.Design_Done === 'N',
        }"
        style="
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        "
        :title="item.Nama"
      >
        {{ item.Nama }}
      </div>
    </template>

    <template #item.Customer="{ item }">
      <div
        style="
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        "
        :title="item.Customer"
      >
        {{ item.Customer }}
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="dialogGambar" max-width="800px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white d-flex justify-space-between align-center pa-3"
      >
        <span>Gambar MAP: {{ selected[0]?.Nomor }}</span>
        <v-btn
          variant="text"
          size="small"
          color="white"
          @click="dialogGambar = false"
        >
          <IconX :size="18" :stroke-width="2" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4 text-center bg-grey-lighten-4">
        <v-img
          :src="gambarUrl"
          max-height="600"
          contain
          class="bg-white rounded border"
        >
          <template v-slot:placeholder>
            <div
              class="d-flex flex-column align-center justify-center fill-height"
            >
              <v-progress-circular
                indeterminate
                color="primary"
                size="40"
              ></v-progress-circular>
              <div class="text-caption mt-2 text-grey-darken-1">
                Sedang memuat gambar...
              </div>
            </div>
          </template>

          <template v-slot:error>
            <div
              class="d-flex flex-column align-center justify-center fill-height text-grey"
            >
              <IconPhotoOff :size="48" color="#bdbdbd" />
              <div class="text-subtitle-2 mt-2">
                Gambar tidak tersedia di server
              </div>
              <div class="text-caption">
                Pastikan file {{ selected[0]?.Nomor }}.jpg ada di folder
                /mnt/image
              </div>
            </div>
          </template>
        </v-img>
      </v-card-text>

      <v-card-actions class="bg-white pa-2 border-t">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" :href="gambarUrl" target="_blank">
          <template #prepend
            ><IconExternalLink :size="15" :stroke-width="1.7"
          /></template>
          Buka di Tab Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogAlasan" max-width="500px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 font-weight-bold d-flex align-center"
      >
        <IconFileDescription
          :size="18"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        Pengajuan Perubahan Data MAP
      </v-card-title>
      <v-card-text class="pa-4 pt-4">
        <div class="text-body-2 mb-2 font-weight-medium">
          MAP: {{ alasanNomor }}
        </div>
        <v-textarea
          v-model="alasanText"
          label="Alasan Pengajuan"
          variant="outlined"
          auto-grow
          rows="3"
          hide-details
          placeholder="Tuliskan alasan perubahan data secara jelas..."
        ></v-textarea>
      </v-card-text>
      <v-card-actions class="pa-3 bg-grey-lighten-4 border-t">
        <v-spacer></v-spacer>
        <v-btn variant="text" color="error" @click="dialogAlasan = false"
          >Batal</v-btn
        >
        <v-btn color="primary" variant="elevated" @click="submitPengajuan"
          >Kirim Pengajuan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintDialog" max-width="450px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter
          :size="18"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        <span class="text-subtitle-1 font-weight-bold"
          >Cetak Surat Pra SPK (MAP)</span
        >
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-4 text-grey-darken-3">
          Mencetak dokumen MAP: <strong>{{ printNomorBrowse }}</strong
          ><br />
          Silakan pilih orientasi cetaknya:
        </div>
        <div class="d-flex flex-column gap-2">
          <v-btn
            color="primary"
            variant="flat"
            @click="pilihGambarVertikalBrowse"
          >
            <template #prepend
              ><IconLayoutSidebarRight :size="15" :stroke-width="1.7"
            /></template>
            Cetak Vertikal (Portrait)
          </v-btn>
          <v-btn
            color="info"
            variant="tonal"
            @click="pilihGambarHorizontalBrowse"
          >
            <template #prepend
              ><IconLayoutSidebarRightCollapse :size="15" :stroke-width="1.7"
            /></template>
            Cetak Horizontal (Landscape)
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="showPrintDialog = false"
          >Batal</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
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
  white-space: nowrap;
}
.filter-sep {
  font-size: 11px;
  color: #888;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.date-inp:focus {
  border-color: #1976d2;
}
.gap-2 {
  gap: 8px;
}
.bg-yellow {
  background-color: yellow !important;
  color: #000;
}

.filter-divider {
  width: 1px;
  height: 24px;
  background-color: #d0d0d0;
  margin: 0 12px;
}

/* Legend Styles */
.legend-group {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 11px;
  font-weight: 500;
  color: #333;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend-box {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.bg-grey {
  background-color: #9e9e9e;
}
.bg-red {
  background-color: #d32f2f;
}
.bg-black {
  background-color: #212121;
}

/* Memaksa warna baris tabel tembus */
:deep(.row-passive td) {
  color: #9e9e9e !important; /* Abu-abu */
}

:deep(.row-active-open td) {
  color: #d32f2f !important; /* Merah */
  font-weight: 600 !important;
}
</style>
