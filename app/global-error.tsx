"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="vi"><body><main style={{ minHeight: "100vh", display: "grid", placeContent: "center", gap: 12, textAlign: "center", fontFamily: "Arial, sans-serif" }}><h1>Không thể tải ứng dụng</h1><p>Vui lòng thử lại.</p><button onClick={() => reset()}>Thử lại</button></main></body></html>;
}
