let fileHandle = null;
let db = { months: {} };
let selectedMonth = null;
const modal = new bootstrap.Modal("#recordModal");

/* ---------- DATABASE ---------- */
$("#openDbBtn").on("click", async () => {
    try {
        [fileHandle] = await window.showOpenFilePicker({
            types: [{ accept: { "application/json": [".json"] } }]
        });
        const file = await fileHandle.getFile();
        db = JSON.parse(await file.text());
        if (!db.months) db.months = {};
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

    await saveDatabase();
    populateMonths();
    $("#monthSelect").val(targetMonth);
    selectedMonth = targetMonth;
    renderTable();

    Swal.fire({
        icon: 'success',
        title: 'Copied!',
        html: `All records copied to <strong>${targetMonth}</strong> and reset to Unpaid.`,
        timer: 2500,
        showConfirmButton: false
    });
});

/* ---------- CRUD & PARTIAL PAYMENT ---------- */
$("#addBtn").on("click", () => {
    $("#recordIndex").val("");
    $("#name, #amount, #dueDate").val("");
    $("#status").val("Fully Paid");
    $("#partialPaidWrapper").remove();
    modal.show();
});

// Show Amount Paid input when Partially Paid is selected
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

$("#saveBtn").on("click", async () => {
    if (!selectedMonth) return Swal.fire("Error", "No month selected", "error");

    const idx = $("#recordIndex").val();
    const status = $("#status").val();
    let totalAmount = Number($("#amount").val());
    let paidAmount = 0;

    if (status === "Partially Paid") {
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

    if (!record.name || !record.amount || !record.dueDate) return Swal.fire("Invalid Input", "All fields are required", "error");

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

    await saveDatabase();
    renderTable();
    modal.hide();
    Swal.fire("Saved", "Record updated successfully", "success");
});

/* ---------- Render Table ---------- */
function renderTable() {
    const tbody = $("#tableBody").empty();
    if (!selectedMonth || !db.months[selectedMonth]?.length) {
        tbody.append('<tr><td colspan="5" class="text-center text-muted">No records</td></tr>');
        updateTotals(); updateClientCount();
        return;
    }

    let fully = 0, partial = 0, unpaid = 0;

    db.months[selectedMonth].forEach((c, i) => {
        let displayAmount = c.amount;
        if (c.status === "Partially Paid") displayAmount = c.amount;

        if (c.status === "Fully Paid") fully += c.amount;
        else if (c.status === "Partially Paid") partial += c.amount;
        else unpaid += c.amount;

        tbody.append(`
            <tr>
                <td>${c.name}</td>
                <td class="text-center">₱${displayAmount}</td>
                <td class="text-center">${c.dueDate}</td>
                <td class="text-center ${c.status === 'Fully Paid' ? 'text-success' : c.status === 'Partially Paid' ? 'text-warning' : 'text-danger'} fw-bold">${c.status}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-info receiptBtn" data-i="${i}"><i class="fas fa-receipt"></i> Receipt</button>
                    <button class="btn btn-sm btn-warning editBtn" data-i="${i}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger deleteBtn" data-i="${i}"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `);
    });

    $("#paidTotal").text(fully);
    $("#partialTotal").text(partial);
    $("#unpaidTotal").text(unpaid);
    updateClientCount();
}

function updateTotals() {
    $("#paidTotal").text(0); $("#partialTotal").text(0); $("#unpaidTotal").text(0);
}
function updateClientCount() {
    $("#clientCount").text(!selectedMonth || !db.months[selectedMonth] ? 0 : db.months[selectedMonth].length);
}

/* ---------- Edit/Delete/Receipt ---------- */
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
    const res = await Swal.fire({ title: "Delete Record?", text: "This action cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete" });
    if (!res.isConfirmed) return;
    db.months[selectedMonth].splice(idx, 1);
    await saveDatabase(); renderTable();
    Swal.fire("Deleted", "Record removed.", "success");
});

$("#tableBody").on("click", ".receiptBtn", function () {
    const idx = $(this).data("i"); const client = db.months[selectedMonth][idx];
    if (client.status !== "Fully Paid" || !client.receiptNumber) return Swal.fire("Receipt Not Available", "Receipt can only be generated for fully paid clients.", "warning");
    const url = `receipt.html?month=${encodeURIComponent(selectedMonth)}&name=${encodeURIComponent(client.name)}&amount=${encodeURIComponent(client.amount)}.00&dueDate=${encodeURIComponent(client.dueDate)}&status=${encodeURIComponent(client.status)}&receiptNumber=${encodeURIComponent(client.receiptNumber)}`;
    window.open(url, "_blank");
});

/* ---------- Month Change ---------- */
$("#monthSelect").on("change", function () { selectedMonth = $(this).val(); renderTable(); });

/* ---------- Receipt Number ---------- */
function generateReceiptNumber(monthKey) {
    const monthMap = { "January": "JAN", "February": "FEB", "March": "MAR", "April": "APR", "May": "MAY", "June": "JUN", "July": "JUL", "August": "AUG", "September": "SEP", "October": "OCT", "November": "NOV", "December": "DEC" };
    const [month, year] = monthKey.split("-");
    const prefix = `${monthMap[month]}-${year}`;
    const receipts = db.months[monthKey].map(r => r.receiptNumber).filter(r => r && r.startsWith(prefix));
    const nextNumber = String(receipts.length + 1).padStart(3, "0");
    return `${prefix}-${nextNumber}`;
}

/* ---------- Download DB ---------- */
$('#downloadBtn').on('click', function (e) {
    e.preventDefault();
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'internet-payments.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
