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

    // ── Setup kolom ──
    ws.columns = cfg.columns.map((c) => ({
      key: c.key,
      width: c.width ?? 18,
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
        horizontal: cfg.columns[colIdx - 1]?.align ?? "left",
        vertical: "middle",
        wrapText: false,
      };
      cell.border = { bottom: { style: "thin", color: { argb: "FFFFFFFF" } } };
    });
    headerRow.height = 20;

    // ── Data rows — pakai forEach agar idx tersedia untuk zebra stripe ──
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

        // Zebra stripe — idx dari forEach, tidak ada masalah tipe
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
