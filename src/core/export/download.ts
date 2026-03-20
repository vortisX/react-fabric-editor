import { EXPORT_EXTENSION_MAP, type ExportFormat } from "./types";

/** 清洗文件名中的非法字符，确保浏览器下载时不会出现系统保留字符错误。 */
const sanitizeFilename = (value: string): string =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "");

/** 根据用户输入文件名和导出格式生成最终下载文件名。 */
export const buildDownloadName = (
  rawName: string,
  format: ExportFormat,
): string => {
  const fallbackName = "designx-export";
  const filename = sanitizeFilename(rawName) || fallbackName;
  return `${filename}.${EXPORT_EXTENSION_MAP[format]}`;
};

/** 触发浏览器下载指定 Blob。 */
export const triggerDownload = (blob: Blob, filename: string): void => {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = filename;
  link.click();

  setTimeout(() => {
    // 让浏览器有机会开始下载后再释放对象 URL，避免过早 revoke 导致下载失败。
    URL.revokeObjectURL(downloadUrl);
  }, 0);
};

/** 把 base64 DataURL 转换成 Blob，供 PNG/JPEG 导出链路复用。 */
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
