// Profil: reyting o'zgarishi grafigi (Chart.js). Ma'lumot — ommaviy profildagi ratingHistory {rapid, blitz, bullet}.
(function () {
  const st = { history: null, mode: null, chart: null };

  function css(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function draw() {
    const box = document.querySelector('.profile-chart-box');
    const canvas = document.getElementById('profileRatingChart');
    if (!box || !canvas || typeof Chart === 'undefined') return;
    document.querySelectorAll('#profileChartTabs [data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === st.mode));
    const points = (st.history && st.history[st.mode]) || [];
    if (st.chart) { st.chart.destroy(); st.chart = null; }
    box.classList.toggle('empty', points.length < 2);
    if (points.length < 2) return;
    const accent = css('--accent', '#01ccd5');
    const rgb = css('--accent-rgb', '1, 204, 213');
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, box.clientHeight || 200);
    grad.addColorStop(0, `rgba(${rgb}, 0.35)`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    const labels = points.map(p => {
      const d = new Date(p.t);
      return isNaN(d) ? '' : d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    });
    st.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: points.map(p => p.r),
          borderColor: accent,
          backgroundColor: grad,
          fill: true,
          tension: 0.3,
          borderWidth: 2.5,
          pointRadius: points.length > 30 ? 0 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: accent
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: (items) => { const p = points[items[0].dataIndex]; const d = new Date(p.t); return isNaN(d) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); },
              label: (item) => tx('profChartPoint', 'Reyting: {{r}}', { r: item.parsed.y })
            }
          }
        },
        scales: {
          x: { ticks: { color: '#7f908a', maxTicksLimit: 6, font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: '#7f908a', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });
  }

  // Profil ochilganda (o'zimniki yoki boshqa o'yinchiniki): eng ko'p o'ynalgan rejim tanlanadi
  window.renderRatingChart = function (profile) {
    st.history = (profile && profile.ratingHistory) || null;
    const counts = ['rapid', 'blitz', 'bullet', 'chess960', 'shatranj'].map(m => [m, (st.history && st.history[m] || []).length]);
    counts.sort((a, b) => b[1] - a[1]);
    st.mode = counts[0][1] ? counts[0][0] : 'blitz';
    draw();
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#profileChartTabs [data-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; draw(); }));
  });
})();
