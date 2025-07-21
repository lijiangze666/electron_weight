import React, { useEffect, useState, useRef } from "react";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import TableFooter from "@mui/material/TableFooter";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import Checkbox from "@mui/material/Checkbox";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import axios from "axios";

const { ipcRenderer } = window.require
  ? window.require("electron")
  : { ipcRenderer: null };

interface RecordItem {
  id: string;
  dbId?: number; // 数据库ID，用于判断是否已保存
  time: string;
  supplier: string; // 新增：供应商名称
  item: string;
  maozhong: number | null;
  pizhong: number | null;
  jingzhong: number | null;
  unit: string;
  price: number | null; // 单价
  amount: number;
  is_archived?: number; // 新增：是否已归档
}

// 编辑状态接口
interface EditState {
  id: string;
  field: string;
  value: string;
}

export default function PurchaseQuickWeight() {
  const [serialData, setSerialData] = useState("");
  const lastWeightRef = useRef<number | null>(null);
  const stableCountRef = useRef(0);
  const [isStable, setIsStable] = useState(false);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  // 上方表格单选id
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 下方表格单选id
  const [selectedArchivedId, setSelectedArchivedId] = useState<string | null>(null);
  // 单价输入弹窗相关状态
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [inputPrice, setInputPrice] = useState("");
  // 归档数据和筛选状态
  const [archivedRecords, setArchivedRecords] = useState<RecordItem[]>([]);
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
  // 编辑状态
  const [editingCell, setEditingCell] = useState<EditState | null>(null);
  // 归档数据编辑状态
  const [editingArchivedCell, setEditingArchivedCell] = useState<EditState | null>(null);
  // 归档表格多选选中行id
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<string[]>([]);
  // 新增成功提示状态
  const [successMsg, setSuccessMsg] = useState("");
  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 新增：缩放比例
  const DESIGN_WIDTH = 2560; // 设计稿宽度
  const DESIGN_HEIGHT = 1440; // 设计稿高度
  const [scale, setScale] = useState(1);

  useEffect(() => {
    ipcRenderer.send("open-serialport");

    const handler = (_event: any, data: string) => {
      const match = data.match(/[+-]?\d+/);
      if (match) {
        // 原始数据是克，除以1000并取整
        const weight = Math.floor(parseInt(match[0], 10) / 1000);
        setSerialData(`${weight}`);
        setIsStable(true);
      } else {
        setIsStable(false);
      }
    };
    ipcRenderer.on("serialport-data", handler);
    
    // 页面加载时默认查询所有数据到上方表格
    handleQueryAllRecords();
    
    return () => {
      ipcRenderer.removeListener("serialport-data", handler);
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      const scaleW = window.innerWidth / DESIGN_WIDTH;
      const scaleH = window.innerHeight / DESIGN_HEIGHT;
      const newScale = Math.min(scaleW, scaleH, 1); // 最大不超过1
      setScale(newScale);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 生成随机单据号
  const genId = () => Math.random().toString(36).slice(2, 10).toUpperCase();
  
  // 格式化时间为 yyyy-MM-dd HH:mm:ss
  const formatTime = (time: any) => {
    if (!time) return '';
    const date = new Date(time);
    if (isNaN(date.getTime())) return time; // 如果转换失败，返回原值
    
    return date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0') + ' ' + 
      String(date.getHours()).padStart(2, '0') + ':' + 
      String(date.getMinutes()).padStart(2, '0') + ':' + 
      String(date.getSeconds()).padStart(2, '0');
  };
  
  // 获取当前时间字符串
  const getTime = () => {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0") +
      " " +
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0") +
      ":" +
      String(d.getSeconds()).padStart(2, "0")
    );
  };

  // 新增一条空数据时，item默认为小麦
  const handleAdd = () => {
    setRecords([
      ...records,
      {
        id: genId(),
        dbId: undefined, // 新增记录没有数据库ID
        time: getTime(),
        supplier: "散户", // 默认赋值"散户"
        item: "小麦", // 默认为小麦
        maozhong: null,
        pizhong: null,
        jingzhong: null,
        unit: "公斤",
        price: null,
        amount: 0,
        is_archived: 0
      },
    ]);
  };

  // 自动保存数据到数据库
  const autoSaveRecord = async (recordId: string | null, successMessage: string, recordOverride?: RecordItem) => {
    if (!recordId) {
      setError("记录ID不能为空");
      setOpen(true);
      return;
    }
    try {
      // 优先用传入的新数据
      const recordToSave = recordOverride ?? records.find(r => r.id === recordId);
      if (!recordToSave) {
        setError("找不到要保存的记录");
        setOpen(true);
        return;
      }
      // 准备保存的数据
      const saveData = {
        bill_no: recordToSave.id,
        time: recordToSave.time,
        supplier: recordToSave.supplier,
        item: recordToSave.item,
        maozhong: recordToSave.maozhong ? Math.round(recordToSave.maozhong) : null,
        pizhong: recordToSave.pizhong ? Math.round(recordToSave.pizhong) : null,
        jingzhong: recordToSave.jingzhong ? Math.round(recordToSave.jingzhong) : null,
        unit: recordToSave.unit,
        price: recordToSave.price,
        amount: recordToSave.amount ? Math.round(recordToSave.amount) : 0,
        is_deleted: 0,
        is_archived: recordToSave.is_archived ?? 0
      };
      console.log('自动保存数据:', saveData);
      let res;
      if (recordToSave.dbId !== undefined) {
        // 数据已存在，调用更新接口
        console.log('自动保存：数据已存在，调用更新接口');
        res = await axios.put(`http://localhost:3001/api/purchase-weight/${recordToSave.id}`, saveData);
      } else {
        // 数据不存在，调用插入接口
        console.log('自动保存：数据不存在，调用插入接口');
        res = await axios.post("http://localhost:3001/api/purchase-weight", saveData);
      }
      console.log('自动保存响应:', res.data);
      if (res.data.code === 0) {
        // 保存成功，如果是插入操作，更新记录的数据库ID
        if (recordToSave.dbId === undefined && res.data.data?.id) {
          setRecords(prev => prev.map(record => {
            if (record.id === recordId) {
              return { ...record, dbId: res.data.data.id };
            }
            return record;
          }));
        }
        setSuccessMsg(successMessage);
        setOpen(true);
      } else {
        setError(res.data.msg || "自动保存失败！");
        setOpen(true);
      }
    } catch (err) {
      console.error('自动保存错误详情:', err);
      const errorMsg = (err as any).message || String(err);
      setError("自动保存失败：" + errorMsg);
      setOpen(true);
    }
  };

  // 保存选中行到归档
  const handleSaveSelected = async () => {
    if (!selectedId) return;
    const toSave = records.find(r => r.id === selectedId);
    if (toSave) {
      // 校验毛重、皮重、单价必须有值
      if (
        toSave.maozhong === null
      ) {
        setError("毛重必须填写！");
        setOpen(true);
        return;
      }
      try {
        // 准备保存的数据
        const saveData = {
          bill_no: toSave.id,
          time: toSave.time,
          supplier: toSave.supplier,
          item: toSave.item,
          maozhong: toSave.maozhong ? Math.round(toSave.maozhong) : null,
          pizhong: toSave.pizhong ? Math.round(toSave.pizhong) : null,
          jingzhong: toSave.jingzhong ? Math.round(toSave.jingzhong) : null,
          unit: toSave.unit,
          price: toSave.price,
          amount: toSave.amount ? Math.round(toSave.amount) : 0,
          is_deleted: 0
        };
        
        console.log('准备保存的数据:', saveData);
        
        let res;
        if (toSave.dbId !== undefined) {
          // 数据已存在，调用更新接口
          console.log('数据已存在，调用更新接口');
          res = await axios.put(`http://localhost:3001/api/purchase-weight/${toSave.id}`, saveData);
        } else {
          // 数据不存在，调用插入接口
          console.log('数据不存在，调用插入接口');
          res = await axios.post("http://localhost:3001/api/purchase-weight", saveData);
        }
        
        console.log('保存响应:', res.data);
        
        if (res.data.code === 0) {
          // 保存成功，如果是插入操作，更新记录的数据库ID
          if (toSave.dbId === undefined && res.data.data?.id) {
            setRecords(prev => prev.map(record => {
              if (record.id === toSave.id) {
                return { ...record, dbId: res.data.data.id };
              }
              return record;
            }));
          }
          
          setSuccessMsg(toSave.dbId !== undefined ? "更新成功！" : "保存成功！");
          setOpen(true);
          setSelectedId(null);
        } else {
          setError(res.data.msg || "保存失败！");
          setOpen(true);
        }
      } catch (err) {
        console.error('保存错误详情:', err);
        const errorMsg = (err as any).message || String(err);
        setError("保存失败：" + errorMsg);
        setOpen(true);
      }
    }
  };

  // 删除选中行
  const handleDelete = () => {
    if (!selectedId) return;
    
    // 查找要删除的记录
    const recordToDelete = records.find(r => r.id === selectedId);
    if (!recordToDelete) return;
    
    // 检查是否已保存（通过检查是否有数据库ID）
    const isSaved = recordToDelete.dbId !== undefined;
    
    if (isSaved) {
      // 已保存的数据，需要调用后端删除接口
      setDeleteConfirmId(selectedId);
      setDeleteConfirmOpen(true);
    } else {
      // 未保存的数据，直接从页面删除
      setRecords(records.filter((r) => r.id !== selectedId));
      setSelectedId(null);
      setSuccessMsg("删除成功！");
      setOpen(true);
    }
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      console.log('准备删除记录，单据号:', deleteConfirmId);
      
      // 调用后端删除接口
      const response = await axios.delete(`http://localhost:3001/api/purchase-weight/${deleteConfirmId}`);
      
      console.log('删除响应:', response.data);
      
      if (response.data.code === 0) {
        // 删除成功，从本地状态中移除
        setRecords(records.filter((r) => r.id !== deleteConfirmId));
        setSelectedId(null);
        setSuccessMsg("删除成功！");
        setOpen(true);
      } else {
        setError(response.data.msg || "删除失败！");
        setOpen(true);
      }
    } catch (err) {
      console.error('删除错误详情:', err);
      const errorMsg = (err as any).message || String(err);
      setError("删除失败：" + errorMsg);
      setOpen(true);
    } finally {
      // 关闭确认对话框
      setDeleteConfirmOpen(false);
      setDeleteConfirmId(null);
    }
  };

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDeleteConfirmId(null);
  };

  // 查询所有记录到上方表格
  const handleQueryAllRecords = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/purchase-weight');
      if (response.data.code === 0) {
        const allRecords = response.data.data.map((record: any) => ({
          id: record.bill_no,
          dbId: record.id, // 添加数据库ID
          time: formatTime(record.time),
          supplier: record.supplier,
          item: record.item,
          maozhong: record.maozhong ? Math.round(record.maozhong) : null,
          pizhong: record.pizhong ? Math.round(record.pizhong) : null,
          jingzhong: record.jingzhong ? Math.round(record.jingzhong) : null,
          unit: record.unit,
          price: record.price,
          amount: record.amount ? Math.round(record.amount) : 0,
          is_archived: record.is_archived
        }));
        setRecords(allRecords); // 将查询到的所有记录显示在上方表格中
        // setSuccessMsg(`查询成功，共找到 ${allRecords.length} 条记录`);
        // setOpen(true);
      } else {
        setError(response.data.msg || '查询失败');
        setOpen(true);
      }
    } catch (err) {
      const errorMsg = (err as any).message || String(err);
      setError('查询失败：' + errorMsg);
      setOpen(true);
    }
  };

  // 点击毛重，弹窗输入单价
  const handleMaozhong = () => {
    if (
      isStable &&
      serialData &&
      records.length > 0 &&
      selectedId
    ) {
      setPriceDialogOpen(true);
      setInputPrice("");
    }
  };

  // 修正金额计算逻辑：金额 = 单价 * 净重 * 2
  // handlePizhong
  const handlePizhong = async () => {
    if (
      isStable &&
      serialData &&
      records.length > 0 &&
      selectedId
    ) {
      // 找到要归档的那条数据
      const row = records.find(r => r.id === selectedId && r.maozhong !== null);
      if (!row || row.maozhong == null) return;

      const pizhong = Math.round(Number(serialData));
      if (pizhong >= row.maozhong) {
        setError("皮重不能大于等于毛重！");
        setOpen(true);
        return;
      }
      const jingzhong = Math.round(row.maozhong - pizhong);
      const amount = row.price ? Math.round((jingzhong * row.price) * 2) : 0;
      const archivedRecord = { ...row, pizhong, jingzhong, amount, is_archived: 1 };

      // 移除上方表格的这条数据
      setRecords(records.filter(r => r.id !== selectedId));

      // 保存归档数据到数据库
      await autoSaveRecord(selectedId, "皮重已保存！", archivedRecord);
      // 刷新下方表格
      handleQueryArchivedRecords();
    }
  };

  // 确认输入单价
  const handlePriceConfirm = async () => {
    const priceValue = parseFloat(inputPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError("请输入有效的单价");
      setOpen(true);
      return;
    }

    // 限制小数点后两位
    const roundedPrice = Math.round(priceValue * 100) / 100;

    // 先算出新数据
    let newRecord: RecordItem | undefined;
    const newRecords = records.map((row) => {
      if (row.id === selectedId) {
        const maozhong = Math.round(Number(serialData));
        let jingzhong = null;
        let amount = 0;
        if (row.pizhong !== null) {
          jingzhong = Math.round(maozhong - row.pizhong);
          amount = Math.round((jingzhong * roundedPrice) * 2);
        }
        newRecord = { ...row, maozhong, price: roundedPrice, jingzhong, amount };
        return newRecord;
      }
      return row;
    });

    setRecords(newRecords);
    setPriceDialogOpen(false);

    // 用新数据去保存
    if (selectedId && newRecord) {
      await autoSaveRecord(selectedId, "毛重和单价已保存！", newRecord);
    }
  };

  // 汇总计算
  const totalJingzhong = Math.round(records.reduce(
    (sum, r) => sum + (r.jingzhong || 0),
    0
  ));
  const totalAmount = Math.round(records.reduce((sum, r) => sum + (r.amount || 0), 0));

  // 归档表格筛选逻辑
  const filteredArchived = archivedRecords.filter((r) => {
    if (filterStart && dayjs(r.time).isBefore(dayjs(filterStart))) return false;
    if (filterEnd && dayjs(r.time).isAfter(dayjs(filterEnd))) return false;
    return true;
  });

  // 归档表格统计
  const totalArchivedJingzhong = Math.round(filteredArchived.reduce(
    (sum, r) => sum + (r.jingzhong || 0),
    0
  ));
  const totalArchivedAmount = Math.round(filteredArchived.reduce(
    (sum, r) => sum + (r.amount || 0),
    0
  ));

  // 开始编辑单元格
  const handleCellEdit = (id: string, field: string, currentValue: any) => {
    setEditingCell({
      id,
      field,
      value: currentValue !== null ? currentValue.toString() : ""
    });
  };

  // 保存编辑（现在只做退出编辑）
  const handleCellSave = () => {
    setEditingCell(null);
  };

  // 取消编辑
  const handleCellCancel = () => {
    setEditingCell(null);
  };

  // 处理编辑输入变化
  const handleEditChange = (value: string) => {
    if (editingCell) {
      setEditingCell({ ...editingCell, value });
    }
  };

  // 处理编辑键盘事件
  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  // 开始编辑归档数据单元格
  const handleArchivedCellEdit = (id: string, field: string, currentValue: any) => {
    setEditingArchivedCell({
      id,
      field,
      value: currentValue !== null ? currentValue.toString() : ""
    });
  };

  // 保存归档数据编辑（现在只做退出编辑）
  const handleArchivedCellSave = () => {
    setEditingArchivedCell(null);
  };

  // 取消编辑归档数据
  const handleArchivedCellCancel = () => {
    setEditingArchivedCell(null);
  };

  // 处理归档数据编辑输入变化
  const handleArchivedEditChange = (value: string) => {
    if (editingArchivedCell) {
      setEditingArchivedCell({ ...editingArchivedCell, value });
    }
  };

  // 处理归档数据编辑键盘事件
  const handleArchivedEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleArchivedCellSave();
    } else if (e.key === 'Escape') {
      handleArchivedCellCancel();
    }
  };

  // 实时更新 records
  const handleCellChangeImmediate = (id: string, field: string, value: string) => {
    setRecords(prev => prev.map(record => {
      if (record.id === id) {
        const updatedRecord = { ...record };
        switch (field) {
          case 'item':
            updatedRecord.item = value;
            break;
          case 'maozhong': {
            const maozhong = Math.round(parseFloat(value));
            if (updatedRecord.pizhong !== null && !isNaN(maozhong) && maozhong <= updatedRecord.pizhong) {
              setError("毛重必须大于皮重！");
              setOpen(true);
              return record;
            }
            updatedRecord.maozhong = isNaN(maozhong) ? null : maozhong;
            if (updatedRecord.pizhong !== null && updatedRecord.maozhong !== null) {
              updatedRecord.jingzhong = Math.round(updatedRecord.maozhong - updatedRecord.pizhong);
              updatedRecord.amount = updatedRecord.price ? Math.round(updatedRecord.jingzhong * updatedRecord.price * 2) : 0;
            }
            break;
          }
          case 'pizhong': {
            const pizhong = Math.round(parseFloat(value));
            if (updatedRecord.maozhong !== null && !isNaN(pizhong) && pizhong >= updatedRecord.maozhong) {
              setError("皮重不能大于等于毛重！");
              setOpen(true);
              return record;
            }
            updatedRecord.pizhong = isNaN(pizhong) ? null : pizhong;
            if (updatedRecord.maozhong !== null && updatedRecord.pizhong !== null) {
              updatedRecord.jingzhong = Math.round(updatedRecord.maozhong - updatedRecord.pizhong);
              updatedRecord.amount = updatedRecord.price ? Math.round(updatedRecord.jingzhong * updatedRecord.price * 2) : 0;
            }
            break;
          }
          case 'price':
            const price = parseFloat(value);
            const roundedPrice = isNaN(price) ? null : Math.round(price * 100) / 100;
            updatedRecord.price = roundedPrice;
            if (updatedRecord.jingzhong !== null && updatedRecord.price !== null) {
              updatedRecord.amount = updatedRecord.jingzhong * updatedRecord.price * 2;
            }
            break;
          case 'unit':
            updatedRecord.unit = value;
            break;
          case 'supplier':
            updatedRecord.supplier = value;
            break;
        }
        return updatedRecord;
      }
      return record;
    }));
  };

  // 实时更新 archivedRecords
  const handleArchivedCellChangeImmediate = (id: string, field: string, value: string) => {
    setArchivedRecords(prev => prev.map(record => {
      if (record.id === id) {
        const updatedRecord = { ...record };
        switch (field) {
          case 'item':
            updatedRecord.item = value;
            break;
          case 'maozhong':
            const maozhong = Math.round(parseFloat(value));
            updatedRecord.maozhong = isNaN(maozhong) ? null : maozhong;
            if (updatedRecord.pizhong !== null && updatedRecord.maozhong !== null) {
              updatedRecord.jingzhong = Math.round(updatedRecord.maozhong - updatedRecord.pizhong);
              updatedRecord.amount = updatedRecord.price ? Math.round(updatedRecord.jingzhong * updatedRecord.price * 2) : 0;
            }
            break;
          case 'pizhong':
            const pizhong = Math.round(parseFloat(value));
            updatedRecord.pizhong = isNaN(pizhong) ? null : pizhong;
            if (updatedRecord.maozhong !== null && updatedRecord.pizhong !== null) {
              updatedRecord.jingzhong = Math.round(updatedRecord.maozhong - updatedRecord.pizhong);
              updatedRecord.amount = updatedRecord.price ? Math.round(updatedRecord.jingzhong * updatedRecord.price * 2) : 0;
            }
            break;
          case 'price':
            const price = parseFloat(value);
            const roundedPrice = isNaN(price) ? null : Math.round(price * 100) / 100;
            updatedRecord.price = roundedPrice;
            if (updatedRecord.jingzhong !== null && updatedRecord.price !== null) {
              updatedRecord.amount = updatedRecord.jingzhong * updatedRecord.price * 2;
            }
            break;
          case 'unit':
            updatedRecord.unit = value;
            break;
        }
        return updatedRecord;
      }
      return record;
    }));
  };

  // 可编辑单元格组件（移到组件外部，并用React.memo包裹）
  const EditableCell = React.memo(({
    record,
    field,
    value,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onChange,
    onKeyPress,
    trigger
  }: {
    record: any;
    field: string;
    value: any;
    isEditing: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onChange: (value: string) => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
    trigger: 'double' | 'single';
  }) => {
    const [localValue, setLocalValue] = React.useState(value);

    // 当编辑状态改变时，更新本地值
    React.useEffect(() => {
      setLocalValue(value);
    }, [value, isEditing]);

    const handleSave = () => {
      if (localValue !== value) {
        onChange(localValue);
      }
      onSave();
    };

    const handleCancel = () => {
      setLocalValue(value); // 恢复原值
      onCancel();
    };

    if (isEditing) {
      if (field === 'item') {
        return (
          <Select
            value={localValue ?? ""}
            onChange={e => setLocalValue(e.target.value)}
            onBlur={handleSave}
            autoFocus
            size="small"
            sx={{ fontSize: '20px', minWidth: 80 }}
            MenuProps={{ PaperProps: { sx: { fontSize: '20px' } } }}
          >
            <MenuItem value="小麦" sx={{ fontSize: '20px' }}>小麦</MenuItem>
            <MenuItem value="玉米" sx={{ fontSize: '20px' }}>玉米</MenuItem>
          </Select>
        );
      }
      
      // 为单价字段添加特殊处理
      if (field === 'price') {
        return (
          <TextField
            value={localValue ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              // 限制只能输入数字和一个小数点，且小数点后最多两位
              if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
                setLocalValue(value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              } else if (e.key === 'Escape') {
                handleCancel();
              }
            }}
            onBlur={handleSave}
            autoFocus
            size="small"
            type="number"
            inputProps={{
              step: 0.01,
              pattern: "\\d*\\.?\\d{0,2}"
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '20px',
                textAlign: 'center',
                padding: '4px 8px'
              }
            }}
          />
        );
      }
      
      return (
        <TextField
          value={localValue ?? ""}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          onBlur={handleSave}
          autoFocus
          size="small"
          sx={{
            '& .MuiInputBase-input': {
              fontSize: '20px',
              textAlign: 'center',
              padding: '4px 8px'
            }
          }}
        />
      );
    }
    // 支持 trigger="double" 传参，决定是单击还是双击触发编辑
    return (
      <div
        onDoubleClick={trigger === 'double' ? onEdit : undefined}
        onClick={trigger === 'double' ? undefined : onEdit}
        style={{
          cursor: 'pointer',
          padding: '8px',
          minHeight: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={trigger === 'double' ? "双击编辑" : "点击编辑"}
      >
        {value !== null && value !== undefined ? value : ""}
      </div>
    );
  });

  // 反审核：将选中归档数据移回上方表格
  const handleUnAudit = () => {
    if (!selectedArchivedId) return;
    const toRestore = archivedRecords.find(r => r.id === selectedArchivedId);
    if (toRestore) {
      setRecords(prev => [...prev, toRestore]);
      setArchivedRecords(prev => prev.filter(r => r.id !== selectedArchivedId));
      setSelectedArchivedId(null);
    }
  };
  // 按钮大小
  const bigBtnStyle = { fontSize: 20, px: 1, py: 1, minWidth: 90 };

  // 查询所有归档记录到下方表格
  const handleQueryArchivedRecords = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/purchase-weight-archived');
      if (response.data.code === 0) {
        const archived = response.data.data.map((record: any) => ({
          id: record.bill_no,
          dbId: record.id,
          time: formatTime(record.time),
          supplier: record.supplier,
          item: record.item,
          maozhong: record.maozhong ? Math.round(record.maozhong) : null,
          pizhong: record.pizhong ? Math.round(record.pizhong) : null,
          jingzhong: record.jingzhong ? Math.round(record.jingzhong) : null,
          unit: record.unit,
          price: record.price,
          amount: record.amount ? Math.round(record.amount) : 0,
          is_archived: record.is_archived
        }));
        setArchivedRecords(archived);
      } else {
        setError(response.data.msg || '归档查询失败');
        setOpen(true);
      }
    } catch (err) {
      const errorMsg = (err as any).message || String(err);
      setError('归档查询失败：' + errorMsg);
      setOpen(true);
    }
  };

  // 页面加载时查询归档数据
  useEffect(() => {
    handleQueryArchivedRecords();
  }, []);

  return (
    <div
      style={{
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        background: "#f5f7fa",
        overflow: "auto",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          minHeight: 0,
        }}
      >
        {/* 错误提示 */}
        <Snackbar
          open={open}
          autoHideDuration={3000}
          onClose={() => setOpen(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => {
              setOpen(false);
              setSuccessMsg("");
              setError("");
            }}
            severity={successMsg ? "success" : "error"}
            sx={{ width: "100%" }}
          >
            {(successMsg || error) as string}
          </Alert>
        </Snackbar>
        {/* 左侧：上下两个表格 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: 10,
            overflow: "hidden",
            minHeight: 0, // 确保flex子元素可以收缩
          }}
          onClick={() => {
            setSelectedId(null);
            setSelectedArchivedId && setSelectedArchivedId(null);
          }}
        >
          {/* 上方：过磅记录表格 */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* 过磅记录标题美化 */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 8px 0' }}>
              <div style={{ width: 6, height: 28, background: 'linear-gradient(180deg, #1976d2 60%, #64b5f6 100%)', borderRadius: 3, marginRight: 10 }} />
              <h3 style={{ margin: 0, fontSize: 26, color: '#1976d2', fontWeight: 900, letterSpacing: 1 }}>过磅记录</h3>
            </div>
            <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
              <Button variant="contained" color="primary" onClick={handleAdd} sx={{ ...bigBtnStyle, borderRadius: 3, boxShadow: 2, fontWeight: 700 }}>
                新增
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                disabled={!selectedId}
                sx={{ ...bigBtnStyle, borderRadius: 3, boxShadow: 1, fontWeight: 700 }}
              >
                删除
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleSaveSelected}
                disabled={!selectedId}
                sx={{ ...bigBtnStyle, borderRadius: 3, boxShadow: 2, fontWeight: 700 }}
              >
                {selectedId && records.find(r => r.id === selectedId)?.dbId !== undefined ? "更新" : "保存"}
              </Button>
              {/* <Button
                variant="contained"
                color="info"
                onClick={handleQueryAllRecords}
                sx={bigBtnStyle}
              >
                查询所有
              </Button> */}
               {/* 添加颜色图例 */}
            <div style={{ 
              display: "flex", 
              gap: 16, 
              marginBottom: 12, 
              fontSize: "14px",
              alignItems: "center"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 4 
              }}>
                <div style={{ 
                  width: 16, 
                  height: 16, 
                  backgroundColor: '#fff8e1', 
                  borderTop: '1px solid #ff9800',
                  borderRight: '1px solid #ff9800',
                  borderBottom: '1px solid #ff9800',
                  borderLeft: '4px solid #ff9800',
                  position: 'relative'
                }}>
                  <span style={{ 
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    fontSize: '8px', 
                    color: '#ff9800',
                    fontWeight: 'bold'
                  }}>
                    ●
                  </span>
                </div>
                <span style={{ color: '#e65100' }}>未保存</span>
              </div>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 4 
              }}>
                <div style={{ 
                  width: 16, 
                  height: 16, 
                  backgroundColor: 'white', 
                  border: '1px solid #ddd'
                }}></div>
                <span>已保存</span>
              </div>
            </div>
            </div>
            {/* 1. 表格美化 */}
            <TableContainer
              component={Paper}
              sx={{
                boxShadow: 4,
                borderRadius: 3,
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                mb: 2,
              }}
            >
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow sx={{ background: "linear-gradient(90deg, #e3eafc 0%, #f5f7fa 100%)", boxShadow: 1 }}>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2', borderTopLeftRadius: 12 }}>单据号</TableCell>
                    <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>时间</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>供应商名称</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>物品</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>毛重</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>皮重</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>净重</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>单价/斤</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2', borderTopRightRadius: 12 }}>金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((r) => (
                    <TableRow
                      key={r.id}
                      hover
                      selected={selectedId === r.id}
                      onClick={e => { e.stopPropagation(); setSelectedId(r.id); }}
                      style={{ cursor: "pointer" }}
                      sx={{
                        backgroundColor: selectedId === r.id ? '#e3f2fd' : (r.dbId !== undefined ? 'inherit' : '#fff8e1'),
                        '&:hover': {
                          backgroundColor: selectedId === r.id ? '#bbdefb' : (r.dbId !== undefined ? '#f5f5f5' : '#ffecb3'),
                        },
                        borderLeft: r.dbId !== undefined ? 'none' : '4px solid #ff9800',
                        '& .MuiTableCell-root': {
                          color: r.dbId !== undefined ? (selectedId === r.id ? '#1976d2' : 'inherit') : '#e65100',
                          fontWeight: selectedId === r.id ? 700 : 400,
                        }
                      }}
                    >
                      <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px" }}> {r.id} </TableCell>
                      <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "20px" }}> {r.time} </TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>
                        <EditableCell
                          record={r}
                          field="supplier"
                          value={r.supplier}
                          isEditing={editingCell?.id === r.id && editingCell?.field === 'supplier'}
                          onEdit={() => handleCellEdit(r.id, 'supplier', r.supplier)}
                          onSave={handleCellSave}
                          onCancel={handleCellCancel}
                          onChange={(val) => handleCellChangeImmediate(r.id, 'supplier', val)}
                          onKeyPress={handleEditKeyPress}
                          trigger="double"
                        />
                      </TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>
                        <EditableCell
                          record={r}
                          field="item"
                          value={r.item}
                          isEditing={editingCell?.id === r.id && editingCell?.field === 'item'}
                          onEdit={() => handleCellEdit(r.id, 'item', r.item)}
                          onSave={handleCellSave}
                          onCancel={handleCellCancel}
                          onChange={(val) => handleCellChangeImmediate(r.id, 'item', val)}
                          onKeyPress={handleEditKeyPress}
                          trigger="double"
                        />
                      </TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>
                        <EditableCell
                          record={r}
                          field="maozhong"
                          value={r.maozhong}
                          isEditing={editingCell?.id === r.id && editingCell?.field === 'maozhong'}
                          onEdit={() => handleCellEdit(r.id, 'maozhong', r.maozhong)}
                          onSave={handleCellSave}
                          onCancel={handleCellCancel}
                          onChange={(val) => handleCellChangeImmediate(r.id, 'maozhong', val)}
                          onKeyPress={handleEditKeyPress}
                          trigger="double"
                        />
                      </TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>
                        <EditableCell
                          record={r}
                          field="pizhong"
                          value={r.pizhong}
                          isEditing={editingCell?.id === r.id && editingCell?.field === 'pizhong'}
                          onEdit={() => handleCellEdit(r.id, 'pizhong', r.pizhong)}
                          onSave={handleCellSave}
                          onCancel={handleCellCancel}
                          onChange={(val) => handleCellChangeImmediate(r.id, 'pizhong', val)}
                          onKeyPress={handleEditKeyPress}
                          trigger="double"
                        />
                      </TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#388e3c' }}>
                        {r.jingzhong !== null ? Math.round(r.jingzhong) : ""}
                      </TableCell>
                      <TableCell sx={{ width: '12%', textAlign: "center", fontSize: "20px" }}>
                        <EditableCell
                          record={r}
                          field="price"
                          value={r.price}
                          isEditing={editingCell?.id === r.id && editingCell?.field === 'price'}
                          onEdit={() => handleCellEdit(r.id, 'price', r.price)}
                          onSave={handleCellSave}
                          onCancel={handleCellCancel}
                          onChange={(val) => handleCellChangeImmediate(r.id, 'price', val)}
                          onKeyPress={handleEditKeyPress}
                          trigger="double"
                        />
                      </TableCell>
                      <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#d32f2f' }}>
                        {r.amount ? Math.round(r.amount) : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
          {/* 下方：归档/统计/查询表格 */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* 归档数据标题美化 */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 8px 0' }}>
              <div style={{ width: 6, height: 28, background: 'linear-gradient(180deg, #388e3c 60%, #a5d6a7 100%)', borderRadius: 3, marginRight: 10 }} />
              <h3 style={{ margin: 0, fontSize: 26, color: '#388e3c', fontWeight: 900, letterSpacing: 1 }}>归档数据</h3>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
              {/* 开始时间输入框 */}
              <TextField
                label="开始时间"
                type="datetime-local"
                size="small"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                InputLabelProps={{ shrink: true, sx: { fontSize: 20 } }}
                inputProps={{ style: { fontSize: 20, height: 32 } }}
                sx={{ minWidth: 220, '.MuiInputBase-root': { height: 48 } }}
              />
              {/* 结束时间输入框 */}
              <TextField
                label="结束时间"
                type="datetime-local"
                size="small"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                InputLabelProps={{ shrink: true, sx: { fontSize: 20 } }}
                inputProps={{ style: { fontSize: 20, height: 32 } }}
                sx={{ minWidth: 220, '.MuiInputBase-root': { height: 48 } }}
              />
              <Button
                variant="contained"
                color="warning"
                onClick={handleUnAudit}
                disabled={!selectedArchivedId}
                sx={{ ...bigBtnStyle, borderRadius: 3, boxShadow: 2, fontWeight: 700 }}
              >
                反审核
              </Button>
            </div>
            <TableContainer
              component={Paper} sx={{
                boxShadow: 4,
                borderRadius: 3,
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                mb: 2,
              }}
            >
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow sx={{ background: "linear-gradient(90deg, #e3eafc 0%, #f5f7fa 100%)", boxShadow: 1 }}>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2', borderTopLeftRadius: 12 }}>单据号</TableCell>
                    <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>时间</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>供应商名称</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>物品</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>毛重</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>皮重</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>净重</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>单价/斤</TableCell>
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>单价/公斤</TableCell>
                    <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2', borderTopRightRadius: 12 }}>金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredArchived.map((r) => (
                    <TableRow
                      key={r.id}
                      hover
                      selected={selectedArchivedId === r.id}
                      onClick={e => { e.stopPropagation(); setSelectedArchivedId(r.id); }}
                      style={{ cursor: "pointer" }}
                      sx={{
                        backgroundColor: selectedArchivedId === r.id ? '#e3f2fd' : 'inherit',
                        '&:hover': {
                          backgroundColor: selectedArchivedId === r.id ? '#bbdefb' : '#f5f5f5',
                        },
                        '& .MuiTableCell-root': {
                          color: selectedArchivedId === r.id ? '#1976d2' : '#1976d2',
                          fontWeight: selectedArchivedId === r.id ? 700 : 400,
                        }
                      }}
                    >
                      <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px" }}>{r.id}</TableCell>
                      <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "20px" }}>{formatTime(r.time)}</TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>{r.supplier}</TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px" }}>{r.item}</TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#388e3c' }}>{r.maozhong !== null ? r.maozhong : ""}</TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#388e3c' }}>{r.pizhong !== null ? r.pizhong : ""}</TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#388e3c' }}>{r.jingzhong !== null ? r.jingzhong : ""}</TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.price}</TableCell>
                      <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.price !== null ? r.price * 2 : ""}</TableCell>
                      <TableCell sx={{ width: '20%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#d32f2f' }}>{r.amount ? Math.round(r.amount) : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {/* 4. 合计栏美化（下方归档区） */}
            <div style={{
              width: '100%',
              background: 'linear-gradient(90deg, #e3eafc 0%, #f5f7fa 100%)',
              border: 'none',
              borderRadius: 12,
              boxShadow: '0 2px 12px 0 #b3c6e0',
              padding: '22px 0',
              fontSize: 22,
              fontWeight: 800,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 80,
              marginBottom: 18,
              marginTop: 8,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#1976d2', fontSize: 26, fontWeight: 900 }}>合计净重：</span>
                <span style={{ color: '#1976d2', fontSize: 28, fontWeight: 900 }}>{totalArchivedJingzhong.toFixed(1)}</span>
                <span style={{ color: '#1976d2', fontSize: 18, fontWeight: 700 }}>公斤</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#d32f2f', fontSize: 26, fontWeight: 900 }}>合计金额：</span>
                <span style={{ color: '#d32f2f', fontSize: 28, fontWeight: 900 }}>{Math.round(totalArchivedAmount)}</span>
                <span style={{ color: '#d32f2f', fontSize: 18, fontWeight: 700 }}>元</span>
              </span>
            </div>
          </div>
        </div>
        {/* 右侧：数字显示和操作区 */}
        <div
          style={{
            width: 455,
            padding: 15,
            borderLeft: "1px solid #eee",
            boxSizing: "border-box",
            height: "100%",
            overflow: "hidden",
            background: "linear-gradient(135deg, #e3eafc 0%, #f5f7fa 100%)",
            borderRadius: 16,
            boxShadow: '0 4px 24px 0 #b3c6e0',
          }}
        >
          <div
            style={{
              background: "#000",
              color: isStable ? "#00e676" : "#ff2d2d",
              fontWeight: isStable ? 900 : 400,
              fontFamily:
                "'Share Tech Mono', 'Orbitron', 'Consolas', 'monospace'",
              fontSize: 80,
              padding: "16px 32px",
              borderRadius: 16,
              textAlign: "center",
              marginBottom: 32,
              letterSpacing: 2,
              border: "2px solid #222",
              minWidth: 320,
              minHeight: 110,
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: serialData ? 1 : 0.3,
              transition: "color 0.3s, font-weight 0.3s",
              boxShadow: '0 2px 16px 0 #b3c6e0',
            }}
          >
            {serialData || <span>--</span>}
          </div>
          <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleMaozhong}
              sx={{ fontSize: 26, px: 8, py: 3, minWidth: 140, borderRadius: 3, boxShadow: 2, fontWeight: 700 }}
              disabled={!selectedId}
            >
              毛重
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handlePizhong}
              sx={{ fontSize: 26, px: 8, py: 3, minWidth: 140, borderRadius: 3, boxShadow: 2, fontWeight: 700 }}
              disabled={!selectedId}
            >
              皮重
            </Button>
          </div>
        </div>
        {/* 单价输入弹窗 */}
        <Dialog open={priceDialogOpen} onClose={() => setPriceDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 4,
              boxShadow: 6,
              minWidth: 380,
              background: 'linear-gradient(90deg, #e3eafc 0%, #fff 100%)',
              p: 2
            }
          }}
        >
          <DialogTitle sx={{ color: '#1976d2', fontWeight: 800, fontSize: 22, letterSpacing: 1, textAlign: 'center', pb: 1 }}>请输入单价</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="单价 (元/斤)"
              type="number"
              fullWidth
              value={inputPrice}
              onChange={(e) => {
                const value = e.target.value;
                // 限制只能输入数字和一个小数点，且小数点后最多两位
                if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
                  setInputPrice(value);
                }
              }}
              inputProps={{
                min: 0,
                step: 0.01,
                pattern: "\\d*\\.?\\d{0,2}",
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
            <Button onClick={() => setPriceDialogOpen(false)} sx={{ fontSize: 20, borderRadius: 3, px: 4, py: 1.5 }}>取消</Button>
            <Button onClick={handlePriceConfirm} variant="contained" sx={{ fontSize: 20, borderRadius: 3, px: 4, py: 1.5, fontWeight: 700 }}>确定</Button>
          </DialogActions>
        </Dialog>
        {/* 删除确认对话框 */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={handleCancelDelete}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">确认删除</DialogTitle>
          <DialogContent>
            <Typography id="delete-dialog-description">
              您确定要删除此条记录吗？此操作不可逆。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelDelete} color="primary">
              取消
            </Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              删除
            </Button>
          </DialogActions>
        </Dialog>
      </div> {/* 主内容flex容器闭合 */}
    </div> 
  );
}
