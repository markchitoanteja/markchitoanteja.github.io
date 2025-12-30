let fileHandle = null;
let db = { months: {} };
let selectedMonth = null;
const modal = new bootstrap.Modal("#recordModal");

/* ---------- DATABASE ---------- */

// Open database
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

// Save database
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
        selectedMonth = monthKeys[0];
        monthSelect.val(selectedMonth);
        renderTable();
    } else {
        selectedMonth = null;
        $("#tableBody").html('<tr><td colspan="5" class="text-center text-muted">No records</td></tr>');
    }

    $("#monthSelect, #addMonthBtn, #addBtn, #exportBtn").prop("disabled", false);
}

// Add new month
$("#addMonthBtn").on("click", async () => {
    const { value: monthName } = await Swal.fire({
        title: 'New Month',
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

/* ---------- EXPORT ---------- */

$("#exportBtn").on("click", () => {
    const safeFilename = `internet-payments.json`;
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = safeFilename;
    a.click();
    URL.revokeObjectURL(a.href);
    Swal.fire("Exported", `Saved as ${safeFilename}`, "success");
});

/* ---------- TABLE / UI ---------- */

function renderTable() {
    const tbody = $("#tableBody").empty();

    if (!selectedMonth || !db.months[selectedMonth]?.length) {
        tbody.append('<tr><td colspan="5" class="text-center text-muted">No records</td></tr>');
        updateTotals();
        updateClientCount();
        return;
    }

    let fully = 0, partial = 0, unpaid = 0;

    db.months[selectedMonth].forEach((c, i) => {
        if (c.status === "Fully Paid") fully += c.amount;
        else if (c.status === "Partially Paid") partial += c.amount;
        else unpaid += c.amount;

        tbody.append(`
            <tr>
                <td>${c.name}</td>
                <td class="text-center">₱${c.amount}</td>
                <td class="text-center">${c.dueDate}</td>
                <td class="text-center ${c.status === 'Fully Paid'
                ? 'text-success'
                : c.status === 'Partially Paid'
                    ? 'text-warning'
                    : 'text-danger'
            } fw-bold">${c.status}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-info receiptBtn" data-i="${i}">Receipt</button>
                    <button class="btn btn-sm btn-warning editBtn" data-i="${i}">Edit</button>
                    <button class="btn btn-sm btn-danger deleteBtn" data-i="${i}">Delete</button>
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
    $("#paidTotal").text(0);
    $("#partialTotal").text(0);
    $("#unpaidTotal").text(0);
}

function updateClientCount() {
    if (!selectedMonth || !db.months[selectedMonth]) {
        $("#clientCount").text(0);
        return;
    }

    $("#clientCount").text(db.months[selectedMonth].length);
}

/* ---------- CRUD ---------- */

$("#addBtn").on("click", () => {
    $("#recordIndex").val("");
    $("#name, #amount, #dueDate").val("");
    $("#status").val("Fully Paid");
    modal.show();
});

$("#saveBtn").on("click", async () => {
    if (!selectedMonth) return Swal.fire("Error", "No month selected", "error");

    const record = {
        name: $("#name").val().trim(),
        amount: Number($("#amount").val()),
        dueDate: $("#dueDate").val().trim(),
        status: $("#status").val()
    };
    if (!record.name || !record.amount || !record.dueDate)
        return Swal.fire("Invalid Input", "All fields are required", "error");

    const idx = $("#recordIndex").val();
    if (idx === "") db.months[selectedMonth].push(record);
    else db.months[selectedMonth][idx] = record;

    await saveDatabase();
    renderTable();
    modal.hide();
    Swal.fire("Saved", "Record updated successfully", "success");
});

$("#tableBody").on("click", ".editBtn", function () {
    const idx = $(this).data("i");
    const c = db.months[selectedMonth][idx];
    $("#recordIndex").val(idx);
    $("#name").val(c.name);
    $("#amount").val(c.amount);
    $("#dueDate").val(c.dueDate);
    $("#status").val(c.status);
    modal.show();
});

$("#tableBody").on("click", ".deleteBtn", async function () {
    const idx = $(this).data("i");
    const res = await Swal.fire({
        title: "Delete Record?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete"
    });
    if (!res.isConfirmed) return;
    db.months[selectedMonth].splice(idx, 1);
    await saveDatabase();
    renderTable();
    Swal.fire("Deleted", "Record removed.", "success");
});

/* ---------- MONTH CHANGE ---------- */

$("#monthSelect").on("change", function () {
    selectedMonth = $(this).val();
    renderTable();
});

/* ---------- RECEIPT GENERATION ---------- */
$("#tableBody").on("click", ".receiptBtn", function () {
    const idx = $(this).data("i");
    const client = db.months[selectedMonth][idx];

    const url = `receipt.html?month=${encodeURIComponent(selectedMonth)}&name=${encodeURIComponent(client.name)}&amount=${encodeURIComponent(client.amount)}.00&dueDate=${encodeURIComponent(client.dueDate)}&status=${encodeURIComponent(client.status)}`;
    window.open(url, '_blank');
});