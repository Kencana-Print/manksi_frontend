<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import * as tmService from "@/services/penjualan/terimaMutasiDariProduksiService";
import type {
  TerimaMutasiRow,
  TerimaMutasiDetailRow,
} from "@/services/penjualan/terimaMutasiDariProduksiService";
import type { ExcelColumn } from "@/utils/excelExport";
import { IconClipboardCheck } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();
const MAKS_KETERANGAN = 200;

type RowTampil = TerimaMutasiRow & { Selisih: number | null };

const round2 = (n: number) => Math.round(n * 100) / 100;

// --- FILTER: default awal bulan s.d. hari ini ---
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const d = new Date();
const hariIni = toLocalDateStr(d);
const filterState = ref({
  dtAwal: toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1)),
  dtAkhir: hariIni,
});

// --- DETAIL: dimuat sekali per periode, dikelompokkan per nomor mutasi ---
const detailMap = ref<Record<string, TerimaMutasiDetailRow[]>>({});
const expandedRows = ref<unknown[]>([]);

const muatData = async (): Promise<RowTampil[]> => {
  const { dtAwal, dtAkhir } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const [master, detail] = await Promise.all([
    tmService.getBrowse(dtAwal, dtAkhir),
    tmService.getDetail(dtAwal, dtAkhir),
  ]);

  const peta: Record<string, TerimaMutasiDetailRow[]> = {};
  for (const row of detail) {
    (peta[row.Nomor_Mutasi] ??= []).push(row);
  }
  detailMap.value = peta;
  expandedRows.value = [];

  return master.map((r) => ({
    ...r,
    Selisih:
      r.Total_Terima === null
        ? null
        : round2(Number(r.Total_Terima) - Number(r.Total_Kirim)),
  }));
};

