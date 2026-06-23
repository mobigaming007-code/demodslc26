// ==========================================
// QUẢN TRỊ VIÊN (ADMIN) - BẢN ĐỒNG BỘ FULL
// ==========================================

/**
 * 0. Hàm Helper: Tra cứu SĐT từ DanhSachTNV
 * Kéo SĐT từ cột H của file DanhSachTNV để Admin tiện liên lạc
 */
function getTNVPhoneMap() {
  try {
    const ssSource = SpreadsheetApp.openById(SPREADSHEET_TNV_ID); // File DanhSachTNV
    const data = ssSource.getSheetByName('DanhSachTNV').getDataRange().getValues();
    let map = {};
    for (let i = 1; i < data.length; i++) {
      let maTNV = data[i][1] ? data[i][1].toString().trim().toUpperCase() : "";
      if(maTNV) {
        map[maTNV] = data[i][7] ? data[i][7].toString() : "Không có SĐT"; // Cột H (Index 7)
      }
    }
    return map;
  } catch (e) {
    return {};
  }
}

/**
 * 1. Lấy dữ liệu Tổng quan (Dashboard)
 */
function getAdminDashboard() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Thống kê Điểm danh
    const rawData = ss.getSheetByName('DiemDanh_Raw').getDataRange().getValues();
    const todayStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
    let luotQuetHomNay = 0;
    let recentLogs = [];
    
    for (let i = 1; i < rawData.length; i++) {
      if (Utilities.formatDate(new Date(rawData[i][0]), "GMT+7", "yyyy-MM-dd") === todayStr) {
        luotQuetHomNay++;
      }
    }
    
    if (rawData.length > 1) {
      recentLogs = rawData.slice(-10).reverse().map(r => ({
        thoiGian: r[0] instanceof Date ? Utilities.formatDate(r[0], "GMT+7", "HH:mm dd/MM") : r[0],
        maTNV: r[1], hoTen: r[2], loai: r[4], hopLe: r[8]
      }));
    }

    // Thống kê Minh chứng
    const mcData = ss.getSheetByName('MINHCHUNG').getDataRange().getValues();
    let mcChoDuyet = 0;
    for (let i = 1; i < mcData.length; i++) {
      if (mcData[i][7] === 'Chờ duyệt') mcChoDuyet++;
    }

    // Thống kê GCN
    const gcnData = ss.getSheetByName('YeuCauGCN').getDataRange().getValues();
    let gcnChoXuLy = 0;
    let gcnHenTra = 0;
    for (let i = 1; i < gcnData.length; i++) {
      let trangThai = gcnData[i][7] ? gcnData[i][7].toString().trim() : "";
      if (trangThai === 'Chờ duyệt' || trangThai === 'Chờ xử lý') gcnChoXuLy++;
      if (trangThai === 'Hẹn ngày trả') gcnHenTra++;
    }

    return { 
      success: true, 
      stats: { 
        tongLuotRaw: rawData.length - 1, 
        luotQuetHomNay: luotQuetHomNay, 
        mcChoDuyet: mcChoDuyet, 
        gcnChoDuyet: gcnChoXuLy,
        noLinkGCN: gcnHenTra // Ánh xạ biến cho html nhận diện
      },
      recentLogs: recentLogs
    };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * 2. Lấy danh sách Minh chứng chờ duyệt (Kèm SĐT)
 */
