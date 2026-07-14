  /**
 * Processes the inquiry form data, generates a PDF, and saves/updates data in the Google Sheet.
 * This function handles both new inquiries and updates to existing Aadhar records.
 *
 * @param {Object} formData The form data submitted from the HTML client.
 * @returns {Object} A success or error response object.
 */
function InquiryProcessForm(formData) {
  console.log("InquiryProcessForm: Processing form...");

  const userIdForAudit = formData.loggedInUserId || "Anonymous";
  const ss = SpreadsheetApp.getActiveSpreadsheet(); // Assuming active spreadsheet is the one containing all sheets

  // 1. PDF Folder Setup - TEMPORARILY DISABLED
  // let pdfFolder;
  // try {
  //   pdfFolder = DriveApp.getFolderById(CONFIG.ADMISSIONS_PDF_FOLDER_ID);
  // } catch (e) {
  //   console.error("InquiryProcessForm: PDF folder access error:", e);
  //   createAuditLogEntry("PDF Folder Access Error", userIdForAudit, {
  //     error: e.message,
  //     formDataSummary: {
  //       aadharNumber: formData.aadharNumber,
  //       fullName: formData.fullName,
  //       email: formData.email
  //     }
  //   });
  //   return {
  //     success: false,
  //     message: "Cannot access PDF folder. Please check configuration.",
  //     error: e.message
  //   };
  // }

  // 2. Get the Inquiry Sheet (DF)
  const dfSheet = ss.getSheetByName(CONFIG.INQUIRY_SHEET_NAME);
  if (!dfSheet) {
    console.error("InquiryProcessForm: DF sheet not found.");
    createAuditLogEntry("Sheet Not Found Error", userIdForAudit, {
      reason: `Sheet '${CONFIG.INQUIRY_SHEET_NAME}' missing.`,
      formDataSummary: {
        aadharNumber: formData.aadharNumber,
        fullName: formData.fullName
      }
    });
    return {
      success: false,
      message: `Inquiry sheet '${CONFIG.INQUIRY_SHEET_NAME}' not found.`
    };
  }

  // Combine names for fullName display in PDF and sheet
  // This correctly aggregates firstName, middleName, lastName from the client.
  formData.fullName = [
    formData.firstName,
    formData.middleName,
    formData.lastName
  ].filter(Boolean).join(" ");

  // Combine address for display in PDF and sheet
  // This correctly aggregates addressLine1, addressLine2, pincode from the client.
  formData.address = [
    formData.addressLine1,
    formData.addressLine2,
    `Pincode: ${formData.pincode}`
  ].filter(Boolean).join(", ");


  // 3. HTML Template Processing for PDF
  let htmlContent;
  try {
    const template = HtmlService.createTemplateFromFile("ifrom");
    
    // Pass all formData properties to the template
    Object.keys(formData).forEach(key => {
      template[key] = formData[key] || ''; // Pass data to the template, ensuring no undefined values
    });

    htmlContent = template.evaluate().getContent();

  } catch (e) {
    console.error("InquiryProcessForm: HTML template error:", e);
    createAuditLogEntry("HTML Template Error", userIdForAudit, {
      error: e.message,
      formDataSummary: {
        aadharNumber: formData.aadharNumber,
        fullName: formData.fullName
      }
    });
    return {
      success: false,
      message: "Failed to process HTML template for PDF."
    };
  }

  // 4. PDF Generation - TEMPORARILY DISABLED
  // let pdfBlob;
  // try {
  //   pdfBlob = Utilities.newBlob(htmlContent, 'text/html')
  //     .getAs('application/pdf')
  //     .setName(`Inquiry_Form_${formData.fullName.replace(/ /g, '_')}_${new Date().getTime()}.pdf`);
  //   pdfFolder.createFile(pdfBlob);
  //   console.log("InquiryProcessForm: PDF generated and saved.");
  // } catch (e) {
  //   console.error("InquiryProcessForm: PDF conversion error:", e);
  //   createAuditLogEntry("PDF Conversion Error", userIdForAudit, {
  //     error: e.message,
  //     formDataSummary: {
  //       aadharNumber: formData.aadharNumber,
  //       fullName: formData.fullName
  //     }
  //   });
  //   return {
  //     success: false,
  //     message: "PDF generation failed."
  //   };
  // }

  // 5. Data Validation and Sheet Update/Append
  try {
    const requiredFields = [
      "aadharNumber", "fullName", "qualification", "phoneNo", "whatsappNo",
      "parentsNo", "age", "addressLine1", "pincode", "gender", // pincode and gender are included here, good.
      "interestedCourse", "inquiryTakenBy", "branch"
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      createAuditLogEntry("Form Validation Failed", userIdForAudit, {
        reason: `Missing required fields: ${missingFields.join(", ")}`,
        formDataSummary: {
          aadharNumber: formData.aadharNumber,
          fullName: formData.fullName
        }
      });
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      };
    }

    // Prepare row data array based on CONFIG.INQUIRY_COLUMN_INDEX
    const rowData = [];
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.DATE_FORM] = formData.date;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.AADHAAR] = formData.aadharNumber;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.FULL_NAME] = formData.fullName; // Storing combined full name
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.QUALIFICATION] = formData.qualification;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.PHONE_NUMBER] = formData.phoneNo;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.WHATSAPP_NUMBER] = formData.whatsappNo;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.PARENTS_NUMBER] = formData.parentsNo;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.EMAIL_ADDRESS] = formData.email;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.AGE] = formData.age;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.ADDRESS] = formData.address; // Storing combined address string
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.INTERESTED_COURSE] = formData.interestedCourse;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.INQUIRY_TAKEN_BY] = formData.inquiryTakenBy;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.BRANCH] = formData.branch;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.FOLLOW_UP_DATE] = "";
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.NOTES] = "";
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.ADMISSION_STATUS] = "";
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.ADMISSION_DATE] = "";
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.BATCH_ASSIGNED] = "";
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.LOGGED_IN_USER_ID] = userIdForAudit;
    rowData[CONFIG.INQUIRY_COLUMN_INDEX.GENDER] = formData.gender; // Correctly added gender to rowData

    const maxColumnIndex = Math.max(...Object.values(CONFIG.INQUIRY_COLUMN_INDEX));
    for (let i = 0; i <= maxColumnIndex; i++) {
      if (rowData[i] === undefined) {
        rowData[i] = "";
      }
    }

    const existingRecordInfo = findAadharRecord(formData.aadharNumber, dfSheet);
    let message = "";

    if (existingRecordInfo) {
      const rowToUpdate = existingRecordInfo.rowIndex + 1;
      const existingRowData = dfSheet.getRange(rowToUpdate, 1, 1, dfSheet.getLastColumn()).getValues()[0];

      // This logic correctly updates only the fields provided by the form,
      // preserving other sheet columns like follow-up dates, etc.
      rowData.forEach((value, index) => {
        if (value !== undefined && value !== "") {
          // Update the corresponding column in existing row (add 1 to account for timestamp column)
          existingRowData[index + 1] = value;
        }
      });
      existingRowData[0] = new Date(); // Update timestamp for modification

      dfSheet.getRange(rowToUpdate, 1, 1, existingRowData.length).setValues([existingRowData]);
      message = "Aadhar record updated successfully!";
      createAuditLogEntry("Inquiry Form Update", userIdForAudit, {
        aadharNumber: formData.aadharNumber,
        fullName: formData.fullName,
        row: rowToUpdate
      });
    } else {
      // Create a properly structured row with timestamp first, then all data
      const newRowData = [new Date()];
      // Add each field in the correct order based on column indices
      for (let i = 0; i <= maxColumnIndex; i++) {
        newRowData.push(rowData[i] || "");
      }
      dfSheet.appendRow(newRowData);
      message = "New Aadhar record added successfully!";
      createAuditLogEntry("Inquiry Form Submission", userIdForAudit, {
        aadharNumber: formData.aadharNumber,
        fullName: formData.fullName
      });
    }

    return {
      success: true,
      message: message,
      studentName: formData.fullName
    };

  } catch (e) {
    console.error("InquiryProcessForm: Final write error:", e);
    createAuditLogEntry("Process Form Error", userIdForAudit, {
      error: e.message,
      formDataSummary: {
        aadharNumber: formData.aadharNumber,
        fullName: formData.fullName
      }
    });
    return {
      success: false,
      message: "Failed to save/update data in the sheet.",
      error: e.message
    };
  }
}

