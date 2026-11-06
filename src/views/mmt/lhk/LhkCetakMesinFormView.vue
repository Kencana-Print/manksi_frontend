<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah' : 'Baru') + ' LHK Mesin Cetak'"
    menu-id="5507"
    :icon="IconPrinter"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- CUSTOM HEADER ACTIONS: Menggantikan slot header-actions bawaan BaseForm -->
    <template #header-actions>
      <!-- Tombol ACC Admin (Hanya tampil jika Mode Edit) -->
      <v-btn
        v-if="isEditMode"
        size="small"
        color="success"
        class="mr-2 text-none font-weight-medium"
        :loading="isSaving"
        @click="handleApprove"
      >
        <template #prepend>
          <IconCheck :size="16" />
        </template>
        ACC Admin
      </v-btn>

      <!-- Tombol Simpan Draft -->
      <v-btn
        size="small"
        color="orange-darken-3"
        variant="tonal"
        class="mr-2 text-none font-weight-medium"
        :loading="isSaving"
        @click="validateBeforeSave('DRAFT')"
      >
        <template #prepend>
          <IconDeviceFloppy :size="16" />
        </template>
        Simpan Draft
      </v-btn>

      <!-- Tombol Simpan Posted -->
      <v-btn
        size="small"
        color="primary"
        variant="elevated"
        class="mr-2 text-none font-weight-bold"
        :loading="isSaving"
        @click="validateBeforeSave('POSTED')"
      >
        <template #prepend>
          <IconSend :size="16" />
        </template>
        Simpan Posted
      </v-btn>

      <!-- Tombol Batal Standar BaseForm -->
      <v-btn
        size="small"
        variant="outlined"
        class="mr-2 text-none"
        @click="showCancelDialog = true"
      >
        Batal
      </v-btn>

      <!-- Tombol Tutup Standar BaseForm -->
      <v-btn
        size="small"
        variant="tonal"
        color="error"
        class="text-none"
        @click="showCloseDialog = true"
      >
        <template #prepend>
          <IconX :size="15" />
        </template>
        Tutup
      </v-btn>
    </template>

    <!-- KOLOM KIRI: Informasi Utama LHK & Material (Standar Desktop Manksi) -->
    <template #left-column>
      <!-- Section 1: Informasi Utama LHK -->
      <div class="desktop-form-section header-section">
        <div class="section-label">Informasi Utama LHK</div>

        <!-- Nomor LHK -->
        <div class="fr">
          <label class="lbl">Nomor LHK</label>
          <input
            :value="formData.nomor"
            readonly
            class="inp ro fw flex-grow-1"
            placeholder="AUTO"
          />
        </div>

        <!-- Tanggal -->
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.tanggal"
            class="idate flex-grow-1"
            required
          />
        </div>

        <!-- Shift & Operator -->
        <div class="fr">
          <label class="lbl">Shift</label>
          <div class="d-flex align-center gap-2 flex-grow-1">
            <input
              type="number"
              v-model.number="formData.shift"
              min="1"
              max="3"
              class="inp tc fw"
              style="width: 45px"
            />
            <span class="text-caption text-grey-darken-1 font-weight-medium">Operator:</span>
            <input
              type="text"
              v-model="formData.operator"
              class="inp flex-grow-1 font-weight-medium"
              placeholder="Nama operator..."
            />
          </div>
        </div>

        <!-- Mesin Cetak (Lookup) -->
        <div class="fr">
          <label class="lbl">Mesin Cetak</label>
          <div class="igrp flex-grow-1">
            <input
              type="text"
              :value="formData.mesin"
              readonly
              class="inp ro fw text-primary cursor-pointer"
              placeholder="Pilih Mesin Cetak..."
              @click="lookup.mesin = true"
            />
            <button
              type="button"
              class="blkp"
              @click="lookup.mesin = true"
              title="Pilih Mesin"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
      </div>

      <!-- Section 2: Informasi Media / Rol Bahan -->
      <div class="desktop-form-section">
        <div class="d-flex align-center justify-space-between mb-2 pb-1 border-bottom">
          <div class="section-label mb-0 pb-0 border-0 text-success">
            Informasi Media / Rol
          </div>
          <!-- Tombol Sync Stok dari LHK Sebelumnya -->
          <v-btn
            v-if="formData.barcode_input"
            size="x-small"
            color="teal-darken-1"
            variant="tonal"
            class="text-none px-2"
            :loading="isSyncingStok"
            @click="handleSyncStokBahan"
            title="Selaraskan sisa bahan dengan LHK sebelumnya"
          >
            <IconRefresh :size="12" class="mr-1" /> Sync Stok
          </v-btn>
        </div>

        <!-- Scan Barcode Roll -->
        <div class="fr">
          <label class="lbl">Barcode Rol</label>
          <div class="igrp flex-grow-1">
            <input
              type="text"
              v-model="formData.barcode_input"
              class="inp font-monospace fw text-primary"
              placeholder="Scan barcode roll lalu ENTER..."
              @keyup.enter="handleBarcodeScan(false)"
            />
            <button
              type="button"
              class="blkp"
              @click="handleBarcodeScan(false)"
              title="Muat Data Barcode Rol"
            >
              <IconBarcode :size="13" />
            </button>
          </div>
        </div>

        <!-- Kode Bahan Terpilih -->
        <div v-if="formData.kode_bahan_aktif" class="fr">
          <label class="lbl">Kode Bahan</label>
          <input
            :value="formData.kode_bahan_aktif"
            readonly
            class="inp ro fw text-secondary flex-grow-1"
          />
        </div>

        <!-- Dimensi Bahan (Panjang x Lebar) -->
        <div class="fr">
          <label class="lbl">Dimensi Bahan</label>
          <div class="d-flex align-center gap-1 flex-grow-1">
            <input
              type="text"
              :value="Number(formData.Panjang_bahan || 0).toFixed(2) + ' m'"
              readonly
              class="inp ro tr fw text-teal flex-1"
              title="Panjang Bahan Awal (Meter)"
            />
            <span class="text-caption text-grey">&times;</span>
            <input
              type="text"
              :value="Number(formData.Lebar_bahan || 0).toFixed(2) + ' m'"
              readonly
              class="inp ro tr fw flex-1"
              title="Lebar Bahan (Meter)"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- KOLOM KANAN: Combine SPK Table & Visual Layout -->
    <template #right-column>
      <div class="d-flex flex-column fill-height">
        <v-card border flat class="d-flex flex-column table-card mb-2">
          <!-- Header Bar Navy Manksi -->
          <div class="py-1 px-2 bg-blue-grey-lighten-5 d-flex flex-column">
            <div class="d-flex align-center w-100 flex-wrap gap-2">
              <span
                class="text-subtitle-2 font-weight-bold text-blue-grey-darken-4 text-no-wrap"
              >
                Daftar Produksi (Combine SPK)
              </span>
              <v-chip size="x-small" color="primary" class="font-weight-bold">
                {{ formData.details.length }} SPK
              </v-chip>
              <v-spacer />
              <div class="d-flex align-center ga-2">
                <v-btn
                  size="x-small"
                  color="success"
                  variant="flat"
                  class="text-none font-weight-medium"
                  style="height: 26px !important;"
                  @click="lookup.spk = true"
                >
                  <template #prepend><IconPlus :size="13" /></template>
                  Tambah SPK
                </v-btn>
                <v-btn
                  size="x-small"
                  color="purple-darken-2"
                  variant="flat"
                  class="text-none font-weight-medium"
                  style="height: 26px !important;"
                  @click="lookup.maklon = true"
                >
                  <template #prepend><IconArrowsExchange :size="13" /></template>
                  Tambah Maklon
                </v-btn>
                <div class="igrp" style="width: 190px;">
                  <IconBarcode :size="14" class="ml-1 text-grey" />
                  <input
                    type="text"
                    v-model="formData.barcode_spk"
                    class="inp font-monospace"
                    placeholder="Scan Barcode SPK..."
                    :disabled="!formData.kode_bahan_aktif"
                    @keyup.enter="handleSpkScan"
                  />
                </div>
              </div>
            </div>
            <!-- mt-n1 menarik baris note agar mendekat ke baris atasnya -->
            <span
              class="text-caption text-orange-darken-3 font-italic mt-n1"
              style="font-size: 11px !important; line-height: 1.1"
            >
              * Mohon padding dan BS di isi valuenya
            </span>
          </div>
          <div class="table-container flex-grow-1">
            <table class="manksi-table">
              <thead>
                <tr>
                  <th width="28">No</th>
                  <th width="95">Nomor SPK</th>
                  <th>Nama Produk</th>
                  <th width="54">P (M)</th>
                  <th width="54">L (M)</th>
                  <th width="95">Orientasi</th>
                  <th width="46">Pad Atas</th>
                  <th width="46">Pad Smp</th>
                  <th width="36">Tile</th>
                  <th width="44">Order</th>
                  <th width="46">Sdh Ctk</th>
                  <th width="46">Kurang</th>
                  <th v-for="n in 7" :key="n" width="48">C{{ n }}</th>
                  <th width="56">Tot Ctk</th>
                  <th width="60">Luas M²</th>
                  <th width="28"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in formData.details" :key="index">
                  <td class="text-center">{{ index + 1 }}</td>
                  <td class="fw-bold text-blue-darken-4 px-2">
                    {{ item.nomor_spk }}
                    <v-chip
                      v-if="isItemMaklon(item)"
                      size="x-small"
                      color="purple-darken-2"
                      variant="tonal"
                      class="ml-1"
                    >
                      MKL
                    </v-chip>
                  </td>
                  <td
                    class="px-2 text-truncate"
                    style="max-width: 120px"
                    :title="item.nama_spk"
                  >
                    {{ item.nama_spk }}
                  </td>
                  <td
                    :class="isItemMaklon(item) ? 'bg-amber-lighten-5 px-1' : 'text-right px-2'"
                  >
                    <input
                      v-if="isItemMaklon(item)"
                      type="number"
                      step="0.01"
                      min="0"
                      v-model.number="item.panjang_spk"
                      class="cell-input tr font-weight-bold"
                      placeholder="0.00"
                      title="Ubah Panjang Maklon (M)"
                      @input="recalculateCombine"
                      @wheel="$event.target.blur()"
                    />
                    <span v-else>
                      {{ Number(item.panjang_spk || 0).toFixed(2) }}
                    </span>
                  </td>
                  <td
                    :class="isItemMaklon(item) ? 'bg-amber-lighten-5 px-1' : 'text-right px-2'"
                  >
                    <input
                      v-if="isItemMaklon(item)"
                      type="number"
                      step="0.01"
                      min="0"
                      v-model.number="item.lebar_spk"
                      class="cell-input tr font-weight-bold"
                      placeholder="0.00"
                      title="Ubah Lebar Maklon (M)"
                      @input="recalculateCombine"
                      @wheel="$event.target.blur()"
                    />
                    <span v-else>
                      {{ Number(item.lebar_spk || 0).toFixed(2) }}
                    </span>
                  </td>
                  <td>
                    <select
                      v-model="item.orientasi"
                      class="cell-input"
                      @change="recalculateCombine"
                    >
                      <option value="lebar">L. SPK (Normal)</option>
                      <option value="panjang">P. SPK (Diputar)</option>
                    </select>
                  </td>
                  <td class="bg-blue-lighten-5">
                    <input
                      type="number"
                      v-model.number="item.padding_atas"
                      class="cell-input tr font-weight-bold"
                      @input="recalculateCombine"
                      @wheel="$event.target.blur()"
                    />
                  </td>
                  <td class="bg-teal-lighten-5">
                    <input
                      type="number"
                      v-model.number="item.padding_samping"
                      class="cell-input tr font-weight-bold"
                      @input="recalculateCombine"
                      @wheel="$event.target.blur()"
                    />
                  </td>
                  <td class="bg-yellow-lighten-5">
                    <input
                      type="number"
                      v-model.number="item.tile"
                      class="cell-input tr font-weight-bold"
                      @input="recalculateCombine"
                    />
                  </td>
                  <td class="text-right px-2 text-grey-darken-1">
                    {{ item.jumlah }}
                  </td>
                  <td
                    class="text-right px-2 text-blue-darken-1 font-weight-bold"
                  >
                    {{ item.sudahcetak }}
                  </td>
                  <td
                    class="text-right px-2 font-weight-bold"
                    :class="
                      Number(item.kurangcetak) < 0
                        ? 'text-red-darken-2'
                        : 'text-grey-darken-2'
                    "
                  >
                    {{ item.kurangcetak }}
                  </td>

                  <td v-for="n in 7" :key="n">
                    <input
                      type="number"
                      v-model.number="item['cetak' + n]"
                      class="cell-input tr font-weight-bold"
                      @input="recalculateCombine"
                      @wheel="$event.target.blur()"
                    />
                  </td>

                  <td
                    class="text-center bg-yellow-lighten-5 font-weight-bold text-primary"
                  >
                    {{ item.totalcetak }}
                  </td>
                  <td
                    class="text-right px-2 font-weight-bold text-teal-darken-2"
                  >
                    {{ Number(item.total_luas || 0).toFixed(2) }}
                  </td>
                  <td class="text-center">
                    <v-btn
                      size="x-small"
                      variant="text"
                      color="error"
                      @click="
                        formData.details.splice(index, 1);
                        recalculateCombine();
                      "
                    >
                      <IconTrash :size="14" />
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- FOOTER SUMMARY & AFAL PANEL (STANDAR MANKSI) -->
          <div class="pa-2 bg-grey-lighten-4 border-t footer-container">
            <div class="d-flex flex-wrap align-center ga-2 mb-2">
              <span class="text-caption font-weight-bold text-teal-darken-3">
                Total M² per SPK:
              </span>
              <span
                v-for="r in luasPerSpk"
                :key="r.spk"
                class="text-caption bg-white px-2 py-0.5 rounded border"
                :title="r.nama"
              >
                <strong>{{ r.spk }}</strong> = {{ r.luas.toFixed(2) }} M²
              </span>
              <v-spacer />
              <span class="text-caption font-weight-black text-teal-darken-2 bg-white px-2 py-0.5 rounded border">
                Total LHK: {{ grandTotalLuas.toFixed(2) }} M²
              </span>
            </div>

            <div class="footer-calc-grid">
              <!-- Box 1: Sisa Panjang (Otomatis & Manual) -->
              <div class="calc-box">
                <div class="calc-title">Sisa Bahan (Panjang)</div>
                <div class="d-flex align-center justify-space-between mt-1">
                  <div>
                    <span class="sub-lbl">Sistem:</span>
                    <span
                      class="calc-val-lg"
                      :class="sisaStokOtomatis < 0 ? 'text-red' : 'text-success'"
                    >
                      {{ sisaStokOtomatis.toFixed(2) }} M
                    </span>
                    <span class="sub-note">Pakai: {{ totalPanjangTerpakai.toFixed(2) }} M</span>
                  </div>
                  <div class="text-end">
                    <span class="sub-lbl text-primary font-weight-bold">Fisik (Manual):</span>
                    <div class="d-flex align-center gap-1 justify-end">
                      <input
                        type="number"
                        step="0.01"
                        v-model.number="formData.sisa_panjang_manual"
                        class="inp tr font-weight-bold"
                        style="width: 75px"
                        placeholder="Manual..."
                      />
                      <span class="text-caption text-grey">M</span>
                    </div>
                    <span class="sub-note text-primary font-weight-semibold">
                      Final: {{ displayPanjangTerpakai.toFixed(2) }} M
                    </span>
                  </div>
                </div>
              </div>

              <!-- Box 2: Sisa Lebar Samping -->
              <div class="calc-box">
                <div class="calc-title">Sisa Lebar (Samping)</div>
                <div class="d-flex align-center justify-space-between mt-1">
                  <div>
                    <span class="sub-lbl">Sistem:</span>
                    <span class="calc-val-lg text-teal-darken-2">
                      {{ (Number(formData.Lebar_bahan || 0) - totalLebarGabungan).toFixed(2) }} M
                    </span>
                  </div>
                  <div class="text-end">
                    <span class="sub-lbl">Manual:</span>
                    <div class="d-flex align-center gap-1 justify-end">
                      <input
                        type="number"
                        step="0.01"
                        v-model.number="formData.sisa_lebar_manual"
                        class="inp tr"
                        style="width: 65px"
                        placeholder="Lebar..."
                      />
                      <span class="text-caption text-grey">M</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Box 3: Afal Sisa Layout Ganjil -->
              <div class="calc-box">
                <div class="calc-title text-orange-darken-4">Afal Sisa Ganjil</div>
                <div class="d-flex align-center justify-space-between mt-1">
                  <div>
                    <span class="sub-lbl">Sistem:</span>
                    <span class="calc-val-md text-orange-darken-3 font-monospace">
                      {{ panjangSisaLayoutGanjil.toFixed(2) }} &times; {{ lebarSisaLayoutGanjil.toFixed(2) }}
                    </span>
                  </div>
                  <div class="text-end">
                    <span class="sub-lbl">Manual (P &times; L):</span>
                    <div class="d-flex align-center gap-1 justify-end">
                      <input
                        type="number"
                        step="0.01"
                        v-model.number="formData.panjang_nyempil_manual"
                        class="inp tr"
                        style="width: 50px"
                        placeholder="P"
                      />
                      <span class="text-caption text-grey">&times;</span>
                      <input
                        type="number"
                        step="0.01"
                        v-model.number="formData.lebar_nyempil_manual"
                        class="inp tr"
                        style="width: 50px"
                        placeholder="L"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Box 4: BS / Rusak -->
              <div class="calc-box box-bs">
                <div class="calc-title text-red">BS / Rusak</div>
                <div class="d-flex align-center gap-2 mt-1">
                  <div class="flex-1">
                    <span class="sub-lbl">P. BS:</span>
                    <input
                      type="text"
                      :value="formData.panjang_bs"
                      class="inp tr w-100 font-weight-bold text-red"
                      placeholder="P. BS"
                      @input="handleBsInput"
                    />
                  </div>
                  <div class="flex-1">
                    <span class="sub-lbl">L. BS:</span>
                    <input
                      type="text"
                      :value="formData.lebar_bs"
                      class="inp tr w-100 font-weight-bold text-red"
                      placeholder="L. BS"
                      @input="handleBsLebarInput"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-card>

        <!-- VISUALISASI LAYOUT ESTAMASI -->
        <v-card flat border class="flex-grow-1 visual-layout-card">
          <v-card-title
            class="text-subtitle-2 bg-grey-lighten-3 pa-2 d-flex align-center"
          >
            Visualisasi Layout Produksi Cetak (Meter Base)
            <v-spacer />
            <v-btn
              size="x-small"
              color="indigo"
              class="mr-2"
              @click="autoFillLayout(false)"
            >
              <template #prepend><IconSparkles :size="12" /></template> Auto
              Optimize
            </v-btn>
            <v-btn
              size="x-small"
              color="grey-darken-1"
              variant="outlined"
              @click="resetManualLayout"
            >
              <template #prepend><IconRefresh :size="12" /></template> Reset
            </v-btn>
          </v-card-title>
          <v-card-text class="pa-2 scroll-wrapper">
            <div class="roll-horizontal-wrapper">
              <div class="roll-material" :style="rollStyle">
                <div
                  v-for="(block, bIdx) in layoutRows"
                  :key="bIdx"
                  class="product-unit"
                  :style="{
                    width: `${block.w * SCALE}px`,
                    height: `${block.h * SCALE}px`,
                    position: 'absolute',
                    left: `${(manualOffsets[bIdx]?.x !== undefined ? manualOffsets[bIdx].x : block.x) * SCALE}px`,
                    top: `${(manualOffsets[bIdx]?.y !== undefined ? manualOffsets[bIdx].y : block.y) * SCALE}px`,
                    transform: `rotate(${manualOffsets[bIdx]?.rotation ?? 0}deg)`,
                    backgroundColor: '#e3f2fd',
                    border: '1px solid #2196f3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'move',
                    zIndex: 10,
                  }"
                  @mousedown="startDrag($event, bIdx)"
                  @dblclick="handleDoubleClick(bIdx)"
                >
                  <span
                    class="box-label"
                    :class="{ 'label-rotated': block.rotated }"
                  >
                    {{ block.label }}
                  </span>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </template>
  </BaseForm>

  <!-- MODAL LOOKUP -->
  <MesinLookupView
    :is-visible="lookup.mesin"
    @close="lookup.mesin = false"
    @select="handleMesinSelect"
  />
  <SpkLookupView
    :is-visible="lookup.spk"
    @close="lookup.spk = false"
    @select="injectSpkObject"
  />
  <MaklonLookupView
    :is-visible="lookup.maklon"
    @close="lookup.maklon = false"
    @select="injectMaklonObject"
  />

  <!-- MODAL BARCODE SISA SAMPING (AFAL BARU) — bisa langsung Cetak & Download -->
  <v-dialog
    v-model="afalModal.show"
    max-width="650px"
    persistent
    teleport="body"
    style="z-index: 99999 !important"
  >
    <v-card>
      <v-card-title
        class="bg-blue-darken-1 text-white d-flex align-center pa-3"
      >
        <v-icon start>mdi-information-variant-box</v-icon>
        <span class="font-weight-bold">Barcode Sisa Samping (AFAL)!</span>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="closeAfalModal"
        />
      </v-card-title>

      <v-card-text class="pa-4">
        <p class="mb-3 text-body-2 text-grey-darken-1">
          Sistem mendeteksi sisa bahan samping yang masih layak pakai. Stok afal
          baru telah dibuat — silakan cetak/download labelnya:
        </p>

        <v-table class="bg-white border rounded mb-4" density="compact">
          <tbody>
            <tr>
              <td
                class="font-weight-bold bg-blue-lighten-5 text-blue-darken-3"
                width="38%"
              >
                Barcode Baru
              </td>
              <td class="text-blue-darken-2 font-weight-black text-subtitle-1">
                {{ afalModal.data.barcode }}
              </td>
            </tr>
            <tr>
              <td class="font-weight-bold bg-blue-lighten-5 text-blue-darken-3">
                Ukuran (P x L)
              </td>
              <td>
                {{ afalModal.data.panjang?.toFixed(2) }} M x
                {{ afalModal.data.lebar?.toFixed(2) }} M
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- Preview Label Afal — mirip Create Barcode -->
        <div
          class="d-flex flex-column align-center bg-grey-lighten-4 pa-4 rounded border"
        >
          <div class="label-box-preview bg-white">
            <div class="border-inner">
              <div class="top-row-preview">
                <img
                  v-if="afalModal.qrImage"
                  :src="afalModal.qrImage"
                  class="qr-img-preview"
                />
                <div
                  v-else
                  class="qr-img-preview d-flex align-center justify-center bg-grey-lighten-3"
                  style="font-size: 10px"
                >
                  QR
                </div>
                <div class="info-column">
                  <div class="qr-text">{{ afalModal.data.barcode }}</div>
                  <div class="dimens-text">
                    Dimensi: {{ afalModal.data.panjang?.toFixed(2) }} x
                    {{ afalModal.data.lebar?.toFixed(2) }} M
                  </div>
                  <div class="text-caption text-grey">AFAL — Sisa Samping</div>
                </div>
              </div>
              <div class="divider-preview"></div>
              <div class="product-name-preview">{{ afalLabelName() }}</div>
            </div>
          </div>
          <div v-if="!afalModal.qrImage" class="text-caption text-orange mt-2">
            QR gagal dimuat, tetap bisa cetak/download (<a
              href="#"
              @click.prevent="generateAfalQR"
              >coba lagi</a
            >).
          </div>
          <div class="d-flex ga-2 mt-3">
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-printer"
              :loading="isPrintingLabel"
              @click="printAfalLabel"
              >Cetak Label</v-btn
            >
            <v-btn
              color="teal"
              variant="tonal"
              prepend-icon="mdi-download"
              :loading="isExportingLabel"
              @click="handleDownloadJpg"
              >Download JPG</v-btn
            >
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="bg-grey-lighten-4 pa-2 justify-space-between">
        <span class="text-caption text-grey"
          >Label akan dicetak 2× seperti di Create Barcode</span
        >
        <v-btn color="blue-darken-2" variant="text" @click="closeAfalModal"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from "vue";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import BaseForm from "@/components/BaseForm.vue";
