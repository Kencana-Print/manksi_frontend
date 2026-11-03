<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import {
  IconFileText,
  IconUpload,
  IconTrash,
  IconExternalLink,
} from "@tabler/icons-vue";
import { useMemoInternal } from "@/composables/useMemoInternal";
import {
  memoInternalService,
  type MemoItem,
} from "@/services/tools/memoInternalService";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();
const { isOpen, closeMemoDialog, refreshUnread } = useMemoInternal();

const MAKS_BYTE = 10 * 1024 * 1024;

const items = ref<MemoItem[]>([]);
const bolehUpload = ref(false);
const isLoading = ref(false);
const bukaId = ref<number | null>(null);

// Pesan error; respons blob (saat gagal mengambil PDF) dibaca sebagai JSON
const errMsg = async (e: unknown, fallback: string): Promise<string> => {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const j = JSON.parse(await data.text()) as { message?: string };
      return j.message || fallback;
    } catch {
      return fallback;
    }
  }
  return (data as { message?: string } | undefined)?.message || fallback;
};

const isBaru = (m: MemoItem) => m.notif && !m.sudahBaca;

// Yang belum dibaca di atas, urutan tanggal dari server dipertahankan
const daftar = computed(() => [
  ...items.value.filter(isBaru),
  ...items.value.filter((m) => !isBaru(m)),
]);

const fetchList = async () => {
  isLoading.value = true;
  try {
    const res = await memoInternalService.getList();
    items.value = res.data.data?.items ?? [];
    bolehUpload.value = !!res.data.data?.bolehUpload;
  } catch (e) {
    toast.error(await errMsg(e, "Gagal memuat memo internal."));
  } finally {
    isLoading.value = false;
  }
};

