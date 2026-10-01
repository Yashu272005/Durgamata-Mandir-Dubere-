/* =====================================================================
   DURGA MATA MITRA MANDAL, DUBERE — Vanilla JavaScript
   ---------------------------------------------------------------------
   Contents
   1.  CONFIG            → dates, map, contact & social links (edit here)
   2.  IMAGES            → all image paths in one place (easy to replace)
   3.  TRANSLATIONS      → every visible text (mr / en)
   4.  DATA              → nine forms, events, galleries, videos
   5.  LANGUAGE SYSTEM   → switch without reload + localStorage
   6.  RENDERERS         → dynamic cards
   7.  COUNTDOWNS
   8.  GALLERY + LIGHTBOX
   9.  VIDEO MODAL
   10. NAV / SCROLL / REVEAL / COUNTERS / BACK-TO-TOP
   11. PARTICLES + PETALS
   ===================================================================== */

import "./style.css";
import heroImgSrc from "./images/hero-durga.jpg";
import aboutImgSrc from "./images/about-durga.jpg";
import ddImgSrc from "./images/durga-daud.jpg";
import { supabase, GALLERY_BUCKET } from "./supabaseclient.ts";
import { initAdmin } from "./admin.js";

/* ---------------------------------------------------------------------
   1. CONFIG — update these values when real information is available
   --------------------------------------------------------------------- */
const CONFIG = {
  // Navratri countdown target (YYYY-MM-DDTHH:mm:ss, local time).
  // NOTE: Tentative — please update with the Mandal's official date.
  navratriStart: "2026-10-11T06:00:00",

  // Durga Daud countdown target. Keep null until the official date is
  // announced — the countdown will then follow the Navratri start date.
  durgaDaudStart: null,
  mapEmbedUrl: "",
  routeMapEmbedUrl: "",
  directionsUrl: "https://www.google.com/maps/search/?api=1&query=Dubere%2C%20Maharashtra",
  phone: "",
  email: "",
  social: { instagram: "", facebook: "", youtube: "", whatsapp: "" },
};


