import api from "@/services/api";

export interface ChangelogChange {
  type: "added" | "fixed" | "changed";
  text: string;
}
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: ChangelogChange[];
}
export interface VersionInfo {
  version: string;
  changelog: ChangelogEntry[];
}

export const versionService = {
  getVersion: () =>
    api.get<{ success: boolean; data: VersionInfo }>("/system/version"),
};
