// @ts-nocheck
"use client";

import { useEffect } from "react";
import Script from "next/script";
import { API_URLS } from "@/lib/api";

export default function TnvPage() {
  useEffect(() => {
    
        // ==========================================
        // DÁN LINK WEB APP CỦA BẠN VÀO DÒNG DƯỚI ĐÂY
        // ==========================================
        const API_URL = API_URLS.tnv;
    
        {
          const currentSession = sessionStorage.getItem('sessionId');
          const currentRole = sessionStorage.getItem('role');
          if(currentSession) {
            window.location.href = currentRole === 'Admin' ? '/admin' : '/tnv/diemdanh';
          }
        };
    
        function toggleView() {
          document.getElementById('formTNV').classList.toggle('hidden');
          document.getElementById('formAdmin').classList.toggle('hidden');
          document.getElementById('resultBox').classList.add('hidden');
        }
    
        function showMsg(isSuccess, text) {
          const box = document.getElementById('resultBox');
          box.className = `p-3 rounded-xl text-sm text-center font-bold mb-6 ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
          box.innerText = text;
          box.classList.remove('hidden');
        }
    
        async function handleLogin(role) {
          const btn = role === 'TNV' ? document.getElementById('btnTNV') : document.getElementById('btnAdmin');
          const payload = { action: role === 'TNV' ? 'loginTNV' : 'loginAdmin' };
          
          if(role === 'TNV') {
            payload.maTNV = document.getElementById('maTNV').value.trim();
            if(!payload.maTNV) return showMsg(false, "Vui lòng nhập Mã TNV hoặc Số điện thoại!");
          } else {
            payload.user = document.getElementById('adminUser').value.trim();
            payload.pass = document.getElementById('adminPass').value.trim();
            if(!payload.user || !payload.pass) return showMsg(false, "Vui lòng nhập đầy đủ Email và Mật khẩu!");
          }
    
          btn.disabled = true;
          btn.innerText = "⏳ ĐANG KIỂM TRA...";
    
          try {
            const response = await fetch(API_URL, {
              method: 'POST',
              mode: 'cors',
              // Lệnh lách luật CORS kinh điển của JS khi gọi API Google Script
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(payload)
            });
    
            const res = await response.json();
            
            if(res.success) {
              showMsg(true, "✅ Thành công! Đang chuyển hướng...");
              
              // Lưu session và vai trò
              sessionStorage.setItem('sessionId', res.sessionId);
              sessionStorage.setItem('hoTen', res.hoTen);
              sessionStorage.setItem('role', res.role || role);
              
              // Lưu thông tin phân quyền của Admin để dùng ở trang admin.html
              if(res.adminName) sessionStorage.setItem('adminName', res.adminName);
              if(res.capQuyen) sessionStorage.setItem('capQuyen', res.capQuyen);
              if(res.phamVi) sessionStorage.setItem('phamVi', res.phamVi);
              
              setTimeout(() => {
                window.location.href = (res.role === 'Admin' || role === 'Admin') ? '/admin' : '/tnv/diemdanh';
              }, 800);
              
            } else {
              showMsg(false, "❌ " + res.error);
              btn.disabled = false;
              btn.innerText = role === 'TNV' ? "VÀO HỆ THỐNG" : "XÁC THỰC QUẢN TRỊ";
            }
          } catch (err) {
            showMsg(false, "❌ Máy chủ không phản hồi. Vui lòng kiểm tra lại quyền truy cập (Anyone) trên Google Script!");
            btn.disabled = false;
            btn.innerText = role === 'TNV' ? "VÀO HỆ THỐNG" : "XÁC THỰC QUẢN TRỊ";
          }
        }
      
    Object.assign(window as any, { toggleView, showMsg, handleLogin });
  }, []);

  return (
    <>
      <main className="bg-gray-100 h-screen flex items-center justify-center p-4">


  <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-gray-100">
    <div className="text-center mb-8">
      <h1 className="text-2xl font-black text-green-700 leading-tight">CHƯƠNG TRÌNH</h1>
      <p className="text-2xl font-black text-green-700 leading-tight">ĐỔI SÁCH LẤY CÂY</p>
      <p className="text-2xl font-black text-green-700 leading-tight">Năm 2026<br /></p>
      <p className="text-xs text-gray-400 mt-2 font-medium tracking-widest uppercase">Cổng thông tin quản lý Tình nguyện viên</p>
    </div>

    <div id="resultBox" className="hidden p-3 rounded-xl text-sm text-center font-bold mb-6 transition-all"></div>

    <div id="formTNV" className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Tài khoản Tình nguyện viên</label>
        <input type="text" id="maTNV" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); (window as any).handleLogin('TNV'); } }} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:outline-none focus:border-green-600 focus:bg-white transition-all uppercase font-bold text-gray-700" placeholder="Mã TNV hoặc Số điện thoại..." />
      </div>
      <button id="btnTNV" onClick={() => { (window as any).handleLogin('TNV'); }} className="w-full bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 hover:bg-green-800 active:scale-95 transition-all">
        VÀO HỆ THỐNG
      </button>
      <button onClick={() => { (window as any).toggleView(); }} className="w-full text-xs text-gray-400 underline hover:text-blue-900 transition">Dành cho Ban điều hành</button>
    </div>

    <div id="formAdmin" className="hidden space-y-5">
      <div>
        <label className="block text-xs font-bold text-blue-900 uppercase mb-2 ml-1">Email Ban điều hành</label>
        <input type="email" id="adminUser" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); (window as any).handleLogin('Admin'); } }} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:outline-none focus:border-blue-900 focus:bg-white transition-all font-bold mb-4" placeholder="Nhập Email đã phân quyền..." />
        
        <label className="block text-xs font-bold text-blue-900 uppercase mb-2 ml-1">Mật khẩu</label>
        <input type="password" id="adminPass" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); (window as any).handleLogin('Admin'); } }} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:outline-none focus:border-blue-900 focus:bg-white transition-all font-bold" placeholder="••••••••" />
      </div>
      <button id="btnAdmin" onClick={() => { (window as any).handleLogin('Admin'); }} className="w-full bg-blue-900 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 hover:bg-black active:scale-95 transition-all">
        XÁC THỰC QUẢN TRỊ
      </button>
      <button onClick={() => { (window as any).toggleView(); }} className="w-full text-xs text-gray-400 underline hover:text-green-700 transition">Quay lại trang Tình nguyện viên</button>
    </div>
  </div>

  

      </main>
    </>
  );
}