import MesinLookupView from "@/modal/MesinLookupModal.vue";
import SpkLookupView from "@/modal/SpkMesinLookupModal.vue";
import MaklonLookupView from "@/modal/MaklonLookupModal.vue";
import { useAuthStore } from "@/stores/authStore";
import {
  IconSearch,
  IconTrash,
  IconBarcode,
  IconRefresh,
  IconSparkles,
  IconCheck,
  IconDeviceFloppy,
  IconSend,
  IconPlus,
  IconArrowsExchange,
  IconPrinter,
  IconX,
} from "@tabler/icons-vue";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const SCALE = 60; // 1m = 60px

// 1. Initial Data State
const initialData = {
  nomor: "AUTO",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  shift: 1,
  operator: "",
  mesin: "",
  barcode_input: "",
  barcode_spk: "",
  kode_bahan_aktif: "",
  sku_aktif: "",
  Panjang_bahan: 0,
  Lebar_bahan: 0,
  sisa_panjang_manual: null as number | null,
  sisa_lebar_manual: null as number | null,
  panjang_nyempil_manual: null as number | null,
  lebar_nyempil_manual: null as number | null,
  panjang_bs: "" as any,
  lebar_bs: "" as any,
  lstatus: "DRAFT",
  details: [] as any[],
};

