interface PdfImageSource {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

const PDF_HEADER = "%PDF-1.4\n";
const PDF_BINARY_MARKER = "%\xFF\xFF\xFF\xFF\n";

const encoder = new TextEncoder();

/** 把文本编码成 Uint8Array，供 PDF 字节流拼装复用。 */
const encodeText = (value: string): Uint8Array => encoder.encode(value);

/** 拼接多段字节数组，生成一段连续的 Uint8Array。 */
const concatBytes = (parts: Uint8Array[]): Uint8Array => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return merged;
};

/** 从 JPEG DataURL 中解出原始二进制字节。 */
const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

/** 把像素尺寸换算为 PDF 使用的 point 单位。 */
const pxToPt = (valuePx: number, dpi: number): number =>
  Number(((valuePx * 72) / Math.max(dpi, 1)).toFixed(2));

/**
 * 通过嵌入 JPEG 图像生成单页 PDF Blob。
 */
export const createPdfBlob = ({
  dataUrl,
  widthPx,
  heightPx,
  dpi,
}: PdfImageSource): Blob => {
  const imageBytes = dataUrlToBytes(dataUrl);
  const pageWidthPt = pxToPt(widthPx, dpi);
  const pageHeightPt = pxToPt(heightPx, dpi);
  const imageWidth = Math.max(Math.round(widthPx), 1);
  const imageHeight = Math.max(Math.round(heightPx), 1);

  // 这里直接手工拼 PDF 对象结构，避免引入额外的大型 PDF 依赖。
  const imageObjectHeader = encodeText(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
  );
  const imageObjectFooter = encodeText("\nendstream\nendobj\n");

  const contentStream = encodeText(
    `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im0 Do\nQ\n`,
  );

  const objects = [
    encodeText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    encodeText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    encodeText(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    ),
    concatBytes([imageObjectHeader, imageBytes, imageObjectFooter]),
    concatBytes([
      encodeText(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n`),
      contentStream,
      encodeText("endstream\nendobj\n"),
    ]),
  ];

  const parts: Uint8Array[] = [encodeText(PDF_HEADER), encodeText(PDF_BINARY_MARKER)];
  const offsets: number[] = [0];
  let currentOffset = parts[0].length + parts[1].length;

  for (const objectBytes of objects) {
    offsets.push(currentOffset);
    parts.push(objectBytes);
    currentOffset += objectBytes.length;
  }

  const xrefOffset = currentOffset;
  const xrefRows = offsets
    .map((offset, index) =>
      index === 0
        ? "0000000000 65535 f \n"
        : `${offset.toString().padStart(10, "0")} 00000 n \n`,
    )
    .join("");

  parts.push(
    encodeText(
      `xref\n0 ${offsets.length}\n${xrefRows}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    ),
  );

  return new Blob(parts as BlobPart[], { type: "application/pdf" });
};
