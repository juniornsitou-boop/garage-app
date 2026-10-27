'use strict';

const pad = (n) => String(n).padStart(2, '0');

/** Helpers Handlebars personnalisés. Reçoit l'instance Handlebars pour produire du HTML sûr. */
function creerHelpers(Handlebars) {
  return {
    /** 44500 -> "44 500 F CFA" (entier, séparateur de milliers). */
    formatMontant(montant) {
      if (montant === null || montant === undefined) return '-';
      return `${String(montant).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F CFA`;
    },

    /** Date -> "27/10/2026 15:30". */
    formatDate(valeur) {
      if (!valeur) return '-';
      const d = new Date(valeur);
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    /** 140 -> "2 h 20 min", 40 -> "40 min". */
    formatDuree(minutes) {
      if (minutes === null || minutes === undefined) return '-';
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return h > 0 ? `${h} h ${pad(m)} min` : `${m} min`;
    },

    /** Badge coloré LIBRE / OCCUPÉ. */
    badgeStatut(statut) {
      const libre = statut === 'LIBRE';
      return new Handlebars.SafeString(
        `<span class="badge ${libre ? 'badge-libre' : 'badge-occupe'}">${libre ? 'LIBRE' : 'OCCUPÉ'}</span>`
      );
    },

    /** Montant d'une ligne de pièce. */
    multiplier(a, b) {
      return a * b;
    },

    /** Pourcentage arrondi, pour les jauges du tableau de bord. */
    pourcentage(partie, total) {
      return total ? Math.round((partie / total) * 100) : 0;
    },

    eq(a, b) {
      return a === b;
    },
  };
}

module.exports = creerHelpers;
