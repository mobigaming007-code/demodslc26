import { readFile, writeFile } from "node:fs/promises";

const mcPath = "backend/minhchung.gs";
let mc = await readFile(mcPath, "utf8");
const start = mc.indexOf("function submitMinhChung");
const marker = "  return {\r\n    success: true,";
const at = mc.indexOf(marker, start);
if (at < 0) throw new Error("Không tìm thấy phản hồi submitMinhChung");
const item = `\n    item: {\n      maMC: maMC,\n      thoiGian: Utilities.formatDate(createdAt, "GMT+7", "HH:mm dd/MM/yyyy"),\n      hangMuc: data.hangMuc,\n      moTa: data.moTa,\n      anhUrl: url,\n      trangThai: "Chờ duyệt",\n      soBuoi: 0,\n      ghiChu: "",\n      maKhuVuc: maKhuVucNhan\n    },`;
mc = mc.slice(0, at + marker.length) + item + mc.slice(at + marker.length);
await writeFile(mcPath, mc, "utf8");

const ddPath = "backend/diemdanh.gs";
let dd = await readFile(ddPath, "utf8");
const returnStart = dd.indexOf("  return { success: hopLe, message:", dd.indexOf("function diemDanhTNV"));
const returnEnd = dd.indexOf("\n}", returnStart);
if (returnStart < 0 || returnEnd < 0) throw new Error("Không tìm thấy phản hồi diemDanhTNV");
dd = dd.slice(0, returnStart) + `  return {\n    success: hopLe,\n    message: hopLe ? "Điểm danh " + loaiQuet + " thành công!" : lyDo,\n    item: {\n      thoiGian: Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy"),\n      buoi: currentBuoi === "SANG" ? "Sáng" : "Chiều",\n      diaDiem: matchedKV.ten,\n      checkIn: loaiQuet === "CHECKIN" ? Utilities.formatDate(now, "GMT+7", "HH:mm") : "",\n      checkOut: loaiQuet === "CHECKOUT" ? Utilities.formatDate(now, "GMT+7", "HH:mm") : "",\n      trangThai: loaiQuet === "CHECKIN" ? "Chỉ check-in" : "Hoàn tất",\n      ghiChu: loaiQuet === "CHECKIN" ? "Chưa có check-out" : "Đã có check-in và check-out"\n    }\n  };` + dd.slice(returnEnd);
await writeFile(ddPath, dd, "utf8");
