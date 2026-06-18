<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconCoin, IconSearch } from "@tabler/icons-vue";
import { pelunasanFormService } from "@/services/piutang/pelunasanFormService";
import api from "@/services/api";

import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import NotaInvoiceSearchModal from "@/components/lookups/NotaInvoiceSearchModal.vue";
import BuktiBayarSearchModal from "@/components/lookups/BuktiBayarSearchModal.vue";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const nomorUrl = route.params.nomor as string;

// ── DEKLARASIKAN menuId AGAR DIKENALI OLEH TEMPLATE ──
const menuId = "255";

const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const todayLocal = toLocalDate(new Date());

const defaultData = {
  Nomor: "",
  Cabang: "",
  NamaCabang: "",
  Tanggal: todayLocal,
  Notes: "",
  TglInvoice: todayLocal,
  TglTempo: todayLocal,
  NamaCustomer: "",
  NomorPembayaran: "",
  TglPembayaran: todayLocal,
  Piutang: 0,
  Terbayar: 0,
  SaldoPiutang: 0,
  SisaBayarTersedia: 0,
  StatusEdit: "",
  isTutupBuku: false,
  Detail: [
    {
      Nota: "",
      CusKode: "",
      Kode: "",
      NoBukti: "",
      Kredit: 0,
      NotesDetail: "",
    },
  ],
};

const cabangOptions = ref<any[]>([]);
const kodeBayarOptions = ref<any[]>([]);

const loadLookups = async () => {
  try {
    const [resCab, resKb] = await Promise.all([
      api.get("/lookups/perusahaan"),
      api.get("/lookups/kodebayar"),
    ]);
    cabangOptions.value = resCab.data.data;
    kodeBayarOptions.value = resKb.data.data;
  } catch (e) {}
};

const getNamaBayar = (kode: string) => {
  return kodeBayarOptions.value.find((k: any) => k.kode === kode)?.nama || "";
};

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: menuId,
  initialData: defaultData,
  fetchApi: async () => {
    const res = await pelunasanFormService.getFormEditData(nomorUrl);
    const d = res.data.data;

    const firstDetail = d.details.find((x: any) => x.nota);

    // Load info pembayaran dari baris pertama yang punya no_bukti
    let infoAlokasi: any = {};
    const firstWithBukti = d.details.find((x: any) => x.no_bukti);
    if (firstWithBukti?.no_bukti) {
      try {
        const resBayar = await pelunasanFormService.getInfoPembayaran(
          firstWithBukti.no_bukti,
          d.header.cabang,
        );
        infoAlokasi = resBayar.data.data;
      } catch {
        /* abaikan jika gagal */
      }
    }

    return {
      ...defaultData,
      Nomor: d.header.nomor,
      Cabang: d.header.cabang,
      NamaCabang: d.header.namacabang,
      Tanggal: d.header.tanggal || todayLocal,
      Notes: d.header.notes || "",

      // Info invoice dari nota pertama
      NamaCustomer: firstDetail?.cus_nama || "",
      TglInvoice: firstDetail?.inv_tanggal || todayLocal,
      TglTempo: firstDetail?.inv_tanggal_tempo || todayLocal,
      Piutang: Number(firstDetail?.nilai_piutang || 0),
      Terbayar: Number(firstDetail?.terbayar || 0),
      SaldoPiutang: Number(firstDetail?.saldo_piutang || 0),

      // Info pembayaran dari bukti bayar pertama
      NomorPembayaran: infoAlokasi.nomor_bayar || "",
      TglPembayaran: infoAlokasi.tanggal || todayLocal,
      SisaBayarTersedia: Math.max(
        0,
        Number(infoAlokasi.total_bayar || 0) -
          Number(infoAlokasi.total_kredit || 0),
      ),

      StatusEdit: d.header.statusEdit || "",
      isTutupBuku: d.header.isTutupBuku || false,

      Detail: d.details.length
        ? d.details.map((x: any) => ({
            Nota: x.nota || "",
            CusKode: x.inv_cus_kode || "",
            Kode: x.kode || "",
            NoBukti: x.no_bukti || "",
            Kredit: Number(x.kredit) || 0,
            NotesDetail: x.notesdetail || "",
          }))
        : defaultData.Detail,
    };
  },
  submitApi: async (data: any) => {
    return await pelunasanFormService.saveFormPelunasan({
      isEdit: isEditMode.value,
      nomor: data.Nomor,
      cabang: data.Cabang,
      tanggal: data.Tanggal,
      notes: data.Notes,
      details: data.Detail,
    });
  },
  onSuccess: (res: any) => {
    toast.success(`Tersimpan dengan nomor ${res.data.data.nomor}`);
    router.push("/piutang/pelunasan");
  },
});

