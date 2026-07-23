<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mintaBarangService } from "@/services/garmen/mintaBarangService";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import {
  IconPackage,
  IconFileDescription,
  IconPrinter,
  IconCircleX,
  IconFileSpreadsheet,
  IconCheck,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const activeRealisasi = ref<Record<string, string>>({});
const selectRealisasi = (itemNomor: string, relNomor: string) => {
  activeRealisasi.value[itemNomor] = relNomor;
};

const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  cabang: "ALL",
  jenis: "ACCESORIES",
});

const cabangOptions = ref<string[]>(["ALL"]);
const jenisOptions = ["ACCESORIES", "OBAT", "SPAREPART", "ATK/RTK"];

onMounted(async () => {
  // 1. Set default Jenis berdasarkan Bagian User
  const bagian = (authStore.user?.bagian || "").toUpperCase();
  if (bagian === "GA") {
    filterState.value.jenis = "ATK/RTK";
  } else if (bagian === "TEKNISI" || bagian === "IT") {
    filterState.value.jenis = "SPAREPART";
  } else {
    filterState.value.jenis = "ACCESORIES";
  }

  // 2. Fetch Cabang Options
  try {
    const res = await api.get("/lookups/cabang-pabrik");
    cabangOptions.value = ["ALL", ...res.data.data.map((b: any) => b.Kode)];
  } catch {
    /* silent */
  }

  // 3. Default cabang dari user — kecuali HO tetap ALL
  const userCabang = (authStore.user?.cabang || "").toUpperCase();
  if (userCabang && userCabang !== "HO-" && userCabang !== "HO") {
    // Pastikan cabang user ada di list options
    if (cabangOptions.value.includes(userCabang)) {
      filterState.value.cabang = userCabang;
    }
  }
  // HO → tetap "ALL" (sudah default dari filterState)
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
  menuId: "60",
  fetchApi: async () => {
    const res = await mintaBarangService.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
      filterState.value.cabang,
      filterState.value.jenis,
    );
    return res.data.data;
  },
  deleteApi: async (nomor: string) => {
    await mintaBarangService.deleteData(nomor);
  },
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "135px" },
  { title: "Jenis", key: "Jenis", width: "100px" },
  { title: "Tanggal", key: "Tanggal", width: "90px" },
  { title: "Jam", key: "Jam", width: "75px" },
  { title: "Cab", key: "Cab", width: "60px" },
  { title: "Gdg Peminta", key: "GdgPeminta", width: "120px" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "SPK", key: "SPK", width: "140px" },
  { title: "Nama SPK", key: "NamaSpk", minWidth: "160px" },
  { title: "Jml SPK", key: "JmlSpk", width: "80px", align: "end" },
  { title: "Keterangan", key: "Keterangan", minWidth: "130px" },
  { title: "Status", key: "Status", width: "90px" },
  { title: "Alasan Close", key: "AlasanClose", minWidth: "120px" },
  { title: "Approve", key: "Approve", width: "80px", align: "center" },
  { title: "User", key: "Usr", width: "80px" },
  { title: "Bagian", key: "Bagian", width: "100px" },
];

const handleRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Status === "OPEN")
    return { style: "color:#d32f2f!important;font-weight:600" };
  if (item.Status === "PROSES")
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

const expandedRows = ref<any[]>([]);

