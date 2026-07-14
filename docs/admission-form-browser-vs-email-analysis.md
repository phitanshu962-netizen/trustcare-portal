# Admission Form: Browser vs Email PDF — Deep Analysis

> **Date:** 15 July 2026  
> **Scope:** Comparison of the admission form/receipt as rendered in the browser vs. what is sent via email as a PDF attachment.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Flow of Admission Data](#2-flow-of-admission-data)
3. [Browser Receipt (openInstallmentReceipt) vs Email PDF Receipt (generatePdfReceiptBuffer)](#3-browser-receipt-openinstallmentreceipt-vs-email-pdf-receipt-generatepdfreceiptbuffer)
4. [Browser Full Admission Form (openCoursePaymentReceipt) vs Email PDF Full Form (generatePdfAdmissionFormBuffer)](#4-browser-full-admission-form-opencoursepaymentreceipt-vs-email-pdf-full-form-generatepdfadmissionformbuffer)
5. [Critical Differences Summary](#5-critical-differences-summary)
6. [Recommendations](#6-recommendations)

---

## 1. System Architecture Overview

### Components Involved

| Component | File | Role |
|-----------|------|------|
| **AdmissionView** | `src/components/AdmissionView.tsx` | Browser form for data entry (NOT a receipt view) |
| **openInstallmentReceipt** | `src/components/CoursePaymentReceiptView.tsx` (line 64) | Browser popup receipt (simple A4 receipt) |
| **openCoursePaymentReceipt** | `src/components/CoursePaymentReceiptView.tsx` (line 561) | Browser popup full admission form (2 pages) |
| **generatePdfReceiptBuffer** | `src/app/api/send-email/route.ts` (line 12) | Email PDF receipt (A5 landscape, 1 page) |
| **generatePdfAdmissionFormBuffer** | `src/app/api/send-email/route.ts` (line 412) | Email PDF full admission form (2+ pages) |
| **POST /api/send-email** | `src/app/api/send-email/route.ts` (line 1325) | Email sending via SendGrid |

### Two Distinct Email Paths

1. **Simple Receipt Email** (`type: "admission"`):
   - Triggered from `AdmissionView.tsx` line 347 after form submission
   - Uses `generatePdfReceiptBuffer()` → A5 landscape PDF
   - Sends a simple fee receipt

2. **Full Admission Form Email** (`type: "admission_form"`):
   - Triggered from `PaymentView.tsx` after course payment
   - Uses `generatePdfAdmissionFormBuffer()` → A4 portrait PDF (2+ pages)
   - Sends the complete admission form with undertaking

---

## 2. Flow of Admission Data

### Browser Flow (What the user sees)

```
AdmissionView.tsx (form input)
  ↓ Submit
openInstallmentReceipt() with isAdmission: true
  ↓ Opens popup
Browser Receipt (Student Copy + Centre Copy)
```

```
CoursePaymentReceiptView.tsx (after course payment)
  ↓
openCoursePaymentReceipt() with full ReceiptData
  ↓ Opens popup
Browser Full Form (Page 1: Admission Form + Page 2: Undertaking)
```

### Email Flow (What gets sent)

```
AdmissionView.tsx
  ↓ Submit + confirm email
fetch("/api/send-email", { type: "admission", data: {...} })
  ↓
generatePdfReceiptBuffer("admission", data) → A5 PDF
  ↓
SendGrid email with PDF attachment
```

```
PaymentView.tsx
  ↓ After course payment
fetch("/api/send-email", { type: "admission_form", data: {...} })
  ↓
generatePdfAdmissionFormBuffer(data) → A4 PDF (2+ pages)
  ↓
SendGrid email with PDF attachment
```

---

## 3. Browser Receipt (openInstallmentReceipt) vs Email PDF Receipt (generatePdfReceiptBuffer)

### 3.1 Page Size & Layout

| Aspect | Browser Receipt | Email PDF Receipt |
|--------|----------------|-------------------|
| **Page size** | A4 (794×1123px) | A5 Landscape (595×420pt) |
| **Copies** | **2 copies**: STUDENT COPY + CENTRE COPY | **1 copy**: STUDENT COPY only |
| **Orientation** | Portrait | Landscape |
| **Background** | White with watermark logo (opacity 0.05) | White with watermark logo (opacity 0.05) |
| **Border** | 3px solid black, rounded (20px radius) | 3pt solid black, rounded (SVG path) |

### 3.2 Header Section

| Aspect | Browser Receipt | Email PDF Receipt |
|--------|----------------|-------------------|
| **Logos** | 2 logos (left + right), 150×150px each | 2 logos (top-left + top-right), 82×75pt each |
| **Organization name** | "TRUSTCARE" (36px, #013220) | "TRUSTCARE" (26pt, darkGreen #013220) |
| **Subtitle** | "INSTITUTE OF HEALTH SCIENCE" (16px) | "INSTITUTE OF HEALTH SCIENCE" (12pt) |
| **Badge** | "ADMISSION RECEIPT" (black pill, 11px) | "ADMISSION RECEIPT" (black pill, 9pt) |
| **Copy label** | "STUDENT COPY" / "CENTRE COPY" (10px, #777) | "STUDENT COPY" (8pt, gray) |

### 3.3 Receipt Fields

| Field | Browser Receipt | Email PDF Receipt |
|-------|----------------|-------------------|
| **Receipt No.** | Underlined field | Underlined field |
| **Date** | Format as passed (e.g., "15 / 07 / 2026") | Reformatted with spaces around slashes |
| **Student Name** | Full width underline | Full width underline |
| **Course Name** | Uppercase, underline | Uppercase, underline |
| **Purpose To Pay** | 3 checkboxes: Admission Fee's ✓, Course Fee's ☐, Exam Fee's ☐ | 3 checkboxes: Admission Fee's ✓, Course Fee's ☐, Exam Fee's ☐ |
| **Total Amount** | ₹ formatted | ₹ formatted (uses custom Rupee font) |
| **Paid Amt.** | ₹ formatted | ₹ formatted |
| **Balance Amt.** | ₹ formatted | ₹ formatted |
| **Received By** | Formatted name (capitalized) | Raw name as passed |

### 3.4 Payment Mode Section

| Aspect | Browser Receipt | Email PDF Receipt |
|--------|----------------|-------------------|
| **Label style** | Black pill badge "Mode of Payment:" | Black pill shape "MODE OF PAYMENT:" |
| **Options** | Cash ☐, Online ☐, Cheque ☐ | Cash ☐, Online ☐, Cheque ☐ |
| **Checkbox style** | Square box with ✓ symbol | Square box with custom drawn checkmark lines |
| **Online detection** | cash/online/upi/bank/gpay/phonepe | cash/online/upi/bank/gpay/phonepe |

### 3.5 Footer

| Aspect | Browser Receipt | Email PDF Receipt |
|--------|----------------|-------------------|
| **Note 1** | "• Course Fees, Once Paid Cannot Be Refunded." | "• Course Fees, Once Paid Cannot Be Refunded." |
| **Note 2** | "• After Admission Is Completed Cancellation. Is Not Allowed." | "• After Admission Is Completed Cancellation. Is Not Allowed." |
| **Signature** | "Authority Sign./Stamp  .........................." | "Authority Sign./Stamp  .........................." |

### 3.6 Key Differences — Simple Receipt

| # | Difference | Impact |
|---|-----------|--------|
| 1 | **Browser has 2 copies (Student + Centre), PDF has only 1 (Student)** | Centre copy is missing in email |
| 2 | **Page size: A4 portrait vs A5 landscape** | Different aspect ratio, layout is compressed in PDF |
| 3 | **Logo size: 150px vs 82pt** | Logos are smaller in PDF |
| 4 | **Font sizes differ** (36px vs 26pt, 16px vs 12pt, etc.) | Visual scaling differences |
| 5 | **Date format handling** | Browser passes formatted date, PDF reformats it again |
| 6 | **Received By formatting** | Browser capitalizes name parts, PDF uses raw value |

---

## 4. Browser Full Admission Form (openCoursePaymentReceipt) vs Email PDF Full Form (generatePdfAdmissionFormBuffer)

### 4.1 Page Structure

| Aspect | Browser Full Form | Email PDF Full Form |
|--------|------------------|---------------------|
| **Page size** | A4 (794×1123px) | A4 (595×842pt) |
| **Pages** | 2 pages (Admission Form + Undertaking) | 2+ pages (Admission Form + Undertaking) |
| **Border** | 14px solid #2bb6bc (teal) | 14pt solid tealColor (rgb(0.169, 0.714, 0.737)) |
| **Watermark** | Logo, centered, 825px, opacity 0.08 | Logo, centered, 618×618pt, opacity 0.08 |

### 4.2 Header Section

| Aspect | Browser Full Form | Email PDF Full Form |
|--------|------------------|---------------------|
| **Logo** | 126×126px, flex layout | 94.5×94.5pt, absolute positioned at (35, 710) |
| **Organization name** | "TRUSTCARE INSTITUTE OF HEALTH SCIENCE" (20.5px, #013220) | "TRUSTCARE INSTITUTE OF HEALTH SCIENCE" (15.3pt, darkGreen) |
| **Email** | "Email: trustcareinstitute03@gmail.com" (12px) | "Email: trustcareinstitute03@gmail.com" (9pt) |
| **Phone icons** | Red circle with ☎ character (18×18px) | Red circle with ☎ character (6.75pt radius) |
| **Phone numbers** | +91 9967340243, +91 9967288158 | +91 9967340243, +91 9967288158 |
| **Address** | Uppercase, border-top + border-bottom, 10.5px | Mixed case, border-top + border-bottom, 8pt |

### 4.3 Photo Section

| Aspect | Browser Full Form | Email PDF Full Form |
|--------|------------------|---------------------|
| **Size** | 100×120px | 75×90pt |
| **Position** | Right side of header (flex, margin-left: auto) | Absolute at (485, 715) |
| **Border** | 1.5px solid black | 1.5pt solid black |
| **Placeholder** | Light gray background (#f2f2f2) | Light gray background (lightGrayColor) |

### 4.4 Title Banner

| Aspect | Browser Full Form | Email PDF Full Form |
|--------|------------------|---------------------|
| **Style** | clip-path: polygon(15px 0%, 100% 0%, calc(100% - 15px) 100%, 0% 100%) | SVG path with trapezoid shape |
| **Background** | #14507a (teal blue) | tealBlueColor (rgb(0.078, 0.314, 0.478)) |
| **Text** | "ADMISSION FORM" (20px, white, bold) | "ADMISSION FORM" (15pt, white, bold) |
| **Max width** | 320px | 240pt |

### 4.5 Receipt No & Date

| Aspect | Browser Full Form | Email PDF Full Form |
|--------|------------------|---------------------|
| **Receipt No** | Underlined field | Underlined line |
| **Date** | Uses **current date** (dd/mm/yyyy) | Uses **passed data.date** with spaces around slashes |
| **Font size** | 14px | 10.5pt |

### 4.6 Student Details Fields

| Field | Browser Full Form | Email PDF Full Form |
|-------|------------------|---------------------|
| **Student Name** | Underlined, flex layout | Underlined line, absolute position |
| **Course Name** | Underlined, uppercase | Underlined, uppercase |
| **Course Duration** | Underlined, max-width 180px | Underlined, 125pt from left |
| **Admission Fees** | Formatted as ₹ (en-IN currency) | Formatted as ₹ (en-IN locale) |
| **Course Fees** | Monthly fee × N Months = Total | Monthly fee × N Months = Total |
| **Exam Fees** | "As Applicable" or ₹ value | "As Applicable" or ₹ value |

### 4.7 Installment Calendar Grid

| Aspect | Browser Full Form | Email PDF Full Form |
|--------|------------------|---------------------|
| **Implementation** | HTML `<table>` with cells | Custom drawn lines + text |
| **Column width** | 8.33% each (12 cols) | 525/12 = 43.75pt each |
| **Date format** | "1<sup>st</sup> Jan" (HTML superscript) | "1st Jan" (superscript via drawSuperscriptText) |
| **Amount format** | ₹ with en-IN locale | ₹ with en-IN locale |
| **Year title** | "1<sup>st</sup> Year Fee's 2026" | "1st Year Fee's 2026" (superscript via custom function) |

### 4.8 Total Payable

| Aspect | Browser Full Form | Email PDF Full Form |
|--------|------------------|---------------------|
| **Position** | Right-aligned, border-top | Right-aligned, border-top |
| **Font size** | 14px label, 16px value | 11pt label, 12pt value |
| **Format** | ₹ formatted (en-IN currency) | ₹ formatted (en-IN locale) |

### 4.9 Bottom Section (Guardian Declaration + Signatures)

| Aspect | Browser Full Form | Email PDF Full Form |
|--------|------------------|---------------------|
| **Position** | Absolute (bottom: 32px) | Relative (after content) |
| **Separator** | Dashed border-top (1.5px #aaa) | Dashed line (1.2pt, gray) |
| **English declaration** | "I Am Mr./Ms : [guardian] [relation] of [student] — I Agree with Terms And Condition." | Same text |
| **Marathi declaration** | HTML entities for Devanagari | Canvas-rendered Devanagari text |
| **Parent's Sign.** | Border-top line + label | Border-top line + label |
| **Student Sign.** | Border-top line + label | Border-top line + label |
| **Authorised Sign./Stamp** | Border-top line + label | Border-top line + label |

### 4.10 Page 2: Undertaking / हमी पत्र

| Aspect | Browser Full Form | Email PDF Full Form |
|--------|------------------|---------------------|
| **Title** | "हमी पत्र / UNDER TAKING" (18px) | "हमी पत्र / UNDER TAKING" (13.5pt) |
| **Marathi points** | 12 points (italic, 11px) | 12 points (italic, 8.25pt) |
| **English points** | 12 points (11px) | **13 points** (8.25pt) — extra point: "It Is compulsory To Come on Time Otherwise You Are Not Permitted To Sit In Lecture." |
| **Point numbering** | Blue (#14507a) | Blue (tealBlueColor) |
| **Separator** | Dashed border (1.5px) | Dashed line (1.2pt) |
| **Bottom section** | Same guardian declaration + signatures | Same guardian declaration + signatures |

### 4.11 Key Differences — Full Admission Form

| # | Difference | Impact |
|---|-----------|--------|
| **1** | **English points count: 12 in browser vs 13 in PDF** | The PDF has an extra point: "It Is compulsory To Come on Time Otherwise You Are Not Permitted To Sit In Lecture." This is a **content mismatch** — the browser is missing this point. |
| **2** | **Date: Browser uses current date, PDF uses passed data.date** | If the passed date differs from current date, they will show different values |
| **3** | **Logo size: 126px vs 94.5pt** | Logos are smaller in PDF |
| **4** | **Font sizes differ throughout** (20.5px vs 15.3pt, 20px vs 15pt, etc.) | Visual scaling differences |
| **5** | **Address: Uppercase in browser, mixed case in PDF** | Styling inconsistency |
| **6** | **Title banner width: 320px vs 240pt** | Banner is narrower in PDF |
| **7** | **Photo size: 100×120px vs 75×90pt** | Photo is smaller in PDF |
| **8** | **Calendar grid: HTML table vs custom drawn** | Visual rendering may differ slightly |
| **9** | **Marathi text: HTML entities vs canvas rendering** | PDF uses complex canvas-based Devanagari rendering with fallback |
| **10** | **Bottom section: absolute vs relative positioning** | Layout behavior differs when content overflows |
| **11** | **Page overflow handling: Browser uses scroll, PDF adds extra pages** | PDF handles overflow by creating additional pages |
| **12** | **Date format: "dd/mm/yyyy" vs "dd / mm / yyyy"** | Spaces around slashes differ |

---

## 5. Critical Differences Summary

### 5.1 Content Mismatches (Most Critical)

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **English undertaking points: 12 in browser, 13 in PDF** | `CoursePaymentReceiptView.tsx` (enPoints) vs `send-email/route.ts` (enPoints) | **HIGH** |
| 2 | **Date source: browser uses current date, PDF uses passed data** | `openCoursePaymentReceipt` vs `generatePdfAdmissionFormBuffer` | **MEDIUM** |

### 5.2 Structural Differences

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 3 | **Simple receipt: Browser has 2 copies, PDF has 1** | `openInstallmentReceipt` vs `generatePdfReceiptBuffer` | **MEDIUM** |
| 4 | **Simple receipt: A4 portrait vs A5 landscape** | Page size mismatch | **LOW** |
| 5 | **Full form: Different logo/photo dimensions** | Visual scaling | **LOW** |

### 5.3 Styling Differences

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 6 | **Font sizes differ throughout** | All components | **LOW** |
| 7 | **Address casing (UPPER vs Mixed)** | Header section | **LOW** |
| 8 | **Banner width differs** | Title section | **LOW** |
| 9 | **Date format spacing** | Receipt fields | **LOW** |

---

## 6. Recommendations

### Critical Fixes Needed

1. **Sync English undertaking points** — Add the missing 13th point to `CoursePaymentReceiptView.tsx`:
   ```
   "It Is compulsory To Come on Time Otherwise You Are Not Permitted To Sit In Lecture."
   ```

2. **Sync date handling** — Ensure both browser and PDF use the same date source. Either:
   - Pass the current date from browser to PDF, OR
   - Have both use the same date formatting logic

### Recommended Improvements

3. **Add Centre Copy to email PDF** — The browser shows both STUDENT COPY and CENTRE COPY. Consider adding the second copy to the email PDF as well, or at least adding a note that the centre copy is available at the institute.

4. **Standardize dimensions** — Create shared constants for logo sizes, font sizes, and spacing to ensure visual consistency.

5. **Extract shared content** — Move the undertaking points (mrPoints, enPoints) to a shared module so both browser and PDF use the same source of truth.

6. **Consider using the same rendering engine** — Currently the browser uses HTML/CSS and the PDF uses pdf-lib with manual coordinate calculations. Consider using a library like `@react-pdf/renderer` or Puppeteer to generate PDFs from the same React components used in the browser, ensuring pixel-perfect matching.

### Code Duplication Issues

The following data/code is duplicated between browser and PDF:

| Data | Browser Source | PDF Source |
|------|---------------|------------|
| mrPoints (12 Marathi points) | `CoursePaymentReceiptView.tsx` line 23-36 | `send-email/route.ts` line 1064-1077 |
| enPoints (12/13 English points) | `CoursePaymentReceiptView.tsx` line 38-52 | `send-email/route.ts` line 1122-1136 |
| relationMap | `CoursePaymentReceiptView.tsx` line 599-607 | `send-email/route.ts` line 469-477 |
| monthLabels | `CoursePaymentReceiptView.tsx` line 54 | `send-email/route.ts` line 949 |
| getDaySuffix logic | `CoursePaymentReceiptView.tsx` line 620-628 | `send-email/route.ts` line 887-895 |
| getDaysInMonth logic | `CoursePaymentReceiptView.tsx` line 630-632 | `send-email/route.ts` line 899-901 |
| getValidDayForMonth logic | `CoursePaymentReceiptView.tsx` line 634-637 | `send-email/route.ts` line 903-906 |

**Recommendation:** Extract all shared data and utility functions into a shared module (e.g., `src/lib/admissionFormData.ts`) to ensure consistency.

---

## Appendix: Data Flow Diagram

```
AdmissionView.tsx (Form Input)
  │
  ├── onSubmit → saveAdmissionData()
  │     │
  │     ├── [Browser] openInstallmentReceipt({isAdmission: true})
  │     │     └── HTML popup (A4, 2 copies)
  │     │
  │     └── [Email] POST /api/send-email {type: "admission"}
  │           └── generatePdfReceiptBuffer("admission")
  │                 └── A5 PDF (1 copy)
  │
  └── onAdmissionComplete → PaymentView
        │
        └── After course payment → POST /api/send-email {type: "admission_form"}
              └── generatePdfAdmissionFormBuffer(data)
                    └── A4 PDF (2+ pages, full form + undertaking)
```

---

*Analysis generated by Cline on 15 July 2026*