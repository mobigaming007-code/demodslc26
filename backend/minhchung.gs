// ==========================================
// XỬ LÝ DỮ LIỆU MINH CHỨNG BỔ SUNG
// Bản đã đồng bộ khu vực TNV theo điểm danh gần nhất
// ==========================================

function generateMCID() {
  return "MC-" + Math.floor(100000 + Math.random() * 900000);
}

/**
 * CauHinhKhuVuc:
 * A: MaKhuVuc
 * B: TenKhuVuc
 * C: MaQR
 */
function getMaKhuVucByQR_(qrCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("CauHinhKhuVuc");
  if (!sheet) return "";

  const rows = sheet.getDataRange().getValues();
  const cleanQR = (qrCode || "").toString().trim();

  for (let i = 1; i < rows.length; i++) {
    const maKhuVuc = (rows[i][0] || "").toString().trim().toUpperCase();
    const qr = (rows[i][2] || "").toString().trim();

    if (qr && qr === cleanQR) return maKhuVuc;
  }

  return "";
}

/**
 * DiemDanh_Raw:
 * A: ThoiGian
 * B: MaTNV
 * D: MaQR
 * I: HopLe
 */
function getKhuVucDiemDanhGanNhat_(maTNV) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("DiemDanh_Raw");
  if (!sheet) return "";

  const rows = sheet.getDataRange().getValues();
  const cleanMa = (maTNV || "").toString().trim().toUpperCase();

  for (let i = rows.length - 1; i >= 1; i--) {
    const rMa = (rows[i][1] || "").toString().trim().toUpperCase();
    const qrCode = (rows[i][3] || "").toString().trim();
    const hopLe = rows[i][8] === true || rows[i][8] === "TRUE" || rows[i][8] === "true";

    if (rMa === cleanMa && hopLe && qrCode) {
      const maKhuVuc = getMaKhuVucByQR_(qrCode);
      if (maKhuVuc) return maKhuVuc;
    }
  }

  return "";
}

function resolveMaKhuVucNhan_(maTNV, maKhuVucNhan) {
  const selected = (maKhuVucNhan || "").toString().trim().toUpperCase();

  if (!selected || selected === "TUDONG") {
    return getKhuVucDiemDanhGanNhat_(maTNV);
  }

  return selected;
}

function submitMinhChung(inputTNV, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const mcSheet = ss.getSheetByName("MinhChung") || ss.getSheetByName("MINHCHUNG");

  if (!mcSheet) return { success: false, error: "Không tìm thấy sheet MINHCHUNG/MinhChung." };

  const tnvInfo = getTNVInfo(inputTNV);
  if (!tnvInfo.maTNV) return { success: false, error: "Không xác định được TNV!" };

  const maKhuVucNhan = resolveMaKhuVucNhan_(tnvInfo.maTNV, data.maKhuVucNhan);
  if (!maKhuVucNhan) {
    return {
      success: false,
      error: "Không xác định được khu vực nhận minh chứng. Vui lòng điểm danh trước hoặc chọn khu vực cụ thể."
    };
  }

  let url = "";
  if (data.base64Image) {
    try {
      const folder = DriveApp.getFolderById("1kITx7sb2PmPN7IOzEQeiOklhSl8lNAo3");
      const blob = Utilities.newBlob(
        Utilities.base64Decode(data.base64Image.split(",")[1]),
        "image/jpeg",
        "MC_" + tnvInfo.maTNV + "_" + new Date().getTime() + ".jpg"
      );
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      url = "https://drive.google.com/uc?export=view&id=" + file.getId();
    } catch (e) {
      return { success: false, error: "Lỗi tải ảnh: " + e.message };
    }
  }

  const maMC = generateMCID();
  const createdAt = new Date();
  mcSheet.appendRow([
    maMC,
    tnvInfo.maTNV,
    tnvInfo.hoTen,
    createdAt,
    data.hangMuc,
    data.moTa,
    url,
    "Chờ duyệt",
    "",
    "",
    0,
    "",
    maKhuVucNhan
  ]);

  return {
    success: true,
    item: {
      maMC: maMC,
      thoiGian: Utilities.formatDate(createdAt, "GMT+7", "HH:mm dd/MM/yyyy"),
      hangMuc: data.hangMuc,
      moTa: data.moTa,
      anhUrl: url,
      trangThai: "Chờ duyệt",
      soBuoi: 0,
      ghiChu: "",
      maKhuVuc: maKhuVucNhan
    },
    message: "Gửi minh chứng thành công! Minh chứng đã được chuyển về khu vực " + maKhuVucNhan + "."
  };
}

function getMinhChungByTNV(inputTNV) {
  const tnvInfo = getTNVInfo(inputTNV);
  const cleanMa = tnvInfo.maTNV.toUpperCase();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const mcSheet = ss.getSheetByName("MinhChung") || ss.getSheetByName("MINHCHUNG");
  if (!mcSheet) return { success: false, error: "Chưa cấu hình Sheet" };

  const data = mcSheet.getDataRange().getValues();
  let list = [];

  for (let i = data.length - 1; i >= 1; i--) {
    let rMa = (data[i][1] || "").toString().trim().toUpperCase();

    if (rMa === cleanMa) {
      list.push({
        maMC: data[i][0],
        thoiGian: data[i][3] instanceof Date
          ? Utilities.formatDate(data[i][3], "GMT+7", "HH:mm dd/MM/yyyy")
          : data[i][3],
        hangMuc: data[i][4],
        moTa: data[i][5],
        anhUrl: data[i][6],
        trangThai: data[i][7],
        soBuoi: data[i][10] || 0,
        ghiChu: data[i][11] || "",
        maKhuVuc: data[i][12] || ""
      });
    }
  }

  return { success: true, data: list };
}
