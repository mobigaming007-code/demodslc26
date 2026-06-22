// ==========================================
// CÁC HÀM XỬ LÝ ĐIỂM DANH (NÂNG CẤP KHUNG GIỜ & LỊCH SỬ)
// ==========================================

function calculateDistance(lat1, lon1, lat2, lon2) {
  var R = 6371e3; // [cite: 254]
  var phi1 = lat1 * Math.PI/180; // [cite: 255]
  var phi2 = lat2 * Math.PI/180; // [cite: 255]
  var deltaPhi = (lat2-lat1) * Math.PI/180; // [cite: 255]
  var deltaLambda = (lon2-lon1) * Math.PI/180; // [cite: 256]
  var a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2); // [cite: 256]
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); // [cite: 257]
  return R * c; // [cite: 257]
}

function diemDanhTNV(sessionId, requestData) {
  const tnvInfo = getTNVInfo(sessionId); // Luôn qua phễu lọc để lấy Mã (Cột B) và Tên (Cột C) [cite: 258]
  if (!tnvInfo.maTNV) return { success: false, error: "Phiên đăng nhập không hợp lệ!" }; // [cite: 258]

  const ss = SpreadsheetApp.openById('1vwG8pd_7cfSwEWifekt3WiDs4GIPwsWo4wad819k7TE'); // [cite: 258]
  const now = new Date(); // [cite: 259]
  const dateStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd"); // [cite: 259]
  const timeVal = now.getHours() * 100 + now.getMinutes(); // VD: 08:30 -> 830
  
  const qrCode = requestData.qrCode || "Lỗi QR"; // [cite: 259]
  const userLat = requestData.lat || 0; // [cite: 260]
  const userLng = requestData.lng || 0; // [cite: 260]
  const userAgent = requestData.userAgent || "Không xác định thiết bị"; // [cite: 260, 261]
  const reqSession = requestData.sessionId || "No Session"; // [cite: 261]

  if (userLat === 0 || userLng === 0) return { success: false, error: "Không lấy được vị trí. Vui lòng bật GPS!" }; // [cite: 262]

  // --- 1. CẤU HÌNH KHUNG GIỜ ---
  const KHUNG_GIO = {
    sang: { checkinMax: 835, checkoutMin: 1100 },
    chieu: { checkinMax: 1435, checkoutMin: 1645 }
  };

  // --- 2. XÁC ĐỊNH ĐỊA ĐIỂM ---
  const kvData = ss.getSheetByName('CauHinhKhuVuc').getDataRange().getValues(); // [cite: 263]
  let matchedKV = null;
  for(let i=1; i<kvData.length; i++) {
    if(kvData[i][2] == qrCode) { // Cột C: Mã QR [cite: 263]
      matchedKV = { ten: kvData[i][1], lat: parseFloat(kvData[i][3]), lng: parseFloat(kvData[i][4]), r: parseFloat(kvData[i][5]), status: kvData[i][6] }; // [cite: 264]
      break;
    }
  }

  if(!matchedKV) return { success: false, error: "Mã QR không có trên hệ thống!" }; // [cite: 264]
  if(matchedKV.status !== "Hoạt động") return { success: false, error: "Địa điểm đã dừng hoạt động" }; // [cite: 265]
  
  const distance = calculateDistance(userLat, userLng, matchedKV.lat, matchedKV.lng); // [cite: 266]
  let hopLe = distance <= matchedKV.r; // [cite: 266]
  let lyDo = hopLe ? "" : "Vượt bán kính (" + Math.round(distance) + "m)"; // [cite: 267]
  
  // --- 3. XÁC ĐỊNH LOẠI QUÉT VÀ KIỂM TRA LỊCH SỬ ---
  // Cập nhật: tách riêng Sáng/Chiều để sau checkout sáng, lượt đầu giờ chiều vẫn là CHECKIN.
  const sheetRaw = ss.getSheetByName('DiemDanh_Raw');
  const rawData = sheetRaw.getDataRange().getValues();
  let loaiQuet = "CHECKIN";
  let lastCheckinTime = null;
  let cleanMa = tnvInfo.maTNV.toUpperCase();
  const currentBuoi = timeVal < 1230 ? "SANG" : "CHIEU";

  for (let i = rawData.length - 1; i >= 1; i--) {
    const rowDateObj = rawData[i][0] instanceof Date ? rawData[i][0] : new Date(rawData[i][0]);
    if (isNaN(rowDateObj.getTime())) continue;

    const rowDate = Utilities.formatDate(rowDateObj, "GMT+7", "yyyy-MM-dd");
    const rMa = (rawData[i][1] || "").toString().trim().toUpperCase();
    const rHopLe = rawData[i][8] === true || rawData[i][8] === "TRUE" || rawData[i][8] === "true";
    const rLoai = (rawData[i][4] || "").toString().trim().toUpperCase();
    const rTimeVal = rowDateObj.getHours() * 100 + rowDateObj.getMinutes();
    const rBuoi = rTimeVal < 1230 ? "SANG" : "CHIEU";

    if (rMa === cleanMa && rowDate === dateStr && rHopLe && rBuoi === currentBuoi) {
      if (rLoai === "CHECKIN") {
        loaiQuet = "CHECKOUT";
        lastCheckinTime = rowDateObj;
      }
      break;
    }
  }

  // --- 4. KIỂM TRA ĐIỀU KIỆN THỜI GIAN (LOGIC CHẶN) ---
  if (loaiQuet === "CHECKIN") {
    // Checkin Sáng: trước 08:35 (từ 05:00) | Checkin Chiều: trước 14:35 (từ 12:00)
    let hopLeCheckin = (timeVal >= 500 && timeVal <= KHUNG_GIO.sang.checkinMax) || 
                       (timeVal >= 1200 && timeVal <= KHUNG_GIO.chieu.checkinMax);
    if (!hopLeCheckin) {
      return { success: false, error: "Ngoài khung giờ Check-in (Sáng trước 08:35, Chiều trước 14:35)!" };
    }
  } else {
    // Checkout Sáng: sau 11:00 | Checkout Chiều: sau 16:45
    let hopLeCheckout = (timeVal >= KHUNG_GIO.sang.checkoutMin && timeVal < 1200) || 
                        (timeVal >= KHUNG_GIO.chieu.checkoutMin);
    if (!hopLeCheckout) {
      let msg = timeVal < 1200 ? "Chưa đến giờ Check-out sáng (sau 11:00)!" : "Chưa đến giờ Check-out chiều (sau 16:45)!";
      return { success: false, error: msg };
    }

    // Kiểm tra khoảng cách 2 tiếng
    if (lastCheckinTime) {
      let diffMs = now.getTime() - lastCheckinTime.getTime();
      let diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 2) {
        return { success: false, error: "Check-out phải cách Check-in ít nhất 2 tiếng!" };
      }
    }
  }

  // --- 5. GHI DỮ LIỆU ---
  sheetRaw.appendRow([
    now, 
    tnvInfo.maTNV, // ÉP LƯU MÃ CỘT B [cite: 273]
    tnvInfo.hoTen, // ÉP LƯU TÊN CỘT C [cite: 273]
    qrCode, loaiQuet, userLat, userLng, Math.round(distance), hopLe, lyDo, userAgent, reqSession // [cite: 274]
  ]);

  return {
    success: hopLe,
    message: hopLe ? "Điểm danh " + loaiQuet + " thành công!" : lyDo,
    item: {
      thoiGian: Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy"),
      buoi: currentBuoi === "SANG" ? "Sáng" : "Chiều",
      diaDiem: matchedKV.ten,
      checkIn: loaiQuet === "CHECKIN" ? Utilities.formatDate(now, "GMT+7", "HH:mm") : "",
      checkOut: loaiQuet === "CHECKOUT" ? Utilities.formatDate(now, "GMT+7", "HH:mm") : "",
      trangThai: loaiQuet === "CHECKIN" ? "Chỉ check-in" : "Hoàn tất",
      ghiChu: loaiQuet === "CHECKIN" ? "Chưa có check-out" : "Đã có check-in và check-out"
    }
  };
}

