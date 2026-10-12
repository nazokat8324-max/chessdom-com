function updateRating(result) {
    if (typeof window.currentUser === 'undefined' || !window.currentUser) {
        console.log("Tizimga kirilmagan, reyting hisoblanmadi.");
        return;
    }

    if (typeof window.currentUser.rating === 'undefined') {
        window.currentUser.rating = 1500;
    }

    const opponentRating = window.opponentRating || 1500;
    // O'yin rejimi (rapid/blitz/bullet) va raqibning shu rejimdagi reytingi
    const timeControl = window.currentGameTimeControl || 'blitz';
    const opponentModeRating = (window.opponentRatingsByMode && window.opponentRatingsByMode[timeControl]) || null;

    // Yangi reytingni server hisoblaydi; klient faqat javobni ko'rsatadi
    fetch('/api/ratings/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authToken}`
        },
        body: JSON.stringify({ result, opponentRating, timeControl, opponentModeRating })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            window.currentUser.rating = data.newRating;
            if (data.ratingsByMode) window.currentUser.ratingsByMode = data.ratingsByMode;
            localStorage.setItem('justChessCurrentUser', JSON.stringify(window.currentUser));
            console.log(`Reyting o'zgardi: ${data.change >= 0 ? '+' + data.change : data.change}. Yangi reyting: ${data.newRating}`);
            updateRatingDisplay();
        }
    }).catch(err => console.error('Rating update xatoligi:', err));
}

// Serverdan joriy reyting va statistikani olib, profilni yangilash (boshqa qurilmada o'ynalgan bo'lsa ham)
function refreshCurrentUserRatings() {
    if (!window.currentUser || !window.currentUser.username) return Promise.resolve();
    return fetch('/api/stats/' + encodeURIComponent(window.currentUser.username))
        .then(res => res.json())
        .then(data => {
            if (!data.success) return;
            window.currentUser.rating = data.rating;
            if (data.ratingsByMode) window.currentUser.ratingsByMode = data.ratingsByMode;
            if (data.stats) window.currentUser.stats = data.stats;
            if (data.statsByMode) window.currentUser.statsByMode = data.statsByMode;
            localStorage.setItem('justChessCurrentUser', JSON.stringify(window.currentUser));
            updateRatingDisplay();
        })
        .catch(err => console.error('Reytingni yangilash xatoligi:', err));
}
window.refreshCurrentUserRatings = refreshCurrentUserRatings;

function updateRatingDisplay() {
    const currentRating = (window.currentUser && typeof window.currentUser.rating !== 'undefined') ? window.currentUser.rating : 1500;
    
    document.querySelectorAll('.user-rating-display').forEach(el => {
        el.textContent = `${tx('profLabelRating', 'Reyting:')} ${currentRating}`;
    });
    
    const profRatingElem = document.getElementById("profStatRating");
    if (profRatingElem) {
        profRatingElem.textContent = currentRating;
    }

    // Profil oynasi ochiq bo'lsa, rejim reytinglarini ham yangilash
    const profileModal = document.getElementById("profileModal");
    if (profileModal && profileModal.style.display === "flex" && typeof window.updateProfileModalData === 'function') {
        window.updateProfileModalData();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateRatingDisplay();
});
