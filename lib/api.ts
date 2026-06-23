/**
 * Điểm cấu hình API duy nhất của toàn hệ thống.
 * Các URL mặc định được giữ theo từng dịch vụ gốc để không làm mất chức năng.
 */
export const API_URLS = {
  tnv: process.env.NEXT_PUBLIC_API_URL ?? "https://script.google.com/macros/s/AKfycbx4aYoOuWrNNKRMuYusmepmbprwszRv2NZXiVruLOsReJ0ametDZlAx8xf1Q51Q2epP4w/exec",
  attendance: process.env.NEXT_PUBLIC_API_URL ?? "https://script.google.com/macros/s/AKfycbx4aYoOuWrNNKRMuYusmepmbprwszRv2NZXiVruLOsReJ0ametDZlAx8xf1Q51Q2epP4w/exec",
  admin: process.env.NEXT_PUBLIC_API_URL ?? "https://script.google.com/macros/s/AKfycbx4aYoOuWrNNKRMuYusmepmbprwszRv2NZXiVruLOsReJ0ametDZlAx8xf1Q51Q2epP4w/exec",
} as const;

export type ApiScope = keyof typeof API_URLS;

export async function callApi<T>(scope: ApiScope, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(API_URLS[scope], {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return response.json() as Promise<T>;
}