function getDanhSachMinhChungChoXet(requestData) {
  try {
    const auth = requireAdmin_(requestData, "minhchung");
    if (!auth.ok) return { success: false, error: auth.error };

    const admin = auth.admin;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const mcSheet = ss.getSheetByName("MINHCHUNG") || ss.getSheetByName("MinhChung");
    if (!mcSheet) return { success: false, error: "Không tìm thấy sheet MINHCHUNG/MinhChung." };

    const mcData = mcSheet.getDataRange().getValues();
    const phoneMap = getTNVPhoneMap();
    let list = [];

    for (let i = 1; i < mcData.length; i++) {
      if (mcData[i][7] === "Chờ duyệt") {
        const maKhuVuc = (mcData[i][12] || "").toString().trim().toUpperCase();
        if (!canAccessKhuVuc_(admin, maKhuVuc)) continue;

        let maTNV = mcData[i][1] ? mcData[i][1].toString().trim().toUpperCase() : "";
        list.push({
          maMC: mcData[i][0],
          maTNV: maTNV,
          hoTen: mcData[i][2],
          sdt: phoneMap[maTNV] || "Không rõ",
          thoiGian: mcData[i][3] instanceof Date ? Utilities.formatDate(mcData[i][3], "GMT+7", "HH:mm dd/MM") : mcData[i][3],
          hangMuc: mcData[i][4],
          moTa: mcData[i][5],
          anhUrl: mcData[i][6],
          maKhuVuc: maKhuVuc
        });
      }
    }

    return { success: true, data: list.reverse() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 3. Duyệt minh chứng
 */
function adminDuyetMinhChung(requestData) {
  try {
    const auth = requireAdmin_(requestData, "minhchung");
    if (!auth.ok) return { success: false, error: auth.error };

    const admin = auth.admin;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("MINHCHUNG") || ss.getSheetByName("MinhChung");
    if (!sheet) return { success: false, error: "Không tìm thấy sheet MINHCHUNG/MinhChung." };

    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === requestData.maMC) {
        const maKhuVuc = (values[i][12] || "").toString().trim().toUpperCase();

        if (!canAccessKhuVuc_(admin, maKhuVuc)) {
          return { success: false, error: "Bạn không có quyền duyệt minh chứng của khu vực này." };
        }

        const row = i + 1;
        sheet.getRange(row, 8, 1, 5).setValues([[
          requestData.status,
          admin.adminName,
          new Date(),
          requestData.soBuoi,
          requestData.ghiChu
        ]]);

        return {
          success: true,
          item: { maMC: requestData.maMC, trangThai: requestData.status, soBuoi: requestData.soBuoi, ghiChu: requestData.ghiChu }
        };
      }
    }

    return { success: false, error: "Không tìm thấy mã minh chứng." };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 4. Lấy danh sách Yêu cầu GCN chờ xử lý (Kèm SĐT)
 */
function getDanhSachYeuCauGCN(requestData) {
  try {
    const auth = requireAdmin_(requestData, "gcn");
    if (!auth.ok) return { success: false, error: auth.error };
    const admin = auth.admin;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const data = ss.getSheetByName('YeuCauGCN').getDataRange().getValues();
    const phoneMap = getTNVPhoneMap();
    const tongBuoiMap = getTongBuoiMapForAdmin_(ss);
    let list = [];
    
    for (let i = 1; i < data.length; i++) {
      let trangThai = data[i][7] ? data[i][7].toString().trim() : "";
      if (trangThai === 'Chờ xử lý' || trangThai === 'Chờ duyệt') {
        let maTNV = data[i][2] ? data[i][2].toString().trim().toUpperCase() : "";
        const maKhuVuc = getKhuVucDiemDanhGanNhat_(maTNV);
        if (!canAccessKhuVuc_(admin, maKhuVuc)) continue;
        list.push({
          maYC: data[i][0], dot: data[i][1], maTNV: maTNV, hoTen: data[i][3],
          sdt: phoneMap[maTNV] || 'Không rõ',
          ngayGui: data[i][4] instanceof Date ? Utilities.formatDate(data[i][4], "GMT+7", "dd/MM/yyyy") : data[i][4],
          tongBuoi: data[i][5], tongBuoiHienTai: tongBuoiMap[maTNV] || 0, soBuoiTru: 0, loaiGCN: data[i][6]
        });
      }
    }
    return { success: true, data: list.reverse() };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * 5. Cấp / Xử lý GCN
 */
function adminCapGCN(requestData) {
  try {
    const auth = requireAdmin_(requestData, "gcn");
    if (!auth.ok) return { success: false, error: auth.error };
    const admin = auth.admin;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('YeuCauGCN');
    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === requestData.maYC) {
        const maTNV = (values[i][2] || '').toString().trim().toUpperCase();
        if (!canAccessKhuVuc_(admin, getKhuVucDiemDanhGanNhat_(maTNV))) {
          return { success: false, error: 'Bạn không có quyền xử lý GCN của khu vực này.' };
        }
        const row = i + 1;
        // Cập nhật TrangThai(8), NgayHenTra(9), GCN_URL(10), AdminXuLy(11), GhiChu(12)
        sheet.getRange(row, 8, 1, 5).setValues([[requestData.status, requestData.ngayHen, requestData.urlGCN, requestData.adminName, requestData.ghiChu]]);
        return {
          success: true,
          item: { maYC: requestData.maYC, trangThai: requestData.status, ngayHenTra: requestData.ngayHen || '', gcnUrl: requestData.urlGCN || '' }
        };
      }
    }
    return { success: false, error: 'Không tìm thấy yêu cầu GCN.' };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * 6. Lấy danh sách GCN đang Nợ (Trạng thái: Hẹn ngày trả)
 */
function getDanhSachNoLinkGCN(requestData) {
  try {
    const auth = requireAdmin_(requestData, "gcn");
    if (!auth.ok) return { success: false, error: auth.error };
    const admin = auth.admin;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const data = ss.getSheetByName('YeuCauGCN').getDataRange().getValues();
    const phoneMap = getTNVPhoneMap();
    let list = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][7] === 'Hẹn ngày trả') {
        let maTNV = data[i][2] ? data[i][2].toString().trim().toUpperCase() : "";
        const maKhuVuc = getKhuVucDiemDanhGanNhat_(maTNV);
        if (!canAccessKhuVuc_(admin, maKhuVuc)) continue;
        list.push({
          maYC: data[i][0], dot: data[i][1], maTNV: maTNV, hoTen: data[i][3],
          sdt: phoneMap[maTNV] || 'Không rõ',
          loaiGCN: data[i][6], 
          ngayHenTra: (data[i][8] instanceof Date) 
              ? Utilities.formatDate(data[i][8], "GMT+7", "dd/MM/yyyy") 
              : data[i][8],
        });
      }
    }
    return { success: true, data: list.reverse() };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * 7. Bổ sung Link GCN và Đổi trạng thái thành Hoàn Thành
 */
function adminCapNhatLinkGCN(requestData) {
  try {
    const auth = requireAdmin_(requestData, "gcn");
    if (!auth.ok) return { success: false, error: auth.error };
    const admin = auth.admin;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('YeuCauGCN');
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
      if(data[i][0] === requestData.maYC) {
        const maTNV = (data[i][2] || '').toString().trim().toUpperCase();
        if (!canAccessKhuVuc_(admin, getKhuVucDiemDanhGanNhat_(maTNV))) {
          return { success: false, error: 'Bạn không có quyền cập nhật GCN của khu vực này.' };
        }
        sheet.getRange(i+1, 8).setValue('Hoàn thành'); // Đổi thành Hoàn thành
        sheet.getRange(i+1, 10).setValue(requestData.urlGCN);
        sheet.getRange(i+1, 11).setValue(requestData.adminName);
        return { success: true };
      }
    }
    return { success: false, error: 'Không tìm thấy Yêu cầu' };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * 8. Lấy Lịch sử Minh chứng đã xử lý
 */
function getLichSuMinhChung(requestData) {
  try {
    const auth = requireAdmin_(requestData, "minhchung");
    if (!auth.ok) return { success: false, error: auth.error };

    const admin = auth.admin;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("MINHCHUNG") || ss.getSheetByName("MinhChung");
    if (!sheet) return { success: false, error: "Không tìm thấy sheet MINHCHUNG/MinhChung." };

    const data = sheet.getDataRange().getValues();
    const phoneMap = getTNVPhoneMap();
    let list = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][7] !== "Chờ duyệt") {
        const maKhuVuc = (data[i][12] || "").toString().trim().toUpperCase();
        if (!canAccessKhuVuc_(admin, maKhuVuc)) continue;

        let maTNV = data[i][1] ? data[i][1].toString().trim().toUpperCase() : "";
        list.push({
          maMC: data[i][0],
          maTNV: maTNV,
          hoTen: data[i][2],
          sdt: phoneMap[maTNV] || "",
          hangMuc: data[i][4],
          moTa: data[i][5],
          anhUrl: data[i][6],
          trangThai: data[i][7],
          admin: data[i][8],
          thoiGianDuyet: data[i][9] instanceof Date ? Utilities.formatDate(data[i][9], "GMT+7", "HH:mm dd/MM") : data[i][9],
          soBuoi: data[i][10],
          ghiChu: data[i][11],
          maKhuVuc: maKhuVuc
        });
      }
    }

    return { success: true, data: list.reverse().slice(0, 50) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 9. Lấy Lịch sử GCN đã xử lý
 */
/**
 * Lấy danh sách Lịch sử GCN
 * Chỉ hiển thị: Hoàn thành, Hẹn ngày trả, Từ chối[cite: 8]
 */
/**
 * Lấy Lịch sử GCN dựa trên cấu trúc hoạt động của Lịch sử MC
 */
function getLichSuGCN(requestData) {
  try {
    const auth = requireAdmin_(requestData, "gcn");
    if (!auth.ok) return { success: false, error: auth.error };
    const admin = auth.admin;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);//[cite: 7]
    const sheet = ss.getSheetByName('YeuCauGCN');//[cite: 7]
    if (!sheet) return { success: false, error: "Không tìm thấy sheet YeuCauGCN" };

    const data = sheet.getDataRange().getValues();//[cite: 7]
    const phoneMap = getTNVPhoneMap();
    const tongBuoiMap = getTongBuoiMapForAdmin_(ss); // Lấy Map SĐT từ DanhSachTNV
    let list = [];
    
    // Các trạng thái cho phép hiển thị trong lịch sử
    const hopLe = ["Hoàn thành", "Hẹn ngày trả", "Từ chối"];

    for (let i = 1; i < data.length; i++) {
      let trangThai = (data[i][7] || "").toString().trim(); // Cột H (Index 7)
      
      if (hopLe.includes(trangThai)) {
        let maTNV = (data[i][2] || "").toString().trim().toUpperCase();
        if (!canAccessKhuVuc_(admin, getKhuVucDiemDanhGanNhat_(maTNV))) continue; // Cột C (Index 2)
        
        list.push({
          maYC: data[i][0],      // Cột A: MaYeuCau
          dot: data[i][1],       // Cột B: Dot
          maTNV: maTNV,          // Cột C: MaTNV
          hoTen: data[i][3],     // Cột D: HoTen
          sdt: phoneMap[maTNV] || "N/A", // Tra cứu SĐT từ map[cite: 6]
          ngayGui: (data[i][4] instanceof Date) ? Utilities.formatDate(data[i][4], "GMT+7", "dd/MM/yyyy") : data[i][4], // Cột E
          tongBuoi: data[i][5],  // Cột F: TongBuoi
          soBuoiTru: 0,
          tongBuoiHienTai: tongBuoiMap[maTNV] || 0,
          loaiGCN: data[i][6],   // Cột G: LoaiGCN
          trangThai: trangThai,  // Cột H: TrangThai
          ngayHenTra: (data[i][8] instanceof Date) ? Utilities.formatDate(data[i][8], "GMT+7", "dd/MM/yyyy") : data[i][8], // Cột I
          gcnUrl: data[i][9],    // Cột J: GCN_URL
          admin: data[i][10],    // Cột K: AdminXuLy
          ghiChu: data[i][11]    // Cột L: GhiChu
        });
      }
    }
    // Trả về dữ liệu đảo ngược (mới nhất lên đầu) giống Lịch sử MC[cite: 6]
    return { success: true, data: list.reverse().slice(0, 50) };//[cite: 6]
  } catch (e) { 
    return { success: false, error: e.message }; 
  }
}

/**
 * Chỉnh sửa Minh chứng từ trang Lịch sử MC[cite: 11]
 */
function adminUpdateMinhChung(requestData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('MINHCHUNG');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === requestData.maMC) {
        const row = i + 1;
        // Cập nhật lại các cột: Trạng thái (H), Admin (I), Thời gian (J), Số buổi (K), Ghi chú (L)[cite: 11]
        sheet.getRange(row, 8, 1, 5).setValues([[
          requestData.status, 
          requestData.adminName, 
          new Date(), 
          requestData.soBuoi, 
          requestData.ghiChu
        ]]);
        return { success: true };
      }
    }
    return { success: false, error: "Không tìm thấy mã MC" };
  } catch (e) { return { success: false, error: e.message }; }
}

/**
 * Chỉnh sửa GCN từ trang Lịch sử GCN[cite: 11]
 */
function adminUpdateGCN(requestData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('YeuCauGCN');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === requestData.maYC) {
        const row = i + 1;
        // Cập nhật: Trạng thái (H), Ngày hẹn (I), Link (J), Admin xử lý (K), Ghi chú (L)[cite: 11]
        sheet.getRange(row, 8, 1, 5).setValues([[
          requestData.status, 
          requestData.ngayHen, 
          requestData.urlGCN, 
          requestData.adminName, 
          requestData.ghiChu
        ]]);
        return { success: true };
      }
    }
  } catch (e) { return { success: false, error: e.message }; }
}

