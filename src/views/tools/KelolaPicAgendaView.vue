<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { agendaPicService } from "@/services/tools/agendaPicService";
import { IconUsers, IconPlus, IconTrash } from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();

const picList = ref<{ Kode: string; Nama: string; DateCreate: string }[]>([]);
const candidates = ref<{ Kode: string; Nama: string }[]>([]);
const isLoading = ref(false);
const selectedCandidate = ref("");
const confirmDialog = ref(false);
const confirmTarget = ref<{ kode: string; nama: string } | null>(null);

const fetchAll = async () => {
  isLoading.value = true;
  try {
    const [resList, resCand] = await Promise.all([
      agendaPicService.getList(),
      agendaPicService.getCandidates(),
    ]);
    picList.value = resList.data.data || [];
    candidates.value = resCand.data.data || [];
  } catch {
    toast.error("Gagal memuat data PIC.");
  } finally {
    isLoading.value = false;
  }
};

const addPic = async () => {
  if (!selectedCandidate.value)
    return toast.warning("Pilih user terlebih dahulu.");
  try {
    await agendaPicService.add(selectedCandidate.value);
    toast.success("PIC berhasil ditambahkan.");
    selectedCandidate.value = "";
    await fetchAll();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menambahkan PIC.");
  }
};

const askRemovePic = (kode: string, nama: string) => {
  confirmTarget.value = { kode, nama };
  confirmDialog.value = true;
};

const doRemovePic = async () => {
  if (!confirmTarget.value) return;
  try {
    await agendaPicService.remove(confirmTarget.value.kode);
    toast.success("PIC berhasil dihapus.");
    confirmDialog.value = false;
    await fetchAll();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus PIC.");
  }
};

onMounted(fetchAll);
</script>

<template>
  <div class="pic-page">
    <div class="pic-header">
      <IconUsers :size="18" :stroke-width="1.7" />
      <div>
        <div class="pic-title">Kelola PIC Agenda Kerja</div>
        <div class="pic-subtitle">
          Bagian: <b>{{ authStore.user?.bagian }}</b> — Cabang:
          <b>{{ authStore.userCabang }}</b>
        </div>
      </div>
    </div>

    <div class="pic-add-row">
      <select v-model="selectedCandidate" class="pic-select">
        <option value="">-- Pilih user untuk dijadikan PIC --</option>
        <option v-for="c in candidates" :key="c.Kode" :value="c.Kode">
          {{ c.Nama }}
        </option>
      </select>
      <button class="pic-btn-add" @click="addPic">
        <IconPlus :size="14" /> Tambah PIC
      </button>
    </div>

    <div class="pic-list-wrap">
      <table class="pic-table">
        <thead>
          <tr>
            <th style="width: 40px">No</th>
            <th>Nama</th>
            <th style="width: 100px">Kode</th>
            <th style="width: 150px">Terdaftar Sejak</th>
            <th style="width: 60px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="5" class="pic-empty">Memuat...</td>
          </tr>
          <tr v-else-if="!picList.length">
            <td colspan="5" class="pic-empty">
              Belum ada PIC terdaftar untuk bagian ini. Agenda tidak bisa
              diinput sampai ada PIC.
            </td>
          </tr>
          <tr v-for="(p, i) in picList" :key="p.Kode">
            <td class="tc">{{ i + 1 }}</td>
            <td class="fw">{{ p.Nama }}</td>
            <td class="mono">{{ p.Kode }}</td>
            <td>
              {{
                p.DateCreate
                  ? new Date(p.DateCreate).toLocaleDateString("id-ID")
                  : "-"
              }}
            </td>
            <td class="tc">
              <button class="pic-del-btn" @click="askRemovePic(p.Kode, p.Nama)">
                <IconTrash :size="13" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <v-dialog v-model="confirmDialog" max-width="380px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #c62828">
        <IconTrash :size="14" color="white" class="mr-2" />
        Konfirmasi Hapus PIC
        <button class="dlg-x" @click="confirmDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        Hapus <b>{{ confirmTarget?.nama }}</b> dari daftar PIC agenda?
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          style="background: #c62828"
          @click="doRemovePic"
        >
          Ya, Hapus
        </button>
        <button class="dlg-btn cancel" @click="confirmDialog = false">
          Batal
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.pic-page {
  padding: 16px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  max-width: 720px;
}
.pic-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}
.pic-title {
  font-size: 15px;
  font-weight: 700;
  color: #212121;
}
.pic-subtitle {
  font-size: 11px;
  color: #757575;
  margin-top: 2px;
}

.pic-add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.pic-select {
  flex: 1;
  height: 32px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.pic-select:focus {
  border-color: #1565c0;
}
.pic-btn-add {
  height: 32px;
  padding: 0 14px;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.pic-btn-add:hover {
  opacity: 0.9;
}

.pic-list-wrap {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}
.pic-table {
  width: 100%;
  border-collapse: collapse;
}
.pic-table th {
  background: #f5f5f5;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}
.pic-table td {
  padding: 8px 10px;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.pic-table tbody tr:hover td {
  background: #fafafa;
}
.tc {
  text-align: center;
}
.fw {
  font-weight: 600;
}
.mono {
  font-family: monospace;
  color: #1565c0;
}
.pic-empty {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 20px;
}
.pic-del-btn {
  width: 26px;
  height: 26px;
  border: 1px solid #ef9a9a;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pic-del-btn:hover {
  background: #ffcdd2;
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
</style>
