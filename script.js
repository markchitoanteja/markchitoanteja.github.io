let fileHandle = null;
let db = { months: {} };
let selectedMonth = null;
const modal = new bootstrap.Modal("#recordModal");

const recordsPerPage = 10;
let currentPage = 1;

let searchQuery = "";

/* ---------- MOBILE CHECK ---------- */
function isMobile() {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(navigator.userAgent);
}

/* ---------- OPEN DATABASE ---------- */
$("#openDbBtn").on("click", async () => {
    try {
        [fileHandle] = await window.showOpenFilePicker({
            types: [{ accept: { "application/json": [".json"] } }]
        });
        const file = await fileHandle.getFile();
        db = JSON.parse(await file.text());
        if (!db.months) db.months = {};

        // Set active month if not defined
        if (!db.activeMonth || !db.months[db.activeMonth]) {
            const monthKeys = Object.keys(db.months);
            db.activeMonth = monthKeys.length ? monthKeys[0] : null;
        }

        selectedMonth = db.activeMonth;
        populateMonths();
        Swal.fire("Database Loaded", "You can now manage records.", "success");
    } catch {
        Swal.fire("Cancelled", "No database selected.", "info");
    }
});

async function saveDatabase() {
    if (!fileHandle) return;
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(db, null, 2));
    await writable.close();
}

/* ---------- MONTH MANAGEMENT ---------- */
function populateMonths() {
    const monthSelect = $("#monthSelect");
    monthSelect.empty();
    const monthKeys = Object.keys(db.months);
    monthKeys.forEach(m => monthSelect.append(`<option value="${m}">${m}</option>`));

    if (monthKeys.length) {
        if (!selectedMonth || !monthKeys.includes(selectedMonth)) selectedMonth = monthKeys[0];
        monthSelect.val(selectedMonth);
        renderTable();
    } else {
        selectedMonth = null;
        $("#tableBody").html('<tr><td colspan="5" class="text-center text-muted">No records</td></tr>');
        $("#tablePagination").empty();
    }

    $("#monthSelect, #addMonthBtn, #addBtn, #copyMonthBtn").prop("disabled", false);
}

$("#addMonthBtn").on("click", async () => {
    const { value: monthName } = await Swal.fire({
        title: '<i class="fas fa-calendar-plus"></i> New Month',
        input: 'text',
        inputLabel: 'Enter Month-Year (e.g., December-2025)',
        showCancelButton: true,
        inputValidator: value => !value ? 'Month name required' : null
    });

    if (!monthName) return;
    if (!db.months[monthName]) db.months[monthName] = [];
    selectedMonth = monthName;
    db.activeMonth = selectedMonth;
    currentPage = 1;
    populateMonths();
    $("#monthSelect").val(selectedMonth);
    renderTable();
    await saveDatabase();
});

/* ---------- COPY MONTH ---------- */
$("#copyMonthBtn").on("click", async () => {
    if (!selectedMonth) return Swal.fire("Error", "No month selected to copy.", "error");
    const monthOptions = Object.keys(db.months).filter(m => m !== selectedMonth)
        .map(m => `<option value="${m}">${m}</option>`).join('');

    const { value: targetMonth } = await Swal.fire({
        title: '<i class="fas fa-copy"></i> Copy Month',
        html: `
            <label for="monthSelectModal" class="form-label">Select month to copy to:</label>
            <select id="monthSelectModal" class="form-select">
                ${monthOptions}
            </select>
            <small class="text-muted">If the month does not exist, a new month will be created.</small>
        `,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            const sel = document.getElementById("monthSelectModal").value;
            if (!sel) return Swal.showValidationMessage('Please select a month');
            return sel;
        }
    });

    if (!targetMonth) return;
    if (!db.months[targetMonth]) db.months[targetMonth] = [];

    if (db.months[targetMonth].length) {
        const { isConfirmed, isDenied } = await Swal.fire({
            title: 'Month Already Exists',
            text: `${targetMonth} already has records. Choose an action:`,
            icon: 'warning',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-plus"></i> Merge',
            denyButtonText: '<i class="fas fa-trash"></i> Overwrite',
        });

        if (!isConfirmed && !isDenied) return;
        if (isDenied) db.months[targetMonth] = [];
    }

    db.months[selectedMonth].forEach(record => {
        db.months[targetMonth].push({
            name: record.name,
            amount: record.amount,
            dueDate: record.dueDate,
            status: "Unpaid",
            receiptNumber: null
        });
    });

    selectedMonth = targetMonth;
    db.activeMonth = selectedMonth;
    currentPage = 1;
    await saveDatabase();
    populateMonths();
    $("#monthSelect").val(selectedMonth);
    renderTable();

    Swal.fire({
        icon: 'success',
        title: 'Copied!',
        html: `All records copied to <strong>${targetMonth}</strong> and reset to Unpaid.`,
        timer: 2500,
        showConfirmButton: false
    });
});

