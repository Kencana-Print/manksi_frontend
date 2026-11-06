<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { IconShieldLock, IconCheck } from "@tabler/icons-vue";
import { pesanError } from "@/services/piutang/rekapPembayaranService";
import {
  userFormService,
  type RoleItem,
  type RoleDetail,
  type RoleMenuRow,
  type RoleAnggota,
  type PratinjauRole,
} from "@/services/tools/userFormService";

const toast = useToast();

const AKSI = ["view", "insert", "edit", "delete", "save"] as const;
type Aksi = (typeof AKSI)[number];

// ── Daftar role ──
const roles = ref<RoleItem[]>([]);
const cariRole = ref("");
const roleTampil = computed(() => {
  const q = cariRole.value.trim().toLowerCase();
  if (!q) return roles.value;
  return roles.value.filter(
    (r) => r.kode.toLowerCase().includes(q) || r.nama.toLowerCase().includes(q),
  );
});

const muatRoles = async () => {
  try {
    const res = await userFormService.getRoles();
    roles.value = res.data.data ?? [];
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat daftar role."));
  }
};

// ── Detail role ──
const terpilih = ref("");
const detail = ref<RoleDetail | null>(null);
const anggota = ref<RoleAnggota[]>([]);
const awal = ref("");
const memuatDetail = ref(false);
const cariMenu = ref("");
const hanyaTercentang = ref(false);

const snapshot = (d: RoleDetail): string =>
  JSON.stringify({
    nama: d.nama,
    keterangan: d.keterangan,
    aktif: d.aktif,
    menu: d.menu.map((m) => [m.menId, ...AKSI.map((a) => m[a])]),
  });

const berubah = computed(
  () => !!detail.value && snapshot(detail.value) !== awal.value,
);

const bukaRole = async (kode: string) => {
  memuatDetail.value = true;
  try {
    const [d, a] = await Promise.all([
      userFormService.getRole(kode),
      userFormService.getRoleAnggota(kode),
    ]);
    const hasil = d.data.data;
    detail.value = hasil;
    awal.value = snapshot(hasil);
    anggota.value = a.data.data ?? [];
    terpilih.value = kode;
    cariMenu.value = "";
    hanyaTercentang.value = false;
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat role."));
  } finally {
    memuatDetail.value = false;
  }
};

const showBuang = ref(false);
const kodeTujuan = ref("");
const pilihRole = (kode: string) => {
  if (kode === terpilih.value) return;
  if (berubah.value) {
    kodeTujuan.value = kode;
    showBuang.value = true;
    return;
  }
  void bukaRole(kode);
};
const buangDanPindah = () => {
  showBuang.value = false;
  void bukaRole(kodeTujuan.value);
};

// ── Grid ──
const menuTampil = computed<RoleMenuRow[]>(() => {
  if (!detail.value) return [];
  const q = cariMenu.value.trim().toLowerCase();
  return detail.value.menu.filter((m) => {
    if (hanyaTercentang.value && !AKSI.some((a) => m[a])) return false;
    if (!q) return true;
    return (
      String(m.menId).includes(q) ||
      m.keterangan.toLowerCase().includes(q) ||
      (m.namaMenu ?? "").toLowerCase().includes(q)
    );
  });
});

const jumlahTercentang = computed(() =>
  detail.value
    ? detail.value.menu.reduce((s, m) => s + AKSI.filter((a) => m[a]).length, 0)
    : 0,
);

const baris = (m: RoleMenuRow): boolean => AKSI.every((a) => m[a]);
const toggleBaris = (m: RoleMenuRow) => {
  const next = !baris(m);
  for (const a of AKSI) m[a] = next;
};
const toggleKolom = (aksi: Aksi) => {
  const tampil = menuTampil.value;
  if (tampil.length === 0) return;
  const semua = tampil.every((m) => m[aksi]);
  for (const m of tampil) m[aksi] = !semua;
};

