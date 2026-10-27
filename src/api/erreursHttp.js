'use strict';

/** Correspondance code d'erreur (métier ou validation) -> statut HTTP. */
const STATUT_PAR_CODE = Object.freeze({
  VALIDATION: 400,
  DONNEE_INVALIDE: 400,
  ORDRE_INTROUVABLE: 404,
  VEHICULE_INTROUVABLE: 404,
  POSTE_INDISPONIBLE: 409,
  VEHICULE_DEJA_EN_REPARATION: 409,
});

const MESSAGE_ERREUR_INTERNE = 'Une erreur interne est survenue. Veuillez réessayer.';

/** Traduit n'importe quelle erreur en { statut, code, message } sans exposer de détails internes. */
function traduireErreur(err) {
  if (err && STATUT_PAR_CODE[err.code]) {
    return { statut: STATUT_PAR_CODE[err.code], code: err.code, message: err.message };
  }
  if (err && err.type === 'entity.parse.failed') {
    return { statut: 400, code: 'JSON_INVALIDE', message: 'Le corps de la requête n\'est pas un JSON valide.' };
  }
  return { statut: 500, code: 'ERREUR_INTERNE', message: MESSAGE_ERREUR_INTERNE };
}

module.exports = { traduireErreur, STATUT_PAR_CODE };
