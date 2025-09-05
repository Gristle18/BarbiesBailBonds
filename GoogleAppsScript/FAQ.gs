/**
 * FAQ.gs - Google Apps Script for serving FAQ content
 * This file generates the FAQ HTML content dynamically
 */

function doGet(e) {
  return HtmlService.createHtmlOutput(getFaqHtml())
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('FAQ • Barbie\'s Bail Bonds');
}

function getFaqHtml() {
  const faqData = [
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
    { q: "What's a bench warrant?", a: "A bench warrant is issued by a judge when someone fails to appear in court or violates court orders. These warrants authorize immediate arrest and often result in higher bail amounts or bail denial for the new charges." },
    { q: "Can bail be posted on weekends?", a: "Yes, we offer 24/7 bail bond services including weekends and holidays. However, some jails have limited processing hours, which might affect release times. We're always available to start the paperwork process." },
    { q: "What happens if someone dies while out on bond?", a: "If a defendant dies while out on bond, the bail obligation is typically discharged and any collateral is returned to the co-signer. Proper documentation (death certificate) must be provided to the court and bondsman." },
    { q: "Do you handle DUI cases?", a: "Yes, we handle DUI/DWI bail bonds. These cases often have special conditions like no driving, alcohol monitoring, or ignition interlock requirements. Multiple DUI offenses typically result in higher bail amounts." },
    { q: "What's a signature bond?", a: "A signature bond (similar to OR bonds) allows release based on the defendant's written promise to appear in court, without requiring money or collateral upfront. These are granted based on the defendant's reliability and ties to the community." },
    { q: "Can bail be appealed?", a: "Yes, defendants can request bail reduction hearings or appeal bail decisions through their attorney. This typically involves presenting new information about community ties, employment, or changed circumstances." },
    { q: "What happens in domestic violence cases?", a: "Domestic violence cases often have special considerations including no-contact orders, higher bail amounts, and mandatory cooling-off periods. Some jurisdictions require special domestic violence bail procedures." },
    { q: "How do drug charges affect bail?", a: "Drug charges can result in higher bail amounts, especially for trafficking or distribution charges. Courts may impose conditions like drug testing, treatment programs, or staying away from known drug areas." },
    { q: "What's a cash-only bond?", a: "Cash-only bonds require the full bail amount to be paid in cash - bail bondsmen cannot be used. These are typically set for serious charges or flight risks. Only cash, cashier's checks, or money orders are accepted." },
    { q: "Can military personnel get special consideration?", a: "Active military status can be a positive factor in bail decisions, showing stability and community service. However, it doesn't guarantee lower bail. Military personnel should present their service record and commanding officer contact information." },
    { q: "What's pretrial detention?", a: "Pretrial detention occurs when bail is denied or set too high to pay. Defendants remain in jail until trial. This is typically reserved for serious charges, flight risks, or public safety concerns." },
    { q: "How do outstanding warrants affect new bail?", a: "Outstanding warrants typically result in holds that prevent release on new charges until the old warrants are resolved. This often means multiple bonds or higher bail amounts. All warrants must be addressed." },
    { q: "What's a nebbia hold?", a: "A nebbia hold requires proof that bail money comes from legitimate sources, not from criminal activity. This typically applies to drug cases or when large amounts of cash are involved. Documentation of income sources is required." },
    { q: "Can tourists or visitors get bail bonds?", a: "Non-residents can get bail bonds but are often considered higher flight risks, potentially resulting in higher premiums or additional requirements like surrendering passports or local co-signers." },
    { q: "What happens with mental health issues?", a: "Mental health issues may affect bail decisions and release conditions. Courts might require mental health evaluations, treatment compliance, or medication monitoring as conditions of release." },
    { q: "How do probation violations affect bail?", a: "Probation violations often result in higher bail amounts or bail denial. The defendant faces consequences for both the new charges and the probation violation, potentially including revocation of probation." },
    { q: "What's a federal detainer?", a: "A federal detainer is a request from federal authorities to hold someone after they would otherwise be released. This can prevent release on state charges even if state bail is posted. Federal cases have separate procedures." },
    { q: "Can medical conditions affect bail?", a: "Serious medical conditions requiring ongoing treatment can be factors in bail decisions. Courts may grant release for medical reasons or require medical supervision as a condition of release." },
    { q: "What's electronic monitoring?", a: "Electronic monitoring uses ankle bracelets or other devices to track defendants' locations. This is often a condition of release that allows lower bail amounts while ensuring compliance with court orders." },
    { q: "How do prior convictions affect bail?", a: "Prior convictions, especially recent ones or for similar charges, typically result in higher bail amounts. Repeat offenders are often considered higher risks for failing to appear or committing new crimes." },
    { q: "What happens with multiple charges?", a: "Multiple charges can result in separate bail amounts for each charge, though judges sometimes set one bail amount covering all charges. More charges generally mean higher total bail amounts." },
    { q: "Can employers help with bail?", a: "Some employers may assist with bail for valuable employees, either by providing funds, serving as co-signers, or providing character references. Employment stability is a positive factor in bail decisions." },
    { q: "What's a surety bond?", a: "A surety bond is the technical term for a bail bond. The bail bondsman (surety) guarantees to the court that they'll pay the full bail amount if the defendant doesn't appear. This is backed by insurance companies." },
    { q: "How do weapon charges affect bail?", a: "Weapons charges often result in higher bail amounts and special conditions like prohibitions on possessing firearms or ammunition. Concealed carry permits don't override these restrictions." },
    { q: "What happens if I move while on bail?", a: "Most bail conditions require staying within certain geographic areas. Moving typically requires court approval and notification to the bail bondsman. Unauthorized moves can result in bond revocation." },
    { q: "Can family members be co-signers?", a: "Yes, family members often serve as co-signers. They need stable employment, good credit, and must understand their responsibilities for the defendant's appearance and potential financial liability." },
    { q: "What's the role of a bail bondsman?", a: "Bail bondsmen provide financial guarantees to courts for defendants' release. They charge premiums, may require collateral, ensure defendants appear in court, and are responsible for the full bail amount if defendants flee." },
    { q: "How do theft charges affect bail?", a: "Theft charges result in bail amounts typically based on the value stolen and defendant's criminal history. Higher-value thefts (grand theft) usually result in higher bail amounts than petty theft." },
    { q: "What's a citation release?", a: "Citation releases allow officers to issue citations instead of making arrests for minor offenses. The person signs a promise to appear in court without going to jail or posting bail." },
    { q: "Can students study abroad while on bail?", a: "International travel while on bail typically requires court approval and may not be granted, especially if the defendant is considered a flight risk. Study abroad plans should be discussed with an attorney." },
    { q: "What happens with traffic warrants?", a: "Traffic warrants (usually for unpaid tickets or missed court dates) typically have low bail amounts. These can often be resolved with walk-through bonds or by paying the underlying fines." },
    { q: "How do assault charges affect bail?", a: "Assault charges often result in no-contact orders with alleged victims and bail amounts based on injury severity and weapon use. Domestic assault typically involves additional restrictions." },
    { q: "What's a third-party custody release?", a: "Third-party custody releases place defendants under supervision of approved individuals (like family members) instead of requiring bail. This is often used for juveniles or low-risk defendants." },
    { q: "Can business owners get special consideration?", a: "Business ownership can be a positive factor showing community ties and stability. However, it doesn't guarantee lower bail, especially if the charges are business-related or involve financial crimes." },
    { q: "What happens with fraud charges?", a: "Fraud charges often result in higher bail amounts, especially for large amounts or when victims are elderly or vulnerable. Courts may freeze assets or require accounting of finances." },
    { q: "How do driving offenses affect bail?", a: "Driving offenses typically result in lower bail amounts, but serious cases (like vehicular homicide or hit-and-run) can have very high bail. License surrender is often a condition of release." },
    { q: "What's supervised release?", a: "Supervised release involves regular check-ins with pretrial services officers, drug testing, or other monitoring. This can sometimes result in lower bail amounts while ensuring court compliance." },
    { q: "Can tourists from other countries get bail?", a: "Foreign nationals can get bail bonds but face additional scrutiny as potential flight risks. Passport surrender, local sponsors, or higher premiums may be required." },
    { q: "What happens with conspiracy charges?", a: "Conspiracy charges often involve multiple defendants and can result in higher bail amounts due to the organized nature of alleged crimes. Co-defendants may have restrictions on contact with each other." },
    { q: "How do age factors affect bail?", a: "Very young defendants (18-21) and elderly defendants may receive special consideration in bail decisions. Age can be a factor in flight risk assessment and ability to comply with conditions." },
    { q: "What's a peace bond?", a: "A peace bond is a court order requiring someone to keep the peace and avoid contact with specific people or places. Violation can result in arrest and new charges." },
    { q: "Can religious leaders help with bail?", a: "Religious leaders can provide character references and community support, which may positively influence bail decisions. However, they cannot guarantee lower bail amounts or serve as sole co-signers without meeting financial requirements." },
    { q: "What happens with burglary charges?", a: "Burglary charges typically result in moderate to high bail amounts depending on whether it's residential or commercial, if weapons were involved, and the defendant's criminal history." },
    { q: "How do employment factors affect bail?", a: "Stable employment is a strong positive factor in bail decisions, showing community ties and ability to appear for court. Unemployment or frequent job changes may result in higher bail amounts." },
    { q: "What's an immigration bond?", a: "Immigration bonds are separate from criminal bonds and are handled by immigration courts. These require different procedures and specialists familiar with immigration law." },
    { q: "Can students get reduced bail?", a: "Student status alone doesn't guarantee reduced bail, but it can be a positive factor showing stability and future prospects. Academic achievements and enrollment status may be presented to the court." },
    { q: "What happens with robbery charges?", a: "Robbery charges typically result in high bail amounts due to the violent nature and weapon use. Armed robbery generally has higher bail than unarmed robbery." },
    { q: "How do medical emergencies affect court dates?", a: "Legitimate medical emergencies that prevent court appearance require immediate notification to the court and attorney. Documentation from medical providers is typically required to avoid bench warrants." },
    { q: "What's a conditional release?", a: "Conditional release involves specific requirements like drug testing, counseling, or geographic restrictions. Violating conditions can result in re-arrest and bond revocation." },
    { q: "Can college students get weekend releases?", a: "Weekend releases for educational purposes are rare and typically only considered for very minor offenses or special circumstances. This would require court approval and attorney advocacy." },
    { q: "What happens with embezzlement charges?", a: "Embezzlement charges often result in higher bail amounts, especially for large sums. Courts may freeze assets and require full financial disclosure. Restitution may be a condition of release." },
    { q: "How do community ties affect bail?", a: "Strong community ties (family, employment, property ownership, volunteer work) are positive factors that can result in lower bail amounts and better release conditions." },
    { q: "What's a walk-through bond process?", a: "Walk-through bonds allow defendants with warrants to surrender voluntarily and be immediately bonded out, avoiding extended jail time. This must be arranged in advance with the bondsman and attorney." },
    { q: "Can military deployment affect court dates?", a: "Military deployment can result in court date continuances under the Servicemembers Civil Relief Act. Proper notification and documentation through military legal channels is required." },
    { q: "What happens with tax evasion charges?", a: "Tax evasion charges often involve federal courts and can result in high bail amounts. Asset freezing and detailed financial disclosure may be required as conditions of release." },
    { q: "How do witness intimidation charges affect bail?", a: "Witness intimidation charges typically result in high bail amounts and strict no-contact orders. These charges are taken very seriously due to their impact on the justice system." },
    { q: "What's an ankle monitor?", a: "Ankle monitors are electronic devices that track location and sometimes detect alcohol consumption. They're often required as conditions of release and may allow for lower bail amounts." },
    { q: "Can seasonal workers get special consideration?", a: "Seasonal work patterns may be considered in bail decisions, but stable employment history is more important than specific job types. Documentation of work patterns may be helpful." },
    { q: "What happens with identity theft charges?", a: "Identity theft charges often result in moderate to high bail amounts and may include restrictions on computer/internet use and access to financial accounts or personal information." },
    { q: "How do childcare responsibilities affect bail?", a: "Childcare responsibilities can be positive factors in bail decisions, showing community ties and incentives to appear in court. Single parents may receive special consideration." },
    { q: "What's a personal recognizance bond?", a: "Personal recognizance (PR) bonds allow release based solely on the defendant's written promise to appear, without requiring money. These are granted based on low flight risk and minor charges." },
    { q: "Can teachers get professional consideration?", a: "Professional licenses (like teaching) can be positive factors showing stability, but they don't guarantee lower bail. Some professions face additional scrutiny for certain types of charges." },
    { q: "What happens with computer crime charges?", a: "Computer crime charges may result in restrictions on internet use, computer access, or electronic device possession as conditions of release. Bail amounts vary based on the scale of alleged crimes." },
    { q: "How do disability accommodations work with bail?", a: "Defendants with disabilities are entitled to reasonable accommodations in the bail process. This might include accessible facilities, interpreters, or modified supervision arrangements." },
    { q: "What's a conditional plea?", a: "Conditional pleas allow defendants to plead guilty while preserving the right to appeal specific issues. This doesn't directly affect bail but may influence case resolution strategies." },
    { q: "Can retirees get special bail consideration?", a: "Retirement status can be a positive factor showing stability and lower flight risk, especially for long-term community residents. However, it doesn't automatically result in lower bail." },
    { q: "What happens with money laundering charges?", a: "Money laundering charges often result in high bail amounts and extensive asset freezing. Detailed financial disclosure and proof of legitimate income sources are typically required." },
    { q: "How do mental health treatment requirements work?", a: "Mental health treatment may be required as a condition of release, including medication compliance and regular appointments. This may allow for release that wouldn't otherwise be granted." },
    { q: "What's electronic home detention?", a: "Electronic home detention combines ankle monitoring with house arrest, allowing defendants to remain home except for approved activities like work, medical appointments, or court dates." },
    { q: "Can small business owners get expedited processing?", a: "While business ownership is a positive factor, it doesn't typically result in expedited processing. However, the economic impact of detention may be presented as a factor in bail arguments." },
    { q: "What happens with environmental crime charges?", a: "Environmental crime charges can result in varying bail amounts depending on the scale and impact. Conditions may include restrictions on business operations or environmental compliance requirements." },
    { q: "How do family emergencies affect court appearances?", a: "Family emergencies require immediate communication with the court and attorney. Documentation and court approval for rescheduling are essential to avoid bench warrants." },
    { q: "What's a surety surrender?", a: "Surety surrender occurs when a bail bondsman revokes a bond and returns the defendant to custody. This can happen for various reasons including missed payments or violation of conditions." },
    { q: "Can healthcare workers get professional consideration?", a: "Healthcare licenses can be positive factors in bail decisions, but certain charges (like drug offenses) may result in additional professional consequences and scrutiny." },
    { q: "What happens with organized crime charges?", a: "Organized crime charges typically result in very high bail amounts or bail denial due to the serious nature, flight risk, and public safety concerns. Special conditions are often imposed." },
    { q: "How do volunteer activities affect bail decisions?", a: "Community volunteer work is a positive factor showing community ties and character. Documentation of volunteer activities can be presented to support bail arguments." },
    { q: "What's a bail review hearing?", a: "Bail review hearings allow defendants to request bail reductions or modifications based on changed circumstances or new information. These require attorney representation and proper documentation." },
    { q: "Can freelancers get employment verification for bail?", a: "Freelancers can provide documentation through contracts, tax returns, bank statements, and client references. Consistent income history is more important than traditional employment." },
    { q: "What happens with cybercrime charges?", a: "Cybercrime charges often involve restrictions on internet use, computer access, and electronic communications. International cases may involve additional federal agencies and higher bail amounts." },
    { q: "How do custody battles affect bail conditions?", a: "Active custody disputes may result in additional restrictions or considerations in criminal cases, especially for domestic violence or child-related charges. Family court orders may influence bail conditions." },
    { q: "What's pretrial supervision?", a: "Pretrial supervision involves regular check-ins with court officers, drug testing, or other monitoring while out on bail. This provides additional oversight while allowing community release." },
    { q: "Can ministers or clergy get special consideration?", a: "Religious leadership can be a positive factor showing community ties and moral character, but it doesn't guarantee special treatment. Character references from congregation members may be helpful." },
    { q: "What happens with hate crime charges?", a: "Hate crime charges often result in higher bail amounts due to public safety concerns and the serious nature of the allegations. Additional conditions may include counseling or community service." },
    { q: "How do previous bail violations affect new cases?", a: "Previous bail violations typically result in higher bail amounts or more restrictive conditions for new cases. Courts view past violations as indicators of future non-compliance risk." },
    { q: "What's a conditional discharge?", a: "Conditional discharge allows case dismissal upon completion of specific requirements like community service or counseling. This is typically part of plea negotiations rather than bail conditions." },
    { q: "Can artists or performers get touring accommodation?", a: "Professional tours may be considered for travel permission while on bail, but approval depends on the charges, flight risk assessment, and court discretion. Advance planning and attorney advocacy are essential." }
  ];

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FAQ • Barbie's Bail Bonds</title>
  <style>
    :root {
      --brand: #F28C00;
      --brand-dark: #D67700;
      --dark: #111;
      --muted: #666;
      --light-gray: #eee;
      --white: #fff;
      --cream: #fff2d1;
      --black: #000;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: var(--dark);
      background: var(--white);
    }

    /* Remove focus outline and prevent text editing cursor (restore on interactive) */
    * { outline: none; cursor: default; }
    a, button { cursor: pointer; }

    .container { width: 100%; max-width: 1000px; margin: 0 auto; padding: 40px 20px 60px; }
    .header { text-align: center; margin-bottom: 24px; }
    .title { font-size: 36px; font-weight: 800; margin-bottom: 8px; }
    .subtitle { font-size: 18px; color: var(--muted); }

    .faq {
      background: var(--white);
      border-radius: 12px;
      box-shadow: 0 6px 20px rgba(0,0,0,.08);
      overflow: hidden;
      border: 1px solid #eee;
    }
    .faq-item { border-bottom: 1px solid #eee; }
    .faq-item:last-child { border-bottom: none; }

    .faq-question {
      width: 100%;
      text-align: left;
      padding: 18px 20px;
      background: #fafafa;
      border: none;
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    .faq-question:hover {
      background: #f0f0f0;
    }
    .faq-question .chevron { transition: transform .2s ease; }
    .faq-item.open .chevron { transform: rotate(90deg); }

    .faq-answer {
      padding: 0 20px 0;
      background: var(--white);
      color: var(--dark);
      overflow: hidden;
      max-height: 0;
      transition: max-height 0.3s ease-in-out;
    }
    .faq-answer .answer-inner { padding: 14px 0 18px; }
    .faq-answer p { margin-bottom: 10px; }

    .footer { text-align: center; color: #999; font-size: 14px; margin-top: 30px; }

    /* Search Bar Styles */
    .search-container {
      margin: 24px 0 34px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    
    .search-box {
      width: 100%;
      max-width: 600px;
      position: relative;
    }
    
    .search-input {
      width: 100%;
      padding: 16px 50px 16px 20px;
      border: 2px solid #ddd;
      border-radius: 12px;
      font-size: 16px;
      outline: none;
      transition: border-color 0.3s ease;
    }
    
    .search-input:focus {
      border-color: var(--brand);
    }
    
    .search-icon {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
      font-size: 20px;
    }
    
    .search-results-info {
      font-size: 14px;
      color: var(--muted);
      text-align: center;
    }
    
    .highlight {
      background: #fff2d1;
      font-weight: 600;
      padding: 1px 3px;
      border-radius: 3px;
    }
    
    .faq-item.hidden {
      display: none;
    }
    
    .no-results {
      text-align: center;
      padding: 40px 20px;
      color: var(--muted);
      font-size: 16px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">Frequently Asked Questions</div>
      <div class="subtitle">Quick answers to common questions about bonds and the release process.</div>
    </div>

    <div class="search-container">
      <div class="search-box">
        <input type="text" class="search-input" id="faqSearch" placeholder="Search frequently asked questions..." autocomplete="off">
        <span class="search-icon">🔍</span>
      </div>
      <div class="search-results-info" id="searchInfo"></div>
    </div>

    <div class="no-results" id="noResults">
      <p>No questions found matching your search. Try different keywords or browse all questions below.</p>
    </div>

    <div class="faq" role="list" id="faqContainer">
      ${faqData.map((item, index) => `
        <div class="faq-item" role="listitem">
          <button class="faq-question" onclick="toggleFaq(${index})" aria-expanded="false" aria-controls="answer-${index}" id="question-${index}">
            <span class="chevron">▶</span>
            <span>${item.q}</span>
          </button>
          <div class="faq-answer" id="answer-${index}" aria-labelledby="question-${index}">
            <div class="answer-inner">
              <p>${item.a}</p>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      Copyright © 2024 Barbie's Bail Bonds | Bail Bond Services
    </div>
  </div>

  <script>
    let allItems = [];
    
    document.addEventListener('DOMContentLoaded', function() {
      allItems = document.querySelectorAll('.faq-item');
      updateSearchInfo();
    });

    function toggleFaq(index) {
      const item = document.querySelector(\`.faq-item:nth-child(\${index + 1})\`);
      const answer = document.getElementById(\`answer-\${index}\`);
      const question = document.getElementById(\`question-\${index}\`);
      
      const isOpen = item.classList.contains('open');
      
      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = '0';
        question.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('open');
        setTimeout(() => {
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }, 10);
        question.setAttribute('aria-expanded', 'true');
      }
    }

    function performSearch() {
      const searchTerm = document.getElementById('faqSearch').value.toLowerCase().trim();
      const items = document.querySelectorAll('.faq-item');
      const noResults = document.getElementById('noResults');
      let visibleCount = 0;
      
      items.forEach(item => {
        const question = item.querySelector('.faq-question span:last-child');
        const answer = item.querySelector('.faq-answer p');
        const questionText = question.textContent.toLowerCase();
        const answerText = answer.textContent.toLowerCase();
        
        if (searchTerm === '' || questionText.includes(searchTerm) || answerText.includes(searchTerm)) {
          item.classList.remove('hidden');
          visibleCount++;
          
          if (searchTerm !== '') {
            highlightText(question, searchTerm);
            highlightText(answer, searchTerm);
          } else {
            removeHighlights(question);
            removeHighlights(answer);
          }
        } else {
          item.classList.add('hidden');
          item.classList.remove('open');
          const answerDiv = item.querySelector('.faq-answer');
          if (answerDiv) answerDiv.style.maxHeight = '0';
        }
      });
      
      noResults.style.display = visibleCount === 0 && searchTerm !== '' ? 'block' : 'none';
      updateSearchInfo(visibleCount, searchTerm);
    }

    function highlightText(element, searchTerm) {
      const originalText = element.getAttribute('data-original') || element.innerHTML;
      if (!element.getAttribute('data-original')) {
        element.setAttribute('data-original', originalText);
      }
      
      const regex = new RegExp(\`(\${searchTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})\`, 'gi');
      const highlightedText = originalText.replace(regex, '<span class="highlight">$1</span>');
      element.innerHTML = highlightedText;
    }

    function removeHighlights(element) {
      const originalText = element.getAttribute('data-original');
      if (originalText) {
        element.innerHTML = originalText;
      }
    }

    function updateSearchInfo(visibleCount = null, searchTerm = '') {
      const searchInfo = document.getElementById('searchInfo');
      const totalCount = allItems.length;
      
      if (searchTerm === '') {
        searchInfo.textContent = \`Showing all \${totalCount} questions\`;
      } else if (visibleCount === 0) {
        searchInfo.textContent = 'No questions found';
      } else if (visibleCount === 1) {
        searchInfo.textContent = '1 question found';
      } else {
        searchInfo.textContent = \`\${visibleCount} questions found\`;
      }
    }

    document.getElementById('faqSearch').addEventListener('input', performSearch);
  </script>
</body>
</html>
  `;
  
  return html;
}