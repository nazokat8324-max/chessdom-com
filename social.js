// National chess clubs - Asian and European countries
window.tournamentDetailBoard = null;

// i18next yordamchi funksiyasi - dinamik HTML shablonlarida foydalanish uchun
const tr = (key, fallback, opts) => (typeof i18next !== 'undefined' && i18next.isInitialized) ? i18next.t(key, { defaultValue: fallback, ...opts }) : fallback;

// Inglizcha davlat nomi -> o'zbekcha nom lug'ati
const uzCountryNames = {
  "Afghanistan": "Afg'oniston", "Armenia": "Armaniston", "Azerbaijan": "Ozarbayjon",
  "Bahrain": "Bahrayn", "Bangladesh": "Bangladesh", "Bhutan": "Butan",
  "Brunei": "Bruney", "Cambodia": "Kambodja", "China": "Xitoy", "Cyprus": "Kipr",
  "Georgia": "Gruziya", "India": "Hindiston", "Indonesia": "Indoneziya",
  "Iran": "Eron", "Iraq": "Iroq", "Israel": "Isroil", "Japan": "Yaponiya",
  "Jordan": "Iordaniya", "Kazakhstan": "Qozog'iston", "Kuwait": "Quvayt",
  "Kyrgyzstan": "Qirg'iziston", "Laos": "Laos", "Lebanon": "Livan",
  "Malaysia": "Malayziya", "Maldives": "Maldiv orollari", "Mongolia": "Mo'g'uliston",
  "Myanmar": "Myanma", "Nepal": "Nepal", "North Korea": "Shimoliy Koreya",
  "Oman": "Ummon", "Pakistan": "Pokiston", "Palestine": "Falastin",
  "Philippines": "Filippin", "Qatar": "Qatar", "Saudi Arabia": "Saudiya Arabistoni",
  "Singapore": "Singapur", "South Korea": "Janubiy Koreya", "Sri Lanka": "Shri-Lanka",
  "Syria": "Suriya", "Tajikistan": "Tojikiston", "Thailand": "Tailand",
  "Timor-Leste": "Sharqiy Timor", "Türkiye": "Turkiya", "Turkey": "Turkiya",
  "Turkmenistan": "Turkmaniston",
  "United Arab Emirates": "Birlashgan Arab Amirliklari", "Uzbekistan": "O'zbekiston",
  "Vietnam": "Vetnam", "Yemen": "Yaman",
  "Albania": "Albaniya", "Andorra": "Andorra", "Austria": "Avstriya",
  "Belarus": "Belarus", "Belgium": "Belgiya",
  "Bosnia and Herzegovina": "Bosniya va Gertsegovina",
  "Bosnia & Herzegovina": "Bosniya va Gertsegovina",
  "Bulgaria": "Bolgariya", "Croatia": "Xorvatiya",
  "Czechia": "Chexiya", "Czech Republic": "Chexiya",
  "Denmark": "Daniya", "Estonia": "Estoniya", "Finland": "Finlyandiya",
  "France": "Fransiya", "Germany": "Germaniya", "Greece": "Gretsiya",
  "Hungary": "Vengriya", "Iceland": "Islandiya", "Ireland": "Irlandiya",
  "Italy": "Italiya", "Latvia": "Latviya", "Liechtenstein": "Lixtenshteyn",
  "Lithuania": "Litva", "Luxembourg": "Lyuksemburg", "Malta": "Malta",
  "Moldova": "Moldova", "Monaco": "Monako", "Montenegro": "Chernogoriya",
  "Netherlands": "Niderlandiya", "North Macedonia": "Shimoliy Makedoniya",
  "Norway": "Norvegiya", "Poland": "Polsha", "Portugal": "Portugaliya",
  "Romania": "Ruminiya", "Russia": "Rossiya", "San Marino": "San-Marino",
  "Serbia": "Serbiya", "Slovakia": "Slovakiya", "Slovenia": "Sloveniya",
  "Spain": "Ispaniya", "Sweden": "Shvetsiya", "Switzerland": "Shveytsariya",
  "Ukraine": "Ukraina", "United Kingdom": "Buyuk Britaniya", "Vatican City": "Vatikan",
  "Algeria": "Jazoir", "Angola": "Angola", "Benin": "Benin",
  "Botswana": "Botsvana", "Burkina Faso": "Burkina-Faso", "Burundi": "Burundi",
  "Cameroon": "Kamerun", "Central African Republic": "Markaziy Afrika Respublikasi",
  "Chad": "Chad", "Comoros": "Komor orollari", "Congo": "Kongo (Brazzavil)",
  "Congo - Brazzaville": "Kongo (Brazzavil)", "Côte d'Ivoire": "Kot-d'Ivuar",
  "Côte d’Ivoire": "Kot-d'Ivuar",
  "Ivory Coast": "Kot-d'Ivuar", "Egypt": "Misr", "Equatorial Guinea": "Ekvatorial Gvineya",
  "Eritrea": "Eritreya", "Eswatini": "Esvatini", "Ethiopia": "Efiopiya",
  "Gabon": "Gabon", "Gambia": "Gambiya", "Ghana": "Gana", "Kenya": "Keniya",
  "Lesotho": "Lesoto", "Liberia": "Liberiya", "Libya": "Liviya",
  "Madagascar": "Madagaskar", "Malawi": "Malavi", "Mali": "Mali",
  "Mauritania": "Mavritaniya", "Mauritius": "Mavrikiy", "Morocco": "Marokash",
  "Mozambique": "Mozambik", "Namibia": "Namibiya", "Niger": "Niger",
  "Nigeria": "Nigeriya", "Rwanda": "Ruanda",
  "São Tomé & Príncipe": "San-Tome va Prinsipi", "Sao Tome and Principe": "San-Tome va Prinsipi",
  "Senegal": "Senegal", "Seychelles": "Seyshel orollari", "Sierra Leone": "Serra-Leone",
  "Somalia": "Somali", "South Africa": "Janubiy Afrika", "South Sudan": "Janubiy Sudan",
  "Sudan": "Sudan", "Tanzania": "Tanzaniya", "Togo": "Togo", "Tunisia": "Tunis",
  "Uganda": "Uganda", "Zambia": "Zambiya", "Zimbabwe": "Zimbabve",
  "Argentina": "Argentina", "Bolivia": "Boliviya", "Brazil": "Braziliya",
  "Chile": "Chili", "Colombia": "Kolumbiya", "Ecuador": "Ekvador",
  "Guyana": "Gayana", "Paraguay": "Paragvay", "Peru": "Peru",
  "Suriname": "Surinam", "Uruguay": "Urugvay", "Venezuela": "Venesuela",
  "Antigua and Barbuda": "Antigua va Barbuda", "Antigua & Barbuda": "Antigua va Barbuda",
  "Bahamas": "Bagama orollari",
  "Barbados": "Barbados", "Belize": "Beliz", "Canada": "Kanada",
  "Costa Rica": "Kosta-Rika", "Cuba": "Kuba", "Dominica": "Dominika",
  "Dominican Republic": "Dominikan Respublikasi", "El Salvador": "Salvador",
  "Grenada": "Grenada", "Guatemala": "Gvatemala", "Haiti": "Gaiti",
  "Honduras": "Gonduras", "Jamaica": "Yamayka", "Mexico": "Meksika",
  "Nicaragua": "Nikaragua", "Panama": "Panama",
  "Saint Kitts and Nevis": "Sent-Kits va Nevis", "St. Kitts & Nevis": "Sent-Kits va Nevis",
  "Saint Lucia": "Sent-Lyusiya", "St. Lucia": "Sent-Lyusiya",
  "Saint Vincent and the Grenadines": "Sent-Vinsent va Grenadinlar",
  "St. Vincent & Grenadines": "Sent-Vinsent va Grenadinlar",
  "Trinidad and Tobago": "Trinidad va Tobago", "Trinidad & Tobago": "Trinidad va Tobago",
  "United States": "AQSH",
  "Australia": "Avstraliya", "Fiji": "Fiji", "Kiribati": "Kiribati",
  "Marshall Islands": "Marshall orollari", "Micronesia": "Mikroneziya",
  "Nauru": "Nauru", "New Zealand": "Yangi Zelandiya", "Palau": "Palau",
  "Papua New Guinea": "Papua-Yangi Gvineya", "Samoa": "Samoa",
  "Solomon Islands": "Solomon orollari", "Tonga": "Tonga", "Tuvalu": "Tuvalu",
  "Vanuatu": "Vanuatu"
};