const px = (id, w = 900, ext = "jpeg") =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.${ext}?auto=compress&cs=tinysrgb&w=${w}`;

const IMAGES = {
  hero: heroImgSrc,
  about: aboutImgSrc,
  durgaDaud: ddImgSrc,
  quote: px(35655151, 1600),
};

const translations = {
  mr: {
    skip: "मुख्य मजकुराकडे जा",
    brandName: "दुर्गा माता मित्र मंडळ ",
    home: "मुख्यपृष्ठ",
    about: "आमच्याबद्दल",
    navratri: "नवरात्र उत्सव",
    durgaDaud: "दुर्गा माता दौड",
    events: "कार्यक्रम",
    gallery: "गॅलरी",
    contact: "संपर्क",
    tagline: "श्रद्धा • भक्ती • एकता • संस्कृती",
    heroBadge: "नवरात्र उत्सव • दुर्गा माता दौड",
    heroJai: "जय माता दी 🙏",
    heroTitle: "दुर्गा माता मित्र मंडळ",
    heroPlace: "डुबेर",
    heroDesc: "श्रद्धा, भक्ती, संस्कृती आणि एकतेचा उत्सव",
    heroBtn1: "उत्सव पहा",
    heroBtn2: "गॅलरी पहा",
    heroScroll: "खाली स्क्रोल करा",
    heroAlt: "नवरात्र उत्सवासाठी सजवलेली दुर्गा मातेची मूर्ती",

    aboutTag: "आमची ओळख",
    aboutTitle: "आमच्याबद्दल",
    aboutText:
      "दुर्गा माता मित्र मंडळ, डुबेर हे श्रद्धा, भक्ती, संस्कृती आणि सामाजिक एकतेला समर्पित मंडळ आहे. नवरात्र उत्सवाच्या माध्यमातून भक्तीमय वातावरण निर्माण करून समाजातील सर्वांना एकत्र आणण्याचा आमचा प्रयत्न आहे.",
    aboutText2:
      "घटस्थापना, आरती, गरबा-दांडिया, दुर्गा माता दौड आणि सांस्कृतिक कार्यक्रमांच्या माध्यमातून आपल्या परंपरेचा वारसा पुढील पिढीपर्यंत पोहोचवण्याचे कार्य मंडळ करत आहे.",
    aboutBadge: "जय माता दी",
    aboutAlt: "दिव्याच्या प्रकाशातील दुर्गा मातेचे प्रसन्न रूप",
    f1: "श्रद्धा",
    f1d: "मातेवरील अढळ विश्वास",
    f2: "भक्ती",
    f2d: "आरती, भजन आणि उपासना",
    f3: "एकता",
    f3d: "संपूर्ण गाव एक परिवार",
    f4: "संस्कृती",
    f4d: "परंपरेचा अभिमानास्पद वारसा",
    statNights: "नवरात्रीच्या रात्री",
    statForms: "देवीची नऊ रूपे",
    statEvents: "प्रमुख कार्यक्रम",
    statCommunity: "एक गाव, एक परिवार",

    cdTag: "उत्सवाची प्रतीक्षा",
    cdTitle: "नवरात्र उत्सव सुरू होण्यास",
    cdDone: "जय माता दी! उत्सव सुरू झाला आहे 🙏",
    cdNote: "अधिकृत तारीख व कार्यक्रम मंडळाकडून लवकरच जाहीर केले जातील.",
    days: "दिवस",
    hours: "तास",
    minutes: "मिनिटे",
    seconds: "सेकंद",

    // Navratri
    navTag: "नऊ दिवस • नऊ रूपे",
    navTitle: "नवरात्र उत्सव",
    navDesc: "नवरात्रीच्या नऊ दिवसांत पूजली जाणारी माँ दुर्गेची नऊ दिव्य रूपे — प्रत्येक दिवस एक नवी शक्ती, एक नवा आशीर्वाद.",
    dayLabel: "दिवस",
    swipeHint: "स्वाइप करा →",

    // Highlight card
    hlTag: "मंडळाचा प्रमुख उपक्रम",
    hlTitle: "दुर्गा माता दौड",
    hlSub: "भक्ती • एकता • आरोग्य • उत्साह",
    hlBtn: "दुर्गा माता दौड पहा",

    // Durga Daud
    ddTag: "नवरात्रीचा प्रमुख उपक्रम",
    ddTitle: "दुर्गा माता दौड",
    ddSub: "भक्ती, एकता आणि उत्साहाचा धावता उत्सव",
    ddDesc:
      "दुर्गा माता मित्र मंडळ, डुबेर यांच्या वतीने आयोजित दुर्गा माता दौड हा भक्ती, एकता, आरोग्य आणि युवा उत्साहाचा अनोखा उपक्रम आहे.",
    ddLink: "नवरात्र उत्सवाचा अविभाज्य भाग — मातेच्या जयघोषात एकत्र धावणारे डुबेर.",
    ddBtn: "दुर्गा माता दौड विषयी अधिक जाणून घ्या",
    ddAlt: "भगवे ध्वज घेऊन दुर्गा माता दौडमध्ये धावणारे भक्त",
    dDate: "दिनांक",
    dDateVal: "लवकरच जाहीर होईल",
    dTime: "वेळ",
    dTimeVal: "लवकरच जाहीर होईल",
    dStart: "सुरुवातीचे ठिकाण",
    dStartVal: "डुबेर",
    dFinish: "समाप्तीचे ठिकाण",
    dFinishVal: "लवकरच जाहीर होईल",
    dDistance: "अंतर",
    dDistanceVal: "लवकरच जाहीर होईल",
    ddCdTag: "तयारी सुरू",
    ddCdTitle: "दुर्गा माता दौड सुरू होण्यास",
    ddCdDone: "दुर्गा माता दौड सुरू झाली आहे! 🏃‍♂️🚩",
    ddCdNote: "तात्पुरती उलटगणती — अधिकृत तारीख लवकरच जाहीर होईल.",
    routeTitle: "दुर्गा माता दौड मार्ग",
    routeStart: "सुरुवात",
    routeStartVal: "डुबेर",
    routeRun: "धावण्याचा मार्ग",
    routeFinish: "समाप्ती",
    routeTBA: "लवकरच जाहीर",
    routeMapSoon: "मार्गाचा नकाशा लवकरच उपलब्ध होईल",
    ctaTitle: "दुर्गा माता दौडमध्ये सहभागी व्हा",
    ctaText: "या भक्तीमय आणि उत्साहपूर्ण उपक्रमाचा भाग बना.",
    ctaBtn: "नोंदणी लवकरच सुरू होईल",
    toastReg: "नोंदणीची माहिती लवकरच जाहीर केली जाईल 🙏",
    // Events
    evTag: "उत्सव दिनदर्शिका",
    evTitle: "आगामी कार्यक्रम",
    evDesc: "नवरात्र उत्सवातील भक्ती, संगीत आणि संस्कृतीने नटलेले कार्यक्रम. सर्व भाविकांचे हार्दिक स्वागत!",
    evDate: "दिनांक",
    evTime: "वेळ",
    evLoc: "स्थळ",
    dateTBA: "दिनांक लवकरच जाहीर होईल",
    timeTBA: "वेळ लवकरच जाहीर होईल",
    locDubere: "डुबेर",

    // Gallery
    galTag: "क्षणचित्रे",
    galTitle: "उत्सवाचे क्षण",
    galDesc: "उत्सवातील भक्तीमय, आनंदी आणि अविस्मरणीय क्षण.",
    mediaLoading: "गॅलरी लोड होत आहे...",
    mediaEmpty: "अजून फोटो किंवा व्हिडिओ जोडलेले नाहीत.",
    mediaError: "मीडिया लोड करता आला नाही. कृपया नंतर पुन्हा प्रयत्न करा.",
    mediaAll: "सर्व",
    mediaPhotos: "फोटो",
    mediaVideos: "व्हिडिओ",
    mediaMore: "आणखी पहा",

    // Quote
    quoteL1: "श्रद्धा जिथे असते,",
    quoteL2: "तिथे मातेचा आशीर्वाद असतो.",
    quoteJai: "जय माता दी 🙏",

    // Contact
    ctTag: "संपर्क",
    ctTitle: "आमच्याशी संपर्क साधा",
    ctDesc: "उत्सव, दुर्गा माता दौड किंवा कार्यक्रमांविषयी माहितीसाठी आमच्याशी संपर्क साधा.",
    ctAddrLabel: "पत्ता",
    ctAddr: "डुबेर",
    ctPhoneLabel: "फोन",
    ctPhone: "संपर्क क्रमांक लवकरच उपलब्ध",
    ctEmailLabel: "ई-मेल",
    ctEmail: "ई-मेल लवकरच उपलब्ध",
    mapSoon: "अचूक स्थान लवकरच जोडले जाईल",
    btnDirections: "दिशा मिळवा",
    btnContact: "संपर्क करा",
    toastContact: "संपर्क तपशील लवकरच उपलब्ध होतील 🙏",
    toastSocial: "सोशल मीडिया लिंक लवकरच उपलब्ध होतील",

    // Footer
    ftAbout: "नवरात्र उत्सव, दुर्गा माता दौड आणि सांस्कृतिक उपक्रमांतून डुबेर गावात भक्ती आणि एकतेचा दीप तेवत ठेवणारे मंडळ.",
    ftLinks: "द्रुत दुवे",
    ftConnect: "जोडलेले राहा",
    socialSoon: "सोशल मीडिया लिंक लवकरच उपलब्ध होतील.",
    ftCopyPre: "©",
    ftCopy: "दुर्गा माता मित्र मंडळ, डुबेर. सर्व हक्क राखीव.",
    ftMade: "भक्तीभावाने तयार केलेले 🙏",
    backTop: "वर जा",
  },

  en: {
    skip: "Skip to main content",
    brandName: "Durga Mata Mitra Mandal",
    home: "Home",
    about: "About",
    navratri: "Navratri",
    durgaDaud: "Durga Daud",
    events: "Events",
    gallery: "Gallery",
    contact: "Contact",
    tagline: "Faith • Devotion • Unity • Culture",

    heroBadge: "Navratri Festival • Durga Mata Daud",
    heroJai: "Jai Mata Di 🙏",
    heroTitle: "Durga Mata Mitra Mandal",
    heroPlace: "Dubere",
    heroDesc: "Celebrating faith, devotion, culture and unity",
    heroBtn1: "Explore Celebration",
    heroBtn2: "View Gallery",
    heroScroll: "Scroll down",
    heroAlt: "Durga Mata idol decorated for Navratri",

    aboutTag: "Who we are",
    aboutTitle: "About Us",
    aboutText:
      "Durga Mata Mitra Mandal, Dubere is dedicated to faith, devotion, culture and community unity. Through Navratri celebrations, we strive to create a devotional atmosphere and bring the community together.",
    aboutText2:
      "Through Ghatasthapana, aarti, garba-dandiya, Durga Daud and cultural programmes, the Mandal carries our cherished traditions forward to the next generation.",
    aboutBadge: "Jai Mata Di",
    aboutAlt: "Serene face of Durga Mata idol in diya light",
    f1: "Faith",
    f1d: "Unwavering belief in the Mother",
    f2: "Devotion",
    f2d: "Aarti, bhajans and worship",
    f3: "Unity",
    f3d: "The whole village as one family",
    f4: "Culture",
    f4d: "A proud heritage of tradition",
    statNights: "Nights of Navratri",
    statForms: "Forms of the Goddess",
    statEvents: "Major events",
    statCommunity: "One village, one family",

    cdTag: "The wait is almost over",
    cdTitle: "Navratri begins in",
    cdDone: "Jai Mata Di! The celebration has begun 🙏",
    cdNote: "Official dates and programmes will be announced by the Mandal soon.",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",

    navTag: "Nine days • Nine forms",
    navTitle: "Navratri Celebration",
    navDesc: "The nine divine forms of Maa Durga worshipped over the nine nights of Navratri — each day a new power, a new blessing.",
    dayLabel: "Day",
    swipeHint: "Swipe →",

    hlTag: "The Mandal's signature event",
    hlTitle: "Durga Daud",
    hlSub: "Devotion • Unity • Fitness • Spirit",
    hlBtn: "Explore Durga Daud",

    ddTag: "Signature Navratri event",
    ddTitle: "Durga Daud",
    ddSub: "A Run of Devotion, Unity & Spirit",
    ddDesc:
      "Durga Daud, organized by Durga Mata Mitra Mandal, Dubere, is a unique celebration combining devotion, unity, fitness and youthful spirit.",
    ddLink: "An integral part of our Navratri festival — Dubere running together in the name of the Mother.",
    ddBtn: "Explore Durga Daud",
    ddAlt: "Devotees running with saffron flags in Durga Daud",
    dDate: "Date",
    dDateVal: "Date will be announced soon",
    dTime: "Time",
    dTimeVal: "Time will be announced soon",
    dStart: "Starting Point",
    dStartVal: "Dubere",
    dFinish: "Finish Point",
    dFinishVal: "Will be announced soon",
    dDistance: "Distance",
    dDistanceVal: "To be announced",
    ddCdTag: "Preparations underway",
    ddCdTitle: "Durga Daud Starts In",
    ddCdDone: "Durga Daud has started! 🏃‍♂️🚩",
    ddCdNote: "Tentative countdown — the official date will be announced soon.",
    routeTitle: "Durga Daud Route",
    routeStart: "Start",
    routeStartVal: "Dubere",
    routeRun: "Running Route",
    routeFinish: "Finish",
    routeTBA: "To be announced",
    routeMapSoon: "Route map will be available soon",
    ctaTitle: "Join Durga Daud",
    ctaText: "Be a part of this devotional and energetic celebration.",
    ctaBtn: "Registration Coming Soon",
    toastReg: "Registration details will be announced soon 🙏",
    evTag: "Festival calendar",
    evTitle: "Upcoming Events",
    evDesc: "Programmes filled with devotion, music and culture during Navratri. Everyone is warmly welcome!",
    evDate: "Date",
    evTime: "Time",
    evLoc: "Venue",
    dateTBA: "Date will be announced soon",
    timeTBA: "Time will be announced soon",
    locDubere: "Dubere",

    galTag: "Moments",
    galTitle: "Festival Moments",
    galDesc: "Devotional, joyful and unforgettable moments from our celebrations.",
    mediaLoading: "Loading media...",
    mediaEmpty: "No photos or videos have been added yet.",
    mediaError: "Could not load media. Please try again later.",
    mediaAll: "All",
    mediaPhotos: "Photos",
    mediaVideos: "Videos",
    mediaMore: "Load more",

    quoteL1: "Where there is faith,",
    quoteL2: "there is the blessing of Maa Durga.",
    quoteJai: "Jai Mata Di 🙏",

    ctTag: "Contact",
    ctTitle: "Get In Touch",
    ctDesc: "Reach out to us for information about the festival, Durga Daud or events.",
    ctAddrLabel: "Address",
    ctAddr: "Dubere",
    ctPhoneLabel: "Phone",
    ctPhone: "Contact number coming soon",
    ctEmailLabel: "Email",
    ctEmail: "Email coming soon",
    mapSoon: "The exact location will be added soon",
    btnDirections: "Get Directions",
    btnContact: "Contact Us",
    toastContact: "Contact details will be available soon 🙏",
    toastSocial: "Social media links coming soon",

    ftAbout: "A Mandal keeping the lamp of devotion and unity alive in Dubere through Navratri, Durga Daud and cultural activities.",
    ftLinks: "Quick links",
    ftConnect: "Stay connected",
    socialSoon: "Social media links will be available soon.",
    ftCopyPre: "©",
    ftCopy: "Durga Mata Mitra Mandal, Dubere. All rights reserved.",
    ftMade: "Made with devotion 🙏",
    backTop: "Back to top",
  },
};

/* ---------------------------------------------------------------------
   4. DATA — edit these arrays to update the website content
   --------------------------------------------------------------------- */

/** Nine forms of Maa Durga */
const NINE_FORMS = [
  {
    mr: "शैलपुत्री", en: "Shailaputri", img: px(34153858, 700), color: "#e8b64c",
    dMr: "पर्वतराज हिमालयाची कन्या — स्थैर्य आणि शक्तीचे प्रतीक.", dEn: "Daughter of the Himalayas — a symbol of strength and stability."
  },
  {
    mr: "ब्रह्मचारिणी", en: "Brahmacharini", img: px(29403685, 700), color: "#f0a3c8",
    dMr: "तप, संयम आणि साधनेची देवी.", dEn: "Goddess of penance, discipline and devotion."
  },
  {
    mr: "चंद्रघंटा", en: "Chandraghanta", img: px(9938556, 700), color: "#9fb4ff",
    dMr: "धैर्य आणि शौर्याचे तेजस्वी रूप.", dEn: "The radiant form of courage and bravery."
  },
  {
    mr: "कूष्मांडा", en: "Kushmanda", img: px(29370139, 700), color: "#ffc978",
    dMr: "विश्वाची निर्माती — तेज आणि ऊर्जेचे रूप.", dEn: "Creator of the universe — the form of light and energy."
  },
  {
    mr: "स्कंदमाता", en: "Skandamata", img: px(34283958, 700, "png"), color: "#f6d98b",
    dMr: "मातृत्व, प्रेम आणि करुणेचे प्रतीक.", dEn: "A symbol of motherhood, love and compassion."
  },
  {
    mr: "कात्यायनी", en: "Katyayani", img: px(33612941, 700), color: "#ff8fa3",
    dMr: "अधर्माचा नाश करणारी योद्धा देवी.", dEn: "The warrior goddess who destroys evil."
  },
  {
    mr: "कालरात्री", en: "Kalaratri", img: px(19182484, 700), color: "#b69cff",
    dMr: "अंधार आणि भय दूर करणारी शक्ती.", dEn: "The power that dispels darkness and fear."
  },
  {
    mr: "महागौरी", en: "Mahagauri", img: px(33669866, 700), color: "#fff1c9",
    dMr: "पवित्रता, शांती आणि सौंदर्याचे रूप.", dEn: "The form of purity, peace and grace."
  },
  {
    mr: "सिद्धिदात्री", en: "Siddhidatri", img: px(32568933, 700), color: "#ffd36b",
    dMr: "ज्ञान आणि सिद्धी प्रदान करणारी देवी.", dEn: "The goddess who bestows wisdom and fulfilment."
  },
];

/**
 * EVENTS — update dates/times here when announced.
 * Leave date/time as null to show "will be announced soon".
 * Example: date: { mr: "१२ ऑक्टोबर २०२६", en: "12 October 2026" }
 */
const EVENTS = [
  {
    icon: "🏺", img: px(37531064, 700), mr: "घटस्थापना", en: "Ghatasthapana", date: null, time: null,
    dMr: "मंगल कलश स्थापनेने नवरात्र उत्सवाचा शुभारंभ.", dEn: "The auspicious beginning of Navratri with the sacred kalash."
  },
  {
    icon: "💃", img: px(29492764, 700), mr: "गरबा नाईट", en: "Garba Night", date: null, time: null,
    dMr: "पारंपरिक वेशभूषेत ढोल-ताशांच्या तालावर गरबा.", dEn: "Traditional garba to the beat of dhol in festive attire."
  },
  {
    icon: "🥢", img: px(17264037, 700), mr: "दांडिया उत्सव", en: "Dandiya Utsav", date: null, time: null,
    dMr: "रंगीबेरंगी दांडियांचा उत्साहपूर्ण उत्सव.", dEn: "A joyful celebration with colourful dandiya sticks."
  },
  {
    icon: "🪔", img: px(35655143, 700), mr: "महाआरती", en: "Maha Aarti", date: null, time: null,
    dMr: "शेकडो दिव्यांच्या प्रकाशात मातेची महाआरती.", dEn: "The grand aarti of the Mother in the glow of countless diyas."
  },
  {
    icon: "🎶", img: px(33437388, 700), mr: "भजन संध्या", en: "Bhajan Sandhya", date: null, time: null,
    dMr: "भक्तिगीते आणि भजनांनी सजलेली सायंकाळ.", dEn: "An evening filled with devotional songs and bhajans."
  },
  {
    icon: "🍛", img: px(29215357, 700), mr: "महाप्रसाद", en: "Mahaprasad", date: null, time: null,
    dMr: "सर्व भाविकांसाठी प्रेमाने तयार केलेला महाप्रसाद.", dEn: "Sacred food lovingly prepared for all devotees."
  },
  {
    icon: "🎭", img: px(36592889, 700), mr: "सांस्कृतिक कार्यक्रम", en: "Cultural Programme", date: null, time: null,
    dMr: "नृत्य, नाट्य आणि कलागुणांचे सादरीकरण.", dEn: "Performances of dance, drama and local talent."
  },
  {
    icon: "🏹", img: px(32575458, 700), mr: "विजयादशमी", en: "Vijayadashami", date: null, time: null,
    dMr: "असत्यावर सत्याच्या विजयाचा उत्सव — दसरा.", dEn: "Dussehra — celebrating the victory of good over evil."
  },
  {
    icon: "🏹", img: px(32575458, 700), mr: "वसुबारस", en: "", date: null, time: null,
    dMr: "असत्यावर सत्याच्या विजयाचा उत्सव — दसरा.", dEn: "Dussehra — celebrating the victory of good over evil."
  }
];

/** Durga Daud highlight cards */
const DD_HIGHLIGHTS = [
  { icon: "🏃‍♂️", mr: "दुर्गा माता दौड", en: "Durga Daud" },
  { icon: "❤️", mr: "आरोग्य", en: "Health & Fitness" },
  { icon: "🤝", mr: "एकता", en: "Unity" },
  { icon: "🚩", mr: "भक्ती", en: "Devotion" },
];

/* ---------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const LANG_KEY = "dmms-lang";
let lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "mr";

const t = (key) => translations[lang][key] ?? translations.mr[key] ?? key;
const other = () => (lang === "mr" ? "en" : "mr");
const pick = (obj, base = "") => obj[base ? base + (lang === "mr" ? "Mr" : "En") : lang];

/* Marathi digits for countdown / counters */
const MR_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
const num = (n) => (lang === "mr" ? String(n).replace(/\d/g, (d) => MR_DIGITS[d]) : String(n));

/* ---------------------------------------------------------------------
   5. LANGUAGE SYSTEM
   --------------------------------------------------------------------- */
function applyTranslations() {
  document.documentElement.lang = lang;
  document.body.classList.toggle("lang-mr", lang === "mr");
  document.body.classList.toggle("lang-en", lang === "en");

  $$("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (translations[lang][key] !== undefined) el.textContent = t(key);
  });
  $$("[data-i18n-alt]").forEach((el) => (el.alt = t(el.dataset.i18nAlt)));
  $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));

  // Toggle UI state
  $$(".lang-btn").forEach((b) => {
    const active = b.dataset.lang === lang;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", active);
  });
  $(".lang-toggle").dataset.active = lang;

  document.title =
    lang === "mr"
      ? "दुर्गा माता मित्र मंडळ, डुबेर | Durga Mata Mitra Mandal Dubere"
      : "Durga Mata Mitra Mandal Dubere | दुर्गा माता मित्र मंडळ";

  // Re-render dynamic content
  renderForms();
  renderEvents();
  renderHighlights();
  renderMediaGrid();
  renderContact();
  $$(".stat__num").forEach((el) => {
    if (el.dataset.done) el.textContent = num(el.dataset.count);
  });
  tickCountdowns();
}

function setLang(next) {
  if (next === lang) return;
  lang = next;
  localStorage.setItem(LANG_KEY, lang);
  document.body.classList.add("lang-switching");
  setTimeout(() => {
    applyTranslations();
    document.body.classList.remove("lang-switching");
  }, prefersReduced ? 0 : 180);
}

$$(".lang-btn").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

/* ---------------------------------------------------------------------
   6. RENDERERS
   --------------------------------------------------------------------- */
function renderForms() {
  const grid = $("#formsGrid");
  grid.innerHTML = NINE_FORMS.map(
    (f, i) => `
    <article class="form-card" style="--accent:${f.color}" tabindex="0">
      <div class="form-card__border" aria-hidden="true"></div>
      <div class="form-card__img"><img src="${f.img}" alt="${f[lang]} — ${f[other()]}" loading="lazy" /></div>
      <div class="form-card__body">
        <span class="form-card__day">${t("dayLabel")} ${num(i + 1)}</span>
        <h3 class="form-card__name">${f.mr}</h3>
        <p class="form-card__en">${f.en}</p>
        <p class="form-card__desc">${pick(f, "d")}</p>
      </div>
    </article>`
  ).join("");
  attachTilt($$(".form-card", grid));
}

function renderEvents() {
  $("#eventsGrid").innerHTML = EVENTS.map(
    (e, i) => `
    <article class="event reveal in" style="--d:${(i % 4) * 0.06}s">
      <div class="event__media">
        <img src="${e.img}" alt="${e[lang]}" loading="lazy" />
        <span class="event__icon">${e.icon}</span>
        <span class="event__num">${num(String(i + 1).padStart(2, "0"))}</span>
      </div>
      <div class="event__body">
        <h3 class="event__title">${e[lang]}</h3>
        <p class="event__alt">${e[other()]}</p>
        <p class="event__desc">${pick(e, "d")}</p>
        <ul class="event__meta">
          <li><svg><use href="#i-cal"/></svg><span><b>${t("evDate")}:</b> ${e.date ? e.date[lang] : t("dateTBA")}</span></li>
          <li><svg><use href="#i-clock"/></svg><span><b>${t("evTime")}:</b> ${e.time ? e.time[lang] : t("timeTBA")}</span></li>
          <li><svg><use href="#i-pin"/></svg><span><b>${t("evLoc")}:</b> ${e.location ? e.location[lang] : t("locDubere")}</span></li>
        </ul>
      </div>
    </article>`
  ).join("");
}

function renderHighlights() {
  $("#ddHighlights").innerHTML = DD_HIGHLIGHTS.map(
    (h, i) => `
    <article class="hl reveal in" style="--d:${i * 0.08}s">
      <span class="hl__ico">${h.icon}</span>
      <h4 class="hl__title">${h[lang]}</h4>
      <p class="hl__sub">${h[other()]}</p>
    </article>`
  ).join("");
}

/* ---------------------------------------------------------------------
   8. GALLERY + LIGHTBOX
   --------------------------------------------------------------------- */
let mediaItems = [];
let mediaStatusKey = "mediaLoading";
let mediaFilter = "all";
let mediaHasMore = false;
let mediaBusy = false;
const MEDIA_PAGE = 12;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function mediaPublicUrl(item, path = item.storage_path) {
  return supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path).data.publicUrl;
}

function mediaCardHTML(item, index) {
  const title = escapeHTML(item.title);
  const isVideo = item.media_type === "video";
  // Cards only ever load a small thumbnail; the full photo/video loads on click.
  const thumbPath = item.thumbnail_path || (isVideo ? null : item.storage_path);
  const preview = thumbPath
    ? `<img src="${escapeHTML(mediaPublicUrl(item, thumbPath))}" alt="${title}" loading="lazy" decoding="async" />`
    : `<span class="media-card__ph"><svg width="40" height="40"><use href="#i-play"/></svg></span>`;
  const play = isVideo ? `<span class="media-card__play"><svg><use href="#i-play"/></svg></span>` : "";
  const kind = isVideo ? "VIDEO" : "PHOTO";
  const cat = item.category && item.category !== "General" ? `<span class="media-card__cat">${escapeHTML(item.category)}</span>` : "";
  return `<article class="media-card" style="--i:${index % MEDIA_PAGE}"><button class="media-card__button" type="button" data-media-id="${escapeHTML(item.id)}" aria-label="${title}">${preview}${play}<span class="media-card__type">${kind}</span></button><p class="media-card__title">${title}${cat}</p></article>`;
}

function renderMediaGrid() {
  const status = $("#mediaStatus");
  const grid = $("#mediaGrid");
  const filters = $("#mediaFilters");
  const more = $("#mediaMore");
  status.textContent = mediaStatusKey ? t(mediaStatusKey) : "";
  status.hidden = mediaItems.length > 0 && !mediaStatusKey;
  more.hidden = !mediaHasMore;
  more.textContent = t("mediaMore");
  filters.hidden = mediaItems.length === 0 && mediaFilter === "all";
  filters.innerHTML = [["all", "mediaAll"], ["image", "mediaPhotos"], ["video", "mediaVideos"]]
    .map(([key, label]) => `<button type="button" role="tab" class="chip ${mediaFilter === key ? "is-active" : ""}" data-media-filter="${key}" aria-selected="${mediaFilter === key}">${t(label)}</button>`)
    .join("");
  grid.innerHTML = mediaItems.map(mediaCardHTML).join("");
}

$("#mediaFilters").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-media-filter]");
  if (!chip || chip.dataset.mediaFilter === mediaFilter) return;
  mediaFilter = chip.dataset.mediaFilter;
  void loadPublicMedia(true);
});
$("#mediaMore").addEventListener("click", () => void loadPublicMedia(false));
$("#mediaGrid").addEventListener("click", (event) => {
  const button = event.target.closest(".media-card__button");
  if (!button) return;
  const item = mediaItems.find((entry) => entry.id === button.dataset.mediaId);
  if (!item) return;
  if (item.media_type === "video") openVideo(mediaPublicUrl(item), item.title);
  else {
    const images = mediaItems.filter((entry) => entry.media_type === "image");
    openLightbox(images, images.indexOf(item));
  }
});

// Only PUBLISHED items are requested here, and the database also enforces it
// (an admin who is signed in on the same browser still sees only published items on the public page).
async function loadPublicMedia(reset = true) {
  if (mediaBusy) return;
  mediaBusy = true;
  if (reset) { mediaItems = []; mediaHasMore = false; mediaStatusKey = "mediaLoading"; renderMediaGrid(); }
  let query = supabase
    .from("gallery_media")
    .select("id, title, media_type, storage_path, thumbnail_path, category, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(mediaItems.length, mediaItems.length + MEDIA_PAGE); // one extra row tells us if more exist
  if (mediaFilter !== "all") query = query.eq("media_type", mediaFilter);
  const { data, error } = await query;
  mediaBusy = false;
  if (error) {
    mediaStatusKey = "mediaError";
    renderMediaGrid();
    return;
  }
  const rows = data || [];
  mediaHasMore = rows.length > MEDIA_PAGE;
  mediaItems = mediaItems.concat(rows.slice(0, MEDIA_PAGE));
  mediaStatusKey = mediaItems.length ? "" : "mediaEmpty";
  renderMediaGrid();
}

function renderFilters() {
  $$("[data-filters]").forEach((wrap) => {
    const g = galleries[wrap.dataset.filters];
    wrap.innerHTML = g.filters
      .map(
        (f) =>
          `<button type="button" role="tab" class="chip ${g.active === f.key ? "is-active" : ""}" data-key="${f.key}" aria-selected="${g.active === f.key}">${t(f.label)}</button>`
      )
      .join("");
    $$(".chip", wrap).forEach((chip) =>
      chip.addEventListener("click", () => {
        if (g.active === chip.dataset.key) return;
        g.active = chip.dataset.key;
        $$(".chip", wrap).forEach((c) => {
          c.classList.toggle("is-active", c === chip);
          c.setAttribute("aria-selected", c === chip);
        });
        renderGallery(wrap.dataset.filters, true);
      })
    );
  });
}

function visibleItems(id) {
  const g = galleries[id];
  return g.items.filter((it) => g.active === "all" || it.cat === g.active);
}

function renderGallery(id, animate) {
  const el = document.getElementById(id);
  const doRender = () => {
    const items = visibleItems(id);
    const g = galleries[id];
    el.innerHTML = items
      .map((it, i) => {
        const catLabel = t(g.filters.find((f) => f.key === it.cat)?.label || "fAll");
        return `
        <figure class="tile ${it.tall ? "tile--tall" : ""}" style="--i:${i}" tabindex="0" role="button" aria-label="${it[lang]}" data-index="${i}">
          <img src="${it.src}" alt="${it[lang]}" loading="lazy" />
          <figcaption><span class="tile__cat">${catLabel}</span><span class="tile__title">${it[lang]}</span></figcaption>
          <span class="tile__zoom"><svg><use href="#i-expand"/></svg></span>
        </figure>`;
      })
      .join("");
    $$(".tile", el).forEach((tile) => {
      const open = () => openLightbox(id, +tile.dataset.index);
      tile.addEventListener("click", open);
      tile.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open()));
    });
    requestAnimationFrame(() => el.classList.remove("is-filtering"));
  };
  if (animate && !prefersReduced) {
    el.classList.add("is-filtering");
    setTimeout(doRender, 250);
  } else doRender();
}

const lb = { el: $("#lightbox"), img: $("#lbImg"), cap: $("#lbCap"), count: $("#lbCount"), list: [], i: 0, lastFocus: null };

function openLightbox(items, index) {
  lb.list = items;
  lb.i = index;
  lb.lastFocus = document.activeElement;
  showLightboxImage();
  lb.el.classList.add("is-open");
  lb.el.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  $("#lbClose").focus();
}
function showLightboxImage(dir = 0) {
  const item = lb.list[lb.i];
  lb.img.classList.remove("slide-l", "slide-r");
  void lb.img.offsetWidth;
  if (dir) lb.img.classList.add(dir > 0 ? "slide-l" : "slide-r");
  lb.img.src = mediaPublicUrl(item);
  lb.img.alt = item.title;
  lb.cap.textContent = item.title;
  lb.count.textContent = `${num(lb.i + 1)} / ${num(lb.list.length)}`;
}
function stepLightbox(direction) {
  lb.i = (lb.i + direction + lb.list.length) % lb.list.length;
  showLightboxImage(direction);
}
function closeLightbox() {
  lb.el.classList.remove("is-open");
  lb.el.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
  if (document.fullscreenElement) document.exitFullscreen?.();
  lb.lastFocus?.focus?.();
}
$("#lbPrev").addEventListener("click", () => stepLightbox(-1));
$("#lbNext").addEventListener("click", () => stepLightbox(1));
$("#lbClose").addEventListener("click", closeLightbox);
$("#lbFull").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else lb.el.requestFullscreen?.().catch(() => { });
});
lb.el.addEventListener("click", (event) => {
  if (event.target === lb.el || event.target.id === "lbStage") closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (lb.el.classList.contains("is-open")) {
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowRight") stepLightbox(1);
    if (event.key === "ArrowLeft") stepLightbox(-1);
  } else if (vm.el.classList.contains("is-open") && event.key === "Escape") closeVideo();
});
(() => {
  let x0 = null;
  let y0 = null;
  lb.el.addEventListener("touchstart", (event) => {
    x0 = event.touches[0].clientX;
    y0 = event.touches[0].clientY;
  }, { passive: true });
  lb.el.addEventListener("touchend", (event) => {
    if (x0 === null) return;
    const dx = event.changedTouches[0].clientX - x0;
    const dy = event.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) stepLightbox(dx < 0 ? 1 : -1);
    x0 = null;
  });
})();

/* ---------------------------------------------------------------------
   9. VIDEOS
   --------------------------------------------------------------------- */
const vm = { el: $("#vmodal"), player: $("#vPlayer"), title: $("#vTitle") };

function openVideo(src, title) {
  vm.player.src = src;
  vm.title.textContent = title;
  vm.el.classList.add("is-open");
  vm.el.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  // Started by the user's click — never autoplays on page load
  vm.player.play().catch(() => { });
  $("#vClose").focus();
}
function closeVideo() {
  vm.player.pause();
  vm.player.removeAttribute("src");
  vm.player.load();
  vm.el.classList.remove("is-open");
  vm.el.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}
$("#vClose").addEventListener("click", closeVideo);
vm.el.addEventListener("click", (e) => e.target === vm.el && closeVideo());

/* ---------------------------------------------------------------------
   Contact, social & toast
   --------------------------------------------------------------------- */
function renderContact() {
  if (CONFIG.phone) $("#phoneText").textContent = CONFIG.phone;
  if (CONFIG.email) $("#emailText").textContent = CONFIG.email;
}

const toastEl = $("#toast");
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), 3200);
}
$$("[data-toast]").forEach((b) => b.addEventListener("click", () => toast(t(b.dataset.toast))));

$("#directionsBtn").href = CONFIG.directionsUrl;
$("#contactBtn").addEventListener("click", () => {
  if (CONFIG.phone) window.location.href = `tel:${CONFIG.phone}`;
  else if (CONFIG.email) window.location.href = `mailto:${CONFIG.email}`;
  else toast(t("toastContact"));
});

// Maps: insert real iframe only when a URL is configured
function mountMap(sel, url) {
  if (!url) return;
  $(sel).innerHTML = `<iframe src="${url}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen title="Google Maps"></iframe>`;
}
mountMap("#contactMap", CONFIG.mapEmbedUrl);
mountMap("#routeMap", CONFIG.routeMapEmbedUrl);

