// Communities directory for /areas. Cities and neighborhoods are listed together,
// which is why the page says "communities" rather than "cities".
//
// `guide` points at an existing area guide page. Every other entry is an honest
// "Ask Brenda" link: there is no dedicated guide yet, so none is implied.
//
// NOTE FOR THE OWNER: this list was rebuilt from the written redesign brief (nine regions,
// named cities). The approved preview's communities.html was not available when this was
// built, so reconcile the entries against it; edit this file only, the page follows.

export interface Community {
  name: string;
  guide?: string;
}

export interface CommunityGroup {
  region: string;
  communities: Community[];
}

export const communityGroups: CommunityGroup[] = [
  {
    region: "San Jose & neighborhoods",
    communities: [
      { name: "San Jose", guide: "/areas/san-jose" },
      { name: "Willow Glen" },
      { name: "Almaden Valley" },
      { name: "Cambrian" },
      { name: "Evergreen" },
      { name: "Berryessa" },
      { name: "Rose Garden" },
      { name: "Downtown San Jose" },
    ],
  },
  {
    region: "Silicon Valley & West Valley",
    communities: [
      { name: "Campbell", guide: "/areas/campbell" },
      { name: "Los Gatos", guide: "/areas/los-gatos" },
      { name: "Saratoga", guide: "/areas/saratoga" },
      { name: "Cupertino" },
      { name: "Santa Clara" },
      { name: "Sunnyvale" },
      { name: "Monte Sereno" },
      { name: "Milpitas" },
    ],
  },
  {
    region: "Southern Peninsula",
    communities: [
      { name: "Mountain View" },
      { name: "Los Altos" },
      { name: "Los Altos Hills" },
      { name: "Palo Alto" },
      { name: "Menlo Park" },
      { name: "Atherton" },
      { name: "East Palo Alto" },
      { name: "Redwood City" },
      { name: "Woodside" },
      { name: "Portola Valley" },
    ],
  },
  {
    region: "Central & Northern Peninsula",
    communities: [
      { name: "San Carlos" },
      { name: "Belmont" },
      { name: "Foster City" },
      { name: "San Mateo" },
      { name: "Burlingame" },
      { name: "Hillsborough" },
      { name: "Millbrae" },
      { name: "San Bruno" },
      { name: "South San Francisco" },
      { name: "Brisbane" },
      { name: "Daly City" },
    ],
  },
  {
    region: "San Francisco & coast",
    communities: [{ name: "San Francisco" }, { name: "Pacifica" }, { name: "Half Moon Bay" }],
  },
  {
    region: "East Bay",
    communities: [{ name: "Oakland" }, { name: "Fremont" }, { name: "Hayward" }, { name: "Union City" }],
  },
  {
    region: "South County",
    communities: [{ name: "Morgan Hill" }, { name: "Gilroy" }],
  },
  {
    region: "Santa Cruz coast",
    communities: [{ name: "Santa Cruz" }, { name: "Capitola" }, { name: "Scotts Valley" }, { name: "Watsonville" }],
  },
  {
    region: "Monterey Peninsula & nearby",
    communities: [
      { name: "Monterey" },
      { name: "Carmel-by-the-Sea" },
      { name: "Pacific Grove" },
      { name: "Marina" },
      { name: "Seaside" },
      { name: "Salinas" },
    ],
  },
];

export const communityCount = communityGroups.reduce((n, g) => n + g.communities.length, 0);
