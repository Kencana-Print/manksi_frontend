<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import JenisKainSearchModal from "@/components/lookups/JenisKainSearchModal.vue";

const toast = useToast();
const showKainModal = ref(false);
const cetakOptions = ref<any[]>([]);
const tambahanOptions = ref<any[]>([]);
const isMetadataLoading = ref(false);

const props = defineProps<{ formData: any; isEdit: boolean }>();
const kal = computed(() => props.formData.Kalkulasi);

const handleKainSelected = (item: any) => {
  kal.value.JenisKain = item.Jeniskain;
  kal.value.KategoriKain = item.Kategori;
};

const hitungBarisKomponen = (item: any) => {
  const qty = Number(props.formData.RencanaOrder) || 0;
  const babaran = Number(item.Babaran) || 0;
  const harga = Number(item.Harga) || 0;
  if (!babaran || !harga) {
    item.Kebutuhan = 0;
    item.Bruto = 0;
    item.Pcs = 0;
    return;
  }
  item.Kebutuhan = item.Kg ? qty / babaran : qty * babaran;
  item.Bruto = item.Kg ? harga / babaran : harga * babaran;
  item.Pcs = item.Pabrik ? item.Bruto / 1.11 : item.Bruto;
};

const loadDropdownOptions = async () => {
  try {
    const [resCetak, resTambahan] = await Promise.all([
      api.get("/lookups/cetak"),
      api.get("/lookups/tambahan"),
    ]);
    cetakOptions.value = resCetak.data.data.map((c: any) => ({
      label: `${c.mhb_jenis} ${c.mhb_ket}`.trim(),
      harga: Number(c.mhb_biaya),
    }));
    tambahanOptions.value = resTambahan.data.data;
  } catch (e) {
    console.error("Gagal memuat dropdown", e);
  }
};

onMounted(loadDropdownOptions);

// ── Logika loadKomponen (Metadata) ─────────────────────────────────────
const fetchKalkulasiMetadata = async () => {
  // Hanya jalankan jika field utama terisi dan bukan saat loading data awal (isEdit mode)
  if (
    !kal.value.JenisKain ||
    !props.formData.RencanaOrder ||
    isMetadataLoading.value
  )
    return;

  isMetadataLoading.value = true;
  try {
    const res = await api.get(
      "/penjualan/minta-harga-form/kalkulasi-metadata",
      {
        params: {
          model: kal.value.Model,
          jenisKain: kal.value.JenisKain,
          warna: kal.value.Warna,
          qty: props.formData.RencanaOrder,
        },
      },
    );

    const data = res.data.data;

    if (!data.komponen || data.komponen.length === 0) {
      console.warn(
        "Backend mengembalikan komponen kosong. Data grid tidak diupdate.",
      );
      // Opsi: Beri tahu user bahwa kain ini belum terdaftar di master kain
      return;
    }

    // 1. Set Biaya Tetap
    kal.value.RpPotong = data.rpPotong;
    kal.value.RpJahit = data.rpJahit;
    kal.value.PersenAllowance = data.allowancePersen;

    // 2. Set Margin (Laba) Otomatis dari tangga Qty
    if (data.margin.persen === "Y") {
      kal.value.PersenLaba = data.margin.laba;
      kal.value.RpLaba = 0;
    } else {
      kal.value.RpLaba = data.margin.laba;
      kal.value.PersenLaba = 0;
    }

    // 3. Set Grid Komponen
    kal.value.GridKomponen = data.komponen.map((item: any) => ({
      Komponen: item.komponen,
      Kg: true,
      Pabrik: true,
      JenisKain: kal.value.JenisKain,
      Lengan: item.lengan,
      Warna: kal.value.Warna,
      Harga: Number(item.harga),
      Babaran: Number(item.babaran),
      Kebutuhan: 0,
      Pcs: 0,
      Bruto: 0,
    }));

    // 4. Hitung ulang baris grid
    kal.value.GridKomponen.forEach(hitungBarisKomponen);
  } catch (e: any) {
    toast.error(
      "Gagal memuat metadata kalkulasi: " +
        (e.response?.data?.message || e.message),
    );
  } finally {
    isMetadataLoading.value = false;
  }
};

const onCetakChange = (item: any) => {
  const opt = cetakOptions.value.find((o) => o.label === item.Keterangan);
  if (opt) item.Harga = opt.harga;
};

const onTambahanChange = (item: any) => {
  const opt = tambahanOptions.value.find((o) => o.mht_ket === item.Keterangan);
  if (opt) {
    const ktg = kal.value.KategoriKain;
    item.Harga =
      ktg === "LACOST"
        ? Number(opt.mht_lacost)
        : ktg === "COTTON"
          ? Number(opt.mht_cotton)
          : Number(opt.mht_pe);
  }
};

