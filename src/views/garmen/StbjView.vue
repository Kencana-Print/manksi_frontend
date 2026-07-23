<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { stbjService as svc } from "@/services/garmen/stbjService";
import { exportExcelSingle } from "@/utils/excelExport";
import { IconClipboardCheck, IconSearch, IconRefresh } from "@tabler/icons-vue";
import GudangJadiSearchModal from "@/components/lookups/GudangJadiSearchModal.vue";
import { formatTanggal } from "@/utils/dateFormat";

const MENU_ID = "105";
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const userCab = computed(() => auth.user?.cabang || "");

// ── Helpers ────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const firstOfMonth = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const num = (v: any, d = 0) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

// ── Filter ─────────────────────────────────────────────────
const tglAwal = ref(firstOfMonth());
const tglAkhir = ref(todayLocal());
const filterGudang = ref("GJ001");
const filterGudangNama = ref("GUDANG BARANG JADI JERON");
const showGudangModal = ref(false);

const selectGudang = (item: any) => {
  filterGudang.value = item.Kode;
  filterGudangNama.value = item.Nama;
  fetchData();
};

// ── Browse ─────────────────────────────────────────────────
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
    const res = await svc.getBrowse(
      tglAwal.value,
      tglAkhir.value,
      filterGudang.value,
    );
    return res.data.data ?? [];
  },
});

watch([tglAwal, tglAkhir, filterGudang], () => fetchData());

const selectedItem = computed(() => selected.value?.[0] ?? null);

// ── Expand row ─────────────────────────────────────────────
const detailCache = ref<Record<string, any[]>>({});
const loadingDetail = ref<Set<string>>(new Set());
const expandedNomors = ref<string[]>([]);
const expandedItems = ref<any[]>([]);

