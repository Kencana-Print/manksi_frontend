<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mintaBahanService } from "@/services/garmen/mintaBahanService";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import {
  IconBox,
  IconHelmet,
  IconTie,
  IconFileDescription,
  IconPrinter,
  IconCircleX,
  IconCheck,
  IconShieldCheck,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const activeRealisasi = ref<Record<string, string>>({});

// -- State untuk Dialog Aksi --
const actionDialog = ref(false);
const actionType = ref<"GUDANG" | "MANAGER" | "AJUKAN">("GUDANG");
const actionForm = ref({ status: "APPROVE", alasan: "", urut: 0 });

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  cabang: "ALL",
});

const cabangOptions = ref<string[]>(["ALL"]);

onMounted(async () => {
  try {
    const res = await api.get("/lookups/cabang-pabrik");
    cabangOptions.value = ["ALL", ...res.data.data.map((b: any) => b.Kode)];
  } catch {
    /* silent */
  }
});

const {
  items,
  isLoading,
  selected,
  fetchData,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  exportToExcel,
} = useBrowse({
  menuId: "127",
  fetchApi: async () => {
    const res = await mintaBahanService.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
      filterState.value.cabang,
    );
    return res.data.data;
  },
  deleteApi: async (nomor: string) => {
    await mintaBahanService.deleteData(nomor);
  },
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "115px" },
  { title: "Tanggal", key: "Tanggal", width: "85px" },
  { title: "Jam", key: "Jam", width: "70px" },
  { title: "Cab", key: "Cab", width: "50px" },
  { title: "Divisi", key: "Divisi", width: "70px" }, // Divisi Garmen
  { title: "Div. SPK", key: "DivisiSpk", width: "80px" },
  { title: "SPK", key: "SPK", width: "125px" },
  { title: "Nama SPK", key: "NamaSpk", minWidth: "140px" }, // Flexible
  { title: "Jml SPK", key: "JmlSpk", width: "70px", align: "end" },
  { title: "Keterangan", key: "Keterangan", minWidth: "120px" }, // Flexible
  { title: "Status", key: "Status", width: "80px" },
  { title: "Approve", key: "Approve", width: "65px", align: "center" },
  { title: "Apv. Gdg", key: "ApvGudang", width: "80px", align: "center" },
  { title: "Tolak Gdg", key: "AlasanTolak_ApvGudang", minWidth: "100px" }, // Flexible
  { title: "Apv. Mgr", key: "ApvManager", width: "80px", align: "center" },
  { title: "Tolak Mgr", key: "AlasanTolak_ApvManager", minWidth: "100px" }, // Flexible
  { title: "User", key: "Usr", width: "70px" },
  { title: "Alasan Close", key: "AlasanClose", minWidth: "100px" }, // Flexible
];

const handleRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Status === "OPEN")
    return { style: "color:#d32f2f!important;font-weight:600" };
  if (item.Status === "ONPROSES")
    return { style: "color:#1976d2!important;font-weight:600" };
  return {};
};

const getNomorClass = (item: any) => {
  if (item.Ngedit === "WAIT") return "badge-wait";
  if (item.Ngedit === "TOLAK") return "badge-tolak";
  if (item.Ngedit === "ACC") return "badge-acc";
  return "";
};
const getApvClass = (val: string) => (val === "N" ? "apv-n" : "");

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

// ── Expand detail ──
const expandedRows = ref<any[]>([]);
const detailsData = ref<
  Record<string, { bahan: any[]; realisasi: any[]; realisasiDtl: any[] }>
>({});
const loadingDetails = ref<Set<string>>(new Set());

watch(expandedRows, async (newVal) => {
  if (newVal.length === 0) return;
  const nomor = newVal[newVal.length - 1]?.Nomor;
  if (!nomor || detailsData.value[nomor] || loadingDetails.value.has(nomor))
    return;
  loadingDetails.value.add(nomor);
  try {
    const res = await mintaBahanService.getDetail(nomor);
    detailsData.value[nomor] = res.data.data;
  } catch {
    toast.error("Gagal memuat detail data");
  } finally {
    loadingDetails.value.delete(nomor);
  }
});

const selectRealisasi = (spkNomor: string, relNomor: string) => {
  activeRealisasi.value[spkNomor] = relNomor;
};

