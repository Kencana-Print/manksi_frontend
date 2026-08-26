<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import { agendaKerjaService } from "@/services/tools/agendaKerjaService";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconCheck,
  IconTrash,
  IconPencil,
  IconBan,
  IconLock,
  IconExternalLink,
} from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(["update:modelValue", "updated"]);

const authStore = useAuthStore();
const toast = useToast();
const router = useRouter();

const currentDate = ref(new Date());
const items = ref<any[]>([]);
const isLoading = ref(false);
const isPic = ref(false); // ← baru
const confirmDeleteDialog = ref(false);
const deleteTarget = ref<any>(null);
const viewMode = ref<"month" | "week">("month");

const selectedDay = ref("");
const showForm = ref(false);
const editingNomor = ref("");
const formData = ref({
  ag_tanggal: "",
  ag_judul: "",
  ag_keterangan: "",
});

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = toDateStr(new Date());

const monthLabel = computed(() =>
  currentDate.value.toLocaleDateString("id-ID", { month: "long" }),
);
const yearLabel = computed(() => currentDate.value.getFullYear());
const monthStart = computed(
  () =>
    new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1),
);
const monthEnd = computed(
  () =>
    new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() + 1,
      0,
    ),
);

// Index hari terpilih (atau hari ini kalau belum pilih) di dalam grid bulan
const weekDays = computed(() => {
  const allDays = calendarDays.value;
  const anchorStr = selectedDay.value || todayStr;
  let idx = allDays.findIndex((d) => toDateStr(d.date) === anchorStr);
  if (idx === -1) idx = 0;
  const weekStartIdx = Math.floor(idx / 7) * 7;
  return allDays.slice(weekStartIdx, weekStartIdx + 7);
});

const visibleDays = computed(() =>
  viewMode.value === "week" ? weekDays.value : calendarDays.value,
);

const weekLabel = computed(() => {
  if (viewMode.value !== "week" || weekDays.value.length === 0) return "";
  const first = weekDays.value[0].date;
  const last = weekDays.value[6].date;
  const fmt = (d: Date) =>
    `${d.getDate()} ${d.toLocaleDateString("id-ID", { month: "short" })}`;
  return `${fmt(first)} - ${fmt(last)}`;
});

const dayNames = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];

const calendarDays = computed(() => {
  const start = monthStart.value;
  const end = monthEnd.value;
  const startDow = (start.getDay() + 6) % 7;
  const endDow = (end.getDay() + 6) % 7;
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = startDow; i > 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    days.push({ date: d, inMonth: false });
  }
  for (let d = 1; d <= end.getDate(); d++) {
    days.push({
      date: new Date(start.getFullYear(), start.getMonth(), d),
      inMonth: true,
    });
  }
  for (let i = 1; i < 7 - endDow; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() + i);
    days.push({ date: d, inMonth: false });
  }
  return days;
});

const sourceColorClass = (sumber: string) => {
  if (sumber === "MAP") return "src-map";
  if (sumber === "SO") return "src-so";
  return ""; // manual tetap pakai class st-open/st-selesai/st-batal yang sudah ada
};

// Mirror PRIVILEGED_BAGIAN di backend (agendaKerjaService.js) — HANYA
// dipakai buat nentuin tampilan legend, BUKAN buat security (security
// tetap sepenuhnya dikontrol backend, ini murni kosmetik biar gak
// nampilin dot MAP/SO ke bagian yang emang gak akan pernah lihat itemnya).
const PRIVILEGED_BAGIAN = ["DIREKSI", "OWNER", "AUDIT", "EDP", "IT"];
const showAutoDerivedLegend = computed(() => {
  const bagian = (authStore.user?.bagian || "").toUpperCase();
  return PRIVILEGED_BAGIAN.includes(bagian) || bagian === "MARKETING";
});

const itemsByDate = computed(() => {
  const map: Record<string, any[]> = {};
  for (const it of items.value) {
    const key = String(it.Tanggal).substring(0, 10);
    if (!map[key]) map[key] = [];
    map[key].push(it);
  }
  return map;
});

const selectedDayItems = computed(
  () => itemsByDate.value[selectedDay.value] || [],
);
const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return "";
  const [y, m, d] = selectedDay.value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});

