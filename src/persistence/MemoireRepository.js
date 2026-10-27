'use strict';

/**
 * Repository en mémoire, sans écriture disque : utilisé par les tests unitaires.
 * Il stocke des copies des données pour imiter un vrai support (pas de référence partagée).
 */
class MemoireRepository {
  constructor() {
    this.postes = [];
    this.ordres = new Map();
  }

  chargerPostes() {
    return structuredClone(this.postes);
  }

  sauvegarderPostes(postes) {
    this.postes = structuredClone(postes);
  }

  chargerOrdres() {
    return structuredClone([...this.ordres.values()]);
  }

  sauvegarderOrdre(ordre) {
    this.ordres.set(ordre.id, structuredClone(ordre));
  }

  mettreAJourOrdre(ordre) {
    this.ordres.set(ordre.id, structuredClone(ordre));
  }
}

module.exports = MemoireRepository;
