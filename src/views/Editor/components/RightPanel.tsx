import { Tabs, InputNumber, ColorPicker, Slider, Divider } from 'antd';
import { useEditorStore } from '../../../store/useEditorStore';
import type { TextLayer } from '../../../types/schema';

export default function RightPanel() {
  // 1. 从大脑中读取当前选中的图层 ID 和整个文档数据
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const document = useEditorStore((state) => state.document);

  // 2. 找到当前真正被选中的那个图层对象
  const activeLayer = document?.pages[0]?.layers.find(
    (layer) => layer.id === activeLayerId
  );

  // 3. 空状态防御：如果什么都没选中，展示极其优雅的提示
  if (!activeLayer) {
    return (
      <aside className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
        <div className="h-10 border-b border-gray-100 flex items-center px-4 font-semibold text-gray-800 tracking-wide">
          属性 (Inspector)
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs text-center leading-relaxed">
          请在画布中点击选中元素<br/>以进行编辑
        </div>
      </aside>
    );
  }

  // 预判类型：因为目前只有文字，我们先把它断言为 TextLayer 以读取 fill 等专属属性
  const isTextLayer = activeLayer.type === 'text';
  const textLayer = activeLayer as TextLayer;

  // 4. 渲染真实的属性控制面板 (数据驱动视图)
  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
      <Tabs 
        defaultActiveKey="1" 
        className="w-full"
        items={[
          {
            key: '1',
            label: <span className="px-4">设计 (Design)</span>,
            children: (
              <div className="p-4 flex flex-col gap-4">
                
                {/* 坐标与尺寸控制组 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">布局</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* 重点：将 defaultValue 改为 value，它就会死死绑定 Zustand 里的真实数据，并用 Math.round 去掉恶心的小数点 */}
                    <InputNumber prefix={<span className="text-gray-400 mr-1">X</span>} className="w-full" value={Math.round(activeLayer.x)} readOnly />
                    <InputNumber prefix={<span className="text-gray-400 mr-1">Y</span>} className="w-full" value={Math.round(activeLayer.y)} readOnly />
                    <InputNumber prefix={<span className="text-gray-400 mr-1">W</span>} className="w-full" value={Math.round(activeLayer.width)} readOnly />
                    <InputNumber prefix={<span className="text-gray-400 mr-1">H</span>} className="w-full" value={Math.round(activeLayer.height)} readOnly />
                  </div>
                </div>

                <Divider />

                {/* 颜色控制组 (仅当图层是文字时才显示) */}
                {isTextLayer && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">填充</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPicker value={textLayer.fill} showText disabled />
                      <span className="text-gray-500">100%</span>
                    </div>
                  </div>
                )}

                <Divider />

                {/* 透明度控制组 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">透明度</span>
                    <span className="text-gray-800 font-medium">{Math.round(activeLayer.opacity * 100)}%</span>
                  </div>
                  <Slider value={activeLayer.opacity * 100} tooltip={{ open: false }} disabled />
                </div>

              </div>
            ),
          }
        ]}
      />
    </aside>
  );
}