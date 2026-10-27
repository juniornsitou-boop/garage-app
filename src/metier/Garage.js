'use strict';

const Poste = require('./Poste');
const Ordre = require('./Ordre');
const {
  CATEGORIES,
  NOMS_CATEGORIES,
  DUREE_DIAGNOSTIC_OFFERT_MIN,
  MS_PAR_MINUTE,
  MS_PAR_HEURE,
} = require('./constantes');
const {
  PosteIndisponibleError,
  VehiculeDejaEnReparationError,
  OrdreIntrouvableError,
  DonneeInvalideError,
} = require('./erreurs');

/**
 * Garage : gère les postes et les ordres de réparation.
 * Le stockage est injecté (repository) : cette classe ne connaît ni SQLite ni le disque.
 *
 * Contrat attendu du repository :
 *   chargerPostes() -> données[]       sauvegarderPostes(données[])
 *   chargerOrdres() -> données[]       sauvegarderOrdre(données)    mettreAJourOrdre(données)
 */
class Garage {
  constructor(repository) {
    if (!repository) {
      throw new Error('Garage : un repository doit être fourni (injection de dépendance).');
    }
    this.repository = repository;

    const postesStockes = repository.chargerPostes();
    if (postesStockes.length > 0) {
      this.postes = postesStockes.map(Poste.depuisDonnees);
    } else {
      this.postes = Garage.creerPostesInitiaux();
      this.#persisterPostes();
    }
    this.ordres = repository.chargerOrdres().map(Ordre.depuisDonnees);
  }

  /** Crée les 15 postes selon la répartition imposée (8 / 4 / 3). */
  static creerPostesInitiaux() {
    const postes = [];
    for (const [categorie, { nombrePostes, prefixe }] of Object.entries(CATEGORIES)) {
      for (let i = 1; i <= nombrePostes; i++) {
        postes.push(new Poste(`${prefixe}-${String(i).padStart(2, '0')}`, categorie));
      }
    }
    return postes;
  }

  // ---------------------------------------------------------------- opérations

  receptionnerVehicule(immatriculation, categorie, description, dateOuverture = new Date()) {
    const immat = normaliserImmatriculation(immatriculation);
    verifierCategorie(categorie);
    verifierTexteNonVide(description, 'La description de la panne');
    verifierDate(dateOuverture, "La date d'ouverture");

    if (this.#ordreEnCours(immat)) {
      throw new VehiculeDejaEnReparationError(immat);
    }
    const poste = this.postes.find((p) => p.categorie === categorie && p.estLibre());
    if (!poste) {
      throw new PosteIndisponibleError(categorie);
    }

    poste.occuper();
    const ordre = new Ordre({
      id: this.#prochainIdentifiant(),
      immatriculation: immat,
      categorie,
      description: description.trim(),
      posteId: poste.id,
      dateOuverture,
    });
    this.ordres.push(ordre);

    this.repository.sauvegarderOrdre(ordre.toJSON());
    this.#persisterPostes();
    return ordre;
  }

  ajouterPiece(immatriculation, designation, prixUnitaire, quantite) {
    const immat = normaliserImmatriculation(immatriculation);
    verifierTexteNonVide(designation, 'La désignation de la pièce');
    verifierEntier(prixUnitaire, 0, 'Le prix unitaire');
    verifierEntier(quantite, 1, 'La quantité');

    const ordre = this.#ordreEnCoursOuErreur(immat);
    ordre.ajouterPiece(designation.trim(), prixUnitaire, quantite);

    this.repository.mettreAJourOrdre(ordre.toJSON());
    return ordre;
  }

  /**
   * Clôture l'ordre en cours et libère le poste.
   * Renvoie l'ordre clôturé ; le montant total dû est dans ordre.montantTotal.
   */
  cloturerOrdre(immatriculation, dateCloture = new Date()) {
    const immat = normaliserImmatriculation(immatriculation);
    verifierDate(dateCloture, 'La date de clôture');

    const ordre = this.#ordreEnCoursOuErreur(immat);
    const montantMainOeuvre = this.calculerMainOeuvre(
      ordre.categorie,
      ordre.dateOuverture,
      dateCloture
    );
    ordre.cloturer(dateCloture, montantMainOeuvre);
    this.#trouverPoste(ordre.posteId).liberer();

    this.repository.mettreAJourOrdre(ordre.toJSON());
    this.#persisterPostes();
    return ordre;
  }