/**
 * Checks if an Aadhar number exists in the Inquiry (DF) sheet.
 * This function is called by the frontend on Aadhar input blur.
 *
 * @param {string} aadharNumber The Aadhar number to check.
 * @returns {Object|null} The record object if found, otherwise null.
 */
function checkAadharNumberInquiry(aadharNumber) {
  console.log(`checkAadharNumberInquiry: Checking Aadhar: ${aadharNumber}`);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dfSheet = ss.getSheetByName(CONFIG.AADHAAR_LOOKUP.SHEET_NAME);

  if (!dfSheet) {
    console.error(`checkAadharNumberInquiry: Sheet '${CONFIG.AADHAAR_LOOKUP.SHEET_NAME}' not found.`);
    throw new Error(`Sheet '${CONFIG.AADHAAR_LOOKUP.SHEET_NAME}' not found.`);
  }

  const data = dfSheet.getDataRange().getValues();
  if (data.length <= 1 && data[0][CONFIG.AADHAAR_LOOKUP.AADHAAR_COL] !== "Aadhar") {
      console.log("checkAadharNumberInquiry: Sheet is empty or only has headers.");
      return null;
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[CONFIG.AADHAAR_LOOKUP.AADHAAR_COL] || '').trim() === aadharNumber) {
      console.log(`checkAadharNumberInquiry: Aadhar found at row index: ${i}`);

      // Crucial: Ensure address is a string before splitting. This was the source of the TypeError.
      const fullAddressFromSheet = String(row[CONFIG.AADHAAR_LOOKUP.ADDRESS_COL] || '').trim();
      let addressLine1 = '';
      let addressLine2 = '';
      let addressLine3 = '';
      let pincode = '';

      if (fullAddressFromSheet) {
          const parts = fullAddressFromSheet.split(',').map(p => p.trim());

          addressLine1 = parts[0] || '';
          if (parts.length > 1) {
              addressLine2 = parts[1] || '';
          }
          if (parts.length > 2) { // Only assign addressLine3 if there are at least 3 parts
              addressLine3 = parts[2] || '';
          }

          const pincodeMatch = fullAddressFromSheet.match(/Pincode:\s*(\d{6})\b/);
          if (pincodeMatch && pincodeMatch[1]) {
              pincode = pincodeMatch[1];
          } else {
              const lastPart = parts[parts.length - 1] || '';
              const simplePincodeMatch = lastPart.match(/\b(\d{6})\b/);
              if (simplePincodeMatch && simplePincodeMatch[1]) {
                  pincode = simplePincodeMatch[1];
              }
          }
      }

      // Return individual address lines and pincode for client-side population.
      return {
        rowIndex: i,
        aadhaar: String(row[CONFIG.AADHAAR_LOOKUP.AADHAAR_COL]).trim(),
        fullName: String(row[CONFIG.AADHAAR_LOOKUP.FULL_NAME_COL]).trim(),
        qualification: String(row[CONFIG.AADHAAR_LOOKUP.QUALIFICATION_COL]).trim(),
        phoneNumber: String(row[CONFIG.AADHAAR_LOOKUP.PHONE_NUMBER_COL]).trim(),
        phoneNo: String(row[CONFIG.AADHAAR_LOOKUP.PHONE_NUMBER_COL]).trim(),
        whatsappNumber: String(row[CONFIG.AADHAAR_LOOKUP.WHATSAPP_NUMBER_COL]).trim(),
        whatsappNo: String(row[CONFIG.AADHAAR_LOOKUP.WHATSAPP_NUMBER_COL]).trim(),
        parentsNumber: String(row[CONFIG.AADHAAR_LOOKUP.PARENTS_NUMBER_COL]).trim(),
        parentsNo: String(row[CONFIG.AADHAAR_LOOKUP.PARENTS_NUMBER_COL]).trim(),
        emailAddress: String(row[CONFIG.AADHAAR_LOOKUP.EMAIL_ADDRESS_COL]).trim(),
        email: String(row[CONFIG.AADHAAR_LOOKUP.EMAIL_ADDRESS_COL]).trim(),
        age: String(row[CONFIG.AADHAAR_LOOKUP.AGE_COL]).trim(),
        addressLine1: addressLine1,
        addressLine2: addressLine2,
        addressLine3: addressLine3,
        pincode: pincode,
        interestedCourse: String(row[CONFIG.AADHAAR_LOOKUP.INTERESTED_COURSE_COL]).trim(),
        inquiryTakenBy: String(row[CONFIG.AADHAAR_LOOKUP.INQUIRY_TAKEN_BY_COL]).trim(),
        branch: String(row[CONFIG.AADHAAR_LOOKUP.BRANCH_COL]).trim(),
        gender: String(row[CONFIG.AADHAAR_LOOKUP.GENDER_COL]).trim()
      };
    }
  }
  console.log(`checkAadharNumberInquiry: Aadhar ${aadharNumber} not found.`);
  return null;
}

