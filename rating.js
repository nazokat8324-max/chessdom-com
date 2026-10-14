// Reyting va statistika faqat serverda hisoblanadi (o'yin tugaganda 'game-ended' bilan keladi)

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
            if (data.club !== undefined) window.currentUser.club = data.club;
            // Boshqa qurilmada rasm o'zgartirilgan bo'lsa ham yangilanadi
            if (data.avatarVersion !== undefined && data.avatarVersion !== window.currentUser.avatarVersion) {
                window.currentUser.avatarVersion = data.avatarVersion;
                if (typeof window.updateAuthHeaderUI === 'function') window.updateAuthHeaderUI();
            }
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
