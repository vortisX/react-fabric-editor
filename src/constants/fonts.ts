export interface FontOption {
  label: string;
  value: string;
  path?: string; // 本地字体文件的相对路径 (存放于 public/fonts/)
}

export const SUPPORTED_FONTS: FontOption[] = [
  // 1. 基础系统字体 (无需额外加载)
  { label: "系统默认", value: "sans-serif" },
  { label: "衬线体", value: "serif" },
  { label: "等宽体", value: "monospace" },
  // 2. 本地化高级字体 (文件请放置在 public/fonts/ 目录下)
  // 这里的 path 为后期切换 CDN 预留了接口
  {
    label: "寒蝉活仿宋",
    value: "ChillHuoFangSong",
    path: "/fonts/ChillHuoFangSong.ttf",
  },
  {
    label: "思源黑体",
    value: "NotoSansSC",
    path: "/fonts/NotoSansSC-Regular.otf",
  },
  {
    label: "思源宋体",
    value: "NotoSerifSC",
    path: "/fonts/NotoSerifSC-Regular.otf",
  },
  {
    label: "阿里巴巴普惠体",
    value: "AlibabaPuHuiTi",
    path: "/fonts/Alibaba-PuHuiTi-Regular.ttf",
  },
  {
    label: "得意黑",
    value: "SmileySans",
    path: "/fonts/SmileySans-Oblique.ttf",
  },

  // 3. 常用英文
  { label: "Inter", value: "Inter", path: "/fonts/Inter-Regular.woff2" },
];
