<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import BaseTable from "@/components/BaseTable.vue";
import { rekapMapService } from "@/services/laporan/marketing/rekapMapService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconRefresh,
  IconFileSpreadsheet,
  IconX,
  IconLayoutGrid,
  IconDeviceFloppy,
} from "@tabler/icons-vue";

const MENU_ID = "311";
const authStore = useAuthStore();
const toast = useToast();

// ── Filter bulan & tahun ──
const now = new Date();
const bulan = ref(now.getMonth() + 1);
const tahun = ref(now.getFullYear());

const BULAN_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const TAHUN_LIST = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

// ── Tab ──
const activeTab = ref<"rekap" | "spanduk" | "garmen" | "mmt">("rekap");

// ── Data ──
const rekapRows = ref<any[]>([]);
const spandukRows = ref<any[]>([]);
const garmenRows = ref<any[]>([]);
const mmtRows = ref<any[]>([]);
const isLoading = ref(false);

const canExport = computed(() => authStore.can(MENU_ID, "view"));
const canEdit = computed(() => authStore.can(MENU_ID, "edit"));

// ── Active rows ──
const activeRows = computed(() => {
  if (activeTab.value === "rekap") return rekapRows.value;
  if (activeTab.value === "spanduk") return spandukRows.value;
  if (activeTab.value === "garmen") return garmenRows.value;
  return mmtRows.value;
});

// ── Fetch ──
const fetchData = async () => {
  isLoading.value = true;
  rekapRows.value = [];
  spandukRows.value = [];
  garmenRows.value = [];
  mmtRows.value = [];

  try {
    const params = { bulan: bulan.value, tahun: tahun.value };
    const [rRekap, rSpanduk, rGarmen, rMmt] = await Promise.allSettled([
      rekapMapService.getRekap(params),
      rekapMapService.getDetail({ ...params, divisi: "SPANDUK" }),
      rekapMapService.getDetail({ ...params, divisi: "GARMEN" }),
      rekapMapService.getDetail({ ...params, divisi: "MMT" }),
    ]);
    if (rRekap.status === "fulfilled")
      rekapRows.value = rRekap.value.data.data || [];
    if (rSpanduk.status === "fulfilled")
      spandukRows.value = rSpanduk.value.data.data || [];
    if (rGarmen.status === "fulfilled")
      garmenRows.value = rGarmen.value.data.data || [];
    if (rMmt.status === "fulfilled") mmtRows.value = rMmt.value.data.data || [];

    // Init note editing
    initNotes([...spandukRows.value, ...garmenRows.value, ...mmtRows.value]);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);

watch([bulan, tahun], () => {
  fetchData();
});

// ── Totals rekap ──
const totalNominal = computed(() =>
  rekapRows.value.reduce((s, r) => s + Number(r.Nominal || 0), 0),
);
const totalRealisasi = computed(() =>
  rekapRows.value.reduce((s, r) => s + Number(r.Realisasi || 0), 0),
);
const totalPresentase = computed(() =>
  totalNominal.value > 0
    ? Math.round((totalRealisasi.value / totalNominal.value) * 100 * 100) / 100
    : 0,
);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("id-ID").format(Math.round(n || 0));
const shortNum = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "M";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "jt";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "rb";
  return String(n);
};

// ── Headers ──
const headersRekap = [
  { title: "Sales", key: "Sales", width: "140px" },
  { title: "Perusahaan", key: "Perush", width: "100px", align: "center" },
  { title: "Jml MAP", key: "JmlMAP", width: "80px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Qty", key: "Qty", width: "110px", align: "right" },
  { title: "Nominal", key: "Nominal", width: "140px", align: "right" },
  { title: "Realisasi", key: "Realisasi", width: "140px", align: "right" },
  { title: "%", key: "Presentase", width: "70px", align: "right" },
];

const headersDetail = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Perus.", key: "Perusahaan", width: "80px", align: "center" },
  { title: "Sales", key: "Sales", width: "130px" },
  { title: "Customer", key: "Customer", minWidth: "180px" },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "Nama", key: "Nama", minWidth: "200px" },
  { title: "Qty", key: "Qty", width: "80px", align: "right" },
  { title: "Panjang", key: "Panjang", width: "80px", align: "right" },
  { title: "Lebar", key: "Lebar", width: "80px", align: "right" },
  { title: "Jml", key: "Jml", width: "100px", align: "right" },
  { title: "Harga", key: "Harga", width: "110px", align: "right" },
  { title: "Nilai", key: "Nilai", width: "130px", align: "right" },
  { title: "Realisasi", key: "Realisasi", width: "130px", align: "right" },
  { title: "Note", key: "Note", width: "160px" },
];