// Social icons: real links only when provided
const SOCIAL_ICONS = { instagram: ["i-ig", "Instagram"], facebook: ["i-fb", "Facebook"], youtube: ["i-yt", "YouTube"], whatsapp: ["i-wa", "WhatsApp"] };
$("#socials").innerHTML = Object.entries(SOCIAL_ICONS)
  .map(([k, [ico, name]]) => {
    const url = CONFIG.social[k];
    return url
      ? `<a class="social" href="${url}" target="_blank" rel="noopener" aria-label="${name}"><svg><use href="#${ico}"/></svg></a>`
      : `<button type="button" class="social social--soon" aria-label="${name}" data-soon title="${name}"><svg><use href="#${ico}"/></svg></button>`;
  })
  .join("");
$$("[data-soon]").forEach((b) => b.addEventListener("click", () => toast(t("toastSocial"))));

/* ---------------------------------------------------------------------
   7. COUNTDOWNS
   --------------------------------------------------------------------- */
const COUNTDOWNS = {
  navratri: { target: () => new Date(CONFIG.navratriStart), done: "cdDone" },
  durgaDaud: { target: () => new Date(CONFIG.durgaDaudStart || CONFIG.navratriStart), done: "ddCdDone" },
};
const UNITS = ["days", "hours", "minutes", "seconds"];

