/**
 * OUR QUIZ — Google Apps Script backend
 * -------------------------------------
 * วิธีติดตั้ง (ทำตามลำดับ):
 * 1) เปิด Google Sheets ไฟล์ใหม่ 1 ไฟล์ ตั้งชื่อว่าอะไรก็ได้ เช่น "OurQuizData"
 * 2) สร้าง 4 แผ่นงาน (tabs) ชื่อตรงตามนี้เป๊ะๆ (ตัวพิมพ์เล็ก-ใหญ่ต้องตรง):
 *      Questions_Mond   คอลัมน์แถวแรก: ID | Question_LO | Question_EN
 *      Questions_Fan    คอลัมน์แถวแรก: ID | Question_LO | Question_EN
 *      Answers_Mond     คอลัมน์แถวแรก: QuestionID | Answer_LO | Answer_EN | Timestamp
 *      Answers_Fan      คอลัมน์แถวแรก: QuestionID | Answer_LO | Answer_EN | Timestamp
 * 3) ใส่คำถามของแต่ละคนลงในแผ่นงาน Questions_Mond / Questions_Fan (แถวที่ 2 เป็นต้นไป)
 *    ตัวอย่าง: 1 | ຄວາມຊົງຈຳທຳອິດ... | What is the first memory...
 * 4) เมนู Extensions > Apps Script แล้ววางโค้ดทั้งไฟล์นี้ทับของเดิม กด Save
 * 5) กด Deploy > New deployment > เลือกประเภท "Web app"
 *      Execute as: Me
 *      Who has access: Anyone
 *    กด Deploy แล้วคัดลอก URL ที่ได้ (ลงท้ายด้วย /exec)
 * 6) เอา URL นั้นไปวางแทนที่ API_URL ในไฟล์ script.js ของเว็บ (บรรทัดบนสุด)
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId(); // ใช้ได้เลยถ้าผูก Script กับ Sheet โดยตรง

function getSheet_(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function userToSheetSuffix_(user) {
  return user === "fan" ? "Fan" : "Mond"; // ป้องกันค่าที่ไม่รู้จัก ให้ fallback เป็น Mond
}

/* ---------------- GET: ดึงคำถาม หรือ ดึงคำตอบ ---------------- */
function doGet(e) {
  const action = e.parameter.action;
  const user = e.parameter.user;

  if (action === "getQuestions") {
    return jsonOut_(getQuestions_(user));
  }
  if (action === "getAnswers") {
    return jsonOut_(getAnswers_(user));
  }
  return jsonOut_({ error: "unknown action" });
}

function getQuestions_(user) {
  const sheet = getSheet_("Questions_" + userToSheetSuffix_(user));
  const rows = sheet.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === "" || rows[i][0] === null) continue;
    out.push({ id: rows[i][0], lo: rows[i][1], en: rows[i][2] });
  }
  return out;
}

function getAnswers_(user) {
  const sheet = getSheet_("Answers_" + userToSheetSuffix_(user));
  const rows = sheet.getDataRange().getValues();
  const out = {};
  for (let i = 1; i < rows.length; i++) {
    const qid = rows[i][0];
    if (qid === "" || qid === null) continue;
    out[qid] = { lo: rows[i][1], en: rows[i][2], ts: rows[i][3] };
  }
  return out;
}

/* ---------------- POST: บันทึกคำตอบ หรือ ลบคำตอบทั้งหมด ----------------
   ส่งมาแบบ application/x-www-form-urlencoded (ไม่ใช่ JSON) เพื่อเลี่ยงปัญหา
   CORS preflight — ฝั่งหน้าเว็บใช้ URLSearchParams ตามที่เตรียมไว้ให้แล้ว
------------------------------------------------------------------- */
function doPost(e) {
  const action = e.parameter.action;
  const user = e.parameter.user;

  if (action === "saveAnswer") {
    return jsonOut_(saveAnswer_(user, e.parameter.questionId, e.parameter.answerLo));
  }
  if (action === "deleteAnswers") {
    return jsonOut_(deleteAnswers_(user));
  }
  return jsonOut_({ error: "unknown action" });
}

function saveAnswer_(user, questionId, answerLo) {
  const sheet = getSheet_("Answers_" + userToSheetSuffix_(user));

  // แปลภาษาลาว -> อังกฤษอัตโนมัติ (บริการฟรีของ Google Workspace)
  let answerEn = "";
  try {
    answerEn = LanguageApp.translate(answerLo, "lo", "en");
  } catch (err) {
    answerEn = ""; // ถ้าแปลไม่สำเร็จ ปล่อยว่างไว้ก่อน ไม่ทำให้การบันทึกล้มเหลว
  }

  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(questionId)) { rowIndex = i + 1; break; }
  }

  const now = new Date();
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, 4).setValues([[questionId, answerLo, answerEn, now]]);
  } else {
    sheet.appendRow([questionId, answerLo, answerEn, now]);
  }
  return { success: true, answerEn: answerEn };
}

function deleteAnswers_(user) {
  const sheet = getSheet_("Answers_" + userToSheetSuffix_(user));
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  return { success: true };
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
