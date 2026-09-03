// National chess clubs - Asian and European countries
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

// Foydalanuvchi qo'shilgan klublarini olish
function getUserClubs() {
  if (!window.currentUser) return [];
  const userClubs = JSON.parse(localStorage.getItem("justChessUserClubs") || "{}");
  return userClubs[window.currentUser.username] || [];
}

function saveUserClubs(clubs) {
  if (!window.currentUser) return;
  const userClubs = JSON.parse(localStorage.getItem("justChessUserClubs") || "{}");
  userClubs[window.currentUser.username] = clubs;
  localStorage.setItem("justChessUserClubs", JSON.stringify(userClubs));
}

// Real klub statistikasini hisoblash
function getClubStats(countryName) {
  // Barcha foydalanuvchilarning klublarini o'qiw
  const allUserClubs = JSON.parse(localStorage.getItem("justChessUserClubs") || "{}");

  // A'zolar sonini hisoblash (ushbu klubga qo'shilgan foydalanuvchilar)
  let memberCount = 0;
  for (const username in allUserClubs) {
    if (allUserClubs[username] && allUserClubs[username].includes(countryName)) {
      memberCount++;
    }
  }

  // Agar hech kirmagan bo'lsa 0 qaytarish
  if (memberCount === 0) {
    return { members: 0, events: 0, points: 0 };
  }

  // Jami o'yinlar sonini hisoclash (barcha a'zolar tarixidan)
  let totalEvents = 0;
  let totalPoints = 0;

  for (const username in allUserClubs) {
    if (allUserClubs[username] && allUserClubs[username].includes(countryName)) {
      // Har bir foydalanuvchi tarixini o'qish
      const userHistory = JSON.parse(localStorage.getItem("justChessGameHistory_" + username) || "[]");
      totalEvents += userHistory.length;

      // O'yin natijalariga qarab ochko hisoblash
      userHistory.forEach(game => {
        if (game.result === "win") totalPoints += 10;
        else if (game.result === "draw") totalPoints += 5;
        else totalPoints += 1;
      });
    }
  }

  // Agar tarix bo'sh bo'lsa, a'zolar soniga qarab minimal qiymat
  if (totalEvents === 0) {
    totalEvents = memberCount; // Har bir a'zo kamida 1 ta o'yin
    totalPoints = memberCount * 3; // Har bir a'zo kamida 3 ochko
  }

  return {
    members: memberCount,
    events: totalEvents,
    points: totalPoints
  };
}

// Klub a'zolarining real statistikasini olish
function getClubTopPlayers(countryName) {
  const allUserClubs = JSON.parse(localStorage.getItem("justChessUserClubs") || "{}");
  const allUsers = JSON.parse(localStorage.getItem("justChessAllUsers") || "[]");

  // Klub a'zolarini topish
  const members = [];
  for (const username in allUserClubs) {
    if (allUserClubs[username] && allUserClubs[username].includes(countryName)) {
      // Foydalanuvchi ma'lumotlarini topish
      const user = allUsers.find(u => u.username === username);
      if (user) {
        const rating = user.rating || 1500;
        const stats = user.stats || { wins: 0, losses: 0, draws: 0 };
        members.push({
          username: username,
          rating: rating,
          wins: stats.wins || 0
        });
      } else {
        // Agar user topilmasa
        members.push({
          username: username,
          rating: 1500,
          wins: 0
        });
      }
    }
  }

  // Reyting bo'yicha saralab, eng yaxshilarni qaytarish
  members.sort((a, b) => b.rating - a.rating);
  return members.slice(0, 3);
}