// ── Totals ─────────────────────────────────────────────────────────────
const TotCetak = computed(() =>
  kal.value.GridCetak.reduce(
    (s: number, i: any) => s + (Number(i.Harga) || 0),
    0,
  ),
);
const TotTambahan = computed(() =>
  kal.value.GridAksesoris.reduce(
    (s: number, i: any) => s + (Number(i.Harga) || 0),
    0,
  ),
);
const TotBahan = computed(() =>
  kal.value.GridKomponen.reduce(
    (s: number, i: any) => s + (Number(i.Pcs) || 0),
    0,
  ),
);

const totalHPP = computed(() => {
  const hppMurni =
    TotBahan.value +
    TotCetak.value +
    Number(kal.value.RpBordirTotal) +
    Number(kal.value.RpDtfTotal) +
    Number(kal.value.RpPotong) +
    Number(kal.value.RpJahit) +
    Number(kal.value.RpFinishing) +
    Number(kal.value.RpObat) +
    Number(kal.value.RpKirim) +
    TotTambahan.value;

  // Terapkan Allowance
  const allowance = (hppMurni * Number(kal.value.PersenAllowance)) / 100;
  kal.value.RpAllowance = Math.round(allowance);

  return Math.round(hppMurni + allowance);
});

watch(
  totalHPP,
  (newHpp) => {
    let laba = Number(kal.value.RpLaba);
    if (Number(kal.value.PersenLaba) > 0) {
      laba = (newHpp * Number(kal.value.PersenLaba)) / 100;
      kal.value.RpLaba = Math.round(laba);
    }
    kal.value.HargaSesuai = Math.round(newHpp + laba);
  },
  { immediate: true },
);

// ── Watchers untuk Trigger loadKomponen ───────────────────────────────
watch(
  () => [
    kal.value.JenisKain,
    kal.value.Warna,
    kal.value.Model,
    props.formData.RencanaOrder,
  ],
  () => {
    // Jalankan metadata loader jika data berubah (kecuali saat awal load data edit)
    fetchKalkulasiMetadata();
  },
);

// ── Luas Bordir & DTF ──────────────────────────────────────────────────
const luasBordir = computed(() => {
  let qty = 0;
  const bd = kal.value.Bordir;
  for (let i = 1; i <= 8; i++)
    qty += (Number(bd[`P${i}`]) || 0) * (Number(bd[`L${i}`]) || 0);
  return qty;
});
const luasDtf = computed(() => {
  let qty = 0;
  const df = kal.value.Dtf;
  for (let i = 1; i <= 8; i++)
    qty += (Number(df[`P${i}`]) || 0) * (Number(df[`L${i}`]) || 0);
  return qty;
});

const hitungRpBordir = () => {
  let rp = (Number(kal.value.Bordir.Cm) || 0) * luasBordir.value;
  if (rp > 0 && rp < 2500) rp = 2500;
  kal.value.RpBordirTotal = Math.round(rp);
};
const hitungRpDtf = () => {
  let rp = (Number(kal.value.Dtf.Cm) || 0) * luasDtf.value;
  if (rp > 0 && rp < 3000) rp = 3000;
  kal.value.RpDtfTotal = Math.round(rp);
};

watch(luasBordir, hitungRpBordir);
watch(luasDtf, hitungRpDtf);
watch(() => kal.value.Bordir.Cm, hitungRpBordir);
watch(() => kal.value.Dtf.Cm, hitungRpDtf);
watch(
  () => props.formData.RencanaOrder,
  () => kal.value.GridKomponen.forEach(hitungBarisKomponen),
);

const fetchKomponenKain = async () => {
  if (!kal.value.JenisKain) return;
  try {
    const res = await api.get("/lookups/komponen-kain", {
      params: {
        model: kal.value.Model,
        jenisKain: kal.value.JenisKain,
        warna: kal.value.Warna,
      },
    });
    kal.value.GridKomponen = res.data.data.map((item: any) => ({
      Komponen: item.komponen,
      Kg: true,
      Pabrik: true,
      JenisKain: kal.value.JenisKain,
      Lengan: item.lengan,
      Warna: kal.value.Warna,
      Harga: item.harga,
      Babaran: item.babaran,
      Kebutuhan: 0,
      Pcs: 0,
      Bruto: 0,
    }));
    kal.value.GridKomponen.forEach(hitungBarisKomponen);
  } catch (e) {
    console.error("Gagal menarik komponen kain", e);
  }
};
watch(
  () => [kal.value.JenisKain, kal.value.Warna, kal.value.Model],
  fetchKomponenKain,
);

