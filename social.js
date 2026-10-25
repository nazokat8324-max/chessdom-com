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
  // Ўзбекча (кирилл): o'zbekcha nomdan
  if (locale === 'uzc') {
    const uzName = uzCountryNames[name] || name;
    return window.UzCyrl ? window.UzCyrl.toCyrl(uzName) : uzName;
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = (text === null || text === undefined) ? '' : String(text);
  // Atribut ichida ham xavfsiz bo'lishi uchun qo'shtirnoqlar ham ekranlanadi
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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
