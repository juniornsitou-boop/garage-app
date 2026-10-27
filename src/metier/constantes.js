'use strict';

/**
 * Répartition des postes et tarifs horaires de main d'oeuvre (F CFA, entiers).
 */
const CATEGORIES = Object.freeze({
  MECANIQUE: Object.freeze({ nombrePostes: 8, tarifHoraire: 10000, prefixe: 'MECA' }),
  ELECTRICITE: Object.freeze({ nombrePostes: 4, tarifHoraire: 12500, prefixe: 'ELEC' }),
  PNEUMATIQUE: Object.freeze({ nombrePostes: 3, tarifHoraire: 5000, prefixe: 'PNEU' }),
});

const NOMS_CATEGORIES = Object.freeze(Object.keys(CATEGORIES));

const STATUTS_POSTE = Object.freeze({
  LIBRE: 'LIBRE',
  OCCUPE: 'OCCUPE',
});

/** Durée de diagnostic offerte, en minutes. */
const DUREE_DIAGNOSTIC_OFFERT_MIN = 15;

const MS_PAR_MINUTE = 60 * 1000;
const MS_PAR_HEURE = 60 * MS_PAR_MINUTE;

module.exports = {
  CATEGORIES,
  NOMS_CATEGORIES,
  STATUTS_POSTE,
  DUREE_DIAGNOSTIC_OFFERT_MIN,
  MS_PAR_MINUTE,
  MS_PAR_HEURE,
};
