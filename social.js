// National chess clubs - Asian and European countries
window.tournamentDetailBoard = null;

// i18next yordamchi funksiyasi - dinamik HTML shablonlarida foydalanish uchun
const tr = (key, fallback, opts) => (typeof i18next !== 'undefined' && i18next.isInitialized) ? i18next.t(key, { defaultValue: fallback, ...opts }) : fallback;

// O'zbekcha kirill -> lotin transliteratsiyasi
function cyrillicToLatinUz(text) {
  const map = {
    'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'Ye','Ё':'Yo','Ж':'J','З':'Z',
    'И':'I','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R',
    'С':'S','Т':'T','У':'U','Ф':'F','Х':'X','Ц':'S','Ч':'Ch','Ш':'Sh','Ъ':'\'',
    'Ы':'I','Ь':'','Э':'E','Ю':'Yu','Я':'Ya','Қ':'Q','ғ':'G\'','ў':'O\'','Ҳ':'H',
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'ye','ё':'yo','ж':'j','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'s','ч':'ch','ш':'sh','ъ':'\'',
    'ы':'i','ь':'','э':'e','ю':'yu','я':'ya','қ':'q','ғ':'g\'','ў':'o\'','ҳ':'h'
  };
  return text.split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('');
}

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
            <div style="font-size: 14px; color: #fff; font-weight: bold;">${escapeHtml(player.username)}</div>
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
          <span style="color: #81b64c; font-size: 13px; margin-top: 3px; display: block;">${memberCount} ${tr('clubDetailMembersCount', "a'zo")} • ${eventsPlayed} ${tr('clubDetailEventsCount', "musobaqa")}</span>
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
          background: rgba(129, 182, 76, 0.08);
          border: 1px solid rgba(129, 182, 76, 0.3);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        ">
          <div style="font-size: 32px; font-weight: bold; color: #81b64c;">${memberCount}</div>
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
      <div style="background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid #2a3e3b; margin-bottom: 25px; max-width: 900px; margin-left: auto; margin-right: auto;">
        <h4 style="color: #81b64c; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">${tr('clubDetailAboutTitle', "Klub haqida")}</h4>
        <p style="color: #bbb; font-size: 13px; line-height: 1.6; margin: 0;">
          ${aboutText}
        </p>
      </div>

       <!-- Action Buttons - Bitta qatorda -->
       <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 25px; max-width: 600px; margin-left: auto; margin-right: auto;">
         <button id="clubDetailJoinBtn" data-name="${escapeHtml(countryName)}" data-code="${escapeHtml(countryCode)}" onclick="joinLeaveFromClubPage(this.dataset.name, this.dataset.code)" style="
           padding: 12px;
           background: ${isJoined ? '#3b1e1e' : '#81b64c'};
           color: ${isJoined ? '#ff9999' : '#111'};
           border: 1px solid ${isJoined ? '#522b2b' : '#81b64c'};
           border-radius: 8px;
           font-weight: bold;
           font-size: 13px;
           cursor: pointer;
           transition: all 0.2s;
          ">${isJoined ? tr('clubDetailLeaveBtn', 'Leave Club') : tr('clubDetailJoinBtn', "Klubga qo'shilish")}</button>
          <button data-name="${escapeHtml(countryName)}" onclick="showClubTournaments(this.dataset.name)" style="
           padding: 12px;
           background: #2a3e3b;
           color: #fff;
           border: 1px solid #3d5a56;
           border-radius: 8px;
           font-weight: bold;
           font-size: 13px;
           cursor: pointer;
           transition: all 0.2s;
         ">🏆 ${tr('clubDetailTournamentsBtn', "Turnirlar")}</button>
          <button data-name="${escapeHtml(countryName)}" onclick="showClubHistory(this.dataset.name)" style="
            padding: 12px;
            background: #2a3e3b;
            color: #fff;
            border: 1px solid #3d5a56;
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          ">📜 ${tr('clubDetailHistoryBtn', "Tarix")}</button>
          <button onclick="switchView('clubs')" style="
           padding: 12px;
           background: #192825;
           color: #ccc;
           border: 1px solid #2a3e3b;
           border-radius: 8px;
           font-weight: bold;
           font-size: 13px;
           cursor: pointer;
           transition: all 0.2s;
         ">📋 ${tr('clubDetailAllClubsBtn', "Barcha klublar")}</button>
       </div>

        <!-- Top Players -->
        <div style="background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid #2a3e3b; max-width: 900px; margin: 0 auto;">
          <h4 style="color: #81b64c; font-size: 13px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">${tr('clubDetailTopPlayersTitle', "Eng kuchli o'yinchilar")}</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${topPlayersHTML}
          </div>
        </div>
      </div>
    `;

  // Sahifani ko'rsatish
  switchViewToClubDetail();
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

// Scroll to section (for Quick Links)
window.scrollToSection = function(sectionName) {
  // Simple alert for now - can be expanded for internal navigation
  // alert(`Scrolling to ${sectionName} section`);
};

// Invite friend to club
window.inviteFriendToClub = function(countryName) {
  const username = prompt(tx('inviteClubPrompt', '{{country}} shaxmat klubiga taklif qilish uchun foydalanuvchi nomini kiriting:', { country: countryName }));
  if (username && username.trim()) {
    alert(tx('inviteClubSent', '{{user}} {{country}} shaxmat klubiga taklif qilindi!', { user: username.trim(), country: countryName }));
  }
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
      background: linear-gradient(145deg, #1a2a28, #152220);
      border: 2px solid #81b64c;
      border-radius: 16px;
      padding: 30px;
      text-align: center;
      max-width: 350px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(129, 182, 76, 0.3);
      animation: scaleIn 0.3s ease;
    ">
      <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
      <h3 style="color: #81b64c; font-size: 20px; margin-bottom: 10px;">${escapeHtml(tx('clubJoinWelcome', 'Xush kelibsiz!'))}</h3>
      <p style="color: #fff; font-size: 14px; margin-bottom: 5px;">${escapeHtml(tx('clubJoinSuccess', "Siz muvaffaqiyatli qo'shildingiz:"))}</p>
      <p style="color: #81b64c; font-size: 16px; font-weight: bold; margin-bottom: 20px;">
        <img src="https://flagcdn.com/w40/${country.code}.png" style="vertical-align: middle; margin-right: 8px; border-radius: 3px; width: 30px; height: 20px;">
        ${escapeHtml(tx('clubDetailTitle', '{{country}} shaxmat klubi', { country: (typeof countryName === 'function' ? countryName(country.name, country.code) : country.name) }))}
      </p>
      <button onclick="document.getElementById('joinSuccessModal').remove()" style="
        background: #81b64c;
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

function getFlagUrl(name) {
  const safe = String(name || '').trim();
  if (!safe) return 'https://flagcdn.com/w40/us.png';
  let hash = 0;
  for (let i = 0; i < safe.length; i++) {
    hash = ((hash << 5) - hash) + safe.charCodeAt(i);
    hash |= 0;
  }
  const code = FLAG_CODES[Math.abs(hash) % FLAG_CODES.length];
  return `https://flagcdn.com/w40/${code}.png`;
}

