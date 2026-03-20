import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并多个类名输入，并自动消解 Tailwind CSS 的重复或冲突类。
 * @param inputs 要参与合并的类名片段。
 * @returns 适合直接挂到 `className` 上的最终字符串。
 */
export function cn(...inputs: ClassValue[]) {
  // 先用 clsx 处理条件拼接，再由 twMerge 清理 Tailwind 冲突类，避免后面的样式被前面的无效覆盖。
  return twMerge(clsx(inputs));
}