// Davlat nomini tanlangan tilga qaytarish
const countryName = (name, fallbackCode) => {
  if (!name) return '';
  let locale = (typeof i18next !== 'undefined' && i18next.language) || 'uz';
  locale = String(locale).toLowerCase().split('-')[0];

  if (locale === 'uz') {
    return uzCountryNames[name] || name;
  }

  try {
    let code = fallbackCode;
    if (!code && typeof allCountries !== 'undefined') {
      const found = allCountries.find(c => c.name === name);
      code = found ? found.code : null;
    }
    if (!code) return name;
    const n = new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' })
      .of(String(code).toUpperCase());
    return n || name;
  } catch (e) {
    return name;
  }
};

window.countryName = countryName;

const asianCountries = [
  { name: "Afghanistan", code: "af" },
  { name: "Armenia", code: "am" },
  { name: "Azerbaijan", code: "az" },
  { name: "Bahrain", code: "bh" },
  { name: "Bangladesh", code: "bd" },
  { name: "Bhutan", code: "bt" },
  { name: "Brunei", code: "bn" },
  { name: "Cambodia", code: "kh" },
  { name: "China", code: "cn" },
  { name: "Cyprus", code: "cy" },
  { name: "Georgia", code: "ge" },
  { name: "India", code: "in" },
  { name: "Indonesia", code: "id" },
  { name: "Iran", code: "ir" },
  { name: "Iraq", code: "iq" },
  { name: "Israel", code: "il" },
  { name: "Japan", code: "jp" },
  { name: "Jordan", code: "jo" },
  { name: "Kazakhstan", code: "kz" },
  { name: "Kuwait", code: "kw" },
  { name: "Kyrgyzstan", code: "kg" },
  { name: "Laos", code: "la" },
  { name: "Lebanon", code: "lb" },
  { name: "Malaysia", code: "my" },
  { name: "Maldives", code: "mv" },
  { name: "Mongolia", code: "mn" },
  { name: "Myanmar", code: "mm" },
  { name: "Nepal", code: "np" },
  { name: "North Korea", code: "kp" },
  { name: "Oman", code: "om" },
  { name: "Pakistan", code: "pk" },
  { name: "Palestine", code: "ps" },
  { name: "Philippines", code: "ph" },
  { name: "Qatar", code: "qa" },
  { name: "Saudi Arabia", code: "sa" },
  { name: "Singapore", code: "sg" },
  { name: "South Korea", code: "kr" },
  { name: "Sri Lanka", code: "lk" },
  { name: "Syria", code: "sy" },
  { name: "Tajikistan", code: "tj" },
  { name: "Thailand", code: "th" },
  { name: "Timor-Leste", code: "tl" },
  { name: "Turkey", code: "tr" },
  { name: "Turkmenistan", code: "tm" },
  { name: "United Arab Emirates", code: "ae" },
  { name: "Uzbekistan", code: "uz" },
  { name: "Vietnam", code: "vn" },
  { name: "Yemen", code: "ye" }
];

// European national chess clubs
const europeanCountries = [
  { name: "Albania", code: "al" },
  { name: "Andorra", code: "ad" },
  { name: "Austria", code: "at" },
  { name: "Belarus", code: "by" },
  { name: "Belgium", code: "be" },
  { name: "Bosnia and Herzegovina", code: "ba" },
  { name: "Bulgaria", code: "bg" },
  { name: "Croatia", code: "hr" },
  { name: "Czech Republic", code: "cz" },
  { name: "Denmark", code: "dk" },
  { name: "Estonia", code: "ee" },
  { name: "Finland", code: "fi" },
  { name: "France", code: "fr" },
  { name: "Germany", code: "de" },
  { name: "Greece", code: "gr" },
  { name: "Hungary", code: "hu" },
  { name: "Iceland", code: "is" },
  { name: "Ireland", code: "ie" },
  { name: "Italy", code: "it" },
  { name: "Latvia", code: "lv" },
  { name: "Liechtenstein", code: "li" },
  { name: "Lithuania", code: "lt" },
  { name: "Luxembourg", code: "lu" },
  { name: "Malta", code: "mt" },
  { name: "Moldova", code: "md" },
  { name: "Monaco", code: "mc" },
  { name: "Montenegro", code: "me" },
  { name: "Netherlands", code: "nl" },
  { name: "North Macedonia", code: "mk" },
  { name: "Norway", code: "no" },
  { name: "Poland", code: "pl" },
  { name: "Portugal", code: "pt" },
  { name: "Romania", code: "ro" },
  { name: "Russia", code: "ru" },
  { name: "San Marino", code: "sm" },
  { name: "Serbia", code: "rs" },
  { name: "Slovakia", code: "sk" },
  { name: "Slovenia", code: "si" },
  { name: "Spain", code: "es" },
  { name: "Sweden", code: "se" },
  { name: "Switzerland", code: "ch" },
  { name: "Ukraine", code: "ua" },
  { name: "United Kingdom", code: "gb" },
  { name: "Vatican City", code: "va" }
];

