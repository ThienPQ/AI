import React, { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Ngăn chuột phải, Ctrl+U, Ctrl+C, Ctrl+S, F12 (chống người phổ thông thôi)
  useEffect(() => {
    const preventKey = (e) => {
      // Chặn F12, Ctrl+U, Ctrl+S, Ctrl+C
      if (
        (e.ctrlKey && ["u", "s", "c"].includes(e.key.toLowerCase())) ||
        e.key === "F12"
      ) {
        e.preventDefault();
        return false;
      }
    };
    const preventContextMenu = (e) => {
      e.preventDefault();
    };
    document.addEventListener("keydown", preventKey);
    document.addEventListener("contextmenu", preventContextMenu);
    return () => {
      document.removeEventListener("keydown", preventKey);
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) {
      setError("Hãy nhập câu hỏi!");
      return;
    }
    setError("");
    setAnswer("");
    setLoading(true);

    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("question", question);

      const res = await fetch("/api/ask_file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setAnswer(data.answer);
      } else {
        setError(data.error || "Có lỗi xảy ra, thử lại sau.");
      }
    } catch (e) {
      setError("Không gửi được yêu cầu: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  return (
    <div style={{
      maxWidth: 560,
      margin: "32px auto",
      padding: 24,
      borderRadius: 16,
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      background: "#fff"
    }}>
      {/* Logo trên cùng */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Image
          src="/hhtip_logo.png"
          alt="Logo"
          width={180}
          height={60}
          style={{ height: "auto", margin: "0 auto" }}
        />
      </div>
      <h2 style={{ textAlign: "center", marginBottom: 12 }}>
        AI Phân tích tài liệu – Hỏi tự do hoặc theo file
      </h2>
      <p style={{
        color: "#555",
        fontStyle: "italic",
        marginBottom: 24,
        textAlign: "center"
      }}>
        Hệ thống này không lưu lại các tài liệu và không chịu trách nhiệm về nội dung bạn tải lên đặt câu hỏi.
      </p>
      <div style={{ marginBottom: 12 }}>
        <label>
          <b>Tệp tài liệu (Excel, PDF, Word) – <i>không bắt buộc</i>:</b>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.pdf,.docx"
            onChange={handleFileChange}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>
          <b>Câu hỏi:</b>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            rows={3}
            style={{ width: "100%", marginTop: 4, borderRadius: 8, border: "1px solid #ccc", padding: 8 }}
            placeholder="Nhập câu hỏi cho AI..."
          />
        </label>
      </div>
      <button
        onClick={handleAsk}
        disabled={loading}
        style={{
          background: "#2b90ff",
          color: "#fff",
          border: "none",
          padding: "12px 32px",
          borderRadius: 8,
          fontWeight: "bold",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: 16
        }}
      >
        {loading ? "Đang xử lý..." : "Gửi câu hỏi"}
      </button>

      {error && (
        <div style={{ color: "red", marginBottom: 8 }}>{error}</div>
      )}

      {answer && (
        <div style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 10,
          background: "#f8fafc",
          border: "1px solid #e5e7eb"
        }}>
          <b>AI trả lời:</b>
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{answer}</div>
        </div>
      )}
    </div>
  );
}
