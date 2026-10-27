'use strict';

const { CATEGORIES, NOMS_CATEGORIES, VehiculeIntrouvableError } = require('../../metier');
const {
  validerReception,
  validerPiece,
  validerCloture,
  validerFiltreCategorie,
  texteObligatoire,
} = require('../validation');

/**
 * Service applicatif : point d'entrée unique utilisé par l'API REST et par les vues.
 * Il valide les données reçues, délègue au Garage et renvoie des objets prêts à sérialiser.
 */
class GarageService {
  constructor(garage) {
    this.garage = garage;
  }

  receptionner(donnees) {
    const { immatriculation, categorie, description } = validerReception(donnees);
    return this.garage.receptionnerVehicule(immatriculation, categorie, description).toJSON();
  }

  ajouterPiece(donnees) {
    const { immatriculation, designation, prixUnitaire, quantite } = validerPiece(donnees);
    return this.garage.ajouterPiece(immatriculation, designation, prixUnitaire, quantite).toJSON();
  }

  cloturer(donnees) {
    const { immatriculation } = validerCloture(donnees);
    return this.garage.cloturerOrdre(immatriculation).toJSON();
  }

  etatPostes(categorie) {
    const filtre = validerFiltreCategorie(categorie);
    const categories = filtre ? [filtre] : NOMS_CATEGORIES;
    const parCategorie = categories.map((nom) => {
      const total = CATEGORIES[nom].nombrePostes;
      const libres = this.garage.postesDisponibles(nom);
      return { categorie: nom, tarifHoraire: CATEGORIES[nom].tarifHoraire, total, libres, occupes: total - libres };
    });
    const somme = (cle) => parCategorie.reduce((s, c) => s + c[cle], 0);
    return {
      categorie: filtre,
      total: somme('total'),
      libres: somme('libres'),
      occupes: somme('occupes'),
      parCategorie,
      postes: this.garage.listerPostes(filtre),
    };
  }

  detailOrdre(id) {
    return this.garage.trouverOrdre(id).toJSON();
  }

  historique(immatriculation) {
    const immat = texteObligatoire(immatriculation, "L'immatriculation").toUpperCase();
    const ordres = this.garage.historiqueVehicule(immat);
    if (ordres.length === 0) {
      throw new VehiculeIntrouvableError(immat);
    }
    return { immatriculation: immat, nombrePassages: ordres.length, ordres: ordres.map((o) => o.toJSON()) };
  }
}

module.exports = GarageService;