// Usulan dari data nyata: aksi yang dimiliki sedikitnya 80% anggota role
const centangDimiliki = () => {
  const d = detail.value;
  if (!d || d.jmlAnggota === 0) return;
  let tambah = 0;
  for (const m of menuTampil.value) {
    for (const a of AKSI) {
      if (!m[a] && m.dimiliki[a] * 100 >= 80 * d.jmlAnggota) {
        m[a] = true;
        tambah += 1;
      }
    }
  }
  toast.info(
    tambah > 0
      ? `${tambah} izin dicentang. Periksa pratinjau sebelum menyimpan.`
      : "Tidak ada izin tambahan yang dimiliki sedikitnya 80% anggota.",
  );
};

const namaAnggota = computed(() => {
  const nama = anggota.value.map((a) => a.kode);
  const tampil = nama.slice(0, 14).join(", ");
  return nama.length > 14 ? `${tampil}, +${nama.length - 14} lainnya` : tampil;
});

// ── Simpan: pratinjau dampak dulu ──
const pratinjau = ref<PratinjauRole | null>(null);
const showPratinjau = ref(false);
const menyimpan = ref(false);

const mintaSimpan = async () => {
  const d = detail.value;
  if (!d) return;
  if (!d.nama.trim()) {
    toast.warning("Nama role wajib diisi.");
    return;
  }
  menyimpan.value = true;
  try {
    const res = await userFormService.pratinjauRole(d.kode, {
      aktif: d.aktif,
      menu: d.menu,
    });
    pratinjau.value = res.data.data;
    showPratinjau.value = true;
  } catch (e) {
    toast.error(pesanError(e, "Gagal menghitung dampak perubahan."));
  } finally {
    menyimpan.value = false;
  }
};

const konfirmasiSimpan = async () => {
  const d = detail.value;
  if (!d) return;
  const kode = d.kode;
  menyimpan.value = true;
  try {
    await userFormService.saveRole(kode, {
      nama: d.nama,
      keterangan: d.keterangan,
      aktif: d.aktif,
      menu: d.menu,
    });
    toast.success(
      "Role tersimpan. Pengguna melihat menu barunya setelah login ulang.",
    );
    showPratinjau.value = false;
    await Promise.all([muatRoles(), bukaRole(kode)]);
  } catch (e) {
    toast.error(pesanError(e, "Gagal menyimpan role."));
  } finally {
    menyimpan.value = false;
  }
};

onMounted(muatRoles);
</script>

