import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ];

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (
      !allowedTypes.includes(f.type) &&
      !f.name.endsWith('.xls') &&
      !f.name.endsWith('.csv') &&
      !f.name.endsWith('.pptx') &&
      !f.name.endsWith('.ppt')
    ) {
      setError("Chỉ chấp nhận PDF, Word (.docx), Excel, PowerPoint");
      setFile(null);
      setFileName("");
      return;
    }
    setFile(f);
    setFileName(f.name);
    setError("");
  };

  const handleAsk = async () => {
    if (!file || !question.trim()) {
      setError("Hãy chọn tệp và nhập câu hỏi!");
      return;
    }
    setError("");
    setAnswer("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
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

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
      {/* HEADER với logo và tiêu đề */}
      <div style={{
        background: "#2476ee",
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        display: "flex",
        alignItems: "center",
        padding: "20px 36px",
        maxWidth: 800,
        margin: "32px auto 0 auto",
        boxShadow: "0 6px 24px #3577cf22"
      }}>
        <img src="/hhtip_logo.png" alt="HHTIP Logo" style={{ height: 48, marginRight: 18, borderRadius: 8, background: "#fff" }} />
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 28, letterSpacing: 1 }}>
          Chatbot HHTIP Demo
        </div>
      </div>

      {/* Card chính */}
      <div style={{
        maxWidth: 800,
        margin: "0 auto",
        background: "#fff",
        borderRadius: "0 0 16px 16px",
        boxShadow: "0 8px 40px #3577cf18",
        padding: 0,
        minHeight: 500
      }}>
        <div style={{
          padding: "28px 32px 12px 32px",
          borderBottom: "1px solid #e8eef6"
        }}>
          <div style={{
            fontSize: 16,
            color: "#333",
            background: "#f7fbff",
            padding: "14px 18px",
            borderRadius: 12,
            marginBottom: 8,
            lineHeight: 1.55
          }}>
            <b>Xin chào!</b> Bạn có thể đặt câu hỏi hoặc tải tệp (PDF, WORD, EXCEL, POWERPOINT) lên để tôi phân tích.<br />
            <span style={{ fontSize: 13, color: "#2377cd" }}>
              Tôi không lưu lại file của bạn và miễn trừ mọi trách nhiệm liên quan đến nội dung bạn cung cấp/trao đổi.
            </span>
          </div>
        </div>
        {/* Kết quả chat */}
        <div style={{ padding: "24px 32px" }}>
          {error &&
            <div style={{
              color: "red",
              background: "#fff0f0",
              padding: 8,
              borderRadius: 6,
              marginBottom: 10,
              fontSize: 15
            }}>
              {error}
            </div>
          }
          {answer && (
            <div style={{
              background: "#f7faff",
              borderRadius: 10,
              padding: 18,
              marginBottom: 12,
              minHeight: 40,
              fontSize: 16,
              whiteSpace: "pre-wrap"
            }}>
              <b>Phản hồi AI:</b><br />
              {answer}
            </div>
          )}
        </div>
        {/* Footer - input và nút */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderTop: "1px solid #e9e9ef",
          padding: "16px 32px 20px 32px",
          background: "#f8fbff",
          borderRadius: "0 0 16px 16px"
        }}>
          <label style={{
            display: "flex",
            alignItems: "center",
            background: "#eef3fc",
            borderRadius: 8,
            padding: "5px 18px",
            cursor: "pointer",
            fontWeight: 500,
            color: "#2476ee"
          }}>
            <svg width={20} height={20} style={{ marginRight: 6 }} viewBox="0 0 20 20" fill="none">
              <path d="M8.75 2.5H5A2.5 2.5 0 0 0 2.5 5v10A2.5 2.5 0 0 0 5 17.5h10a2.5 2.5 0 0 0 2.5-2.5v-3.75M14.584 2.542a2.002 2.002 0 0 1 2.834 2.83l-8.576 8.585-3.5.667.666-3.5 8.576-8.582Z" stroke="#2476ee" strokeWidth="1.5" />
            </svg>
            Tải tệp
            <input type="file"
              accept=".xlsx,.xls,.csv,.docx,.pdf,.pptx,.ppt"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>
          <div style={{ minWidth: 88, color: "#555", fontSize: 15 }}>
            {fileName}
          </div>
          <input
            type="text"
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 7,
              border: "1px solid #c6d8f5",
              fontSize: 15
            }}
            placeholder="Nhập câu hỏi của bạn..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAsk(); }}
            disabled={loading}
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            style={{
              padding: "10px 30px",
              background: "#2476ee",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              marginLeft: 8
            }}
          >
            {loading ? "Đang xử lý..." : "Gửi"}
          </button>
        </div>
      </div>
      <div style={{
        maxWidth: 800,
        margin: "18px auto",
        color: "#888",
        fontSize: 14,
        textAlign: "right"
      }}>
        Số lượt truy cập: <b>Chưa cấu hình</b>
      </div>
    </div>
  );
}
