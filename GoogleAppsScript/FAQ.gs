/**
 * FAQ.gs - Google Apps Script for serving FAQ content
 * This file generates the FAQ HTML content dynamically
 */

function doGet(e) {
  const format = e.parameter.format;
  
  if (format === 'json') {
    // Return JSON data for API calls
    return ContentService
      .createTextOutput(JSON.stringify(getFaqData()))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Return HTML page by default
  return HtmlService.createHtmlOutput(getFaqHtml())
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('FAQ • Barbie\'s Bail Bonds');
}

function getFaqData() {
  return [
    { q: "How do bail bonds work?", a: "Bail bonds allow defendants to be released from jail while awaiting trial. A bail bondsman posts the full bail amount with the court in exchange for a premium (typically 10% of the bail amount). This allows the defendant to return home and continue their life while their case is pending." },
    { q: "How much does a bail bond cost?", a: "In Florida, bail bond premiums are regulated by the state and typically cost 10% of the total bail amount. For example, if bail is set at $10,000, the premium would be $1,000. This premium is non-refundable and is the fee for the bail bond service." },
    { q: "What forms of payment do you accept?", a: "We accept cash, credit cards, debit cards, money orders, and cashier's checks. We also offer payment plans for qualifying clients to make bail bonds more affordable. Contact us to discuss payment options that work for your situation." },
    { q: "How long does the bail bond process take?", a: "Once paperwork is completed and payment is received, we can typically post bail within 1-3 hours. The actual release time depends on the jail's processing time, which can vary from 2-12 hours depending on the facility and how busy they are." },
    { q: "What happens if the defendant doesn't appear in court?", a: "If a defendant fails to appear in court (called 'jumping bail'), a warrant will be issued for their arrest. The bail bond becomes due in full, and we may employ a bounty hunter to locate and return the defendant to custody. This is why it's crucial to attend all court dates." }
  ];
}

function getFaqHtml() {
  const faqData = getFaqData();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FAQ • Barbie's Bail Bonds</title>
</head>
<body>
  <h1>FAQ - Google Apps Script Version</h1>
  <p>This is the simplified Google Apps Script FAQ version.</p>
  ${faqData.map((item, index) => `
    <div>
      <h3>${item.q}</h3>
      <p>${item.a}</p>
    </div>
  `).join('')}
</body>
</html>
  `;
  
  return html;
}