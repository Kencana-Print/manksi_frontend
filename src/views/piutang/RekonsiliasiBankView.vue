<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { rekonsiliasiBankService } from "@/services/piutang/rekonsiliasiBankService";
import {
  IconArrowsExchange,
  IconFileExport,
  IconCheck,
  IconListCheck,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// --- Tanggal — single date, bukan range ---
const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const STORAGE_KEY = "manksi_tanggal_rekon_bank";
const tanggal = ref(sessionStorage.getItem(STORAGE_KEY) ?? getToday());

watch(tanggal, (v) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* silent */
  }
  loadData();
});

// --- Data ---
const items = ref<any[]>([]);
const isLoading = ref(false);
const selected = ref<any[]>([]);
const filterState = ref<Record<string, any>>({});

const selectedItem = computed(() => selected.value[0] ?? null);

const headers = [
  { title: "Kode", key: "Kode", width: "130px", fixed: true },
  { title: "Nama Account", key: "Nama", width: "280px" },
  { title: "Saldo Buku", key: "SaldoAkhir", width: "150px", align: "end" },
  { title: "Saldo Bank", key: "SaldoBank", width: "150px", align: "end" },
  { title: "Status Rekon", key: "Rekon", width: "110px", align: "center" },
];

const loadData = async () => {
  isLoading.value = true;
  selected.value = [];
  try {
    const res = await rekonsiliasiBankService.getBrowse(tanggal.value);
    items.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
const fmtSelisih = (v: number) => {
  const abs = Math.abs(v);
  return (v < 0 ? "-" : "") + abs.toLocaleString("id-ID");
};

// --- Summary footer formatters — sticky row di dalam tabel, ikut
// scroll horizontal otomatis (pola sama seperti InvoiceView) ---
const summaryFormatters = {
  Nama: () => "TOTAL :",
  SaldoAkhir: (filteredItems: any[]) =>
    numFmt(
      Math.round(
        filteredItems.reduce((s, r) => s + (Number(r.SaldoAkhir) || 0), 0),
      ),
    ),
  SaldoBank: (filteredItems: any[]) => {
    const total = filteredItems.reduce(
      (s, r) => s + (Number(r.SaldoBank) || 0),
      0,
    );
    return numFmt(Math.round(total));
  },
  Rekon: (filteredItems: any[]) => {
    const selisih = filteredItems.reduce(
      (s, r) => s + (Number(r.SaldoAkhir) - Number(r.SaldoBank)),
      0,
    );
    return `Selisih: ${fmtSelisih(Math.round(selisih))}`;
  },
};

// --- Row coloring: rekening yang sudah rekon ditandai beda warna ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  return item.Rekon === "Sudah" ? { class: "row-sudah" } : {};
};

const requireSelected = (): boolean => {
  if (!selectedItem.value) {
    toast.warning("Pilih rekening terlebih dahulu.");
    return false;
  }
  return true;
};

const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

// ════════════════════════════════════════════════════════════════════
// DIALOG 1: VALIDASI BANK
// ════════════════════════════════════════════════════════════════════
const showValidasiDialog = ref(false);
const validasiLoading = ref(false);
const validasiSaving = ref(false);
const saldoKoran = ref<number>(0);
const saldoBuku = ref<number>(0);
const validasiKode = ref("");
const validasiNama = ref("");
const validasiTanggal = ref("");

const onValidasi = async () => {
  if (!requireSelected()) return;
  const row = selectedItem.value!;
  validasiKode.value = row.Kode;
  validasiNama.value = row.Nama;
  validasiTanggal.value = tanggal.value;
  saldoBuku.value = Number(row.SaldoAkhir);

  validasiLoading.value = true;
  showValidasiDialog.value = true;
  try {
    const res = await rekonsiliasiBankService.getValidasi(
      row.Kode,
      tanggal.value,
    );
    saldoKoran.value = Number(res.data.data?.saldo_koran) || 0;
  } catch {
    saldoKoran.value = 0;
  } finally {
    validasiLoading.value = false;
  }
};

const confirmValidasi = async () => {
  validasiSaving.value = true;
  try {
    await rekonsiliasiBankService.saveValidasi(
      validasiKode.value,
      validasiTanggal.value,
      saldoKoran.value,
    );
    toast.success("Validasi bank berhasil disimpan.");
    showValidasiDialog.value = false;

    // Jika saldo berbeda → otomatis buka rekonsiliasi
    if (saldoBuku.value !== saldoKoran.value) {
      await loadData();
      const updated = items.value.find((r) => r.Kode === validasiKode.value);
      if (updated) {
        selected.value = [updated];
        await openRekon(updated);
        return;
      }
    }
    await loadData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan validasi.");
  } finally {
    validasiSaving.value = false;
  }
};

// ════════════════════════════════════════════════════════════════════
// DIALOG 2: REKONSILIASI
// ════════════════════════════════════════════════════════════════════
const showRekonDialog = ref(false);
const rekonKode = ref("");
const rekonNama = ref("");
const rekonTanggal = ref("");
const rekonSaldoBuku = ref(0);
const rekonSaldoKoran = ref(0);
const rekonLoading = ref(false);

interface RekonItem {
  no: number;
  uraian: string;
  keterangan: string;
  nominal: number;
}
const emptyRow = (): RekonItem => ({
  no: 1,
  uraian: "",
  keterangan: "",
  nominal: 0,
});

const bukuTambah = ref<RekonItem[]>([emptyRow()]);
const bukuKurang = ref<RekonItem[]>([emptyRow()]);
const bankTambah = ref<RekonItem[]>([emptyRow()]);
const bankKurang = ref<RekonItem[]>([emptyRow()]);

const subtotalBukuTambah = computed(() =>
  bukuTambah.value.reduce((s, r) => s + (Number(r.nominal) || 0), 0),
);
const subtotalBukuKurang = computed(() =>
  bukuKurang.value.reduce((s, r) => s + (Number(r.nominal) || 0), 0),
);
const subtotalBankTambah = computed(() =>
  bankTambah.value.reduce((s, r) => s + (Number(r.nominal) || 0), 0),
);
const subtotalBankKurang = computed(() =>
  bankKurang.value.reduce((s, r) => s + (Number(r.nominal) || 0), 0),
);

const penjumlahanBuku = computed(
  () => rekonSaldoBuku.value + subtotalBukuTambah.value,
);
const saldoSetelahBuku = computed(
  () => penjumlahanBuku.value - subtotalBukuKurang.value,
);
const penjumlahanBank = computed(
  () => rekonSaldoKoran.value + subtotalBankTambah.value,
);
const saldoSetelahBank = computed(
  () => penjumlahanBank.value - subtotalBankKurang.value,
);

const addRekonRow = (list: RekonItem[]) => {
  list.push({ no: list.length + 1, uraian: "", keterangan: "", nominal: 0 });
};
const removeRekonRow = (list: RekonItem[], idx: number) => {
  list.splice(idx, 1);
};

const onRekonsiliasi = () => {
  if (!requireSelected()) return;
  openRekon(selectedItem.value!);
};

const openRekon = async (row: any) => {
  rekonKode.value = row.Kode;
  rekonNama.value = row.Nama;
  rekonTanggal.value = tanggal.value;
  rekonSaldoBuku.value = Number(row.SaldoAkhir);
  rekonSaldoKoran.value = Number(row.SaldoBank);

  bukuTambah.value = [emptyRow()];
  bukuKurang.value = [emptyRow()];
  bankTambah.value = [emptyRow()];
  bankKurang.value = [emptyRow()];

  showRekonDialog.value = true;
  rekonLoading.value = true;

  try {
    const res = await rekonsiliasiBankService.getRekon(row.Kode, tanggal.value);
    const data = res.data.data;
    if (data?.bukuTambah?.length) bukuTambah.value = data.bukuTambah;
    if (data?.bukuKurang?.length) bukuKurang.value = data.bukuKurang;
    if (data?.bankTambah?.length) bankTambah.value = data.bankTambah;
    if (data?.bankKurang?.length) bankKurang.value = data.bankKurang;
  } catch {
    /* pakai default kosong */
  } finally {
    rekonLoading.value = false;
  }
};

const rekonSaving = ref(false);
const confirmRekon = async () => {
  rekonSaving.value = true;
  try {
    await rekonsiliasiBankService.saveRekon(
      rekonKode.value,
      rekonTanggal.value,
      rekonSaldoBuku.value,
      rekonSaldoKoran.value,
      {
        bukuTambah: bukuTambah.value,
        bukuKurang: bukuKurang.value,
        bankTambah: bankTambah.value,
        bankKurang: bankKurang.value,
      },
    );
    toast.success("Rekonsiliasi berhasil disimpan.");
    showRekonDialog.value = false;
    await loadData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan rekonsiliasi.");
  } finally {
    rekonSaving.value = false;
  }
};

// --- Hapus ---
const showDeleteDialog = ref(false);
const isDeleting = ref(false);

const onHapus = () => {
  if (!requireSelected()) return;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isDeleting.value = true;
  try {
    await rekonsiliasiBankService.deleteData(
      selectedItem.value.Kode,
      tanggal.value,
    );
    toast.success("Data rekonsiliasi berhasil dihapus.");
    showDeleteDialog.value = false;
    await loadData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  } finally {
    isDeleting.value = false;
  }
};

// --- Export ---
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
      numFmt: ["SaldoAkhir", "SaldoBank"].includes(h.key) ? "#,##0" : undefined,
    }));

    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        row[c.key] = it[c.key] ?? "";
      });
      return row;
    });

    await exportExcelSingle(
      `Rekonsiliasi_Bank_${tanggal.value}.xlsx`,
      "Rekonsiliasi Bank",
      columns,
      rows,
      `Laporan Rekonsiliasi Bank  |  Per Tanggal: ${formatTanggal(tanggal.value)}`,
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
    title="Rekonsiliasi Bank"
    menu-id="957"
    :icon="IconArrowsExchange"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-export="true"
    item-value="Kode"
    :row-props-fn="rowPropsFn"
    :summary-columns="['SaldoAkhir', 'SaldoBank', 'Rekon']"
    :summary-formatters="summaryFormatters"
    @refresh="loadData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Per Tanggal</span>
        <input type="date" v-model="tanggal" class="f-date" />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="teal-darken-1"
        variant="flat"
        :disabled="!selectedItem"
        @click="onValidasi"
      >
        <template #prepend><IconCheck :size="13" :stroke-width="2" /></template>
        Validasi Bank
      </v-btn>
      <v-btn
        size="small"
        color="indigo-darken-1"
        variant="flat"
        :disabled="!selectedItem"
        @click="onRekonsiliasi"
      >
        <template #prepend
          ><IconListCheck :size="13" :stroke-width="1.8"
        /></template>
        Rekonsiliasi
      </v-btn>
      <v-btn
        size="small"
        color="error"
        variant="tonal"
        :disabled="!selectedItem"
        @click="onHapus"
      >
        Hapus
      </v-btn>
    </template>

    <template #item.SaldoAkhir="{ item }">
      {{ numFmt((item.raw || item).SaldoAkhir) }}
    </template>
    <template #item.SaldoBank="{ item }">
      {{ numFmt((item.raw || item).SaldoBank) }}
    </template>
    <template #item.Rekon="{ item }">
      <span
        class="rb-badge"
        :class="
          (item.raw || item).Rekon === 'Sudah' ? 'badge-blue' : 'badge-orange'
        "
      >
        {{ (item.raw || item).Rekon }}
      </span>
    </template>
  </BaseBrowse>

  <!-- ════════════════════════════════════════════
       DIALOG 1: VALIDASI BANK
  ════════════════════════════════════════════ -->
  <v-dialog v-model="showValidasiDialog" max-width="440" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #1565c0"
      >
        Validasi Bank
      </v-card-title>
      <v-card-text class="pa-4 pt-2">
        <v-skeleton-loader v-if="validasiLoading" type="list-item@3" />
        <template v-else>
          <div class="vld-info-row">
            <span class="vld-lbl">Tanggal</span>
            <span class="vld-val">{{ formatTanggal(validasiTanggal) }}</span>
          </div>
          <div class="vld-info-row">
            <span class="vld-lbl">Kode</span>
            <span class="vld-val mono">{{ validasiKode }}</span>
          </div>
          <div class="vld-info-row mb-3">
            <span class="vld-lbl">Nama</span>
            <span class="vld-val">{{ validasiNama }}</span>
          </div>

          <div class="vld-saldo-box">
            <div class="vld-saldo-row">
              <span class="vld-saldo-lbl">Pembukuan (Sistem)</span>
              <span class="vld-saldo-val readonly">{{
                numFmt(saldoBuku)
              }}</span>
            </div>
            <div class="vld-saldo-row mt-2">
              <label class="vld-saldo-lbl req">Rekening Koran</label>
              <input
                :value="numFmt(saldoKoran)"
                type="text"
                inputmode="numeric"
                class="vld-saldo-input"
                placeholder="0"
                @focus="
                  (e) => {
                    (e.target as HTMLInputElement).value = saldoKoran
                      ? String(saldoKoran)
                      : '';
                    (e.target as HTMLInputElement).select();
                  }
                "
                @input="
                  (e) => {
                    saldoKoran = parseNum((e.target as HTMLInputElement).value);
                  }
                "
                @blur="
                  (e) => {
                    (e.target as HTMLInputElement).value = numFmt(saldoKoran);
                  }
                "
              />
            </div>
            <div
              class="vld-selisih-row"
              :class="saldoBuku === saldoKoran ? 'balanced' : 'unbalanced'"
            >
              <span>Selisih: {{ fmtSelisih(saldoBuku - saldoKoran) }}</span>
              <span v-if="saldoBuku !== saldoKoran" style="font-size: 10px">
                → Rekonsiliasi akan dibuka otomatis
              </span>
            </div>
          </div>
        </template>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="showValidasiDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          :loading="validasiSaving"
          :disabled="validasiLoading"
          @click="confirmValidasi"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ════════════════════════════════════════════
       DIALOG 2: REKONSILIASI BANK
  ════════════════════════════════════════════ -->
  <v-dialog v-model="showRekonDialog" max-width="1100" persistent scrollable>
    <v-card rounded="lg" style="overflow: hidden">
      <div class="rekon-header">
        <div class="rekon-header-left">
          <span class="rekon-header-title">Rekonsiliasi Bank</span>
          <div class="rekon-header-info">
            <span class="rekon-header-kode">{{ rekonKode }}</span>
            <span class="rekon-header-nama">{{ rekonNama }}</span>
          </div>
        </div>
        <div class="rekon-header-right">
          <span class="rekon-header-tgl">{{
            formatTanggal(rekonTanggal)
          }}</span>
        </div>
      </div>

      <v-card-text class="pa-4 pt-3" style="overflow-y: auto">
        <v-skeleton-loader v-if="rekonLoading" type="table-row@6" />

        <template v-else>
          <div class="rekon-grid">
            <!-- ══ KIRI: Pembukuan Perusahaan ══ -->
            <div class="rekon-col">
              <div class="rekon-col-header">
                Saldo Menurut Pembukuan Perusahaan
              </div>
              <div class="rekon-saldo-display">
                {{ numFmt(rekonSaldoBuku) }}
              </div>

              <div class="rekon-sub-title">Ditambah :</div>
              <table class="rekon-tbl">
                <thead>
                  <tr>
                    <th style="width: 32px">No</th>
                    <th>Uraian</th>
                    <th style="width: 110px">Ket</th>
                    <th style="width: 105px">Nominal</th>
                    <th style="width: 22px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in bukuTambah" :key="`bt${i}`">
                    <td class="tc">{{ i + 1 }}</td>
                    <td><input v-model="r.uraian" class="ri" /></td>
                    <td><input v-model="r.keterangan" class="ri" /></td>
                    <td>
                      <input
                        :value="numFmt(r.nominal)"
                        type="text"
                        inputmode="numeric"
                        class="ri tr"
                        @focus="
                          (e) => {
                            (e.target as HTMLInputElement).value = r.nominal
                              ? String(r.nominal)
                              : '';
                          }
                        "
                        @input="
                          (e) => {
                            r.nominal = parseNum(
                              (e.target as HTMLInputElement).value,
                            );
                          }
                        "
                        @blur="
                          (e) => {
                            (e.target as HTMLInputElement).value = numFmt(
                              r.nominal,
                            );
                          }
                        "
                      />
                    </td>
                    <td>
                      <button
                        class="rdel"
                        @click="removeRekonRow(bukuTambah, i)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="rekon-add-row">
                <button class="radd" @click="addRekonRow(bukuTambah)">
                  + Baris
                </button>
                <span class="rekon-sub-total"
                  >Subtotal: {{ numFmt(subtotalBukuTambah) }}</span
                >
              </div>
              <div class="rekon-penjumlahan">
                <span>Penjumlahan</span>
                <span>{{ numFmt(penjumlahanBuku) }}</span>
              </div>

              <div class="rekon-sub-title mt-2">Dikurangi :</div>
              <table class="rekon-tbl">
                <thead>
                  <tr>
                    <th style="width: 32px">No</th>
                    <th>Uraian</th>
                    <th style="width: 110px">Keterangan</th>
                    <th style="width: 105px">Nominal</th>
                    <th style="width: 22px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in bukuKurang" :key="`bk${i}`">
                    <td class="tc">{{ i + 1 }}</td>
                    <td><input v-model="r.uraian" class="ri" /></td>
                    <td><input v-model="r.keterangan" class="ri" /></td>
                    <td>
                      <input
                        :value="numFmt(r.nominal)"
                        type="text"
                        inputmode="numeric"
                        class="ri tr"
                        @focus="
                          (e) => {
                            (e.target as HTMLInputElement).value = r.nominal
                              ? String(r.nominal)
                              : '';
                          }
                        "
                        @input="
                          (e) => {
                            r.nominal = parseNum(
                              (e.target as HTMLInputElement).value,
                            );
                          }
                        "
                        @blur="
                          (e) => {
                            (e.target as HTMLInputElement).value = numFmt(
                              r.nominal,
                            );
                          }
                        "
                      />
                    </td>
                    <td>
                      <button
                        class="rdel"
                        @click="removeRekonRow(bukuKurang, i)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="rekon-add-row">
                <button class="radd" @click="addRekonRow(bukuKurang)">
                  + Baris
                </button>
                <span class="rekon-sub-total"
                  >Subtotal: {{ numFmt(subtotalBukuKurang) }}</span
                >
              </div>

              <div
                class="rekon-saldo-akhir"
                :class="
                  saldoSetelahBuku === saldoSetelahBank
                    ? 'akhir-ok'
                    : 'akhir-err'
                "
              >
                <span>Saldo Setelah Rekonsiliasi</span>
                <span style="font-variant-numeric: tabular-nums">{{
                  numFmt(saldoSetelahBuku)
                }}</span>
              </div>
            </div>

            <div class="rekon-divider"></div>

            <!-- ══ KANAN: Pembukuan Bank ══ -->
            <div class="rekon-col">
              <div class="rekon-col-header">Saldo Menurut Pembukuan Bank</div>
              <div class="rekon-saldo-display">
                {{ numFmt(rekonSaldoKoran) }}
              </div>

              <div class="rekon-sub-title">Ditambah :</div>
              <table class="rekon-tbl">
                <thead>
                  <tr>
                    <th style="width: 32px">No</th>
                    <th>Uraian</th>
                    <th style="width: 110px">Keterangan</th>
                    <th style="width: 105px">Nominal</th>
                    <th style="width: 22px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in bankTambah" :key="`nbt${i}`">
                    <td class="tc">{{ i + 1 }}</td>
                    <td><input v-model="r.uraian" class="ri" /></td>
                    <td><input v-model="r.keterangan" class="ri" /></td>
                    <td>
                      <input
                        :value="numFmt(r.nominal)"
                        type="text"
                        inputmode="numeric"
                        class="ri tr"
                        @focus="
                          (e) => {
                            (e.target as HTMLInputElement).value = r.nominal
                              ? String(r.nominal)
                              : '';
                          }
                        "
                        @input="
                          (e) => {
                            r.nominal = parseNum(
                              (e.target as HTMLInputElement).value,
                            );
                          }
                        "
                        @blur="
                          (e) => {
                            (e.target as HTMLInputElement).value = numFmt(
                              r.nominal,
                            );
                          }
                        "
                      />
                    </td>
                    <td>
                      <button
                        class="rdel"
                        @click="removeRekonRow(bankTambah, i)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="rekon-add-row">
                <button class="radd" @click="addRekonRow(bankTambah)">
                  + Baris
                </button>
                <span class="rekon-sub-total"
                  >Subtotal: {{ numFmt(subtotalBankTambah) }}</span
                >
              </div>
              <div class="rekon-penjumlahan">
                <span>Penjumlahan</span>
                <span>{{ numFmt(penjumlahanBank) }}</span>
              </div>

              <div class="rekon-sub-title mt-2">Dikurangi :</div>
              <table class="rekon-tbl">
                <thead>
                  <tr>
                    <th style="width: 32px">No</th>
                    <th>Uraian</th>
                    <th style="width: 110px">Keterangan</th>
                    <th style="width: 105px">Nominal</th>
                    <th style="width: 22px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in bankKurang" :key="`nbk${i}`">
                    <td class="tc">{{ i + 1 }}</td>
                    <td><input v-model="r.uraian" class="ri" /></td>
                    <td><input v-model="r.keterangan" class="ri" /></td>
                    <td>
                      <input
                        :value="numFmt(r.nominal)"
                        type="text"
                        inputmode="numeric"
                        class="ri tr"
                        @focus="
                          (e) => {
                            (e.target as HTMLInputElement).value = r.nominal
                              ? String(r.nominal)
                              : '';
                          }
                        "
                        @input="
                          (e) => {
                            r.nominal = parseNum(
                              (e.target as HTMLInputElement).value,
                            );
                          }
                        "
                        @blur="
                          (e) => {
                            (e.target as HTMLInputElement).value = numFmt(
                              r.nominal,
                            );
                          }
                        "
                      />
                    </td>
                    <td>
                      <button
                        class="rdel"
                        @click="removeRekonRow(bankKurang, i)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="rekon-add-row">
                <button class="radd" @click="addRekonRow(bankKurang)">
                  + Baris
                </button>
                <span class="rekon-sub-total"
                  >Subtotal: {{ numFmt(subtotalBankKurang) }}</span
                >
              </div>

              <div
                class="rekon-saldo-akhir"
                :class="
                  saldoSetelahBuku === saldoSetelahBank
                    ? 'akhir-ok'
                    : 'akhir-err'
                "
              >
                <span>Saldo Setelah Rekonsiliasi</span>
                <span style="font-variant-numeric: tabular-nums">{{
                  numFmt(saldoSetelahBank)
                }}</span>
              </div>
            </div>
          </div>

          <div
            class="rekon-balance-bar"
            :class="
              saldoSetelahBuku === saldoSetelahBank ? 'bal-ok' : 'bal-err'
            "
          >
            <span v-if="saldoSetelahBuku === saldoSetelahBank">
              ✓ Saldo sudah balance
            </span>
            <span v-else>
              ✗ Belum balance — Selisih:
              {{ fmtSelisih(saldoSetelahBuku - saldoSetelahBank) }}
            </span>
          </div>
        </template>
      </v-card-text>

      <v-card-actions class="pa-4" style="border-top: 1px solid #e0e0e0">
        <v-btn variant="text" @click="showRekonDialog = false">Tutup</v-btn>
        <v-spacer />
        <v-btn
          color="indigo-darken-1"
          variant="flat"
          :loading="rekonSaving"
          :disabled="rekonLoading"
          @click="confirmRekon"
        >
          Simpan Rekonsiliasi
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Hapus ── -->
  <v-dialog v-model="showDeleteDialog" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-body-1 font-weight-bold pa-4">
        Hapus Data Rekonsiliasi
      </v-card-title>
      <v-card-text class="pa-4 pt-0" style="font-size: 12px">
        Yakin ingin menghapus rekonsiliasi
        <strong>{{ selectedItem?.Kode }} – {{ selectedItem?.Nama }}</strong>
        tanggal <strong>{{ formatTanggal(tanggal) }}</strong
        >?
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="showDeleteDialog = false">Batal</v-btn>
        <v-btn
          color="error"
          variant="flat"
          :loading="isDeleting"
          @click="confirmDelete"
        >
          Ya, Hapus
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
  outline: none;
  background: white;
  color: #212121;
}
.mono {
  font-family: monospace;
}

