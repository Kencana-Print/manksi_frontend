<template>
    <BaseForm
        :title="formTitle"
        menu-id="5504"
        :icon="IconShoppingCart"
        :is-loading="isLoading"
        :is-saving="isSaving"
        :disabled-save="!isFormValid || isSaving"
        item-name="PO Bahan MMT"
        desktop-mode
        v-model:show-save-dialog="showSaveDialog"
        v-model:show-cancel-dialog="showCancelDialog"
        v-model:show-close-dialog="showCloseDialog"
        @validate-save="onValidateSave"
        @confirm-save="executeSave"
        @confirm-cancel="executeCancel"
        @confirm-close="executeClose"
    >
        <!-- Tombol Aksi Tambahan & Status di Toolbar -->
        <template #header-actions-prepend>
            <span
                class="status-badge"
                :class="
                    (formData.pinStatus || formData.status) === 'CLOSE'
                        ? 'badge-closed'
                        : (formData.pinStatus || formData.status) === 'ACC'
                          ? 'badge-acc'
                          : 'badge-wait'
                "
            >
                {{ formData.pinStatus || formData.status }}
            </span>

            <v-btn
                v-if="
                    isEditMode &&
                    user.user_manager === 1 &&
                    formData.poAcc === 'N'
                "
                size="x-small"
                color="success"
                variant="elevated"
                @click="handleAccManager"
                :disabled="isSaving"
            >
                <template #prepend>
                    <IconCheck :size="14" />
                </template>
                ACC Manager
            </v-btn>

            <v-btn
                v-if="isEditMode"
                size="x-small"
                color="teal"
                variant="elevated"
                class="text-white"
                @click="handlePrint"
                :disabled="isSaving"
            >
                <template #prepend>
                    <IconPrinter :size="14" />
                </template>
                Cetak (F3)
            </v-btn>
        </template>

        <!-- ==================== KOLOM KIRI (HEADER & SUPPLIER) ==================== -->
        <template #left-column>
            <div class="left-column-inner">
                <!-- Section 1: Data Header Dokumen -->
                <div class="desktop-form-section header-section">
                    <div class="section-label">Data Header Dokumen</div>

                    <!-- Nomor PO -->
                    <div class="fr">
                        <label class="lbl">Nomor PO</label>
                        <input
                            :value="formData.nomor"
                            readonly
                            class="inp ro fw flex-1 text-primary"
                            placeholder="← AUTO"
                            @keyup.enter="handleNomorExit"
                        />
                    </div>

                    <!-- Tanggal PO -->
                    <div class="fr">
                        <label class="lbl">Tanggal PO</label>
                        <input
                            type="date"
                            v-model="formData.tanggal"
                            class="idate flex-1"
                        />
                    </div>

                    <!-- Jenis PO -->
                    <div class="fr">
                        <label class="lbl">Jenis PO</label>
                        <div
                            class="d-flex align-center ga-3 flex-1 font-size-11"
                        >
                            <label
                                class="ck"
                                :class="{ 'ck-disabled': !isJenisPoEnabled(0) }"
                            >
                                <input
                                    type="radio"
                                    name="jenisPo"
                                    :value="0"
                                    :checked="formData.jenisPo === 0"
                                    :disabled="!isJenisPoEnabled(0)"
                                    @change="handleJenisPoChange(0)"
                                />
                                <span>Bahan</span>
                            </label>
                            <label
                                class="ck"
                                :class="{ 'ck-disabled': !isJenisPoEnabled(1) }"
                            >
                                <input
                                    type="radio"
                                    name="jenisPo"
                                    :value="1"
                                    :checked="formData.jenisPo === 1"
                                    :disabled="!isJenisPoEnabled(1)"
                                    @change="handleJenisPoChange(1)"
                                />
                                <span>Bahan Baku</span>
                            </label>
                            <label
                                class="ck"
                                :class="{ 'ck-disabled': !isJenisPoEnabled(2) }"
                            >
                                <input
                                    type="radio"
                                    name="jenisPo"
                                    :value="2"
                                    :checked="formData.jenisPo === 2"
                                    :disabled="!isJenisPoEnabled(2)"
                                    @change="handleJenisPoChange(2)"
                                />
                                <span>Celup</span>
                            </label>
                        </div>
                    </div>

                    <!-- Khusus PO Celup: PO Greige & MPPB -->
                    <template v-if="formData.jenisPo === 2">
                        <div class="fr">
                            <label class="lbl">PO Greige</label>
                            <div class="igrp flex-1">
                                <input
                                    v-model="formData.poGreige"
                                    class="inp cursor-pointer"
                                    placeholder="Pilih PO Greige..."
                                    readonly
                                    @click="openPoGreigeSearch"
                                />
                                <button
                                    type="button"
                                    class="blkp"
                                    title="Cari PO Greige"
                                    @click="openPoGreigeSearch"
                                >
                                    <IconSearch :size="13" />
                                </button>
                            </div>
                        </div>

                        <div class="fr">
                            <label class="lbl">No. MPPB</label>
                            <div class="igrp flex-1">
                                <input
                                    v-model="formData.mppbNomor"
                                    class="inp cursor-pointer"
                                    placeholder="Pilih MPPB..."
                                    readonly
                                    @click="openMppbSearch"
                                />
                                <button
                                    type="button"
                                    class="blkp"
                                    title="Cari MPPB"
                                    @click="openMppbSearch"
                                >
                                    <IconSearch :size="13" />
                                </button>
                            </div>
                        </div>
                    </template>

                    <!-- Nomor Permintaan -->
                    <div class="fr">
                        <label class="lbl">No Permintaan</label>
                        <div class="igrp flex-1">
                            <input
                                v-model="formData.nomorPermintaan"
                                class="inp"
                                placeholder="Cari Permintaan (F1)..."
                                @keyup.f1.prevent="openPermintaanSearch"
                                @keyup.enter="handlePermintaanEnter"
                            />
                            <button
                                type="button"
                                class="blkp"
                                title="Cari Permintaan (F1)"
                                @click="openPermintaanSearch"
                            >
                                <IconSearch :size="13" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Section 2: Supplier & Pengiriman -->
                <div class="desktop-form-section">
                    <div class="section-label">Supplier & Pengiriman</div>

                    <!-- Supplier (Kode & Nama) -->
                    <div class="fr">
                        <label class="lbl">Supplier</label>
                        <div class="d-flex ga-1 flex-1">
                            <div class="igrp" style="width: 85px">
                                <input
                                    v-model="formData.supKode"
                                    class="inp"
                                    placeholder="Kode"
                                    @keyup.f1.prevent="openSupplierSearch"
                                    @blur="handleSupKodeExit"
                                />
                                <button
                                    type="button"
                                    class="blkp"
                                    title="Cari Supplier (F1)"
                                    @click="openSupplierSearch"
                                >
                                    <IconSearch :size="13" />
                                </button>
                            </div>
                            <input
                                :value="formData.supNama"
                                readonly
                                class="inp ro flex-1"
                                placeholder="Nama Supplier"
                            />
                        </div>
                    </div>

                    <!-- Alamat Supplier -->
                    <div class="fr">
                        <label class="lbl">Alamat</label>
                        <input
                            :value="formData.supAlamat"
                            readonly
                            class="inp ro flex-1"
                            placeholder="Alamat Supplier"
                        />
                    </div>

                    <!-- Kota Supplier -->
                    <div class="fr">
                        <label class="lbl">Kota</label>
                        <input
                            :value="formData.supKota"
                            readonly
                            class="inp ro flex-1"
                            placeholder="Kota Supplier"
                        />
                    </div>

                    <!-- Kirim Ke Pabrik -->
                    <div class="fr">
                        <label class="lbl">Kirim Ke</label>
                        <div class="igrp flex-1">
                            <input
                                :value="formData.pabrikNama"
                                readonly
                                class="inp ro cursor-pointer"
                                placeholder="Pilih Tujuan Pabrik..."
                                @click="isPabrikModalVisible = true"
                            />
                            <button
                                type="button"
                                class="blkp"
                                title="Pilih Pabrik"
                                @click="isPabrikModalVisible = true"
                            >
                                <IconSearch :size="13" />
                            </button>
                        </div>
                    </div>

                    <!-- Alamat Pengiriman Pabrik -->
                    <div class="fr">
                        <label class="lbl">Alamat Kirim</label>
                        <input
                            v-model="formData.AlamatPabrik"
                            class="inp flex-1"
                            placeholder="Alamat Pengiriman Pabrik..."
                        />
                    </div>
                </div>

                <!-- Section 3: Dateline Commitment (PO Bahan) -->
                <div v-if="formData.jenisPo === 0" class="desktop-form-section">
                    <div
                        class="section-label d-flex align-center ga-1 text-primary"
                    >
                        <IconCalendar :size="13" />
                        <span>Dateline / Delivery Commitment</span>
                    </div>
                    <div class="fr">
                        <label class="lbl">Tgl Janji</label>
                        <input
                            type="date"
                            v-model="formData.commitments[0].tanggal"
                            class="idate flex-1 font-weight-medium"
                        />
                    </div>
                </div>

                <!-- Gap bawah pengaman agar field tidak tertutup footer -->
                <div class="left-bottom-spacer"></div>
            </div>
        </template>

        <!-- ==================== KOLOM KANAN (DETAIL & SUMMARY) ==================== -->
        <template #right-column>
            <!-- Section 1: Detail Item PO -->
            <div class="desktop-form-section detail-section">
                <div class="d-flex align-center justify-space-between mb-2">
                    <div class="section-label mb-0">Detail Item PO</div>
                    <div class="d-flex align-center ga-3">
                        <span class="text-caption text-grey">
                            Total QTY Item:
                            <strong>{{
                                calculatedItemTotal.toFixed(2)
                            }}</strong>
                        </span>
                        <v-btn
                            size="x-small"
                            color="primary"
                            variant="elevated"
                            @click="addDetail"
                        >
                            <template #prepend>
                                <IconPlus :size="13" />
                            </template>
                            Tambah Item
                        </v-btn>
                    </div>
                </div>

                <div
                    class="tbl-wrap grow"
                    style="min-height: 220px; max-height: calc(100vh - 420px)"
                >
                    <table class="gt">
                        <thead>
                            <tr>
                                <th style="width: 32px" class="tc">No</th>
                                <th style="width: 130px">Kode</th>
                                <th style="min-width: 200px">Nama</th>
                                <th style="width: 55px" class="tc">Sat</th>
                                <th style="width: 60px" class="tr">Roll</th>
                                <th style="width: 60px" class="tr">P (m)</th>
                                <th style="width: 60px" class="tr">L (m)</th>
                                <th style="width: 75px" class="tr">M²/Roll</th>
                                <th style="width: 75px" class="tr">Qty Roll</th>
                                <th style="width: 115px" class="tr">Harga</th>
                                <th style="width: 65px" class="tr">Diskon%</th>
                                <th style="width: 120px" class="tr">Total</th>
                                <th style="width: 120px">SPK</th>
                                <th style="width: 32px" class="tc"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(it, idx) in formData.detail" :key="idx">
                                <td class="tc ro text-caption">
                                    {{ idx + 1 }}
                                </td>

                                <!-- Kode Bahan & Lookup Button -->
                                <td class="p0">
                                    <div class="cell-igrp">
                                        <input
                                            type="text"
                                            v-model="it.kode"
                                            class="ci flex-1 cursor-pointer fw text-primary"
                                            placeholder="Pilih Bahan..."
                                            readonly
                                            @click="openBahanSearch(idx)"
                                        />
                                        <button
                                            type="button"
                                            class="cell-btn-lookup"
                                            title="Cari Bahan"
                                            @click="openBahanSearch(idx)"
                                        >
                                            <IconSearch :size="12" />
                                        </button>
                                    </div>
                                </td>

                                <!-- Nama Bahan -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.namaext"
                                        class="ci"
                                        placeholder="Nama bahan..."
                                    />
                                </td>

                                <!-- Satuan -->
                                <td class="p0">
                                    <input
                                        type="text"
                                        v-model="it.satuan"
                                        class="ci tc"
                                        placeholder="..."
                                    />
                                </td>

                                <!-- Roll -->
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.roll"
                                        class="ci tr"
                                        :disabled="formData.jenisPo !== 2"
                                        @input="handleRollChange(it)"
                                        placeholder="0"
                                    />
                                </td>

                                <!-- Panjang -->
                                <td class="tr ro text-caption">
                                    {{ it.panjang || "-" }}
                                </td>

                                <!-- Lebar -->
                                <td class="tr ro text-caption">
                                    {{ it.lebar || "-" }}
                                </td>

                                <!-- M2/Roll -->
                                <td class="tr ro fw text-caption">
                                    {{
                                        (Number(it.m2) ||
                                            Number(it.panjang || 0) *
                                                Number(it.lebar || 0) ||
                                            0) > 0
                                            ? (
                                                  Number(it.m2) ||
                                                  Number(it.panjang || 0) *
                                                      Number(it.lebar || 0)
                                              ).toFixed(2)
                                            : "-"
                                    }}
                                </td>

                                <!-- Qty Roll (Editable highlighted) -->
                                <td class="p0 bg-qty-edit">
                                    <input
                                        type="number"
                                        v-model.number="it.jumlah"
                                        class="ci tr fw"
                                        min="0"
                                        @input="onItemChange(it)"
                                    />
                                </td>

                                <!-- Harga Sesuai Mode (Per m2 / qty) -->
                                <td class="p0">
                                    <div class="d-flex align-center">
                                        <input
                                            type="number"
                                            v-model.number="it.harga"
                                            class="ci tr flex-1"
                                            @input="onItemChange(it)"
                                        />
                                        <span
                                            class="text-caption text-grey pr-1"
                                            style="
                                                font-size: 9px;
                                                flex-shrink: 0;
                                            "
                                        >
                                            {{ isPerM2(it) ? "/m²" : "/qty" }}
                                        </span>
                                    </div>
                                </td>

                                <!-- Diskon % -->
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="it.diskon"
                                        class="ci tr"
                                        min="0"
                                        max="100"
                                        @input="onItemChange(it)"
                                    />
                                </td>

                                <!-- Total Baris -->
                                <td class="tr fw ro pr-2">
                                    {{ formatCurrency(calculateTotal(it)) }}
                                </td>

                                <!-- No SPK -->
                                <td class="p0">
                                    <div class="cell-igrp">
                                        <input
                                            type="text"
                                            v-model="it.spk"
                                            class="ci flex-1 cursor-pointer"
                                            placeholder="SPK..."
                                            readonly
                                            @click="openSPKSearch(idx)"
                                        />
                                        <button
                                            type="button"
                                            class="cell-btn-lookup"
                                            title="Cari SPK"
                                            @click="openSPKSearch(idx)"
                                        >
                                            <IconSearch :size="12" />
                                        </button>
                                    </div>
                                </td>

                                <!-- Tombol Hapus Baris -->
                                <td class="tc p0">
                                    <button
                                        type="button"
                                        class="btn-del"
                                        title="Hapus Baris"
                                        @click="removeDetail(idx)"
                                        :disabled="
                                            formData.detail.length === 1 &&
                                            !formData.detail[0].kode
                                        "
                                    >
                                        <IconTrash :size="13" />
                                    </button>
                                </td>
                            </tr>
                            <tr v-if="formData.detail.length === 0">
                                <td
                                    colspan="14"
                                    class="tc py-4 text-grey text-caption"
                                >
                                    Belum ada item PO. Klik '+ Tambah Item'
                                    untuk menambahkan baris.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Section 2: Roll Detail (PO Celup) -->
            <div
                v-if="formData.jenisPo === 2"
                class="desktop-form-section mt-2"
            >
                <div class="section-label">Roll Detail (PO Celup)</div>
                <div class="tbl-wrap" style="max-height: 180px">
                    <table class="gt">
                        <thead>
                            <tr>
                                <th style="width: 45px" class="tc">No Roll</th>
                                <th style="width: 140px">Kode Bahan</th>
                                <th style="min-width: 180px">Nama Bahan</th>
                                <th style="width: 100px" class="tr">
                                    Jumlah (Roll)
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(r, rIdx) in formData.rolls" :key="rIdx">
                                <td class="tc ro text-caption">{{ r.no }}</td>
                                <td class="ro">{{ r.kode }}</td>
                                <td class="ro">{{ r.nama }}</td>
                                <td class="p0">
                                    <input
                                        type="number"
                                        v-model.number="r.jumlah"
                                        class="ci tr fw"
                                        min="0"
                                    />
                                </td>
                            </tr>
                            <tr v-if="formData.rolls.length === 0">
                                <td
                                    colspan="4"
                                    class="tc py-3 text-grey text-caption"
                                >
                                    Belum ada detail roll.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div
                    class="d-flex justify-end pa-2 bg-grey-lighten-4 font-weight-bold text-caption border-b border-s border-e"
                >
                    Total Roll Qty: {{ calculatedRollTotal.toFixed(2) }}
                </div>
            </div>

            <!-- Section 3: Catatan & Ringkasan Total Biaya -->
            <div class="desktop-form-section mt-2">
                <div class="d-flex ga-4 flex-wrap flex-md-nowrap">
                    <!-- Catatan / Note -->
                    <div class="flex-1" style="min-width: 250px">
                        <div class="section-label">Catatan / Note</div>
                        <textarea
                            v-model="formData.note"
                            class="inp ta"
                            rows="3"
                            style="width: 100%; height: 74px; resize: none"
                            placeholder="Catatan tambahan untuk PO..."
                        ></textarea>
                    </div>

                    <!-- Ringkasan Biaya -->
                    <div style="width: 320px; flex-shrink: 0">
                        <div class="section-label">Ringkasan Biaya</div>
                        <div class="fr justify-space-between mb-1">
                            <span class="lbl-calc">Subtotal:</span>
                            <span class="val-calc fw">{{
                                formatCurrency(calculatedSubTotal)
                            }}</span>
                        </div>
                        <div class="fr justify-space-between mb-1">
                            <div class="d-flex align-center ga-2">
                                <label class="ck">
                                    <input
                                        type="checkbox"
                                        v-model="formData.isPpn"
                                        @change="handlePpnToggle"
                                    />
                                    PPN
                                </label>
                                <input
                                    type="number"
                                    v-model.number="formData.ppnRate"
                                    class="inp tr"
                                    style="width: 48px"
                                    :disabled="!formData.isPpn"
                                    @input="hitung"
                                />
                                <span class="text-caption">%</span>
                            </div>
                            <span class="val-calc fw">{{
                                formatCurrency(calculatedPpnTotal)
                            }}</span>
                        </div>
                        <div class="sec-divider my-1"></div>
                        <div class="pricing-total-card">
                            <div class="pt-sub">GRAND TOTAL</div>
                            <div class="pt-val">
                                {{ formatCurrency(calculatedGrandTotal) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Spacer bawah agar tidak terpotong -->
            <div style="height: 16px; flex-shrink: 0"></div>
        </template>
    </BaseForm>

    <SupplierLookupModal
        v-if="isSupplierModalVisible"
        :isVisible="isSupplierModalVisible"
        @close="() => (isSupplierModalVisible = false)"
        @select="handleSupplierSelect"
    />
    <PoGreigeLookupModal
        v-if="isPoGreigeModalVisible"
        v-model="isPoGreigeModalVisible"
        @selected="handlePoGreigeSelect"
    />
    <MppbLookupView
        v-if="isMppbModalVisible"
        :isVisible="isMppbModalVisible"
        @close="() => (isMppbModalVisible = false)"
        @select="handleMppbSelect"
    />
    <MkbLookupModal
        v-if="isMkbModalVisible"
        v-model="isMkbModalVisible"
        @selected="handleMkbSelect"
    />
    <MasterBahanModal
        :isVisible="isBahanModalVisible"
        mode="mmt"
        @close="closeBahanModal"
        @select="(b: any) => handleBahanSelect(b)"
    />
    <PermintaanBahanLookupView
        v-if="isPermintaanSearchVisible"
        :isVisible="isPermintaanSearchVisible"
        @close="isPermintaanSearchVisible = false"
        @select="(p: any) => handleSelectPermintaan(p)"
    />
    <SPKLookupModal
        v-if="isSPKModalVisible"
        :isVisible="isSPKModalVisible"
        @close="() => (isSPKModalVisible = false)"
        @select="handleSPKSelect"
    />
    <PabrikLookupModal
        :isVisible="isPabrikModalVisible"
        @close="isPabrikModalVisible = false"
        @select="handlePabrikSelect"
    />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, reactive, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import api from "@/services/api";
import { AxiosError } from "axios";
import BaseForm from "@/components/BaseForm.vue";
import {
    IconShoppingCart,
    IconSearch,
    IconPrinter,
    IconCalendar,
    IconPlus,
    IconCheck,
    IconTrash,
} from "@tabler/icons-vue";
import { format, parseISO, isValid } from "date-fns";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import SupplierLookupModal from "@/modal/SupplierLookupModal.vue";
import MasterBahanModal from "@/modal/MasterBahanModal.vue";
import PoGreigeLookupModal from "@/components/lookups/PoGreigeSearchModal.vue";
import MppbLookupView from "@/modal/MppbLookupView.vue";
import MkbLookupModal from "@/components/lookups/MkbSearchModal.vue";
// import BahanLookupModal from "@/components/lookups/BahanMmtSearchModal.vue";
import SPKLookupModal from "@/modal/SpkLookupModal.vue";
import PermintaanBahanLookupView from "@/modal/PermintaanBahanLookupView.vue";
import PabrikLookupModal from "@/modal/PabrikLookupModal.vue";

// --- Interfaces ---

interface MasterBahan {
    Kode: string;
    Nama: string;
    Satuan: string;
    Panjang: number;
    Lebar: number;
    brg_satuan_harga?: string;
    [key: string]: string | number | undefined;
}

interface DetailItem {
    no: number;
    mkb: string;
    kode: string;
    nama: string;
    namaext: string;
    satuan: string;
    roll: number;
    panjang: number;
    lebar: number;
    m2: number; // ✅ luas per roll

    jumlah: number; // ✅ qty roll
    harga: number;
    diskon: number;
    total: number;
    spk: string;
    mb_nomor?: string;
    satuanHarga: string;
    gramasi?: string;
    seting?: string;
}

interface CommitmentItem {
    no: number;
    tanggal: string;
    jumlah: number;
    nama?: string;
    kode?: string;
}

interface RollItem {
    no: number;
    kode: string;
    nama: string;
    satuan: string;
    jumlah: number;
}

interface FormDataState {
    nomor: string;
    tanggal: string;
    supKode: string;
    supNama: string;
    supAlamat: string;
    supKota: string;
    jenisPo: 0 | 1 | 2; // 1=Greige, 2=Celup, 0=Bahan
    nomorPermintaan: string;
    pabrikKode: string; // Kode Pabrik untuk backend
    pabrikNama: string;
    AlamatPabrik: string;
    cabang?: string;
    poGreige: string;
    mppbNomor: string;
    mppbTanggal: string;
    mppbJumlah: number;
    keterangan: string;
    note: string;
    isPpn: boolean;
    ppnRate: number;
    status: "OPEN" | "CLOSE" | "ONPROSES"; // lblbpb status
    pinStatus?: string;
    poAcc: "Y" | "N";
    detail: DetailItem[];
    commitments: CommitmentItem[];
    rolls: RollItem[];
}

interface LookupItem {
    Kode?: string;
    Nomor?: string;
    Nama?: string;
    Alamat?: string;
    Kota?: string;
    Tanggal?: string;
    Jumlah?: number;
    Panjang?: number;
    Lebar?: number;
    [key: string]: string | number | undefined;
}

// --- Setup & State ---
const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

// ASUMSI: Konstanta dari Delphi
const API_BASE_URL = "/mmt/po-bahan-mmt";
const API_SUPPLIER_DETAIL = "/supplier/detail";
const API_UNFULFILLED_MB_DETAIL = `${API_BASE_URL}/unfulfilled-mb-detail`;
const API_MASTER_BAHAN_DETAIL_SINGLE = "/master/bahan/mmt";

const user = computed(() => ({
    canSeePrice:
        authStore.user?.flags?.lihatHarga === 1 ||
        authStore.user?.flags?.lihatBeli === 1,
    defaultPpn: 11,
    KDUSER: authStore.user?.kode || "ADMIN_PPIC",
    user_manager: authStore.user?.flags?.isManager ?? 1,
}));

const isEditMode = ref(!!route.params.nomor);
const isNewEntry = computed(() => !isEditMode.value);
const isSaving = ref(false);
const isLoading = ref(false);
const currentDetailIndex = ref<number | null>(null);

// Dialog confirmation states
const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);

// Modal visibility state
const isSupplierModalVisible = ref(false);
const isPoGreigeModalVisible = ref(false);
const isMppbModalVisible = ref(false);
const isMkbModalVisible = ref(false);
const isBahanModalVisible = ref(false);
const isPabrikModalVisible = ref(false);
const isSPKModalVisible = ref(false);
const isPermintaanSearchVisible = ref(false);

const createEmptyDetail = (): DetailItem => ({
    no: 0,
    mkb: "",
    kode: "",
    nama: "",
    namaext: "",
    satuan: "",
    roll: 0,
    panjang: 0,
    lebar: 0,
    m2: 0,
    jumlah: 0, // qty roll
    harga: 0,
    diskon: 0,
    total: 0,
    spk: "",
    mb_nomor: "",
    satuanHarga: "roll",
});

const createEmptyCommitment = (): CommitmentItem => ({
    no: 0,
    tanggal: format(new Date(), "yyyy-MM-dd"),
    jumlah: 0,
});

const formData = reactive<FormDataState>({
    nomor: "AUTO",
    tanggal: format(new Date(), "yyyy-MM-dd"),
    supKode: "",
    supNama: "",
    supAlamat: "",
    supKota: "",
    jenisPo: 0, // Default Bahan
    nomorPermintaan: "",
    pabrikKode: "",
    pabrikNama: "",
    AlamatPabrik: "",
    poGreige: "",
    mppbNomor: "",
    mppbTanggal: "",
    mppbJumlah: 0,
    keterangan: "",
    note: "",
    isPpn: false,
    ppnRate: 11,
    status: "OPEN",
    pinStatus: "",
    poAcc: "N",
    detail: [createEmptyDetail()],
    commitments: [createEmptyCommitment()],
    rolls: [],
});

const formTitle = computed(() =>
    isEditMode.value
        ? `Ubah PO Bahan MMT: ${formData.nomor}`
        : "Input Baru PO Bahan MMT",
);

const handleAccManager = async () => {
    if (!isEditMode.value || !formData.nomor) return;

    // Konfirmasi keamanan
    if (!confirm(`ACC PO ${formData.nomor}?`)) return;

    try {
        isSaving.value = true;

        // Mengirim permintaan PUT ke endpoint spesifik
        await api.put(`${API_BASE_URL}/${formData.nomor}/acc-manager`, {
            po_acc: "Y",
            user: user.value.KDUSER,
        });

        toast.success("PO berhasil di-ACC Manager");

        // Update state lokal agar UI langsung merespon (tombol hilang)
        formData.poAcc = "Y";
        formData.pinStatus = "ACC";
    } catch (err) {
        console.error(err);
        toast.error("Gagal ACC PO. Silakan ulangi.");
    } finally {
        isSaving.value = false;
    }
};

const isPerM2 = (item: DetailItem): boolean => {
    const sHrg = (item.satuanHarga || "").toLowerCase().trim();
    if (sHrg === "m2" || sHrg === "m²") return true;
    if (
        sHrg === "roll" ||
        sHrg === "qty" ||
        sHrg === "pcs" ||
        sHrg === "lembar"
    )
        return false;
    const panjang = Number(item.panjang) || 0;
    const lebar = Number(item.lebar) || 0;
    const m2Luas =
        Number(item.m2) || (panjang * lebar > 0 ? panjang * lebar : 0);
    return m2Luas > 0;
};

const calculateTotal = (item: DetailItem): number => {
    const qty = Number(item.jumlah) || 0;
    const panjang = Number(item.panjang) || 0;
    const lebar = Number(item.lebar) || 0;
    const m2Luas =
        Number(item.m2) || (panjang * lebar > 0 ? panjang * lebar : 0);
    const harga = Number(item.harga) || 0;
    const diskon = Number(item.diskon) || 0;

    const perM2 = isPerM2(item);
    const faktor = perM2 && m2Luas > 0 ? m2Luas * qty : qty;
    const bruto = faktor * harga;
    const total = bruto * (1 - diskon / 100);

    return Math.round(total * 100) / 100;
};

const hitung = () => {
    formData.detail.forEach((item) => {
        item.total = calculateTotal(item);
    });
};

const onItemChange = (item: DetailItem) => {
    item.total = calculateTotal(item);
};

const calculatedSubTotal = computed(() =>
    formData.detail.reduce(
        (sum, d) => sum + (Number(calculateTotal(d)) || 0),
        0,
    ),
);

const calculatedPpnTotal = computed(() =>
    formData.isPpn
        ? calculatedSubTotal.value * ((Number(formData.ppnRate) || 0) / 100)
        : 0,
);

const calculatedGrandTotal = computed(
    () => calculatedSubTotal.value + calculatedPpnTotal.value,
);

const calculatedItemTotal = computed(() => {
    return formData.detail.reduce((sum, d) => sum + (Number(d.jumlah) || 0), 0);
});

const calculatedRollTotal = computed(() => {
    return formData.rolls.reduce((sum, r) => sum + (Number(r.jumlah) || 0), 0);
});

const isFormValid = computed(() => {
    if (!formData.supKode) return false;

    const validDetail = formData.detail.some(
        (d) => d.kode && Number(d.jumlah) > 0 && Number(d.harga) >= 0,
    );

    if (!validDetail) return false;

    // PO Bahan wajib dateline
    if (formData.jenisPo === 0) {
        if (!formData.commitments[0]?.tanggal) return false;
    }

    // PO Celup wajib roll detail kalau ada roll
    if (formData.jenisPo === 2) {
        const adaRoll = formData.detail.some((d) => d.roll > 0);
        if (adaRoll && calculatedRollTotal.value === 0) return false;
    }

    return true;
});

// Menentukan apakah radio button jenis PO harus di-disable
const isJenisPoEnabled = (jenis: 0 | 1 | 2) => {
    if (!isNewEntry.value) {
        // Hanya jenis PO yang sudah dipilih yang boleh aktif di mode edit
        return formData.jenisPo === jenis;
    }
    // Jika New Entry, semua aktif
    return true;
};

const getPinStatusColor = (status: string) => {
    switch (status) {
        case "WAIT":
            return "blue";
        case "ACC":
            return "green";
        case "TOLAK":
            return "red";
        case "MINTA":
            return "grey";
        default:
            return "transparent";
    }
};
const openPermintaanSearch = () => {
    // Hanya izinkan pencarian jika form masih mode baru (tidak edit mode)
    // if (isEditMode.value) return;
    isPermintaanSearchVisible.value = true;
};

// --- Headers Sesuai Delphi Grid ---
const detailHeaders = [
    { title: "No", key: "index", width: "50px", align: "center" as const },
    { title: "Kode", key: "kode", width: "120px" },
    { title: "Nama", key: "namaext", width: "220px" },
    { title: "Sat", key: "satuan", width: "70px" },

    { title: "P (m)", key: "panjang", width: "70px", align: "end" as const },
    { title: "L (m)", key: "lebar", width: "70px", align: "end" as const },
    { title: "M²/Roll", key: "m2", width: "90px", align: "end" as const },

    { title: "Qty Roll", key: "jumlah", width: "90px", align: "end" as const },

    { title: "Harga", key: "harga", width: "130px", align: "end" as const },
    { title: "Diskon%", key: "diskon", width: "80px", align: "end" as const },
    { title: "Total", key: "total", width: "150px", align: "end" as const },
    { title: "SPK", key: "spk", width: "130px" },
    { title: "Aksi", key: "actions", width: "60px", sortable: false },
] as const;

const commitmentHeaders = [
    {
        title: "No",
        key: "index",
        width: "10%",
        sortable: false,
        align: "center" as const,
    },
    { title: "Tanggal", key: "tanggal", width: "30%" },
    { title: "Jumlah", key: "jumlah", width: "30%", align: "end" as const },
] as const;

const rollHeaders = [
    {
        title: "No Roll",
        key: "no",
        width: "10%",
        sortable: false,
        align: "center" as const,
    },
    { title: "Kode Bahan", key: "kode", width: "20%" },
    { title: "Nama Bahan", key: "nama", width: "30%" },
    {
        title: "Jumlah (Roll)",
        key: "jumlah",
        width: "20%",
        align: "end" as const,
    },
] as const;

// --- Helpers ---

const formatCurrency = (value: number) => {
    if (typeof value !== "number" || isNaN(value)) return "0.00";
    return value.toLocaleString("id-ID", { minimumFractionDigits: 2 });
};

const handleSupKodeExit = async () => {
    if (!formData.supKode) return;
    try {
        const response = await api.get(
            `${API_SUPPLIER_DETAIL}/${formData.supKode}`,
        );
        const detail = response.data;
        formData.supNama = detail.Nama;
        formData.supAlamat = detail.Alamat;
        formData.supKota = detail.Kota;
    } catch (error) {
        toast.error("Kode Supplier tidak ditemukan.");
        formData.supKode = "";
        formData.supNama = "";
    }
};

const handleNomorExit = () => {
    if (formData.nomor && formData.nomor !== "AUTO" && !isEditMode.value) {
        // Asumsi loaddataall dipicu di sini
        loaddataall(formData.nomor);
    }
};

const handlePpnToggle = () => {
    // ufrmPO.cbbPPNClick
    if (formData.isPpn) {
        formData.ppnRate = user.value.defaultPpn;
    } else {
        formData.ppnRate = 0;
    }
    hitung();
};

const handleJenisPoChange = (jenis: 0 | 1 | 2) => {
    // ufrmPO.rbBahanClick (Logic utama untuk visibility)
    if (!isNewEntry.value && formData.jenisPo !== jenis) return; // Stop jika edit dan mencoba ganti jenis

    formData.jenisPo = jenis;

    // Clear detail/komitmen yang tidak relevan saat berganti jenis
    formData.detail = [createEmptyDetail()];
    formData.commitments = [createEmptyCommitment()];
    formData.rolls = [];
    formData.poGreige = "";
};

const closeForm = () => {
    router.push({ name: "PoBahanMmtBrowse" });
};

const handlePabrikSelect = (pabrik: {
    Kode: string;
    Nama: string;
    Alamat?: string;
    AlamatPabrik?: string;
}) => {
    formData.pabrikKode = pabrik.Kode;
    formData.pabrikNama = pabrik.Nama;
    formData.cabang = pabrik.Nama;
    formData.AlamatPabrik = pabrik.Alamat || pabrik.AlamatPabrik || "";
    isPabrikModalVisible.value = false;
};
const handlePoGreigeExit = async () => {
    // ufrmPO.edtpoGreigeExit logic
    if (formData.jenisPo !== 2 || !formData.poGreige) return;

    try {
        // ASUMSI: Backend API menghandle load detail, cek jenis=1, dan hitung sisa QTY Celup
        const response = await api.get(
            `${API_BASE_URL}/load-greige-for-celup/${formData.poGreige}`,
        );
        const data = response.data;

        // Update header fields dari PO Greige
        formData.supKode = data.Header.KodeSup;
        formData.supNama = data.Header.Nama;
        formData.keterangan = data.Header.Keterangan;

        // Update detail
        formData.detail = data.Detail.map((d: any) => ({
            ...createEmptyDetail(),
            ...d,
            total: calculateTotal(d),
            roll: 0,
        }));

        // Tambah baris kosong di akhir
        formData.detail.push(createEmptyDetail());
        hitung();
    } catch (error) {
        toast.error("Gagal memuat detail PO Greige atau PO tidak valid.");
        formData.poGreige = "";
        formData.detail = [createEmptyDetail()];
    }
};

const handleMppbExit = async () => {
    // ufrmPO.edtmppbExit logic
    if (!formData.mppbNomor) return;

    try {
        // ASUMSI: Backend API menghandle cek approve dan cek sudah di link PO
        const response = await api.get(
            `${API_BASE_URL}/load-mppb/${formData.mppbNomor}`,
        );
        const data = response.data;

        formData.mppbTanggal = format(parseISO(data.Tanggal), "yyyy-MM-dd");
        formData.mppbJumlah = data.Jumlah;
        toast.success(`MPPB ${formData.mppbNomor} dimuat.`);
    } catch (error) {
        toast.error("No. MPPB tidak valid atau belum di-approve.");
        formData.mppbNomor = "";
        formData.mppbTanggal = "";
        formData.mppbJumlah = 0;
    }
};

const handleRollChange = (item: DetailItem) => {
    if (formData.jenisPo !== 2 || !item.kode) return;

    // hapus roll lama milik item ini
    formData.rolls = formData.rolls.filter((r) => r.kode !== item.kode);

    for (let i = 1; i <= (item.roll || 0); i++) {
        formData.rolls.push({
            no: formData.rolls.length + 1,
            kode: item.kode,
            nama: item.namaext || item.nama,
            satuan: item.satuan,
            jumlah: 0,
        });
    }
};

const addDetail = () => {
    const lastItem = formData.detail[formData.detail.length - 1];
    if (lastItem && lastItem.kode) {
        formData.detail.push(createEmptyDetail());
    } else {
        toast.warning("Isi detail baris terakhir sebelum menambah baris baru.");
    }
};

const removeDetail = (index: number) => {
    if (formData.detail.length > 1) {
        formData.detail.splice(index, 1);
    } else {
        // Jika hanya satu baris, clear saja
        Object.assign(formData.detail[0], createEmptyDetail());
    }
};

const addCommitment = () => {
    // cljumlah2PropertiesEditValueChanged logic: Menggunakan data dari detail pertama
    const item = formData.detail.find((d) => d.kode) || createEmptyDetail();

    const newCommitment = createEmptyCommitment();
    newCommitment.kode = item.kode;
    newCommitment.nama = item.nama;

    formData.commitments.push(newCommitment);
};

const fetchAndApplyPermintaan = async (nomorPermintaan: string) => {
    if (!nomorPermintaan) return;

    try {
        const response = await api.get(
            `${API_UNFULFILLED_MB_DETAIL}/${encodeURIComponent(nomorPermintaan)}`,
        );

        const rawData = response.data;
        const resData = Array.isArray(rawData) ? rawData[0] : rawData;
        const details =
            resData?.Detail || resData?.detail || resData?.details || [];

        if (!resData || !details.length) {
            toast.error("Data detail tidak ditemukan.");
            return;
        }

        formData.nomorPermintaan = nomorPermintaan;

        formData.detail = details.map((d: any) => {
            const p = parseFloat(d.Panjang || d.brg_panjang) || 0;
            const l = parseFloat(d.Lebar || d.brg_lebar) || 0;
            const qty = parseFloat(d.Jumlah) || 0;

            const newItem: DetailItem = {
                ...createEmptyDetail(),
                kode: d.Kode || d.brg_kode || "",
                nama: d.Nama_Bahan || d.Nama || d.brg_nama || "",
                namaext: d.Nama_Bahan || d.Nama || d.brg_nama || "",
                satuan: d.Satuan || d.brg_satuan || "",
                satuanHarga: (d.brg_satuan_harga || "roll").toLowerCase(),
                panjang: p,
                lebar: l,
                m2: p * l,
                jumlah: qty,
                spk: d.Nomor_SPK || d.spk || "",
                mb_nomor: nomorPermintaan,
                harga: parseFloat(d.Harga_Master || d.brg_hrgbeli) || 0,
                total: 0,
            };

            newItem.total = calculateTotal(newItem);
            return newItem;
        });

        formData.detail.push(createEmptyDetail());
        hitung();
        toast.success("Data permintaan berhasil ditarik.");
    } catch (error) {
        console.error("Error Load Detail Permintaan:", error);
        toast.error("Gagal memuat detail permintaan.");
    }
};

const handleSelectPermintaan = async (permintaanItem: LookupItem) => {
    const nomorPermintaan = permintaanItem.Nomor;
    if (nomorPermintaan) {
        await fetchAndApplyPermintaan(nomorPermintaan);
    }
    isPermintaanSearchVisible.value = false;
};

const handlePermintaanEnter = async () => {
    if (!formData.nomorPermintaan) return;
    await fetchAndApplyPermintaan(formData.nomorPermintaan.trim());
};

const onValidateSave = () => {
    if (!isFormValid.value) {
        toast.error(
            "Validasi gagal: Pastikan Header, Supplier, Detail, dan Dateline terisi.",
        );
        return;
    }
    if (formData.status !== "OPEN") {
        toast.warning(
            `PO sudah berstatus ${formData.status}. Tidak bisa disimpan.`,
        );
        return;
    }
    showSaveDialog.value = true;
};

const executeSave = async () => {
    showSaveDialog.value = false;
    await handleSave(false);
};

const executeCancel = () => {
    showCancelDialog.value = false;
    refreshData();
    toast.info("Transaksi dibatalkan.");
};

const executeClose = () => {
    showCloseDialog.value = false;
    router.push({ name: "PoBahanMmtBrowse" });
};

const handleCancel = () => {
    showCancelDialog.value = true;
};

const handleClose = () => {
    showCloseDialog.value = true;
};

const handlePrint = () => {
    if (!formData.nomor || formData.nomor === "AUTO") {
        toast.error("Nomor PO belum ada untuk dicetak.");
        return;
    }

    // Arahkan ke rute cetak (Sesuaikan nama route 'PoPrint' dengan konfigurasi router Anda)
    // Biasanya rute ini akan membuka tab baru yang berisi tampilan PDF/Laporan
    const routeData = router.resolve({
        name: "PoBahanMmtPrint",
        params: { nomor: formData.nomor },
    });

    window.open(routeData.href, "_blank");

    // Opsional: Jika PO Celup (jenisPo === 2), tawarkan cetak Roll Detail
    if (formData.jenisPo === 2 && formData.rolls.length > 0) {
        if (confirm("Cetak Detail Roll juga?")) {
            // Contoh rute cetak roll (sesuaikan dengan sistem Anda)
            const rollRoute = router.resolve({
                name: "PoBahanMmtPrint",
                params: { nomor: formData.nomor },
            });
            window.open(rollRoute.href, "_blank");
        }
    }
};

const handleSave = async (isSaveAndNew: boolean) => {
    // 1. Validasi awal
    if (!isFormValid.value) {
        toast.error(
            "Validasi gagal: Pastikan Header, Supplier, Detail, dan Dateline terisi.",
        );
        return;
    }

    if (formData.status !== "OPEN") {
        toast.warning(
            `PO sudah berstatus ${formData.status}. Tidak bisa disimpan.`,
        );
        return;
    }

    try {
        isSaving.value = true;

        // 2. Bersihkan detail (hanya item yang valid)
        const cleanDetail = formData.detail
            .filter((d) => d && d.kode && Number(d.jumlah) > 0)
            .map((d) => {
                const p = Number(d.panjang) || 0;
                const l = Number(d.lebar) || 0;
                const m2Val = Number(d.m2) || (p * l > 0 ? p * l : 0);
                return {
                    kode: d.kode,
                    nama: d.nama,
                    namaext: d.namaext || d.nama,
                    satuan: d.satuan,
                    satuanHarga: d.satuanHarga || "roll",
                    panjang: p,
                    lebar: l,
                    m2: m2Val,
                    roll: Number(d.roll) || 0,
                    jumlah: Number(d.jumlah) || 0,
                    harga: Number(d.harga) || 0,
                    diskon: Number(d.diskon) || 0,
                    total: calculateTotal(d),
                    spk: d.spk || null,
                    mb_nomor: d.mb_nomor || formData.nomorPermintaan || null,
                };
            });

        // 3. Ambil nilai dateline dari commitments array
        const datelineValue =
            formData.commitments.length > 0
                ? formData.commitments[0].tanggal
                : null;

        // 4. Susun Payload
        const payload = {
            tanggal: formData.tanggal,
            supKode: formData.supKode,
            keterangan: formData.note || "",
            isPpn: formData.isPpn,
            ppnRate: formData.ppnRate,
            detail: cleanDetail,
            dateline: datelineValue,
            jenisPo: formData.jenisPo,
            nomorPermintaan: formData.nomorPermintaan || null,
            pabrikKode: formData.pabrikKode || null,
            pabrikNama: formData.pabrikNama || null,
            AlamatPabrik: formData.AlamatPabrik || "",
            commitments: formData.commitments,
            rolls: formData.jenisPo === 2 ? formData.rolls : [],
            nomorToEdit:
                isEditMode.value && formData.nomor !== "AUTO"
                    ? formData.nomor
                    : null, // 👈 FIX: Proteksi String AUTO
        };

        let response;

        // 5. Eksekusi EndPoint Sesuai Mode
        if (isEditMode.value && formData.nomor !== "AUTO") {
            response = await api.put(
                `${API_BASE_URL}/${encodeURIComponent(formData.nomor)}`,
                payload,
            );
        } else {
            response = await api.post(API_BASE_URL, payload);
        }

        const newNomor = response.data.nomor || response.data.Nomor;

        if (!newNomor) {
            throw new Error("Backend tidak mengembalikan nomor PO.");
        }

        toast.success(`Data berhasil disimpan dengan nomor: ${newNomor}`);

        if (confirm(`Akan di Cetak?`)) {
            router.push({
                name: "PoBahanMmtPrint",
                params: { nomor: newNomor },
            });
        }

        if (isSaveAndNew) {
            refreshData();
        } else {
            // PENTING: Paksa mode ke edit setelah insert sukses pertama kali
            isEditMode.value = true;
            await loaddataall(newNomor);
        }
    } catch (error) {
        const err = error as AxiosError;
        console.error("Save Error Detail:", err.response?.data);
        toast.error(
            (err.response?.data as any)?.message ||
                "Gagal menyimpan data. Pastikan semua field terisi.",
        );
    } finally {
        isSaving.value = false;
    }
};

// --- Pastikan properti Pabrik ter-reset di fungsi refreshData ---
const refreshData = () => {
    Object.assign(formData, {
        nomor: "AUTO",
        tanggal: format(new Date(), "yyyy-MM-dd"),
        supKode: "",
        supNama: "",
        supAlamat: "",
        supKota: "",
        jenisPo: 0 as 0,
        nomorPermintaan: "",
        pabrikKode: "", // 👈 Tambahkan reset ini
        pabrikNama: "", // 👈 Tambahkan reset ini
        AlamatPabrik: "", // 👈 Tambahkan reset ini
        poGreige: "",
        mppbNomor: "",
        mppbTanggal: "",
        mppbJumlah: 0,
        keterangan: "",
        note: "",
        isPpn: false,
        ppnRate: user.value.defaultPpn,
        status: "OPEN" as "OPEN",
        pinStatus: "" as "",
        detail: [createEmptyDetail()],
        commitments: [createEmptyCommitment()],
        rolls: [],
    });
    isEditMode.value = false;
    currentDetailIndex.value = null;
};

// --- Lookup Handlers ---

const handleSupplierSelect = async (sup: LookupItem) => {
    // ufrmPO.edtSupKodeExit logic
    if (!sup.Kode) return;
    formData.supKode = sup.Kode;
    formData.supNama = sup.Nama || "";
    formData.supAlamat = sup.Alamat || "";
    formData.supKota = sup.Kota || "";
    isSupplierModalVisible.value = false;
};

const handlePoGreigeSelect = async (po: LookupItem) => {
    if (!po.Nomor) return;
    formData.poGreige = po.Nomor;
    // Panggil handler blur untuk memuat data
    await handlePoGreigeExit();
    isPoGreigeModalVisible.value = false;
};

const handleMppbSelect = async (mppb: LookupItem) => {
    if (!mppb.Nomor) return;
    formData.mppbNomor = mppb.Nomor;
    await handleMppbExit();
    isMppbModalVisible.value = false;
};

const handleMkbSelect = async (mkb: LookupItem) => {
    const index = currentDetailIndex.value;
    if (index === null || !mkb.Nomor) return;

    try {
        const response = await api.get(`${API_BASE_URL}/load-mkb/${mkb.Nomor}`);
        if (response.data.Detail && response.data.Detail.length > 0) {
            formData.detail = response.data.Detail.map((d: any) => ({
                ...createEmptyDetail(),
                ...d,
                total: calculateTotal(d),
            }));
            formData.detail.push(createEmptyDetail());
            hitung();
            toast.success(`Detail dari MKB ${mkb.Nomor} dimuat.`);
        } else {
            toast.warning("MKB tidak memiliki detail bahan yang valid.");
        }
    } catch (error) {
        toast.error("Gagal memuat detail MKB.");
    }
    isMkbModalVisible.value = false;
};
const closeBahanModal = () => {
    // 👈 Handler yang benar
    isBahanModalVisible.value = false;
};

const handleBahanSelect = async (bahan: MasterBahan) => {
    const index = currentDetailIndex.value;

    // 1. Validasi Kritis
    if (index === null || !bahan.Kode || formData.detail.length === 0) {
        toast.error("Gagal memproses data bahan: Baris tidak ditemukan.");
        closeBahanModal();
        return;
    }

    // 2. Akses elemen array
    const currentItem = formData.detail[index];
    let targetIndex = index;

    // Jika baris yang diklik sudah ada isinya (kode berbeda), tambah baris baru
    if (currentItem.kode && currentItem.kode !== bahan.Kode) {
        addDetail();
        targetIndex = formData.detail.length - 1;
    }

    const targetItem = formData.detail[targetIndex];
    if (!targetItem) return;

    // 3. Isi Data Form (Sinkronisasi property agar Nama tampil & Perhitungan M2 jalan)
    targetItem.kode = bahan.Kode;
    targetItem.nama = bahan.Nama || "";

    // FIX NAMA: Isi namaext karena template menggunakan v-model="item.namaext"
    targetItem.namaext =
        formData.jenisPo === 1
            ? `GREIGE ${bahan.Nama || ""}`
            : bahan.Nama || "";

    targetItem.satuan = bahan.Satuan || "";

    // FIX PERHITUNGAN: Ambil mode harga dari database (M2 atau ROLL)
    // Ini yang menentukan apakah nanti dikali Luas (P*L) atau cuma kali Qty
    targetItem.satuanHarga = (bahan.brg_satuan_harga as string) || "roll";

    // Dimensi untuk perhitungan M2
    targetItem.panjang = Number(bahan.Panjang) || 0;
    targetItem.lebar = Number(bahan.Lebar) || 0;
    targetItem.m2 = targetItem.panjang * targetItem.lebar; // Luas per roll

    // Info tambahan
    targetItem.gramasi = (bahan as any).Gramasi || "";
    targetItem.seting = (bahan as any).Setting || "";

    // Harga & Qty
    targetItem.harga = (bahan as any).Harga || (bahan as any).HrgBeli || 0;
    targetItem.jumlah = 1; // Default 1 roll
    targetItem.diskon = 0;

    // 4. Hitung Total (Fungsi ini sekarang akan otomatis cek targetItem.satuanHarga)
    targetItem.total = calculateTotal(targetItem);

    // 5. Cleanup baris terakhir
    if (targetIndex === formData.detail.length - 1 && targetItem.kode) {
        addDetail();
    }

    currentDetailIndex.value = targetIndex;
    toast.success(`Bahan ${bahan.Nama} berhasil ditambahkan.`);
    closeBahanModal();
};

const handleSPKSelect = (spk: any) => {
    // ufrmPO.cxGrdMainEditKeyDown (VK_F1, AItem=clspk) logic
    const i = currentDetailIndex.value;
    const nomorSpk = spk?.SPK || spk?.Spk || spk?.Nomor || "";
    if (i !== null && formData.detail[i]) {
        formData.detail[i].spk = nomorSpk;
    }
    isSPKModalVisible.value = false;
};

// --- Opening Modals ---
const openSupplierSearch = () => {
    isSupplierModalVisible.value = true;
};
const openPoGreigeSearch = () => {
    isPoGreigeModalVisible.value = true;
};
const openMppbSearch = () => {
    isMppbModalVisible.value = true;
};
const openMkbSearch = (index: number) => {
    currentDetailIndex.value = index;
    isMkbModalVisible.value = true;
};
const openBahanSearch = (index: number) => {
    // Logic: Cek apakah PO Celup dan Greige kosong
    if (formData.jenisPo === 2 && !formData.poGreige) {
        toast.warning(
            "Anda membuat PO Celup. Harap isi No. PO Greige terlebih dahulu.",
        );
        return;
    }
    currentDetailIndex.value = index;
    isBahanModalVisible.value = true; // 👈 Panggil state yang benar
};
const openSPKSearch = (index: number) => {
    currentDetailIndex.value = index;
    isSPKModalVisible.value = true;
};

const loaddataall = async (nomor: string) => {
    if (!nomor) return;

    try {
        isLoading.value = true;
        const response = await api.get(
            `${API_BASE_URL}/${encodeURIComponent(nomor)}`,
        );
        const data = response.data;

        const safeDate = (v: any) => {
            if (!v) return "";
            const d = parseISO(v);
            return isValid(d) ? format(d, "yyyy-MM-dd") : "";
        };

        // --- Header Data ---
        formData.nomor = data.Nomor;
        formData.tanggal = safeDate(data.Tanggal);
        formData.supKode = data.KodeSup;
        formData.supNama = data.SupNama;
        formData.supAlamat = data.SupAlamat;
        formData.supKota = data.SupKota;

        formData.jenisPo = data.JenisPo;
        formData.poGreige = data.PoGreige || "";

        // FIX NOMOR PERMINTAAN: Ambil dari key baru hasil mapping backend
        formData.nomorPermintaan = data.NomorPermintaan || "";

        formData.mppbNomor = data.MppbNomor || "";
        formData.mppbTanggal = safeDate(data.MppbTanggal);
        formData.mppbJumlah = data.MppbJumlah || 0;

        // FIX PABRIK & ALAMAT KIRIM: Sinkronisasi field alamat tujuan pabrik
        formData.AlamatPabrik = data.AlamatPabrik || "";
        formData.pabrikNama = data.AlamatPabrik ? "Lokasi Terdaftar" : "";

        formData.note = data.Note || data.Keterangan || ""; // Sesuaikan mapping note
        formData.keterangan = data.Keterangan || "";

        formData.isPpn = data.IsPpn === 1 || data.isPpn === true;
        formData.ppnRate = data.PpnRate || user.value.defaultPpn;

        formData.status = data.Status;
        formData.poAcc = data.po_acc || data.PoAcc || "N";

        // --- DETAIL ITEM ---
        formData.detail = (data.Detail || []).map((d: any) => {
            const p = Number(d.panjang || d.Panjang || 0);
            const l = Number(d.lebar || d.Lebar || 0);

            const m2Calculated = p * l;
            const m2Value = Number(d.m2 || d.M2) || m2Calculated;

            let sHrg = (d.satuanHarga || d.brg_satuan_harga || d.sat_hrg || "")
                .toLowerCase()
                .trim();
            if (!sHrg && m2Value > 0) {
                sHrg = "m2";
            }

            const item: DetailItem = {
                ...createEmptyDetail(),
                ...d,
                satuanHarga: sHrg || "roll",
                panjang: p,
                lebar: l,
                m2: m2Value,
                jumlah: Number(d.jumlah || d.Jumlah || 0),
                harga: Number(d.harga || d.Harga || 0),
                diskon: Number(d.diskon || d.Diskon || 0),
            };

            item.total = calculateTotal(item);
            return item;
        });

        // Tambahkan baris kosong di akhir untuk input baru
        formData.detail.push(createEmptyDetail());

        // --- COMMITMENT & ROLL ---
        formData.commitments = [
            {
                no: 1,
                tanggal: safeDate(
                    data.Dateline || data.po_dateline || data.po_tglkirim,
                ),
                jumlah: 0,
            },
        ];
        formData.rolls = data.Rolls || [];

        isEditMode.value = true;

        // RE-CALCULATE ALL
        hitung();
    } catch (err) {
        console.error("Load Data Error:", err);
        toast.error("Gagal memuat data PO.");
        router.push({ name: "PoBahanMmtBrowse" });
    } finally {
        isLoading.value = false;
    }
};

const handleGlobalKeyDown = (event: KeyboardEvent) => {
    if (event.key === "F10") {
        event.preventDefault();
        if (isFormValid.value && !isSaving.value) {
            onValidateSave();
        }
    } else if (event.key === "F7") {
        event.preventDefault();
        if (!isSaving.value) {
            showCancelDialog.value = true;
        }
    } else if (event.key === "F3") {
        event.preventDefault();
        if (isEditMode.value && !isSaving.value) {
            handlePrint();
        }
    }
};

onMounted(async () => {
    window.addEventListener("keydown", handleGlobalKeyDown);
    if (route.params.nomor) {
        await loaddataall(route.params.nomor as string);
    } else {
        refreshData();
    }
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleGlobalKeyDown);
});

