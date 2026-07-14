/************************************************
 * MAIN HTML ENTRY POINT
 ************************************************/

var ss = SpreadsheetApp.getActiveSpreadsheet();
//Heloooo// i am yoooo// i am hitanshu // yooo again //Heloooo// i am yoooo ///sdjkbfjusf


function doGet(e) {
  try {
    return HtmlService.createTemplateFromFile("index").evaluate();
  } catch (error) {
    // Return error message for debugging
    return HtmlService
      .createHtmlOutput("Script error: " + error.toString())
      .setTitle("Error");
  }
}

/************************************************
 * HELPER: Include other .html files if needed
 ************************************************/
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).getRawContent();
}


// function loginUser(loginData) {
//   try {
   
   
//     var sheet = ss.getSheetByName(CONFIG.LOGIN_SHEET_NAME);
//     if (!sheet) return { success: false, error: "LOGIN sheet not found." };

//     var data = sheet.getDataRange().getValues();
    
//     for (var i = 1; i < data.length; i++) {
//       var username = String(data[i][0]).trim();
//       var password = String(data[i][1]).trim();
//       var role = (data[i][2] || "").toString().toLowerCase().trim();
//       var branch = String(data[i][3]).trim();

//       if (username === loginData.username && password === loginData.password) {
//         //  Save session data
//         PropertiesService.getUserProperties().setProperty("loggedInUser", username);
//           createAuditLogEntry("Login Success", username);
//         return {
//   success: true,
//   userName: username,
//   role: role,
//   branch: branch,
//   userId: username   // ✅ This is the ID passed to frontend
// };
//       }
//     }

//     return { success: false, error: "Invalid username or password." };
//   } catch (err) {
//     return { success: false, error: err.toString() };
//   }
// }
function loginUser(loginData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("LOGIN");
    if (!sheet) return { success: false, error: "LOGIN sheet not found." };

    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      var username = String(data[i][0]).trim();
      var password = String(data[i][1]).trim();
      var role = (data[i][2] || "").toString().toLowerCase().trim();
      var branch = String(data[i][3]).trim();

      if (username === loginData.username && password === loginData.password) {
        // Save session data
        PropertiesService.getUserProperties().setProperty("loggedInUser", username);
        createAuditLogEntry("Login Success", username);
        
        return {
          success: true,
          userName: username,
          role: role,
          branch: branch,
          loggedInUserId: username  // This is the key change - using the correct property name
        };
      }
    }

    return { success: false, error: "Invalid username or password." };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
function getInquiryAnalyticsData() {
  try {
    var sheet = ss.getSheetByName("INQUIRY FORM");
    if (!sheet) {
      return { error: "INQUIRY FORM sheet not found" };
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { data: [], summary: { totalRecords: 0, uniqueCourses: 0, topCourse: "-" } };
    }

    var headers = data[0];
    var resultData = [];
    var courseCounts = {};

    // Find column indices
    var dateIdx = headers.indexOf("Date");
    var aadhaarIdx = headers.indexOf("Aadhaar");
    var fullNameIdx = headers.indexOf("Full Name");
    var qualificationIdx = headers.indexOf("Qualification");
    var phoneIdx = headers.indexOf("Phone");
    var whatsappIdx = headers.indexOf("WhatsApp");
    var parentsNumberIdx = headers.indexOf("Parents Number");
    var emailIdx = headers.indexOf("Email");
    var ageIdx = headers.indexOf("Age");
    var addressIdx = headers.indexOf("Address");
    var interestedCourseIdx = headers.indexOf("Interested Course");
    var inquiryTakenByIdx = headers.indexOf("Inquiry Taken By");
    var branchIdx = headers.indexOf("Branch");

    // Process data rows (start from row 1, but remember row numbers start from 1 in sheets)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var course = (row[interestedCourseIdx] || "").toString().trim();
      
      if (course) {
        courseCounts[course] = (courseCounts[course] || 0) + 1;
      }

      var rowData = {
        rowNumber: i + 1, // This is the actual row number in the sheet
        date: row[dateIdx] ? Utilities.formatDate(row[dateIdx], Session.getScriptTimeZone(), "yyyy-MM-dd") : "",
        aadhaar: row[aadhaarIdx] || "",
        fullName: row[fullNameIdx] || "",
        qualification: row[qualificationIdx] || "",
        phone: row[phoneIdx] || "",
        whatsapp: row[whatsappIdx] || "",
        parentsNumber: row[parentsNumberIdx] || "",
        email: row[emailIdx] || "",
        age: row[ageIdx] || "",
        address: row[addressIdx] || "",
        interestedCourse: course,
        inquiryTakenBy: row[inquiryTakenByIdx] || "",
        branch: row[branchIdx] || ""
      };
      
      resultData.push(rowData);
    }

    var topCourse = Object.keys(courseCounts).length > 0 
      ? Object.keys(courseCounts).reduce((a, b) => courseCounts[a] > courseCounts[b] ? a : b, "") 
      : "-";

    var summary = {
      totalRecords: resultData.length,
      uniqueCourses: Object.keys(courseCounts).length,
      topCourse: topCourse
    };

    return {
      data: resultData,
      summary: summary
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

/************************************************
 * DROPDOWN: Get dynamic data (sessions, trades, fees types, payment modes)
 ************************************************/
function getDropdownData() {
  try {
    
    var sheet = ss.getSheetByName(CONFIG.DROPDOWN_SHEET_NAME);
    if (!sheet) return { error: "DROPDOWN sheet not found." };

    var data = sheet.getDataRange().getValues();
    // We assume columns:
    // A -> session, B -> trade, C -> feesType, D -> paymentMode
    var sessionSet = {};
    var tradeSet = {};
    var feesTypeSet = {};
    var paymentModeSet = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var sVal = String(row[0] || "").trim();
      var tVal = String(row[1] || "").trim();
      var fVal = String(row[2] || "").trim();
      var pVal = String(row[3] || "").trim();

      if (sVal) sessionSet[sVal] = true;
      if (tVal) tradeSet[tVal] = true;
      if (fVal) feesTypeSet[fVal] = true;
      if (pVal) paymentModeSet[pVal] = true;
    }

    return {
      sessions: Object.keys(sessionSet).sort(),
      trades: Object.keys(tradeSet).sort(),
      feesTypes: Object.keys(feesTypeSet).sort(),
      paymentModes: Object.keys(paymentModeSet).sort(),
    };
  } catch (err) {
    return { error: err.toString() };
  }
}

/************************************************
 * AUTO-INCREMENT STUDENT ID
 ************************************************/
function getNextStudentId() {
  // We'll parse the STUDENT DATA sheet, find the highest ID that matches ST###, increment
  
  var sheet = ss.getSheetByName(CONFIG.STUDENT_DATA_SHEET_NAME);
  if (!sheet) return { error: "STUDENT DATA sheet not found." };

  var data = sheet.getDataRange().getValues();
  // We'll track something like ST###
  var maxNum = 0;
  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][0] || "").trim(); // column A -> studentId
    var match = id.match(/^ST(\d+)$/i);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  var nextNum = maxNum + 1;
  var nextId = "ST" + String(nextNum).padStart(3, "0"); // e.g. ST001
  return { nextId: nextId };
}

/************************************************
 * AUTO-INCREMENT TRANSACTION ID
 ************************************************/
