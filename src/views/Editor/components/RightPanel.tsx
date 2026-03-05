import { Tabs, InputNumber, ColorPicker, Slider, Divider } from 'antd';

export default function RightPanel() {
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
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">布局</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <InputNumber prefix={<span className="text-gray-400 mr-1">X</span>} className="w-full" defaultValue={100} />
                    <InputNumber prefix={<span className="text-gray-400 mr-1">Y</span>} className="w-full" defaultValue={200} />
                    <InputNumber prefix={<span className="text-gray-400 mr-1">W</span>} className="w-full" defaultValue={300} />
                    <InputNumber prefix={<span className="text-gray-400 mr-1">H</span>} className="w-full" defaultValue={400} />
                  </div>
                </div>

                <Divider />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">填充</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ColorPicker defaultValue="#1677ff" showText />
                    <span className="text-gray-500">100%</span>
                  </div>
                </div>

                <Divider />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">透明度</span>
                    <span className="text-gray-800 font-medium">80%</span>
                  </div>
                  <Slider defaultValue={80} tooltip={{ open: false }} />
                </div>
              </div>
            ),
          }
        ]}
      />
    </aside>
  );
}