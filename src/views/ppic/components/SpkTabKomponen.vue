<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import api from "@/services/api";
import { IconScissors, IconPrinter, IconInfoCircle } from "@tabler/icons-vue";

interface CetakBordirRow {
  Kode: string;
  Nama: string;
  Proses: string;
  Penempatan: string;
  Ukuran: string;
}

const props = defineProps<{
  formData: any;
  isEdit: boolean;
}>();

const activeTab = ref("potong");
const isLoading = ref(false);
const loadError = ref("");

const identifier = computed(
  () => props.formData.so_map || props.formData.so_nomor || "",
);
const identifierLabel = computed(() =>
  props.formData.so_map
    ? `MAP ${props.formData.so_map}`
    : `SO ${props.formData.so_nomor}`,
);

const ensureKomponenStruct = () => {
  if (!props.formData.KomponenSpk) {
    props.formData.KomponenSpk = { ListPotong: [], ListCetakBordir: [] };
  }
};

const prosesOptions = computed(() => {
  const opsi: string[] = [];
  if (props.formData.so_sablon === "Y") opsi.push("SABLON");
  if (props.formData.so_bordir === "Y") opsi.push("BORDIR");
  if (props.formData.so_sublim === "Y") opsi.push("SUBLIM");
  if (opsi.length === 0) opsi.push("DTF");
  return opsi;
});

