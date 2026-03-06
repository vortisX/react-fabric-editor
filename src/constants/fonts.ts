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
    label: "Aa狂派手书",
    value: "AaKuangPaiShouShu-2",
    path: "/fonts/AaKuangPaiShouShu-2.ttf",
  },
];
