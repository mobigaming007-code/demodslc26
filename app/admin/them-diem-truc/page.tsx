"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { callApi } from "@/lib/api";

type KhuVuc = {
  rowNumber: number;
  maKhuVuc: string;
  tenKhuVuc: string;
  maQRToken: string;
  viDo: number | string;
  kinhDo: number | string;
  banKinhMet: number | string;
  trangThai: "Hoạt động" | "Đã khóa";
};

type ApiResult = {
  success: boolean;
  error?: string;
  message?: string;
  data?: KhuVuc[];
  item?: KhuVuc;
};
type FormData = Omit<KhuVuc, "rowNumber">;

const emptyForm: FormData = {
  maKhuVuc: "",
  tenKhuVuc: "",
  maQRToken: "",
  viDo: "",
  kinhDo: "",
  banKinhMet: 50,
  trangThai: "Hoạt động",
};

function randomToken() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const values = new Uint32Array(8);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join(
    "",
  );
}

function normalizeMaKhuVuc(value: string) {
  return value
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildQrToken(maKhuVuc: string) {
  const ma = normalizeMaKhuVuc(maKhuVuc);
  return ma ? `DSLC_${ma}_${randomToken()}` : "";
}

export default function ThemDiemTrucPage() {
  const [role, setRole] = useState("");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [special, setSpecial] = useState(false);
  const [items, setItems] = useState<KhuVuc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const allowed = useMemo(
    () => ["superadmin", "admin"].includes(role.trim().toLowerCase()),
    [role],
  );
  const sessionId = () => sessionStorage.getItem("sessionId") || "";

  async function loadItems() {
    setLoading(true);
    try {
      const response = await callApi<ApiResult>("admin", {
        action: "getQuanLyKhuVuc",
        sessionId: sessionId(),
      });
      if (response.success) setItems(response.data || []);
      else
        setNotice({
          ok: false,
          text: response.error || "Không thể tải lịch sử điểm trực.",
        });
    } catch {
      setNotice({ ok: false, text: "Không thể kết nối máy chủ." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setRole(sessionStorage.getItem("capQuyen") || "");
    loadItems();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingRow(null);
    setSpecial(false);
    setNotice(null);
  }

  function setSpecialMode(enabled: boolean) {
    setSpecial(enabled);
    setForm((current) => {
      const maKhuVuc = enabled ? "DDB" : "";
      return {
        ...current,
        maKhuVuc,
        maQRToken: enabled ? buildQrToken(maKhuVuc) : "",
      };
    });
  }

  function changeMaKhuVuc(value: string) {
    const maKhuVuc = normalizeMaKhuVuc(value);
    setForm((current) => ({
      ...current,
      maKhuVuc,
      maQRToken: editingRow ? current.maQRToken : buildQrToken(maKhuVuc),
    }));
  }

  function editItem(item: KhuVuc) {
    setEditingRow(item.rowNumber);
    setSpecial(
      item.maKhuVuc.toUpperCase() === "DDB" ||
        item.maQRToken.toUpperCase().includes("_DDB_"),
    );
    setForm({ ...item });
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await callApi<ApiResult>("admin", {
        action: "adminLuuKhuVuc",
        sessionId: sessionId(),
        rowNumber: editingRow || undefined,
        ...form,
      });
      if (!response.success) {
        setNotice({
          ok: false,
          text: response.error || "Không thể lưu điểm trực.",
        });
        return;
      }
      const savedItem = response.item;
      if (savedItem) {
        setItems((current) =>
          editingRow
            ? current.map((item) =>
                item.rowNumber === savedItem.rowNumber ? savedItem : item,
              )
            : [...current, savedItem],
        );
      }
      resetForm();
      setNotice({ ok: true, text: response.message || "Đã lưu điểm trực." });
    } catch {
      setNotice({ ok: false, text: "Không thể kết nối máy chủ." });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item: KhuVuc) {
    const trangThai = item.trangThai === "Hoạt động" ? "Đã khóa" : "Hoạt động";
    if (
      !confirm(
        `${trangThai === "Đã khóa" ? "Khóa" : "Mở khóa"} điểm trực ${item.maKhuVuc}?`,
      )
    )
      return;
    const response = await callApi<ApiResult>("admin", {
      action: "adminDoiTrangThaiKhuVuc",
      sessionId: sessionId(),
      rowNumber: item.rowNumber,
      trangThai,
    });
    setNotice({
      ok: response.success,
      text:
        response.message || response.error || "Không thể cập nhật trạng thái.",
    });
    if (response.success)
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.rowNumber === item.rowNumber
            ? { ...currentItem, trangThai }
            : currentItem,
        ),
      );
  }

  async function removeItem(item: KhuVuc) {
    if (!confirm(`Xóa vĩnh viễn điểm trực ${item.maKhuVuc}?`)) return;
    const response = await callApi<ApiResult>("admin", {
      action: "adminXoaKhuVuc",
      sessionId: sessionId(),
      rowNumber: item.rowNumber,
    });
    setNotice({
      ok: response.success,
      text: response.message || response.error || "Không thể xóa điểm trực.",
    });
    if (response.success) {
      setItems((current) =>
        current
          .filter((currentItem) => currentItem.rowNumber !== item.rowNumber)
          .map((currentItem) =>
            currentItem.rowNumber > item.rowNumber
              ? { ...currentItem, rowNumber: currentItem.rowNumber - 1 }
              : currentItem,
          ),
      );
      if (editingRow === item.rowNumber) resetForm();
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-10">
      <section className="max-w-5xl mx-auto px-2">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-cyan-100 bg-cyan-50 px-5 py-4">
            <h1 className="font-bold text-cyan-950">Thêm điểm trực</h1>
            <p className="mt-1 text-xs text-cyan-800">
              Quản lý địa điểm điểm danh của Chương trình.
            </p>
          </header>
          {!allowed ? (
            <div className="p-5 text-sm text-red-700">
              Chức năng này chỉ dành cho SuperAdmin và Admin.
            </div>
          ) : (
            <div className="p-5 space-y-6">
              <form
                onSubmit={submit}
                className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      {editingRow ? "Sửa điểm trực" : "Tạo điểm trực mới"}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      QR Token được tạo tự động; có thể tạo lại khi cần.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpecialMode(!special)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${special ? "bg-violet-700 text-white" : "border border-violet-300 bg-white text-violet-800"}`}
                  >
                    {special ? "✓ Điểm đặc biệt" : "Điểm đặc biệt"}
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-xs font-semibold text-gray-700">
                    Mã khu vực
                    <input
                      required
                      value={form.maKhuVuc}
                      disabled={special}
                      onChange={(event) => changeMaKhuVuc(event.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                      placeholder="VD: KV01"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-gray-700">
                    Tên khu vực
                    <input
                      required
                      value={form.tenKhuVuc}
                      onChange={(event) =>
                        setForm({ ...form, tenKhuVuc: event.target.value })
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="Tên địa điểm"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-gray-700 md:col-span-2">
                    Mã QR Token
                    <div className="flex gap-2">
                      <input
                        required
                        value={form.maQRToken}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            maQRToken: event.target.value.toUpperCase(),
                          })
                        }
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            maQRToken: buildQrToken(form.maKhuVuc),
                          })
                        }
                        className="rounded-lg border border-cyan-300 bg-white px-3 text-xs font-bold text-cyan-800"
                      >
                        Tạo lại
                      </button>
                    </div>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-gray-700">
                    Vĩ độ
                    <input
                      required
                      type="number"
                      step="any"
                      value={form.viDo}
                      onChange={(event) =>
                        setForm({ ...form, viDo: event.target.value })
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="10.762622"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-gray-700">
                    Kinh độ
                    <input
                      required
                      type="number"
                      step="any"
                      value={form.kinhDo}
                      onChange={(event) =>
                        setForm({ ...form, kinhDo: event.target.value })
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="106.660172"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-gray-700">
                    Bán kính điểm danh (m)
                    <input
                      required
                      type="number"
                      min="1"
                      value={form.banKinhMet}
                      onChange={(event) =>
                        setForm({ ...form, banKinhMet: event.target.value })
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-gray-700">
                    Trạng thái
                    <select
                      value={form.trangThai}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          trangThai: event.target
                            .value as FormData["trangThai"],
                        })
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option>Hoạt động</option>
                      <option>Đã khóa</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={saving}
                    className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {saving
                      ? "Đang lưu…"
                      : editingRow
                        ? "Lưu thay đổi"
                        : "Thêm điểm trực"}
                  </button>
                  {editingRow && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700"
                    >
                      Hủy sửa
                    </button>
                  )}
                </div>
              </form>
              {notice && (
                <div
                  className={`rounded-lg border p-3 text-sm ${notice.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}
                >
                  {notice.text}
                </div>
              )}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      Lịch sử điểm trực
                    </h2>
                    <p className="text-xs text-gray-500">
                      Có thể sửa, khóa/mở khóa hoặc xóa địa điểm cũ.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadItems}
                    className="text-xs font-bold text-cyan-700 underline"
                  >
                    Làm mới
                  </button>
                </div>
                {loading ? (
                  <p className="text-sm text-gray-500">Đang tải…</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="px-3 py-2">Khu vực</th>
                          <th className="px-3 py-2">QR Token</th>
                          <th className="px-3 py-2">Tọa độ / bán kính</th>
                          <th className="px-3 py-2">Trạng thái</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr
                            key={item.rowNumber}
                            className="border-t border-gray-100"
                          >
                            <td className="px-3 py-3">
                              <b>{item.maKhuVuc}</b>
                              <br />
                              <span className="text-gray-500">
                                {item.tenKhuVuc}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-mono text-[10px]">
                              {item.maQRToken}
                            </td>
                            <td className="px-3 py-3">
                              {item.viDo}, {item.kinhDo}
                              <br />
                              <span className="text-gray-500">
                                {item.banKinhMet} m
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={
                                  item.trangThai === "Hoạt động"
                                    ? "font-bold text-green-700"
                                    : "font-bold text-red-700"
                                }
                              >
                                {item.trangThai}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <button
                                type="button"
                                onClick={() => editItem(item)}
                                className="mr-2 font-bold text-cyan-700"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => changeStatus(item)}
                                className="mr-2 font-bold text-amber-700"
                              >
                                {item.trangThai === "Hoạt động" ? "Khóa" : "Mở"}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(item)}
                                className="font-bold text-red-700"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {items.length === 0 && (
                      <p className="p-4 text-sm text-gray-500">
                        Chưa có điểm trực.
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
