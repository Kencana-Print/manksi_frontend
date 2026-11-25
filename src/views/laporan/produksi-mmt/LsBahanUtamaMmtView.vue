<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import { useBrowse } from "@/composables/useBrowse";
import { formatTanggal } from "@/utils/dateFormat";
import { IconPrinter, IconLayersSubtract, IconSearch } from "@tabler/icons-vue";
import GudangLookupView from "@/modal/GudangLookupView.vue";
import {
  lsBahanUtamaService,
  type LsBahanUtamaRow,
  type GudangItem,
} from "@/services/laporan/mmt/lsBahanUtamaService";

const toast = useToast();

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  gdgKode: "WH-16",
  gdgNama: "Gudang Utama",
  jenis: "SEMUA",
  status: "SEMUA",
});

const gudangList = ref<GudangItem[]>([]);
const showGudangLookup = ref(false);
const semuaJenis = ref<string[]>([]);
const semuaStatus = ref<string[]>([]);
const periodeTampil = ref({ awal: "", akhir: "" });

let lastFetchKey = "";
let cachedRaw: any[] = [];

const loadGudang = async () => {
  try {
    const res = await lsBahanUtamaService.getGudangList();
    const raw = Array.isArray(res.data)
      ? res.data
      : Array.isArray((res.data as any)?.data)
        ? (res.data as any).data
        : Array.isArray((res.data as any)?.rows)
          ? (res.data as any).rows
          : [];

    const mapped: GudangItem[] = raw.map((g: any) => ({
      kode: String(g.kode ?? g.Kode ?? g.gdg_kode ?? g.gdgKode ?? "").trim(),
      nama: String(g.nama ?? g.Nama ?? g.gdg_nama ?? g.gdgNama ?? "").trim(),
      aktif: g.aktif ?? g.Aktif ?? g.status ?? g.Status ?? g.is_aktif ?? g.isActive,
    }));

    // Ambil gudang aktif saja
    const active = mapped.filter((g: any) => {
      if (!g.kode) return false;
      if (g.aktif !== undefined && g.aktif !== null && g.aktif !== "") {
        const a = String(g.aktif).toUpperCase();
        return a === "1" || a === "TRUE" || a === "AKTIF" || a === "Y";
      }
      return true;
    });

    gudangList.value = active.length > 0 ? active : mapped;

    // Pastikan gudang terpilih valid
    const adaGudang = gudangList.value.find(
      (g) => g.kode === filterState.value.gdgKode,
    );
    if (!adaGudang) {
      const wh16 = gudangList.value.find((g) => g.kode === "WH-16");
      if (wh16) {
        filterState.value.gdgKode = wh16.kode;
        filterState.value.gdgNama = wh16.nama;
      } else if (gudangList.value.length > 0) {
        filterState.value.gdgKode = gudangList.value[0].kode;
        filterState.value.gdgNama = gudangList.value[0].nama;
      }
    } else {
      filterState.value.gdgNama = adaGudang.nama;
    }
  } catch (err) {
    console.error("Gagal mengambil daftar gudang:", err);
  }
};

const onSelectGudang = (g: { Kode: string; Nama: string }) => {
  filterState.value.gdgKode = g.Kode;
  filterState.value.gdgNama = g.Nama;
  lastFetchKey = ""; // Reset cache saat gudang berganti
  fetchData();
};

const onTanggalChange = () => {
  lastFetchKey = ""; // Reset cache saat tanggal berganti
  fetchData();
};

