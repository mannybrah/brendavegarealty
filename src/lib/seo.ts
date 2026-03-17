import { siteConfig } from "@/data/site";

export function getLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: siteConfig.name,
    description: "Bay Area real estate agent serving Campbell, San Jose, and Northern California.",
    url: `https://${siteConfig.domain}`,
    telephone: siteConfig.agent.phone,
    email: siteConfig.agent.email,
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 37.2871,
        longitude: -121.9552,
      },
      geoRadius: "50000",
    },
    memberOf: {
      "@type": "Organization",
      name: siteConfig.agent.brokerage,
    },
  };
}
