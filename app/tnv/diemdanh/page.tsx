// @ts-nocheck
"use client";

import { useEffect } from "react";
import { API_URLS } from "@/lib/api";

export default function DiemDanhPage() {
  useEffect(() => {
    
        const API_URL = API_URLS.attendance;
        const sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) window.location.href = '/';
    
        let html5QrCode = null;
        let cameraStarted = false;
        { loadHistory(); initCameraScanner(); };
    
        function logout() {
          if (confirm("Đăng xuất khỏi tài khoản?")) {
            sessionStorage.clear();
            window.location.href = '/';
          }
        }
    
        function showResult(message, type = "info") {
          const resBox = document.getElementById('result');
          resBox.classList.remove('hidden');
          const map = {
            info: "p-4 bg-blue-100 text-blue-800 rounded-xl shadow-sm text-center font-bold text-sm border border-blue-200 mt-4",
            success: "p-4 bg-green-100 text-green-800 rounded-xl shadow-sm text-center font-bold text-sm border border-green-200 mt-4",
            error: "p-4 bg-red-100 text-red-800 rounded-xl shadow-sm text-center font-bold text-sm border border-red-200 mt-4"
          };
          resBox.className = map[type] || map.info;
          resBox.innerHTML = message;
        }
    
        function safeResumeCamera() {
          try {
            if (html5QrCode && cameraStarted) html5QrCode.resume();
          } catch (e) {}
        }
    
        function loadExternalScript(src) {
          return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing && window.Html5Qrcode) return resolve();
            if (existing) {
              existing.addEventListener('load', resolve, { once: true });
              existing.addEventListener('error', () => reject(new Error(`Không tải được ${src}`)), { once: true });
              return;
            }
            const script = existing || document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Không tải được ${src}`));
            if (!existing) document.head.appendChild(script);
          });
        }

        async function initCameraScanner() {
          try {
            await loadExternalScript('https://unpkg.com/html5-qrcode');
            await loadExternalScript('https://unpkg.com/@zxing/browser@latest/umd/index.min.js');
            startCameraScanner();
          } catch (error) {
            showResult('❌ Không tải được thư viện quét QR. Vui lòng kiểm tra kết nối mạng và tải lại trang.', 'error');
          }
        }

        function startCameraScanner() {
          html5QrCode = new Html5Qrcode("reader");
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              try { html5QrCode.pause(true); } catch (e) {}
              handleDiemDanh(decodedText);
            }
          ).then(() => {
            cameraStarted = true;
          }).catch(err => {
            cameraStarted = false;
            showResult("❌ Không thể mở Camera!<br><span class='text-xs font-normal mt-1 block'>Bạn vẫn có thể dùng nút tải ảnh QR bên dưới. Hãy kiểm tra lại quyền truy cập Máy ảnh nếu muốn quét trực tiếp.</span>", "error");
            console.error("Lỗi khởi tạo Camera:", err);
          });
        }
    
        async function handleQrUpload(event) {
          const input = event.target;
          const file = input.files && input.files[0];
          input.value = "";
          if (!file) return;
    
          showResult("🔍 Đang đọc mã QR từ ảnh tải lên...", "info");
    
          try {
            if (html5QrCode && cameraStarted) {
              try { html5QrCode.pause(true); } catch (e) {}
            }
    
            const qrText = await decodeQrFromUploadedFile(file);
            if (!qrText) throw new Error("NO_QR");
    
            showResult("✅ Đã đọc được mã QR. Đang lấy GPS để điểm danh...", "success");
            await handleDiemDanh(qrText);
          } catch (err) {
            console.error("Không đọc được QR upload:", err);
            showResult(
              "❌ Không đọc được mã QR trong ảnh.<br><span class='text-xs font-normal mt-1 block'>Mẫu QR này là QR thiết kế dạng chấm/tròn và có logo ở giữa nên một số thư viện đọc QR rất khó nhận. Bản này đã thử ảnh gốc, ảnh cắt vùng QR, ảnh trắng đen, ảnh phóng to và ảnh làm dày điểm QR. Nếu vẫn lỗi, cần xuất thêm một bản QR chuẩn dạng ô vuông đen-trắng để hệ thống đọc ổn định.</span>",
              "error"
            );
            setTimeout(() => { document.getElementById('result').classList.add('hidden'); safeResumeCamera(); }, 7000);
          }
        }
    
        async function decodeQrFromUploadedFile(file) {
          const attempts = [];
    
          // 1) Native BarcodeDetector trên Chrome/Android nếu có.
          try {
            if ('BarcodeDetector' in window) {
              const bitmap = await createImageBitmap(file);
              const detector = new BarcodeDetector({ formats: ['qr_code'] });
              const codes = await detector.detect(bitmap);
              if (codes && codes[0] && codes[0].rawValue) return codes[0].rawValue;
            }
          } catch (e) {}
    
          // 2) html5-qrcode đọc file gốc.
          attempts.push(() => scanWithHtml5(file));
    
          // 3) ZXing đọc file gốc.
          attempts.push(() => scanWithZxing(file));
    
          // 4) Tạo các bản ảnh đã xử lý: cắt vùng trắng, phóng to, threshold, làm dày điểm tròn.
          const canvases = await buildPreprocessedCanvases(file);
          for (const canvas of canvases) {
            attempts.push(() => scanWithHtml5(canvasToFile(canvas)));
            attempts.push(() => scanWithZxing(canvasToBlobUrl(canvas)));
          }
    
          for (const attempt of attempts) {
            try {
              const result = await attempt();
              if (result) return result;
            } catch (e) {}
          }
          return "";
        }
    
        async function scanWithHtml5(file) {
          const readerId = "upload-reader-hidden";
          let holder = document.getElementById(readerId);
          if (!holder) {
            holder = document.createElement('div');
            holder.id = readerId;
            holder.style.display = 'none';
            document.body.appendChild(holder);
          }
          const scanner = new Html5Qrcode(readerId);
          try {
            if (scanner.scanFileV2) {
              const res = await scanner.scanFileV2(file, true);
              return res && (res.decodedText || res.text || res.result && res.result.text) || "";
            }
            return await scanner.scanFile(file, true);
          } finally {
            try { scanner.clear(); } catch (e) {}
          }
        }
    
        async function scanWithZxing(source) {
          if (!window.ZXingBrowser) return "";
          const reader = new ZXingBrowser.BrowserQRCodeReader();
          let url = "";
          try {
            if (source instanceof File || source instanceof Blob) {
              url = URL.createObjectURL(source);
            } else {
              url = source;
            }
            const result = await reader.decodeFromImageUrl(url);
            return result && result.getText ? result.getText() : (result && result.text) || "";
          } finally {
            if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
          }
        }
    
        function canvasToFile(canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          return new File([u8arr], 'qr-preprocessed.png', { type: mime });
        }
    
        function canvasToBlobUrl(canvas) {
          return canvas.toDataURL('image/png');
        }
    
        function loadImage(file) {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
          });
        }
    
        async function buildPreprocessedCanvases(file) {
          const img = await loadImage(file);
          const crop = findWhiteQrPanelCrop(img);
          const variants = [];
          const sizes = [900, 1200, 1600];
    
          for (const size of sizes) {
            variants.push(drawToCanvas(img, crop, size, "normal"));
            variants.push(drawToCanvas(img, crop, size, "binary"));
            variants.push(drawToCanvas(img, crop, size, "dilate"));
          }
          variants.push(drawToCanvas(img, { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight }, 1200, "binary"));
          return variants;
        }
    
        function drawToCanvas(img, crop, targetSize, mode) {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetSize, targetSize);
          ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, targetSize, targetSize);
    
          if (mode === "normal") return canvas;
    
          const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const v = gray < 150 ? 0 : 255;
            data[i] = data[i + 1] = data[i + 2] = v;
            data[i + 3] = 255;
          }
          ctx.putImageData(imageData, 0, 0);
    
          if (mode === "dilate") {
            const src = ctx.getImageData(0, 0, targetSize, targetSize);
            const out = ctx.createImageData(targetSize, targetSize);
            out.data.set(src.data);
            const r = 2;
            for (let y = r; y < targetSize - r; y++) {
              for (let x = r; x < targetSize - r; x++) {
                const idx = (y * targetSize + x) * 4;
                if (src.data[idx] < 128) {
                  for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                      const j = ((y + dy) * targetSize + (x + dx)) * 4;
                      out.data[j] = out.data[j + 1] = out.data[j + 2] = 0;
                      out.data[j + 3] = 255;
                    }
                  }
                }
              }
            }
            ctx.putImageData(out, 0, 0);
          }
          return canvas;
        }
    
        function findWhiteQrPanelCrop(img) {
          const maxW = 600;
          const scale = maxW / img.naturalWidth;
          const w = maxW;
          const h = Math.round(img.naturalHeight * scale);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, w, h);
          const d = ctx.getImageData(0, 0, w, h).data;
          let minX = w, minY = h, maxX = 0, maxY = 0;
          for (let y = 0; y < h; y += 2) {
            for (let x = 0; x < w; x += 2) {
              const i = (y * w + x) * 4;
              const r = d[i], g = d[i + 1], b = d[i + 2];
              if (r > 225 && g > 225 && b > 225) {
                minX = Math.min(minX, x); minY = Math.min(minY, y);
                maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
              }
            }
          }
          if (maxX <= minX || maxY <= minY) {
            return { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
          }
          const pad = 20;
          const x = Math.max(0, Math.round((minX - pad) / scale));
          const y = Math.max(0, Math.round((minY - pad) / scale));
          const x2 = Math.min(img.naturalWidth, Math.round((maxX + pad) / scale));
          const y2 = Math.min(img.naturalHeight, Math.round((maxY + pad) / scale));
          return { x, y, w: x2 - x, h: y2 - y };
        }
    
        async function handleDiemDanh(qrData) {
          const resBox = document.getElementById('result');
          resBox.classList.remove('hidden');
          resBox.innerText = "📍 Đang lấy vị trí GPS hiện tại...";
          resBox.className = "p-4 bg-blue-100 text-blue-800 rounded-xl shadow-sm text-center font-bold text-sm border border-blue-200 mt-4";
    
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                sendDataToServer(qrData, lat, lng);
              },
              (error) => {
                resBox.innerHTML = "❌ Không lấy được vị trí GPS.<br><span class='text-xs font-normal mt-1 block'>Hãy bật Định vị (Location) trên điện thoại và tải lại trang!</span>";
                resBox.className = "p-4 bg-red-100 text-red-800 rounded-xl shadow-sm text-center font-bold text-sm border border-red-200 mt-4";
                setTimeout(() => { resBox.classList.add('hidden'); safeResumeCamera(); }, 4000);
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          } else {
            resBox.innerText = "❌ Trình duyệt/Điện thoại của bạn không hỗ trợ tính năng định vị!";
            resBox.className = "p-4 bg-red-100 text-red-800 rounded-xl shadow-sm text-center font-bold text-sm border border-red-200 mt-4";
            setTimeout(() => { resBox.classList.add('hidden'); safeResumeCamera(); }, 4000);
          }
        }
    
        async function sendDataToServer(qrData, lat, lng) {
          const resBox = document.getElementById('result');
          resBox.innerText = "⏳ Đang đối chiếu vị trí với hệ thống...";
    
          try {
            const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'diemDanhTNV',
                sessionId: sessionId,
                qrCode: qrData,
                lat: lat,
                lng: lng,
                userAgent: navigator.userAgent
              })
            });
            const res = await response.json();
    
            if (res.success) {
              resBox.innerText = "✅ " + res.message;
              resBox.className = "p-4 bg-green-100 text-green-800 rounded-xl shadow-sm text-center font-bold text-sm border border-green-200 mt-4";
              loadHistory();
            } else {
              resBox.innerText = "❌ " + res.error;
              resBox.className = "p-4 bg-red-100 text-red-800 rounded-xl shadow-sm text-center font-bold text-sm border border-red-200 mt-4";
            }
    
            setTimeout(() => { resBox.classList.add('hidden'); safeResumeCamera(); }, 3500);
          } catch (e) {
            resBox.innerText = "❌ Lỗi kết nối mạng. Vui lòng thử lại!";
            resBox.className = "p-4 bg-red-100 text-red-800 rounded-xl shadow-sm text-center font-bold text-sm border border-red-200 mt-4";
            setTimeout(() => { resBox.classList.add('hidden'); safeResumeCamera(); }, 3000);
          }
        }
    
        async function loadHistory() {
          const box = document.getElementById("historyList") || document.getElementById("listHistory") || document.getElementById("historyBox") || document.getElementById("lichSuDiemDanh");
          if (!box) return;
          box.innerHTML = `<p class="text-xs text-gray-400 italic">Đang tải lịch sử điểm danh...</p>`;
          try {
            const response = await fetch(API_URL, {
              method: "POST",
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: "getLichSuDiemDanhTNV", sessionId })
            });
            const res = await response.json();
            if (!res.success) {
              box.innerHTML = `<p class="text-xs text-red-500">${res.error || "Không tải được lịch sử điểm danh."}</p>`;
              return;
            }
            if (!res.data || res.data.length === 0) {
              box.innerHTML = `<p class="text-xs text-gray-400 italic">Chưa có lịch sử điểm danh.</p>`;
              return;
            }
            box.innerHTML = res.data.map(item => {
              let badgeClass = "bg-gray-100 text-gray-700";
              if (item.trangThai === "Hoàn tất") badgeClass = "bg-green-100 text-green-700";
              else if (item.trangThai === "Chỉ check-in") badgeClass = "bg-yellow-100 text-yellow-700";
              else if (item.trangThai === "Chỉ check-out") badgeClass = "bg-red-100 text-red-700";
              return `
                <div class="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div class="flex justify-between items-start gap-2">
                    <div>
                      <p class="font-bold text-sm text-gray-800">${item.thoiGian} - ${item.buoi}</p>
                      <p class="text-xs text-gray-500 mt-1">${item.diaDiem || "Không rõ điểm"}</p>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-1 rounded-lg ${badgeClass}">${item.trangThai}</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div class="bg-gray-50 rounded-lg p-2"><p class="text-gray-400">Check-in</p><p class="font-bold text-gray-800">${item.checkIn || "--:--"}</p></div>
                    <div class="bg-gray-50 rounded-lg p-2"><p class="text-gray-400">Check-out</p><p class="font-bold text-gray-800">${item.checkOut || "--:--"}</p></div>
                  </div>
                  <p class="text-[11px] text-gray-500 mt-2">${item.ghiChu || ""}</p>
                </div>`;
            }).join("");
          } catch (err) {
            box.innerHTML = `<p class="text-xs text-red-500">Lỗi tải lịch sử điểm danh.</p>`;
          }
        }
      
    Object.assign(window as any, { logout, showResult, safeResumeCamera, startCameraScanner, handleQrUpload, decodeQrFromUploadedFile, scanWithHtml5, scanWithZxing, canvasToFile, canvasToBlobUrl, loadImage, buildPreprocessedCanvases, drawToCanvas, findWhiteQrPanelCrop, handleDiemDanh, sendDataToServer, loadHistory });
  }, []);

  return (
    <>
      <main className="bg-gray-100 pb-10">


  <nav className="bg-green-800 text-white p-4 shadow-md fixed w-full top-0 z-50 flex justify-between items-center">
    <h1 className="font-bold text-lg">Đổi sách lấy cây năm 2026</h1>
    <button onClick={() => { (window as any).logout(); }} className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg font-bold transition shadow">Đăng xuất</button>
  </nav>

  <div className="max-w-md mx-auto px-4 pt-20">
    <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
      <a href="/tnv/diemdanh" className="flex-1 text-center py-2.5 text-xs font-bold rounded-lg bg-green-700 text-white shadow-sm">Điểm danh</a>
      <a href="/tnv/minhchung" className="flex-1 text-center py-2.5 text-xs font-bold rounded-lg text-gray-500 hover:bg-gray-50 transition">Minh chứng</a>
      <a href="/tnv/gcn" className="flex-1 text-center py-2.5 text-xs font-bold rounded-lg text-gray-500 hover:bg-gray-50 transition">Nhận GCN</a>
    </div>
  </div>

  <main className="max-w-md mx-auto p-4 mt-2 space-y-5">
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
      <h2 className="font-bold text-green-800 text-lg mb-2">Quét mã QR Điểm danh</h2>
      <p className="text-xs text-gray-500 mb-4">Đưa camera vào sát mã QR do Trưởng ca cung cấp để ghi nhận.</p>

      <div id="reader" className="rounded-xl overflow-hidden shadow-inner bg-black w-full aspect-square relative"></div>

      <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-3 text-left">
        <p className="text-xs text-green-900 font-bold mb-2">Không mở được camera hoặc điểm in không có mã QR?</p>
        <label className="block w-full cursor-pointer rounded-lg bg-white border border-green-300 px-3 py-2 text-center text-sm font-bold text-green-800 shadow-sm hover:bg-green-100 transition">
          📤 Nếu không có mã QR, hãy tải mã QR lên
          <input id="qrUpload" type="file" accept="image/*" className="hidden" onChange={(event) => { (window as any).handleQrUpload(event); }} />
        </label>
        <p className="text-[11px] text-green-700 mt-2">Hệ thống vẫn kiểm tra đúng mã QR, khung giờ điểm danh và GPS trong bán kính phù hợp.</p>
      </div>

      <div id="result" className="hidden p-4 rounded-xl shadow-sm text-center font-bold text-sm border mt-4"></div>
    </div>

    <div>
      <div className="flex justify-between items-end mb-3">
        <h3 className="font-bold text-gray-800">Lịch sử hôm nay</h3>
        <button onClick={() => { (window as any).loadHistory(); }} className="text-xs text-blue-600 underline font-medium hover:text-blue-800">Làm mới</button>
      </div>
      <div id="listHistory" className="space-y-3">
        <p className="text-center text-gray-500 bg-white p-4 rounded-xl shadow-sm text-sm border italic">Đang tải dữ liệu...</p>
      </div>
    </div>
  </main>

  

      </main>
    </>
  );
}
