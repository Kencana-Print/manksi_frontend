<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { planningSpkFormService } from "@/services/ppic/planningSpkFormService";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import {
  IconCalendarStats,
  IconSearch,
  IconPlus,
  IconTrash,
  IconHistory,
} from "@tabler/icons-vue";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TabRow {
  NomorSPK: string;
  NamaSPK: string;
  QtySPK: number;
  plan_tgl_jadwal: string;
  plan_wip: number;
  plan_qty_po: number;
  plan_qty_jadwal: number;
  plan_line_kelompok: string; // tidak dipakai di koli
  _key: number;
  _spkLoading: boolean;
  _spkDetail: string;
}

interface RiwayatRow {
  Nomor: string;
  Tgl1: string;
  Tgl2: string;
  Cabang: string;
  Close: string;
  Keterangan: string;
  NomorSPK: string;
  NamaSPK: string;
}

interface FormState {
  pl_nomor: string;
  pl_tgl1: string;
  pl_tgl2: string;
  pl_cab: string;
  pl_keterangan: string;
  detail: {
    cutting: TabRow[];
    sewing: TabRow[];
    koli: TabRow[];
  };
}

// ─── Router / Toast ───────────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() =>
  route.params.nomor ? decodeURIComponent(route.params.nomor as string) : "",
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatDateLocal = (v?: string | Date): string => {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : toLocalDate(d);
};
// Clamp tanggal jadwal Sewing/Koli supaya tidak bisa keluar dari
// periode planning (pl_tgl1 s/d pl_tgl2). Dipanggil di @change karena
// min/max HTML5 date input cuma membatasi popup kalender, bukan input
// manual via keyboard.
const clampToPeriode = (tab: TabKey, idx: number) => {
  if (tab === "cutting") return; // cutting tidak terikat periode mingguan
  const row = formData.value.detail[tab][idx];
  if (!row.plan_tgl_jadwal) return;

  const val = row.plan_tgl_jadwal;
  const min = formData.value.pl_tgl1;
  const max = formData.value.pl_tgl2;

  if (min && val < min) {
    row.plan_tgl_jadwal = min;
    toast.warning(`Tanggal jadwal disesuaikan ke awal periode (${min}).`);
  } else if (max && val > max) {
    row.plan_tgl_jadwal = max;
    toast.warning(`Tanggal jadwal disesuaikan ke akhir periode (${max}).`);
  }
};

// Ganti getMondayOfWeek agar tidak kena timezone issue
const getMondayOfWeek = (d: Date) => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
};

// Ganti today agar pakai waktu lokal Indonesia (WIB)
const todayWIB = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
);
const today = todayWIB;
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const monday = getMondayOfWeek(today);
const saturday = new Date(monday);
saturday.setDate(monday.getDate() + 5);
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

let _key = 0;
const newKey = () => ++_key;

const emptyRow = (defaultTgl: string): TabRow => ({
  NomorSPK: "",
  NamaSPK: "",
  QtySPK: 0,
  plan_tgl_jadwal: defaultTgl,
  plan_wip: 0,
  plan_qty_po: 0,
  plan_qty_jadwal: 0,
  plan_line_kelompok: "",
  _spkDetail: "",
  _key: newKey(),
  _spkLoading: false,
});

const mapRow = (r: any, defaultTgl: string): TabRow => ({
  NomorSPK: r.NomorSPK ?? "",
  NamaSPK: r.NamaSPK ?? "",
  QtySPK: Number(r.QtySPK) || 0,
  plan_tgl_jadwal: formatDateLocal(r.plan_tgl_jadwal) || defaultTgl,
  plan_wip: Number(r.plan_wip) || 0,
  plan_qty_po: Number(r.plan_qty_po) || 0,
  plan_qty_jadwal: Number(r.plan_qty_jadwal) || 0,
  plan_line_kelompok: r.plan_line_kelompok ?? "",
  _spkDetail: r.NamaSPK ? `${r.NomorSPK} | ${r.NamaSPK} | ${r.QtySPK} pcs` : "",
  _key: newKey(),
  _spkLoading: false,
});