const fetchMonth = async () => {
  isLoading.value = true;
  try {
    const res = await agendaKerjaService.getBrowse(
      toDateStr(monthStart.value),
      toDateStr(monthEnd.value),
    );
    items.value = res.data.data || [];
  } catch {
    toast.error("Gagal memuat agenda.");
  } finally {
    isLoading.value = false;
  }
};

const loadIsPic = async () => {
  try {
    const res = await agendaKerjaService.getIsPic();
    isPic.value = !!res.data.data?.isPic;
  } catch {
    isPic.value = false;
  }
};

const goToday = () => {
  currentDate.value = new Date();
  selectedDay.value = todayStr;
  fetchMonth();
};
const prevMonth = () => {
  if (viewMode.value === "week") {
    const newAnchor = new Date(weekDays.value[0].date);
    newAnchor.setDate(newAnchor.getDate() - 1);
    currentDate.value = newAnchor;
    selectedDay.value = toDateStr(newAnchor);
    fetchMonth();
  } else {
    currentDate.value = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() - 1,
      1,
    );
    fetchMonth();
  }
};
const nextMonth = () => {
  if (viewMode.value === "week") {
    const newAnchor = new Date(weekDays.value[6].date);
    newAnchor.setDate(newAnchor.getDate() + 1);
    currentDate.value = newAnchor;
    selectedDay.value = toDateStr(newAnchor);
    fetchMonth();
  } else {
    currentDate.value = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() + 1,
      1,
    );
    fetchMonth();
  }
};

const openDay = (dateStr: string) => {
  selectedDay.value = dateStr;
  showForm.value = false;
};

const openCreate = () => {
  if (!isPic.value) {
    toast.warning("Anda bukan PIC agenda untuk bagian/cabang ini.");
    return;
  }
  editingNomor.value = "";
  formData.value = {
    ag_tanggal: selectedDay.value || todayStr,
    ag_judul: "",
    ag_keterangan: "",
  };
  showForm.value = true;
};

const openEdit = (item: any) => {
  editingNomor.value = item.Nomor;
  formData.value = {
    ag_tanggal: String(item.Tanggal).substring(0, 10),
    ag_judul: item.Judul,
    ag_keterangan: item.Keterangan || "",
  };
  showForm.value = true;
};

const submitForm = async () => {
  if (!formData.value.ag_judul.trim())
    return toast.warning("Judul harus diisi.");
  try {
    const payload = editingNomor.value
      ? { ...formData.value, ag_nomor: editingNomor.value }
      : formData.value;
    await agendaKerjaService.save(payload);
    toast.success("Agenda berhasil disimpan.");
    showForm.value = false;
    await fetchMonth();
    emit("updated");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan agenda.");
  }
};

const markStatus = async (item: any, status: string) => {
  try {
    await agendaKerjaService.updateStatus(item.Nomor, status);
    toast.success(`Agenda ditandai ${status}.`);
    await fetchMonth();
    emit("updated");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengubah status.");
  }
};

const openSourceDoc = (it: any) => {
  const routeName = it.Sumber === "MAP" ? "MapFormEdit" : "SalesOrderEdit";
  const url = router.resolve({
    name: routeName,
    params: { nomor: encodeURIComponent(it.Nomor) },
  }).href;
  window.open(url, "_blank");
};