/**
 * Lấy lịch sử điểm danh (6 lượt gần nhất)
 */
function getLichSuDiemDanhTNV(sessionId) {
  const tnvInfo = getTNVInfo(sessionId);
  if (!tnvInfo.maTNV) return { success: false, error: "Lỗi phiên đăng nhập!" };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("DiemDanh_Raw");
  if (!sheet) return { success: false, error: "Chưa có sheet DiemDanh_Raw" };

  const data = sheet.getDataRange().getValues();
  const cleanMa = tnvInfo.maTNV.toString().toUpperCase().trim();

  let groups = {};

  for (let i = 1; i < data.length; i++) {
    const thoiGian = data[i][0];
    const maTNV = (data[i][1] || "").toString().toUpperCase().trim();
    if (maTNV !== cleanMa) continue;
    
    const hopLe = data[i][8] === true || data[i][8] === "TRUE" || data[i][8] === "true";
    if (!hopLe) continue;

    const d = thoiGian instanceof Date ? thoiGian : new Date(thoiGian);
    if (isNaN(d.getTime())) continue;

    const ngayKey = Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd");
    const ngayText = Utilities.formatDate(d, "GMT+7", "dd/MM/yyyy");
    const gioText = Utilities.formatDate(d, "GMT+7", "HH:mm");

    const timeVal = d.getHours() * 100 + d.getMinutes();
    const buoi = timeVal < 1230 ? "Sáng" : "Chiều";

    const diaDiem = data[i][3] || "Không rõ điểm";
    const loai = (data[i][4] || "").toString().toUpperCase().trim();

    const key = `${ngayKey}_${buoi}_${diaDiem}`;

    if (!groups[key]) {
      groups[key] = {
        ngayKey,
        thoiGian: ngayText,
        buoi,
        diaDiem,
        checkIn: "",
        checkOut: "",
        trangThai: "",
        ghiChu: "",
        soBuoiCong: 0
      };
    }

    if (loai === "CHECKIN") {
      if (!groups[key].checkIn || gioText < groups[key].checkIn) {
        groups[key].checkIn = gioText;
      }
    }

    if (loai === "CHECKOUT") {
      if (!groups[key].checkOut || gioText > groups[key].checkOut) {
        groups[key].checkOut = gioText;
      }
    }
  }

  let history = Object.values(groups).map(item => {
    if (item.checkIn && item.checkOut) {
      item.trangThai = "Hoàn tất";
      item.ghiChu = "Đã có check-in và check-out";
      item.soBuoiCong = 1;
    } else if (item.checkIn && !item.checkOut) {
      item.trangThai = "Chỉ check-in";
      item.ghiChu = "Chưa có check-out";
      item.soBuoiCong = 0;
    } else if (!item.checkIn && item.checkOut) {
      item.trangThai = "Chỉ check-out";
      item.ghiChu = "Thiếu check-in";
      item.soBuoiCong = 0;
    } else {
      item.trangThai = "Chưa xác định";
      item.ghiChu = "Thiếu dữ liệu";
      item.soBuoiCong = 0;
    }

    return item;
  });

  history.sort((a, b) => b.ngayKey.localeCompare(a.ngayKey));

  return {
    success: true,
    data: history.slice(0, 20)
  };
}