  /**
   * <= 15 minutes : gratuit (diagnostic offert).
   * Au-delà : chaque heure entamée est due, sans déduire les 15 minutes.
   */
  calculerMainOeuvre(categorie, dateOuverture, dateCloture) {
    verifierCategorie(categorie);
    verifierDate(dateOuverture, "La date d'ouverture");
    verifierDate(dateCloture, 'La date de clôture');

    const dureeMs = new Date(dateCloture) - new Date(dateOuverture);
    if (dureeMs < 0) {
      throw new DonneeInvalideError("La date de clôture est antérieure à la date d'ouverture.");
    }
    if (dureeMs <= DUREE_DIAGNOSTIC_OFFERT_MIN * MS_PAR_MINUTE) {
      return 0;
    }
    const heuresFacturees = Math.ceil(dureeMs / MS_PAR_HEURE);
    return heuresFacturees * CATEGORIES[categorie].tarifHoraire;
  }

  // ---------------------------------------------------------------- consultations

  postesDisponibles(categorie = null) {
    if (categorie !== null) {
      verifierCategorie(categorie);
    }
    return this.postes.filter((p) => p.estLibre() && (categorie === null || p.categorie === categorie))
      .length;
  }

  /** Ordres passés et en cours du véhicule, du plus ancien au plus récent. */
  historiqueVehicule(immatriculation) {
    const immat = normaliserImmatriculation(immatriculation);
    return this.ordres
      .filter((o) => o.immatriculation === immat)
      .sort((a, b) => a.dateOuverture - b.dateOuverture);
  }

  trouverOrdre(id) {
    const ordre = this.ordres.find((o) => o.id === id);
    if (!ordre) {
      throw new OrdreIntrouvableError(`Ordre de réparation ${id} introuvable.`);
    }
    return ordre;
  }

  /** Chaque poste avec l'immatriculation du véhicule qui l'occupe (ou null). */
  listerPostes(categorie = null) {
    if (categorie !== null) {
      verifierCategorie(categorie);
    }
    return this.postes
      .filter((p) => categorie === null || p.categorie === categorie)
      .map((p) => {
        const ordre = this.ordres.find((o) => o.posteId === p.id && o.estEnCours());
        return { ...p.toJSON(), immatriculation: ordre ? ordre.immatriculation : null };
      });
  }

  // ---------------------------------------------------------------- interne

  #ordreEnCours(immatriculation) {
    return this.ordres.find((o) => o.immatriculation === immatriculation && o.estEnCours());
  }

  #ordreEnCoursOuErreur(immatriculation) {
    const ordre = this.#ordreEnCours(immatriculation);
    if (!ordre) {
      throw new OrdreIntrouvableError(
        `Aucun ordre de réparation en cours pour le véhicule ${immatriculation}.`
      );
    }
    return ordre;
  }

  #trouverPoste(id) {
    return this.postes.find((p) => p.id === id);
  }

  #prochainIdentifiant() {
    const max = this.ordres.reduce((m, o) => Math.max(m, Number(o.id.replace('OR-', '')) || 0), 0);
    return `OR-${String(max + 1).padStart(5, '0')}`;
  }

  #persisterPostes() {
    this.repository.sauvegarderPostes(this.postes.map((p) => p.toJSON()));
  }
}

// ---------------------------------------------------------------- validations

function normaliserImmatriculation(immatriculation) {
  verifierTexteNonVide(immatriculation, "L'immatriculation");
  return immatriculation.trim().toUpperCase();
}

function verifierTexteNonVide(valeur, libelle) {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw new DonneeInvalideError(`${libelle} est obligatoire.`);
  }
}

function verifierCategorie(categorie) {
  if (!NOMS_CATEGORIES.includes(categorie)) {
    throw new DonneeInvalideError(
      `Catégorie "${categorie}" inconnue. Valeurs possibles : ${NOMS_CATEGORIES.join(', ')}.`
    );
  }
}

function verifierEntier(valeur, minimum, libelle) {
  if (!Number.isInteger(valeur) || valeur < minimum) {
    throw new DonneeInvalideError(`${libelle} doit être un entier supérieur ou égal à ${minimum}.`);
  }
}

function verifierDate(date, libelle) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new DonneeInvalideError(`${libelle} n'est pas une date valide.`);
  }
}

module.exports = Garage;
