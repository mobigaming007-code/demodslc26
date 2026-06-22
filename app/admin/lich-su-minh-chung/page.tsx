// @ts-nocheck
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { API_URLS } from "@/lib/api";

export default function lichSuMinhChungPage() {
  useEffect(() => {
    
        const API_URL = API_URLS.admin;
        const sessionId = sessionStorage.getItem('sessionId');
        const adminName = sessionStorage.getItem('adminName') || "Admin";
    
    
        // ==========================================
        // CHỐNG BẤM LẶP + POPUP ĐANG XỬ LÝ
        // ==========================================
        let __adminApiCalls = 0;
        let __adminBusy = false;
        let __busyToastTimer = null;
        const __nativeFetch = window.fetch.bind(window);
    
        const ACTION_LOADING_TEXT = {
          getAdminDashboard: 'Đang tải tổng quan...',
          getDanhSachMinhChungChoXet: 'Đang tải danh sách minh chứng...',
          adminDuyetMinhChung: 'Đang duyệt minh chứng...',
          getDanhSachYeuCauGCN: 'Đang tải yêu cầu GCN...',
          adminCapGCN: 'Đang xử lý cấp GCN...',
          getDanhSachNoLinkGCN: 'Đang tải danh sách nợ link GCN...',
          adminCapNhatLinkGCN: 'Đang cập nhật link GCN...',
          getLichSuMinhChung: 'Đang tải lịch sử minh chứng...',
          adminUpdateMinhChung: 'Đang điều chỉnh minh chứng...',
          getLichSuGCN: 'Đang tải lịch sử GCN...',
          adminUpdateGCN: 'Đang điều chỉnh GCN...',
          getDanhSachDiemTruc: 'Đang tải danh sách điểm trực...',
          traCuuTNVAdmin: 'Đang tra cứu thông tin TNV...',
          adminThemTruongDiemTruc: 'Đang thêm trưởng điểm trực...',
          getDanhSachTruongDiemTruc: 'Đang tải lịch sử trưởng điểm...',
          adminXoaTruongDiemTruc: 'Đang xóa phân công trưởng điểm...',
          adminGhiNhanViPham: 'Đang ghi nhận/báo cáo sai phạm...',
          getBaoCaoViPham: 'Đang tải báo cáo vi phạm...',
          adminDuyetBaoCaoViPham: 'Đang xử lý báo cáo vi phạm...',
          adminThucThiBaoCaoViPham: 'Đang đánh dấu thực thi xử phạt...',
          getDanhSachKhuVucCapTaiKhoan: 'Đang tải danh sách khu vực...',
          getDanhSachTaiKhoanAdmin: 'Đang tải danh sách tài khoản...',
          adminCapTaiKhoan: 'Đang cấp tài khoản...',
          adminDoiTrangThaiTaiKhoan: 'Đang cập nhật trạng thái tài khoản...',
          adminDoiMatKhauTaiKhoan: 'Đang đổi mật khẩu tài khoản...',
          getLichSuViPham: 'Đang tải lịch sử vi phạm...',
          adminXoaViPham: 'Đang xóa ghi nhận sai phạm...'
        };
    
        function getActionFromFetchOptions(options) {
          try {
            const body = options && options.body ? options.body.toString() : '{}';
            return JSON.parse(body).action || '';
          } catch (e) {
            return '';
          }
        }
    
        function setGlobalProcessing(isLoading, message) {
          const overlay = document.getElementById('globalLoadingOverlay');
          const title = document.getElementById('globalLoadingTitle');
          const msg = document.getElementById('globalLoadingMessage');
          if (!overlay) return;
    
          if (isLoading) {
            if (title) title.innerText = message || 'Đang xử lý...';
            if (msg) msg.innerText = 'Vui lòng không thực hiện thao tác nhiều lần. Hệ thống đang ghi nhận dữ liệu';
            overlay.classList.add('active');
          } else {
            overlay.classList.remove('active');
          }
        }
    
        function setAdminButtonsDisabled(disabled) {
          document.querySelectorAll('button').forEach(btn => {
            if (btn.dataset.allowWhileLoading === 'true') return;
            if (disabled) {
              if (!btn.disabled) btn.dataset.disabledByLoading = '1';
              btn.disabled = true;
              btn.classList.add('admin-btn-disabled');
            } else if (btn.dataset.disabledByLoading === '1') {
              btn.disabled = false;
              delete btn.dataset.disabledByLoading;
              btn.classList.remove('admin-btn-disabled');
            }
          });
        }
    
        function beginAdminProcessing(message) {
          __adminApiCalls++;
          __adminBusy = true;
          setAdminButtonsDisabled(true);
          setGlobalProcessing(true, message || 'Đang xử lý...');
        }
    
        function endAdminProcessing() {
          __adminApiCalls = Math.max(0, __adminApiCalls - 1);
          if (__adminApiCalls === 0) {
            __adminBusy = false;
            setGlobalProcessing(false);
            setAdminButtonsDisabled(false);
          }
        }
    
        function showBusyToast(message) {
          const toast = document.getElementById('busyToast');
          if (!toast) return;
          toast.innerText = message || 'Hệ thống đang xử lý yêu cầu trước, vui lòng chờ.';
          toast.classList.add('active');
          clearTimeout(__busyToastTimer);
          __busyToastTimer = setTimeout(() => toast.classList.remove('active'), 1800);
        }
    
        // Chặn bấm nút mới khi request trước chưa xong.
        document.addEventListener('click', function(e) {
          const btn = e.target.closest('button');
          if (!btn || btn.dataset.allowWhileLoading === 'true') return;
          if (__adminBusy) {
            e.preventDefault();
            e.stopImmediatePropagation();
            showBusyToast('Đang xử lý, vui lòng không bấm nhiều lần.');
            return false;
          }
        }, true);
    
        // Tự động hiện popup cho mọi request POST lên Apps Script, không cần sửa từng hàm.
        window.fetch = async function(resource, options = {}) {
          const url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
          const isAppsScriptApi = url === API_URL || url.includes('script.google.com/macros/s/');
          if (!isAppsScriptApi) return __nativeFetch(resource, options);
    
          const action = getActionFromFetchOptions(options);
          const message = ACTION_LOADING_TEXT[action] || 'Đang xử lý dữ liệu...';
          beginAdminProcessing(message);
          try {
            return await __nativeFetch(resource, options);
          } finally {
            endAdminProcessing();
          }
        };
    
        if (!sessionId || !sessionId.startsWith("ADMIN_")) { return; }
    
        document.getElementById('adminNameDisplay').innerText = "Chào, " + adminName;
    
        { loadLichSuMC(); };
    
        function logout() {
          if(confirm("Đăng xuất?")) { sessionStorage.clear(); window.location.href = '/tnv'; }
        }
    
        function switchTab(tabId) {
          document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
          document.getElementById('tab-' + tabId).classList.add('active');
          
          document.querySelectorAll('button[id^="btn-"]').forEach(btn => {
            btn.classList.remove('bg-gray-900', 'text-white');
            btn.classList.add('text-gray-600', 'hover:bg-gray-100');
          });
          const activeBtn = document.getElementById('btn-' + tabId);
          activeBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
          activeBtn.classList.add('bg-gray-900', 'text-white');
    
          if (tabId === 'dashboard') loadDashboard();
          if (tabId === 'minhchung') loadMinhChung();
          if (tabId === 'gcn') loadGCN();
          if (tabId === 'nolink') loadNoLink();
          if (tabId === 'lichsumc') loadLichSuMC();
          if (tabId === 'lichsugcn') loadLichSuGCN();
          if (tabId === 'truongdiem') { loadDiemTrucOptions(); loadTruongDiem(); }
          if (tabId === 'vipham') loadViPham();
          if (tabId === 'captaikhoan') loadCapTaiKhoan();
        }
    
        function updateBadge(id, count) {
          const el = document.getElementById(id);
          if (!el) return;
          if (count > 0) { el.innerText = count; el.classList.remove('hidden'); } 
          else el.classList.add('hidden');
        }
    
        // --- TAB 1: DASHBOARD ---
        async function loadDashboard() {
          try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminDashboard', sessionId }) });
            const res = await response.json();
            if (res.success) {
              document.getElementById('stat-mc').innerText = res.stats.mcChoDuyet;
              document.getElementById('stat-gcn').innerText = res.stats.gcnChoDuyet;
              document.getElementById('stat-nolink').innerText = res.stats.noLinkGCN;
              document.getElementById('stat-raw').innerText = res.stats.tongLuotRaw;
    
              updateBadge('badge-mc', res.stats.mcChoDuyet);
              updateBadge('badge-gcn', res.stats.gcnChoDuyet);
              updateBadge('badge-nolink', res.stats.noLinkGCN);
    
              const logsContainer = document.getElementById('recentLogs');
              if (res.recentLogs.length === 0) logsContainer.innerHTML = "<p class='italic text-gray-400'>Chưa có dữ liệu.</p>";
              else {
                logsContainer.innerHTML = res.recentLogs.map(log => `
                  <div class="flex justify-between items-center border-b pb-2">
                    <div><p class="font-bold text-gray-800">${log.hoTen} (${log.maTNV})</p><p class="text-[11px] text-gray-500">${log.thoiGian}</p></div>
                    <span class="text-xs font-bold ${log.hopLe ? 'text-green-600' : 'text-red-600'}">${log.loai} ${log.hopLe ? '✅' : '❌'}</span>
                  </div>`).join('');
              }
            }
          } catch (e) { console.error("Lỗi: ", e); }
        }
    
        // --- TAB 2: DUYỆT MC ---
        async function loadMinhChung(isSilent = false) {
          const container = document.getElementById('listMinhChung');
          if(!isSilent) container.innerHTML = 'Đang tải...';
          try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDanhSachMinhChungChoXet', sessionId }) });
            const res = await response.json();
            if (res.success) {
              updateBadge('badge-mc', res.data.length);
              if (isSilent) return;
              if (res.data.length === 0) { container.innerHTML = "Đã duyệt hết MC."; return; }
    
              container.innerHTML = res.data.map(item => `
                <div class="border rounded-xl p-4 bg-gray-50 md:flex gap-4">
                  <div class="md:w-1/4 mb-3 md:mb-0">
                    ${item.anhUrl ? `<a href="${item.anhUrl}" target="_blank"><img src="${getDriveThumbnailUrl(item.anhUrl)}" class="w-full h-28 object-cover rounded shadow border bg-white" loading="lazy" onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('afterend', '<span class=\'text-xs text-gray-400\'>Không tải được ảnh</span>')"></a>` : 'Không ảnh'}
                  </div>
                  <div class="md:w-3/4">
                    <p class="font-bold">${item.hoTen} (${item.maTNV})</p> 
                    <p class="text-xs text-blue-600 font-bold mt-1">📞 SĐT: ${item.sdt}</p>
                    <p class="text-[11px] text-gray-500">Gửi: ${item.thoiGian} | Hạng mục: ${item.hangMuc}</p>
                    <p class="mt-1 text-xs bg-white p-2 border rounded">${item.moTa}</p>
                    <div class="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <input type="number" id="buoi-${item.maMC}" placeholder="Số buổi" class="border p-2 rounded" step="0.5">
                      <input type="text" id="note-${item.maMC}" placeholder="Ghi chú" class="border p-2 rounded col-span-1 md:col-span-1">
                      <button onclick="submitDuyetMC('${item.maMC}', 'Đã duyệt')" class="bg-green-600 text-white font-bold rounded shadow">Duyệt</button>
                      <button onclick="submitDuyetMC('${item.maMC}', 'Từ chối')" class="bg-red-600 text-white font-bold rounded shadow">Từ chối</button>
                    </div>
                  </div>
                </div>`).join('');
            }
          } catch (e) {}
        }
    
        async function submitDuyetMC(maMC, status) {
          const soBuoi = parseFloat(document.getElementById('buoi-' + maMC).value) || 0;
          const ghiChu = document.getElementById('note-' + maMC).value;
          if (status === 'Đã duyệt' && soBuoi <= 0) return alert("Nhập số buổi > 0");
          if (status === 'Từ chối' && !ghiChu) return alert("Nhập lý do từ chối");
    
          const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'adminDuyetMinhChung', sessionId, maMC, status, soBuoi, ghiChu, adminName }) });
          const res = await response.json();
          if (res.success) { alert("Xong!"); loadMinhChung(); loadDashboard(); }
        }
    
        // --- TAB 3: DUYỆT GCN ---
        async function loadGCN(isSilent = false) {
          const container = document.getElementById('listGCN');
          if(!isSilent) container.innerHTML = 'Đang tải...';
          try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDanhSachYeuCauGCN', sessionId }) });
            const res = await response.json();
            if (res.success) {
              updateBadge('badge-gcn', res.data.length);
              if (isSilent) return;
              if (res.data.length === 0) { container.innerHTML = "Không có yêu cầu."; return; }
    
              container.innerHTML = res.data.map(item => `
                <div class="border rounded-xl p-4 bg-gray-50">
                  <div class="flex justify-between">
                    <p class="font-bold">${item.hoTen} (${item.maTNV})</p> 
                    <p class="text-xs text-blue-600 font-bold mt-1">📞 SĐT: ${item.sdt}</p>
                    <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">${item.tongBuoiHienTai ?? item.tongBuoi} buổi</span>
                  </div>
                  <p class="text-sm">Loại: <b>${item.loaiGCN}</b> (Đợt ${item.dot})</p>
                  ${Number(item.soBuoiTru || 0) > 0 ? `<p class="text-[11px] text-red-600 font-bold">Đã trừ vi phạm: ${item.soBuoiTru} buổi</p>` : ''}
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <input type="text" id="ngayhen-${item.maYC}" placeholder="Ngày hẹn trả" class="border p-2 rounded">
                    <input type="text" id="url-${item.maYC}" placeholder="Link GCN" class="border p-2 rounded">
                    <input type="text" id="ghichu-gcn-${item.maYC}" placeholder="Ghi chú / Lý do từ chối" class="border p-2 rounded col-span-2">
                  </div>
                  <div class="mt-2 flex gap-2">
                    <button onclick="submitDuyetGCN('${item.maYC}', 'Hoàn thành')" class="flex-1 bg-green-600 text-white font-bold py-1.5 rounded">Cấp</button>
                    <button onclick="submitDuyetGCN('${item.maYC}', 'Hẹn ngày trả')" class="flex-1 bg-yellow-500 text-white font-bold py-1.5 rounded">Hẹn trả</button>
                    <button onclick="submitDuyetGCN('${item.maYC}', 'Từ chối')" class="flex-1 bg-red-600 text-white font-bold py-1.5 rounded">Từ chối</button>
                  </div>
                </div>`).join('');
            }
          } catch (e) {}
        }
    
        async function submitDuyetGCN(maYC, status) {
          const ngayHen = document.getElementById('ngayhen-' + maYC).value;
          const urlGCN = document.getElementById('url-' + maYC).value;
          const ghiChu = document.getElementById('ghichu-gcn-' + maYC).value;
          if (status === 'Từ chối' && !ghiChu) return alert("Nhập lý do từ chối");
    
          const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'adminCapGCN', sessionId, maYC, status, ngayHen, urlGCN, ghiChu, adminName }) });
          const res = await response.json();
          if (res.success) { alert("Xong!"); loadGCN(); loadNoLink(); loadDashboard(); }
        }
    
        // --- TAB 4: NỢ LINK GCN ---
        async function loadNoLink(isSilent = false) {
          const container = document.getElementById('listNoLink');
          if(!isSilent) container.innerHTML = 'Đang tải...';
          try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDanhSachNoLinkGCN', sessionId }) });
            const res = await response.json();
            if (res.success) {
              updateBadge('badge-nolink', res.data.length);
              if (isSilent) return;
              if (res.data.length === 0) { container.innerHTML = "Không có hồ sơ nợ link."; return; }
    
              container.innerHTML = res.data.map(item => `
                <div class="border border-orange-200 rounded-xl p-4 bg-white shadow-sm flex flex-col md:flex-row gap-2 justify-between items-center">
                  <div>
                    <p class="font-bold text-gray-800">${item.hoTen} <span class="font-normal text-gray-500">(${item.maTNV})</span></p>
                    <p class="text-xs text-orange-600 font-bold">Loại: ${item.loaiGCN} (Đợt ${item.dot})</p>
                  </div>
                  <div class="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <input type="text" id="addurl-${item.maYC}" placeholder="Dán link Drive GCN vào đây" class="border border-gray-300 p-2 rounded w-full md:w-64 text-xs focus:outline-blue-500">
                    <button onclick="submitUpdateLink('${item.maYC}')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded text-xs whitespace-nowrap shadow-sm">Cập nhật</button>
                  </div>
                </div>`).join('');
            }
          } catch (e) {}
        }
    
        async function submitUpdateLink(maYC) {
          const urlGCN = document.getElementById('addurl-' + maYC).value;
          if(!urlGCN) return alert("Chưa nhập link!");
          const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'adminCapNhatLinkGCN', sessionId, maYC, urlGCN, adminName }) });
          const res = await response.json();
          if (res.success) { alert("Cập nhật thành công!"); loadNoLink(); loadDashboard(); }
        }
    
        // --- TAB 5: LỊCH SỬ MC ---
        function getDriveThumbnailUrl(url) {
      const value = (url || '').toString();
      const match = value.match(/[a-zA-Z0-9_-]{25,}/);
      return match ? 'https://drive.google.com/thumbnail?id=' + match[0] + '&sz=w600' : value;
    }

    function escapeAdminHtml(value) {
      return (value === null || value === undefined ? '' : value.toString())
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    
    function jsArgForOnclick(value) {
      return JSON.stringify(value === null || value === undefined ? '' : value.toString())
        .replace(/"/g, '&quot;');
    }
    
    async function loadLichSuMC() {
      const container = document.getElementById('listLichSuMC');
      container.innerHTML = 'Đang tải...';
      try {
        const response = await fetch(API_URL, { 
          method: 'POST', 
          body: JSON.stringify({ action: 'getLichSuMinhChung', sessionId }) 
        });
        const res = await response.json();
        if (res.success) {
          if (res.data.length === 0) { container.innerHTML = "Chưa có lịch sử."; return; }
    
          container.innerHTML = res.data.map(item => {
            const hoTen = escapeAdminHtml(item.hoTen);
            const maTNV = escapeAdminHtml(item.maTNV);
            const sdt = escapeAdminHtml(item.sdt || 'N/A');
            const thoiGianDuyet = escapeAdminHtml(item.thoiGianDuyet || '');
            const adminXuLy = escapeAdminHtml(item.admin || '');
            const hangMuc = escapeAdminHtml(item.hangMuc || 'Không có hạng mục');
            const noiDungTNV = escapeAdminHtml(item.moTa || 'Không có nội dung');
            const ghiChuAdmin = escapeAdminHtml(item.ghiChu || '');
            const trangThai = escapeAdminHtml(item.trangThai || '');
            const soBuoi = escapeAdminHtml(item.soBuoi || 0);
            const maMCArg = jsArgForOnclick(item.maMC);
            const ghiChuArg = jsArgForOnclick(item.ghiChu || '');
            const anhUrl = escapeAdminHtml(item.anhUrl || '');
    
            return `
            <div class="border rounded-xl p-3 bg-white flex flex-col md:flex-row md:justify-between md:items-start gap-3 shadow-sm item-row">
              <div class="flex-1">
                <p class="font-bold text-gray-800">${hoTen} <span class="text-xs text-gray-500 font-normal">(${maTNV})</span></p>
                <p class="text-[10px] text-blue-600 font-bold">SĐT: ${sdt}</p>
                <p class="text-[11px] text-gray-500">Duyệt: ${thoiGianDuyet} bởi ${adminXuLy}</p>
    
                <div class="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-2 text-[11px] text-gray-700 leading-relaxed">
                  <p><span class="font-bold text-blue-700">Hạng mục TNV gửi:</span> ${hangMuc}</p>
                  <p class="mt-1 whitespace-pre-line"><span class="font-bold text-blue-700">Nội dung TNV đã gửi:</span> ${noiDungTNV}</p>
                </div>
    
                ${ghiChuAdmin ? `<p class="mt-1 text-[11px] text-gray-500"><span class="font-bold">Ghi chú admin:</span> ${ghiChuAdmin}</p>` : ''}
    
                <button onclick="openEditMC(${maMCArg}, ${Number(item.soBuoi || 0)}, ${ghiChuArg})" 
                        class="text-[10px] text-blue-600 underline mt-1 font-bold">Sửa minh chứng</button>
                ${item.anhUrl ? `<a href="${anhUrl}" target="_blank" class="ml-2 text-[10px] text-green-600 underline font-bold">Xem hình ảnh</a>` : ''}
              </div>
              <div class="text-right flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-0">
                <span class="px-2 py-1 text-[10px] font-bold rounded-full text-white ${item.trangThai === 'Đã duyệt' ? 'bg-green-500' : 'bg-red-500'}">${trangThai}</span>
                <span class="text-xs font-bold text-green-700 md:mt-1">${soBuoi} buổi</span>
              </div>
            </div>`;
          }).join('');
        }
      } catch (e) { container.innerHTML = "Lỗi tải dữ liệu."; }
    }
    
        // Hàm tìm kiếm chung cho các trang
    function filterTable(containerId, inputId) {
      const filter = document.getElementById(inputId).value.toUpperCase();
      const items = document.getElementById(containerId).getElementsByClassName('item-row');
      for (let i = 0; i < items.length; i++) {
        const text = items[i].textContent || items[i].innerText;
        items[i].style.display = text.toUpperCase().indexOf(filter) > -1 ? "" : "none";
      }
    }
    
    // Bổ sung nút "Sửa" vào hàm hiển thị Lịch sử MC
    // Trong hàm loadLichSuMC(), thêm nút này vào template:
    // <button onclick="openEditMC('${item.maMC}', ${item.soBuoi}, '${item.ghiChu}')" class="text-[10px] text-blue-600 underline mt-1">Sửa</button>
    
    // Hàm mở hộp thoại chỉnh sửa nhanh
    async function openEditMC(maMC, currentBuoi, currentNote) {
      const newBuoi = prompt("Chỉnh sửa số buổi cộng:", currentBuoi);
      const newStatus = prompt("Nhập trạng thái mới (Đã duyệt / Từ chối):", "Đã duyệt");
      const newNote = prompt("Lý do điều chỉnh / Ghi chú mới:", currentNote);
      
      if (newBuoi !== null && newStatus !== null) {
        const response = await fetch(API_URL, { 
          method: 'POST', 
          body: JSON.stringify({ 
            action: 'adminUpdateMinhChung', 
            sessionId, maMC, status: newStatus, soBuoi: newBuoi, ghiChu: newNote, adminName 
          }) 
        });
        const res = await response.json();
        if (res.success) { alert("Cập nhật MC thành công!"); loadLichSuMC(); }
      }
    }
    
    /**
     * Hàm hiển thị Lịch sử GCN tương tự cách hiển thị Lịch sử MC
     */
    async function loadLichSuGCN() {
      const container = document.getElementById('listLichSuGCN');
      container.innerHTML = '<p class="text-center text-xs text-gray-500">Đang tải dữ liệu...</p>';
      
      try {
        const response = await fetch(API_URL, { 
          method: 'POST', 
          body: JSON.stringify({ action: 'getLichSuGCN', sessionId }) 
        });
        const res = await response.json();
        
        if (res.success) {
          if (res.data.length === 0) { 
            container.innerHTML = "<p class='text-center text-gray-400 text-xs'>Chưa có lịch sử GCN.</p>"; 
            return; 
          }
    
          container.innerHTML = res.data.map(item => `
            <div class="border rounded-xl p-3 bg-white flex justify-between items-center shadow-sm item-row">
              <div class="flex-1">
                <p class="font-bold text-gray-800 text-sm">${item.hoTen} <span class="text-[10px] text-gray-400 font-normal">#${item.maYC}</span></p>
                <p class="text-[10px] text-gray-500">Mã: ${item.maTNV} | SĐT: ${item.sdt}</p>
                <p class="text-[10px] text-blue-600 font-medium">Loại: ${item.loaiGCN} - Hẹn: ${item.ngayHenTra}</p>
                <button onclick="openEditGCN('${item.maYC}', '${item.trangThai}', '${item.ghiChu || ''}')" 
                        class="text-[10px] text-blue-600 underline mt-1 font-bold">Điều chỉnh GCN</button>
                ${item.gcnUrl ? `<a href="${item.gcnUrl}" target="_blank" class="ml-2 text-[10px] text-green-600 underline font-bold">Xem GCN</a>` : ''}
              </div>
              <div class="text-right flex flex-col items-end">
                <span class="px-2 py-0.5 text-[9px] font-bold rounded-full text-white 
                  ${item.trangThai === 'Hoàn thành' ? 'bg-green-500' : (item.trangThai === 'Từ chối' ? 'bg-red-500' : 'bg-yellow-500')}">
                  ${item.trangThai}
                </span>
                <span class="text-[10px] text-gray-400 mt-1 italic">Duyệt bởi: ${item.admin || 'Admin'}</span>
              </div>
            </div>`).join('');
        }
      } catch (e) { 
        container.innerHTML = "<p class='text-center text-red-500 text-xs'>Lỗi kết nối hệ thống.</p>"; 
      }
    }
    
        /**
     * Hàm mở hộp thoại điều chỉnh GCN nhanh
     */
    async function openEditGCN(maYC, currentStatus, currentNote) {
      // 1. Thu thập thông tin mới qua Prompt
      const newStatus = prompt("Nhập trạng thái mới (Hoàn thành / Hẹn ngày trả / Từ chối):", currentStatus);
      if (newStatus === null) return; // Người dùng nhấn Hủy
    
      const newNote = prompt("Nhập lý do điều chỉnh hoặc ghi chú mới:", currentNote || "");
      if (newNote === null) return;
    
      const urlGCN = (newStatus === "Hoàn thành") ? prompt("Dán link GCN (nếu có):", "") : "";
    
      // 2. Gửi yêu cầu về Backend
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'adminUpdateGCN',
            sessionId: sessionId,
            maYC: maYC,
            status: newStatus,
            ghiChu: newNote,
            urlGCN: urlGCN,
            adminName: adminName,
            ngayHen: new Date() // Mặc định cập nhật ngày xử lý mới
          })
        });
    
        const res = await response.json();
        if (res.success) {
          alert("Đã điều chỉnh GCN thành công!");
          loadLichSuGCN(); // Tải lại danh sách để cập nhật hiển thị
        } else {
          alert("Lỗi: " + res.error);
        }
      } catch (e) {
        alert("Lỗi kết nối server: " + e.message);
      }
    }
    
    
        // --- TAB TRƯỞNG ĐIỂM ---
        let selectedTruongDiemTNV = null;
        let selectedViPhamTNV = null;
    
        async function loadDiemTrucOptions() {
          const sel = document.getElementById('td-diem');
          if (!sel) return;
          try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDanhSachDiemTruc', sessionId }) });
            const res = await response.json();
            if (res.success) {
              sel.innerHTML = res.data.map(d => `<option value="${escapeText(d.value)}" data-is-ddb="${d.isDDB ? '1' : '0'}">${escapeText(d.label)}</option>`).join('') || '<option value="">Chưa có điểm</option>';
              autoSetHeSoTruongDiem();
            }
          } catch(e) { sel.innerHTML = '<option value="">Lỗi tải điểm</option>'; }
        }
    
        function autoSetHeSoTruongDiem() {
          const sel = document.getElementById('td-diem');
          const input = document.getElementById('td-heso');
          if (!sel || !input) return;
          const opt = sel.options[sel.selectedIndex];
          const isDDB = opt && opt.dataset && opt.dataset.isDdb === '1';
          input.value = isDDB ? '1.5' : '1';
          input.title = isDDB ? 'Điểm đặc biệt DDB: có thể sửa hệ số theo thực tế' : 'Điểm thường: mặc định hệ số 1';
        }
    
        async function traCuuTruongDiem() {
          const keyword = document.getElementById('td-ma').value.trim();
          if (!keyword) return alert('Nhập mã TNV hoặc SĐT');
          const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'traCuuTNVAdmin', sessionId, keyword }) });
          const res = await response.json();
          if (!res.success) return alert(res.error);
          selectedTruongDiemTNV = res.data;
          document.getElementById('td-info').classList.remove('hidden');
          document.getElementById('td-info').innerHTML = `<b>${res.data.hoTen}</b> (${res.data.maTNV})<br><span class="text-xs text-blue-600">SĐT: ${res.data.sdt || 'N/A'} | Đã cộng: ${res.data.soBuoiCong} | Đã trừ: ${res.data.soBuoiTru} | Còn: ${res.data.tongBuoi}</span>`;
        }
    
        async function submitTruongDiem() {
          if (!selectedTruongDiemTNV) return alert('Vui lòng tra cứu TNV trước');
          const ngayTruc = document.getElementById('td-date').value;
          const buoi = document.getElementById('td-buoi').value;
          const diemTruc = document.getElementById('td-diem').value;
          const heSoNhanRaw = (document.getElementById('td-heso')?.value || '1').replace(',', '.');
          const heSoNhan = Number(heSoNhanRaw) || 1;
          if (!ngayTruc || !buoi || !diemTruc) return alert('Chọn đủ ngày, buổi, điểm trực');
          if (heSoNhan <= 0) return alert('Hệ số phải lớn hơn 0');
          const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'adminThemTruongDiemTruc', sessionId, maTNV: selectedTruongDiemTNV.maTNV, ngayTruc, buoi, diemTruc, heSoNhan, adminName }) });
          const res = await response.json();
          if (res.success) { alert('Đã thêm trưởng điểm trực'); loadTruongDiem(); } else alert(res.error);
        }
    
        async function loadTruongDiem() {
          const box = document.getElementById('listTruongDiem');
          if (!box) return;
          box.innerHTML = '<p class="text-xs text-gray-400">Đang tải danh sách...</p>';
          try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDanhSachTruongDiemTruc', sessionId }) });
            const res = await response.json();
            if (res.success) {
              if (res.data.length === 0) { box.innerHTML = '<p class="text-xs text-gray-400 italic">Chưa có trưởng điểm trực.</p>'; return; }
              box.innerHTML = res.data.map(x => `
                <div class="border rounded-xl p-3 bg-white item-row">
                  <div class="flex justify-between gap-3 items-start">
                    <div class="min-w-0">
                      <p class="font-bold text-gray-800">${x.hoTen} <span class="text-xs text-gray-500">(${x.maTNV})</span></p>
                      <p class="text-[11px] text-gray-500">${x.thu}, ${x.ngayTruc} | ${x.buoi} | Điểm: ${x.diemTruc} | Hệ số: x${x.heSoNhan || 1}</p>
                      <p class="text-[10px] text-gray-400">Tạo bởi: ${x.admin} | ${x.trangThai}</p>
                    </div>
                    <button onclick="deleteTruongDiem(${x.rowNumber}, '${String(x.maTNV || '').replace(/'/g, "\'")}')" class="shrink-0 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold rounded-lg text-[10px] px-3 py-1.5">Xóa</button>
                  </div>
                </div>`).join('');
            } else box.innerHTML = `<p class="text-xs text-red-500">${res.error}</p>`;
          } catch(e) { box.innerHTML = '<p class="text-xs text-red-500">Lỗi tải dữ liệu.</p>'; }
        }
    
        async function deleteTruongDiem(rowNumber, maTNV) {
          if (!rowNumber) return alert('Không xác định được dòng cần xóa');
          if (!confirm(`Xóa phân công trưởng điểm của ${maTNV}?
    Thao tác này sẽ không công nhận quyền lợi điểm danh của Trưởng điểm trực.`)) return;
          const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'adminXoaTruongDiemTruc', sessionId, rowNumber, maTNV, adminName }) });
          const res = await response.json();
          if (res.success) {
            alert('Đã xóa phân công trưởng điểm');
            loadTruongDiem();
          } else alert(res.error || 'Không xóa được phân công trưởng điểm');
        }
    
    
        // --- TAB VI PHẠM / WORKFLOW XỬ PHẠT ---
        let currentViPhamRole = null;
        let currentViPhamScope = [];
    
        function escapeText(value) {
          return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }
    
        function badgeViPhamStatus(status) {
          const st = String(status || '');
          if (st === 'Chờ duyệt') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          if (st === 'Đã duyệt') return 'bg-green-100 text-green-800 border-green-200';
          if (st === 'Từ chối') return 'bg-red-100 text-red-800 border-red-200';
          if (st === 'Đã thực thi') return 'bg-purple-100 text-purple-800 border-purple-200';
          return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    
        async function traCuuViPham() {
          const keyword = document.getElementById('vp-ma').value.trim();
          if (!keyword) return alert('Nhập mã TNV hoặc SĐT');
    
          const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'traCuuTNVAdmin', sessionId, keyword })
          });
          const res = await response.json();
    
          if (!res.success) return alert(res.error);
    
          selectedViPhamTNV = res.data;
          document.getElementById('vp-info').classList.remove('hidden');
          document.getElementById('vp-info').innerHTML =
            `<b>${escapeText(res.data.hoTen)}</b> (${escapeText(res.data.maTNV)})<br>
            <span class="text-xs text-blue-600">
              SĐT: ${escapeText(res.data.sdt || 'N/A')} |
              Đã cộng: ${escapeText(res.data.soBuoiCong)} |
              Đã trừ: ${escapeText(res.data.soBuoiTru)} |
              Còn: ${escapeText(res.data.tongBuoi)}
            </span>`;
        }
    
        async function submitViPham() {
          if (!selectedViPhamTNV) return alert('Vui lòng tra cứu TNV trước');
    
          const thongTinViPham = document.getElementById('vp-noidung').value.trim();
          const maKhuVuc = document.getElementById('vp-khuvuc').value.trim();
          const linkMinhChung = document.getElementById('vp-minhchung').value.trim();
          const quyetDinhXuPhat = document.getElementById('vp-quyetdinh').value.trim();
          const linkQuyetDinhXuPhat = document.getElementById('vp-link').value.trim();
          const soBuoiTru = parseFloat(document.getElementById('vp-tru').value) || 0;
    
          if (!thongTinViPham) return alert('Nhập nội dung vi phạm');
    
          const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'adminGhiNhanViPham',
              sessionId,
              maTNV: selectedViPhamTNV.maTNV,
              maKhuVuc,
              thongTinViPham,
              linkMinhChung,
              quyetDinhXuPhat,
              linkQuyetDinhXuPhat,
              soBuoiTru,
              soBuoiDeXuat: soBuoiTru,
              adminName
            })
          });
    
          const res = await response.json();
    
          if (res.success) {
            alert(res.message || 'Đã ghi nhận sai phạm');
            document.getElementById('vp-noidung').value = '';
            document.getElementById('vp-minhchung').value = '';
            document.getElementById('vp-quyetdinh').value = '';
            document.getElementById('vp-link').value = '';
            document.getElementById('vp-tru').value = '';
            loadViPham();
          } else {
            alert(res.error || 'Không ghi nhận được sai phạm');
          }
        }
    
        async function loadViPham() {
          await loadBaoCaoViPham();
          await loadLichSuViPhamChinhThuc();
        }
    
        async function loadBaoCaoViPham() {
          const box = document.getElementById('listBaoCaoViPham');
          if (!box) return;
          box.innerHTML = '<p class="text-xs text-gray-400">Đang tải báo cáo vi phạm...</p>';
    
          try {
            const response = await fetch(API_URL, {
              method: 'POST',
              body: JSON.stringify({ action: 'getBaoCaoViPham', sessionId })
            });
            const res = await response.json();
    
            if (!res.success) {
              box.innerHTML = `<p class="text-xs text-red-500">${escapeText(res.error)}</p>`;
              return;
            }
    
            currentViPhamRole = res.capQuyenKey;
            currentViPhamScope = res.phamViList || [];
    
            if (!res.data || res.data.length === 0) {
              box.innerHTML = '<p class="text-xs text-gray-400 italic">Chưa có báo cáo vi phạm.</p>';
              return;
            }
    
            box.innerHTML = res.data.map(x => {
              const canDuyet = !!x.canDuyet;
              const canThucThi = !!x.canThucThi;
              const safeMa = escapeText(x.maBaoCao);
              return `
                <div class="border rounded-xl p-3 bg-white item-row">
                  <div class="flex justify-between gap-3 items-start">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap gap-2 items-center">
                        <p class="font-bold text-gray-800">${escapeText(x.hoTen)} <span class="text-xs text-gray-500">(${escapeText(x.maTNV)})</span></p>
                        <span class="text-[10px] px-2 py-0.5 rounded-full border ${badgeViPhamStatus(x.trangThai)}">${escapeText(x.trangThai)}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border">${escapeText(x.maKhuVuc || 'N/A')}</span>
                      </div>
                      <p class="text-[11px] text-gray-500 mt-1">
                        Mã BC: ${safeMa} | Báo cáo: ${escapeText(x.thoiGianBaoCao)} | Người báo cáo: ${escapeText(x.adminBaoCao || 'N/A')}
                      </p>
                      <p class="text-[11px] text-gray-700 mt-2 bg-gray-50 border rounded p-2">${escapeText(x.thongTinViPham)}</p>
                      <p class="text-[11px] text-yellow-700 font-bold mt-1">Đề xuất trừ: ${escapeText(x.soBuoiDeXuat || 0)} buổi</p>
    
                      ${x.linkMinhChung ? `<a href="${escapeText(x.linkMinhChung)}" target="_blank" class="text-[10px] text-blue-600 underline font-bold mr-2">Xem minh chứng</a>` : ''}
                      ${x.linkQuyetDinhXuPhat ? `<a href="${escapeText(x.linkQuyetDinhXuPhat)}" target="_blank" class="text-[10px] text-green-600 underline font-bold mr-2">Xem quyết định</a>` : ''}
    
                      ${x.trangThai === 'Đã duyệt' ? `<p class="text-[11px] text-green-700 mt-1">Đã duyệt: ${escapeText(x.soBuoiTru)} buổi | ${escapeText(x.quyetDinhXuPhat || '')}</p>` : ''}
                      ${x.trangThai === 'Từ chối' ? `<p class="text-[11px] text-red-600 mt-1">Lý do từ chối: ${escapeText(x.lyDoTuChoi || '')}</p>` : ''}
                      ${x.trangThai === 'Đã thực thi' ? `<p class="text-[11px] text-purple-700 mt-1">Thực thi bởi ${escapeText(x.adminThucThi || '')} lúc ${escapeText(x.thoiGianThucThi || '')}. ${escapeText(x.ghiChuThucThi || '')}</p>` : ''}
    
                      <div class="flex flex-wrap gap-2 mt-3">
                        ${canDuyet ? `
                          <button onclick="duyetBaoCaoViPham('${safeMa}')" class="bg-green-600 text-white hover:bg-green-700 font-bold rounded-lg text-[10px] px-3 py-1.5">Duyệt</button>
                          <button onclick="tuChoiBaoCaoViPham('${safeMa}')" class="bg-red-600 text-white hover:bg-red-700 font-bold rounded-lg text-[10px] px-3 py-1.5">Từ chối</button>
                        ` : ''}
                        ${canThucThi ? `
                          <button onclick="thucThiBaoCaoViPham('${safeMa}')" class="bg-purple-600 text-white hover:bg-purple-700 font-bold rounded-lg text-[10px] px-3 py-1.5">Đã thực thi</button>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                </div>`;
            }).join('');
          } catch(e) {
            box.innerHTML = '<p class="text-xs text-red-500">Lỗi tải báo cáo vi phạm.</p>';
          }
        }
    
        async function duyetBaoCaoViPham(maBaoCao) {
          const quyetDinhXuPhat = prompt('Nhập quyết định xử phạt:');
          if (!quyetDinhXuPhat) return alert('Bắt buộc nhập quyết định xử phạt');
    
          const soBuoiTru = parseFloat(prompt('Nhập số buổi trừ chính thức:', '0')) || 0;
          if (soBuoiTru <= 0) return alert('Số buổi trừ phải > 0');
    
          const linkQuyetDinhXuPhat = prompt('Dán link quyết định/thông báo xử phạt nếu có:', '') || '';
    
          const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'adminDuyetBaoCaoViPham',
              sessionId,
              maBaoCao,
              status: 'Đã duyệt',
              quyetDinhXuPhat,
              linkQuyetDinhXuPhat,
              soBuoiTru,
              adminName
            })
          });
    
          const res = await response.json();
          if (res.success) {
            alert(res.message || 'Đã duyệt báo cáo');
            loadViPham();
          } else {
            alert(res.error || 'Không duyệt được báo cáo');
          }
        }
    
        async function tuChoiBaoCaoViPham(maBaoCao) {
          const lyDoTuChoi = prompt('Nhập lý do từ chối báo cáo xử phạt:');
          if (!lyDoTuChoi) return alert('Bắt buộc nhập lý do từ chối');
    
          const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'adminDuyetBaoCaoViPham',
              sessionId,
              maBaoCao,
              status: 'Từ chối',
              lyDoTuChoi,
              adminName
            })
          });
    
          const res = await response.json();
          if (res.success) {
            alert(res.message || 'Đã từ chối báo cáo');
            loadViPham();
          } else {
            alert(res.error || 'Không từ chối được báo cáo');
          }
        }
    
        async function thucThiBaoCaoViPham(maBaoCao) {
          const ghiChuThucThi = prompt('Ghi chú thực thi/thông báo cho TNV:', '') || '';
          if (!confirm('Xác nhận đã thực thi quyết định xử phạt? Thao tác này KHÔNG ghi thêm vào ViPham.')) return;
    
          const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'adminThucThiBaoCaoViPham',
              sessionId,
              maBaoCao,
              ghiChuThucThi,
              adminName
            })
          });
    
          const res = await response.json();
          if (res.success) {
            alert(res.message || 'Đã đánh dấu thực thi');
            loadViPham();
          } else {
            alert(res.error || 'Không đánh dấu thực thi được');
          }
        }
    
        async function loadLichSuViPhamChinhThuc() {
          const box = document.getElementById('listViPham');
          if (!box) return;
          box.innerHTML = '<p class="text-xs text-gray-400">Đang tải lịch sử vi phạm chính thức...</p>';
    
          try {
            const response = await fetch(API_URL, {
              method: 'POST',
              body: JSON.stringify({ action: 'getLichSuViPham', sessionId })
            });
            const res = await response.json();
    
            if (res.success) {
              if (res.data.length === 0) {
                box.innerHTML = '<p class="text-xs text-gray-400 italic">Chưa có vi phạm chính thức.</p>';
                return;
              }
    
              box.innerHTML = res.data.map(x => `
                <div class="border border-red-100 rounded-xl p-3 bg-white item-row">
                  <div class="flex justify-between gap-3 items-start">
                    <div class="min-w-0">
                      <p class="font-bold text-gray-800">${escapeText(x.hoTen)} <span class="text-xs text-gray-500">(${escapeText(x.maTNV)})</span></p>
                      <p class="text-[11px] text-red-600 font-bold">Trừ: ${escapeText(x.soBuoiTru)} buổi | ${escapeText(x.quyetDinhXuPhat || 'Chưa có quyết định')}</p>
                      <p class="text-[11px] text-gray-600 mt-1">${escapeText(x.thongTinViPham)}</p>
                      ${x.linkQuyetDinhXuPhat ? `<a href="${escapeText(x.linkQuyetDinhXuPhat)}" target="_blank" class="text-[10px] text-blue-600 underline">Xem quyết định</a>` : ''}
                      <p class="text-[10px] text-gray-400 mt-1">${escapeText(x.thoiGian)} | ${escapeText(x.admin)}</p>
                    </div>
                    <button onclick="deleteViPham(${x.rowNumber}, '${String(x.maTNV || '').replace(/'/g, "\\'")}')" class="shrink-0 bg-red-600 text-white hover:bg-red-700 font-bold rounded-lg text-[10px] px-3 py-1.5">Xóa</button>
                  </div>
                </div>`).join('');
            } else {
              box.innerHTML = `<p class="text-xs text-red-500">${escapeText(res.error)}</p>`;
            }
          } catch(e) {
            box.innerHTML = '<p class="text-xs text-red-500">Lỗi tải dữ liệu.</p>';
          }
        }
    
        async function deleteViPham(rowNumber, maTNV) {
          if (!rowNumber) return alert('Không xác định được dòng cần xóa');
          if (!confirm(`Xóa quyết định xử phạt chính thức của ${maTNV}?\nSố buổi trừ của bản ghi này sẽ không còn được tính.`)) return;
    
          const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'adminXoaViPham', sessionId, rowNumber, maTNV, adminName })
          });
          const res = await response.json();
    
          if (res.success) {
            alert('Đã xóa quyết định xử phạt chính thức');
            loadViPham();
          } else {
            alert(res.error || 'Không xóa được quyết định xử phạt');
          }
        }
    
    
        // --- TAB CẤP TÀI KHOẢN - CHỈ SUPERADMIN ---
        let __khuVucCapTaiKhoanLoaded = false;
    
        function getSelectedPhamViTaiKhoan() {
          const select = document.getElementById('tk-phamvi');
          if (!select) return [];
          return Array.from(select.selectedOptions).map(opt => opt.value).filter(Boolean);
        }
    
        function selectAllKhuVucTaiKhoan() {
          const select = document.getElementById('tk-phamvi');
          if (!select) return;
          Array.from(select.options).forEach(opt => opt.selected = opt.value === 'ALL');
        }
    
        function onChangeCapQuyenTaiKhoan() {
          const role = document.getElementById('tk-capquyen')?.value || '';
          if (['SuperAdmin', 'Admin', 'Kho bãi', 'ACC'].includes(role)) {
            selectAllKhuVucTaiKhoan();
          }
        }
    
        async function initCapTaiKhoanVisibility() {
          const btn = document.getElementById('btn-captaikhoan');
          if (!btn) return;
    
          try {
            const response = await fetch(API_URL, {
              method: 'POST',
              body: JSON.stringify({ action: 'getDanhSachTaiKhoanAdmin', sessionId })
            });
            const res = await response.json();
    
            if (res.success) {
              btn.classList.remove('hidden');
              renderDanhSachTaiKhoanAdmin(res.data || []);
              await loadKhuVucCapTaiKhoan();
            } else {
              btn.classList.add('hidden');
            }
          } catch (e) {
            btn.classList.add('hidden');
          }
        }
    
        async function loadCapTaiKhoan() {
          await loadKhuVucCapTaiKhoan();
          await loadDanhSachTaiKhoanAdmin();
        }
    
        async function loadKhuVucCapTaiKhoan() {
          const select = document.getElementById('tk-phamvi');
          if (!select) return;
    
          try {
            const response = await fetch(API_URL, {
              method: 'POST',
              body: JSON.stringify({ action: 'getDanhSachKhuVucCapTaiKhoan', sessionId })
            });
            const res = await response.json();
    
            if (!res.success) {
              select.innerHTML = '<option value="ALL">ALL - Toàn hệ thống</option>';
              return;
            }
    
            select.innerHTML = (res.data || []).map(kv => {
              const ma = escapeText(kv.maKhuVuc);
              const ten = escapeText(kv.tenKhuVuc);
              return `<option value="${ma}">${ten} (${ma})</option>`;
            }).join('');
    
            __khuVucCapTaiKhoanLoaded = true;
          } catch (e) {
            select.innerHTML = '<option value="ALL">ALL - Toàn hệ thống</option>';
          }
        }
    
        async function submitCapTaiKhoan() {
          const email = document.getElementById('tk-email').value.trim();
          const hoTen = document.getElementById('tk-hotenk').value.trim();
          const capQuyen = document.getElementById('tk-capquyen').value;
          const matKhau = document.getElementById('tk-matkhau').value;
          let phamViKhuVuc = getSelectedPhamViTaiKhoan();
    
          if (!email) return alert('Vui lòng nhập email.');
          if (!hoTen) return alert('Vui lòng nhập họ tên.');
          if (!capQuyen) return alert('Vui lòng chọn cấp quyền.');
          if (!matKhau) return alert('Vui lòng nhập mật khẩu.');
          if (phamViKhuVuc.length === 0) return alert('Vui lòng chọn phạm vi khu vực.');
    
          if (['SuperAdmin', 'Admin', 'Kho bãi', 'ACC'].includes(capQuyen)) {
            phamViKhuVuc = ['ALL'];
          }
    
          const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'adminCapTaiKhoan',
              sessionId,
              email,
              hoTen,
              capQuyen,
              phamViKhuVuc,
              matKhau
            })
          });
    
          const res = await response.json();
    
          if (res.success) {
            alert(res.message || 'Đã cấp tài khoản');
            document.getElementById('tk-email').value = '';
            document.getElementById('tk-hotenk').value = '';
            document.getElementById('tk-capquyen').value = '';
            document.getElementById('tk-matkhau').value = '';
            selectAllKhuVucTaiKhoan();
            loadDanhSachTaiKhoanAdmin();
          } else {
            alert(res.error || 'Không cấp được tài khoản');
          }
        }
    
        async function loadDanhSachTaiKhoanAdmin() {
          const box = document.getElementById('listTaiKhoanAdmin');
          if (!box) return;
          box.innerHTML = '<p class="text-xs text-gray-400">Đang tải danh sách tài khoản...</p>';
    
          try {
            const response = await fetch(API_URL, {
              method: 'POST',
              body: JSON.stringify({ action: 'getDanhSachTaiKhoanAdmin', sessionId })
            });
            const res = await response.json();
    
            if (!res.success) {
              box.innerHTML = `<p class="text-xs text-red-500">${escapeText(res.error || 'Không tải được danh sách tài khoản')}</p>`;
              return;
            }
    
            renderDanhSachTaiKhoanAdmin(res.data || []);
          } catch (e) {
            box.innerHTML = '<p class="text-xs text-red-500">Lỗi tải danh sách tài khoản.</p>';
          }
        }
    
        function renderDanhSachTaiKhoanAdmin(data) {
          const box = document.getElementById('listTaiKhoanAdmin');
          if (!box) return;
    
          if (!data || data.length === 0) {
            box.innerHTML = '<p class="text-xs text-gray-400 italic">Chưa có tài khoản admin nào.</p>';
            return;
          }
    
          box.innerHTML = data.map(tk => {
            const active = tk.trangThai === 'Hoạt động';
            const nextStatus = active ? 'Đã khóa' : 'Hoạt động';
            const btnClass = active
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white';
            const btnText = active ? 'Khóa tài khoản' : 'Mở khóa';
    
            return `
              <div class="border rounded-xl p-3 bg-white item-row">
                <div class="flex justify-between gap-3 items-start">
                  <div class="min-w-0">
                    <p class="font-bold text-gray-800">${escapeText(tk.hoTen)} <span class="text-xs text-gray-500">(${escapeText(tk.email)})</span></p>
                    <p class="text-[11px] text-indigo-700 font-bold">${escapeText(tk.capQuyen)} | Phạm vi: ${escapeText(tk.phamViKhuVuc || 'N/A')}</p>
                    <p class="text-[10px] ${active ? 'text-green-600' : 'text-red-600'} font-bold">Trạng thái: ${escapeText(tk.trangThai || 'N/A')}</p>
                  </div>
                  <div class="shrink-0 flex flex-col gap-2 items-end">
                    <button onclick="doiTrangThaiTaiKhoan('${escapeText(tk.email)}', '${nextStatus}')" class="${btnClass} font-bold rounded-lg text-[10px] px-3 py-1.5">
                      ${btnText}
                    </button>
                    <button onclick="doiMatKhauTaiKhoan('${escapeText(tk.email)}')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] px-3 py-1.5">
                      Đổi mật khẩu
                    </button>
                  </div>
                </div>
              </div>`;
          }).join('');
        }
    
        async function doiTrangThaiTaiKhoan(email, trangThai) {
          const actionText = trangThai === 'Đã khóa' ? 'khóa' : 'mở khóa';
          if (!confirm(`Xác nhận ${actionText} tài khoản ${email}?`)) return;
    
          const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'adminDoiTrangThaiTaiKhoan',
              sessionId,
              email,
              trangThai
            })
          });
    
          const res = await response.json();
    
          if (res.success) {
            alert(res.message || 'Đã cập nhật tài khoản');
            loadDanhSachTaiKhoanAdmin();
          } else {
            alert(res.error || 'Không cập nhật được tài khoản');
          }
        }
    
    
        async function doiMatKhauTaiKhoan(email) {
          const matKhauMoi = prompt(`Nhập mật khẩu mới cho tài khoản ${email}:`);
          if (matKhauMoi === null) return;
          if (!matKhauMoi.trim()) return alert('Mật khẩu mới không được để trống.');
          if (matKhauMoi.trim().length < 4) return alert('Mật khẩu mới nên có ít nhất 3 ký tự.');
    
          const xacNhan = prompt('Nhập lại mật khẩu mới để xác nhận:');
          if (xacNhan === null) return;
          if (xacNhan !== matKhauMoi) return alert('Mật khẩu xác nhận không khớp.');
    
          if (!confirm(`Xác nhận đổi mật khẩu cho tài khoản ${email}?`)) return;
    
          const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'adminDoiMatKhauTaiKhoan',
              sessionId,
              email,
              matKhauMoi
            })
          });
    
          const res = await response.json();
    
          if (res.success) {
            alert(res.message || 'Đã đổi mật khẩu tài khoản.');
            loadDanhSachTaiKhoanAdmin();
          } else {
            alert(res.error || 'Không đổi được mật khẩu tài khoản.');
          }
        }
    
    
      
    Object.assign(window as any, { getActionFromFetchOptions, setGlobalProcessing, setAdminButtonsDisabled, beginAdminProcessing, endAdminProcessing, showBusyToast, logout, switchTab, updateBadge, loadDashboard, loadMinhChung, submitDuyetMC, loadGCN, submitDuyetGCN, loadNoLink, submitUpdateLink, escapeAdminHtml, jsArgForOnclick, loadLichSuMC, filterTable, openEditMC, loadLichSuGCN, openEditGCN, loadDiemTrucOptions, autoSetHeSoTruongDiem, traCuuTruongDiem, submitTruongDiem, loadTruongDiem, deleteTruongDiem, escapeText, badgeViPhamStatus, traCuuViPham, submitViPham, loadViPham, loadBaoCaoViPham, duyetBaoCaoViPham, tuChoiBaoCaoViPham, thucThiBaoCaoViPham, loadLichSuViPhamChinhThuc, deleteViPham, getSelectedPhamViTaiKhoan, selectAllKhuVucTaiKhoan, onChangeCapQuyenTaiKhoan, initCapTaiKhoanVisibility, loadCapTaiKhoan, loadKhuVucCapTaiKhoan, submitCapTaiKhoan, loadDanhSachTaiKhoanAdmin, renderDanhSachTaiKhoanAdmin, doiTrangThaiTaiKhoan, doiMatKhauTaiKhoan });

  }, []);

  return <main className="min-h-screen bg-gray-100 pb-10"><nav className="bg-gray-900 text-white p-4 shadow-md sticky top-0 z-50 flex flex-wrap gap-3 items-center"><Link href="/admin/tong-quan" className="font-bold text-yellow-400 mr-auto">ADMIN DSLC</Link><span id="adminNameDisplay" className="text-xs bg-gray-700 px-2 py-1 rounded"></span><button onClick={() => (window as any).logout()} className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg font-bold">Đăng xuất</button></nav><div className="max-w-5xl mx-auto px-2 pt-4 mb-4"><div className="menu-scroll bg-white p-1 rounded-xl shadow-sm border border-gray-200"><div className="flex space-x-1 min-w-max"><Link href="/admin/tong-quan" className="px-4 py-2 text-xs font-bold rounded-lg transition text-gray-600 hover:bg-gray-100">Tổng quan</Link><Link href="/admin/minh-chung" className="px-4 py-2 text-xs font-bold rounded-lg transition text-gray-600 hover:bg-gray-100">Duyệt minh chứng</Link><Link href="/admin/gcn" className="px-4 py-2 text-xs font-bold rounded-lg transition text-gray-600 hover:bg-gray-100">Duyệt GCN</Link><Link href="/admin/no-link-gcn" className="px-4 py-2 text-xs font-bold rounded-lg transition text-gray-600 hover:bg-gray-100">Nợ link GCN</Link><Link href="/admin/lich-su-minh-chung" className="px-4 py-2 text-xs font-bold rounded-lg transition bg-gray-900 text-white">Lịch sử minh chứng</Link><Link href="/admin/lich-su-gcn" className="px-4 py-2 text-xs font-bold rounded-lg transition text-gray-600 hover:bg-gray-100">Lịch sử GCN</Link><Link href="/admin/truong-diem" className="px-4 py-2 text-xs font-bold rounded-lg transition text-gray-600 hover:bg-gray-100">Trưởng điểm</Link><Link href="/admin/vi-pham" className="px-4 py-2 text-xs font-bold rounded-lg transition text-gray-600 hover:bg-gray-100">Ghi nhận sai phạm</Link><Link href="/admin/cap-tai-khoan" className="px-4 py-2 text-xs font-bold rounded-lg transition text-gray-600 hover:bg-gray-100">Cấp tài khoản</Link></div></div></div><section className="max-w-5xl mx-auto px-2"><div id="tab-lichsumc" className="tab-content active">
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="bg-gray-50 px-4 py-3 border-b flex flex-col md:flex-row justify-between gap-2">
      <h2 className="font-bold text-gray-800 text-sm">Lịch sử Duyệt Minh Chứng</h2>
      {/* Ô tra cứu Mã TNV/SĐT */}
      <input type="text" id="search-mc" onKeyUp={() => { (window as any).filterTable('listLichSuMC', 'search-mc'); }} 
             placeholder="Tra cứu Mã TNV hoặc SĐT..." 
             className="text-xs border rounded px-2 py-1 outline-none focus:ring-1 ring-blue-500" />
    </div>
    <div id="listLichSuMC" className="p-4 space-y-3 text-sm"></div>
  </div>
</div></section></main>;
}