const africanCountries = [
  { name: "Algeria", code: "dz" },
  { name: "Angola", code: "ao" },
  { name: "Benin", code: "bj" },
  { name: "Botswana", code: "bw" },
  { name: "Burkina Faso", code: "bf" },
  { name: "Burundi", code: "bi" },
  { name: "Cameroon", code: "cm" },
  { name: "Central African Republic", code: "cf" },
  { name: "Chad", code: "td" },
  { name: "Comoros", code: "km" },
  { name: "Congo", code: "cg" },
  { name: "Ivory Coast", code: "ci" },
  { name: "Egypt", code: "eg" },
  { name: "Equatorial Guinea", code: "gq" },
  { name: "Eritrea", code: "er" },
  { name: "Eswatini", code: "sz" },
  { name: "Ethiopia", code: "et" },
  { name: "Gabon", code: "ga" },
  { name: "Gambia", code: "gm" },
  { name: "Ghana", code: "gh" },
  { name: "Kenya", code: "ke" },
  { name: "Lesotho", code: "ls" },
  { name: "Liberia", code: "lr" },
  { name: "Libya", code: "ly" },
  { name: "Madagascar", code: "mg" },
  { name: "Malawi", code: "mw" },
  { name: "Mali", code: "ml" },
  { name: "Mauritania", code: "mr" },
  { name: "Mauritius", code: "mu" },
  { name: "Morocco", code: "ma" },
  { name: "Mozambique", code: "mz" },
  { name: "Namibia", code: "na" },
  { name: "Niger", code: "ne" },
  { name: "Nigeria", code: "ng" },
  { name: "Rwanda", code: "rw" },
  { name: "Sao Tome and Principe", code: "st" },
  { name: "Senegal", code: "sn" },
  { name: "Seychelles", code: "sc" },
  { name: "Sierra Leone", code: "sl" },
  { name: "Somalia", code: "so" },
  { name: "South Africa", code: "za" },
  { name: "South Sudan", code: "ss" },
  { name: "Sudan", code: "sd" },
  { name: "Tanzania", code: "tz" },
  { name: "Togo", code: "tg" },
  { name: "Tunisia", code: "tn" },
  { name: "Uganda", code: "ug" },
  { name: "Zambia", code: "zm" },
  { name: "Zimbabwe", code: "zw" }
];

const southAmericanCountries = [
  { name: "Argentina", code: "ar" },
  { name: "Bolivia", code: "bo" },
  { name: "Brazil", code: "br" },
  { name: "Chile", code: "cl" },
  { name: "Colombia", code: "co" },
  { name: "Ecuador", code: "ec" },
  { name: "Guyana", code: "gy" },
  { name: "Paraguay", code: "py" },
  { name: "Peru", code: "pe" },
  { name: "Suriname", code: "sr" },
  { name: "Uruguay", code: "uy" },
  { name: "Venezuela", code: "ve" }
];

const northAmericanCountries = [
  { name: "Antigua and Barbuda", code: "ag" },
  { name: "Bahamas", code: "bs" },
  { name: "Barbados", code: "bb" },
  { name: "Belize", code: "bz" },
  { name: "Canada", code: "ca" },
  { name: "Costa Rica", code: "cr" },
  { name: "Cuba", code: "cu" },
  { name: "Dominica", code: "dm" },
  { name: "Dominican Republic", code: "do" },
  { name: "El Salvador", code: "sv" },
  { name: "Grenada", code: "gd" },
  { name: "Guatemala", code: "gt" },
  { name: "Haiti", code: "ht" },
  { name: "Honduras", code: "hn" },
  { name: "Jamaica", code: "jm" },
  { name: "Mexico", code: "mx" },
  { name: "Nicaragua", code: "ni" },
  { name: "Panama", code: "pa" },
  { name: "Saint Kitts and Nevis", code: "kn" },
  { name: "Saint Lucia", code: "lc" },
  { name: "Saint Vincent and the Grenadines", code: "vc" },
  { name: "Trinidad and Tobago", code: "tt" },
  { name: "United States", code: "us" }
];

const oceanianCountries = [
  { name: "Australia", code: "au" },
  { name: "Fiji", code: "fj" },
  { name: "Kiribati", code: "ki" },
  { name: "Marshall Islands", code: "mh" },
  { name: "Micronesia", code: "fm" },
  { name: "Nauru", code: "nr" },
  { name: "New Zealand", code: "nz" },
  { name: "Palau", code: "pw" },
  { name: "Papua New Guinea", code: "pg" },
  { name: "Samoa", code: "ws" },
  { name: "Solomon Islands", code: "sb" },
  { name: "Tonga", code: "to" },
  { name: "Tuvalu", code: "tv" },
  { name: "Vanuatu", code: "vu" }
];

// Combined list of all national clubs
const allCountries = [...asianCountries, ...europeanCountries, ...africanCountries, ...southAmericanCountries, ...northAmericanCountries, ...oceanianCountries];

// Continent-based lookup
const continentCountries = {
  All: allCountries,
  Asia: asianCountries,
  Europe: europeanCountries,
  Africa: africanCountries,
  "South America": southAmericanCountries,
  "North America": northAmericanCountries,
  Oceania: oceanianCountries
};

// Davlat klubi a'zoligi serverda saqlanadi; o'yinchi faqat bitta klubda bo'ladi (window.currentUser.club)
window.countryClubCounts = {};

function getUserClubs() {
  const club = window.currentUser && window.currentUser.club;
  return club && club.name ? [club.name] : [];
}

function setMyClub(club) {
  if (!window.currentUser) return;
  window.currentUser.club = club || null;
  localStorage.setItem('justChessCurrentUser', JSON.stringify(window.currentUser));
}

function clubAuthHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.authToken}` };
}

function postClubAction(action, body) {
  return fetch('/api/country-clubs/' + action, { method: 'POST', headers: clubAuthHeaders(), body: JSON.stringify(body || {}) })
    .then(res => res.json());
}

// Klub a'zolari (reyting bo'yicha) va umumiy statistika: a'zolar, o'yinlar, klub ballari
async function fetchClubData(countryName) {
  try {
    const data = await fetch('/api/country-clubs/' + encodeURIComponent(countryName) + '/members').then(res => res.json());
    if (data.success) return data;
  } catch (err) {
    console.error("Klub ma'lumotlarini yuklash xatoligi:", err);
  }
  return { members: [], stats: { members: 0, events: 0, points: 0 } };
}

// Oldin brauzerda saqlangan a'zolikni bir marta serverga ko'chirish
async function migrateLocalClubMembership() {
  if (!window.currentUser || !window.authToken) return;
  let all = {};
  try { all = JSON.parse(localStorage.getItem('justChessUserClubs') || '{}'); } catch (e) {}
  const mine = all[window.currentUser.username];
  if (!Array.isArray(mine) || mine.length === 0) return;
  delete all[window.currentUser.username];
  localStorage.setItem('justChessUserClubs', JSON.stringify(all));
  if (window.currentUser.club) return;
  const country = allCountries.find(c => c.name === mine[0]);
  if (!country) return;
  try {
    const data = await postClubAction('join', { country: country.name, code: country.code });
    if (data.success) setMyClub(data.club);
  } catch (err) {
    console.error("Klub a'zoligini ko'chirish xatoligi:", err);
  }
}

// Klublar ro'yxati uchun: o'z klubim va har bir klubdagi a'zolar soni
async function syncClubDirectory() {
  if (window.currentUser && typeof window.refreshCurrentUserRatings === 'function') {
    await window.refreshCurrentUserRatings();
  }
  await migrateLocalClubMembership();
  try {
    const data = await fetch('/api/country-clubs').then(res => res.json());
    if (data.success) {
      window.countryClubCounts = {};
      data.clubs.forEach(c => { window.countryClubCounts[c.name] = c.members; });
    }
  } catch (err) {
    console.error('Klublar ro\'yxati xatoligi:', err);
  }
}

// Batafsil klub sahifasi - to'liq sahifa ko'rinishida
window.openClubDetail = async function(countryName, countryCode) {
  window.currentClubName = countryName;
  window.currentClubCode = countryCode;
  const clubData = await fetchClubData(countryName);
  const userClubs = getUserClubs();
  const stats = clubData.stats;
  const topPlayers = clubData.members.slice(0, 3);
  const memberCount = stats.members;
  const eventsPlayed = stats.events;
  const clubPoints = stats.points;
  const isJoined = userClubs.includes(countryName);
  const localizedCountry = window.countryName(countryName, countryCode);
  const aboutText = tr('clubDetailAboutText',
    "Welcome to the official {country} Chess Club! We are a community of passionate chess players dedicated to improving our skills, organizing tournaments, and promoting chess in {country}. Join us to compete, learn, and connect!"
  ).replace(/\{country\}/g, localizedCountry);

  // Top Players HTML generatsiya qilish
  const medals = ['🥇', '🥈', '🥉'];
  const bgColors = ['rgba(241, 196, 15, 0.05)', 'rgba(189, 195, 199, 0.05)', 'rgba(230, 126, 34, 0.05)'];
  
  let topPlayersHTML = '';
  if (topPlayers.length === 0) {
    topPlayersHTML = `<div style="color: #888; font-size: 13px; text-align: center; padding: 15px;">${tr('clubDetailNoMembers', "Hali a'zolar yo'q. Birinchi bo'lib qo'shiling!")}</div>`;
  } else {
    topPlayers.forEach((player, index) => {
      topPlayersHTML += `
        <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: ${bgColors[index]}; border-radius: 8px;">
          <span style="font-size: 20px;">${medals[index]}</span>
          <div>
            <div class="player-link" data-username="${escapeHtml(player.username)}" style="font-size: 14px; color: #fff; font-weight: bold;">${escapeHtml(player.username)}</div>
            <div style="font-size: 11px; color: #88a;">${tx('profLabelRating', 'Reyting:')} ${player.rating} • 🏆 ${player.wins}</div>
          </div>
        </div>
      `;
    });
  }
  // Klub sahifasini to'ldirish
  const clubDetailView = document.getElementById('clubDetailView');

  // Davlat bayrog'i butun klub sahifasining foni; ustida matn o'qilishi uchun quyuq qatlam
  clubDetailView.style.backgroundImage =
    `linear-gradient(180deg, rgba(12, 22, 20, 0.55) 0%, rgba(12, 22, 20, 0.82) 280px, rgba(12, 22, 20, 0.9) 100%), url('https://flagcdn.com/w1280/${encodeURIComponent(countryCode)}.png')`;
  clubDetailView.style.backgroundSize = 'cover';
  clubDetailView.style.backgroundPosition = 'center top';
  clubDetailView.style.backgroundColor = '#0c1614';
  
  clubDetailView.innerHTML = `
    <!-- Banner -->
    <div style="
      position: relative;
      min-height: 180px;
      overflow: hidden;
      width: 100%;
    ">
      
      <!-- Back button -->
      <button onclick="switchView('clubs')" style="
        position: absolute;
        top: 15px;
        left: 15px;
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.2);
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        padding: 8px 16px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 10;
      ">← ${tr('clubDetailBack', "Orqaga")}</button>
      
      <!-- Club info on banner -->
      <div style="
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        z-index: 5;
        text-align: center;
      ">
        <img src="https://flagcdn.com/w80/${escapeHtml(countryCode)}.png" alt="${escapeHtml(localizedCountry)}" style="
          width: 70px;
          height: 70px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.2);
        ">
        <div>
          <h2 style="color: #fff; font-size: 24px; margin: 0; text-shadow: 0 2px 6px rgba(0,0,0,0.5);">${escapeHtml(tx('clubDetailTitle', '{{country}} shaxmat klubi', { country: localizedCountry }))}</h2>
          <span style="color: var(--accent); font-size: 13px; margin-top: 3px; display: block;">${memberCount} ${tr('clubDetailMembersCount', "a'zo")} • ${eventsPlayed} ${tr('clubDetailEventsCount', "musobaqa")}</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div style="width: 100%; box-sizing: border-box; padding: 25px 40px;">
      <!-- Statistics Block -->
      <div style="
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin-bottom: 25px;
        max-width: 900px;
        margin-left: auto;
        margin-right: auto;
      ">
        <div style="
          background: rgba(var(--accent-rgb), 0.08);
          border: 1px solid rgba(var(--accent-rgb), 0.3);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        ">
          <div style="font-size: 32px; font-weight: bold; color: var(--accent);">${memberCount}</div>
          <div style="font-size: 12px; color: #88a; margin-top: 5px;">${tr('clubDetailMembersCard', "A'zolar")}</div>
        </div>
        <div style="
          background: rgba(52, 152, 219, 0.08);
          border: 1px solid rgba(52, 152, 219, 0.3);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        ">
          <div style="font-size: 32px; font-weight: bold; color: #3498db;">${eventsPlayed}</div>
          <div style="font-size: 12px; color: #88a; margin-top: 5px;">${tr('clubDetailEventsCard', "O'tkazilgan musobaqalar")}</div>
        </div>
        <div style="
          background: rgba(241, 196, 15, 0.08);
          border: 1px solid rgba(241, 196, 15, 0.3);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        ">
          <div style="font-size: 32px; font-weight: bold; color: #f1c40f;">${clubPoints}</div>
          <div style="font-size: 12px; color: #88a; margin-top: 5px;">${tr('clubDetailPointsCard', "Klub ballari")}</div>
        </div>
      </div>

      <!-- Description -->
      <div style="background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid var(--cd-border-strong); margin-bottom: 25px; max-width: 900px; margin-left: auto; margin-right: auto;">
        <h4 style="color: var(--accent); font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">${tr('clubDetailAboutTitle', "Klub haqida")}</h4>
        <p style="color: #bbb; font-size: 13px; line-height: 1.6; margin: 0;">
          ${aboutText}
        </p>
      </div>

       <!-- Action Buttons - Bitta qatorda -->
       <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 25px; max-width: 760px; margin-left: auto; margin-right: auto;">
         <button id="clubDetailJoinBtn" data-name="${escapeHtml(countryName)}" data-code="${escapeHtml(countryCode)}" onclick="joinLeaveFromClubPage(this.dataset.name, this.dataset.code)" style="
           padding: 12px;
           background: ${isJoined ? '#3b1e1e' : 'var(--accent)'};
           color: ${isJoined ? '#ff9999' : '#111'};
           border: 1px solid ${isJoined ? '#522b2b' : 'var(--accent)'};
           border-radius: 8px;
           font-weight: bold;
           font-size: 13px;
           cursor: pointer;
           transition: all 0.2s;
          ">${isJoined ? tr('clubDetailLeaveBtn', 'Leave Club') : tr('clubDetailJoinBtn', "Klubga qo'shilish")}</button>
          <button data-name="${escapeHtml(countryName)}" onclick="showClubTournaments(this.dataset.name)" style="
           padding: 12px;
           background: var(--cd-border-strong);
           color: #fff;
           border: 1px solid var(--cd-border-strong);
           border-radius: 8px;
           font-weight: bold;
           font-size: 13px;
           cursor: pointer;
           transition: all 0.2s;
         ">🏆 ${tr('clubDetailTournamentsBtn', "Turnirlar")}</button>
          <button data-name="${escapeHtml(countryName)}" onclick="showClubHistory(this.dataset.name)" style="
            padding: 12px;
            background: var(--cd-border-strong);
            color: #fff;
            border: 1px solid var(--cd-border-strong);
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          ">📜 ${tr('clubDetailHistoryBtn', "Tarix")}</button>
          <button data-name="${escapeHtml(countryName)}" data-code="${escapeHtml(countryCode)}" onclick="showClubChat(this.dataset.name, this.dataset.code)" style="
            padding: 12px;
            background: var(--accent);
            color: #fff;
            border: 1px solid var(--accent);
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          ">💬 ${tr('clubDetailChatBtn', "Chat")}</button>
          <button onclick="switchView('clubs')" style="
           padding: 12px;
           background: var(--cd-surface-2);
           color: #ccc;
           border: 1px solid var(--cd-border-strong);
           border-radius: 8px;
           font-weight: bold;
           font-size: 13px;
           cursor: pointer;
           transition: all 0.2s;
         ">📋 ${tr('clubDetailAllClubsBtn', "Barcha klublar")}</button>
       </div>

        <!-- Top Players -->
        <div style="background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid var(--cd-border-strong); max-width: 900px; margin: 0 auto;">
          <h4 style="color: var(--accent); font-size: 13px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">${tr('clubDetailTopPlayersTitle', "Eng kuchli o'yinchilar")}</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${topPlayersHTML}
          </div>
        </div>

        <!-- Klub rahbariyati va yangiliklari (clubstaff.js) -->
        <div id="clubStaffNews" class="cs-root"></div>
      </div>
    `;

  // Sahifani ko'rsatish
  switchViewToClubDetail();
  if (typeof window.renderClubStaffNews === 'function') window.renderClubStaffNews(countryName);
};

// Club detail view'ga o'tish
window.switchViewToClubDetail = function() {
  document.querySelectorAll(".view-section").forEach((el) => el.classList.remove("active-view"));
  document.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));
  document.getElementById("clubDetailView").classList.add("active-view");
  document.getElementById("navClubs").classList.add("active");
};

// Klub sahifasidan qo'shilish/chiqish. O'yinchi faqat bitta klubda: boshqa klubdagi o'yinchi tasdiqlasa, o'tkaziladi
window.joinLeaveFromClubPage = async function(countryName, countryCode) {
  if (!window.currentUser) {
    alert(tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!'));
    switchView('login');
    return;
  }
  const localized = window.countryName(countryName, countryCode);
  const isJoined = getUserClubs().includes(countryName);
  let joined = false;
  try {
    if (isJoined) {
      if (!confirm(tx('clubLeaveConfirm', '{{country}} klubidan chiqmoqchimisiz?', { country: localized }))) return;
      const data = await postClubAction('leave');
      if (!data.success) { alert(tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!')); return; }
      setMyClub(null);
    } else {
      let data = await postClubAction('join', { country: countryName, code: countryCode });
      if (!data.success && data.reason === 'already_in_club' && data.club) {
        const current = window.countryName(data.club.name, data.club.code);
        const question = tx('clubSwitchConfirm', "Siz {{current}} klubiga a'zosiz. O'yinchi faqat bitta klubda bo'lishi mumkin. {{current}} klubidan chiqib, {{country}} klubiga o'tasizmi?", { current, country: localized });
        if (!confirm(question)) return;
        data = await postClubAction('join', { country: countryName, code: countryCode, switch: true });
      }
      if (!data.success) { alert(tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!')); return; }
      setMyClub(data.club);
      joined = true;
    }
  } catch (err) {
    console.error("Klub a'zoligi xatoligi:", err);
    alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
    return;
  }
  await window.openClubDetail(countryName, countryCode);
  if (joined) window.showJoinSuccessModal({ name: countryName, code: countryCode });
};

// Muvaffaqiyatli qo'shilganlik haqida modal
window.showJoinSuccessModal = function(country) {
  const existingModal = document.getElementById('joinSuccessModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'joinSuccessModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    animation: fadeIn 0.3s ease;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(145deg, #1a2a28, var(--cd-surface));
      border: 2px solid var(--accent);
      border-radius: 16px;
      padding: 30px;
      text-align: center;
      max-width: 350px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(var(--accent-rgb), 0.3);
      animation: scaleIn 0.3s ease;
    ">
      <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
      <h3 style="color: var(--accent); font-size: 20px; margin-bottom: 10px;">${escapeHtml(tx('clubJoinWelcome', 'Xush kelibsiz!'))}</h3>
      <p style="color: #fff; font-size: 14px; margin-bottom: 5px;">${escapeHtml(tx('clubJoinSuccess', "Siz muvaffaqiyatli qo'shildingiz:"))}</p>
      <p style="color: var(--accent); font-size: 16px; font-weight: bold; margin-bottom: 20px;">
        <img src="https://flagcdn.com/w40/${country.code}.png" style="vertical-align: middle; margin-right: 8px; border-radius: 3px; width: 30px; height: 20px;">
        ${escapeHtml(tx('clubDetailTitle', '{{country}} shaxmat klubi', { country: (typeof countryName === 'function' ? countryName(country.name, country.code) : country.name) }))}
      </p>
      <button onclick="document.getElementById('joinSuccessModal').remove()" style="
        background: var(--accent);
        color: #111;
        border: none;
        padding: 10px 30px;
        border-radius: 8px;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
      ">OK</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
};

// Active continent filter (default: All)
window.currentContinent = 'All';

window.getActiveCountries = function() {
  return continentCountries[window.currentContinent] || allCountries;
};

window.setActiveContinent = function(continent) {
  window.currentContinent = continent;
  document.querySelectorAll('.continent-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.continent === continent);
  });
  filterCountries();
};

function filteredClubCountries() {
  const input = document.getElementById('clubSearchInput');
  const query = input ? input.value.toLowerCase().trim() : '';
  const baseCountries = getActiveCountries();
  return query
    ? baseCountries.filter(c => countryName(c.name, c.code).toLowerCase().includes(query) || c.name.toLowerCase().includes(query))
    : baseCountries;
}

function renderClubStamps() {
  const container = document.getElementById('clubsListContainer');
  if (!container) return;
  const countries = filteredClubCountries();
  if (countries.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 30px;">' + tr('searchNoResults', "Hech qanday davlat topilmadi") + '</div>';
    return;
  }
  const userClubs = getUserClubs();
  let htmlContent = '';
  countries.forEach(country => {
    const members = window.countryClubCounts[country.name] || 0;
    const isJoined = userClubs.includes(country.name);
    const safeName = escapeHtml(country.name);
    const safeCode = escapeHtml(country.code);
    const displayName = escapeHtml(countryName(country.name, country.code));

    htmlContent += `
      <div class="country-stamp ${isJoined ? 'joined' : ''}" data-name="${safeName}" data-code="${safeCode}" onclick="openClubDetail(this.dataset.name, this.dataset.code)">
        <div class="stamp-perforation"></div>
        ${isJoined ? '<div class="stamp-badge">✓</div>' : ''}
        <div class="stamp-inner">
          <div class="stamp-flag"><img src="https://flagcdn.com/w80/${safeCode}.png" alt="${displayName}" style="width: 64px; height: 42px; border-radius: 3px; display: block;" loading="lazy"></div>
          <div class="stamp-country-name">${displayName}</div>
          <div class="stamp-members">${members} ${tr('membersLabel', "a'zo")}</div>
        </div>
        <button class="stamp-join-btn" onclick="event.stopPropagation(); const s = this.closest('.country-stamp'); openClubDetail(s.dataset.name, s.dataset.code)">
          ${tr('btnView', "Ko'rish")}
        </button>
      </div>
    `;
  });
  container.innerHTML = htmlContent;
}

window.loadClubs = async function() {
  renderClubStamps();
  await syncClubDirectory();
  renderClubStamps();
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = (text === null || text === undefined) ? '' : String(text);
  // Atribut ichida ham xavfsiz bo'lishi uchun qo'shtirnoqlar ham ekranlanadi
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const FLAG_CODES = ['us','gb','de','fr','es','it','ru','cn','in','jp','kr','br','ca','au','nl','se','no','fi','dk','ch','at','pl','cz','hu','ro','bg','hr','rs','sk','si','ua','tr','gr','pt','ie','is','lu','lt','lv','ee','mt','cy','al','mk','me','ba','md','ge','am','az','by','kz','kg','tj','tm','uz','ae','sa','il','jo','lb','sy','iq','ir','pk','bd','lk','mm','th','vn','ph','my','id','sg','kh','la','mn','np','af','ir','pk','ma','dz','tn','ly','eg','sd','ss','et','so','ke','tz','ug','rw','bi','cd','cg','cm','ng','gh','ci','sn','ml','bf','ne','td','mr','gm','gn','sl','lr','gw','sn','cv','mz','zw','za','na','bw','sz','ls','mg','mu','sc','km','re','yt','pm','mf','gp','mq','gt','bz','sv','hn','ni','cr','pa','do','ht','jm','tt','tc','vg','ky','bb','gd','lc','vc','ag','dm','bs','cu','pr','mx','gu','ht','jm','tt','bs','cu','pr','mx','gt','bz','sv','hn','ni','cr','pa','do','ht','jm','tt','tc','vg','ky','bb','gd','lc','vc','ag','dm'];

window.filterCountries = debounce(function() {
  renderClubStamps();
}, 300);

window.backToClubDetail = function() {
  if (window.currentClubName) {
    openClubDetail(window.currentClubName, window.currentClubCode);
  } else {
    switchView('clubs');
  }
};

// Klub reyting jadvali - faqat klub a'zolari (serverdan)
window.showClubLeaderboard = async function(countryName) {
  window.currentClubName = countryName;
  const container = document.getElementById("clubLeaderboardContainer");
  if (!container) return;

  const titleEl = document.getElementById("clubLeaderboardTitle");
  if (titleEl) titleEl.textContent = tx('clubLeaderboardTitle', '{{country}} klubi reytingi', { country: window.countryName(countryName, window.currentClubCode) });

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">' + tx('loadingText', 'Yuklanmoqda...') + '</div>';
  switchViewToClubLeaderboard();

  const { members } = await fetchClubData(countryName);
  if (members.length === 0) {
    container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + escapeHtml(tr('clubDetailNoMembers', "Hali a'zolar yo'q. Birinchi bo'lib qo'shiling!")) + '</div>';
    return;
  }

  let htmlContent = "";
  members.forEach((member, index) => {
    const firstLetter = member.username ? escapeHtml(member.username.charAt(0).toUpperCase()) : "U";
    let badgeColor = "#555";
    if (index === 0) badgeColor = "#f1c40f";
    else if (index === 1) badgeColor = "#bdc3c7";
    else if (index === 2) badgeColor = "#e67e22";

    htmlContent += `
      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 14px; font-weight: bold; width: 22px; text-align: center; color: ${badgeColor};">#${index + 1}</span>
          <div style="width: 35px; height: 35px; font-size: 15px; display: flex; align-items: center; justify-content: center; background: var(--accent); border-radius: 50%; color: white; font-weight: bold;">${firstLetter}</div>
          <b class="player-link" data-username="${escapeHtml(member.username)}" style="font-size: 14px; color: #fff;">${escapeHtml(member.username)}</b>
        </div>
        <div style="display: flex; gap: 15px; font-size: 12px; text-align: right;">
          <span style="color: var(--accent); font-weight: bold;">${Number(member.rating) || 1500}</span>
          <span style="color: #2ecc71;">🏆 ${member.wins}</span>
          <span style="color: #e74c3c;">❌ ${member.losses}</span>
          <span style="color: #e6b800;">🤝 ${member.draws}</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = htmlContent;
};

