/**
 * Main routing function for Google Apps Script web app
 * Modified to point to FAQ.gs script
 */
function doGet(e) {
  const page = e.parameter.page || 'faq';
  
  switch(page.toLowerCase()) {
    case 'faq':
      // Point to FAQ.gs script
      return HtmlService.createHtmlOutput(getFaqHtml())
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setTitle('FAQ • Barbie\'s Bail Bonds');
    
    case 'reviewcarousel':
      return HtmlService.createTemplateFromFile('ReviewCarousel').evaluate()
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    default:
      // Default to FAQ instead of ReviewCarousel
      return HtmlService.createHtmlOutput(getFaqHtml())
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setTitle('FAQ • Barbie\'s Bail Bonds');
  }
}