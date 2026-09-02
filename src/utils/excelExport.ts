import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
  align?: "left" | "center" | "right" | string;
}

export interface RowStyleResult {
  fillColor?: string; // hex tanpa '#', mis. "B71C1C"
  fontColor?: string; // hex tanpa '#', mis. "FFFFFF"
  bold?: boolean;
}

export interface ExcelSheetConfig {
  sheetName: string;
  columns: ExcelColumn[];
  rows: any[];
  title?: string;
  headerColor?: string;
  freezeRow?: number;
  rowStyleFn?: (row: any) => RowStyleResult | null; // ⬅ baru
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

    // ✅ Threshold performa
    const isLargeExport = cfg.rows.length > 500 && !cfg.rowStyleFn;

    // ── Setup kolom (+ style default per kolom kalau dataset besar) ──
    ws.columns = cfg.columns.map((c) => ({
      key: c.key,
      width: c.width ?? 18,
      style: isLargeExport
        ? {
            font: { size: 10 },
            // Tambahkan "as any" agar ExcelJS tidak protes
            alignment: {
              horizontal: (c.align as any) ?? "left",
              vertical: "middle",
            },
            numFmt: c.numFmt,
          }
        : undefined,
    }));

    // ── Header row ──
    const headerRow = ws.addRow(cfg.columns.map((c) => c.header));
    headerRow.eachCell((cell, colIdx) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + hdrColor },
      };
      cell.alignment = {
        // Tambahkan "as any"
        horizontal: (cfg.columns[colIdx - 1]?.align as any) ?? "left",
        vertical: "middle",
        wrapText: false,
      };
      cell.border = { bottom: { style: "thin", color: { argb: "FFFFFFFF" } } };
    });
    headerRow.height = 20;

    if (isLargeExport) {
      // Jalur cepat
      ws.addRows(cfg.rows.map((r) => cfg.columns.map((c) => r[c.key] ?? "")));
    } else {
      cfg.rows.forEach((rowData, idx) => {
        const row = ws.addRow(cfg.columns.map((c) => rowData[c.key] ?? ""));
        const customStyle = cfg.rowStyleFn?.(rowData) ?? null;

        row.eachCell((cell, colIdx) => {
          const colCfg = cfg.columns[colIdx - 1];
          cell.font = {
            size: 10,
            bold: customStyle?.bold ?? false,
            color: customStyle?.fontColor
              ? { argb: "FF" + customStyle.fontColor }
              : undefined,
          };
          cell.alignment = {
            horizontal: (colCfg?.align as any) ?? "left",
            vertical: "middle",
          };
          if (colCfg?.numFmt) cell.numFmt = colCfg.numFmt;

          if (customStyle?.fillColor) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + customStyle.fillColor },
            };
          } else if (idx % 2 === 0) {
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