// Batafsil klub sahifasi - to'liq sahifa ko'rinishida
window.openClubDetail = function(countryName, countryCode) {
  const userClubs = getUserClubs();
  const stats = getClubStats(countryName);
  const topPlayers = getClubTopPlayers(countryName);
  const memberCount = stats.members;
  const eventsPlayed = stats.events;
  const clubPoints = stats.points;
  const isJoined = userClubs.includes(countryName);

  // Top Players HTML generatsiya qilish
  const medals = ['🥇', '🥈', '🥉'];
  const bgColors = ['rgba(241, 196, 15, 0.05)', 'rgba(189, 195, 199, 0.05)', 'rgba(230, 126, 34, 0.05)'];
  
  let topPlayersHTML = '';
  if (topPlayers.length === 0) {
    topPlayersHTML = '<div style="color: #888; font-size: 13px; text-align: center; padding: 15px;">No members yet. Be the first to join!</div>';
  } else {
    topPlayers.forEach((player, index) => {
      topPlayersHTML += `
        <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: ${bgColors[index]}; border-radius: 8px;">
          <span style="font-size: 20px;">${medals[index]}</span>
          <div>
            <div style="font-size: 14px; color: #fff; font-weight: bold;">${player.username}</div>
            <div style="font-size: 11px; color: #88a;">Rating: ${player.rating} • Wins: ${player.wins}</div>
          </div>
        </div>
      `;
    });
  }
  // Klub sahifasini to'ldirish
  const clubDetailView = document.getElementById('clubDetailView');
  
  clubDetailView.innerHTML = `
    <!-- Banner -->
    <div style="
      position: relative;
      height: 150px;
      background: linear-gradient(135deg, #2c3e50 0%, #1a2a28 50%, #2c3e50 100%);
      overflow: hidden;
      width: 100%;
    ">
      <!-- Flag background -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: url('https://flagcdn.com/w320/${countryCode}.png');
        background-size: cover;
        background-position: center;
        opacity: 0.25;
      "></div>
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);
      "></div>
      
      <!-- Back button -->
      <button onclick="switchView('clubs')" style="
        position: absolute;
        top: 15px;
        left: 15px;
        background: rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.2);
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        padding: 8px 14px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 10;
      ">← Back</button>
      
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
        <img src="https://flagcdn.com/w80/${countryCode}.png" alt="${countryName}" style="
          width: 56px;
          height: 38px;
          border-radius: 6px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.2);
        ">
        <div>
          <h2 style="color: #fff; font-size: 24px; margin: 0; text-shadow: 0 2px 6px rgba(0,0,0,0.5);">${countryName} Chess Club</h2>
          <span style="color: #81b64c; font-size: 13px; margin-top: 3px; display: block;">${memberCount} members • ${eventsPlayed} events</span>
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
          <div style="font-size: 12px; color: #88a; margin-top: 5px;">Members</div>
        </div>
        <div style="
          background: rgba(52, 152, 219, 0.08);
          border: 1px solid rgba(52, 152, 219, 0.3);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        ">
          <div style="font-size: 32px; font-weight: bold; color: #3498db;">${eventsPlayed}</div>
          <div style="font-size: 12px; color: #88a; margin-top: 5px;">Events Played</div>
        </div>
        <div style="
          background: rgba(241, 196, 15, 0.08);
          border: 1px solid rgba(241, 196, 15, 0.3);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        ">
          <div style="font-size: 32px; font-weight: bold; color: #f1c40f;">${clubPoints}</div>
          <div style="font-size: 12px; color: #88a; margin-top: 5px;">Club Points</div>
        </div>
      </div>

      <!-- Description -->
      <div style="background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid #2a3e3b; margin-bottom: 25px; max-width: 900px; margin-left: auto; margin-right: auto;">
        <h4 style="color: #81b64c; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">About Club</h4>
        <p style="color: #bbb; font-size: 13px; line-height: 1.6; margin: 0;">
          Welcome to the official ${countryName} Chess Club! We are a community of passionate chess players dedicated to improving our skills, organizing tournaments, and promoting chess in ${countryName}. Join us to compete, learn, and connect!
        </p>
      </div>

       <!-- Action Buttons - Bitta qatorda -->
       <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 25px; max-width: 600px; margin-left: auto; margin-right: auto;">
         <button id="clubDetailJoinBtn" onclick="joinLeaveFromClubPage('${countryName}', '${countryCode}')" style="
           padding: 12px;
           background: ${isJoined ? '#3b1e1e' : '#81b64c'};
           color: ${isJoined ? '#ff9999' : '#111'};
           border: 1px solid ${isJoined ? '#522b2b' : '#81b64c'};
           border-radius: 8px;
           font-weight: bold;
           font-size: 13px;
           cursor: pointer;
           transition: all 0.2s;
         ">${isJoined ? 'Leave Club' : 'Join Club'}</button>
         <button onclick="showClubLeaderboard('${countryName}')" style="
           padding: 12px;
           background: #2a3e3b;
           color: #fff;
           border: 1px solid #3d5a56;
           border-radius: 8px;
           font-weight: bold;
           font-size: 13px;
           cursor: pointer;
           transition: all 0.2s;
         ">📊 Leaderboard</button>
         <button onclick="showClubTournaments('${countryName}')" style="
           padding: 12px;
           background: #2a3e3b;
           color: #fff;
           border: 1px solid #3d5a56;
           border-radius: 8px;
           font-weight: bold;
           font-size: 13px;
           cursor: pointer;
           transition: all 0.2s;
         ">🏆 Tournaments</button>
          <button onclick="showClubHistory('${countryName}')" style="
            padding: 12px;
            background: #2a3e3b;
            color: #fff;
            border: 1px solid #3d5a56;
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          ">📜 History</button>
         <button onclick="showClubChat('${countryName}', '${countryCode}')" style="
           padding: 12px;
           background: #2a3e3b;
           color: #fff;
           border: 1px solid #3d5a56;
           border-radius: 8px;
           font-weight: bold;
           font-size: 13px;
           cursor: pointer;
           transition: all 0.2s;
         ">💬 Club Chat</button>
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
         ">📋 All Clubs</button>
       </div>

        <!-- Top Players -->
        <div style="background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid #2a3e3b; max-width: 900px; margin: 0 auto;">
          <h4 style="color: #81b64c; font-size: 13px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">Top Players</h4>
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

// Klub a'zolari ro'yxatini olish (join sanalari bilan)
function getClubMembers(countryName) {
  if (!countryName) return [];
  const key = "justChessClubMembers_" + countryName;
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function addClubMember(countryName, username, joinDate) {
  if (!countryName || !username) return;
  const key = "justChessClubMembers_" + countryName;
  const members = JSON.parse(localStorage.getItem(key) || "[]");
  if (!members.some(m => m.username === username)) {
    members.push({ username, joinedAt: joinDate || new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(members));
  }
}

function removeClubMember(countryName, username) {
  if (!countryName || !username) return;
  const key = "justChessClubMembers_" + countryName;
  const members = JSON.parse(localStorage.getItem(key) || "[]");
  const filtered = members.filter(m => m.username !== username);
  localStorage.setItem(key, JSON.stringify(filtered));
}

// Club sahifasidan Join/Leave
window.joinLeaveFromClubPage = function(countryName, countryCode) {
  if (!window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
    switchView('login');
    return;
  }

  const userClubs = getUserClubs();
  const index = userClubs.indexOf(countryName);

  if (index === -1) {
    userClubs.push(countryName);
    saveUserClubs(userClubs);
    addClubMember(countryName, window.currentUser.username, new Date().toISOString());
    window.showJoinSuccessModal({ name: countryName, code: countryCode });
    // Sahifani qayta yuklash
    window.openClubDetail(countryName, countryCode);
  } else {
    userClubs.splice(index, 1);
    saveUserClubs(userClubs);
    removeClubMember(countryName, window.currentUser.username);
    // Sahifani qayta yuklash
    window.openClubDetail(countryName, countryCode);
  }
};

// Scroll to section (for Quick Links)
window.scrollToSection = function(sectionName) {
  // Simple alert for now - can be expanded for internal navigation
  // alert(`Scrolling to ${sectionName} section`);
};

// Invite friend to club
window.inviteFriendToClub = function(countryName) {
  const username = prompt(`Enter username to invite to ${countryName} Chess Club:`);
  if (username && username.trim()) {
    alert(`Invitation sent to ${username.trim()} for ${countryName} Chess Club!`);
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
      <h3 style="color: #81b64c; font-size: 20px; margin-bottom: 10px;">Welcome!</h3>
      <p style="color: #fff; font-size: 14px; margin-bottom: 5px;">You have successfully joined</p>
      <p style="color: #81b64c; font-size: 16px; font-weight: bold; margin-bottom: 20px;">
        <img src="https://flagcdn.com/w40/${country.code}.png" style="vertical-align: middle; margin-right: 8px; border-radius: 3px; width: 30px; height: 20px;">
        ${country.name} Chess Club
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

window.loadClubs = function() {
  const container = document.getElementById('clubsListContainer');
  if (!container) return;

  const userClubs = getUserClubs();

  let htmlContent = '';
  getActiveCountries().forEach(country => {
    const stats = getClubStats(country.name);
    const isJoined = userClubs.includes(country.name);

    htmlContent += `
      <div class="country-stamp ${isJoined ? 'joined' : ''}" onclick="openClubDetail('${country.name}', '${country.code}')">
        <div class="stamp-perforation"></div>
        ${isJoined ? '<div class="stamp-badge">✓</div>' : ''}
        <div class="stamp-inner">
          <div class="stamp-flag"><img src="https://flagcdn.com/w80/${country.code}.png" alt="${country.name}" style="width: 64px; height: 42px; border-radius: 3px; display: block;" loading="lazy"></div>
          <div class="stamp-country-name">${country.name}</div>
          <div class="stamp-members">${stats.members} members</div>
        </div>
        <button class="stamp-join-btn" onclick="event.stopPropagation(); openClubDetail('${country.name}', '${country.code}')">
          View
        </button>
      </div>
    `;
  });

  container.innerHTML = htmlContent;
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.filterCountries = debounce(function() {
  const query = document.getElementById('clubSearchInput').value.toLowerCase().trim();
  const container = document.getElementById('clubsListContainer');
  if (!container) return;

  const userClubs = getUserClubs();
  const baseCountries = getActiveCountries();
  const filtered = query
    ? baseCountries.filter(c => c.name.toLowerCase().includes(query))
    : baseCountries;

  if (filtered.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 30px;">No countries found</div>';
    return;
  }

  let htmlContent = '';
  filtered.forEach(country => {
    const stats = getClubStats(country.name);
    const isJoined = userClubs.includes(country.name);
    const safeName = escapeHtml(country.name);
    const safeCode = escapeHtml(country.code);

    htmlContent += `
      <div class="country-stamp ${isJoined ? 'joined' : ''}" onclick="openClubDetail('${safeName}', '${safeCode}')">
        <div class="stamp-perforation"></div>
        ${isJoined ? '<div class="stamp-badge">✓</div>' : ''}
        <div class="stamp-inner">
          <div class="stamp-flag"><img src="https://flagcdn.com/w80/${safeCode}.png" alt="${safeName}" style="width: 64px; height: 42px; border-radius: 3px; display: block;" loading="lazy"></div>
          <div class="stamp-country-name">${safeName}</div>
          <div class="stamp-members">${stats.members} members</div>
        </div>
        <button class="stamp-join-btn" onclick="event.stopPropagation(); openClubDetail('${safeName}', '${safeCode}')">
          View
        </button>
      </div>
    `;
  });

  container.innerHTML = htmlContent;
}, 300);

window.showCreateTournamentModal = function() {
  if (!window.currentUser) {
    alert('Please log in first!');
    switchView('login');
    return;
  }
  const modal = document.getElementById('createTournamentModal');
  if (modal) modal.style.display = 'flex';
};

window.hideCreateTournamentModal = function() {
  const modal = document.getElementById('createTournamentModal');
  if (modal) modal.style.display = 'none';
};

window.createTournamentFromModal = async function() {
  const name = document.getElementById('tournamentNameInput').value.trim();
  const type = document.getElementById('tournamentTypeInput').value;
  const tc = document.getElementById('tournamentTCInput').value;
  const maxPlayers = parseInt(document.getElementById('tournamentMaxPlayers').value) || 16;

  if (!name || name.length < 3) {
    alert('Tournament name must be at least 3 characters!');
    return;
  }

  try {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        name,
        description: '',
        maxPlayers: Math.max(2, Math.min(64, maxPlayers)),
        tournamentType: type,
        timeControl: tc,
        rounds: type === 'individual' ? (tc.includes('Bullet') ? 9 : tc.includes('Blitz') ? 7 : 5) : 7
      })
    });
    const data = await res.json();
    if (data.success) {
      hideCreateTournamentModal();
      alert('Tournament created!');
      loadTournaments();
    } else {
      alert(data.message || 'Failed to create tournament');
    }
  } catch (err) {
    console.error('Create tournament error:', err);
    alert('Server connection failed');
  }
};

window.loadArenas = function() {
  const container = document.getElementById('arenaContainer');
  if (!container) return;

  fetch('/api/tournaments/arenas')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (!data || !data.success) {
        container.innerHTML = '';
        return;
      }
      const tc = data.timeControl;
      const arena = data.currentArena;
      const timeUntilNext = data.timeUntilNext || 0;

      const players = arena ? (arena.current_players || 0) : 0;
      const joinBtn = arena
         ? `<button class="form-submit" onclick="joinTournament('${arena.id}')" style="padding: 10px 22px; font-size: 14px;">Join Arena</button>`
        : '';

      container.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(129,182,76,0.12), rgba(52,152,219,0.12)); border: 1px solid rgba(129,182,76,0.4); border-radius: 12px; padding: 16px; position: relative; overflow: hidden;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 11px; color: #88a; text-transform: uppercase; letter-spacing: 1px;">🕒 24/7 Arena</div>
              <div style="font-size: 18px; font-weight: bold; color: #81b64c; margin-top: 2px;">${tc.icon} ${tc.name} <span style="color:#aaa; font-size: 13px;">(${tc.code})</span></div>
              <div style="font-size: 12px; color: #bbb; margin-top: 4px;">${players} players • ${tc.rounds} rounds • Next: <span id="arenaCountdown">${formatArenaCountdown(timeUntilNext)}</span></div>
            </div>
            ${joinBtn}
          </div>
        </div>
      `;
      startArenaCountdown(timeUntilNext);
    })
    .catch(err => {
      console.error('Arena yuklash xatoligi:', err);
      container.innerHTML = '';
    });
};

function formatArenaCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

let arenaCountdownInterval = null;
function startArenaCountdown(initialMs) {
  if (arenaCountdownInterval) clearInterval(arenaCountdownInterval);
  let remaining = initialMs;
  const el = document.getElementById('arenaCountdown');
  if (!el) return;
  arenaCountdownInterval = setInterval(() => {
    remaining -= 1000;
    if (remaining <= 0) {
      clearInterval(arenaCountdownInterval);
      if (typeof window.loadArenas === 'function') window.loadArenas();
      if (typeof window.loadTournaments === 'function') window.loadTournaments();
      return;
    }
    const cdEl = document.getElementById('arenaCountdown');
    if (cdEl) cdEl.textContent = formatArenaCountdown(remaining);
  }, 1000);
}

window.loadTournaments = function() {
  const container = document.getElementById('tournamentsListContainer');
  if (!container) return;

  if (typeof window.loadArenas === 'function') window.loadArenas();
  if (typeof window.loadTeamTournaments === 'function') window.loadTeamTournaments();

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Loading...</div>';
   
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
            <button class="form-submit" onclick="joinTournament('${tournament.id}')" style="padding: 6px 12px; font-size: 12px;">Join</button>
            <button class="control-btn" onclick="openTournamentDetail('${tournament.id}')" style="padding: 6px 12px; font-size: 12px;">View</button>
          `;
        }

        htmlContent += `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(255,255,255,0.05); padding: 12px 15px; border-radius: 8px;">
            <div style="min-width: 0;">
              <b style="font-size: 14px; color: #fff; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px;">${tournament.name}</b>
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
      container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Yuklashda xatolik yuz berdi</div>';
    });
};

window.joinTournament = function(tournamentId) {
  if (!window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
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
      alert('Joined tournament!');
      loadTournaments();
    } else {
      alert(data.message || 'Xatolik yuz berdi!');
    }
  })
  .catch(err => {
    console.error('Join tournament xatoligi:', err);
    alert('Serverga ulanib bo\'lmadi!');
  });
};

window.sendFriendRequest = function() {
  if (!window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
    switchView('login');
    return;
  }
  
  const username = document.getElementById('friendUsernameInput').value.trim();
  if (!username) {
    alert('Do\'stingiz nomini kiriting!');
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
      alert('Do\'stlik so\'rovi yuborildi!');
      document.getElementById('friendUsernameInput').value = '';
    } else {
      alert(data.message || 'Xatolik yuz berdi!');
    }
  })
  .catch(err => {
    console.error('Send friend request xatoligi:', err);
    alert('Serverga ulanib bo\'lmadi!');
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
      container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">So\'rovlar yo\'q</div>';
      return;
    }
    
    let htmlContent = '<div style="font-size: 14px; color: #fff; margin-bottom: 10px; font-weight: bold;">Do\'stlik so\'rovlari:</div>';
    data.requests.forEach(request => {
      htmlContent += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px;">
          <div>
            <b style="font-size: 14px; color: #fff;">${request.username}</b>
            <span style="font-size: 11px; color: #88a;">Reyting: ${request.rating || 1500}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="form-submit" onclick="acceptFriendRequest('${request.id}')" style="padding: 4px 10px; font-size: 12px; background: #2ecc71;">
              Qabul
            </button>
            <button class="action-btn" onclick="declineFriendRequest('${request.id}')" style="padding: 4px 10px; font-size: 12px; background: #e74c3c;">
              Rad
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
      alert('Do\'stlik qabul qilindi!');
      loadFriendRequests();
      loadFriendsList();
    } else {
      alert(data.message || 'Xatolik yuz berdi!');
    }
  })
  .catch(err => {
    console.error('Accept friend request xatoligi:', err);
  });
};