const emptyData: FormState = {
  pl_nomor: "",
  pl_tgl1: toLocalDate(monday),
  pl_tgl2: toLocalDate(saturday),
  pl_cab: "",
  pl_keterangan: "",
  detail: {
    cutting: [emptyRow(toLocalDate(tomorrow))],
    sewing: [emptyRow(toLocalDate(monday))],
    koli: [emptyRow(toLocalDate(monday))],
  },
};

// ─── Riwayat ──────────────────────────────────────────────────────────────────
const riwayat = ref<RiwayatRow[]>([]);
const showRiwayatDialog = ref(false);
const riwayatLoading = ref(false);

// Kumpulkan semua SPK unik dari ketiga tab
const getAllSpkList = (): string[] => {
  const fd = formData.value;
  const all = [
    ...fd.detail.cutting.map((r) => r.NomorSPK),
    ...fd.detail.sewing.map((r) => r.NomorSPK),
    ...fd.detail.koli.map((r) => r.NomorSPK),
  ].filter(Boolean);
  return [...new Set(all)];
};

const loadRiwayat = async () => {
  const spkList = getAllSpkList();
  if (!spkList.length) {
    riwayat.value = [];
    return;
  }
  riwayatLoading.value = true;
  try {
    const res = await planningSpkFormService.getRiwayatSpk(
      spkList,
      formData.value.pl_nomor,
    );
    riwayat.value = res.data.data ?? [];
  } catch {
    riwayat.value = [];
  } finally {
    riwayatLoading.value = false;
  }
};

// ─── useForm ──────────────────────────────────────────────────────────────────
const {
  formData,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  canSave,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<FormState>({
  menuId: "56",
  initialData: emptyData,
  fetchApi: async () => {
    const res = await planningSpkFormService.getFormDetail(nomorParam.value);
    const d = res.data.data;
    const h = d.header;

    const result: FormState = {
      pl_nomor: h.pl_nomor ?? "",
      pl_tgl1: formatDateLocal(h.pl_tgl1) || toLocalDate(monday),
      pl_tgl2: formatDateLocal(h.pl_tgl2) || toLocalDate(saturday),
      pl_cab: h.pl_cab ?? "",
      pl_keterangan: h.pl_keterangan ?? "",
      detail: {
        cutting: (d.detail?.cutting?.length
          ? d.detail.cutting
          : [emptyRow(toLocalDate(yesterday))]
        ).map((r: any) => mapRow(r, toLocalDate(yesterday))),
        sewing: (d.detail?.sewing?.length
          ? d.detail.sewing
          : [emptyRow(toLocalDate(monday))]
        ).map((r: any) => mapRow(r, toLocalDate(monday))),
        koli: (d.detail?.koli?.length
          ? d.detail.koli
          : [emptyRow(toLocalDate(monday))]
        ).map((r: any) => mapRow(r, toLocalDate(monday))),
      },
    };

    // Load riwayat setelah data siap
    setTimeout(loadRiwayat, 100);
    return result;
  },
  submitApi: async (payload) => {
    const clean = {
      ...payload,
      detail: {
        cutting: (payload.detail.cutting as TabRow[])
          .filter((r) => r.NomorSPK && r.plan_tgl_jadwal)
          .map(({ _key, _spkLoading, NamaSPK, QtySPK, ...r }) => r),
        sewing: (payload.detail.sewing as TabRow[])
          .filter((r) => r.NomorSPK && r.plan_tgl_jadwal)
          .map(({ _key, _spkLoading, NamaSPK, QtySPK, ...r }) => r),
        koli: (payload.detail.koli as TabRow[])
          .filter((r) => r.NomorSPK && r.plan_tgl_jadwal)
          .map(
            ({
              _key,
              _spkLoading,
              NamaSPK,
              QtySPK,
              plan_line_kelompok,
              ...r
            }) => r,
          ),
      },
    };
    return planningSpkFormService.saveData(clean);
  },
  onSuccessRoute: "",
  onSuccess: () => {
    toast.success("Planning berhasil disimpan.");
    router.push({ name: "PpicPlanningSpk" });
  },
});

// ─── SPK Lookup per baris ─────────────────────────────────────────────────────
type TabKey = "cutting" | "sewing" | "koli";
const showSpkModal = ref(false);
const activeTab = ref<TabKey>("cutting");
const activeRowIdx = ref(-1);

const LINE_OPTIONS = [
  "LINE A",
  "LINE B",
  "LINE C",
  "LINE D",
  "LINE E",
  "LINE F",
  "LINE G",
  "LINE H",
  "LINE I",
  "LINE J",
  "LINE K",
];

const openSpkModal = (tab: TabKey, idx: number) => {
  activeTab.value = tab;
  activeRowIdx.value = idx;
  showSpkModal.value = true;
};

const onSpkKeydown = (e: KeyboardEvent, tab: TabKey, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openSpkModal(tab, idx);
  }
};