// ==========================================
// 10. TRƯỞNG ĐIỂM TRỰC & VI PHẠM
// ==========================================

const SHEET_TRUONG_DIEM_TRUC = 'TruongDiemTruc';
const SHEET_CAU_HINH_DIEM_DAC_BIET = 'CauHinhDiemDacBiet';
const SHEET_VI_PHAM = 'ViPham';

function ensureSheet_(sheetName, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function normalizeText_(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '');
}

function dateKey_(value) {
  if (!value) return '';
  let d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return value.toString().trim();
  return Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd');
}

function thuVN_(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  const thu = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return thu[d.getDay()];
}

function getViPhamSheet_() {
  return ensureSheet_(SHEET_VI_PHAM, [
    'ThoiGian', 'MaTNV', 'HoTen', 'SDT', 'ThongTinViPham',
    'QuyetDinhXuPhat', 'LinkQuyetDinhXuPhat', 'SoBuoiTru', 'AdminXuLy'
  ]);
}

function getTruongDiemSheet_() {
  const headers = [
    'ThoiGianTao', 'MaTNV', 'HoTen', 'SDT', 'NgayTruc',
    'Thu', 'Buoi', 'DiemTruc', 'AdminXuLy', 'TrangThai', 'HeSoNhan'
  ];
  const sheet = ensureSheet_(SHEET_TRUONG_DIEM_TRUC, headers);

  // Bổ sung cột K nếu sheet TruongDiemTruc đã tồn tại từ bản cũ chỉ có 10 cột.
  const lastCol = Math.max(sheet.getLastColumn(), headers.length);
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if ((headerRow[10] || '').toString().trim() !== 'HeSoNhan') {
    sheet.getRange(1, 11).setValue('HeSoNhan'); // Cột K
  }
  return sheet;
}

function getKhuVucMetaByAnyValue_(value) {
  const clean = normalizeText_(value);
  if (!clean) return null;
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('CauHinhKhuVuc');
    if (!sheet) return null;
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const ma = (rows[i][0] || '').toString().trim().toUpperCase(); // Cột A: Mã khu vực
      const ten = (rows[i][1] || '').toString().trim();              // Cột B: Tên khu vực
      const qr = (rows[i][2] || '').toString().trim();               // Cột C: Mã QR
      if ([ma, ten, qr].some(v => normalizeText_(v) === clean)) {
        return { maKhuVuc: ma, tenKhuVuc: ten, qrCode: qr, isDDB: ma.indexOf('DDB') !== -1 };
      }
    }
  } catch (e) {}
  return null;
}

function isSameDiemTruc_(a, b) {
  const cleanA = normalizeText_(a);
  const cleanB = normalizeText_(b);
  if (!cleanA || cleanA === 'tatca' || cleanA === 'all') return true;
  if (!cleanB || cleanB === 'tatca' || cleanB === 'all') return true;
  if (cleanA === cleanB) return true;

  // Cho phép so khớp chéo Mã khu vực / Tên khu vực / Mã QR để dữ liệu cũ vẫn tính được.
  const metaA = getKhuVucMetaByAnyValue_(a);
  const metaB = getKhuVucMetaByAnyValue_(b);
  return !!(metaA && metaB && metaA.maKhuVuc && metaA.maKhuVuc === metaB.maKhuVuc);
}

function traCuuTNVAdmin(requestData) {
  try {
    const keyword = (requestData.keyword || requestData.maTNV || '').toString().trim();
    if (!keyword) return { success: false, error: 'Vui lòng nhập mã TNV hoặc SĐT.' };

    const ssTNV = SpreadsheetApp.openById(SPREADSHEET_TNV_ID);
    const rows = ssTNV.getSheetByName('DanhSachTNV').getDataRange().getValues();
    const clean = keyword.toUpperCase().replace(/\s/g, '');

    for (let i = 1; i < rows.length; i++) {
      const ma = (rows[i][1] || '').toString().toUpperCase().trim();
      const phone = (rows[i][7] || '').toString().toUpperCase().replace(/\s/g, '');
      if (ma === clean || phone === clean) {
        const soBuoiCong = getSoBuoiCongGoc(ma);
        const soBuoiTru = getSoBuoiTru(ma);
        return {
          success: true,
          data: {
            maTNV: ma,
            hoTen: rows[i][2] || '',
            sdt: rows[i][7] || '',
            soBuoiCong: soBuoiCong,
            soBuoiTru: soBuoiTru,
            tongBuoi: Math.max(soBuoiCong - soBuoiTru, 0)
          }
        };
      }
    }
    return { success: false, error: 'Không tìm thấy TNV.' };
  } catch (e) { return { success: false, error: e.message }; }
}

function getDanhSachDiemTruc() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('CauHinhKhuVuc');
    if (!sheet) return { success: false, error: 'Không tìm thấy sheet CauHinhKhuVuc.' };
    const rows = sheet.getDataRange().getValues();
    const list = [];
    for (let i = 1; i < rows.length; i++) {
      const ma = (rows[i][0] || '').toString().trim().toUpperCase();
      const ten = rows[i][1] || '';
      const qr = rows[i][2] || '';
      const status = rows[i][6] || '';
      if (ma || ten || qr) {
        const labelParts = [];
        if (ma) labelParts.push(ma);
        if (ten) labelParts.push(ten);
        if (qr) labelParts.push('QR: ' + qr);
        list.push({
          maKhuVuc: ma,
          ten,
          qr,
          status,
          // Cột H sheet TruongDiemTruc phải lưu QR Token, không lưu mã khu vực.
          // Nhận diện điểm đặc biệt bằng QR Token có chứa DDB, ví dụ DSLC2026_DDB_111DD178.
          isDDB: qr.toString().toUpperCase().indexOf('DDB') !== -1 || ma.indexOf('DDB') !== -1,
          value: qr || ma || ten,
          label: labelParts.join(' - ')
        });
      }
    }
    return { success: true, data: list };
  } catch (e) { return { success: false, error: e.message }; }
}

const SHEET_CAU_HINH_KHU_VUC = 'CauHinhKhuVuc';
const CAU_HINH_KHU_VUC_HEADERS = ['MaKhuVuc', 'TenKhuVuc', 'MaQRToken', 'ViDo', 'KinhDo', 'BanKinhMet', 'TrangThai'];