function getPlayerFlag(username, club) {
  if (club) return getFlagUrl(club);
  return getFlagUrl(username);
}

window.filterCountries = debounce(function() {
  renderClubStamps();
}, 300);

window.closeTournamentDetail = function() {
  document.body.classList.remove('tournament-detail-open');
  if (window.tournamentDetailBoard && typeof window.tournamentDetailBoard.destroy === 'function') {
    window.tournamentDetailBoard.destroy();
    window.tournamentDetailBoard = null;
  }
};

window.openTournamentDetailShell = function(view) {
  document.body.classList.add('tournament-detail-open');
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active-view'));
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  view.classList.add('active-view');
  const navT = document.getElementById('navTournaments');
  if (navT) navT.classList.add('active');
};

window.initTournamentDetailBoard = function() {
  if (window.tournamentDetailBoard && typeof window.tournamentDetailBoard.destroy === 'function') {
    window.tournamentDetailBoard.destroy();
  }

  const boardElement = document.getElementById('tournamentDetailBoard');
  if (!boardElement || typeof Chessboard === 'undefined') return;

  window.tournamentDetailBoard = Chessboard('tournamentDetailBoard', {
    position: 'start',
    draggable: false,
    showNotation: false,
    pieceTheme: 'img/chesspieces/wikipedia/{piece}.png'
  });
};

function getArenaTimeControlLabel(code) {
  const match = String(code || '').match(/^(\d+)\+(\d+)$/);
  if (!match) return code || '—';

  const minutes = Number(match[1]);
  const type = minutes <= 2 ? 'Bullet' : (minutes <= 10 ? 'Blitz' : 'Rapid');
  return `${type} • ${code}`;
}