// ── Aksi ──
const onAdd = async () => {
  try {
    await mintaBahanService.checkInsert();
    router.push("/garmen/bahan-baku/minta-bahan/form");
  } catch (e: any) {
    toast.warning(e.response?.data?.message || "Gagal memverifikasi.");
  }
};
const onEdit = (item: any) => {
  const itemCab = (item.Cab || "").toString().trim().toUpperCase();
  const myCab = (authStore.userCabang || "").toString().trim().toUpperCase();

  // PERBAIKAN: Gunakan startsWith("HO")
  if (itemCab !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
    return toast.error(`Bukan cabang anda. (Data: ${itemCab}, Anda: ${myCab})`);
  }

  router.push(
    `/garmen/bahan-baku/minta-bahan/form/${encodeURIComponent(item.Nomor)}`,
  );
};
const onDelete = (item: any) => {
  const itemCab = (item.Cab || "").toString().trim().toUpperCase();
  const myCab = (authStore.userCabang || "").toString().trim().toUpperCase();

  if (itemCab !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
    return toast.error(`Bukan cabang anda. (Data: ${itemCab}, Anda: ${myCab})`);
  }

  if (item.Status !== "OPEN")
    return toast.error(`Sudah ${item.Status}. Tidak bisa dihapus.`);
};

// -- Aksi: Approve Gudang --
const onApproveGudang = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  if (!authStore.user?.bagian?.toUpperCase().includes("GUDANG")) {
    return toast.error("Anda tidak punya hak.");
  }

  // Jika kondisi GANTI BS / GANTI HILANG dan belum di-approve gudang
  if (
    ["GANTI BS", "GANTI HILANG", "TAMBAHAN"].includes(item.Keterangan) &&
    (item.ApvGudang === "N" || item.ApvGudang === "TOLAK")
  ) {
    actionType.value = "GUDANG";
    actionForm.value = {
      status: item.ApvGudang === "TOLAK" ? "TOLAK" : "APPROVE",
      alasan: item.AlasanTolak_ApvGudang || "",
      urut: 0,
    };
    actionDialog.value = true;
  } else {
    toast.info("Data tidak memerlukan approval Gudang.");
  }
};

// -- Aksi: Approve Manager --
const onApproveManager = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  if (!authStore.user?.flags?.isManager) {
    return toast.error("Anda tidak punya hak.");
  }

  if (item.ApvManager === "N" || item.ApvManager === "TOLAK") {
    actionType.value = "MANAGER";
    actionForm.value = {
      status: item.ApvManager === "TOLAK" ? "TOLAK" : "APPROVE",
      alasan: item.AlasanTolak_ApvManager || "",
      urut: 0,
    };
    actionDialog.value = true;
  } else {
    toast.info("Data tidak memerlukan approval Manager.");
  }
};

// -- Aksi: Pengajuan Perubahan --
const onAjukanPerubahan = async () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  // (Simulasi cek zClose, di sini kita sederhanakan)
  if (item.Status !== "OPEN" && item.Ngedit !== "WAIT") {
    actionType.value = "AJUKAN";
    actionForm.value = { status: "APPROVE", alasan: "", urut: 1 }; // Default urut = 1
    actionDialog.value = true;
  } else {
    toast.info("Tidak perlu pengajuan perubahan data.");
  }
};

// -- Eksekusi Aksi Dialog --
const submitAction = async () => {
  const item = selected.value[0];
  if (actionForm.value.status === "TOLAK" && !actionForm.value.alasan) {
    return toast.warning("Alasan tolak harus diisi.");
  }
  if (actionType.value === "AJUKAN" && !actionForm.value.alasan) {
    return toast.warning("Alasan pengajuan harus diisi.");
  }

  try {
    if (actionType.value === "GUDANG") {
      await mintaBahanService.approveGudang(item.Nomor, actionForm.value);
      toast.success("Approve Gudang berhasil disimpan.");
    } else if (actionType.value === "MANAGER") {
      await mintaBahanService.approveManager(item.Nomor, actionForm.value);
      toast.success("Approve Manager berhasil disimpan.");
    } else if (actionType.value === "AJUKAN") {
      await mintaBahanService.ajukanPerubahan(item.Nomor, {
        alasan: actionForm.value.alasan,
        tgl: item.Tanggal,
        spk: item.SPK,
        urut: actionForm.value.urut,
      });
      toast.success("Pengajuan berhasil dikirim.");
    }

    actionDialog.value = false;
    fetchData(); // Refresh Data
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Terjadi kesalahan.");
  }
};