const activeRowIdx = ref(-1);
const showNotaModal = ref(false);
const showPerusahaanModal = ref(false);
const showBuktiBayarModal = ref(false);
const activeBuktiBayarIdx = ref(-1);

const onCabangEnter = async () => {
  const kode = (formData.value.Cabang || "").trim().toUpperCase();
  if (!kode) {
    showPerusahaanModal.value = true;
    return;
  }
  try {
    const res = await api.get("/lookups/perusahaan");
    const found = (res.data.data || []).find(
      (p: any) => p.perush_kode?.toUpperCase() === kode,
    );
    if (found) {
      formData.value.Cabang = found.perush_kode;
      formData.value.NamaCabang = found.perush_nama;
    } else {
      toast.warning(`Perusahaan "${kode}" tidak ditemukan.`);
      formData.value.Cabang = "";
      formData.value.NamaCabang = "";
    }
  } catch {
    toast.error("Gagal mencari perusahaan.");
  }
};

const setPerusahaan = (item: any) => {
  formData.value.Cabang = item.perush_kode;
  formData.value.NamaCabang = item.perush_nama;
};

const openLookupNota = (idx: number) => {
  if (!formData.value.Cabang) {
    toast.warning(
      "Pilih Perusahaan terlebih dahulu agar hasil pencarian terfilter.",
    );
    // Tetap buka modal — user bisa search manual
  }
  activeRowIdx.value = idx;
  showNotaModal.value = true;
};

const openLookupBuktiBayar = (idx: number) => {
  const row = formData.value.Detail[idx];
  activeBuktiBayarIdx.value = idx;
  showBuktiBayarModal.value = true;
};

// ── setBuktiBayar: validasi customer cocok dengan nota ──
const setBuktiBayar = async (item: any) => {
  const idx = activeBuktiBayarIdx.value;
  if (idx < 0) return;

  const row = formData.value.Detail[idx];

  // Validasi customer — cek apakah customer di bukti bayar
  // match dengan customer di nota
  // Di Delphi: customer di terima_bayar_debet bisa multi (dipisah ';')
  const cusKodeBayar: string = item.Customer || "";
  const cusKodeNota: string = row.CusKode || "";

  if (cusKodeBayar && cusKodeNota) {
    // Customer di bukti bayar bisa format "00028;" atau "00028;00790;"
    const listCus = cusKodeBayar
      .split(";")
      .map((c: string) => c.trim())
      .filter(Boolean);

    const match = listCus.length === 0 || listCus.includes(cusKodeNota);

    if (!match) {
      toast.error(
        `Nomor Pembayaran ini berbeda customer.\n` +
          `Customer Nota: ${cusKodeNota}\n` +
          `Customer Bayar: ${cusKodeBayar}`,
      );
      return; // Batalkan — tidak set NoBukti
    }
  }

  // Cocok — set dan load info
  formData.value.Detail[idx].NoBukti = item.Nomor;
  await loadInfoBuktiBayar(idx);
};

const addItem = () => {
  formData.value.Detail.push({
    Nota: "",
    Kode: "",
    NoBukti: "",
    Kredit: 0,
    NotesDetail: "",
  });
};

const removeItem = (idx: number) => {
  formData.value.Detail.splice(idx, 1);
  if (formData.value.Detail.length === 0) addItem();
  kalkulasiTotal();
};

const loadInfoNota = async (idx: number, notaString: string) => {
  if (!notaString) return;
  try {
    isLoading.value = true;
    const res = await pelunasanFormService.getInfoInvoice(notaString);
    const info = res.data.data;

    formData.value.Detail[idx].Nota = info.inv_nomor;
    formData.value.Detail[idx].CusKode = info.inv_cus_kode;
    formData.value.NamaCustomer = info.cus_nama;
    formData.value.TglInvoice = info.inv_tanggal.substring(0, 10);
    formData.value.TglTempo = info.inv_tanggal_tempo.substring(0, 10);
    formData.value.Piutang = info.nilai;
    formData.value.Terbayar = info.terbayar;
    formData.value.SaldoPiutang = info.saldoPiutang;

    if (idx === formData.value.Detail.length - 1) addItem();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nota tidak ditemukan.");
    formData.value.Detail[idx].Nota = "";
  } finally {
    isLoading.value = false;
  }
};

