import formidable from "formidable";
import fs from "fs";
import xlsx from "xlsx";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { OpenAI } from "openai";

// Để Vercel không tự parse body
export const config = {
  api: { bodyParser: false }
};

function extractTextFromExcel(filepath) {
  try {
    const workbook = xlsx.readFile(filepath);
    let text = "";
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      json.forEach(row => { text += row.join(" ") + "\n"; });
    });
    return text;
  } catch (e) {
    console.error("== [DEBUG] Lỗi đọc Excel:", e);
    throw e;
  }
}

async function extractTextFromPDF(filepath) {
  try {
    const data = await pdfParse(fs.readFileSync(filepath));
    return data.text;
  } catch (e) {
    console.error("== [DEBUG] Lỗi đọc PDF:", e);
    throw e;
  }
}

async function extractTextFromWord(filepath) {
  try {
    const result = await mammoth.extractRawText({ path: filepath });
    return result.value;
  } catch (e) {
    console.error("== [DEBUG] Lỗi đọc Word:", e);
    throw e;
  }
}

export default async function handler(req, res) {
  console.log("== [DEBUG] Đã nhận request POST /api/ask_file ==");

  if (req.method !== "POST") {
    console.error("== [DEBUG] Method not allowed ==");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        console.error("== [DEBUG] Lỗi parse form:", err);
        return res.status(400).json({ error: "Lỗi upload file" });
      }

      console.log("== [DEBUG] fields:", fields);
      console.log("== [DEBUG] files:", files);

      let file = files.file;
      if (Array.isArray(file)) file = file[0];
      const question = fields.question || "";

      if (!file) {
        console.error("== [DEBUG] Không có file upload! files:", files);
        return res.status(400).json({ error: "Chưa có file" });
      }

      const fn =
        (file.originalFilename ||
         file.newFilename ||
         file.name ||
         file.filename ||
         ""
        ).toLowerCase();

      if (!fn) {
        console.error("== [DEBUG] Không xác định được tên file! file:", file);
        return res.status(400).json({ error: "Không xác định được tên file!" });
      }

      let fileText = "";
      try {
        console.log("== [DEBUG] Bắt đầu đọc file:", fn);
        if (fn.endsWith(".xlsx") || fn.endsWith(".xls") || fn.endsWith(".csv")) {
          fileText = extractTextFromExcel(file.filepath);
        } else if (fn.endsWith(".pdf")) {
          fileText = await extractTextFromPDF(file.filepath);
        } else if (fn.endsWith(".docx")) {
          fileText = await extractTextFromWord(file.filepath);
        } else {
          console.error("== [DEBUG] File không đúng định dạng hỗ trợ:", fn);
          return res.status(400).json({ error: "Chỉ hỗ trợ file Excel, Word (.docx), PDF" });
        }
      } catch (e) {
        console.error("== [DEBUG] Lỗi đọc file:", e);
        return res.status(500).json({ error: "Lỗi đọc file: " + e.message });
      }

      if (!fileText || fileText.trim().length < 5) {
        console.error("== [DEBUG] Không trích xuất được nội dung file hoặc file rỗng! fn:", fn);
        return res.status(400).json({ error: "Không trích xuất được nội dung từ file hoặc file rỗng!" });
      }

      // Check biến môi trường
      if (!process.env.OPENAI_API_KEY) {
        console.error("== [DEBUG] Thiếu biến môi trường OPENAI_API_KEY");
        return res.status(500).json({ error: "Thiếu biến môi trường OPENAI_API_KEY" });
      }

      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log("== [DEBUG] Gửi request tới OpenAI, độ dài dữ liệu:", fileText.length);

        const response = await openai.chat.completions.create({
          model: "gpt-4", // Nếu muốn tiết kiệm, chuyển thành "gpt-3.5-turbo"
          messages: [
            { role: "system", content: "Bạn là chuyên gia phân tích tài liệu dự án (Excel, Word, PDF)." },
            { role: "user", content: `Dữ liệu gốc:\n${fileText.slice(0, 12000)}\n\nCâu hỏi:\n${question}` },
          ],
          temperature: 0.2,
        });

        console.log("== [DEBUG] Nhận phản hồi GPT thành công ==");
        res.status(200).json({ answer: response.choices[0].message.content });
      } catch (e) {
        console.error("== [DEBUG] Lỗi GPT:", e);
        res.status(500).json({ error: "Lỗi GPT: " + e.message });
      } finally {
        // Xóa file tạm
        fs.unlink(file.filepath, () => {});
      }
    } catch (e) {
      console.error("== [DEBUG] Lỗi không xác định ngoài cùng:", e);
      res.status(500).json({ error: "Lỗi không xác định: " + e.message });
    }
  });
}
