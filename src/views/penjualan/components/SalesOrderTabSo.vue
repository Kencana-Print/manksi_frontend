<script setup lang="ts">
import { computed, ref } from "vue";
import { IconUpload, IconMaximize, IconPhoto } from "@tabler/icons-vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";

const props = defineProps<{
  formData: any;
  isEdit: boolean;
  lookupOptions: {
    divisi: any[];
    kepentingan: string[];
    ketPo: string[];
    panjang: string[];
    lebar: string[];
    kain: string[];
    gramasi: string[];
    finishing: string[];
  };
}>();
const emit = defineEmits([
  "upload-main",
  "open-lookup",
  "open-fullscreen",
  "field-blur",
  "confirm-uncheck-cmo",
]);
const toast = useToast();
const authStore = useAuthStore();

const isDivisiTiga = computed(() =>
  String(props.formData.spk_divisi).startsWith("3"),
);
const isDivisiSatuAtauLima = computed(() => {
  const d = String(props.formData.spk_divisi).charAt(0);
  return d === "1" || d === "5";
});

const tipeSpkOptions = ["", "Premium", "Medium", "Reguler"];
const pendingOptions = ["NORMAL", "PENDING SEBAGIAN", "PENDING PENUH"];

const fileRef = ref<HTMLInputElement | null>(null);
const displayImageUrl = computed(() => {
  if (props.formData.MainImageBlob) return props.formData.MainImageBlob;
  if (!props.isEdit) {
    if (props.formData.spk_memo)
      return `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(props.formData.spk_memo)}.jpg`;
    return "";
  }
  return `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(props.formData.spk_nomor)}.jpg`;
});

const onFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 1_000_000) {
    toast.error("Ukuran gambar tidak boleh > 1 Mb.");
    return;
  }
  props.formData.MainImageName = file.name;
  props.formData.MainImageBlob = URL.createObjectURL(file);
  emit("upload-main", file);
};

const toggleCmo = () => {
  if (!props.formData.spk_cmo) {
    props.formData.spk_cmo = authStore.user?.kode || "ADMIN";
    props.formData.isCmoChecked = true;
  } else {
    props.formData.isCmoChecked = true;
    emit("confirm-uncheck-cmo");
  }
};
</script>

