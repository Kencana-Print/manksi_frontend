<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { soDtfService } from "@/services/garmen/soDtfService";
import { IconPhotoSearch, IconX } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();

const getLocalDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

// ⚠️ Default filter HARI INI s.d. HARI INI — replikasi literal
// StartDate.DateTime:=Date di FormShow, BUKAN awal-bulan spt modul lain.
const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
});

// --- KOMPOSISI BROWSE --- (tanpa CRUD — modul ini murni browse + lihat gambar)
const { items, isLoading, fetchData } = useBrowse({
  menuId: "128",
  fetchApi: async () => {
    const res = await soDtfService.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
    );
    return res.data.data;
  },
});

// --- KONFIGURASI TABEL ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Workshop", key: "Workshop", width: "90px" },
  { title: "Tanggal", key: "Tanggal", width: "95px" },
  { title: "Dateline", key: "Dateline", width: "95px" },
  { title: "Nama DTF", key: "NamaDTF", minWidth: "220px" },
  { title: "Jumlah", key: "Jumlah", width: "80px" },
  { title: "Titik", key: "Titik", width: "70px" },
  { title: "Total Titik", key: "TotalTitik", width: "90px" },
  { title: "Lhk", key: "Lhk", width: "80px" },
  { title: "Sales", key: "Sales", width: "110px" },
  { title: "Bag. Desain", key: "BagDesain", width: "110px" },
  { title: "Customer", key: "Customer", minWidth: "160px" },
  { title: "Kain", key: "Kain", width: "100px" },
  { title: "Finishing", key: "Finishing", width: "100px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "160px" },
  { title: "Created", key: "Created", width: "90px" },
];

const num = (v: any) => new Intl.NumberFormat("id-ID").format(Number(v) || 0);

const expandedRows = ref<any[]>([]);

// ⚠️ Row coloring — replikasi cxGrdMasterCustomDrawCell persis:
// Lhk=0 → merah; 0<Lhk<TotalTitik → biru; else normal
const rowTextColor = (item: any) => {
  const lhk = Number(item.Lhk) || 0;
  const totalTitik = Number(item.TotalTitik) || 0;
  if (lhk === 0) return "#c62828";
  if (lhk > 0 && lhk < totalTitik) return "#1565c0";
  return "";
};

// --- GAMBAR ---
const RETAIL_IMAGE_BASE = "https://retail.kaosanofficial.com/images";
const imageModalOpen = ref(false);
const imageModalUrl = ref("");
const imageNotFound = ref(false);

const buildImageUrl = (nomor: string) => {
  const cabKode = nomor.substring(0, 3); // "K02.SD.2608.0001" -> "K02"
  return `${RETAIL_IMAGE_BASE}/${cabKode}/${encodeURIComponent(nomor)}.jpg`;
};

const onLihatGambar = (item: any) => {
  if (!item?.Nomor) {
    toast.warning("Pilih data terlebih dahulu.");
    return;
  }
  imageNotFound.value = false;
  imageModalUrl.value = buildImageUrl(item.Nomor);
  imageModalOpen.value = true;
};

const onImageError = () => {
  imageNotFound.value = true;
};
</script>

<template>
  <BaseBrowse
    title="SO DTF/DTG"
    menu-id="128"
    :icon="IconPhotoSearch"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    show-expand
    v-model:expanded="expandedRows"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="false"
    @refresh="fetchData"
    :row-props-fn="
      (data) => ({
        style: `color: ${rowTextColor(data.item?.raw || data.item)} !important;`,
      })
    "
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Filter Periode</span>
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
    </template>

    <template #row-actions="{ item }">
      <v-btn size="small" color="grey-darken-3" @click="onLihatGambar(item)">
        <template #prepend
          ><IconPhotoSearch :size="15" :stroke-width="1.7"
        /></template>
        Gambar
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.Dateline="{ item }">
      {{ formatTanggal(item.Dateline) }}
    </template>
    <template #item.Jumlah="{ item }">
      {{ num(item.Jumlah) }}
    </template>
    <template #item.TotalTitik="{ item }">
      {{ num(item.TotalTitik) }}
    </template>
    <template #item.Lhk="{ item }">
      {{ num(item.Lhk) }}
    </template>

    <template #detail="{ item }">
      <div v-if="item" class="det-wrap">
        <div class="det-card">
          <div class="det-head">Detail Ukuran</div>
          <div class="dt-scroll">
            <table class="dt">
              <thead>
                <tr>
                  <th style="text-align: left">Ukuran</th>
                  <th style="width: 100px; text-align: right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(dtl, i) in item.details" :key="i">
                  <td>{{ dtl.Ukuran }}</td>
                  <td class="tr">{{ num(dtl.Jumlah) }}</td>
                </tr>
                <tr v-if="!item.details?.length">
                  <td colspan="2" class="empty-td">Tidak ada rincian.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <!-- Modal Lihat Gambar -->
  <v-dialog v-model="imageModalOpen" max-width="600px">
    <div class="img-dlg">
      <div class="img-dlg-header">
        <span>Gambar Desain</span>
        <button class="img-dlg-close" @click="imageModalOpen = false">
          <IconX :size="16" :stroke-width="1.7" />
        </button>
      </div>
      <div class="img-dlg-body">
        <div v-if="imageNotFound" class="img-not-found">
          Gambar tidak ditemukan.
        </div>
        <img
          v-else
          :src="imageModalUrl"
          class="img-preview"
          @error="onImageError"
        />
      </div>
    </div>
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
}
.date-inp:focus {
  border-color: #1976d2;
}
.det-wrap {
  padding: 6px 8px 8px 48px;
  background: #f5f6f8;
}
.det-card {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}
.det-head {
  background: #00796b;
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 4px 9px;
  flex-shrink: 0;
}
.dt-scroll {
  overflow-y: auto;
  max-height: 200px;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt th {
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #f5f5f5;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 2;
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 3px 6px;
}
.tr {
  text-align: right;
}
.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px !important;
}
.img-dlg {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}
.img-dlg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
}
.img-dlg-close {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.img-dlg-body {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #fafafa;
}
.img-preview {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}
.img-not-found {
  color: #9e9e9e;
  font-style: italic;
  padding: 40px;
}
</style>
