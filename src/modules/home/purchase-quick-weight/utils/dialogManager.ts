// 全局对话框状态管理器，用于完全隔离对话框状态
class DialogManager {
  private static instance: DialogManager;
  private isPriceDialogOpen = false;
  private isCellEditing = false;
  private isArchivedCellEditing = false;
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

  // 设置单元格编辑状态
  setCellEditing(isEditing: boolean) {
    this.isCellEditing = isEditing;
    this.notifyListeners();
  }

  // 获取单元格编辑状态
  isCellCurrentlyEditing(): boolean {
    return this.isCellEditing;
  }

  // 设置归档单元格编辑状态
  setArchivedCellEditing(isEditing: boolean) {
    this.isArchivedCellEditing = isEditing;
    this.notifyListeners();
  }

  // 获取归档单元格编辑状态
  isArchivedCellCurrentlyEditing(): boolean {
    return this.isArchivedCellEditing;
  }

  // 检查是否有任何编辑状态
  isAnyEditingActive(): boolean {
    return this.isPriceDialogOpen || this.isCellEditing || this.isArchivedCellEditing;
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