// 2. Composable useForm Integrasi
const {
  formData,
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
  fetchData,
} = useForm({
  menuId: "5507",
  onSuccessRoute: "/mmt/lhk/mesin-cetak",
  initialData,
  fetchApi: async () => {
    const nomorLhk = route.params.nomor as string;
    const res = await api.get(`/mmt/lhk-cetak/lookup/${nomorLhk}`);
    const h = res.data.data?.header || res.data.header;
    const details = res.data.data?.details || res.data.details || [];

    const ambilBahanFromDtl =
      details.length > 0
        ? parseFloat(
            details[0].ld_ambilbahan || details[0].AmbilBahanPanjang || 0,
          )
        : 0;

    return {
      nomor: h.Nomor || h.lth_nomor,
      tanggal: h.Tanggal
        ? format(new Date(h.Tanggal), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      shift: h.Shift || h.lth_shift || 1,
      operator: h.Operator || h.lth_operator || "",
      mesin: h.Mesin || h.lth_mesin || "",
      kode_bahan_aktif: h.Kode_bahan || h.lth_brg_kode || "",
      barcode_input: h.lbarcode_roll || h.lth_barcode || "",
      panjang_bs:
        h.PanjangBS !== undefined && h.PanjangBS !== null
          ? h.PanjangBS.toString()
          : h.lth_panjang_bs !== undefined && h.lth_panjang_bs !== null
            ? h.lth_panjang_bs.toString()
            : "",
      lebar_bs:
        h.LebarBS !== undefined && h.LebarBS !== null
          ? h.LebarBS.toString()
          : h.lth_lebar_bs !== undefined && h.lth_lebar_bs !== null
            ? h.lth_lebar_bs.toString()
            : "",

      Panjang_bahan: ambilBahanFromDtl || parseFloat(h.Panjang_Awal || 0),
      Lebar_bahan:
        details.length > 0 ? parseFloat(details[0].AmbilBahanLebar || 0) : 0,

      sisa_panjang_manual: null,
      sisa_lebar_manual: null,
      lstatus: h.lth_status || "DRAFT",

      details: details.map((d: any) => {
        const qtyOrder = parseFloat(d.jumlah || d.spk_qty || d.qty_order || 0);
        const sdhCetak = parseFloat(
          d.sudahcetak || d.spk_sudah_cetak || d.sudah_cetak_sebelumnya || d.total_cetak_sebelumnya || 0,
        );
        const currentTotalInput = parseFloat(d.totalcetak || 0);

        const detailObj: any = {
          nomor_spk: d.spk_nomor || d.ltd_spk_nomor,
          nama_spk: d.nama_spk || d.spk_nama,
          panjang_spk: parseFloat(d.spk_panjang || 0),
          lebar_spk: parseFloat(d.spk_lebar || 0),
          is_maklon:
            d.is_maklon ||
            String(d.spk_nomor || d.ltd_spk_nomor || "")
              .toUpperCase()
              .startsWith("MKL"),
          jumlah: qtyOrder,
          sudahcetak: sdhCetak,
          // Sisa order SEBELUM input LHK ini (order - total cetak LHK sebelumnya)
          kurangcetak_asli: parseFloat(
            d.kurangcetak_asli ?? qtyOrder - sdhCetak,
          ),

          // Ambil padding_atas & padding_samping dari backend (jika kosong/null di set null)
          padding_atas:
            d.padding_atas !== undefined &&
            d.padding_atas !== null &&
            d.padding_atas !== ""
              ? Number(d.padding_atas)
              : null,
          padding_samping:
            d.padding_samping !== undefined &&
            d.padding_samping !== null &&
            d.padding_samping !== ""
              ? Number(d.padding_samping)
              : null,

          tile: d.Tile || 1,
          orientasi: d.Orientasi || "lebar",
          totalcetak: currentTotalInput,
          // Sisa order SETELAH input LHK ini (dipakai live di kolom Kurang)
          kurangcetak: qtyOrder - sdhCetak - currentTotalInput,
        };

        for (let i = 1; i <= 7; i++) {
          detailObj[`cetak${i}`] = parseFloat(
            d[`J_Cetak${i}`] || d[`cetak${i}`] || 0,
          );
        }

        return detailObj;
      }),
    };
  },
  submitApi: async (data: typeof initialData): Promise<unknown> => {
    recalculateCombine();
    updateSisaFromLayout();

    const currentUser = authStore.user?.kode || (authStore.user as any)?.kdUser || "SYSTEM";

    const sisaFinalM =
      formData.value.sisa_panjang_manual !== null &&
      formData.value.sisa_panjang_manual !== ""
        ? parseFloat(Number(formData.value.sisa_panjang_manual).toFixed(2))
        : parseFloat(Number(sisaStokOtomatis.value).toFixed(2));

    const lebarAwal = parseFloat((formData.value.Lebar_bahan as any) || 0);

    const sisaLebarFinal =
      formData.value.sisa_lebar_manual !== null &&
      formData.value.sisa_lebar_manual !== "" &&
      Number(formData.value.sisa_lebar_manual) > 0
        ? parseFloat(Number(formData.value.sisa_lebar_manual).toFixed(2))
        : lebarAwal;

    let finalPanjangAfal = 0;
    let finalLebarAfal = 0;

    const pManual = parseFloat(
      (formData.value.panjang_nyempil_manual as any) || 0,
    );
    const lManual = parseFloat(
      (formData.value.lebar_nyempil_manual as any) || 0,
    );

    if (pManual >= 3 && lManual >= 0.4) {
      finalPanjangAfal = pManual;
      finalLebarAfal = lManual;
    } else {
      const pSistem = panjangSisaLayoutGanjil.value || 0;
      const lSistem = lebarSisaLayoutGanjil.value || 0;

      if (pSistem >= 3 && lSistem >= 0.4) {
        finalPanjangAfal = parseFloat(pSistem.toFixed(2));
        finalLebarAfal = parseFloat(lSistem.toFixed(2));
      }
    }

    const formattedDetails = formData.value.details.map((d) => ({
      nomor_spk: d.nomor_spk,
      panjang_spk: d.panjang_spk,
      lebar_spk: d.lebar_spk,
      is_maklon: d.is_maklon,
      tile: d.tile,
      jumlah: d.jumlah,
      luasm2: d.total_luas,
      padding_atas: d.padding_atas,
      padding_samping: d.padding_samping,
      ld_ambilbahan: parseFloat((formData.value.Panjang_bahan as any) || 0),
      ambilBahanPanjang: parseFloat((formData.value.Panjang_bahan as any) || 0),
      ambilBahanLebar: lebarAwal,
      sisabahan: sisaFinalM,
      sisabahanlebar: sisaLebarFinal,
      cetak1: parseInt(d.cetak1 || 0),
      cetak2: parseInt(d.cetak2 || 0),
      cetak3: parseInt(d.cetak3 || 0),
      cetak4: parseInt(d.cetak4 || 0),
      cetak5: parseInt(d.cetak5 || 0),
      cetak6: parseInt(d.cetak6 || 0),
      cetak7: parseInt(d.cetak7 || 0),
    }));

    const payload = {
      header: {
        ltanggal: formData.value.tanggal,
        lgdg_prod: "GPM",
        lmesin: formData.value.mesin,
        lshift: formData.value.shift,
        loperator: formData.value.operator,
        lbahan: formData.value.kode_bahan_aktif,
        lbarcode_roll: formData.value.barcode_input,
        lstatus: formData.value.lstatus,
        luser_create: currentUser,
        luser_modified: currentUser,
        lpanjang_bs:
          formData.value.panjang_bs !== ""
            ? parseFloat(formData.value.panjang_bs)
            : 0,
        llebar_bs:
          formData.value.lebar_bs !== ""
            ? parseFloat(formData.value.lebar_bs)
            : 0,
        lpanjang_afal: finalPanjangAfal,
        llebar_afal: finalLebarAfal,
        sisa_panjang_manual: formData.value.sisa_panjang_manual,
        sisa_lebar_manual: formData.value.sisa_lebar_manual,
      },
      details: formattedDetails,
      existingNomor: isEditMode.value ? formData.value.nomor : null,
    };

    const res = await api.post("/mmt/lhk-cetak", payload);
    const resBody = res.data;

    const afalInfo = resBody.afalData || resBody.data?.afalData;

    if (formData.value.lstatus === "POSTED" && afalInfo) {
      afalModal.data = {
        barcode: afalInfo.barcode,
        panjang: Number(afalInfo.panjang || 0),
        lebar: Number(afalInfo.lebar || 0),
      };
      afalModal.qrImage = "";
      // generate QR + ambil nama bahan master langsung agar preview siap
      try {
        afalModal.qrImage = await QRCode.toDataURL(afalInfo.barcode, {
          width: 300,
          margin: 0,
          errorCorrectionLevel: "M",
        });
      } catch {}
      await ensureAfalBahanNama();
      await nextTick();
      afalModal.show = true;

      return new Promise((resolve) => {
        const unwatch = watch(
          () => afalModal.show,
          (isOpen) => {
            if (!isOpen) {
              unwatch();
              resolve(res);
            }
          },
        );
      });
    }

    return res;
  },
});

const lookup = reactive({ mesin: false, spk: false, maklon: false });
const manualOffsets = reactive<
  Record<number, { x: number; y: number; rotation: number }>
>({});
const totalPanjangTerpakai = ref(0);
const totalLebarGabungan = ref(0);
const lebarSisaLayoutGanjil = ref(0);
const panjangSisaLayoutGanjil = ref(0);

// Total meter persegi per SPK + total LHK (dihitung live dari baris detail).
const luasPerSpk = computed(() => {
  const map = new Map<string, { spk: string; nama: string; luas: number }>();
  for (const d of formData.value.details || []) {
    const key = String(d.nomor_spk || "-");
    const cur = map.get(key) || { spk: key, nama: d.nama_spk || "", luas: 0 };
    cur.luas += Number(d.total_luas) || 0;
    if (!cur.nama && d.nama_spk) cur.nama = d.nama_spk;
    map.set(key, cur);
  }
  return [...map.values()];
});
const grandTotalLuas = computed(() =>
  luasPerSpk.value.reduce((s, r) => s + r.luas, 0),
);

const sisaStokOtomatis = computed(() => {
  const rawBs = formData.value.panjang_bs;
  const bsPanjang =
    rawBs && !isNaN(parseFloat(rawBs as string))
      ? parseFloat(rawBs as string)
      : 0;
  return formData.value.Panjang_bahan - totalPanjangTerpakai.value - bsPanjang;
});

const displayPanjangTerpakai = computed(() => {
  if (
    formData.value.sisa_panjang_manual !== null &&
    formData.value.sisa_panjang_manual > 0
  ) {
    return formData.value.Panjang_bahan - formData.value.sisa_panjang_manual;
  }
  return totalPanjangTerpakai.value;
});

const handleMesinSelect = (mesin: any) => {
  formData.value.mesin = mesin.Kode || mesin.id || mesin.kode_mesin || "";
  lookup.mesin = false;
  toast.success(`Mesin ${formData.value.mesin} dipilih`);
};

const afalModal = reactive({
  show: false,
  data: {
    barcode: "",
    panjang: 0,
    lebar: 0,
  },
  qrImage: "" as string,
  qrSize: "1.5",
  bahanNama: "" as string,
});

// Nama bahan roll afal dari master (tbarang_mmt via stok-gudang),
// untuk label: "{Nama Master} (BAHAN AFAL)".
const afalLabelName = () =>
  afalModal.bahanNama ? `${afalModal.bahanNama} (BAHAN AFAL)` : "BAHAN AFAL";

const ensureAfalBahanNama = async () => {
  if (afalModal.bahanNama || !afalModal.data.barcode) return;
  try {
    const res = await api.get(
      `/mmt/stok-gudang/${encodeURIComponent(afalModal.data.barcode)}`,
    );
    const info = res.data?.data?.data || res.data?.data;
    const nama =
      info?.Nama_Bahan || info?.Nama_Barang || info?.Nama || info?.nama || "";
    if (nama) afalModal.bahanNama = String(nama).trim();
  } catch {
    /* fallback "BAHAN AFAL" */
  }
};

const closeAfalModal = () => {
  afalModal.show = false;
  router.push("/mmt/lhk/mesin-cetak");
};

const generateAfalQR = async () => {
  if (!afalModal.data.barcode) {
    afalModal.qrImage = "";
    return;
  }
  try {
    afalModal.qrImage = await QRCode.toDataURL(afalModal.data.barcode, {
      width: 300,
      margin: 0,
      errorCorrectionLevel: "M",
    });
  } catch {
    afalModal.qrImage = "";
  }
};

// Status export JPG label (ref sendiri — jangan pakai `loading` generik).
const isExportingLabel = ref(false);

// Status cetak label (ref sendiri agar spinner tak nyangkut).
const isPrintingLabel = ref(false);

const printAfalLabel = async () => {
  if (!afalModal.data.barcode) return;
  isPrintingLabel.value = true;
  try {
    await ensureAfalBahanNama();
    if (!afalModal.qrImage) {
      try {
        afalModal.qrImage = await QRCode.toDataURL(afalModal.data.barcode, {
          width: 300,
          margin: 0,
          errorCorrectionLevel: "M",
        });
      } catch (e) {
        console.error("QR fail", e);
      }
    }
    const qr = afalModal.qrImage || "";
    const printItems = [
      {
        qrValue: afalModal.data.barcode,
        qrImage: qr,
        panjang: afalModal.data.panjang,
        lebar: afalModal.data.lebar,
        namaBahan: afalLabelName(),
      },
      {
        qrValue: afalModal.data.barcode,
        qrImage: qr,
        panjang: afalModal.data.panjang,
        lebar: afalModal.data.lebar,
        namaBahan: afalLabelName(),
      },
    ];
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
    });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    const labelHtml = printItems
      .map(
        (item) => `
    <div class="label-box"><div class="border-inner"><div class="top-row"><img src="${item.qrImage}" class="qr-img" /><div class="info-column"><div class="qr-text">${item.qrValue}</div><div class="dimens-text">${Number(item.panjang).toFixed(2)} x ${Number(item.lebar).toFixed(2)}</div></div></div><div class="divider"></div><div class="product-name">${item.namaBahan}</div></div></div>
  `,
      )
      .join("");
    doc.open();
    doc.write(`<html><head><style>
    @page{size:101.2mm 101mm portrait;margin:0} body{margin:0;padding:0;font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;gap:5px;justify-content:center;min-height:100vh}
    .label-box{width:70mm;height:50mm;padding:3mm;box-sizing:border-box} .label-box:nth-child(2n){page-break-after:always}
    .border-inner{border:1pt solid black;height:100%;width:100%;padding:2mm;display:flex;flex-direction:column;box-sizing:border-box}
    .top-row{display:flex;gap:10px;margin-bottom:4px} .qr-img{width:1.5cm;height:1.5cm} .qr-text{font-weight:bold;font-size:8pt;word-break:break-all} .dimens-text{font-size:11pt;font-weight:bold;margin-top:5px}
    .divider{border-top:1pt solid black;width:100%;margin:4px 0} .product-name{font-size:13pt;font-weight:bold;text-align:center;flex-grow:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
  </style></head><body>${labelHtml}</body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
      isPrintingLabel.value = false;
    }, 500);
    // Pengaman: spinner tidak boleh nyangkut bila print dibatalkan
    setTimeout(() => {
      isPrintingLabel.value = false;
    }, 5000);
  } catch (e) {
    console.error("Print label gagal:", e);
    toast.error("Gagal mencetak label.");
    isPrintingLabel.value = false;
  }
};

const handleDownloadJpg = async () => {
  if (!afalModal.data.barcode) {
    toast.warning("Tidak ada data afal untuk di-download.");
    return;
  }

  isExportingLabel.value = true;
  try {
    await ensureAfalBahanNama();
    // Buat container tersembunyi di DOM untuk merender label yang akan di-capture
    const exportContainer = document.createElement("div");
    exportContainer.style.position = "absolute";
    exportContainer.style.left = "-9999px";
    exportContainer.style.top = "-9999px";
    exportContainer.style.fontFamily = "Arial, sans-serif";
    document.body.appendChild(exportContainer);

    // Sesuaikan ukuran kotak berdasarkan qrSize (mirip form recreate barcode)
    const sizeNum = parseFloat(afalModal.qrSize || "1.5");
    let boxWidth = "70mm";
    let boxHeight = "50mm";
    let fontSizeDimens = "11pt";
    let fontSizeName = "13pt";
    let fontSizeBarcode = "8pt";

    if (sizeNum >= 5) {
      boxWidth = "95mm";
      boxHeight = "75mm";
      fontSizeDimens = "14pt";
      fontSizeName = "16pt";
      fontSizeBarcode = "10pt";
    } else if (sizeNum >= 3) {
      boxWidth = "85mm";
      boxHeight = "60mm";
      fontSizeDimens = "12pt";
      fontSizeName = "14pt";
      fontSizeBarcode = "9pt";
    }

    // Render label ke dalam container tersembunyi
    exportContainer.innerHTML = `
      <div id="capture-label-0" style="width: ${boxWidth}; height: ${boxHeight}; padding: 3mm; box-sizing: border-box; background: white; margin-bottom: 10px;">
        <div style="border: 1pt solid black; height: 100%; width: 100%; padding: 2mm; display: flex; flex-direction: column; box-sizing: border-box;">
          <div style="display: flex; gap: 10px; margin-bottom: 4px; align-items: center;">
            <img src="${afalModal.qrImage}" style="width: ${afalModal.qrSize}cm; height: ${afalModal.qrSize}cm; object-fit: contain;" />
            <div style="display: flex; flex-direction: column; justify-content: center;">
              <div style="font-weight: bold; font-size: ${fontSizeBarcode}; word-break: break-all; font-family: monospace;">${afalModal.data.barcode}</div>
              <div style="font-size: ${fontSizeDimens}; font-weight: bold; margin-top: 5px;">${afalModal.data.panjang?.toFixed(2)} x ${afalModal.data.lebar?.toFixed(2)} M</div>
            </div>
          </div>
          <div style="border-top: 1pt solid black; width: 100%; margin: 4px 0;"></div>
          <div style="font-size: ${fontSizeName}; font-weight: bold; text-align: center; flex-grow: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; text-transform: uppercase;">${afalLabelName()}</div>
        </div>
      </div>
    `;

    // Konversi label ke JPG dan download
    const labelElement = document.getElementById("capture-label-0");
    if (labelElement) {
      const canvas = await html2canvas(labelElement, {
        scale: 3, // Skala tinggi agar hasil gambar tajam / tidak pecah
        useCORS: true,
      });

      const imageURL = canvas.toDataURL("image/jpeg", 0.95);

      // Buat elemen <a> virtual untuk memicu download di browser
      const downloadLink = document.createElement("a");
      downloadLink.href = imageURL;
      downloadLink.download = `${afalModal.data.barcode}.jpg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }

    // Bersihkan container tersembunyi
    document.body.removeChild(exportContainer);
    toast.success("Label berhasil di-download sebagai JPG!");
  } catch (error) {
    console.error("Error Export JPG:", error);
    toast.error("Gagal mengekspor label ke JPG.");
  } finally {
    isExportingLabel.value = false;
  }
};

