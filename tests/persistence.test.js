'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Garage } = require('../src/metier');
const SqliteRepository = require('../src/persistence/SqliteRepository');

const OUVERTURE = new Date('2026-10-27T08:00:00Z');

describe('SqliteRepository (fichier .db réel)', () => {
  let dossier;
  let fichier;

  beforeEach(() => {
    dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'garage-'));
    fichier = path.join(dossier, 'garage.db');
  });

  afterEach(() => {
    fs.rmSync(dossier, { recursive: true, force: true });
  });

  test("l'état est rechargé depuis le disque après un redémarrage", () => {
    const repo1 = new SqliteRepository(fichier);
    const garage1 = new Garage(repo1);
    garage1.receptionnerVehicule('AB-123-CD', 'MECANIQUE', 'Freins', OUVERTURE);
    garage1.ajouterPiece('AB-123-CD', 'Disque de frein', 15000, 2);
    garage1.receptionnerVehicule('XY-456-ZT', 'PNEUMATIQUE', 'Crevaison', OUVERTURE);
    garage1.cloturerOrdre('XY-456-ZT', new Date('2026-10-27T08:10:00Z'));
    repo1.fermer();

    // "Redémarrage" : nouvelle connexion, nouveau Garage.
    const repo2 = new SqliteRepository(fichier);
    const garage2 = new Garage(repo2);

    expect(garage2.postes).toHaveLength(15);
    expect(garage2.postesDisponibles('MECANIQUE')).toBe(7);
    expect(garage2.postesDisponibles('PNEUMATIQUE')).toBe(3);

    const [enCours] = garage2.historiqueVehicule('AB-123-CD');
    expect(enCours.estEnCours()).toBe(true);
    expect(enCours.pieces).toEqual([{ designation: 'Disque de frein', prixUnitaire: 15000, quantite: 2 }]);

    const [clos] = garage2.historiqueVehicule('XY-456-ZT');
    expect(clos.montantTotal).toBe(0);
    expect(clos.dureeMinutes).toBe(10);
    repo2.fermer();
  });
});
