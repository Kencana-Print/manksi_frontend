import api from "@/services/api";

// --- INTERFACES (Tipe Data Filter & Request) ---
export interface MapBrowseParams {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  [key: string]: any;
}

export interface DesignStatusRow {
  Nomor: string;
  DesignDone: "Y" | "N" | string;
}

const BASE_URL = "/mmt/map";

export const mapService = {
  // 1. GET BROWSE LIST
  async getBrowseList(params: MapBrowseParams) {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  },

  // 2. GET DESIGN LIST
  async getDesignList(startDate: string, endDate: string) {
    const response = await api.get(`${BASE_URL}/design/list`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // 3. UPDATE DESIGN STATUS
  async updateDesignStatus(rows: DesignStatusRow[]) {
    const response = await api.put(`${BASE_URL}/design/status`, { rows });
    return response.data;
  },

  // 4. TOGGLE CLOSE / OPEN
  async toggleClose(nomor: string, isClose: "Y" | "N" | string) {
    const response = await api.put(
      `${BASE_URL}/${encodeURIComponent(nomor)}/close`,
      { isClose },
    );
    return response.data;
  },

  // 5. APPROVE CMO
  async approveCmo(nomor: string) {
    const response = await api.put(
      `${BASE_URL}/${encodeURIComponent(nomor)}/approve`,
    );
    return response.data;
  },

  // 6. REQUEST PIN 5
  async requestPin5(nomor: string, alasan: string) {
    const response = await api.post(
      `${BASE_URL}/${encodeURIComponent(nomor)}/pin5`,
      { alasan },
    );
    return response.data;
  },

  // 7. DELETE MAP
  async deleteMap(nomor: string) {
    const response = await api.delete(
      `${BASE_URL}/${encodeURIComponent(nomor)}`,
    );
    return response.data;
  },

  // 8. GET PRINT DATA
  async getPrintData(nomor: string) {
    const response = await api.get(
      `${BASE_URL}/${encodeURIComponent(nomor)}/print`,
    );
    return response.data;
  },
};

export default mapService;