window.loadFriendsList = function() {
  const container = document.getElementById('friendsListContainer');
  if (!container) return;
  
  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Loading...</div>';
  
  fetch('/api/friends', {
    headers: { 'Authorization': `Bearer ${window.authToken}` }
  })
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      if (!data.success || !data.friends || data.friends.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Do\'stlar ro\'yxati bo\'sh</div>';
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
                <b style="font-size: 14px; color: #fff; display: block;">${friend.username}</b>
                <span style="font-size: 11px; color: #88a;">Reyting: ${friend.rating || 1500}</span>
              </div>
            </div>
            <button class="form-submit" onclick="startChatWith('${friend.id}', '${friend.username}')" style="padding: 6px 12px; font-size: 12px;">
              Chat
            </button>
          </div>
        `;
      });
      
      container.innerHTML = htmlContent;
    })
    .catch(err => {
      console.error('Load friends list xatoligi:', err);
      container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Yuklashda xatolik yuz berdi</div>';
    });
};

window.startChatWith = function(userId, username) {
  switchView('chat');
  document.getElementById('chatRoomSelect').value = `user_${userId}`;
  loadChatMessages();
};

window.showCreateClubModal = function() {
  // Deprecated - clubs are now country-based only
};

window.loadChatMessages = function() {
  const container = document.getElementById('chatMessagesContainer');
  const roomId = document.getElementById('chatRoomSelect').value;
  
  if (!roomId) {
    container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Xona tanlang</div>';
    return;
  }
  
  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Loading...</div>';
  
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
        container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Xabarlar yo\'q</div>';
        return;
      }
      
      let htmlContent = '';
      data.messages.forEach(msg => {
        const isOwn = msg.sender_id === (window.currentUser?.id || 'guest');
        htmlContent += `
          <div style="text-align: ${isOwn ? 'right' : 'left'}; margin-bottom: 8px;">
            <div style="display: inline-block; background: ${isOwn ? '#2ecc71' : '#2a3e3b'}; color: #fff; padding: 8px 12px; border-radius: 8px; max-width: 70%; text-align: left;">
              <div style="font-size: 11px; color: #88a; margin-bottom: 4px;">${msg.username || msg.sender_username || 'Foydalanuvchi'}</div>
              <div style="font-size: 13px;">${msg.message}</div>
            </div>
          </div>
        `;
      });
      
      container.innerHTML = htmlContent;
      container.scrollTop = container.scrollHeight;
    })
    .catch(err => {
      console.error('Load chat messages xatoligi:', err);
      container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Yuklashda xatolik yuz berdi</div>';
    });
};

window.sendChatMessage = function() {
  const input = document.getElementById('chatMessageInput');
  const message = input.value.trim();
  const roomId = document.getElementById('chatRoomSelect').value;
  
  if (!message) return;
  if (!roomId && !window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
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
      alert(data.message || 'Xatolik yuz berdi!');
    }
  })
  .catch(err => {
    console.error('Send chat message xatoligi:', err);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const chatRoomSelect = document.getElementById('chatRoomSelect');
  if (chatRoomSelect) {
    chatRoomSelect.innerHTML = '<option value="">Xona tanlang</option>';
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

// Klub reyting jadvali - faqat klub a'zolari
window.showClubLeaderboard = function(countryName) {
  window.currentClubName = countryName;
  const container = document.getElementById("clubLeaderboardContainer");
  if (!container) return;

  const titleEl = document.getElementById("clubLeaderboardTitle");
  if (titleEl) titleEl.textContent = `${countryName} Club Leaderboard`;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Loading...</div>';

  fetch('/api/leaderboard')
    .then(res => res.ok ? res.json() : null)
    .then(apiData => {
      const userClubs = JSON.parse(localStorage.getItem("justChessUserClubs") || "{}");
      const allUsers = JSON.parse(localStorage.getItem("justChessAllUsers") || "[]");
      const currentUser = JSON.parse(localStorage.getItem("justChessCurrentUser")) || null;

      // Klubga qo'shilgan foydalanuvchilar ro'yxati
      const clubMemberUsernames = new Set();
      for (const username in userClubs) {
        if (userClubs[username] && userClubs[username].includes(countryName)) {
          clubMemberUsernames.add(username);
        }
      }
      if (currentUser && (userClubs[currentUser.username] || []).includes(countryName)) {
        clubMemberUsernames.add(currentUser.username);
      }

      // API yoki localStorage'dan foydalanuvchilarni olish
      const memberMap = {};

      if (apiData && apiData.success && apiData.leaderboard) {
        apiData.leaderboard.forEach(u => {
          if (clubMemberUsernames.has(u.username)) {
            memberMap[u.username] = {
              username: u.username,
              rating: u.rating || 1500,
              wins: u.wins || 0,
              losses: u.losses || 0,
              draws: u.draws || 0
            };
          }
        });
      }

      // localStorage'dan qolgan a'zolarni qo'shish
      allUsers.forEach(u => {
        if (clubMemberUsernames.has(u.username) && !memberMap[u.username]) {
          memberMap[u.username] = {
            username: u.username,
            rating: u.rating || 1500,
            wins: u.stats?.wins || 0,
            losses: u.stats?.losses || 0,
            draws: u.stats?.draws || 0
          };
        }
      });

      // Joriy foydalanuvni ham qo'shish
      if (currentUser && clubMemberUsernames.has(currentUser.username) && !memberMap[currentUser.username]) {
        memberMap[currentUser.username] = {
          username: currentUser.username,
          rating: currentUser.rating || 1500,
          wins: currentUser.stats?.wins || 0,
          losses: currentUser.stats?.losses || 0,
          draws: currentUser.stats?.draws || 0
        };
      }

      const clubMembers = Object.values(memberMap).sort((a, b) => b.rating - a.rating);

      if (clubMembers.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Hozircha klub a\'zolari yo\'q. Birinchi bo\'lib qo\'shiling!</div>';
        return;
      }

      let htmlContent = "";
      clubMembers.forEach((member, index) => {
        const firstLetter = member.username ? member.username.charAt(0).toUpperCase() : "U";
        let badgeColor = "#555";
        if (index === 0) badgeColor = "#f1c40f";
        else if (index === 1) badgeColor = "#bdc3c7";
        else if (index === 2) badgeColor = "#e67e22";

        htmlContent += `
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 14px; font-weight: bold; width: 22px; text-align: center; color: ${badgeColor};">#${index + 1}</span>
              <div style="width: 35px; height: 35px; font-size: 15px; display: flex; align-items: center; justify-content: center; background: #81b64c; border-radius: 50%; color: white; font-weight: bold;">${firstLetter}</div>
              <b style="font-size: 14px; color: #fff;">${member.username}</b>
            </div>
            <div style="display: flex; gap: 15px; font-size: 12px; text-align: right;">
              <span style="color: #81b64c; font-weight: bold;">${member.rating}</span>
              <span style="color: #2ecc71;">🏆 ${member.wins}</span>
              <span style="color: #e74c3c;">❌ ${member.losses}</span>
              <span style="color: #e6b800;">🤝 ${member.draws}</span>
            </div>
          </div>
        `;
      });

      container.innerHTML = htmlContent;
      switchViewToClubLeaderboard();
    })
    .catch(err => {
      console.error('Club leaderboard API xatoligi:', err);
      // Fallback to pure localStorage
      const userClubs = JSON.parse(localStorage.getItem("justChessUserClubs") || "{}");
      const allUsers = JSON.parse(localStorage.getItem("justChessAllUsers") || "[]");
      const currentUser = JSON.parse(localStorage.getItem("justChessCurrentUser")) || null;
      const clubMembers = [];

      Object.keys(userClubs).forEach(username => {
        if (userClubs[username] && userClubs[username].includes(countryName)) {
          const user = allUsers.find(u => u.username === username);
          if (user) {
            clubMembers.push({ username: user.username, rating: user.rating || 1500, wins: user.stats?.wins || 0, losses: user.stats?.losses || 0, draws: user.stats?.draws || 0 });
          }
        }
      });
      if (currentUser && (userClubs[currentUser.username] || []).includes(countryName) && !clubMembers.some(m => m.username === currentUser.username)) {
        clubMembers.push({ username: currentUser.username, rating: currentUser.rating || 1500, wins: currentUser.stats?.wins || 0, losses: currentUser.stats?.losses || 0, draws: currentUser.stats?.draws || 0 });
      }
      clubMembers.sort((a, b) => b.rating - a.rating);

      if (clubMembers.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Hozircha klub a\'zolari yo\'q. Birinchi bo\'lib qo\'shiling!</div>';
        return;
      }

      let htmlContent = "";
      clubMembers.forEach((member, index) => {
        const firstLetter = member.username ? member.username.charAt(0).toUpperCase() : "U";
        let badgeColor = "#555";
        if (index === 0) badgeColor = "#f1c40f";
        else if (index === 1) badgeColor = "#bdc3c7";
        else if (index === 2) badgeColor = "#e67e22";
        htmlContent += `
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 14px; font-weight: bold; width: 22px; text-align: center; color: ${badgeColor};">#${index + 1}</span>
              <div style="width: 35px; height: 35px; font-size: 15px; display: flex; align-items: center; justify-content: center; background: #81b64c; border-radius: 50%; color: white; font-weight: bold;">${firstLetter}</div>
              <b style="font-size: 14px; color: #fff;">${member.username}</b>
            </div>
            <div style="display: flex; gap: 15px; font-size: 12px; text-align: right;">
              <span style="color: #81b64c; font-weight: bold;">${member.rating}</span>
              <span style="color: #2ecc71;">🏆 ${member.wins}</span>
              <span style="color: #e74c3c;">❌ ${member.losses}</span>
              <span style="color: #e6b800;">🤝 ${member.draws}</span>
            </div>
          </div>
        `;
      });
      container.innerHTML = htmlContent;
      switchViewToClubLeaderboard();
    });
};

window.switchViewToClubLeaderboard = function() {
  document.querySelectorAll(".view-section").forEach((el) => el.classList.remove("active-view"));
  document.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));
  document.getElementById("clubLeaderboardView").classList.add("active-view");
  document.getElementById("navClubs").classList.add("active");
};

// Klub turnirlari - faqat bu klubga tegishli turnirlar
window.showClubTournaments = function(countryName) {
  window.currentClubName = countryName;
  const container = document.getElementById("clubTournamentsListContainer");
  if (!container) return;

  const titleEl = document.getElementById("clubTournamentsTitle");
  if (titleEl) titleEl.textContent = `${countryName} Club Tournaments`;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Loading...</div>';

  loadClubTournaments(countryName, container);
  switchViewToClubTournaments();
};

window.switchViewToClubTournaments = function() {
  document.querySelectorAll(".view-section").forEach((el) => el.classList.remove("active-view"));
  document.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));
  document.getElementById("clubTournamentsView").classList.add("active-view");
  document.getElementById("navClubs").classList.add("active");
};

window.loadClubTournaments = function(countryName, container) {
  if (!container) container = document.getElementById("clubTournamentsListContainer");
  if (!container) return;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Loading...</div>';

  // localStorage'dan klub turnirlarini olish
  const clubTournamentsKey = "justChessClubTournaments_" + countryName;
  const clubTournaments = JSON.parse(localStorage.getItem(clubTournamentsKey) || "[]");

  if (clubTournaments.length === 0) {
    container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Bu klubda hali turnirlar yo\'q. Birinchi turnirni yarating!</div>';
    return;
  }

  let htmlContent = "";
  clubTournaments.forEach(tournament => {
    htmlContent += `
      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 12px 15px; border-radius: 8px;">
        <div>
          <b style="font-size: 14px; color: #fff; display: block;">${tournament.name}</b>
          <span style="font-size: 11px; color: #88a;">${tournament.current_players || 0}/${tournament.max_players || 16} o\'yinchi • ${new Date(tournament.created_at).toLocaleDateString()}</span>
        </div>
        <button class="form-submit" onclick="joinClubTournament('${tournament.id}', '${countryName}')" style="padding: 6px 12px; font-size: 12px;">
          ${tournament.status === 'active' ? 'Oynatuvchi' : 'Qo\'shilish'}
        </button>
      </div>
    `;
  });
  container.innerHTML = htmlContent;
};

window.showCreateClubTournamentModal = function() {
  if (!window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
    switchView('login');
    return;
  }

  const name = prompt('Enter tournament name:');
  if (!name || name.trim().length < 3) {
    alert('Tournament name must be at least 3 characters!');
    return;
  }
  
  const maxPlayers = prompt('Maximum number of players (2-64):', '16');
  const maxPlayersNum = parseInt(maxPlayers) || 16;

  const clubTournamentsKey = "justChessClubTournaments_" + window.currentClubName;
  const clubTournaments = JSON.parse(localStorage.getItem(clubTournamentsKey) || "[]");

  const tournament = {
    id: 'club_t_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    description: '',
    max_players: Math.max(2, Math.min(64, maxPlayersNum)),
    current_players: 0,
    status: 'waiting',
    club_name: window.currentClubName,
    created_at: new Date().toISOString()
  };

  clubTournaments.push(tournament);
  localStorage.setItem(clubTournamentsKey, JSON.stringify(clubTournaments));

  loadClubTournaments(window.currentClubName);
   alert('Tournament created!');
};

window.joinClubTournament = function(tournamentId, countryName) {
  if (!window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
    switchView('login');
    return;
  }

  const clubTournamentsKey = "justChessClubTournaments_" + countryName;
  const clubTournaments = JSON.parse(localStorage.getItem(clubTournamentsKey) || "[]");
  const tournament = clubTournaments.find(t => t.id === tournamentId);

  if (!tournament) return;

  const participantsKey = "justChessClubTournamentParticipants_" + countryName;
  const participants = JSON.parse(localStorage.getItem(participantsKey) || "[]");

  if (participants.some(p => p.tournament_id === tournamentId && p.user_id === window.currentUser.id)) {
    alert('Siz allaqachon turnirdasiz!');
    return;
  }

  participants.push({
    tournament_id: tournamentId,
    user_id: window.currentUser.id,
    username: window.currentUser.username,
    joined_at: new Date().toISOString()
  });
  localStorage.setItem(participantsKey, JSON.stringify(participants));

  tournament.current_players = (tournament.current_players || 0) + 1;
  localStorage.setItem(clubTournamentsKey, JSON.stringify(clubTournaments));

  loadClubTournaments(countryName);
  alert('Turnirga qo\'shildingiz!');
};

// Klub chat - Chess.com uslubi
window.showClubChat = function(countryName, countryCode) {
  if (!window.currentUser) {
    alert('Chat uchun avval tizimga kirishingiz kerak!');
    switchView('login');
    return;
  }

  window.currentClubName = countryName;
  window.currentClubCode = countryCode;

  const titleEl = document.getElementById("clubChatTitle");
  if (titleEl) {
    const safeCountryName = escapeHtml(countryName);
    const safeCountryCode = escapeHtml(countryCode);
    titleEl.innerHTML = `<img src="https://flagcdn.com/w20/${safeCountryCode}.png" style="width: 20px; height: 14px; margin-right: 8px; border-radius: 2px;"> ${safeCountryName} Club Chat`;
  }

  const container = document.getElementById("clubChatMessagesContainer");
  if (!container) return;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Loading...</div>';

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

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Loading...</div>';

  fetch(url, {
    headers: window.authToken ? { 'Authorization': `Bearer ${window.authToken}` } : {}
  })
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      if (!data.success || !data.messages || data.messages.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Hali xabarlar yo\'q. Birinchi xabarni yuboring!</div>';
        return;
      }

      let htmlContent = '';
      const currentUserId = window.currentUser ? window.currentUser.id : 'guest';
      data.messages.forEach(msg => {
        const isOwn = String(msg.sender_id) === String(currentUserId);
        const time = new Date(msg.created_at || msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const authorName = msg.sender_username || (isOwn ? (window.currentUser ? window.currentUser.username : 'Siz') : 'Foydalanuvchi');
        
        htmlContent += `
          <div class="club-chat-message ${isOwn ? 'own' : 'other'}">
            <span class="club-chat-message-author">${authorName}</span>
            <div>${msg.message}</div>
            <div class="club-chat-message-time">${time}</div>
          </div>
        `;
      });

      container.innerHTML = htmlContent;
      container.scrollTop = container.scrollHeight;
    })
    .catch(err => {
      console.error('Klub chat xabarlari xatoligi:', err);
      container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Yuklashda xatolik yuzberdi</div>';
    });
};

window.sendClubChatMessage = function() {
  if (!window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
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
      alert(data.message || 'Xatolik yuzberdi!');
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
  const titleEl = document.getElementById("clubHistoryTitle");
  if (titleEl) titleEl.textContent = `${countryName} - A'zolar Tarixi`;

  const container = document.getElementById("clubHistoryContainer");
  if (!container) return;

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Loading...</div>';

  loadClubHistory(countryName, container);
  switchViewToClubHistory();
};

window.switchViewToClubHistory = function() {
  document.querySelectorAll(".view-section").forEach((el) => el.classList.remove("active-view"));
  document.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));
  document.getElementById("clubHistoryView").classList.add("active-view");
  document.getElementById("navClubs").classList.add("active");
};