// ── Row props ──
const rowPropsRekap = (data: any) => {
  const div = (data.item?.Divisi || "").toUpperCase();
  if (div === "GARMEN") return { class: "row-garmen" };
  if (div === "SPANDUK") return { class: "row-spanduk" };
  if (div === "MMT") return { class: "row-mmt" };
  return {};
};

const rowPropsDetail = (data: any) => {
  const nilai = Number(data.item?.Nilai || 0);
  const realisasi = Number(data.item?.Realisasi || 0);
  if (!nilai) return {};
  const pct = (realisasi / nilai) * 100;
  if (pct >= 100) return { class: "row-done" };
  if (pct >= 50) return { class: "row-mid" };
  return {};
};

// ── Note editing ──
const editingNote = ref<Record<string, string>>({});
const isSavingNote = ref<Record<string, boolean>>({});
const isSavingAll = ref(false);

const initNotes = (rows: any[]) => {
  for (const r of rows) {
    if (!(r.Nomor in editingNote.value)) {
      editingNote.value[r.Nomor] = r.Note || "";
    }
  }
};

const saveNote = async (nomor: string) => {
  if (!canEdit.value) return toast.error("Akses ditolak.");
  isSavingNote.value[nomor] = true;
  try {
    await rekapMapService.updateNote({
      nomor,
      note: editingNote.value[nomor] || "",
    });
    toast.success("Note disimpan.");
    const allRows = [
      ...spandukRows.value,
      ...garmenRows.value,
      ...mmtRows.value,
    ];
    const row = allRows.find((r) => r.Nomor === nomor);
    if (row) row.Note = editingNote.value[nomor];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan note.");
  } finally {
    isSavingNote.value[nomor] = false;
  }
};

const saveAllNotes = async () => {
  if (!canEdit.value) return toast.error("Akses ditolak.");
  const rows =
    activeTab.value === "spanduk"
      ? spandukRows.value
      : activeTab.value === "garmen"
        ? garmenRows.value
        : mmtRows.value;

  isSavingAll.value = true;
  try {
    const changed = rows.filter(
      (r) => (editingNote.value[r.Nomor] ?? "") !== (r.Note ?? ""),
    );
    if (!changed.length) return toast.info("Tidak ada perubahan note.");
    await Promise.all(
      changed.map((r) =>
        rekapMapService.updateNote({
          nomor: r.Nomor,
          note: editingNote.value[r.Nomor] || "",
        }),
      ),
    );
    changed.forEach((r) => {
      r.Note = editingNote.value[r.Nomor] || "";
    });
    toast.success(`${changed.length} note berhasil disimpan.`);
  } catch {
    toast.error("Gagal menyimpan sebagian note.");
  } finally {
    isSavingAll.value = false;
  }
};