<template>
  <div class="so-layout">
    <!-- ══ KOLOM KIRI ══ -->
    <div class="so-left">
      <div class="so-section">
        <!-- Divisi / MO / CMO / Status -->
        <div class="fr">
          <label class="lbl">Divisi</label>
          <select
            v-model="formData.spk_divisi"
            class="inp sel"
            style="width: 165px"
          >
            <option
              v-for="d in lookupOptions.divisi"
              :key="d.value"
              :value="d.value"
            >
              {{ d.title }}
            </option>
          </select>
          <label class="chk-lbl ml-2"
            ><input type="checkbox" checked disabled /> MO ({{
              formData.user_create || "ADMIN"
            }})</label
          >
          <label class="chk-lbl ml-2"
            ><input
              type="checkbox"
              :checked="!!formData.spk_cmo"
              @click="toggleCmo"
            />
            CMO
            {{ formData.spk_cmo ? "(" + formData.spk_cmo + ")" : "" }}</label
          >
          <span
            class="ml-auto status-lbl"
            :class="formData.spk_aktif === 'N' ? 'pasif' : 'aktif'"
          >
            Status: {{ formData.spk_aktif === "N" ? "PASIF" : "AKTIF" }}
          </span>
        </div>

        <!-- Nomor SPK / Revisi -->
        <div class="fr">
          <label class="lbl">Nomor SPK</label>
          <input
            :value="formData.spk_nomor"
            readonly
            class="inp ro"
            style="width: 160px"
            :placeholder="!isEdit ? '<-- Kosong=Baru' : ''"
          />
          <span v-if="!isEdit" class="hint-new ml-1">← Baru</span>
          <label class="lbl ml-auto" style="width: 55px">Revisi</label>
          <input
            type="checkbox"
            v-model="formData.isRevisi"
            true-value="Y"
            false-value="N"
            class="mr-1"
          />
          <input
            v-model.number="formData.spk_rev"
            type="number"
            class="inp"
            style="width: 55px"
            :disabled="formData.isRevisi !== 'Y'"
          />
        </div>

        <!-- Tanggal / Created / Tipe SPK -->
        <div class="fr">
          <label class="lbl">Tanggal SPK</label>
          <input
            type="date"
            v-model="formData.spk_tanggal"
            class="idate"
            style="width: 140px"
          />
          <label class="lbl ml-2" style="width: 55px">Created</label>
          <input
            :value="formData.date_create"
            readonly
            class="inp ro"
            style="width: 135px"
          />
          <label class="lbl ml-auto" style="width: 62px">Tipe SPK</label>
          <select
            v-model="formData.spk_tipe"
            class="inp sel"
            style="width: 110px"
          >
            <option v-for="o in tipeSpkOptions" :key="o" :value="o">
              {{ o }}
            </option>
          </select>
        </div>

        <!-- Perusahaan / Repeat dari SPK -->
        <div class="fr">
          <label class="lbl">Perusahaan</label>
          <div class="igrp" style="width: 335px">
            <input
              v-model="formData.spk_perush_kode"
              class="inp"
              style="width: 60px; background: #ddeeff"
            />
            <input
              :value="formData.NamaPerusahaan"
              readonly
              class="inp ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="blkp"
              @mousedown.prevent="$emit('open-lookup', 'perusahaan')"
            >
              &#128269;
            </button>
          </div>
          <label class="lbl ml-2" style="width: 110px">Repeat Dari SPK</label>
          <div class="igrp" style="flex: 1">
            <input v-model="formData.spk_repeat" class="inp" style="flex: 1" />
            <button
              type="button"
              class="blkp"
              @mousedown.prevent="$emit('open-lookup', 'repeat')"
            >
              &#128269;
            </button>
          </div>
        </div>

        <!-- Customer / Cust PERFECT -->
        <div class="fr">
          <label class="lbl">Customer</label>
          <div class="igrp" style="width: 335px">
            <input
              v-model="formData.spk_cus_kode"
              class="inp"
              style="width: 60px; background: #ddeeff"
            />
            <input
              :value="formData.Customer"
              readonly
              class="inp ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="blkp"
              @mousedown.prevent="$emit('open-lookup', 'customer')"
            >
              &#128269;
            </button>
          </div>
          <label class="lbl ml-auto perfect-lbl" style="width: 90px"
            >Cust PERFECT</label
          >
          <select
            v-model="formData.cus_perfect"
            class="inp sel"
            style="width: 55px"
          >
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </div>

        <!-- Cust Kaosan (divisi 3 saja) -->
        <div class="fr" v-if="isDivisiTiga">
          <label class="lbl">Cust Kaosan</label>
          <div class="igrp" style="width: 335px">
            <input
              v-model="formData.spk_cus_kaosan"
              class="inp"
              style="width: 60px; background: #ddeeff"
            />
            <input
              :value="formData.CustKaosanNama"
              readonly
              class="inp ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="blkp"
              @mousedown.prevent="$emit('open-lookup', 'custKaosan')"
            >
              &#128269;
            </button>
          </div>
          <label class="lbl ml-auto text-grey" style="width: 80px"
            >Pin Customer</label
          >
          <input
            v-model="formData.pin_customer"
            readonly
            class="inp ro text-center"
            style="width: 50px"
          />
        </div>

        <div class="divider" />

        <!-- Referensi + Stok DC berdampingan -->
        <div class="fr align-start">
          <!-- Referensi kiri -->
          <div class="ref-col">
            <div class="fr">
              <label class="lbl">Jenis Order</label>
              <div class="igrp" style="width: 255px">
                <input
                  v-model="formData.spk_jo_kode"
                  class="inp"
                  style="width: 50px; background: #ddeeff"
                />
                <input
                  :value="formData.JenisOrder"
                  readonly
                  class="inp ro"
                  style="flex: 1"
                />
                <button
                  type="button"
                  class="blkp"
                  @mousedown.prevent="$emit('open-lookup', 'jenisOrder')"
                >
                  &#128269;
                </button>
              </div>
            </div>
            <div class="fr">
              <label class="lbl">Kepentingan</label>
              <select
                v-model="formData.spk_statuskerja"
                class="inp sel"
                style="width: 160px"
              >
                <option
                  v-for="o in lookupOptions.kepentingan"
                  :key="o"
                  :value="o"
                >
                  {{ o }}
                </option>
              </select>
            </div>
            <div class="fr">
              <label class="lbl">No. Penawaran</label>
              <div class="igrp" style="width: 155px">
                <input
                  v-model="formData.spk_pen_nomor"
                  class="inp"
                  style="flex: 1"
                />
                <button
                  type="button"
                  class="blkp"
                  @mousedown.prevent="$emit('open-lookup', 'penawaran')"
                >
                  &#128269;
                </button>
              </div>
              <input
                v-model="formData.spk_pen_id"
                class="inp ml-1"
                style="width: 50px"
                placeholder="ID"
              />
            </div>
            <div class="fr">
              <label class="lbl">No. SJ Memo</label>
              <div class="igrp" style="width: 210px">
                <input
                  v-model="formData.spk_nomormemo"
                  class="inp"
                  style="flex: 1"
                />
                <button
                  type="button"
                  class="blkp"
                  @mousedown.prevent="$emit('open-lookup', 'sjMemo')"
                >
                  &#128269;
                </button>
              </div>
            </div>
            <div class="fr">
              <label class="lbl">No. Memo</label>
              <div class="igrp" style="width: 210px">
                <input
                  v-model="formData.spk_memo"
                  class="inp"
                  style="flex: 1; background: #ddeeff"
                  @change="$emit('field-blur', 'memo', formData.spk_memo)"
                />
                <button
                  type="button"
                  class="blkp"
                  @mousedown.prevent="$emit('open-lookup', 'memo')"
                >
                  &#128269;
                </button>
              </div>
            </div>
            <div class="fr">
              <label class="lbl">No. MPPB</label>
              <div class="igrp" style="width: 155px">
                <input
                  v-model="formData.spk_mppb"
                  class="inp"
                  style="flex: 1; background: #ddeeff"
                  @change="$emit('field-blur', 'mppb', formData.spk_mppb)"
                />
                <button
                  type="button"
                  class="blkp"
                  @mousedown.prevent="$emit('open-lookup', 'mppb')"
                >
                  &#128269;
                </button>
              </div>
              <input
                :value="formData.jmlmppb"
                readonly
                class="inp ro ml-1 text-right"
                style="width: 55px"
              />
            </div>
          </div>

          <!-- Stok DC fieldset — langsung di kanan referensi -->
          <div class="fieldset-box ml-2" style="width: 262px; flex-shrink: 0">
            <div class="fieldset-legend">Ambil stok dari Gudang DC</div>
            <div class="fr" style="justify-content: center; margin-top: 4px">
              <div class="igrp" style="width: 190px">
                <input
                  v-model="formData.spk_invdc"
                  class="inp"
                  style="flex: 1; background: #ddeeff"
                  :placeholder="
                    isDivisiTiga ? 'No. SO DTF / SO' : 'No. Invoice DC'
                  "
                  @change="$emit('field-blur', 'invdc', formData.spk_invdc)"
                />
                <button
                  type="button"
                  class="blkp"
                  @mousedown.prevent="
                    $emit('open-lookup', isDivisiTiga ? 'soKaosan' : 'stokDc')
                  "
                >
                  &#128269;
                </button>
              </div>
            </div>
            <div class="fr mt-2">
              <label class="lbl" style="width: 85px">Nomor PO</label>
              <input
                v-model="formData.spk_nomor_po"
                class="inp"
                style="flex: 1"
              />
            </div>
            <div class="fr">
              <label class="lbl" style="width: 85px">Tanggal PO</label>
              <input
                type="date"
                v-model="formData.spk_tgl_po"
                class="idate"
                style="flex: 1"
              />
            </div>
            <div class="fr">
              <label class="lbl" style="width: 85px">Dateline PO</label>
              <input
                type="date"
                v-model="formData.spk_datelinepo"
                class="idate"
                style="flex: 1"
              />
            </div>
            <div class="fr mt-1">
              <label class="lbl" style="width: 85px">MKB</label>
              <input
                :value="formData.mkb"
                readonly
                class="inp ro"
                style="flex: 1"
              />
            </div>
          </div>
        </div>

        <!-- Sales -->
        <div class="fr mt-1">
          <label class="lbl">Sales</label>
          <div class="igrp" style="width: 310px">
            <input
              v-model="formData.spk_sal_kode"
              class="inp"
              style="width: 60px; background: #ddeeff"
            />
            <input
              :value="formData.Sales"
              readonly
              class="inp ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="blkp"
              @mousedown.prevent="$emit('open-lookup', 'sales')"
            >
              &#128269;
            </button>
          </div>
        </div>

        <!-- Nama / Nama Ext / Jumlah -->
        <div class="fr">
          <label class="lbl">Nama</label>
          <input v-model="formData.spk_nama" class="inp" style="flex: 1" />
        </div>
        <div class="fr">
          <label class="lbl">Nama Ext</label>
          <input v-model="formData.spk_nama2" class="inp" style="flex: 1" />
        </div>
        <div class="fr">
          <label class="lbl">Jumlah</label>
          <input
            v-model.number="formData.spk_jumlah"
            type="number"
            class="inp text-right"
            style="width: 110px"
          />
        </div>

        <!-- Ukuran -->
        <div class="fr">
          <label class="lbl">Ukuran</label>
          <input
            v-model="formData.spk_ukuran"
            class="inp"
            style="width: 110px"
          />
          <template v-if="isDivisiSatuAtauLima">
            <!-- Panjang: native select + fallback input jika tidak ada di list -->
            <select
              v-model="formData.spk_panjang"
              class="inp sel ml-1"
              style="width: 75px"
            >
              <option value="">-</option>
              <option v-for="o in lookupOptions.panjang" :key="o" :value="o">
                {{ o }}
              </option>
            </select>
            <span class="mx-1 sep-txt">X</span>
            <select
              v-model="formData.spk_lebar"
              class="inp sel"
              style="width: 75px"
            >
              <option value="">-</option>
              <option v-for="o in lookupOptions.lebar" :key="o" :value="o">
                {{ o }}
              </option>
            </select>
            <span class="ml-1 sep-txt">Mtr</span>
          </template>
          <label class="lbl ml-2" style="width: 80px">Ket. Ukuran</label>
          <input v-model="formData.KetUkuran" class="inp" style="flex: 1" />
        </div>

        <!-- Gramasi -->
        <div class="fr">
          <label class="lbl">Gramasi</label>
          <template v-if="isDivisiSatuAtauLima">
            <select
              v-model="formData.spk_gramasi"
              class="inp sel"
              style="width: 260px"
            >
              <option value="">-</option>
              <option v-for="o in lookupOptions.gramasi" :key="o" :value="o">
                {{ o }}
              </option>
            </select>
          </template>
          <input
            v-else
            v-model="formData.spk_gramasi"
            class="inp"
            style="width: 260px"
          />
        </div>

        <!-- Kain -->
        <div class="fr">
          <label class="lbl">Kain</label>
          <template v-if="isDivisiSatuAtauLima">
            <select
              v-model="formData.spk_kain"
              class="inp sel"
              style="flex: 1; max-width: 420px"
            >
              <option value="">-</option>
              <option v-for="o in lookupOptions.kain" :key="o" :value="o">
                {{ o }}
              </option>
            </select>
          </template>
          <input
            v-else
            v-model="formData.spk_kain"
            class="inp"
            style="flex: 1; max-width: 420px"
          />
        </div>

        <!-- Finishing -->
        <div class="fr">
          <label class="lbl">Finishing</label>
          <template v-if="isDivisiSatuAtauLima">
            <select
              v-model="formData.spk_finishing"
              class="inp sel"
              style="flex: 1; max-width: 420px"
            >
              <option value="">-</option>
              <option v-for="o in lookupOptions.finishing" :key="o" :value="o">
                {{ o }}
              </option>
            </select>
          </template>
          <input
            v-else
            v-model="formData.spk_finishing"
            class="inp"
            style="flex: 1; max-width: 420px"
          />
        </div>

        <!-- Sablon / Bordir / Sublim + Harga -->
        <div class="fr mt-1 shaded-row">
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.spk_sablon"
              true-value="Y"
              false-value="N"
            />
            Sablon</label
          >
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.spk_bordir"
              true-value="Y"
              false-value="N"
            />
            Bordir</label
          >
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.spk_sublim"
              true-value="Y"
              false-value="N"
            />
            Sublim</label
          >
          <div class="ml-auto d-flex align-center" style="gap: 4px">
            <label class="lbl text-right" style="width: 68px">Harga Jual</label>
            <input
              v-model.number="formData.spk_harga"
              type="number"
              class="inp text-right"
              style="width: 90px"
            />
            <label class="lbl text-right ml-1" style="width: 62px"
              >Harga Riil</label
            >
            <input
              v-model.number="formData.spk_hargariil"
              type="number"
              class="inp text-right"
              style="width: 90px"
            />
            <label class="lbl text-right ml-1" style="width: 48px"
              >Return</label
            >
            <input
              v-model.number="formData.spk_hargafee"
              type="number"
              class="inp text-right"
              style="width: 90px"
            />
          </div>
        </div>

        <!-- Bag Desain / Design Baru / Tgl Acc Proof / Dateline SPK / Ket.PO / SPK Lama -->
        <div class="fr mt-1">
          <label class="lbl">Bag. Desain</label>
          <input
            v-model="formData.spk_desain"
            class="inp"
            style="width: 145px"
          />
          <label class="chk-lbl ml-2 design-baru-lbl">
            <input
              type="checkbox"
              v-model="formData.spk_newdesign"
              true-value="Y"
              false-value="N"
            />
            Design Baru
          </label>
          <label class="lbl ml-auto" style="width: 75px">Tgl Acc Proof</label>
          <input
            type="date"
            v-model="formData.spk_tglaccproof"
            class="idate ml-1"
            style="width: 140px"
          />
        </div>

        <div class="fr">
          <label class="lbl">Dateline SPK</label>
          <input
            type="date"
            v-model="formData.spk_dateline"
            class="idate"
            style="width: 140px"
          />
          <label class="lbl ml-2" style="width: 50px">Ket.PO</label>
          <select
            v-model="formData.spk_ketpo"
            class="inp sel"
            style="width: 185px"
          >
            <option v-for="o in lookupOptions.ketPo" :key="o" :value="o">
              {{ o }}
            </option>
          </select>
          <label class="lbl ml-2" style="width: 60px">SPK Lama</label>
          <div class="igrp" style="flex: 1">
            <input
              v-model="formData.spk_lama"
              class="inp"
              style="flex: 1; background: #ddeeff"
              @change="$emit('field-blur', 'spklama', formData.spk_lama)"
            />
            <button
              type="button"
              class="blkp"
              @mousedown.prevent="$emit('open-lookup', 'spkLama')"
            >
              &#128269;
            </button>
          </div>
        </div>

        <!-- Workshop -->
        <div class="fr">
          <label class="lbl">Workshop</label>
          <div class="igrp" style="width: 260px">
            <input
              v-model="formData.spk_cab"
              class="inp"
              style="width: 50px; background: #ddeeff"
            />
            <input
              :value="formData.spk_workshop"
              readonly
              class="inp ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="blkp"
              @mousedown.prevent="$emit('open-lookup', 'workshop')"
            >
              &#128269;
            </button>
          </div>
        </div>

        <!-- Mitra Luar -->
        <div class="fr mt-1 shaded-row">
          <label class="lbl">Mitra Luar</label>
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.spk_mpotong"
              true-value="Y"
              false-value="N"
            />
            Potong</label
          >
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.spk_mcetak"
              true-value="Y"
              false-value="N"
            />
            Cetak</label
          >
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.spk_mbordir"
              true-value="Y"
              false-value="N"
            />
            Bordir</label
          >
          <label class="chk-lbl mr-3"
            ><input
              type="checkbox"
              v-model="formData.spk_mjahit"
              true-value="Y"
              false-value="N"
            />
            Jahit</label
          >
          <label class="chk-lbl">
            <input
              type="checkbox"
              v-model="formData.spk_mfinishing"
              true-value="Y"
              false-value="N"
            />
            Finishing</label
          >
        </div>
      </div>
    </div>

    <!-- ══ KOLOM KANAN ══ -->
    <div class="so-right">
      <!-- Gambar -->
      <div class="so-section">
        <div class="fr mb-1">
          <button type="button" class="btn-upload" @click="fileRef?.click()">
            <IconUpload :size="13" class="mr-1" /> Upload
          </button>
          <button
            type="button"
            class="btn-upload blue ml-1"
            @click="displayImageUrl && $emit('open-fullscreen')"
          >
            <IconMaximize :size="13" class="mr-1" /> Full Screen
          </button>
          <span class="ml-auto" style="font-size: 10px; color: #1565c0"
            >Ukuran Maximal 1 Mb</span
          >
        </div>
        <div class="img-box">
          <img
            v-if="displayImageUrl"
            :src="displayImageUrl"
            class="img-preview"
          />
          <div v-else class="img-empty">
            <IconPhoto :size="32" color="#bdbdbd" />
            <div style="font-size: 10px; color: #bdbdbd; margin-top: 4px">
              No Image available
            </div>
          </div>
        </div>
        <input
          ref="fileRef"
          type="file"
          accept="image/*"
          style="display: none"
          @change="onFileChange"
        />
      </div>

      <!-- Pending fieldset -->
      <div class="fieldset-box mt-2">
        <div class="fieldset-legend" style="color: #7b1fa2; font-weight: 700">
          Pending
        </div>
        <div class="fr">
          <label class="lbl" style="width: 52px">Status</label>
          <select
            v-model="formData.spk_pending"
            class="inp sel"
            style="flex: 1"
          >
            <option v-for="o in pendingOptions" :key="o" :value="o">
              {{ o }}
            </option>
          </select>
        </div>
        <div
          class="fr mt-1"
          style="flex-wrap: wrap; gap: 3px; padding-left: 2px"
        >
          <label class="chk-lbl text-grey mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_ppotong"
              true-value="Y"
              false-value="N"
              :disabled="formData.spk_pending === 'NORMAL'"
            />
            Potong</label
          >
          <label class="chk-lbl text-grey mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_pcetak"
              true-value="Y"
              false-value="N"
              :disabled="formData.spk_pending === 'NORMAL'"
            />
            Cetak</label
          >
          <label class="chk-lbl text-grey mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_pbordir"
              true-value="Y"
              false-value="N"
              :disabled="formData.spk_pending === 'NORMAL'"
            />
            Bordir</label
          >
          <label class="chk-lbl text-grey mr-2"
            ><input
              type="checkbox"
              v-model="formData.spk_pjahit"
              true-value="Y"
              false-value="N"
              :disabled="formData.spk_pending === 'NORMAL'"
            />
            Jahit</label
          >
          <label class="chk-lbl text-grey">
            <input
              type="checkbox"
              v-model="formData.spk_pfinishing"
              true-value="Y"
              false-value="N"
              :disabled="formData.spk_pending === 'NORMAL'"
            />
            Finishing</label
          >
        </div>
        <div class="fr mt-1">
          <label class="lbl" style="width: 30px">Ket</label>
          <input
            v-model="formData.spk_ketpending"
            class="inp"
            style="flex: 1"
            :disabled="formData.spk_pending === 'NORMAL'"
          />
        </div>
      </div>

      <!-- Warna fieldset — di bawah pending -->
      <div class="fieldset-box mt-2">
        <div class="fieldset-legend">Warna</div>
        <div class="fr">
          <label class="lbl" style="width: 46px">Badan</label>
          <input
            v-model="formData.spk_warna_badan"
            class="inp"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl" style="width: 46px">Lengan</label>
          <input
            v-model="formData.spk_warna_lengan"
            class="inp"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl" style="width: 46px">Lain2</label>
          <input
            v-model="formData.spk_warna_lain"
            class="inp"
            style="flex: 1"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══ Root layout ══ */
