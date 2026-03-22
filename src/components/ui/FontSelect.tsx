import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import type { FontOption, FontLicense } from '../../constants/fonts';

interface FontSelectProps {
  value: string;
  onChange?: (value: string) => void;
  options: FontOption[];
  className?: string;
}

const LICENSE_STYLES: Record<FontLicense, string> = {
  free: 'bg-green-50 text-green-600 border-green-200',
  vip: 'bg-amber-50 text-amber-600 border-amber-200',
};

/** 字体授权标记，帮助用户在选择字体时区分免费与 VIP 资源。 */
function LicenseBadge({ license }: { license?: FontLicense }) {
  const { t } = useTranslation();
  if (!license) return null;

  const label = license === 'free' ? t('rightPanel.licenseFree') : t('rightPanel.licenseVip');

  return (
    <span className={cn('text-[9px] leading-none px-1 py-0.5 rounded border shrink-0', LICENSE_STYLES[license])}>
      {label}
    </span>
  );
}

/** 支持搜索、预览和授权标记的字体下拉选择器。 */
export function FontSelect({ value, onChange, options, className }: FontSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 点击外部关闭下拉。
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 展开时自动聚焦搜索框。
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selected = options.find((o) => o.value === value);

  // 搜索过滤：匹配 label 或 value（大小写不敏感）。
  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const keyword = search.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(keyword) || o.value.toLowerCase().includes(keyword),
    );
  }, [options, search]);

  const handleSelect = (fontValue: string) => {
    onChange?.(fontValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* 已选字体展示按钮 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-7 px-2 text-xs bg-[#f5f5f5] rounded border border-transparent hover:border-gray-300 flex items-center justify-between cursor-pointer transition-colors"
      >
        <span className="truncate">
          {selected?.label ?? value}
        </span>
        <svg
          className={cn('w-3 h-3 text-gray-400 shrink-0 transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg flex flex-col overflow-hidden">
          {/* 搜索框 */}
          <div className="px-2 py-1.5 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('rightPanel.searchFont')}
              className="w-full h-6 px-2 text-xs bg-[#f5f5f5] rounded border border-transparent focus:border-blue-400 outline-none transition-colors"
            />
          </div>

          {/* 字体列表 */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'px-2.5 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors flex items-center justify-between gap-2',
                    opt.value === value && 'bg-blue-50 text-blue-600',
                  )}
                >
                  <span
                    className="text-[15px] leading-snug truncate"
                  >
                    {opt.label}
                  </span>
                  <LicenseBadge license={opt.license} />
                </div>
              ))
            ) : (
              <div className="px-2 py-3 text-xs text-gray-400 text-center">
                {t('rightPanel.noFontFound')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
