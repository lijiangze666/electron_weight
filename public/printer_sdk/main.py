import sys
import ctypes
import base64
import json
import datetime

# Load the DLL
dll_path = r'printer.sdk.dll'  # Replace with the actual path to your DLL
dll = ctypes.CDLL(dll_path)  # Use CDLL for __cdecl calling convention

# Define function prototypes based on the SDK manual and C++ source
dll.PrinterCreator.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_char_p]
dll.PrinterCreator.restype = ctypes.c_int

dll.OpenPortA.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
dll.OpenPortA.restype = ctypes.c_int

dll.ClosePort.argtypes = [ctypes.c_void_p]
dll.ClosePort.restype = ctypes.c_int

dll.ReleasePrinter.argtypes = [ctypes.c_void_p]
dll.ReleasePrinter.restype = ctypes.c_int

dll.PrinterInitialize.argtypes = [ctypes.c_void_p]
dll.PrinterInitialize.restype = ctypes.c_int

dll.PrintTextS.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
dll.PrintTextS.restype = ctypes.c_int

dll.PrintAndFeedLine.argtypes = [ctypes.c_void_p]
dll.PrintAndFeedLine.restype = ctypes.c_int

dll.PrintBarCode.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int]
dll.PrintBarCode.restype = ctypes.c_int

dll.CutPaperWithDistance.argtypes = [ctypes.c_void_p, ctypes.c_int]
dll.CutPaperWithDistance.restype = ctypes.c_int

dll.PrintSymbol.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int]
dll.PrintSymbol.restype = ctypes.c_int

dll.SetRelativeHorizontal.argtypes = [ctypes.c_void_p, ctypes.c_int]
dll.SetRelativeHorizontal.restype = ctypes.c_int

dll.GetPrinterState.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint)]
dll.GetPrinterState.restype = ctypes.c_int

dll.OpenCashDrawer.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int]
dll.OpenCashDrawer.restype = ctypes.c_int

dll.PrintImage.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
dll.PrintImage.restype = ctypes.c_int

dll.SetAlign.argtypes = [ctypes.c_void_p, ctypes.c_int]
dll.SetAlign.restype = ctypes.c_int

dll.SetTextBold.argtypes = [ctypes.c_void_p, ctypes.c_int]
dll.SetTextBold.restype = ctypes.c_int

dll.SetTextFont.argtypes = [ctypes.c_void_p, ctypes.c_int]
dll.SetTextFont.restype = ctypes.c_int

# Error codes from the manual
ERROR_CM_SUCCESS = 0

def check_error(result, func_name):
    if result != ERROR_CM_SUCCESS:
        print(f"{func_name} failed with error code: {result}")
        return False
    return True

def parse_status(status):
    if status == 0x12:
        return "Ready"
    elif (status & 0b100) > 0:
        return "Cover opened"
    elif (status & 0b1000) > 0:
        return "Feed button has been pressed"
    elif (status & 0b100000) > 0:
        return "Printer is out of paper"
    elif (status & 0b1000000) > 0:
        return "Error condition"
    else:
        return "Error"

