/**
 * Format tanggal ke format Indonesia (DD/MM/YYYY).
 * Terima string "YYYY-MM-DD" atau "YYYY-MM-DD HH:mm:ss" (ambil 10
 * karakter pertama). Return "-" kalau kosong/null.
 */
export const formatTanggal = (v: string | null | undefined): string => {
  if (!v) return "-";

  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return "-";

  // sudah dd/MM/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    return s;
  }

  // sudah dd-MM-yyyy
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    return s.replace(/-/g, "/");
  }

  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }

  // dd-Month-yyyy / dd Month yyyy (e.g. 02-November-2026, 02-Nov-2026, 2-May-2024)
  const monthMap: Record<string, string> = {
    jan: "01", january: "01", januari: "01",
    feb: "02", february: "02", februari: "02",
    mar: "03", march: "03", maret: "03",
    apr: "04", april: "04",
    may: "05", mei: "05",
    jun: "06", june: "06", juni: "06",
    jul: "07", july: "07", juli: "07",
    aug: "08", august: "08", agustus: "08", agu: "08",
    sep: "09", september: "09",
    oct: "10", october: "10", oktober: "10", okt: "10",
    nov: "11", november: "11",
    dec: "12", december: "12", desember: "12", des: "12",
  };
  const textMonthMatch = s.match(/^(\d{1,2})[- /]([A-Za-z]+)[- /](\d{4})/);
  if (textMonthMatch) {
    const d = textMonthMatch[1].padStart(2, "0");
    const m = monthMap[textMonthMatch[2].toLowerCase()];
    const y = textMonthMatch[3];
    if (m) return `${d}/${m}/${y}`;
  }

  // ISO
  if (s.includes("T")) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1,
      ).padStart(2, "0")}/${d.getFullYear()}`;
    }
  }

  return s;
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

/**
 * Format tanggal MENGIKUTI locale/format region yang diset di OS/browser
 * user (bukan format hardcode). Kalau user Windows-nya diset region
 * Indonesia -> "21/08/2026", kalau US -> "8/21/2026", dst — otomatis
 * ikut setting PC masing-masing user.
 */
export const formatTanggalLocale = (v: string | null | undefined): string => {
  if (!v) return "-";
  const s = String(v);
  let d: Date;
  if (s.includes("T")) {
    d = new Date(s);
  } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, day] = s.substring(0, 10).split("-").map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(s);
  }
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
};

/**
 * Konversi ke Date object yang AMAN dikirim ke ExcelJS (atau proses lain
 * yang mengonversi Date pakai basis waktu berbeda). Ambil tanggal kalender
 * yang benar via formatTanggal() (sudah teruji aman dari pergeseran
 * timezone), lalu bikin ulang Date di JAM 12 SIANG lokal — bukan tengah
 * malam — supaya konversi timezone apa pun di proses selanjutnya (ExcelJS,
 * dll) tidak pernah menggeser ke tanggal sebelum/sesudahnya.
 */
export const toExcelDate = (v: string | null | undefined): Date | null => {
  const formatted = formatTanggal(v); // "dd/mm/yyyy", sudah aman dari shift
  if (!formatted || formatted === "-") return null;
  const [dd, mm, yyyy] = formatted.split("/").map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd, 12, 0, 0);
};

/**
 * Format tanggal ringkas ala "12 Sept 26" — TANPA jam/detik/timezone.
 * Dipakai khusus buat export yang butuh format singkat manusiawi
 * (bukan dd/mm/yyyy, bukan ISO). Sama pola input-parsing dengan
 * formatTanggal (aman dari bug timezone — ambil komponen tanggal
 * LOKAL dari string, tidak lewat new Date().toISOString() lagi).
 */
const BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
export const formatTanggalSingkat = (v: string | null | undefined): string => {
  if (!v) return "-";

  const s = String(v);
  let y: number, m: number, d: number;

  if (s.includes("T")) {
    // ISO string — ambil komponen tanggal via Date object (lokal)
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return "-";
    y = dt.getFullYear();
    m = dt.getMonth() + 1;
    d = dt.getDate();
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    // dd-MM-yyyy
    const [dd, mm, yyyy] = s.split("-").map(Number);
    d = dd;
    m = mm;
    y = yyyy;
  } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    // yyyy-MM-dd (dengan atau tanpa waktu setelahnya)
    const [yyyy, mm, dd] = s.substring(0, 10).split("-").map(Number);
    y = yyyy;
    m = mm;
    d = dd;
  } else {
    return s;
  }

  if (!y || !m || !d) return "-";
  return `${d} ${BULAN_SINGKAT[m - 1]} ${String(y).slice(2)}`;
};