window.switchViewToClubLeaderboard = function() {
  document.querySelectorAll(".view-section").forEach((el) => el.classList.remove("active-view"));
  document.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));
  document.getElementById("clubLeaderboardView").classList.add("active-view");
  document.getElementById("navClubs").classList.add("active");
};

window.showClubTournaments = function(countryName) {
  window.currentClubName = countryName;
  const container = document.getElementById("clubTournamentsListContainer");
  if (!container) return;

  applyClubTournamentsHeader(countryName);

  container.innerHTML = `<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">${tr('loadingText', "Yuklanmoqda...")}</div>`;
  window.loadClubLeagueCalendar(countryName, container);
  switchViewToClubTournaments();
};

function applyClubTournamentsHeader(countryName) {
  const localizedCountry = window.countryName ? window.countryName(countryName, null) : countryName;

  const titleEl = document.getElementById("clubTournamentsTitle");
  if (titleEl) titleEl.textContent = tr('clubLeagueTitle', "{country} liga kalendari").replace('{country}', localizedCountry);

  const descEl = document.getElementById("clubTournamentsDesc");
  if (descEl) descEl.textContent = tr('clubLeagueDesc', "Ushbu klub ishtirok etadigan liga o'yinlari");

  const backBtn = document.getElementById("clubTournamentsBackBtn");
  if (backBtn) backBtn.textContent = `\u2190 ${tr('clubDetailBack', "Orqaga")}`;
}

