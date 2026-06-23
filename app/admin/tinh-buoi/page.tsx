"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { callApi } from "@/lib/api";

type CalculateResult = {
  success: boolean;
  error?: string;
  message?: string;
  date?: string;
  totalRows?: number;
  totalBuoi?: number;
  executedBy?: string;
};

type DiemTruc = { value: string; label: string; isDDB: boolean };
type CauHinhDiemDacBiet = {
  diemTruc: string;
  heSoTNVThuong: number;
  trangThai: string;
};

function vietnamToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

export default function TinhBuoiPage() {
  const [ngay, setNgay] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingHeSo, setSavingHeSo] = useState(false);
  const [result, setResult] = useState<CalculateResult | null>(null);
  const [diemDacBiet, setDiemDacBiet] = useState("");
  const [heSoTNVThuong, setHeSoTNVThuong] = useState("1.5");
  const [dsDiemDacBiet, setDsDiemDacBiet] = useState<DiemTruc[]>([]);
  const [cauHinhDiemDacBiet, setCauHinhDiemDacBiet] = useState<
    CauHinhDiemDacBiet[]
  >([]);
  const allowed = useMemo(
    () => ["superadmin", "admin"].includes(role.trim().toLowerCase()),
    [role],
  );

  useEffect(() => {
    setNgay(vietnamToday());
    setRole(sessionStorage.getItem("capQuyen") || "");
    const sessionId = sessionStorage.getItem("sessionId") || "";
    Promise.all([
      callApi<{ success: boolean; data?: DiemTruc[] }>("admin", {
        action: "getDanhSachDiemTruc",
        sessionId,
      }),
      callApi<{ success: boolean; data?: CauHinhDiemDacBiet[] }>("admin", {
        action: "getCauHinhDiemDacBiet",
        sessionId,
      }),
    ])
      .then(([diemRes, cauHinhRes]) => {
        if (diemRes.success)
          setDsDiemDacBiet((diemRes.data || []).filter((diem) => diem.isDDB));
        if (cauHinhRes.success) setCauHinhDiemDacBiet(cauHinhRes.data || []);
      })
      .catch(() => undefined);
  }, []);

  async function saveHeSo() {
    if (!diemDacBiet || savingHeSo) return;
    setSavingHeSo(true);
    try {
      const response = await callApi<{
        success: boolean;
        error?: string;
        message?: string;
      }>("admin", {
        action: "adminLuuCauHinhDiemDacBiet",
        sessionId: sessionStorage.getItem("sessionId") || "",
        diemTruc: diemDacBiet,
        heSoTNVThuong,
      });
      if (!response.success) {
        setResult({
          success: false,
          error: response.error || "Không thể lưu hệ số.",
        });
        return;
      }
      setCauHinhDiemDacBiet((current) => {
        const next = current.filter((item) => item.diemTruc !== diemDacBiet);
        return [
          ...next,
          {
            diemTruc: diemDacBiet,
            heSoTNVThuong: Number(heSoTNVThuong),
            trangThai: "Hoạt động",
          },
        ];
      });
      setResult({
        success: true,
        message: response.message || "Đã lưu hệ số điểm đặc biệt.",
      });
    } catch {
      setResult({ success: false, error: "Không thể kết nối máy chủ." });
    } finally {
      setSavingHeSo(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ngay || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await callApi<CalculateResult>("admin", {
        action: "adminTinhBuoiTheoNgay",
        sessionId: sessionStorage.getItem("sessionId") || "",
        ngay,
      });
      setResult(response);
    } catch {
      setResult({
        success: false,
        error: "Không thể kết nối máy chủ. Vui lòng thử lại.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      <section className="max-w-5xl mx-auto px-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-emerald-50 px-5 py-4 border-b border-emerald-100">
            <h1 className="font-bold text-emerald-900">Tính buổi điểm danh</h1>
            <p className="text-xs text-emerald-700 mt-1">
              Tổng hợp Điểm danh theo ngày đã chọn.
            </p>
          </div>

          {!allowed ? (
            <div className="p-5">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Chức năng này chỉ dành cho SuperAdmin và Admin.
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="p-5 space-y-5">
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                <h2 className="text-sm font-bold text-violet-900">
                  Điểm đặc biệt — hệ số TNV thường
                </h2>
                <p className="mt-1 text-xs text-violet-800">
                  Hệ số này chỉ áp dụng cho TNV thường. Trưởng điểm vẫn dùng hệ
                  số đã thiết lập trong trang Trưởng điểm.
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_130px_auto]">
                  <select
                    value={diemDacBiet}
                    onChange={(event) => setDiemDacBiet(event.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Chọn điểm đặc biệt DDB</option>
                    {dsDiemDacBiet.map((diem) => (
                      <option key={diem.value} value={diem.value}>
                        {diem.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={heSoTNVThuong}
                    onChange={(event) => setHeSoTNVThuong(event.target.value)}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
                    aria-label="Hệ số TNV thường"
                  />
                  <button
                    type="button"
                    onClick={saveHeSo}
                    disabled={savingHeSo || !diemDacBiet}
                    className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60"
                  >
                    {savingHeSo ? "Đang lưu…" : "Lưu hệ số"}
                  </button>
                </div>
                {cauHinhDiemDacBiet.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-violet-900">
                    {cauHinhDiemDacBiet
                      .filter((item) => item.trangThai !== "Dừng")
                      .map((item) => (
                        <span
                          key={item.diemTruc}
                          className="rounded-full bg-white px-3 py-1 ring-1 ring-violet-200"
                        >
                          {item.diemTruc}: ×{item.heSoTNVThuong}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_auto] md:items-end">
                <label className="grid gap-2 text-sm font-semibold text-gray-700">
                  Ngày tính buổi
                  <input
                    type="date"
                    value={ngay}
                    onChange={(event) => setNgay(event.target.value)}
                    required
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading || !ngay}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? "Đang tính buổi…" : "Tính buổi"}
                </button>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                Hệ thống chỉ lấy lượt quét hợp lệ, ghép check-in/check-out theo
                từng mã TNV và khu vực. Mỗi ca cần đủ 2 giờ; ca trưởng điểm được
                đối chiếu theo phân công tại trang Trưởng điểm. Chạy lại cùng
                ngày sẽ thay thế dữ liệu tổng hợp cũ của ngày đó, không tạo bản
                ghi trùng.
              </div>

              {result && (
                <div
                  className={`rounded-lg border p-4 text-sm ${result.success ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-700"}`}
                >
                  {result.success ? (
                    <>
                      <p className="font-bold">
                        {result.message || "Đã tính buổi thành công."}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                        <span>
                          <b>Ngày:</b> {result.date}
                        </span>
                        <span>
                          <b>Bản ghi:</b> {result.totalRows ?? 0}
                        </span>
                        <span>
                          <b>Tổng buổi:</b> {result.totalBuoi ?? 0}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="font-semibold">
                      {result.error || "Không thể tính buổi."}
                    </p>
                  )}
                </div>
              )}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