const onNotaEnter = (idx: number) => {
  const nota = formData.value.Detail[idx].Nota?.trim();
  if (!nota) {
    openLookupNota(idx);
    return;
  }
  loadInfoNota(idx, nota);
};

const setNotaFromModal = (item: any) => {
  if (activeRowIdx.value > -1) {
    loadInfoNota(activeRowIdx.value, item.Nomor);
  }
};

const loadInfoBuktiBayar = async (idx: number) => {
  const noBayar = formData.value.Detail[idx].NoBukti;
  if (!noBayar) return;
  try {
    isLoading.value = true;
    const res = await pelunasanFormService.getInfoPembayaran(
      noBayar,
      formData.value.Cabang,
    );
    const info = res.data.data;

    // ── Validasi customer ──
    const cusKodeBayar: string = info.customer || "";
    const cusKodeNota: string = formData.value.Detail[idx].CusKode || "";

    if (cusKodeBayar && cusKodeNota) {
      const listCus = cusKodeBayar
        .split(";")
        .map((c: string) => c.trim())
        .filter(Boolean);

      const match = listCus.length === 0 || listCus.includes(cusKodeNota);
      if (!match) {
        toast.error("Nomor Pembayaran ini berbeda customer dengan nota.");
        formData.value.Detail[idx].NoBukti = "";
        return;
      }
    }

    // ── Isi info alokasi kiri ──
    formData.value.NamaCustomer = info.nama_customer;
    formData.value.NomorPembayaran = info.nomor_bayar; // ← nomor dari terima_bayar
    formData.value.TglPembayaran = info.tanggal.substring(0, 10);

    // ── Auto-fill Keterangan baris jika masih kosong ──
    if (!formData.value.Detail[idx].NotesDetail && info.keterangan) {
      formData.value.Detail[idx].NotesDetail = info.keterangan;
    }

    // ── Hitung Sisa Dana ──
    // total_bayar = debet di terima_bayar_debet
    // total_kredit = sudah dipakai di piutang_kredit_detail (DB)
    // terpakaiDiGrid = kredit baris lain di grid yang pakai NoBukti sama
    const terpakaiDiDB = Number(info.total_kredit);
    const terpakaiDiGrid = formData.value.Detail.reduce(
      (sum: number, d: any, i: number) => {
        return d.NoBukti === noBayar && i !== idx
          ? sum + Number(d.Kredit)
          : sum;
      },
      0,
    );

    formData.value.SisaBayarTersedia =
      Number(info.total_bayar) - terpakaiDiDB - terpakaiDiGrid;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "No Pembayaran tidak valid.");
    formData.value.Detail[idx].NoBukti = "";
  } finally {
    isLoading.value = false;
  }
};

const kalkulasiTotal = () => {
  // Hanya visual trigger jika diperlukan
};

const validateSave = () => {
  if (
    isEditMode.value &&
    formData.value.isTutupBuku &&
    formData.value.StatusEdit !== "ACC"
  ) {
    return toast.error(
      "Transaksi sudah diclose (Tutup Buku). Silakan minta approve PIN 5 terlebih dahulu.",
    );
  }
  if (!formData.value.Cabang) return toast.warning("Cabang harus diisi.");
  const validDetails = formData.value.Detail.filter((d: any) => d.Nota?.trim());
  if (!validDetails.length)
    return toast.warning("Detail pelunasan tidak boleh kosong.");

  for (let i = 0; i < validDetails.length; i++) {
    const r = validDetails[i];
    if (!r.Kode) return toast.warning(`Tipe bayar baris ${i + 1} harus diisi.`);
    if (r.Kode !== "RT" && !r.NoBukti)
      return toast.warning(`No Bukti bayar baris ${i + 1} harus diisi.`);
    if (Number(r.Kredit) <= 0)
      return toast.warning(`Nilai Bayar baris ${i + 1} tidak boleh nol.`);
  }

  formData.value.Detail = validDetails;
  showSaveDialog.value = true;
};