<template>
  <div class="mr-page">
    <div class="mr-header">
      <div class="mr-title"><IconShieldLock :size="18" /> Master Role</div>
      <v-btn
        size="small"
        color="primary"
        :disabled="!berubah"
        :loading="menyimpan"
        @click="mintaSimpan"
      >
        <template #prepend><IconCheck :size="15" /></template>
        Simpan
      </v-btn>
    </div>

    <div class="mr-body">
      <!-- ── Daftar role ── -->
      <div class="mr-left">
        <input v-model="cariRole" class="inp" placeholder="Cari role..." />
        <div class="mr-list">
          <table class="tbl">
            <thead>
              <tr>
                <th>Role</th>
                <th class="tc" style="width: 56px">Anggota</th>
                <th class="tc" style="width: 56px">Izin</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in roleTampil"
                :key="r.kode"
                :class="{ sel: r.kode === terpilih, off: !r.aktif }"
                @click="pilihRole(r.kode)"
              >
                <td :title="r.keterangan">
                  {{ r.kode }}
                  <div v-if="r.nama && r.nama !== r.kode" class="sub">
                    {{ r.nama }}
                  </div>
                </td>
                <td class="tc">{{ r.anggota }}</td>
                <td class="tc">{{ r.jmlPerm }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Detail role ── -->
      <div class="mr-right">
        <div v-if="memuatDetail" class="info">Memuat...</div>
        <div v-else-if="!detail" class="info">Pilih role di sebelah kiri.</div>
        <template v-else>
          <div class="card">
            <div class="fr">
              <label class="lbl">Kode</label>
              <input
                :value="detail.kode"
                readonly
                class="inp ro"
                style="width: 220px"
              />
              <label class="lbl" style="width: 40px">Nama</label>
              <input
                v-model="detail.nama"
                class="inp"
                style="flex: 1"
                maxlength="100"
              />
              <label class="chk">
                <input v-model="detail.aktif" type="checkbox" /> Aktif
              </label>
            </div>
            <div class="fr">
              <label class="lbl">Keterangan</label>
              <input
                v-model="detail.keterangan"
                class="inp"
                style="flex: 1"
                maxlength="255"
              />
            </div>
            <div
              class="fr info-anggota"
              :title="anggota.map((a) => `${a.kode} - ${a.nama}`).join('\n')"
            >
              <b>Anggota aktif: {{ detail.jmlAnggota }}</b>
              <span v-if="detail.jmlAnggota"> · {{ namaAnggota }}</span>
            </div>
          </div>

          <div class="toolbar">
            <input
              v-model="cariMenu"
              class="inp"
              style="width: 220px"
              placeholder="Cari menu (nama atau id)..."
            />
            <label class="chk">
              <input v-model="hanyaTercentang" type="checkbox" /> Hanya yang
              tercentang
            </label>
            <v-btn
              size="x-small"
              variant="tonal"
              color="primary"
              :disabled="!detail.jmlAnggota"
              @click="centangDimiliki"
            >
              Centang yang dimiliki ≥ 80% anggota
            </v-btn>
            <span class="hitung">{{ jumlahTercentang }} izin terpilih</span>
          </div>

          <div class="grid-wrap">
            <table class="tbl grid">
              <thead>
                <tr>
                  <th style="width: 36px">No</th>
                  <th style="width: 52px">Id</th>
                  <th>Nama Menu</th>
                  <th
                    class="tc"
                    style="width: 64px"
                    title="Anggota yang memegang View di menu ini"
                  >
                    Dimiliki
                  </th>
                  <th
                    class="tc click"
                    style="width: 52px"
                    @click="toggleKolom('view')"
                  >
                    View
                  </th>
                  <th
                    class="tc click"
                    style="width: 52px"
                    @click="toggleKolom('insert')"
                  >
                    Insert
                  </th>
                  <th
                    class="tc click"
                    style="width: 52px"
                    @click="toggleKolom('edit')"
                  >
                    Update
                  </th>
                  <th
                    class="tc click"
                    style="width: 52px"
                    @click="toggleKolom('delete')"
                  >
                    Delete
                  </th>
                  <th
                    class="tc click"
                    style="width: 52px"
                    @click="toggleKolom('save')"
                  >
                    Save
                  </th>
                  <th class="tc" style="width: 52px">Semua</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(m, idx) in menuTampil" :key="m.menId">
                  <td class="tc muted">{{ idx + 1 }}</td>
                  <td class="tc mono">{{ m.menId }}</td>
                  <td>{{ m.keterangan }}</td>
                  <td
                    class="tc muted"
                    :title="`Insert ${m.dimiliki.insert}, Update ${m.dimiliki.edit}, Delete ${m.dimiliki.delete}, Save ${m.dimiliki.save}`"
                  >
                    {{ m.dimiliki.view }}/{{ detail.jmlAnggota }}
                  </td>
                  <td class="tc"><input v-model="m.view" type="checkbox" /></td>
                  <td class="tc">
                    <input v-model="m.insert" type="checkbox" />
                  </td>
                  <td class="tc"><input v-model="m.edit" type="checkbox" /></td>
                  <td class="tc">
                    <input v-model="m.delete" type="checkbox" />
                  </td>
                  <td class="tc"><input v-model="m.save" type="checkbox" /></td>
                  <td class="tc">
                    <button
                      type="button"
                      class="btn-all"
                      :class="{ full: baris(m) }"
                      @click="toggleBaris(m)"
                    >
                      <IconCheck :size="11" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>

    <!-- ── Pratinjau dampak ── -->
    <v-dialog v-model="showPratinjau" max-width="520" persistent>
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white pa-3 dlg-title">
          Dampak perubahan role {{ detail?.kode }}
        </v-card-title>
        <v-card-text v-if="pratinjau" class="pa-4 dlg-body">
          <div>
            Izin ditambah: <b>{{ pratinjau.tambah }}</b> · dicabut:
            <b>{{ pratinjau.cabut }}</b> · anggota aktif:
            <b>{{ pratinjau.anggota }}</b>
          </div>
          <div v-if="pratinjau.totalUserBertambah > 0" class="blok blok-ok">
            <b>{{ pratinjau.totalUserBertambah }} user mendapat akses baru:</b>
            <div class="daftar">
              <span v-for="u in pratinjau.userBertambah" :key="u.kode">
                {{ u.kode }} (+{{ u.jml }})
              </span>
            </div>
          </div>
          <div v-if="pratinjau.totalUserBerkurang > 0" class="blok blok-warn">
            <b>{{ pratinjau.totalUserBerkurang }} user kehilangan akses:</b>
            <div class="daftar">
              <span v-for="u in pratinjau.userBerkurang" :key="u.kode">
                {{ u.kode }} (-{{ u.jml }})
              </span>
            </div>
          </div>
          <div
            v-if="
              pratinjau.totalUserBertambah === 0 &&
              pratinjau.totalUserBerkurang === 0
            "
            class="blok"
          >
            Tidak ada perubahan akses bagi anggota saat ini. Perubahan hanya
            berlaku untuk anggota baru.
          </div>
        </v-card-text>
        <v-card-actions class="pa-3 border-t">
          <v-btn variant="text" @click="showPratinjau = false">Batal</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="elevated"
            :loading="menyimpan"
            @click="konfirmasiSimpan"
          >
            Ya, Simpan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Buang perubahan ── -->
    <v-dialog v-model="showBuang" max-width="380" persistent>
      <v-card rounded="lg">
        <v-card-title class="bg-warning text-white pa-3 dlg-title"
          >Perubahan belum disimpan</v-card-title
        >
        <v-card-text class="pa-4 dlg-body">
          Perubahan pada role {{ terpilih }} akan dibuang bila Anda pindah.
        </v-card-text>
        <v-card-actions class="pa-3 border-t">
          <v-btn variant="text" @click="showBuang = false">Tetap di sini</v-btn>
          <v-spacer />
          <v-btn color="warning" variant="elevated" @click="buangDanPindah"
            >Buang dan pindah</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.mr-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  padding: 10px 14px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.mr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.mr-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
}
.mr-body {
  display: flex;
  gap: 10px;
  flex: 1;
  min-height: 0;
}
.mr-left {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mr-list {
  flex: 1;
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  background: white;
}
.mr-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.info {
  padding: 16px;
  color: #757575;
}
.card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 12px;
}
.fr {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  min-height: 24px;
}
.fr:last-child {
  margin-bottom: 0;
}
.lbl {
  width: 70px;
  flex-shrink: 0;
  font-weight: 600;
  color: #424242;
}
.inp {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  min-width: 0;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f0f0;
  color: #616161;
}
.chk {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  cursor: pointer;
}
.info-anggota {
  color: #455a64;
  background: #eceff1;
  border-radius: 4px;
  padding: 4px 8px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.hitung {
  margin-left: auto;
  color: #1565c0;
  font-weight: 700;
}
.grid-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  background: white;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.tbl thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #1565c0;
  color: white;
  padding: 4px 6px;
  text-align: left;
  white-space: nowrap;
}
.tbl thead th.click {
  cursor: pointer;
}
.tbl tbody td {
  padding: 3px 6px;
  border-bottom: 1px solid #eee;
}
.tbl tbody tr:hover td {
  background: #e3f2fd;
}
.mr-list .tbl tbody tr {
  cursor: pointer;
}
.mr-list .tbl tbody tr.sel td {
  background: #bbdefb;
  font-weight: 700;
}
.mr-list .tbl tbody tr.off td {
  color: #9e9e9e;
}
.sub {
  font-weight: 400;
  color: #757575;
  font-size: 10px;
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
}
.btn-all {
  width: 20px;
  height: 20px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  background: white;
  color: #bdbdbd;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-all.full {
  background: #2e7d32;
  border-color: #2e7d32;
  color: white;
}
.dlg-title {
  font-size: 12px !important;
}
.dlg-body {
  font-size: 11px;
}
.blok {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  background: #eceff1;
}
.blok-ok {
  background: #e8f5e9;
}
.blok-warn {
  background: #fff3e0;
}
.daftar {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}
</style>