function buildCountdowns() {
  $$("[data-countdown]").forEach((el) => {
    el.innerHTML =
      UNITS.map(
        (u) => `<div class="cd__unit" data-unit="${u}"><span class="cd__num"><span class="cd__val">00</span></span><span class="cd__label" data-i18n="${u}">${t(u)}</span></div>`
      ).join("") + `<p class="cd__done" hidden></p>`;
  });
}

function tickCountdowns() {
  const now = Date.now();
  $$("[data-countdown]").forEach((el) => {
    const cfg = COUNTDOWNS[el.dataset.countdown];
    const diff = cfg.target().getTime() - now;
    const doneEl = $(".cd__done", el);
    if (isNaN(diff) || diff <= 0) {
      el.classList.add("is-done");
      doneEl.hidden = false;
      doneEl.textContent = t(cfg.done);
      return;
    }
    const parts = {
      days: Math.floor(diff / 864e5),
      hours: Math.floor((diff / 36e5) % 24),
      minutes: Math.floor((diff / 6e4) % 60),
      seconds: Math.floor((diff / 1e3) % 60),
    };
    UNITS.forEach((u) => {
      const valEl = $(`[data-unit="${u}"] .cd__val`, el);
      const text = num(String(parts[u]).padStart(2, "0"));
      if (valEl.textContent !== text) {
        valEl.textContent = text;
        if (!prefersReduced) {
          valEl.classList.remove("tick");
          void valEl.offsetWidth;
          valEl.classList.add("tick");
        }
      }
      $(`[data-unit="${u}"] .cd__label`, el).textContent = t(u);
    });
  });
}

