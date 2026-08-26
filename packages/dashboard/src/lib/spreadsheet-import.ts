import * as XLSX from "xlsx";

export type ImportedRow = Record<string, unknown>;

const normalizeHeader = (header: string) =>
    header
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "");

export const parseSpreadsheetFile = async (file: File): Promise<ImportedRow[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) return [];

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
    });

    return rawRows.map((row) => {
        const normalized: ImportedRow = {};
        Object.entries(row).forEach(([key, value]) => {
            normalized[normalizeHeader(key)] = value;
        });
        return normalized;
    });
};

export const pickImportValue = (row: ImportedRow, candidateHeaders: string[]): string => {
    for (const header of candidateHeaders) {
        const value = row[normalizeHeader(header)];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value).trim();
        }
    }
    return "";
};

export const parsePriority = (value: string, fallback = 3) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(5, Math.max(1, parsed));
};

export const parseDelimitedList = (value: string) =>
    value
        .split(/\||;|,/)
        .map((item) => item.trim())
        .filter(Boolean);

export const normalizeStatus = (value: string, allowed: string[], fallback: string) => {
    const normalized = value.toLowerCase().trim().replace(/\s+/g, "_");
    return allowed.includes(normalized) ? normalized : fallback;
};
