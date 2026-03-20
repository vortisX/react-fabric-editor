import { useEditorStore } from "../../store/useEditorStore";

/**
 * Export the current design document JSON blob from the store.
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