// Watcher untuk re-hitung total ketika ada perubahan di detail
watch(formData.detail, hitung, { deep: true });
</script>

<style scoped>
:deep(.form-grid-container.two-column) {
    --left-col-width: 370px;
    height: calc(100vh - 180px);
}
@media (max-width: 1400px) {
    :deep(.form-grid-container.two-column) {
        --left-col-width: 340px;
    }
}

*,
*::before,
*::after {
    box-sizing: border-box;
}

/* ── Left & Right Scroll Containers ── */
:deep(.left-column) {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 6px;
    padding-bottom: 36px; /* Gap aman agar tidak tertutup footer */
}

:deep(.right-column) {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;
    padding-bottom: 24px;
}

/* Custom Scrollbars */
:deep(.left-column)::-webkit-scrollbar,
:deep(.right-column)::-webkit-scrollbar {
    width: 5px;
}
:deep(.left-column)::-webkit-scrollbar-track,
:deep(.right-column)::-webkit-scrollbar-track {
    background: transparent;
}
:deep(.left-column)::-webkit-scrollbar-thumb,
:deep(.right-column)::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}
:deep(.left-column)::-webkit-scrollbar-thumb:hover,
:deep(.right-column)::-webkit-scrollbar-thumb:hover {
    background: #999;
}

