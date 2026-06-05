const fs = require("fs");

const data = JSON.parse(
    fs.readFileSync("internet-payments.json", "utf8")
);

// ONLY expose data to frontend
const output = `
window.paymentData = ${JSON.stringify(data, null, 2)};
`;

fs.writeFileSync("data.js", output);

console.log("✓ data.js updated (SPA mode)");