// ── Aksi: Tambah, Ubah, Hapus ──
const onAdd = async () => {
  try {
    if (filterState.value.jenis === "ACCESORIES") {
      const res = await mintaBarangService.checkInsert();
      if (res.data.isBlocked) {
        return toast.warning(
          "Permintaan Anda ada yang belum di approve > 1 hari.\nSilahkan di approve dulu supaya bisa membuat permintaan baru.",
        );
      }
    }
    // Pass jenis dari filter ke form
    router.push(
      `/garmen/barang/permintaan/form?jenis=${filterState.value.jenis}`,
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memverifikasi akses.");
  }
};

const onEdit = (item: any) => {
  const myCab = (authStore.userCabang || "").toUpperCase();
  if (item.Cab !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
    return toast.error(
      `Bukan cabang anda. (Data: ${item.Cab}, Anda: ${myCab})`,
    );
  }
  router.push(
    `/garmen/barang/permintaan/form/${encodeURIComponent(item.Nomor)}`,
  );
};

const onDelete = (item: any) => {
  const myCab = (authStore.userCabang || "").toUpperCase();
  if (item.Cab !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
    return toast.error("Bukan cabang anda.");
  }
  if (item.Status !== "OPEN") {
    return toast.error(`Sudah ${item.Status}. Tidak bisa dihapus.`);
  }
};

// ── Aksi: Close Transaksi ──
const closeDialog = ref(false);
const closeForm = ref({ nomor: "", alasan: "" });

const openCloseDialog = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  const myCab = (authStore.userCabang || "").toUpperCase();
  const isGudang = authStore.user?.bagian?.toUpperCase().includes("GUDANG");

  if (
    item.Cab !== myCab &&
    myCab !== "ALL" &&
    !myCab.startsWith("HO") &&
    !isGudang
  ) {
    return toast.error("Bukan cabang anda.");
  }

  if (item.Status === "CLOSE" || item.Status === "DICLOSE") {
    return toast.warning(`Data sudah ${item.Status}.`);
  }

  closeForm.value = { nomor: item.Nomor, alasan: "" };
  closeDialog.value = true;
};

const submitClose = async () => {
  if (!closeForm.value.alasan)
    return toast.warning("Alasan close harus diisi.");
  try {
    await mintaBarangService.setClose(closeForm.value.nomor, {
      alasan: closeForm.value.alasan,
    });
    toast.success("Berhasil diclose");
    closeDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal melakukan close transaksi.",
    );
  }
};

// ── Aksi: Pengajuan Perubahan (PIN 5) ──
const actionDialog = ref(false);
const actionForm = ref({ status: "AJUKAN", alasan: "", urut: 1 });

const onAjukanPerubahan = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  if (item.Status !== "OPEN" && item.Ngedit !== "WAIT") {
    actionForm.value = { status: "AJUKAN", alasan: "", urut: 1 };
    actionDialog.value = true;
  } else {
    toast.info("Tidak perlu pengajuan perubahan data.");
  }
};

const submitAjukan = async () => {
  if (!actionForm.value.alasan) return toast.warning("Alasan harus diisi.");
  const item = selected.value[0];

  try {
    await mintaBarangService.ajukanPerubahan(item.Nomor, {
      alasan: actionForm.value.alasan,
      tgl: item.Tanggal,
      spk: item.SPK,
      urut: actionForm.value.urut,
    });
    toast.success("Berhasil diajukan. Menunggu ACC.");
    actionDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Pengajuan.");
  }
};

const onPrint = () => {
  if (!selected.value.length) return;
  const nomor = selected.value[0].Nomor;
  window.open(
    `/garmen/barang/permintaan/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

// --- Aksi: Approve Realisasi (F7 di Delphi) ---
const onApproveRealisasi = async (
  itemNomor: string,
  relNomor: string,
  itemCab: string,
) => {
  const myCab = (authStore.userCabang || "").toUpperCase();

  if (itemCab !== myCab && myCab !== "ALL" && !myCab.startsWith("HO")) {
    return toast.error(`Bukan cabang anda. (Data: ${itemCab}, Anda: ${myCab})`);
  }

  try {
    await mintaBarangService.approveRealisasi(relNomor);
    toast.success("Realisasi berhasil diapprove.");
    fetchData(); // Refresh data untuk melihat perubahan status dan nomor APVS (jika sparepart)
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal approve realisasi.");
  }
};

// --- Aksi: Export Detail ---
const onExportDetail = () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  const rows: any[] = [];
  items.value.forEach((master: any) => {
    if (master.details && master.details.length > 0) {
      master.details.forEach((dtl: any) => {
        rows.push({
          "Nomor Permintaan": master.Nomor,
          Tanggal: formatTanggal(master.Tanggal),
          Jenis: master.Jenis,
          Cabang: master.Cab,
          "Gudang Peminta": master.GdgPeminta,
          SPK: master.SPK,
          "Nama SPK": master.NamaSpk,
          Status: master.Status,
          "Kode Barang": dtl.Kode,
          "Nama Barang": dtl.Nama,
          Satuan: dtl.Satuan,
          "Jml Diminta": dtl.Jumlah,
          "Jml Direalisasi": dtl.Realisasi,
          "Keterangan Detail": dtl.Keterangan || "",
        });
      });
    }
  });

  if (rows.length === 0) {
    return toast.warning("Tidak ada rincian barang untuk diexport.");
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((fieldName) => {
          let data =
            row[fieldName] !== null && row[fieldName] !== undefined
              ? String(row[fieldName])
              : "";
          data = data.replace(/"/g, '""');
          if (data.includes(",") || data.includes("\n") || data.includes('"')) {
            data = `"${data}"`;
          }
          return data;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `Export_Detail_Minta_Barang_${filterState.value.startDate}_sd_${filterState.value.endDate}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success("Berhasil meng-export detail data.");
};

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);
</script>

