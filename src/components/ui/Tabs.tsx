import React, { useState } from 'react';
import { cn } from '../../utils/cn';

interface Tab {
  key: string;
  label: React.ReactNode;
  children: React.ReactNode;
}

interface TabsProps {
  items: Tab[];
  defaultActiveKey?: string;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ items, defaultActiveKey, className }) => {
  const [activeKey, setActiveKey] = useState(defaultActiveKey ?? items[0]?.key ?? '');
  const activeTab = items.find((t) => t.key === activeKey);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex border-b border-gray-100">
        {items.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveKey(tab.key)}
            className={cn(
              'px-4 py-2 text-[11px] font-medium cursor-pointer transition-colors border-b-2',
              tab.key === activeKey
                ? 'text-blue-600 border-blue-500'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1">{activeTab?.children}</div>
    </div>
  );
};
