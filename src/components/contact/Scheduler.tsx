"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface TimeSlot {
  date: string;
  time: string;
}

export function Scheduler() {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", reason: "", consultationType: "phone" });
  const [status, setStatus] = useState<"idle" | "booking" | "booked" | "error">("idle");

  // Generate next 14 days, Mon-Sat (include Saturday, exclude Sunday)
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    const day = date.getDay();
    if (day === 0) return null; // Skip Sunday only
    return date.toISOString().split("T")[0];
  }).filter(Boolean) as string[];

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setSelectedTime("");
    // Generate 9am-6pm slots, 30min intervals
    const defaultSlots: TimeSlot[] = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        defaultSlots.push({ date: selectedDate, time });
      }
    }
    setSlots(defaultSlots);
    setLoading(false);
  }, [selectedDate]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("booking");
    try {
      const hour = parseInt(selectedTime.split(":")[0]);
      const min = selectedTime.split(":")[1];
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const timeDisplay = `${displayHour}:${min} ${ampm}`;
      const dateDisplay = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

      // Submit lead to FUB via Cloudflare Function
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          source: "scheduler",
          note: `Consultation request:\nDate: ${dateDisplay}\nTime: ${timeDisplay} PT\nType: ${formData.consultationType}\nReason: ${formData.reason}`,
        }),
      }).catch(() => {});

      // Send booking details via mailto
      const subject = encodeURIComponent(`Consultation Request from ${formData.name}`);
      const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nType: ${formData.consultationType}\nPreferred Date: ${dateDisplay}\nPreferred Time: ${timeDisplay} PT\n\nReason:\n${formData.reason}`);
      window.open(`mailto:brenda.vega@c21anew.com?subject=${subject}&body=${body}`, "_self");
      setStatus("booked");
    } catch {
      setStatus("error");
    }
  };

  if (status === "booked") {
    return (
      <div className="bg-teal/10 rounded-2xl p-10 text-center">
        <h3 className="font-display font-light text-2xl text-navy mb-2">Consultation requested!</h3>
        <p className="font-body font-light text-charcoal-light">Brenda will confirm your appointment shortly. Check your email!</p>
      </div>
    );
  }

  const inputClass = "w-full font-body font-light text-base text-charcoal bg-cream border border-navy/10 rounded-lg px-4 py-3 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors min-h-[48px]";

  return (
    <form onSubmit={handleBook} className="space-y-6">
      <div>
        <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-3 block">Select a Date</label>
        <div className="flex gap-2 flex-wrap">
          {availableDates.map((date) => {
            const d = new Date(date + "T12:00:00");
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = d.getDate();
            const month = d.toLocaleDateString("en-US", { month: "short" });
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all min-w-[60px] min-h-[48px] ${
                  selectedDate === date ? "bg-navy text-cream border-navy" : "bg-white text-charcoal border-navy/10 hover:border-teal"
                }`}
              >
                <span className="text-[0.6rem] uppercase tracking-wider opacity-70">{dayName}</span>
                <span className="font-display font-semibold text-lg leading-none">{dayNum}</span>
                <span className="text-[0.55rem] uppercase tracking-wider opacity-70">{month}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div>
          <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-3 block">Select a Time (Pacific)</label>
          {loading ? (
            <p className="font-body font-light text-sm text-charcoal-light">Loading available times...</p>
          ) : slots.length === 0 ? (
            <p className="font-body font-light text-sm text-charcoal-light">No available slots for this date. Try another day.</p>
          ) : (
            <div className="grid grid-cols-3 tablet:grid-cols-4 desktop:grid-cols-6 gap-2">
              {slots.map((slot) => {
                const hr = parseInt(slot.time.split(":")[0]);
                const mn = slot.time.split(":")[1];
                const ap = hr >= 12 ? "PM" : "AM";
                const dh = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setSelectedTime(slot.time)}
                    className={`py-2 px-3 rounded-lg border text-sm transition-all min-h-[44px] ${
                      selectedTime === slot.time ? "bg-teal text-white border-teal" : "bg-white text-charcoal border-navy/10 hover:border-teal"
                    }`}
                  >
                    {dh}:{mn} {ap}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedTime && (
        <>
          <div className="grid tablet:grid-cols-2 gap-5">
            <div>
              <label htmlFor="sched-name" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Full Name *</label>
              <input id="sched-name" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="sched-phone" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Phone *</label>
              <input id="sched-phone" type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="sched-email" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Email *</label>
            <input id="sched-email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label htmlFor="sched-type" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Consultation Type</label>
            <select id="sched-type" value={formData.consultationType} onChange={(e) => setFormData({ ...formData, consultationType: e.target.value })} className={inputClass}>
              <option value="phone">Phone Call</option>
              <option value="video">Video Call</option>
              <option value="in-person">In Person</option>
            </select>
          </div>
          <div>
            <label htmlFor="sched-reason" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">What can Brenda help you with?</label>
            <textarea id="sched-reason" rows={3} value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={`${inputClass} resize-none`} />
          </div>
          <Button type="submit" variant="gold" disabled={status === "booking"}>
            {status === "booking" ? "Booking..." : "Confirm Consultation"}
          </Button>
          {status === "error" && (
            <p className="font-body font-light text-sm text-red-600">Something went wrong. Please try again or call Brenda directly.</p>
          )}
        </>
      )}
    </form>
  );
}