const onSpkEnter = async (tab: TabKey, idx: number) => {
  const row = formData.value.detail[tab][idx];
  if (!row.NomorSPK?.trim()) return;
  await resolveSpk(tab, idx, row.NomorSPK.trim());
};

const onSpkSelected = async (item: any) => {
  showSpkModal.value = false;
  const nomor = (item?.Nomor ?? item?.spk_nomor ?? "").trim();
  if (!nomor) return;
  const tab = activeTab.value;
  const idx = activeRowIdx.value;
  formData.value.detail[tab][idx].NomorSPK = nomor;
  await resolveSpk(tab, idx, nomor);
};

const resolveSpk = async (tab: TabKey, idx: number, nomor: string) => {
  const rows = formData.value.detail[tab];
  const row = rows[idx];

  const isDup = rows.some((r, i) => i !== idx && r.NomorSPK === nomor);
  if (isDup) {
    toast.warning(`SPK ${nomor} sudah ada di baris lain pada tab ini.`);
    row.NomorSPK = "";
    return;
  }

  row._spkLoading = true;
  try {
    // Paralel: ambil info SPK + qty PO Jasa sekaligus
    const [resSpk, resPo] = await Promise.all([
      planningSpkFormService.getSpkInfo(nomor),
      planningSpkFormService.getQtyPoJasa(nomor),
    ]);

    const s = resSpk.data.data;
    const po = resPo.data.data;

    row.NamaSPK = s.spk_nama ?? "";
    row.QtySPK = Number(s.spk_jumlah) || 0;
    row._spkDetail = [
      `SPK     : ${s.spk_nomor}`,
      `Tgl SPK : ${s.spk_tanggal ?? "-"}`,
      `Dateline: ${s.spk_dateline ?? "-"}`,
      `Desain  : ${s.spk_nama ?? "-"}`,
      `Jumlah  : ${Number(s.spk_jumlah).toLocaleString("id-ID")} pcs`,
      `Workshop: ${s.spk_workshop_kode ?? ""} ${s.spk_workshop ?? ""}`.trim(),
      `Tipe    : ${s.spk_tipe ?? "-"}`,
      `Kain    : ${s.spk_kain ?? "-"}`,
      `Finishing: ${s.spk_finishing ?? "-"}`,
      `Proses  : ${
        [
          s.spk_sablon === "Y" ? "Sablon" : "",
          s.spk_sublim === "Y" ? "Sublim" : "",
          s.spk_bordir === "Y" ? "Bordir" : "",
        ]
          .filter(Boolean)
          .join(", ") || "-"
      }`,
    ].join("\n");

    // Auto-fill qty_po per tab
    if (tab === "sewing") row.plan_qty_po = po.sewing;
    if (tab === "koli") row.plan_qty_po = po.koli;
    // cutting: qty_po tetap 0, tidak ada PO Jasa

    const rows = formData.value.detail[tab];
    if (idx === rows.length - 1) {
      const defaultTgl =
        tab === "cutting" ? toLocalDate(yesterday) : toLocalDate(monday);
      rows.push(emptyRow(defaultTgl));
    }

    await loadRiwayat();
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "SPK tidak ditemukan.");
    row.NomorSPK = "";
    row.NamaSPK = "";
    row.QtySPK = 0;
    row._spkDetail = "";
  } finally {
    row._spkLoading = false;
  }
};