const loadKomponenFromProof = async () => {
  loadError.value = "";
  ensureKomponenStruct();
  if (!identifier.value) {
    props.formData.KomponenSpk.ListPotong = [];
    props.formData.KomponenSpk.ListCetakBordir = [];
    return;
  }
  isLoading.value = true;
  try {
    const res = await api.get(
      `/ppic/spk/form/komponen-from-proof/${encodeURIComponent(identifier.value)}`,
    );
    const proofPotong = res.data.data.ListPotong || [];
    const proofCetakBordir = res.data.data.ListCetakBordir || [];

    // POTONG — full replace, tidak ada field manual di baris ini.
    props.formData.KomponenSpk.ListPotong = proofPotong.map((p: any) => ({
      Kode: p.Kode,
      Nama: p.Nama,
    }));

    // SECOND PROCESS — Kode/Nama ikut Proof, tapi Proses/Penempatan/Ukuran
    // yang sudah diisi user sebelumnya (mode edit, atau di sesi ini)
    // dipertahankan, dicocokkan per Kode.
    const existingByKode = new Map<string, CetakBordirRow>(
      (props.formData.KomponenSpk.ListCetakBordir || []).map((r: any) => [
        r.Kode,
        r,
      ]),
    );
    props.formData.KomponenSpk.ListCetakBordir = proofCetakBordir.map(
      (p: any) => {
        const existing = existingByKode.get(p.Kode);
        return {
          Kode: p.Kode,
          Nama: p.Nama,
          Proses: existing?.Proses || p.Proses,
          Penempatan: existing?.Penempatan || "",
          Ukuran: existing?.Ukuran || "",
        };
      },
    );
  } catch (e: any) {
    console.error("Gagal load komponen dari Proof:", e);
    loadError.value =
      e.response?.data?.message || e.message || "Gagal memuat data.";
    props.formData.KomponenSpk.ListPotong = [];
    props.formData.KomponenSpk.ListCetakBordir = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadKomponenFromProof);
watch(identifier, loadKomponenFromProof);

const listPotong = computed(() => props.formData.KomponenSpk?.ListPotong || []);
const listCetakBordir = computed(
  () => props.formData.KomponenSpk?.ListCetakBordir || [],
);
</script>

<template>
  <div class="komp-layout">
    <div class="komp-info-banner">
      <IconInfoCircle :size="14" class="mr-1" />
      Kode &amp; Nama Komponen diambil otomatis dari Proof Garmen untuk
      <b>{{ identifierLabel || "(belum ada referensi)" }}</b
      >. Untuk Second Process, Proses/Penempatan/Ukuran tetap wajib diisi manual
      per baris.
    </div>
    <div v-if="loadError" class="komp-error-banner">⚠ {{ loadError }}</div>

    <div class="komp-tabs">
      <button
        class="komp-tab-btn"
        :class="{ active: activeTab === 'potong' }"
        @click="activeTab = 'potong'"
      >
        <IconScissors :size="14" class="mr-1" /> POTONG
        <span v-if="listPotong.length" class="tab-badge">{{
          listPotong.length
        }}</span>
      </button>
      <button
        class="komp-tab-btn"
        :class="{ active: activeTab === 'cetakbordir' }"
        @click="activeTab = 'cetakbordir'"
      >
        <IconPrinter :size="14" class="mr-1" /> SECOND PROCESS
        <span v-if="listCetakBordir.length" class="tab-badge">{{
          listCetakBordir.length
        }}</span>
      </button>
    </div>

    <div class="komp-body">
      <div v-if="isLoading" class="loading-row">
        Memuat data dari Proof Garmen...
      </div>

      <template v-else>
        <!-- POTONG — full read-only -->
        <div v-show="activeTab === 'potong'" class="komp-pane">
          <table class="komp-table">
            <thead>
              <tr>
                <th style="width: 40px">No</th>
                <th style="width: 160px">Kode</th>
                <th>Nama Komponen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in listPotong" :key="'p' + idx">
                <td class="text-center">{{ Number(idx) + 1 }}</td>
                <td class="mono">{{ item.Kode }}</td>
                <td>{{ item.Nama }}</td>
              </tr>
              <tr v-if="listPotong.length === 0">
                <td colspan="3" class="empty-row">
                  Belum ada data Proof Garmen untuk lini Potong.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- SECOND PROCESS — Kode/Nama readonly, Proses/Penempatan/Ukuran manual -->
        <div v-show="activeTab === 'cetakbordir'" class="komp-pane">
          <table class="komp-table">
            <thead>
              <tr>
                <th style="width: 40px">No</th>
                <th style="width: 130px">Kode</th>
                <th style="min-width: 160px">Nama Komponen</th>
                <th style="width: 110px">Proses</th>
                <th style="width: 160px">Penempatan</th>
                <th style="width: 130px">Ukuran</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in listCetakBordir" :key="'cb' + idx">
                <td class="text-center">{{ Number(idx) + 1 }}</td>
                <td class="mono">{{ item.Kode }}</td>
                <td>{{ item.Nama }}</td>
                <td>
                  <select v-model="item.Proses" class="cell-sel">
                    <option v-for="p in prosesOptions" :key="p" :value="p">
                      {{ p }}
                    </option>
                  </select>
                </td>
                <td>
                  <input
                    v-model="item.Penempatan"
                    class="cell-inp"
                    placeholder="Mis: Kanan Atas"
                  />
                </td>
                <td>
                  <input
                    v-model="item.Ukuran"
                    class="cell-inp"
                    placeholder="Mis: 10x10 cm"
                  />
                </td>
              </tr>
              <tr v-if="listCetakBordir.length === 0">
                <td colspan="6" class="empty-row">
                  Belum ada data Proof Garmen untuk lini Cetak/Sublim/Bordir.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.komp-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.komp-info-banner {
  display: flex;
  align-items: center;
  background: #e3f2fd;
  color: #0d47a1;
  border: 1px solid #90caf9;
  border-radius: 4px;
  padding: 7px 10px;
  font-size: 11px;
  margin-bottom: 8px;
  line-height: 1.4;
}
.komp-error-banner {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
  border-radius: 4px;
  padding: 7px 10px;
  font-size: 11px;
  margin-bottom: 8px;
  font-weight: 600;
}
.cell-sel,
.cell-inp {
  width: 100%;
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}
.cell-sel:focus,
.cell-inp:focus {
  border-color: #1565c0;
}
.komp-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px 0;
  background: #eeeeee;
  border-bottom: 1px solid #bdbdbd;
}
.komp-tab-btn {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  background: #e0e0e0;
  border: 1px solid #ccc;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  gap: 4px;
}
.komp-tab-btn.active {
  background: white;
  color: #1565c0;
  border-bottom: 2px solid white;
  margin-bottom: -1px;
}
.tab-badge {
  background: #1565c0;
  color: white;
  border-radius: 8px;
  padding: 0 5px;
  font-size: 10px;
}
.komp-tab-btn.active .tab-badge {
  background: #1565c0;
}
.komp-body {
  flex: 1;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 10px;
}
.loading-row {
  text-align: center;
  padding: 24px;
  color: #757575;
  font-style: italic;
}
.komp-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  font-size: 11px;
}
.komp-table thead th {
  background: #f5f5f5;
  padding: 6px 8px;
  font-weight: 700;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}
.komp-table tbody td {
  padding: 6px 8px;
  border-bottom: 1px solid #eeeeee;
}
.mono {
  font-family: monospace;
  color: #1565c0;
  font-weight: 600;
}
.text-center {
  text-align: center;
}
.proses-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.chip-sablon {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-bordir {
  background: #fce4ec;
  color: #ad1457;
}
.empty-row {
  text-align: center;
  padding: 16px;
  color: #bdbdbd;
  font-style: italic;
}
</style>
