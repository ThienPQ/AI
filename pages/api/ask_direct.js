import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import xlsx from "xlsx";

export default async function handler(req, res) {
  const { question } = req.body;

  // Đọc nội dung các file .xlsx trong thư mục
  const folderPath = "./your-doc-folder"; // thư mục chứa các file
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".xlsx"));

  let combinedText = "";

  for (const file of files) {
    const workbook = xlsx.readFile(path.join(folderPath, file));
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      json.forEach(row => {
        combinedText += row.join(" ") + "\n";
      });
    });
  }

  // Gửi nội dung gốc + câu hỏi vào GPT
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "Bạn là chuyên gia phân tích văn bản Excel của dự án nhà nước." },
      { role: "user", content: `Dữ liệu gốc:\n${combinedText.slice(0, 10000)}\n\nCâu hỏi:\n${question}` },
    ],
    temperature: 0.2,
  });

  res.status(200).json({ answer: response.choices[0].message.content });
}