const {
  items,
  isLoading,
  selected,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse<RowTampil>({
  menuId: "191",
  fetchApi: muatData,
  immediate: false,
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const headers = [
  { title: "Nomor Terima", key: "Nomor_Terima", width: "160px" },
  {
    title: "Tgl Terima",
    key: "Tanggal_Terima",
    width: "100px",
    align: "center",
  },
  { title: "Nomor Mutasi", key: "Nomor_Mutasi", width: "160px" },
  {
    title: "Tgl Mutasi",
    key: "Tanggal_Mutasi",
    width: "100px",
    align: "center",
  },
  { title: "Lokasi", key: "Lokasi", width: "70px", align: "center" },
  { title: "MO", key: "MO", width: "200px" },
  { title: "Jml MAP", key: "Jumlah_MAP", width: "80px", align: "end" },
  { title: "Total Kirim", key: "Total_Kirim", width: "95px", align: "end" },
  { title: "Total Terima", key: "Total_Terima", width: "95px", align: "end" },
  { title: "Selisih", key: "Selisih", width: "80px", align: "end" },
  { title: "Keterangan", key: "Keterangan", width: "240px" },
];

const kolomExcel: ExcelColumn[] = [
  { header: "Nomor Terima", key: "Nomor_Terima", width: 20 },
  { header: "Tgl Terima", key: "Tanggal_Terima", width: 14, align: "center" },
  { header: "Nomor Mutasi", key: "Nomor_Mutasi", width: 20 },
  { header: "Tgl Mutasi", key: "Tanggal_Mutasi", width: 14, align: "center" },
  { header: "Lokasi", key: "Lokasi", width: 10, align: "center" },
  { header: "MO", key: "MO", width: 28 },
  { header: "Jml MAP", key: "Jumlah_MAP", width: 10, align: "right" },
  {
    header: "Total Kirim",
    key: "Total_Kirim",
    width: 12,
    align: "right",
    numFmt: "#,##0.##",
  },
  {
    header: "Total Terima",
    key: "Total_Terima",
    width: 12,
    align: "right",
    numFmt: "#,##0.##",
  },
  {
    header: "Selisih",
    key: "Selisih",
    width: 10,
    align: "right",
    numFmt: "#,##0.##",
  },
  { header: "Keterangan", key: "Keterangan", width: 40 },
];

const dataTampil = (): RowTampil[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

// Baris belum diterima berwarna merah (inline: BaseBrowse punya root ganda,
// sehingga style scoped milik view ini tidak menjangkau baris tabel)
const rowProps = (data: { item: unknown }) => {
  const it = data.item as { raw?: RowTampil } & Partial<RowTampil>;
  const row = it.raw ?? it;
  return row.Status === "BELUM"
    ? { style: "background-color: #ffcdd2; color: #b71c1c; font-weight: 600;" }
    : {};
};

const numFmt = (v: number | null) =>
  v === null || v === undefined
    ? "-"
    : Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });

// ── Dialog terima ──
interface BarisTerima {
  nomor: string;
  nama: string;
  ukuran: string;
  mo: string;
  qtyKirim: number;
  qtyTerima: number | "";
}

const dlg = ref(false);
const dlgSaving = ref(false);
const form = ref({
  mutasi: "",
  tglMutasi: "",
  lokasi: "",
  tanggal: hariIni,
  keterangan: "",
  maps: [] as BarisTerima[],
});

const bukaDialog = (row: RowTampil) => {
  const detail = detailMap.value[row.Nomor_Mutasi] ?? [];
  if (detail.length === 0) {
    toast.error("Detail MAP tidak ditemukan. Muat ulang browse.");
    return;
  }
  form.value = {
    mutasi: row.Nomor_Mutasi,
    tglMutasi: row.Tanggal_Mutasi,
    lokasi: row.Lokasi,
    tanggal: hariIni,
    keterangan: "",
    maps: detail.map((m) => ({
      nomor: m.Nomor_MAP,
      nama: m.Nama_MAP,
      ukuran: m.Ukuran,
      mo: m.MO,
      qtyKirim: Number(m.Qty_Kirim) || 0,
      qtyTerima: "",
    })),
  };
  dlg.value = true;
};

const samakanDenganKirim = () => {
  for (const m of form.value.maps) m.qtyTerima = m.qtyKirim;
};

const selisihBaris = (m: BarisTerima): number | null =>
  m.qtyTerima === "" ? null : round2(Number(m.qtyTerima) - m.qtyKirim);

const simpanTerima = async () => {
  const { mutasi, tanggal, tglMutasi, keterangan, maps } = form.value;
  if (!tanggal) {
    toast.warning("Tanggal terima harus diisi.");
    return;
  }
  if (tanggal > hariIni) {
    toast.warning("Tanggal terima tidak boleh melebihi hari ini.");
    return;
  }
  if (tanggal < tglMutasi) {
    toast.warning("Tanggal terima tidak boleh lebih awal dari tanggal mutasi.");
    return;
  }
  if (keterangan.length > MAKS_KETERANGAN) {
    toast.warning(`Keterangan maksimal ${MAKS_KETERANGAN} karakter.`);
    return;
  }
  for (const m of maps) {
    if (m.qtyTerima === "") {
      toast.warning(`Isi jumlah terima MAP ${m.nomor}.`);
      return;
    }
    const v = Number(m.qtyTerima);
    if (!Number.isFinite(v) || v < 0) {
      toast.warning(`Jumlah terima MAP ${m.nomor} tidak valid.`);
      return;
    }
    if (round2(v) !== v) {
      toast.warning(`Jumlah terima MAP ${m.nomor} maksimal 2 desimal.`);
      return;
    }
  }
  if (!maps.some((m) => Number(m.qtyTerima) > 0)) {
    toast.warning(
      "Minimal satu MAP harus memiliki jumlah terima lebih dari 0.",
    );
    return;
  }

  dlgSaving.value = true;
  try {
    const res = await tmService.terima({
      mutasi,
      tanggal,
      keterangan: keterangan.trim(),
      maps: maps.map((m) => ({
        nomor: m.nomor,
        qtyTerima: Number(m.qtyTerima),
      })),
    });
    toast.success(`Terima Mutasi ${res.data?.nomor ?? ""} berhasil disimpan.`);
    dlg.value = false;
    selected.value = [];
    await fetchData();
  } catch (e) {
    toast.error(tmService.pesanError(e, "Gagal menyimpan."));
  } finally {
    dlgSaving.value = false;
  }
};

// ── Aksi toolbar ──
// Tombol "Terima" (aksi Ubah)
const onEdit = (item: RowTampil) => {
  if (item.Status !== "BELUM") {
    toast.warning(`Mutasi ini sudah diterima (${item.Nomor_Terima}).`);
    return;
  }
  bukaDialog(item);
};

// Dipanggil BaseBrowse sebelum dialog konfirmasi hapus dibuka
const sebelumBatal = (item: RowTampil): boolean => {
  if (item.Status === "SUDAH") return true;
  toast.warning("Mutasi ini belum diterima, tidak ada yang dibatalkan.");
  return false;
};

const onDelete = async (item: RowTampil) => {
  try {
    await tmService.remove(item.Nomor_Terima);
    toast.success(`Terima Mutasi ${item.Nomor_Terima} berhasil dibatalkan.`);
    selected.value = [];
    await fetchData();
  } catch (e) {
    toast.error(tmService.pesanError(e, "Gagal membatalkan."));
  }
};

const onExport = () =>
  exportToExcel("Terima_Mutasi", {
    columns: kolomExcel,
    getData: () =>
      dataTampil().map((r) => ({
        ...r,
        Nomor_Terima: r.Status === "BELUM" ? "Belum diterima" : r.Nomor_Terima,
        Tanggal_Terima: r.Tanggal_Terima ? formatTanggal(r.Tanggal_Terima) : "",
        Tanggal_Mutasi: formatTanggal(r.Tanggal_Mutasi),
      })),
  });
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Terima Mutasi dari Produksi"
    menu-id="191"
    storage-id="penjualan-terima-mutasi"
    :icon="IconClipboardCheck"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor_Mutasi"
    edit-text="Terima"
    :edit-icon="IconClipboardCheck"
    delete-text="Batal Terima"
    :row-props-fn="rowProps"
    :before-delete="sebelumBatal"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="onExport"
    show-expand
    v-model:expanded="expandedRows"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tgl Terima</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
        <span class="f-hint">Yang belum diterima selalu tampil</span>
      </div>
    </template>

    <template #item.Nomor_Terima="{ item }">
      {{ item.Status === "BELUM" ? "Belum diterima" : item.Nomor_Terima }}
    </template>
    <template #item.Tanggal_Terima="{ item }">
      {{ item.Tanggal_Terima ? formatTanggal(item.Tanggal_Terima) : "-" }}
    </template>
    <template #item.Tanggal_Mutasi="{ item }">
      {{ formatTanggal(item.Tanggal_Mutasi) }}
    </template>
    <template #item.Total_Kirim="{ item }">
      {{ numFmt(item.Total_Kirim) }}
    </template>
    <template #item.Total_Terima="{ item }">
      {{ numFmt(item.Total_Terima) }}
    </template>
    <template #item.Selisih="{ item }">
      <span
        :class="
          item.Selisih !== null && item.Selisih !== 0
            ? 'text-orange-darken-2 font-weight-bold'
            : ''
        "
      >
        {{ numFmt(item.Selisih) }}
      </span>
    </template>

    <!-- Detail Expand -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">
          Detail MAP - {{ item.Nomor_Mutasi }}
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="170">Nomor MAP</th>
              <th>Nama Pekerjaan</th>
              <th width="110">Ukuran</th>
              <th width="200">MO</th>
              <th width="90" class="tr">Kirim</th>
              <th width="90" class="tr">Terima</th>
              <th width="90" class="tr">Selisih</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in detailMap[item.Nomor_Mutasi]" :key="r.Nomor_MAP">
              <td>{{ r.Nomor_MAP }}</td>
              <td class="font-weight-bold">{{ r.Nama_MAP }}</td>
              <td>{{ r.Ukuran }}</td>
              <td>{{ r.MO }}</td>
              <td class="tr">{{ numFmt(r.Qty_Kirim) }}</td>
              <td class="tr">{{ numFmt(r.Qty_Terima) }}</td>
              <td class="tr">
                {{
                  r.Qty_Terima === null
                    ? "-"
                    : numFmt(round2(Number(r.Qty_Terima) - Number(r.Qty_Kirim)))
                }}
              </td>
            </tr>
            <tr v-if="!detailMap[item.Nomor_Mutasi]?.length">
              <td colspan="7" class="text-center text-grey py-3 font-italic">
                Detail MAP tidak ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog terima -->
  <v-dialog v-model="dlg" max-width="920" persistent scrollable>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconClipboardCheck class="mr-2" :size="20" />
        <span>Terima Mutasi - {{ form.mutasi }}</span>
      </v-card-title>

      <v-card-text class="pa-3 dlg-body">
        <div class="dlg-grid">
          <div class="f-row">
            <label class="f-lbl">Tgl Mutasi</label>
            <input
              :value="form.tglMutasi ? formatTanggal(form.tglMutasi) : ''"
              readonly
              class="f-inp f-ro"
              style="max-width: 130px"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Lokasi</label>
            <input
              :value="form.lokasi"
              readonly
              class="f-inp f-ro"
              style="max-width: 100px"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Tgl Terima</label>
            <input
              type="date"
              v-model="form.tanggal"
              :min="form.tglMutasi"
              :max="hariIni"
              class="f-inp"
              style="max-width: 150px"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Keterangan</label>
            <input
              v-model="form.keterangan"
              :maxlength="MAKS_KETERANGAN"
              class="f-inp"
              placeholder="Catatan penerimaan..."
            />
          </div>
        </div>

        <div class="d-flex align-center justify-space-between mt-3 mb-1">
          <div class="sec-title">Jumlah diterima per MAP :</div>
          <v-btn
            size="x-small"
            variant="text"
            color="primary"
            @click="samakanDenganKirim"
          >
            Samakan semua dengan Kirim
          </v-btn>
        </div>
        <table class="bt">
          <thead>
            <tr>
              <th style="width: 30px">No</th>
              <th style="width: 160px; text-align: left">Nomor MAP</th>
              <th style="text-align: left">Nama Pekerjaan</th>
              <th style="width: 100px; text-align: left">Ukuran</th>
              <th style="width: 150px; text-align: left">MO</th>
              <th style="width: 80px">Kirim</th>
              <th class="th-terima" style="width: 100px">Terima</th>
              <th style="width: 80px">Selisih</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, i) in form.maps" :key="m.nomor">
              <td class="tc">{{ i + 1 }}</td>
              <td class="td-kode">{{ m.nomor }}</td>
              <td class="font-weight-bold">{{ m.nama }}</td>
              <td>{{ m.ukuran }}</td>
              <td>{{ m.mo }}</td>
              <td class="tr">{{ numFmt(m.qtyKirim) }}</td>
              <td class="p0">
                <input
                  v-model.number="m.qtyTerima"
                  type="number"
                  min="0"
                  step="0.01"
                  class="terima-inp"
                  v-select-on-focus
                />
              </td>
              <td
                class="tr"
                :class="
                  selisihBaris(m) !== null && selisihBaris(m) !== 0
                    ? 'text-orange-darken-2 font-weight-bold'
                    : ''
                "
              >
                {{ numFmt(selisihBaris(m)) }}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="note-box">
          Isi jumlah yang benar-benar diterima. Setelah disimpan, terima tidak
          bisa diubah dan dokumen Mutasi Marketing ikut terkunci; pembatalan
          hanya oleh superadmin.
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" :disabled="dlgSaving" @click="dlg = false">
          Batal
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="elevated"
          :loading="dlgSaving"
          @click="simpanTerima"
        >
          Simpan Terima
        </v-btn>
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
  background: white;
  outline: none;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-hint {
  font-size: 10px;
  color: #b71c1c;
  margin-left: 6px;
}
.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: bold;
  color: #1565c0;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.tr {
  text-align: right !important;
}
.tc {
  text-align: center !important;
}

/* ── Dialog ── */
.dlg-body {
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.dlg-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 16px;
}
.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}
.f-lbl {
  width: 80px;
  flex-shrink: 0;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
  flex: 1;
  box-sizing: border-box;
  font-family: inherit;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #616161 !important;
  cursor: default;
}
.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1565c0;
}
.bt {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.bt thead tr {
  background: #1565c0;
}
.bt th {
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-align: center;
  border: 1px solid #0d47a1;
  white-space: nowrap;
}
.bt td {
  border: 1px solid #eeeeee;
  padding: 3px 6px;
  vertical-align: middle;
}
.bt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
}
.p0 {
  padding: 0 !important;
}
.th-terima {
  background: #f9a825 !important;
  color: #4a2e00 !important;
  border-color: #e65100 !important;
}
.terima-inp {
  width: 100%;
  height: 22px;
  border: none;
  background: #fffde7;
  outline: none;
  font-size: 10px;
  text-align: right;
  padding: 0 6px;
  font-family: inherit;
  font-weight: 600;
}
.terima-inp:focus {
  background: #e3f2fd;
}
.note-box {
  margin-top: 10px;
  padding: 6px 8px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 4px;
  color: #0d47a1;
  font-size: 10px;
  line-height: 1.4;
}
</style>