const muatData = async (): Promise<LsBahanUtamaRow[]> => {
  const { dtAwal, dtAkhir, gdgKode, jenis, status } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const fetchKey = `${dtAwal}_${dtAkhir}_${gdgKode || "WH-16"}`;
  let raw: any[] = [];

  if (fetchKey === lastFetchKey && cachedRaw.length > 0) {
    raw = cachedRaw;
  } else {
    const res = await lsBahanUtamaService.getReport({
      startDate: dtAwal,
      endDate: dtAkhir,
      gdgKode: gdgKode || "WH-16",
    });

    raw = Array.isArray(res.data)
      ? res.data
      : Array.isArray((res.data as any)?.data)
        ? (res.data as any).data
        : Array.isArray((res.data as any)?.rows)
          ? (res.data as any).rows
          : [];

    cachedRaw = raw;
    lastFetchKey = fetchKey;
  }

  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };

  // Ambil semua opsi jenis & status unik dari data mentah sebelum filter
  const jSet = new Set<string>();
  const sSet = new Set<string>();
  for (const r of raw) {
    const j = String(
      r.jb_nama ?? r.jenis ?? r.Jenis ?? r.brg_jenis ?? r.kategori ?? "",
    ).trim();
    if (j) jSet.add(j);
    const s = String(r.status_barang ?? r.status ?? r.Status ?? "").trim();
    if (s) sSet.add(s);
  }
  semuaJenis.value = Array.from(jSet).sort();
  semuaStatus.value = Array.from(sSet).sort();

  // Reset status jika nilai stale (mis. AKTIF dari sessionStorage lama) tidak ada di opsi
  if (
    filterState.value.status !== "SEMUA" &&
    !semuaStatus.value.some(
      (s) => s.toUpperCase() === filterState.value.status.toUpperCase(),
    )
  ) {
    filterState.value.status = "SEMUA";
  }

  // Normalisasi data
  let data = raw.map((r: any) => {
    const statusBrg = String(
      r.status_barang ?? r.status ?? r.Status ?? "",
    ).trim();

    const jb = String(
      r.jb_nama ?? r.jenis ?? r.Jenis ?? r.brg_jenis ?? r.kategori ?? "",
    ).trim();

    return {
      ...r,
      kode: String(r.kode ?? r.Kode ?? r.brg_kode ?? ""),
      Nama: String(r.Nama ?? r.nama ?? r.brg_nama ?? ""),
      jb_nama: jb,
      status_barang: statusBrg,
      type_barang: String(
        r.type_barang ?? r.type ?? r.Type ?? r.tipe ?? "",
      ).trim(),
      Panjang: Number(r.Panjang || 0),
      Lebar: Number(r.Lebar || 0),
      m2: Number(r.m2 || 0),
      stok_awal_q: Number(r.stok_awal_q || 0),
      stok_awal_m: Number(r.stok_awal_m || 0),
      stok_awal_nominal: Number(r.stok_awal_nominal || 0),
      terima_q: Number(r.terima_q || 0),
      terima_m: Number(r.terima_m || 0),
      terima_nominal: Number(r.terima_nominal || 0),
      keluar_q: Number(r.keluar_q || 0),
      keluar_m: Number(r.keluar_m || 0),
      keluar_nominal: Number(r.keluar_nominal || 0),
      retur_q: Number(r.retur_q || 0),
      retur_m: Number(r.retur_m || 0),
      retur_nominal: Number(r.retur_nominal || 0),
      stok_akhir_q: Number(r.stok_akhir_q || 0),
      stok_akhir_m: Number(r.stok_akhir_m || 0),
      stok_akhir_nominal: Number(r.stok_akhir_nominal || 0),
    };
  });

  // Filter jenis
  if (jenis && jenis !== "SEMUA") {
    data = data.filter(
      (d) => d.jb_nama.toUpperCase() === jenis.toUpperCase(),
    );
  }

  // Filter status
  if (status && status !== "SEMUA") {
    data = data.filter(
      (d) => d.status_barang.toUpperCase() === status.toUpperCase(),
    );
  }

  return data;
};

const { items, isLoading, canExport, fetchData } = useBrowse<LsBahanUtamaRow>({
  menuId: "5560",
  fetchApi: muatData,
  immediate: false,
});

const onRefresh = () => {
  lastFetchKey = "";
  fetchData();
};

onMounted(async () => {
  await loadGudang();
  fetchData();
});

const kolom: LaporanKolom[] = [
  { key: "kode", title: "Kode", width: 110, sticky: "left" },
  { key: "Nama", title: "Nama Bahan", width: 220, sticky: "left" },
  { key: "jb_nama", title: "Jenis", width: 110 },
  { key: "type_barang", title: "Type", width: 90 },
  { key: "status_barang", title: "Status", width: 105 },

  // Spesifikasi
  {
    key: "Panjang",
    title: "Panjang",
    group: "Spesifikasi",
    width: 75,
    tipe: "number",
  },
  {
    key: "Lebar",
    title: "Lebar",
    group: "Spesifikasi",
    width: 75,
    tipe: "number",
  },
  {
    key: "m2",
    title: "M2/Roll",
    group: "Spesifikasi",
    width: 80,
    tipe: "number",
  },

  // Stok Awal
  {
    key: "stok_awal_q",
    title: "Roll",
    group: "Stok Awal",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "stok_awal_m",
    title: "M2",
    group: "Stok Awal",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "stok_awal_nominal",
    title: "Nominal (Rp)",
    group: "Stok Awal",
    width: 115,
    tipe: "currency",
    total: true,
  },

  // Terima
  {
    key: "terima_q",
    title: "Roll",
    group: "Terima",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "terima_m",
    title: "M2",
    group: "Terima",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "terima_nominal",
    title: "Nominal (Rp)",
    group: "Terima",
    width: 115,
    tipe: "currency",
    total: true,
  },

  // Keluar
  {
    key: "keluar_q",
    title: "Roll",
    group: "Keluar",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "keluar_m",
    title: "M2",
    group: "Keluar",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "keluar_nominal",
    title: "Nominal (Rp)",
    group: "Keluar",
    width: 115,
    tipe: "currency",
    total: true,
  },

  // Retur
  {
    key: "retur_q",
    title: "Roll",
    group: "Retur",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "retur_m",
    title: "M2",
    group: "Retur",
    width: 85,
    tipe: "number",
    total: true,
  },

  // Stok Akhir
  {
    key: "stok_akhir_q",
    title: "Roll",
    group: "Stok Akhir",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "stok_akhir_m",
    title: "M2",
    group: "Stok Akhir",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "stok_akhir_nominal",
    title: "Nominal (Rp)",
    group: "Stok Akhir",
    width: 115,
    tipe: "currency",
    total: true,
  },
];

