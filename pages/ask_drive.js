// File: pages/api/ask_drive.js

import { google } from 'googleapis';
import { OpenAI } from 'openai';
import { readFile } from 'fs/promises';
import formidable from 'formidable';
import { read, utils } from 'xlsx';
import mammoth from 'mammoth';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const FOLDER_ID = '1SlkYquDIh_iyns0uqqTAqVzTgTxdU2z2'; // 🛠️ Thay bằng ID thư mục chứa file trong Google Drive

async function authorize() {
  const credentials = JSON.parse(await readFile('credentials.json', 'utf8'));
  const token = JSON.parse(await readFile('token.json', 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

async function listFiles(auth) {
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType)',
  });
  return res.data.files;
}

async function downloadFile(auth, file) {
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.get({
    fileId: file.id,
    alt: 'media',
  }, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

function extractTextFromExcel(buffer) {
  const workbook = read(buffer, { type: 'buffer' });
  const text = [];
  workbook.SheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    const rows = utils.sheet_to_json(sheet, { header: 1 });
    text.push(`\n--- Sheet: ${name} ---\n`);
    rows.forEach(row => {
      text.push(row.join(' | '));
    });
  });
  return text.join('\n');
}

async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function handler(req, res) {
  const form = formidable();
  const [fields] = await form.parse(req);
  const question = fields.question?.[0] || '';
  if (!question) return res.status(400).json({ error: 'Missing question' });

  const auth = await authorize();
  const files = await listFiles(auth);

  let allText = '';
  for (const file of files) {
    try {
      const buffer = await downloadFile(auth, file);
      if (file.mimeType.includes('spreadsheet') || file.name.endsWith('.xlsx')) {
        allText += `\n### ${file.name}\n` + extractTextFromExcel(buffer);
      } else if (file.name.endsWith('.docx')) {
        allText += `\n### ${file.name}\n` + await extractTextFromDocx(buffer);
      }
    } catch (err) {
      console.error(`Lỗi đọc file ${file.name}:`, err.message);
    }
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'Bạn là trợ lý AI giúp phân tích dữ liệu từ file Word và Excel liên quan đến các dự án đầu tư.' },
      { role: 'user', content: `Dữ liệu từ Drive:\n${allText.slice(0, 12000)}\n\nCâu hỏi: ${question}` }
    ]
  });

  return res.status(200).json({ answer: completion.choices[0].message.content });
}

export default handler;