// ─── Row helpers ──────────────────────────────────────────────────────────────
const addRow = (tab: TabKey) => {
  const defaultTgl =
    tab === "cutting"
      ? toLocalDate(tomorrow) // H+1
      : toLocalDate(monday);
  formData.value.detail[tab].push(emptyRow(defaultTgl));
};

const removeRow = (tab: TabKey, idx: number) => {
  // Hapus validasi minimal 1 baris
  formData.value.detail[tab].splice(idx, 1);
  loadRiwayat();
};

// ─── Validasi ─────────────────────────────────────────────────────────────────
const validateSave = () => {
  if (!canSave.value) return toast.error("Hak akses simpan ditolak.");
  if (!formData.value.pl_tgl1 || !formData.value.pl_tgl2)
    return toast.warning("Periode planning wajib diisi.");

  const hasData =
    formData.value.detail.cutting.some((r) => r.NomorSPK) ||
    formData.value.detail.sewing.some((r) => r.NomorSPK) ||
    formData.value.detail.koli.some((r) => r.NomorSPK);
  if (!hasData)
    return toast.warning("Minimal isi satu baris SPK di salah satu tab.");

  showSaveDialog.value = true;
};

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("id-ID");

watch(
  () => [formData.value.pl_tgl1, formData.value.pl_tgl2],
  () => {
    formData.value.detail.sewing.forEach((_, i) => clampToPeriode("sewing", i));
    formData.value.detail.koli.forEach((_, i) => clampToPeriode("koli", i));
  },
);
</script>

