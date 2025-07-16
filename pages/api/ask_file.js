import formidable from "formidable";
import fs from "fs";
import xlsx from "xlsx";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { OpenAI } from "openai";

export const config = {
  api: { bodyParser: false }
};

function extractTextFromExcel(filepath) {
  const workbook = xlsx.readFile(filepath);
  let text = "";
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    json.forEach(row => { text += row.join(" ") + "\n"; });
  });
  return text;
}

async function extractTextFromPDF(filepath) {
  const data = await pdfParse(fs.readFileSync(filepath));
  return data.text;
}

async function extractTextFromWord(filepath) {
  const result = await mammoth.extractRawText({ path: filepath });
  return result.value;
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: "Lỗi upload file" });

    let file = files.file;
    // Nếu là mảng (Formidable v3+), lấy phần tử đầu tiên
    if (Array.isArray(file)) {
      file = file[0];
    }

    const question = fields.question;

    if (!file) return res.status(400).json({ error: "Chưa có file" });

    // Lấy tên file an toàn
    const fn =
      (file.originalFilename ||
       file.newFilename ||
       file.name ||
       file.filename ||
       ""
      ).toLowerCase();

    if (!fn) {
      return res.status(400).json({ error: "Không xác định được tên file!" });
    }

    let fileText = "";
    try {
      if (fn.endsWith(".xlsx") || fn.endsWith(".xls") || fn.endsWith(".csv")) {
        fileText = extractTextFromExcel(file.filepath);
      } else if (fn.endsWith(".pdf")) {
        fileText = await extractTextFromPDF(file.filepath);
      } else if (fn.endsWith(".docx")) {
        fileText = await extractTextFromWord(file.filepath);
      } else {
        return res.status(400).json({ error: "Chỉ hỗ trợ file Excel, Word (.docx), PDF" });
      }
    } catch (e) {
      return res.status(500).json({ error: "Lỗi đọc file: " + e.message });
    }

    if (!fileText || fileText.trim().length < 5) {
      return res.status(400).json({ error: "Không trích xuất được nội dung từ file hoặc file rỗng!" });
    }

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Bạn là chuyên gia phân tích tài liệu dự án (Excel, Word, PDF)." },
          { role: "user", content: `Dữ liệu gốc:\n${fileText.slice(0, 10000)}\n\nCâu hỏi:\n${question}` },
        ],
        temperature: 0.2,
      });

      res.status(200).json({ answer: response.choices[0].message.content });
    } catch (e) {
      res.status(500).json({ error: "Lỗi GPT: " + e.message });
    } finally {
      fs.unlink(file.filepath, () => {});
    }
  });
}
