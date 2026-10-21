import PDFDocument from 'pdfkit';
import { createWriteStream, readFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const folder = fileURLToPath(new URL('../../', import.meta.url));
const docs = fileURLToPath(new URL('../docs/', import.meta.url));
const source = path.join(docs, 'PRESENTATION-GUIDE.txt');
const text = readFileSync(source, 'utf8');
const pages = text.split('\n=== PAGE ===\n');
const output = path.join(folder, 'PRESENTATION-GUIDE.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 45, autoFirstPage: false,
  info: { Title: 'Sugilanon - Presentation Guide', Author: 'Sugilanon App Dev Project', Subject: 'Cheat sheet, speech guide and Q&A' } });
const stream = createWriteStream(output);
doc.pipe(stream);
let overflow = false;
let actualPages = 0;
doc.on('pageAdded', () => { actualPages++; });
for (let i = 0; i < pages.length; i++) {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 12).fill('#234a3b');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#647168').text('SUGILANON / APP DEV MIDTERM', 45, 30);
  doc.y = 59;
  for (const line of pages[i].trim().split('\n')) {
    if (line.startsWith('# ')) {
      doc.font('Helvetica-Bold').fontSize(i === 0 ? 28 : 21).fillColor('#234a3b').text(line.slice(2), { lineGap: 3 });
      doc.moveDown(0.25);
    } else if (line.startsWith('## ')) {
      doc.font('Helvetica').fontSize(12).fillColor('#647168').text(line.slice(3), { lineGap: 2 });
      doc.moveDown(0.5);
    } else if (!line.trim()) {
      doc.moveDown(0.36);
    } else if (/^[A-Z0-9 /():.,?+_'=-]+$/.test(line) && line.length > 4) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#234a3b').text(line, { lineGap: 1.4 });
    } else {
      doc.font(line.startsWith('Q:') ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.1)
        .fillColor('#263b32').text(line, { lineGap: 1.6 });
    }
    if (doc.y > 780) overflow = true;
  }
  doc.font('Helvetica').fontSize(8).fillColor('#647168').text('PRACTICE IN YOUR OWN WORDS', 45, 804, { lineBreak: false });
  doc.text(String(i + 1) + ' / ' + pages.length, 475, 804, { lineBreak: false });
}
doc.end();
await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });
if (overflow || actualPages !== pages.length) throw new Error('Guide overflow detected: ' + actualPages + ' actual pages; expected ' + pages.length);
copyFileSync(output, path.join(docs, 'PRESENTATION-GUIDE.pdf'));
copyFileSync(source, path.join(folder, 'PRESENTATION-GUIDE.txt'));
console.log('Created ' + output + ' (' + pages.length + ' designed pages), plus a copy in docs/.');