const askDelete = (item: any) => {
  deleteTarget.value = item;
  confirmDeleteDialog.value = true;
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  try {
    await agendaKerjaService.remove(deleteTarget.value.Nomor);
    toast.success("Agenda dihapus.");
    confirmDeleteDialog.value = false;
    await fetchMonth();
    emit("updated");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus agenda.");
  }
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      currentDate.value = new Date();
      selectedDay.value = todayStr;
      showForm.value = false;
      fetchMonth();
      loadIsPic();
    }
  },
);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    width="90vw"
    max-width="1400px"
  >
    <div class="agk-card">
      <div class="agk-header">
        <span>Agenda Kerja</span>
        <button class="agk-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <div class="agk-body">
        <div class="agk-cal">
          <div class="agk-cal-top">
            <div>
              <div class="agk-month">
                {{ viewMode === "week" ? weekLabel : monthLabel }}
              </div>
              <div class="agk-year">{{ yearLabel }}</div>
            </div>
            <div class="agk-cal-nav">
              <div class="agk-view-toggle">
                <button
                  class="agk-toggle-btn"
                  :class="{ active: viewMode === 'month' }"
                  @click="viewMode = 'month'"
                >
                  Bulan
                </button>
                <button
                  class="agk-toggle-btn"
                  :class="{ active: viewMode === 'week' }"
                  @click="viewMode = 'week'"
                >
                  Minggu
                </button>
              </div>
              <button class="agk-btn-sm" @click="goToday">Hari ini</button>
              <button class="agk-icon-btn" @click="prevMonth">
                <IconChevronLeft :size="15" />
              </button>
              <button class="agk-icon-btn" @click="nextMonth">
                <IconChevronRight :size="15" />
              </button>
            </div>
          </div>

          <div class="agk-legend">
            <span class="agk-dot dot-open"></span> OPEN
            <span class="agk-dot dot-selesai"></span> SELESAI
            <span class="agk-dot dot-batal"></span> BATAL
          </div>

          <template v-if="viewMode === 'month'">
            <div class="agk-grid-head">
              <div v-for="d in dayNames" :key="d">{{ d }}</div>
            </div>
            <div class="agk-grid">
              <div
                v-for="(day, idx) in calendarDays"
                :key="idx"
                class="agk-cell"
                :class="{
                  'out-month': !day.inMonth,
                  today: toDateStr(day.date) === todayStr,
                  selected: toDateStr(day.date) === selectedDay,
                }"
                @click="openDay(toDateStr(day.date))"
              >
                <div class="agk-cell-num">{{ day.date.getDate() }}</div>
                <div
                  v-for="(it, i) in (
                    itemsByDate[toDateStr(day.date)] || []
                  ).slice(0, 2)"
                  :key="i"
                  class="agk-cell-item"
                  :class="`st-${it.Status.toLowerCase()}`"
                  :title="it.Judul"
                >
                  {{ it.Judul }}
                </div>
                <div
                  v-if="(itemsByDate[toDateStr(day.date)] || []).length > 2"
                  class="agk-cell-more"
                >
                  +{{ (itemsByDate[toDateStr(day.date)] || []).length - 2 }}
                  lagi
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="agk-week-list">
              <div
                v-for="(day, idx) in weekDays"
                :key="idx"
                class="agk-week-row"
                :class="{
                  today: toDateStr(day.date) === todayStr,
                  selected: toDateStr(day.date) === selectedDay,
                }"
                @click="openDay(toDateStr(day.date))"
              >
                <div class="agk-week-daylabel">
                  <div class="agk-week-dayname">{{ dayNames[idx] }}</div>
                  <div class="agk-week-daynum">{{ day.date.getDate() }}</div>
                </div>
                <div class="agk-week-items">
                  <template
                    v-if="(itemsByDate[toDateStr(day.date)] || []).length > 0"
                  >
                    <span
                      v-for="(it, i) in itemsByDate[toDateStr(day.date)]"
                      :key="i"
                      class="agk-week-chip"
                      :class="`st-${it.Status.toLowerCase()}`"
                      :title="it.Judul"
                    >
                      {{ it.Judul }}
                    </span>
                  </template>
                  <span v-else class="agk-week-empty">Tidak ada agenda</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="agk-side">
          <div class="agk-side-head">
            <span>{{ selectedDayLabel }}</span>
            <button
              class="agk-btn-add"
              :class="{ disabled: !isPic }"
              :title="isPic ? '' : 'Anda bukan PIC agenda bagian ini'"
              @click="openCreate"
            >
              <IconLock v-if="!isPic" :size="13" />
              <IconPlus v-else :size="13" />
              Tambah
            </button>
          </div>

          <div v-if="showForm" class="agk-form">
            <label class="agk-lbl">Tanggal</label>
            <input type="date" v-model="formData.ag_tanggal" class="agk-inp" />
            <label class="agk-lbl">Judul</label>
            <input
              v-model="formData.ag_judul"
              class="agk-inp"
              placeholder="Judul agenda..."
            />
            <label class="agk-lbl">Keterangan</label>
            <textarea
              v-model="formData.ag_keterangan"
              class="agk-inp"
              rows="2"
            ></textarea>
            <div class="agk-form-actions">
              <button class="agk-btn-sm" @click="showForm = false">
                Batal
              </button>
              <button class="agk-btn-primary" @click="submitForm">
                Simpan
              </button>
            </div>
          </div>

          <div v-else class="agk-list">
            <div v-if="isLoading" class="agk-empty">Memuat...</div>
            <div v-else-if="!selectedDayItems.length" class="agk-empty">
              Belum ada agenda.
            </div>
            <div
              v-for="it in selectedDayItems"
              :key="it.Nomor"
              class="agk-item"
              :class="`st-${it.Status.toLowerCase()}`"
            >
              <div class="agk-item-top">
                <span class="agk-item-judul">{{ it.Judul }}</span>
                <span class="agk-item-status">{{ it.Status }}</span>
              </div>
              <div v-if="it.Keterangan" class="agk-item-ket">
                {{ it.Keterangan }}
              </div>
              <div
                class="agk-item-actions"
                v-if="it.UserCreate === authStore.user?.kode"
              >
                <button
                  class="agk-mini-btn"
                  title="Selesai"
                  @click="markStatus(it, 'SELESAI')"
                >
                  <IconCheck :size="12" />
                </button>
                <button
                  class="agk-mini-btn"
                  title="Batal"
                  @click="markStatus(it, 'BATAL')"
                >
                  <IconBan :size="12" />
                </button>
                <button class="agk-mini-btn" title="Edit" @click="openEdit(it)">
                  <IconPencil :size="12" />
                </button>
                <button
                  class="agk-mini-btn danger"
                  title="Hapus"
                  @click="askDelete(it)"
                >
                  <IconTrash :size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </v-dialog>

  <v-dialog v-model="confirmDeleteDialog" max-width="380px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #c62828">
        <IconTrash :size="14" color="white" class="mr-2" />
        Konfirmasi Hapus Agenda
        <button class="dlg-x" @click="confirmDeleteDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        Hapus agenda <b>{{ deleteTarget?.Judul }}</b
        >?
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          style="background: #c62828"
          @click="doDelete"
        >
          Ya, Hapus
        </button>
        <button class="dlg-btn cancel" @click="confirmDeleteDialog = false">
          Batal
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.agk-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.agk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
}
.agk-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
}
.agk-close:hover {
  color: white;
}
.agk-body {
  display: flex;
  gap: 0;
  max-height: 85vh;
}
.agk-cal {
  flex: 1.6;
  padding: 14px;
  overflow-y: auto;
  border-right: 1px solid #e0e0e0;
}
.agk-side {
  flex: 1;
  padding: 14px;
  overflow-y: auto;
  background: #fafafa;
}