function getCauHinhKhuVucSheet_() {
  return ensureSheet_(SHEET_CAU_HINH_KHU_VUC, CAU_HINH_KHU_VUC_HEADERS);
}

function getQuanLyKhuVuc(requestData) {
  try {
    const auth = requireAdmin_(requestData || {}, 'diemtruc');
    if (!auth.ok) return { success: false, error: auth.error };
    const rows = getCauHinhKhuVucSheet_().getDataRange().getValues();
    return {
      success: true,
      data: rows.slice(1).map((row, index) => ({
        rowNumber: index + 2,
        maKhuVuc: row[0] || '', tenKhuVuc: row[1] || '', maQRToken: row[2] || '',
        viDo: row[3] || '', kinhDo: row[4] || '', banKinhMet: row[5] || '',
        trangThai: row[6] || 'Hoạt động'
      }))
    };
  } catch (e) { return { success: false, error: e.message }; }
}

function validateKhuVucInput_(data) {
  const maKhuVuc = (data.maKhuVuc || '').toString().trim().toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const tenKhuVuc = (data.tenKhuVuc || '').toString().trim();
  const maQRToken = (data.maQRToken || '').toString().trim().toUpperCase();
  const viDo = Number(data.viDo), kinhDo = Number(data.kinhDo), banKinhMet = Number(data.banKinhMet);
  const trangThai = (data.trangThai || 'Hoạt động').toString().trim();
  if (!maKhuVuc || !tenKhuVuc || !maQRToken) throw new Error('Vui lòng nhập đủ mã, tên khu vực và QR Token.');
  if (!/^DSLC_[A-Z0-9_]+_[A-Z0-9]{8}$/.test(maQRToken)) throw new Error('QR Token không đúng định dạng DSLC_(Mã khu vực)_(8 ký tự).');
  if (maQRToken.indexOf('DSLC_' + maKhuVuc + '_') !== 0) throw new Error('QR Token phải khớp với mã khu vực.');
  if (!isFinite(viDo) || viDo < -90 || viDo > 90 || !isFinite(kinhDo) || kinhDo < -180 || kinhDo > 180) throw new Error('Vĩ độ hoặc kinh độ không hợp lệ.');
  if (!isFinite(banKinhMet) || banKinhMet <= 0) throw new Error('Bán kính điểm danh phải lớn hơn 0 mét.');
  if (!['Hoạt động', 'Đã khóa'].includes(trangThai)) throw new Error('Trạng thái không hợp lệ.');
  return { maKhuVuc: maKhuVuc, tenKhuVuc: tenKhuVuc, maQRToken: maQRToken, viDo: viDo, kinhDo: kinhDo, banKinhMet: banKinhMet, trangThai: trangThai };
}

function adminLuuKhuVuc(requestData) {
  try {
    const auth = requireAdmin_(requestData || {}, 'diemtruc');
    if (!auth.ok) return { success: false, error: auth.error };
    const data = validateKhuVucInput_(requestData || {});
    const sheet = getCauHinhKhuVucSheet_();
    const rowNumber = Number((requestData || {}).rowNumber || 0);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (i + 1 === rowNumber) continue;
      if ((rows[i][0] || '').toString().trim().toUpperCase() === data.maKhuVuc) return { success: false, error: 'Mã khu vực đã tồn tại.' };
      if ((rows[i][2] || '').toString().trim().toUpperCase() === data.maQRToken) return { success: false, error: 'QR Token đã tồn tại.' };
    }
    const values = [[data.maKhuVuc, data.tenKhuVuc, data.maQRToken, data.viDo, data.kinhDo, data.banKinhMet, data.trangThai]];
    if (rowNumber >= 2 && rowNumber <= sheet.getLastRow()) {
      sheet.getRange(rowNumber, 1, 1, 7).setValues(values);
      return { success: true, message: 'Đã cập nhật điểm trực.', item: Object.assign({ rowNumber: rowNumber }, data) };
    }
    sheet.appendRow(values[0]);
    return { success: true, message: 'Đã thêm điểm trực.', item: Object.assign({ rowNumber: sheet.getLastRow() }, data) };
  } catch (e) { return { success: false, error: e.message }; }
}

function adminDoiTrangThaiKhuVuc(requestData) {
  try {
    const auth = requireAdmin_(requestData || {}, 'diemtruc');
    if (!auth.ok) return { success: false, error: auth.error };
    const rowNumber = Number((requestData || {}).rowNumber || 0);
    const trangThai = ((requestData || {}).trangThai || '').toString().trim();
    const sheet = getCauHinhKhuVucSheet_();
    if (rowNumber < 2 || rowNumber > sheet.getLastRow()) return { success: false, error: 'Không tìm thấy điểm trực.' };
    if (!['Hoạt động', 'Đã khóa'].includes(trangThai)) return { success: false, error: 'Trạng thái không hợp lệ.' };
    sheet.getRange(rowNumber, 7).setValue(trangThai);
    return { success: true, message: 'Đã cập nhật trạng thái điểm trực.', rowNumber: rowNumber, trangThai: trangThai };
  } catch (e) { return { success: false, error: e.message }; }
}

function adminXoaKhuVuc(requestData) {
  try {
    const auth = requireAdmin_(requestData || {}, 'diemtruc');
    if (!auth.ok) return { success: false, error: auth.error };
    const rowNumber = Number((requestData || {}).rowNumber || 0);
    const sheet = getCauHinhKhuVucSheet_();
    if (rowNumber < 2 || rowNumber > sheet.getLastRow()) return { success: false, error: 'Không tìm thấy điểm trực.' };
    sheet.deleteRow(rowNumber);
    return { success: true, message: 'Đã xóa điểm trực.' };
  } catch (e) { return { success: false, error: e.message }; }
}

function getCauHinhDiemDacBietSheet_() {
  return ensureSheet_(SHEET_CAU_HINH_DIEM_DAC_BIET, [
    'DiemTruc', 'HeSoTNVThuong', 'TrangThai', 'AdminCapNhat', 'ThoiGianCapNhat'
  ]);
}

function getCauHinhDiemDacBiet(requestData) {
  try {
    const auth = requireAdmin_(requestData || {}, 'nhansu');
    if (!auth.ok) return { success: false, error: auth.error };
    const rows = getCauHinhDiemDacBietSheet_().getDataRange().getValues();
    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const diemTruc = (rows[i][0] || '').toString().trim();
      if (!diemTruc) continue;
      data.push({
        diemTruc: diemTruc,
        heSoTNVThuong: parseHeSoNhan_(rows[i][1], HE_SO_DIEM_DAC_BIET_DDB),
        trangThai: rows[i][2] || 'Hoạt động'
      });
    }
    return { success: true, data: data };
  } catch (e) { return { success: false, error: e.message }; }
}

function adminLuuCauHinhDiemDacBiet(requestData) {
  try {
    const auth = requireAdmin_(requestData || {}, 'nhansu');
    if (!auth.ok) return { success: false, error: auth.error };
    const diemTruc = ((requestData || {}).diemTruc || '').toString().trim();
    const heSo = parseHeSoNhan_((requestData || {}).heSoTNVThuong, 0);
    const isDiemDacBiet = diemTruc.toUpperCase().indexOf('DDB') !== -1 ||
      !!(getKhuVucMetaByAnyValue_(diemTruc) || {}).isDDB;
    if (!diemTruc || !isDiemDacBiet) return { success: false, error: 'Vui lòng chọn điểm đặc biệt DDB.' };
    if (heSo <= 0) return { success: false, error: 'Hệ số TNV thường phải lớn hơn 0.' };

    const sheet = getCauHinhDiemDacBietSheet_();
    const rows = sheet.getDataRange().getValues();
    const key = normalizeText_(diemTruc);
    for (let i = 1; i < rows.length; i++) {
      if (normalizeText_(rows[i][0]) === key) {
        sheet.getRange(i + 1, 1, 1, 5).setValues([[diemTruc, heSo, 'Hoạt động', auth.admin.adminName || auth.admin.email, new Date()]]);
        return { success: true, message: 'Đã cập nhật hệ số điểm đặc biệt.' };
      }
    }
    sheet.appendRow([diemTruc, heSo, 'Hoạt động', auth.admin.adminName || auth.admin.email, new Date()]);
    return { success: true, message: 'Đã thêm hệ số điểm đặc biệt.' };
  } catch (e) { return { success: false, error: e.message }; }
}