<template>
  <BaseForm
    :title="(isEdit ? 'Ubah' : 'Baru') + ' Planning SPK PPIC'"
    menu-id="56"
    :icon="IconCalendarStats"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ══ LEFT COLUMN ══ -->
    <template #left-column>
      <div class="lc-wrap">
        <div class="sec-card">
          <div class="sec-label">Dokumen</div>
          <div class="fr">
            <span class="lbl">Nomor</span>
            <input
              :value="formData.pl_nomor"
              class="inp ro"
              placeholder="&lt;-- Otomatis"
              readonly
            />
          </div>
          <div class="fr">
            <span class="lbl">Tgl Awal</span>
            <input type="date" v-model="formData.pl_tgl1" class="idate" />
          </div>
          <div class="fr">
            <span class="lbl">Tgl Akhir</span>
            <input type="date" v-model="formData.pl_tgl2" class="idate" />
          </div>
          <div class="fr">
            <span class="lbl">Cabang</span>
            <input v-model="formData.pl_cab" class="inp" maxlength="10" />
          </div>
          <div class="fr">
            <span class="lbl">Keterangan</span>
            <input
              v-model="formData.pl_keterangan"
              class="inp"
              maxlength="200"
            />
          </div>
        </div>

        <!-- Tombol Riwayat -->
        <div class="mt-2">
          <v-btn
            size="small"
            variant="tonal"
            color="blue-grey"
            :loading="riwayatLoading"
            :disabled="!getAllSpkList().length"
            @click="showRiwayatDialog = true"
          >
            <template #prepend><IconHistory :size="14" /></template>
            Riwayat Planning
            <v-chip
              v-if="riwayat.length"
              size="x-small"
              color="primary"
              variant="flat"
              class="ml-2"
            >
              {{ riwayat.length }}
            </v-chip>
          </v-btn>
        </div>

        <!-- Info SPK yang sudah diinput -->
        <div class="spk-summary mt-2" v-if="getAllSpkList().length">
          <div class="sec-label">SPK Dalam Planning Ini</div>
          <div
            v-for="tab in ['cutting', 'sewing', 'koli'] as TabKey[]"
            :key="tab"
          >
            <template v-if="formData.detail[tab].some((r) => r.NomorSPK)">
              <div class="spk-summary-tab">{{ tab.toUpperCase() }}</div>
              <div
                v-for="r in formData.detail[tab].filter((r) => r.NomorSPK)"
                :key="r._key"
                class="spk-summary-row"
              >
                <span class="mono">{{ r.NomorSPK }}</span>
                <span class="spk-summary-nama">{{ r.NamaSPK }}</span>
                <span class="spk-summary-qty">{{ fmt(r.QtySPK) }} pcs</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ RIGHT COLUMN — 3 Tab ══ -->
    <template #right-column>
      <div class="rc-wrap">
        <v-tabs v-model="activeTab" density="compact" class="tab-header">
          <v-tab value="cutting" class="tab-item"
            >Cutting
            <v-chip
              v-if="formData.detail.cutting.some((r) => r.NomorSPK)"
              size="x-small"
              color="blue-grey"
              variant="flat"
              class="ml-1"
            >
              {{ formData.detail.cutting.filter((r) => r.NomorSPK).length }}
            </v-chip>
          </v-tab>
          <v-tab value="sewing" class="tab-item"
            >Sewing
            <v-chip
              v-if="formData.detail.sewing.some((r) => r.NomorSPK)"
              size="x-small"
              color="green"
              variant="flat"
              class="ml-1"
            >
              {{ formData.detail.sewing.filter((r) => r.NomorSPK).length }}
            </v-chip>
          </v-tab>
          <v-tab value="koli" class="tab-item"
            >Koli
            <v-chip
              v-if="formData.detail.koli.some((r) => r.NomorSPK)"
              size="x-small"
              color="orange"
              variant="flat"
              class="ml-1"
            >
              {{ formData.detail.koli.filter((r) => r.NomorSPK).length }}
            </v-chip>
          </v-tab>
        </v-tabs>

        <v-tabs-window v-model="activeTab" class="tab-content">
          <!-- ── Tab Cutting ── -->
          <v-tabs-window-item value="cutting" class="tab-pane">
            <div class="tab-info">
              Jadwal default: <b>H+1</b> (hari sesudah planning dibuat)
            </div>
            <div class="tbl-hdr blue">
              <span>Divisi Cutting</span>
              <button type="button" class="btn-add" @click="addRow('cutting')">
                <IconPlus :size="12" /> Tambah Baris
              </button>
            </div>
            <div class="tbl-wrap">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 28px">No</th>
                    <th style="width: 130px">Nomor SPK</th>
                    <th style="width: 220px">Nama SPK</th>
                    <th style="width: 75px" class="tr">Qty SPK</th>
                    <th style="width: 110px">Tgl Jadwal</th>
                    <th style="width: 80px" class="tr">WIP</th>
                    <th style="width: 80px" class="tr">Qty PO</th>
                    <th style="width: 85px" class="tr bg-yellow">Qty Jadwal</th>
                    <th style="width: 150px">Line/Kelompok</th>
                    <th style="width: 32px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, idx) in formData.detail.cutting"
                    :key="row._key"
                  >
                    <td class="tc lbl-cell">{{ (idx as number) + 1 }}</td>
                    <td style="padding: 0">
                      <div class="gi-group">
                        <input
                          v-model="row.NomorSPK"
                          class="gi"
                          style="text-transform: uppercase"
                          placeholder="F1 / Enter"
                          @keydown="
                            (e) => onSpkKeydown(e, 'cutting', idx as number)
                          "
                          @keydown.enter.prevent="
                            onSpkEnter('cutting', idx as number)
                          "
                        />
                        <button
                          class="btn-gi-lkp"
                          :class="{ loading: row._spkLoading }"
                          @click="openSpkModal('cutting', idx as number)"
                        >
                          <IconSearch :size="11" />
                        </button>
                      </div>
                    </td>
                    <td class="ro-cell" :title="row._spkDetail">
                      {{ row.NamaSPK || "—" }}
                    </td>
                    <td class="ro-cell tr">
                      {{ row.QtySPK ? fmt(row.QtySPK) : "—" }}
                    </td>
                    <td style="padding: 0">
                      <input
                        type="date"
                        v-model="row.plan_tgl_jadwal"
                        class="gi"
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_wip"
                        min="0"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_qty_po"
                        min="0"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_qty_jadwal"
                        min="0"
                        class="gi tr yellow-cell"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="text"
                        v-model="row.plan_line_kelompok"
                        class="gi"
                        maxlength="50"
                        placeholder="Bebas..."
                      />
                    </td>
                    <td class="tc" style="padding: 0">
                      <button
                        type="button"
                        class="btn-del"
                        @click="removeRow('cutting', idx as number)"
                      >
                        <IconTrash :size="12" />
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!formData.detail.cutting.length">
                    <td colspan="10" class="empty-row">Klik + Tambah Baris</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-tabs-window-item>

          <!-- ── Tab Sewing ── -->
          <v-tabs-window-item value="sewing" class="tab-pane">
            <div class="tab-info">
              Periode: <b>{{ formData.pl_tgl1 }}</b> s/d
              <b>{{ formData.pl_tgl2 }}</b>
            </div>
            <div class="tbl-hdr green">
              <span>Divisi Sewing</span>
              <button type="button" class="btn-add" @click="addRow('sewing')">
                <IconPlus :size="12" /> Tambah Baris
              </button>
            </div>
            <div class="tbl-wrap">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 28px">No</th>
                    <th style="width: 130px">Nomor SPK</th>
                    <th style="width: 220px">Nama SPK</th>
                    <th style="width: 75px" class="tr">Qty SPK</th>
                    <th style="width: 110px">Tgl Jadwal</th>
                    <th style="width: 80px" class="tr">WIP</th>
                    <th style="width: 80px" class="tr">Qty PO</th>
                    <th style="width: 85px" class="tr bg-yellow">Qty Jadwal</th>
                    <th style="width: 150px">Line/Kelompok</th>
                    <th style="width: 32px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, idx) in formData.detail.sewing"
                    :key="row._key"
                  >
                    <td class="tc lbl-cell">{{ (idx as number) + 1 }}</td>
                    <td style="padding: 0">
                      <div class="gi-group">
                        <input
                          v-model="row.NomorSPK"
                          class="gi"
                          style="text-transform: uppercase"
                          placeholder="F1 / Enter"
                          @keydown="
                            (e) => onSpkKeydown(e, 'sewing', idx as number)
                          "
                          @keydown.enter.prevent="
                            onSpkEnter('sewing', idx as number)
                          "
                        />
                        <button
                          class="btn-gi-lkp"
                          :class="{ loading: row._spkLoading }"
                          @click="openSpkModal('sewing', idx as number)"
                        >
                          <IconSearch :size="11" />
                        </button>
                      </div>
                    </td>
                    <td class="ro-cell" :title="row._spkDetail">
                      {{ row.NamaSPK || "—" }}
                    </td>
                    <td class="ro-cell tr">
                      {{ row.QtySPK ? fmt(row.QtySPK) : "—" }}
                    </td>
                    <td style="padding: 0">
                      <input
                        type="date"
                        v-model="row.plan_tgl_jadwal"
                        class="gi"
                        :min="formData.pl_tgl1"
                        :max="formData.pl_tgl2"
                        @change="clampToPeriode('sewing', idx as number)"
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_wip"
                        min="0"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_qty_po"
                        min="0"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_qty_jadwal"
                        min="0"
                        class="gi tr yellow-cell"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <select
                        v-model="row.plan_line_kelompok"
                        class="gi gi-sel"
                      >
                        <option value="">-- Pilih --</option>
                        <option v-for="l in LINE_OPTIONS" :key="l" :value="l">
                          {{ l }}
                        </option>
                      </select>
                    </td>
                    <td class="tc" style="padding: 0">
                      <button
                        type="button"
                        class="btn-del"
                        @click="removeRow('sewing', idx as number)"
                      >
                        <IconTrash :size="12" />
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!formData.detail.sewing.length">
                    <td colspan="10" class="empty-row">Klik + Tambah Baris</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-tabs-window-item>

          <!-- ── Tab Koli ── -->
          <v-tabs-window-item value="koli" class="tab-pane">
            <div class="tab-info">
              Periode: <b>{{ formData.pl_tgl1 }}</b> s/d
              <b>{{ formData.pl_tgl2 }}</b>
            </div>
            <div class="tbl-hdr orange">
              <span>Divisi Koli</span>
              <button type="button" class="btn-add" @click="addRow('koli')">
                <IconPlus :size="12" /> Tambah Baris
              </button>
            </div>
            <div class="tbl-wrap">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 28px">No</th>
                    <th style="width: 130px">Nomor SPK</th>
                    <th style="width: 220px">Nama SPK</th>
                    <th style="width: 75px" class="tr">Qty SPK</th>
                    <th style="width: 110px">Tgl Jadwal</th>
                    <th style="width: 80px" class="tr">WIP</th>
                    <th style="width: 80px" class="tr">Qty PO</th>
                    <th style="width: 85px" class="tr bg-yellow">Qty Jadwal</th>
                    <th style="width: 32px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, idx) in formData.detail.koli"
                    :key="row._key"
                  >
                    <td class="tc lbl-cell">{{ (idx as number) + 1 }}</td>
                    <td style="padding: 0">
                      <div class="gi-group">
                        <input
                          v-model="row.NomorSPK"
                          class="gi"
                          style="text-transform: uppercase"
                          placeholder="F1 / Enter"
                          @keydown="
                            (e) => onSpkKeydown(e, 'koli', idx as number)
                          "
                          @keydown.enter.prevent="
                            onSpkEnter('koli', idx as number)
                          "
                        />
                        <button
                          class="btn-gi-lkp"
                          :class="{ loading: row._spkLoading }"
                          @click="openSpkModal('koli', idx as number)"
                        >
                          <IconSearch :size="11" />
                        </button>
                      </div>
                    </td>
                    <td class="ro-cell" :title="row._spkDetail">
                      {{ row.NamaSPK || "—" }}
                    </td>
                    <td class="ro-cell tr">
                      {{ row.QtySPK ? fmt(row.QtySPK) : "—" }}
                    </td>
                    <td style="padding: 0">
                      <input
                        type="date"
                        v-model="row.plan_tgl_jadwal"
                        class="gi"
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_wip"
                        min="0"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_qty_po"
                        min="0"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="date"
                        v-model="row.plan_tgl_jadwal"
                        class="gi"
                        :min="formData.pl_tgl1"
                        :max="formData.pl_tgl2"
                        @change="clampToPeriode('koli', idx as number)"
                      />
                    </td>
                    <td class="tc" style="padding: 0">
                      <button
                        type="button"
                        class="btn-del"
                        @click="removeRow('koli', idx as number)"
                      >
                        <IconTrash :size="12" />
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!formData.detail.koli.length">
                    <td colspan="9" class="empty-row">Klik + Tambah Baris</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </div>
    </template>
  </BaseForm>

  <!-- SPK Modal -->
  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="spk-ppic"
    @selected="onSpkSelected"
  />

  <!-- Dialog Riwayat -->
  <v-dialog v-model="showRiwayatDialog" max-width="750">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-blue-grey-darken-2 text-white pa-3 text-subtitle-1 font-weight-bold d-flex align-center gap-2"
      >
        <IconHistory :size="16" />
        Riwayat Planning — SPK Terkait
      </v-card-title>
      <v-card-text class="pa-0">
        <div
          v-if="riwayatLoading"
          class="pa-4 text-center text-caption text-grey"
        >
          Memuat riwayat...
        </div>
        <table v-else class="rt w-100">
          <thead>
            <tr>
              <th>Nomor Plan</th>
              <th>Tgl Awal</th>
              <th>Tgl Akhir</th>
              <th>Cab</th>
              <th>Status</th>
              <th>Nomor SPK</th>
              <th>Nama SPK</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in riwayat" :key="i">
              <td class="mono">{{ r.Nomor }}</td>
              <td>{{ r.Tgl1 }}</td>
              <td>{{ r.Tgl2 }}</td>
              <td>{{ r.Cabang }}</td>
              <td>
                <span :class="r.Close === 'Y' ? 'badge-grey' : 'badge-green'">
                  {{ r.Close === "Y" ? "Closed" : "Open" }}
                </span>
              </td>
              <td class="mono">{{ r.NomorSPK }}</td>
              <td>{{ r.NamaSPK || "—" }}</td>
              <td>{{ r.Keterangan || "—" }}</td>
            </tr>
            <tr v-if="!riwayat.length">
              <td colspan="8" class="empty-row">
                Belum ada riwayat planning untuk SPK-SPK ini
              </td>
            </tr>
          </tbody>
        </table>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" @click="showRiwayatDialog = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.lc-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  gap: 0;
}
.sec-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  box-sizing: border-box;
}
.sec-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #1565c0;
  margin-bottom: 2px;
}
.mt-2 {
  margin-top: 8px;
}
.fr {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
  width: 100%;
  box-sizing: border-box;
}
.lbl {
  width: 82px;
  min-width: 82px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.inp,
.idate {
  flex: 1;
  min-width: 0;
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
  font-family: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inp:focus,
.idate:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f4f8 !important;
  color: #555 !important;
  cursor: default;
}

/* SPK Summary di left column */
.spk-summary {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.spk-summary-tab {
  font-size: 10px;
  font-weight: 700;
  color: #546e7a;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.spk-summary-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  padding-left: 8px;
}
.spk-summary-nama {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #424242;
}
.spk-summary-qty {
  color: #1565c0;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Right column */
.rc-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.tab-header {
  flex-shrink: 0;
  border-bottom: 2px solid #e0e0e0;
}
.tab-item {
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  min-width: 110px !important;
}
.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.tab-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 !important;
}
.tab-info {
  font-size: 10px;
  color: #555;
  padding: 4px 10px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.tbl-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.tbl-hdr.blue {
  background: #1565c0;
  color: white;
}
.tbl-hdr.green {
  background: #2e7d32;
  color: white;
}
.tbl-hdr.orange {
  background: #e65100;
  color: white;
}
.btn-add {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}
.btn-add:hover {
  background: rgba(255, 255, 255, 0.35);
}

.tbl-wrap {
  flex: 1;
  overflow: auto;
  min-height: 0;
  border: 1px solid #bdbdbd;
  border-top: none;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  white-space: nowrap;
}
.gt thead th {
  background: #455a64;
  color: white;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 2px solid #37474f;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  padding: 4px 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt thead th.tr {
  text-align: right;
}
.gt thead th.bg-yellow {
  background: #f9a825 !important;
  color: #000;
}
.gt tbody td {
  border-bottom: 1px solid #eee;
  border-right: 1px solid #f0f0f0;
  height: 26px;
  vertical-align: middle;
}
.gt tbody tr:nth-of-type(even) td {
  background: rgba(0, 0, 0, 0.013);
}
.gt tbody tr:hover td {
  background: #e8f5e9 !important;
}
.lbl-cell {
  text-align: center;
  background: #f5f5f5;
  font-size: 10px;
  color: #777;
  padding: 0 4px;
}
.ro-cell {
  padding: 0 6px;
  font-size: 11px;
  color: #555;
  background: #f5f5f5 !important;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.gi {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}
.gi:focus {
  background: #e3f2fd !important;
  box-shadow: inset 0 0 0 1.5px #1976d2;
}
.gi-sel {
  cursor: pointer;
}
.yellow-cell {
  background: #fffde7 !important;
}
.gi-group {
  display: flex;
  align-items: center;
  height: 25px;
}
.gi-group .gi {
  flex: 1;
}
.btn-gi-lkp {
  background: #1565c0;
  color: white;
  border: none;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 2px;
  margin-right: 2px;
}
.btn-gi-lkp:hover {
  background: #0d47a1;
}
.btn-gi-lkp.loading {
  opacity: 0.6;
  cursor: wait;
}
.btn-del {
  width: 100%;
  height: 25px;
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-del:hover {
  background: #ffebee;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
  font-size: 11px;
}

/* Riwayat table */
.rt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.rt thead th {
  background: #37474f;
  color: white;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.rt tbody td {
  padding: 3px 8px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}
.w-100 {
  width: 100%;
}
.mono {
  font-family: monospace;
  font-size: 10px;
}
.badge-green {
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 2px;
}
.badge-grey {
  background: #f5f5f5;
  color: #757575;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 2px;
}

:deep(.v-tabs-window) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
:deep(.v-tabs-window-item) {
  height: 100%;
}
</style>