/* ---------- ADD / EDIT CLIENT ---------- */
$("#addBtn").on("click", () => {
    $("#recordIndex").val("");
    $("#name, #amount, #dueDate").val("");
    $("#status").val("Fully Paid");
    $("#partialPaidWrapper").remove();
    modal.show();
});

// Show Amount Paid input for Partially Paid
$("#status").on("change", function () {
    const status = $(this).val();
    $("#partialPaidWrapper").remove();
    if (status === "Partially Paid") {
        $("#amount").closest(".mb-3").after(`
            <div class="mb-3" id="partialPaidWrapper">
                <label class="form-label">Amount Paid (₱)</label>
                <input type="number" class="form-control" id="partialPaidAmount" value="0">
            </div>
        `);
    }
});

function preventModalClose() {
    $("#saveBtn").prop("disabled", true);
    $("#saveBtn").text("Saving...");

    $("#recordModal").on("hide.bs.modal", (e) => {
        if ($("#saveBtn").prop("disabled")) {
            e.preventDefault();
        }
    });
}

function allowModalClose() {
    $("#saveBtn").prop("disabled", false);
    $("#saveBtn").html('<i class="fas fa-save"></i> Save');

    $("#recordModal").off("hide.bs.modal");
}

$("#saveBtn").on("click", async () => {
    if (!selectedMonth) return Swal.fire("Error", "No month selected", "error");

    const idx = $("#recordIndex").val();
    const status = $("#status").val();
    let totalAmount = Number($("#amount").val());
    let paidAmount = 0;

    // Prevent modal from closing while saving
    preventModalClose();

    if (status === "Partially Paid") {
        allowModalClose(); // Allow closing for validation errors

        paidAmount = Number($("#partialPaidAmount").val()) || 0;
        if (paidAmount >= totalAmount) return Swal.fire("Invalid Amount", "Partial payment must be less than total amount.", "error");
        totalAmount = totalAmount - paidAmount;
    }

    let record = {
        name: $("#name").val().trim(),
        amount: totalAmount,
        dueDate: $("#dueDate").val().trim(),
        status: status,
        receiptNumber: null
    };

    if (!record.name || !record.amount || !record.dueDate) {
        allowModalClose(); // Allow closing for validation errors

        return Swal.fire("Invalid Input", "All fields are required", "error");
    }

    if (idx !== "") {
        const oldRecord = db.months[selectedMonth][idx];
        record.receiptNumber = oldRecord.receiptNumber;
    }

    if (status === "Fully Paid" && !record.receiptNumber) {
        record.receiptNumber = generateReceiptNumber(selectedMonth);
    }
    if (status !== "Fully Paid") record.receiptNumber = null;

    if (idx === "") db.months[selectedMonth].push(record);
    else db.months[selectedMonth][idx] = record;

    currentPage = 1;
    await saveDatabase();
    renderTable();

    allowModalClose(); // Re-enable modal closing

    modal.hide();
    Swal.fire("Saved", "Record updated successfully", "success");
});