const fmtUkuran = (b: number): string =>
  b >= 1024 * 1024
    ? `${(b / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;

// ── Buka PDF (tab baru). Tab dibuka dulu agar tidak diblokir pop-up blocker ──
const bukaPdf = async (m: MemoItem) => {
  const w = window.open("", "_blank");
  if (!w) {
    toast.warning(
      "Pop-up diblokir browser. Izinkan pop-up untuk membuka memo.",
    );
    return;
  }
  bukaId.value = m.id;
  try {
    const res = await memoInternalService.getFile(m.id);
    const url = URL.createObjectURL(
      new Blob([res.data], { type: "application/pdf" }),
    );
    w.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    m.sudahBaca = true;
    await refreshUnread();
  } catch (e) {
    w.close();
    toast.error(await errMsg(e, "Gagal membuka memo."));
  } finally {
    bukaId.value = null;
  }
};

// ── Unggah (hanya bila server mengizinkan) ──
const showUpload = ref(false);
const isUploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const form = ref({
  judul: "",
  nomor: "",
  tanggal: hariIni(),
  keterangan: "",
  notif: true,
  file: null as File | null,
});

const resetForm = () => {
  form.value = {
    judul: "",
    nomor: "",
    tanggal: hariIni(),
    keterangan: "",
    notif: true,
    file: null,
  };
  if (fileInput.value) fileInput.value.value = "";
};

const onPilihFile = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null;
  if (f && !/\.pdf$/i.test(f.name)) {
    toast.warning("File harus berupa PDF.");
    resetForm();
    return;
  }
  if (f && f.size > MAKS_BYTE) {
    toast.warning("Ukuran PDF maksimal 10 MB.");
    if (fileInput.value) fileInput.value.value = "";
    form.value.file = null;
    return;
  }
  form.value.file = f;
};

const unggah = async () => {
  const f = form.value;
  if (!f.judul.trim()) return toast.warning("Judul memo wajib diisi.");
  if (!f.tanggal) return toast.warning("Tanggal memo wajib diisi.");
  if (!f.file) return toast.warning("Pilih file PDF terlebih dahulu.");
  isUploading.value = true;
  try {
    await memoInternalService.upload({
      judul: f.judul.trim(),
      nomor: f.nomor.trim(),
      tanggal: f.tanggal,
      keterangan: f.keterangan.trim(),
      notif: f.notif,
      file: f.file,
    });
    toast.success(
      f.notif
        ? "Memo diunggah dan notifikasi dikirim ke semua user."
        : "Memo diunggah tanpa notifikasi.",
    );
    resetForm();
    showUpload.value = false;
    await fetchList();
    await refreshUnread();
  } catch (e) {
    toast.error(await errMsg(e, "Gagal mengunggah memo."));
  } finally {
    isUploading.value = false;
  }
};

// ── Hapus ──
const hapusTarget = ref<MemoItem | null>(null);
const isDeleting = ref(false);

const hapus = async () => {
  const t = hapusTarget.value;
  if (!t) return;
  isDeleting.value = true;
  try {
    await memoInternalService.hapus(t.id);
    toast.success("Memo dihapus.");
    hapusTarget.value = null;
    await fetchList();
    await refreshUnread();
  } catch (e) {
    toast.error(await errMsg(e, "Gagal menghapus memo."));
  } finally {
    isDeleting.value = false;
  }
};

watch(isOpen, (val) => {
  if (val) {
    resetForm();
    showUpload.value = false;
    void fetchList();
  }
});
</script>

<template>
  <v-dialog v-model="isOpen" max-width="720px" scrollable>
    <div class="mid-card">
      <!-- Header -->
      <div class="mid-header">
        <div class="mid-icon-wrap">
          <IconFileText :size="18" :stroke-width="1.8" color="white" />
        </div>
        <div>
          <div class="mid-title">Memo Internal</div>
          <div class="mid-sub">Dokumen memo resmi perusahaan (PDF)</div>
        </div>
        <button class="mid-close" @click="closeMemoDialog">✕</button>
      </div>

      <!-- Body -->
      <div class="mid-body">
        <!-- Unggah -->
        <div v-if="bolehUpload" class="mid-upload">
          <button
            v-if="!showUpload"
            type="button"
            class="mid-btn-primary"
            @click="showUpload = true"
          >
            <IconUpload
              :size="13"
              :stroke-width="2"
              style="margin-right: 5px"
            />
            Unggah Memo
          </button>

          <div v-else class="mid-form">
            <div class="mid-form-title">Unggah Memo Baru</div>
            <div class="mid-row">
              <label class="mid-lbl">Judul *</label>
              <input
                v-model="form.judul"
                class="mid-inp"
                maxlength="200"
                :disabled="isUploading"
              />
            </div>
            <div class="mid-row">
              <label class="mid-lbl">No. Memo</label>
              <input
                v-model="form.nomor"
                class="mid-inp"
                style="max-width: 200px"
                maxlength="50"
                :disabled="isUploading"
              />
              <label class="mid-lbl" style="width: 60px; margin-left: 8px"
                >Tanggal *</label
              >
              <input
                v-model="form.tanggal"
                type="date"
                class="mid-inp"
                style="max-width: 150px"
                :disabled="isUploading"
              />
            </div>
            <div class="mid-row">
              <label class="mid-lbl">Keterangan</label>
              <input
                v-model="form.keterangan"
                class="mid-inp"
                maxlength="255"
                :disabled="isUploading"
              />
            </div>
            <div class="mid-row">
              <label class="mid-lbl">File PDF *</label>
              <input
                ref="fileInput"
                type="file"
                accept="application/pdf,.pdf"
                :disabled="isUploading"
                @change="onPilihFile"
              />
              <span class="mid-hint">maks. 10 MB</span>
            </div>
            <label class="mid-check">
              <input
                v-model="form.notif"
                type="checkbox"
                :disabled="isUploading"
              />
              Kirim notifikasi ke semua user
              <span class="mid-hint"
                >(matikan untuk mengunggah arsip lama)</span
              >
            </label>
            <div class="mid-form-actions">
              <button
                type="button"
                class="mid-btn-cancel"
                :disabled="isUploading"
                @click="
                  showUpload = false;
                  resetForm();
                "
              >
                Batal
              </button>
              <button
                type="button"
                class="mid-btn-primary"
                :disabled="isUploading"
                @click="unggah"
              >
                <span v-if="isUploading" class="mid-spinner" />
                {{ isUploading ? "Mengunggah..." : "Unggah" }}
              </button>
            </div>
          </div>
        </div>

        <!-- Daftar -->
        <div v-if="isLoading" class="mid-state">Memuat memo...</div>
        <div v-else-if="!daftar.length" class="mid-state">
          Belum ada memo internal.
        </div>
        <div v-else class="mid-list">
          <div
            v-for="m in daftar"
            :key="m.id"
            class="mid-item"
            :class="{ 'mid-item-baru': isBaru(m) }"
          >
            <div class="mid-item-main">
              <div class="mid-item-judul">
                <span v-if="isBaru(m)" class="mid-chip-baru">BARU</span>
                {{ m.judul }}
              </div>
              <div class="mid-item-meta">
                <span v-if="m.nomor">{{ m.nomor }} · </span>
                {{ formatTanggal(m.tanggal) }} · diunggah {{ m.userNama }} ·
                {{ fmtUkuran(m.ukuran) }}
              </div>
              <div v-if="m.keterangan" class="mid-item-ket">
                {{ m.keterangan }}
              </div>
            </div>
            <div class="mid-item-act">
              <button
                type="button"
                class="mid-btn-open"
                :disabled="bukaId === m.id"
                @click="bukaPdf(m)"
              >
                <IconExternalLink
                  :size="13"
                  :stroke-width="2"
                  style="margin-right: 4px"
                />
                {{ bukaId === m.id ? "Membuka..." : "Buka" }}
              </button>
              <button
                v-if="bolehUpload"
                type="button"
                class="mid-btn-del"
                title="Hapus memo"
                @click="hapusTarget = m"
              >
                <IconTrash :size="14" :stroke-width="1.8" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mid-footer">
        <button type="button" class="mid-btn-cancel" @click="closeMemoDialog">
          Tutup
        </button>
      </div>
    </div>
  </v-dialog>

  <!-- Konfirmasi hapus -->
  <v-dialog
    :model-value="!!hapusTarget"
    max-width="380px"
    persistent
    @update:model-value="
      (v: boolean) => {
        if (!v) hapusTarget = null;
      }
    "
  >
    <div class="mid-card">
      <div class="mid-body" style="font-size: 12px">
        Hapus memo <b>{{ hapusTarget?.judul }}</b
        >? File PDF ikut terhapus dan tidak bisa dipulihkan.
      </div>
      <div class="mid-footer">
        <button
          type="button"
          class="mid-btn-cancel"
          :disabled="isDeleting"
          @click="hapusTarget = null"
        >
          Batal
        </button>
        <button
          type="button"
          class="mid-btn-danger"
          :disabled="isDeleting"
          @click="hapus"
        >
          {{ isDeleting ? "Menghapus..." : "Ya, Hapus" }}
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.mid-card {
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  max-height: 86vh;
}
.mid-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 14px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.mid-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #1565c0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.mid-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}
.mid-sub {
  font-size: 11px;
  color: #9e9e9e;
  margin-top: 2px;
}
.mid-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #bdbdbd;
  font-size: 14px;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 6px;
}
.mid-close:hover {
  background: #f5f5f5;
  color: #424242;
}
.mid-body {
  padding: 14px 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.mid-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
}
.mid-state {
  text-align: center;
  color: #9e9e9e;
  padding: 28px 0;
}

/* ── Unggah ── */
.mid-upload {
  margin-bottom: 14px;
}
.mid-form {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mid-form-title {
  font-weight: 700;
  color: #37474f;
}
.mid-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mid-lbl {
  width: 78px;
  flex-shrink: 0;
  font-weight: 600;
  color: #555;
}
.mid-inp {
  flex: 1;
  height: 28px;
  border: 1.5px solid #e0e0e0;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 11px;
  outline: none;
  background: white;
  font-family: inherit;
}
.mid-inp:focus {
  border-color: #1565c0;
}
.mid-hint {
  color: #9e9e9e;
  font-size: 10px;
}
.mid-check {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #424242;
}
.mid-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ── Daftar ── */
.mid-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mid-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #eeeeee;
  border-radius: 8px;
  padding: 10px 12px;
  background: white;
}
.mid-item-baru {
  border-color: #ffcc80;
  background: #fff8e1;
}
.mid-item-main {
  flex: 1;
  min-width: 0;
}
.mid-item-judul {
  font-size: 12px;
  font-weight: 700;
  color: #1a1a1a;
}
.mid-item-meta {
  color: #757575;
  margin-top: 2px;
}
.mid-item-ket {
  color: #424242;
  margin-top: 3px;
  white-space: pre-wrap;
}
.mid-chip-baru {
  display: inline-block;
  background: #e53935;
  color: white;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
  margin-right: 6px;
  vertical-align: 1px;
}
.mid-item-act {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* ── Tombol ── */
.mid-btn-primary,
.mid-btn-open,
.mid-btn-danger {
  height: 30px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: #1565c0;
  color: white;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
}
.mid-btn-primary:hover,
.mid-btn-open:hover {
  background: #1251a3;
}
.mid-btn-danger {
  background: #c62828;
}
.mid-btn-danger:hover {
  background: #a82020;
}
.mid-btn-primary:disabled,
.mid-btn-open:disabled,
.mid-btn-danger:disabled {
  background: #90a4ae;
  cursor: default;
}
.mid-btn-cancel {
  height: 30px;
  padding: 0 14px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  background: transparent;
  color: #757575;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.mid-btn-cancel:hover {
  background: #f5f5f5;
}
.mid-btn-del {
  width: 30px;
  height: 30px;
  border: 1.5px solid #ffcdd2;
  border-radius: 8px;
  background: #ffebee;
  color: #c62828;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mid-btn-del:hover {
  background: #ffcdd2;
}
.mid-spinner {
  width: 12px;
  height: 12px;
  margin-right: 6px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: mid-spin 0.6s linear infinite;
}
@keyframes mid-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