window.openArenaTournamentDetail = async function(tournamentId) {
  window.currentTournamentDetail = { id: tournamentId, arena: true };
  const view = document.getElementById('tournamentDetailView');
  const container = document.getElementById('tournamentDetailContainer');
  if (!view || !container) return;

  window.openTournamentDetailShell(view);

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 30px;">' + tx('tdLoading', 'Turnir yuklanmoqda...') + '</div>';

  try {
    const [tournamentResponse, standingsResponse] = await Promise.all([
      fetch('/api/tournaments/' + encodeURIComponent(tournamentId)),
      fetch('/api/tournaments/' + encodeURIComponent(tournamentId) + '/standings')
    ]);
    const tournamentData = await tournamentResponse.json();
    const standingsData = await standingsResponse.json();

    if (!tournamentResponse.ok || !tournamentData.success || !tournamentData.tournament) {
      throw new Error('Turnir topilmadi');
    }

    const tournament = tournamentData.tournament;
    const standings = standingsData.success && Array.isArray(standingsData.standings) ? standingsData.standings : [];
    const currentUsername = window.currentUser ? window.currentUser.username : null;
    const isJoined = currentUsername && standings.some(participant => participant.username === currentUsername);
    const timeControl = tournament.time_control || tournament.timeControl || '—';
    const rounds = tournament.rounds || 7;

    const standingsDataList = standings;

    const standingsHTML = standingsDataList.slice(0, 10).map((participant, index) => `
        <div class="tournament-detail-standings-row">
          <span class="tournament-detail-rank">#${index + 1}</span>
          <div class="tournament-detail-player">
            <strong>${escapeHtml(participant.username || tx('unknownLabel', "Noma'lum"))}</strong>
            <span>${tx('profLabelRating', 'Reyting:')} ${Number(participant.rating || 1500)}</span>
          </div>
          <span class="tournament-detail-score">${Number(participant.score || 0)}</span>
        </div>
      `).join('') || `<div class="tournament-detail-empty">${escapeHtml(tx('tdNoParticipants', "Hali ishtirokchilar yo'q. Birinchi bo'lib qo'shiling!"))}</div>`;

    const opponent = standings.find(p => p.username !== currentUsername) || standings[0] || { username: tx('colOpponent', 'Raqib'), rating: 1500 };
    const opponentFlag = getPlayerFlag(opponent.username, opponent.club);
    const playerFlag = currentUsername ? getPlayerFlag(currentUsername, null) : getPlayerFlag('Guest', null);
    const playerName = currentUsername || tx('tdGuest', 'Mehmon');
    const playerRating = window.currentUser && window.currentUser.rating ? window.currentUser.rating : 1500;

    container.innerHTML = `
      <div class="tournament-detail-layout">
        <section class="tournament-detail-board-panel">
          <div class="tournament-player-bar opponent">
            <div class="tournament-player-avatar">${(opponent.username || 'O').charAt(0).toUpperCase()}</div>
            <div class="tournament-player-info">
              <span class="tournament-player-name">${escapeHtml(opponent.username || tx('colOpponent', 'Raqib'))}</span>
              <div class="tournament-player-meta">
                <img class="tournament-player-flag" src="${opponentFlag}" alt="" loading="lazy" onerror="this.style.display='none'">
                <span class="tournament-player-rating">${tx('profLabelRating', 'Reyting:')} ${Number(opponent.rating || 1500)}</span>
              </div>
            </div>
          </div>

          <div class="tournament-detail-board-wrap">
            <div id="tournamentDetailBoard" class="board theme-green"></div>
          </div>

          <div class="tournament-player-bar self">
            <div class="tournament-player-avatar">${playerName.charAt(0).toUpperCase()}</div>
            <div class="tournament-player-info">
              <span class="tournament-player-name">${escapeHtml(playerName)}</span>
              <div class="tournament-player-meta">
                <img class="tournament-player-flag" src="${playerFlag}" alt="" loading="lazy" onerror="this.style.display='none'">
                <span class="tournament-player-rating">${tx('profLabelRating', 'Reyting:')} ${Number(playerRating)}</span>
              </div>
            </div>
            <div class="tournament-player-clock" id="playerClock">--:--</div>
          </div>
        </section>

        <aside class="tournament-detail-info-panel">
          <div class="tournament-detail-info-header">
            <div class="tournament-detail-info-title">
              <span class="tournament-detail-eyebrow">${escapeHtml(tx('tdEyebrow', 'Turnir tafsiloti'))}</span>
              <h2>${escapeHtml(tournament.name)}</h2>
              <p>${escapeHtml(tx('tdArenaSubtitle', 'Arena • {{tc}} • {{count}} raund', { tc: getArenaTimeControlLabel(timeControl), count: rounds }))}</p>
            </div>
            <button class="tournament-detail-back-btn" id="arenaDetailBackButton">← ${escapeHtml(tx('tdBack', 'Turnirlar'))}</button>
          </div>

          <div class="tournament-detail-meta-grid">
            <div class="tournament-detail-stat tournament-stat-card">
              <span>${escapeHtml(tx('tdTimeControl', 'Vaqt nazorati'))}</span>
              <strong>${escapeHtml(getArenaTimeControlLabel(timeControl))}</strong>
            </div>
            <div class="tournament-detail-stat tournament-stat-card">
              <span>${escapeHtml(tx('tdRounds', 'Raundlar'))}</span>
              <strong>${escapeHtml(tx('tdRoundsCount', '{{count}} raund', { count: rounds }))}</strong>
            </div>
          </div>

          <section class="tournament-detail-section">
            <div class="tournament-detail-section-heading">
              <h3>${escapeHtml(tx('leagueStandingsTitle', 'Turnir jadvali'))}</h3>
              <span>${escapeHtml(tx('tdParticipants', '{{count}} ishtirokchi', { count: standings.length }))}</span>
            </div>
            <div class="tournament-detail-standings-list">${standingsHTML}</div>
          </section>

          <div class="tournament-detail-join-footer">
            <button class="tournament-detail-join-btn" id="arenaDetailJoinButton" ${isJoined ? 'disabled' : ''}>
              ${escapeHtml(isJoined ? tx('tdJoinedBtn', "Turnirga qo'shildingiz") : tx('tdJoinBtn', "Turnirga qo'shilish"))}
            </button>
            <div class="tournament-detail-join-note">${escapeHtml(isJoined ? tx('tdJoinedNote', 'Siz ushbu turnir ishtirokchisisiz') : tx('tdJoinNote', "Turnirga qo'shiling va natijangizni yaxshilang"))}</div>
          </div>
        </aside>
      </div>
    `;

    window.initTournamentDetailBoard();

    const backButton = document.querySelector('#tournamentDetailContainer .tournament-detail-back-btn');
    if (backButton) {
      backButton.addEventListener('click', () => {
        window.closeTournamentDetail();
        switchView('tournaments');
        loadTournaments();
      });
    }

    const joinButton = document.getElementById('arenaDetailJoinButton');
    if (joinButton && !isJoined) {
      joinButton.addEventListener('click', () => {
        window.joinArenaTournament(tournamentId);
      });
    }
  } catch (err) {
    console.error('Arena turniri tafsiloti xatoligi:', err);
    container.innerHTML = '<div style="font-size: 13px; color: #e74c3c; text-align: center; padding: 30px;">' + tx('tdLoadError', 'Turnirni yuklashda xatolik yuz berdi') + '</div>';
  }
};

window.refreshTournamentDetail = function() {
  const current = window.currentTournamentDetail;
  if (!current) return;
  if (current.arena) window.openArenaTournamentDetail(current.id);
  else window.openTournamentDetail(current.id);
};

