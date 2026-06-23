// Tổng hợp điểm danh theo ngày từ DiemDanh_Raw sang DiemDanh_TongHop.
const HE_SO_DIEM_DAC_BIET_DDB = 1.5;

function ddDateKey_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? '' : Utilities.formatDate(date, 'GMT+7', 'yyyy-MM-dd');
}

function ddNormalizeText_(value) {
  return (value || '').toString().trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '');
}

function ddTruongDiemKey_(maTNV, ngay, buoi, khuVuc) {
  return [(maTNV || '').toString().trim().toUpperCase(), ddDateKey_(ngay), ddNormalizeText_(buoi), ddNormalizeText_(khuVuc)].join('|');
}

function isDiemDacBiet_(khuVuc) { return (khuVuc || '').toString().toUpperCase().indexOf('DDB') !== -1; }
function formatBuoi_(value) { return Number(Number(value || 0).toFixed(2)); }

function getHeSoDiemDacBietMap_() {
  const map = {};
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('CauHinhDiemDacBiet');
  if (!sheet || sheet.getLastRow() < 2) return map;
  sheet.getDataRange().getValues().slice(1).forEach(row => {
    if ((row[2] || 'Hoạt động').toString().trim() === 'Dừng') return;
    const key = ddNormalizeText_(row[0]);
    if (key) map[key] = parseHeSoNhan_(row[1], HE_SO_DIEM_DAC_BIET_DDB);
  });
  return map;
}

function taoGhiChuBuoi_(buoi, laTruongDiem, laDiemDacBiet, heSo, soBuoi) {
  if (laTruongDiem && laDiemDacBiet) return 'Trưởng điểm đặc biệt ' + buoi.toLowerCase() + ': 1.5 x ' + heSo + ' = +' + soBuoi + ' buổi';
  if (laTruongDiem) return 'Trưởng điểm ' + buoi.toLowerCase() + ': +1.5 buổi';
  if (laDiemDacBiet) return buoi + ' điểm đặc biệt hợp lệ: 1 x ' + heSo + ' = +' + soBuoi + ' buổi';
  return buoi + ' hợp lệ: +1 buổi';
}

function buildTruongDiemTrucMap_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('TruongDiemTruc');
  const map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][9] || 'Hoạt động').toString().trim() === 'Dừng') continue;
    const maTNV = (rows[i][1] || '').toString().trim().toUpperCase();
    const ngay = rows[i][4], buoi = rows[i][6], khuVuc = rows[i][7];
    if (!maTNV || !ddDateKey_(ngay) || !buoi) continue;
    const info = { heSoNhan: parseHeSoNhan_(rows[i][10], 1) };
    map[ddTruongDiemKey_(maTNV, ngay, buoi, khuVuc)] = info;
    const norm = ddNormalizeText_(khuVuc);
    if (!norm || norm === 'all' || norm === 'tatca') map[ddTruongDiemKey_(maTNV, ngay, buoi, 'ALL')] = info;
  }
  return map;
}

function findTruongDiemTrucFast_(map, maTNV, ngay, buoi, khuVuc) {
  return map[ddTruongDiemKey_(maTNV, ngay, buoi, khuVuc)] || map[ddTruongDiemKey_(maTNV, ngay, buoi, 'ALL')] || null;
}

