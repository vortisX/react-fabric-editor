import { type ReactNode, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "../../utils/cn";

interface DialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  showCloseButton?: boolean;
  closeDisabled?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  overlayClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  headerAdornment?: ReactNode;
}

/**
 * Reusable modal dialog with portal rendering and accessible close behaviors.
 */
export const Dialog = ({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  closeLabel,
  showCloseButton = true,
  closeDisabled = false,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  overlayClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  headerAdornment,
}: DialogProps) => {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open || !closeOnEscape || closeDisabled || !onClose) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDisabled, closeOnEscape, onClose, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;

    // 为什么锁定 body 滚动：避免弹窗打开后背景继续滚动，导致工具面板交互感发散。
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center px-4 py-6",
        "bg-slate-950/45 backdrop-blur-[2px]",
        overlayClassName,
      )}
      onClick={() => {
        if (closeOnOverlayClick && !closeDisabled) {
          onClose?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "relative flex max-h-[min(88vh,860px)] w-full flex-col overflow-hidden",
          "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]",
          panelClassName,
        )}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div
          className={cn(
            "flex items-start justify-between gap-4 border-b border-slate-200/80",
            "bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(239,246,255,0.96))] px-6 py-5",
            headerClassName,
          )}
        >
          <div className="min-w-0 space-y-1.5">
            <h2 id={titleId} className="text-lg font-semibold text-slate-950">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-sm leading-6 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-start gap-2">
            {headerAdornment}
            {showCloseButton ? (
              <button
                type="button"
                aria-label={closeLabel}
                disabled={closeDisabled}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors",
                  "border-slate-200 bg-white/85 text-slate-500 shadow-sm backdrop-blur-sm",
                  "hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50",
                )}
                onClick={() => {
                  onClose?.();
                }}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-6", bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <div
            className={cn(
              "flex items-center justify-end gap-2 border-t border-slate-200/80 bg-slate-50/80 px-6 py-4",
              footerClassName,
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