window.joinArenaTournament = function(tournamentId) {
  window.joinTournament(tournamentId, () => {
    window.openArenaTournamentDetail(tournamentId);
  });
};
window.loadArenas = function() {
  const container = document.getElementById('arenaScheduleContainer');
  if (!container) return;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">' + tx('arenaScheduleLoading', 'Jadval yuklanmoqda...') + '</div>';

  fetch('/api/tournaments/arenas')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (!data || !data.success || !Array.isArray(data.schedule)) {
        container.innerHTML = '<div style="font-size: 13px; color: #e74c3c; text-align: center; padding: 20px;">' + tx('arenaScheduleError', "Jadvalni yuklab bo'lmadi") + '</div>';
        return;
      }

      const schedule = data.schedule;
      const currentArena = data.currentArena;
      const timeUntilNext = data.timeUntilNext || 0;
      const now = Date.now();
      const livePlayers = currentArena ? (currentArena.current_players || 0) : 0;

      let html = `
        <div class="arena-schedule-header">
          <div>
            <div class="arena-schedule-eyebrow">🏆 24/7 Arena</div>
            <div class="arena-schedule-title">${escapeHtml(tx('arenaTitle', 'Har soatda yangi turnir'))}</div>
            <div class="arena-schedule-subtitle">${escapeHtml(tx('arenaSubtitle', 'Rapid • Blitz • Bullet | Har bir turnir 60 daqiqa'))}</div>
          </div>
          <div class="arena-schedule-summary">
            <strong>24</strong>
            <span>${escapeHtml(tx('arenaCountLabel', 'ta turnir'))}</span>
          </div>
        </div>
        <div class="arena-schedule-grid">
      `;

      schedule.forEach(slot => {
        const start = new Date(slot.slotStart);
        const end = new Date(slot.slotEnd);
        const isCurrent = slot.status === 'current' || (start.getTime() <= now && now < end.getTime());
        const isPast = slot.status === 'completed' || end.getTime() <= now;
        const isUpcoming = !isCurrent && !isPast;
        const typeLabel = slot.type === 'rapid' ? 'Rapid' : (slot.type === 'blitz' ? 'Blitz' : 'Bullet');
        const statusLabel = isCurrent
          ? '<span class="arena-schedule-status live">LIVE</span>'
          : (isPast
            ? `<span class="arena-schedule-status">${escapeHtml(tx('arenaStatusDone', 'Tugagan'))}</span>`
            : `<span class="arena-schedule-status">${escapeHtml(tx('arenaStartsIn', '{{time}} keyin', { time: formatArenaDuration(start.getTime() - now) }))}</span>`);
        const currentContent = isCurrent
          ? `<div class="arena-schedule-window">${escapeHtml(tx('arenaNext', 'Keyingi turnir:'))} <span class="arena-countdown">${formatArenaCountdown(timeUntilNext)}</span></div>
             <div style="font-size: 10px; color: #b8c7c2; margin-top: 4px;">${escapeHtml(tx('arenaPlayersLive', "{{count}} o'yinchi ishtirok etmoqda", { count: livePlayers }))}</div>`
          : `<div class="arena-schedule-window">${formatArenaHour(start)}–${formatArenaHour(end)}</div>`;
        const joinBtn = isCurrent && currentArena
          ? `<button class="form-submit arena-schedule-join" data-tournament-id="${escapeHtml(currentArena.id)}">${escapeHtml(tx('btnJoin', "Qo'shilish"))}</button>`
          : '';

        html += `
          <article class="arena-schedule-card ${isCurrent ? 'current' : (isPast ? 'past' : 'upcoming')}">
            <div class="arena-schedule-hour">${formatArenaHour(start)}</div>
            <div class="arena-schedule-top">
              <span class="arena-schedule-badge ${slot.type}">${typeLabel}</span>
              ${statusLabel}
            </div>
            <div class="arena-schedule-name">${slot.icon} ${slot.name}</div>
            <div class="arena-schedule-code">${slot.code} • ${escapeHtml(tx('tdRoundsCount', '{{count}} raund', { count: slot.rounds }))}</div>
            ${currentContent}
            ${joinBtn}
          </article>
        `;
      });

      html += '</div>';
      container.innerHTML = html;
      container.querySelectorAll('.arena-schedule-join').forEach(button => {
        button.addEventListener('click', () => {
          window.openArenaTournamentDetail(button.dataset.tournamentId);
        });
      });
      startArenaCountdown(timeUntilNext);
    })
    .catch(err => {
      console.error('Arena jadvali xatoligi:', err);
      container.innerHTML = '<div style="font-size: 13px; color: #e74c3c; text-align: center; padding: 20px;">' + tx('arenaScheduleError', "Jadvalni yuklab bo'lmadi") + '</div>';
    });
};

function formatArenaCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatArenaDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return tx('durHoursMinutes', '{{h}} soat {{m}} daqiqa', { h, m });
  return tx('durMinutes', '{{m}} daqiqa', { m });
}

function formatArenaHour(date) {
  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

let arenaCountdownInterval = null;
function startArenaCountdown(initialMs) {
  if (arenaCountdownInterval) clearInterval(arenaCountdownInterval);
  let remaining = initialMs;
  const el = document.querySelector('.arena-countdown');
  if (!el) return;
  arenaCountdownInterval = setInterval(() => {
    remaining -= 1000;
    if (remaining <= 0) {
      clearInterval(arenaCountdownInterval);
      if (typeof window.loadTournaments === 'function') window.loadTournaments();
      return;
    }
    const cdEl = document.querySelector('.arena-countdown');
    if (cdEl) cdEl.textContent = formatArenaCountdown(remaining);
  }, 1000);
}

window.loadTournaments = function() {
  if (typeof window.loadArenas === 'function') window.loadArenas();

  const container = document.getElementById('tournamentsListContainer');
  if (!container) return;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">' + tx('loadingText', 'Yuklanmoqda...') + '</div>';
   
  fetch('/api/tournaments')
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      if (!data.success || !data.tournaments || data.tournaments.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">No tournaments found</div>';
        return;
      }
      
      let htmlContent = '';
      data.tournaments.forEach(tournament => {
         const typeLabel = tournament.tournament_type === 'team' ? '⚔️ Team'
          : (tournament.tournament_type === 'individual' ? '♟️ Individual' : '🕒 Arena');
        const statusLabel = tournament.status === 'active' ? 'Active' : (tournament.status === 'completed' ? 'Completed' : 'Waiting');
        const statusColor = tournament.status === 'active' ? '#2ecc71' : (tournament.status === 'completed' ? '#88a' : '#f39c12');
        const isTeam = tournament.tournament_type === 'team';
        const subInfo = isTeam
          ? `${tournament.club_id_a || 'A'} vs ${tournament.club_id_b || 'B'}`
          : `${tournament.current_players || 0}/${tournament.max_players || 16} players • Round ${tournament.current_round || 0}/${tournament.rounds || 7}`;

        let actionBtns = '';
        if (tournament.status === 'completed') {
           actionBtns = `<button class="control-btn" onclick="openTournamentDetail('${tournament.id}')" style="padding: 6px 12px; font-size: 12px;">Results</button>`;
        } else {
          actionBtns = `
            <button class="form-submit" onclick="joinTournament('${tournament.id}')" style="padding: 6px 12px; font-size: 12px;">${escapeHtml(tx('btnJoin', "Qo'shilish"))}</button>
            <button class="control-btn" onclick="openTournamentDetail('${tournament.id}')" style="padding: 6px 12px; font-size: 12px;">View</button>
          `;
        }

        htmlContent += `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(255,255,255,0.05); padding: 12px 15px; border-radius: 8px;">
            <div style="min-width: 0;">
              <b style="font-size: 14px; color: #fff; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px;">${escapeHtml(tournament.name)}</b>
              <span style="font-size: 11px; color: #88a;">${subInfo}</span>
              <div style="margin-top: 4px; display: flex; gap: 6px;">
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 10px; background: rgba(129,182,76,0.15); color: #81b64c; border: 1px solid rgba(129,182,76,0.3);">${typeLabel}</span>
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 10px; background: rgba(0,0,0,0.2); color: ${statusColor};">${statusLabel}</span>
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0;">${actionBtns}</div>
          </div>
        `;
      });
      
      container.innerHTML = htmlContent;
    })
    .catch(err => {
      console.error('Load tournaments xatoligi:', err);
      container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + tx('errLoadFailed', 'Yuklashda xatolik yuz berdi') + '</div>';
    });
};

