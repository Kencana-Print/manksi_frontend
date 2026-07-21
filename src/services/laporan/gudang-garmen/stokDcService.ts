import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/stok-dc";

// Placeholder untuk size kosong (komponen POTONG tanpa breakdown size)
// biar gak bikin URL punya trailing slash kosong yang salah di-parse Express.
const SIZE_EMPTY_PLACEHOLDER = "-";

export const stokDcService = {
  getBrowse: (startDate: string, endDate: string, tampilkanKosong = false) =>
    api.get(BASE, { params: { startDate, endDate, tampilkanKosong } }),

  getDetail: (
    spk: string,
    kode: string,
    size: string,
    startDate: string,
    endDate: string,
  ) =>
    api.get(
      `${BASE}/${encodeURIComponent(spk)}/${encodeURIComponent(kode)}/${encodeURIComponent(
        size || SIZE_EMPTY_PLACEHOLDER,
      )}`,
      { params: { startDate, endDate } },
    ),

  getAllDetail: (startDate: string, endDate: string, tampilkanKosong = false) =>
    api.get(`${BASE}/all-detail`, {
      params: { startDate, endDate, tampilkanKosong },
    }),
};