window.loadClubHistory = function(countryName, container) {
  if (!container) container = document.getElementById("clubHistoryContainer");
  if (!container) return;

  const userClubs = JSON.parse(localStorage.getItem("justChessUserClubs") || "{}");
  const allUsers = JSON.parse(localStorage.getItem("justChessAllUsers") || "[]");
  const currentUser = JSON.parse(localStorage.getItem("justChessCurrentUser")) || null;
  const stats = getClubStats(countryName);

  // Klub a'zolari ro'yxati (join sanalari bilan)
  const storedMembers = getClubMembers(countryName);
  const memberUsernames = new Set(storedMembers.map(m => m.username));

  // Eski uslubdagi a'zolarni ham qo'shish
  for (const username in userClubs) {
    if (userClubs[username] && userClubs[username].includes(countryName) && !memberUsernames.has(username)) {
      storedMembers.push({ username, joinedAt: null });
      memberUsernames.add(username);
    }
  }
  if (currentUser && (userClubs[currentUser.username] || []).includes(countryName) && !memberUsernames.has(currentUser.username)) {
    storedMembers.push({ username: currentUser.username, joinedAt: null });
    memberUsernames.add(currentUser.username);
  }

  // Join sanasiga qarab saralash (yangidan eskiyga)
  storedMembers.sort((a, b) => {
    if (!a.joinedAt) return 1;
    if (!b.joinedAt) return -1;
    return new Date(b.joinedAt) - new Date(a.joinedAt);
  });

  if (storedMembers.length === 0) {
    container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Hali klubga a\'zolar yo\'q</div>';
    return;
  }

  let htmlContent = "";

  // Statistika kartochkalari
  htmlContent += `
    <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div style="background: rgba(129, 182, 76, 0.08); border: 1px solid rgba(129, 182, 76, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #81b64c;">${storedMembers.length}</div>
          <div style="font-size: 11px; color: #88a;">A'zolar</div>
        </div>
        <div style="background: rgba(52, 152, 219, 0.08); border: 1px solid rgba(52, 152, 219, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #3498db;">${stats.events}</div>
          <div style="font-size: 11px; color: #88a;">O'yinlar</div>
        </div>
        <div style="background: rgba(241, 196, 15, 0.08); border: 1px solid rgba(241, 196, 15, 0.3); border-radius: 10px; padding: 15px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #f1c40f;">${stats.points}</div>
          <div style="font-size: 11px; color: #88a;">Ballar</div>
        </div>
      </div>
    </div>
  `;

  // A'zolar ro'yxati
  htmlContent += `
    <div style="font-size: 13px; color: #88a; margin-bottom: 12px; font-weight: bold;">
      ${storedMembers.length} ta a'zolar (yangidan eskiyga)
    </div>
  `;

  storedMembers.forEach((member, index) => {
    const firstLetter = member.username ? member.username.charAt(0).toUpperCase() : "?";
    const joinDate = member.joinedAt
      ? new Date(member.joinedAt).toLocaleDateString('uz-UZ')
      : "Aniqlanmagan";
    const user = allUsers.find(u => u.username === member.username) || (currentUser && currentUser.username === member.username ? currentUser : null);
    const memberRating = user ? (user.rating || 1500) : 1500;
    const memberStats = user ? (user.stats || { wins: 0, losses: 0, draws: 0 }) : { wins: 0, losses: 0, draws: 0 };

    htmlContent += `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
        <div style="width: 36px; height: 36px; background: #81b64c; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">${firstLetter}</div>
        <div style="flex: 1;">
          <div style="font-size: 14px; color: #fff; font-weight: bold; display: flex; align-items: center; gap: 8px;">
            ${member.username}
            ${index === 0 ? '<span style="font-size: 11px; color: #f1c40f;">🥇</span>' : ''}
          </div>
          <div style="font-size: 11px; color: #88a;">
            Reyting: ${memberRating} • 🏆 ${memberStats.wins || 0} • ❌ ${memberStats.losses || 0} • 🤝 ${memberStats.draws || 0}
          </div>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">
            Joined: ${joinDate}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = htmlContent;
};

// ===== INDIVIDUAL TURNIR (SWISS) TAFSILOTI =====

window.openTournamentDetail = async function(tournamentId) {
  const view = document.getElementById('tournamentDetailView');
  const container = document.getElementById('tournamentDetailContainer');
  if (!view || !container) return;

  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active-view'));
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  view.classList.add('active-view');
  const navT = document.getElementById('navTournaments');
  if (navT) navT.classList.add('active');

  container.innerHTML = '<div style="font-size: 13px; color: #88a; text-align: center; padding: 20px;">Loading...</div>';

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

    const currentRound = tournament.current_round || 0;
    const maxRounds = tournament.rounds || 7;
    const typeLabel = tournament.tournament_type === 'team' ? 'Team'
      : (tournament.tournament_type === 'individual' ? 'Individual' : 'Arena');

    const roundMatches = matches.filter(m => m.round === currentRound && m.status !== 'bye');
    const byeMatches = matches.filter(m => m.round === currentRound && m.status === 'bye');

    let pairingsHTML = '';
    if (roundMatches.length === 0 && byeMatches.length === 0) {
      pairingsHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 15px;">No pairings generated yet</div>';
    } else {
      roundMatches.forEach(m => {
        const isPlayer = window.currentUser && (m.player1Id === window.currentUser.id || m.player2Id === window.currentUser.id);
         const p1 = m.player1Username || 'White';
        const p2 = m.player2Username || (m.player2Id ? 'Opponent' : '—')
        let resultBtns = '';
        if (isPlayer && m.status === 'active') {
          resultBtns = `
            <div style="display: flex; gap: 6px; margin-top: 8px;">
               <button class="action-btn" onclick="reportTournamentMatchResult('${tournamentId}', '${m.id}', 'white')" style="flex:1; font-size: 11px; padding: 6px 4px;">White wins</button>
              <button class="action-btn" onclick="reportTournamentMatchResult('${tournamentId}', '${m.id}', 'draw')" style="flex:1; font-size: 11px; padding: 6px 4px;">Draw</button>
              <button class="action-btn" onclick="reportTournamentMatchResult('${tournamentId}', '${m.id}', 'black')" style="flex:1; font-size: 11px; padding: 6px 4px;">Black wins</button>
            </div>`;
        } else if (m.status === 'completed') {
          const winnerName = m.winnerId === m.player1Id ? p1 : p2;
          resultBtns = `<div style="font-size: 11px; color: #81b64c; margin-top: 6px;">✓ ${winnerName} wins</div>`;
        }
        pairingsHTML += `
          <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; color: #81b64c; font-weight: bold; min-width: 18px;">#${m.board || (roundMatches.indexOf(m) + 1)}</span>
                <span style="font-size: 16px;">♔</span>
                <b style="font-size: 14px; color: #fff;">${p1}</b>
              </div>
              <span style="font-size: 12px; color: #88a;">vs</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <b style="font-size: 14px; color: #fff;">${p2}</b>
                <span style="font-size: 16px;">♚</span>
              </div>
            </div>
            ${resultBtns}
          </div>`;
      });
      byeMatches.forEach(m => {
        pairingsHTML += `<div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; color: #e6b800;">${m.player1Username || 'Player'} — Bye (+1)</div>`;
      });
    }

    let standingsHTML = '';
    standings.forEach((s, i) => {
      standingsHTML += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 22px; text-align: center; color: #81b64c; font-weight: bold;">#${i + 1}</span>
            <b style="font-size: 13px; color: #fff;">${s.username}</b>
          </div>
          <span style="color: #f1c40f; font-weight: bold;">${s.score}</span>
        </div>`;
    });
      if (standings.length === 0) standingsHTML = '<div style="font-size: 13px; color: #888; text-align:center; padding: 10px;">No participants yet</div>';

    const canGenerate = standings.length >= 2 && currentRound < maxRounds;

    container.innerHTML = `
      <div class="card-title" style="margin-bottom: 8px;">${tournament.name}</div>
      <div style="font-size: 12px; color: #88a; margin-bottom: 12px; text-align: center;">
        ${typeLabel} • ${tournament.time_control || '—'} • Round ${currentRound}/${maxRounds} • ${tournament.status}
      </div>
      <div style="margin-bottom: 15px; overflow: hidden;">
        <button class="control-btn" onclick="switchView('tournaments'); loadTournaments();" style="padding: 6px 14px; font-size: 12px; float: left;">← Back to Tournaments</button>
        ${canGenerate ? `<button class="form-submit" onclick="generateTournamentPairings('${tournamentId}')" style="padding: 8px 16px; font-size: 13px; float: right;">⚔️ Generate Next Round Pairings</button>` : ''}
      </div>
      <h4 style="color: #81b64c; font-size: 13px; margin: 25px 0 10px 0; text-transform: uppercase;">Round ${currentRound} Pairings</h4>
      <div style="margin-bottom: 20px;">${pairingsHTML}</div>
      <h4 style="color: #81b64c; font-size: 13px; margin: 0 0 10px 0; text-transform: uppercase;">Leaderboard</h4>
      <div>${standingsHTML}</div>
    `;
  } catch (err) {
    console.error('Tournament detail xatoligi:', err);
    container.innerHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 20px;">Yuklashda xatolik</div>';
  }
};

window.generateTournamentPairings = function(tournamentId) {
  if (!window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
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
        alert('Round ' + d.round + ' pairings generated!');
        window.openTournamentDetail(tournamentId);
      } else {
        alert(d.message || 'Xatolik yuz berdi!');
      }
    })
    .catch(err => {
      console.error('Pairings yaratish xatoligi:', err);
      alert('Serverga ulanib bo\'lmadi!');
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
        alert(d.message || 'Xatolik yuz berdi!');
      }
    })
    .catch(err => {
      console.error('Match result xatoligi:', err);
      alert('Serverga ulanib bo\'lmadi!');
    });
};

// ===== JAMOA VS JAMOA (COUNTRY VS COUNTRY) =====

window.showCreateTeamTournamentModal = function() {
  if (!window.currentUser) {
    alert('Avval tizimga kirishingiz kerak!');
    switchView('login');
    return;
  }

  const selectA = document.getElementById('teamTournamentA');
  const selectB = document.getElementById('teamTournamentB');
  if (selectA && selectB) {
    const allCountries = (typeof continentCountries !== 'undefined') ? continentCountries.All : [];
    selectA.innerHTML = '';
    selectB.innerHTML = '';
    allCountries.forEach(c => {
      selectA.innerHTML += `<option value="${c.name}">${c.name}</option>`;
      selectB.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    });
    if (selectB.options.length > 1) selectB.selectedIndex = 1;
  }

  const modal = document.getElementById('teamTournamentModal');
  if (modal) modal.style.display = 'flex';
};

window.hideTeamTournamentModal = function() {
  const modal = document.getElementById('teamTournamentModal');
  if (modal) modal.style.display = 'none';
};

function getCountryMembers(countryName) {
  const members = [];
  const stored = JSON.parse(localStorage.getItem('justChessClubMembers_' + countryName) || '[]');
  stored.forEach(m => { if (!members.includes(m.username)) members.push(m.username); });

  const userClubs = JSON.parse(localStorage.getItem('justChessUserClubs') || '{}');
  const currentUser = JSON.parse(localStorage.getItem('justChessCurrentUser'));
  if (currentUser && (userClubs[currentUser.username] || []).includes(countryName) && !members.includes(currentUser.username)) {
    members.push(currentUser.username);
  }

  const allUsers = JSON.parse(localStorage.getItem('justChessAllUsers') || '[]');
  return members.map(username => {
    const u = allUsers.find(x => x.username === username) || (currentUser && currentUser.username === username ? currentUser : null);
    return { userId: username, username, rating: u ? (u.rating || 1500) : 1500 };
  });
}

window.createTeamTournament = async function() {
  const name = document.getElementById('teamTournamentName').value.trim();
  const teamA = document.getElementById('teamTournamentA').value;
  const teamB = document.getElementById('teamTournamentB').value;
  const tc = document.getElementById('teamTournamentTC').value;

  if (!name) { alert('Please enter a tournament name!'); return; }
  if (!teamA || !teamB || teamA === teamB) { alert('Select both teams (different countries)!'); return; }

  const membersA = getCountryMembers(teamA);
  const membersB = getCountryMembers(teamB);
  if (membersA.length === 0 || membersB.length === 0) {
    alert('Each team must have at least 1 member (join a club first)!');
    return;
  }

  let matchups = [];
  try {
    const res = await fetch('/api/tournaments/team-pairings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.authToken}` },
      body: JSON.stringify({ teamA: membersA, teamB: membersB, round: 1 })
    });
    const data = await res.json();
    matchups = data.success ? data.matchups : [];
  } catch (err) {
    console.error('Team pairings xatoligi:', err);
  }

  if (!matchups || matchups.length === 0) {
    alert('Pairings could not be generated!');
    return;
  }

  const tournament = {
    id: 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name,
    teamA, teamB,
    timeControl: tc,
    round: 1,
    status: 'active',
    matchups: matchups.map(m => ({
      board: m.board,
      teamAPlayerId: m.teamAPlayerId,
      teamBPlayerId: m.teamBPlayerId,
      teamARating: m.teamARating,
      teamBRating: m.teamBRating,
      games: m.games.map(g => ({
        matchId: g.matchId,
        gameNum: g.gameNum,
        whiteId: g.whiteId,
        blackId: g.blackId,
        result: null
      }))
    })),
    teamScoreA: 0,
    teamScoreB: 0
  };

  const list = JSON.parse(localStorage.getItem('justChessTeamTournaments') || '[]');
  list.push(tournament);
  localStorage.setItem('justChessTeamTournaments', JSON.stringify(list));

  // Also store on server (for API listing)
  fetch('/api/tournaments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.authToken}` },
    body: JSON.stringify({
      name,
      tournamentType: 'team',
      timeControl: tc,
      maxPlayers: membersA.length + membersB.length,
      clubIdA: teamA,
      clubIdB: teamB
    })
  }).catch(() => {});

  hideTeamTournamentModal();
  openTeamTournament(tournament.id);
};

