import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
  align?: "left" | "center" | "right";
}

export interface ExcelSheetConfig {
  sheetName: string;
  columns: ExcelColumn[];
  rows: any[];
  title?: string;
  headerColor?: string;
  freezeRow?: number;
}

export const exportExcel = async (
  filename: string,
  sheets: ExcelSheetConfig[],
): Promise<void> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MANKSI ERP";
  wb.created = new Date();

  for (const cfg of sheets) {
    const ws = wb.addWorksheet(cfg.sheetName);
    const hdrColor = cfg.headerColor ?? "1565C0";

    // ── Baris judul (opsional) ──
    let dataStartRow = 1;
    if (cfg.title) {
      const titleRow = ws.addRow([cfg.title]);
      titleRow.getCell(1).font = {
        bold: true,
        size: 12,
        color: { argb: "FF" + hdrColor },
      };
      titleRow.getCell(1).alignment = { horizontal: "left" };
      ws.mergeCells(1, 1, 1, cfg.columns.length);
      ws.addRow([]);
      dataStartRow = 3;
    }

    // ✅ Threshold performa — di atas ini, skip zebra stripe & per-cell
    // styling manual (row.eachCell bikin object baru utk TIAP cell di
    // TIAP baris, berat banget buat ribuan baris). Dataset besar pakai
    // jalur cepat: style di level KOLOM (sekali doang, ExcelJS terapin
    // ke semua cell kolom itu otomatis) + bulk insert via addRows().
    const isLargeExport = cfg.rows.length > 500;

    // ── Setup kolom (+ style default per kolom kalau dataset besar) ──
    ws.columns = cfg.columns.map((c) => ({
      key: c.key,
      width: c.width ?? 18,
      style: isLargeExport
        ? {
            font: { size: 10 },
            alignment: { horizontal: c.align ?? "left", vertical: "middle" },
            numFmt: c.numFmt,
          }
        : undefined,
    }));

    // ── Header row (selalu di-style manual — cuma 1 baris, murah) ──
    const headerRow = ws.addRow(cfg.columns.map((c) => c.header));
    headerRow.eachCell((cell, colIdx) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + hdrColor },
      };
      cell.alignment = {
        horizontal: cfg.columns[colIdx - 1]?.align ?? "left",
        vertical: "middle",
        wrapText: false,
      };
      cell.border = { bottom: { style: "thin", color: { argb: "FFFFFFFF" } } };
    });
    headerRow.height = 20;

    if (isLargeExport) {
      // ✅ Jalur cepat — bulk insert, style udah ke-set di level kolom
      // di atas, jadi ExcelJS gak perlu bikin object gaya per cell.
      ws.addRows(cfg.rows.map((r) => cfg.columns.map((c) => r[c.key] ?? "")));
    } else {
      // Jalur normal — tetep per-cell + zebra stripe (dataset kecil,
      // biaya perform gak kerasa, tampilannya lebih rapi)
      cfg.rows.forEach((rowData, idx) => {
        const row = ws.addRow(cfg.columns.map((c) => rowData[c.key] ?? ""));
        row.eachCell((cell, colIdx) => {
          const colCfg = cfg.columns[colIdx - 1];
          cell.font = { size: 10 };
          cell.alignment = {
            horizontal: colCfg?.align ?? "left",
            vertical: "middle",
          };
          if (colCfg?.numFmt) cell.numFmt = colCfg.numFmt;

          if (idx % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF5F5F5" },
            };
          }
        });
        row.height = 16;
      });
    }

    // ── Freeze panes ──
    ws.views = [
      { state: "frozen", ySplit: dataStartRow + (cfg.title ? 0 : 0) },
    ];

    // ── Auto filter pada header ──
    const headerRowNum = cfg.title ? 3 : 1;
    ws.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum, column: cfg.columns.length },
    };
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
};

export const exportExcelSingle = async (
  filename: string,
  sheetName: string,
  columns: ExcelColumn[],
  rows: any[],
  title?: string,
): Promise<void> => {
  await exportExcel(filename, [{ sheetName, columns, rows, title }]);
};
