export function AreaMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapSrc = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=Campbell,CA&zoom=11`
    : "";

  if (!mapSrc) {
    return (
      <div className="rounded-2xl overflow-hidden h-[400px] bg-navy/5 flex items-center justify-center">
        <span className="font-body font-light text-charcoal-light/50">Map available when Google Maps API key is configured</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden h-[400px] bg-navy/5">
      <iframe
        src={mapSrc}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Bay Area service area map"
      />
    </div>
  );
}
