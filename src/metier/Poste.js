'use strict';

const { STATUTS_POSTE } = require('./constantes');

class Poste {
  constructor(id, categorie, statut = STATUTS_POSTE.LIBRE) {
    this.id = id;
    this.categorie = categorie;
    this.statut = statut;
  }

  estLibre() {
    return this.statut === STATUTS_POSTE.LIBRE;
  }

  occuper() {
    this.statut = STATUTS_POSTE.OCCUPE;
  }

  liberer() {
    this.statut = STATUTS_POSTE.LIBRE;
  }

  toJSON() {
    return { id: this.id, categorie: this.categorie, statut: this.statut };
  }

  static depuisDonnees(donnees) {
    return new Poste(donnees.id, donnees.categorie, donnees.statut);
  }
}

module.exports = Poste;
