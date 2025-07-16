import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";
import xlsx from "xlsx";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const CREDENTIALS = JSON.parse(fs.readFileSync("credentials.json"));
const TOKEN = JSON.parse(fs.readFileSync("token.json"));

const auth = new google.auth.OAuth2(
  CREDENTIALS.installed.client_id,
  CREDENTIALS.installed.client_secret,
  CREDENTIALS.installed.redirect_uris[0]
);
auth.setCredentials(TOKEN);
const drive = google.drive({ version: "v3", auth });

export default async function handler(req, res) {
  const { question } = req.body;
  const folderId = "YOUR_FOLDER_ID"; // 🟡 Thay bằng ID thư mục Google Drive của bạn

  // 1. Lấy danh sách file trong thư mục
  const files = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')`,
    fields: "files(id, name)",
  });

  let combinedText = "";

  // 2. Tải và xử lý từng file Excel
  for (const file of files.data.files) {
    const destPath = path.join("temp_files", file.name);
    const dest = fs.createWriteStream(destPath);

    await drive.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "stream" }
    ).then(res => new Promise((resolve, reject) => {
      res.data
        .on("end", () => resolve())
        .on("error", reject)
        .pipe(dest);
    }));

    const workbook = xlsx.readFile(destPath);
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      json.forEach(row => {
        combinedText += row.join(" ") + "\n";
      });
    });
