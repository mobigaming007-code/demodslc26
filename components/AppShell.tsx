"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const volunteerLinks = [
  ["/tnv/diemdanh", "⌁", "Điểm danh"],
  ["/tnv/minhchung", "▣", "Minh chứng"],
  ["/tnv/gcn", "✦", "Giấy chứng nhận"],
];
const adminLinks = [
  ["/admin/tong-quan", "◈", "Tổng quan"],
  ["/admin/minh-chung", "▣", "Duyệt minh chứng"],
  ["/admin/gcn", "✦", "Duyệt GCN"],
  ["/admin/no-link-gcn", "⌁", "Nợ link GCN"],
  ["/admin/lich-su-minh-chung", "◷", "Lịch sử MC"],
  ["/admin/lich-su-gcn", "◷", "Lịch sử GCN"],
  ["/admin/truong-diem", "⌖", "Trưởng điểm"],
  ["/admin/them-diem-truc", "⌾", "Thêm điểm trực"],
  ["/admin/tinh-buoi", "◷", "Tính buổi"],
  ["/admin/vi-pham", "⚑", "Vi phạm"],
  ["/admin/cap-tai-khoan", "◎", "Cấp tài khoản"],
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/tnv" || pathname === "/";
  const isAdmin = pathname.startsWith("/admin");
  const [userLabel, setUserLabel] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const name = sessionStorage.getItem(isAdmin ? "adminName" : "hoTen") || "";
    const role = isAdmin
      ? sessionStorage.getItem("capQuyen") || "Quản trị viên"
      : "Tình nguyện viên";
    const code = isAdmin ? "" : sessionStorage.getItem("sessionId") || "";
    let maTNV = "";
    try {
      maTNV = code ? atob(code).split("_")[0] : "";
    } catch {
      maTNV = "";
    }
    setUserLabel(name ? `Chào ${name}${maTNV ? ` · ${maTNV}` : ""}` : "");
    setRoleLabel(role);
  }, [isAdmin, pathname]);
  useEffect(() => {
    const recoverChunk = (event: ErrorEvent | PromiseRejectionEvent) => {
      const message =
        "reason" in event
          ? String(event.reason?.message || event.reason || "")
          : String(event.error?.message || "");
      if (
        !/ChunkLoadError|Loading chunk|missing required error components/i.test(
          message,
        )
      )
        return;
      const key = "chunk-recovery-attempted";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    };
    window.addEventListener("error", recoverChunk);
    window.addEventListener("unhandledrejection", recoverChunk);
    return () => {
      window.removeEventListener("error", recoverChunk);
      window.removeEventListener("unhandledrejection", recoverChunk);
    };
  }, []);
  function logout() {
    sessionStorage.clear();
    window.location.href = "/tnv";
  }
  if (isLogin) return <>{children}</>;
  const links = isAdmin ? adminLinks : volunteerLinks;

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Đóng menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`shell-sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <Link
          href={isAdmin ? "/admin/tong-quan" : "/tnv/diemdanh"}
          className="brand-mark"
        >
          <span>DS</span>
          <b>
            Đổi Sách
            <br />
            Lấy Cây
          </b>
        </Link>
        <p className="shell-role">
          {isAdmin ? "TRUNG TÂM QUẢN TRỊ" : "KHU VỰC TÌNH NGUYỆN"}
        </p>
        <nav className="shell-nav">
          {links.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={pathname === href ? "active" : ""}
            >
              <i>{icon}</i>
              {label}
            </Link>
          ))}
        </nav>
        <div className="shell-footer">
          <span className="pulse" /> Hệ thống đang hoạt động
        </div>
      </aside>
      <section className="shell-stage">
        <header className="shell-topbar">
          <div className="topbar-title">
            <button
              className="hamburger"
              aria-label="Mở menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <p>
                {isAdmin ? "Quản trị chương trình" : "Cổng tình nguyện viên"}
              </p>
              <strong>
                {isAdmin ? "Điều hành Đổi Sách Lấy Cây" : "Đổi Sách Lấy Cây"}
              </strong>
            </div>
          </div>
          <div className="topbar-actions">
            {userLabel && (
              <span className="user-greeting">
                {userLabel}
                <small>{roleLabel}</small>
              </span>
            )}
            <button className="logout-button" onClick={logout}>
              Đăng xuất
            </button>
            <div className="topbar-orb">✦</div>
          </div>
        </header>
        <div className="shell-content">{children}</div>
      </section>
    </div>
  );
}
