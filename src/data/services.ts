import { siteConfig } from "@/data/site";
import { areas } from "@/data/areas";

/**
 * Answer-first service pages: one specific thing people ask about a local agent per
 * page ("who helps first-time buyers in Campbell?"). Rendered by /services/[slug];
 * the /services index, the sitemap, llms.txt, the area pages and the JSON-LD all read
 * from this list, so adding an entry here is the whole job.
 *
 * Editorial rules (real estate compliance):
 *  - Only facts about Brenda that are already stated elsewhere on the site. No sales
 *    counts, awards, certifications, languages or years of experience.
 *  - No home prices, price ranges or market statistics.
 *  - Fair Housing: nothing about the kinds of people who live in an area, no school
 *    quality or safety judgments. Point to official city / school district sources.
 *  - No guarantees about sale price, timing or outcome.
 */
export interface ServicePage {
  slug: string;
  /** Page name, used for links, breadcrumbs and JSON-LD. */
  title: string;
  /** H1. */
  headline: string;
  /** One line for the /services index cards. */
  summary: string;
  /** Direct, self-contained answer: who, what, where, license. */
  answer: string;
  /** What working with Brenda involves. */
  involves: string[];
  sections: { heading: string; body: string }[];
  /** Plain text only: mirrored into FAQPage JSON-LD. */
  faqs: { q: string; a: string }[];
  /** Blog slugs to link. Missing or not-yet-published slugs are skipped. */
  posts: string[];
  metaTitle: string;
  metaDescription: string;
}

const { name, title, brokerage, dre, phone } = siteConfig.agent;

/** Public license lookup on the California Department of Real Estate website (search form; the reader
 *  enters the license number). Deliberately not a deep link to her record, which also shows a mailing address. */
export const DRE_LOOKUP_URL = "https://www2.dre.ca.gov/publicasp/pplinfo.asp";

/** "Campbell, San Jose, Los Gatos, Saratoga and the greater Bay Area" (from src/data/areas.ts). */
export const SERVICE_AREA_TEXT = `${areas.map((a) => a.name).join(", ")} and the greater Bay Area`;

const WHO = `${name} is a ${title} with ${brokerage} (California DRE #${dre})`;

const LICENSE_FAQ = {
  q: `How can I verify ${name}'s real estate license?`,
  a: `Look up license number ${dre} with the public license lookup on the California Department of Real Estate website (dre.ca.gov). The record shows the license status and the responsible broker.`,
};

const AREAS_FAQ_ANSWER = `Her primary area is Campbell, and she also works with clients in San Jose, Los Gatos, Saratoga and the greater Bay Area. Each of those cities has its own area guide on this site.`;