const fmtNum = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(Number(val) || 0));

// Fungsi untuk memformat angka ke string dengan separator titik
const formatInputThousand = (val: any) => {
  if (val === undefined || val === null || val === "") return "0";
  return new Intl.NumberFormat("id-ID").format(Number(val));
};

// Handler saat user mengetik di kolom Nilai Alokasi
const handleKreditChange = (e: Event, idx: number) => {
  const target = e.target as HTMLInputElement;

  // Bersihkan titik agar menjadi angka murni
  const cleanValue = target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
  const numValue = Number(cleanValue) || 0;

  // Masukkan angka murni ke form data
  formData.value.Detail[idx].Kredit = numValue;

  // Format visual inputnya dengan titik
  target.value = formatInputThousand(numValue);

  // 🔥 Jalankan kalkulasi total di sini setelah nilai fix berubah
  kalkulasiTotal();
};

onMounted(() => {
  loadLookups();
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Pelunasan Piutang' : 'Input Pelunasan Piutang'"
    :menu-id="menuId"
    :icon="IconCoin"
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
    <!-- ── Kolom kiri: header + info alokasi ── -->
    <template #left-column>
      <v-alert
        v-if="
          isEditMode && formData.isTutupBuku && formData.StatusEdit !== 'ACC'
        "
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-3 text-caption font-weight-bold"
      >
        <template v-if="formData.StatusEdit === 'WAIT'">
          Menunggu persetujuan perubahan data (PIN 5). Form ini dikunci
          sementara.
        </template>
        <template v-else-if="formData.StatusEdit === 'TOLAK'">
          Pengajuan perubahan data (PIN 5) DITOLAK!
        </template>
        <template v-else>
          Transaksi sudah Tutup Buku. Anda tidak bisa menyimpan perubahan
          sebelum mengajukan PIN 5 dari menu Daftar Pelunasan.
        </template>
      </v-alert>
      <div class="desktop-form-section header-section">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.Nomor"
            class="inp ro text-error fw"
            placeholder="<--Kosong=Baru"
            readonly
          />
        </div>
        <div class="fr">
          <label class="lbl">Perusahaan</label>
          <input
            v-model="formData.Cabang"
            class="inp"
            style="width: 55px; flex: none"
            placeholder="Kode"
            :readonly="isEditMode"
            :class="{ ro: isEditMode }"
            @keydown.enter.prevent="onCabangEnter"
            @keydown.f1.prevent="showPerusahaanModal = true"
          />
          <button
            v-if="!isEditMode"
            type="button"
            class="ci-btn"
            style="
              height: 24px;
              flex-shrink: 0;
              border: 1px solid #a0a0a0;
              border-left: none;
            "
            title="Cari Perusahaan (F1)"
            @click="showPerusahaanModal = true"
          >
            <IconSearch :size="12" />
          </button>
        </div>
        <div class="fr" style="margin-top: -2px">
          <label class="lbl"></label>
          <input
            :value="formData.NamaCabang"
            class="inp ro"
            placeholder="Nama perusahaan..."
            readonly
          />
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input type="date" v-model="formData.Tanggal" class="idate" />
        </div>
        <div class="fr" style="align-items: flex-start; margin-top: 4px">
          <label class="lbl" style="padding-top: 3px">Notes</label>
          <textarea
            v-model="formData.Notes"
            class="ta"
            rows="2"
            placeholder="Catatan pelunasan..."
          />
        </div>
      </div>

      <!-- Info Alokasi -->
      <div class="desktop-form-section mt-2">
        <div class="section-title">INFORMASI ALOKASI</div>

        <div class="fr">
          <label class="lbl w100">Customer</label>
          <input :value="formData.NamaCustomer" class="inp ro" readonly />
        </div>
        <div class="fr">
          <label class="lbl w100">No Pembayaran</label>
          <input :value="formData.NomorPembayaran" class="inp ro" readonly />
        </div>
        <div class="fr">
          <label class="lbl w100">Tgl Bayar</label>
          <input
            type="date"
            :value="formData.TglPembayaran"
            class="idate ro"
            readonly
          />
        </div>
        <div class="fr">
          <label class="lbl w100">Sisa Dana</label>
          <input
            :value="fmtNum(formData.SisaBayarTersedia)"
            class="inp ro tr text-error fw"
            readonly
          />
        </div>
      </div>
    </template>

    <!-- ── Kolom kanan: grid detail ── -->
    <template #right-column>
      <div class="d-flex flex-column h-100 pa-0 overflow-hidden">
        <div class="tbl-header blue px-3 py-2">
          <span>Rincian Pembayaran Nota</span>
          <button type="button" class="btn-add" @click="addItem">
            + Baris
          </button>
        </div>

        <div class="tbl-wrap flex-grow-1">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 40px" class="tc">No</th>
                <th style="width: 170px">Nota (F1)</th>
                <th style="width: 55px">ID</th>
                <th style="width: 110px">Jenis Bayar</th>
                <th style="width: 200px">No Bukti Bayar (F1)</th>
                <th style="min-width: 150px">Keterangan</th>
                <th
                  style="width: 120px; background: #ffeb3b"
                  class="tr text-dark"
                >
                  Nilai Alokasi
                </th>
                <th style="width: 40px" class="tc">X</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in formData.Detail"
                :key="idx"
                :class="{ 'active-row': activeRowIdx === Number(idx) }"
                @click="activeRowIdx = Number(idx)"
              >
                <!-- 1. Nomor Urut -->
                <td class="tc gt-num">{{ Number(idx) + 1 }}</td>

                <!-- 2. NOTA INVOICE (KOLOM INI YANG SEBELUMNYA TERTUKAR/TERTIMPA) -->
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="item.Nota"
                      class="ci fw text-primary"
                      placeholder="Enter / F1..."
                      @keydown.enter.prevent="onNotaEnter(Number(idx))"
                      @keydown.f1.prevent="openLookupNota(Number(idx))"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      title="Cari Nota Invoice (F1)"
                      @click.stop="openLookupNota(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>

                <!-- 3. ID JENIS BAYAR -->
                <td class="p0">
                  <select
                    v-model="item.Kode"
                    class="ci fw tc"
                    style="cursor: pointer"
                  >
                    <option value=""></option>
                    <option
                      v-for="k in kodeBayarOptions"
                      :key="k.kode"
                      :value="k.kode"
                    >
                      {{ k.kode }}
                    </option>
                  </select>
                </td>

                <!-- 4. NAMA JENIS BAYAR (Otomatis dari ID) -->
                <td class="p0">
                  <input
                    :value="getNamaBayar(item.Kode)"
                    class="ci ro"
                    readonly
                    tabindex="-1"
                  />
                </td>

                <!-- 5. NO BUKTI BAYAR (F1) -->
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="item.NoBukti"
                      class="ci"
                      placeholder="Enter / F1..."
                      @keydown.enter.prevent="loadInfoBuktiBayar(Number(idx))"
                      @keydown.f1.prevent="openLookupBuktiBayar(Number(idx))"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      title="Cari No Bukti Bayar (F1)"
                      @click.stop="openLookupBuktiBayar(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>

                <!-- 6. KETERANGAN DETAIL -->
                <td class="p0">
                  <input v-model="item.NotesDetail" class="ci" />
                </td>

                <!-- 7. NILAI ALOKASI KREDIT -->
                <td class="p0">
                  <input
                    :value="formatInputThousand(item.Kredit)"
                    type="text"
                    class="ci tr fw text-success"
                    @change="handleKreditChange($event, Number(idx))"
                    @focus="($event.target as HTMLInputElement)?.select()"
                  />
                </td>

                <!-- 8. TOMBOL HAPUS BARIS -->
                <td class="tc p0">
                  <button
                    type="button"
                    class="btn-del"
                    @click.stop="removeItem(Number(idx))"
                  >
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="!formData.Detail.length">
                <td
                  colspan="7"
                  class="tc py-4 text-grey"
                  style="font-style: italic"
                >
                  Klik + Baris untuk menambah pembayaran nota
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ── Footer info invoice ── -->
        <div class="tbl-footer">
          <div class="tf-col">
            <div class="tf-row">
              <span class="tf-lbl">Tgl Invoice</span>
              <span class="tf-val">{{ formData.TglInvoice || "-" }}</span>
            </div>
            <div class="tf-row">
              <span class="tf-lbl">Tgl Tempo</span>
              <span class="tf-val">{{ formData.TglTempo || "-" }}</span>
            </div>
          </div>

          <div class="tf-divider" />

          <div class="tf-col">
            <div class="tf-row">
              <span class="tf-lbl">Nilai Piutang</span>
              <span class="tf-val tf-blue">{{ fmtNum(formData.Piutang) }}</span>
            </div>
            <div class="tf-row">
              <span class="tf-lbl">Terbayar</span>
              <span class="tf-val tf-orange">{{
                fmtNum(formData.Terbayar)
              }}</span>
            </div>
            <div class="tf-row">
              <span class="tf-lbl">Saldo Piutang</span>
              <span class="tf-val tf-green fw">{{
                fmtNum(formData.SaldoPiutang)
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <PerusahaanSearchModal
    v-model="showPerusahaanModal"
    @selected="setPerusahaan"
  />
  <NotaInvoiceSearchModal
    v-model="showNotaModal"
    :cabang="formData.Cabang"
    @selected="setNotaFromModal"
  />
  <BuktiBayarSearchModal
    v-model="showBuktiBayarModal"
    :cabang="formData.Cabang"
    :kode="formData.Detail[activeBuktiBayarIdx]?.Kode || ''"
    @selected="setBuktiBayar"
  />
</template>

<style scoped>
.fr {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 6px;
  min-height: 26px;
  margin-bottom: 4px;
}
.lbl {
  width: 65px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}
.lbl.w100 {
  width: 110px;
}

.inp {
  flex: 1;
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 5px;
  font-size: 11px;
  background: white;
  outline: none;
  border-radius: 2px;
}
.inp:focus {
  border-color: #1565c0;
}

.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  border-radius: 2px;
  outline: none;
  flex: 1;
}
.idate:focus {
  border-color: #1565c0;
}

.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.ta {
  flex: 1;
  border: 1px solid #a0a0a0;
  border-radius: 2px;
  padding: 4px 5px;
  font-size: 11px;
  outline: none;
  resize: vertical;
}
.ta:focus {
  border-color: #1565c0;
}

.sep {
  height: 1px;
  background: #e0e0e0;
  width: 100%;
}

.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-bottom: 4px;
  border-bottom: 1px solid #e3f2fd;
  margin-bottom: 6px;
}

/* ── Grid tabel ── */
.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  border-radius: 3px 3px 0 0;
}
.tbl-header.blue {
  background: #1565c0;
  color: white;
}
.btn-add {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}
.tbl-wrap {
  overflow: auto;
  flex: 1;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 11px;
}
.gt thead th {
  background: #f0f4f8;
  border: 1px solid #e0e0e0;
  padding: 6px 5px;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt tbody td {
  border: 1px solid #e8e8e8;
  height: 26px;
  white-space: nowrap;
  overflow: hidden;
}
.active-row td {
  background: #e3f2fd !important;
}
.gt-num {
  font-size: 10px;
  color: #9e9e9e;
  padding: 0 4px;
}
.p0 {
  padding: 0 !important;
}

.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  outline: none;
  padding: 0 5px;
  font-size: 11px;
}
.ci.ro {
  background: #dde8f0 !important;
}
.ci:focus:not(.ro) {
  background: #e3f2fd;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}

.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
  width: 100%;
}
.cell-grp .ci {
  flex: 1;
  min-width: 0;
}
.ci-btn {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
}
.btn-del {
  width: 100%;
  height: 25px;
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  font-weight: bold;
}

.fw {
  font-weight: 700;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.text-primary {
  color: #1565c0;
}
.text-success {
  color: #2e7d32;
}
.text-error {
  color: #c62828;
}

/* ── Table footer info invoice ── */
.tbl-footer {
  display: flex;
  align-items: stretch;
  background: #1565c0;
  border-top: 2px solid #0d47a1;
  padding: 6px 14px;
  flex-shrink: 0;
  gap: 0;
}
.tf-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 2px 16px 2px 0;
}
.tf-col:last-child {
  padding-right: 0;
}
.tf-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.25);
  margin: 0 16px;
  flex-shrink: 0;
}
.tf-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
}
.tf-lbl {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  width: 90px;
  flex-shrink: 0;
}
.tf-val {
  font-size: 12px;
  font-weight: 600;
  color: white;
  font-family: monospace;
  white-space: nowrap;
  text-align: right;
  flex: 1;
}
.tf-blue {
  color: #90caf9;
}
.tf-orange {
  color: #ffcc80;
}
.tf-green {
  color: #a5d6a7;
}
</style>
