<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  bukuBesarService,
  type BukuBesarRow,
  type AccountItem,
} from "@/services/laporan/finance/bukuBesarService";
import { IconBook, IconFileExport, IconSearch } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const authStore = useAuthStore();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// ── Periode & Account ──
const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const getAwalBulan = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

const filterState = ref<Record<string, any>>({});
const startDate = ref(getAwalBulan());
const endDate = ref(getToday());
const rekkode = ref("");
const reknama = ref("");
const isInitializing = ref(true);

watch([startDate, endDate], () => {
  if (isInitializing.value) return;
  if (rekkode.value && reknama.value) fetchData();
});

// ── Data ──
const items = ref<BukuBesarRow[]>([]);
const isLoading = ref(false);

const headers = [
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Nomor", key: "Nomor", width: "190px", fixed: true },
  { title: "Trs", key: "Trs", width: "55px", align: "center" },
  { title: "Nota", key: "Nota", width: "110px" },
  { title: "Penerima", key: "Penerima", width: "130px" },
  { title: "Keterangan", key: "Keterangan", width: "280px" },
  { title: "Debet", key: "Debet", width: "140px", align: "end" },
  { title: "Kredit", key: "Kredit", width: "140px", align: "end" },
  { title: "Saldo", key: "Saldo", width: "150px", align: "end" },
  { title: "Account", key: "Account", width: "90px" },
  { title: "Nama Account", key: "NamaAccount", width: "260px" },
  {
    title: "Tgl Transfer",
    key: "TglTransfer",
    width: "110px",
    align: "center",
  },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "");

const fetchData = async () => {
  if (!rekkode.value || !reknama.value) return;
  isLoading.value = true;
  try {
    const res = await bukuBesarService.getBukuBesar(
      rekkode.value,
      startDate.value,
      endDate.value,
    );
    items.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

// ── Init: load default account per cabang user, lalu data ──
onMounted(async () => {
  isInitializing.value = true;
  try {
    const cabang = authStore.userCabang || "P01";
    const resDef = await bukuBesarService.getDefaultAccount(cabang);
    const kode = resDef.data.data.kode;
    const resAcc = await bukuBesarService.getAccountByKode(kode);
    rekkode.value = kode;
    reknama.value = resAcc.data.data.nama;
  } catch {
    /* silent — biar user pilih manual lewat modal */
  }
  isInitializing.value = false;
  await fetchData();
});

// ── Modal Search Account ──
const showModal = ref(false);
const modalSearch = ref("");
const modalLoading = ref(false);
const modalItems = ref<AccountItem[]>([]);
const modalPage = ref(1);
const MODAL_PAGE_SIZE = 50;

const modalFiltered = computed(() => {
  const q = modalSearch.value.toLowerCase();
  if (!q) return modalItems.value;
  return modalItems.value.filter(
    (a) => a.kode.toLowerCase().includes(q) || a.nama.toLowerCase().includes(q),
  );
});
const modalPaged = computed(() =>
  modalFiltered.value.slice(0, modalPage.value * MODAL_PAGE_SIZE),
);
const modalHasMore = computed(
  () => modalPaged.value.length < modalFiltered.value.length,
);

let debounceTimer: ReturnType<typeof setTimeout>;
const onModalSearchInput = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    modalPage.value = 1;
  }, 350);
};

const openModal = async () => {
  showModal.value = true;
  modalSearch.value = "";
  modalPage.value = 1;
  modalLoading.value = true;
  try {
    const cabang = authStore.userCabang || "P01";
    const res = await bukuBesarService.searchAccount(cabang);
    modalItems.value = res.data.data || [];
  } catch (e: any) {
    toast.error("Gagal memuat daftar account.");
  } finally {
    modalLoading.value = false;
  }
};

const selectAccount = (item: AccountItem) => {
  rekkode.value = item.kode;
  reknama.value = item.nama;
  showModal.value = false;
  fetchData();
};