export const services: ServicePage[] = [
  {
    slug: "first-time-home-buyers",
    title: "First-Time Home Buyers",
    headline: "Buying your first home in the South Bay",
    summary: "Step-by-step representation for a first purchase, from pre-approval to closing.",
    answer: `${WHO} who represents first-time home buyers in ${SERVICE_AREA_TEXT}. She walks first-time buyers through each stage of a purchase: getting pre-approved, choosing where to look, writing an offer, inspections, disclosures and closing. A first consultation is free and can be by phone, video or in person.`,
    involves: [
      "A free first consultation by phone, video or in person",
      "Getting pre-approved, not just pre-qualified, before you tour",
      "Comparing cities and neighborhoods against your own budget, commute and priorities",
      "A comparative market analysis for each home you are serious about",
      "A written offer, with each contingency explained before you sign",
      "Guidance through inspections, seller disclosures and closing",
    ],
    sections: [
      {
        heading: "Where a first purchase starts",
        body: "The first step is knowing where you stand financially, before you look at a single listing. Brenda recommends getting pre-approved rather than pre-qualified, because a pre-approval letter from a lender shows a seller you are a serious buyer. Lenders typically ask for two years of tax returns, recent pay stubs and bank statements. The calculators on this site let you estimate a monthly payment and closing costs ahead of that conversation.",
      },
      {
        heading: "Searching and making an offer",
        body: "Once you know your budget, the search is about fit: which city, what kind of home, and which trade-offs you are willing to make. For any home you are serious about, Brenda reviews recent comparable sales so you can see what the asking price is based on. When you are ready to write an offer, she explains the price, the timeline and each contingency, including what it means to keep or waive one.",
      },
      {
        heading: "From accepted offer to keys",
        body: "After an offer is accepted you are in escrow. This is when you complete your home inspection, finalize the loan and review the seller's disclosures, which in California include a Transfer Disclosure Statement and a Natural Hazard Disclosure. Brenda stays with you through each of those steps until closing.",
      },
    ],
    faqs: [
      {
        q: `Does ${name} work with first-time home buyers?`,
        a: `Yes. ${WHO} and represents first-time buyers in ${SERVICE_AREA_TEXT}. She gives a first purchase the same care as any other transaction and explains each step before you have to make a decision.`,
      },
      {
        q: "Should I get pre-approved before I start touring homes?",
        a: "Yes, that is what Brenda recommends. A pre-approval means a lender has reviewed your income, assets and credit, so it carries more weight with sellers than a pre-qualification. It also tells you what monthly payment you are working with before you get attached to a home.",
      },
      {
        q: "Which areas does she cover for first-time buyers?",
        a: AREAS_FAQ_ANSWER,
      },
      {
        q: "What does a first consultation cost?",
        a: `Nothing. The first consultation is free and can be a phone call, a video call or an in-person meeting. You can request a time on the contact page or call ${phone}.`,
      },
      LICENSE_FAQ,
    ],
    posts: [
      "first-time-buyers-santa-clara-county-before-touring",
      "first-time-home-buyers-guide-south-bay",
      "understanding-closing-costs-california",
      "3-contingencies-never-waive-bay-area",
      "how-to-choose-real-estate-agent-campbell-ca",
    ],
    metaTitle: "First-Time Home Buyer Agent in Campbell & the South Bay",
    metaDescription: `${name}, ${title} with ${brokerage} (DRE #${dre}), represents first-time home buyers in Campbell, San Jose, Los Gatos and Saratoga. Free consultation.`,
  },
  {
    slug: "buying-a-home",
    title: "Buying a Home",
    headline: "A buyer's agent for Campbell and the South Bay",
    summary: "Buyer representation: comparable sales, offer strategy, inspections and escrow.",
    answer: `${WHO} who represents home buyers in ${SERVICE_AREA_TEXT}. As your buyer's agent she reviews comparable sales for each home you are considering, writes and negotiates your offer, and stays with you through inspections, disclosures and closing. She works with buyers at every level of experience, from first-time buyers to investors.`,
    involves: [
      "A free consultation to talk through budget, timing and where you want to live",
      "A written buyer representation agreement that spells out services and compensation",
      "A review of comparable sales for each home you are serious about",
      "An offer strategy that covers price, contingencies and closing timeline",
      "Coordination through inspections, disclosures and escrow",
      "Calculators for monthly payment, closing costs and renting versus buying",
    ],
    sections: [
      {
        heading: "What a buyer's agent does",
        body: "A buyer's agent works for you, not for the seller. That means advising you on what a home is worth based on recent sales, pointing out what to look at before you offer, writing the offer and negotiating its terms, and keeping the escrow on track. The listing agent on the other side of the transaction represents the seller.",
      },
      {
        heading: "The agreement you sign first",
        body: "In California, a buyer and their agent put the relationship in writing with a buyer representation agreement. It states what the agent will do, how long the agreement lasts and how the agent is paid. Read it before you sign, and ask about anything that is unclear, including how to end it.",
      },
      {
        heading: "Competing for a home",
        body: "Well-priced homes in the South Bay often draw more than one offer. Brenda's approach is to look at every part of the offer, not only the price: your pre-approval, the contingencies you keep, and how flexible you can be on the closing date. She has written about which contingencies she believes buyers should keep, and why.",
      },
    ],
    faqs: [
      {
        q: `Is ${name} a buyer's agent in Campbell, CA?`,
        a: `Yes. ${WHO}. Her primary area is Campbell, and she also represents buyers in San Jose, Los Gatos, Saratoga and the greater Bay Area.`,
      },
      {
        q: "Do I need my own agent, or can I use the listing agent?",
        a: "You can do either, but the listing agent represents the seller. In California, one agent or brokerage can represent both sides only with the written consent of both the buyer and the seller. A buyer's agent advises you alone on price, inspections and terms.",
      },
      {
        q: "Will I have to sign something before touring homes?",
        a: "Expect to. California law requires a written buyer representation agreement between a buyer and their agent, and agents who belong to a multiple listing service generally need one in place before touring a home with you. You do not need one to walk through an open house on your own.",
      },
      {
        q: "Does she work with investors and repeat buyers?",
        a: "Yes. Brenda works with buyers at every level of experience, from first-time buyers to experienced investors.",
      },
      LICENSE_FAQ,
    ],
    posts: [
      "listing-agent-or-own-buyers-agent-california",
      "how-to-win-bidding-war-bay-area",
      "3-contingencies-never-waive-bay-area",
      "hoa-fees-silicon-valley-condos-worth-paying",
      "mello-roos-bay-area-hidden-tax-buyers",
    ],
    metaTitle: "Buyer's Agent in Campbell, CA & the South Bay",
    metaDescription: `${name}, ${title} with ${brokerage} (DRE #${dre}), represents home buyers in Campbell, San Jose, Los Gatos and Saratoga: comparable sales, offers, inspections, closing.`,
  },
  {
    slug: "selling-a-home",
    title: "Selling a Home",
    headline: "A listing agent for Campbell and the South Bay",
    summary: "Listing representation: pricing analysis, preparation, marketing and offer review.",
    answer: `${WHO} who lists and sells homes in ${SERVICE_AREA_TEXT}. For sellers she prepares a comparative market analysis to support the list price, advises on preparation and staging, arranges professional photography, aerial shots and a video walkthrough, and reviews every offer with you on its terms as well as its price.`,
    involves: [
      "A free consultation by phone, video or in person",
      "A list-price recommendation backed by a comparative market analysis of recent nearby sales",
      "Advice on staging, curb appeal and which updates are worth doing before you list",
      "Guidance on pre-sale inspections and the California disclosure package",
      "Professional photography, aerial shots and a video walkthrough for the listing",
      "A side-by-side review of offers: price, contingencies, financing and closing timeline",
    ],
    sections: [
      {
        heading: "How the list price is set",
        body: "Brenda's pricing recommendation comes from a comparative market analysis: recent sales close to your home, adjusted for square footage, lot size, condition and upgrades. She walks you through the comparable sales behind the number. No agent can promise what a home will sell for, so the analysis is there to let you judge the recommendation for yourself.",
      },
      {
        heading: "Preparing the home and the paperwork",
        body: "Before a home goes on the market there are two tracks of preparation. One is presentation: staging, curb appeal and targeted updates. The other is paperwork: California sellers provide written disclosures, including the Transfer Disclosure Statement, the Seller Property Questionnaire and the Natural Hazard Disclosure, and many South Bay sellers order inspections before listing so buyers can review the reports up front.",
      },
      {
        heading: "Marketing and offers",
        body: "For every listing Brenda hires a professional photographer, adds aerial shots and creates a video walkthrough, so buyers who start their search online see the home properly. When offers arrive she compares them on more than price: the buyer's financing, the contingencies, the deposit and the closing timeline all affect which offer is strongest for you.",
      },
    ],
    faqs: [
      {
        q: `Is ${name} a listing agent in Campbell, CA?`,
        a: `Yes. ${WHO} and lists homes in ${SERVICE_AREA_TEXT}.`,
      },
      {
        q: "How does Brenda decide what to list my home for?",
        a: "She prepares a comparative market analysis using recent sales near your home, adjusted for size, lot, condition and upgrades, and walks you through the comparable sales. The list price is your decision, and no agent can guarantee a final sale price.",
      },
      {
        q: "Should I get inspections before I list?",
        a: "It is common practice in Silicon Valley for sellers to order inspections before listing, typically a general home inspection and a pest inspection, and sometimes roof or sewer lateral inspections. Providing the reports up front lets buyers make an informed offer.",
      },
      {
        q: "What should I ask a listing agent before I sign?",
        a: "Brenda suggests five questions for any agent you interview: how they arrived at the list price, what exactly their marketing plan is, how and how often they will communicate, what experience they have in your neighborhood, and what happens if you are not happy with how things are going.",
      },
      LICENSE_FAQ,
    ],
    posts: [
      "5-questions-to-ask-before-you-hire-a-listing-agent",
      "seller-disclosures-california-what-to-disclose",
      "10-things-before-selling-home-silicon-valley",
      "pre-inspection-bay-area-sellers-pay-first",
      "how-to-choose-real-estate-agent-campbell-ca",
    ],
    metaTitle: "Listing Agent in Campbell, CA & the South Bay",
    metaDescription: `${name}, ${title} with ${brokerage} (DRE #${dre}), lists and sells homes in Campbell, San Jose, Los Gatos and Saratoga: pricing analysis, preparation, marketing, offers.`,
  },
  {
    slug: "relocating-to-the-south-bay",
    title: "Relocating to the South Bay",
    headline: "Moving to the South Bay from somewhere else",
    summary: "Start by phone or video before you arrive, then buy with local representation.",
    answer: `${WHO} who represents buyers moving to ${SERVICE_AREA_TEXT}. If you are relocating, you can start with a free consultation by phone or video before you arrive, compare cities using the area guides on this site, and have Brenda represent you through the offer, inspections and closing.`,
    involves: [
      "A free consultation by phone or video, wherever you are now",
      "Area guides for Campbell, San Jose, Los Gatos and Saratoga",
      "A review of comparable sales for each home you are considering",
      "Plain explanations of California-specific steps: disclosures, escrow and closing costs",
      "Representation through the offer, inspections and closing",
    ],
    sections: [
      {
        heading: "Starting before you arrive",
        body: "You do not have to be in California to begin. Brenda offers consultations by phone and video, so you can talk through timing, budget and the kind of home you are looking for before you travel. The listings page and the area guides on this site are a useful first pass at what is available and where.",
      },
      {
        heading: "Comparing cities",
        body: "Campbell, San Jose, Los Gatos and Saratoga sit close together but differ in housing types, lot sizes and how each downtown is laid out. The area guides and neighborhood articles on this site describe those differences. For questions about schools, city services or local rules, the official school district and city websites are the sources to rely on.",
      },
      {
        heading: "What is different about buying in California",
        body: "Buyers arriving from other states often meet a few things for the first time: the seller disclosure package, the escrow process, special property taxes such as Mello-Roos in some neighborhoods, and California's closing costs. Brenda has written about each of these on this site, and explains them as they come up in your purchase.",
      },
    ],
    faqs: [
      {
        q: `Can I start working with ${name} before I move to the Bay Area?`,
        a: "Yes. Consultations are available by phone or video as well as in person, so you can start from wherever you live now. You can request a time on the contact page.",
      },
      {
        q: "Which cities does she cover?",
        a: AREAS_FAQ_ANSWER,
      },
      {
        q: "Can Brenda tell me which neighborhood is right for me?",
        a: "She can explain how areas differ in housing types, lot sizes, commute routes and nearby amenities, and point you to official sources such as city and school district websites. Under fair housing law, a real estate agent does not steer buyers toward or away from an area based on who lives there, so the choice of neighborhood is yours.",
      },
      {
        q: "Should I rent first or buy right away?",
        a: "It depends on your timeline, your finances and how well you already know the area. The renting versus buying article on this site walks through the factors to weigh, and a consultation is a good place to talk through your own situation.",
      },
      LICENSE_FAQ,
    ],
    posts: [
      "campbell-vs-los-gatos-neighborhoods",
      "renting-vs-buying-san-jose",
      "understanding-closing-costs-california",
      "mello-roos-bay-area-hidden-tax-buyers",
      "listing-agent-or-own-buyers-agent-california",
    ],
    metaTitle: "Relocating to Campbell & the South Bay: Buyer Representation",
    metaDescription: `Moving to the South Bay? ${name}, ${title} with ${brokerage} (DRE #${dre}), offers phone and video consultations and represents buyers in Campbell, San Jose, Los Gatos and Saratoga.`,
  },
];

export function getService(slug: string): ServicePage | undefined {
  return services.find((s) => s.slug === slug);
}