function getNextTransactionId() {

  var sheet = ss.getSheetByName(CONFIG.FEES_SHEET_NAME);
  if (!sheet) return { error: "FEES sheet not found." };

  var data = sheet.getDataRange().getValues();
  // We'll parse TXN###
  var maxNum = 0;
  for (var i = 1; i < data.length; i++) {
    var txn = String(data[i][4] || "").trim(); // column E -> transactionId
    var match = txn.match(/^TXN(\d+)$/i);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  var nextNum = maxNum + 1;
  var nextId = "TXN" + String(nextNum).padStart(3, "0"); // e.g. TXN001
  return { nextTxn: nextId };
}

/************************************************
 * FEES: SUBMIT / UPDATE / GET
 ************************************************/
function submitData(formData) {
  try {

    var sheet = ss.getSheetByName(CONFIG.FEES_SHEET_NAME);
    if (!sheet) return "Error: FEES sheet not found.";

    var data = sheet.getDataRange().getValues();
    var sId = formData.studentId.trim();
    var sMonth = (formData.month || "").trim();

    // Check if fees is already paid for the same studentId + month
    for (var i = 1; i < data.length; i++) {
      var rowId = String(data[i][0] || "").trim();
      var rowMonth = String(data[i][2] || "").trim();
      if (rowId === sId && rowMonth === sMonth) {
        return "Error: Fee for this month (" + sMonth + ") is already paid!";
      }
    }

    // If transactionId empty, get next
    var txnId = formData.transactionId.trim();
    if (!txnId) {
      // auto generate
      var nextObj = getNextTransactionId();
      if (nextObj.error) return "Error: " + nextObj.error;
      txnId = nextObj.nextTxn;
    }

    // Append row
    // FEES columns: A->studentId, B->date, C->month, D->session, E->txnId, F->trade, G->studentName,
    // H->fatherName, I->paidAmount, J->paidAmountInWord, K->feesType, L->paymentMode, M->remark, N->userName
    var rowData = [
      sId,
      formData.date,
      sMonth,
      formData.session,
      txnId,
      formData.trade,
      formData.studentName,
      formData.fatherName,
      formData.paidAmount,
      formData.paidAmountInWord,
      formData.feesType,
      formData.paymentMode,
      formData.remark,
      formData.userName,
    ];
    sheet.appendRow(rowData);

    return "Data submitted successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

/************************************************
 * Inquiry Form: SUBMIT
 ************************************************/
function submitInquiryData(formData2) {
  try {

    var sheet = ss.getSheetByName("INQUIRY FORM");
    if (!sheet) return "Error: Inquiries sheet not found.";

    var data = sheet.getDataRange().getValues();
    var phoneNo = formData2.phoneNo.trim();

    // Check if inquiry already exists with same phone number
    for (var i = 1; i < data.length; i++) {
      var rowPhone = String(data[i][4] || "").trim();
      if (rowPhone === phoneNo) {
        return "Error: Inquiry with this phone number already exists!";
      }
    }

    // Prepare row data
    // Inquiries columns:
    // A->Timestamp, B->Date, C->FullName, D->Qualification, E->PhoneNo,
    // F->WhatsAppNo, G->ParentsNo, H->Email, I->Age, J->Address,
    // K->InterestedCourse, L->InquiryTakenBy, M->Status, N->FollowUpDate,
    // O->Notes, P->AdmissionStatus, Q->AdmissionDate, R->BatchAssigned
    var rowData = [
      new Date(), // Timestamp
      formData2.date, // Date
      formData2.fullName, // Full Name
      formData2.qualification, // Qualification
      phoneNo, // Phone
      formData2.whatsappNo || "", // WhatsApp
      formData2.parentsNo || "", // Parents No
      formData2.email || "", // Email
      formData2.age, // Age
      formData2.address, // Address
      formData2.interestedCourse, // Interested Course
      formData2.inquiryTakenBy,
      formData2.branch, // Inquiry Taken By
      "New Inquiry", // Status
      "", // Follow-up Date
      "", // Notes
      "Not Admitted", // Admission Status
      "", // Admission Date
      "", // Batch Assigned
    ];

    sheet.appendRow(rowData);
    return "Inquiry submitted successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}
/**
 * Admin-only: Update existing fee row
 */
function updateData(formData, userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return "Error: You don't have permission to update fee data.";
  }
  try {

    var sheet = ss.getSheetByName(CONFIG.FEES_SHEET_NAME);
    if (!sheet) return "Error: FEES sheet not found.";

    var rowNumber = parseInt(formData.recordRowNumber, 10);
    var sId = formData.studentId.trim();
    var sMonth = (formData.month || "").trim();

    // Check duplicates except the row being updated
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (i + 1 === rowNumber) continue;
      var rowId = String(data[i][0] || "").trim();
      var rowMonth = String(data[i][2] || "").trim();
      if (rowId === sId && rowMonth === sMonth) {
        return "Error: Fee for this month (" + sMonth + ") is already paid!";
      }
    }

    // If transactionId empty => auto generate
    var txnId = formData.transactionId.trim();
    if (!txnId) {
      var nextObj = getNextTransactionId();
      if (nextObj.error) return "Error: " + nextObj.error;
      txnId = nextObj.nextTxn;
    }

    var updatedValues = [
      sId,
      formData.date,
      sMonth,
      formData.session,
      txnId,
      formData.trade,
      formData.studentName,
      formData.fatherName,
      formData.paidAmount,
      formData.paidAmountInWord,
      formData.feesType,
      formData.paymentMode,
      formData.remark,
      formData.userName,
    ];
    sheet
      .getRange(rowNumber, 1, 1, updatedValues.length)
      .setValues([updatedValues]);
    return "Data updated successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function getStudentSession(studentId) {
  try {

    var sheet = ss.getSheetByName(CONFIG.STUDENT_DATA_SHEET_NAME);
    if (!sheet) return { error: "STUDENT DATA sheet not found." };

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(studentId).trim()) {
        return {
          session: data[i][1] || "",
          studentName: data[i][2] || "",
          fatherName: data[i][3] || "",
          instituteName: data[i][4] || "",
          trade: data[i][5] || "",
          className: data[i][6] || "",
        };
      }
    }
    return {
      session: "",
      studentName: "",
      fatherName: "",
      instituteName: "",
      trade: "",
      className: "",
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

function getOldFees(studentId) {
  try {

    var sheet = ss.getSheetByName(CONFIG.FEES_SHEET_NAME);
    if (!sheet) return { error: "FEES sheet not found." };

    var data = sheet.getDataRange().getValues();
    var records = [];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(studentId).trim()) {
        var dateVal = data[i][1];
        var dateStr =
          dateVal instanceof Date
            ? Utilities.formatDate(
                dateVal,
                Session.getScriptTimeZone(),
                "yyyy-MM-dd"
              )
            : String(dateVal).trim();
        records.push({
          row: i + 1,
          studentId: data[i][0],
          date: dateStr,
          month: data[i][2],
          session: data[i][3],
          transactionId: data[i][4],
          trade: data[i][5],
          studentName: data[i][6],
          fatherName: data[i][7],
          paidAmount: data[i][8],
        });
      }
    }
    return records;
  } catch (error) {
    return { error: error.toString() };
  }
}

function getRecord(rowNumber) {
  try {
    
    var sheet = ss.getSheetByName("FEES");
    if (!sheet) return { error: "FEES sheet not found." };

    var row = sheet
      .getRange(rowNumber, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    if (row[1] instanceof Date) {
      row[1] = Utilities.formatDate(
        row[1],
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
      );
    }
    return { values: row };
  } catch (error) {
    return { error: error.toString() };
  }
}

/************************************************
 * STUDENT DATA: ADD / UPDATE / DELETE
 ************************************************/
function addStudentData(studentData, userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return "Error: You don't have permission to add new student data.";
  }
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return "Error: STUDENT DATA sheet not found.";

    // If studentId is empty => auto-generate
    var sId = studentData.studentId.trim();
    if (!sId) {
      var nextObj = getNextStudentId();
      if (nextObj.error) return "Error: " + nextObj.error;
      sId = nextObj.nextId; // e.g. ST003
    }

    // STUDENT DATA columns:
    // 0->studentId, 1->session, 2->studentName, 3->fatherName,
    // 4->instituteName, 5->trade, 6->class, 7->totalFees
    var newRow = [
      sId,
      studentData.session,
      studentData.studentName,
      studentData.fatherName,
      studentData.instituteName,
      studentData.trade,
      studentData.className,
      studentData.totalFees,
    ];
    sheet.appendRow(newRow);
    return "Student added successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function getStudentList() {
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return { error: "STUDENT DATA sheet not found." };

    var data = sheet.getDataRange().getValues();
    var students = [];
    for (var i = 1; i < data.length; i++) {
      students.push({
        row: i + 1,
        studentId: data[i][0],
        session: data[i][1],
        studentName: data[i][2],
        fatherName: data[i][3],
        instituteName: data[i][4],
        trade: data[i][5],
        className: data[i][6],
        totalFees: data[i][7],
      });
    }
    return students;
  } catch (error) {
    return { error: error.toString() };
  }
}

function updateStudentData(studentData, userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return "Error: You don't have permission to update student data.";
  }
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return "Error: STUDENT DATA sheet not found.";

    var rowNumber = parseInt(studentData.row, 10);

    // If user cleared Student ID => re-generate or keep the old? Typically we keep old ID.
    var sId = studentData.studentId.trim();
    if (!sId) {
      var nextObj = getNextStudentId();
      if (nextObj.error) return "Error: " + nextObj.error;
      sId = nextObj.nextId;
    }

    var updatedValues = [
      sId,
      studentData.session,
      studentData.studentName,
      studentData.fatherName,
      studentData.instituteName,
      studentData.trade,
      studentData.className,
      studentData.totalFees,
    ];
    sheet
      .getRange(rowNumber, 1, 1, updatedValues.length)
      .setValues([updatedValues]);
    return "Student updated successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function deleteStudentData(rowNumber, userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return "Error: You don't have permission to delete student data.";
  }
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return "Error: STUDENT DATA sheet not found.";

    sheet.deleteRow(rowNumber);
    return "Student deleted successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

/************************************************
 * ANALYTICS (ADMIN ONLY), with optional date range
 ************************************************/
function getAnalyticsData(
  monthFilter,
  feesTypeFilter,
  paymentModeFilter,
  dateFrom,
  dateTo,
  userRole
) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return { error: "You don't have permission to view analytics." };
  }

  var analytics = {
    totalPaidFees: 0,
    totalUnpaidFees: 0,
    totalStudents: 0,
    paidStudentsCount: 0,
    unpaidStudentsCount: 0,
    dateWisePaid: {},
    pieData: { paid: 0, unpaid: 0 },
    lineData: {},
  };

  
  var sheetStudents = ss.getSheetByName("STUDENT DATA");
  var sheetFees = ss.getSheetByName("FEES");
  if (!sheetStudents || !sheetFees) {
    return { error: "Sheets not found. Check STUDENT DATA or FEES." };
  }
  var dataStudents = sheetStudents.getDataRange().getValues();
  var dataFees = sheetFees.getDataRange().getValues();

  // Convert dateFrom/dateTo to actual Dates if provided
  var fromDate = null,
    toDate = null;
  if (dateFrom) {
    fromDate = new Date(dateFrom + "T00:00:00"); // parse
  }
  if (dateTo) {
    toDate = new Date(dateTo + "T23:59:59");
  }

  // Build a student map
  var studentMap = {};
  for (var i = 1; i < dataStudents.length; i++) {
    var sId = String(dataStudents[i][0]).trim();
    var sTotal = parseFloat(dataStudents[i][7]) || 0;
    studentMap[sId] = { totalFees: sTotal, sumPaid: 0, hasPaidRow: false };
  }

  for (var j = 1; j < dataFees.length; j++) {
    var row = dataFees[j];
    var feeStudentId = String(row[0] || "").trim();
    var feeDateVal = row[1];
    var feeMonth = String(row[2] || "").trim();
    var feeType = String(row[10] || "").trim();
    var feePayMode = String(row[11] || "").trim();
    var paidAmount = parseFloat(row[8]) || 0;

    // date range check
    if (fromDate || toDate) {
      var actualDate =
        feeDateVal instanceof Date
          ? feeDateVal
          : new Date(feeDateVal + "T00:00:00");
      if (fromDate && actualDate < fromDate) continue;
      if (toDate && actualDate > toDate) continue;
    }
    // month filter
    if (monthFilter && feeMonth !== monthFilter) continue;
    // feesType filter
    if (feesTypeFilter && feeType !== feesTypeFilter) continue;
    // paymentMode filter
    if (paymentModeFilter && feePayMode !== paymentModeFilter) continue;

    if (!isNaN(paidAmount) && paidAmount > 0) {
      analytics.totalPaidFees += paidAmount;

      // accumulate dateWise
      var dateStr =
        feeDateVal instanceof Date
          ? Utilities.formatDate(
              feeDateVal,
              Session.getScriptTimeZone(),
              "yyyy-MM-dd"
            )
          : String(feeDateVal).trim();

      if (!analytics.dateWisePaid[dateStr]) {
        analytics.dateWisePaid[dateStr] = 0;
      }
      analytics.dateWisePaid[dateStr] += paidAmount;
    }

    if (studentMap[feeStudentId]) {
      studentMap[feeStudentId].sumPaid += paidAmount;
      studentMap[feeStudentId].hasPaidRow = true;
    }
  }

  analytics.totalStudents = Object.keys(studentMap).length;
  var sumUnpaid = 0;
  for (var sid in studentMap) {
    var st = studentMap[sid];
    if (st.hasPaidRow) {
      analytics.paidStudentsCount++;
    } else {
      analytics.unpaidStudentsCount++;
      sumUnpaid += st.totalFees;
    }
  }
  analytics.totalUnpaidFees = sumUnpaid;
  analytics.pieData.paid = analytics.totalPaidFees;
  analytics.pieData.unpaid = analytics.totalUnpaidFees;
  analytics.lineData = analytics.dateWisePaid;

  return analytics;
}





/************************************************
 Getting Admission Data
 ************************************************/


function getAnalyticsData2(
  monthFilter,
  feesTypeFilter,
  paymentModeFilter,
  dateFrom,
  dateTo,
  userRole
) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return { error: "You don't have permission to view analytics." };
  }

  var analytics = {
    totalPaidFees2: 0,
    totalUnpaidFees2: 0,
    totalStudents2: 0,
    paidStudentsCount2: 0,
    unpaidStudentsCount2: 0,
    dateWisePaid2: {},
    pieData2: { paid: 0, unpaid: 0 },
    lineData2: {},
    totalAdmissions: 0,
    totalInquiry: 0,
  };

  
  var sheetStudents = ss.getSheetByName(CONFIG.ADMISSIONS_SHEET_NAME);
  if (!sheetStudents) {
    return { error: "Sheets not found. Check Admissions sheet." };
  }
  var dataStudents = sheetStudents.getDataRange().getValues();
  
  // Count total admissions (subtract 1 for header row)
  analytics.totalAdmissions = dataStudents.length > 1 ? dataStudents.length - 1 : 0;

  var sheetStudents1 = ss.getSheetByName(CONFIG.INQUIRY_SHEET_NAME);
  if (!sheetStudents1) {
    return { error: "Sheets not found. Check Admissions sheet." };
  }
  var dataStudents1 = sheetStudents1.getDataRange().getValues();
  
  // Count total admissions (subtract 1 for header row)
  analytics.totalInquiry = dataStudents1.length > 1 ? dataStudents1.length - 1 : 0;
  
  // Process payment data if needed
  var sheetFees = ss.getSheetByName("FEES");
  if (!sheetFees) {
    // If we only need admission count, we can return early
    return analytics;
  }
  
  var dataFees = sheetFees.getDataRange().getValues();

  // Convert dateFrom/dateTo to actual Dates if provided
  var fromDate = null,
    toDate = null;
  if (dateFrom) {
    fromDate = new Date(dateFrom + "T00:00:00"); // parse
  }
  if (dateTo) {
    toDate = new Date(dateTo + "T23:59:59");
  }

  // Build a student map - assuming column structure from headers
  var studentMap = {};
  for (var i = 1; i < dataStudents.length; i++) {
    var sId = String(dataStudents[i][1]).trim(); // Receipt Number as ID
    var sTotal = 0;
    
    // Calculate total fees from year columns (index positions may vary based on actual sheet)
    var year1Total = parseFloat(dataStudents[i][9]) || 0;
    var year2Total = parseFloat(dataStudents[i][12]) || 0;
    var year3Total = parseFloat(dataStudents[i][15]) || 0;
    sTotal = year1Total + year2Total + year3Total;
    
    var year1Paid = parseFloat(dataStudents[i][10]) || 0;
    var year2Paid = parseFloat(dataStudents[i][13]) || 0;
    var year3Paid = parseFloat(dataStudents[i][16]) || 0;
    var totalPaid = year1Paid + year2Paid + year3Paid;
    
    studentMap[sId] = { 
      totalFees: sTotal, 
      sumPaid: totalPaid, 
      hasPaidRow: totalPaid > 0 
    };
    
    // Add to analytics totals
    analytics.totalPaidFees2 += totalPaid;
    if (totalPaid > 0) {
      analytics.paidStudentsCount2++;
    } else {
      analytics.unpaidStudentsCount2++;
      analytics.totalUnpaidFees2 += sTotal;
    }
  }

  analytics.totalStudents2 = Object.keys(studentMap).length;
  analytics.pieData2.paid = analytics.totalPaidFees2;
  analytics.pieData2.unpaid = analytics.totalUnpaidFees2;

  return analytics;
}






/************************************************
 * CLASS & MONTH DASHBOARD (ADMIN ONLY)
 ************************************************/
function getClassList() {
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return { error: "STUDENT DATA sheet not found." };

    var data = sheet.getDataRange().getValues();
    var classSet = {};
    for (var i = 1; i < data.length; i++) {
      var cls = String(data[i][6] || "").trim(); // col G
      if (cls) classSet[cls] = true;
    }
    return Object.keys(classSet).sort();
  } catch (err) {
    return { error: err.toString() };
  }
}

function getClassMonthDashboard(selectedClass, selectedMonth, userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return { error: "You don't have permission to view dashboard." };
  }
  
  var sheetStudents = ss.getSheetByName("STUDENT DATA");
  var sheetFees = ss.getSheetByName("FEES");
  if (!sheetStudents || !sheetFees) {
    return { error: "Sheets not found (STUDENT DATA or FEES missing)." };
  }

  var dataStudents = sheetStudents.getDataRange().getValues();
  var dataFees = sheetFees.getDataRange().getValues();

  // collect all students in selectedClass
  var studentClassMap = {};
  for (var i = 1; i < dataStudents.length; i++) {
    var sId = String(dataStudents[i][0]).trim();
    var sName = String(dataStudents[i][2] || "");
    var sClass = String(dataStudents[i][6] || "");
    var sTotalFees = parseFloat(dataStudents[i][7]) || 0;

    if (!selectedClass || sClass === selectedClass) {
      studentClassMap[sId] = {
        studentName: sName,
        totalFees: sTotalFees,
        sumPaid: 0,
        hasPaid: false,
      };
    }
  }

  var lineData = {};
  for (var j = 1; j < dataFees.length; j++) {
    var row = dataFees[j];
    var feeStudentId = String(row[0] || "").trim();
    var feeDateVal = row[1];
    var feeMonth = String(row[2] || "").trim();
    var paidAmount = parseFloat(row[8]) || 0;

    if (studentClassMap[feeStudentId]) {
      if (!selectedMonth || feeMonth === selectedMonth) {
        if (paidAmount > 0) {
          studentClassMap[feeStudentId].hasPaid = true;
          studentClassMap[feeStudentId].sumPaid += paidAmount;
          var dateStr =
            feeDateVal instanceof Date
              ? Utilities.formatDate(
                  feeDateVal,
                  Session.getScriptTimeZone(),
                  "yyyy-MM-dd"
                )
              : String(feeDateVal).trim();
          if (!lineData[dateStr]) {
            lineData[dateStr] = 0;
          }
          lineData[dateStr] += paidAmount;
        }
      }
    }
  }

  var studentsArray = [];
  for (var key in studentClassMap) {
    var st = studentClassMap[key];
    studentsArray.push({
      studentId: key,
      studentName: st.studentName,
      totalFees: st.totalFees,
      sumPaid: st.sumPaid,
      hasPaid: st.hasPaid,
    });
  }

  // sort lineData
  var sortedDates = Object.keys(lineData).sort();
  var finalLineData = {};
  sortedDates.forEach(function (d) {
    finalLineData[d] = lineData[d];
  });

  return { students: studentsArray, lineData: finalLineData };
}




