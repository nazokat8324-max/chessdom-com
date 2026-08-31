function calculateEloChange(playerRating, opponentRating, score, kFactor = 32) {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const newRating = Math.round(playerRating + kFactor * (score - expectedScore));
    return newRating - playerRating;
}

function updateRating(result) {
    if (typeof window.currentUser === 'undefined' || !window.currentUser) {
        console.log("Tizimga kirilmagan, reyting hisoblanmadi.");
        return;
    }

    if (typeof window.currentUser.rating === 'undefined') {
        window.currentUser.rating = 1500;
    }

    const opponentRating = window.opponentRating || 1500;
    let score = 0.5;
    if (result === 'win') {
        score = 1;
    } else if (result === 'loss') {
        score = 0;
    } else if (result === 'draw') {
        score = 0.5;
    }

    const ratingChange = calculateEloChange(window.currentUser.rating, opponentRating, score, 32);
    window.currentUser.rating += ratingChange;

    localStorage.setItem('justChessCurrentUser', JSON.stringify(window.currentUser));

    fetch('/api/ratings/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authToken}`
        },
        body: JSON.stringify({
            username: window.currentUser.username,
            result: result,
            opponentRating: opponentRating
        })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            window.currentUser.rating = data.newRating;
            localStorage.setItem('justChessCurrentUser', JSON.stringify(window.currentUser));
            console.log(`Reyting o'zgardi: ${data.change >= 0 ? '+' + data.change : data.change}. Yangi reyting: ${data.newRating}`);
        }
    }).catch(err => console.error('Rating update xatoligi:', err));

    updateRatingDisplay();
}

function updateRatingDisplay() {
    const currentRating = (window.currentUser && typeof window.currentUser.rating !== 'undefined') ? window.currentUser.rating : 1500;
    
    document.querySelectorAll('.user-rating-display').forEach(el => {
        el.textContent = `Reyting: ${currentRating}`;
    });
    
    const profRatingElem = document.getElementById("profStatRating");
    if (profRatingElem) {
        profRatingElem.textContent = currentRating;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateRatingDisplay();
});
