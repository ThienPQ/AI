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
    try {
      if (err) return res.status(400).json({ error: "Lỗi upload file" });

      let file = files.file;
      if (Array.isArray(file)) file = file[0];

      // Đảm bảo question là string
      let question = "";
      if (typeof fields.question === "string") question = fields.question;
      else if (Array.isArray(fields.question)) question = fields.question.join(" ");
      else question = "";

      let prompt = question || "";

      // Nếu có file (file tồn tại và có tên), thì trích xuất text để hỏi AI
      if (file && (file.originalFilename || file.name || file.filename)) {
        const fn =
          (file.originalFilename ||
           file.newFilename ||
           file.name ||
           file.filename ||
           ""
          ).toLowerCase();

        let fileText = "";
        if (fn.endsWith(".xlsx") || fn.endsWith(".xls") || fn.endsWith(".csv")) {
          fileText = extractTextFromExcel(file.filepath);
        } else if (fn.endsWith(".pdf")) {
          fileText = await extractTextFromPDF(file.filepath);
        } else if (fn.endsWith(".docx")) {
          fileText = await extractTextFromWord(file.filepath);
        } else {
          return res.status(400).json({ error: "Chỉ hỗ trợ file Excel, Word (.docx), PDF" });
        }

        if (!fileText || fileText.trim().length < 5) {
          return res.status(400).json({ error: "Không trích xuất được nội dung từ file hoặc file rỗng!" });
        }

        prompt = `Dữ liệu gốc:\n${fileText.slice(0, 12000)}\n\nCâu hỏi:\n${question}`;
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "Thiếu biến môi trường OPENAI_API_KEY" });
      }

      // Đảm bảo prompt là string!
      if (Array.isArray(prompt)) prompt = prompt.join(" ");
      if (typeof prompt !== "string") prompt = String(prompt);

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text: "Bạn là trợ lý AI phân tích tài liệu (Excel, Word, PDF) và trả lời các câu hỏi tự do nếu không có tài liệu."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ],
        temperature: 0.2,
      });

      res.status(200).json({ answer: response.choices[0].message.content });

      // Xóa file tạm nếu có
      if (file && file.filepath) fs.unlink(file.filepath, () => {});

    } catch (e) {
      res.status(500).json({ error: "Lỗi: " + e.message });
    }
  });
}