// ── Validasi kode manual (blur/enter) ──
const onRekkodeBlur = async () => {
  if (!rekkode.value) return;
  try {
    const res = await bukuBesarService.getAccountByKode(rekkode.value);
    reknama.value = res.data.data.nama;
    fetchData();
  } catch {
    reknama.value = "";
    toast.error("Account tersebut belum terdaftar.");
  }
};

// ── Row coloring: baris "Saldo Awal" ditandai kuning ──
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item?.Keterangan === "Saldo Awal")
    return { style: "background:#fffde7;font-weight:600;color:#f57f17" };
  return {};
};

// ── Summary footer — sticky bawaan BaseBrowse ──
const summaryFormatters = {
  Keterangan: (filteredItems: any[]) => {
    const noSaldoAwal = filteredItems.filter(
      (r) => r.Keterangan !== "Saldo Awal",
    );
    return `TOTAL (${noSaldoAwal.length} transaksi) :`;
  },
  Debet: (filteredItems: any[]) =>
    numFmt(
      Math.round(
        filteredItems
          .filter((r) => r.Keterangan !== "Saldo Awal")
          .reduce((s, r) => s + (Number(r.Debet) || 0), 0),
      ),
    ),
  Kredit: (filteredItems: any[]) =>
    numFmt(
      Math.round(
        filteredItems
          .filter((r) => r.Keterangan !== "Saldo Awal")
          .reduce((s, r) => s + (Number(r.Kredit) || 0), 0),
      ),
    ),
  Saldo: (filteredItems: any[]) =>
    filteredItems.length
      ? numFmt(
          Math.round(Number(filteredItems[filteredItems.length - 1].Saldo)),
        )
      : "0",
};

// ── Export ──
const isExporting = ref(false);