window.openTeamTournament = function(tournamentId) {
  const view = document.getElementById('teamTournamentView');
  const container = document.getElementById('teamTournamentContainer');
  if (!view || !container) return;

  const list = JSON.parse(localStorage.getItem('justChessTeamTournaments') || '[]');
  const tournament = list.find(t => t.id === tournamentId);
  if (!tournament) {
    alert('Tournament not found!');
    switchView('tournaments');
    return;
  }

  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active-view'));
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  view.classList.add('active-view');
  const navT = document.getElementById('navTournaments');
  if (navT) navT.classList.add('active');

  let matchupsHTML = '';
  tournament.matchups.forEach((m, boardIdx) => {
    const aName = m.teamAPlayerId || 'A';
    const bName = m.teamBPlayerId || 'B';
    let gamesHTML = '';
    m.games.forEach((g, gameIdx) => {
      const whiteName = g.whiteId || '?';
      const blackName = g.blackId || '?';
      let resultBtns = '';
      if (!g.result) {
        resultBtns = `
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button class="action-btn" onclick="reportTeamGameResult('${tournamentId}', ${boardIdx}, ${gameIdx}, 'white')" style="flex:1; font-size: 10px; padding: 5px 3px;">${whiteName} wins</button>
            <button class="action-btn" onclick="reportTeamGameResult('${tournamentId}', ${boardIdx}, ${gameIdx}, 'draw')" style="flex:1; font-size: 10px; padding: 5px 3px;">Draw</button>
            <button class="action-btn" onclick="reportTeamGameResult('${tournamentId}', ${boardIdx}, ${gameIdx}, 'black')" style="flex:1; font-size: 10px; padding: 5px 3px;">${blackName} wins</button>
          </div>`;
      } else {
        const winner = g.result === 'draw' ? 'Draw' : (g.result === 'white' ? whiteName : blackName);
        resultBtns = `<div style="font-size: 11px; color: #81b64c; margin-top: 6px;">✓ ${winner}</div>`;
      }
      gamesHTML += `
        <div style="background: rgba(255,255,255,0.04); padding: 8px 10px; border-radius: 6px; margin-top: 6px;">
          <div style="font-size: 12px; color: #ccc;">Game ${g.gameNum}: <b style="color:#fff;">${whiteName}</b> (White) vs <b style="color:#fff;">${blackName}</b> (Black)</div>
          ${resultBtns}
        </div>`;
    });

    matchupsHTML += `
      <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
        <div style="font-size: 13px; font-weight: bold; color: #81b64c; margin-bottom: 4px;">Board ${m.board}: ${aName} (${m.teamARating || 1500}) vs ${bName} (${m.teamBRating || 1500})</div>
        ${gamesHTML}
      </div>`;
  });

  if (tournament.matchups.length === 0) {
    matchupsHTML = '<div style="font-size: 13px; color: #888; text-align: center; padding: 15px;">No matchups</div>';
  }

  container.innerHTML = `
    <div class="card-title" style="margin-bottom: 8px;">${tournament.name}</div>
    <div style="display: flex; align-items: center; justify-content: space-around; margin-bottom: 15px; padding: 12px; background: rgba(129,182,76,0.08); border-radius: 10px;">
      <div style="text-align: center;">
        <div style="font-size: 14px; font-weight: bold; color: #fff;">${tournament.teamA}</div>
        <div style="font-size: 28px; font-weight: bold; color: #81b64c;">${tournament.teamScoreA}</div>
      </div>
      <div style="font-size: 18px; color: #88a;">vs</div>
      <div style="text-align: center;">
        <div style="font-size: 14px; font-weight: bold; color: #fff;">${tournament.teamB}</div>
        <div style="font-size: 28px; font-weight: bold; color: #e74c3c;">${tournament.teamScoreB}</div>
      </div>
    </div>
    <div style="font-size: 12px; color: #88a; text-align: center; margin-bottom: 12px;">${tournament.timeControl} • 2 games per board</div>
    <div style="margin-bottom: 15px;">
      <button class="control-btn" onclick="switchView('tournaments'); loadTournaments();" style="padding: 6px 14px; font-size: 12px;">← Back to Tournaments</button>
    </div>
    <h4 style="color: #81b64c; font-size: 13px; margin: 0 0 10px 0; text-transform: uppercase;">Boards and Games</h4>
    ${matchupsHTML}
  `;
};

