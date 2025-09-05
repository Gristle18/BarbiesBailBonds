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
    { q: "What happens if the defendant doesn't appear in court?", a: "If a defendant fails to appear in court (called 'jumping bail'), a warrant will be issued for their arrest. The bail bond becomes due in full, and we may employ a bounty hunter to locate and return the defendant to custody. This is why it's crucial to attend all court dates." },
    { q: "Can I get my money back after the case is over?", a: "The premium paid for a bail bond is non-refundable - this is the fee for our service. However, any collateral put up for the bond will be returned once the case is concluded and all obligations are met, regardless of the case outcome." },
    { q: "What is collateral and when is it required?", a: "Collateral is additional security (like property, vehicles, jewelry, or bank accounts) that may be required for high-risk or high-amount bonds. It ensures the full bail amount can be recovered if the defendant fails to appear. Collateral is returned when the case concludes." },
    { q: "Do you offer payment plans?", a: "Yes, we offer flexible payment plans for qualified clients. Typically, we require a portion down (usually 1-3%) and can arrange monthly payments for the remainder. Credit checks and co-signers may be required. Contact us to discuss options." },
    { q: "What information do I need to get a bail bond?", a: "You'll need the defendant's full name, booking number, jail location, charges, and bail amount. We'll also need information about the co-signer including employment, residence, and contact details. Having this information ready speeds up the process." },
    { q: "Can I bail someone out from any jail?", a: "We can post bail at most jails in Palm Beach County and surrounding areas. Each jail has different procedures and processing times. Call us with the jail location, and we'll let you know if we can assist and what the timeline looks like." },
    { q: "What are my responsibilities as a co-signer?", a: "As a co-signer (indemnitor), you're responsible for ensuring the defendant appears at all court dates. You're also financially responsible for the full bail amount if the defendant fails to appear. You have the right to surrender the defendant if needed." },
    { q: "Can a bail bond be revoked?", a: "Yes, we can revoke a bail bond if the defendant violates conditions of release, fails to stay in contact, or if we believe they're a flight risk. We can also revoke if payments aren't made as agreed. The defendant would then be returned to custody." },
    { q: "What happens during the arrest warrant process?", a: "When someone has an active warrant, they can be arrested at any time. For minor warrants, we may be able to arrange a 'walk-through' bond where the defendant turns themselves in and is immediately bonded out, avoiding time in jail." },
    { q: "Do you handle federal cases?", a: "Federal cases have different rules and typically require specialized federal bail bonds. These cases are more complex and may require additional documentation and higher premiums. Contact us to discuss if we can assist with your specific federal case." },
    { q: "What's the difference between bail and bond?", a: "Bail is the amount of money set by the court for release. A bond is the financial guarantee (either cash bail paid directly or a bail bond through a bondsman) that ensures the defendant will appear in court. Most people use bail bonds rather than paying full cash bail." },
    { q: "Can bail be denied?", a: "Yes, in certain cases (typically serious felonies, flight risks, or repeat offenders) a judge may deny bail entirely. In other cases, bail may be set so high that it's effectively a denial. An attorney can request a bail reduction hearing." },
    { q: "What are OR bonds?", a: "OR (Own Recognizance) bonds allow defendants to be released without paying bail, based on their promise to appear in court. These are typically granted for minor offenses, first-time offenders, or defendants with strong community ties. No bail bondsman is needed." },
    { q: "How do immigration holds affect bail?", a: "If ICE places a detainer (immigration hold) on someone, they typically cannot be released on bail even if bail is granted on the criminal charges. The person must first resolve the immigration matter or have the hold lifted before release." },
    { q: "Can minors get bail bonds?", a: "Minors (under 18) are typically handled in juvenile court with different procedures. Parents or guardians may need to sign additional paperwork. Juvenile cases often focus on release to parents rather than traditional bail bonds." },
    { q: "What happens if I can't afford the premium?", a: "If you can't afford the full premium upfront, ask about payment plans or lower down payment options. Some bondsmen accept collateral in lieu of cash. You might also consider asking family members to help or explore other financial options." },
    { q: "How are bail amounts determined?", a: "Judges consider several factors: severity of charges, criminal history, flight risk, community ties, employment status, and public safety concerns. More serious charges and higher flight risks typically result in higher bail amounts." },
    { q: "What's a property bond?", a: "A property bond uses real estate as collateral instead of cash. The property value must typically exceed the bail amount. This process takes longer than cash bonds and requires property appraisals and title verification." },
    { q: "Can bail bonds be transferred between counties?", a: "Bail bonds are typically jurisdiction-specific. If someone is arrested in a different county while out on bond, it usually requires a separate bond for the new charges. The original bond may also be revoked." },
    { q: "What are conditions of release?", a: "Courts often set conditions like no contact with victims, staying within certain geographic areas, no alcohol/drugs, regular check-ins, or surrendering passports. Violating these conditions can result in bond revocation and re-arrest." },
    { q: "How do bounty hunters work?", a: "If a defendant skips bail, bail bondsmen may hire bounty hunters (fugitive recovery agents) to locate and return them. Bounty hunters have broad authority to arrest defendants but must follow specific laws and procedures." },
    { q: "What's the difference between secured and unsecured bonds?", a: "Secured bonds require payment or collateral upfront (like bail bonds). Unsecured bonds don't require upfront payment but hold the defendant financially responsible if they fail to appear. Most bonds are secured." },
    { q: "Can students get special consideration for bail?", a: "While being a student isn't a guarantee of lower bail, it can be a positive factor showing community ties and stability. Students should have their attorney present information about their academic status and enrollment." },
    { q: "What happens to bail money in plea deals?", a: "If someone pleads guilty or no contest, the case concludes and the bail bond is exonerated (released). The premium paid to the bondsman is not returned, but any collateral is returned to the co-signer." },
    { q: "Are there alternatives to bail bonds?", a: "Alternatives include cash bail (paying the full amount), property bonds, release on own recognizance, pretrial supervision programs, or electronic monitoring. The availability depends on the charges and jurisdiction." },
    { q: "What's a bench warrant?", a: "A bench warrant is issued by a judge when someone fails to appear in court or violates court orders. These warrants authorize immediate arrest and often result in higher bail amounts or bail denial for the new charges." }
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