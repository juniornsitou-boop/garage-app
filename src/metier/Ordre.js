'use strict';

const { MS_PAR_MINUTE } = require('./constantes');

/**
 * Ordre de réparation. Les montants sont des entiers en F CFA.
 * dateCloture, dureeMinutes, montantMainOeuvre et montantTotal restent à null
 * tant que l'ordre est en cours.
 */
class Ordre {
  constructor({
    id,
    immatriculation,
    categorie,
    description,
    posteId,
    dateOuverture,
    dateCloture = null,
    pieces = [],
    dureeMinutes = null,
    montantMainOeuvre = null,
    montantTotal = null,
  }) {
    this.id = id;
    this.immatriculation = immatriculation;
    this.categorie = categorie;
    this.description = description;
    this.posteId = posteId;
    this.dateOuverture = new Date(dateOuverture);
    this.dateCloture = dateCloture ? new Date(dateCloture) : null;
    this.pieces = pieces.map((p) => ({
      designation: p.designation,
      prixUnitaire: p.prixUnitaire,
      quantite: p.quantite,
    }));
    this.dureeMinutes = dureeMinutes;
    this.montantMainOeuvre = montantMainOeuvre;
    this.montantTotal = montantTotal;
  }

  estEnCours() {
    return this.dateCloture === null;
  }

  ajouterPiece(designation, prixUnitaire, quantite) {
    this.pieces.push({ designation, prixUnitaire, quantite });
  }

  montantPieces() {
    return this.pieces.reduce((total, p) => total + p.prixUnitaire * p.quantite, 0);
  }

  cloturer(dateCloture, montantMainOeuvre) {
    this.dateCloture = new Date(dateCloture);
    this.dureeMinutes = Math.round((this.dateCloture - this.dateOuverture) / MS_PAR_MINUTE);
    this.montantMainOeuvre = montantMainOeuvre;
    this.montantTotal = montantMainOeuvre + this.montantPieces();
  }

  toJSON() {
    return {
      id: this.id,
      immatriculation: this.immatriculation,
      categorie: this.categorie,
      description: this.description,
      posteId: this.posteId,
      dateOuverture: this.dateOuverture.toISOString(),
      dateCloture: this.dateCloture ? this.dateCloture.toISOString() : null,
      pieces: this.pieces.map((p) => ({ ...p, montant: p.prixUnitaire * p.quantite })),
      montantPieces: this.montantPieces(),
      dureeMinutes: this.dureeMinutes,
      montantMainOeuvre: this.montantMainOeuvre,
      montantTotal: this.montantTotal,
    };
  }

  static depuisDonnees(donnees) {
    return new Ordre(donnees);
  }
}

module.exports = Ordre;
