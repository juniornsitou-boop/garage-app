'use strict';

const { NOMS_CATEGORIES } = require('../metier');

/** Erreur de validation des données reçues (traduite en 400). */
class ErreurValidation extends Error {
  constructor(message) {
    super(message);
    this.name = 'ErreurValidation';
    this.code = 'VALIDATION';
  }
}

function texteObligatoire(valeur, libelle) {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw new ErreurValidation(`${libelle} est obligatoire.`);
  }
  return valeur.trim();
}

function categorieValide(valeur) {
  if (!NOMS_CATEGORIES.includes(valeur)) {
    throw new ErreurValidation(`La catégorie doit être l'une des valeurs : ${NOMS_CATEGORIES.join(', ')}.`);
  }
  return valeur;
}

/** Accepte un nombre entier, ou une chaîne d'entier (champs de formulaire HTML). */
function entier(valeur, minimum, libelle) {
  const nombre = typeof valeur === 'string' && /^\s*-?\d+\s*$/.test(valeur) ? Number(valeur) : valeur;
  if (!Number.isInteger(nombre) || nombre < minimum) {
    const borne = minimum === 0 ? 'positif ou nul' : `supérieur ou égal à ${minimum}`;
    throw new ErreurValidation(`${libelle} doit être un nombre entier ${borne}.`);
  }
  return nombre;
}

function validerReception(donnees = {}) {
  return {
    immatriculation: texteObligatoire(donnees.immatriculation, "L'immatriculation"),
    categorie: categorieValide(donnees.categorie),
    description: texteObligatoire(donnees.description, 'La description de la panne'),
  };
}

function validerPiece(donnees = {}) {
  return {
    immatriculation: texteObligatoire(donnees.immatriculation, "L'immatriculation"),
    designation: texteObligatoire(donnees.designation, 'La désignation'),
    prixUnitaire: entier(donnees.prixUnitaire, 0, 'Le prix unitaire'),
    quantite: entier(donnees.quantite, 1, 'La quantité'),
  };
}

function validerCloture(donnees = {}) {
  return { immatriculation: texteObligatoire(donnees.immatriculation, "L'immatriculation") };
}

/** Filtre optionnel ?categorie= : absent ou vide -> null. */
function validerFiltreCategorie(categorie) {
  if (categorie === undefined || categorie === '') return null;
  return categorieValide(categorie);
}

module.exports = {
  ErreurValidation,
  validerReception,
  validerPiece,
  validerCloture,
  validerFiltreCategorie,
  texteObligatoire,
};
