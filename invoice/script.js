let draftServices = [];
let draftItems = [];

let finalServices = [];
let finalItems = [];

/* =========================
   INIT
========================= */
$(document).ready(function () {

    generateRef();

    $("#type").on("change", function () {
        if ($(this).val() === "service") {
            $("#qty").val(1).prop("disabled", true);
        } else {
            $("#qty").prop("disabled", false);
        }
    });

});

/* =========================
   REF
========================= */
function generateRef() {
    let d = new Date(),
        p = n => String(n).padStart(2, '0');

    $("#ref").text(
        `KMW-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
    );

    $("#date").text(
        new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).format(d)
    );
}

/* =========================
   ADD (MODAL ONLY)
========================= */
$("#add").click(function () {

    const type = $("#type").val();
    const desc = $("#desc").val().trim();
    let qty = parseFloat($("#qty").val());
    const price = parseFloat($("#price").val());

    if (!desc || isNaN(price)) {
        alert("Complete required fields");
        return;
    }

    if (type === "service") qty = 1;

    if (type === "item" && (isNaN(qty) || qty <= 0)) {
        alert("Invalid quantity");
        return;
    }

    const amount = qty * price;

    const obj = { desc, qty, price, amount };

    if (type === "service") {
        draftServices.push(obj);
        renderDraftServices();
    } else {
        draftItems.push(obj);
        renderDraftItems();
    }

    resetForm();
});

/* =========================
   RESET FORM
========================= */
function resetForm() {
    $("#desc").val("");
    $("#qty").val(1);
    $("#price").val("");
    $("#type").val("service");
    $("#qty").prop("disabled", true);
}

/* =========================
   RENDER DRAFT SERVICES (MODAL)
========================= */
function renderDraftServices() {

    if (!draftServices.length) {
        $("#tbodyServices").html(`
            <tr>
                <td colspan="3" class="text-center text-muted">No services yet</td>
            </tr>
        `);
        return;
    }

    let html = "";

    draftServices.forEach((s, i) => {
        html += `
        <tr>
            <td>${s.desc}</td>
            <td class="text-end">₱${s.amount.toFixed(2)}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-danger" onclick="removeDraftService(${i})">X</button>
            </td>
        </tr>`;
    });

    $("#tbodyServices").html(html);
}

/* =========================
   RENDER DRAFT ITEMS (MODAL)
========================= */
function renderDraftItems() {

    if (!draftItems.length) {
        $("#tbodyItems").html(`
            <tr>
                <td colspan="5" class="text-center text-muted">No items yet</td>
            </tr>
        `);
        return;
    }

    let html = "";

    draftItems.forEach((i, idx) => {
        html += `
        <tr>
            <td>${i.desc}</td>
            <td class="text-center">${i.qty}</td>
            <td class="text-end">₱${i.price.toFixed(2)}</td>
            <td class="text-end">₱${i.amount.toFixed(2)}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-danger" onclick="removeDraftItem(${idx})">X</button>
            </td>
        </tr>`;
    });

    $("#tbodyItems").html(html);
}

/* =========================
   REMOVE (DRAFT)
========================= */
function removeDraftService(i) {
    draftServices.splice(i, 1);
    renderDraftServices();
}

function removeDraftItem(i) {
    draftItems.splice(i, 1);
    renderDraftItems();
}

/* =========================
   SAVE CHANGES (FINALIZE)
========================= */
$("#save").click(function () {

    // move draft → final
    finalServices = [...draftServices];
    finalItems = [...draftItems];

    // customer info
    $("#cname").text($("#in_name").val());
    $("#cphone").text($("#in_phone").val());
    $("#caddr").text($("#in_addr").val());

    renderFinalInvoice();

    bootstrap.Modal
        .getInstance(document.getElementById('invoiceModal'))
        .hide();
});

/* =========================
   FINAL RENDER (OUTSIDE MODAL)
========================= */
function renderFinalInvoice() {

    let servicesSubtotal = 0;
    let itemsSubtotal = 0;

    let sHtml = "";
    finalServices.forEach(s => {
        servicesSubtotal += s.amount;
        sHtml += `
        <tr>
            <td>${s.desc}</td>
            <td class="text-end">₱${s.amount.toFixed(2)}</td>
        </tr>`;
    });

    $("#tbodyServicesFinal").html(sHtml || `
        <tr><td colspan="2" class="text-center text-muted">No services</td></tr>
    `);

    let iHtml = "";
    finalItems.forEach(i => {
        itemsSubtotal += i.amount;
        iHtml += `
        <tr>
            <td>${i.desc}</td>
            <td class="text-center">${i.qty}</td>
            <td class="text-end">₱${i.price.toFixed(2)}</td>
            <td class="text-end">₱${i.amount.toFixed(2)}</td>
        </tr>`;
    });

    $("#tbodyItemsFinal").html(iHtml || `
        <tr><td colspan="4" class="text-center text-muted">No items</td></tr>
    `);

    const total = servicesSubtotal + itemsSubtotal;

    $("#subtotalServices").text("₱" + servicesSubtotal.toFixed(2));
    $("#subtotalItems").text("₱" + itemsSubtotal.toFixed(2));
    $("#total").text("₱" + total.toFixed(2));
}

/* =========================
   PRINT
========================= */
function printAsScreenshot() {

    const element = document.querySelector('.invoice-container');

    html2pdf().set({
        margin: 10,
        filename: 'invoice.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4' }
    }).from(element).save();
}
