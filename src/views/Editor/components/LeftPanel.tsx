import { Tooltip } from 'antd';
import { AppstoreOutlined, FontSizeOutlined, PictureOutlined } from '@ant-design/icons';

export default function LeftPanel() {
  return (
    <>
      <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 shrink-0 z-10">
        <Tooltip title="图层管理" placement="right">
          <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-lg cursor-pointer">
            <AppstoreOutlined />
          </div>
        </Tooltip>
        <Tooltip title="添加文字" placement="right">
          <div className="w-10 h-10 rounded-md text-gray-500 hover:bg-gray-100 flex items-center justify-center text-lg cursor-pointer transition-colors">
            <FontSizeOutlined />
          </div>
        </Tooltip>
        <Tooltip title="添加图片" placement="right">
          <div className="w-10 h-10 rounded-md text-gray-500 hover:bg-gray-100 flex items-center justify-center text-lg cursor-pointer transition-colors">
            <PictureOutlined />
          </div>
        </Tooltip>
      </aside>

      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
        <div className="h-10 border-b border-gray-100 flex items-center px-4 font-semibold text-gray-800">
          图层树 (Layers)
        </div>
        <div className="flex-1 p-2 overflow-y-auto">
          <div className="px-3 py-2 hover:bg-blue-50 rounded text-gray-600 cursor-pointer flex items-center gap-2 border border-transparent hover:border-blue-200 transition-colors">
            <PictureOutlined className="text-gray-400" /> 新人主图
          </div>
          <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded cursor-pointer flex items-center gap-2 border border-blue-200 font-medium">
            <FontSizeOutlined /> 请柬标题
          </div>
        </div>
      </aside>
    </>
  );
}