import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { insentifService } from "@/services/penjualan/insentifService";

// Replikasi PERSIS cetak() Delphi (ufrmPengajuanFee.pas) — generate
// file Excel via OLE Automation di source asli, di web pakai ExcelJS
// dengan struktur & formula yang sama: grouping baris per invoice
// (kolom 1-7 dikosongkan utk baris kedua+ dgn Nomor sama), formula
// Total Fee (=J*M) dan SUM total transfer, bukan hardcode value.
export const cetakInsentifExcel = async (nomor: string) => {
  const res = await insentifService.getCetakData(nomor);
  const { header, rows } = res.data.data;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pengajuan Fee");

  const YELLOW = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FFFFFF00" },
  };
  const thin = { style: "thin" as const };
  const fullBorder = { top: thin, left: thin, bottom: thin, right: thin };

  ws.getCell("A2").value = `FEE ${header.CusNama || ""}`;
  ws.getCell("A2").font = { bold: true };
  ws.getCell("A3").value = header.Tanggal
    ? new Date(header.Tanggal).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";
  ws.getCell("A3").font = { bold: true };

  const headerCols = [
    "Nomor",
    "Tanggal",
    "Keterangan",
    "Total",
    "Faktur Pajak",
    "Bayar",
    "Tanggal Bayar",
    "Kode",
    "Nama",
    "Jumlah",
    "Harga",
    "Harga Riil",
    "Fee",
    "Total Fee",
  ];
  headerCols.forEach((h, idx) => {
    const cell = ws.getCell(4, idx + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = YELLOW;
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = fullBorder;
  });

  let jRow = 5;
  let cNomor = "";
  rows.forEach((r: any) => {
    const vals = [
      r.Nomor,
      r.Tanggal,
      r.Keterangan,
      r.Total,
      r.FakturPajak,
      r.Bayar,
      r.TanggalBayar,
      r.Kode,
      r.Nama,
      r.Jumlah,
      r.Harga,
      r.HargaRiil,
      r.Fee,
      null,
    ];
    vals.forEach((v, idx) => {
      const col = idx + 1;
      const cell = ws.getCell(jRow, col);
      if (col <= 7) {
        cell.value = cNomor !== r.Nomor ? v : "";
      } else if (col <= 13) {
        cell.value = v;
      }
      cell.border = fullBorder;
    });
    ws.getCell(jRow, 14).value = { formula: `J${jRow}*M${jRow}` };
    ws.getCell(jRow, 14).border = fullBorder;
    cNomor = r.Nomor;
    jRow++;
  });
  const lastDataRow = jRow - 1;

  ["D", "F"].forEach((col) => (ws.getColumn(col).numFmt = "#,##0"));
  ["J", "K", "L", "M", "N"].forEach((col) => {
    for (let rIdx = 5; rIdx <= lastDataRow; rIdx++) {
      ws.getCell(`${col}${rIdx}`).numFmt = "#,##0";
    }
  });

  const totalRow = jRow;
  ws.mergeCells(`J${totalRow}:M${totalRow}`);
  const totalLbl = ws.getCell(`J${totalRow}`);
  totalLbl.value = "FEE YANG DI TRANSFER";
  totalLbl.fill = YELLOW;
  totalLbl.font = { bold: true };
  totalLbl.border = fullBorder;
  ["K", "L", "M"].forEach((col) => {
    ws.getCell(`${col}${totalRow}`).fill = YELLOW;
    ws.getCell(`${col}${totalRow}`).border = fullBorder;
  });
  const totalCell = ws.getCell(`N${totalRow}`);
  totalCell.value = { formula: `SUM(N5:N${lastDataRow})` };
  totalCell.fill = YELLOW;
  totalCell.font = { bold: true };
  totalCell.numFmt = "#,##0";
  totalCell.border = fullBorder;

  let r2 = totalRow + 1;
  ws.getCell(`A${r2}`).value = "MOHON DI TRANSFER KE :";
  r2++;
  ws.getCell(`A${r2}`).value = `Rek a/n : ${header.AtasNama || ""}`;
  r2++;
  ws.getCell(`A${r2}`).value =
    `${header.Bank || ""} NO : ${header.NoRek || ""}`;
  r2 += 3;
  ws.getCell(`B${r2}`).value =
    "     Dibuat Oleh,                                          Mengetahui,                                                            Disetujui Oleh,";
  r2 += 4;
  ws.getCell(`B${r2}`).value =
    "(Adm Marketing)                      (SPV MO)      (Manager marketing)                            (Manager Keuangan)";

  ws.getRow(4).alignment = { horizontal: "center", vertical: "middle" };
  ["A1", "A2", "A3"].forEach((addr) => {
    ws.getCell(addr).alignment = { horizontal: "left" };
  });

  for (let c = 2; c <= 14; c++) {
    let maxLen = 10;
    ws.getColumn(c).eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    ws.getColumn(c).width = maxLen + 2;
  }
  ws.getColumn("A").width = 19;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Pengajuan_Fee_${nomor.replace(/\//g, "-")}.xlsx`,
  );
};
