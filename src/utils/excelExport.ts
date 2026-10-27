import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
  align?: "left" | "center" | "right" | string;
  // Bila ada kolom yang punya subHeader, header jadi dua baris.
  // Kolom tanpa subHeader di-merge vertikal.
  subHeader?: string;
}

export interface RowStyleResult {
  fillColor?: string; // hex tanpa '#', mis. "B71C1C"
  fontColor?: string; // hex tanpa '#', mis. "FFFFFF"
  bold?: boolean;
}

// Baris di atas header (kop, judul, periode). text "" = baris kosong.
export interface ExcelPreLine {
  text: string;
  bold?: boolean;
  size?: number;
  color?: string; // hex tanpa '#'
}

export interface ExcelSheetConfig {
  sheetName: string;
  columns: ExcelColumn[];
  rows: any[];
  title?: string;
  preLines?: ExcelPreLine[]; // bila diisi, menggantikan title
  headerColor?: string;
  headerFontColor?: string; // default "FFFFFF"
  zebra?: boolean; // default true
  autoFilter?: boolean; // default true
  freezeRow?: number;
  rowStyleFn?: (row: any) => RowStyleResult | null;
  // Gaya per sel; menimpa rowStyleFn
  cellStyleFn?: (row: any, key: string) => RowStyleResult | null;
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
    const hdrFontColor = cfg.headerFontColor ?? "FFFFFF";
    const zebra = cfg.zebra ?? true;
    const jmlKolom = cfg.columns.length;
    const headerDuaBaris = cfg.columns.some((c) => c.subHeader !== undefined);

    // ── Baris pembuka: preLines (kop + judul) atau title ──
    let barisHeader = 1;
    if (cfg.preLines && cfg.preLines.length > 0) {
      cfg.preLines.forEach((pl, i) => {
        const r = ws.addRow([pl.text]);
        if (pl.text !== "") {
          r.getCell(1).font = {
            bold: pl.bold ?? false,
            size: pl.size ?? 10,
            color: pl.color ? { argb: "FF" + pl.color } : undefined,
          };
          r.getCell(1).alignment = { horizontal: "left" };
          ws.mergeCells(i + 1, 1, i + 1, jmlKolom);
        }
      });
      barisHeader = cfg.preLines.length + 1;
    } else if (cfg.title) {
      const titleRow = ws.addRow([cfg.title]);
      titleRow.getCell(1).font = {
        bold: true,
        size: 12,
        color: { argb: "FF" + hdrColor },
      };
      titleRow.getCell(1).alignment = { horizontal: "left" };
      ws.mergeCells(1, 1, 1, jmlKolom);
      ws.addRow([]);
      barisHeader = 3;
    }
    const barisAkhirHeader = barisHeader + (headerDuaBaris ? 1 : 0);

    // ✅ Threshold performa
    const isLargeExport =
      cfg.rows.length > 500 && !cfg.rowStyleFn && !cfg.cellStyleFn;

    // ── Setup kolom (+ style default per kolom kalau dataset besar) ──
    ws.columns = cfg.columns.map((c) => ({
      key: c.key,
      width: c.width ?? 18,
      style: isLargeExport
        ? {
            font: { size: 10 },
            alignment: {
              horizontal:
                (c.align as ExcelJS.Alignment["horizontal"]) ?? "left",
              vertical: "middle",
            },
            numFmt: c.numFmt,
          }
        : undefined,
    }));

    // ── Header row(s) ──
    const gayaHeader = (row: ExcelJS.Row) => {
      row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.font = {
          bold: true,
          color: { argb: "FF" + hdrFontColor },
          size: 10,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + hdrColor },
        };
        cell.alignment = {
          horizontal: headerDuaBaris
            ? "center"
            : ((cfg.columns[colIdx - 1]
                ?.align as ExcelJS.Alignment["horizontal"]) ?? "left"),
          vertical: "middle",
          wrapText: false,
        };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
        };
      });
      row.height = 20;
    };

    gayaHeader(ws.addRow(cfg.columns.map((c) => c.header)));
    if (headerDuaBaris) {
      gayaHeader(ws.addRow(cfg.columns.map((c) => c.subHeader ?? "")));

      // Kolom tanpa subHeader: merge vertikal.
      // Kolom berurutan dengan header sama dan subHeader terisi: merge horizontal (pita).
      let awal = 0;
      while (awal < jmlKolom) {
        const c = cfg.columns[awal];
        if (c.subHeader === undefined) {
          ws.mergeCells(barisHeader, awal + 1, barisHeader + 1, awal + 1);
          awal += 1;
          continue;
        }
        let akhir = awal;
        while (
          akhir + 1 < jmlKolom &&
          cfg.columns[akhir + 1].subHeader !== undefined &&
          cfg.columns[akhir + 1].header === c.header
        ) {
          akhir += 1;
        }
        if (akhir > awal) {
          ws.mergeCells(barisHeader, awal + 1, barisHeader, akhir + 1);
        }
        awal = akhir + 1;
      }
    }

    if (isLargeExport) {
      // Jalur cepat
      ws.addRows(cfg.rows.map((r) => cfg.columns.map((c) => r[c.key] ?? "")));
    } else {
      cfg.rows.forEach((rowData, idx) => {
        const row = ws.addRow(cfg.columns.map((c) => rowData[c.key] ?? ""));
        const gayaBaris = cfg.rowStyleFn?.(rowData) ?? null;

        row.eachCell((cell, colIdx) => {
          const colCfg = cfg.columns[colIdx - 1];
          const gayaSel = colCfg
            ? (cfg.cellStyleFn?.(rowData, colCfg.key) ?? null)
            : null;
          const gaya: RowStyleResult = { ...gayaBaris, ...gayaSel };

          cell.font = {
            size: 10,
            bold: gaya.bold ?? false,
            color: gaya.fontColor ? { argb: "FF" + gaya.fontColor } : undefined,
          };
          cell.alignment = {
            horizontal:
              (colCfg?.align as ExcelJS.Alignment["horizontal"]) ?? "left",
            vertical: "middle",
          };
          if (colCfg?.numFmt) cell.numFmt = colCfg.numFmt;

          if (gaya.fillColor) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + gaya.fillColor },
            };
          } else if (zebra && idx % 2 === 0) {
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
    ws.views = [{ state: "frozen", ySplit: barisAkhirHeader }];

    // ── Auto filter pada header ──
    if (cfg.autoFilter !== false) {
      ws.autoFilter = {
        from: { row: barisAkhirHeader, column: 1 },
        to: { row: barisAkhirHeader, column: jmlKolom },
      };
    }
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