/* ── Section Cards (Manksi Desktop Standard) ── */
.desktop-form-section {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
    font-family: "Segoe UI", system-ui, sans-serif;
    font-size: 11px;
    box-sizing: border-box;
}
.header-section {
    padding-right: 32px; /* Ruang aman untuk tombol collapse panel kiri */
}
.section-label {
    font-size: 11px;
    font-weight: 700;
    color: #1565c0;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 4px;
    margin-bottom: 8px;
}
.sec-divider {
    height: 1px;
    background: #f0f0f0;
    margin: 6px 0 7px;
}

/* ── Form Row ── */
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
    width: 95px;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    color: #444;
}
.lbl-calc {
    font-size: 11px;
    color: #555;
}
.val-calc {
    font-size: 11px;
    color: #222;
}

/* ── Standard Inputs ── */
.inp {
    height: 24px;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 0 6px;
    font-size: 11px;
    background: white;
    outline: none;
    min-width: 0;
    box-sizing: border-box;
}
.inp:focus {
    border-color: #1565c0;
    box-shadow: 0 0 0 1px #1565c033;
}
.inp:disabled {
    background: #f5f5f5;
    color: #999;
    cursor: not-allowed;
}
.idate {
    height: 24px;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 0 4px;
    font-size: 11px;
    background: white;
    outline: none;
    min-width: 0;
    box-sizing: border-box;
}
.idate:focus {
    border-color: #1565c0;
}
.idate:disabled {
    background: #f5f5f5;
    color: #999;
}
.flex-1 {
    flex: 1 1 0;
    min-width: 0;
}
.ro {
    background: #f8f9fa !important;
    color: #495057 !important;
}
.tr {
    text-align: right;
}
.fw {
    font-weight: 600;
}
.cursor-pointer {
    cursor: pointer;
}