// function saveEnrollment(data) {
//   try {
//     const ss = SpreadsheetApp.getActiveSpreadsheet();
//     const sheet = ss.getSheetByName("Enrollments");
    
//     // Get current date and format as dd/mm/yyyy
//     const today = new Date();
//     const session = `${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}`;
    
//     // Ensure we have required fields
//     if (!data.enrollmentID || !data.studentName) {
//       throw new Error("Missing required enrollment data");
//     }
    
//     sheet.appendRow([
//       data.enrollmentID,  // EnrollmentID (PK)
//       data.studentName,   // StudentID (FK)
//       data.course,  // CounselD (FK) with fallback
//       session,            // Session
//       "Active"            // Status
//     ]);
    
//     return {success: true, message: "Enrollment saved successfully"};
//   } catch (e) {
//     console.error("Save enrollment error:", e);
//     throw new Error("Failed to save enrollment: " + e.toString());
//   }
// }
function saveEnrollment(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.ENROLLMENTS_SHEET_NAME);

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.ENROLLMENTS_SHEET_NAME);
      // Add headers
      sheet.appendRow([
        "Enrollment ID",
        "Student Name",
        "Course",
        "Date",
        "Status"
      ]);
    }

    // Validate data
    if (!data.enrollmentID || !data.studentName) {
      throw new Error("Missing required enrollment data");
    }

    // Check for duplicate enrollment ID
    const existingData = sheet.getDataRange().getValues();
    const existingIds = existingData.slice(1).map(row => row[0]); // Skip header row
    if (existingIds.includes(data.enrollmentID)) {
      throw new Error("Enrollment ID already exists: " + data.enrollmentID);
    }

    // Format date as dd/mm/yyyy
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}`;

    // Append to sheet
    sheet.appendRow([
      data.enrollmentID,
      data.studentName,
      data.course || "Not Specified",
      formattedDate,
      "Active"
    ]);

    // Return success with the enrollment ID
    return {
      success: true,
      message: "Enrollment saved successfully",
      enrollmentID: data.enrollmentID
    };

  } catch (e) {
    console.error("Save enrollment error:", e);
    throw new Error("Failed to save enrollment: " + e.message);
  }
}

/************************************************
 * receipt
 ************************************************/




function generateReceiptNumber() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "Receipts";
  let sheet = ss.getSheetByName(sheetName);

  // If the sheet doesn't exist, create it with headers
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Receipt No", "Date", "Full Name", "Propose to Pay", "Total Amount", "Paid", "Balance", "Exam Fees", "Received By"]);
  }

  const lastRow = sheet.getLastRow();

  // Determine next receipt number
  let newReceiptNumber = 1; // Starting number
  if (lastRow > 1) {
    const lastReceipt = sheet.getRange(lastRow, 1).getValue(); // Column A
    if (!isNaN(lastReceipt)) {
      newReceiptNumber = parseInt(lastReceipt) + 1;
    }
  }

  return newReceiptNumber.toString().padStart(4, '0'); // Format: 1001, 1002...
}












/************************************************
 * DUE FEES
 ************************************************/
function getDueFeesData(userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return { error: "You don't have permission to view Due Fees." };
  }
  
  var sheetStudents = ss.getSheetByName("STUDENT DATA");
  var sheetFees = ss.getSheetByName("FEES");
  if (!sheetStudents || !sheetFees) {
    return { error: "Sheets not found (STUDENT DATA or FEES missing)." };
  }

  var dataStudents = sheetStudents.getDataRange().getValues();
  var dataFees = sheetFees.getDataRange().getValues();

  var studentMap = {};
  for (var i = 1; i < dataStudents.length; i++) {
    var sId = String(dataStudents[i][0] || "").trim();
    var sName = String(dataStudents[i][2] || "").trim();
    var sFather = String(dataStudents[i][3] || "").trim();
    var sClass = String(dataStudents[i][6] || "").trim();
    var sTotal = parseFloat(dataStudents[i][7]) || 0;
    studentMap[sId] = {
      studentName: sName,
      fatherName: sFather,
      className: sClass,
      totalFees: sTotal,
      sumPaid: 0,
    };
  }

  for (var j = 1; j < dataFees.length; j++) {
    var feeId = String(dataFees[j][0] || "").trim();
    var paidAmount = parseFloat(dataFees[j][8]) || 0;
    if (studentMap[feeId]) {
      studentMap[feeId].sumPaid += paidAmount;
    }
  }

  var results = [];
  var totalOverallFees = 0;
  var totalOverallPaid = 0;
  var fullyPaidCount = 0;
  for (var sid in studentMap) {
    var st = studentMap[sid];
    var due = st.totalFees - st.sumPaid;
    results.push({
      studentId: sid,
      studentName: st.studentName,
      fatherName: st.fatherName,
      className: st.className,
      totalFees: st.totalFees,
      sumPaid: st.sumPaid,
      dueFees: due,
    });
    totalOverallFees += st.totalFees;
    totalOverallPaid += st.sumPaid;
    if (due <= 0) {
      fullyPaidCount++;
    }
  }
  var totalDue = totalOverallFees - totalOverallPaid;

  return {
    data: results,
    summary: {
      totalFees: totalOverallFees,
      totalPaid: totalOverallPaid,
      totalDue: totalDue,
      fullyPaidCount: fullyPaidCount,
      totalStudents: Object.keys(studentMap).length,
    },
  };
}



function createAuditLogEntry(action, userId, additionalDetails = {}) {
  const auditLogSheet = ss.getSheetByName(CONFIG.AUDIT_LOG_SHEET_NAME);
  if (!auditLogSheet) {
    console.error("AuditLog sheet not found.");
    return;
  }

  const timestamp = new Date();
  const logId = `LOG-${timestamp.getTime()}-${Math.floor(Math.random() * 10000)}`;
  const detailsString = JSON.stringify(additionalDetails);
  const logRowData = [logId, userId || "Anonymous", action, timestamp, detailsString];

  try {
    auditLogSheet.appendRow(logRowData);
    console.log(`Log: ${logId}, User: ${userId}, Action: ${action}`);
  } catch (e) {
    console.error("Error appending to AuditLog:", e);
  }
}

/************************************************
 * INQUIRY FORM PROCESSING FUNCTIONS
 ************************************************/

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
function serverSideLogout() {
  const loggedInUser = PropertiesService.getUserProperties().getProperty("loggedInUser");
  if (loggedInUser) {
    createAuditLogEntry("Logout", loggedInUser); // <-- This creates the "Logout" entry!
    PropertiesService.getUserProperties().deleteProperty("loggedInUser");
  } else {
    createAuditLogEntry("Logout Attempt (No User)", "Anonymous"); // Optional: log if someone tries to logout when not logged in
  }
  return { success: true }; // Always return a success response to the client
}

/************************************************
 * RECEIPT NUMBER AUTO-GENERATION
 ************************************************/

/**
 * Finds the highest numeric part of a receipt number (e.g., 23 from 'AR-0023')
 * in a specified sheet. It checks the entire column to find the true maximum.
 * @param {string} sheetName The name of the sheet to check.
 * @returns {number} The highest receipt number found, or 0 if none are found.
 */
function findLastReceiptInSheet(sheetName) {
  const receiptColumn = 2; // This corresponds to Column B
  try {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      console.log(`Sheet "${sheetName}" not found. Skipping.`);
      return 0; // If sheet doesn't exist, it has no receipts.
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 1) {
      return 0; // If sheet is empty, it has no receipts.
    }

    // Get all values in the receipt column to find the last valid entry.
    const columnValues = sheet.getRange(1, receiptColumn, lastRow).getValues();
    let lastNumericPart = 0;

    // Loop through all values to find valid receipt numbers and get the maximum.
    for (let i = 0; i < columnValues.length; i++) {
      const cellValue = columnValues[i][0];
      if (cellValue && typeof cellValue === 'string' && cellValue.startsWith('AR-')) {
        const numericPart = parseInt(cellValue.substring(3), 10);
        if (!isNaN(numericPart) && numericPart > lastNumericPart) {
          lastNumericPart = numericPart;
        }
      }
    }
    return lastNumericPart;

  } catch (e) {
    console.error(`Error processing sheet "${sheetName}": ${e.message}`);
    return 0; // Return 0 in case of an error.
  }
}

/**
 * Gets the next sequential receipt number by checking both 'ADMISSIONF' and 'Inquiries' sheets.
 * This is the function called by the client-side JavaScript.
 * @returns {string} The new formatted receipt number (e.g., "AR-0025").
 */
function getNextReceiptNumber() {
  try {
    // Find the last receipt number from both sheets.
    const lastNumAdmissions = findLastReceiptInSheet(CONFIG.ADMISSIONS_SHEET_NAME);
    const lastNumDf = findLastReceiptInSheet(CONFIG.INQUIRY_SHEET_NAME);

    console.log(`Last number in 'Admissions' sheet: ${lastNumAdmissions}`);
    console.log(`Last number in 'Inquiry' sheet: ${lastNumDf}`);

    // Determine the highest number between the two sheets.
    const latestNum = Math.max(lastNumAdmissions, lastNumDf);
    console.log(`Highest number found across all sheets: ${latestNum}`);

    // Increment to get the new number.
    const newNumericPart = latestNum + 1;

    // Format the new receipt number with four digits (e.g., AR-0001, AR-0024, AR-0155).
    const newReceiptNumber = "AR-" + ("000" + newNumericPart).slice(-4);

    return newReceiptNumber;

  } catch (e) {
    console.error(`A critical error occurred in getNextReceiptNumber: ${e.message}`);
    // Fallback in case of any unexpected error.
    return "AR-0001";
  }
}

/************************************************
 * FEE STRUCT ANALYTICS
 ************************************************/
function getCourseList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.FEE_STRUCTURE_SHEET_NAME);
  if (!sheet) return [];
  const data = sheet.getRange(2, CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_NAME_COL + 1, sheet.getLastRow() - 1, 1).getValues(); // Course_Name column
  const courses = [...new Set(data.flat())].filter(String);
  return courses;
}

function getFeeStructureData(userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return { error: "You don't have permission to view Fee Structure." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.FEE_STRUCTURE_SHEET_NAME);

  // If sheet doesn't exist, create it with headers matching the new structure
  if (!sheet) {
    const newSheet = ss.insertSheet(CONFIG.FEE_STRUCTURE_SHEET_NAME);
    newSheet.appendRow([
      "TimeStamp", "Enrollment ID", "Name", "Course_Name", "Payment Mode",
      "Admission_Fee", "Admission_Fee_Due", "Course_Fee", "Course_Fee_Due", "Exam_Fee",
      "Exam_Fee_Due", "Total_Amount_Due", "Branch", "User_Name"
    ]);

    return {
      data: [],
      summary: {
        totalRecords: 0,
        totalAdmissionFees: 0,
        totalCourseFees: 0,
        totalExamFees: 0,
        totalAmountDue: 0,
        mostCommonPaymentMode: "",
      },
    };
  }

  const data = sheet.getDataRange().getValues();
  const results = [];
  let totalAdmissionFees = 0;
  let totalCourseFees = 0;
  let totalExamFees = 0;
  let totalAmountDue = 0;
  const paymentModeCounts = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Format timestamp
    let timestamp = "";
    if (row[CONFIG.FEE_STRUCTURE_LOOKUP.TIMESTAMP_COL]) {
      if (row[CONFIG.FEE_STRUCTURE_LOOKUP.TIMESTAMP_COL] instanceof Date) {
        timestamp = Utilities.formatDate(row[CONFIG.FEE_STRUCTURE_LOOKUP.TIMESTAMP_COL], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      } else {
        timestamp = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.TIMESTAMP_COL]);
      }
    }

    const enrollmentId = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.ENROLLMENT_ID_COL] || "").trim();
    const name = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.NAME_COL] || "").trim();
    const courseName = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_NAME_COL] || "").trim();
    const paymentMode = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.PAYMENT_MODE_COL] || "").trim();
    const admissionFee = parseFloat(String(row[CONFIG.FEE_STRUCTURE_LOOKUP.ADMISSION_FEE_COL]).replace(/[^\d.-]/g, "")) || 0;
    const admissionFeeDue = parseFloat(String(row[CONFIG.FEE_STRUCTURE_LOOKUP.ADMISSION_FEE_DUE_COL]).replace(/[^\d.-]/g, "")) || 0;
    const courseFee = parseFloat(String(row[CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_COL]).replace(/[^\d.-]/g, "")) || 0;
    const courseFeeDue = parseFloat(String(row[CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_DUE_COL]).replace(/[^\d.-]/g, "")) || 0; // NEW
    const examFee = parseFloat(String(row[CONFIG.FEE_STRUCTURE_LOOKUP.EXAM_FEE_COL]).replace(/[^\d.-]/g, "")) || 0;
    const examFeeDue = parseFloat(String(row[CONFIG.FEE_STRUCTURE_LOOKUP.EXAM_FEE_DUE_COL]).replace(/[^\d.-]/g, "")) || 0;
    const totalAmountDueValue = parseFloat(String(row[CONFIG.FEE_STRUCTURE_LOOKUP.TOTAL_AMOUNT_DUE_COL]).replace(/[^\d.-]/g, "")) || 0;
    const branch = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.BRANCH_COL] || "").trim();
    const userName = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.USER_NAME_COL] || "").trim();

    results.push({
      timestamp: timestamp,
      enrollmentId: enrollmentId,
      name: name,
      courseName: courseName,
      paymentMode: paymentMode,
      admissionFee: admissionFee,
      admissionFeeDue: admissionFeeDue,
      courseFee: courseFee,
      examFee: examFee,
      examFeeDue: examFeeDue,
      totalAmountDue: totalAmountDueValue,
      branch: branch,
      userName: userName,
    });

    // Accumulate totals
    totalAdmissionFees += admissionFee;
    totalCourseFees += courseFee;
    totalExamFees += examFee;
    totalAmountDue += totalAmountDueValue;

    // Count payment modes
    if (paymentMode) {
      if (!paymentModeCounts[paymentMode]) paymentModeCounts[paymentMode] = 0;
      paymentModeCounts[paymentMode]++;
    }
  }

  let commonMode = "";
  let maxCount = 0;
  for (const mode in paymentModeCounts) {
    if (paymentModeCounts[mode] > maxCount) {
      maxCount = paymentModeCounts[mode];
      commonMode = mode;
    }
  }

  return {
    data: results,
    summary: {
      totalRecords: results.length,
      totalAdmissionFees: totalAdmissionFees,
      totalCourseFees: totalCourseFees,
      totalExamFees: totalExamFees,
      totalAmountDue: totalAmountDue,
      mostCommonPaymentMode: commonMode,
    },
  };
}



/************************************************
 * ADMISSION STRUCT ANALYTICS
 ************************************************/
function getCourseListFromAdmissions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ADMISSIONF");
  const data = sheet.getRange(2, 7, sheet.getLastRow() - 1, 1).getValues(); // Column G (Course Name)
  return [...new Set(data.flat())].filter(String);
}



function getAdmissionAnalyticsData(userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return { error: "You don't have permission to view Admission Analytics." };
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ADMISSIONF");
  if (!sheet) return { error: "ADMISSIONF sheet not found." };

  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return { error: "No data in ADMISSIONF sheet." };

  const headers = data[0];
  let results = [];
  let totalFees = 0;
  let courseCounts = {};

  // Find column indices
  const dateIdx = headers.indexOf("Date") !== -1 ? headers.indexOf("Date") :
                  headers.indexOf("Admission Date") !== -1 ? headers.indexOf("Admission Date") :
                  headers.indexOf("Timestamp") !== -1 ? headers.indexOf("Timestamp") : -1;
  const receiptNumberIdx = headers.indexOf("Receipt Number");
  const enrollmentIdIdx = headers.indexOf("Enrollment ID");
  const firstNameIdx = headers.indexOf("First Name");
  const middleNameIdx = headers.indexOf("Middle Name");
  const lastNameIdx = headers.indexOf("Last Name");
  const courseNameIdx = headers.indexOf("Course Name");
  const courseDurationIdx = headers.indexOf("Course Duration");
  const totalCourseFeesIdx = headers.indexOf("Total Course Fees");
  const guardianRelationIdx = headers.indexOf("Guardian Relation");
  const guardianNameIdx = headers.indexOf("Guardian Name");
  const agreementIdx = headers.indexOf("Agreement");
  const userIdx = headers.indexOf("User");

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const receiptNumber = row[receiptNumberIdx] || "";
    const enrollmentId = row[enrollmentIdIdx] || "";
    const firstName = row[firstNameIdx] || "";
    const middleName = row[middleNameIdx] || "";
    const lastName = row[lastNameIdx] || "";
    const courseName = row[courseNameIdx] || "";
    const courseDuration = row[courseDurationIdx] || "";
    const totalCourseFees = parseFloat(String(row[totalCourseFeesIdx]).replace(/[^\d.-]/g, "")) || 0;
    const guardianRelation = row[guardianRelationIdx] || "";
    const guardianName = row[guardianNameIdx] || "";
    const agreement = row[agreementIdx] || "";
    const user = row[userIdx] || "";

    // Format date if available
    let formattedDate = "";
    if (dateIdx !== -1 && row[dateIdx]) {
      if (row[dateIdx] instanceof Date) {
        formattedDate = Utilities.formatDate(row[dateIdx], Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        formattedDate = row[dateIdx].toString();
      }
    }

    results.push({
      date: formattedDate,
      receiptNumber: receiptNumber,
      enrollmentId: enrollmentId,
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      courseName: courseName,
      courseDuration: courseDuration,
      totalCourseFees: totalCourseFees,
      guardianRelation: guardianRelation,
      guardianName: guardianName,
      agreement: agreement,
      user: user
    });

    totalFees += totalCourseFees;
    if (courseName) {
      courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
    }
  }

  let topCourse = "";
  if (Object.keys(courseCounts).length > 0) {
    topCourse = Object.keys(courseCounts).reduce((a, b) => courseCounts[a] > courseCounts[b] ? a : b);
  }

  return {
    data: results,
    summary: {
      totalRecords: results.length,
      totalFees: totalFees,
      averageFees: results.length > 0 ? totalFees / results.length : 0,
      topCourse: topCourse
    }
  };
}

/************************************************
 * INQUIRY STRUCT ANALYTICS
 ************************************************/
/**
 * Gets course list from inquiry sheet (Inquiries)
 */
function getInquiryAnalyticsData(userRole) {
  try {
    // Check if user has permission
    if (!userRole || userRole.toLowerCase() !== "admin") {
      return { error: "You don't have permission to view Inquiry Analytics." };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Inquiries");
    
    if (!sheet) {
      return { error: "Inquiries sheet not found." };
    }

    const data = sheet.getDataRange().getValues();
    
    // Check if there's any data beyond headers
    if (data.length <= 1) {
      return {
        data: [],
        summary: {
          totalRecords: 0,
          uniqueCourses: 0,
          topCourse: "-"
        }
      };
    }

    // Define column indices based on your spreadsheet structure
    const COL_INDICES = {
      DATE: 1,           // Column B (assuming 0-based index)
      AADHAAR: 2,        // Column C
      FULL_NAME: 3,      // Column D
      QUALIFICATION: 4,  // Column E
      PHONE: 5,          // Column F
      WHATSAPP: 6,       // Column G
      PARENTS_NUMBER: 7, // Column H
      EMAIL: 8,          // Column I
      AGE: 9,            // Column J
      ADDRESS: 10,       // Column K
      INTERESTED_COURSE: 11, // Column L (if this exists)
      INQUIRY_BY: 12,    // Column M (if this exists)
      BRANCH: 13,        // Column N (if this exists)
      GENDER: 14         // Column O (if this exists)
    };

    let results = [];
    let courseCounts = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows (check if essential fields are empty)
      if (!row[COL_INDICES.FULL_NAME] && !row[COL_INDICES.AADHAAR]) continue;
      
      // Format date properly
      let formattedDate = "";
      if (row[COL_INDICES.DATE]) {
        if (row[COL_INDICES.DATE] instanceof Date) {
          formattedDate = Utilities.formatDate(row[COL_INDICES.DATE], Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else {
          // Handle string dates
          formattedDate = row[COL_INDICES.DATE].toString().split(' ')[0]; // Get only date part
        }
      }

      results.push({
        date: formattedDate,
        aadhaar: row[COL_INDICES.AADHAAR] || "",
        fullName: row[COL_INDICES.FULL_NAME] || "",
        qualification: row[COL_INDICES.QUALIFICATION] || "",
        phone: row[COL_INDICES.PHONE] || "",
        whatsapp: row[COL_INDICES.WHATSAPP] || "",
        parentsNumber: row[COL_INDICES.PARENTS_NUMBER] || "",
        email: row[COL_INDICES.EMAIL] || "",
        age: row[COL_INDICES.AGE] || "",
        address: row[COL_INDICES.ADDRESS] || "",
        interestedCourse: row[COL_INDICES.INTERESTED_COURSE] || "",
        inquiryTakenBy: row[COL_INDICES.INQUIRY_BY] || "",
        branch: row[COL_INDICES.BRANCH] || "",
        gender: row[COL_INDICES.GENDER] || ""
      });

      // Count courses
      const course = row[COL_INDICES.INTERESTED_COURSE];
      if (course) {
        courseCounts[course] = (courseCounts[course] || 0) + 1;
      }
    }

    // Find top course
    let topCourse = "-";
    if (Object.keys(courseCounts).length > 0) {
      topCourse = Object.keys(courseCounts).reduce((a, b) => 
        courseCounts[a] > courseCounts[b] ? a : b
      );
    }

    return {
      data: results,
      summary: {
        totalRecords: results.length,
        uniqueCourses: Object.keys(courseCounts).length,
        topCourse: topCourse
      }
    };
  } catch (error) {
    Logger.log("Error in getInquiryAnalyticsData: " + error.toString());
    return { error: "Error processing data: " + error.toString() };
  }
}

function getCourseListFromInquiries() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inquiries");
    if (!sheet) return ["Error: Inquiries sheet not found"];
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return ["No data found"];
    
    // Column L (12) - Interested Course (assuming it's column L based on your structure)
    const data = sheet.getRange(2, 12, lastRow - 1, 1).getValues();
    return [...new Set(data.flat())].filter(String);
  } catch (error) {
    return ["Error: " + error.toString()];
  }
}
/************************************************
 * COURSE PAYMENT
 ************************************************/
// function saveCoursePayment(data) {
//   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("FeeStructure");

//   sheet.appendRow([
//     data.ID,
//     data.Coursepayname,
//     data.coursePaySelect,
//     data.courseDuration,
//     data.coursePayFees,
//     data.totalFees,
//     data.paySelect
//   ]);
// }



// // function saveExamReceipt(data) {
// //   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("EXAMRECEIPT");

// //   if (!sheet) {
// //     throw new Error("Sheet 'EXAMRECEIPT' not found.");
// //   }

// //   sheet.appendRow([
// //     data.receiptDate1,
// //     data.receiptNumber1,
// //     data.studentName1,
// //     data.courseName1,
// //     parseFloat(data.totalAmount),
// //     data.paymentMode1,
// //     data.receivedBy,
// //     data.branch,
// //     data.agreeTerms ? "Agreed" : "Not Agreed"
// //   ]);
// // }

// function saveReceiptData(data) {
//   const ss = SpreadsheetApp.getActiveSpreadsheet();
//   const sheet = ss.getSheetByName("EXAMRECEIPT");

//   if (!sheet) {
//     throw new Error('Sheet "EXAMRECEIPT" not found!');
//   }

//   sheet.appendRow([
//     data.receiptDate,
//     data.receiptNumber,
//     data.studentName,
//     data.courseName,
//     parseFloat(data.totalAmount),
//     data.paymentMode,
//     // data.receivedBy,
//     // data.branch,
//     data.agreeTerms
//   ]);
// }


/**
 * Saves course payment data to FeeStructure sheet with the new column structure
 * Updates existing entry for the enrollment ID instead of creating new rows
 * @param {Object} data Payment data object
 * @returns {Object} Operation result
 */
function saveCoursePayment(data) {
   const userIdForAudit = data.loggedInUserId ||
                       PropertiesService.getUserProperties().getProperty("loggedInUser") ||
                       "Anonymous";

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.FEE_STRUCTURE_SHEET_NAME);

    if (!sheet) {
      createAuditLogEntry("Sheet Not Found Error", userIdForAudit, {
        error: "Sheet 'FeeStructure' not found",
        paymentDataSummary: {
          enrollmentId: data.enrollmentId,
          courseName: data.coursePaySelect
        }
      });
      throw new Error('Sheet "FeeStructure" not found!');
    }

    // Validate required fields for the new structure
    const requiredFields = ["enrollmentId", "Coursepayname", "coursePaySelect"];
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      createAuditLogEntry("Payment Validation Failed", userIdForAudit, {
        reason: `Missing required fields: ${missingFields.join(", ")}`,
        paymentDataSummary: {
          enrollmentId: data.enrollmentId,
          courseName: data.coursePaySelect
        }
      });
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      };
    }

    const enrollmentId = data.enrollmentId;
    const paymentAmount = parseFloat(data.coursePayFees) || 0;

    // Check if entry exists for this enrollment ID
    const existingData = sheet.getDataRange().getValues();
    let existingRowIndex = -1;

    // Find existing row for this enrollment ID (skip header row)
    for (let i = 1; i < existingData.length; i++) {
      const row = existingData[i];
      const rowEnrollmentId = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.ENROLLMENT_ID_COL] || "").trim();

      if (rowEnrollmentId === enrollmentId) {
        existingRowIndex = i + 1; // +1 for 1-based sheet indexing
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Update existing entry
      const currentRow = existingData[existingRowIndex - 1]; // -1 for 0-based array indexing

      // Get current values
      const currentCourseFee = parseFloat(currentRow[CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_COL]) || 0;
      const currentCourseFeeDue = parseFloat(currentRow[CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_DUE_COL]) || 0;
      const currentTotalDue = parseFloat(currentRow[CONFIG.FEE_STRUCTURE_LOOKUP.TOTAL_AMOUNT_DUE_COL]) || 0;

      // Special handling for installment confirmation (when paymentType indicates installment setup)
      if (data.paymentType === 'full' || data.paymentType === 'partial' || data.paymentType === 'emi') {
        // This is installment confirmation - set Course_Fee to the total amount and initialize Course_Fee_Due
        const newCourseFee = paymentAmount; // Set to total course fee
        const newCourseFeeDue = paymentAmount; // Initialize Course_Fee_Due to total course fee
        const newTotalDue = Math.max(0, currentTotalDue); // Keep existing Total_Amount_Due

        // Update the row
        sheet.getRange(existingRowIndex, CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_COL + 1).setValue(newCourseFee);
        sheet.getRange(existingRowIndex, CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_DUE_COL + 1).setValue(newCourseFeeDue);
        sheet.getRange(existingRowIndex, CONFIG.FEE_STRUCTURE_LOOKUP.TOTAL_AMOUNT_DUE_COL + 1).setValue(newTotalDue);
        sheet.getRange(existingRowIndex, 1).setValue(new Date()); // Update timestamp
      } else {
        // Regular payment update - add to Course_Fee and reduce Course_Fee_Due
        const newCourseFee = currentCourseFee + paymentAmount;
        const newCourseFeeDue = Math.max(0, currentCourseFeeDue - paymentAmount);
        const newTotalDue = Math.max(0, currentTotalDue - paymentAmount);

        // Update the row
        sheet.getRange(existingRowIndex, CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_COL + 1).setValue(newCourseFee);
        sheet.getRange(existingRowIndex, CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_DUE_COL + 1).setValue(newCourseFeeDue);
        sheet.getRange(existingRowIndex, CONFIG.FEE_STRUCTURE_LOOKUP.TOTAL_AMOUNT_DUE_COL + 1).setValue(newTotalDue);
        sheet.getRange(existingRowIndex, 1).setValue(new Date()); // Update timestamp
      }

      // Log successful payment update
      createAuditLogEntry("Course Payment Updated", userIdForAudit, {
        enrollmentId: data.enrollmentId,
        studentName: data.Coursepayname,
        course: data.coursePaySelect,
        paymentAmount: paymentAmount,
        paymentMode: data.paySelect || "Cash",
        row: existingRowIndex
      });

      return {
        success: true,
        message: "Course payment updated successfully",
        row: existingRowIndex
      };

    } else {
      // Create new entry if none exists
      console.log("No existing entry found for enrollment ID:", enrollmentId, "- creating new entry");

      // Prepare data for the new FeeStructure format
      // Clean the totalFees string to remove currency symbols and formatting
      let totalCourseFee = parseFloat(String(data.totalFees).replace(/[^0-9.]/g, ''));

      // If totalFees parsing failed, try to get course fee from totalAmountDue or course data
      if (isNaN(totalCourseFee) || totalCourseFee === 0) {
        const totalAmountDue = parseFloat(String(data.totalAmountDue).replace(/[^0-9.]/g, ''));
        if (!isNaN(totalAmountDue) && totalAmountDue > 0) {
          totalCourseFee = totalAmountDue; // Use totalAmountDue as course fee
        } else {
          // Fallback to course data based on course selection
          const courseData = {
            "anm_nursing": { fee: 50000 },
            "gnm_nursing": { fee: 75000 },
            "dmlt": { fee: 40000 },
            "ot_technician": { fee: 45000 },
            "general_nursing": { fee: 25000 }
          };
          totalCourseFee = (data.coursePaySelect && courseData[data.coursePaySelect]) ? courseData[data.coursePaySelect].fee : paymentAmount;
        }
      }

      const rowData = [
        new Date(), // TimeStamp (Column A)
        data.enrollmentId, // Enrollment ID (Column B)
        data.Coursepayname, // Name (Column C)
        data.coursePaySelect, // Course_Name (Column D)
        data.paySelect || "Cash", // Payment Mode (Column E)
        parseFloat(data.admissionFee) || 0, // Admission_Fee (Column F)
        parseFloat(data.admissionFeeDue) || 0, // Admission_Fee_Due (Column G)
        totalCourseFee, // Course_Fee (Column H) - the FIXED total course fee
        parseFloat(data.examFee) || 0, // Exam_Fee (Column I)
        parseFloat(data.examFeeDue) || 0, // Exam_Fee_Due (Column J)
        parseFloat(data.totalAmountDue) || (totalCourseFee - paymentAmount), // Total_Amount_Due (Column K)
        data.branch || "", // Branch (Column L)
        userIdForAudit // User_Name (Column M)
      ];

      // Save payment data
      sheet.appendRow(rowData);

      const lastRow = sheet.getLastRow();

      // Log successful payment creation
      createAuditLogEntry("Course Payment Recorded", userIdForAudit, {
        enrollmentId: data.enrollmentId,
        studentName: data.Coursepayname,
        course: data.coursePaySelect,
        courseFee: paymentAmount,
        totalAmountDue: data.totalAmountDue || data.totalFees || paymentAmount,
        paymentMode: data.paySelect || "Cash",
        row: lastRow
      });

      return {
        success: true,
        message: "Course payment recorded successfully",
        row: lastRow
      };
    }

  } catch (error) {
    console.error("Error in saveCoursePayment:", error);

    createAuditLogEntry("Payment Processing Error", userIdForAudit, {
      error: error.message,
      paymentDataSummary: {
        enrollmentId: data.enrollmentId,
        courseName: data.coursePaySelect
      }
    });

    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Saves fee structure data with the specified attributes
 * @param {Object} data Fee structure data object
 * @returns {Object} Operation result
 */
function saveFeeStructureData(data) {
  const userIdForAudit = data.loggedInUserId ||
                       PropertiesService.getUserProperties().getProperty("loggedInUser") ||
                       "Anonymous";

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.FEE_STRUCTURE_SHEET_NAME);

    if (!sheet) {
      createAuditLogEntry("Sheet Not Found Error", userIdForAudit, {
        error: "Sheet 'FeeStructure' not found"
      });
      throw new Error('Sheet "FeeStructure" not found!');
    }

    // Validate required fields
    const requiredFields = ["enrollmentId", "name", "courseName"];
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      createAuditLogEntry("Fee Structure Validation Failed", userIdForAudit, {
        reason: `Missing required fields: ${missingFields.join(", ")}`
      });
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      };
    }

    // Prepare data for the FeeStructure format
    const rowData = [
      new Date(), // TimeStamp (Column A)
      data.enrollmentId, // Enrollment ID (Column B)
      data.name, // Name (Column C)
      data.courseName, // Course_Name (Column D)
      data.paymentMode || "Cash", // Payment Mode (Column E)
      parseFloat(data.admissionFee) || 0, // Admission_Fee (Column F)
      parseFloat(data.admissionFeeDue) || 0, // Admission_Fee_Due (Column G)
      parseFloat(data.courseFee) || 0, // Course_Fee (Column H)
      parseFloat(data.courseFeeDue) || parseFloat(data.courseFee) || 0, // Course_Fee_Due (Column I) - NEW
      parseFloat(data.examFee) || 0, // Exam_Fee (Column J)
      parseFloat(data.examFeeDue) || 0, // Exam_Fee_Due (Column K)
      parseFloat(data.totalAmountDue) || 0, // Total_Amount_Due (Column L)
      data.branch || "", // Branch (Column M)
      userIdForAudit // User_Name (Column N)
    ];

    // Save fee structure data
    sheet.appendRow(rowData);

    const lastRow = sheet.getLastRow();

    // Log successful fee structure save
    createAuditLogEntry("Fee Structure Data Recorded", userIdForAudit, {
      enrollmentId: data.enrollmentId,
      name: data.name,
      courseName: data.courseName,
      admissionFee: data.admissionFee || 0,
      courseFee: data.courseFee || 0,
      examFee: data.examFee || 0,
      totalAmountDue: data.totalAmountDue || 0,
      paymentMode: data.paymentMode || "Cash",
      branch: data.branch || "",
      row: lastRow
    });

    return {
      success: true,
      message: "Fee structure data saved successfully",
      row: lastRow
    };

  } catch (error) {
    console.error("Error in saveFeeStructureData:", error);

    createAuditLogEntry("Fee Structure Save Error", userIdForAudit, {
      error: error.message,
      dataSummary: {
        enrollmentId: data.enrollmentId,
        name: data.name
      }
    });

    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Saves receipt data to EXAMRECEIPT sheet with audit logging
 * @param {Object} data Receipt data object
 * @returns {Object} Operation result
 */
function saveReceiptData(data) {
   const userIdForAudit = data.loggedInUserId ||
                       PropertiesService.getUserProperties().getProperty("loggedInUser") ||
                       "Anonymous";
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.EXAMRECEIPT_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.EXAMRECEIPT_SHEET_NAME);
      // Add headers
      sheet.appendRow([
        "Receipt Date",
        "Receipt Number",
        "Enrollment ID",
        "Student Name",
        "Course Name",
        "Total Amount",
        "Payment Mode",
        "Agree Terms",
        "Record Timestamp",
        "User ID"
      ]);
    }

    // Validate required fields
    const requiredFields = ["receiptNumber", "studentName", "courseName", "totalAmount"];
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      createAuditLogEntry("Receipt Validation Failed", userIdForAudit, {
        reason: `Missing required fields: ${missingFields.join(", ")}`,
        receiptDataSummary: {
          receiptNumber: data.receiptNumber,
          studentName: data.studentName
        }
      });
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      };
    }

    // Parse amount to ensure it's numeric
    const amount = parseFloat(data.totalAmount);
    if (isNaN(amount)) {
      createAuditLogEntry("Receipt Amount Error", userIdForAudit, {
        error: "Invalid amount format",
        receiptDataSummary: {
          receiptNumber: data.receiptNumber,
          amountEntered: data.totalAmount
        }
      });
      return {
        success: false,
        message: "Invalid amount format"
      };
    }

    // Parse the date string and create proper Date object
    const receiptDate = data.receiptDate ? new Date(data.receiptDate) : new Date();

    // Save receipt data
    sheet.appendRow([
      receiptDate,                     // Receipt Date
      data.receiptNumber,              // Receipt Number
      data.enrollmentId || "",         // Enrollment ID
      data.studentName,                // Student Name
      data.courseName,                 // Course Name
      amount,                          // Total Amount
      data.paymentMode,                // Payment Mode
      data.agreeTerms === 'Yes' ? 'Agreed' : 'Not Agreed', // Agree Terms
      new Date(),                      // Record Timestamp
      userIdForAudit                   // User ID
    ]);

    const lastRow = sheet.getLastRow();

    // Log successful receipt creation
    createAuditLogEntry("Receipt Generated", userIdForAudit, {
      receiptNumber: data.receiptNumber,
      studentName: data.studentName,
      courseName: data.courseName,
      amount: amount,
      paymentMode: data.paymentMode,
      row: lastRow
    });

    
    // Update FeeStructure sheet with exam fee
    try {
      const feeSheet = ss.getSheetByName(CONFIG.FEE_STRUCTURE_SHEET_NAME);
      if (feeSheet) {
        const feeData = feeSheet.getDataRange().getValues();
        let enrollmentRowIndex = -1;

        // Find the row for this enrollment ID (skip header row)
        for (let i = 1; i < feeData.length; i++) {
          const row = feeData[i];
          const rowEnrollmentId = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.ENROLLMENT_ID_COL] || "").trim();

          if (rowEnrollmentId === data.enrollmentId) {
            enrollmentRowIndex = i + 1; // +1 for 1-based sheet indexing
            break;
          }
        }

        if (enrollmentRowIndex > 0) {
          // Get current exam fee values
          const currentExamFee = parseFloat(feeData[enrollmentRowIndex - 1][CONFIG.FEE_STRUCTURE_LOOKUP.EXAM_FEE_COL]) || 0;
          const currentExamFeeDue = parseFloat(feeData[enrollmentRowIndex - 1][CONFIG.FEE_STRUCTURE_LOOKUP.EXAM_FEE_DUE_COL]) || 0;

          // Add exam fee amount to Exam_Fee and reduce Exam_Fee_Due
          const newExamFee = currentExamFee + amount;
          const newExamFeeDue = Math.max(0, currentExamFeeDue - amount);

          // Update the FeeStructure sheet
          feeSheet.getRange(enrollmentRowIndex, CONFIG.FEE_STRUCTURE_LOOKUP.EXAM_FEE_COL + 1).setValue(newExamFee);
          feeSheet.getRange(enrollmentRowIndex, CONFIG.FEE_STRUCTURE_LOOKUP.EXAM_FEE_DUE_COL + 1).setValue(newExamFeeDue);
          feeSheet.getRange(enrollmentRowIndex, 1).setValue(new Date()); // Update timestamp

          // Log fee structure update
          createAuditLogEntry("Exam Fee Updated in Fee Structure", userIdForAudit, {
            enrollmentId: data.enrollmentId,
            studentName: data.studentName,
            examFeeAmount: amount,
            previousExamFee: currentExamFee,
            newExamFee: newExamFee,
            previousExamFeeDue: currentExamFeeDue,
            newExamFeeDue: newExamFeeDue,
            row: enrollmentRowIndex
          });
        } else {
          // Enrollment ID not found in FeeStructure - log warning but don't fail
          createAuditLogEntry("Exam Fee Update Warning", userIdForAudit, {
            warning: "Enrollment ID not found in FeeStructure sheet for exam fee update",
            enrollmentId: data.enrollmentId,
            examFeeAmount: amount
          });
        }
      } else {
        // FeeStructure sheet not found - log warning but don't fail
        createAuditLogEntry("Exam Fee Update Error", userIdForAudit, {
          error: "FeeStructure sheet not found for exam fee update",
          enrollmentId: data.enrollmentId,
          examFeeAmount: amount
        });
      }
    } catch (feeError) {
      // Log error but don't fail the receipt generation
      createAuditLogEntry("Exam Fee Update Error", userIdForAudit, {
        error: feeError.message,
        enrollmentId: data.enrollmentId,
        examFeeAmount: amount
      });
    }

    return {
      success: true,
      message: "Receipt data saved successfully",
      row: lastRow,
      receiptNumber: data.receiptNumber
    };

  } catch (error) {
    console.error("Error in saveReceiptData:", error);

    createAuditLogEntry("Receipt Processing Error", userIdForAudit, {
      error: error.message,
      receiptDataSummary: {
        receiptNumber: data.receiptNumber,
        studentName: data.studentName
      }
    });

    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Saves complete admission receipt data to AdmissionReceipts sheet
 * @param {Object} data Complete workflow data
 * @returns {Object} Operation result
 */
function getInstallmentPaymentsForStudent(enrollmentId) {
  console.log("=== getInstallmentPaymentsForStudent START ===");
  console.log("Input enrollmentId:", enrollmentId);

  try {
    // Get spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log("Spreadsheet name:", ss.getName());

    // Get or create sheet
    let sheet = ss.getSheetByName("InstallmentPayments");
    if (!sheet) {
      console.log("Creating InstallmentPayments sheet");
      sheet = ss.insertSheet("InstallmentPayments");

      // Add headers matching the required attributes with installment columns
      const headers = [
        "Timestamp",
        "Enrollment_ID",
        "Student_Name",
        "Course_Name",
        "Seleted_Payement_Option",
        "Course_Fee",
        "Couse_Duration",
        "Course_Year"
      ];

      // Add Installment_1 through Installment_36 columns
      for (let i = 1; i <= 36; i++) {
        headers.push(`Installment_${i}`);
      }

      // Add remaining columns
      headers.push("Amount_Paid", "Payment_Method", "User");

      sheet.appendRow(headers);
    }

    const data = sheet.getDataRange().getValues();
    console.log("Sheet has", data.length, "rows of data");

    const payments = [];
    const searchId = String(enrollmentId || "").trim();
    console.log("Searching for enrollment ID:", searchId);

    // Find the row for this enrollment ID
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEnrollmentId = String(row[1] || "").trim(); // Enrollment_ID column

      if (rowEnrollmentId === searchId) {
        console.log("Found row for enrollment:", searchId, "at index:", i);

        // Extract all installment payments from this row
        for (let instNum = 1; instNum <= 36; instNum++) {
          const installmentColumnIndex = 7 + instNum; // Installment_1 is at index 8 (0-based)
          const installmentAmount = parseFloat(row[installmentColumnIndex] || 0);

          if (installmentAmount > 0) {
            const payment = {
              timestamp: row[0],
              enrollmentId: rowEnrollmentId,
              studentName: String(row[2] || ""),
              courseName: String(row[3] || ""),
              paymentOption: String(row[4] || ""),
              courseFee: parseFloat(row[5]) || 0,
              courseDuration: String(row[6] || ""),
              courseYear: parseInt(row[7]) || 1,
              installmentNumber: instNum,
              amountPaid: installmentAmount,
              paymentMethod: String(row[44] || ""), // Payment_Method column (after 36 installments)
              user: String(row[45] || ""), // User column
              // Keep backward compatibility
              receiptNo: rowEnrollmentId,
              installmentAmount: installmentAmount,
              paymentDate: row[0], // Use timestamp as payment date
              loggedInUser: String(row[45] || "")
            };
            payments.push(payment);
            console.log("Found installment payment:", payment);
          }
        }

        // Only process the first matching row (should be unique by enrollment ID)
        break;
      }
    }

    console.log("Total payments found:", payments.length);
    console.log("=== getInstallmentPaymentsForStudent END ===");

    return payments;

  } catch (error) {
    console.error("CRITICAL ERROR in getInstallmentPaymentsForStudent:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);

    // Return empty array on error
    return [];
  }
}

function saveInstallmentPayment(data) {
  const userIdForAudit = PropertiesService.getUserProperties().getProperty("loggedInUser") ||
                       data.loggedInUser ||
                       "Anonymous";

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Create "InstallmentPayments" sheet if it doesn't exist
    let sheet = ss.getSheetByName("InstallmentPayments");
    if (!sheet) {
      sheet = ss.insertSheet("InstallmentPayments");

      // Add headers matching the required attributes with installment columns
      const headers = [
        "Timestamp",
        "Enrollment_ID",
        "Student_Name",
        "Course_Name",
        "Seleted_Payement_Option",
        "Course_Fee",
        "Couse_Duration",
        "Course_Year"
      ];

      // Add Installment_1 through Installment_36 columns
      for (let i = 1; i <= 36; i++) {
        headers.push(`Installment_${i}`);
      }

      // Add remaining columns
      headers.push("Amount_Paid", "Payment_Method", "User");

      sheet.appendRow(headers);
    }

    const enrollmentId = data.enrollmentId || data.receiptNo;
    const installmentNumber = parseInt(data.installmentNumber);
    const installmentAmount = parseFloat(data.installmentAmount);

    // Define column indices explicitly (1-based for sheet ranges)
    const TIMESTAMP_COL = 1;
    const ENROLLMENT_ID_COL = 2;
    const STUDENT_NAME_COL = 3;
    const COURSE_NAME_COL = 4;
    const PAYMENT_OPTION_COL = 5;
    const COURSE_FEE_COL = 6;
    const COURSE_DURATION_COL = 7;
    const COURSE_YEAR_COL = 8;
    const FIRST_INSTALLMENT_COL = 9; // Installment_1 column
    const AMOUNT_PAID_COL = 45;
    const PAYMENT_METHOD_COL = 46;
    const USER_COL = 47;

    // Get all data to find existing row for this enrollment
    const allData = sheet.getDataRange().getValues();
    let existingRowIndex = -1;

    // Find existing row for this enrollment ID (skip header row)
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][1] || "").trim() === enrollmentId) { // Enrollment_ID column (0-based index 1)
        existingRowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }

    // Get course fee and duration from FeeStructure or other sources
    let courseFee = 0;
    let courseDuration = "";
    let courseYear = 1; // Default to 1st year

    try {
      // Try to get course data from FeeStructure sheet
      const feeSheet = ss.getSheetByName(CONFIG.FEE_STRUCTURE_SHEET_NAME);
      if (feeSheet) {
        const feeData = feeSheet.getDataRange().getValues();
        // Look for matching enrollment ID or student name
        for (let i = 1; i < feeData.length; i++) {
          const row = feeData[i];
          if (String(row[1] || "").trim() === enrollmentId ||
              String(row[2] || "").trim() === data.studentName) {
            courseFee = parseFloat(row[7]) || 0; // Course_Fee column
            break;
          }
        }
      }

      // Try to get course duration from course data
      const courseData = {
        "anm_nursing": { duration: "2 Years", fee: 50000 },
        "gnm_nursing": { duration: "3 Years", fee: 75000 },
        "dmlt": { duration: "2 Years", fee: 40000 },
        "ot_technician": { duration: "2 Years", fee: 45000 },
        "general_nursing": { duration: "1 Year", fee: 25000 }
      };

      if (courseData[data.courseName]) {
        courseDuration = courseData[data.courseName].duration;
        if (courseFee === 0) {
          courseFee = courseData[data.courseName].fee;
        }
      }
    } catch (error) {
      console.log("Could not retrieve course data:", error);
    }

    if (existingRowIndex > 0) {
      // Update existing row
      console.log("Updating existing row for enrollment:", enrollmentId, "at row:", existingRowIndex);

      // Check if this installment is already paid
      const existingRow = allData[existingRowIndex - 1]; // -1 because array is 0-indexed
      const installmentColumn = FIRST_INSTALLMENT_COL + (installmentNumber - 1); // Installment_1 = 9, Installment_2 = 10, etc.

      if (existingRow[installmentColumn - 1] && String(existingRow[installmentColumn - 1]).trim() !== "") { // -1 for 0-based array index
        return {
          success: false,
          message: `Installment ${installmentNumber} has already been paid for this enrollment`
        };
      }

      // Update the specific installment column with payment amount
      sheet.getRange(existingRowIndex, installmentColumn).setValue(installmentAmount);

      // Calculate and update total Amount_Paid by summing all installment amounts
      let totalPaid = 0;
      for (let i = 1; i <= 36; i++) {
        const instColIndex = FIRST_INSTALLMENT_COL + (i - 1); // Installment_1 = 9, etc.
        // Get the actual amount from each installment column
        const instAmount = parseFloat(existingRow[instColIndex - 1]) || 0; // -1 for 0-based array index
        if (instAmount > 0) {
          totalPaid += instAmount;
        }
      }

      sheet.getRange(existingRowIndex, AMOUNT_PAID_COL).setValue(totalPaid);

      // Update timestamp and user
      sheet.getRange(existingRowIndex, TIMESTAMP_COL).setValue(new Date());
      sheet.getRange(existingRowIndex, USER_COL).setValue(userIdForAudit);

      // Update FeeStructure sheet - reduce Total_Amount_Due by payment amount
      const feeUpdateResult = updateFeeStructureAmountDue(enrollmentId, installmentAmount, userIdForAudit);
      if (!feeUpdateResult.success) {
        console.error("Warning: Failed to update FeeStructure amount due:", feeUpdateResult.message);
        // Don't fail the payment, just log the warning
      }

      // Log successful update
      createAuditLogEntry("Installment Payment Updated", userIdForAudit, {
        enrollmentId: enrollmentId,
        studentName: data.studentName,
        courseName: data.courseName,
        installmentNumber: installmentNumber,
        amount: installmentAmount,
        paymentDate: data.paymentDate,
        totalPaid: totalPaid,
        feeStructureUpdated: feeUpdateResult.success,
        row: existingRowIndex
      });

      // Update installment schedule status
      const scheduleUpdateResult = updateInstallmentScheduleStatus({
        receiptNo: enrollmentId,
        installmentNumber: installmentNumber
      });

      if (!scheduleUpdateResult.success) {
        console.error("Warning: Failed to update installment schedule status:", scheduleUpdateResult.message);
        // Don't fail the payment, just log the warning
      }

      return {
        success: true,
        message: `Installment ${installmentNumber} payment updated successfully`,
        row: existingRowIndex
      };

    } else {
      // Create new row
      console.log("Creating new row for enrollment:", enrollmentId);

      // Prepare row data with all columns
      const rowData = [
        new Date(), // Timestamp
        enrollmentId, // Enrollment_ID
        data.studentName, // Student_Name
        data.courseName, // Course_Name
        data.paymentMethod || "Cash", // Seleted_Payement_Option
        courseFee, // Course_Fee
        courseDuration, // Couse_Duration
        courseYear // Course_Year
      ];

      // Add empty values for all 36 installment columns
      for (let i = 1; i <= 36; i++) {
        if (i === installmentNumber) {
          rowData.push(installmentAmount); // Set the payment amount for the specific installment
        } else {
          rowData.push(""); // Empty for other installments
        }
      }

      // Add remaining columns
      rowData.push(installmentAmount, data.paymentMethod, userIdForAudit); // Amount_Paid, Payment_Method, User

      sheet.appendRow(rowData);

      const lastRow = sheet.getLastRow();

      // Log successful creation
      createAuditLogEntry("Installment Payment Recorded", userIdForAudit, {
        enrollmentId: enrollmentId,
        studentName: data.studentName,
        courseName: data.courseName,
        installmentNumber: installmentNumber,
        amount: installmentAmount,
        paymentDate: data.paymentDate,
        courseFee: courseFee,
        courseDuration: courseDuration,
        row: lastRow
      });

      // Update installment schedule status for new payment
      const scheduleUpdateResult = updateInstallmentScheduleStatus({
        receiptNo: enrollmentId,
        installmentNumber: installmentNumber
      });

      if (!scheduleUpdateResult.success) {
        console.error("Warning: Failed to update installment schedule status:", scheduleUpdateResult.message);
        // Don't fail the payment, just log the warning
      }

      return {
        success: true,
        message: "Installment payment saved successfully",
        row: lastRow
      };
    }

  } catch (error) {
    console.error("Error in saveInstallmentPayment:", error);

    createAuditLogEntry("Installment Payment Save Error", userIdForAudit, {
      error: error.message,
      enrollmentId: data.enrollmentId || data.receiptNo,
      studentName: data.studentName
    });

    return {
      success: false,
      message: error.message
    };
  }
}

function saveAdmissionReceipt(data) {
  const userIdForAudit = PropertiesService.getUserProperties().getProperty("loggedInUser") || "Anonymous";

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 🔥 CRITICAL: Create "AdmissionReceipts" sheet if it doesn't exist
    let sheet = ss.getSheetByName("AdmissionReceipts");
    if (!sheet) {
      sheet = ss.insertSheet("AdmissionReceipts");

      // Add headers for complete workflow data
      sheet.appendRow([
        "Timestamp",
        "Receipt_Number",
        "Student_Name",
        "Course_Name",
        "Total_Amount",
        "Paid_Amount",
        "Balance",
        "Consent_Text",
        "Guardian_Relation",
        "Guardian_Name",
        "Agree_Status",
        "Full_Name_From_Inquiry",
        "Address",
        "Phone_No",
        "WhatsApp_No",
        "Parents_No",
        "Email",
        "Age",
        "Gender",
        "Qualification",
        "Inquiry_Taken_By",
        "Branch",
        "Logged_In_User"
      ]);
    }

    // Calculate balance
    const totalAmount = isNaN(data.totalAmount) ? parseFloat(data.totalAmount || 0) : data.totalAmount;
    const paidAmount = isNaN(data.paidAmount) ? parseFloat(data.paidAmount || 0) : data.paidAmount;
    const balance = totalAmount - paidAmount;

    // Combine name from admission data or inquiry
    const fullName = data.studentName ||
                    `${data.inquiryData?.firstName || ''} ${data.inquiryData?.middleName || ''} ${data.inquiryData?.lastName || ''}`.trim() ||
                    data.admissionData?.studentName ||
                    "N/A";

    // Append complete workflow data
    sheet.appendRow([
      new Date(), // Timestamp
      data.receiptNumber || "N/A",
      fullName,
      data.courseName || data.admissionData?.courseSelect || "N/A",
      totalAmount,
      paidAmount,
      balance,
      data.consentText || "I am the guardian of the student",
      data.admissionData?.guardianRelation || "N/A",
      data.admissionData?.guardianName || "N/A",
      data.agree ? "Agreed" : "Not Agreed",
      `${data.inquiryData?.firstName || ''} ${data.inquiryData?.middleName || ''} ${data.inquiryData?.lastName || ''}`.trim() || "N/A",
      data.admissionData?.addressLine1 ? `${data.admissionData.addressLine1}${data.admissionData.addressLine2 ? ', ' + data.admissionData.addressLine2 : ''}${data.admissionData.addressLine3 ? ', ' + data.admissionData.addressLine3 : ''}${data.admissionData.pincode ? ', Pincode: ' + data.admissionData.pincode : ''}` : "N/A",
      data.admissionData?.phoneNo || data.inquiryData?.phoneNo || "N/A",
      data.admissionData?.whatsappNo || data.inquiryData?.whatsappNo || "N/A",
      data.admissionData?.parentsNo || data.inquiryData?.parentsNo || "N/A",
      data.admissionData?.email || data.inquiryData?.email || "N/A",
      data.admissionData?.age || data.inquiryData?.age || "N/A",
      data.admissionData?.gender || data.inquiryData?.gender || "N/A",
      data.admissionData?.qualification || data.inquiryData?.qualification || "N/A",
      data.inquiryData?.inquiryTakenBy || "N/A",
      data.admissionData?.branch || data.inquiryData?.branch || "N/A",
      userIdForAudit
    ]);

    const lastRow = sheet.getLastRow();

    // Log successful complete workflow save
    createAuditLogEntry("Complete Admission Receipt Saved", userIdForAudit, {
      receiptNumber: data.receiptNumber,
      studentName: fullName,
      course: data.courseName,
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      balance: balance,
      row: lastRow
    });

    console.log(`AdmissionReceipt saved successfully at row ${lastRow}`);
    return {
      success: true,
      message: "Complete admission receipt saved successfully",
      row: lastRow,
      receiptNumber: data.receiptNumber
    };

  } catch (error) {
    console.error("Error in saveAdmissionReceipt:", error);

    createAuditLogEntry("Admission Receipt Save Error", userIdForAudit, {
      error: error.message,
      dataSummary: {
        receiptNumber: data.receiptNumber,
        studentName: data.studentName || data.admissionData?.studentName || "N/A"
      }
    });

    return {
      success: false,
      message: `Failed to save complete admission receipt: ${error.message}`
    };
  }
}

/**
 * Saves installment schedule for a student to persist the exact schedule
 * @param {Object} data Receipt data with installment schedule
 * @returns {Object} Operation result
 */
function saveInstallmentSchedule(data) {
  const userIdForAudit = PropertiesService.getUserProperties().getProperty("loggedInUser") || "Anonymous";

  // Acquire lock to prevent concurrency issues until the complete schedule is filled
  const lock = LockService.getScriptLock();
  try {
    // Try to acquire lock with 5 second timeout
    lock.waitLock(5000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get or create "InstallmentSchedules" sheet
    let sheet = ss.getSheetByName("InstallmentSchedules");
    if (!sheet) {
      sheet = ss.insertSheet("InstallmentSchedules");

      // Add headers
      sheet.appendRow([
        "Timestamp",
        "Enrollment_ID",
        "Student_Name",
        "Course_Name",
        "Payment_Type",
        "Total_Fees",
        "Installment_Number",
        "Installment_Amount",
        "Due_Date",
        "Status",
        "Logged_In_User"
      ]);
    }

    const receiptNo = data.receiptNo || "";
    const studentName = data.studentName || "";
    const enrollmentId = data.enrollmentNo || "";
    const courseName = data.courseName || "";
    const paymentType = data.paymentType || "full";
    const totalFees = parseFloat(data.totalFee) || 0;
    const installmentSchedule = data.installmentSchedule || [];

    // Check if schedule already exists for this enrollment ID
    const existingData = sheet.getDataRange().getValues();
    const hasExistingSchedule = existingData.some(row => row[1] === enrollmentId); // Column B is Enrollment_ID

    if (hasExistingSchedule) {
      // Update existing schedule - clear old entries and add new ones
      const rowsToDelete = [];
      for (let i = existingData.length - 1; i >= 1; i--) {
        if (existingData[i][1] === enrollmentId) { // Changed from receiptNo to enrollmentId
          rowsToDelete.push(i + 1); // Sheet rows are 1-indexed
        }
      }

      // Delete old entries
      rowsToDelete.reverse().forEach(rowNum => {
        sheet.deleteRow(rowNum);
      });
    }

    // Save new schedule
    const savedRows = [];
    installmentSchedule.forEach(installment => {
      sheet.appendRow([
        new Date(), // Timestamp
        enrollmentId, // Enrollment_ID (changed from receiptNo)
        studentName,
        courseName,
        paymentType,
        totalFees,
        installment.installmentNumber,
        installment.amount,
        installment.dueDate,
        installment.status || "Pending",
        userIdForAudit
      ]);
      savedRows.push(sheet.getLastRow());
    });

    // Log successful schedule save
    createAuditLogEntry("Installment Schedule Saved", userIdForAudit, {
      receiptNo: receiptNo,
      studentName: studentName,
      courseName: courseName,
      paymentType: paymentType,
      installmentCount: installmentSchedule.length,
      totalFees: totalFees,
      rows: savedRows
    });

    return {
      success: true,
      message: "Installment schedule saved successfully",
      rows: savedRows
    };

  } catch (error) {
    console.error("Error in saveInstallmentSchedule:", error);

    createAuditLogEntry("Installment Schedule Save Error", userIdForAudit, {
      error: error.message,
      dataSummary: {
        receiptNo: data.receiptNo,
        studentName: data.studentName
      }
    });

    return {
      success: false,
      message: `Failed to save installment schedule: ${error.message}`
    };
  } finally {
    // Always release the lock to prevent deadlocks
    lock.releaseLock();
  }
}

/**
 * Loads saved installment schedule for a student
 * @param {string} enrollmentId Enrollment ID to load schedule for
 * @returns {Array} Array of installment objects
 */
function loadInstallmentSchedule(enrollmentId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("InstallmentSchedules");

    if (!sheet) {
      return []; // No schedule saved yet
    }

    const data = sheet.getDataRange().getValues();
    const schedule = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === enrollmentId) { // Column B is Enrollment_ID
        schedule.push({
          installmentNumber: parseInt(row[6]) || 0, // Column G: Installment_Number
          amount: parseFloat(row[7]) || 0, // Column H: Installment_Amount
          dueDate: row[8] ? row[8].toISOString().split('T')[0] : "", // Column I: Due_Date
          status: row[9] || "Pending" // Column J: Status
        });
      }
    }

    // Sort by installment number
    schedule.sort((a, b) => a.installmentNumber - b.installmentNumber);

    return schedule;

  } catch (error) {
    console.error("Error in loadInstallmentSchedule:", error);
    return [];
  }
}

/**
 * Updates installment status in InstallmentSchedules sheet when payment is made
 * @param {Object} data Payment data
 * @returns {Object} Operation result
 */
function updateInstallmentScheduleStatus(data) {
  const userIdForAudit = PropertiesService.getUserProperties().getProperty("loggedInUser") || "Anonymous";

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("InstallmentSchedules");

    if (!sheet) {
      return {
        success: false,
        message: "InstallmentSchedules sheet not found"
      };
    }

    const receiptNo = data.receiptNo || data.enrollmentId;
    const installmentNumber = parseInt(data.installmentNumber);

    const dataRange = sheet.getDataRange().getValues();

    // Find the row for this enrollment ID and installment
    for (let i = 1; i < dataRange.length; i++) {
      const row = dataRange[i];
      if (row[1] === receiptNo && parseInt(row[6]) === installmentNumber) { // Column B: Enrollment_ID, Column G: Installment_Number
        // Update status to "Paid"
        sheet.getRange(i + 1, 10).setValue("Paid"); // Column J: Status (1-based index 10)

        // Update timestamp
        sheet.getRange(i + 1, 1).setValue(new Date()); // Column A: Timestamp

        // Log successful status update
        createAuditLogEntry("Installment Schedule Status Updated", userIdForAudit, {
          enrollmentId: receiptNo, // Changed from receiptNo
          installmentNumber: installmentNumber,
          status: "Paid",
          row: i + 1
        });

        return {
          success: true,
          message: `Installment ${installmentNumber} status updated to Paid`,
          row: i + 1
        };
      }
    }

    // If installment not found in schedule, that's okay - it might be a dynamic schedule
    return {
      success: true,
      message: "Installment not found in saved schedule (may be dynamically generated)",
      row: null
    };

  } catch (error) {
    console.error("Error in updateInstallmentScheduleStatus:", error);

    createAuditLogEntry("Installment Schedule Status Update Error", userIdForAudit, {
      error: error.message,
      receiptNo: data.receiptNo || data.enrollmentId,
      installmentNumber: data.installmentNumber
    });

    return {
      success: false,
      message: `Failed to update installment schedule status: ${error.message}`
    };
  }
}

/**
 * Gets student data by enrollment ID for course payment form
 * @param {string} enrollmentId The enrollment ID to search for
 * @returns {Object} Student data object or error
 */
function getStudentDataByEnrollmentId(enrollmentId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Check ADMISSIONF sheet first (primary source)
    let sheet = ss.getSheetByName("ADMISSIONF");
    let studentData = null;

    if (sheet) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      // Find column indices
      const enrollmentIdIdx = headers.indexOf("Enrollment ID");
      const firstNameIdx = headers.indexOf("First Name");
      const middleNameIdx = headers.indexOf("Middle Name");
      const lastNameIdx = headers.indexOf("Last Name");
      const courseNameIdx = headers.indexOf("Course Name");
      const receiptNumberIdx = headers.indexOf("Receipt Number");

      // Search for enrollment ID
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowEnrollmentId = String(row[enrollmentIdIdx] || "").trim();

        if (rowEnrollmentId === enrollmentId) {
          // Found the enrollment ID
          studentData = {
            enrollmentId: enrollmentId,
            firstName: String(row[firstNameIdx] || "").trim(),
            middleName: String(row[middleNameIdx] || "").trim(),
            lastName: String(row[lastNameIdx] || "").trim(),
            courseName: String(row[courseNameIdx] || "").trim(),
            receiptNumber: String(row[receiptNumberIdx] || "").trim(),
            studentName: `${row[firstNameIdx] || ""} ${row[middleNameIdx] || ""} ${row[lastNameIdx] || ""}`.trim()
          };
          break;
        }
      }
    }

    // If not found in ADMISSIONF, check FeeStructure sheet
    if (!studentData) {
      const feeSheet = ss.getSheetByName(CONFIG.FEE_STRUCTURE_SHEET_NAME);
      if (feeSheet) {
        const feeData = feeSheet.getDataRange().getValues();

        // Search FeeStructure sheet (column B is Enrollment ID, column C is Name, column D is Course_Name)
        for (let i = 1; i < feeData.length; i++) {
          const row = feeData[i];
          const rowEnrollmentId = String(row[1] || "").trim(); // Column B: Enrollment ID

          if (rowEnrollmentId === enrollmentId) {
            studentData = {
              enrollmentId: enrollmentId,
              firstName: "",
              middleName: "",
              lastName: "",
              courseName: String(row[3] || "").trim(), // Column D: Course_Name
              receiptNumber: "",
              studentName: String(row[2] || "").trim() // Column C: Name
            };
            break;
          }
        }
      }
    }

    // Check if student has payment history
    let hasPayments = false;
    if (studentData) {
      const installmentSheet = ss.getSheetByName("InstallmentPayments");
      if (installmentSheet) {
        const installmentData = installmentSheet.getDataRange().getValues();
        hasPayments = installmentData.some(row => String(row[1] || "").trim() === enrollmentId); // Column B: Enrollment_ID
      }
    }

    if (studentData) {
      studentData.hasPayments = hasPayments;
      return studentData;
    } else {
      return {
        success: false,
        error: "Enrollment ID not found"
      };
    }

  } catch (error) {
    console.error("Error in getStudentDataByEnrollmentId:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Updates the Course_Fee_Due in FeeStructure sheet when installment payment is made
 * Also fixes Course_Fee if it's 0 (for backward compatibility)
 * @param {string} enrollmentId The enrollment ID to update
 * @param {number} paymentAmount The amount paid
 * @param {string} userId The user making the update
 * @returns {Object} Operation result
 */
function updateFeeStructureAmountDue(enrollmentId, paymentAmount, userId) {
  const userIdForAudit = userId || PropertiesService.getUserProperties().getProperty("loggedInUser") || "Anonymous";

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.FEE_STRUCTURE_SHEET_NAME);

    if (!sheet) {
      createAuditLogEntry("Fee Structure Update Error", userIdForAudit, {
        error: "FeeStructure sheet not found",
        enrollmentId: enrollmentId,
        paymentAmount: paymentAmount
      });
      return {
        success: false,
        message: "FeeStructure sheet not found"
      };
    }

    const data = sheet.getDataRange().getValues();

    // Find the row for this enrollment ID (skip header row)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEnrollmentId = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.ENROLLMENT_ID_COL] || "").trim(); // Column B

      if (rowEnrollmentId === enrollmentId) {
        // Get current values
        const currentCourseFee = parseFloat(row[CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_COL] || 0); // Column H
        const currentCourseFeeDue = parseFloat(row[CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_DUE_COL] || 0); // Column I
        const currentTotalDue = parseFloat(row[CONFIG.FEE_STRUCTURE_LOOKUP.TOTAL_AMOUNT_DUE_COL] || 0); // Column L

        // Fix Course_Fee if it's 0 (backward compatibility for existing records)
        let fixedCourseFee = currentCourseFee;
        if (currentCourseFee === 0 && currentTotalDue > 0) {
          // If Course_Fee is 0 but Total_Amount_Due has a value, use Total_Amount_Due as Course_Fee
          fixedCourseFee = currentTotalDue;
          sheet.getRange(i + 1, CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_COL + 1).setValue(fixedCourseFee); // Fix Course_Fee
        }

        // Calculate new values (only Course_Fee_Due is reduced)
        const newCourseFeeDue = Math.max(0, currentCourseFeeDue - paymentAmount); // Reduce Course_Fee_Due

        // Update the Course_Fee_Due column only
        sheet.getRange(i + 1, CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_DUE_COL + 1).setValue(newCourseFeeDue); // +1 for 1-based column index

        // Update timestamp
        sheet.getRange(i + 1, 1).setValue(new Date()); // Column A: Timestamp

        // Log successful update
        createAuditLogEntry("Course Fee Due Updated", userIdForAudit, {
          enrollmentId: enrollmentId,
          paymentAmount: paymentAmount,
          previousCourseFee: currentCourseFee,
          fixedCourseFee: fixedCourseFee,
          previousCourseFeeDue: currentCourseFeeDue,
          newCourseFeeDue: newCourseFeeDue,
          row: i + 1
        });

        return {
          success: true,
          message: `Course fee due updated successfully. Course_Fee_Due reduced by ₹${paymentAmount}${fixedCourseFee !== currentCourseFee ? ' (Course_Fee fixed)' : ''}`,
          row: i + 1,
          previousCourseFeeDue: currentCourseFeeDue,
          newCourseFeeDue: newCourseFeeDue,
          courseFeeFixed: fixedCourseFee !== currentCourseFee
        };
      }
    }

    // Enrollment ID not found in FeeStructure
    createAuditLogEntry("Fee Structure Update Warning", userIdForAudit, {
      warning: "Enrollment ID not found in FeeStructure sheet",
      enrollmentId: enrollmentId,
      paymentAmount: paymentAmount
    });

    return {
      success: false,
      message: `Enrollment ID ${enrollmentId} not found in FeeStructure sheet`
    };

  } catch (error) {
    console.error("Error in updateFeeStructureAmountDue:", error);

    createAuditLogEntry("Fee Structure Update Error", userIdForAudit, {
      error: error.message,
      enrollmentId: enrollmentId,
      paymentAmount: paymentAmount
    });

    return {
      success: false,
      message: `Failed to update FeeStructure: ${error.message}`
    };
  }
}

/**
 * Updates FeeStructure for installment payment: adds total course fee to course_fee as fixed fee and reduces course_fee_due
 * @param {string} enrollmentId The enrollment ID to update
 * @param {number} paymentAmount The amount paid
 * @param {number} totalCourseFee The total course fee to add to Course_Fee
 * @returns {Object} Operation result
 */
function updateFeeStructureForInstallmentPayment(enrollmentId, paymentAmount, totalCourseFee) {
  const userIdForAudit = PropertiesService.getUserProperties().getProperty("loggedInUser") || "Anonymous";

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.FEE_STRUCTURE_SHEET_NAME);

    if (!sheet) {
      createAuditLogEntry("Fee Structure Update Error", userIdForAudit, {
        error: "FeeStructure sheet not found",
        enrollmentId: enrollmentId,
        paymentAmount: paymentAmount,
        totalCourseFee: totalCourseFee
      });
      return {
        success: false,
        message: "FeeStructure sheet not found"
      };
    }

    const data = sheet.getDataRange().getValues();

    // Find the row for this enrollment ID (skip header row)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEnrollmentId = String(row[CONFIG.FEE_STRUCTURE_LOOKUP.ENROLLMENT_ID_COL] || "").trim(); // Column B

      if (rowEnrollmentId === enrollmentId) {
        // Get current values
        const currentCourseFee = parseFloat(row[CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_COL] || 0); // Column H
        const currentCourseFeeDue = parseFloat(row[CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_DUE_COL] || 0); // Column I

        // Add the total course fee to Course_Fee as fixed fee
        const newCourseFee = totalCourseFee;

        // 🔥 FIX: If Course_Fee_Due is 0 or empty, initialize it to the new Course_Fee first
        let actualCourseFeeDue = currentCourseFeeDue;
        if (actualCourseFeeDue === 0 && newCourseFee > 0) {
          actualCourseFeeDue = newCourseFee;
          // Update the Course_Fee_Due column to initialize it
          sheet.getRange(i + 1, CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_DUE_COL + 1).setValue(actualCourseFeeDue);
        }

        // Calculate new values: keep Course_Fee fixed and reduce Course_Fee_Due
        const newCourseFeeDue = Math.max(0, actualCourseFeeDue - paymentAmount); // Reduce Course_Fee_Due


        // Update Course_Fee_Due column
        sheet.getRange(i + 1, CONFIG.FEE_STRUCTURE_LOOKUP.COURSE_FEE_DUE_COL + 1).setValue(newCourseFeeDue);

        // Update timestamp
        sheet.getRange(i + 1, 1).setValue(new Date()); // Column A: Timestamp

        // Log successful update
        createAuditLogEntry("Fee Structure Updated for Installment Payment", userIdForAudit, {
          enrollmentId: enrollmentId,
          paymentAmount: paymentAmount,
          totalCourseFee: totalCourseFee,
          previousCourseFee: currentCourseFee,
          newCourseFee: newCourseFee,
          previousCourseFeeDue: actualCourseFeeDue,
          newCourseFeeDue: newCourseFeeDue,
          row: i + 1
        });

        return {
          success: true,
          message: `Fee structure updated successfully. Course_Fee set to ₹${newCourseFee} (added ₹${totalCourseFee}), Course_Fee_Due reduced by ₹${paymentAmount}`,
          row: i + 1,
          fixedCourseFee: newCourseFee,
          previousCourseFeeDue: actualCourseFeeDue,
          newCourseFeeDue: newCourseFeeDue
        };
      }
    }

    // Enrollment ID not found in FeeStructure
    createAuditLogEntry("Fee Structure Update Warning", userIdForAudit, {
      warning: "Enrollment ID not found in FeeStructure sheet for installment payment update",
      enrollmentId: enrollmentId,
      paymentAmount: paymentAmount,
      totalCourseFee: totalCourseFee
    });

    return {
      success: false,
      message: `Enrollment ID ${enrollmentId} not found in FeeStructure sheet`
    };

  } catch (error) {
    console.error("Error in updateFeeStructureForInstallmentPayment:", error);

    createAuditLogEntry("Fee Structure Update Error for Installment Payment", userIdForAudit, {
      error: error.message,
      enrollmentId: enrollmentId,
      paymentAmount: paymentAmount,
      totalCourseFee: totalCourseFee
    });

    return {
      success: false,
      message: `Failed to update FeeStructure for installment payment: ${error.message}`
    };
  }
}

/**
 * Gets course data by location (branch) for admission fees
 * @param {string} branch The branch location (kurla, thane, nalasapora)
 * @returns {Object} Course data with admission fees
 */
function getCourseDataByLocation(branch) {
  if (branch === "kurla") {
    return {
      anm_nursing: { duration: "1 year", fees: 90000, admission_fee: 5000, exam_fee: 500 },
      gnm_nursing: { duration: "3 years", fees: 100000, admission_fee: 5000, exam_fee: 500 },
      dmlt: { duration: "1 year", fees: 70000, admission_fee: 5000, exam_fee: 500 },
      ot_technician: { duration: "1 year", fees: 30000, admission_fee: 5000, exam_fee: 500 },
      general_nursing: { duration: "1 year", fees: 30000, admission_fee: 5000, exam_fee: 500 }
    };
  } else if (branch === "nalasapora") {
    return {
      anm_nursing: { duration: "1 year", fees: 90000, admission_fee: 5000, exam_fee: 500 },
      gnm_nursing: { duration: "3 years", fees: 90000, admission_fee: 5000, exam_fee: 500 },
      dmlt: { duration: "1 year", fees: 30000, admission_fee: 5000, exam_fee: 500 },
      ot_technician: { duration: "1 year", fees: 30000, admission_fee: 5000, exam_fee: 500 },
      general_nursing: { duration: "1 year", fees: 30000, admission_fee: 5000, exam_fee: 500 }
    };
  } else if (branch === "karad") {
    return {
      anm_nursing: { duration: "1 Year", fees: 36000, admission_fee: 3000, monthly_fee: 3000, exam_fee: 6000 },
      gnm_nursing: { duration: "3 years", fees: 95000, admission_fee: 5000, exam_fee: 500 },
      dmlt: { duration: "1 year", fees: 55000, admission_fee: 5000, exam_fee: 500 },
      ot_technician: { duration: "1 Year", fees: 36000, admission_fee: 3000, monthly_fee: 3000, exam_fee: 6000 },
      electrician: { duration: "1 Year", fees: 24000, admission_fee: 2000, monthly_fee: 4000, exam_fee: 6000 },
      ac_refrigerator: { duration: "1 Year", fees: 24000, admission_fee: 2000, monthly_fee: 4000, exam_fee: 6000 },
      basic_parlour: { duration: "2 Month", fees: 5000, admission_fee: 1000, monthly_fee: 2500, exam_fee: 1000 }
    };
  } else {
    // Default to kurla if branch not found
    return {
      anm_nursing: { duration: "1 year", fees: 90000, admission_fee: 5000, exam_fee: 500 },
      gnm_nursing: { duration: " years", fees: 95000, admission_fee: 5000, exam_fee: 500 },
      dmlt: { duration: "1 year", fees: 55000, admission_fee: 5000, exam_fee: 500 },
      ot_technician: { duration: "1 year", fees: 30000, admission_fee: 5000, exam_fee: 500 },
      general_nursing: { duration: "1 year", fees: 30000, admission_fee: 5000, exam_fee: 500 }
    };
  }
}

/**
 * Saves installment data to InstallmentPayments sheet when receipt is generated
 * @param {Object} data Receipt data for generating installments
 * @returns {Object} Operation result
 */
function saveInstallmentDataOnReceiptGeneration(data) {
  const userIdForAudit = PropertiesService.getUserProperties().getProperty("loggedInUser") || "Anonymous";

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get or create "InstallmentPayments" sheet
    let sheet = ss.getSheetByName(CONFIG.INSTALLMENT_PAYMENTS_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.INSTALLMENT_PAYMENTS_SHEET_NAME);

      // Add headers matching the column indices
      sheet.appendRow([
        "Timestamp",
        "Enrollment_ID",
        "Student_Name",
        "Course_Name",
        "Payement_Option",
        "Total_Fees_Due",
        "Installment_Number",
        "Amount_Paid",
        "Payment_Method",
        "Payment_Date",
        "Logged_In_User"
      ]);
    }

    // Get installment details from the receipt data
    const enrollmentId = data.enrollmentNo || "";
    const studentName = data.studentName || "";
    const courseName = data.courseName || "";
    const paymentOption = data.paymentType || "full";
    const totalFeesDue = parseFloat(data.totalFee) || 0;
    const installmentCount = parseInt(data.installmentCount) || 1;
    const paymentMethod = data.paymentMethod || "Cash";
    const paymentDate = new Date().toISOString().split('T')[0]; // Today's date

    // Check if installment data already exists for this enrollment ID
    const existingData = sheet.getDataRange().getValues();
    const hasExistingData = existingData.some(row =>
      row[CONFIG.INSTALLMENT_PAYMENTS_LOOKUP.ENROLLMENT_ID_COL] === enrollmentId &&
      row[CONFIG.INSTALLMENT_PAYMENTS_LOOKUP.STUDENT_NAME_COL] === studentName
    );

    if (hasExistingData) {
      // Data already exists, don't create duplicates
      createAuditLogEntry("Installment Data Skipped - Already Exists", userIdForAudit, {
        enrollmentId: enrollmentId,
        studentName: studentName,
        reason: "Installment data already exists for this enrollment"
      });

      return {
        success: true,
        message: "Installment data already exists, skipping creation",
        rows: []
      };
    }

    // Always create a single entry per receipt generation
    const installmentAmount = installmentCount > 1 ? Math.round(totalFeesDue / installmentCount) : totalFeesDue;

    sheet.appendRow([
      new Date(), // Timestamp
      enrollmentId,
      studentName,
      courseName,
      paymentOption,
      totalFeesDue,
      installmentCount, // Installment_Number (count for installments, 1 for full)
      installmentAmount, // Amount_Paid (installment amount or full amount)
      paymentMethod,
      paymentDate,
      userIdForAudit
    ]);

    const lastRow = sheet.getLastRow();

    // Log successful installment data save
    createAuditLogEntry("Installment Data Saved on Receipt Generation", userIdForAudit, {
      enrollmentId: enrollmentId,
      studentName: studentName,
      courseName: courseName,
      paymentOption: paymentOption,
      totalFeesDue: totalFeesDue,
      installmentCount: installmentCount,
      installmentAmount: installmentAmount,
      row: lastRow
    });

    return {
      success: true,
      message: `Installment data saved successfully`,
      rows: [lastRow]
    };

  } catch (error) {
    console.error("Error in saveInstallmentDataOnReceiptGeneration:", error);

    createAuditLogEntry("Installment Data Save Error on Receipt Generation", userIdForAudit, {
      error: error.message,
      dataSummary: {
        enrollmentId: data.enrollmentNo,
        studentName: data.studentName
      }
    });

    return {
      success: false,
      message: `Failed to save installment data: ${error.message}`
    };
  }
}
