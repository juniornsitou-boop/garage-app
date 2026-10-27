'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS postes (
    id         TEXT PRIMARY KEY,
    categorie  TEXT NOT NULL,
    statut     TEXT NOT NULL CHECK (statut IN ('LIBRE', 'OCCUPE'))
  );

  CREATE TABLE IF NOT EXISTS ordres (
    id                   TEXT PRIMARY KEY,
    immatriculation      TEXT NOT NULL,
    categorie            TEXT NOT NULL,
    description          TEXT NOT NULL,
    poste_id             TEXT NOT NULL REFERENCES postes(id),
    date_ouverture       TEXT NOT NULL,
    date_cloture         TEXT,
    duree_minutes        INTEGER,
    montant_main_oeuvre  INTEGER,
    montant_total        INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_ordres_immatriculation ON ordres(immatriculation);

  CREATE TABLE IF NOT EXISTS pieces (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    ordre_id       TEXT NOT NULL REFERENCES ordres(id) ON DELETE CASCADE,
    position       INTEGER NOT NULL,
    designation    TEXT NOT NULL,
    prix_unitaire  INTEGER NOT NULL,
    quantite       INTEGER NOT NULL
  );
`;

/**
 * Adaptateur SQLite (better-sqlite3). Il ne fait que lire et écrire des lignes :
 * aucune règle métier ici. Les données échangées sont des objets simples
 * (format Poste.toJSON() / Ordre.toJSON()).
 */
class SqliteRepository {
  constructor(cheminFichier) {
    if (cheminFichier !== ':memory:') {
      fs.mkdirSync(path.dirname(cheminFichier), { recursive: true });
    }
    this.db = new Database(cheminFichier);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA);

    this.req = {
      tousPostes: this.db.prepare('SELECT id, categorie, statut FROM postes ORDER BY rowid'),
      upsertPoste: this.db.prepare(`
        INSERT INTO postes (id, categorie, statut) VALUES (@id, @categorie, @statut)
        ON CONFLICT(id) DO UPDATE SET categorie = excluded.categorie, statut = excluded.statut`),
      tousOrdres: this.db.prepare('SELECT * FROM ordres ORDER BY date_ouverture, id'),
      toutesPieces: this.db.prepare('SELECT * FROM pieces ORDER BY ordre_id, position'),
      insererOrdre: this.db.prepare(`
        INSERT INTO ordres (id, immatriculation, categorie, description, poste_id, date_ouverture,
                            date_cloture, duree_minutes, montant_main_oeuvre, montant_total)
        VALUES (@id, @immatriculation, @categorie, @description, @posteId, @dateOuverture,
                @dateCloture, @dureeMinutes, @montantMainOeuvre, @montantTotal)`),
      majOrdre: this.db.prepare(`
        UPDATE ordres SET date_cloture = @dateCloture, duree_minutes = @dureeMinutes,
               montant_main_oeuvre = @montantMainOeuvre, montant_total = @montantTotal
        WHERE id = @id`),
      supprimerPieces: this.db.prepare('DELETE FROM pieces WHERE ordre_id = ?'),
      insererPiece: this.db.prepare(`
        INSERT INTO pieces (ordre_id, position, designation, prix_unitaire, quantite)
        VALUES (?, ?, ?, ?, ?)`),
    };

    this.sauvegarderPostes = this.db.transaction((postes) => {
      for (const p of postes) this.req.upsertPoste.run(p);
    });
    this.sauvegarderOrdre = this.db.transaction((ordre) => {
      this.req.insererOrdre.run(ligneOrdre(ordre));
      this.#ecrirePieces(ordre);
    });
    this.mettreAJourOrdre = this.db.transaction((ordre) => {
      const { id, dateCloture, dureeMinutes, montantMainOeuvre, montantTotal } = ligneOrdre(ordre);
      this.req.majOrdre.run({ id, dateCloture, dureeMinutes, montantMainOeuvre, montantTotal });
      this.#ecrirePieces(ordre);
    });
  }

  chargerPostes() {
    return this.req.tousPostes.all();
  }

  chargerOrdres() {
    const piecesParOrdre = new Map();
    for (const piece of this.req.toutesPieces.all()) {
      if (!piecesParOrdre.has(piece.ordre_id)) piecesParOrdre.set(piece.ordre_id, []);
      piecesParOrdre.get(piece.ordre_id).push({
        designation: piece.designation,
        prixUnitaire: piece.prix_unitaire,
        quantite: piece.quantite,
      });
    }
    return this.req.tousOrdres.all().map((o) => ({
      id: o.id,
      immatriculation: o.immatriculation,
      categorie: o.categorie,
      description: o.description,
      posteId: o.poste_id,
      dateOuverture: o.date_ouverture,
      dateCloture: o.date_cloture,
      pieces: piecesParOrdre.get(o.id) || [],
      dureeMinutes: o.duree_minutes,
      montantMainOeuvre: o.montant_main_oeuvre,
      montantTotal: o.montant_total,
    }));
  }

  fermer() {
    this.db.close();
  }

  #ecrirePieces(ordre) {
    this.req.supprimerPieces.run(ordre.id);
    ordre.pieces.forEach((p, index) => {
      this.req.insererPiece.run(ordre.id, index, p.designation, p.prixUnitaire, p.quantite);
    });
  }
}

function ligneOrdre(ordre) {
  return {
    id: ordre.id,
    immatriculation: ordre.immatriculation,
    categorie: ordre.categorie,
    description: ordre.description,
    posteId: ordre.posteId,
    dateOuverture: ordre.dateOuverture,
    dateCloture: ordre.dateCloture,
    dureeMinutes: ordre.dureeMinutes,
    montantMainOeuvre: ordre.montantMainOeuvre,
    montantTotal: ordre.montantTotal,
  };
}

module.exports = SqliteRepository;