/* ── Input Group (Lookup) ── */
.igrp {
    display: flex;
    border: 1px solid #ccc;
    border-radius: 3px;
    height: 24px;
    overflow: hidden;
    min-width: 0;
    box-sizing: border-box;
}
.igrp .inp {
    border: none;
    border-radius: 0;
    flex: 1;
}
.blkp {
    background: #f0f0f0;
    border: none;
    border-left: 1px solid #ccc;
    height: 100%;
    padding: 0 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #555;
    transition: background 0.15s;
}
.blkp:hover {
    background: #e0e0e0;
    color: #1565c0;
}
.blkp:disabled {
    background: #f5f5f5;
    color: #bbb;
    cursor: not-allowed;
}

/* ── Checkbox & Radio ── */
.ck {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    cursor: pointer;
    user-select: none;
}
.ck-disabled {
    opacity: 0.5;
    cursor: default;
}

/* ── Status Badges ── */
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-right: 4px;
}
.badge-wait {
    background: #fff3e0;
    color: #e65100;
    border: 1px solid #ffb74d;
}
.badge-acc {
    background: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #81c784;
}
.badge-closed {
    background: #f3e5f5;
    color: #6a1b9a;
    border: 1px solid #ce93d8;
}

/* ── Grand Total Highlight ── */
.pricing-total-card {
    background: #1565c0;
    color: white;
    border-radius: 5px;
    padding: 6px 12px;
    text-align: right;
}
.pt-sub {
    font-size: 10px;
    font-weight: 600;
    color: #bbdefb;
    letter-spacing: 0.5px;
}
.pt-val {
    font-size: 18px;
    font-weight: 800;
    line-height: 1.2;
}

