import React, { useEffect, useState, useRef } from "react";
import { 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Snackbar, 
  Alert, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  TableFooter, 
  Typography, 
  Checkbox, 
  Select, 
  MenuItem, 
  Box 
} from "@mui/material";
import dayjs from "dayjs";
import axios from "axios";
const { runPythonScript } = window.require ? window.require('./src/modules/home/purchase-quick-weight/utils/printer') : {};

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
  card_no?: string; // 新增：卡号
  is_archived?: number; // 新增：是否已归档
  is_check?: number; // 新增：是否已付款，0为未付款，1为已付款
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
  // 公司名称状态
  const [companyName, setCompanyName] = useState("一磅通");

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

    // 新增：全局监听RFID读卡事件，刷卡即新增
    const rfidHandler = (_event: any, cardId: string) => {
      // 刷卡时先尝试用卡号查询数据
      handleQueryByCardNo(cardId);
      
      console.log('RFID刷卡触发查询，卡号:', cardId);
    };
    if (ipcRenderer) {
      ipcRenderer.on("rfid-data", rfidHandler);
    }

    // 监听公司名称变更事件
    const companyNameChangeHandler = (event: any) => {
      const { companyName: newCompanyName } = event.detail;
      setCompanyName(newCompanyName);
      console.log('公司名称已更新:', newCompanyName);
    };
    window.addEventListener('companyNameChanged', companyNameChangeHandler);

    // 初始化时从localStorage加载公司名称
    const savedCompanyName = localStorage.getItem('companyName');
    if (savedCompanyName) {
      setCompanyName(savedCompanyName);
    }
    
    return () => {
      ipcRenderer.removeListener("serialport-data", handler);
      // 移除rfid监听
      if (ipcRenderer) {
        ipcRenderer.removeListener("rfid-data", rfidHandler);
      }
      // 移除公司名称变更监听
      window.removeEventListener('companyNameChanged', companyNameChangeHandler);
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

  // 生成简短有意义且唯一的单据号：P + MMDD + 流水号
  const genId = () => {
    const now = new Date();
    
    // 业务前缀：P = Purchase (采购)
    const prefix = 'P';
    
    // 月日部分：MMDD
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = month + day;
    
    // 获取当日已有单据的最大流水号（从所有数据源）
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 合并上方表格和归档表格的记录，确保查找全部数据
    const allRecords = [...records, ...archivedRecords];
    const todayRecords = allRecords.filter(r => {
      if (!r.time) return false;
      // 支持多种时间格式
      const recordDate = r.time.split(' ')[0]; // 取日期部分
      return recordDate === today;
    });
    
    // 查找当日最大流水号
    let maxSequence = 0;
    const billPattern = new RegExp(`^P${dateStr}(\\d{3})$`);
    
    todayRecords.forEach(record => {
      const match = record.id.match(billPattern);
      if (match) {
        const sequence = parseInt(match[1], 10);
        if (sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    });
    
    // 新单据流水号 = 最大流水号 + 1
    let newSequence = maxSequence + 1;
    let sequenceStr = String(newSequence).padStart(3, '0');
    let billNo = prefix + dateStr + sequenceStr;
    
    // 唯一性检查：确保生成的单据号不与任何现有记录重复
    const existingIds = new Set(allRecords.map(r => r.id));
    let attempts = 0;
    const maxAttempts = 999; // 最多尝试999次
    
    while (existingIds.has(billNo) && attempts < maxAttempts) {
      newSequence++;
      sequenceStr = String(newSequence).padStart(3, '0');
      billNo = prefix + dateStr + sequenceStr;
      attempts++;
      
      console.warn(`单据号重复，尝试下一个: ${billNo} (第${attempts}次尝试)`);
    }
    
    // 极端情况：如果当日流水号用完（超过999），使用时间戳确保唯一性
    if (existingIds.has(billNo) || newSequence > 999) {
      const timestamp = Date.now().toString();
      const timeHash = timestamp.slice(-3); // 使用时间戳后3位
      billNo = prefix + dateStr + timeHash;
      console.warn(`当日流水号已满，使用时间戳: ${billNo}`);
    }
    
    console.log(`生成新单据号: ${billNo} (${month}月${day}日第${newSequence}单)`);
    return billNo;
  };

  // 单据号解析工具函数
  const parseBillNo = (billNo: string): { 
    prefix: string; 
    month: string; 
    day: string; 
    sequence: number; 
    isValid: boolean;
    readableInfo: string;
  } | null => {
    // 匹配格式：P + 4位月日 + 3位流水号
    const pattern = /^(P)(\d{2})(\d{2})(\d{3})$/;
    const match = billNo.match(pattern);
    
    if (!match) {
      return {
        prefix: '',
        month: '',
        day: '',
        sequence: 0,
        isValid: false,
        readableInfo: '无效的单据号格式'
      };
    }
    
    const [, prefix, month, day, sequenceStr] = match;
    const sequence = parseInt(sequenceStr, 10);
    
    // 创建可读信息
    const readableInfo = `${month}月${day}日第${sequence}单`;
    
    return {
      prefix,
      month,
      day,
      sequence,
      isValid: true,
      readableInfo
    };
  };
  
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
    const newId = genId();
    const newRecord = {
      id: newId,
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
      card_no: undefined, // 新增：卡号字段
      is_archived: 0
    };
    
    // 在现有记录基础上新增一条记录
    setRecords(prev => [newRecord, ...prev]);
    return newId;
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
        card_no: recordToSave.is_archived === 1 ? null : (recordToSave.card_no || null),
        is_deleted: 0,
        is_archived: recordToSave.is_archived ?? 0,
        is_check: recordToSave.is_check ?? 0
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
          card_no: toSave.card_no || null,
          is_deleted: 0,
          is_check: toSave.is_check ?? 0
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

  // 打印选中记录
  const handlePrint = () => {
    if (!selectedId) {
      setError("请先选择要打印的记录！");
      setOpen(true);
      return;
    }

    const recordToPrint = records.find(r => r.id === selectedId);
    if (!recordToPrint) {
      setError("未找到要打印的记录！");
      setOpen(true);
      return;
    }

    // 检查必要字段
    if (!recordToPrint.maozhong || !recordToPrint.jingzhong) {
      setError("打印记录必须包含毛重和净重信息！");
      setOpen(true);
      return;
    }

    // 准备打印数据，按照您的JSON格式
    const printData = {
      bill_no: recordToPrint.id,
      print_time: recordToPrint.time || new Date().toLocaleString('zh-CN'),
      item: recordToPrint.item,
      gross_weight: `${recordToPrint.maozhong}kg`,
      tare_weight: `${recordToPrint.pizhong || 0}kg`,
      net_weight: `${recordToPrint.jingzhong}kg`,
      price: String(recordToPrint.price || 0),
      amount: String(recordToPrint.amount || 0),
      supplier: recordToPrint.supplier,
      unit: recordToPrint.unit,
      card_no: recordToPrint.card_no || '',
      company_name: companyName
    };

    try {
      // 转换为JSON字符串，然后转换为Base64
      const jsonString = JSON.stringify(printData);
      const base64Data = Buffer.from(jsonString).toString('base64');
      
      console.log('🔄 准备打印数据:', printData);
      console.log('📤 Base64编码:', base64Data);

      // 调用打印脚本
      if (runPythonScript) {
        runPythonScript(base64Data, (error: any, result: any) => {
          if (error) {
            console.error('打印失败:', error);
            setError(`打印失败: ${error.message}`);
            setOpen(true);
          } else {
            console.log('打印成功:', result);
            setSuccessMsg("打印成功！");
            setOpen(true);
          }
        });
      } else {
        setError("打印功能不可用，请检查环境配置！");
        setOpen(true);
      }
    } catch (error) {
      console.error('数据转换失败:', error);
      setError(`数据转换失败: ${(error as any).message}`);
      setOpen(true);
    }
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
          card_no: record.card_no || null, // 新增：卡号字段
          is_archived: record.is_archived,
          is_check: record.is_check || 0
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
      // 归档时将卡号字段置为空
      const { card_no, ...recordWithoutCardNo } = row;
      const archivedRecord = { ...recordWithoutCardNo, pizhong, jingzhong, amount, is_archived: 1 };

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
        // 保持原有的卡号
        newRecord = { ...row, maozhong, price: roundedPrice, jingzhong, amount };
        return newRecord;
      }
      return row;
    });

    setRecords(newRecords);
    setPriceDialogOpen(false);

    // 用新数据去保存，此时卡号会被一起保存到数据库
    if (selectedId && newRecord) {
      await autoSaveRecord(selectedId, "毛重、单价和卡号已保存！", newRecord);
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
  const handleUnAudit = async () => {
    if (!selectedArchivedId) return;
    const toRestore = archivedRecords.find(r => r.id === selectedArchivedId);
    if (toRestore) {
      try {
        console.log('准备反审核记录，单据号:', selectedArchivedId);
        
        // 调用后端反审核接口，修改is_archived为0
        const response = await axios.put(`http://localhost:3001/api/purchase-weight/${selectedArchivedId}`, {
          ...toRestore,
          is_archived: 0
        });
        
        console.log('反审核响应:', response.data);
        
        if (response.data.code === 0) {
          // 反审核成功，更新本地状态
          setRecords(prev => [...prev, { ...toRestore, is_archived: 0 }]);
          setArchivedRecords(prev => prev.filter(r => r.id !== selectedArchivedId));
          setSelectedArchivedId(null);
          setSuccessMsg("反审核成功！");
          setOpen(true);
        } else {
          setError(response.data.msg || "反审核失败！");
          setOpen(true);
        }
      } catch (err) {
        console.error('反审核错误详情:', err);
        const errorMsg = (err as any).message || String(err);
        setError("反审核失败：" + errorMsg);
        setOpen(true);
      }
    }
  };
  // 付款处理函数
  const handlePayment = async () => {
    if (!selectedArchivedId) return;
    
    const recordToPay = archivedRecords.find(r => r.id === selectedArchivedId);
    if (!recordToPay) return;
    
    try {
      console.log('准备更新付款状态，单据号:', selectedArchivedId);
      
      // 调用后端更新付款状态接口
      const response = await axios.put(`http://localhost:3001/api/purchase-weight-payment/${selectedArchivedId}`, {
        is_check: 1
      });
      
      console.log('付款状态更新响应:', response.data);
      
      if (response.data.code === 0) {
        // 更新本地状态
        setArchivedRecords(prev => prev.map(record => {
          if (record.id === selectedArchivedId) {
            return { ...record, is_check: 1 };
          }
          return record;
        }));
        
        setSuccessMsg("付款状态更新成功！");
        setOpen(true);
      } else {
        setError(response.data.msg || "付款状态更新失败！");
        setOpen(true);
      }
    } catch (err) {
      console.error('付款状态更新错误详情:', err);
      const errorMsg = (err as any).message || String(err);
      setError("付款状态更新失败：" + errorMsg);
      setOpen(true);
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
          card_no: record.card_no || null, // 保留卡号字段但不显示在表格中
          is_archived: record.is_archived,
          is_check: record.is_check || 0 // 新增：付款状态
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

  // 新增：用卡号查询数据的接口
  const handleQueryByCardNo = async (cardNo: string) => {
    try {
      console.log('用卡号查询数据:', cardNo);
      const response = await axios.get(`http://localhost:3001/api/purchase-weight-by-card/${cardNo}`);
      
      if (response.data.code === 0 && response.data.data && response.data.data.length > 0) {
        // 查询到数据，找到对应的记录并聚焦
        const foundRecord = response.data.data[0]; // 取第一条记录
        const recordId = foundRecord.bill_no;
        
        // 检查记录是否已归档，已归档的记录不应该添加到上方表格
        if (foundRecord.is_archived === 1) {
          console.log('找到的记录已归档，不添加到上方表格:', recordId);
          setError(`卡号 ${cardNo} 对应的记录已归档，请在下方的归档数据中查看`);
          setOpen(true);
          return;
        }
        
        // 在上方表格中查找该记录
        const existingRecord = records.find(r => r.id === recordId);
        if (existingRecord) {
          // 记录已在上方表格中，直接聚焦
          setSelectedId(recordId);
          console.log('找到记录并聚焦:', recordId);
          // 先设置毛重，然后调用皮重逻辑
          setTimeout(() => {
            if (serialData) {
              // 先设置毛重
              const maozhong = Math.round(Number(serialData));
              setRecords(prev => prev.map(record => {
                if (record.id === recordId) {
                  return { ...record, maozhong };
                }
                return record;
              }));
              console.log('已设置毛重:', maozhong);
              
              // 延迟一下再调用皮重逻辑
              setTimeout(() => {
                if (isStable && serialData && records.length > 0 && selectedId) {
                  console.log('条件满足，调用皮重逻辑');
                  handlePizhong();
                } else {
                  console.log('条件不满足，无法调用皮重逻辑:', {
                    isStable,
                    serialData,
                    recordsLength: records.length,
                    selectedId
                  });
                }
              }, 200);
            } else {
              console.log('没有重量数据，无法设置毛重');
            }
          }, 100);
          return;
        } else {
          // 记录不在上方表格中，需要添加到上方表格并聚焦
          // 再次检查是否真的不存在（防止重复添加）
          const isAlreadyInTable = records.some(r => r.id === recordId);
          if (isAlreadyInTable) {
            // 如果已经存在，直接聚焦
            setSelectedId(recordId);
            console.log('记录已存在，直接聚焦:', recordId);
            // 先设置毛重，然后调用皮重逻辑
            setTimeout(() => {
              if (serialData) {
                // 先设置毛重
                const maozhong = Math.round(Number(serialData));
                setRecords(prev => prev.map(record => {
                  if (record.id === recordId) {
                    return { ...record, maozhong };
                  }
                  return record;
                }));
                console.log('已设置毛重:', maozhong);
                
                // 延迟一下再调用皮重逻辑
                setTimeout(() => {
                  if (isStable && serialData && records.length > 0 && selectedId) {
                    console.log('条件满足，调用皮重逻辑');
                    handlePizhong();
                  } else {
                    console.log('条件不满足，无法调用皮重逻辑:', {
                      isStable,
                      serialData,
                      recordsLength: records.length,
                      selectedId
                    });
                  }
                }, 200);
              } else {
                console.log('没有重量数据，无法设置毛重');
              }
            }, 100);
            return;
          }
          
          // 额外检查：确保不会添加重复记录
          console.log('准备添加记录到表格:', recordId);
          console.log('当前表格中的记录数量:', records.length);
          console.log('当前表格中的记录ID:', records.map(r => r.id));
          
          const newRecord = {
            id: foundRecord.bill_no,
            dbId: foundRecord.id,
            time: formatTime(foundRecord.time),
            supplier: foundRecord.supplier,
            item: foundRecord.item,
            maozhong: foundRecord.maozhong ? Math.round(foundRecord.maozhong) : null,
            pizhong: foundRecord.pizhong ? Math.round(foundRecord.pizhong) : null,
            jingzhong: foundRecord.jingzhong ? Math.round(foundRecord.jingzhong) : null,
            unit: foundRecord.unit,
            price: foundRecord.price,
            amount: foundRecord.amount ? Math.round(foundRecord.amount) : 0,
            card_no: foundRecord.card_no || null,
            is_archived: foundRecord.is_archived,
            is_check: foundRecord.is_check || 0
          };
          
          // 添加到上方表格并聚焦
          setRecords(prev => {
            // 再次检查是否已存在
            const exists = prev.some(r => r.id === recordId);
            if (exists) {
              console.log('记录已存在于表格中，不重复添加:', recordId);
              return prev;
            }
            console.log('添加新记录到表格:', recordId);
            return [newRecord, ...prev];
          });
          setSelectedId(recordId);
          console.log('添加记录到上方表格并聚焦:', recordId);
          // 先设置毛重，然后调用皮重逻辑
          setTimeout(() => {
            if (serialData) {
              // 先设置毛重
              const maozhong = Math.round(Number(serialData));
              setRecords(prev => prev.map(record => {
                if (record.id === recordId) {
                  return { ...record, maozhong };
                }
                return record;
              }));
              console.log('已设置毛重:', maozhong);
              
              // 延迟一下再调用皮重逻辑
              setTimeout(() => {
                if (isStable && serialData && records.length > 0 && selectedId) {
                  console.log('条件满足，调用皮重逻辑');
                  handlePizhong();
                } else {
                  console.log('条件不满足，无法调用皮重逻辑:', {
                    isStable,
                    serialData,
                    recordsLength: records.length,
                    selectedId
                  });
                }
              }, 200);
            } else {
              console.log('没有重量数据，无法设置毛重');
            }
          }, 100);
          return;
        }
      } else {
        // 没有查询到数据，保持现有逻辑（新增记录）
        console.log('未查询到卡号对应的记录，执行新增逻辑');
        const newId = handleAdd();
        setSelectedId(newId);
        // 保存卡号到当前记录
        setRecords(prev => prev.map(record => {
          if (record.id === newId) {
            return { ...record, card_no: cardNo };
          }
          return record;
        }));
        // 弹出单价输入框
        setPriceDialogOpen(true);
        setInputPrice("");
      }
    } catch (err) {
      console.error('卡号查询错误:', err);
      // 查询出错时，保持现有逻辑（新增记录）
      const newId = handleAdd();
      setSelectedId(newId);
      // 保存卡号到当前记录
      setRecords(prev => prev.map(record => {
        if (record.id === newId) {
          return { ...record, card_no: cardNo };
        }
        return record;
      }));
      // 弹出单价输入框
      setPriceDialogOpen(true);
      setInputPrice("");
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        background: '#f5f7fa',
        overflow: 'hidden',
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
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 1, md: 2 },
          overflow: 'hidden',
        }}
        onClick={() => {
          setSelectedId(null);
          setSelectedArchivedId && setSelectedArchivedId(null);
        }}
      >
        {/* 上方：过磅记录表格 */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            mb: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
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
            <Button
              variant="contained"
              color="info"
              onClick={handlePrint}
              disabled={!selectedId}
              sx={{ ...bigBtnStyle, borderRadius: 3, boxShadow: 2, fontWeight: 700 }}
            >
              打印
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
              maxHeight: '100%',
              overflow: 'visible',
            }}
          >
            <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
              <TableHead>
                <TableRow sx={{ background: "linear-gradient(90deg, #e3eafc 0%, #f5f7fa 100%)", boxShadow: 1 }}>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2', borderTopLeftRadius: 12 }}>单据号</TableCell>
                  <TableCell sx={{ width: '12%', whiteSpace: "nowrap", textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>时间</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>供应商名称</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>物品</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>卡号</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>毛重</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>皮重</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>净重</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>单价/斤</TableCell>
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
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px" }}>
                      <EditableCell
                        record={r}
                        field="card_no"
                        value={r.card_no || ""}
                        isEditing={editingCell?.id === r.id && editingCell?.field === 'card_no'}
                        onEdit={() => handleCellEdit(r.id, 'card_no', r.card_no || "")}
                        onSave={handleCellSave}
                        onCancel={handleCellCancel}
                        onChange={(val) => handleCellChangeImmediate(r.id, 'card_no', val)}
                        onKeyPress={handleEditKeyPress}
                        trigger="double"
                      />
                    </TableCell>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px" }}>
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
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px" }}>
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
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#388e3c' }}>
                      {r.jingzhong !== null ? Math.round(r.jingzhong) : ""}
                    </TableCell>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px" }}>
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
                    <TableCell sx={{ width: '10%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#d32f2f' }}>
                      {r.amount ? Math.round(r.amount) : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        {/* 下方：归档/统计/查询表格 */}
        <Box
          sx={{
            flex: 1.4,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
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
              onClick={handleUnAudit}
              disabled={!selectedArchivedId || (archivedRecords.find(r => r.id === selectedArchivedId)?.is_check === 1)}
              sx={{ 
                ...bigBtnStyle, 
                borderRadius: 3, 
                boxShadow: 2, 
                fontWeight: 700,
                backgroundColor: archivedRecords.find(r => r.id === selectedArchivedId)?.is_check === 1 ? '#9e9e9e' : '#ed6c02',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: archivedRecords.find(r => r.id === selectedArchivedId)?.is_check === 1 ? '#9e9e9e' : '#e65100',
                }
              }}
            >
              {archivedRecords.find(r => r.id === selectedArchivedId)?.is_check === 1 ? "已付款" : "反审核"}
            </Button>
            <Button
              variant="contained"
              onClick={handlePayment}
              disabled={!selectedArchivedId || (archivedRecords.find(r => r.id === selectedArchivedId)?.is_check === 1)}
              sx={{ 
                ...bigBtnStyle, 
                borderRadius: 3, 
                boxShadow: 2, 
                fontWeight: 700,
                backgroundColor: archivedRecords.find(r => r.id === selectedArchivedId)?.is_check === 1 ? '#9e9e9e' : '#2e7d32',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: archivedRecords.find(r => r.id === selectedArchivedId)?.is_check === 1 ? '#9e9e9e' : '#1b5e20',
                }
              }}
            >
              {archivedRecords.find(r => r.id === selectedArchivedId)?.is_check === 1 ? "已付款" : "付款"}
            </Button>
          </div>
          <TableContainer
            component={Paper} sx={{
              boxShadow: 4,
              borderRadius: 3,
              flex: 1,
              minHeight: 0,
              maxHeight: '100%',
              overflowY: 'auto',
            }}
          >
            <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
              <TableHead>
                <TableRow sx={{ background: "linear-gradient(90deg, #e3eafc 0%, #f5f7fa 100%)", boxShadow: 1 }}>
                  <TableCell sx={{ width: '11%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2', borderTopLeftRadius: 12 }}>单据号</TableCell>
                  <TableCell sx={{ width: '11%', whiteSpace: "nowrap", textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>时间</TableCell>
                  <TableCell sx={{ width: '9%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>供应商名称</TableCell>
                  <TableCell sx={{ width: '7%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>物品</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>毛重</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>皮重</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>净重</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>单价/斤</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2' }}>单价/公斤</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "22px", fontWeight: "bold", color: '#1976d2', borderTopRightRadius: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span>付款状态</span>
                      <div style={{ display: 'flex', gap: 4, fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <div style={{ width: 8, height: 8, backgroundColor: '#4caf50', borderRadius: '50%' }}></div>
                          <span style={{ color: '#4caf50' }}>已付</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <div style={{ width: 8, height: 8, backgroundColor: '#ff9800', borderRadius: '50%' }}></div>
                          <span style={{ color: '#ff9800' }}>未付</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
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
                      backgroundColor: selectedArchivedId === r.id 
                        ? '#e3f2fd' 
                        : r.is_check === 1 
                          ? '#f1f8e9' // 已付款记录显示浅绿色背景
                          : 'inherit',
                      '&:hover': {
                        backgroundColor: selectedArchivedId === r.id 
                          ? '#bbdefb' 
                          : r.is_check === 1 
                            ? '#e8f5e8' // 已付款记录悬停时显示稍深的绿色
                            : '#f5f5f5',
                      },
                      '& .MuiTableCell-root': {
                        color: selectedArchivedId === r.id ? '#1976d2' : '#1976d2',
                        fontWeight: selectedArchivedId === r.id ? 700 : 400,
                      }
                    }}
                  >
                    <TableCell sx={{ width: '11%', textAlign: "center", fontSize: "20px" }}>{r.id}</TableCell>
                    <TableCell sx={{ width: '11%', whiteSpace: "nowrap", textAlign: "center", fontSize: "20px" }}>{formatTime(r.time)}</TableCell>
                    <TableCell sx={{ width: '9%', textAlign: "center", fontSize: "20px" }}>{r.supplier}</TableCell>
                    <TableCell sx={{ width: '7%', textAlign: "center", fontSize: "20px" }}>{r.item}</TableCell>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#388e3c' }}>{r.maozhong !== null ? r.maozhong : ""}</TableCell>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#388e3c' }}>{r.pizhong !== null ? r.pizhong : ""}</TableCell>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#388e3c' }}>{r.jingzhong !== null ? r.jingzhong : ""}</TableCell>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.price}</TableCell>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px", color: '#1976d2' }}>{r.price !== null ? r.price * 2 : ""}</TableCell>
                    <TableCell sx={{ width: '8%', textAlign: "center", fontSize: "20px", fontWeight: 700, color: '#d32f2f' }}>{r.amount ? Math.round(r.amount) : ""}</TableCell>
                    <TableCell 
                      sx={{ 
                        width: '8%', 
                        textAlign: "center", 
                        fontSize: "20px", 
                        fontWeight: 700, 
                        color: r.is_check === 1 ? '#ffffff' : '#ffffff',
                        backgroundColor: r.is_check === 1 ? '#4caf50' : '#ff9800',
                        borderRadius: 1,
                        mx: 0.5,
                        py: 0.5
                      }}
                    >
                      {r.is_check === 1 ? "已付款" : "未付款"}
                    </TableCell>
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
        </Box>
      </Box>
      {/* 右侧：数字显示和操作区 */}
      <Box
        sx={{
          width: { xs: '100%', md: 455 },
          minWidth: 320,
          maxWidth: 600,
          height: '100%',
          p: { xs: 1, md: 2 },
          borderLeft: '1px solid #eee',
          background: 'linear-gradient(135deg, #e3eafc 0%, #f5f7fa 100%)',
          borderRadius: { xs: 0, md: 3 },
          boxShadow: { md: '0 4px 24px 0 #b3c6e0' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
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
      </Box>
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
    </Box>
  );
}
