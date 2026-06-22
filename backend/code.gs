// ==========================================
// CẤU HÌNH HỆ THỐNG DSLC 2026
// ==========================================
const SPREADSHEET_ID = '1vwG8pd_7cfSwEWifekt3WiDs4GIPwsWo4wad819k7TE'; 
const SPREADSHEET_TNV_ID = '18wysiypAqlEVDPQOLICMy248QAphCzH9yu9L6bnyavA';

// ==========================================
// 1. CỔNG ĐIỀU HƯỚNG TRUNG TÂM (ROUTER)
// ==========================================
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const sessionId = requestData.sessionId;
    
    // Giải mã sessionId để lấy mã TNV thực tế [cite: 189, 190]
    let maTNV = validateSession(sessionId);
    let responseData = { success: false, error: "Hành động không xác định!" };

    switch (action) {
      case "loginTNV": responseData = processLoginTNV(requestData.maTNV); break;
      case "loginAdmin": responseData = processLoginAdmin(requestData.user, requestData.pass); break;

      // Các case TNV [cite: 173, 175, 176, 178]
      case "diemDanhTNV": 
        if(!maTNV) return sendRes({success:false, error:"Phiên đăng nhập hết hạn!"});
        responseData = diemDanhTNV(maTNV, requestData); break;
      case "getLichSuDiemDanhTNV": 
        if(!maTNV) return sendRes({success:false, error:"Phiên đăng nhập hết hạn!"});
        responseData = getLichSuDiemDanhTNV(maTNV); break;
      case "submitMinhChung": 
        if(!maTNV) return sendRes({success:false, error:"Phiên đăng nhập hết hạn!"});
        responseData = submitMinhChung(maTNV, requestData); break;
      case "getMinhChungByTNV":
        if(!maTNV) return sendRes({success:false, error:"Phiên đăng nhập hết hạn!"});
        responseData = getMinhChungByTNV(maTNV); break;
      case "getGCNData": 
        if(!maTNV) return sendRes({success:false, error:"Phiên đăng nhập hết hạn!"});
        responseData = getGCNData(maTNV); break;
      case "submitYeuCauGCN":
        if(!maTNV) return sendRes({success:false, error:"Phiên đăng nhập hết hạn!"});
        responseData = submitYeuCauGCN(maTNV, requestData); break;

      // Các case ADMIN [cite: 179, 180, 181, 182, 183, 185]
      case "getAdminDashboard": responseData = getAdminDashboard(); break;
      case "getDanhSachMinhChungChoXet": responseData = getDanhSachMinhChungChoXet(requestData); break;
      case "adminDuyetMinhChung": responseData = adminDuyetMinhChung(requestData); break;
      case "getDanhSachYeuCauGCN": responseData = getDanhSachYeuCauGCN(requestData); break;
      case "adminCapGCN": responseData = adminCapGCN(requestData); break;
      case "getDanhSachNoLinkGCN": responseData = getDanhSachNoLinkGCN(requestData); break;
      case "adminCapNhatLinkGCN": responseData = adminCapNhatLinkGCN(requestData); break;
      case "getLichSuMinhChung": responseData = getLichSuMinhChung(requestData); break;
      case "adminSuaBuoiMC": responseData = adminSuaBuoiMC(requestData.maMC, requestData.soBuoiMoi); break;
      case "getLichSuGCN": responseData = getLichSuGCN(requestData); break; // Lấy danh sách lịch sử GCN
      case "adminUpdateMinhChung": responseData = adminUpdateMinhChung(requestData); break; // Chỉnh sửa Minh chứng
      case "adminUpdateGCN": responseData = adminUpdateGCN(requestData); break; // Chỉnh sửa GCN

      case "traCuuTNVAdmin": responseData = traCuuTNVAdmin(requestData); break;
      case "getDanhSachDiemTruc": responseData = getDanhSachDiemTruc(); break;
      case "adminThemTruongDiemTruc": responseData = adminThemTruongDiemTruc(requestData); break;
      case "getDanhSachTruongDiemTruc": responseData = getDanhSachTruongDiemTruc(); break;
      case "adminXoaTruongDiemTruc": responseData = adminXoaTruongDiemTruc(requestData); break;
      case "adminGhiNhanViPham": responseData = adminGhiNhanViPham(requestData); break;
      case "getLichSuViPham": responseData = getLichSuViPham(requestData); break;
      case "adminXoaViPham": responseData = adminXoaViPham(requestData); break;
      case "getBaoCaoViPham": responseData = getBaoCaoViPham(requestData); break;
      case "adminDuyetBaoCaoViPham": responseData = adminDuyetBaoCaoViPham(requestData); break;
      case "adminThucThiBaoCaoViPham": responseData = adminThucThiBaoCaoViPham(requestData); break;
      case "getDanhSachKhuVucCapTaiKhoan": responseData = getDanhSachKhuVucCapTaiKhoan(requestData); break;
      case "getDanhSachTaiKhoanAdmin": responseData = getDanhSachTaiKhoanAdmin(requestData); break;
      case "adminCapTaiKhoan": responseData = adminCapTaiKhoan(requestData); break;
      case "adminDoiTrangThaiTaiKhoan": responseData = adminDoiTrangThaiTaiKhoan(requestData); break;
      case "adminDoiMatKhauTaiKhoan": responseData = adminDoiMatKhauTaiKhoan(requestData); break;

    }
    return sendRes(responseData);
  } catch (error) {
    return sendRes({ success: false, error: "Lỗi Backend: " + error.message });
  }
}

