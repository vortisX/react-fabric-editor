import { ConfigProvider } from 'antd';
import { useEditorStore } from '../../store/useEditorStore';

import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import Workspace from './components/Workspace';
import RightPanel from './components/RightPanel';

export default function EditorView() {
  // 这里只用判断数据是否初始化完毕即可，不再需要读具体字段了
  const isReady = useEditorStore((state) => state.document !== null);

  if (!isReady) {
    return <div className="h-screen flex items-center justify-center">加载中...</div>;
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0d99ff',
          borderRadius: 4,
          fontSize: 12,
          colorText: '#333333',
          colorBorder: '#e5e5e5',
          controlHeight: 28,
        },
        components: {
          Tabs: { titleFontSize: 12, horizontalMargin: '0' },
          Divider: { marginLG: 12 }
        }
      }}
    >
      <div className="h-screen w-screen flex flex-col bg-[#e5e5e5] overflow-hidden text-[12px]">
        
        {/* 顶部 */}
        <Header />

        {/* 下方主体 */}
        <div className="flex-1 flex overflow-hidden">
          <LeftPanel />
          <Workspace />
          <RightPanel />
        </div>

      </div>
    </ConfigProvider>
  );
}