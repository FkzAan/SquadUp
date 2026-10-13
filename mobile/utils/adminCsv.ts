export function adminCsv(rows: (string | number)[][]) {
  return rows.map(row => row.map(cell => {
    let value = String(cell);
    // Protect user-entered text from becoming a spreadsheet formula.
    // Real numeric coordinates retain their numeric representation.
    if (typeof cell === 'string' && (/^\s*[=+@-]/.test(value) || /^[\t\r\n]/.test(value))) value = `'${value}`;
    return `"${value.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}
