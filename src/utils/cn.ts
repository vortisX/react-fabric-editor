import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 将多个类名合并为一个字符串，并智能合并 Tailwind CSS 类。
 * @param inputs - 要合并的类值数组。
 * @returns 合并后的单个类名字符串。
 */
export function cn(...inputs: ClassValue[]) {
  // twMerge 会处理 clsx 生成的类字符串，合并重复或冲突的 Tailwind 类
  return twMerge(clsx(inputs));
}
