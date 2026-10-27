'use strict';

/**
 * Erreurs métier. Chaque erreur porte un code stable que la couche HTTP
 * traduit en statut (voir src/api/middlewares/gestionErreurs.js).
 */
class ErreurMetier extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

/** Aucun poste libre dans la catégorie demandée. */
class PosteIndisponibleError extends ErreurMetier {
  constructor(categorie) {
    super(`Aucun poste disponible dans la catégorie ${categorie}.`, 'POSTE_INDISPONIBLE');
  }
}

/** L'immatriculation a déjà un ordre de réparation en cours. */
class VehiculeDejaEnReparationError extends ErreurMetier {
  constructor(immatriculation) {
    super(
      `Le véhicule ${immatriculation} a déjà un ordre de réparation en cours.`,
      'VEHICULE_DEJA_EN_REPARATION'
    );
  }
}

/** Aucun ordre trouvé (par identifiant, ou ordre en cours pour une immatriculation). */
class OrdreIntrouvableError extends ErreurMetier {
  constructor(message) {
    super(message, 'ORDRE_INTROUVABLE');
  }
}

/** Aucun passage enregistré pour cette immatriculation. */
class VehiculeIntrouvableError extends ErreurMetier {
  constructor(immatriculation) {
    super(`Aucun passage enregistré pour le véhicule ${immatriculation}.`, 'VEHICULE_INTROUVABLE');
  }
}

/** Donnée d'entrée invalide (catégorie inconnue, montant non entier, dates incohérentes...). */
class DonneeInvalideError extends ErreurMetier {
  constructor(message) {
    super(message, 'DONNEE_INVALIDE');
  }
}

module.exports = {
  ErreurMetier,
  PosteIndisponibleError,
  VehiculeDejaEnReparationError,
  OrdreIntrouvableError,
  VehiculeIntrouvableError,
  DonneeInvalideError,
};