window.joinTournament = function(tournamentId, afterJoin) {
  if (!window.currentUser) {
    alert(tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!'));
    switchView('login');
    return;
  }
  
  fetch(`/api/tournaments/${tournamentId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.authToken}`
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      if (typeof afterJoin === 'function') {
        afterJoin(data);
      } else {
        alert(tx('tournamentJoined', "Turnirga qo'shildingiz!"));
        loadTournaments();
      }
    } else {
      alert(tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
    }
  })
  .catch(err => {
    console.error('Join tournament xatoligi:', err);
    alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
  });
};

window.sendFriendRequest = function() {
  if (!window.currentUser) {
    alert(tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!'));
    switchView('login');
    return;
  }
  
  const username = document.getElementById('friendUsernameInput').value.trim();
  if (!username) {
    alert(tx('friendNameRequired', "Do'stingiz nomini kiriting!"));
    return;
  }
  
  fetch('/api/friends/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.authToken}`
    },
    body: JSON.stringify({ username })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert(tx('friendRequestSent', "Do'stlik so'rovi yuborildi!"));
      document.getElementById('friendUsernameInput').value = '';
    } else {
      alert(tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
    }
  })
  .catch(err => {
    console.error('Send friend request xatoligi:', err);
    alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
  });
};

window.loadFriendRequests = function() {
  const container = document.getElementById('friendsListContainer');
  if (!container) return;
  
  fetch('/api/friends/requests', {
    headers: { 'Authorization': `Bearer ${window.authToken}` }
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success || !data.requests || data.requests.length === 0) {
      container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + tx('noFriendRequests', "So'rovlar yo'q") + '</div>';
      return;
    }
    
    let htmlContent = '<div style="font-size: 14px; color: #fff; margin-bottom: 10px; font-weight: bold;">' + tx('friendRequestsHeader', "Do'stlik so'rovlari:") + '</div>';
    data.requests.forEach(request => {
      htmlContent += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px;">
          <div>
            <b style="font-size: 14px; color: #fff;">${escapeHtml(request.username)}</b>
            <span style="font-size: 11px; color: #88a;">${tx('profLabelRating', 'Reyting:')} ${request.rating || 1500}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="form-submit" onclick="acceptFriendRequest('${request.id}')" style="padding: 4px 10px; font-size: 12px; background: #2ecc71;">
              ${tx('btnAccept', 'Qabul qilish')}
            </button>
            <button class="action-btn" onclick="declineFriendRequest('${request.id}')" style="padding: 4px 10px; font-size: 12px; background: #e74c3c;">
              ${tx('btnDecline', 'Rad etish')}
            </button>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = htmlContent;
  })
  .catch(err => {
    console.error('Load friend requests xatoligi:', err);
  });
};

window.acceptFriendRequest = function(requestId) {
  fetch('/api/friends/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.authToken}`
    },
    body: JSON.stringify({ requestId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert(tx('friendAccepted', "Do'stlik qabul qilindi!"));
      loadFriendRequests();
      loadFriendsList();
    } else {
      alert(tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
    }
  })
  .catch(err => {
    console.error('Accept friend request xatoligi:', err);
  });
};

window.declineFriendRequest = function(requestId) {
  fetch('/api/friends/decline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.authToken}`
    },
    body: JSON.stringify({ requestId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      loadFriendRequests();
    } else {
      alert(tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
    }
  })
  .catch(err => {
    console.error('Decline friend request xatoligi:', err);
    alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
  });
};

window.loadFriendsList = function() {
  const container = document.getElementById('friendsListContainer');
  if (!container) return;
  
  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">' + tx('loadingText', 'Yuklanmoqda...') + '</div>';
  
  fetch('/api/friends', {
    headers: { 'Authorization': `Bearer ${window.authToken}` }
  })
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      if (!data.success || !data.friends || data.friends.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + tx('friendsEmpty', "Do'stlar ro'yxati bo'sh") + '</div>';
        return;
      }
      
      let htmlContent = '';
      data.friends.forEach(friend => {
        htmlContent += `
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="mini-avatar" style="width: 35px; height: 35px; font-size: 15px; display: flex; align-items: center; justify-content: center; background: #81b64c; border-radius: 50%; color: white; font-weight: bold;">
                ${friend.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <b style="font-size: 14px; color: #fff; display: block;">${escapeHtml(friend.username)}</b>
                <span style="font-size: 11px; color: #88a;">${tx('profLabelRating', 'Reyting:')} ${friend.rating || 1500}</span>
              </div>
            </div>
            <button class="form-submit" data-user-id="${escapeHtml(friend.id)}" data-username="${escapeHtml(friend.username)}" onclick="startChatWith(this.dataset.userId, this.dataset.username)" style="padding: 6px 12px; font-size: 12px;">
              ${tx('mChat', 'Chat')}
            </button>
          </div>
        `;
      });
      
      container.innerHTML = htmlContent;
    })
    .catch(err => {
      console.error('Load friends list xatoligi:', err);
      container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + tx('errLoadFailed', 'Yuklashda xatolik yuz berdi') + '</div>';
    });
};

window.startChatWith = function(userId, username) {
  switchView('chat');
  const select = document.getElementById('chatRoomSelect');
  const value = `user_${userId}`;
  // Shaxsiy suhbat uchun variant ro'yxatda bo'lmasa qo'shiladi (aks holda select qiymatni qabul qilmaydi)
  if (select && !Array.from(select.options).some(o => o.value === value)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = username || tx('userFallback', 'Foydalanuvchi');
    select.appendChild(option);
  }
  if (select) select.value = value;
  loadChatMessages();
};

window.showCreateClubModal = function() {
  // Deprecated - clubs are now country-based only
};