// ── Grid actions ───────────────────────────────────────────────────────
const addCetak = () => kal.value.GridCetak.push({ Keterangan: "", Harga: 0 });
const delCetak = (i: number) => kal.value.GridCetak.splice(i, 1);
const addAksesoris = () =>
  kal.value.GridAksesoris.push({ Keterangan: "", Harga: 0 });
const delAksesoris = (i: number) => kal.value.GridAksesoris.splice(i, 1);

const rp = (v: any) => new Intl.NumberFormat("id-ID").format(Number(v) || 0);
const rows8 = Array.from({ length: 8 }, (_, i) => i + 1);
</script>

<template>
  <div class="tk-root">
    <!-- Alert kalkulasi terkunci -->
    <div v-if="formData.isKalkulasiLocked" class="tk-alert error">
      <v-icon size="13" class="mr-1">mdi-lock</v-icon>
      Akses Ditolak: Kalkulasi ini terkunci karena terakhir dimodifikasi oleh
      departemen FINANCE.
    </div>

    <!-- 3-kolom layout — pointer-events dinonaktifkan bila terkunci -->
    <div
      class="tk-layout"
      :style="
        formData.isKalkulasiLocked ? 'pointer-events:none;opacity:0.65' : ''
      "
    >
      <!-- ── Kolom kiri ── -->
      <div class="tk-left">
        <div class="tk-section">
          <!-- Info kalkulasi (Created by dsb) di dalam section, rapi -->
          <div v-if="formData.KalkulasiInfo" class="tk-info-badge">
            {{ formData.KalkulasiInfo }}
          </div>

          <!-- No. Kalkulasi + toggle Aktif -->
          <div class="tk-row">
            <label class="tk-lbl">No. Kalkulasi</label>
            <input
              v-model="kal.NomorKalkulasi"
              class="tk-inp"
              readonly
              style="width: 140px; background: #e8e8e8"
            />
            <input
              :value="kal.TanggalKalkulasi"
              readonly
              class="tk-inp"
              style="width: 140px; background: #e8e8e8; margin-left: 4px"
              placeholder="Tanggal Kalkulasi"
            />
            <label class="chk-label" style="margin-left: 8px">
              <input
                type="checkbox"
                v-model="formData.SimpanKalkulasi"
                style="accent-color: #1565c0"
              />
              Aktif
            </label>
          </div>

          <!-- Model -->
          <div class="tk-row">
            <label class="tk-lbl">Model</label>
            <div class="radio-group">
              <label class="radio-label"
                ><input type="radio" v-model="kal.Model" value="KH-0001" /> 1
                Warna</label
              >
              <label class="radio-label"
                ><input type="radio" v-model="kal.Model" value="KH-0002" /> 2
                Warna</label
              >
            </div>
          </div>

          <!-- Jenis Kain -->
          <div class="tk-row">
            <label class="tk-lbl">Jenis Kain</label>
            <input
              v-model="kal.JenisKain"
              class="tk-inp"
              style="width: 180px; background: #ddeeff; cursor: pointer"
              readonly
              @click="showKainModal = true"
              placeholder="Klik untuk pilih..."
            />
            <label class="chk-label" style="margin-left: 8px; color: #555">
              <input type="checkbox" style="accent-color: #1565c0" />
              Medium (PE, HYGIT, DRYFIT)
            </label>
          </div>

          <!-- Warna -->
          <div class="tk-row">
            <label class="tk-lbl">Warna</label>
            <div class="radio-group">
              <label class="radio-label"
                ><input type="radio" v-model="kal.Warna" value="MUDA" />
                Muda</label
              >
              <label class="radio-label"
                ><input type="radio" v-model="kal.Warna" value="SEDANG" />
                Sedang</label
              >
              <label class="radio-label"
                ><input type="radio" v-model="kal.Warna" value="TUA" />
                Tua</label
              >
            </div>
          </div>

          <!-- Rencana Order -->
          <div class="tk-row">
            <label class="tk-lbl">Rencana Order</label>
            <input
              v-model.number="formData.RencanaOrder"
              type="number"
              class="tk-inp"
              style="width: 90px; text-align: right"
            />
          </div>

          <!-- HPP summary -->
          <div v-if="formData.SimpanKalkulasi" class="tk-hpp-row">
            <div class="hpp-item">
              <span class="hpp-label">Harga Rekomendasi</span>
              <span class="hpp-value blue">Rp {{ rp(kal.HargaSesuai) }}</span>
            </div>
            <div class="hpp-item">
              <span class="hpp-label">HPP</span>
              <span class="hpp-value">Rp {{ rp(kal.HargaSesuai) }}</span>
            </div>
          </div>
        </div>

        <!-- Grid Cetak -->
        <div class="tk-section" style="margin-top: 8px">
          <div class="tk-grid-hdr">
            <span class="tk-grid-title">Cetak</span>
            <button class="tk-add-btn" type="button" @click="addCetak">
              + Tambah
            </button>
          </div>
          <table class="tk-table">
            <thead>
              <tr>
                <th style="width: 32px">No</th>
                <th>Keterangan</th>
                <th style="width: 100px; text-align: right">Biaya (Rp)</th>
                <th style="width: 28px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in kal.GridCetak" :key="idx">
                <td class="tc">{{ Number(idx) + 1 }}</td>
                <td>
                  <select
                    v-model="item.Keterangan"
                    class="tk-cell"
                    @change="onCetakChange(item)"
                    style="cursor: pointer"
                  >
                    <option value="" disabled>-- Pilih Cetak --</option>
                    <option
                      v-for="opt in cetakOptions"
                      :key="opt.label"
                      :value="opt.label"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </td>
                <td class="tc">{{ rp(item.Harga) }}</td>
                <td class="tc">
                  <button
                    class="tk-del"
                    type="button"
                    @click="delCetak(Number(idx))"
                  >
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="!kal.GridCetak.length">
                <td colspan="4" class="tk-empty">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Grid Harga Tambahan -->
        <div class="tk-section" style="margin-top: 8px">
          <div class="tk-grid-hdr">
            <span class="tk-grid-title">Harga Tambahan</span>
            <button class="tk-add-btn" type="button" @click="addAksesoris">
              + Tambah
            </button>
          </div>
          <table class="tk-table">
            <thead>
              <tr>
                <th style="width: 32px">No</th>
                <th>Tambahan</th>
                <th style="width: 100px; text-align: right">Harga (Rp)</th>
                <th style="width: 28px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in kal.GridAksesoris" :key="idx">
                <td class="tc">{{ Number(idx) + 1 }}</td>
                <td>
                  <select
                    v-model="item.Keterangan"
                    class="tk-cell"
                    @change="onTambahanChange(item)"
                    style="cursor: pointer"
                  >
                    <option value="" disabled>-- Pilih Tambahan --</option>
                    <option
                      v-for="opt in tambahanOptions"
                      :key="opt.mht_ket"
                      :value="opt.mht_ket"
                    >
                      {{ opt.mht_ket }}
                    </option>
                  </select>
                </td>
                <td>
                  <input
                    v-model.number="item.Harga"
                    type="number"
                    class="tk-cell tr"
                  />
                </td>
                <td class="tc">
                  <button
                    class="tk-del"
                    type="button"
                    @click="delAksesoris(Number(idx))"
                  >
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="!kal.GridAksesoris.length">
                <td colspan="4" class="tk-empty">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Kolom tengah: Bordir ── -->
      <div class="tk-mid">
        <div class="tk-section tk-pl-section">
          <div class="tk-pl-title">BORDIR</div>
          <div class="tk-pl-cm">
            <span class="tk-pl-lbl">Harga /Cm²</span>
            <input
              v-model.number="kal.Bordir.Cm"
              type="number"
              class="tk-pl-inp"
            />
          </div>
          <div v-for="n in rows8" :key="'b' + n" class="tk-pl-row">
            <span class="tk-pl-idx">Bordir {{ n }}</span>
            <span class="tk-pl-eq">P=</span>
            <input
              v-model.number="kal.Bordir[`P${n}`]"
              type="number"
              class="tk-pl-inp"
            />
            <span class="tk-pl-eq">L=</span>
            <input
              v-model.number="kal.Bordir[`L${n}`]"
              type="number"
              class="tk-pl-inp"
            />
          </div>
          <div class="tk-pl-result">
            <span class="tk-pl-lbl">Luas Bordir /Cm²:</span>
            <input
              :value="luasBordir"
              readonly
              class="tk-pl-inp"
              style="background: #ddd; font-weight: 700"
            />
          </div>
        </div>
      </div>

      <!-- ── Kolom kanan: DTF ── -->
      <div class="tk-right">
        <div class="tk-section tk-pl-section">
          <div class="tk-pl-title">DTF</div>
          <div class="tk-pl-cm">
            <span class="tk-pl-lbl">Harga /Cm²</span>
            <input
              v-model.number="kal.Dtf.Cm"
              type="number"
              class="tk-pl-inp"
            />
          </div>
          <div v-for="n in rows8" :key="'d' + n" class="tk-pl-row">
            <span class="tk-pl-idx">DTF {{ n }}</span>
            <span class="tk-pl-eq">P=</span>
            <input
              v-model.number="kal.Dtf[`P${n}`]"
              type="number"
              class="tk-pl-inp"
            />
            <span class="tk-pl-eq">L=</span>
            <input
              v-model.number="kal.Dtf[`L${n}`]"
              type="number"
              class="tk-pl-inp"
            />
          </div>
          <div class="tk-pl-result">
            <span class="tk-pl-lbl">Luas DTF /Cm²:</span>
            <input
              :value="luasDtf"
              readonly
              class="tk-pl-inp"
              style="background: #ddd; font-weight: 700"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- /.tk-layout -->
  </div>
  <!-- /.tk-root -->

  <JenisKainSearchModal
    v-model="showKainModal"
    :kode-model="kal.Model"
    @selected="handleKainSelected"
  />
