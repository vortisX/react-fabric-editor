/**
 * HistoryStack — 撤销 / 重做 历史记录管理
 *
 * 每次状态变更时将当前快照 push 进 undoStack；
 * 撤销时将快照移入 redoStack，重做时反向操作。
 */
export class HistoryStack<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  push(snapshot: T): void {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(current: T): T | null {
    if (this.undoStack.length === 0) return null;
    this.redoStack.push(current);
    return this.undoStack.pop()!;
  }

  redo(current: T): T | null {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push(current);
    return this.redoStack.pop()!;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