:deep(.row-sudah td) {
  color: #1565c0 !important;
  font-weight: 600;
}

.rb-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.badge-orange {
  background: #fff3e0;
  color: #e65100;
}

.vld-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.vld-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
  width: 70px;
  flex-shrink: 0;
}
.vld-val {
  font-size: 12px;
}
.vld-saldo-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
}
.vld-saldo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.vld-saldo-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
}
.vld-saldo-lbl.req::after {
  content: " *";
  color: red;
}
.vld-saldo-val.readonly {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: #e5e7eb;
  border-radius: 4px;
  padding: 3px 10px;
}
.vld-saldo-input {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  outline: none;
  width: 160px;
}
.vld-saldo-input:focus {
  border-color: #1565c0;
}
.vld-selisih-row {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
}
.balanced {
  color: #2e7d32;
}
.unbalanced {
  color: #c62828;
}

.rekon-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 10px;
  border-top: 3px solid #1565c0;
  border-bottom: 1px solid #e3f2fd;
  background: #f8fbff;
  gap: 12px;
}
.rekon-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.rekon-header-title {
  font-size: 13px;
  font-weight: 700;
  color: #1565c0;
  white-space: nowrap;
}
.rekon-header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rekon-header-kode {
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  background: #e3f2fd;
  color: #1565c0;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.rekon-header-nama {
  font-size: 11px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 500px;
}
.rekon-header-right {
  flex-shrink: 0;
}
.rekon-header-tgl {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 12px;
  border-radius: 4px;
  white-space: nowrap;
}

