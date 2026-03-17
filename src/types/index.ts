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