/**
 * Helper function to find an Aadhar record and its row index.
 * Used internally by InquiryProcessForm to avoid redundant sheet reads.
 *
 * @param {string} aadharNumber The Aadhar number to find.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to search in.
 * @returns {Object|null} An object containing the record data and its 0-based row index, or null if not found.
 */
function findAadharRecord(aadharNumber, sheet) {
  const data = sheet.getDataRange().getValues();
  const aadharColIndex = CONFIG.AADHAAR_LOOKUP.AADHAAR_COL;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][aadharColIndex] || '').trim() === aadharNumber) {
      const record = {};
      // These are mapped directly as stored in the sheet.
      // The `checkAadharNumberInquiry` handles the parsing for the frontend.
      record.aadhaar = String(data[i][CONFIG.AADHAAR_LOOKUP.AADHAAR_COL]).trim();
      record.fullName = String(data[i][CONFIG.AADHAAR_LOOKUP.FULL_NAME_COL]).trim();
      record.qualification = String(data[i][CONFIG.AADHAAR_LOOKUP.QUALIFICATION_COL]).trim();
      record.phoneNumber = String(data[i][CONFIG.AADHAAR_LOOKUP.PHONE_NUMBER_COL]).trim();
      record.whatsappNumber = String(data[i][CONFIG.AADHAAR_LOOKUP.WHATSAPP_NUMBER_COL]).trim();
      record.parentsNumber = String(data[i][CONFIG.AADHAAR_LOOKUP.PARENTS_NUMBER_COL]).trim();
      record.emailAddress = String(data[i][CONFIG.AADHAAR_LOOKUP.EMAIL_ADDRESS_COL]).trim();
      record.age = String(data[i][CONFIG.AADHAAR_LOOKUP.AGE_COL]).trim();
      record.address = String(data[i][CONFIG.AADHAAR_LOOKUP.ADDRESS_COL]).trim();
      record.interestedCourse = String(data[i][CONFIG.AADHAAR_LOOKUP.INTERESTED_COURSE_COL]).trim();
      record.inquiryTakenBy = String(data[i][CONFIG.AADHAAR_LOOKUP.INQUIRY_TAKEN_BY_COL]).trim();
      record.branch = String(data[i][CONFIG.AADHAAR_LOOKUP.BRANCH_COL]).trim();
      record.gender = String(data[i][CONFIG.AADHAAR_LOOKUP.GENDER_COL]).trim();

      return { record: record, rowIndex: i };
    }
  }
  return null;
}

// Helper function for audit logging (make sure this is defined)

// function createAuditLogEntry(eventType, userId, details) {
//   const ss = SpreadsheetApp.getActiveSpreadsheet();
//   const auditSheet = ss.getSheetByName(CONFIG.AUDIT_LOG_SHEET_NAME);
//   if (auditSheet) {
//     auditSheet.appendRow([new Date(), eventType, userId, JSON.stringify(details)]);
//   } else {
//     console.error(`Audit log sheet '${CONFIG.AUDIT_LOG_SHEET_NAME}' not found. Audit entry not logged.`);
//   }
// }