/* ---------------------------------------------------------------------
   10. NAV / SCROLL / REVEAL / COUNTERS / BACK-TO-TOP
   --------------------------------------------------------------------- */
const nav = $("#nav");
const burger = $("#burger");
const mobileMenu = $("#mobileMenu");

function toggleMenu(force) {
  const open = force ?? !nav.classList.contains("menu-open");
  nav.classList.toggle("menu-open", open);
  burger.setAttribute("aria-expanded", open);
  mobileMenu.setAttribute("aria-hidden", !open);
  document.body.classList.toggle("no-scroll", open);
}
burger.addEventListener("click", () => toggleMenu());

// Smooth navigation for all in-page links
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute("href");
  if (id.length < 2) return;
  const target = document.querySelector(id);
  if (!target) return;
  e.preventDefault();
  toggleMenu(false);
  const y = target.getBoundingClientRect().top + window.scrollY - (id === "#home" ? 0 : nav.offsetHeight - 1);
  window.scrollTo({ top: y, behavior: prefersReduced ? "auto" : "smooth" });
  history.replaceState(null, "", id);
  initAdmin();
});

// Scroll effects: navbar glass, back-to-top progress, parallax, active link
const toTop = $("#toTop");
const ring = $(".to-top__ring circle");
const RING_LEN = 2 * Math.PI * 21;
ring.style.strokeDasharray = RING_LEN;
const sections = $$("main section[id]");
const parallaxEls = $$("[data-parallax]");