// ── Export ──
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const tab = activeTab.value;
  const label = BULAN_NAMES[bulan.value - 1] + "_" + tahun.value;

  if (tab === "rekap") {
    await exportExcelSingle(
      `RekapMAP_${label}`,
      "Rekap MAP",
      [
        { header: "Sales", key: "Sales", width: 20 },
        { header: "Perusahaan", key: "Perush", width: 12, align: "center" },
        { header: "Jml MAP", key: "JmlMAP", width: 10, align: "center" },
        { header: "Divisi", key: "Divisi", width: 12 },
        {
          header: "Qty",
          key: "Qty",
          width: 14,
          align: "right",
          numFmt: "#,##0.##",
        },
        {
          header: "Nominal",
          key: "Nominal",
          width: 18,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Realisasi",
          key: "Realisasi",
          width: 18,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "%",
          key: "Presentase",
          width: 10,
          align: "right",
          numFmt: "0.00",
        },
      ],
      rekapRows.value,
      `Rekap MAP — ${BULAN_NAMES[bulan.value - 1]} ${tahun.value}`,
    );
  } else {
    const rows =
      tab === "spanduk"
        ? spandukRows.value
        : tab === "garmen"
          ? garmenRows.value
          : mmtRows.value;
    const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
    await exportExcelSingle(
      `RekapMAP_${tabLabel}_${label}`,
      `Detail ${tabLabel}`,
      [
        { header: "Nomor", key: "Nomor", width: 18 },
        { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
        { header: "Perus.", key: "Perusahaan", width: 8, align: "center" },
        { header: "Sales", key: "Sales", width: 18 },
        { header: "Customer", key: "Customer", width: 30 },
        { header: "Tipe", key: "Tipe", width: 10 },
        { header: "Nama", key: "Nama", width: 32 },
        {
          header: "Qty",
          key: "Qty",
          width: 10,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Panjang",
          key: "Panjang",
          width: 10,
          align: "right",
          numFmt: "#,##0.##",
        },
        {
          header: "Lebar",
          key: "Lebar",
          width: 10,
          align: "right",
          numFmt: "#,##0.##",
        },
        {
          header: "Jml",
          key: "Jml",
          width: 14,
          align: "right",
          numFmt: "#,##0.##",
        },
        {
          header: "Harga",
          key: "Harga",
          width: 14,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Nilai",
          key: "Nilai",
          width: 16,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Realisasi",
          key: "Realisasi",
          width: 16,
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Note", key: "Note", width: 20 },
      ],
      rows,
      `Detail MAP ${tabLabel} — ${BULAN_NAMES[bulan.value - 1]} ${tahun.value}`,
    );
  }
};
</script>

<template>
  <PageLayout title="Rekap MAP" :menu-id="MENU_ID" :icon="IconLayoutGrid">
    <template #header-actions>
      <v-btn
        v-if="activeTab !== 'rekap' && canEdit"
        size="small"
        color="indigo"
        :loading="isSavingAll"
        @click="saveAllNotes"
      >
        <template #prepend>
          <IconDeviceFloppy :size="15" :stroke-width="1.7" />
        </template>
        Update Note
      </v-btn>
      <v-btn
        size="small"
        color="green"
        :disabled="!activeRows.length"
        @click="onExport"
      >
        <template #prepend>
          <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
        </template>
        Export
      </v-btn>
      <v-btn size="small" variant="text" @click="$router.back()">
        <template #prepend><IconX :size="15" :stroke-width="2" /></template>
        Tutup
      </v-btn>
    </template>

    <div class="rekap-map-wrap">
      <!-- ── Filter bar ── -->
      <div class="filter-bar">
        <span class="filter-lbl">Periode:</span>
        <select v-model="bulan" class="sel-inp">
          <option v-for="(nm, i) in BULAN_NAMES" :key="i" :value="i + 1">
            {{ nm }}
          </option>
        </select>
        <select v-model="tahun" class="sel-inp">
          <option v-for="y in TAHUN_LIST" :key="y" :value="y">{{ y }}</option>
        </select>

        <v-btn
          size="small"
          color="primary"
          :loading="isLoading"
          @click="fetchData"
        >
          <template #prepend>
            <IconRefresh :size="14" :stroke-width="1.7" />
          </template>
          Tampilkan
        </v-btn>

        <v-spacer />

        <div class="summary-chips">
          <span class="chip chip--blue">{{ rekapRows.length }} baris</span>
          <span class="chip chip--purple">
            Nominal: <b>{{ shortNum(totalNominal) }}</b>
          </span>
          <span class="chip chip--green">
            Realisasi: <b>{{ shortNum(totalRealisasi) }}</b>
          </span>
          <span
            class="chip"
            :class="
              totalPresentase >= 80
                ? 'chip--green'
                : totalPresentase >= 50
                  ? 'chip--orange'
                  : 'chip--red'
            "
          >
            {{ totalPresentase }}%
          </span>
        </div>
      </div>

      <!-- ── Tab bar ── -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'rekap' }"
          @click="activeTab = 'rekap'"
        >
          Rekap MAP
          <span v-if="rekapRows.length" class="tab-count">{{
            rekapRows.length
          }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'spanduk' }"
          @click="activeTab = 'spanduk'"
        >
          Spanduk
          <span v-if="spandukRows.length" class="tab-count tab-count--spanduk">
            {{ spandukRows.length }}
          </span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'garmen' }"
          @click="activeTab = 'garmen'"
        >
          Garmen
          <span v-if="garmenRows.length" class="tab-count tab-count--garmen">
            {{ garmenRows.length }}
          </span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'mmt' }"
          @click="activeTab = 'mmt'"
        >
          MMT
          <span v-if="mmtRows.length" class="tab-count tab-count--mmt">
            {{ mmtRows.length }}
          </span>
        </button>
      </div>

      <!-- ── Tab Rekap MAP ── -->
      <div v-show="activeTab === 'rekap'" class="tab-content">
        <BaseTable
          :headers="headersRekap"
          :items="rekapRows"
          :is-loading="isLoading"
          item-value="Sales"
          :row-props-fn="rowPropsRekap"
          summary-key="Nominal"
          summary-label="Total Nominal"
        >
          <template #item.Qty="{ item }">
            <span style="font-family: monospace">
              {{ Number(item.Qty || 0).toFixed(2) }}
            </span>
          </template>
          <template #item.Nominal="{ item }">
            <span
              style="font-family: monospace; font-weight: 700; color: #1565c0"
            >
              {{ fmtNum(item.Nominal) }}
            </span>
          </template>
          <template #item.Realisasi="{ item }">
            <span
              style="font-family: monospace; color: #2e7d32; font-weight: 600"
            >
              {{ fmtNum(item.Realisasi) }}
            </span>
          </template>
          <template #item.Presentase="{ item }">
            <span
              style="font-weight: 700"
              :style="{
                color:
                  Number(item.Presentase) >= 100
                    ? '#2e7d32'
                    : Number(item.Presentase) >= 50
                      ? '#f57f17'
                      : '#c62828',
              }"
            >
              {{ Number(item.Presentase || 0).toFixed(2) }}%
            </span>
          </template>

          <template #summary-row="{ filteredItems }">
            <div class="multi-summary-bar">
              <span class="ms-item">
                <span class="ms-lbl">Nominal</span>
                <span class="ms-val">
                  {{
                    fmtNum(
                      filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Nominal || 0),
                        0,
                      ),
                    )
                  }}
                </span>
              </span>
              <span class="ms-sep">|</span>
              <span class="ms-item">
                <span class="ms-lbl">Realisasi</span>
                <span class="ms-val ms-green">
                  {{
                    fmtNum(
                      filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Realisasi || 0),
                        0,
                      ),
                    )
                  }}
                </span>
              </span>
              <span class="ms-sep">|</span>
              <span class="ms-item">
                <span class="ms-lbl">% Real.</span>
                <span class="ms-val ms-orange">
                  {{
                    (() => {
                      const nom = filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Nominal || 0),
                        0,
                      );
                      const rel = filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Realisasi || 0),
                        0,
                      );
                      return nom > 0
                        ? ((rel / nom) * 100).toFixed(2) + "%"
                        : "0%";
                    })()
                  }}
                </span>
              </span>
            </div>
          </template>
        </BaseTable>
      </div>

      <!-- ── Tab Detail (Spanduk / Garmen / MMT) ── -->
      <template
        v-for="tabKey in ['spanduk', 'garmen', 'mmt'] as const"
        :key="tabKey"
      >
        <div v-show="activeTab === tabKey" class="tab-content">
          <div class="detail-table-wrap">
            <BaseTable
              :headers="headersDetail"
              :items="
                tabKey === 'spanduk'
                  ? spandukRows
                  : tabKey === 'garmen'
                    ? garmenRows
                    : mmtRows
              "
              :is-loading="isLoading"
              item-value="Nomor"
              :row-props-fn="rowPropsDetail"
              summary-key="Nilai"
              summary-label="Total Nilai"
            >
              <template #item.Qty="{ item }">
                <span style="font-family: monospace">{{
                  fmtNum(item.Qty)
                }}</span>
              </template>
              <template #item.Jml="{ item }">
                <span style="font-family: monospace">
                  {{ Number(item.Jml || 0).toFixed(2) }}
                </span>
              </template>
              <template #item.Harga="{ item }">
                <span style="font-family: monospace">{{
                  fmtNum(item.Harga)
                }}</span>
              </template>
              <template #item.Nilai="{ item }">
                <span
                  style="
                    font-family: monospace;
                    font-weight: 700;
                    color: #1565c0;
                  "
                >
                  {{ fmtNum(item.Nilai) }}
                </span>
              </template>
              <template #item.Realisasi="{ item }">
                <span
                  style="font-family: monospace; font-weight: 600"
                  :style="{
                    color:
                      Number(item.Realisasi || 0) >= Number(item.Nilai || 0)
                        ? '#2e7d32'
                        : '#f57f17',
                  }"
                >
                  {{ item.Realisasi ? fmtNum(item.Realisasi) : "-" }}
                </span>
              </template>

              <!-- Note — inline editable -->
              <template #item.Note="{ item }">
                <div v-if="canEdit" class="note-cell">
                  <input
                    v-model="editingNote[item.Nomor]"
                    class="note-inp"
                    placeholder="Tulis note..."
                    @keydown.enter.prevent="saveNote(item.Nomor)"
                  />
                  <button
                    v-if="(editingNote[item.Nomor] ?? '') !== (item.Note ?? '')"
                    class="note-save-btn"
                    :disabled="isSavingNote[item.Nomor]"
                    @click.stop="saveNote(item.Nomor)"
                    title="Simpan note"
                  >
                    <IconDeviceFloppy :size="12" />
                  </button>
                </div>
                <span v-else class="note-text">{{ item.Note || "-" }}</span>
              </template>

              <template #summary-row="{ filteredItems }">
                <div class="multi-summary-bar">
                  <span class="ms-item">
                    <span class="ms-lbl">Nilai</span>
                    <span class="ms-val">
                      {{
                        fmtNum(
                          filteredItems.reduce(
                            (s: number, r: any) => s + Number(r.Nilai || 0),
                            0,
                          ),
                        )
                      }}
                    </span>
                  </span>
                  <span class="ms-sep">|</span>
                  <span class="ms-item">
                    <span class="ms-lbl">Realisasi</span>
                    <span class="ms-val ms-green">
                      {{
                        fmtNum(
                          filteredItems.reduce(
                            (s: number, r: any) => s + Number(r.Realisasi || 0),
                            0,
                          ),
                        )
                      }}
                    </span>
                  </span>
                  <span class="ms-sep">|</span>
                  <span class="ms-item">
                    <span class="ms-lbl">Jml</span>
                    <span class="ms-val ms-teal">
                      {{
                        Number(
                          filteredItems.reduce(
                            (s: number, r: any) => s + Number(r.Jml || 0),
                            0,
                          ),
                        ).toFixed(2)
                      }}
                    </span>
                  </span>
                </div>
              </template>
            </BaseTable>
          </div>
        </div>
      </template>
    </div>
  </PageLayout>
