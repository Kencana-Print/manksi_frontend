import type { Borders, Style, Workbook, Worksheet } from "exceljs";
import type { NotulensiExportRow } from "@/services/tools/notulensiMeetingService";

// Layout mengikuti notulen Excel manual: judul, agenda, hari/tanggal + lokasi,
// peserta, lalu tabel poin meeting. Satu sheet per notulensi.

const FONT = "Century Gothic";
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Kolom: A margin, B No, C Hasil, D PIC, E Deadline, F Sistem, G User, H Note
const LEBAR_KOLOM = [3, 5, 114, 18, 19, 14, 11, 32];
const KOLOM_AKHIR = 8; // H

const parseTgl = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const tglPanjang = (iso: string): string => {
  const d = parseTgl(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
};

const hariTanggal = (iso: string): string =>
  `${HARI[parseTgl(iso).getDay()]}, ${tglPanjang(iso)}`;

// Peserta tersimpan sebagai teks bebas (koma / baris baru). Dinomori otomatis
// kecuali user sudah menomorinya sendiri.
const formatPeserta = (peserta: string | null): string => {
  const daftar = (peserta ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!daftar.length) return "👥 Peserta: -";
  const sudahBernomor = daftar.every((p) => /^\d+[.)]\s*/.test(p));
  const hasil = sudahBernomor ? daftar : daftar.map((p, i) => `${i + 1}. ${p}`);
  return `👥 Peserta: ${hasil.join(", ")}`;
};

// Sel gabungan tidak auto-fit di Excel, jadi tinggi baris diperkirakan manual
const tinggiBaris = (teks: string, hurufPerBaris: number): number =>
  16 * Math.max(1, Math.ceil(teks.length / hurufPerBaris)) + 2;

const garis = (style: "thin" | "medium", argb: string): Partial<Borders> => {
  const sisi = { style, color: { argb } };
  return { top: sisi, left: sisi, bottom: sisi, right: sisi };
};

const gayaRentang = (
  ws: Worksheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  gaya: Partial<Style>,
): void => {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) ws.getCell(r, c).style = { ...gaya };
  }
};

const namaSheet = (tanggal: string, dipakai: Set<string>): string => {
  const [y, m, d] = tanggal.split("-");
  const dasar = `${d}_${m}_${y}`;
  let nama = dasar;
  for (let n = 2; dipakai.has(nama); n++) nama = `${dasar}_${n}`;
  dipakai.add(nama);
  return nama;
};

