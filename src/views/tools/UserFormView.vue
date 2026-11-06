<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import {
  userFormService,
  type MenuGridRow,
  type CabangUserRow,
  type HrdKaryawan,
} from "@/services/tools/userFormService";
import {
  IconUserPlus,
  IconSearch,
  IconCopy,
  IconCheck,
  IconX,
} from "@tabler/icons-vue";

import UserSearchModal from "@/components/lookups/UserSearchModal.vue";
import NikSearchModal from "@/components/lookups/NikSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.kode);
const isLoading = ref(false);
const isSaving = ref(false);

const header = ref<UserHeaderState>({
  kode: "",
  nik: "",
  nama: "",
  password: "",
  divisi: 0,
  bagian: "",
  cabang: "",
  cabangKaos: "",
  aktif: true,
  editReport: false,
  lihatBeli: false,
  lihatHarga: false,
  lihatCustomer: false,
  lihatSupplier: false,
});
interface UserHeaderState {
  kode: string;
  nik: string;
  nama: string;
  password: string;
  divisi: number;
  bagian: string;
  cabang: string;
  cabangKaos: string;
  aktif: boolean;
  editReport: boolean;
  lihatBeli: boolean;
  lihatHarga: boolean;
  lihatCustomer: boolean;
  lihatSupplier: boolean;
}

const menuGrid = ref<MenuGridRow[]>([]);
const cabangList = ref<CabangUserRow[]>([
  { cabang: "", divisi: 0, utama: true },
]);
const hrd = ref<HrdKaryawan | null>(null);
const showNikModal = ref(false);

const onNikSelected = (item: HrdKaryawan) => {
  header.value.nik = item.nik;
  hrd.value = item;
  const lain = (item.userKode ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k && k.toUpperCase() !== header.value.kode.toUpperCase());
  if (lain.length > 0) {
    toast.info(`NIK ini juga dipakai akun: ${lain.join(", ")}.`);
  }
  // User baru: bila cabang masih kosong dan HRD punya satu padanan, isi otomatis
  if (
    item.cabangHrd.length === 1 &&
    cabangList.value.length === 1 &&
    !cabangList.value[0].cabang
  ) {
    cabangList.value[0].cabang = item.cabangHrd[0];
  }
};
const kosongkanNik = () => {
  header.value.nik = "";
  hrd.value = null;
};
const cabangSesuai = computed(() => {
  const h = hrd.value;
  if (!h || h.cabangHrd.length === 0) return true;
  return cabangList.value.some((c) => h.cabangHrd.includes(c.cabang));
});
const tambahCabangHrd = () => {
  const h = hrd.value;
  if (!h || h.cabangHrd.length !== 1) return;
  const cab = h.cabangHrd[0];
  if (cabangList.value.some((c) => c.cabang === cab)) return;
  const utama = cabangList.value.find((c) => c.utama);
  cabangList.value.push({
    cabang: cab,
    divisi: utama?.divisi ?? 0,
    utama: false,
  });
};

const tambahCabang = () => {
  const utama = cabangList.value.find((c) => c.utama);
  cabangList.value.push({
    cabang: "",
    divisi: utama?.divisi ?? 0,
    utama: false,
  });
};
const hapusCabang = (idx: number) => {
  if (cabangList.value.length <= 1) return;
  const hapusUtama = cabangList.value[idx].utama;
  cabangList.value.splice(idx, 1);
  if (hapusUtama) cabangList.value[0].utama = true;
};
const jadikanUtama = (idx: number) => {
  cabangList.value.forEach((c, i) => {
    c.utama = i === idx;
  });
};
const cekAllChecked = ref(false);

const BAGIAN_OPTIONS = [
  "ADMIN",
  "AUDIT",
  "CETAK",
  "DESAIN",
  "DIREKSI",
  "DM",
  "DTF",
  "EDP",
  "FINANCE",
  "GA",
  "GUDANG",
  "IT",
  "JAHIT",
  "KIRIM",
  "LIPAT",
  "MARKETING",
  "OWNER",
  "PEMBELIAN",
  "PPIC",
  "POTONG",
  "PRES DTF",
  "PRODUKSI",
  "QCCETAK",
  "QCPOTONG",
  "TEKNISI",
];
const cabangOptions = ref<string[]>([]);