// ==========================================
// 2. HÀM ÉP MÃ TNV VÀ HỌ TÊN CHUẨN
// ==========================================
function getTNVInfo(sessionId) {
  if (!sessionId) return { maTNV: "", hoTen: "Không xác định" };
  let str = sessionId.toString().trim();
  let ma = str;
  if (str.length > 20) { // Giải mã sessionId 
    try {
      let decoded = Utilities.newBlob(Utilities.base64Decode(str)).getDataAsString();
      if (decoded.includes('_')) ma = decoded.split('_')[0];
    } catch(e) {}
  }
  ma = ma.toUpperCase().replace(/\s/g, '');

  try {
    const ssTNV = SpreadsheetApp.openById(SPREADSHEET_TNV_ID);
    const data = ssTNV.getSheetByName('DanhSachTNV').getDataRange().getValues();
    for(let i = 1; i < data.length; i++) {
      let m = (data[i][1] || "").toString().toUpperCase().trim(); // Mã Cột B 
      let p = (data[i][7] || "").toString().toUpperCase().replace(/\s/g, ''); // SĐT Cột H [cite: 214]
      if(m === ma || p === ma) {
        return { maTNV: m, hoTen: (data[i][2] || "").toString().trim() }; // Tên Cột C [cite: 215]
      }
    }
  } catch(e) {}
  return { maTNV: ma, hoTen: "Không xác định" };
}


// ==========================================
// 3. TÍNH TỔNG BUỔI SAU KHI TRỪ VI PHẠM
// ==========================================
function getTongBuoi(inputTNV) {
  return Math.max(getSoBuoiCongGoc(inputTNV) - getSoBuoiTru(inputTNV), 0);
}

function getSoBuoiCongGoc(inputTNV) {
  const info = getTNVInfo(inputTNV);
  const cleanMa = (info.maTNV || "").toString().toUpperCase().trim();
  if (!cleanMa) return 0;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let total = 0;

  // DiemDanh_TongHop: Mã TNV cột A, tổng buổi ngày cột M.
  const sheetDD = ss.getSheetByName('DiemDanh_TongHop');
  if (sheetDD) {
    const rows = sheetDD.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || "").toString().toUpperCase().trim() === cleanMa) {
        total += Number(rows[i][12] || 0);
      }
    }
  }

  // MINHCHUNG: Mã TNV cột B, trạng thái cột H, số buổi cộng cột K.
  const sheetMC = ss.getSheetByName('MINHCHUNG') || ss.getSheetByName('MinhChung');
  if (sheetMC) {
    const rows = sheetMC.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][1] || "").toString().toUpperCase().trim() === cleanMa && rows[i][7] === 'Đã duyệt') {
        total += Number(rows[i][10] || 0);
      }
    }
  }
  return Number(total.toFixed(2));
}

function getSoBuoiTru(inputTNV) {
  const info = getTNVInfo(inputTNV);
  const cleanMa = (info.maTNV || "").toString().toUpperCase().trim();
  if (!cleanMa) return 0;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('ViPham');
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const rows = sheet.getDataRange().getValues();
  let total = 0;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][1] || "").toString().toUpperCase().trim() === cleanMa) {
      total += Number(rows[i][7] || 0); // Cột H: SoBuoiTru
    }
  }
  return Number(total.toFixed(2));
}

// ==========================================
// 4. CÁC HÀM HỖ TRỢ KHÁC (Giữ nguyên các hàm bổ trợ của bạn)
// ==========================================
function sendRes(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function validateSession(sessionId) {
  try {
    if (!sessionId || sessionId.startsWith("ADMIN_")) return null;
    const decodedString = Utilities.newBlob(Utilities.base64Decode(sessionId)).getDataAsString();
    return decodedString.split("_")[0]; 
  } catch (e) { return null; }
}

function processLoginTNV(input) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_TNV_ID);
  const data = ss.getSheetByName('DanhSachTNV').getDataRange().getValues();
  const cleanInput = (input || "").toString().trim().toUpperCase().replace(/\s/g, '');
  for (let i = 1; i < data.length; i++) {
    let m = (data[i][1] || "").toString().toUpperCase().trim();
    let p = (data[i][7] || "").toString().toUpperCase().replace(/\s/g, '');
    if (m === cleanInput || p === cleanInput) {
      return { success: true, sessionId: Utilities.base64Encode(m + "_" + new Date().getTime()), role: 'TNV', hoTen: data[i][2] };
    }
  }
  return { success: false, error: "Sai thông tin đăng nhập!" };
}

