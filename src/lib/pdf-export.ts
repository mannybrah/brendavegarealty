import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AmortizationRow, PaymentBreakdown, ClosingCostItem } from "@/types";

interface PdfExportData {
  title: string;
  inputs: Record<string, string>;
  payment: PaymentBreakdown;
  closingCosts: ClosingCostItem[];
  totalClosingCosts: number;
  downPayment: number;
  amortizationSummary: { totalPayments: number; totalInterest: number; payoffDate: string };
  amortizationSchedule: AmortizationRow[];
  loanType: string;
}

function addWatermark(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const text = "Prepared by Brenda Vega  |  brendavegarealty.com";

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GState = (jsPDF as any).API.GState || (doc as any).GState;
    if (GState) {
      doc.setGState(new GState({ opacity: 0.08 }));
    }
    doc.setFontSize(14);
    doc.setTextColor(15, 29, 53); // navy

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Tile watermark diagonally
    for (let y = -pageHeight; y < pageHeight * 2; y += 80) {
      for (let x = -pageWidth; x < pageWidth * 2; x += 300) {
        doc.text(text, x, y, { angle: 45 });
      }
    }
    doc.restoreGraphicsState();
  }
}

export function generateCalculatorPDF(data: PdfExportData): void {
  const doc = new jsPDF();
  const navy = [15, 29, 53] as const;
  const gold = [200, 165, 91] as const;
  let y = 15;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(...navy);
  doc.text("Brenda Vega | REALTOR\u00AE | DRE #02196981", 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text("(501) 827-9619  |  brenda.vega@c21anew.com  |  brendavegarealty.com", 14, y);
  y += 3;
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);
  y += 8;

  // Title
  doc.setFontSize(14);
  doc.setTextColor(...navy);
  doc.text(data.title, 14, y);
  y += 8;

  // Inputs summary
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text("Calculator Inputs", 14, y);
  y += 5;

  const inputRows = Object.entries(data.inputs).map(([k, v]) => [k, v]);
  autoTable(doc, {
    startY: y,
    head: [["Parameter", "Value"]],
    body: inputRows,
    theme: "grid",
    headStyles: { fillColor: [...navy], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // Payment breakdown
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text("Monthly Payment Breakdown", 14, y);
  y += 5;

  const paymentRows = [
    ["Principal & Interest", `$${data.payment.principalAndInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["Property Tax", `$${data.payment.propertyTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["Hazard Insurance", `$${data.payment.hazardInsurance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    [data.loanType === "fha" ? "MIP" : "PMI", `$${data.payment.pmi.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["HOA", `$${data.payment.hoa.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["Total Monthly", `$${data.payment.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
  ];

  autoTable(doc, {
    startY: y,
    body: paymentRows,
    theme: "grid",
    bodyStyles: { fontSize: 8 },
    margin: { left: 14 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // Closing costs
  if (data.closingCosts.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...navy);
    doc.text("Estimated Closing Costs", 14, y);
    y += 5;

    const ccRows = data.closingCosts.map((c) => [c.label, `$${c.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`]);
    ccRows.push(["Total", `$${data.totalClosingCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}`]);
    ccRows.push(["Total Funds Needed", `$${(data.downPayment + data.totalClosingCosts).toLocaleString(undefined, { maximumFractionDigits: 0 })}`]);

    autoTable(doc, {
      startY: y,
      body: ccRows,
      theme: "grid",
      bodyStyles: { fontSize: 8 },
      margin: { left: 14 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Amortization summary
  doc.addPage();
  y = 15;
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text("Amortization Summary", 14, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    body: [
      ["Total Payments", `$${data.amortizationSummary.totalPayments.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
      ["Total Interest", `$${data.amortizationSummary.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
      ["Payoff Date", data.amortizationSummary.payoffDate],
    ],
    theme: "grid",
    bodyStyles: { fontSize: 8 },
    margin: { left: 14 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // Full amortization schedule
  doc.setFontSize(10);
  doc.text("Full Amortization Schedule", 14, y);
  y += 5;

  const amortRows = data.amortizationSchedule.map((row) => [
    String(row.month),
    row.date,
    `$${row.payment.toFixed(2)}`,
    `$${row.principal.toFixed(2)}`,
    `$${row.interest.toFixed(2)}`,
    `$${row.balance.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Date", "Payment", "Principal", "Interest", "Balance"]],
    body: amortRows,
    theme: "grid",
    headStyles: { fillColor: [...navy], fontSize: 7 },
    bodyStyles: { fontSize: 6 },
    margin: { left: 14 },
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text("Prepared by Brenda Vega | Century 21", 14, 285);
    doc.text("Estimates only. Consult a licensed mortgage professional for exact figures.", 14, 289);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 170, 285);
    doc.text(`Page ${i} of ${pageCount}`, 180, 289);
  }

  // Watermark
  addWatermark(doc);

  doc.save(`${data.title.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`);
}