const validateStokBahan = () => {
  const diambil = Number(formData.value.Panjang_bahan || 0);

  const rawBs = formData.value.panjang_bs;
  const bsPanjang =
    rawBs && !isNaN(parseFloat(rawBs as string))
      ? parseFloat(rawBs as string)
      : 0;
  const otomatis = diambil - totalPanjangTerpakai.value - bsPanjang;

  const sisaFinal =
    formData.value.sisa_panjang_manual !== null &&
    formData.value.sisa_panjang_manual !== ""
      ? Number(formData.value.sisa_panjang_manual)
      : otomatis;

  if (sisaFinal > diambil) {
    toast.error(
      "Validasi Gagal: Bahan sisa tidak boleh lebih banyak daripada bahan yang diambil!",
    );
    return false;
  }

  if (diambil < sisaFinal) {
    toast.error(
      "Validasi Gagal: Bahan yang diambil lebih sedikit dari sisa bahan!",
    );
    return false;
  }

  return true;
};

const recalculateCombine = () => {
  totalPanjangTerpakai.value = 0;
  totalLebarGabungan.value = 0;
  lebarSisaLayoutGanjil.value = 0;
  panjangSisaLayoutGanjil.value = 0;

  if (!formData.value.details.length || Number(formData.value.Lebar_bahan) <= 0)
    return;

  const maxRollHeight = Number(formData.value.Lebar_bahan);
  let currentXOffset = 0;
  let nextXOffset = 0;
  let currentUsedHeight = 0;

  formData.value.details.forEach((d) => {
    let totalCetakInput = 0;
    for (let i = 1; i <= 7; i++) {
      totalCetakInput += parseFloat(d[`cetak${i}`]) || 0;
    }

    if (totalCetakInput > d.kurangcetak_asli) {
      toast.warning(
        `SPK ${d.nomor_spk} (Input: ${totalCetakInput} melebihi sisa order: ${d.kurangcetak_asli})`,
      );
    }

    d.totalcetak = totalCetakInput;
    d.kurangcetak =
      (parseFloat(d.jumlah) || 0) -
      (parseFloat(d.sudahcetak) || 0) -
      totalCetakInput;

    if (totalCetakInput <= 0 || (parseFloat(d.tile) || 0) <= 0) {
      d.luas_satuan = 0;
      d.total_luas = 0;
      return;
    }

    const panjang = parseFloat(d.panjang_spk) || 0;
    const lebar = parseFloat(d.lebar_spk) || 0;
    const tile = parseFloat(d.tile) || 0;

    const padAtasM = ((parseFloat(d.padding_atas) || 0) * 2) / 100;
    const padSampingM = ((parseFloat(d.padding_samping) || 0) * 2) / 100;

    const dimMenyamping =
      d.orientasi === "lebar" ? lebar + padAtasM : panjang + padSampingM;
    const dimMemanjang =
      d.orientasi === "lebar" ? panjang + padSampingM : lebar + padAtasM;

    const luasSatuan = (panjang + padSampingM) * (lebar + padAtasM);
    d.luas_satuan = Number(luasSatuan.toFixed(3));
    d.total_luas = Number((luasSatuan * totalCetakInput).toFixed(2));

    const totalHeightSPK = tile * dimMenyamping;
    const totalWidthSPK = Math.ceil(totalCetakInput / tile) * dimMemanjang;

    if (currentUsedHeight + totalHeightSPK > maxRollHeight + 0.01) {
      currentXOffset = nextXOffset;
      currentUsedHeight = 0;
    }
    currentUsedHeight += totalHeightSPK;
    nextXOffset = Math.max(nextXOffset, currentXOffset + totalWidthSPK);
  });

  totalPanjangTerpakai.value = nextXOffset;
  autoFillLayout(true);
};