function normalizeRole_(role) {
  return (role || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, "_");
}

function parseScope_(scope) {
  const raw = (scope || "").toString().trim();
  if (!raw) return [];
  if (raw.toUpperCase() === "ALL") return ["ALL"];

  return raw
    .split(/[;,|]/)
    .map(x => x.trim().toUpperCase())
    .filter(Boolean);
}

function processLoginAdmin(user, pass) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("PhanQuyen_Admin");
  if (!sheet) return { success: false, error: "Chưa có sheet PhanQuyen_Admin" };

  const data = sheet.getDataRange().getValues();
  const cleanUser = (user || "").toString().trim().toLowerCase();
  const cleanPass = (pass || "").toString();

  for (let i = 1; i < data.length; i++) {
    const email = (data[i][0] || "").toString().trim().toLowerCase();
    const hoTen = data[i][1] || "";
    const capQuyen = data[i][2] || "";
    const phamVi = data[i][3] || "";
    const trangThai = (data[i][4] || "").toString().trim();
    const matKhau = (data[i][5] || "").toString();

    if (email === cleanUser && matKhau === cleanPass) {
      if (trangThai !== "Hoạt động") {
        return { success: false, error: "Tài khoản admin đã bị khóa hoặc ngừng hoạt động." };
      }

      return {
        success: true,
        sessionId: "ADMIN_" + Utilities.base64Encode(email + "_" + new Date().getTime()),
        role: "Admin",
        email: email,
        adminName: hoTen,
        capQuyen: capQuyen,
        capQuyenKey: normalizeRole_(capQuyen),
        phamVi: phamVi,
        phamViList: parseScope_(phamVi)
      };
    }
  }

  return { success: false, error: "Sai tài khoản quản trị!" };
}

function getAdminInfoFromSession_(sessionId) {
  try {
    if (!sessionId || !sessionId.toString().startsWith("ADMIN_")) return null;

    const encoded = sessionId.toString().replace("ADMIN_", "");
    const decoded = Utilities.newBlob(Utilities.base64Decode(encoded)).getDataAsString();
    const email = decoded.split("_")[0].toLowerCase();

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("PhanQuyen_Admin");
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const rowEmail = (data[i][0] || "").toString().trim().toLowerCase();
      if (rowEmail === email) {
        const trangThai = (data[i][4] || "").toString().trim();
        if (trangThai !== "Hoạt động") return null;

        return {
          email: rowEmail,
          adminName: data[i][1] || "",
          capQuyen: data[i][2] || "",
          capQuyenKey: normalizeRole_(data[i][2]),
          phamVi: data[i][3] || "",
          phamViList: parseScope_(data[i][3])
        };
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

function isGlobalAdmin_(admin) {
  if (!admin) return false;
  return ["superadmin", "admin"].includes(admin.capQuyenKey) || admin.phamViList.includes("ALL");
}

function canAccessKhuVuc_(admin, maKhuVuc) {
  if (!admin) return false;
  if (isGlobalAdmin_(admin)) return true;

  const kv = (maKhuVuc || "").toString().trim().toUpperCase();
  if (!kv) return false;

  return admin.phamViList.includes(kv);
}

function canAccessFeature_(admin, feature) {
  if (!admin) return false;

  const role = admin.capQuyenKey;
  const matrix = {
    dashboard: ["superadmin", "admin", "admin_khu_vuc", "kho_bai", "acc"],
    minhchung: ["superadmin", "admin", "admin_khu_vuc"],
    gcn: ["superadmin", "admin", "acc", "admin_khu_vuc"],
    kho: ["superadmin", "kho_bai"],
    acc: ["superadmin", "acc"],
    nhansu: ["superadmin", "admin"],
    vipham: ["superadmin", "admin", "admin_khu_vuc"],
    taikhoan: ["superadmin"]
  };

  return (matrix[feature] || []).includes(role);
}

function requireAdmin_(requestData, feature) {
  const admin = getAdminInfoFromSession_(requestData.sessionId);
  if (!admin) return { ok: false, error: "Phiên admin không hợp lệ hoặc đã hết hạn." };

  if (feature && !canAccessFeature_(admin, feature)) {
    return { ok: false, error: "Bạn không có quyền sử dụng chức năng này." };
  }

  return { ok: true, admin: admin };
}

function parseHeSoNhan_(value, defaultValue) {
  const str = (value === null || value === undefined ? '' : value)
    .toString()
    .trim()
    .replace(',', '.');

  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? defaultValue : num;
}