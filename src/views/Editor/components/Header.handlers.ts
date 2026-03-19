import { createPdfBlob } from "../../../core/export/pdf";
import { embedSvgFonts } from "../../../core/export/svg";
import { engineInstance } from "../../../core/engine";
import { useEditorStore } from "../../../store/useEditorStore";

export type ExportFormat = "png" | "jpeg" | "svg" | "pdf" | "json";
export type ExportScale = 1 | 2 | 3;

const EXPORT_EXTENSION_MAP: Record<ExportFormat, string> = {
  png: "png",
  jpeg: "jpg",
  svg: "svg",
  pdf: "pdf",
  json: "json",
};

const JPEG_EXPORT_QUALITY = 0.92;

const sanitizeFilename = (value: string): string =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "");

const buildDownloadName = (
  rawName: string,
  format: ExportFormat,
): string => {
  const fallbackName = "designx-export";
  const filename = sanitizeFilename(rawName) || fallbackName;
  return `${filename}.${EXPORT_EXTENSION_MAP[format]}`;
};

const triggerDownload = (blob: Blob, filename: string): void => {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = filename;
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 0);
};

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64Payload] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64Payload ?? "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
};

const exportRasterBlob = (
  format: "png" | "jpeg",
  scale: ExportScale,
): Blob => {
  const dataUrl = engineInstance.exportSceneDataUrl(
    format,
    format === "jpeg" ? JPEG_EXPORT_QUALITY : 1,
    scale,
  );
  if (!dataUrl) {
    throw new Error("EXPORT_FAILED");
  }

  return dataUrlToBlob(dataUrl);
};

const exportSvgBlob = async (): Promise<Blob> => {
  const svg = engineInstance.exportSceneSvg();
  if (!svg) {
    throw new Error("EXPORT_FAILED");
  }

  const embeddedSvg = await embedSvgFonts(svg);

  return new Blob([embeddedSvg], {
    type: "image/svg+xml;charset=utf-8",
  });
};

const exportPdfBlob = (scale: ExportScale): Blob => {
  const documentState = useEditorStore.getState().document;
  if (!documentState) {
    throw new Error("EXPORT_FAILED");
  }

  const jpegDataUrl = engineInstance.exportSceneDataUrl(
    "jpeg",
    JPEG_EXPORT_QUALITY,
    scale,
  );
  if (!jpegDataUrl) {
    throw new Error("EXPORT_FAILED");
  }

  return createPdfBlob({
    dataUrl: jpegDataUrl,
    widthPx: documentState.global.width * scale,
    heightPx: documentState.global.height * scale,
    dpi: documentState.global.dpi,
  });
};

const exportJsonBlob = (): Blob => {
  const documentState = useEditorStore.getState().document;
  if (!documentState) {
    throw new Error("EXPORT_FAILED");
  }

  return new Blob([JSON.stringify(documentState, null, 2)], {
    type: "application/json;charset=utf-8",
  });
};

/**
 * Exports the current design document as the requested file format and starts a browser download.
 */
export const exportCurrentDesign = async (
  format: ExportFormat,
  filename: string,
  scale: ExportScale,
): Promise<void> => {
  const outputName = buildDownloadName(filename, format);

  const blob =
    format === "png"
      ? exportRasterBlob("png", scale)
      : format === "jpeg"
        ? exportRasterBlob("jpeg", scale)
        : format === "svg"
          ? await exportSvgBlob()
          : format === "pdf"
            ? exportPdfBlob(scale)
            : exportJsonBlob();

  triggerDownload(blob, outputName);
};