</template>

<style scoped>
.tk-root {
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}

/* Alert */
.tk-alert {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
}
.tk-alert.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}

/* Info badge dalam section */
.tk-info-badge {
  font-size: 10px;
  color: #757575;
  text-align: right;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #f0f0f0;
}

/* ── 3-kolom layout ── */
.tk-layout {
  display: flex; /* WAJIB flex row */
  flex-direction: row; /* eksplisit row */
  gap: 10px;
  align-items: flex-start;
}
.tk-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.tk-mid {
  width: 220px;
  flex-shrink: 0;
}
.tk-right {
  width: 220px;
  flex-shrink: 0;
}

/* Section card */
.tk-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
}

/* Field rows */
.tk-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}
.tk-lbl {
  width: 110px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

/* Native input */
.tk-inp {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
}
.tk-inp:focus {
  border-color: #1976d2;
}

/* Radio group */
.radio-group {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 2px 8px;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
}

/* Checkbox */
.chk-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}
.chk-label input[type="checkbox"] {
  accent-color: #1565c0;
}

/* HPP summary */
.tk-hpp-row {
  display: flex;
  gap: 16px;
  padding: 5px 6px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  margin-top: 4px;
}
.hpp-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.hpp-label {
  font-size: 11px;
  color: #555;
}
.hpp-value {
  font-size: 12px;
  font-weight: 700;
  color: #212121;
}
.hpp-value.blue {
  color: #1565c0;
}