window.refreshClubTournaments = function() {
  const container = document.getElementById("clubTournamentsListContainer");
  if (!container || !container.children.length || !window.currentClubName) return;
  applyClubTournamentsHeader(window.currentClubName);
  window.loadClubLeagueCalendar(window.currentClubName, container);
};

window.switchViewToClubTournaments = function() {
  document.querySelectorAll(".view-section").forEach((el) => el.classList.remove("active-view"));
  document.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));
  document.getElementById("clubTournamentsView").classList.add("active-view");
  document.getElementById("navClubs").classList.add("active");
};

function getClubLeagueKey(countryName) {
  return Object.keys(continentCountries || {}).find(key =>
    key !== 'All' && (continentCountries[key] || []).some(country => country.name === countryName)
  ) || null;
}

window.loadClubLeagueCalendar = function(countryName, container) {
  if (!container) container = document.getElementById("clubTournamentsListContainer");
  if (!container) return;

  const leagueKey = getClubLeagueKey(countryName);
  const leagueInfo = leagueKey ? window.CONTINENTS[leagueKey] : null;
  const teams = leagueKey ? (continentCountries[leagueKey] || []) : [];
  const schedule = typeof window.generateRoundRobinSchedule === 'function'
    ? window.generateRoundRobinSchedule(teams)
    : [];
  const clubSchedule = schedule.filter(match => match.home === countryName || match.away === countryName);

  if (clubSchedule.length === 0) {
    container.innerHTML = "";
    return;
  }

  const rows = clubSchedule.map(match => {
    const isHome = match.home === countryName;
    const opponent = isHome ? match.away : match.home;
    const venue = isHome ? tr('clubLeagueHome', "O'z maydonida") : tr('clubLeagueAway', "Mehmonda");
    const clubLabel = escapeHtml(window.countryName ? window.countryName(countryName, null) : countryName);
    const opponentLabel = escapeHtml(window.countryName ? window.countryName(opponent, null) : opponent);
    return `
      <tr class="${isHome ? 'club-league-home' : ''}">
        <td><span class="club-league-round">${escapeHtml(tr('roundLabel', "{round}-bosqich").replace('{round}', match.round))}</span></td>
        <td><strong>${clubLabel}</strong></td>
        <td><span class="club-league-versus">vs</span></td>
        <td><strong>${opponentLabel}</strong></td>
        <td><span class="club-league-venue">${venue}</span></td>
        <td>${escapeHtml(match.date)}</td>
        <td>${escapeHtml(match.time)}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="club-league-calendar-header">
      <div class="club-league-calendar-title">
        <span class="club-league-icon">${escapeHtml(leagueInfo.flag)}</span>
        <div>
          <strong>${escapeHtml(window.getLeagueI18nName ? window.getLeagueI18nName(leagueKey, leagueInfo.name) : leagueInfo.name)}</strong>
          <span>${tr('clubLeagueRoundRobin', 'Round-Robin • {count} jamoa').replace('{count}', teams.length)}</span>
        </div>
      </div>
      <span class="club-league-badge">${tr('clubLeagueBadge', "Liga taqvimi")}</span>
    </div>
    <div class="club-league-calendar-table-wrap">
      <table class="club-league-calendar-table">
        <thead>
          <tr>
            <th>${tr('clubLeagueRound', "Bosqich")}</th>
            <th>${tr('clubLeagueClub', "Klub")}</th>
            <th></th>
            <th>${tr('clubLeagueOpponent', "Raqib")}</th>
            <th>${tr('clubLeagueVenue', "Maydon")}</th>
            <th>${tr('clubLeagueDate', "Sana")}</th>
            <th>${tr('clubLeagueTime', "Vaqt")}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

// Klub chat - Chess.com uslubi
window.showClubChat = function(countryName, countryCode) {
  if (!window.currentUser) {
    alert(tx('errChatLoginRequired', 'Chat uchun avval tizimga kirishingiz kerak!'));
    switchView('login');
    return;
  }

  window.currentClubName = countryName;
  window.currentClubCode = countryCode;

  const titleEl = document.getElementById("clubChatTitle");
  if (titleEl) {
    const safeCountryName = escapeHtml(countryName);
    const safeCountryCode = escapeHtml(countryCode);
    titleEl.innerHTML = `<img src="https://flagcdn.com/w20/${safeCountryCode}.png" style="width: 20px; height: 14px; margin-right: 8px; border-radius: 2px;"> ${escapeHtml(tx('clubChatTitle', '{{country}} klub chati', { country: (typeof window.countryName === 'function' ? window.countryName(countryName, countryCode) : countryName) }))}`;
  }

  const container = document.getElementById("clubChatMessagesContainer");
  if (!container) return;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">' + tx('loadingText', 'Yuklanmoqda...') + '</div>';

  loadClubChatMessages();
  updateClubChatComposer(countryName, countryCode);
  if (window.ChatStickers) {
    window.ChatStickers.attachPicker({
      button: document.getElementById('clubChatEmojiBtn'),
      input: document.getElementById('clubChatMessageInput'),
      mount: document.getElementById('clubChatComposer'),
      onSticker: (sid) => window.sendClubChatMessage('[sticker:' + sid + ']')
    });
  }

  // Socket.IO orqali klub xonasiga qo'shilish
  if (typeof socket !== 'undefined' && socket.connected) {
    socket.emit('join-club-room', 'club_' + countryName);
  }

  switchViewToClubChat();
};

window.switchViewToClubChat = function() {
  document.querySelectorAll(".view-section").forEach((el) => el.classList.remove("active-view"));
  document.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));
  document.getElementById("clubChatView").classList.add("active-view");
  document.getElementById("navClubs").classList.add("active");
};

// A'zo bo'lmaganlarga yozish maydoni o'rniga "klubga qo'shiling" eslatmasi
function updateClubChatComposer(countryName, countryCode) {
  const input = document.getElementById('clubChatMessageInput');
  if (!input) return;
  const row = input.parentElement;
  const isMember = getUserClubs().includes(countryName);
  row.style.display = isMember ? 'flex' : 'none';
  let note = document.getElementById('clubChatLockedNote');
  if (isMember) { if (note) note.remove(); return; }
  if (!note) {
    note = document.createElement('div');
    note.id = 'clubChatLockedNote';
    note.className = 'club-chat-locked';
    row.parentElement.appendChild(note);
  }
  note.innerHTML = `<span>🔒 ${escapeHtml(tx('clubChatMembersOnly', "Klub chatiga faqat a'zolar yoza oladi."))}</span>`;
  const btn = document.createElement('button');
  btn.className = 'club-chat-join-btn';
  btn.textContent = tx('clubDetailJoinBtn', "Klubga qo'shilish");
  btn.onclick = async () => {
    await window.joinLeaveFromClubPage(countryName, countryCode);
    if (getUserClubs().includes(countryName)) window.showClubChat(countryName, countryCode);
  };
  note.appendChild(btn);
}

window.loadClubChatMessages = function() {
  if (!window.currentClubName) return;
  const container = document.getElementById("clubChatMessagesContainer");
  if (!container) return;

  const roomId = 'club_' + window.currentClubName;
  const url = `/api/chat/messages?roomId=${encodeURIComponent(roomId)}`;
  // Kapitan/moderator xabarlarni o'chira oladi — huquq bir marta so'raladi, keyin qayta chiziladi
  if (typeof window.loadClubStaff === 'function' && window.clubModClub !== window.currentClubName) {
    window.clubModClub = window.currentClubName;
    window.clubCanModerate = false;
    window.loadClubStaff(window.currentClubName).then(() => { if (window.clubCanModerate) window.loadClubChatMessages(); });
  }

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">' + tx('loadingText', 'Yuklanmoqda...') + '</div>';

  fetch(url, {
    headers: window.authToken ? { 'Authorization': `Bearer ${window.authToken}` } : {}
  })
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      if (!data.success || !data.messages || data.messages.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + tx('clubChatEmpty', "Hali xabarlar yo'q. Birinchi xabarni yuboring!") + '</div>';
        return;
      }

      let htmlContent = '';
      const currentUserId = window.currentUser ? window.currentUser.id : 'guest';
      data.messages.forEach(msg => {
        const isOwn = String(msg.sender_id) === String(currentUserId);
        const time = new Date(msg.created_at || msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const authorName = msg.username || msg.sender_username || (isOwn ? (window.currentUser ? window.currentUser.username : tx('youLabel', 'Siz')) : tx('userFallback', 'Foydalanuvchi'));
        
        const sticker = window.ChatStickers ? window.ChatStickers.id(msg.message) : null;
        htmlContent += `
          <div class="club-chat-message ${isOwn ? 'own' : 'other'}${sticker ? ' sticker' : ''}">
            <span class="club-chat-message-author player-link" data-username="${escapeHtml(authorName)}">${escapeHtml(authorName)}</span>
            <div>${sticker ? window.ChatStickers.html(sticker) : escapeHtml(msg.message)}</div>
            <div class="club-chat-message-time">${time}${window.clubCanModerate && msg.id ? ` <button type="button" class="club-chat-del" title="${escapeHtml(tx('csDelete', "O'chirish"))}" onclick="window.deleteClubChatMessage('${escapeHtml(msg.id)}')">🗑</button>` : ''}</div>
          </div>
        `;
      });

      container.innerHTML = htmlContent;
      container.scrollTop = container.scrollHeight;
    })
    .catch(err => {
      console.error('Klub chat xabarlari xatoligi:', err);
      container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + tx('errLoadFailed', 'Yuklashda xatolik yuz berdi') + '</div>';
    });
};

// Klub chatini faqat o'zi uchun tozalash
window.clearClubChat = async function() {
  if (!window.currentUser || !window.currentClubName) return;
  if (!confirm(tx('chatClearConfirm', "Chatni tozalaysizmi? Xabarlar faqat sizning oynangizdan o'chadi, suhbatdoshingizda qoladi."))) return;
  try {
    const d = await fetch('/api/chat/clear', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.authToken}` }, body: JSON.stringify({ roomId: 'club_' + window.currentClubName }) }).then(r => r.json());
    if (!d.success) { showToast(tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!'), 'warning'); return; }
    loadClubChatMessages();
    showToast(tx('chatCleared', 'Chat tozalandi'), 'success');
  } catch (e) {
    showToast(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"), 'warning');
  }
};

window.sendClubChatMessage = function(stickerMessage) {
  if (!window.currentUser) {
    alert(tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!'));
    return;
  }

  if (!window.currentClubName) return;

  const input = document.getElementById('clubChatMessageInput');
  if (!input) return;
  const isSticker = typeof stickerMessage === 'string';
  const message = isSticker ? stickerMessage : input.value.trim();
  if (!message) return;

  const roomId = 'club_' + window.currentClubName;

  fetch('/api/chat/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.authToken}`
    },
    body: JSON.stringify({
      message,
      roomId: roomId,
      receiverId: null
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      if (!isSticker) input.value = '';
      loadClubChatMessages();
    } else {
      alert(tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
    }
  })
  .catch(err => {
    console.error('Club chat xabar yuborish xatoligi:', err);
  });
};

// ===== KLUB TARIXI =====

// Klubdagi a'zolar va ularning klubga qo'shilgan sanalari
window.showClubHistory = function(countryName) {
  window.currentClubName = countryName;
  const localizedCountry = window.countryName ? window.countryName(countryName, null) : countryName;

  const titleEl = document.getElementById("clubHistoryTitle");
  if (titleEl) titleEl.textContent = tr('clubHistoryTitle', "{country} - A'zolar tarixi").replace('{country}', localizedCountry);

  const descEl = document.getElementById("clubHistoryDesc");
  if (descEl) descEl.textContent = tr('clubHistoryDesc', "Klub a'zolari va ularning qo'shilgan sanalari");

  const backBtn = document.getElementById("clubHistoryBackBtn");
  if (backBtn) backBtn.textContent = `\u2190 ${tr('clubDetailBack', "Orqaga")}`;

  const container = document.getElementById("clubHistoryContainer");
  if (!container) return;

  container.innerHTML = `<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">${tr('loadingText', "Yuklanmoqda...")}</div>`;

  loadClubHistory(countryName, container);
  switchViewToClubHistory();
};

window.switchViewToClubHistory = function() {
  document.querySelectorAll(".view-section").forEach((el) => el.classList.remove("active-view"));
  document.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));
  document.getElementById("clubHistoryView").classList.add("active-view");
  document.getElementById("navClubs").classList.add("active");
};

