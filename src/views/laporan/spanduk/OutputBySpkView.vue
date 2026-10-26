<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import * as svc from "@/services/laporan/spanduk/outputBySpkService";
import type { OutputBySpkRow } from "@/services/laporan/spanduk/outputBySpkService";
import { exportExcel } from "@/utils/excelExport";
import type { ExcelColumn } from "@/utils/excelExport";

const LOCALE = "en-US";

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const hariIni = new Date();
const tglAwal = ref(
  ymd(new Date(hariIni.getFullYear(), hariIni.getMonth(), 1)),
);
const tglAkhir = ref(ymd(hariIni));

const rows = ref<OutputBySpkRow[]>([]);
const loading = ref(false);
const error = ref("");
const cari = ref("");
const status = ref<"" | "Open" | "Closed">("");

const fmtTgl = (v: string | null): string => {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};
const bulat = (v: number): string =>
  Number(v || 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });
const desimal = (v: number): string =>
  Number(v || 0).toLocaleString(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const tampil = computed<OutputBySpkRow[]>(() => {
  const q = cari.value.trim().toLowerCase();
  return rows.value.filter((r) => {
    if (status.value && r.Status !== status.value) return false;
    if (!q) return true;
    return [r.Nomor, r.Memo, r.Nama, r.Sales, r.Jenis_Order, r.Kain]
      .map((x) => (x ?? "").toLowerCase())
      .some((x) => x.includes(q));
  });
});

type KolomAngka =
  | "Jml_Order"
  | "Jml_Jadi"
  | "Jml_Kirim"
  | "Jml_Cetak"
  | "M_Cetak"
  | "Jml_Jahit"
  | "M_Jahit"
  | "Jml_Lipat"
  | "M_Lipat"
  | "Jml_Koli"
  | "M_Koli"
  | "MT01"
  | "MT01_M"
  | "MT02"
  | "MT02_M"
  | "MT03"
  | "MT03_M"
  | "MT04"
  | "MT04_M"
  | "MT05"
  | "MT05_M"
  | "MI"
  | "MI_M";

const total = (k: KolomAngka): number =>
  tampil.value.reduce((a, r) => a + (Number(r[k]) || 0), 0);

// Kolom MMT hanya ditampilkan bila ada isinya (SPK Spanduk biasanya 0)
const adaMmt = computed(() =>
  rows.value.some((r) => r.MT01 + r.MT02 + r.MT03 + r.MT04 + r.MT05 + r.MI > 0),
);

const MMT = [
  { k: "MT01", m: "MT01_M", t: "MT01" },
  { k: "MT02", m: "MT02_M", t: "MT02" },
  { k: "MT03", m: "MT03_M", t: "MT03" },
  { k: "MT04", m: "MT04_M", t: "MT04" },
  { k: "MT05", m: "MT05_M", t: "MT05" },
  { k: "MI", m: "MI_M", t: "MI" },
] as const;

const refresh = async () => {
  loading.value = true;
  error.value = "";
  try {
    rows.value = await svc.getOutputBySpk(tglAwal.value, tglAkhir.value);
  } catch (e) {
    rows.value = [];
    error.value = svc.pesanError(e, "Gagal memuat laporan.");
  } finally {
    loading.value = false;
  }
};

interface ExportRow {
  Memo: string;
  Nomor: string;
  Tanggal: string;
  Deadline: string;
  Nama: string;
  Sales: string;
  Jenis_Order: string;
  Status: string;
  Panjang: number | string;
  Lebar: number | string;
  Kain: string;
  Finishing: string;
  Jml_Order: number;
  Jml_Cetak: number;
  Jml_Jahit: number;
  Jml_Lipat: number;
  Jml_Koli: number;
  Jml_Jadi: number;
  Jml_Kirim: number;
  M_Cetak: number;
  M_Jahit: number;
  M_Lipat: number;
  M_Koli: number;
}

const exportExcelLaporan = async () => {
  const pcs = (header: string, key: string): ExcelColumn => ({
    header,
    key,
    width: 12,
    numFmt: "#,##0",
    align: "right",
  });
  const mtr = (header: string, key: string): ExcelColumn => ({
    header,
    key,
    width: 12,
    numFmt: "#,##0.00",
    align: "right",
  });

  const kolom: ExcelColumn[] = [
    { header: "Memo SPK", key: "Memo", width: 18 },
    { header: "Nomor SPK", key: "Nomor", width: 20 },
    { header: "Tgl SPK", key: "Tanggal", width: 12 },
    { header: "Deadline", key: "Deadline", width: 12 },
    { header: "Nama Order", key: "Nama", width: 48 },
    { header: "Sales", key: "Sales", width: 16 },
    { header: "Jenis Order", key: "Jenis_Order", width: 18 },
    { header: "Status Kirim", key: "Status", width: 12 },
    { header: "Panjang", key: "Panjang", width: 10, align: "right" },
    { header: "Lebar", key: "Lebar", width: 8, align: "right" },
    { header: "Bahan", key: "Kain", width: 16 },
    { header: "Finishing", key: "Finishing", width: 26 },
    pcs("Jml Order (Pcs)", "Jml_Order"),
    pcs("Jml Cetak (Pcs)", "Jml_Cetak"),
    pcs("Jml Jahit (Pcs)", "Jml_Jahit"),
    pcs("Jml Lipat (Pcs)", "Jml_Lipat"),
    pcs("Jml Quiring (Pcs)", "Jml_Koli"),
    pcs("Jml Jadi (Pcs)", "Jml_Jadi"),
    pcs("Jml Kirim (Pcs)", "Jml_Kirim"),
    mtr("Cetak (Meter)", "M_Cetak"),
    mtr("Jahit (Meter)", "M_Jahit"),
    mtr("Lipat (Meter)", "M_Lipat"),
    mtr("Quiring (Meter)", "M_Koli"),
  ];

  const data: ExportRow[] = tampil.value.map((r) => ({
    Memo: r.Memo ?? "",
    Nomor: r.Nomor,
    Tanggal: fmtTgl(r.Tanggal),
    Deadline: fmtTgl(r.Deadline),
    Nama: r.Nama ?? "",
    Sales: r.Sales ?? "",
    Jenis_Order: r.Jenis_Order ?? "",
    Status: r.Status,
    Panjang: r.Panjang,
    Lebar: r.Lebar,
    Kain: r.Kain ?? "",
    Finishing: r.Finishing ?? "",
    Jml_Order: r.Jml_Order,
    Jml_Cetak: r.Jml_Cetak,
    Jml_Jahit: r.Jml_Jahit,
    Jml_Lipat: r.Jml_Lipat,
    Jml_Koli: r.Jml_Koli,
    Jml_Jadi: r.Jml_Jadi,
    Jml_Kirim: r.Jml_Kirim,
    M_Cetak: r.M_Cetak,
    M_Jahit: r.M_Jahit,
    M_Lipat: r.M_Lipat,
    M_Koli: r.M_Koli,
  }));

  data.push({
    Memo: "",
    Nomor: "TOTAL",
    Tanggal: "",
    Deadline: "",
    Nama: `${tampil.value.length} SPK`,
    Sales: "",
    Jenis_Order: "",
    Status: "",
    Panjang: "",
    Lebar: "",
    Kain: "",
    Finishing: "",
    Jml_Order: total("Jml_Order"),
    Jml_Cetak: total("Jml_Cetak"),
    Jml_Jahit: total("Jml_Jahit"),
    Jml_Lipat: total("Jml_Lipat"),
    Jml_Koli: total("Jml_Koli"),
    Jml_Jadi: total("Jml_Jadi"),
    Jml_Kirim: total("Jml_Kirim"),
    M_Cetak: total("M_Cetak"),
    M_Jahit: total("M_Jahit"),
    M_Lipat: total("M_Lipat"),
    M_Koli: total("M_Koli"),
  });

  await exportExcel(`Output_by_SPK_${tglAwal.value}_${tglAkhir.value}.xlsx`, [
    {
      sheetName: "Output by SPK",
      title: `Laporan Output by SPK  ${fmtTgl(tglAwal.value)} s/d ${fmtTgl(tglAkhir.value)}`,
      columns: kolom,
      rows: data,
      rowStyleFn: (row: ExportRow) =>
        row.Nomor === "TOTAL" ? { bold: true, fillColor: "E0E0E0" } : null,
    },
  ]);
};

onMounted(refresh);
</script>

<template>
  <div class="lap">
    <div class="bar">
      <label>Periode</label>
      <input v-model="tglAwal" type="date" class="inp" />
      <label>s/d</label>
      <input v-model="tglAkhir" type="date" class="inp" />
      <v-btn size="small" color="primary" :loading="loading" @click="refresh">
        Refresh
      </v-btn>
      <select v-model="status" class="inp">
        <option value="">Semua status</option>
        <option value="Open">Open</option>
        <option value="Closed">Closed</option>
      </select>
      <input
        v-model="cari"
        type="text"
        class="inp cari"
        placeholder="Cari nomor, memo, nama order, sales..."
      />
      <span class="sp" />
      <v-btn
        size="small"
        variant="outlined"
        :disabled="tampil.length === 0"
        @click="exportExcelLaporan"
      >
        Export
      </v-btn>
    </div>

    <div v-if="error" class="err">{{ error }}</div>

    <div class="wrap">
      <table class="tbl">
        <thead>
          <tr class="h1">
            <th class="w-memo">Memo SPK</th>
            <th class="w-spk">Nomor SPK</th>
            <th class="w-tgl">Tgl SPK</th>
            <th class="w-tgl">Deadline</th>
            <th class="w-nama">Nama Order</th>
            <th class="w-sales">Sales</th>
            <th class="w-jo">Jenis Order</th>
            <th class="w-st">Status Kirim</th>
            <th class="w-n">Panjang</th>
            <th class="w-n">Lebar</th>
            <th class="w-bhn">Bahan</th>
            <th class="w-fin">Finishing</th>
            <th class="w-n">Jml Order</th>
            <th class="w-n">Jml Cetak</th>
            <th class="w-n">Jml Jahit</th>
            <th class="w-n">Jml Lipat</th>
            <th class="w-n">Jml Quiring</th>
            <th class="w-n">Jml Jadi</th>
            <th class="w-n">Jml Kirim</th>
            <th class="w-n">Cetak</th>
            <th class="w-n">Jahit</th>
            <th class="w-n">Lipat</th>
            <th class="w-n">Quiring</th>
            <template v-if="adaMmt">
              <th v-for="x in MMT" :key="x.k + 'p'" class="w-n">
                {{ x.t }}
              </th>
              <th v-for="x in MMT" :key="x.k + 'm'" class="w-n">
                {{ x.t }}
              </th>
            </template>
          </tr>
          <tr class="h2">
            <th v-for="n in 12" :key="'a' + n" />
            <th v-for="n in 7" :key="'p' + n">Pcs</th>
            <th v-for="n in 4" :key="'m' + n">Meter</th>
            <template v-if="adaMmt">
              <th v-for="n in 6" :key="'mp' + n">Pcs</th>
              <th v-for="n in 6" :key="'mm' + n">Meter</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && tampil.length === 0">
            <td :colspan="adaMmt ? 35 : 23" class="kosong">
              Tidak ada data pada periode ini.
            </td>
          </tr>
          <tr v-for="r in tampil" :key="r.Nomor">
            <td>{{ r.Memo }}</td>
            <td>{{ r.Nomor }}</td>
            <td>{{ fmtTgl(r.Tanggal) }}</td>
            <td>{{ fmtTgl(r.Deadline) }}</td>
            <td class="nm" :title="r.Nama ?? ''">{{ r.Nama }}</td>
            <td>{{ r.Sales }}</td>
            <td>{{ r.Jenis_Order }}</td>
            <td :class="r.Status === 'Open' ? 'open' : ''">{{ r.Status }}</td>
            <td class="tr">{{ desimal(r.Panjang) }}</td>
            <td class="tr">{{ desimal(r.Lebar) }}</td>
            <td>{{ r.Kain }}</td>
            <td>{{ r.Finishing }}</td>
            <td class="tr">{{ bulat(r.Jml_Order) }}</td>
            <td class="tr">{{ bulat(r.Jml_Cetak) }}</td>
            <td class="tr">{{ bulat(r.Jml_Jahit) }}</td>
            <td class="tr">{{ bulat(r.Jml_Lipat) }}</td>
            <td class="tr">{{ bulat(r.Jml_Koli) }}</td>
            <td class="tr">{{ bulat(r.Jml_Jadi) }}</td>
            <td class="tr">{{ bulat(r.Jml_Kirim) }}</td>
            <td class="tr">{{ desimal(r.M_Cetak) }}</td>
            <td class="tr">{{ desimal(r.M_Jahit) }}</td>
            <td class="tr">{{ desimal(r.M_Lipat) }}</td>
            <td class="tr">{{ desimal(r.M_Koli) }}</td>
            <template v-if="adaMmt">
              <td v-for="x in MMT" :key="x.k + 'p'" class="tr">
                {{ bulat(r[x.k]) }}
              </td>
              <td v-for="x in MMT" :key="x.k + 'm'" class="tr">
                {{ desimal(r[x.m]) }}
              </td>
            </template>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="12" class="tot">TOTAL ({{ tampil.length }} SPK)</td>
            <td class="tr">{{ bulat(total("Jml_Order")) }}</td>
            <td class="tr">{{ bulat(total("Jml_Cetak")) }}</td>
            <td class="tr">{{ bulat(total("Jml_Jahit")) }}</td>
            <td class="tr">{{ bulat(total("Jml_Lipat")) }}</td>
            <td class="tr">{{ bulat(total("Jml_Koli")) }}</td>
            <td class="tr">{{ bulat(total("Jml_Jadi")) }}</td>
            <td class="tr">{{ bulat(total("Jml_Kirim")) }}</td>
            <td class="tr">{{ desimal(total("M_Cetak")) }}</td>
            <td class="tr">{{ desimal(total("M_Jahit")) }}</td>
            <td class="tr">{{ desimal(total("M_Lipat")) }}</td>
            <td class="tr">{{ desimal(total("M_Koli")) }}</td>
            <template v-if="adaMmt">
              <td v-for="x in MMT" :key="x.k + 'p'" class="tr">
                {{ bulat(total(x.k)) }}
              </td>
              <td v-for="x in MMT" :key="x.k + 'm'" class="tr">
                {{ desimal(total(x.m)) }}
              </td>
            </template>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style scoped>
.lap {
  font-size: 11px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 110px);
  gap: 6px;
}
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.sp {
  flex: 1;
}
.inp {
  font-size: 11px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #b0b0b0;
  border-radius: 3px;
  background: #fff;
  color: #000;
}
.cari {
  width: 260px;
}
.err {
  color: #b71c1c;
  font-size: 11px;
}
.wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #c8c8c8;
  background: #fff;
}
.tbl {
  border-collapse: collapse;
  font-size: 11px;
  min-width: 100%;
  color: #000;
}
.tbl th,
.tbl td {
  border: 1px solid #d4d4d4;
  padding: 2px 5px;
  white-space: nowrap;
}
.tbl thead th {
  position: sticky;
  background: #f6c8a0;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  z-index: 2;
}
.h1 th {
  top: 0;
  height: 24px;
}
.h2 th {
  top: 24px;
  height: 22px;
}
.tbl tbody tr:hover {
  background: #e8f1fb;
}
.tr {
  text-align: right;
}
.nm {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.open {
  color: #b26a00;
  font-weight: 600;
}
.kosong {
  text-align: center;
  padding: 14px;
  color: #666;
}
.tbl tfoot td {
  position: sticky;
  bottom: 0;
  background: #f3f3f3;
  font-weight: 700;
  z-index: 2;
}
.tot {
  text-align: left;
}
</style>