/* Grid header */
.tk-grid-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.tk-grid-title {
  font-size: 11px;
  font-weight: 700;
  color: #212121;
}
.tk-add-btn {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.tk-add-btn:hover {
  background: #1557a8;
}

/* Tabel grid */
.tk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.tk-table thead tr {
  background: #1565c0;
}
.tk-table th {
  padding: 4px 6px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-align: left;
  white-space: nowrap;
}
.tk-table td {
  padding: 2px 4px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.tc {
  text-align: center;
}
.tk-cell {
  width: 100%;
  border: none;
  border-bottom: 1px solid #e0e0e0;
  padding: 2px 3px;
  font-size: 12px;
  background: transparent;
  outline: none;
}
.tk-cell:focus {
  border-bottom-color: #1976d2;
  background: #f0f8ff;
}
.tk-cell.tr {
  text-align: right;
}
.tk-del {
  background: transparent;
  border: none;
  color: #e53935;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}
.tk-del:hover {
  color: #b71c1c;
}
.tk-empty {
  text-align: center;
  color: #bdbdbd;
  padding: 8px;
  font-size: 11px;
}

/* Bordir / DTF panels */
.tk-pl-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tk-pl-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 3px;
}
.tk-pl-cm {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid #eeeeee;
}
.tk-pl-lbl {
  font-size: 11px;
  color: #555;
  white-space: nowrap;
}
.tk-pl-row {
  display: flex;
  align-items: center;
  gap: 3px;
}
.tk-pl-idx {
  width: 52px;
  font-size: 11px;
  color: #333;
  flex-shrink: 0;
}
.tk-pl-eq {
  font-size: 11px;
  color: #555;
  flex-shrink: 0;
}
.tk-pl-inp {
  width: 58px;
  height: 22px;
  border: 1px solid #ccc;
  border-radius: 2px;
  padding: 0 4px;
  font-size: 11px;
  text-align: right;
  outline: none;
  background: white;
}
.tk-pl-inp:focus {
  border-color: #1976d2;
}
.tk-pl-result {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  padding-top: 4px;
  border-top: 1px solid #eeeeee;
}
</style>
