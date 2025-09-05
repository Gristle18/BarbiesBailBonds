/**
 * FAQ.gs - Google Apps Script for serving FAQ content
 * This file generates the FAQ HTML content dynamically
 */

function doGet(e) {
  const format = e.parameter.format;
  const callback = e.parameter.callback;
  const action = e.parameter.action;
  const query = e.parameter.query || e.parameter.q;
  
  // RAG Search endpoint
  if (action === 'search' && query) {
    try {
      const results = semanticSearch(query, 5);
      const response = {
        query: query,
        results: results.map(item => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          similarity: Math.round(item.similarity * 100) / 100
        }))
      };
      
      if (format === 'jsonp' && callback) {
        const jsonpResponse = callback + '(' + JSON.stringify(response) + ');';
        return ContentService
          .createTextOutput(jsonpResponse)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return ContentService
          .createTextOutput(JSON.stringify(response))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeader('Access-Control-Allow-Origin', '*');
      }
    } catch (error) {
      const errorResponse = { error: error.toString(), query: query };
      if (format === 'jsonp' && callback) {
        const jsonpResponse = callback + '(' + JSON.stringify(errorResponse) + ');';
        return ContentService.createTextOutput(jsonpResponse).setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return ContentService.createTextOutput(JSON.stringify(errorResponse)).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
  
  // RAG Chat endpoint
  if (action === 'chat' && query) {
    try {
      const response = generateRAGResponse(query);
      
      if (format === 'jsonp' && callback) {
        const jsonpResponse = callback + '(' + JSON.stringify(response) + ');';
        return ContentService
          .createTextOutput(jsonpResponse)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return ContentService
          .createTextOutput(JSON.stringify(response))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeader('Access-Control-Allow-Origin', '*');
      }
    } catch (error) {
      const errorResponse = { error: error.toString(), query: query };
      if (format === 'jsonp' && callback) {
        const jsonpResponse = callback + '(' + JSON.stringify(errorResponse) + ');';
        return ContentService.createTextOutput(jsonpResponse).setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return ContentService.createTextOutput(JSON.stringify(errorResponse)).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
  
  if (format === 'json') {
    // Return JSON data for API calls
    return ContentService
      .createTextOutput(JSON.stringify(getFaqData()))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
  
  if (format === 'jsonp' && callback) {
    // Return JSONP data for cross-origin requests
    const jsonData = JSON.stringify(getFaqData());
    const jsonpResponse = callback + '(' + jsonData + ');';
    return ContentService
      .createTextOutput(jsonpResponse)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  // Return HTML page by default
  return HtmlService.createHtmlOutput(getFaqHtml())
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('FAQ • Barbie\'s Bail Bonds');
}

function getFaqData() {
  return [
    { q: "How do bail bonds work?", a: "Bail bonds allow defendants to be released from custody pending trial, ensuring they appear in court when required." },
    { q: "What is the process for obtaining a bail bond?", a: "You contact a bail bondsman, pay a fee (typically 10% of the bond amount), and provide necessary information." },
    { q: "What information do I need to provide to a bail bondsman?", a: "You'll need the defendant's full name, booking number, and the location of the jail." },
    { q: "How much will I have to pay for a bond?", a: "Using a bondsman, you will typically pay 10% of the bond amount for state charges (15% for federal bonds). For example, if the bond is $5,000, you would pay $500. At the jail, you pay the full bond amount." },
    { q: "If a bond is less than $1,000, how much do I have to pay?", a: "In Florida, bonds under $1,000 require a premium of $100. For instance, a $600 bond would have a $100 premium." },
    { q: "Is the premium for the bond refundable?", a: "No, the premium paid to the bondsman is non-refundable once the case is closed or discharged." },
    { q: "Why should I use a bondsman instead of paying the full amount at the jail?", a: "Using a bondsman allows you to pay only a percentage of the bond upfront, freeing up your finances for other legal expenses or obligations." },
    { q: "What is the difference between a defendant and an indemnitor?", a: "A defendant is the person facing criminal charges, while an indemnitor (cosigner) is legally responsible for paying the bond if the defendant fails to appear in court." },
    { q: "How long does it take after I pay the bond for the defendant to get out of jail?", a: "The process typically takes 4 to 6 hours after the bondsman submits the paperwork to the jail." },
    { q: "How will I know when the defendant is out of jail?", a: "The defendant can usually call from the jail once released. You can also check with the jail's inmate records or contact the bondsman for updates." },
    { q: "What happens if I find out that there is a warrant out for my arrest?", a: "Contact the bondsman immediately to arrange a walk-through warrant process at the jail." },
    { q: "How long will I be responsible for the defendant that I bonded out?", a: "You are responsible until the case is closed or discharged by the court." },
    { q: "How long does it take to get my collateral back?", a: "Collateral is returned after the case is closed, typically within 21 days of discharge, provided all conditions are met." },
    { q: "If the defendant is re-arrested, will I still be responsible for the original bond?", a: "Yes, you may be subject to a bond surrender if the defendant is re-arrested while out on bond." },
    { q: "How do bail bondsmen make money?", a: "Bail bondsmen earn a fee (typically 10% of the bond amount) paid by the client. This fee is non-refundable once the defendant is released from custody." },
    { q: "What happens if the defendant misses a court date?", a: "Notify the bondsman immediately. The court may issue a warrant, and the bond may be forfeited." },
    { q: "What if the defendant is not a citizen?", a: "Non-citizens may face immigration holds if arrested, requiring a hearing to determine their status." },
    { q: "How to choose a bail bond company?", a: "Look for companies with good reviews and a solid reputation. Avoid meeting bail agents in unofficial locations." },
    { q: "What happens if you don't pay your bond agent?", a: "Failure to fulfill financial obligations to the bondsman could result in legal action and additional fees." },
    { q: "How can I verify the legitimacy of a bail bonds company?", a: "Verify licenses, check online reviews, and ensure the company operates within legal guidelines." },
    { q: "Are there discounts or payment plans available for bond premiums?", a: "Some bond companies offer payment plans or discounts based on specific circumstances. Inquire with the bondsman for options." },
    { q: "Can a bondsman refuse to bond someone out?", a: "Bondsmen have discretion in deciding whom to bond out based on various factors, including risk assessment and legal requirements." },
    { q: "Can I bail someone out on a weekend or holiday?", a: "Yes, reputable bond companies offer 24/7 availability, including weekends and holidays, for bail services." },
    { q: "What should I do if I can't afford the bond premium?", a: "Discuss payment options with the bondsman. Some may offer flexible payment plans or financing options." },
    { q: "Can a bondsman assist with warrants in other counties?", a: "Yes, bondsmen can often assist with warrants across different counties, coordinating with local authorities for the process." },
    { q: "How does a cash bond work?", a: "A cash bond requires payment of the full bond amount directly to the jail, which is refunded if the defendant appears in court." },
    { q: "What is collateral in a bail bond?", a: "Collateral can be real estate, vehicles, or other valuable assets used to secure the bond, forfeited if the defendant fails to appear in court." },
    { q: "How long will I have to wait to get my bond money back?", a: "Bond refunds are processed after the case is closed, typically within a few weeks, depending on court procedures." },
    { q: "What exactly is bail and how does it work?", a: "Bail is money or collateral set by the court to ensure a defendant returns for court dates. A bail bond lets you pay only a portion through a licensed agent." },
    { q: "How do I know if my loved one is eligible for bail?", a: "Most charges are eligible, but eligibility depends on the judge, criminal history, and case details. We can check for you quickly." },
    { q: "How fast can you get someone out of jail?", a: "Once paperwork and payment are complete, release usually takes 2–6 hours depending on jail processing." },
    { q: "What paperwork do I need to post bail?", a: "A valid ID, proof of residence, and employment details if you're cosigning. We provide and handle all bond forms." },
    { q: "Can bail be posted 24/7 in Palm Beach County?", a: "Yes. Bail bondsmen and the jail operate around the clock." },
    { q: "How long does the release process take once bail is posted?", a: "Typically 2–6 hours, though busier times at Palm Beach County Jail may cause delays." },
    { q: "Do I have to go to the jail myself, or can you handle everything?", a: "We handle most of the process for you — often without you stepping foot in jail." },
    { q: "Can bail be posted at any courthouse in Palm Beach?", a: "Bail is usually posted directly at the jail. Some courthouse clerks accept cash bonds." },
    { q: "What's the difference between bail and bond?", a: "Bail is the total amount set by the court. A bond is a guarantee by a bail agent that the defendant will appear in court." },
    { q: "Who sets the bail amount?", a: "A judge sets bail at a first appearance hearing or follows the Palm Beach County bail schedule." },
    { q: "How much will it cost me to bail someone out?", a: "In Florida, it's typically 10% of the bail amount, with a $100 minimum." },
    { q: "What percentage of bail do I have to pay in Florida?", a: "State law sets the premium at 10%." },
    { q: "Is the bail bond premium refundable?", a: "No. The premium is the non-refundable fee for the bail agent's service." },
    { q: "Do you accept credit cards?", a: "Yes. We accept major cards, cash, money orders, and sometimes digital payments." },
    { q: "Can I make payments, or is the full amount required upfront?", a: "We offer payment plans for qualified cosigners." },
    { q: "Do you accept collateral instead of cash?", a: "Yes. Collateral such as property, vehicles, or jewelry can be used." },
    { q: "What counts as collateral in Palm Beach?", a: "Real estate, car titles, bank accounts, or valuable items with proof of ownership." },
    { q: "Can I use property or a car title for collateral?", a: "Yes, with verification of ownership and value." },
    { q: "Do you charge extra fees besides the premium?", a: "No hidden fees. Only court-required or legally permitted fees apply." },
    { q: "What happens if the defendant doesn't show up—do I lose my money?", a: "Yes, you may be liable for the full bail amount. We work with you to get the defendant back to court." },
    { q: "What charges are considered bailable in Florida?", a: "Most charges are, except capital offenses (e.g., murder) with strong evidence." },
    { q: "Can someone with a warrant still get a bail bond?", a: "Yes. Once arrested or if they turn themselves in, a bond can be arranged." },
    { q: "How do I know if someone has a warrant in Palm Beach?", a: "You can check online at the Palm Beach Clerk's site or call us to search." },
    { q: "Can I check online if someone is in jail?", a: "Yes. The Palm Beach County Sheriff's Office has an online inmate lookup." },
    { q: "What is a plea conference, and does it affect bail?", a: "It's a meeting to discuss possible plea deals. Bail usually stays the same unless changed by the court." },
    { q: "Do you handle federal bonds or just county/state?", a: "We handle county, state, and federal bonds." },
    { q: "What if the judge denies bail?", a: "The defendant must remain in custody, but an attorney may file for reconsideration." },
    { q: "What's the difference between cash bonds and surety bonds?", a: "Cash bond = full bail amount paid in cash to the court. Surety bond = bail bondsman posts on your behalf for 10%." },
    { q: "Can bail be lowered in court?", a: "Yes. An attorney can request a bond reduction hearing." },
    { q: "Do you help with immigration bonds?", a: "Yes, though these are handled differently than state/county bonds." },
    { q: "Which jail will my loved one be taken to in Palm Beach?", a: "Usually the Main Detention Center in West Palm Beach." },
    { q: "How do I locate someone in the Palm Beach County Jail?", a: "Use the PBSO inmate locator or call us." },
    { q: "Do you provide Palm Beach inmate lookup services?", a: "Yes, we can search and confirm arrest details for you." },
    { q: "Can you explain how first appearance hearings work here?", a: "They happen within 24 hours of arrest. A judge sets bail during this hearing." },
    { q: "Where do I go for a bond hearing in Palm Beach?", a: "Main Courthouse: 205 N Dixie Hwy, West Palm Beach." },
    { q: "Do you serve all of Palm Beach County, including West Palm Beach, Lake Worth, and Boynton Beach?", a: "Yes, we serve the entire county." },
    { q: "Are bail amounts in Palm Beach usually higher than other counties?", a: "They follow a standard schedule, but judges may set higher amounts based on the case." },
    { q: "Does Palm Beach have night court for bail hearings?", a: "No. First appearances are scheduled daily, not overnight." },
    { q: "Can you meet me at the Palm Beach County Jail?", a: "Yes. We often meet clients directly at the jail." },
    { q: "How do I get directions to your office from the jail?", a: "We provide step-by-step directions and GPS links." },
    { q: "What happens if the defendant misses court?", a: "The court issues a warrant, and the bond is forfeited. We then work to return the defendant to court." },
    { q: "Can I be arrested if the defendant skips bail?", a: "No, but as a cosigner you may be financially liable for the full bail amount." },
    { q: "How long does the bond stay active?", a: "It remains active until the case is resolved in court." },
    { q: "Can I revoke a bond if I no longer want responsibility?", a: "Yes, you can request bond revocation. The defendant will be returned to custody." },
    { q: "What if the defendant is arrested again while out on bond?", a: "The new arrest may affect the current bond. A judge decides if bail is allowed again." },
    { q: "Can bail conditions include travel restrictions?", a: "Yes. Judges often restrict travel outside Palm Beach County or Florida." },
    { q: "What happens to the bond if charges are dropped?", a: "The bond is discharged, and collateral is returned." },
    { q: "What if court dates are rescheduled?", a: "The bond remains valid for new dates." },
    { q: "Do I get notified of every court date?", a: "We make sure you and the defendant are notified of upcoming dates." },
    { q: "What if I move out of Palm Beach while on bond?", a: "You must notify the court and your bail agent immediately." },
    { q: "How do I explain this process to my family?", a: "We provide simple, step-by-step explanations to ease stress." },
    { q: "Can more than one person help pay for bail?", a: "Yes, multiple cosigners can share financial responsibility." },
    { q: "Do I need to be related to bail someone out?", a: "No. Anyone willing and approved can cosign." },
    { q: "Can I co-sign if I live outside of Florida?", a: "Yes, with proper documentation and verification." },
    { q: "What if I don't have good credit—can I still co-sign?", a: "Yes, other factors like employment and residency are considered." },
    { q: "Do you offer bilingual services (Spanish/Creole) for families in Palm Beach?", a: "Yes, we provide bilingual assistance." },
    { q: "Can you keep my information confidential?", a: "Yes, all information is kept private and secure." },
    { q: "Do you offer any counseling or support resources?", a: "We can connect you with local support and legal resources." },
    { q: "Can you recommend an attorney?", a: "Yes, we can refer you to trusted local defense attorneys." },
    { q: "Will you call me when my loved one is released?", a: "Yes, we notify you as soon as release is complete." },
    { q: "How will I know the court date?", a: "The court issues a notice, and we also provide reminders." },
    { q: "Do you remind defendants of court dates?", a: "Yes, we call and text reminders." },
    { q: "What if the defendant is late to court?", a: "They must still appear, but lateness may cause issues. Always arrive early." },
    { q: "Can court appearances be done virtually?", a: "Some hearings allow Zoom, but check with the court." },
    { q: "What happens at a calendar call?", a: "It's a hearing where the court schedules the case for trial or plea." },
    { q: "Do I need to attend court with the defendant?", a: "No, but support is helpful. Only the defendant is required." },
    { q: "How do I get proof that bail was posted?", a: "We provide a bond receipt and court confirmation." },
    { q: "Do you handle bonds for DUI cases?", a: "Yes, DUI bonds are common in Palm Beach." },
    { q: "What about domestic violence cases?", a: "Yes, we handle these, though judges sometimes impose stricter conditions." },
    { q: "Can you explain no-contact orders in Palm Beach?", a: "It's a court order preventing the defendant from contacting the alleged victim." },
    { q: "My loved one was just arrested—what's the first thing I should do?", a: "Call us immediately so we can check charges and bail eligibility." },
    { q: "Do you answer the phone at night?", a: "Yes, we're available 24/7." },
    { q: "How do I find out why someone was arrested?", a: "We can confirm charges through jail records." },
    { q: "Can bail be posted on weekends or holidays?", a: "Yes, bondsmen and the jail operate daily, including holidays." },
    { q: "Can you bond someone out if they're being held in another Florida county?", a: "Yes, we can arrange transfer bonds statewide." },
    { q: "What if the defendant is injured or in the hospital?", a: "Bail can still be arranged, but release may be delayed until medical clearance." },
    { q: "What if my loved one was arrested during Spring Break in Palm Beach?", a: "We handle many spring break arrests and can guide visitors through the process." },
    { q: "Can you bond out someone arrested for out-of-state charges?", a: "Yes, depending on the case and jurisdiction." },
    { q: "Do you handle juvenile bail bonds?", a: "Yes, but juvenile cases have special procedures." },
    { q: "Do you handle probation violation bonds?", a: "Yes, though some violations may not allow bail." },
    { q: "What are common restrictions after release on bond?", a: "No new arrests, no contact with victims, and attending all court dates." },
    { q: "Can the defendant still work while out on bond?", a: "Yes, unless restricted by the court." },
    { q: "Can the defendant travel out of Palm Beach County?", a: "Only with court approval." },
    { q: "What if the defendant wants to move?", a: "The court and bail agent must approve." },
    { q: "Can I get my collateral back sooner?", a: "No, it's returned once the case is closed." },
    { q: "What if the defendant is found not guilty?", a: "The bond is discharged, and collateral is returned." },
    { q: "Can bail conditions include drug testing?", a: "Yes, especially for drug-related charges." },
    { q: "What should we do if we can't afford a lawyer?", a: "Request a public defender or ask us for referrals." },
    { q: "Will you explain the court process to us step by step?", a: "Yes, we guide you through every stage." },
    { q: "Do you check in with defendants regularly?", a: "Yes, we require regular check-ins by phone or in person." },
    { q: "How long have you been in business in Palm Beach?", a: "We've served Palm Beach County for years with trusted experience." },
    { q: "Are you licensed and insured?", a: "Yes, all Florida bail agents must be licensed and insured." },
    { q: "What makes your company different from others in Palm Beach?", a: "We combine fast service, confidentiality, and local expertise." },
    { q: "Do you have reviews or testimonials from past clients?", a: "Yes, we have positive feedback from many Palm Beach families." },
    { q: "Are you a local family-owned business?", a: "Yes, we are locally owned and operated." },
    { q: "Can I start the bail process online?", a: "Yes, we have secure online applications." },
    { q: "Can you come to me instead of me going to your office?", a: "Yes, we can meet at your home, workplace, or the jail." },
    { q: "Do you have a physical office near the Palm Beach County Jail?", a: "Yes, we are located close to the Main Detention Center." },
    { q: "Do you charge the same as other bail bond companies?", a: "We charge the standard state-regulated rate." },
    { q: "What should I do right now if I need to bail someone out?", a: "Call us immediately — we'll verify the arrest, explain your options, and start the process." }
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
  <p>This is the Google Apps Script FAQ version with ` + faqData.length + ` questions.</p>
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