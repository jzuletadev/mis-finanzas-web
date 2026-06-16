// Catálogo de "artes" visuales seleccionables para tarjetas y cuentas.
// El id se guarda en backend (cards.card_art / accounts.account_art) y
// se usa como className (art-<id>) en dashboard.jsx — los colores de aquí
// deben mantenerse en sync con las reglas CSS .art-<id> de ese archivo.

export const CARD_ARTS = [
  { id: 'aurora', label: 'Aurora', colors: ['#1b1730', '#7c3aed', '#ec4899', '#22d3ee'] },
  { id: 'sunset', label: 'Atardecer', colors: ['#2b1320', '#f97316', '#fb7185', '#fbbf24'] },
  { id: 'ocean', label: 'Océano', colors: ['#0b2236', '#22d3ee', '#3b82f6', '#14b8a6'] },
];

export const ACCOUNT_ARTS = [
  { id: 'mint', label: 'Menta', colors: ['#cdf3e3', '#10b981', '#ffd9b3'] },
  { id: 'lavender', label: 'Lavanda', colors: ['#e2e3fb', '#6366f1', '#fbcfe8'] },
  { id: 'peach', label: 'Durazno', colors: ['#ffe3cc', '#fb923c', '#99f6e4'] },
];
