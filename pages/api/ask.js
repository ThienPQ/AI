import json
import os
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv
from tqdm import tqdm

# Load biến môi trường từ file .env
load_dotenv()

# Khởi tạo client OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Đọc dữ liệu từ file đã trích xuất
with open("excel_docx_documents.json", "r", encoding="utf-8") as f:
    documents = json.load(f)

embeddings = []
for i, doc in enumerate(tqdm(documents, desc="🔍 Đang tạo embeddings")):
    try:
        text = doc.get("content") or doc.get("text") or ""
        if not text.strip():
            raise ValueError("Nội dung trống hoặc thiếu trường 'content'")
        if len(text) > 8000:
            raise ValueError(f"Nội dung quá dài ({len(text)} ký tự), bỏ qua")

        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        embeddings.append({
            "embedding": response.data[0].embedding,
            "source": doc.get("source", "unknown"),
            "metadata": {
                "filename": doc.get("filename", "unknown"),
                "text": text[:100] + "..." if len(text) > 100 else text
            }
        })
    except Exception as e:
        print(f"❌ Lỗi ở đoạn {i+1}: {e}")

# Ghi ra file
with open("embeddings.json", "w", encoding="utf-8") as f:
    json.dump(embeddings, f, ensure_ascii=False, indent=2)

print("✅ Đã tạo xong embeddings và lưu vào embeddings.json")
