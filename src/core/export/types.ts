export type ExportFormat = "png" | "jpeg" | "svg" | "pdf" | "json";
export type ExportScale = 1 | 2 | 3;

export const EXPORT_EXTENSION_MAP: Record<ExportFormat, string> = {
  png: "png",
  jpeg: "jpg",
  svg: "svg",
  pdf: "pdf",
  json: "json",
};

export const JPEG_EXPORT_QUALITY = 0.92;