.so-layout {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  height: 100%;
  overflow-y: auto;
  padding: 6px;
  box-sizing: border-box;
}
.so-left {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.so-right {
  width: 335px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

/* ══ Section ══ */
.so-section {
  background: white;
  border: 1px solid #bdbdbd;
  padding: 7px 10px;
}

/* ══ Fieldset-style box ══ */
.fieldset-box {
  border: 1px solid #9e9e9e;
  padding: 7px 8px 6px;
  padding-top: 15px;
  position: relative;
  background: #fafafa;
}
.fieldset-legend {
  position: absolute;
  top: -8px;
  left: 10px;
  background: #fafafa;
  padding: 0 4px;
  font-weight: 700;
  font-size: 11px;
  color: #424242;
  white-space: nowrap;
}

/* ══ Form row ══ */
.fr {
  display: flex;
  align-items: center;
  margin-bottom: 3px;
  min-height: 24px;
}
.align-start {
  align-items: flex-start !important;
}
.ref-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

/* ══ Label ══ */
.lbl {
  width: 80px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  font-size: 11px;
}

/* ══ Input ══ */
.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
  font-family: inherit;
  color: #212121;
  box-sizing: border-box;
}
.inp:focus {
  border-color: #1565c0;
}
.inp:disabled {
  background: #f0f0f0 !important;
  color: #9e9e9e;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.sel {
  padding: 0 2px;
  cursor: pointer;
}

.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 3px;
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.idate:focus {
  border-color: #1565c0;
}

/* ══ Input group ══ */
.igrp {
  display: flex;
  border: 1px solid #a0a0a0;
  overflow: hidden;
  height: 24px;
  background: white;
  flex-shrink: 0;
}
.igrp .inp {
  border: none;
  height: 22px;
  flex-shrink: 0;
}
.igrp .inp + .inp {
  border-left: 1px solid #ccc;
}
.blkp {
  width: 22px;
  flex-shrink: 0;
  background: #e0e0e0;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blkp:hover {
  background: #d0d0d0;
}

/* ══ Misc ══ */
.divider {
  height: 1px;
  background: #e0e0e0;
  margin: 5px 0;
}
.shaded-row {
  background: #f5f5f5;
  padding: 3px 5px;
  border: 1px solid #eee;
  border-radius: 2px;
}
.chk-lbl {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  font-size: 11px;
}
.chk-lbl input {
  margin: 0;
  accent-color: #1565c0;
}

.status-lbl {
  font-weight: 700;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 3px;
}
.status-lbl.aktif {
  color: #2e7d32;
  background: #e8f5e9;
}
.status-lbl.pasif {
  color: #c62828;
  background: #ffebee;
}

.hint-new {
  font-size: 9px;
  color: #d32f2f;
  font-weight: 700;
}
.perfect-lbl {
  background: #fff176;
  padding: 1px 4px;
  font-weight: 700;
  font-size: 11px;
  border: 1px solid #fbc02d;
}
.design-baru-lbl {
  background: #fff176;
  padding: 1px 5px;
  font-weight: 700;
  border: 1px solid #fbc02d;
}
.sep-txt {
  color: #555;
  font-size: 11px;
}
.text-grey {
  color: #757575;
}

/* ══ Gambar ══ */
.img-box {
  border: 1px solid #ccc;
  background: #f0f0f0;
  height: 185px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-top: 2px;
}
.img-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.img-empty {
  text-align: center;
}

.btn-upload {
  background: #78909c;
  color: white;
  border: none;
  padding: 3px 10px;
  font-weight: 600;
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-upload.blue {
  background: #1565c0;
}
.btn-upload:hover {
  opacity: 0.88;
}

/* ══ Spacing utils ══ */
.ml-1 {
  margin-left: 4px;
}
.ml-2 {
  margin-left: 8px;
}
.mr-1 {
  margin-right: 4px;
}
.mr-2 {
  margin-right: 8px;
}
.mr-3 {
  margin-right: 12px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mx-1 {
  margin-left: 3px;
  margin-right: 3px;
}
.mb-1 {
  margin-bottom: 4px;
}
.ml-auto {
  margin-left: auto;
}
.d-flex {
  display: flex;
}
.align-center {
  align-items: center;
}
.text-right {
  text-align: right;
}
.text-center {
  text-align: center;
}
</style>