.agk-cal-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.agk-month {
  font-size: 18px;
  font-weight: 700;
  color: #212121;
}
.agk-year {
  font-size: 12px;
  color: #757575;
}
.agk-cal-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.agk-btn-sm {
  height: 26px;
  padding: 0 10px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}
.agk-btn-sm:hover {
  background: #f5f5f5;
}
.agk-icon-btn {
  width: 26px;
  height: 26px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.agk-icon-btn:hover {
  background: #f5f5f5;
}

.agk-legend {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 10px;
  color: #616161;
  margin-bottom: 8px;
}
.agk-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 3px;
}
.dot-open {
  background: #e53935;
}
.dot-selesai {
  background: #2e7d32;
}
.dot-batal {
  background: #9e9e9e;
}

.agk-grid-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  font-size: 10px;
  font-weight: 700;
  color: #757575;
  text-align: center;
  padding: 4px 0;
  border-bottom: 1px solid #e0e0e0;
}
.agk-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-left: 1px solid #eee;
  border-top: 1px solid #eee;
}
.agk-cell {
  min-height: 100px;
  border-right: 1px solid #eee;
  border-bottom: 1px solid #eee;
  padding: 4px 6px;
  cursor: pointer;
  font-size: 10.5px;
  overflow: hidden;
}
.agk-cell:hover {
  background: #f5f9ff;
}
.agk-cell.out-month {
  color: #bdbdbd;
  background: #fafafa;
}
.agk-cell.today .agk-cell-num {
  color: #d32f2f;
  font-weight: 700;
}
.agk-cell.selected {
  background: #e3f2fd;
}
.agk-cell-num {
  font-size: 12px;
  margin-bottom: 2px;
}
.agk-cell-item {
  background: #e8f0fe;
  color: #1565c0;
  border-radius: 3px;
  padding: 1px 4px;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10.5px;
}
.agk-cell-item.st-selesai {
  background: #e8f5e9;
  color: #2e7d32;
}
.agk-cell-item.st-batal {
  background: #f5f5f5;
  color: #9e9e9e;
  text-decoration: line-through;
}
.agk-cell-more {
  font-size: 9px;
  color: #757575;
}

