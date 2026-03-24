import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CollapsiblePanelRef {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export interface CollapsiblePanelProps {
  /** 决定按钮在左边缘还是右边缘 */
  position: 'left' | 'right';
  /** 展开时的总宽度 */
  defaultWidth: number;
  /** 折叠后的宽度（如 56px 或 48px） */
  collapsedWidth: number;
  /** 折叠时仍显示的图标区域 */
  iconSlot?: React.ReactNode;
  /** 默认面板内容，折叠时透明/隐藏 */
  children: React.ReactNode;
  /** 自定义外层样式 */
  className?: string;
  /** 受控状态下的折叠属性 */
  collapsed?: boolean;
  /** 受控状态下的变更回调 */
  onCollapseChange?: (collapsed: boolean) => void;
}

/**
 * 可折叠面板组件，支持在侧边悬浮箭头按钮进行平滑折叠展开。
 */
export const CollapsiblePanel = forwardRef<CollapsiblePanelRef, CollapsiblePanelProps>(
  (
    {
      position,
      defaultWidth,
      collapsedWidth,
      iconSlot,
      children,
      className,
      collapsed: controlledCollapsed,
      onCollapseChange,
    },
    ref
  ) => {
    const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(false);

    const isControlled = controlledCollapsed !== undefined;
    const isCollapsed = isControlled ? controlledCollapsed : uncontrolledCollapsed;

    const toggleCollapse = () => {
      const nextCollapsed = !isCollapsed;
      if (!isControlled) {
        setUncontrolledCollapsed(nextCollapsed);
      }
      onCollapseChange?.(nextCollapsed);
    };

    useImperativeHandle(ref, () => ({
      isCollapsed,
      toggleCollapse,
    }));

    // 根据折叠状态计算当前外层宽度
    const currentWidth = isCollapsed ? collapsedWidth : defaultWidth;
    // 内部内容区的固定宽度，避免折叠过程中文字频繁换行挤压
    const contentWidth = defaultWidth - (iconSlot ? collapsedWidth : 0);

    return (
      <aside
        className={cn(
          'relative flex shrink-0 bg-white z-10 transition-all duration-300 ease-in-out shadow-sm',
          className
        )}
        style={{ width: currentWidth }}
      >
        {/* 左侧面板：图标在左，内容在右 */}
        {position === 'left' && iconSlot && (
          <div className="shrink-0 h-full overflow-hidden" style={{ width: collapsedWidth }}>
            {iconSlot}
          </div>
        )}

        {/* 内容区 */}
        <div
          className={cn(
            'flex-1 overflow-hidden transition-opacity duration-300',
            isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          <div style={{ width: contentWidth, height: '100%' }}>
            {children}
          </div>
        </div>

        {/* 右侧面板：如果未来有图标在右的情况 */}
        {position === 'right' && iconSlot && (
          <div className="shrink-0 h-full overflow-hidden" style={{ width: collapsedWidth }}>
            {iconSlot}
          </div>
        )}

        {/* 折叠/展开 触发按钮 */}
        <button
          type="button"
          onClick={toggleCollapse}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-20 flex h-16 w-4 items-center justify-center bg-white border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors',
            position === 'left'
              ? '-right-4 rounded-r-md border-l-0'
              : '-left-4 rounded-l-md border-r-0'
          )}
          aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {position === 'left' ? (
            isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />
          ) : (
            isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />
          )}
        </button>
      </aside>
    );
  }
);

CollapsiblePanel.displayName = 'CollapsiblePanel';
