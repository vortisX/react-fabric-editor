import React from 'react';
import { cn } from '../../utils/cn';

type IconProps = React.SVGProps<SVGSVGElement>;

/** 统一图标基础壳，封装公共的描边属性与默认尺寸。 */
const Icon: React.FC<IconProps & { d: string }> = ({ d, className, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cn('w-4 h-4', className)} {...props}>
    <path d={d} />
  </svg>
);

// ===== Header Icons =====
/** 撤销图标。 */
export const UndoIcon: React.FC<IconProps> = (props) => <Icon d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H3M3 10l4-4M3 10l4 4" {...props} />;
/** 重做图标。 */
export const RedoIcon: React.FC<IconProps> = (props) => <Icon d="M21 10H11a5 5 0 00-5 5v0a5 5 0 005 5h10M21 10l-4-4M21 10l-4 4" {...props} />;

// ===== LeftPanel Icons =====
/** 栅格/模板入口图标。 */
export const GridIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cn('w-4 h-4', props.className)} {...props}>
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);
/** 文本工具图标。 */
export const TypeIcon: React.FC<IconProps> = (props) => <Icon d="M4 7V4h16v3M9 20h6M12 4v16" {...props} />;
/** 图片工具图标。 */
export const ImageIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cn('w-4 h-4', props.className)} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
  </svg>
);

// ===== RightPanel Icons =====
/** 加粗图标。 */
export const BoldIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cn('w-4 h-4', props.className)} {...props}>
    <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" /><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
  </svg>
);
/** 斜体图标。 */
export const ItalicIcon: React.FC<IconProps> = (props) => <Icon d="M19 4h-9M14 20H5M15 4L9 20" {...props} />;
/** 下划线图标。 */
export const UnderlineIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cn('w-4 h-4', props.className)} {...props}>
    <path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3" /><line x1="4" y1="21" x2="20" y2="21" />
  </svg>
);
/** 删除线图标。 */
export const StrikethroughIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cn('w-4 h-4', props.className)} {...props}>
    <line x1="4" y1="12" x2="20" y2="12" />
    <path d="M17.5 7.5c-1.26-1.12-3.13-1.5-5.5-1.5-2.19 0-3.88.46-4.94 1.27A3.3 3.3 0 005.75 10" />
    <path d="M6.5 16.5c1.26 1.12 3.13 1.5 5.5 1.5 2.19 0 3.88-.46 4.94-1.27A3.3 3.3 0 0018.25 14" />
  </svg>
);
/** 左对齐图标。 */
export const AlignLeftIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cn('w-4 h-4', props.className)} {...props}>
    <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
    <line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
  </svg>
);
/** 居中对齐图标。 */
export const AlignCenterIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cn('w-4 h-4', props.className)} {...props}>
    <line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
    <line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" />
  </svg>
);
/** 右对齐图标。 */
export const AlignRightIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cn('w-4 h-4', props.className)} {...props}>
    <line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
    <line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" />
  </svg>
);
/** 两端对齐图标。 */
export const AlignJustifyIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cn('w-4 h-4', props.className)} {...props}>
    <line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
    <line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" />
  </svg>
);