.agk-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: 700;
  font-size: 12px;
  color: #212121;
}
.agk-btn-add {
  height: 26px;
  padding: 0 10px;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.agk-btn-add:hover {
  opacity: 0.9;
}

.agk-lbl {
  display: block;
  font-size: 10.5px;
  font-weight: 600;
  color: #555;
  margin: 6px 0 2px;
}
.agk-inp {
  width: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 5px 7px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}
.agk-inp:focus {
  border-color: #1565c0;
}
.agk-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 10px;
}
.agk-btn-primary {
  height: 28px;
  padding: 0 12px;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.agk-empty {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 24px 0;
  font-size: 11px;
}
.agk-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: white;
}
.agk-item.st-selesai {
  border-color: #a5d6a7;
  background: #f1f8f2;
}
.agk-item.st-batal {
  opacity: 0.6;
}
.agk-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.agk-item-judul {
  font-weight: 700;
  font-size: 12px;
  color: #212121;
}
.agk-item-status {
  font-size: 9px;
  font-weight: 700;
  color: #757575;
}
.agk-item-ket {
  font-size: 10.5px;
  color: #616161;
  margin-top: 3px;
}
.agk-item-pic {
  font-size: 10px;
  color: #1565c0;
  margin-top: 4px;
  font-weight: 600;
}
.agk-item-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}
.agk-mini-btn {
  width: 22px;
  height: 22px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #616161;
}
.agk-mini-btn:hover {
  background: #f5f5f5;
}
.agk-mini-btn.danger {
  color: #c62828;
}
.agk-btn-add.disabled {
  background: #bdbdbd;
  cursor: not-allowed;
}
.agk-btn-add.disabled:hover {
  opacity: 1;
}
.close-dlg {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-family: "Segoe UI", sans-serif;
  font-size: 12px;
}
.close-dlg-header {
  display: flex;
  align-items: center;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  gap: 4px;
}
.dlg-x {
  margin-left: auto;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}
.dlg-x:hover {
  color: white;
}
.close-dlg-body {
  padding: 16px 14px;
  font-size: 12px;
  color: #212121;
}
.close-dlg-footer {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}
.dlg-btn {
  height: 28px;
  padding: 0 14px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.dlg-btn.cancel {
  background: #e0e0e0;
  color: #424242;
  margin-left: auto;
}
.dlg-btn.cancel:hover {
  background: #d6d6d6;
}
.agk-open-btn:hover {
  background: #f5f5f5;
}
.agk-view-toggle {
  display: flex;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 4px;
}
.agk-toggle-btn {
  height: 26px;
  padding: 0 10px;
  border: none;
  background: white;
  font-size: 11px;
  cursor: pointer;
  color: #616161;
}
.agk-toggle-btn.active {
  background: #1565c0;
  color: white;
}
.agk-toggle-btn:hover:not(.active) {
  background: #f0f0f0;
}

.agk-week-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
}
.agk-week-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.1s;
}
.agk-week-row:last-child {
  border-bottom: none;
}
.agk-week-row:hover {
  background: #fafafa;
}
.agk-week-row.selected {
  background: #e3f2fd;
}
.agk-week-row.today .agk-week-daynum {
  color: #d32f2f;
  font-weight: 700;
}

.agk-week-daylabel {
  flex-shrink: 0;
  width: 56px;
  text-align: center;
}
.agk-week-dayname {
  font-size: 10px;
  font-weight: 700;
  color: #757575;
  text-transform: uppercase;
}
.agk-week-daynum {
  font-size: 18px;
  font-weight: 600;
  color: #212121;
  margin-top: 2px;
}

.agk-week-items {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: flex-start;
  padding-top: 2px;
}
.agk-week-chip {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
  background: #e8f0fe;
  color: #1565c0;
}
.agk-week-chip.st-selesai {
  background: #e8f5e9;
  color: #2e7d32;
}
.agk-week-chip.st-batal {
  background: #f5f5f5;
  color: #9e9e9e;
  text-decoration: line-through;
}
.agk-week-empty {
  font-size: 11px;
  color: #bdbdbd;
  font-style: italic;
  padding: 3px 0;
}
</style>