const onExport = async () => {
  const dataToExport =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];

  if (!dataToExport || dataToExport.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }

  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = headers.map((h: any) => ({
      header: h.title,
      key: h.key,
      width: h.width ? Math.max(10, Math.round(parseInt(h.width) / 7)) : 16,
      align: h.align ?? "left",
      numFmt: ["Debet", "Kredit", "Saldo"].includes(h.key)
        ? "#,##0"
        : undefined,
    }));

    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        let val = it[c.key];
        if (c.key === "Tanggal" || c.key === "TglTransfer")
          val = val ? formatTanggal(val) : "";
        row[c.key] = val ?? "";
      });
      return row;
    });

    await exportExcelSingle(
      `Buku_Besar_${rekkode.value}_${startDate.value}_${endDate.value}.xlsx`,
      "Buku Besar",
      columns,
      rows,
      `Laporan Buku Besar — ${rekkode.value} ${reknama.value}  |  Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Buku Besar"
    menu-id="969"
    :icon="IconBook"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-export="true"
    item-value="id"
    :row-props-fn="rowPropsFn"
    :summary-columns="['Debet', 'Kredit', 'Saldo']"
    :summary-formatters="summaryFormatters"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="endDate" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Account</span>
        <input
          v-model="rekkode"
          type="text"
          class="f-kode"
          placeholder="Kode..."
          @blur="onRekkodeBlur"
          @keydown.enter.prevent="onRekkodeBlur"
        />
        <button
          type="button"
          class="f-search-btn"
          title="Cari Account"
          @click="openModal"
        >
          <IconSearch :size="14" />
        </button>
        <input
          :value="reknama"
          readonly
          class="f-nama"
          placeholder="Nama account..."
        />
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
    <template #item.TglTransfer="{ item }">
      {{ formatTanggal((item.raw || item).TglTransfer) }}
    </template>
    <template
      v-for="col in ['Debet', 'Kredit']"
      :key="col"
      v-slot:[`item.${col}`]="{ item }"
    >
      <span class="num-cell">{{ numFmt((item.raw || item)[col]) }}</span>
    </template>
    <template #item.Saldo="{ item }">
      <span
        class="num-cell"
        :class="{ 'saldo-neg': Number((item.raw || item).Saldo) < 0 }"
      >
        {{ numFmt((item.raw || item).Saldo) }}
      </span>
    </template>
  </BaseBrowse>

  <!-- ── Modal Search Account ── -->
  <v-dialog v-model="showModal" max-width="520" scrollable>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #1565c0"
      >
        Pilih Account
      </v-card-title>

      <v-card-text class="pa-3 pt-2" style="max-height: 480px">
        <div class="modal-search-row">
          <input
            v-model="modalSearch"
            type="text"
            class="modal-search-inp"
            placeholder="Cari kode atau nama..."
            @input="onModalSearchInput"
            autofocus
          />
          <span class="modal-total-badge">
            {{ modalFiltered.length.toLocaleString("id-ID") }} data
          </span>
        </div>

        <div v-if="modalLoading" class="modal-loading">
          <v-progress-circular indeterminate color="primary" size="28" />
        </div>
        <div v-else class="modal-list">
          <div
            v-for="item in modalPaged"
            :key="item.kode"
            class="modal-item"
            @click="selectAccount(item)"
          >
            <span class="modal-kode">{{ item.kode }}</span>
            <span class="modal-nama">{{ item.nama }}</span>
          </div>

          <div v-if="modalHasMore" class="modal-load-more">
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              @click="modalPage++"
            >
              Tampilkan lebih banyak
              <span class="modal-load-more-count">
                ({{ modalPaged.length }} / {{ modalFiltered.length }})
              </span>
            </v-btn>
          </div>

          <div v-else-if="modalPaged.length > 0" class="modal-end-info">
            Menampilkan semua
            {{ modalFiltered.length.toLocaleString("id-ID") }} data
          </div>

          <div v-if="!modalPaged.length" class="modal-empty">
            Tidak ada data.
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3" style="border-top: 1px solid #eee">
        <span class="modal-footer-info">
          Total:
          <strong>{{ modalItems.length.toLocaleString("id-ID") }}</strong>
          account
          <template v-if="modalSearch">
            · Hasil filter:
            <strong>{{ modalFiltered.length.toLocaleString("id-ID") }}</strong>
          </template>
        </span>
        <v-spacer />
        <v-btn variant="text" size="small" @click="showModal = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
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
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.f-kode {
  height: 28px;
  width: 100px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  font-family: monospace;
  outline: none;
  background: white;
}
.f-kode:focus {
  border-color: #1565c0;
}
.f-search-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #e3f2fd;
  color: #1565c0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.f-search-btn:hover {
  background: #bbdefb;
}
.f-nama {
  height: 28px;
  width: 220px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: #f5f5f5;
  color: #555;
}

.num-cell {
  font-variant-numeric: tabular-nums;
}
.saldo-neg {
  color: #cc0000;
  font-weight: 700;
}

.modal-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.modal-search-inp {
  flex: 1;
  height: 34px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
.modal-search-inp:focus {
  border-color: #1565c0;
}
.modal-total-badge {
  font-size: 11px;
  font-weight: 600;
  color: #1565c0;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 20px;
  padding: 3px 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.modal-loading {
  display: flex;
  justify-content: center;
  padding: 24px;
}
.modal-list {
  max-height: 360px;
  overflow-y: auto;
}
.modal-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  transition: background 0.1s;
}
.modal-item:hover {
  background: rgba(21, 101, 192, 0.08);
}
.modal-kode {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  min-width: 80px;
}
.modal-nama {
  color: #374151;
}
.modal-empty {
  text-align: center;
  padding: 20px;
  color: #9e9e9e;
  font-size: 12px;
}
.modal-load-more {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
}
.modal-load-more-count {
  font-size: 10px;
  opacity: 0.7;
  margin-left: 4px;
}
.modal-end-info {
  text-align: center;
  font-size: 10px;
  color: #9ca3af;
  padding: 8px 0 2px;
}
.modal-footer-info {
  font-size: 11px;
  color: #6b7280;
}
</style>
