// ==========================================
// QUẢN LÝ GCN: TNV
// Cập nhật: tổng buổi dùng số buổi sau khi trừ ViPham.
// Admin GCN dùng admings.gs để tránh trùng hàm.
// ==========================================

function getGCNData(inputTNV) {
  const tnvInfo = getTNVInfo(inputTNV);
  if (!tnvInfo.maTNV) return { success: false, error: "Phiên đăng nhập hết hạn!" };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const cleanMa = tnvInfo.maTNV.toUpperCase();
  const soBuoiCong = getSoBuoiCongGoc(inputTNV);
  const soBuoiTru = getSoBuoiTru(inputTNV);
  const tongBuoi = getTongBuoi(inputTNV);

  const sheetDot = ss.getSheetByName('CauHinhDot');
  let dotHienTai = null;
  if (sheetDot) {
    const dots = sheetDot.getDataRange().getValues();
    const now = new Date();
    for (let i = 1; i < dots.length; i++) {
      if (!dots[i][0]) continue;
      let start = new Date(dots[i][1]), end = new Date(dots[i][2]);
      if (now >= start && now <= end) {
        dotHienTai = { soDot: dots[i][0], tenDot: dots[i][3], ketThuc: Utilities.formatDate(end, "GMT+7", "dd/MM/yyyy") };
        break;
      }
    }
  }

  const sheetYC = ss.getSheetByName('YeuCauGCN');
  let history = [];
  let typesLocked = new Set();
  if (sheetYC) {
    const ycs = sheetYC.getDataRange().getValues();
    for (let i = ycs.length - 1; i >= 1; i--) {
      let rMa = (ycs[i][2] || "").toString().trim().toUpperCase();
      if (rMa === cleanMa) {
        let status = (ycs[i][7] || "").toString().trim();
        let loaiGCN = (ycs[i][6] || "").toString().trim();
        let dotYC = (ycs[i][1] || "").toString().trim();
        history.push({
          dot: dotYC,
          ngayGui: ycs[i][4] instanceof Date ? Utilities.formatDate(ycs[i][4], "GMT+7", "dd/MM/yyyy") : ycs[i][4],
          tongBuoiLucGui: ycs[i][5],
          loai: loaiGCN,
          trangThai: status,
          ngayHenTra: ycs[i][8] instanceof Date ? Utilities.formatDate(ycs[i][8], "GMT+7", "dd/MM/yyyy") : (ycs[i][8] || ""),
          gcnUrl: ycs[i][9] || ""
        });
        if (dotHienTai && dotYC == dotHienTai.soDot && status !== "Từ chối") typesLocked.add(loaiGCN);
      }
    }
  }

  const sheetConfig = ss.getSheetByName('CauHinhGCN');
  let danhSachGCN = [];
  if (sheetConfig) {
    const rows = sheetConfig.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][1]) continue;
      let tenLoai = rows[i][1].toString().trim();
      let minBuoi = Number(rows[i][2] || 0);
      danhSachGCN.push({
        ten: tenLoai,
        minBuoi: minBuoi,
        moTa: rows[i][3] || "",
        duDieuKien: tongBuoi >= minBuoi,
        daGui: typesLocked.has(tenLoai)
      });
    }
  }

  return { success: true, data: { tongBuoi, soBuoiCong, soBuoiTru, danhSachGCN, dot: dotHienTai, history } };
}

function submitYeuCauGCN(inputTNV, requestData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('YeuCauGCN');
  const tnvInfo = getTNVInfo(inputTNV);
  if (!tnvInfo.maTNV) return { success: false, error: "Không xác định được thông tin TNV!" };

  const tongBuoiHienTai = getTongBuoi(inputTNV); // Đã trừ ViPham
  const inputDot = (requestData.dot || "").toString().trim();
  const currentData = sheet.getDataRange().getValues();
  let itemsToSave = [];

  requestData.listLoaiGCN.forEach(loai => {
    let loaiTrim = loai.trim();
    let isExist = currentData.some(r =>
      (r[2] || "").toString().toUpperCase() === tnvInfo.maTNV.toUpperCase() &&
      (r[1] || "").toString() === inputDot &&
      (r[6] || "").toString() === loaiTrim &&
      (r[7] || "").toString() !== "Từ chối"
    );
    if (!isExist) itemsToSave.push(loaiTrim);
  });

  if (itemsToSave.length === 0) return { success: false, error: "Đơn này đã tồn tại!" };

  const createdAt = new Date();
  const createdItems = [];
  itemsToSave.forEach(loai => {
    const maYC = "YC-" + Math.floor(100000 + Math.random() * 900000);
    sheet.appendRow([
      maYC,
      inputDot,
      tnvInfo.maTNV,
      tnvInfo.hoTen,
      createdAt,
      tongBuoiHienTai,
      loai,
      "Chờ duyệt",
      "", "", "", ""
    ]);
    createdItems.push({
      maYC: maYC,
      dot: inputDot,
      ngayGui: Utilities.formatDate(createdAt, "GMT+7", "dd/MM/yyyy"),
      tongBuoiLucGui: tongBuoiHienTai,
      loai: loai,
      trangThai: "Chờ duyệt",
      ngayHenTra: "",
      gcnUrl: ""
    });
  });
  return { success: true, items: createdItems };
}