function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle("is-scrolled", y > 30);
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? y / max : 0;
  ring.style.strokeDashoffset = RING_LEN * (1 - p);
  toTop.classList.toggle("is-visible", y > innerHeight * 0.8);

  if (!prefersReduced) {
    parallaxEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      el.style.transform = `translate3d(0, ${(r.top * -0.18).toFixed(1)}px, 0) scale(1.08)`;
    });
  }

  let current = "home";
  sections.forEach((s) => {
    if (s.getBoundingClientRect().top <= nav.offsetHeight + 120) current = s.id;
  });
  if (current === "videos") current = "gallery";
  $$(".nav__link").forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${current}`));
}
let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => { onScroll(); ticking = false; });
    ticking = true;
  }
}, { passive: true });
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" }));

// Reveal on scroll
const revealObs = new IntersectionObserver(
  (entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); revealObs.unobserve(en.target); }
  }),
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);
function observeReveals() {
  $$(".reveal:not(.in)").forEach((el) => revealObs.observe(el));
}

// Animated counters
const countObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    countObs.unobserve(el);
    const end = +el.dataset.count;
    const dur = prefersReduced ? 0 : 1400;
    const start = performance.now();
    const step = (now) => {
      const k = dur ? Math.min(1, (now - start) / dur) : 1;
      el.textContent = num(Math.round(end * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
      else el.dataset.done = "1";
    };
    requestAnimationFrame(step);
  });
}, { threshold: 0.5 });
$$(".stat__num").forEach((el) => countObs.observe(el));

// Subtle 3D tilt for cards (pointer devices only)
function attachTilt(cards) {
  if (prefersReduced || !matchMedia("(hover: hover)").matches) return;
  cards.forEach((c) => {
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
      c.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
      c.style.setProperty("--my", `${(y + 0.5) * 100}%`);
    });
    c.addEventListener("pointerleave", () => (c.style.transform = ""));
  });
}

/* ---------------------------------------------------------------------
   11. PARTICLES + PETALS
   --------------------------------------------------------------------- */
function initParticles(canvas) {
  const ctx = canvas.getContext("2d");
  const mode = canvas.dataset.particles; // "gold" | "run"
  let w, h, parts = [], raf, visible = false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(70, (w * h) / (mode === "run" ? 16000 : 22000)));
    parts = Array.from({ length: count }, () => spawn(true));
  }
  function spawn(initial) {
    if (mode === "run") {
      return {
        x: initial ? Math.random() * w : -20, y: Math.random() * h, vx: 1.5 + Math.random() * 3.5, vy: -0.2 + Math.random() * 0.4,
        r: 0.6 + Math.random() * 1.8, len: 10 + Math.random() * 40, a: 0.25 + Math.random() * 0.6, hue: 25 + Math.random() * 25
      };
    }
    return {
      x: Math.random() * w, y: initial ? Math.random() * h : h + 10, vx: -0.15 + Math.random() * 0.3, vy: -(0.15 + Math.random() * 0.5),
      r: 0.6 + Math.random() * 2.2, a: 0.2 + Math.random() * 0.7, tw: Math.random() * Math.PI * 2, hue: 38 + Math.random() * 14
    };
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    parts.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (mode === "run") {
        const g = ctx.createLinearGradient(p.x - p.len, p.y, p.x, p.y);
        g.addColorStop(0, `hsla(${p.hue},100%,60%,0)`);
        g.addColorStop(1, `hsla(${p.hue},100%,65%,${p.a})`);
        ctx.strokeStyle = g; ctx.lineWidth = p.r; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(p.x - p.len, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        if (p.x - p.len > w) parts[i] = spawn(false);
      } else {
        p.tw += 0.03;
        const a = p.a * (0.6 + Math.sin(p.tw) * 0.4);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue},90%,70%,${a})`;
        ctx.shadowColor = `hsla(${p.hue},100%,60%,${a})`;
        ctx.shadowBlur = 8;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        if (p.y < -10) parts[i] = spawn(false);
      }
    });
    ctx.shadowBlur = 0;
    raf = requestAnimationFrame(draw);
  }
  resize();
  window.addEventListener("resize", () => { resize(); if (prefersReduced) drawStatic(); });
  function drawStatic() { draw(); cancelAnimationFrame(raf); }
  if (prefersReduced) { drawStatic(); return; }
  // Only animate when on screen (performance)
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !visible) { visible = true; draw(); }
    else if (!en.isIntersecting && visible) { visible = false; cancelAnimationFrame(raf); }
  }).observe(canvas);
}

