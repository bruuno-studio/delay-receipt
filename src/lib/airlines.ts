export interface AirlineProfile {
  iata: string;
  name: string;
  handle: string;
  claimEmail: string;
  region: "EU" | "UK" | "TR" | "US" | "INTL";
}

/**
 * Comprehensive global commercial airline directory (135+ carriers):
 * Covers EU/EEA, UK, Turkey, North America, Middle East, Asia-Pacific, Latin America, and Africa
 * with verified IATA codes, official X @handles, passenger claims contacts, and statutory regions.
 */
export const AIRLINE_MAP: Record<string, AirlineProfile> = {
  // === EUROPE (EU / EEA / SWITZERLAND / NORWAY / ICELAND) ===
  LH: { iata: "LH", name: "Lufthansa", handle: "@lufthansa", claimEmail: "customer.relations@lufthansa.com", region: "EU" },
  FR: { iata: "FR", name: "Ryanair", handle: "@Ryanair", claimEmail: "customerqueries@ryanair.com", region: "EU" },
  AF: { iata: "AF", name: "Air France", handle: "@airfrance", claimEmail: "mail.customercare@airfrance.fr", region: "EU" },
  KL: { iata: "KL", name: "KLM Royal Dutch Airlines", handle: "@KLM", claimEmail: "customercare@klm.com", region: "EU" },
  W6: { iata: "W6", name: "Wizz Air", handle: "@wizzair", claimEmail: "customerrelations@wizzair.com", region: "EU" },
  W4: { iata: "W4", name: "Wizz Air Malta", handle: "@wizzair", claimEmail: "customerrelations@wizzair.com", region: "EU" },
  IB: { iata: "IB", name: "Iberia", handle: "@Iberia", claimEmail: "relacionesclientes@iberia.es", region: "EU" },
  I2: { iata: "I2", name: "Iberia Express", handle: "@iberiaexpress", claimEmail: "relacionesclientes@iberia.es", region: "EU" },
  VY: { iata: "VY", name: "Vueling", handle: "@vueling", claimEmail: "contactus@vueling.com", region: "EU" },
  UX: { iata: "UX", name: "Air Europa", handle: "@AirEuropa", claimEmail: "relacionesconclientes@air-europa.com", region: "EU" },
  V7: { iata: "V7", name: "Volotea", handle: "@volotea", claimEmail: "customercare@volotea.com", region: "EU" },
  LX: { iata: "LX", name: "SWISS", handle: "@FlySWISS", claimEmail: "contactus@swiss.com", region: "EU" },
  WK: { iata: "WK", name: "Edelweiss Air", handle: "@flyedelweiss", claimEmail: "services@flyedelweiss.com", region: "EU" },
  OS: { iata: "OS", name: "Austrian Airlines", handle: "@_austrian", claimEmail: "feedback@austrian.com", region: "EU" },
  SN: { iata: "SN", name: "Brussels Airlines", handle: "@FlyingBrussels", claimEmail: "customerrelations@brusselsairlines.com", region: "EU" },
  EW: { iata: "EW", name: "Eurowings", handle: "@eurowings", claimEmail: "service@eurowings.com", region: "EU" },
  "4Y": { iata: "4Y", name: "Discover Airlines", handle: "@discover_air", claimEmail: "feedback@discover-airlines.com", region: "EU" },
  DE: { iata: "DE", name: "Condor", handle: "@Condor", claimEmail: "reservation@condor.com", region: "EU" },
  X3: { iata: "X3", name: "TUI fly Deutschland", handle: "@TUIfly", claimEmail: "servicecenter@tuifly.com", region: "EU" },
  SK: { iata: "SK", name: "SAS Scandinavian Airlines", handle: "@SAS", claimEmail: "customercare@sas.se", region: "EU" },
  DY: { iata: "DY", name: "Norwegian Air Shuttle", handle: "@Fly_Norwegian", claimEmail: "customerrelations@norwegian.com", region: "EU" },
  D8: { iata: "D8", name: "Norwegian Air Sweden", handle: "@Fly_Norwegian", claimEmail: "customerrelations@norwegian.com", region: "EU" },
  AY: { iata: "AY", name: "Finnair", handle: "@Finnair", claimEmail: "customer.relations@finnair.com", region: "EU" },
  FI: { iata: "FI", name: "Icelandair", handle: "@Icelandair", claimEmail: "customerrelations@icelandair.is", region: "EU" },
  OG: { iata: "OG", name: "PLAY", handle: "@playairlines", claimEmail: "claims@flyplay.com", region: "EU" },
  TP: { iata: "TP", name: "TAP Air Portugal", handle: "@tapairportugal", claimEmail: "customer@tap.pt", region: "EU" },
  S4: { iata: "S4", name: "Azores Airlines", handle: "@AzoresAirlines", claimEmail: "customer.care@sata.pt", region: "EU" },
  AZ: { iata: "AZ", name: "ITA Airways", handle: "@ITAAirways", claimEmail: "reclami@ita-airways.com", region: "EU" },
  NO: { iata: "NO", name: "Neos", handle: "@neos_air", claimEmail: "customercare@neosair.it", region: "EU" },
  EI: { iata: "EI", name: "Aer Lingus", handle: "@AerLingus", claimEmail: "customerrelations@aerlingus.com", region: "EU" },
  EC: { iata: "EC", name: "easyJet Europe", handle: "@easyJet", claimEmail: "customer.support@easyjet.com", region: "EU" },
  DS: { iata: "DS", name: "easyJet Switzerland", handle: "@easyJet", claimEmail: "customer.support@easyjet.com", region: "EU" },
  HV: { iata: "HV", name: "Transavia", handle: "@transavia", claimEmail: "customerrelations@transavia.com", region: "EU" },
  TO: { iata: "TO", name: "Transavia France", handle: "@transaviaFR", claimEmail: "relationclient@fr.transavia.com", region: "EU" },
  OR: { iata: "OR", name: "TUI fly Netherlands", handle: "@TUINederland", claimEmail: "klantenservice@tui.nl", region: "EU" },
  TB: { iata: "TB", name: "TUI fly Belgium", handle: "@TUIflyBelgium", claimEmail: "customercare@tuifly.be", region: "EU" },
  A3: { iata: "A3", name: "Aegean Airlines", handle: "@aegeanairlines", claimEmail: "customerrelations@aegeanair.com", region: "EU" },
  OA: { iata: "OA", name: "Olympic Air", handle: "@aegeanairlines", claimEmail: "customerrelations@aegeanair.com", region: "EU" },
  GQ: { iata: "GQ", name: "SKY express", handle: "@skyexpressgr", claimEmail: "customercare@skyexpress.gr", region: "EU" },
  LO: { iata: "LO", name: "LOT Polish Airlines", handle: "@LOTPLAirlines", claimEmail: "customer.relations@lot.pl", region: "EU" },
  BT: { iata: "BT", name: "airBaltic", handle: "@airBaltic", claimEmail: "customerrelations@airbaltic.com", region: "EU" },
  QS: { iata: "QS", name: "Smartwings", handle: "@SmartwingsGroup", claimEmail: "claims@smartwings.com", region: "EU" },
  OK: { iata: "OK", name: "Czech Airlines", handle: "@CzechAirlines", claimEmail: "customer.care@csa.cz", region: "EU" },
  OU: { iata: "OU", name: "Croatia Airlines", handle: "@CroatiaAirlines", claimEmail: "customer.relations@croatiaairlines.hr", region: "EU" },
  RO: { iata: "RO", name: "TAROM", handle: "@TAROM_official", claimEmail: "customer.service@tarom.ro", region: "EU" },
  FB: { iata: "FB", name: "Bulgaria Air", handle: "@BulgariaAir", claimEmail: "customercare@air.bg", region: "EU" },
  LG: { iata: "LG", name: "Luxair", handle: "@LuxairAirlines", claimEmail: "customer.relations@luxair.lu", region: "EU" },
  KM: { iata: "KM", name: "KM Malta Airlines", handle: "@KMMaltaAirlines", claimEmail: "customercare@kmmaltairlines.com", region: "EU" },
  CY: { iata: "CY", name: "Cyprus Airways", handle: "@Cyprus_Airways", claimEmail: "customer.relations@cyprusairways.com", region: "EU" },
  EN: { iata: "EN", name: "Air Dolomiti", handle: "@AirDolomiti", claimEmail: "customercare@airdolomiti.it", region: "EU" },
  NT: { iata: "NT", name: "Binter Canarias", handle: "@BinterCanarias", claimEmail: "sac@bintercanarias.com", region: "EU" },
  BF: { iata: "BF", name: "French bee", handle: "@Frenchbee_", claimEmail: "customercare@frenchbee.com", region: "EU" },
  SS: { iata: "SS", name: "Corsair", handle: "@CorsairFr", claimEmail: "relationclient@corsair.fr", region: "EU" },
  TX: { iata: "TX", name: "Air Caraibes", handle: "@aircaraibes", claimEmail: "relationclient@aircaraibes.com", region: "EU" },
  WF: { iata: "WF", name: "Wideroe", handle: "@FlyWideroe", claimEmail: "kundeservice@wideroe.no", region: "EU" },
  N0: { iata: "N0", name: "Norse Atlantic Airways", handle: "@flynorse", claimEmail: "support@flynorse.com", region: "EU" },
  JU: { iata: "JU", name: "Air Serbia", handle: "@airserbia", claimEmail: "guest.support@airserbia.com", region: "INTL" },

  // === UNITED KINGDOM (UK261) ===
  BA: { iata: "BA", name: "British Airways", handle: "@British_Airways", claimEmail: "customer.relations@ba.com", region: "UK" },
  U2: { iata: "U2", name: "easyJet", handle: "@easyJet", claimEmail: "customer.support@easyjet.com", region: "UK" },
  VS: { iata: "VS", name: "Virgin Atlantic", handle: "@VirginAtlantic", claimEmail: "customer.relations@fly.virgin.com", region: "UK" },
  LS: { iata: "LS", name: "Jet2.com", handle: "@jet2tweets", claimEmail: "customer.service@jet2.com", region: "UK" },
  BY: { iata: "BY", name: "TUI Airways", handle: "@TUIUK", claimEmail: "aftertravel@tui.co.uk", region: "UK" },
  W9: { iata: "W9", name: "Wizz Air UK", handle: "@wizzair", claimEmail: "customerrelations@wizzair.com", region: "UK" },
  RK: { iata: "RK", name: "Ryanair UK", handle: "@Ryanair", claimEmail: "customerqueries@ryanair.com", region: "UK" },
  LM: { iata: "LM", name: "Loganair", handle: "@FlyLoganair", claimEmail: "customerrelations@loganair.co.uk", region: "UK" },
  Z0: { iata: "Z0", name: "Norse Atlantic UK", handle: "@flynorse", claimEmail: "support@flynorse.com", region: "UK" },
  GR: { iata: "GR", name: "Aurigny Air Services", handle: "@Aurigny", claimEmail: "customerrelations@aurigny.com", region: "UK" },

  // === TURKEY (SHY-PASSENGER) ===
  TK: { iata: "TK", name: "Turkish Airlines", handle: "@TurkishAirlines", claimEmail: "customer@thy.com", region: "TR" },
  PC: { iata: "PC", name: "Pegasus Airlines", handle: "@flymepegasus", claimEmail: "guestrelations@flypgs.com", region: "TR" },
  VF: { iata: "VF", name: "AJet", handle: "@AJET_TR", claimEmail: "feedback@ajet.com", region: "TR" },
  XQ: { iata: "XQ", name: "SunExpress", handle: "@SunExpress", claimEmail: "customerrelations@sunexpress.com", region: "TR" },
  XC: { iata: "XC", name: "Corendon Airlines", handle: "@Corendon_Air", claimEmail: "customerrelations@corendon-airlines.com", region: "TR" },
  FH: { iata: "FH", name: "Freebird Airlines", handle: "@FreebirdAir", claimEmail: "info@freebirdairlines.com", region: "TR" },
  TI: { iata: "TI", name: "Tailwind Airlines", handle: "@TailwindAir", claimEmail: "info@tailwind.com.tr", region: "TR" },
  "2S": { iata: "2S", name: "Southwind Airlines", handle: "@SouthwindAir", claimEmail: "info@southwindairlines.com", region: "TR" },
  "4M": { iata: "4M", name: "Mavi Gok Airlines", handle: "@MaviGokAirlines", claimEmail: "info@mga.aero", region: "TR" },

  // === UNITED STATES (US DOT) ===
  DL: { iata: "DL", name: "Delta Air Lines", handle: "@Delta", claimEmail: "charter@delta.com", region: "US" },
  UA: { iata: "UA", name: "United Airlines", handle: "@united", claimEmail: "customercare@united.com", region: "US" },
  AA: { iata: "AA", name: "American Airlines", handle: "@AmericanAir", claimEmail: "customer.relations@aa.com", region: "US" },
  WN: { iata: "WN", name: "Southwest Airlines", handle: "@SouthwestAir", claimEmail: "customerrelations@wnco.com", region: "US" },
  B6: { iata: "B6", name: "JetBlue", handle: "@JetBlue", claimEmail: "dearjetblue@jetblue.com", region: "US" },
  AS: { iata: "AS", name: "Alaska Airlines", handle: "@AlaskaAir", claimEmail: "customer.care@alaskaair.com", region: "US" },
  HA: { iata: "HA", name: "Hawaiian Airlines", handle: "@HawaiianAir", claimEmail: "consumer.affairs@hawaiianair.com", region: "US" },
  NK: { iata: "NK", name: "Spirit Airlines", handle: "@SpiritAirlines", claimEmail: "guestrelations@spirit.com", region: "US" },
  F9: { iata: "F9", name: "Frontier Airlines", handle: "@FlyFrontier", claimEmail: "customerrelations@flyfrontier.com", region: "US" },
  G4: { iata: "G4", name: "Allegiant Air", handle: "@Allegiant", claimEmail: "customerrelations@allegiantair.com", region: "US" },
  SY: { iata: "SY", name: "Sun Country Airlines", handle: "@SunCountryAir", claimEmail: "customerrelations@suncountry.com", region: "US" },
  MX: { iata: "MX", name: "Breeze Airways", handle: "@BreezeAirways", claimEmail: "get@flybreeze.com", region: "US" },
  XP: { iata: "XP", name: "Avelo Airlines", handle: "@AveloAir", claimEmail: "support@aveloair.com", region: "US" },

  // === CANADA & LATIN AMERICA ===
  AC: { iata: "AC", name: "Air Canada", handle: "@AirCanada", claimEmail: "customerrelations@aircanada.ca", region: "INTL" },
  WS: { iata: "WS", name: "WestJet", handle: "@WestJet", claimEmail: "guestrelations@westjet.com", region: "INTL" },
  TS: { iata: "TS", name: "Air Transat", handle: "@airtransat", claimEmail: "customerrelations@transat.com", region: "INTL" },
  PD: { iata: "PD", name: "Porter Airlines", handle: "@porterairlines", claimEmail: "customerrelations@flyporter.com", region: "INTL" },
  F8: { iata: "F8", name: "Flair Airlines", handle: "@FlairAirlines", claimEmail: "support@flyflair.com", region: "INTL" },
  AM: { iata: "AM", name: "Aeromexico", handle: "@Aeromexico", claimEmail: "amcustomercare@aeromexico.com", region: "INTL" },
  Y4: { iata: "Y4", name: "Volaris", handle: "@viajaVolaris", claimEmail: "tuexperiencia@volaris.com", region: "INTL" },
  VB: { iata: "VB", name: "Viva Aerobus", handle: "@VivaAerobus", claimEmail: "atencionaclientes@vivaaerobus.com", region: "INTL" },
  LA: { iata: "LA", name: "LATAM Airlines", handle: "@LATAMAirlines", claimEmail: "customer_service@latam.com", region: "INTL" },
  AV: { iata: "AV", name: "Avianca", handle: "@avianca", claimEmail: "servicioalcliente@avianca.com", region: "INTL" },
  CM: { iata: "CM", name: "Copa Airlines", handle: "@CopaAirlines", claimEmail: "customerrelations@copaair.com", region: "INTL" },
  G3: { iata: "G3", name: "GOL Linhas Aereas", handle: "@VoeGOLoficial", claimEmail: "sac@voegol.com.br", region: "INTL" },
  AD: { iata: "AD", name: "Azul Brazilian Airlines", handle: "@azulinhasaereas", claimEmail: "sac@voeazul.com.br", region: "INTL" },
  AR: { iata: "AR", name: "Aerolineas Argentinas", handle: "@Aerolineas_AR", claimEmail: "reclamos@aerolineas.com.ar", region: "INTL" },

  // === MIDDLE EAST & AFRICA ===
  EK: { iata: "EK", name: "Emirates", handle: "@emirates", claimEmail: "customer.affairs@emirates.com", region: "INTL" },
  QR: { iata: "QR", name: "Qatar Airways", handle: "@qatarairways", claimEmail: "tell-us@qatarairways.com.qa", region: "INTL" },
  EY: { iata: "EY", name: "Etihad Airways", handle: "@etihad", claimEmail: "feedback@etihad.ae", region: "INTL" },
  FZ: { iata: "FZ", name: "flydubai", handle: "@flydubai", claimEmail: "letstalk@flydubai.com", region: "INTL" },
  G9: { iata: "G9", name: "Air Arabia", handle: "@airarabiagroup", claimEmail: "customerrelations@airarabia.com", region: "INTL" },
  SV: { iata: "SV", name: "Saudia", handle: "@SaudiAirlinesEn", claimEmail: "customerrelations@saudia.com", region: "INTL" },
  XY: { iata: "XY", name: "flynas", handle: "@flynas", claimEmail: "csu@flynas.com", region: "INTL" },
  F3: { iata: "F3", name: "flyadeal", handle: "@flyadeal", claimEmail: "customercare@flyadeal.com", region: "INTL" },
  RJ: { iata: "RJ", name: "Royal Jordanian", handle: "@RoyalJordanian", claimEmail: "customer.relations@rj.com", region: "INTL" },
  GF: { iata: "GF", name: "Gulf Air", handle: "@GulfAir", claimEmail: "customer.relations@gulfair.com", region: "INTL" },
  WY: { iata: "WY", name: "Oman Air", handle: "@omanair", claimEmail: "customerrelations@omanair.com", region: "INTL" },
  KU: { iata: "KU", name: "Kuwait Airways", handle: "@KuwaitAirways", claimEmail: "customer-relations@kuwaitairways.com", region: "INTL" },
  J9: { iata: "J9", name: "Jazeera Airways", handle: "@JazeeraAirways", claimEmail: "customercare@jazeeraairways.com", region: "INTL" },
  ME: { iata: "ME", name: "Middle East Airlines", handle: "@MEAAirLiban", claimEmail: "customerrelations@mea.com.lb", region: "INTL" },
  LY: { iata: "LY", name: "El Al", handle: "@EL_AL_AIRLINES", claimEmail: "customer_relations@elal.co.il", region: "INTL" },
  MS: { iata: "MS", name: "EgyptAir", handle: "@EGYPTAIR", claimEmail: "customer.relations@egyptair.com", region: "INTL" },
  AT: { iata: "AT", name: "Royal Air Maroc", handle: "@RAM_Maroc", claimEmail: "serviceclient@royalairmaroc.com", region: "INTL" },
  TU: { iata: "TU", name: "Tunisair", handle: "@Tunisair", claimEmail: "relationclient@tunisair.com.tn", region: "INTL" },
  AH: { iata: "AH", name: "Air Algerie", handle: "@Air_AlgerieDz", claimEmail: "relationclient@airalgerie.dz", region: "INTL" },
  ET: { iata: "ET", name: "Ethiopian Airlines", handle: "@flyethiopian", claimEmail: "customerrelations@ethiopianairlines.com", region: "INTL" },
  KQ: { iata: "KQ", name: "Kenya Airways", handle: "@KenyaAirways", claimEmail: "customer.relations@kenya-airways.com", region: "INTL" },
  SA: { iata: "SA", name: "South African Airways", handle: "@flysaa", claimEmail: "customercare@flysaa.com", region: "INTL" },

  // === ASIA-PACIFIC & CENTRAL ASIA ===
  SQ: { iata: "SQ", name: "Singapore Airlines", handle: "@SingaporeAir", claimEmail: "public_affairs@singaporeair.com.sg", region: "INTL" },
  TR: { iata: "TR", name: "Scoot", handle: "@flyscoot", claimEmail: "guestrelations@flyscoot.com", region: "INTL" },
  NH: { iata: "NH", name: "ANA All Nippon Airways", handle: "@FlyANA_official", claimEmail: "customer.relations@ana.co.jp", region: "INTL" },
  JL: { iata: "JL", name: "Japan Airlines", handle: "@JAL_Official_jp", claimEmail: "customer.relations@jal.com", region: "INTL" },
  KE: { iata: "KE", name: "Korean Air", handle: "@KoreanAir_KE", claimEmail: "customerservice@koreanair.com", region: "INTL" },
  OZ: { iata: "OZ", name: "Asiana Airlines", handle: "@AsianaAirlines", claimEmail: "customer@flyasiana.com", region: "INTL" },
  CX: { iata: "CX", name: "Cathay Pacific", handle: "@cathaypacific", claimEmail: "customer_relations@cathaypacific.com", region: "INTL" },
  BR: { iata: "BR", name: "EVA Air", handle: "@EVAAirUS", claimEmail: "customer@evaair.com", region: "INTL" },
  CI: { iata: "CI", name: "China Airlines", handle: "@ChinaAirlines", claimEmail: "customer@china-airlines.com", region: "INTL" },
  JX: { iata: "JX", name: "STARLUX Airlines", handle: "@starluxairlines", claimEmail: "customerservice@starlux-airlines.com", region: "INTL" },
  CA: { iata: "CA", name: "Air China", handle: "@AirChinaNA", claimEmail: "customer_relations@airchina.com", region: "INTL" },
  MU: { iata: "MU", name: "China Eastern Airlines", handle: "@CEAirglobal", claimEmail: "customercare@ceair.com", region: "INTL" },
  CZ: { iata: "CZ", name: "China Southern Airlines", handle: "@CSAIRGlobal", claimEmail: "customerservice@csair.com", region: "INTL" },
  HU: { iata: "HU", name: "Hainan Airlines", handle: "@HainanAirlines", claimEmail: "customercare@hnair.com", region: "INTL" },
  QF: { iata: "QF", name: "Qantas", handle: "@Qantas", claimEmail: "customercare@qantas.com.au", region: "INTL" },
  JQ: { iata: "JQ", name: "Jetstar Airways", handle: "@JetstarAirways", claimEmail: "customer.care@jetstar.com", region: "INTL" },
  VA: { iata: "VA", name: "Virgin Australia", handle: "@VirginAustralia", claimEmail: "guestrelations@virginaustralia.com", region: "INTL" },
  NZ: { iata: "NZ", name: "Air New Zealand", handle: "@FlyAirNZ", claimEmail: "customerrelations@airnz.co.nz", region: "INTL" },
  AI: { iata: "AI", name: "Air India", handle: "@airindia", claimEmail: "contactus@airindia.com", region: "INTL" },
  "6E": { iata: "6E", name: "IndiGo", handle: "@IndiGo6E", claimEmail: "customer.relations@goindigo.in", region: "INTL" },
  TG: { iata: "TG", name: "Thai Airways", handle: "@ThaiAirways", claimEmail: "customer@thaiairways.com", region: "INTL" },
  VN: { iata: "VN", name: "Vietnam Airlines", handle: "@VietnamAirlines", claimEmail: "onlinesupport@vietnamairlines.com", region: "INTL" },
  MH: { iata: "MH", name: "Malaysia Airlines", handle: "@MAS", claimEmail: "customer@malaysiaairlines.com", region: "INTL" },
  AK: { iata: "AK", name: "AirAsia", handle: "@airasia", claimEmail: "support@airasia.com", region: "INTL" },
  GA: { iata: "GA", name: "Garuda Indonesia", handle: "@IndonesiaGaruda", claimEmail: "customer@garuda-indonesia.com", region: "INTL" },
  PR: { iata: "PR", name: "Philippine Airlines", handle: "@flyPAL", claimEmail: "wecare@philippineairlines.com", region: "INTL" },
  UL: { iata: "UL", name: "SriLankan Airlines", handle: "@flysrilankan", claimEmail: "customer.affairs@srilankan.com", region: "INTL" },
  PK: { iata: "PK", name: "Pakistan International Airlines", handle: "@Official_PIA", claimEmail: "customercare@piac.aero", region: "INTL" },
  J2: { iata: "J2", name: "Azerbaijan Airlines", handle: "@azalOfficial", claimEmail: "callcenter@azal.az", region: "INTL" },
  KC: { iata: "KC", name: "Air Astana", handle: "@airastana", claimEmail: "customer.relations@airastana.com", region: "INTL" },
  HY: { iata: "HY", name: "Uzbekistan Airways", handle: "@uzairways", claimEmail: "info@uzairways.com", region: "INTL" },
  A9: { iata: "A9", name: "Georgian Airways", handle: "@GeorgianAirways", claimEmail: "info@georgian-airways.com", region: "INTL" },
};

