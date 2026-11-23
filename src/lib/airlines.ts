export interface AirlineProfile {
  iata: string;
  name: string;
  handle: string;
  claimEmail: string;
  region: "EU" | "UK" | "TR" | "US" | "INTL";
}

export const AIRLINE_MAP: Record<string, AirlineProfile> = {
  LH: {
    iata: "LH",
    name: "Lufthansa",
    handle: "@lufthansa",
    claimEmail: "customer.relations@lufthansa.com",
    region: "EU",
  },
  FR: {
    iata: "FR",
    name: "Ryanair",
    handle: "@Ryanair",
    claimEmail: "customerqueries@ryanair.com",
    region: "EU",
  },
  BA: {
    iata: "BA",
    name: "British Airways",
    handle: "@British_Airways",
    claimEmail: "customer.relations@ba.com",
    region: "UK",
  },
  AF: {
    iata: "AF",
    name: "Air France",
    handle: "@airfrance",
    claimEmail: "mail.customercare@airfrance.fr",
    region: "EU",
  },
  KL: {
    iata: "KL",
    name: "KLM Royal Dutch Airlines",
    handle: "@KLM",
    claimEmail: "customercare@klm.com",
    region: "EU",
  },
  U2: {
    iata: "U2",
    name: "easyJet",
    handle: "@easyJet",
    claimEmail: "customer.support@easyjet.com",
    region: "UK",
  },
  W6: {
    iata: "W6",
    name: "Wizz Air",
    handle: "@wizzair",
    claimEmail: "customerrelations@wizzair.com",
    region: "EU",
  },
  TK: {
    iata: "TK",
    name: "Turkish Airlines",
    handle: "@TurkishAirlines",
    claimEmail: "customer@thy.com",
    region: "TR",
  },
  PC: {
    iata: "PC",
    name: "Pegasus Airlines",
    handle: "@flymepegasus",
    claimEmail: "guestrelations@flypgs.com",
    region: "TR",
  },
  EK: {
    iata: "EK",
    name: "Emirates",
    handle: "@emirates",
    claimEmail: "customer.affairs@emirates.com",
    region: "INTL",
  },
  QR: {
    iata: "QR",
    name: "Qatar Airways",
    handle: "@qatarairways",
    claimEmail: "tell-us@qatarairways.com.qa",
    region: "INTL",
  },
  DL: {
    iata: "DL",
    name: "Delta Air Lines",
    handle: "@Delta",
    claimEmail: "charter@delta.com",
    region: "US",
  },
  UA: {
    iata: "UA",
    name: "United Airlines",
    handle: "@united",
    claimEmail: "customercare@united.com",
    region: "US",
  },
  AA: {
    iata: "AA",
    name: "American Airlines",
    handle: "@AmericanAir",
    claimEmail: "customer.relations@aa.com",
    region: "US",
  },
  IB: {
    iata: "IB",
    name: "Iberia",
    handle: "@Iberia",
    claimEmail: "relacionesclientes@iberia.es",
    region: "EU",
  },
  VY: {
    iata: "VY",
    name: "Vueling",
    handle: "@vueling",
    claimEmail: "contactus@vueling.com",
    region: "EU",
  },
  LX: {
    iata: "LX",
    name: "SWISS",
    handle: "@FlySWISS",
    claimEmail: "contactus@swiss.com",
    region: "EU",
  },
  OS: {
    iata: "OS",
    name: "Austrian Airlines",
    handle: "@_austrian",
    claimEmail: "feedback@austrian.com",
    region: "EU",
  },
  SK: {
    iata: "SK",
    name: "SAS Scandinavian Airlines",
    handle: "@SAS",
    claimEmail: "customercare@sas.se",
    region: "EU",
  },
  AY: {
    iata: "AY",
    name: "Finnair",
    handle: "@Finnair",
    claimEmail: "customer.relations@finnair.com",
    region: "EU",
  },
  TP: {
    iata: "TP",
    name: "TAP Air Portugal",
    handle: "@tapairportugal",
    claimEmail: "customer@tap.pt",
    region: "EU",
  },
  AZ: {
    iata: "AZ",
    name: "ITA Airways",
    handle: "@ITAAirways",
    claimEmail: "reclami@ita-airways.com",
    region: "EU",
  },
  EI: {
    iata: "EI",
    name: "Aer Lingus",
    handle: "@AerLingus",
    claimEmail: "customerrelations@aerlingus.com",
    region: "EU",
  },
  VS: {
    iata: "VS",
    name: "Virgin Atlantic",
    handle: "@VirginAtlantic",
    claimEmail: "customer.relations@fly.virgin.com",
    region: "UK",
  },
  AC: {
    iata: "AC",
    name: "Air Canada",
    handle: "@AirCanada",
    claimEmail: "customerrelations@aircanada.ca",
    region: "INTL",
  },
  SQ: {
    iata: "SQ",
    name: "Singapore Airlines",
    handle: "@SingaporeAir",
    claimEmail: "public_affairs@singaporeair.com.sg",
    region: "INTL",
  },
  EY: {
    iata: "EY",
    name: "Etihad Airways",
    handle: "@etihad",
    claimEmail: "feedback@etihad.ae",
    region: "INTL",
  },
  WN: {
    iata: "WN",
    name: "Southwest Airlines",
    handle: "@SouthwestAir",
    claimEmail: "customerrelations@wnco.com",
    region: "US",
  },
  B6: {
    iata: "B6",
    name: "JetBlue",
    handle: "@JetBlue",
    claimEmail: "dearjetblue@jetblue.com",
    region: "US",
  },
};

export function extractAirlinePrefix(flightNumber: string): string {
  const cleaned = flightNumber.trim().toUpperCase().replace(/\s+/g, "");
  const match = cleaned.match(/^([A-Z0-9]{2})\d+/);
  return match ? match[1] : cleaned.slice(0, 2);
}

export function normalizeFlightNumber(flightNumber: string): string {
  return flightNumber.trim().toUpperCase().replace(/\s+/g, "");
}

export function getAirlineProfile(
  flightNumber: string,
  fallbackName?: string
): AirlineProfile {
  const iata = extractAirlinePrefix(flightNumber);
  const found = AIRLINE_MAP[iata];
  if (found) return found;
  const cleanName = fallbackName?.trim() || `${iata} Airlines`;
  const inferredHandle = `@${cleanName.replace(/[^A-Za-z0-9]/g, "")}`;
  return {
    iata,
    name: cleanName,
    handle: inferredHandle,
    claimEmail: `claims@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "") || "airline"}.com`,
    region: "INTL",
  };
}