const buatSheet = (
  wb: Workbook,
  nama: string,
  rows: NotulensiExportRow[],
): void => {
  const h = rows[0];
  const ws = wb.addWorksheet(nama, {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });
  LEBAR_KOLOM.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // ── Judul ──
  ws.mergeCells(2, 2, 2, KOLOM_AKHIR);
  ws.getCell(2, 2).value = "NOTULEN MEETING";
  ws.getCell(2, 2).style = {
    font: { name: FONT, size: 24, bold: true, color: { argb: "FF000000" } },
    alignment: { horizontal: "center", vertical: "middle" },
  };
  ws.getRow(2).height = 29.4;

  // ── Agenda ──
  const agenda = `📝 ${h.agenda}`;
  ws.mergeCells(3, 2, 3, KOLOM_AKHIR);
  gayaRentang(ws, 3, 2, 3, KOLOM_AKHIR, {
    font: { name: FONT, size: 12, bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E1065" } },
    alignment: { vertical: "top", wrapText: true },
  });
  ws.getCell(3, 2).value = agenda;
  ws.getRow(3).height = tinggiBaris(agenda, 120);

  // ── Hari/tanggal, lokasi ──
  const tgl = `📅 ${hariTanggal(h.tanggal)}`;
  const lokasi = `📍 ${h.lokasi}`;
  const gayaInfo: Partial<Style> = {
    font: { name: FONT, size: 12, bold: true, color: { argb: "FF5B21B6" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E8FF" } },
    border: garis("medium", "FFE2E8F0"),
    alignment: { vertical: "top", wrapText: true },
  };
  ws.mergeCells(4, 2, 4, 3);
  ws.mergeCells(4, 4, 4, 5);
  ws.mergeCells(4, 6, 4, KOLOM_AKHIR);
  gayaRentang(ws, 4, 2, 4, KOLOM_AKHIR, gayaInfo);
  ws.getCell(4, 2).value = tgl;
  ws.getCell(4, 4).value = lokasi;
  ws.getRow(4).height = tinggiBaris(lokasi, 30);

  // ── Peserta ──
  const peserta = formatPeserta(h.peserta);
  ws.mergeCells(5, 2, 5, KOLOM_AKHIR);
  gayaRentang(ws, 5, 2, 5, KOLOM_AKHIR, {
    font: { name: FONT, size: 12, bold: true, color: { argb: "FF7C3AED" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF5FF" } },
    border: garis("medium", "FFE2E8F0"),
    alignment: { vertical: "top", wrapText: true },
  });
  ws.getCell(5, 2).value = peserta;
  ws.getRow(5).height = tinggiBaris(peserta, 150);

  // ── Header tabel (2 baris: Status dipecah Sistem / User) ──
  ws.mergeCells(6, 2, 7, 2);
  ws.mergeCells(6, 3, 7, 3);
  ws.mergeCells(6, 4, 7, 4);
  ws.mergeCells(6, 5, 7, 5);
  ws.mergeCells(6, 6, 6, 7);
  ws.mergeCells(6, 8, 7, 8);
  gayaRentang(ws, 6, 2, 7, KOLOM_AKHIR, {
    font: { name: FONT, size: 12, bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF9933FF" } },
    border: { top: { style: "medium", color: { argb: "FF6D28D9" } } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
  });
  ws.getCell(6, 2).value = "No";
  ws.getCell(6, 3).value = "Hasil / Tindak Lanjut";
  ws.getCell(6, 4).value = "PIC";
  ws.getCell(6, 5).value = "Deadline";
  ws.getCell(6, 6).value = "Status";
  ws.getCell(7, 6).value = "Sistem";
  ws.getCell(7, 7).value = "User";
  ws.getCell(6, 8).value = "Note";

  // ── Poin meeting ──
  rows.forEach((d, i) => {
    const r = 8 + i;
    const dasar: Partial<Style> = {
      font: { name: FONT, size: 11, color: { argb: "FF000000" } },
      border: garis("thin", "FF000000"),
    };
    const zebra: Partial<Style>["fill"] =
      i % 2 === 1
        ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } }
        : undefined;

    const set = (
      kol: number,
      nilai: string | number,
      gaya: Partial<Style>,
    ): void => {
      const c = ws.getCell(r, kol);
      c.value = nilai;
      c.style = { ...dasar, ...gaya };
    };

    set(2, d.noUrut, {
      fill: zebra,
      alignment: { horizontal: "center", vertical: "top" },
    });
    set(3, d.hasil, { alignment: { vertical: "top", wrapText: true } });
    set(4, d.pic, {
      fill: zebra,
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    });
    set(5, d.deadline ? tglPanjang(d.deadline) : "", {
      // lewat deadline & belum selesai: tanda merah (bukan status, hanya penanda)
      font: d.terlambat
        ? { name: FONT, size: 11, bold: true, color: { argb: "FFC62828" } }
        : dasar.font,
      alignment: { horizontal: "center", vertical: "middle" },
    });
    set(6, d.statusSistem, {
      alignment: { horizontal: "center", vertical: "middle" },
    });
    set(7, d.statusUser, {
      // OPEN disorot kuning muda seperti pada notulen manual
      fill:
        d.statusUser === "OPEN"
          ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } }
          : undefined,
      alignment: { horizontal: "center", vertical: "middle" },
    });
    set(8, d.catatan, {
      alignment: { horizontal: "left", vertical: "middle", wrapText: true },
    });
  });
};

const unduh = (data: BlobPart, namaFile: string): void => {
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// rows: hasil getExportDetail (satu baris per poin, urut tanggal/nomor/noUrut)
export const exportNotulenExcel = async (
  rows: NotulensiExportRow[],
  namaFile: string,
): Promise<void> => {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();

  const perNomor = new Map<string, NotulensiExportRow[]>();
  rows.forEach((r) => {
    const daftar = perNomor.get(r.nomor);
    if (daftar) daftar.push(r);
    else perNomor.set(r.nomor, [r]);
  });

  const dipakai = new Set<string>();
  perNomor.forEach((daftar) => {
    buatSheet(wb, namaSheet(daftar[0].tanggal, dipakai), daftar);
  });

  const buf = await wb.xlsx.writeBuffer();
  unduh(buf, namaFile);
};
