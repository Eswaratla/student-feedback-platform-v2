import PDFDocument from 'pdfkit';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function rowsToWordHtml(rows, title) {
  const tableRows = rows
    .filter((row) => row.length)
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table border="1" cellpadding="6" cellspacing="0">${tableRows}</table>
</body>
</html>`;
}

export function rowsToPdfBuffer(rows, title) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title, { underline: true });
    doc.moveDown();

    rows.forEach((row) => {
      if (!row.length) {
        doc.moveDown(0.4);
        return;
      }

      doc.fontSize(11).text(row.map((cell) => String(cell ?? '')).join('  |  '), {
        lineGap: 4,
      });
    });

    doc.end();
  });
}