window.loadChatMessages = function() {
  const container = document.getElementById('chatMessagesContainer');
  const roomId = document.getElementById('chatRoomSelect').value;
  
  if (!roomId) {
    container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + tx('chatSelectRoom', 'Xona tanlang') + '</div>';
    return;
  }
  
  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">' + tx('loadingText', 'Yuklanmoqda...') + '</div>';
  
  let url = `/api/chat/messages?roomId=${encodeURIComponent(roomId)}`;
  if (!window.authToken) {
    url += '&userId=guest';
  }
  
  fetch(url, {
    headers: window.authToken ? { 'Authorization': `Bearer ${window.authToken}` } : {}
  })
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      if (!data.success || !data.messages || data.messages.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + tx('chatNoMessages', "Xabarlar yo'q") + '</div>';
        return;
      }
      
      let htmlContent = '';
      data.messages.forEach(msg => {
        const isOwn = msg.sender_id === (window.currentUser?.id || 'guest');
        htmlContent += `
          <div style="text-align: ${isOwn ? 'right' : 'left'}; margin-bottom: 8px;">
            <div style="display: inline-block; background: ${isOwn ? '#2ecc71' : '#2a3e3b'}; color: #fff; padding: 8px 12px; border-radius: 8px; max-width: 70%; text-align: left;">
              <div style="font-size: 11px; color: #88a; margin-bottom: 4px;">${escapeHtml(msg.username || msg.sender_username || tx('userFallback', 'Foydalanuvchi'))}</div>
              <div style="font-size: 13px;">${escapeHtml(msg.message)}</div>
            </div>
          </div>
        `;
      });
      
      container.innerHTML = htmlContent;
      container.scrollTop = container.scrollHeight;
    })
    .catch(err => {
      console.error('Load chat messages xatoligi:', err);
      container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + tx('errLoadFailed', 'Yuklashda xatolik yuz berdi') + '</div>';
    });
};