window.loadClubHistory = async function(countryName, container) {
  if (!container) container = document.getElementById("clubHistoryContainer");
  if (!container) return;

  const clubData = await fetchClubData(countryName);
  const stats = clubData.stats;
  // Qo'shilgan sanasi bo'yicha (yangidan eskiyga)
  const storedMembers = clubData.members.slice().sort((a, b) => {
    if (!a.joinedAt) return 1;
    if (!b.joinedAt) return -1;
    return new Date(b.joinedAt) - new Date(a.joinedAt);
  });

  if (storedMembers.length === 0) {
    container.innerHTML = `<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">${tr('clubHistoryEmpty', "Hali klubga a'zolar yo'q")}</div>`;
    return;
  }

  let htmlContent = "";

  // Statistika kartochkalari
  htmlContent += `
    <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div style="background: rgba(var(--accent-rgb), 0.08); border: 1px solid rgba(var(--accent-rgb), 0.3); border-radius: 10px; padding: 15px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: var(--accent);">${storedMembers.length}</div>
          <div style="font-size: 11px; color: #88a;">${tr('clubDetailMembersCard', "A'zolar")}</div>
        </div>
        <div style="background: rgba(52, 152, 219, 0.08); border: 1px solid rgba(52, 152, 219, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #3498db;">${stats.events}</div>
          <div style="font-size: 11px; color: #88a;">${tr('clubDetailEventsCard', "O'tkazilgan musobaqalar")}</div>
        </div>
        <div style="background: rgba(241, 196, 15, 0.08); border: 1px solid rgba(241, 196, 15, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #f1c40f;">${stats.points}</div>
          <div style="font-size: 11px; color: #88a;">${tr('clubDetailPointsCard', "Klub ballari")}</div>
        </div>
      </div>
    </div>
  `;

  // A'zolar ro'yxati
  htmlContent += `
    <div style="font-size: 13px; color: #88a; margin-bottom: 12px; font-weight: bold;">
      ${tr('clubHistoryMembersList', "{count} ta a'zo (yangidan eskiyga)").replace('{count}', storedMembers.length)}
    </div>
  `;

  storedMembers.forEach((member, index) => {
    const firstLetter = member.username ? escapeHtml(member.username.charAt(0).toUpperCase()) : "?";
    const joinDate = member.joinedAt
      ? new Date(member.joinedAt).toLocaleDateString('uz-UZ')
      : tr('clubHistoryJoinUnknown', "Aniqlanmagan");
    const memberRating = Number(member.rating) || 1500;
    const memberStats = member;

    htmlContent += `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
        <div style="width: 36px; height: 36px; background: var(--accent); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">${firstLetter}</div>
        <div style="flex: 1;">
          <div style="font-size: 14px; color: #fff; font-weight: bold; display: flex; align-items: center; gap: 8px;">
            <span class="player-link" data-username="${escapeHtml(member.username)}">${escapeHtml(member.username)}</span>
            ${index === 0 ? '<span style="font-size: 11px; color: #f1c40f;">🥇</span>' : ''}
          </div>
          <div style="font-size: 11px; color: #88a;">
            ${tr('profLabelRating', "Reyting:")} ${memberRating} • 🏆 ${memberStats.wins || 0} • ❌ ${memberStats.losses || 0} • 🤝 ${memberStats.draws || 0}
          </div>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">
            ${tr('clubHistoryJoined', "Qo'shilgan:")} ${joinDate}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = htmlContent;
};
