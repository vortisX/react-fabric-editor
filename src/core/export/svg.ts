import { SUPPORTED_FONTS } from "../../constants/fonts";

const fontDataUrlCache = new Map<string, Promise<string | null>>();

const getFontMimeType = (path: string): string => {
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".woff")) return "font/woff";
  if (path.endsWith(".otf")) return "font/otf";
  return "font/ttf";
};

const readFontAsDataUrl = async (path: string): Promise<string | null> => {
  const cached = fontDataUrlCache.get(path);
  if (cached) {
    return cached;
  }

  const task = fetch(path)
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";

      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }

      return `data:${getFontMimeType(path)};base64,${btoa(binary)}`;
    })
    .catch(() => null);

  fontDataUrlCache.set(path, task);
  return task;
};

const injectFontFaceMarkup = (svg: string, fontFacesCss: string): string => {
  const stylePattern = /<style[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/style>/;
  const styleMatch = svg.match(stylePattern);

  if (styleMatch) {
    const mergedCss = `${fontFacesCss}${styleMatch[1]}`;
    return svg.replace(
      stylePattern,
      `<style type="text/css"><![CDATA[${mergedCss}]]></style>`,
    );
  }

  const defsPattern = /<defs>\s*/;
  if (defsPattern.test(svg)) {
    return svg.replace(
      defsPattern,
      `<defs>\n\t<style type="text/css"><![CDATA[\n${fontFacesCss}]]></style>\n`,
    );
  }

  return svg;
};

/**
 * Embeds custom local fonts into exported SVG so downloaded files keep their intended typography.
 */
export const embedSvgFonts = async (svg: string): Promise<string> => {
  const customFonts = SUPPORTED_FONTS.filter(
    (font) => font.path && svg.includes(font.value),
  );

  if (customFonts.length === 0) {
    return svg;
  }

  const fontFaceBlocks = await Promise.all(
    customFonts.map(async (font) => {
      const dataUrl = await readFontAsDataUrl(font.path ?? "");
      if (!dataUrl) {
        return "";
      }

      return `\t\t@font-face {\n\t\t\tfont-family: '${font.value}';\n\t\t\tsrc: url('${dataUrl}');\n\t\t}\n`;
    }),
  );

  const fontFacesCss = fontFaceBlocks.filter(Boolean).join("");
  if (!fontFacesCss) {
    return svg;
  }

  return injectFontFaceMarkup(svg, fontFacesCss);
};