const onExpandChange = async (newExpanded: any[]) => {
  expandedItems.value = newExpanded;

  const newNomors = newExpanded.map((i: any) => (i.raw || i).Nomor);
  for (const nomor of newNomors) {
    if (!detailCache.value[nomor] && !loadingDetail.value.has(nomor)) {
      loadingDetail.value = new Set([...loadingDetail.value, nomor]);
      try {
        const res = await svc.getDetailByNomor(nomor);
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

const onDeleteSelected = async () => {
  if (!selectedItem.value) return;
  try {
    await svc.deleteData(selectedItem.value.Nomor);
    toast.success("Data berhasil dihapus.");
    clearSelection();
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};

// ── Warna Ngedit ───────────────────────────────────────────
// Sesuai Delphi: WAIT=biru, ACC=hijau, TOLAK=merah di kolom Nomor
const ngeditClass = (row: any) => {
  if (row.Ngedit === "WAIT") return "bg-wait";
  if (row.Ngedit === "ACC") return "bg-acc";
  if (row.Ngedit === "TOLAK") return "bg-tolak";
  return "";
};

// ── Actions ────────────────────────────────────────────────
const goNew = () => {
  router.push({
    name: "StbjFormCreate",
    query: {
      gudang: filterGudang.value,
      gudangNama: filterGudangNama.value,
    },
  });
};

const goEdit = () => {
  if (!selectedItem.value) return;
  router.push({
    name: "StbjFormEdit",
    query: { nomor: selectedItem.value.Nomor },
    // Gudang saat edit diambil dari data DB, tidak perlu di-pass
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

const showCetakDialog = ref(false);
const cetakTargetNomor = ref("");

const onCetak = () => {
  if (!selectedItem.value) return;
  cetakTargetNomor.value = selectedItem.value.Nomor;
  showCetakDialog.value = true;
};

const doCetakBrowse = (mode: string) => {
  showCetakDialog.value = false;
  const url = router.resolve({
    name: "StbjPrint",
    query: { nomor: cetakTargetNomor.value, mode },
  }).href;
  window.open(url, "_blank");
};

// ── Export ─────────────────────────────────────────────────
const onExport = async () => {
  try {
    const res = await svc.getExportData(
      tglAwal.value,
      tglAkhir.value,
      filterGudang.value,
    );
    await exportExcelSingle(
      `STBJ_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      "STBJ",
      [
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "Tanggal", key: "Tanggal", width: 12 },
        { header: "Keterangan", key: "Keterangan", width: 30 },
        { header: "Kode Gudang", key: "GudangKode", width: 12 },
        { header: "Gudang", key: "Gudang", width: 25 },
        { header: "Dari", key: "Dari", width: 25 },
        { header: "No. Terima", key: "NomorTerima", width: 18 },
        { header: "Tgl Terima", key: "TglTerima", width: 12 },
        { header: "User", key: "Usr", width: 10 },
      ],
      res.data.data ?? [],
      "Surat Terima Barang Jadi",
    );
  } catch {
    toast.error("Gagal export.");
  }
};

const onExportDetail = async () => {
  try {
    const res = await svc.getExportDetail(
      tglAwal.value,
      tglAkhir.value,
      filterGudang.value,
    );
    await exportExcelSingle(
      `STBJ_Detail_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      "STBJ Detail",
      [
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "SPK", key: "Spk_Nomor", width: 20 },
        { header: "Nama", key: "Nama", width: 30 },
        { header: "Ukuran", key: "Ukuran", width: 20 },
        { header: "Size", key: "Size", width: 10 },
        {
          header: "Jumlah",
          key: "Jumlah",
          width: 12,
          numFmt: "#,##0",
          align: "right",
        },
        {
          header: "Koli",
          key: "Koli",
          width: 10,
          numFmt: "#,##0",
          align: "right",
        },
        { header: "Keterangan", key: "Keterangan", width: 25 },
      ],
      res.data.data ?? [],
      "Detail Surat Terima Barang Jadi",
    );
  } catch {
    toast.error("Gagal export detail.");
  }
};

// ── Pengajuan Ubah ─────────────────────────────────────────
const showPengajuanDialog = ref(false);
const pengajuanAlasan = ref("");
const isPengajuanLoading = ref(false);

const openPengajuan = () => {
  if (!selectedItem.value) return;
  pengajuanAlasan.value = "";
  showPengajuanDialog.value = true;
};

const submitPengajuan = async () => {
  if (!pengajuanAlasan.value.trim()) {
    toast.warning("Alasan harus diisi.");
    return;
  }
  isPengajuanLoading.value = true;
  try {
    await svc.pengajuanUbah(selectedItem.value!.Nomor, pengajuanAlasan.value);
    toast.success("Pengajuan berhasil. Menunggu ACC.");
    showPengajuanDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal pengajuan.");
  } finally {
    isPengajuanLoading.value = false;
  }
};

// ── Headers ────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "95px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Kode Gdg", key: "GudangKode", width: "80px" },
  { title: "Gudang", key: "Gudang", width: "200px" },
  { title: "Dari", key: "Dari", width: "160px" },
  { title: "No. Terima", key: "NomorTerima", width: "150px" },
  { title: "Tgl Terima", key: "TglTerima", width: "95px" },
  { title: "User", key: "Usr", width: "70px" },
];

// Summary
const totalRows = computed(() => items.value?.length ?? 0);
</script>

<template>
  <BaseBrowse
    title="Surat Terima Barang Jadi"
    menu-id="105"
    :icon="IconClipboardCheck"
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
    search-placeholder="Cari nomor, gudang, keterangan..."
    @update:selected="selected = $event"
    @add="goNew"
    @edit="goEdit"
    @delete="onDeleteSelected"
    @refresh="fetchData"
    :expanded="expandedItems"
    @update:expanded="onExpandChange"
  >
    <!-- Filter -->
    <template #filter-left>
      <label class="flbl">Tanggal</label>
      <input type="date" v-model="tglAwal" class="finp" />
      <span class="flbl">s.d.</span>
      <input type="date" v-model="tglAkhir" class="finp" />

      <label class="flbl" style="margin-left: 8px">Gudang</label>
      <div class="ig">
        <input
          :value="filterGudang"
          readonly
          class="finp ro"
          style="width: 70px; flex-shrink: 0"
        />
        <input
          :value="filterGudangNama"
          readonly
          class="finp ro"
          style="width: 160px; min-width: 0"
        />
        <button class="ibtn" @click="showGudangModal = true">
          <IconSearch :size="11" color="#1565c0" />
        </button>
      </div>
    </template>

    <template #filter-right>
      <div class="legend-wrap">
        <span class="leg leg-wait">Nunggu Acc</span>
        <span class="leg leg-acc">Sudah Acc</span>
        <span class="leg leg-tolak">Tolak</span>
      </div>
    </template>

    <!-- Extra buttons -->
    <template #extra-actions>
      <v-btn
        size="small"
        color="green"
        :disabled="!canExport"
        @click="onExport"
      >
        Export
      </v-btn>
      <v-btn
        size="small"
        color="teal"
        :disabled="!canExport"
        @click="onExportDetail"
      >
        Export Detail
      </v-btn>
      <v-btn
        size="small"
        color="orange"
        :disabled="!selectedItem"
        @click="onCetak"
      >
        Cetak
      </v-btn>
      <v-menu v-if="selectedItem">
        <template #activator="{ props }">
          <v-btn size="small" color="purple" v-bind="props">Tindakan ▾</v-btn>
        </template>
        <v-list density="compact" style="font-size: 12px; min-width: 200px">
          <v-list-item @click="openPengajuan">
            <v-list-item-title>Pengajuan Perubahan Data</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <!-- Custom cell rendering via item slot Vuetify -->
    <template #item.Nomor="{ item }">
      <span class="nomor-cell" :class="ngeditClass(item)">
        {{ item.Nomor }}
      </span>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.TglTerima="{ item }">
      {{ item.TglTerima ? formatTanggal(item.TglTerima) : "-" }}
    </template>

    <template #item.NomorTerima="{ item }">
      <span
        :style="
          item.NomorTerima
            ? 'color:#1565c0;font-weight:600;font-family:monospace'
            : 'color:#9e9e9e'
        "
      >
        {{ item.NomorTerima || "-" }}
      </span>
    </template>

    <!-- Expanded detail -->
    <template #detail="{ item }">
      <table class="dtbl">
        <thead>
          <tr>
            <th style="width: 26px">#</th>
            <th style="width: 130px">SPK</th>
            <th style="min-width: 180px">Nama</th>
            <th style="width: 120px">Ukuran</th>
            <th style="width: 80px">Size</th>
            <th style="width: 80px; text-align: right">Jumlah</th>
            <th style="width: 70px; text-align: right">Koli</th>
            <th>Keterangan</th>
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
                {{ d.Spk_Nomor }}
              </td>
              <td>{{ d.Nama }}</td>
              <td>{{ d.Ukuran }}</td>
              <td style="text-align: center">{{ d.Size }}</td>
              <td style="text-align: right">{{ num(d.Jumlah) }}</td>
              <td style="text-align: right">{{ num(d.Koli) }}</td>
              <td>{{ d.Keterangan }}</td>
            </tr>
          </template>
          <tr v-else-if="loadingDetail.has(item.Nomor)">
            <td
              colspan="8"
              style="text-align: center; padding: 8px; color: #9e9e9e"
            >
              Memuat...
            </td>
          </tr>
          <tr v-else>
            <td
              colspan="8"
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

  <!-- Dialog Pengajuan -->
  <v-dialog v-model="showPengajuanDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Pengajuan Perubahan Data
      </v-card-title>
      <v-card-text class="pa-4">
        <div style="font-size: 12px; margin-bottom: 8px">
          Nomor: <b>{{ selectedItem?.Nomor }}</b>
        </div>
        <label style="font-size: 11px; font-weight: 600; color: #444"
          >Alasan <span style="color: #c62828">*</span></label
        >
        <textarea
          v-model="pengajuanAlasan"
          rows="4"
          style="
            width: 100%;
            margin-top: 4px;
            border: 1px solid #bdbdbd;
            border-radius: 4px;
            padding: 6px;
            font-size: 12px;
            resize: vertical;
            outline: none;
          "
          placeholder="Masukkan alasan pengajuan..."
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          :disabled="isPengajuanLoading"
          @click="showPengajuanDialog = false"
        >
          Batal
        </v-btn>
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isPengajuanLoading"
          @click="submitPengajuan"
        >
          Ajukan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showCetakDialog" max-width="320px">
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak STBJ
      </v-card-title>
      <v-card-text class="pa-3" style="font-size: 12px">
        Pilih jenis cetakan untuk <b>{{ cetakTargetNomor }}</b>
      </v-card-text>
      <v-card-actions class="pa-3 border-t" style="gap: 8px">
        <v-btn variant="text" size="small" @click="showCetakDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="outlined"
          size="small"
          color="primary"
          @click="doCetakBrowse('biasa')"
          >Biasa</v-btn
        >
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          @click="doCetakBrowse('rangkap3')"
          >Rangkap 3</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <GudangJadiSearchModal v-model="showGudangModal" @selected="selectGudang" />
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

.legend-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.leg {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 600;
}
.leg-wait {
  background: #1565c0;
  color: white;
}
.leg-acc {
  background: #2e7d32;
  color: white;
}
.leg-tolak {
  background: #c62828;
  color: white;
}

.nomor-cell {
  display: inline-block;
  padding: 1px 4px;
  border-radius: 2px;
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
}
.bg-wait {
  background: #1565c0;
  color: white;
}
.bg-acc {
  background: #2e7d32;
  color: white;
}
.bg-tolak {
  background: #c62828;
  color: white;
}

.dtbl {
  border-collapse: collapse;
  font-size: 11px;
  min-width: 600px;
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

.ig {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  height: 26px;
  background: white;
  overflow: hidden;
}
.ig .finp {
  border: none;
  height: 24px;
  border-radius: 0;
}
.ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.ibtn {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibtn:hover {
  background: #bbdefb;
}
</style>
