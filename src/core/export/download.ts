import { EXPORT_EXTENSION_MAP, type ExportFormat } from "./types";

const sanitizeFilename = (value: string): string =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "");

export const buildDownloadName = (
  rawName: string,
  format: ExportFormat,
): string => {
  const fallbackName = "designx-export";
  const filename = sanitizeFilename(rawName) || fallbackName;
  return `${filename}.${EXPORT_EXTENSION_MAP[format]}`;
};

export const triggerDownload = (blob: Blob, filename: string): void => {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = filename;
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 0);
};

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64Payload] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64Payload ?? "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
};
