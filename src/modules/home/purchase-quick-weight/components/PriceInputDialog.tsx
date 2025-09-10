import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Portal
} from '@mui/material';
import dialogManager from '../utils/dialogManager';

interface PriceInputDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (price: string) => void;
  initialValue?: string;
}

// 完全独立的单价输入对话框组件
const PriceInputDialog: React.FC<PriceInputDialogProps> = React.memo(({
  open,
  onClose,
  onConfirm,
  initialValue = ""
}) => {
  const [inputPrice, setInputPrice] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // 只在对话框首次打开时初始化，避免重复渲染影响
  useEffect(() => {
    if (open && !isInitialized) {
      setInputPrice(initialValue);
      setIsInitialized(true);
      // 更新全局状态管理器
      dialogManager.setPriceDialogOpen(true);
      // 延迟聚焦确保DOM已渲染
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else if (!open && isInitialized) {
      // 对话框关闭时重置状态
      setIsInitialized(false);
      setInputPrice("");
      // 更新全局状态管理器
      dialogManager.setPriceDialogOpen(false);
    }
  }, [open, initialValue, isInitialized]);

  const handleConfirm = useCallback(() => {
    const trimmedPrice = inputPrice.trim();
    const numericPrice = parseFloat(trimmedPrice);
    if (trimmedPrice && numericPrice > 0) {
      onConfirm(trimmedPrice);
      onClose();
    }
  }, [inputPrice, onConfirm, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }, [handleConfirm, onClose]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 限制只能输入数字和一个小数点，且小数点后最多两位
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setInputPrice(value);
    }
  }, []);

  // 阻止事件冒泡，避免被父组件的键盘监听器干扰
  const handleDialogClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // 阻止所有键盘事件冒泡
  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  // 阻止所有键盘事件冒泡
  const handleDialogKeyUp = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  // 不渲染对话框直到初始化完成，避免闪烁
  if (!open) {
    return null;
  }

  return (
    <Portal>
      <Dialog 
        ref={dialogRef}
        open={open} 
        onClose={onClose}
        disableEscapeKeyDown={false}
        keepMounted={false}
        disablePortal={false}
        onClick={handleDialogClick}
        onKeyDown={handleDialogKeyDown}
        onKeyUp={handleDialogKeyUp}
        PaperProps={{
          onClick: handleDialogClick,
          onKeyDown: handleDialogKeyDown,
          onKeyUp: handleDialogKeyUp,
          sx: {
            borderRadius: 4,
            boxShadow: 6,
            minWidth: 380,
            background: 'linear-gradient(90deg, #e3eafc 0%, #fff 100%)',
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#1976d2', 
          fontWeight: 800, 
          fontSize: 22, 
          letterSpacing: 1, 
          textAlign: 'center', 
          pb: 1 
        }}>
          请输入单价
        </DialogTitle>
        <DialogContent 
          onClick={handleDialogClick}
          onKeyDown={handleDialogKeyDown}
          onKeyUp={handleDialogKeyUp}
        >
          <TextField
            ref={inputRef}
            autoFocus={false}
            margin="dense"
            label="单价 (元/斤)"
            type="text"
            fullWidth
            value={inputPrice}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="请输入单价"
            inputProps={{
              inputMode: 'decimal',
              style: { fontSize: 22, padding: '14px 12px', borderRadius: 8 }
            }}
            sx={{
              mt: 2,
              mb: 1,
              '& .MuiInputBase-root': {
                borderRadius: 2,
                fontSize: 22,
              },
              '& label': {
                fontSize: 18,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            onClick={onClose} 
            sx={{ 
              fontSize: 20, 
              borderRadius: 3, 
              px: 4, 
              py: 1.5 
            }}
          >
            取消
          </Button>
          <Button 
            onClick={handleConfirm} 
            variant="contained" 
            sx={{ 
              fontSize: 20, 
              borderRadius: 3, 
              px: 4, 
              py: 1.5, 
              fontWeight: 700 
            }}
          >
            确定
          </Button>
        </DialogActions>
      </Dialog>
    </Portal>
  );
});

PriceInputDialog.displayName = 'PriceInputDialog';

export default PriceInputDialog;