/* ── Bottom Spacers ── */
.left-bottom-spacer {
    height: 36px;
    flex-shrink: 0;
}

/* ── MMT Desktop Compact Table Grid (gt) ── */
.tbl-wrap {
    overflow: auto;
    border: 1px solid #ccc;
    background: white;
    border-radius: 4px;
}

.gt {
    width: 100%;
    min-width: 1100px;
    border-collapse: collapse;
    font-size: 11px;
}

.gt th {
    background: #f5f5f5;
    border-bottom: 2px solid #ddd;
    border-right: 1px solid #e0e0e0;
    padding: 6px 6px;
    text-align: left;
    font-weight: 700;
    position: sticky;
    top: 0;
    z-index: 2;
    white-space: nowrap;
    color: #333;
}

.gt td {
    border-bottom: 1px solid #eee;
    border-right: 1px solid #f0f0f0;
    padding: 2px 4px;
    height: 26px;
    vertical-align: middle;
}

.ci {
    width: 100%;
    height: 24px;
    border: none;
    outline: none;
    padding: 0 4px;
    font-size: 11px;
    background: transparent;
    box-sizing: border-box;
}

.ci:focus {
    background: #e3f2fd;
}

.cell-igrp {
    display: flex;
    align-items: center;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
}

.cell-btn-lookup {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #1565c0;
    padding: 0 4px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.cell-btn-lookup:hover {
    background: #e3f2fd;
    border-radius: 2px;
}

.bg-qty-edit {
    background-color: #fffde7 !important;
}

.btn-del {
    background: transparent;
    border: none;
    color: #e53935;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
}

.btn-del:hover:not(:disabled) {
    color: #b71c1c;
    background: #ffebee;
    border-radius: 2px;
}

.btn-del:disabled {
    color: #ccc;
    cursor: not-allowed;
}

.tc {
    text-align: center;
}
.tr {
    text-align: right;
}
.fw {
    font-weight: 700;
}
.p0 {
    padding: 0 !important;
}
.ro {
    background: #f8f9fa !important;
    color: #495057 !important;
}
.cursor-pointer {
    cursor: pointer;
}
</style>
