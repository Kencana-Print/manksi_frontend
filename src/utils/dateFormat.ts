/**
 * Format tanggal ke format Indonesia (DD/MM/YYYY).
 * Terima string "YYYY-MM-DD" atau "YYYY-MM-DD HH:mm:ss" (ambil 10
 * karakter pertama). Return "-" kalau kosong/null.
 */
export const formatTanggal = (v: string | null | undefined): string => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};

/**
 * Sama seperti formatTanggal, tapi ikut nampilin jam:menit kalau ada
 * (buat kolom datetime, misal "Tanggal Buat").
 *
 * Mendukung:
 * - YYYY-MM-DD HH:mm:ss
 * - YYYY-MM-DDTHH:mm:ss.sssZ (ISO UTC)
 */
export const formatTanggalJam = (v: string | null | undefined): string => {
  if (!v) return "-";

  const s = String(v);

  // ISO string (2026-07-22T10:06:27.000Z)
  if (s.includes("T")) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");

      return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
    }
  }

  // MySQL DATETIME (2026-07-22 10:06:27)
  const tgl = formatTanggal(s.substring(0, 10));
  if (tgl === "-") return "-";

  if (s.length >= 19) {
    return `${tgl} ${s.substring(11, 19)}`;
  }

  if (s.length >= 16) {
    return `${tgl} ${s.substring(11, 16)}`;
  }

  return tgl;
};

/**
 * Format tanggal panjang ala Excel Delphi (DD-Month-YYYY, contoh
 * "21-July-2026") — dipakai KHUSUS di file export yang replikasi
 * format lama Delphi. JANGAN dipakai buat tampilan biasa.
 */
export const formatTanggalLongExport = (
  v: string | null | undefined,
): string => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (!y || !m || !d) return v;
  return `${d}-${months[Number(m) - 1]}-${y}`;
};
