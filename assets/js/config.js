/*
 * Client contact details. Fill these in before launch.
 *
 * Anything left empty stays hidden on the site: the Call, WhatsApp and Email
 * buttons only appear once their value is set.
 *
 * The enquiry form sends to the first channel that is configured:
 *   1. formEndpoint  – a form service URL (e.g. Formspree, Getform, Basin).
 *                      Enquiries arrive by email, the visitor stays on the page.
 *   2. whatsapp      – opens WhatsApp with the enquiry typed out.
 *   3. email         – opens the visitor's email app with the enquiry typed out.
 */
window.SITE_CONFIG = {
  // Display format, e.g. "+91 98xxx xxxxx"
  phone: "",
  // Digits only with country code, e.g. "9198xxxxxxxx"
  whatsapp: "",
  email: "",
  formEndpoint: "",
};