function adminThemTruongDiemTruc(requestData) {
  try {
    const info = traCuuTNVAdmin({ keyword: requestData.maTNV });
    if (!info.success) return info;
    const d = new Date(requestData.ngayTruc);
    if (isNaN(d.getTime())) return { success: false, error: 'Ngày trực không hợp lệ.' };
    const buoi = (requestData.buoi || '').toString().trim();
    const diemTruc = (requestData.diemTruc || '').toString().trim();
    const heSoNhan = parseHeSoNhan_(requestData.heSoNhan, 1);
    if (!buoi || !diemTruc) return { success: false, error: 'Vui lòng chọn buổi và điểm trực.' };

    const sheet = getTruongDiemSheet_();
    sheet.appendRow([
      new Date(), info.data.maTNV, info.data.hoTen, info.data.sdt,
      d, thuVN_(d), buoi, diemTruc,
      requestData.adminName || 'Admin', 'Hoạt động', heSoNhan
    ]);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function getDanhSachTruongDiemTruc() {
  try {
    const sheet = getTruongDiemSheet_();
    const rows = sheet.getDataRange().getValues();
    const list = [];
    for (let i = 1; i < rows.length; i++) {
      list.push({
        rowNumber: i + 1,
        thoiGianTao: rows[i][0] instanceof Date ? Utilities.formatDate(rows[i][0], 'GMT+7', 'HH:mm dd/MM/yyyy') : rows[i][0],
        maTNV: rows[i][1], hoTen: rows[i][2], sdt: rows[i][3],
        ngayTruc: rows[i][4] instanceof Date ? Utilities.formatDate(rows[i][4], 'GMT+7', 'dd/MM/yyyy') : rows[i][4],
        thu: rows[i][5], buoi: rows[i][6], diemTruc: rows[i][7],
        admin: rows[i][8], trangThai: rows[i][9], heSoNhan: parseHeSoNhan_(rows[i][10], 1)
      });
    }
    return { success: true, data: list.reverse().slice(0, 100) };
  } catch (e) { return { success: false, error: e.message }; }
}

function getTruongDiemTrucInfo(maTNV, ngay, buoi, diemTruc) {
  try {
    const cleanMa = (maTNV || '').toString().toUpperCase().trim();
    const keyNgay = dateKey_(ngay);
    const keyBuoi = normalizeText_(buoi);
    const keyDiem = normalizeText_(diemTruc);
    if (!cleanMa || !keyNgay || !keyBuoi) return null;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_TRUONG_DIEM_TRUC);
    if (!sheet || sheet.getLastRow() < 2) return null;
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const status = (rows[i][9] || 'Hoạt động').toString().trim();
      const rowMa = (rows[i][1] || '').toString().toUpperCase().trim();
      const rowNgay = dateKey_(rows[i][4]);
      const rowBuoi = normalizeText_(rows[i][6]);
      const matchDiem = isSameDiemTruc_(rows[i][7], diemTruc);
      if (status !== 'Dừng' && rowMa === cleanMa && rowNgay === keyNgay && rowBuoi === keyBuoi && matchDiem) {
        const heSoNhan = parseHeSoNhan_(rows[i][10], 1);
        return { maTNV: rowMa, ngay: rowNgay, buoi: rows[i][6], diemTruc: rows[i][7], heSoNhan: heSoNhan, isTruongDiem: true };
      }
    }
    return null;
  } catch (e) { return null; }
}

// ==========================================
// 11. WORKFLOW BÁO CÁO / DUYỆT / THỰC THI XỬ PHẠT
// ==========================================

const SHEET_BAO_CAO_VI_PHAM = 'BaoCaoViPham';

function getBaoCaoViPhamSheet_() {
  return ensureSheet_(SHEET_BAO_CAO_VI_PHAM, [
    'MaBaoCao', 'ThoiGianBaoCao', 'MaTNV', 'HoTen', 'SDT',
    'MaKhuVuc', 'NoiDungViPham', 'LinkMinhChung', 'AdminBaoCao',
    'SoBuoiDeXuat', 'TrangThai', 'AdminDuyet', 'ThoiGianDuyet',
    'QuyetDinhXuPhat', 'LinkQuyetDinh', 'SoBuoiTru', 'LyDoTuChoi',
    'AdminThucThi', 'ThoiGianThucThi', 'GhiChuThucThi', 'MaViPham'
  ]);
}

function generateBaoCaoViPhamId_() {
  return 'BCVP-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss') + '-' + Math.floor(100 + Math.random() * 900);
}

function normalizeMaKhuVucForAdmin_(admin, input) {
  const selected = (input || '').toString().trim().toUpperCase();
  if (selected) return selected;
  if (!admin || !admin.phamViList || admin.phamViList.length === 0) return '';
  if (admin.phamViList.includes('ALL')) return 'ALL';
  return admin.phamViList[0];
}

function isDecisionAdmin_(admin) {
  if (!admin) return false;
  return ['superadmin', 'admin'].includes(admin.capQuyenKey);
}

function appendViPhamChinhThuc_(info, noiDung, quyetDinh, linkQuyetDinh, soBuoiTru, adminName) {
  const sheet = getViPhamSheet_();
  sheet.appendRow([
    new Date(),
    info.maTNV,
    info.hoTen,
    info.sdt,
    noiDung,
    quyetDinh,
    linkQuyetDinh || '',
    Number(soBuoiTru || 0),
    adminName || 'Admin'
  ]);
  return sheet.getLastRow();
}

/**
 * Admin/SuperAdmin: ghi nhận xử phạt trực tiếp, tự động ghi BaoCaoViPham = Đã duyệt và append ViPham.
 * Admin khu vực: chỉ tạo báo cáo Chờ duyệt, không ghi ViPham.
 */
