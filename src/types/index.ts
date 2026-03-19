export interface Testimonial {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
  type: "buyer" | "seller";
  videoUrl?: string;
}

export interface NeighborhoodArea {
  slug: string;
  name: string;
  description: string;
  whyLiveHere: string;
  medianPrice: string;
  highlights: string[];
  imageUrl: string;
}

export interface ScheduleSlot {
  date: string;
  time: string;
  available: boolean;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  type: "buyer" | "seller" | "other";
}

export interface BookingData {
  name: string;
  email: string;
  phone: string;
  reason: string;
  date: string;
  time: string;
  consultationType: "phone" | "video" | "in-person";
}

// Lead capture types
export interface LeadRequest {
  name: string;
  phone: string;
  email: string;
  workingWithAgent: boolean;
  timeline: "0-3 months" | "3-6 months" | "6-12 months" | "12+ months" | "Just browsing";
  source: "qualification-calculator" | "cost-calculator" | "phone-call" | "scheduler" | "contact-form";
  calculatorSummary?: CalculatorSummary;
}

export interface CalculatorSummary {
  purchasePrice?: number;
  downPayment?: number;
  loanType?: string;
  dtiRatio?: number;
  qualificationStatus?: string;
  monthlyPayment?: number;
  city?: string;
}

// Bay Area city data
export interface BayAreaCity {
  name: string;
  county: string;
  propertyTaxRate: number;
  transferTaxRate: number;
  historicalAppreciation: number;
  medianHomePrice: number;
}

// Calculator types
export interface PaymentBreakdown {
  principalAndInterest: number;
  propertyTax: number;
  hazardInsurance: number;
  pmi: number;
  hoa: number;
  total: number;
}

export interface QualificationResult {
  loanAmount: number;
  payment: PaymentBreakdown;
  dtiRatio: number;
  verdict: "likely-qualifies" | "borderline" | "may-not-qualify";
  explanation: string;
}

export interface AmortizationRow {
  month: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface ClosingCostItem {
  label: string;
  amount: number;
  category: "prepaid" | "nonrecurring" | "seller";
  editable?: boolean;
}

export interface RentVsBuyResult {
  afterTaxPayment: number;
  monthlyTaxSavings: number;
  trueCostOfBuying: number;
  monthlyGainLoss: number;
  homeValueAt5Years: number;
  homeValueAt10Years: number;
  netGainAt5Years: number;
  netGainAt10Years: number;
}