function dailyConsolidate(targetDate) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rawSheet = ss.getSheetByName('DiemDanh_Raw'), outputSheet = ss.getSheetByName('DiemDanh_TongHop');
  if (!rawSheet || !outputSheet) throw new Error('Thiếu sheet DiemDanh_Raw hoặc DiemDanh_TongHop.');
  const date = new Date(String(targetDate).trim() + 'T00:00:00+07:00');
  if (isNaN(date.getTime())) throw new Error('Ngày tính buổi không hợp lệ.');
  const dateKey = ddDateKey_(date), caTruongDiem = buildTruongDiemTrucMap_(), heSoDiemDacBiet = getHeSoDiemDacBietMap_(), records = {};
  rawSheet.getDataRange().getValues().slice(1).forEach(row => {
    const thoiGian = row[0] instanceof Date ? row[0] : new Date(row[0]);
    const hopLe = row[8] === true || String(row[8]).toUpperCase() === 'TRUE';
    const maTNV = (row[1] || '').toString().trim().toUpperCase(), khuVuc = (row[3] || '').toString().trim();
    const loaiQuet = (row[4] || '').toString().trim().toUpperCase();
    if (isNaN(thoiGian.getTime()) || ddDateKey_(thoiGian) !== dateKey || !hopLe || !maTNV || !khuVuc || !['CHECKIN', 'CHECKOUT'].includes(loaiQuet)) return;
    const timeNumber = Number(Utilities.formatDate(thoiGian, 'GMT+7', 'HHmm'));
    const key = maTNV + '|' + khuVuc;
    const record = records[key] || (records[key] = { maTNV: maTNV, hoTen: row[2] || '', ngay: thoiGian, khuVuc: khuVuc, mIn: null, mOut: null, aIn: null, aOut: null, mInNum: 9999, mOutNum: -1, aInNum: 9999, aOutNum: -1 });
    const morning = timeNumber < 1230, prefix = morning ? 'm' : 'a';
    if (loaiQuet === 'CHECKIN' && timeNumber < record[prefix + 'InNum']) { record[prefix + 'In'] = thoiGian; record[prefix + 'InNum'] = timeNumber; }
    if (loaiQuet === 'CHECKOUT' && timeNumber > record[prefix + 'OutNum']) { record[prefix + 'Out'] = thoiGian; record[prefix + 'OutNum'] = timeNumber; }
  });
  const output = Object.keys(records).map(key => {
    const r = records[key], note = [], result = { morning: 0, afternoon: 0, validMorning: false, validAfternoon: false, morningHours: 0, afternoonHours: 0 };
    [['Sáng', 'mIn', 'mOut', 'morningHours', 'morning', 'validMorning'], ['Chiều', 'aIn', 'aOut', 'afternoonHours', 'afternoon', 'validAfternoon']].forEach(ca => {
      const checkin = r[ca[1]], checkout = r[ca[2]];
      if (!checkin && !checkout) return;
      if (!checkin || !checkout) { note.push(ca[0] + ' thiếu check-in hoặc check-out'); return; }
      result[ca[3]] = (checkout - checkin) / 3600000;
      if (result[ca[3]] < 2) { note.push(ca[0] + ' không đủ 2 giờ'); return; }
      result[ca[5]] = true;
      const truongDiem = findTruongDiemTrucFast_(caTruongDiem, r.maTNV, r.ngay, ca[0], r.khuVuc);
      const diemDacBiet = isDiemDacBiet_(r.khuVuc);
      // Trưởng điểm luôn dùng hệ số của chính phân công TrưởngĐiểmTrực.
      // TNV thường ở điểm DDB dùng hệ số đã cấu hình riêng theo điểm.
      const heSoTNVThuong = heSoDiemDacBiet[ddNormalizeText_(r.khuVuc)] || HE_SO_DIEM_DAC_BIET_DDB;
      const heSo = truongDiem ? parseHeSoNhan_(truongDiem.heSoNhan, 1) : (diemDacBiet ? heSoTNVThuong : 1);
      result[ca[4]] = formatBuoi_((truongDiem ? 1.5 : 1) * heSo);
      note.push(taoGhiChuBuoi_(ca[0], !!truongDiem, diemDacBiet, heSo, result[ca[4]]));
    });
    const fmt = time => time ? Utilities.formatDate(time, 'GMT+7', 'HH:mm') : '';
    return [r.maTNV, r.hoTen, r.ngay, r.khuVuc, fmt(r.mIn), fmt(r.mOut), Number(result.morningHours.toFixed(2)), result.validMorning, fmt(r.aIn), fmt(r.aOut), Number(result.afternoonHours.toFixed(2)), result.validAfternoon, formatBuoi_(result.morning + result.afternoon), note.join('; ') || 'Không có ca hợp lệ'];
  });
  replaceTongHopRowsForDate_(outputSheet, dateKey, output);
  return { success: true, date: dateKey, totalRows: output.length, totalBuoi: formatBuoi_(output.reduce((sum, row) => sum + Number(row[12] || 0), 0)) };
}

function replaceTongHopRowsForDate_(sheet, dateKey, newRows) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { if (newRows.length) sheet.getRange(2, 1, newRows.length, 14).setValues(newRows); return; }
  const rows = sheet.getRange(2, 1, lastRow - 1, 14).getValues().filter(row => ddDateKey_(row[2]) !== dateKey).concat(newRows);
  sheet.getRange(2, 1, lastRow - 1, 14).clearContent();
  if (rows.length) sheet.getRange(2, 1, rows.length, 14).setValues(rows);
}

function adminTinhBuoiTheoNgay(requestData) {
  try {
    const auth = requireAdmin_(requestData || {}, 'tinhbuoi');
    if (!auth.ok) return { success: false, error: auth.error };
    const ngay = ((requestData || {}).ngay || '').toString().trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return { success: false, error: 'Vui lòng chọn ngày tính buổi hợp lệ.' };
    const result = dailyConsolidate(ngay);
    return Object.assign(result, { message: 'Đã tính lại điểm danh ngày ' + result.date + '.', executedBy: auth.admin.adminName || auth.admin.email });
  } catch (error) { return { success: false, error: error.message }; }
}