function adminGhiNhanViPham(requestData) {
  try {
    const auth = requireAdmin_(requestData, 'vipham');
    if (!auth.ok) return { success: false, error: auth.error };

    const admin = auth.admin;
    const info = traCuuTNVAdmin({ keyword: requestData.maTNV });
    if (!info.success) return info;

    const noiDung = (requestData.thongTinViPham || '').toString().trim();
    const quyetDinh = (requestData.quyetDinhXuPhat || '').toString().trim();
    const linkQuyetDinh = (requestData.linkQuyetDinhXuPhat || '').toString().trim();
    const linkMinhChung = (requestData.linkMinhChung || '').toString().trim();
    const soBuoi = Number(requestData.soBuoiTru || requestData.soBuoiDeXuat || 0);
    const maKhuVuc = normalizeMaKhuVucForAdmin_(admin, requestData.maKhuVuc);

    if (!noiDung) return { success: false, error: 'Vui lòng nhập nội dung vi phạm.' };
    if (soBuoi < 0) return { success: false, error: 'Số buổi không được âm.' };

    // Admin khu vực bắt buộc đúng phạm vi và chỉ được gửi báo cáo.
    if (admin.capQuyenKey === 'admin_khu_vuc') {
      if (!maKhuVuc || !canAccessKhuVuc_(admin, maKhuVuc)) {
        return { success: false, error: 'Bạn không có quyền báo cáo vi phạm cho khu vực này.' };
      }

      const sheetBC = getBaoCaoViPhamSheet_();
      const maBaoCao = generateBaoCaoViPhamId_();
      sheetBC.appendRow([
        maBaoCao, new Date(), info.data.maTNV, info.data.hoTen, info.data.sdt,
        maKhuVuc, noiDung, linkMinhChung, admin.adminName,
        soBuoi, 'Chờ duyệt', '', '', '', '', '', '', '', '', '', ''
      ]);

      return {
        success: true,
        message: 'Đã gửi báo cáo sai phạm, chờ Admin/SuperAdmin duyệt.',
        mode: 'BAO_CAO',
        maBaoCao: maBaoCao
      };
    }

    // Admin/SuperAdmin xử phạt trực tiếp: phải có số buổi trừ chính thức.
    if (isDecisionAdmin_(admin)) {
      if (soBuoi <= 0) return { success: false, error: 'Vui lòng nhập số buổi trừ > 0.' };
      if (!quyetDinh) return { success: false, error: 'Vui lòng nhập quyết định xử phạt.' };

      const rowViPham = appendViPhamChinhThuc_(
        info.data,
        noiDung,
        quyetDinh,
        linkQuyetDinh,
        soBuoi,
        admin.adminName
      );

      const sheetBC = getBaoCaoViPhamSheet_();
      const maBaoCao = generateBaoCaoViPhamId_();
      sheetBC.appendRow([
        maBaoCao, new Date(), info.data.maTNV, info.data.hoTen, info.data.sdt,
        maKhuVuc || 'ALL', noiDung, linkMinhChung, admin.adminName,
        soBuoi, 'Đã duyệt', admin.adminName, new Date(),
        quyetDinh, linkQuyetDinh, soBuoi, '',
        '', '', '', 'ViPham!' + rowViPham
      ]);

      return {
        success: true,
        message: 'Đã xử phạt trực tiếp và ghi vào sheet ViPham.',
        mode: 'XU_PHAT_TRUC_TIEP',
        maBaoCao: maBaoCao,
        rowViPham: rowViPham,
        data: { ...info.data, soBuoiTruMoi: soBuoi, tongBuoiSauTru: getTongBuoi(info.data.maTNV) }
      };
    }

    return { success: false, error: 'Bạn không có quyền ghi nhận xử phạt.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Lấy danh sách báo cáo vi phạm theo quyền.
 * Admin/SuperAdmin: xem toàn bộ.
 * Admin khu vực: chỉ xem báo cáo thuộc khu vực được phân quyền.
 */
function getBaoCaoViPham(requestData) {
  try {
    const auth = requireAdmin_(requestData, 'vipham');
    if (!auth.ok) return { success: false, error: auth.error };

    const admin = auth.admin;
    const sheet = getBaoCaoViPhamSheet_();
    const rows = sheet.getDataRange().getValues();
    const list = [];

    for (let i = 1; i < rows.length; i++) {
      const maKhuVuc = (rows[i][5] || '').toString().trim().toUpperCase();
      if (!isGlobalAdmin_(admin) && !canAccessKhuVuc_(admin, maKhuVuc)) continue;

      list.push({
        rowNumber: i + 1,
        maBaoCao: rows[i][0],
        thoiGianBaoCao: rows[i][1] instanceof Date ? Utilities.formatDate(rows[i][1], 'GMT+7', 'HH:mm dd/MM/yyyy') : rows[i][1],
        maTNV: rows[i][2],
        hoTen: rows[i][3],
        sdt: rows[i][4],
        maKhuVuc: maKhuVuc,
        thongTinViPham: rows[i][6],
        linkMinhChung: rows[i][7],
        adminBaoCao: rows[i][8],
        soBuoiDeXuat: rows[i][9],
        trangThai: rows[i][10],
        adminDuyet: rows[i][11],
        thoiGianDuyet: rows[i][12] instanceof Date ? Utilities.formatDate(rows[i][12], 'GMT+7', 'HH:mm dd/MM/yyyy') : rows[i][12],
        quyetDinhXuPhat: rows[i][13],
        linkQuyetDinhXuPhat: rows[i][14],
        soBuoiTru: rows[i][15],
        lyDoTuChoi: rows[i][16],
        adminThucThi: rows[i][17],
        thoiGianThucThi: rows[i][18] instanceof Date ? Utilities.formatDate(rows[i][18], 'GMT+7', 'HH:mm dd/MM/yyyy') : rows[i][18],
        ghiChuThucThi: rows[i][19],
        maViPham: rows[i][20],
        canDuyet: isDecisionAdmin_(admin) && rows[i][10] === 'Chờ duyệt',
        canThucThi: admin.capQuyenKey === 'admin_khu_vuc' && rows[i][10] === 'Đã duyệt' && canAccessKhuVuc_(admin, maKhuVuc)
      });
    }

    return {
      success: true,
      role: admin.capQuyen,
      capQuyenKey: admin.capQuyenKey,
      phamViList: admin.phamViList,
      data: list.reverse().slice(0, 200)
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Admin/SuperAdmin duyệt hoặc từ chối báo cáo sai phạm.
 * Nếu duyệt: tự động append vào ViPham để bắt đầu trừ buổi.
 * Nếu từ chối: bắt buộc có lý do, không ghi ViPham.
 */
function adminDuyetBaoCaoViPham(requestData) {
  try {
    const auth = requireAdmin_(requestData, 'vipham');
    if (!auth.ok) return { success: false, error: auth.error };

    const admin = auth.admin;
    if (!isDecisionAdmin_(admin)) {
      return { success: false, error: 'Chỉ Admin hoặc SuperAdmin được duyệt/từ chối báo cáo xử phạt.' };
    }

    const maBaoCao = (requestData.maBaoCao || '').toString().trim();
    const status = (requestData.status || '').toString().trim();
    const quyetDinh = (requestData.quyetDinhXuPhat || '').toString().trim();
    const linkQuyetDinh = (requestData.linkQuyetDinhXuPhat || '').toString().trim();
    const soBuoiTru = Number(requestData.soBuoiTru || 0);
    const lyDoTuChoi = (requestData.lyDoTuChoi || requestData.ghiChu || '').toString().trim();

    if (!maBaoCao) return { success: false, error: 'Thiếu mã báo cáo.' };
    if (!['Đã duyệt', 'Từ chối'].includes(status)) return { success: false, error: 'Trạng thái xử lý không hợp lệ.' };

    if (status === 'Đã duyệt') {
      if (!quyetDinh) return { success: false, error: 'Vui lòng nhập quyết định xử phạt.' };
      if (soBuoiTru <= 0) return { success: false, error: 'Vui lòng nhập số buổi trừ chính thức > 0.' };
    }

    if (status === 'Từ chối' && !lyDoTuChoi) {
      return { success: false, error: 'Vui lòng nhập lý do từ chối.' };
    }

    const sheetBC = getBaoCaoViPhamSheet_();
    const rows = sheetBC.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').toString().trim() === maBaoCao) {
        const currentStatus = (rows[i][10] || '').toString().trim();
        if (currentStatus !== 'Chờ duyệt') {
          return { success: false, error: 'Báo cáo này đã được xử lý trước đó. Vui lòng tải lại danh sách.' };
        }

        const row = i + 1;

        if (status === 'Từ chối') {
          sheetBC.getRange(row, 11, 1, 7).setValues([[
            'Từ chối',
            admin.adminName,
            new Date(),
            '',
            '',
            '',
            lyDoTuChoi
          ]]);
          return { success: true, message: 'Đã từ chối báo cáo xử phạt.' };
        }

        const info = {
          maTNV: rows[i][2],
          hoTen: rows[i][3],
          sdt: rows[i][4]
        };

        const rowViPham = appendViPhamChinhThuc_(
          info,
          rows[i][6],
          quyetDinh,
          linkQuyetDinh,
          soBuoiTru,
          admin.adminName
        );

        sheetBC.getRange(row, 11, 1, 11).setValues([[
          'Đã duyệt',
          admin.adminName,
          new Date(),
          quyetDinh,
          linkQuyetDinh,
          soBuoiTru,
          '',
          '',
          '',
          '',
          'ViPham!' + rowViPham
        ]]);

        return {
          success: true,
          message: 'Đã duyệt báo cáo và tự động ghi vào sheet ViPham.',
          rowViPham: rowViPham
        };
      }
    }

    return { success: false, error: 'Không tìm thấy báo cáo cần xử lý.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Admin khu vực đánh dấu đã thực thi sau khi nhận quyết định.
 * Không ghi thêm vào ViPham để tránh trừ buổi hai lần.
 */
function adminThucThiBaoCaoViPham(requestData) {
  try {
    const auth = requireAdmin_(requestData, 'vipham');
    if (!auth.ok) return { success: false, error: auth.error };

    const admin = auth.admin;
    if (admin.capQuyenKey !== 'admin_khu_vuc' && !isDecisionAdmin_(admin)) {
      return { success: false, error: 'Bạn không có quyền thực thi báo cáo này.' };
    }

    const maBaoCao = (requestData.maBaoCao || '').toString().trim();
    const ghiChu = (requestData.ghiChuThucThi || '').toString().trim();
    if (!maBaoCao) return { success: false, error: 'Thiếu mã báo cáo.' };

    const sheetBC = getBaoCaoViPhamSheet_();
    const rows = sheetBC.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').toString().trim() === maBaoCao) {
        const row = i + 1;
        const maKhuVuc = (rows[i][5] || '').toString().trim().toUpperCase();
        const currentStatus = (rows[i][10] || '').toString().trim();

        if (!isGlobalAdmin_(admin) && !canAccessKhuVuc_(admin, maKhuVuc)) {
          return { success: false, error: 'Bạn không có quyền thực thi báo cáo của khu vực này.' };
        }

        if (currentStatus !== 'Đã duyệt') {
          return { success: false, error: 'Chỉ báo cáo đã duyệt mới được đánh dấu đã thực thi.' };
        }

        sheetBC.getRange(row, 11).setValue('Đã thực thi');
        sheetBC.getRange(row, 18, 1, 3).setValues([[admin.adminName, new Date(), ghiChu]]);

        return { success: true, message: 'Đã đánh dấu báo cáo là đã thực thi. Không ghi thêm vào ViPham.' };
      }
    }

    return { success: false, error: 'Không tìm thấy báo cáo cần thực thi.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Lịch sử ViPham chính thức đang được dùng để trừ buổi.
 * Admin/SuperAdmin xem toàn bộ. Admin khu vực chỉ xem TNV từng xuất hiện trong báo cáo thuộc khu vực của mình.
 */
function getLichSuViPham(requestData) {
  try {
    const auth = requireAdmin_(requestData || {}, 'vipham');
    if (!auth.ok) return { success: false, error: auth.error };
    const admin = auth.admin;

    let allowedTNV = null;
    if (!isGlobalAdmin_(admin)) {
      allowedTNV = {};
      const bcRows = getBaoCaoViPhamSheet_().getDataRange().getValues();
      for (let i = 1; i < bcRows.length; i++) {
        const kv = (bcRows[i][5] || '').toString().trim().toUpperCase();
        if (canAccessKhuVuc_(admin, kv)) {
          allowedTNV[(bcRows[i][2] || '').toString().trim().toUpperCase()] = true;
        }
      }
    }

    const sheet = getViPhamSheet_();
    const rows = sheet.getDataRange().getValues();
    const list = [];

    for (let i = 1; i < rows.length; i++) {
      const maTNV = (rows[i][1] || '').toString().trim().toUpperCase();
      if (allowedTNV && !allowedTNV[maTNV]) continue;

      list.push({
        rowNumber: i + 1,
        thoiGian: rows[i][0] instanceof Date ? Utilities.formatDate(rows[i][0], 'GMT+7', 'HH:mm dd/MM/yyyy') : rows[i][0],
        maTNV: rows[i][1],
        hoTen: rows[i][2],
        sdt: rows[i][3],
        thongTinViPham: rows[i][4],
        quyetDinhXuPhat: rows[i][5],
        linkQuyetDinhXuPhat: rows[i][6],
        soBuoiTru: rows[i][7],
        admin: rows[i][8]
      });
    }

    return { success: true, data: list.reverse().slice(0, 100) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Chỉ Admin/SuperAdmin được xóa quyết định ViPham chính thức.
 */
function adminXoaViPham(requestData) {
  try {
    const auth = requireAdmin_(requestData, 'vipham');
    if (!auth.ok) return { success: false, error: auth.error };
    if (!isDecisionAdmin_(auth.admin)) {
      return { success: false, error: 'Chỉ Admin/SuperAdmin được xóa quyết định xử phạt chính thức.' };
    }

    const rowNumber = Number(requestData.rowNumber || 0);
    const maTNV = (requestData.maTNV || '').toString().toUpperCase().trim();

    if (!rowNumber || rowNumber < 2) return { success: false, error: 'Dòng cần xóa không hợp lệ.' };

    const sheet = getViPhamSheet_();
    if (rowNumber > sheet.getLastRow()) return { success: false, error: 'Dòng cần xóa không còn tồn tại.' };

    const rowMa = (sheet.getRange(rowNumber, 2).getValue() || '').toString().toUpperCase().trim();
    if (maTNV && rowMa !== maTNV) {
      return { success: false, error: 'Mã TNV không khớp với bản ghi cần xóa. Vui lòng tải lại danh sách.' };
    }

    sheet.deleteRow(rowNumber);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}


// ==========================================
// 11. CẤP TÀI KHOẢN ADMIN - CHỈ SUPERADMIN
// ==========================================

const SHEET_PHAN_QUYEN_ADMIN = 'PhanQuyen_Admin';

function getPhanQuyenAdminSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_PHAN_QUYEN_ADMIN);
  if (!sheet) sheet = ss.insertSheet(SHEET_PHAN_QUYEN_ADMIN);

  const headers = ['Email', 'HoTen', 'CapQuyen', 'PhamViKhuVuc', 'TrangThai', 'MatKhau'];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    const firstRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    const isEmptyHeader = firstRow.every(v => !v);
    if (isEmptyHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function requireSuperAdmin_(requestData) {
  const auth = requireAdmin_(requestData, 'taikhoan');
  if (!auth.ok) return auth;

  if (!auth.admin || auth.admin.capQuyenKey !== 'superadmin') {
    return { ok: false, error: 'Chỉ SuperAdmin được sử dụng chức năng này.' };
  }

  return auth;
}

function getDanhSachKhuVucCapTaiKhoan(requestData) {
  try {
    const auth = requireSuperAdmin_(requestData);
    if (!auth.ok) return { success: false, error: auth.error };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('CauHinhKhuVuc');
    if (!sheet) return { success: false, error: 'Không tìm thấy sheet CauHinhKhuVuc.' };

    const rows = sheet.getDataRange().getValues();
    const list = [{ maKhuVuc: 'ALL', tenKhuVuc: 'ALL - Toàn hệ thống', status: 'Hoạt động' }];

    for (let i = 1; i < rows.length; i++) {
      const ma = (rows[i][0] || '').toString().trim().toUpperCase(); // Cột A: Mã khu vực
      const ten = (rows[i][1] || '').toString().trim();              // Cột B: Tên khu vực
      const status = (rows[i][6] || '').toString().trim();           // Cột G: Trạng thái nếu có

      if (ma && ten) {
        list.push({
          maKhuVuc: ma,
          tenKhuVuc: ten,
          status: status || ''
        });
      }
    }

    return { success: true, data: list };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getDanhSachTaiKhoanAdmin(requestData) {
  try {
    const auth = requireSuperAdmin_(requestData);
    if (!auth.ok) return { success: false, error: auth.error };

    const sheet = getPhanQuyenAdminSheet_();
    const rows = sheet.getDataRange().getValues();
    const list = [];

    for (let i = 1; i < rows.length; i++) {
      const email = (rows[i][0] || '').toString().trim();
      if (!email) continue;

      list.push({
        rowNumber: i + 1,
        email: email,
        hoTen: rows[i][1] || '',
        capQuyen: rows[i][2] || '',
        phamViKhuVuc: rows[i][3] || '',
        trangThai: rows[i][4] || '',
        coMatKhau: !!rows[i][5]
      });
    }

    return { success: true, data: list.reverse() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function normalizeCapQuyenInput_(capQuyen) {
  const raw = (capQuyen || '').toString().trim();
  const key = normalizeRole_(raw);

  const allowed = {
    superadmin: 'SuperAdmin',
    admin: 'Admin',
    admin_khu_vuc: 'Admin khu vực',
    kho_bai: 'Kho bãi',
    acc: 'ACC'
  };

  return allowed[key] || '';
}

function normalizePhamViInput_(phamViKhuVuc) {
  if (Array.isArray(phamViKhuVuc)) {
    const cleaned = phamViKhuVuc
      .map(x => (x || '').toString().trim().toUpperCase())
      .filter(Boolean);

    if (cleaned.includes('ALL')) return 'ALL';
    return Array.from(new Set(cleaned)).join(',');
  }

  const raw = (phamViKhuVuc || '').toString().trim().toUpperCase();
  if (!raw) return '';

  if (raw === 'ALL') return 'ALL';

  return Array.from(new Set(
    raw.split(/[;,|]/)
      .map(x => x.trim().toUpperCase())
      .filter(Boolean)
  )).join(',');
}

function adminCapTaiKhoan(requestData) {
  try {
    const auth = requireSuperAdmin_(requestData);
    if (!auth.ok) return { success: false, error: auth.error };

    const email = (requestData.email || '').toString().trim().toLowerCase();
    const hoTen = (requestData.hoTen || '').toString().trim();
    const capQuyen = normalizeCapQuyenInput_(requestData.capQuyen);
    const phamViKhuVuc = normalizePhamViInput_(requestData.phamViKhuVuc);
    const matKhau = (requestData.matKhau || '').toString();

    if (!email || !email.includes('@')) return { success: false, error: 'Email không hợp lệ.' };
    if (!hoTen) return { success: false, error: 'Vui lòng nhập họ tên.' };
    if (!capQuyen) return { success: false, error: 'Cấp quyền không hợp lệ.' };
    if (!phamViKhuVuc) return { success: false, error: 'Vui lòng chọn phạm vi khu vực.' };
    if (!matKhau) return { success: false, error: 'Vui lòng nhập mật khẩu.' };

    // Các quyền toàn cục nên dùng ALL để tránh cấu hình sai.
    const roleKey = normalizeRole_(capQuyen);
    if (['superadmin', 'admin', 'kho_bai', 'acc'].includes(roleKey) && phamViKhuVuc !== 'ALL') {
      return { success: false, error: 'Quyền ' + capQuyen + ' nên có phạm vi là ALL.' };
    }

    const sheet = getPhanQuyenAdminSheet_();
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const rowEmail = (rows[i][0] || '').toString().trim().toLowerCase();
      if (rowEmail === email) {
        return { success: false, error: 'Email này đã được cấp tài khoản. Có thể khóa/mở khóa trong danh sách bên dưới.' };
      }
    }

    sheet.appendRow([
      email,
      hoTen,
      capQuyen,
      phamViKhuVuc,
      'Hoạt động',
      matKhau
    ]);

    return { success: true, message: 'Đã cấp tài khoản admin thành công.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function adminDoiTrangThaiTaiKhoan(requestData) {
  try {
    const auth = requireSuperAdmin_(requestData);
    if (!auth.ok) return { success: false, error: auth.error };

    const email = (requestData.email || '').toString().trim().toLowerCase();
    const trangThai = (requestData.trangThai || '').toString().trim();

    if (!email) return { success: false, error: 'Thiếu email tài khoản.' };
    if (!['Hoạt động', 'Đã khóa'].includes(trangThai)) {
      return { success: false, error: 'Trạng thái không hợp lệ.' };
    }

    // Không cho tự khóa chính mình để tránh mất quyền quản trị.
    if (auth.admin.email === email && trangThai === 'Đã khóa') {
      return { success: false, error: 'Bạn không thể tự khóa tài khoản SuperAdmin đang đăng nhập.' };
    }

    const sheet = getPhanQuyenAdminSheet_();
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const rowEmail = (rows[i][0] || '').toString().trim().toLowerCase();
      if (rowEmail === email) {
        sheet.getRange(i + 1, 5).setValue(trangThai); // Cột E: TrangThai
        return { success: true, message: 'Đã cập nhật trạng thái tài khoản.' };
      }
    }

    return { success: false, error: 'Không tìm thấy tài khoản cần cập nhật.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function adminDoiMatKhauTaiKhoan(requestData) {
  try {
    const auth = requireSuperAdmin_(requestData);
    if (!auth.ok) return { success: false, error: auth.error };

    const email = (requestData.email || '').toString().trim().toLowerCase();
    const matKhauMoi = (requestData.matKhauMoi || '').toString();

    if (!email) return { success: false, error: 'Thiếu email tài khoản.' };
    if (!matKhauMoi || matKhauMoi.trim().length < 3) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 3 ký tự.' };
    }

    const sheet = getPhanQuyenAdminSheet_();
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const rowEmail = (rows[i][0] || '').toString().trim().toLowerCase();
      if (rowEmail === email) {
        sheet.getRange(i + 1, 6).setValue(matKhauMoi); // Cột F: MatKhau
        return { success: true, message: 'Đã đổi mật khẩu tài khoản.' };
      }
    }

    return { success: false, error: 'Không tìm thấy tài khoản cần đổi mật khẩu.' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function adminXoaTruongDiemTruc(requestData) {
  try {
    const auth = requireAdmin_(requestData, "nhansu");
    if (!auth.ok) return { success: false, error: auth.error };

    const rowNumber = Number(requestData.rowNumber);
    if (!rowNumber || rowNumber < 2) {
      return { success: false, error: "Không xác định được dòng cần xóa." };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("TruongDiemTruc");
    if (!sheet) {
      return { success: false, error: "Không tìm thấy sheet TruongDiemTruc." };
    }

    sheet.deleteRow(rowNumber);

    return {
      success: true,
      message: "Đã xóa phân công trưởng điểm."
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** Tính tổng buổi cho toàn bộ TNV bằng ba lần đọc sheet, tránh quét lại theo từng yêu cầu GCN. */
function getTongBuoiMapForAdmin_(ss) {
  const cong = {};
  const tru = {};
  const add = (map, ma, value) => { if (ma) map[ma] = (map[ma] || 0) + Number(value || 0); };
  const dd = ss.getSheetByName('DiemDanh_TongHop');
  if (dd && dd.getLastRow() > 1) dd.getDataRange().getValues().slice(1).forEach(r => add(cong, (r[0] || '').toString().trim().toUpperCase(), r[12]));
  const mc = ss.getSheetByName('MINHCHUNG') || ss.getSheetByName('MinhChung');
  if (mc && mc.getLastRow() > 1) mc.getDataRange().getValues().slice(1).forEach(r => { if (r[7] === 'Đã duyệt') add(cong, (r[1] || '').toString().trim().toUpperCase(), r[10]); });
  const vp = ss.getSheetByName('ViPham');
  if (vp && vp.getLastRow() > 1) vp.getDataRange().getValues().slice(1).forEach(r => add(tru, (r[1] || '').toString().trim().toUpperCase(), r[7]));
  const result = {};
  Object.keys(cong).forEach(ma => result[ma] = Math.max(0, Number((cong[ma] - (tru[ma] || 0)).toFixed(2))));
  return result;
}