const tableRef = ref<LaporanTableApi<LsBahanUtamaRow> | null>(null);

const bukaPrint = () => {
  const { dtAwal, dtAkhir, gdgKode, jenis, status } = filterState.value;
  const p = new URLSearchParams({
    startDate: dtAwal,
    endDate: dtAkhir,
    gdgKode: gdgKode || "WH-16",
    jenis: jenis || "SEMUA",
    status: status || "SEMUA",
  });
  window.open(
    `/laporan/produksi-mmt/ls-bahan-utama/print?${p.toString()}`,
    "_blank",
  );
};

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `LS Bahan Utama Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return "LS Bahan Utama";
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `LS_Bahan_Utama_${awal}_sd_${akhir}`,
    sheetName: "LS_Bahan_Utama",
    judul: "LAPORAN STOK BAHAN UTAMA (MMT)",
    periode:
      awal && akhir
        ? `Periode: ${formatTanggal(awal)} s.d ${formatTanggal(akhir)}`
        : undefined,
  });
};
</script>

<template>
  <LaporanTable
    ref="tableRef"
    v-model:filter-state="filterState"
    :title="judulLaporan"
    menu-id="5560"
    storage-id="mmt-ls-bahan-utama"
    :icon="IconLayersSubtract"
    :columns="kolom"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    row-key="kode"
    search-placeholder="Cari kode, nama bahan, jenis..."
    satuan="item"
    @refresh="onRefresh"
    @export="onExport"
  >
    <template #extra-actions>
      <button
        type="button"
        class="lap-btn lap-btn-print"
        title="Buka halaman cetak laporan"
        @click="bukaPrint"
      >
        <IconPrinter :size="14" :stroke-width="1.8" />
        <span>Cetak</span>
      </button>
    </template>

    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input
          v-model="filterState.dtAwal"
          type="date"
          class="f-inp"
          @change="onTanggalChange"
        />
        <span class="f-sep">s/d</span>
        <input
          v-model="filterState.dtAkhir"
          type="date"
          class="f-inp"
          @change="onTanggalChange"
        />
      </div>

      <div class="f-group">
        <span class="f-label">Gudang</span>
        <div class="f-lookup" @click="showGudangLookup = true">
          <input
            :value="filterState.gdgNama ? `${filterState.gdgKode} - ${filterState.gdgNama}` : filterState.gdgKode"
            type="text"
            readonly
            placeholder="Pilih gudang (F1)..."
            class="f-inp f-lookup-inp"
            @keydown.f1.prevent="showGudangLookup = true"
          />
          <button
            type="button"
            class="f-lookup-btn"
            title="Cari Gudang (F1)"
            @click.stop="showGudangLookup = true"
          >
            <IconSearch :size="13" :stroke-width="2" />
          </button>
        </div>
      </div>

      <div class="f-group">
        <span class="f-label">Jenis</span>
        <select
          v-model="filterState.jenis"
          class="f-inp f-select"
          @change="fetchData"
        >
          <option value="SEMUA">SEMUA</option>
          <option v-for="j in semuaJenis" :key="j" :value="j">{{ j }}</option>
        </select>
      </div>

      <div class="f-group">
        <span class="f-label">Status</span>
        <select
          v-model="filterState.status"
          class="f-inp f-select"
          @change="fetchData"
        >
          <option value="SEMUA">SEMUA</option>
          <option v-for="s in semuaStatus" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <GudangLookupView
        :is-visible="showGudangLookup"
        mode="all"
        @close="showGudangLookup = false"
        @select="onSelectGudang"
      />
    </template>
  </LaporanTable>
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
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
.f-select {
  cursor: pointer;
  min-width: 120px;
}
.f-lookup {
  display: inline-flex;
  align-items: center;
}
.f-lookup-inp {
  cursor: pointer;
  min-width: 185px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}
.f-lookup-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  width: 28px;
  border: 1px solid #ccc;
  border-radius: 0 4px 4px 0;
  background: #f5f5f5;
  color: #555;
  cursor: pointer;
}
.f-lookup-btn:hover {
  background: #e8f0fe;
  color: #1976d2;
}
.lap-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #ccc;
  background: #fff;
  color: #333;
}
.lap-btn-print:hover {
  background: #f0f7ff;
  border-color: #1976d2;
  color: #1976d2;
}
</style>