/* ---------- RENDER TABLE WITH PAGINATION ---------- */
function renderTable() {
    if (!selectedMonth || !db.months[selectedMonth]?.length) {
        $("#tableBody").html('<tr><td colspan="5" class="text-center text-muted">No records</td></tr>');
        $("#tablePagination").empty();
        updateTotals();
        updateClientCount();
        return;
    }

    // Filter records based on search query
    let allRecords = db.months[selectedMonth];
    if (searchQuery) {
        allRecords = allRecords.filter(c => c.name.toLowerCase().includes(searchQuery));
    }

    const totalPages = Math.ceil(allRecords.length / recordsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageRecords = allRecords.slice(start, end);

    const tbody = $("#tableBody").empty();
    let fully = 0, partial = 0, unpaid = 0;

    pageRecords.forEach((c, i) => {
        const globalIndex = db.months[selectedMonth].indexOf(c); // original index
        if (c.status === "Fully Paid") fully += c.amount;
        else if (c.status === "Partially Paid") partial += c.amount;
        else unpaid += c.amount;

        const iconOnly = isMobile();

        tbody.append(`
        <tr>
            <td>${c.name}</td>
            <td class="text-center">₱${c.amount}</td>
            <td class="text-center">${c.dueDate}</td>
            <td class="text-center">
                <span class="badge ${c.status === 'Fully Paid' ? 'bg-success' :
                c.status === 'Partially Paid' ? 'bg-warning text-dark' :
                    'bg-danger'
            } px-3 py-2">${c.status}</span>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-info receiptBtn" data-i="${globalIndex}">
                    <i class="fas fa-receipt"></i>${iconOnly ? '' : ' Receipt'}
                </button>
                <button class="btn btn-sm btn-warning editBtn" data-i="${globalIndex}">
                    <i class="fas fa-edit"></i>${iconOnly ? '' : ' Edit'}
                </button>
                <button class="btn btn-sm btn-danger deleteBtn" data-i="${globalIndex}">
                    <i class="fas fa-trash"></i>${iconOnly ? '' : ' Delete'}
                </button>
            </td>
        </tr>
        `);
    });

    $("#paidTotal").text(fully);
    $("#partialTotal").text(partial);
    $("#unpaidTotal").text(unpaid);
    updateClientCount();

    renderPagination(totalPages);
}

/* ---------- PAGINATION RENDER ---------- */
function renderPagination(totalPages) {
    const container = $("#tablePagination").empty();
    if (totalPages <= 1) return;

    const prev = $(`
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <a class="page-link" href="#">Previous</a>
        </li>
    `).click(e => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    container.append(prev);

    for (let p = 1; p <= totalPages; p++) {
        const pageItem = $(`
            <li class="page-item ${currentPage === p ? "active" : ""}">
                <a class="page-link" href="#">${p}</a>
            </li>
        `).click(e => {
            e.preventDefault();
            currentPage = p;
            renderTable();
        });
        container.append(pageItem);
    }

    const next = $(`
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <a class="page-link" href="#">Next</a>
        </li>
    `).click(e => {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
    container.append(next);
}

/* ---------- EDIT / DELETE / RECEIPT ---------- */
$("#tableBody").on("click", ".editBtn", function () {
    const idx = $(this).data("i");
    const c = db.months[selectedMonth][idx];
    $("#recordIndex").val(idx);
    $("#name").val(c.name);
    $("#amount").val(c.amount);
    $("#dueDate").val(c.dueDate);
    $("#status").val(c.status);
    $("#partialPaidWrapper").remove();
    if (c.status === "Partially Paid") {
        $("#amount").closest(".mb-3").after(`
            <div class="mb-3" id="partialPaidWrapper">
                <label class="form-label">Amount Paid (₱)</label>
                <input type="number" class="form-control" id="partialPaidAmount" value="${c.originalAmount - c.amount || 0}">
            </div>
        `);
    }
    modal.show();
});

$("#tableBody").on("click", ".deleteBtn", async function () {
    const idx = $(this).data("i");
    const res = await Swal.fire({
        title: "Delete Record?", text: "This action cannot be undone.",
        icon: "warning", showCancelButton: true, confirmButtonText: "Delete"
    });
    if (!res.isConfirmed) return;
    db.months[selectedMonth].splice(idx, 1);
    currentPage = 1;
    await saveDatabase();
    renderTable();
    Swal.fire("Deleted", "Record removed.", "success");
});

$("#tableBody").on("click", ".receiptBtn", function () {
    const idx = $(this).data("i");
    const client = db.months[selectedMonth][idx];

    if (client.status !== "Fully Paid" || !client.receiptNumber) {
        return Swal.fire(
            "Receipt Not Available",
            "Receipt can only be generated for fully paid clients.",
            "warning"
        );
    }

    // selectedMonth pattern: "February-2026"
    const [billingMonthName, billingYear] = String(selectedMonth).split("-");

    // client.dueDate assumed to contain the day (e.g. "15" or "15th" or "2026-02-15")
    // We'll extract a numeric day if possible; fallback to the raw dueDate.
    const dayMatch = String(client.dueDate).match(/\d{1,2}/);
    const dueDay = dayMatch ? dayMatch[0] : String(client.dueDate);

    // "February 15, 2026"
    const prettyDueDate = `${billingMonthName} ${dueDay}, ${billingYear}`;

    const url = `receipt.html?month=${encodeURIComponent(selectedMonth)}&name=${encodeURIComponent(client.name)}&amount=${encodeURIComponent(client.amount)}.00&dueDate=${encodeURIComponent(prettyDueDate)}&status=${encodeURIComponent(client.status)}&receiptNumber=${encodeURIComponent(client.receiptNumber)}`;

    window.open(url, "_blank");
});

/* ---------- MONTH CHANGE ---------- */
$("#monthSelect").on("change", async function () {
    selectedMonth = $(this).val();
    db.activeMonth = selectedMonth;
    currentPage = 1;
    await saveDatabase();
    renderTable();
});

/* ---------- RECEIPT NUMBER ---------- */
function generateReceiptNumber(monthKey) {
    const monthMap = { "January": "JAN", "February": "FEB", "March": "MAR", "April": "APR", "May": "MAY", "June": "JUN", "July": "JUL", "August": "AUG", "September": "SEP", "October": "OCT", "November": "NOV", "December": "DEC" };
    const [month, year] = monthKey.split("-");
    const prefix = `${monthMap[month]}-${year}`;
    const receipts = db.months[monthKey].map(r => r.receiptNumber).filter(r => r && r.startsWith(prefix));
    const nextNumber = String(receipts.length + 1).padStart(3, "0");
    return `${prefix}-${nextNumber}`;
}

/* ---------- CLIENT COUNT ---------- */
function updateClientCount() {
    $("#clientCount").text(!selectedMonth || !db.months[selectedMonth] ? 0 : db.months[selectedMonth].length);
}

function updateTotals() {
    $("#paidTotal").text(0);
    $("#partialTotal").text(0);
    $("#unpaidTotal").text(0);
}

/* ---------- DOWNLOAD DATABASE ---------- */
$('#downloadBtn').on('click', function (e) {
    e.preventDefault();

    const link = document.createElement('a');
    link.href = "https://onedrive.live.com/personal/b90c54cd853fc20f/_layouts/15/download.aspx?SourceUrl=%2Fpersonal%2Fb90c54cd853fc20f%2FDocuments%2FDocuments%2Fmarkchitoanteja%2Egithub%2Eio%2Finternet%2Dpayments%2Ejson";
    link.download = "internet-payments.json";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

$("#searchInput").on("input", function () {
    searchQuery = $(this).val().trim().toLowerCase();
    currentPage = 1; // reset to first page when searching
    renderTable();
});

$('#clearSearch').on('click', function () {
    const $s = $('#searchInput');
    $s.val('');                // Clear the input
    $s.trigger('input');       // Trigger the input event
    $s.focus();                // Focus the input
});