window.reportTeamGameResult = function(tournamentId, boardIdx, gameIdx, result) {
  const list = JSON.parse(localStorage.getItem('justChessTeamTournaments') || '[]');
  const tournament = list.find(t => t.id === tournamentId);
  if (!tournament) return;

  const game = tournament.matchups[boardIdx].games[gameIdx];
  if (!game || game.result) return;
  game.result = result;

    // Recalculate team scores
  let scoreA = 0, scoreB = 0;
  tournament.matchups.forEach(m => {
    m.games.forEach(g => {
      if (!g.result) return;
      if (g.result === 'draw') {
        scoreA += 0.5; scoreB += 0.5;
      } else if (g.result === 'white') {
        if (g.whiteId === m.teamAPlayerId) scoreA += 1; else scoreB += 1;
      } else if (g.result === 'black') {
        if (g.blackId === m.teamAPlayerId) scoreA += 1; else scoreB += 1;
      }
    });
  });
  tournament.teamScoreA = scoreA;
  tournament.teamScoreB = scoreB;

  localStorage.setItem('justChessTeamTournaments', JSON.stringify(list));
  openTeamTournament(tournamentId);
};

window.loadTeamTournaments = function() {
  const container = document.getElementById('teamTournamentsListContainer');
  if (!container) return;
  const list = JSON.parse(localStorage.getItem('justChessTeamTournaments') || '[]');
  if (list.length === 0) {
    container.innerHTML = '';
    return;
  }
    let html = '<div style="font-size: 13px; color: #81b64c; font-weight: bold; margin-bottom: 8px;">⚔️ Country vs Country tournaments</div>';
  list.forEach(t => {
    const winner = t.teamScoreA > t.teamScoreB ? t.teamA : (t.teamScoreB > t.teamScoreA ? t.teamB : null);
    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px;">
        <div>
          <b style="font-size: 13px; color: #fff;">${t.teamA} ${t.teamScoreA} - ${t.teamScoreB} ${t.teamB}</b>
          <span style="font-size: 11px; color: #88a; display: block;">${t.name} ${winner ? '• Winner: ' + winner : ''}</span>
        </div>
        <button class="control-btn" onclick="openTeamTournament('${t.id}')" style="padding: 5px 12px; font-size: 12px;">Open</button>
      </div>`;
  });
  container.innerHTML = html;
};
