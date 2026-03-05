/**
 * 生成带前缀的唯一 ID
 * 示例: genId("layer") → "layer_k7x2m9p1"
 */
export function genId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