</template>

<style scoped>
.rekap-map-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #424242;
}
.sel-inp {
  height: 32px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  color: #424242;
  background: white;
  outline: none;
  cursor: pointer;
}
.sel-inp:focus {
  border-color: #1867c0;
}

.summary-chips {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chip {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;
}
.chip--blue {
  background: #e3f2fd;
  color: #1565c0;
}
.chip--purple {
  background: #f3e5f5;
  color: #6a1b9a;
}
.chip--green {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip--orange {
  background: #fff3e0;
  color: #e65100;
}
.chip--red {
  background: #ffebee;
  color: #c62828;
}

/* ── Tab bar ── */
.tab-bar {
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  background: white;
  flex-shrink: 0;
}
.tab-btn {
  padding: 8px 18px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #757575;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.tab-btn:hover {
  color: #1565c0;
}
.tab-btn.active {
  color: #1565c0;
  border-bottom-color: #1565c0;
}

.tab-count {
  font-size: 10px;
  font-weight: 700;
  background: #e3f2fd;
  color: #1565c0;
  padding: 1px 6px;
  border-radius: 8px;
}
.tab-count--spanduk {
  background: #e3f2fd;
  color: #1565c0;
}
.tab-count--garmen {
  background: #fce4ec;
  color: #c62828;
}
.tab-count--mmt {
  background: #e8f5e9;
  color: #2e7d32;
}

/* ── Tab content ── */
.tab-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* ── Row coloring ── */
:deep(.row-garmen td) {
  background: #fce4ec !important;
}
:deep(.row-spanduk td) {
  background: #e3f2fd !important;
}
:deep(.row-mmt td) {
  background: #e8f5e9 !important;
}
:deep(.row-done td) {
  background: #f1f8e9 !important;
}
:deep(.row-mid td) {
  background: #fff8e1 !important;
}

/* ── Note cell ── */
.note-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}
.note-inp {
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #424242;
  min-width: 0;
}
.note-inp:focus {
  border-color: #1565c0;
}
.note-save-btn {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  background: #1565c0;
  color: white;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.note-save-btn:hover {
  background: #0d47a1;
}
.note-save-btn:disabled {
  background: #90caf9;
  cursor: default;
}
.note-text {
  font-size: 11px;
  color: #616161;
}

/* ── Multi summary bar ── */
.multi-summary-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 12px;
  background: #1565c0;
  min-width: max-content;
  height: 30px;
}
.ms-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ms-lbl {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  text-transform: uppercase;
}
.ms-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  font-family: monospace;
}
.ms-green {
  color: #a5d6a7;
}
.ms-teal {
  color: #80cbc4;
}
.ms-orange {
  color: #ffcc80;
}
.ms-sep {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}

/* ── Detail table — allow horizontal scroll, kolom tidak dipaksa fit ── */
.detail-table-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-table-wrap :deep(.bt-table table) {
  table-layout: auto !important;
  min-width: 1600px;
}

.detail-table-wrap :deep(.bt-table tbody td) {
  max-width: none !important;
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: unset !important;
}

/* Summary bar ikut min-width tabel */
.detail-table-wrap :deep(.bt-summary-outer) {
  overflow-x: auto;
}
.detail-table-wrap :deep(.bt-summary-inner) {
  min-width: 1600px;
}
</style>