const updateSisaFromLayout = () => {
  let maxRight = 0;
  let maxBottom = 0;

  layoutRows.value.forEach((item, idx) => {
    const posX = manualOffsets[idx]?.x ?? item.x;
    const posY = manualOffsets[idx]?.y ?? item.y;
    const edgeRight = posX + item.w;
    const edgeBottom = posY + item.h;

    if (edgeRight > maxRight) maxRight = edgeRight;
    if (edgeBottom > maxBottom) maxBottom = edgeBottom;
  });

  totalPanjangTerpakai.value = maxRight;
  totalLebarGabungan.value = maxBottom;

  const sisaLebar = formData.value.Lebar_bahan - maxBottom;
  if (sisaLebar > 0.1) {
    lebarSisaLayoutGanjil.value = sisaLebar;
    panjangSisaLayoutGanjil.value = maxRight;
  }
};

const autoFillLayout = (isSilent = false) => {
  Object.keys(manualOffsets).forEach((key) => delete manualOffsets[key]);

  if (formData.value.details.length === 0 || formData.value.Lebar_bahan <= 0)
    return;

  const EPS = 1e-6;
  const maxBahanLebar = Number(formData.value.Lebar_bahan);

  // 1) Bangun BLOK per SPK: unit disusun `tile` baris per kolom (seperti pola
  //    asal) supaya tiap SPK tetap satu kesatuan. Urutan unit tetap sama
  //    dengan `layoutRows` agar manualOffsets[bIdx] cocok.
  type Blk = { gi: number[]; bw: number; bh: number; w: number; h: number };
  const blocks: Blk[] = [];
  let gi = 0;

  formData.value.details.forEach((spk) => {
    const totalCetak = Number(spk.totalcetak) || 0;
    if (totalCetak <= 0 || Number(spk.tile) <= 0) return;

    const padAtasM = ((parseFloat(spk.padding_atas) || 0) * 2) / 100;
    const padSampingM = ((parseFloat(spk.padding_samping) || 0) * 2) / 100;

    const w =
      spk.orientasi === "lebar"
        ? Number(spk.panjang_spk || 0) + padSampingM
        : Number(spk.lebar_spk || 0) + padAtasM;
    const h =
      spk.orientasi === "lebar"
        ? Number(spk.lebar_spk || 0) + padAtasM
        : Number(spk.panjang_spk || 0) + padSampingM;

    const n = Math.floor(totalCetak);
    // Batasi jumlah baris agar tinggi blok tidak melebihi lebar bahan.
    const maxRows = Math.max(1, Math.floor((maxBahanLebar + EPS) / (h || 1)));
    const rows = Math.max(
      1,
      Math.min(Math.floor(Number(spk.tile)) || 1, n, maxRows),
    );
    const cols = Math.ceil(n / rows);

    const blk: Blk = { gi: [], bw: cols * w, bh: rows * h, w, h };
    for (let k = 0; k < n; k++) blk.gi.push(gi++);
    blocks.push(blk);
  });

  if (blocks.length === 0) {
    updateSisaFromLayout();
    if (!isSilent) toast.success("Layout diperbarui!");
    return;
  }

  // 2) Shelf packing (First-Fit Decreasing Height).
  //    Untuk target panjang roll `L`, blok ditata ke rak selebar L;
  //    tinggi total = jumlah tinggi rak dan harus <= lebar bahan.
  type Shelf = { height: number; width: number; items: number[] };
  const order = blocks
    .map((_, i) => i)
    .sort((a, b) => blocks[b].bh - blocks[a].bh);

  const packAt = (L: number): { height: number; shelves: Shelf[] } => {
    const shelves: Shelf[] = [];
    for (const bi of order) {
      const b = blocks[bi];
      let target: Shelf | null = null;
      for (const sh of shelves) {
        if (sh.width + b.bw <= L + EPS) {
          target = sh;
          break;
        }
      }
      if (target) {
        target.items.push(bi);
        target.width += b.bw;
        if (b.bh > target.height) target.height = b.bh;
      } else {
        shelves.push({ height: b.bh, width: b.bw, items: [bi] });
      }
    }
    const height = shelves.reduce((s, sh) => s + sh.height, 0);
    return { height, shelves };
  };

  // 3) Cari panjang roll MINIMUM agar semua blok masih muat lebar bahan.
  const totalW = blocks.reduce((s, b) => s + b.bw, 0);
  let lo = Math.max(...blocks.map((b) => b.bw));
  let hi = totalW;
  const base = packAt(hi);
  let shelves = base.shelves;

  if (base.height <= maxBahanLebar + EPS) {
    for (let it = 0; it < 60; it++) {
      const mid = (lo + hi) / 2;
      const res = packAt(mid);
      if (res.height <= maxBahanLebar + EPS) {
        hi = mid;
        shelves = res.shelves;
      } else {
        lo = mid;
      }
    }
  }

  // 3b) Perbaiki penempatan: cari susunan rak dengan PANJANG roll MAKSIMUM
  //     terkecil (paling hemat bahan) memakai backtracking berbatas simpul.
  //     Hasil FFDH dipakai sebagai batas atas sehingga bila pencarian
  //     dihentikan lebih awal, hasilnya tak pernah lebih buruk dari FFDH.
  const nB = order.length;
  const obw = order.map((i) => blocks[i].bw);
  const obh = order.map((i) => blocks[i].bh);
  let bestW = Math.max(...shelves.map((sh) => sh.width));
  let bestAssign: number[][] = shelves.map((sh) => [...sh.items]);

  const curAssign: number[][] = [];
  const curW: number[] = [];
  const curH: number[] = [];
  let curTotalH = 0;
  let nodes = 0;
  let aborted = false;
  const NODE_LIMIT = 120000;

  const dfs = (k: number) => {
    if (aborted) return;
    if (++nodes > NODE_LIMIT) {
      aborted = true;
      return;
    }
    if (k === nB) {
      const mx = Math.max(...curW);
      if (mx < bestW - EPS) {
        bestW = mx;
        bestAssign = curAssign.map((a) => [...a]);
      }
      return;
    }
    const seen = new Set<string>();
    for (let s = 0; s < curW.length; s++) {
      const key = curW[s].toFixed(3) + "|" + curH[s].toFixed(3);
      if (seen.has(key)) continue;
      seen.add(key);
      if (curW[s] + obw[k] >= bestW - EPS) continue;
      const oldH = curH[s];
      const newH = Math.max(oldH, obh[k]);
      curW[s] += obw[k];
      curH[s] = newH;
      curTotalH += newH - oldH;
      curAssign[s].push(order[k]);
      if (curTotalH <= maxBahanLebar + EPS) dfs(k + 1);
      curAssign[s].pop();
      curW[s] -= obw[k];
      curH[s] = oldH;
      curTotalH -= newH - oldH;
    }
    if (obw[k] < bestW - EPS) {
      curAssign.push([order[k]]);
      curW.push(obw[k]);
      curH.push(obh[k]);
      curTotalH += obh[k];
      if (curTotalH <= maxBahanLebar + EPS) dfs(k + 1);
      curAssign.pop();
      curW.pop();
      curH.pop();
      curTotalH -= obh[k];
    }
  };
  dfs(0);

  shelves = bestAssign.map((items) => ({
    items,
    width: items.reduce((s, bi) => s + blocks[bi].bw, 0),
    height: items.reduce((s, bi) => Math.max(s, blocks[bi].bh), 0),
  }));
  // Rak diurutkan dari atas ke bawah menurut tinggi menurun agar rapi.
  shelves.sort((a, b) => b.height - a.height);

  // 4) Tentukan posisi tiap SPK. Dua kandidat dihitung, lalu dipilih yang
  //    menghasilkan panjang roll MAKSIMUM terkecil (paling hemat bahan).
  type Pos = { x: number; y: number };
  const lengthOf = (pos: (Pos | undefined)[]) =>
    Math.max(...blocks.map((b, i) => (pos[i] ? pos[i]!.x + b.bw : 0)), 0);

  // 4a) Kandidat A: hasil shelf packing (blok dianggap persegi penuh).
  const posShelf: Pos[] = new Array(blocks.length);
  {
    let shelfY = 0;
    for (const sh of shelves) {
      let cursorX = 0;
      for (const bi of sh.items) {
        posShelf[bi] = { x: cursorX, y: shelfY };
        cursorX += blocks[bi].bw;
      }
      shelfY += sh.height;
    }
  }
  let bestPos: Pos[] = posShelf;
  let bestLen = lengthOf(posShelf);

  // 4b) Kandidat B: Bottom-Left Fill level-blok dengan pengisian "lubang".
  //     Tiap SPK tetap SATU blok utuh (contiguous). Bila jumlah unit bukan
  //     kelipatan baris, sisa kolom terakhir dibiarkan kosong sehingga blok
  //     lain yang lebih kecil dapat mengisinya → bahan jadi lebih pendek.
  type Sky = { x0: number; x1: number; y: number };
  type St = { sky: Sky[]; maxX: number };
  const skyMax = (sky: Sky[], x: number, w: number) => {
    let y = 0;
    const x2 = x + w;
    for (const s of sky) {
      if (s.x1 <= x + EPS || s.x0 >= x2 - EPS) continue;
      if (s.y > y) y = s.y;
    }
    return y;
  };
  const skySet = (st: St, x0: number, x1: number, ny: number) => {
    const next: Sky[] = [];
    for (const s of st.sky) {
      if (s.x1 <= x0 + EPS || s.x0 >= x1 - EPS) {
        next.push(s);
        continue;
      }
      if (s.x0 < x0 - EPS) next.push({ x0: s.x0, x1: x0, y: s.y });
      if (s.x1 > x1 + EPS) next.push({ x0: x1, x1: s.x1, y: s.y });
    }
    next.push({ x0, x1, y: ny });
    next.sort((a, b) => a.x0 - b.x0);
    const merged: Sky[] = [];
    for (const s of next) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.y - s.y) < EPS && Math.abs(last.x1 - s.x0) < EPS)
        last.x1 = s.x1;
      else merged.push({ ...s });
    }
    st.sky = merged;
    if (x1 > st.maxX) st.maxX = x1;
  };
  const placeBLF = (st: St, bi: number): Pos => {
    const b = blocks[bi];
    const rows = Math.max(1, Math.round(b.bh / (b.h || 1)));
    const cols = Math.max(1, Math.round(b.bw / (b.w || 1)));
    const xs = new Set<number>([0]);
    for (const s of st.sky) xs.add(s.x0);
    let best: { x: number; y: number; score: number } | null = null;
    for (const x of xs) {
      const y = skyMax(st.sky, x, b.bw);
      let ok = true;
      for (let c = 0; c < cols; c++) {
        const cnt = Math.min(rows, b.gi.length - c * rows);
        if (cnt <= 0) break;
        if (y + cnt * b.h > maxBahanLebar + EPS) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const score = y * 1000 + x;
      if (!best || score < best.score - 1e-9) best = { x, y, score };
    }
    if (!best) best = { x: st.maxX, y: 0 };
    for (let c = 0; c < cols; c++) {
      const cnt = Math.min(rows, b.gi.length - c * rows);
      if (cnt <= 0) break;
      skySet(st, best.x + c * b.w, best.x + (c + 1) * b.w, best.y + cnt * b.h);
    }
    return { x: best.x, y: best.y };
  };

  const idxAll = blocks.map((_, i) => i);
  const orders: number[][] = [
    [...idxAll].sort((a, b) => blocks[b].bh - blocks[a].bh),
    [...idxAll].sort((a, b) => blocks[b].bw - blocks[a].bw),
    [...idxAll].sort(
      (a, b) => blocks[b].bw * blocks[b].bh - blocks[a].bw * blocks[a].bh,
    ),
    idxAll,
    [...idxAll].reverse(),
  ];
  for (const ord of orders) {
    const st: St = { sky: [{ x0: 0, x1: 0, y: 0 }], maxX: 0 };
    const pos: Pos[] = new Array(blocks.length);
    for (const bi of ord) pos[bi] = placeBLF(st, bi);
    const len = lengthOf(pos);
    if (len < bestLen - 1e-9) {
      bestLen = len;
      bestPos = pos;
    }
  }

  // 4c) Terapkan posisi terbaik ke tiap unit.
  blocks.forEach((b, bi) => {
    const p = bestPos[bi];
    const rows = Math.max(1, Math.round(b.bh / (b.h || 1)));
    for (let k = 0; k < b.gi.length; k++) {
      const col = Math.floor(k / rows);
      const row = k % rows;
      manualOffsets[b.gi[k]] = {
        x: p.x + col * b.w,
        y: p.y + row * b.h,
        rotation: 0,
      };
    }
  });

  updateSisaFromLayout();
  if (!isSilent) toast.success("Layout diperbarui!");
};

