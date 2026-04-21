// One-time seeder that attaches sample documents to the seeded site-visit requests
// so the Site Visit dashboard shows realistic uploaded files (NOC, ID proof,
// authorisation letter, load document, calibration cert, etc.) on first load.

import { saveDocument } from "./documentStore";

let seeded = false;

function makeFile(name: string, body: string, type = "application/pdf"): File {
  return new File([body], name, { type });
}

export function seedSampleDocuments() {
  if (seeded) return;
  seeded = true;

  // REQ-2024-201 — Power Postpaid (Nimbus Analytics)
  saveDocument("REQ-2024-201", "space-noc", makeFile("NOC_Nimbus.pdf", "%PDF-NOC"), "NOC from Landlord");
  saveDocument("REQ-2024-201", "space-id-proof", makeFile("PAN_Nimbus.pdf", "%PDF-PAN"), "Company PAN");
  saveDocument("REQ-2024-201", "space-auth-letter", makeFile("Authorisation_Letter.pdf", "%PDF-AUTH"), "Authorisation Letter");
  saveDocument("REQ-2024-201", "space-lease", makeFile("Lease_Agreement.pdf", "%PDF-LEASE"), "Lease Agreement");

  // REQ-2024-202 — Power Temporary (Skyline Constructions) – load uploaded
  saveDocument("REQ-2024-202", "space-noc", makeFile("NOC_Skyline.pdf", "%PDF-NOC"), "NOC from Site Owner");
  saveDocument("REQ-2024-202", "space-id-proof", makeFile("GST_Skyline.pdf", "%PDF-GST"), "GST Certificate");
  saveDocument("REQ-2024-202", "space-work-order", makeFile("Work_Order.pdf", "%PDF-WO"), "Work Order");
  saveDocument("REQ-2024-202", "load-document", makeFile("Load_Calculation.xlsx", "load,xlsx,data", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), "Load Document");

  // REQ-2024-204 — Water Existing Meter (Aquaflow)
  saveDocument("REQ-2024-204", "space-noc", makeFile("NOC_Aquaflow.pdf", "%PDF-NOC"), "NOC from Landlord");
  saveDocument("REQ-2024-204", "space-id-proof", makeFile("PAN_Aquaflow.pdf", "%PDF-PAN"), "Company PAN");
  saveDocument("REQ-2024-204", "space-meter-photo", makeFile("Existing_Meter_Photo.jpg", "imgdata", "image/jpeg"), "Existing Meter Photo");

  // REQ-2024-205 — Water New Meter (GreenLeaf) – calibration cert uploaded
  saveDocument("REQ-2024-205", "space-noc", makeFile("NOC_GreenLeaf.pdf", "%PDF-NOC"), "NOC from Landlord");
  saveDocument("REQ-2024-205", "space-id-proof", makeFile("FSSAI_GreenLeaf.pdf", "%PDF-FSSAI"), "FSSAI Licence");
  saveDocument("REQ-2024-205", "space-auth-letter", makeFile("Authorisation_Letter.pdf", "%PDF-AUTH"), "Authorisation Letter");
  saveDocument("REQ-2024-205", "Upload Domestic Meter Certificate-domestic_calibration_cert", makeFile("Domestic_Calibration.pdf", "%PDF-CAL"), "Upload Domestic Meter Certificate – domestic_calibration_cert");
  saveDocument("REQ-2024-205", "Upload Flushing Meter Certificate-flushing_calibration_cert", makeFile("Flushing_Calibration.pdf", "%PDF-CAL"), "Upload Flushing Meter Certificate – flushing_calibration_cert");
  saveDocument("REQ-2024-205", "Upload RO Meter Certificate-ro_calibration_cert", makeFile("RO_Calibration.pdf", "%PDF-CAL"), "Upload RO Meter Certificate – ro_calibration_cert");
}