class PrinterDemo:
    def __init__(self, model, port_setting):
        self.handle = ctypes.c_void_p()
        res = dll.PrinterCreator(ctypes.byref(self.handle), model.encode('utf-8'))
        if not check_error(res, "PrinterCreator"):
            raise RuntimeError("Failed to create printer object")

        res = dll.OpenPortA(self.handle, port_setting.encode('utf-8'))
        if not check_error(res, "OpenPortA"):
            dll.ReleasePrinter(self.handle)
            raise RuntimeError("Failed to open port")

    def get_status(self):
        status = ctypes.c_uint(2)
        res = dll.GetPrinterState(self.handle, ctypes.byref(status))
        if res == 0:
            return f"The printer status is {parse_status(status.value)}"
        else:
            return f"Get Error, Code is: {res}"

    def print_sample(self):
        dll.PrinterInitialize(self.handle)
        dll.SetRelativeHorizontal(self.handle, 180)
        dll.PrintTextS(self.handle, b"Las vegas,NV5208\r\n")
        dll.PrintAndFeedLine(self.handle)
        dll.PrintAndFeedLine(self.handle)
        dll.PrintTextS(self.handle, b"Ticket #30-57320 User:HAPPY\r\n")
        dll.PrintTextS(self.handle, b"Station:52-102 Sales Rep HAPPY\r\n")
        dll.PrintTextS(self.handle, b"10/10/2019 3:55:01PM\r\n")
        dll.PrintTextS(self.handle, b"---------------------------------------\r\n")
        dll.PrintTextS(self.handle, b"Item QTY Price Total\r\n")
        dll.PrintTextS(self.handle, b"Description\r\n")
        dll.PrintTextS(self.handle, b"---------------------------------------\r\n")
        dll.PrintTextS(self.handle, b"100328 1 7.99 7.99\r\n")
        dll.PrintTextS(self.handle, b"MAGARITA MIX 7 7.99 3.96\r\n")
        dll.PrintTextS(self.handle, b"680015 1 43.99 43.99\r\n")
        dll.PrintTextS(self.handle, b"LIME\r\n")
        dll.PrintTextS(self.handle, b"102501 1 43.99 43.99\r\n")
        dll.PrintTextS(self.handle, b"V0DKA\r\n")
        dll.PrintTextS(self.handle, b"021048 1 3.99 3.99\r\n")
        dll.PrintTextS(self.handle, b"ORANGE 3200Z\r\n")
        dll.PrintTextS(self.handle, b"---------------------------------------\r\n")
        dll.PrintTextS(self.handle, b"Subtobal 60.93\r\n")
        dll.PrintTextS(self.handle, b"8.1% Sales Tax 3.21\r\n")
        dll.PrintTextS(self.handle, b"2% Concession Recov 1.04\r\n")
        dll.PrintTextS(self.handle, b"---------------------------------------\r\n")
        dll.PrintTextS(self.handle, b"Total 66.18\r\n")
        dll.PrintBarCode(self.handle, 73, b"1234567890", 3, 150, 0, 2)
        dll.CutPaperWithDistance(self.handle, 10)

    def print_qr_code(self):
        dll.PrinterInitialize(self.handle)
        dll.PrintTextS(self.handle, b"Example qrcode.\r\n")
        dll.PrintSymbol(self.handle, 49, b"123456789", 48, 10, 10, 1)
        dll.SetAlign(self.handle, 0)
        dll.PrintTextS(self.handle, b"Example PDF417.\r\n")
        dll.PrintSymbol(self.handle, 48, b"123456789", 48, 10, 8, 1)
        dll.SetAlign(self.handle, 0)
        dll.CutPaperWithDistance(self.handle, 10)

    def print_barcode(self):
        dll.PrinterInitialize(self.handle)
        dll.PrintTextS(self.handle, b"Example UPC_A.\r\n")
        dll.PrintBarCode(self.handle, 65, b"614141999996", 3, 150, 0, 2)
        dll.PrintTextS(self.handle, b"Example UPC_E.\r\n")
        dll.PrintBarCode(self.handle, 66, b"040100002931", 3, 150, 0, 2)
        dll.PrintTextS(self.handle, b"Example JAN13(EAN13).\r\n")
        dll.PrintBarCode(self.handle, 67, b"2112345678917", 3, 150, 0, 2)
        dll.PrintTextS(self.handle, b"Example JAN8(EAN8).\r\n")
        dll.PrintBarCode(self.handle, 68, b"21234569", 3, 150, 0, 2)
        dll.PrintTextS(self.handle, b"Example CODE39.\r\n")
        dll.PrintBarCode(self.handle, 69, b"12345678", 3, 150, 0, 2)
        dll.PrintTextS(self.handle, b"Example ITF.\r\n")
        dll.PrintBarCode(self.handle, 70, b"10614141999993", 3, 150, 0, 2)
        dll.PrintTextS(self.handle, b"Example CODABAR.\r\n")
        dll.PrintBarCode(self.handle, 71, b"B1234567890B", 3, 150, 0, 2)
        dll.PrintTextS(self.handle, b"Example CODE93.\r\n")
        dll.PrintBarCode(self.handle, 72, b"12345678", 3, 150, 0, 2)
        dll.PrintTextS(self.handle, b"Example barcode 128.\r\n")
        dll.PrintBarCode(self.handle, 73, b"1234567890", 3, 150, 0, 2)
        dll.CutPaperWithDistance(self.handle, 10)

    def print_image(self, path):
        dll.PrintImage(self.handle, path.encode('utf-8'), 0)
        dll.CutPaperWithDistance(self.handle, 10)

    def print(self, content: str):
        # 1. 将 JSON 字符串解析成字典
        data = json.loads(content)
        # import pdb; pdb.set_trace()
        lines = content.splitlines()
        dll.PrinterInitialize(self.handle)
        dll.PrintText(self.handle, "一磅通采购单据\r\n".encode("gbk"), 1, 17)
        dll.PrintAndFeedLine(self.handle)
        dll.PrintText(self.handle, "------------------------".encode("gbk"), 1, 16)
        dll.PrintAndFeedLine(self.handle)
        dll.PrintAndFeedLine(self.handle)

        # 2. 打印各个字段
        def print_line(label, key,use_current_time=False):
            if use_current_time:
                value = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            else:
                value = data.get(key, "")  # 如果 key 不存在，默认空字符串
            dll.SetRelativeHorizontal(self.handle, 80)
            dll.PrintTextS(self.handle, f'{label}{value}\n'.encode('gbk'))
            dll.PrintAndFeedLine(self.handle)

        print_line("单据号：", "bill_no")
        print_line("称重时间：", "print_time", use_current_time=True)
        print_line("物品：", "item")
        print_line("毛重：", "gross_weight")
        print_line("皮重：", "tare_weight")
        print_line("净重：", "net_weight")
        print_line("单价：", "price")
        print_line("金额：", "amount")

        # for line in lines:
        #     dll.PrintTextS(self.handle, f'{line}\n'.encode('gbk'))

        dll.PrintText(self.handle, "------------------------".encode("gbk"), 1, 16)

        dll.PrintAndFeedLine(self.handle)
        dll.PrintAndFeedLine(self.handle)
        dll.PrintAndFeedLine(self.handle)


        # 2. 用 bill_no 打印二维码
        bill_no = data.get("bill_no", "")
        if bill_no:
            dll.SetAlign(self.handle, 0)
            dll.PrintSymbol(self.handle, 49, bill_no.encode(), 48, 10, 10, 1)
            dll.SetAlign(self.handle, 0)
            dll.PrintAndFeedLine(self.handle)
        dll.PrintAndFeedLine(self.handle)
        dll.PrintText(self.handle, "------------------------".encode("gbk"), 1, 16)
        company_name = data.get("company_name", "")
        dll.PrintText(self.handle, f"公司名称：{company_name}\r\n".encode("gbk"), 1, 0)
        dll.CutPaperWithDistance(self.handle, 10)

    def __del__(self):
        dll.ClosePort(self.handle)
        dll.ReleasePrinter(self.handle)

# Example usage
if __name__ == "__main__":
    # Replace with your actual model and port setting
    printer = PrinterDemo('4B-2054A', 'USB,USB001')
    text = base64.b64decode(sys.argv[1]).decode()
    # qr_text = base64.b64decode(sys.argv[2]).decode()
    printer.print(text)