const startDrag = (event: MouseEvent, idx: number) => {
  const item = layoutRows.value[idx];
  const startX = event.clientX;
  const startY = event.clientY;

  const initialX = manualOffsets[idx]?.x ?? item.x;
  const initialY = manualOffsets[idx]?.y ?? item.y;
  const currentRot = manualOffsets[idx]?.rotation ?? 0;

  const onMouseMove = (e: MouseEvent) => {
    const dx = (e.clientX - startX) / SCALE;
    const dy = (e.clientY - startY) / SCALE;

    manualOffsets[idx] = {
      x: initialX + dx,
      y: initialY + dy,
      rotation: currentRot,
    };
    updateSisaFromLayout();
  };

  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const resetManualLayout = () => {
  Object.keys(manualOffsets).forEach((key) => delete manualOffsets[key]);
  recalculateCombine();
};

const handleDoubleClick = (idx: number) => {
  if (!manualOffsets[idx]) {
    manualOffsets[idx] = {
      x: layoutRows.value[idx].x,
      y: layoutRows.value[idx].y,
      rotation: 0,
    };
  }
  manualOffsets[idx].rotation = (manualOffsets[idx].rotation || 0) + 90;
  updateSisaFromLayout();
};

const layoutRows = computed(() => {
  const blocks: any[] = [];
  if (formData.value.details.length === 0 || formData.value.Lebar_bahan <= 0)
    return blocks;

  formData.value.details.forEach((spk, spkIdx) => {
    const totalCetak = spk.totalcetak || 0;
    if (totalCetak <= 0 || spk.tile <= 0) return;

    const padAtasM = ((parseFloat(spk.padding_atas) || 0) * 2) / 100;
    const padSampingM = ((parseFloat(spk.padding_samping) || 0) * 2) / 100;

    const visualW =
      spk.orientasi === "lebar"
        ? spk.panjang_spk + padSampingM
        : spk.lebar_spk + padAtasM;
    const visualH =
      spk.orientasi === "lebar"
        ? spk.lebar_spk + padAtasM
        : spk.panjang_spk + padSampingM;

    for (let i = 0; i < totalCetak; i++) {
      blocks.push({
        label: `SPK ${spkIdx + 1}`,
        w: visualW,
        h: visualH,
        x: 0,
        y: 0,
        rotated: spk.orientasi === "panjang",
      });
    }
  });
  return blocks;
});

const rollStyle = computed(() => ({
  height: `${formData.value.Lebar_bahan * SCALE}px`,
  display: "flex",
  flexDirection: "column" as const,
  backgroundColor: "#ffffff",
  border: "1px solid #333",
  padding: "2px",
  width: "max-content",
  minWidth: `${formData.value.Panjang_bahan * SCALE}px`,
  alignItems: "flex-start",
}));

const handleBsInput = (event: any) => {
  let val = event.target.value;
  if (val.includes(",")) val = val.replace(",", ".");
  formData.value.panjang_bs = val;
  recalculateCombine();
};

const handleBsLebarInput = (event: any) => {
  let val = event.target.value;
  if (val.includes(",")) val = val.replace(",", ".");
  formData.value.lebar_bs = val;
};

const handleBarcodeScan = async (fromLoad = false) => {
  const rawCode = String(formData.value.barcode_input || "");
  if (!rawCode.trim()) return;

  const invalidCharRegex = /[/\s[\]\\{}()<>="'`]/;
  if (invalidCharRegex.test(rawCode)) {
    toast.error(
      "Barcode mengandung karakter aneh / tidak valid (spasi, slash, simbol)!",
    );
    return;
  }

  const code = rawCode.trim();

  // PENTING:
  // Simpan draft LHK sebelum lookup barcode.
  // Lookup barcode hanya boleh mengubah data material, bukan mengganti
  // seluruh formData karena details/SPK/qty/padding bisa hilang.
  const draftDetails = (formData.value.details || []).map((d: any) => ({
    ...d,
  }));

  try {
    const res = await api.get(`/mmt/stok-gudang/${encodeURIComponent(code)}`);
    const responsePayload = res.data;

    if (!responsePayload || !responsePayload.success || !responsePayload.data) {
      toast.error("Barcode tidak terdaftar!");
      return;
    }

    const info = responsePayload.data.data;

    if (!info) {
      toast.error("Detail data material kosong!");
      return;
    }

    const gdgBahan = String(info?.Kode_Gudang || "")
      .trim()
      .toUpperCase();
    if (!fromLoad && gdgBahan !== "GPM") {
      toast.error(
        `⛔ Barang masih di gudang ${info?.Kode_Gudang || gdgBahan || "lain"}! Silahkan masukkan ke gudang produksi (GPM) terlebih dahulu.`,
      );
      return;
    }

    const lhkTerakhir = info.Lhk_Terakhir;

    if (
      isEditMode.value &&
      lhkTerakhir &&
      lhkTerakhir !== formData.value.nomor
    ) {
      toast.warning(
        `⚠️ PERINGATAN REVISI: Roll ini sudah diproses ke LHK Setelahnya (${lhkTerakhir}). Perubahan sisa pada LHK ini akan berdampak pada stok LHK tersebut!`,
        {
          timeout: 10000,
          closeOnClick: true,
          pauseOnHover: true,
        },
      );
    }

    // HANYA update data barcode/material.
    formData.value.barcode_input = code;
    formData.value.sku_aktif = info.Barcode || code;
    formData.value.kode_bahan_aktif = info.Kode || "";
    formData.value.Lebar_bahan = parseFloat(info.Lebar) || 0;

    if (!isEditMode.value || !formData.value.Panjang_bahan) {
      formData.value.Panjang_bahan = parseFloat(info.Sisa_Panjang) || 0;
    }

    // Pengaman: SPK dan qty yang sudah diinput LHK tidak boleh hilang.
    if (draftDetails.length > 0 && formData.value.details.length === 0) {
      formData.value.details = draftDetails.map((d: any) => ({ ...d }));
    }

    recalculateCombine();

    toast.success(
      `Barcode Roll ${code} berhasil dimuat. ${formData.value.details.length} SPK tetap dipertahankan.`,
    );
  } catch (e: any) {
    console.error("Error scan barcode:", e);
    toast.error(e.response?.data?.message || "Gagal scan barcode material");
  }
};

const isSyncingStok = ref(false);

const handleSyncStokBahan = async () => {
  if (!formData.value.barcode_input) {
    return toast.error("Silakan scan barcode roll bahan terlebih dahulu!");
  }

  isSyncingStok.value = true;
  try {
    const res = await api.get(
      `/mmt/stok-gudang/${formData.value.barcode_input}`,
    );
    const resData = res.data?.data?.data;

    if (resData && resData.Sisa_Panjang !== undefined) {
      const stokTerbaru = parseFloat(resData.Sisa_Panjang || 0);
      const stokLama = formData.value.Panjang_bahan;

      if (stokTerbaru === stokLama) {
        toast.info("Stok bahan sudah sinkron dengan LHK sebelumnya.");
        return;
      }

      formData.value.Panjang_bahan = stokTerbaru;
      formData.value.sisa_panjang_manual = null;

      recalculateCombine();

      toast.success(
        `Berhasil diselaraskan! Bahan awal disesuaikan dari ${stokLama} M menjadi ${stokTerbaru} M (Sisa LHK ${resData.Lhk_Terakhir || "Sebelumnya"}).`,
      );
    } else {
      toast.error("Gagal mendapatkan sisa bahan dari LHK sebelumnya.");
    }
  } catch (error) {
    console.error("Error Sync Stok:", error);
    toast.error("Gagal menyelaraskan stok bahan.");
  } finally {
    isSyncingStok.value = false;
  }
};

const handleSpkScan = async () => {
  const code = formData.value.barcode_spk?.trim();
  if (!code) return;

  try {
    if (code.toUpperCase().startsWith("MKL")) {
      const res = await api.get(`/mmt/maklon-barang/lookup`, {
        params: { keyword: code },
      });
      const list = res.data?.data || res.data || [];
      const maklon =
        list.find(
          (m: any) => normalizeSpkNo(m.Nomor) === normalizeSpkNo(code),
        ) || list[0];
      if (maklon) {
        injectMaklonObject(maklon);
        formData.value.barcode_spk = "";
        return;
      }
    }

    const res = await api.get(`/mmt/SPK/${code}`);
    let spkData = res.data?.data?.data || res.data?.data || res.data;
    if (Array.isArray(spkData)) {
      spkData = spkData[0];
    }

    if (spkData) {
      injectSpkObject(spkData, code);
      formData.value.barcode_spk = "";
    } else {
      toast.error("Data SPK / Maklon tidak ditemukan!");
    }
  } catch (e: any) {
    console.error("Error scan SPK/Maklon:", e);
    toast.error(e.response?.data?.message || "Gagal memuat barcode SPK/Maklon");
  }
};

// Normalisasi nomor SPK untuk cek duplikat (trim + case-insensitive),
// sehingga SPK-JA-MT-000269 dianggap sama dengan spk-ja-mt-000269.
const normalizeSpkNo = (v: any) => String(v ?? "").trim().toUpperCase();

// Guard duplikat: satu nomor SPK hanya boleh masuk sekali ke daftar
// Combine SPK — baik dari scan barcode maupun tombol "Tambah SPK".
const isDuplicateSpk = (nomorSpk: any) => {
  const target = normalizeSpkNo(nomorSpk);
  if (!target) return false;
  return formData.value.details.some(
    (d: any) => normalizeSpkNo(d.nomor_spk) === target,
  );
};

const injectSpkObject = (spk: any, fallbackCode: string = "") => {
  if (!spk) return;

  const item = Array.isArray(spk) ? spk[0] : spk.data || spk;

  const nomorSpk =
    item.spk_nomor ||
    item.ltd_spk_nomor ||
    item.SPK ||
    item.Spk ||
    item.spk ||
    item.Nomor ||
    item.Nomor_Spk ||
    item.Nomor_SPK ||
    item.No_SPK ||
    item.no_spk ||
    item.nomor_spk ||
    item.kode_spk ||
    item.spk_code ||
    item.Id ||
    item.id ||
    fallbackCode;

  // Tolak duplikat di titik masuk tunggal ini: berlaku untuk scan barcode
  // maupun pemilihan dari modal "Tambah SPK".
  if (isDuplicateSpk(nomorSpk)) {
    toast.warning(`SPK ${nomorSpk} sudah ada di list.`);
    return;
  }

  const namaSpk =
    item.nama_spk ||
    item.spk_nama ||
    item.Nama ||
    item.Nama_Produk ||
    item.nama_produk ||
    item.nama ||
    "No Name";

  const panjangSpk = parseFloat(
    item.spk_panjang || item.Panjang || item.panjang || 0,
  );
  const lebarSpk = parseFloat(item.spk_lebar || item.Lebar || item.lebar || 0);
  const qtyJumlah = Number(
    item.spk_qty ??
      item.spk_jumlah ??
      item.Jumlah ??
      item.jumlah ??
      item.qty ??
      item.Qty ??
      item.order_qty ??
      0,
  );
  const sudahCetak = parseFloat(
    item.spk_sudah_cetak || item.Sudah_Cetak || item.sudahcetak || 0,
  );
  const kurangCetak = parseFloat(
    item.kurangcetak_asli ??
      item.Kurang_Cetak ??
      item.kurang_cetak ??
      qtyJumlah - sudahCetak,
  );

  const newEntry: any = {
    nomor_spk: nomorSpk,
    nama_spk: namaSpk,
    panjang_spk: panjangSpk,
    lebar_spk: lebarSpk,
    jumlah: qtyJumlah,
    sudahcetak: sudahCetak,
    // Sisa order sebelum LHK ini (order - total cetak LHK sebelumnya)
    kurangcetak_asli: Math.max(0, kurangCetak),

    // Set kosong (null) saat penambahan SPK baru
    padding_atas: null,
    padding_samping: null,

    tile: item.tile || 1,
    orientasi: item.orientasi || "lebar",
    totalcetak: 0,
    kurangcetak: Math.max(0, kurangCetak),
    luas_satuan: 0,
    total_luas: 0,
  };

  for (let i = 1; i <= 7; i++) {
    newEntry[`cetak${i}`] = parseFloat(item[`cetak${i}`] || 0);
  }

  // Tambahkan SPK, jangan replace array details yang sudah ada.
  formData.value.details.push(newEntry);

  // Normalisasi qty/order agar selalu tampil sebagai angka.
  formData.value.details = formData.value.details.map((d: any) => ({
    ...d,
    jumlah: Number(d.jumlah || 0),
    sudahcetak: Number(d.sudahcetak || 0),
    kurangcetak_asli: Number(
      d.kurangcetak_asli ?? Number(d.jumlah || 0) - Number(d.sudahcetak || 0),
    ),
  }));

  recalculateCombine();
};

// Cek apakah item adalah Maklon
const isItemMaklon = (item: any) => {
  return (
    !!item?.is_maklon ||
    String(item?.nomor_spk || "").toUpperCase().startsWith("MKL")
  );
};

// === TAMBAH MAKLON dari lookup ===
// Maklon dari Manksi ditambahkan sebagai baris daftar produksi seperti SPK:
// nomor & nama maklon + progress (Rencana = estimasi barang jadi,
// SudahHasil = hasil DTF maklon). Panjang dan lebar SPK di maklon dapat
// diubah/diisi langsung oleh operator pada tabel daftar produksi.
const injectMaklonObject = (maklon: any) => {
  if (!maklon || !maklon.Nomor) return;

  const nomorMaklon = String(maklon.Nomor).trim();

  // Guard duplikat memakai daftar baris yang sama dengan SPK.
  if (isDuplicateSpk(nomorMaklon)) {
    toast.warning(`Maklon ${nomorMaklon} sudah ada di list.`);
    return;
  }

  const namaMaklon = maklon.Nama || maklon.mkl_keterangan || maklon.Nomor;
  const rencana = Number(maklon.Rencana ?? maklon.jumlah ?? 0);
  const sudahHasil = Number(
    maklon.SudahHasil ?? maklon.sudahcetak ?? maklon.SudahCetak ?? 0,
  );

  const newEntry: any = {
    nomor_spk: nomorMaklon,
    nama_spk: namaMaklon,
    is_maklon: true,
    cab_tujuan: maklon.CabTujuan || "",
    panjang_spk: Number(maklon.Panjang ?? maklon.spk_panjang ?? maklon.panjang_spk ?? 0),
    lebar_spk: Number(maklon.Lebar ?? maklon.spk_lebar ?? maklon.lebar_spk ?? 0),
    jumlah: rencana,
    sudahcetak: sudahHasil,
    kurangcetak_asli: Math.max(0, rencana - sudahHasil),

    padding_atas: 1,
    padding_samping: 1,

    tile: 1,
    orientasi: "lebar",
    totalcetak: 0,
    kurangcetak: Math.max(0, rencana - sudahHasil),
    luas_satuan: 0,
    total_luas: 0,
  };

  for (let i = 1; i <= 7; i++) {
    newEntry[`cetak${i}`] = 0;
  }

  formData.value.details.push(newEntry);

  recalculateCombine();
  toast.success(`Maklon ${nomorMaklon} ditambahkan (Nilai P & L dapat diisi/diubah)`);
};


// Fungsi validasi padding yang dimasukkan ke tombol simpan & ACC
const validatePaddingDetails = () => {
  if (formData.value.details.length === 0) {
    toast.error("Daftar produksi (Combine SPK) masih kosong!");
    return false;
  }

  for (let i = 0; i < formData.value.details.length; i++) {
    const d = formData.value.details[i];
    if (
      d.padding_atas === null ||
      d.padding_atas === undefined ||
      d.padding_atas === "" ||
      d.padding_samping === null ||
      d.padding_samping === undefined ||
      d.padding_samping === ""
    ) {
      toast.error(
        `Mohon padding (Toleransi) di isi sesuai dengan SPK (Baris ke-${i + 1} - SPK: ${d.nomor_spk})`,
      );
      return false;
    }
  }
  return true;
};

const validateBeforeSave = (status: string) => {
  if (!formData.value.mesin) {
    return toast.error("Silakan pilih mesin terlebih dahulu!");
  }

  if (
    formData.value.panjang_bs === null ||
    formData.value.panjang_bs === "" ||
    formData.value.lebar_bs === null ||
    formData.value.lebar_bs === ""
  ) {
    return toast.error(
      "Ukuran BS (Panjang & Lebar) wajib diisi! (Isi 0 jika tidak ada BS).",
    );
  }

  // Validasi Padding
  if (!validatePaddingDetails()) {
    return;
  }

  // Validasi sisa bahan
  if (!validateStokBahan()) {
    return;
  }

  formData.value.lstatus = status;
  showSaveDialog.value = true;
};

const handleApprove = async () => {
  if (!formData.value.nomor || formData.value.nomor === "AUTO") {
    toast.error("Data belum tersimpan. Simpan sebagai Draft terlebih dahulu.");
    return;
  }

  // Validasi Padding
  if (!validatePaddingDetails()) {
    return;
  }

  // Validasi sisa bahan
  if (!validateStokBahan()) {
    return;
  }

  if (
    !confirm(
      `Apakah Anda yakin ingin melakukan ACC pada LHK No: ${formData.value.nomor}?`,
    )
  ) {
    return;
  }

  isSaving.value = true;
  try {
    const currentUser = authStore.user?.kdUser || "SYSTEM";
    const lebarAwal = parseFloat((formData.value.Lebar_bahan as any) || 0);

    const sisaFinalM =
      formData.value.sisa_panjang_manual !== null &&
      formData.value.sisa_panjang_manual !== ""
        ? parseFloat(Number(formData.value.sisa_panjang_manual).toFixed(2))
        : parseFloat(Number(sisaStokOtomatis.value).toFixed(2));

    const sisaLebarFinal =
      formData.value.sisa_lebar_manual !== null &&
      formData.value.sisa_lebar_manual !== "" &&
      Number(formData.value.sisa_lebar_manual) > 0
        ? parseFloat(Number(formData.value.sisa_lebar_manual).toFixed(2))
        : lebarAwal;

    const payload = {
      header: {
        ltanggal: formData.value.tanggal,
        lgdg_prod: "GPM",
        lmesin: formData.value.mesin,
        lshift: formData.value.shift,
        loperator: formData.value.operator,
        lbahan: formData.value.kode_bahan_aktif,
        lbarcode_roll: formData.value.barcode_input,
        lstatus: "APPROVED",
        luser_modified: currentUser,
        lpanjang_bs:
          formData.value.panjang_bs !== ""
            ? parseFloat(formData.value.panjang_bs)
            : 0,
        llebar_bs:
          formData.value.lebar_bs !== ""
            ? parseFloat(formData.value.lebar_bs)
            : 0,
        lpanjang_afal: panjangSisaLayoutGanjil.value || 0,
        llebar_afal: lebarSisaLayoutGanjil.value || 0,
        sisa_panjang_manual: formData.value.sisa_panjang_manual,
        sisa_lebar_manual: formData.value.sisa_lebar_manual,
      },
      details: formData.value.details.map((d) => ({
        nomor_spk: d.nomor_spk,
        tile: d.tile,
        jumlah: d.jumlah,
        luasm2: d.total_luas,
        padding_atas: d.padding_atas,
        padding_samping: d.padding_samping,
        ld_ambilbahan: parseFloat((formData.value.Panjang_bahan as any) || 0),
        ambilBahanPanjang: parseFloat(
          (formData.value.Panjang_bahan as any) || 0,
        ),
        ambilBahanLebar: lebarAwal,
        sisabahan: sisaFinalM,
        sisabahanlebar: sisaLebarFinal,
        cetak1: parseInt(d.cetak1 || 0),
        cetak2: parseInt(d.cetak2 || 0),
        cetak3: parseInt(d.cetak3 || 0),
        cetak4: parseInt(d.cetak4 || 0),
        cetak5: parseInt(d.cetak5 || 0),
        cetak6: parseInt(d.cetak6 || 0),
        cetak7: parseInt(d.cetak7 || 0),
      })),
      existingNomor: formData.value.nomor,
    };

    const response = await api.post("/mmt/lhk-cetak", payload);
    if (response.data.success) {
      toast.success("LHK Berhasil di-ACC.");
      router.push("/mmt/lhk/mesin-cetak");
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal memproses ACC.");
  } finally {
    isSaving.value = false;
  }
};

onMounted(async () => {
  if (isEditMode.value) {
    await fetchData();
    try {
      if (formData.value.barcode_input) await handleBarcodeScan(true);
    } catch {
      /* abaikan — kalkulasi di bawah tetap jalan */
    }
    // Wajib jalan apa pun hasil lookup barcode di atas (roll lama bisa
    // sudah tidak di GPM lagi), agar baris & total M² tampil.
    recalculateCombine();
  }
});
</script>

<style scoped>
.manksi-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.manksi-table th {
  background: #1565c0;
  color: white;
  padding: 3px 4px;
  position: sticky;
  top: 0;
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);
  line-height: 1.25;
}
.manksi-table td {
  border: 1px solid #e0e0e0;
  padding: 0 3px;
  height: 24px;
  line-height: 1.3;
}
.cell-input {
  width: 100%;
  height: 100%;
  min-height: 22px;
  border: none;
  padding: 0 3px;
  outline: none;
  background: transparent;
  font-size: 11px;
  box-sizing: border-box;
  min-width: 40px;
  font-variant-numeric: tabular-nums;
}
/* Hilangkan spinner input number agar 2 digit tidak terpotong */
.cell-input::-webkit-outer-spin-button,
.cell-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.cell-input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
.cell-input:focus {
  background: #e3f2fd;
}
.table-card {
  height: 360px;
  min-height: 360px;
  flex: 0 0 360px;
  overflow: hidden;
}

.table-container {
  overflow: auto;
  min-height: 100px;
  min-width: 0;
  max-height: none;
  flex: 1 1 auto;
}
.tr {
  text-align: right;
}
.fw-bold {
  font-weight: bold;
}
.footer-container {
  border-top: 2px solid #bbb !important;
}
.visual-layout-card {
  min-height: 0;
  flex: 0 0 auto;
  overflow: visible;
}

.scroll-wrapper {
  overflow-x: auto;
  overflow-y: visible;
  background-color: #f8f9fa;
  min-height: 140px;
  max-height: none;
  border: 1px inset #ddd;
}
.product-unit {
  user-select: none;
  touch-action: none;
  transform-origin: center center;
}
.box-label {
  font-size: 9px;
  font-weight: bold;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  padding: 2px;
}
.label-rotated {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}
.roll-material {
  height: v-bind('formData.Lebar_bahan * SCALE + "px"');
  position: relative;
  background-color: white;
  width: max-content;
  min-width: v-bind('formData.Panjang_bahan * SCALE + "px"');
  border: 1px solid #333;
  background-image:
    linear-gradient(90deg, #f0f0f0 1px, transparent 1px),
    linear-gradient(#f0f0f0 1px, transparent 1px);
  background-size: 10px 10px;
}
/* Preview Afal — mirip CreateBarcode */
.label-box-preview {
  width: 7cm;
  height: 5cm;
  padding: 2mm;
  box-sizing: border-box;
  border: 1px solid #ddd;
}
.border-inner {
  border: 1px solid black;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 2mm;
}
.top-row-preview {
  display: flex;
  gap: 10px;
}
.qr-img-preview {
  width: 1.5cm;
  height: 1.5cm;
}
.qr-text {
  font-weight: bold;
  font-size: 8pt;
  word-break: break-all;
}
.dimens-text {
  font-size: 9pt;
  font-weight: bold;
  margin-top: 5px;
}
.divider-preview {
  border-top: 1px dashed #000;
  margin: 2mm 0;
}
.product-name-preview {
  font-size: 11pt;
  font-weight: bold;
  text-align: center;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
}

/* ── Form Section Standar Manksi ── */
.desktop-form-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.header-section {
  padding-right: 32px;
}
.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 4px;
  letter-spacing: 0.3px;
}
.fr {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  min-height: 26px;
}
.lbl {
  width: 95px;
  flex-shrink: 0;
  font-weight: 600;
  color: #444;
  font-size: 11px;
}
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
.inp:focus,
.idate:focus {
  border-color: #1976d2;
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
.ro {
  background: #f5f5f5 !important;
  color: #555 !important;
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
.cursor-pointer {
  cursor: pointer;
}
.flex-1 {
  flex: 1;
}

/* ── Input Group Lookup ── */
.igrp {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: white;
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
}
.blkp:hover {
  background: #e0e0e0;
  color: #1565c0;
}

/* ── Footer Calculation Grid ── */
.footer-calc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
@media (max-width: 1200px) {
  .footer-calc-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .footer-calc-grid {
    grid-template-columns: 1fr;
  }
}

.calc-box {
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
}
.box-bs {
  border-color: #fca5a5;
  background: #fef2f2;
}

.calc-title {
  font-size: 10px;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 3px;
}

.sub-lbl {
  font-size: 9.5px;
  color: #64748b;
  display: block;
}

.calc-val-lg {
  font-size: 14px;
  font-weight: 800;
  display: block;
  line-height: 1.1;
}

.calc-val-md {
  font-size: 12px;
  font-weight: 800;
  display: block;
  line-height: 1.1;
}

.sub-note {
  font-size: 9px;
  color: #64748b;
  display: block;
  margin-top: 1px;
}
</style>
