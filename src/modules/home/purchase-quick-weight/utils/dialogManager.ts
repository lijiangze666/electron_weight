// 全局对话框状态管理器，用于完全隔离对话框状态
class DialogManager {
  private static instance: DialogManager;
  private isPriceDialogOpen = false;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): DialogManager {
    if (!DialogManager.instance) {
      DialogManager.instance = new DialogManager();
    }
    return DialogManager.instance;
  }

  // 设置单价对话框状态
  setPriceDialogOpen(isOpen: boolean) {
    this.isPriceDialogOpen = isOpen;
    this.notifyListeners();
  }

  // 获取单价对话框状态
  isPriceDialogCurrentlyOpen(): boolean {
    return this.isPriceDialogOpen;
  }

  // 添加状态变化监听器
  addListener(callback: () => void) {
    this.listeners.add(callback);
  }

  // 移除状态变化监听器
  removeListener(callback: () => void) {
    this.listeners.delete(callback);
  }

  // 通知所有监听器
  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }
}

export default DialogManager.getInstance();