<template>
  <BaseBrowse
    title="Permintaan Barang Garmen"
    menu-id="60"
    :icon="IconPackage"
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
    @export="exportToExcel('Permintaan_Barang_Garmen')"
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

      <div class="filter-divider" />

      <div class="filter-group">
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

      <div class="filter-group">
        <span class="filter-label">Jenis</span>
        <div class="radio-wrap">
          <label v-for="jns in jenisOptions" :key="jns" class="radio-label">
            <input
              type="radio"
              v-model="filterState.jenis"
              :value="jns"
              @change="fetchData"
            />
            {{ jns === "ATK/RTK" ? "ATK" : jns === "ACCESORIES" ? "ACC" : jns }}
          </label>
        </div>
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
          <span>PROSES</span>
        </div>
        <div class="legend-item">
          <div class="ldot" style="background: #fdd835"></div>
          <span>Blm Approve</span>
        </div>
        <div class="filter-divider" style="margin: 0 6px" />
        <span class="filter-label" style="color: #888">Ngedit:</span>
        <span class="badge-wait">Nunggu Acc</span>
        <span class="badge-acc">Sudah Acc</span>
        <span class="badge-tolak">Tolak</span>
      </div>
    </template>

    <template #extra-actions="{ selected }">
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
        class="ml-2"
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
        class="ml-2"
        :disabled="selected.length === 0"
        @click="openCloseDialog"
      >
        <template #prepend
          ><IconCircleX :size="15" :stroke-width="1.7"
        /></template>
        Close Transaksi
      </v-btn>

      <v-btn
        size="small"
        color="green-darken-3"
        variant="outlined"
        class="ml-2"
        @click="onExportDetail"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>
    </template>

    <!-- ── Kolom custom ── -->
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.Nomor="{ item }">
      <span :class="getNomorClass(item)">{{ item.Nomor }}</span>
    </template>
    <template #item.JmlSpk="{ item }">{{ num(item.JmlSpk) }}</template>
    <template #item.Approve="{ item }">
      <span :class="getApvClass(item.Approve)">{{ item.Approve }}</span>
    </template>

    <!-- ── Detail Expand (Langsung dirender dari data Master) ── -->
    <template #detail="{ item }">
      <div class="det-wrap d-flex gap-3">
        <!-- Tabel 1: Detail Barang -->
        <div class="det-card" style="flex: 1.2">
          <div class="det-head" style="background: #1565c0">Detail Barang</div>
          <div class="dt-scroll">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="width: 100px; text-align: left">Kode</th>
                  <th style="text-align: left">Nama Barang</th>
                  <th style="width: 60px">Satuan</th>
                  <th style="width: 80px; text-align: right">Jumlah</th>
                  <th style="width: 80px; text-align: right">Realisasi</th>
                  <th style="text-align: left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(dtl, i) in item.details" :key="i">
                  <td class="tc">{{ Number(i) + 1 }}</td>
                  <td style="font-weight: 600; color: #1565c0">
                    {{ dtl.Kode }}
                  </td>
                  <td>{{ dtl.Nama }}</td>
                  <td class="tc">{{ dtl.Satuan }}</td>
                  <td class="tr" style="font-weight: 700; background: #fffde7">
                    {{ num(dtl.Jumlah) }}
                  </td>
                  <td class="tr" style="font-weight: 700; color: #2e7d32">
                    {{ num(dtl.Realisasi) }}
                  </td>
                  <td>{{ dtl.Keterangan }}</td>
                </tr>
                <tr v-if="!item.details?.length">
                  <td colspan="7" class="empty-td">
                    Tidak ada rincian barang.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tabel 2 & 3: Realisasi + Detail Realisasi -->
        <div class="det-row" style="flex: 1.8">
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
              >
                (Klik baris untuk melihat rincian)
              </span>
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
                    <!-- Lebarkan kolom Waktu Approve agar tombol muat -->
                    <th style="width: 160px">Waktu Approve</th>
                    <th style="width: 75px; text-align: right">Jumlah</th>
                    <th style="text-align: left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(rel, i) in item.realisasi"
                    :key="i"
                    class="rel-row"
                    :class="{
                      'rel-active':
                        activeRealisasi[item.Nomor] === rel.NoRealisasi,
                    }"
                    @click="selectRealisasi(item.Nomor, rel.NoRealisasi)"
                  >
                    <td class="tc">{{ Number(i) + 1 }}</td>
                    <td style="font-weight: 700; color: #00796b">
                      {{ rel.NoRealisasi }}
                    </td>
                    <td class="tc">{{ formatTanggal(rel.TglRealisasi) }}</td>

                    <!-- BAGIAN INI YANG DIUBAH -->
                    <td class="tc">
                      <span v-if="rel.Approve">{{ rel.Approve }}</span>
                      <!-- Tambahkan tombol ACC di sini -->
                      <v-btn
                        v-else
                        size="x-small"
                        color="primary"
                        variant="flat"
                        class="px-2 text-none"
                        @click.stop="
                          onApproveRealisasi(
                            item.Nomor,
                            rel.NoRealisasi,
                            item.Cab,
                          )
                        "
                      >
                        <IconCheck :size="14" :stroke-width="2" class="mr-1" />
                        ACC
                      </v-btn>
                    </td>
                    <!-- AKHIR BAGIAN YANG DIUBAH -->

                    <td class="tr" style="font-weight: 700">
                      {{ num(rel.Jumlah) }}
                    </td>
                    <td>{{ rel.Keterangan }}</td>
                  </tr>
                  <tr v-if="!item.realisasi?.length">
                    <td colspan="6" class="empty-td">Belum ada realisasi.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tabel 3: Detail Realisasi -->
          <div class="det-card" style="flex: 0.8">
            <div class="det-head" style="background: #455a64">
              Rincian Item
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
                    <th style="text-align: left">Nama Barang</th>
                    <th style="width: 55px">Satuan</th>
                    <th style="width: 75px; text-align: right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="activeRealisasi[item.Nomor]">
                    <tr
                      v-for="(dtl, j) in (item.realisasiDtl || []).filter(
                        (x: any) =>
                          x.NomorRealisasi === activeRealisasi[item.Nomor],
                      )"
                      :key="j"
                    >
                      <td class="tc">{{ Number(j) + 1 }}</td>
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
          </div>
        </div>
        <!-- /.det-row -->
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog Close Transaksi -->
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

  <!-- Dialog Pengajuan Perubahan -->
  <v-dialog v-model="actionDialog" max-width="400px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #1565c0">
        <IconFileDescription :size="14" color="white" class="mr-2" />
        Pengajuan Perubahan
        <button class="dlg-x" @click="actionDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        <div class="f-lbl-sm mb-1">Alasan Pengajuan:</div>
        <textarea
          v-model="actionForm.alasan"
          class="close-area"
          rows="3"
          placeholder="Masukkan alasan pengajuan edit..."
        ></textarea>
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          style="background: #1565c0"
          @click="submitAjukan"
        >
          Kirim Pengajuan
        </button>
        <button class="dlg-btn cancel" @click="actionDialog = false">
          Batal
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* Gunakan style filter yang sama persis dengan MintaBahanView.vue Anda */
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

.badge-wait {
  background: #1565c0;
  color: white;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
}
.badge-acc {
  background: #2e7d32;
  color: white;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
}
.badge-tolak {
  background: #c62828;
  color: white;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
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

/* ── Detail Wrapper ── */
.det-wrap {
  padding: 6px 8px 8px 48px;
  background: #f5f6f8;
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
.dt-scroll {
  overflow-y: auto;
  max-height: 140px;
}
.gap-3 {
  gap: 12px;
}

/* ── Detail Table ── */
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
  position: sticky;
  top: 0;
  z-index: 2;
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 3px 6px;
  vertical-align: middle;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.rel-row:hover td {
  background: #e0f2f1 !important;
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

/* ── Dialogs ── */
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

.radio-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  cursor: pointer;
  white-space: nowrap;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
  width: 13px;
  height: 13px;
  margin: 0;
}
</style>