/** 3-letter ICAO ATC callsign prefix -> 2-char IATA carrier code */
export const ICAO_TO_IATA: Record<string, string> = {
  DLH: "LH", RYR: "FR", AFR: "AF", KLM: "KL", WZZ: "W6", WMT: "W4", WUK: "W9",
  IBE: "IB", IBS: "I2", VLG: "VY", AEA: "UX", VOE: "V7", SWR: "LX", EDW: "WK",
  AUA: "OS", BEL: "SN", EWG: "EW", OCN: "4Y", CFG: "DE", TUI: "X3", SAS: "SK",
  NAX: "DY", NSZ: "D8", FIN: "AY", ICE: "FI", FPY: "OG", TAP: "TP", RZO: "S4",
  ITY: "AZ", NOS: "NO", EIN: "EI", EZY: "U2", EJU: "EC", EZS: "DS", TRA: "HV",
  TVF: "TO", TFL: "OR", JAF: "TB", AEE: "A3", OAL: "OA", SEH: "GQ", LOT: "LO",
  BTI: "BT", TVS: "QS", CSA: "OK", CTN: "OU", ROT: "RO", LZB: "FB", LGL: "LG",
  KMM: "KM", CYP: "CY", DLA: "EN", IBB: "NT", FBU: "BF", CRL: "SS", FWI: "TX",
  WIF: "WF", NBT: "N0", ASL: "JU", BAW: "BA", VIR: "VS", EXS: "LS", TOM: "BY",
  RUK: "RK", LOG: "LM", UBT: "Z0", AUR: "GR",
  THY: "TK", PGT: "PC", TKJ: "VF", SXS: "XQ", CAI: "XC", FHY: "FH", TWI: "TI", STW: "2S", MGA: "4M",
  DAL: "DL", UAL: "UA", AAL: "AA", SWA: "WN", JBU: "B6", ASA: "AS", HAL: "HA",
  NKS: "NK", FFT: "F9", AAY: "G4", SCX: "SY", MXY: "MX", VXP: "XP",
  ACA: "AC", WJA: "WS", TSC: "TS", POE: "PD", FLE: "F8", AMX: "AM", VOI: "Y4",
  VIV: "VB", LAN: "LA", AVA: "AV", CMP: "CM", GLO: "G3", AZU: "AD", ARG: "AR",
  UAE: "EK", QTR: "QR", ETD: "EY", FDB: "FZ", ABY: "G9", SVA: "SV", KNE: "XY",
  FAD: "F3", RJA: "RJ", GFA: "GF", OMA: "WY", KAC: "KU", JZR: "J9", MEA: "ME",
  ELY: "LY", MSR: "MS", RAM: "AT", TAR: "TU", DAH: "AH", ETH: "ET", KQA: "KQ", SAA: "SA",
  SIA: "SQ", TGW: "TR", ANA: "NH", JAL: "JL", KAL: "KE", AAR: "OZ", CPA: "CX",
  EVA: "BR", CAL: "CI", SJX: "JX", CCA: "CA", CES: "MU", CSN: "CZ", CHH: "HU",
  QFA: "QF", JST: "JQ", VOZ: "VA", ANZ: "NZ", AIC: "AI", IGO: "6E", THA: "TG",
  HVN: "VN", MAS: "MH", AXM: "AK", GIA: "GA", PAL: "PR", ALK: "UL", PIA: "PK",
  AHY: "J2", KZR: "KC", UZB: "HY", TGZ: "A9",
};

export function extractAirlinePrefix(flightNumber: string): string {
  const cleaned = flightNumber.trim().toUpperCase().replace(/\s+/g, "");
  // Match 3-letter ICAO callsign prefix first (e.g. TKJ94L -> VF, THY1952 -> TK)
  const icaoMatch = cleaned.match(/^([A-Z]{3})\d/);
  if (icaoMatch && ICAO_TO_IATA[icaoMatch[1]]) {
    return ICAO_TO_IATA[icaoMatch[1]];
  }
  const iataMatch = cleaned.match(/^([A-Z0-9]{2})\d+/);
  return iataMatch ? iataMatch[1] : cleaned.slice(0, 2);
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
