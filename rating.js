function updateRating(result) {
    if (typeof window.currentUser === 'undefined' || !window.currentUser) {
        console.log("Tizimga kirilmagan, reyting hisoblanmadi.");
        return;
    }

    if (typeof window.currentUser.rating === 'undefined') {
        window.currentUser.rating = 1500;
    }

    const opponentRating = window.opponentRating || 1500;

    // Yangi reytingni server hisoblaydi; klient faqat javobni ko'rsatadi
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
            updateRatingDisplay();
        }
    }).catch(err => console.error('Rating update xatoligi:', err));
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
