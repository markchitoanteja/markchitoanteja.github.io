const fs = require("fs");

const data = JSON.parse(
    fs.readFileSync("internet-payments.json", "utf8")
);

const PAGE_SIZE = 10;

// ---------------- helpers ----------------
function formatPeso(amount) {
    return "₱" + Number(amount).toLocaleString();
}

function badge(status) {
    if (status === "Fully Paid") return `<span class="badge bg-success">Paid</span>`;
    if (status === "Unpaid") return `<span class="badge bg-danger">Unpaid</span>`;
    if (status === "Partially Paid") return `<span class="badge bg-warning text-dark">Partial</span>`;
    return `<span class="badge bg-secondary">${status}</span>`;
}

// ---------------- data ----------------
const months = Object.keys(data.months);
const activeMonth = data.activeMonth || months[0];
const records = data.months[activeMonth] || [];

// ---------------- pagination ----------------
const pages = [];
for (let i = 0; i < records.length; i += PAGE_SIZE) {
    pages.push(records.slice(i, i + PAGE_SIZE));
}

// ---------------- unpaid ----------------
function renderUnpaid(rows, monthName) {
    return rows
        .filter(r => r.status === "Unpaid")
        .map(r => `
<div class="card border-0 shadow-sm mb-2 unpaid-card">
    <div class="card-body py-2 px-3">

        <div class="d-flex justify-content-between">

            <div>
                <div class="fw-semibold">${r.name}</div>
                <div class="text-muted small">
                    Due ${r.dueDate} • ${monthName}
                </div>
            </div>

            <div class="text-end">
                <div class="fw-bold text-danger">
                    ${formatPeso(r.amount)}
                </div>
                <span class="badge bg-danger-subtle text-danger border border-danger">
                    UNPAID
                </span>
            </div>

        </div>

    </div>
</div>
`).join("") || `<div class="text-muted small">No outstanding accounts.</div>`;
}

// ---------------- table ----------------
function renderTable(rows) {
    return rows.map(r => `
<tr>
    <td>${r.name}</td>
    <td>${formatPeso(r.amount)}</td>
    <td>${r.dueDate}</td>
    <td>${badge(r.status)}</td>
    <td>${r.receiptNumber || "-"}</td>
</tr>
`).join("");
}

// ---------------- page builder ----------------
function buildPage(index) {

    const pageRecords = pages[index] || [];

    let paid = 0;
    let unpaid = 0;
    let partial = 0;

    records.forEach(r => {
        if (r.status === "Fully Paid") paid++;
        if (r.status === "Unpaid") unpaid++;
        if (r.status === "Partially Paid") partial++;
    });

    const tableRows = renderTable(pageRecords);
    const unpaidList = renderUnpaid(records, activeMonth);

    const prev = index > 0 ? `page-${index}.html` : null;
    const next = index < pages.length - 1 ? `page-${index + 2}.html` : null;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kuya Mark Wi-Fi - ${activeMonth}</title>

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

<style>
body {
    font-family: "Segoe UI", sans-serif;
    background: #f4f6f9;
}

/* BRAND HEADER */
.brand-header {
    background: linear-gradient(135deg, #0d6efd, #0a58ca);
    color: white;
    border-radius: 14px;
}

.brand-title {
    font-weight: 700;
    letter-spacing: 0.3px;
}

.brand-sub {
    font-size: 0.85rem;
    opacity: 0.9;
}

/* CARDS */
.card {
    border-radius: 14px;
}

/* KPI */
.kpi {
    font-size: 1.25rem;
    font-weight: 700;
}

/* UNPAID */
.unpaid-card {
    border-left: 4px solid #dc3545;
    transition: 0.15s ease;
}

.unpaid-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(0,0,0,0.08);
}

/* TABLE */
.table {
    font-size: 0.9rem;
}

/* FOOTER BRAND */
.footer-brand {
    font-size: 0.8rem;
    color: #6c757d;
    text-align: center;
    margin-top: 20px;
}
</style>

</head>

<body>

<div class="container-fluid py-3">

<!-- BRAND HEADER -->
<div class="brand-header p-3 mb-3 shadow-sm">

    <div class="d-flex align-items-center">

        <img src="logo.png" width="50" height="50" class="me-3 rounded">

        <div>
            <div class="brand-title">Kuya Mark Wi-Fi</div>
            <div class="brand-sub">Internet Payment Monitoring System</div>
        </div>

    </div>

</div>

<!-- MONTH HEADER -->
<div class="card border-0 shadow-sm mb-3">
<div class="card-body">
<h5 class="mb-0">${activeMonth}</h5>
<small class="text-muted">Page ${index + 1} of ${pages.length}</small>
</div>
</div>

<!-- KPI -->
<div class="row g-2 mb-3">

<div class="col-4">
<div class="card p-2 text-center">
<div class="text-muted small">Paid</div>
<div class="kpi text-success">${paid}</div>
</div>
</div>

<div class="col-4">
<div class="card p-2 text-center">
<div class="text-muted small">Unpaid</div>
<div class="kpi text-danger">${unpaid}</div>
</div>
</div>

<div class="col-4">
<div class="card p-2 text-center">
<div class="text-muted small">Partial</div>
<div class="kpi text-warning">${partial}</div>
</div>
</div>

</div>

<!-- TABLE -->
<div class="card border-0 shadow-sm mb-3">

<div class="table-responsive">
<table class="table table-hover mb-0">

<thead class="table-dark">
<tr>
<th>Client</th>
<th>Amount</th>
<th>Due</th>
<th>Status</th>
<th>Receipt</th>
</tr>
</thead>

<tbody>
${tableRows}
</tbody>

</table>
</div>

</div>

<!-- PAGINATION -->
<div class="d-flex justify-content-between align-items-center mb-3">

${prev ? `<a class="btn btn-outline-secondary btn-sm" href="${prev}">Prev</a>` : `<div></div>`}

<div class="small text-muted">
Page ${index + 1} / ${pages.length}
</div>

${next ? `<a class="btn btn-outline-primary btn-sm" href="${next}">Next</a>` : `<div></div>`}

</div>

<!-- UNPAID -->
<div class="card border-0 shadow-sm">
<div class="card-header text-danger fw-bold">
Outstanding Accounts
</div>

<div class="card-body">
${unpaidList}
</div>
</div>

<!-- FOOTER BRAND -->
<div class="footer-brand">
© ${new Date().getFullYear()} Kuya Mark Wi-Fi • All rights reserved
</div>

</div>

</body>
</html>
`;
}

// ---------------- generate pages ----------------
for (let i = 0; i < pages.length; i++) {
    fs.writeFileSync(`page-${i + 1}.html`, buildPage(i));
}

console.log(`✓ Kuya Mark Wi-Fi dashboard generated (${pages.length} pages)`);