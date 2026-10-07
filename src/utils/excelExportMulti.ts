import ExcelJS from "exceljs";

export interface ExcelMultiColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
  align?: "left" | "center" | "right";
}

export interface ExcelMultiSheet {
  name: string;
  columns: ExcelMultiColumn[];
  rows: Record<string, string | number | null>[];
}

export const exportExcelMulti = async (
  fileName: string,
  sheets: ExcelMultiSheet[],
) => {
  const wb = new ExcelJS.Workbook();

  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31));
    ws.columns = s.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 16,
      style: {
        numFmt: c.numFmt,
        alignment: c.align ? { horizontal: c.align } : undefined,
      },
    }));
    ws.addRows(s.rows);

    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE65100" },
    };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};
