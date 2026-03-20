import { useEditorStore } from "../../store/useEditorStore";

/**
 * 从 Store 导出当前设计文档的 JSON Blob。
 */
export const exportJsonBlob = (): Blob => {
  const documentState = useEditorStore.getState().document;
  if (!documentState) {
    throw new Error("EXPORT_FAILED");
  }

  return new Blob([JSON.stringify(documentState, null, 2)], {
    type: "application/json;charset=utf-8",
  });
};
