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
        setError(data.error || "Có lỗi xảy ra, thử
