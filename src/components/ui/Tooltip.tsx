import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  title: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
}

/** 通用提示浮层，支持四个方向并通过 portal 渲染到 body。 */
export const Tooltip: React.FC<TooltipProps> = ({ title, placement = 'top', children }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** 根据触发元素位置与朝向计算 tooltip 的 anchor 坐标。 */
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    let top = 0, left = 0;
    switch (placement) {
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + gap;
        break;
      case 'top':
      default:
        top = rect.top - gap;
        left = rect.left + rect.width / 2;
        break;
    }
    setPosition({ top, left });
  }, [placement]);

  /** 鼠标悬停一小段时间后再展示 tooltip，避免快速划过时频繁闪烁。 */
  const show = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
    }, 400);
  };
  const hide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  /** 组件卸载时清理延时器，防止 setState 落在已卸载组件上。 */
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const arrowStyle: Record<string, React.CSSProperties> = {
    top:    { bottom: -4, left: '50%', marginLeft: -4, borderWidth: '4px 4px 0', borderColor: 'rgba(17,24,39,0.92) transparent transparent' },
    bottom: { top: -4, left: '50%', marginLeft: -4, borderWidth: '0 4px 4px', borderColor: 'transparent transparent rgba(17,24,39,0.92)' },
    left:   { right: -4, top: '50%', marginTop: -4, borderWidth: '4px 0 4px 4px', borderColor: 'transparent transparent transparent rgba(17,24,39,0.92)' },
    right:  { left: -4, top: '50%', marginTop: -4, borderWidth: '4px 4px 4px 0', borderColor: 'transparent rgba(17,24,39,0.92) transparent transparent' },
  };

  return (
    <div ref={triggerRef} className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && ReactDOM.createPortal(
        <div
          style={{
            top: position.top,
            left: position.left,
            animation: `tooltip-in-${placement} 0.18s cubic-bezier(0.16,1,0.3,1) both`,
          }}
          className="fixed z-50"
        >
          <div
            className="relative px-3 py-1.5 text-xs font-medium text-white rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(17,24,39,0.95), rgba(31,41,55,0.92))',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {title}
            {/* 小箭头单独用绝对定位实现，方便按 placement 复用不同朝向样式。 */}
            <span style={{ position: 'absolute', width: 0, height: 0, borderStyle: 'solid', ...arrowStyle[placement] }} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
