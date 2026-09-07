import api from "@/services/api";
// Detail marker/grading tersimpan di tabel yang sama dengan LHK Pola
// (tlhkpola_marker_dtl), jadi expand row cukup reuse getDetail dari
// lhkPolaService — tidak perlu endpoint detail terpisah.
import { lhkPolaService } from "@/services/garmen/lhkPolaService";

const BASE = "/ppic/lhk-marker";

export const lhkMarkerService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get(BASE, { params }),

  getDetail: (nomor: string) => lhkPolaService.getDetail(nomor),
};