window.sendChatMessage = function() {
  const input = document.getElementById('chatMessageInput');
  const message = input.value.trim();
  const roomId = document.getElementById('chatRoomSelect').value;
  
  if (!message) return;
  if (!roomId && !window.currentUser) {
    alert(tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!'));
    return;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${window.authToken}`
  };
  
  fetch('/api/chat/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      roomId: roomId || null,
      receiverId: null
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      input.value = '';
      loadChatMessages();
    } else {
      alert(tServer(data.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
    }
  })
  .catch(err => {
    console.error('Send chat message xatoligi:', err);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const chatRoomSelect = document.getElementById('chatRoomSelect');
  if (chatRoomSelect) {
    chatRoomSelect.innerHTML = '<option value="">' + tx('chatSelectRoom', 'Xona tanlang') + '</option>';
  }
});

// ===== KLUB-SPECIFIC VIEW FUNKSIYALARI =====

window.currentClubName = null;
window.currentClubCode = null;

// Klub detal sahifasiga qaytish
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
          <div style="width: 35px; height: 35px; font-size: 15px; display: flex; align-items: center; justify-content: center; background: #81b64c; border-radius: 50%; color: white; font-weight: bold;">${firstLetter}</div>
          <b style="font-size: 14px; color: #fff;">${escapeHtml(member.username)}</b>
        </div>
        <div style="display: flex; gap: 15px; font-size: 12px; text-align: right;">
          <span style="color: #81b64c; font-weight: bold;">${Number(member.rating) || 1500}</span>
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
    titleEl.innerHTML = `<img src="https://flagcdn.com/w20/${safeCountryCode}.png" style="width: 20px; height: 14px; margin-right: 8px; border-radius: 2px;"> ${escapeHtml(tx('clubChatTitle', '{{country}} klub chati', { country: countryName }))}`;
  }

  const container = document.getElementById("clubChatMessagesContainer");
  if (!container) return;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">' + tx('loadingText', 'Yuklanmoqda...') + '</div>';

  loadClubChatMessages();

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

window.loadClubChatMessages = function() {
  if (!window.currentClubName) return;
  const container = document.getElementById("clubChatMessagesContainer");
  if (!container) return;

  const roomId = 'club_' + window.currentClubName;
  const url = `/api/chat/messages?roomId=${encodeURIComponent(roomId)}`;

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
        
        htmlContent += `
          <div class="club-chat-message ${isOwn ? 'own' : 'other'}">
            <span class="club-chat-message-author">${escapeHtml(authorName)}</span>
            <div>${escapeHtml(msg.message)}</div>
            <div class="club-chat-message-time">${time}</div>
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

window.sendClubChatMessage = function() {
  if (!window.currentUser) {
    alert(tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!'));
    return;
  }

  if (!window.currentClubName) return;

  const input = document.getElementById('clubChatMessageInput');
  if (!input) return;
  const message = input.value.trim();
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
      input.value = '';
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
        <div style="background: rgba(129, 182, 76, 0.08); border: 1px solid rgba(129, 182, 76, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #81b64c;">${storedMembers.length}</div>
          <div style="font-size: 11px; color: #88a;">${tr('clubDetailMembersCard', "A'zolar")}</div>
        </div>
        <div style="background: rgba(52, 152, 219, 0.08); border: 1px solid rgba(52, 152, 219, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #3498db;">${stats.events}</div>
          <div style="font-size: 11px; color: #88a;">${tr('clubHistoryGamesCard', "O'yinlar")}</div>
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
        <div style="width: 36px; height: 36px; background: #81b64c; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">${firstLetter}</div>
        <div style="flex: 1;">
          <div style="font-size: 14px; color: #fff; font-weight: bold; display: flex; align-items: center; gap: 8px;">
            ${escapeHtml(member.username)}
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

// ===== INDIVIDUAL TURNIR (SWISS) TAFSILOTI =====

window.openTournamentDetail = async function(tournamentId) {
  window.currentTournamentDetail = { id: tournamentId, arena: false };
  const view = document.getElementById('tournamentDetailView');
  const container = document.getElementById('tournamentDetailContainer');
  if (!view || !container) return;

  window.openTournamentDetailShell(view);

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">' + tx('loadingText', 'Yuklanmoqda...') + '</div>';

  try {
    const [tRes, sRes, mRes] = await Promise.all([
      fetch('/api/tournaments/' + encodeURIComponent(tournamentId)),
      fetch('/api/tournaments/' + encodeURIComponent(tournamentId) + '/standings'),
      fetch('/api/tournaments/' + encodeURIComponent(tournamentId) + '/matches')
    ]);
    const tData = await tRes.json();
    const sData = await sRes.json();
    const mData = await mRes.json();

    const tournament = tData.tournament || tData;
    const standings = (sData.success ? sData.standings : []) || [];
    const matches = (mData.success ? mData.matches : []) || [];
    const currentUsername = window.currentUser ? window.currentUser.username : null;
    const isJoined = !!currentUsername && standings.some(s => s.username === currentUsername);

    const currentRound = tournament.current_round || 0;
    const maxRounds = tournament.rounds || 7;
    const typeLabel = tournament.tournament_type === 'team' ? tx('tdTypeTeam', 'Jamoaviy')
      : (tournament.tournament_type === 'individual' ? tx('tdTypeIndividual', 'Individual') : tx('tdTypeArena', 'Arena'));
    const statusLabels = { waiting: tx('tdStatusWaiting', 'Kutilmoqda'), active: tx('tdStatusActive', 'Faol'), completed: tx('tdStatusCompleted', 'Yakunlangan') };
    const statusLabel = statusLabels[tournament.status] || tournament.status || '—';

    const roundMatches = matches.filter(m => m.round === currentRound && m.status !== 'bye');
    const byeMatches = matches.filter(m => m.round === currentRound && m.status === 'bye');

    let pairingsHTML = '';
    if (roundMatches.length === 0 && byeMatches.length === 0) {
      pairingsHTML = '<div class="tournament-detail-empty">' + escapeHtml(tx('tdNoPairings', 'Hozircha juftliklar yaratilmagan')) + '</div>';
    } else {
      roundMatches.forEach(m => {
        const isPlayer = window.currentUser && (m.player1Id === window.currentUser.id || m.player2Id === window.currentUser.id);
         const p1 = m.player1Username || tx('whiteText', 'Oq');
        const p2 = m.player2Username || (m.player2Id ? tx('colOpponent', 'Raqib') : '—');
        let resultBtns = '';
        if (isPlayer && m.status === 'active') {
          resultBtns = `
            <div style="display: flex; gap: 6px; margin-top: 8px;">
               <button class="action-btn" onclick="reportTournamentMatchResult('${tournamentId}', '${m.id}', 'white')" style="flex:1; font-size: 11px; padding: 6px 4px; background: #2a3e3b; color: #dbe8df; border: 1px solid #3d5a56; border-radius: 8px; font-weight: 700;">${escapeHtml(tx('tdWhiteWins', 'Oq yutdi'))}</button>
              <button class="action-btn" onclick="reportTournamentMatchResult('${tournamentId}', '${m.id}', 'draw')" style="flex:1; font-size: 11px; padding: 6px 4px; background: #2a3e3b; color: #dbe8df; border: 1px solid #3d5a56; border-radius: 8px; font-weight: 700;">${escapeHtml(tx('btnDrawText', 'Durrang'))}</button>
              <button class="action-btn" onclick="reportTournamentMatchResult('${tournamentId}', '${m.id}', 'black')" style="flex:1; font-size: 11px; padding: 6px 4px; background: #2a3e3b; color: #dbe8df; border: 1px solid #3d5a56; border-radius: 8px; font-weight: 700;">${escapeHtml(tx('tdBlackWins', 'Qora yutdi'))}</button>
            </div>`;
        } else if (m.status === 'completed') {
          const winnerName = m.winnerId === m.player1Id ? p1 : p2;
          const resultText = m.winnerId ? tx('tdPlayerWins', '{{name}} yutdi', { name: winnerName }) : tx('resultDraw', 'Durrang');
          resultBtns = `<div style="font-size: 11px; color: #8fc95a; margin-top: 6px; font-weight: 700;">✓ ${escapeHtml(resultText)}</div>`;
        }
        pairingsHTML += `
          <div class="tournament-detail-standings-row" style="grid-template-columns: 18px minmax(0, 1fr) auto minmax(0, 1fr);">
            <span style="font-size: 12px; color: #8fc95a; font-weight: 800;">#${m.board || (roundMatches.indexOf(m) + 1)}</span>
            <div style="min-width: 0;">
              <strong style="font-size: 13px; color: #f4fbf3;">${escapeHtml(p1)}</strong>
            </div>
            <span style="font-size: 11px; color: #8fa89f; font-weight: 700;">vs</span>
            <div style="min-width: 0;">
              <strong style="font-size: 13px; color: #f4fbf3;">${escapeHtml(p2)}</strong>
            </div>
          </div>
          ${resultBtns}
        `;
      });
      byeMatches.forEach(m => {
        pairingsHTML += `<div class="tournament-detail-standings-row" style="color: #e6b800;"><span>♟️</span><span>${escapeHtml(tx('tdBye', "{{name}} — raund o'tkazib yuboriladi (+1)", { name: m.player1Username || tx('tdPlayer', "O'yinchi") }))}</span></div>`;
      });
    }

    const standingsDataList = standings;

    let standingsHTML = '';
    standingsDataList.slice(0, 10).forEach((s, i) => {
      standingsHTML += `
        <div class="tournament-detail-standings-row">
          <span class="tournament-detail-rank">#${i + 1}</span>
          <div class="tournament-detail-player">
            <strong>${escapeHtml(s.username)}</strong>
            <span>${tx('profLabelRating', 'Reyting:')} ${Number(s.rating || 1500)}</span>
          </div>
          <span class="tournament-detail-score">${Number(s.score || 0)}</span>
        </div>`;
    });

    if (!standingsHTML) standingsHTML = `<div class="tournament-detail-empty">${escapeHtml(tx('tdNoParticipants', "Hali ishtirokchilar yo'q. Birinchi bo'lib qo'shiling!"))}</div>`;

     const canGenerate = standings.length >= 2 && currentRound < maxRounds;

     const swissOpponent = standings.find(p => p.username !== (window.currentUser && window.currentUser.username)) || standings[0] || { username: tx('colOpponent', 'Raqib'), rating: 1500 };
     const swissOpponentFlag = getPlayerFlag(swissOpponent.username, null);
     const swissPlayerFlag = currentUsername ? getPlayerFlag(currentUsername, null) : getPlayerFlag('Guest', null);
     const swissPlayerName = currentUsername || tx('tdGuest', 'Mehmon');
     const swissPlayerRating = window.currentUser && window.currentUser.rating ? window.currentUser.rating : 1500;

     container.innerHTML = `
      <div class="tournament-detail-layout">
        <section class="tournament-detail-board-panel">
          <div class="tournament-player-bar opponent">
            <div class="tournament-player-avatar">${(swissOpponent.username || 'O').charAt(0).toUpperCase()}</div>
            <div class="tournament-player-info">
              <span class="tournament-player-name">${escapeHtml(swissOpponent.username || tx('colOpponent', 'Raqib'))}</span>
              <div class="tournament-player-meta">
                <img class="tournament-player-flag" src="${swissOpponentFlag}" alt="" loading="lazy" onerror="this.style.display='none'">
                <span class="tournament-player-rating">${tx('profLabelRating', 'Reyting:')} ${Number(swissOpponent.rating || 1500)}</span>
              </div>
            </div>
          </div>

          <div class="tournament-detail-board-wrap">
            <div id="tournamentDetailBoard" class="board theme-green"></div>
          </div>

          <div class="tournament-player-bar self">
            <div class="tournament-player-avatar">${swissPlayerName.charAt(0).toUpperCase()}</div>
            <div class="tournament-player-info">
              <span class="tournament-player-name">${escapeHtml(swissPlayerName)}</span>
              <div class="tournament-player-meta">
                <img class="tournament-player-flag" src="${swissPlayerFlag}" alt="" loading="lazy" onerror="this.style.display='none'">
                <span class="tournament-player-rating">${tx('profLabelRating', 'Reyting:')} ${Number(swissPlayerRating)}</span>
              </div>
            </div>
            <div class="tournament-player-clock" id="playerClock">--:--</div>
          </div>
        </section>

        <aside class="tournament-detail-info-panel">
          <div class="tournament-detail-info-header">
            <div class="tournament-detail-info-title">
              <span class="tournament-detail-eyebrow">${escapeHtml(tx('tdEyebrow', 'Turnir tafsiloti'))}</span>
              <h2>${escapeHtml(tournament.name)}</h2>
              <p>${escapeHtml(tx('tdSubtitle', '{{type}} turnir • {{tc}} • {{count}} raund', { type: typeLabel, tc: tournament.time_control || '—', count: maxRounds }))}</p>
            </div>
            <button class="tournament-detail-back-btn" onclick="window.closeTournamentDetail(); switchView('tournaments'); loadTournaments();">← ${escapeHtml(tx('tdBack', 'Turnirlar'))}</button>
          </div>

           <div class="tournament-detail-meta-grid">
            <div class="tournament-detail-stat tournament-stat-card">
              <span>${escapeHtml(tx('tdCurrentRound', 'Joriy raund'))}</span>
              <strong>${currentRound}/${maxRounds}</strong>
            </div>
            <div class="tournament-detail-stat tournament-stat-card">
              <span>${escapeHtml(tx('tdStatus', 'Holat'))}</span>
              <strong>${escapeHtml(statusLabel)}</strong>
            </div>
          </div>

          <section class="tournament-detail-section">
            <div class="tournament-detail-section-heading">
              <h3>${escapeHtml(tx('leagueStandingsTitle', 'Turnir jadvali'))}</h3>
              <span>${escapeHtml(tx('tdParticipants', '{{count}} ishtirokchi', { count: standings.length }))}</span>
            </div>
            <div class="tournament-detail-standings-list">${standingsHTML}</div>
          </section>

          <section class="tournament-detail-section">
            <div class="tournament-detail-section-heading">
              <h3>${escapeHtml(tx('tdPairings', 'Juftliklar ({{round}}-raund)', { round: currentRound }))}</h3>
            </div>
            <div class="tournament-detail-standings-list">${pairingsHTML}</div>
            ${canGenerate ? `<button class="tournament-detail-join-btn" style="margin-top: 10px;" onclick="generateTournamentPairings('${escapeHtml(tournamentId)}')">${escapeHtml(tx('tdGeneratePairings', 'Keyingi raund juftliklarini yaratish'))}</button>` : ''}
          </section>

          <div class="tournament-detail-join-footer">
            <button class="tournament-detail-join-btn" id="swissDetailJoinButton" ${isJoined ? 'disabled' : ''}>
              ${escapeHtml(isJoined ? tx('tdJoinedBtn', "Turnirga qo'shildingiz") : tx('tdJoinBtn', "Turnirga qo'shilish"))}
            </button>
            <div class="tournament-detail-join-note">${escapeHtml(isJoined ? tx('tdJoinedNote', 'Siz ushbu turnir ishtirokchisisiz') : tx('tdJoinNote', "Turnirga qo'shiling va natijangizni yaxshilang"))}</div>
          </div>
        </aside>
      </div>
    `;

    window.initTournamentDetailBoard();

    const swissJoinButton = document.getElementById('swissDetailJoinButton');
    if (swissJoinButton && !isJoined) {
      swissJoinButton.addEventListener('click', () => {
        window.joinTournament(tournamentId, () => window.openTournamentDetail(tournamentId));
      });
    }
  } catch (err) {
    console.error('Tournament detail xatoligi:', err);
    container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">' + tx('errLoadFailed', 'Yuklashda xatolik yuz berdi') + '</div>';
  }
};

window.generateTournamentPairings = function(tournamentId) {
  if (!window.currentUser) {
    alert(tx('errLoginRequired', 'Avval tizimga kirishingiz kerak!'));
    switchView('login');
    return;
  }
  fetch('/api/tournaments/' + encodeURIComponent(tournamentId) + '/pairings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.authToken}` }
  })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        alert(tx('pairingsGenerated', '{{round}}-raund juftliklari yaratildi!', { round: d.round }));
        window.openTournamentDetail(tournamentId);
      } else {
        alert(tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
      }
    })
    .catch(err => {
      console.error('Pairings yaratish xatoligi:', err);
      alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
    });
};

window.reportTournamentMatchResult = function(tournamentId, matchId, result) {
  fetch('/api/tournaments/' + encodeURIComponent(tournamentId) + '/matches/' + encodeURIComponent(matchId) + '/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.authToken}` },
    body: JSON.stringify({ result })
  })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        window.openTournamentDetail(tournamentId);
      } else {
        alert(tServer(d.message) || tx('errGeneric', 'Xatolik yuz berdi!'));
      }
    })
    .catch(err => {
      console.error('Match result xatoligi:', err);
      alert(tx('errServerUnreachable', "Serverga ulanib bo'lmadi!"));
    });
};
