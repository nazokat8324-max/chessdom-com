// 🎁 To'plamlar (2026-11-22, foydalanuvchi so'rovi): donalar + taxta + sayt rangi + orqa fon rasmi — bir bosishda.
// Har dona to'plamiga bittadan (15 ta). Fon rasmlari — img/backgrounds/<id>.svg (tools/make-backgrounds.js, o'zimiz chizgan).
// Nomlari dona to'plamlari nomi bilan bir xil (settings.js PIECES kalitlari). pages.test: dona/taxta/rang mavjud va fon fayli bor.
// UMD: brauzerda window.Bundles, testlarda require.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Bundles = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // [id (= dona to'plami va fon rasmi), taxta, sayt rangi]
  const BUNDLES = [
    ['karvon', 'desert', 'sand'],
    ['classic', 'tournament', 'jade'],
    ['clear', 'auto', 'graphite'],
    ['atlas', 'silk', 'plum'],
    ['rishton', 'rishton', 'ocean'],
    ['wood', 'wood', 'copper'],
    ['royal', 'marble', 'gold'],
    ['neon', 'ice', 'amethyst'],
    ['geo', 'malachite', 'jasper'],
    ['cute', 'suzani', 'rose'],
    ['pixel', 'felt', 'olive'],
    ['tanga', 'teahouse', 'sunset'],
    ['samarqand', 'koshin', 'turquoise'],
    ['origami', 'paper', 'ruby'],
    ['kosmos', 'night', 'lapis']
  ].map(([id, board, theme]) => ({ id, piece: id, board, theme, background: id }));
  const BACKGROUNDS = BUNDLES.map((b) => b.background);
  const byId = (id) => BUNDLES.find((b) => b.id === id) || null;
  // Joriy sozlamalarga to'liq mos to'plam (donalar, taxta, rang va fon) — bo'lmasa null («aralash»)
  const matching = (s) => BUNDLES.find((b) => s && s.pieceSet === b.piece && s.boardStyle === b.board && s.siteTheme === b.theme && s.background === b.background) || null;
  return { BUNDLES, BACKGROUNDS, byId, matching };
});