function initPetals(el) {
  if (prefersReduced) return;
  const n = +el.dataset.petals || 10;
  const colors = ["#e8b64c", "#f59e0b", "#c2378f", "#f6d98b", "#ef7b45"];
  el.innerHTML = Array.from({ length: n }, (_, i) => {
    const size = 8 + Math.random() * 10;
    return `<span class="petal" style="left:${Math.random() * 100}%;width:${size}px;height:${size * 1.4}px;background:${colors[i % colors.length]};animation-duration:${10 + Math.random() * 10}s;animation-delay:${-Math.random() * 20}s;--sway:${20 + Math.random() * 60}px"></span>`;
  }).join("");
}

/* ---------------------------------------------------------------------
   INIT
   --------------------------------------------------------------------- */
function init() {
  $("#heroImg").src = IMAGES.hero;
  $("#aboutImg").src = IMAGES.about;
  $("#ddImg").src = IMAGES.durgaDaud;
  $("#quoteImg").src = IMAGES.quote;
  $("#year").textContent = new Date().getFullYear();

  buildCountdowns();
  applyTranslations();
  void loadPublicMedia();
  initAdmin();
  observeReveals();
  setInterval(tickCountdowns, 1000);

  $$("canvas.particles").forEach(initParticles);
  $$("[data-petals]").forEach(initPetals);
  onScroll();
  requestAnimationFrame(() => document.body.classList.add("is-ready"));
}
init();
