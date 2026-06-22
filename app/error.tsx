"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="page-loading"><span className="page-loading-mark">!</span><b>Đã xảy ra lỗi khi tải trang.</b><button className="primary" onClick={() => reset()}>Thử lại</button></main>;
}
