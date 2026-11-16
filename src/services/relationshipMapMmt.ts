import api from "@/services/api";

export interface RelMapNode {
  type: string;
  nomor: string;
  label?: string;
  tanggal?: string;
  jumlah?: number;
  kategori?: string;
  approveStatus?: string;
  [key: string]: any;
}

export const searchDocs = async (
  type: string,
  q: string,
): Promise<RelMapNode[]> => {
  const res = await api.get("/mmt/relationship-map/search", {
    params: { type, q },
  });
  // Jika response adalah { success: true, data: [...] }
  return res.data?.data || res.data || [];
};

export const expandDoc = async (
  type: string,
  nomor: string,
): Promise<{
  node?: RelMapNode;
  backward: RelMapNode[];
  forward: RelMapNode[];
}> => {
  const res = await api.get("/mmt/relationship-map/expand", {
    params: { type, nomor },
  });
  // Mengambil node, backward, forward langsung dari data payload
  const body = res.data?.data || res.data || {};
  return {
    node: body.node,
    backward: Array.isArray(body.backward) ? body.backward : [],
    forward: Array.isArray(body.forward) ? body.forward : [],
  };
};