// ── Load data ──────────────────────────────────────────────────────────
const loadData = async () => {
  isLoading.value = true;
  try {
    const kode = isEditMode.value ? String(route.params.kode) : undefined;
    const res = await userFormService.getFormData(kode);
    const d = res.data.data;
    header.value = { ...d.header };
    menuGrid.value = d.menu;
    const daftar: CabangUserRow[] = d.cabangList ?? [];
    cabangList.value = daftar.length
      ? daftar
      : [
          {
            cabang: d.header.cabang || "",
            divisi: Number(d.header.divisi) || 0,
            utama: true,
          },
        ];
    hrd.value = d.hrd ?? null;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

const loadCabangOptions = async () => {
  try {
    const res = await userFormService.getCabangOptions();
    cabangOptions.value = (res.data.data || []).map((c: any) => c.Kode);
  } catch (e) {
    console.error("Gagal memuat daftar cabang", e);
  }
};

onMounted(() => {
  loadData();
  loadCabangOptions();
});

// ── Validasi kode unik (mode Baru saja) ─────────────────────────────────
const kodeCheckState = ref<"idle" | "checking" | "available" | "taken">("idle");
const onKodeBlur = async () => {
  if (isEditMode.value || !header.value.kode.trim()) {
    kodeCheckState.value = "idle";
    return;
  }
  kodeCheckState.value = "checking";
  try {
    const res = await userFormService.checkKode(header.value.kode.trim());
    kodeCheckState.value = res.data.data.exists ? "taken" : "available";
  } catch {
    kodeCheckState.value = "idle";
  }
};

// ── F1 lookup (Kode) & Copy hak akses — pakai modal yang sama ────────
const showUserSearchModal = ref(false);
const searchModalMode = ref<"kode" | "copy">("kode");

const openKodeLookup = () => {
  searchModalMode.value = "kode";
  showUserSearchModal.value = true;
};
const openCopyModal = () => {
  searchModalMode.value = "copy";
  showUserSearchModal.value = true;
};

const onUserSelected = async (item: any) => {
  if (searchModalMode.value === "kode") {
    header.value.kode = item.Kode;
    await onKodeBlur();
    return;
  }
  // mode "copy"
  try {
    const res = await userFormService.getPermissionsForCopy(item.Kode);
    const permMap: Record<string, any> = res.data.data;
    menuGrid.value = menuGrid.value.map((m) => {
      const p = permMap[String(m.menId)];
      return p
        ? {
            ...m,
            view: p.view,
            insert: p.insert,
            edit: p.edit,
            delete: p.delete,
            save: p.save,
          }
        : {
            ...m,
            view: false,
            insert: false,
            edit: false,
            delete: false,
            save: false,
          };
    });
    toast.success(
      `Hak akses berhasil disalin dari ${item.Kode}. Jangan lupa Simpan.`,
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyalin hak akses.");
  }
};

// ── Toggle satu baris — terapkan SEMUA (view/insert/edit/delete/save)
// ke satu menu tsb sekali klik, sesuai permintaan "tidak perlu klik
// satu per satu". Klik ulang untuk uncheck semua di baris itu.
const toggleRowAll = (row: MenuGridRow) => {
  const allChecked =
    row.view && row.insert && row.edit && row.delete && row.save;
  const next = !allChecked;
  row.view = next;
  row.insert = next;
  row.edit = next;
  row.delete = next;
  row.save = next;
};
const isRowFullyChecked = (row: MenuGridRow) =>
  row.view && row.insert && row.edit && row.delete && row.save;
const isRowPartiallyChecked = (row: MenuGridRow) =>
  (row.view || row.insert || row.edit || row.delete || row.save) &&
  !isRowFullyChecked(row);

// ── "Cek All" global — migrasi PERSIS logic CheckBox1Click Delphi:
// posisi baris 1 & 2 -> View=Y saja; men_id>10 -> semua 5 kolom=Y;
// uncheck -> reset semua baris ke N tanpa syarat.
const onCekAllChange = () => {
  menuGrid.value.forEach((row, idx) => {
    if (cekAllChecked.value) {
      if (idx === 0 || idx === 1) {
        row.view = true;
      }
      if (row.menId > 10) {
        row.view = true;
        row.insert = true;
        row.edit = true;
        row.delete = true;
        row.save = true;
      }
    } else {
      row.view = false;
      row.insert = false;
      row.edit = false;
      row.delete = false;
      row.save = false;
    }
  });
};

// ── Save ────────────────────────────────────────────────────────────────
const validateSave = () => {
  if (!header.value.kode.trim()) {
    toast.warning("Kode Kosong, tidak dapat disimpan");
    return false;
  }
  const daftar = cabangList.value;
  if (daftar.some((c) => !c.cabang)) {
    toast.warning("Cabang wajib diisi di setiap baris.");
    return false;
  }
  if (new Set(daftar.map((c) => c.cabang)).size !== daftar.length) {
    toast.warning("Cabang tidak boleh dobel.");
    return false;
  }
  if (daftar.filter((c) => c.utama).length !== 1) {
    toast.warning("Pilih tepat satu cabang utama.");
    return false;
  }
  if (!isEditMode.value && kodeCheckState.value === "taken") {
    toast.warning(`Kode "${header.value.kode}" sudah digunakan.`);
    return false;
  }
  return true;
};

const showSaveDialog = ref(false);
const requestSave = () => {
  if (!validateSave()) return;
  showSaveDialog.value = true;
};

const confirmSave = async () => {
  isSaving.value = true;
  try {
    const utama = cabangList.value.find((c) => c.utama);
    const payload = {
      ...header.value,
      cabang: utama?.cabang ?? "",
      divisi: utama?.divisi ?? 0,
      cabangList: cabangList.value,
      menu: menuGrid.value,
    };
    if (isEditMode.value) {
      await userFormService.update(String(route.params.kode), payload);
      toast.success("User berhasil diupdate.");
    } else {
      await userFormService.create(payload);
      toast.success("User berhasil disimpan.");
    }
    showSaveDialog.value = false;
    router.push({ name: "MasterUser" });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const onCancel = () => router.push({ name: "MasterUser" });

const divisiOptions = [
  { value: 0, label: "Pusat" },
  { value: 1, label: "Spanduk" },
  { value: 4, label: "Garmen" },
  { value: 5, label: "MMT" },
];

const newMenuCount = computed(
  () => menuGrid.value.filter((m) => m.isNewMenu).length,
);
</script>

<template>
  <div class="uf-page">
    <div class="uf-header">
      <div class="uf-title">
        <IconUserPlus :size="18" />
        {{ isEditMode ? "Ubah User" : "Buat User Baru" }}
      </div>
      <div class="uf-actions">
        <v-btn
          size="small"
          color="primary"
          :loading="isSaving"
          @click="requestSave"
        >
          <template #prepend><IconCheck :size="15" /></template>
          Simpan
        </v-btn>
        <v-btn size="small" variant="text" @click="onCancel">
          <template #prepend><IconX :size="15" /></template>
          Tutup
        </v-btn>
      </div>
    </div>

    <div v-if="isLoading" class="uf-loading">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else class="uf-body">
      <!-- ── Panel Kiri: Header Form ── -->
      <div class="uf-left">
        <div class="uf-card">
          <div class="fr">
            <label class="lbl">Kode</label>
            <div class="igrp">
              <input
                v-model="header.kode"
                class="inp"
                :disabled="isEditMode"
                placeholder="F1=Help"
                @blur="onKodeBlur"
                @keydown.f1.prevent="!isEditMode && openKodeLookup()"
              />
              <button
                v-if="!isEditMode"
                type="button"
                class="blkp"
                title="Cari User (F1)"
                @mousedown.prevent="openKodeLookup"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
            <span v-if="kodeCheckState === 'taken'" class="kode-badge badge-red"
              >Sudah dipakai</span
            >
            <span
              v-else-if="kodeCheckState === 'available'"
              class="kode-badge badge-green"
              >Tersedia</span
            >
          </div>
          <div class="fr">
            <label class="lbl">Nama</label>
            <input v-model="header.nama" class="inp" style="flex: 1" />
          </div>
          <div class="fr">
            <label class="lbl">NIK</label>
            <div class="igrp">
              <input
                :value="header.nik"
                readonly
                class="inp"
                placeholder="Pilih karyawan HRD"
              />
              <button
                type="button"
                class="blkp"
                title="Cari karyawan HRD"
                @click="showNikModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
            <button
              v-if="header.nik"
              type="button"
              class="btn-nik-clear"
              title="Kosongkan NIK"
              @click="kosongkanNik"
            >
              <IconX :size="12" />
            </button>
          </div>

          <div
            v-if="header.nik"
            class="hrd-info"
            :class="{ 'hrd-warn': !hrd || !hrd.aktif }"
          >
            <template v-if="!hrd">NIK tidak ditemukan di data HRD.</template>
            <template v-else>
              {{ hrd.nama }} · {{ hrd.pabrik }} · {{ hrd.departemen }} ·
              {{ hrd.jabatan }} · {{ hrd.bagian }}
              <b v-if="!hrd.aktif"> · sudah keluar (HRD)</b>
            </template>
          </div>
          <div
            v-if="hrd && hrd.cabangHrd.length"
            class="hrd-info"
            :class="{ 'hrd-warn': !cabangSesuai }"
          >
            Cabang menurut pabrik HRD ({{ hrd.pabrik }}):
            <b>{{ hrd.cabangHrd.join(", ") }}</b>
            <template v-if="!cabangSesuai">
              · tidak ada di daftar cabang user ini.</template
            >
            <button
              v-if="!cabangSesuai && hrd.cabangHrd.length === 1"
              type="button"
              class="btn-cab-add"
              style="margin-left: 8px"
              @click="tambahCabangHrd"
            >
              + Tambah cabang {{ hrd.cabangHrd[0] }}
            </button>
          </div>
          <div class="fr">
            <label class="lbl">Password</label>
            <input
              v-model="header.password"
              type="text"
              class="inp"
              style="flex: 1"
            />
          </div>
          <div class="cab-box">
            <div class="cab-head">
              <span class="cab-title">Cabang &amp; Divisi</span>
              <button type="button" class="btn-cab-add" @click="tambahCabang">
                + Tambah
              </button>
            </div>
            <div v-for="(c, idx) in cabangList" :key="idx" class="cab-row">
              <select v-model="c.cabang" class="inp">
                <option value="">-- Cabang --</option>
                <option v-for="o in cabangOptions" :key="o" :value="o">
                  {{ o }}
                </option>
              </select>
              <select v-model.number="c.divisi" class="inp">
                <option
                  v-for="d in divisiOptions"
                  :key="d.value"
                  :value="d.value"
                >
                  {{ d.label }}
                </option>
              </select>
              <label class="cab-utama" title="Cabang awal saat login">
                <input
                  type="radio"
                  name="cab-utama"
                  :checked="c.utama"
                  @change="jadikanUtama(idx)"
                />
                Utama
              </label>
              <button
                type="button"
                class="btn-cab-del"
                :disabled="cabangList.length <= 1"
                @click="hapusCabang(idx)"
              >
                <IconX :size="12" />
              </button>
            </div>
          </div>
          <div class="fr">
            <label class="lbl">Cabang Kaos</label>
            <select v-model="header.cabangKaos" class="inp">
              <option value="">-- Pilih --</option>
              <option v-for="c in cabangOptions" :key="c" :value="c">
                {{ c }}
              </option>
            </select>
          </div>
          <div class="fr">
            <label class="lbl">Bagian</label>
            <select v-model="header.bagian" class="inp">
              <option value="">-- Pilih --</option>
              <option v-for="b in BAGIAN_OPTIONS" :key="b" :value="b">
                {{ b }}
              </option>
            </select>
          </div>
          <div class="divider" />
          <div class="chk-grid">
            <label class="chk-lbl"
              ><input type="checkbox" v-model="header.aktif" /> Aktif</label
            >
            <label class="chk-lbl"
              ><input type="checkbox" v-model="header.editReport" /> Edit
              Report</label
            >
            <label class="chk-lbl"
              ><input type="checkbox" v-model="header.lihatBeli" /> Lihat Harga
              Beli</label
            >
            <label class="chk-lbl"
              ><input type="checkbox" v-model="header.lihatHarga" /> Lihat Harga
              Jual</label
            >
            <label class="chk-lbl"
              ><input type="checkbox" v-model="header.lihatCustomer" /> Lihat
              Customer</label
            >
            <label class="chk-lbl"
              ><input type="checkbox" v-model="header.lihatSupplier" /> Lihat
              Supplier</label
            >
          </div>
        </div>

        <div class="uf-card mt-2">
          <button type="button" class="btn-copy" @click="openCopyModal">
            <IconCopy :size="14" class="mr-1" /> Copy Hak Akses dari User Lain
          </button>
          <label class="chk-lbl mt-2" style="font-weight: 700">
            <input
              type="checkbox"
              v-model="cekAllChecked"
              @change="onCekAllChange"
            />
            Cek All
          </label>
          <div v-if="newMenuCount > 0" class="new-menu-note">
            {{ newMenuCount }} menu baru terdeteksi (belum pernah dikonfigurasi
            oleh user manapun) — ditandai kuning di grid.
          </div>
        </div>
      </div>

      <!-- ── Panel Kanan: Grid Hak Akses ── -->
      <div class="uf-right">
        <div class="grid-wrap">
          <table class="grid-table">
            <thead>
              <tr>
                <th style="width: 40px">No</th>
                <th style="width: 60px">Id</th>
                <th>Nama Menu</th>
                <th style="width: 55px" class="tc">View</th>
                <th style="width: 55px" class="tc">Insert</th>
                <th style="width: 55px" class="tc">Update</th>
                <th style="width: 55px" class="tc">Delete</th>
                <th style="width: 55px" class="tc">Save</th>
                <th style="width: 60px" class="tc">Semua</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in menuGrid"
                :key="row.menId"
                :class="{ 'row-new': row.isNewMenu }"
              >
                <td class="tc muted">{{ idx + 1 }}</td>
                <td class="tc mono">{{ row.menId }}</td>
                <td>
                  {{ row.keterangan }}
                  <span v-if="row.isNewMenu" class="new-badge">BARU</span>
                </td>
                <td class="tc"><input type="checkbox" v-model="row.view" /></td>
                <td class="tc">
                  <input type="checkbox" v-model="row.insert" />
                </td>
                <td class="tc"><input type="checkbox" v-model="row.edit" /></td>
                <td class="tc">
                  <input type="checkbox" v-model="row.delete" />
                </td>
                <td class="tc"><input type="checkbox" v-model="row.save" /></td>
                <td class="tc">
                  <button
                    type="button"
                    class="btn-row-all"
                    :class="{
                      full: isRowFullyChecked(row),
                      partial: isRowPartiallyChecked(row),
                    }"
                    @click="toggleRowAll(row)"
                    title="Terapkan/hapus semua hak akses untuk menu ini"
                  >
                    <IconCheck :size="12" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Copy Modal -->
    <UserSearchModal v-model="showUserSearchModal" @selected="onUserSelected" />

    <NikSearchModal v-model="showNikModal" @selected="onNikSelected" />

    <!-- Confirm Save -->
    <v-dialog v-model="showSaveDialog" max-width="360px" persistent>
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white pa-3 text-subtitle-1"
          >Konfirmasi Simpan</v-card-title
        >
        <v-card-text class="pa-4"
          >Yakin ingin simpan data user ini?</v-card-text
        >
        <v-card-actions class="pa-3 border-t">
          <v-spacer />
          <v-btn variant="text" @click="showSaveDialog = false">Batal</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="isSaving"
            @click="confirmSave"
            >Ya, Simpan</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.uf-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  padding: 10px 14px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.uf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.uf-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #212121;
}
.uf-actions {
  display: flex;
  gap: 6px;
}
.uf-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.uf-body {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.uf-left {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.uf-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.uf-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px 14px;
}
.mt-2 {
  margin-top: 8px;
}
.fr {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  min-height: 26px;
}
.lbl {
  width: 75px;
  flex-shrink: 0;
  font-weight: 600;
  color: #424242;
}
.inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  flex: 1;
  min-width: 0;
}
.inp:focus {
  border-color: #1565c0;
}
.inp:disabled {
  background: #f0f0f0;
  color: #757575;
}
.igrp {
  display: flex;
  flex: 1;
}
.kode-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}
.badge-red {
  background: #ffebee;
  color: #c62828;
}
.badge-green {
  background: #e8f5e9;
  color: #2e7d32;
}
.radio-group {
  display: flex;
  gap: 12px;
  flex: 1;
}
.radio-lbl {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.divider {
  height: 1px;
  background: #eee;
  margin: 8px 0;
}
.chk-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.chk-lbl {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.chk-lbl input {
  accent-color: #1565c0;
}
.btn-copy {
  width: 100%;
  height: 30px;
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-copy:hover {
  background: #bbdefb;
}
.new-menu-note {
  margin-top: 8px;
  padding: 6px 8px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 4px;
  font-size: 10.5px;
  color: #795548;
  line-height: 1.4;
}
.grid-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
}
.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}
.grid-table thead th {
  background: #1565c0;
  color: white;
  padding: 6px 8px;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
}
.grid-table tbody td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.grid-table tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.grid-table tbody tr:hover td {
  background: #e3f2fd;
}
.grid-table tbody tr.row-new td {
  background: #fff9c4 !important;
}
.tc {
  text-align: center;
}
.mono {
  font-family: monospace;
  color: #1565c0;
}
.muted {
  color: #9e9e9e;
  font-size: 10px;
}
.new-badge {
  background: #fbc02d;
  color: #4a2e00;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 2px;
  margin-left: 6px;
}
.btn-row-all {
  width: 22px;
  height: 22px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  background: white;
  color: #bdbdbd;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-row-all.full {
  background: #2e7d32;
  border-color: #2e7d32;
  color: white;
}
.btn-row-all.partial {
  background: #fff3e0;
  border-color: #ffb74d;
  color: #e65100;
}
.copy-search {
  width: 100%;
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  margin-bottom: 8px;
  box-sizing: border-box;
}
.copy-search:focus {
  border-color: #1565c0;
}
.copy-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.copy-item {
  display: flex;
  gap: 10px;
  padding: 7px 10px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
}
.copy-item:hover {
  background: #e3f2fd;
}
.copy-kode {
  font-weight: 700;
  color: #1565c0;
  width: 60px;
  flex-shrink: 0;
  font-family: monospace;
}
.copy-empty {
  padding: 12px;
  text-align: center;
  color: #9e9e9e;
  font-size: 11px;
}
.igrp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  flex: 1;
}
.igrp .inp {
  border: none;
  height: 24px;
}
.blkp {
  width: 26px;
  min-width: 26px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blkp:hover {
  background: #bbdefb;
}
.cab-box {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 6px 8px;
  margin-bottom: 8px;
}
.cab-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cab-title {
  font-size: 11px;
  font-weight: 700;
  color: #424242;
}
.btn-cab-add {
  font-size: 11px;
  font-weight: 600;
  color: #1565c0;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 3px;
  padding: 1px 8px;
  cursor: pointer;
}
.cab-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}
.cab-row .inp {
  flex: 1;
  min-width: 0;
  font-size: 11px;
}
.cab-utama {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}
.btn-cab-del {
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  padding: 3px 5px;
  color: #c62828;
  cursor: pointer;
}
.btn-cab-del:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn-nik-clear {
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  padding: 3px 5px;
  color: #c62828;
  cursor: pointer;
}
.hrd-info {
  font-size: 11px;
  color: #37474f;
  background: #eceff1;
  border-radius: 4px;
  padding: 4px 8px;
  margin: -2px 0 8px;
}
.hrd-info.hrd-warn {
  background: #fff3e0;
  color: #e65100;
}
</style>