// -- Aksi: Approve Realisasi (Detail) --
const onApproveRealisasi = async (
  itemNomor: string,
  relNomor: string,
  itemCab: string,
) => {
  const cabStr = (itemCab || "").toString().trim().toUpperCase();
  const myCab = (authStore.userCabang || "").toString().trim().toUpperCase();

  // CEK CABANG
  if (cabStr !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
    return toast.error(`Bukan cabang anda. (Data: ${cabStr}, Anda: ${myCab})`);
  }
  try {
    await mintaBahanService.approveRealisasi(relNomor);
    toast.success("Realisasi berhasil diapprove.");

    // Refresh bagian detail data saja tanpa mereload seluruh tabel master
    const res = await mintaBahanService.getDetail(itemNomor);
    detailsData.value[itemNomor] = res.data.data;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal approve realisasi.");
  }
};

const closeDialog = ref(false);
const closeForm = ref({ nomor: "", alasan: "" });
const openCloseDialog = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  const itemCab = (item.Cab || "").toString().trim().toUpperCase();
  const myCab = (authStore.userCabang || "").toString().trim().toUpperCase();

  // CEK CABANG & HAK AKSES
  if (itemCab !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
    const bagian = authStore.user?.bagian?.toUpperCase() || "";
    if (!bagian.includes("GUDANG")) {
      return toast.error(
        `Bukan cabang anda. (Data: ${itemCab}, Anda: ${myCab})`,
      );
    }
  }

  if (item.Status === "CLOSE" || item.Status === "DICLOSE")
    return toast.warning(`Data sudah ${item.Status}.`);

  closeForm.value = { nomor: item.Nomor, alasan: "" };
  closeDialog.value = true;
};
const submitClose = async () => {
  if (!closeForm.value.alasan) return toast.warning("Alasan harus diisi.");
  try {
    await mintaBahanService.setClose(closeForm.value.nomor, {
      alasan: closeForm.value.alasan,
    });
    toast.success("Berhasil diclose");
    closeDialog.value = false;
    fetchData();
  } catch {
    toast.error("Gagal melakukan close transaksi.");
  }
};