.rekon-grid {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  gap: 0;
}
.rekon-col {
  padding: 0 10px;
}
.rekon-col:first-child {
  padding-left: 0;
}
.rekon-col:last-child {
  padding-right: 0;
}
.rekon-divider {
  background: #e0e0e0;
  margin: 0 4px;
}

.rekon-col-header {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 2px solid #e3f2fd;
}
.rekon-saldo-display {
  background: #e3f2fd;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
  margin-bottom: 10px;
  color: #1565c0;
}
.rekon-sub-title {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.rekon-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.rekon-tbl thead tr {
  background: #1565c0;
}
.rekon-tbl th {
  color: white;
  font-weight: 700;
  padding: 4px 5px;
  text-align: left;
  white-space: nowrap;
}
.rekon-tbl td {
  padding: 1px 3px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.rekon-tbl tbody tr:hover td {
  background: #f0f7ff;
}

.ri {
  width: 100%;
  height: 24px;
  border: 1px solid #e0e0e0;
  border-radius: 2px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.ri:focus {
  border-color: #1565c0;
}
.ri.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.rdel {
  background: none;
  border: none;
  cursor: pointer;
  color: #c62828;
  font-size: 14px;
  font-weight: 700;
  padding: 0 2px;
  line-height: 1;
}
.rdel:hover {
  color: #b71c1c;
}

.rekon-add-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 0 5px;
}
.radd {
  background: none;
  border: 1px dashed #1565c0;
  border-radius: 3px;
  color: #1565c0;
  font-size: 10px;
  padding: 1px 8px;
  cursor: pointer;
}
.radd:hover {
  background: #e3f2fd;
}
.rekon-sub-total {
  font-size: 10px;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.rekon-penjumlahan {
  display: flex;
  justify-content: space-between;
  background: #e8f5e9;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1b5e20;
  font-variant-numeric: tabular-nums;
}
.rekon-saldo-akhir {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  margin-top: 8px;
}
.akhir-ok {
  background: #1565c0;
}
.akhir-err {
  background: #c62828;
}

.rekon-balance-bar {
  margin-top: 14px;
  padding: 9px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}
.bal-ok {
  background: #e8f5e9;
  color: #2e7d32;
}
.bal-err {
  background: #ffebee;
  color: #c62828;
}
</style>
