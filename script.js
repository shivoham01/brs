let bankData = [], cashData = [];

function readExcel(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);
    callback(json);
  };
  reader.readAsArrayBuffer(file);
}

function reconcile() {
  const bankFile = document.getElementById("bankFile").files[0];
  const cashFile = document.getElementById("cashFile").files[0];

  if (!bankFile || !cashFile) {
    alert("Please upload both files.");
    return;
  }

  readExcel(bankFile, (bank) => {
    readExcel(cashFile, (cash) => {
      bankData = bank;
      cashData = cash;

      let matched = [];
      let bankOnly = [];
      let cashOnly = [...cashData]; // Copy to track unmatched

      // Compare Bank → Cashbook
      bankData.forEach(bankEntry => {
        const matchIndex = cashOnly.findIndex(cashEntry =>
          bankEntry.Date === cashEntry.Date &&
          parseFloat(bankEntry.Amount) === parseFloat(cashEntry.Amount)
        );

        if (matchIndex !== -1) {
          matched.push(bankEntry);
          cashOnly.splice(matchIndex, 1); // Remove matched
        } else {
          bankOnly.push(bankEntry);
        }
      });

      // Store in global scope for Excel export
      window.matched = matched;
      window.bankOnly = bankOnly;
      window.cashOnly = cashOnly;

      // Show result
      document.getElementById("result").innerHTML = `
        <h3>✅ Matched Entries: ${matched.length}</h3>
        <h3>📌 In Bank but not in Cashbook: ${bankOnly.length}</h3>
        <pre>${JSON.stringify(bankOnly, null, 2)}</pre>
        <h3>📌 In Cashbook but not in Bank: ${cashOnly.length}</h3>
        <pre>${JSON.stringify(cashOnly, null, 2)}</pre>
      `;

      document.getElementById("downloadBtn").style.display = "block";
    });
  });
}

function downloadExcel() {
  const wb = XLSX.utils.book_new();

  const matchedSheet = XLSX.utils.json_to_sheet(window.matched || []);
  const bankOnlySheet = XLSX.utils.json_to_sheet(window.bankOnly || []);
  const cashOnlySheet = XLSX.utils.json_to_sheet(window.cashOnly || []);

  XLSX.utils.book_append_sheet(wb, matchedSheet, "Matched Entries");
  XLSX.utils.book_append_sheet(wb, bankOnlySheet, "Bank Only");
  XLSX.utils.book_append_sheet(wb, cashOnlySheet, "Cashbook Only");

  XLSX.writeFile(wb, "Reconciliation_Result.xlsx");
}