const onPrint = () => {
  if (!selected.value.length) return;
  const nomor = selected.value[0].Nomor;
  window.open(
    `/garmen/bahan-baku/minta-bahan/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);
</script>

<template>
  <BaseBrowse
    title="Permintaan Bahan Baku"
    menu-id="127"
    :icon="IconBox"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    show-expand
    v-model:expanded="expandedRows"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="handleRowProps"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="exportToExcel('Permintaan_Bahan_Baku')"
  >
    <!-- ── Filter bar ── -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <div class="filter-group ml-3">
        <span class="filter-label">Cabang</span>
        <select
          v-model="filterState.cabang"
          class="date-inp"
          style="width: 80px"
          @change="fetchData"
        >
          <option v-for="cab in cabangOptions" :key="cab" :value="cab">
            {{ cab }}
          </option>
        </select>
      </div>

      <div class="filter-divider" />

      <!-- Legend -->
      <div class="legend-group">
        <span class="filter-label" style="color: #888">Status:</span>
        <div class="legend-item">
          <div class="ldot" style="background: #e53935"></div>
          <span>OPEN</span>
        </div>
        <div class="legend-item">
          <div class="ldot" style="background: #1976d2"></div>
          <span>ONPROSES</span>
        </div>
        <div class="legend-item">
          <div class="ldot" style="background: #fdd835"></div>
          <span>Blm Approve</span>
        </div>
        <div class="filter-divider" style="margin: 0 6px" />
        <span class="filter-label" style="color: #888">Ngedit:</span>
        <span class="badge-wait" style="font-size: 10px; padding: 2px 6px"
          >Nunggu Acc</span
        >
        <span class="badge-acc" style="font-size: 10px; padding: 2px 6px"
          >Sudah Acc</span
        >
        <span class="badge-tolak" style="font-size: 10px; padding: 2px 6px"
          >Tolak</span
        >
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        v-if="authStore.user?.bagian?.toUpperCase().includes('GUDANG')"
        size="small"
        color="teal-darken-2"
        :disabled="selected.length === 0"
        @click="onApproveGudang"
      >
        <template #prepend>
          <IconHelmet :size="15" :stroke-width="1.7" />
        </template>
        Apv. Gudang
      </v-btn>

      <v-btn
        v-if="authStore.user?.flags?.isManager"
        size="small"
        color="indigo-darken-2"
        :disabled="selected.length === 0"
        @click="onApproveManager"
      >
        <template #prepend><IconTie :size="15" :stroke-width="1.7" /></template>
        Apv. Manager
      </v-btn>

      <v-btn
        v-if="canEdit"
        size="small"
        color="orange-darken-3"
        :disabled="selected.length === 0"
        @click="onAjukanPerubahan"
      >
        <template #prepend
          ><IconFileDescription :size="15" :stroke-width="1.7"
        /></template>
        Pengajuan
      </v-btn>

      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        v-if="canEdit"
        size="small"
        color="red-darken-3"
        :disabled="selected.length === 0"
        @click="openCloseDialog"
      >
        <template #prepend
          ><IconCircleX :size="15" :stroke-width="1.7"
        /></template>
        Close Transaksi
      </v-btn>
    </template>

    <!-- ── Kolom custom ── -->
    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.Nomor="{ item }">
      <span :class="getNomorClass(item)">{{ item.Nomor }}</span>
    </template>
    <template #item.JmlSpk="{ item }">{{ num(item.JmlSpk) }}</template>
    <template #item.Approve="{ item }">
      <span :class="getApvClass(item.Approve)">{{ item.Approve }}</span>
    </template>
    <template #item.ApvGudang="{ item }">
      <span :class="getApvClass(item.ApvGudang)">{{ item.ApvGudang }}</span>
    </template>
    <template #item.ApvManager="{ item }">
      <span :class="getApvClass(item.ApvManager)">{{ item.ApvManager }}</span>
    </template>

    <!-- ── Detail expand ── -->
    <template #detail="{ item }">
      <div class="det-wrap">
        <div v-if="loadingDetails.has(item.Nomor)" class="det-loading">
          <v-progress-circular
            indeterminate
            color="primary"
            size="20"
            width="2"
          />
          <span>Memuat detail...</span>
        </div>

        <template v-else-if="detailsData[item.Nomor]">
          <!-- Tabel 1: Detail Permintaan Bahan -->
          <div class="det-card tbl1 mb-2">
            <div class="det-head" style="background: #1565c0">
              Detail Permintaan Bahan
            </div>
            <div class="dt-scroll">
              <table class="dt">
                <thead>
                  <tr>
                    <th style="width: 28px">No</th>
                    <th style="width: 140px; text-align: left">Nomor</th>
                    <th style="width: 90px; text-align: left">Kode</th>
                    <th style="text-align: left">Nama Bahan</th>
                    <th style="width: 50px">Satuan</th>
                    <th style="width: 70px; text-align: right">Babaran</th>
                    <th style="width: 60px; text-align: right">PCS</th>
                    <th style="width: 75px; text-align: right">Jumlah</th>
                    <th style="width: 75px; text-align: right">Realisasi</th>
                    <th style="width: 120px; text-align: left">Komponen</th>
                    <th style="text-align: left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(bhn, i) in detailsData[item.Nomor].bahan"
                    :key="i"
                  >
                    <td class="tc">{{ i + 1 }}</td>
                    <td style="font-weight: 600; color: #555">
                      {{ bhn.Nomor }}
                    </td>
                    <td style="font-weight: 600; color: #1565c0">
                      {{ bhn.Kode }}
                    </td>
                    <td>{{ bhn.NamaBahan }}</td>
                    <td class="tc">{{ bhn.Satuan }}</td>
                    <td class="tr">{{ num(bhn.Babaran) }}</td>
                    <td class="tr">{{ num(bhn.Pcs) }}</td>
                    <td
                      class="tr"
                      style="font-weight: 700; background: #fffde7"
                    >
                      {{ num(bhn.Jumlah) }}
                    </td>
                    <td class="tr" style="font-weight: 700; color: #2e7d32">
                      {{ num(bhn.Realisasi) }}
                    </td>
                    <td>{{ bhn.Komponen }}</td>
                    <td>{{ bhn.Keterangan }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- /.dt-scroll -->
          </div>

          <!-- Tabel 2 & 3: Realisasi + Detail Realisasi -->
          <div class="det-row">
            <!-- Tabel 2: Realisasi -->
            <div class="det-card" style="flex: 1.2">
              <div class="det-head" style="background: #00796b">
                Realisasi
                <span
                  style="
                    font-weight: 400;
                    font-size: 10px;
                    margin-left: 8px;
                    opacity: 0.85;
                  "
                  >(Klik baris untuk melihat rincian)</span
                >
              </div>
              <div class="dt-scroll">
                <table class="dt">
                  <thead>
                    <tr>
                      <th style="width: 28px">No</th>
                      <th style="width: 140px; text-align: left">
                        No. Realisasi
                      </th>
                      <th style="width: 95px">Tgl Realisasi</th>
                      <th style="width: 145px">Waktu Approve</th>
                      <th style="width: 75px; text-align: right">Jumlah</th>
                      <th style="text-align: left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(rel, i) in detailsData[item.Nomor].realisasi"
                      :key="i"
                      class="rel-row"
                      :class="{
                        'rel-active':
                          activeRealisasi[item.Nomor] === rel.NomorRealisasi,
                      }"
                      @click="selectRealisasi(item.Nomor, rel.NomorRealisasi)"
                    >
                      <td class="tc">{{ i + 1 }}</td>
                      <td style="font-weight: 700; color: #00796b">
                        {{ rel.NomorRealisasi }}
                      </td>
                      <td class="tc">{{ rel.TglRealisasi }}</td>
                      <td class="tc">
                        <span v-if="rel.WaktuApprove">{{
                          rel.WaktuApprove
                        }}</span>
                        <v-btn
                          size="x-small"
                          color="primary"
                          variant="flat"
                          class="px-2 text-none"
                          @click.stop="
                            onApproveRealisasi(
                              item.Nomor,
                              rel.NomorRealisasi,
                              item.Cab,
                            )
                          "
                        >
                          <IconCheck
                            :size="14"
                            :stroke-width="2"
                            class="mr-1"
                          />
                          ACC
                        </v-btn>
                      </td>
                      <td class="tr" style="font-weight: 700">
                        {{ num(rel.TotalJumlah) }}
                      </td>
                      <td>{{ rel.Keterangan }}</td>
                    </tr>
                    <tr v-if="!detailsData[item.Nomor].realisasi?.length">
                      <td colspan="6" class="empty-td">Belum ada realisasi.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!-- /.dt-scroll -->
            </div>

            <!-- Tabel 3: Detail Realisasi -->
            <div class="det-card" style="flex: 0.8">
              <div class="det-head" style="background: #455a64">
                Detail Realisasi
                <span
                  v-if="activeRealisasi[item.Nomor]"
                  style="
                    font-weight: 400;
                    font-size: 10px;
                    margin-left: 6px;
                    opacity: 0.85;
                  "
                >
                  : {{ activeRealisasi[item.Nomor] }}
                </span>
              </div>
              <div class="dt-scroll">
                <table class="dt">
                  <thead>
                    <tr>
                      <th style="width: 28px">No</th>
                      <th style="width: 80px; text-align: left">Kode</th>
                      <th style="text-align: left">Nama</th>
                      <th style="width: 55px">Satuan</th>
                      <th style="width: 75px; text-align: right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-if="activeRealisasi[item.Nomor]">
                      <tr
                        v-for="(dtl, j) in (
                          detailsData[item.Nomor].realisasiDtl || []
                        ).filter(
                          (x) =>
                            x.NomorRealisasi === activeRealisasi[item.Nomor],
                        )"
                        :key="j"
                      >
                        <td class="tc">{{ j + 1 }}</td>
                        <td style="font-weight: 600; color: #1565c0">
                          {{ dtl.Kode }}
                        </td>
                        <td>{{ dtl.Nama }}</td>
                        <td class="tc">{{ dtl.Satuan }}</td>
                        <td
                          class="tr"
                          style="font-weight: 700; background: #fffde7"
                        >
                          {{ num(dtl.Jumlah) }}
                        </td>
                      </tr>
                    </template>
                    <tr v-else>
                      <td colspan="5" class="empty-td">
                        Pilih data realisasi di sebelah kiri.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!-- /.dt-scroll -->
            </div>
          </div>
        </template>
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog Close -->
  <v-dialog v-model="closeDialog" max-width="400px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header">
        <IconCircleX :size="14" color="white" class="mr-2" />
        Close Transaksi
        <button class="dlg-x" @click="closeDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        <div class="f-lbl-sm mb-1">Alasan Close:</div>
        <textarea
          v-model="closeForm.alasan"
          class="close-area"
          rows="3"
          placeholder="Masukkan alasan manual close..."
        ></textarea>
      </div>
      <div class="close-dlg-footer">
        <button class="dlg-btn save" @click="submitClose">Simpan Close</button>
        <button class="dlg-btn cancel" @click="closeDialog = false">
          Batal
        </button>
      </div>
    </div>
  </v-dialog>

  <v-dialog v-model="actionDialog" max-width="400px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #1565c0">
        <component
          :is="actionType === 'AJUKAN' ? IconFileDescription : IconShieldCheck"
          :size="14"
          color="white"
          class="mr-2"
        />
        {{
          actionType === "GUDANG"
            ? "Approve Gudang"
            : actionType === "MANAGER"
              ? "Approve Manager"
              : "Pengajuan Perubahan"
        }}
        <button class="dlg-x" @click="actionDialog = false">✕</button>
      </div>

      <div class="close-dlg-body">
        <template v-if="actionType !== 'AJUKAN'">
          <div class="d-flex gap-4 mb-3">
            <label class="d-flex align-center gap-1 cursor-pointer">
              <input type="radio" v-model="actionForm.status" value="APPROVE" />
              <span class="font-weight-bold">Approve</span>
            </label>
            <label
              class="d-flex align-center gap-1 cursor-pointer text-red-darken-3"
            >
              <input type="radio" v-model="actionForm.status" value="TOLAK" />
              <span class="font-weight-bold">Tolak</span>
            </label>
          </div>
        </template>

        <div class="f-lbl-sm mb-1">
          {{
            actionType === "AJUKAN"
              ? "Alasan Pengajuan:"
              : actionForm.status === "TOLAK"
                ? "Alasan Penolakan (Wajib):"
                : "Keterangan (Opsional):"
          }}
        </div>
        <textarea
          v-model="actionForm.alasan"
          class="close-area"
          rows="3"
          placeholder="Masukkan alasan..."
        ></textarea>
      </div>

      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          style="background: #1565c0"
          @click="submitAction"
        >
          Simpan
        </button>
        <button class="dlg-btn cancel" @click="actionDialog = false">
          Batal
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* ── Filter ── */
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.filter-sep {
  font-size: 11px;
  color: #888;
}
.filter-divider {
  width: 1px;
  height: 22px;
  background: #d0d0d0;
  margin: 0 10px;
  flex-shrink: 0;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.date-inp:focus {
  border-color: #1976d2;
}
.ml-3 {
  margin-left: 12px;
}

.legend-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}
.ldot {
  width: 11px;
  height: 11px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

/* ── Ngedit badges ── */
.badge-wait {
  background: #1565c0;
  color: white;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.badge-acc {
  background: #2e7d32;
  color: white;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.badge-tolak {
  background: #c62828;
  color: white;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.apv-n {
  background: #fdd835;
  color: #333;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  display: inline-block;
}

/* ── Detail wrapper ── */
.det-wrap {
  padding: 6px 8px 8px 48px;
  background: #f5f6f8;
}
.det-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  font-size: 12px;
  color: #757575;
}
.mb-2 {
  margin-bottom: 6px;
}

.det-card {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}
.det-head {
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 4px 9px;
  flex-shrink: 0;
}
.det-row {
  display: flex;
  gap: 8px;
}

/* Scroll wrapper dalam setiap card */
.det-card .dt-scroll {
  overflow-y: auto;
  max-height: 140px;
}
/* Tabel 1 sedikit lebih tinggi karena bisa lebih banyak bahan */
.det-card.tbl1 .dt-scroll {
  max-height: 110px;
}

/* ── Detail table ── */
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt thead tr {
  background-color: inherit;
}
.dt th {
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.15);
  white-space: nowrap;
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 3px 6px;
  vertical-align: middle;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}

.rel-row {
  cursor: pointer;
}
.rel-row:hover td {
  background: #e0f2f1 !important;
}
.rel-active td {
  background: #b2dfdb !important;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px !important;
}

/* ── Close dialog ── */
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
  background: #c62828;
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
  font-size: 15px;
  cursor: pointer;
}
.dlg-x:hover {
  color: white;
}
.close-dlg-body {
  padding: 14px;
}
.f-lbl-sm {
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.close-area {
  width: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  resize: none;
  box-sizing: border-box;
}
.close-area:focus {
  border-color: #1565c0;
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
.dlg-btn.save {
  background: #c62828;
  color: white;
}
.dlg-btn.save:hover {
  background: #b71c1c;
}
.dlg-btn.cancel {
  background: #e0e0e0;
  color: #424242;
  margin-left: auto;
}
.dlg-btn.cancel:hover {
  background: #d0d0d0;
}
</style>
