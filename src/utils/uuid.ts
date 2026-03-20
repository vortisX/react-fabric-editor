/**
 * 生成带业务前缀的简易唯一 ID。
 * 这样既方便调试时一眼看出资源类型，也能避免不同实体之间的 id 混淆。
 */
export function genId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
