'use strict';

const {
  Garage,
  PosteIndisponibleError,
  VehiculeDejaEnReparationError,
  OrdreIntrouvableError,
  DonneeInvalideError,
} = require('../src/metier');
const MemoireRepository = require('../src/persistence/MemoireRepository');

// Dates fixes : les tests ne dépendent jamais de l'horloge système.
const OUVERTURE = new Date('2026-10-27T08:00:00Z');
const apres = (minutes) => new Date(OUVERTURE.getTime() + minutes * 60 * 1000);

let repository;
let garage;

beforeEach(() => {
  repository = new MemoireRepository();
  garage = new Garage(repository);
});

describe('Initialisation du garage', () => {
  test('crée 15 postes libres répartis 8 / 4 / 3', () => {
    expect(garage.postes).toHaveLength(15);
    expect(garage.postesDisponibles('MECANIQUE')).toBe(8);
    expect(garage.postesDisponibles('ELECTRICITE')).toBe(4);
    expect(garage.postesDisponibles('PNEUMATIQUE')).toBe(3);
  });
});

describe('receptionnerVehicule', () => {
  test('crée un ordre et attribue le premier poste libre de la catégorie', () => {
    const ordre = garage.receptionnerVehicule('AB-123-CD', 'MECANIQUE', 'Bruit moteur', OUVERTURE);

    expect(ordre.id).toBeDefined();
    expect(ordre.immatriculation).toBe('AB-123-CD');
    expect(ordre.categorie).toBe('MECANIQUE');
    expect(ordre.posteId).toBe('MECA-01');
    expect(ordre.dateOuverture).toEqual(OUVERTURE);
    expect(ordre.dateCloture).toBeNull();
    expect(ordre.pieces).toEqual([]);
    expect(garage.postes.find((p) => p.id === 'MECA-01').statut).toBe('OCCUPE');
  });

  test('attribue un poste différent au véhicule suivant de la même catégorie', () => {
    garage.receptionnerVehicule('AA-001-AA', 'ELECTRICITE', 'Batterie', OUVERTURE);
    const second = garage.receptionnerVehicule('AA-002-AA', 'ELECTRICITE', 'Phares', OUVERTURE);
    expect(second.posteId).toBe('ELEC-02');
  });

  test('refuse la réception quand la catégorie est complète', () => {
    garage.receptionnerVehicule('PN-001', 'PNEUMATIQUE', 'Crevaison', OUVERTURE);
    garage.receptionnerVehicule('PN-002', 'PNEUMATIQUE', 'Crevaison', OUVERTURE);
    garage.receptionnerVehicule('PN-003', 'PNEUMATIQUE', 'Crevaison', OUVERTURE);

    expect(() => garage.receptionnerVehicule('PN-004', 'PNEUMATIQUE', 'Crevaison', OUVERTURE))
      .toThrow(PosteIndisponibleError);
    // Les autres catégories restent ouvertes.
    expect(garage.receptionnerVehicule('ME-001', 'MECANIQUE', 'Vidange', OUVERTURE).posteId)
      .toBe('MECA-01');
  });

  test('refuse la réception quand le garage est complet (15 postes occupés)', () => {
    const repartition = { MECANIQUE: 8, ELECTRICITE: 4, PNEUMATIQUE: 3 };
    let n = 0;
    for (const [categorie, nombre] of Object.entries(repartition)) {
      for (let i = 0; i < nombre; i++) {
        garage.receptionnerVehicule(`VH-${++n}`, categorie, 'Révision', OUVERTURE);
      }
    }
    expect(garage.postesDisponibles()).toBe(0);
    for (const categorie of Object.keys(repartition)) {
      expect(() => garage.receptionnerVehicule('VH-99', categorie, 'Révision', OUVERTURE))
        .toThrow(PosteIndisponibleError);
    }
  });

  test("refuse une immatriculation qui a déjà un ordre en cours, même dans une autre catégorie", () => {
    garage.receptionnerVehicule('AB-123-CD', 'MECANIQUE', 'Bruit moteur', OUVERTURE);

    expect(() => garage.receptionnerVehicule('ab-123-cd ', 'ELECTRICITE', 'Alternateur', OUVERTURE))
      .toThrow(VehiculeDejaEnReparationError);
    expect(garage.postesDisponibles('ELECTRICITE')).toBe(4);
  });

  test('refuse une catégorie inconnue ou une description vide', () => {
    expect(() => garage.receptionnerVehicule('AB-123-CD', 'CARROSSERIE', 'Rayure', OUVERTURE))
      .toThrow(DonneeInvalideError);
    expect(() => garage.receptionnerVehicule('AB-123-CD', 'MECANIQUE', '   ', OUVERTURE))
      .toThrow(DonneeInvalideError);
  });
});

describe('calculerMainOeuvre', () => {
  test.each([
    ['MECANIQUE', 10, 0],
    ['MECANIQUE', 15, 0],
    ['MECANIQUE', 16, 10000],
    ['MECANIQUE', 40, 10000],
    ['MECANIQUE', 60, 10000],
    ['MECANIQUE', 61, 20000],
    ['MECANIQUE', 140, 30000],
    ['ELECTRICITE', 40, 12500],
    ['ELECTRICITE', 90, 25000],
    ['PNEUMATIQUE', 140, 15000],
  ])('%s, %i min -> %i F CFA', (categorie, minutes, attendu) => {
    const montant = garage.calculerMainOeuvre(categorie, OUVERTURE, apres(minutes));
    expect(montant).toBe(attendu);
    expect(Number.isInteger(montant)).toBe(true);
  });

  test("refuse une date de clôture antérieure à l'ouverture", () => {
    expect(() => garage.calculerMainOeuvre('MECANIQUE', OUVERTURE, apres(-5)))
      .toThrow(DonneeInvalideError);
  });
});

describe('ajouterPiece et montant total', () => {
  test('2 pièces à 15 000 + 1 pièce à 4 500, 40 min en MECANIQUE -> 44 500 F CFA', () => {
    garage.receptionnerVehicule('AB-123-CD', 'MECANIQUE', 'Freins', OUVERTURE);
    garage.ajouterPiece('AB-123-CD', 'Disque de frein', 15000, 2);
    const ordre = garage.ajouterPiece('AB-123-CD', 'Liquide de frein', 4500, 1);

    expect(ordre.pieces).toHaveLength(2);
    expect(ordre.montantPieces()).toBe(34500);

    const cloture = garage.cloturerOrdre('AB-123-CD', apres(40));
    expect(cloture.montantMainOeuvre).toBe(10000);
    expect(cloture.montantTotal).toBe(44500);
  });

  test("refuse l'ajout de pièce sans ordre en cours (inconnu ou déjà clôturé)", () => {
    expect(() => garage.ajouterPiece('ZZ-999-ZZ', 'Filtre', 3000, 1)).toThrow(OrdreIntrouvableError);

    garage.receptionnerVehicule('AB-123-CD', 'MECANIQUE', 'Vidange', OUVERTURE);
    garage.cloturerOrdre('AB-123-CD', apres(30));
    expect(() => garage.ajouterPiece('AB-123-CD', 'Filtre', 3000, 1)).toThrow(OrdreIntrouvableError);
  });

  test('refuse un prix non entier ou négatif et une quantité inférieure à 1', () => {
    garage.receptionnerVehicule('AB-123-CD', 'MECANIQUE', 'Vidange', OUVERTURE);
    expect(() => garage.ajouterPiece('AB-123-CD', 'Filtre', 2500.5, 1)).toThrow(DonneeInvalideError);
    expect(() => garage.ajouterPiece('AB-123-CD', 'Filtre', -1, 1)).toThrow(DonneeInvalideError);
    expect(() => garage.ajouterPiece('AB-123-CD', 'Filtre', 2500, 0)).toThrow(DonneeInvalideError);
  });
});

describe('cloturerOrdre', () => {
  test("clôture l'ordre, calcule les montants et libère effectivement le poste", () => {
    garage.receptionnerVehicule('AB-123-CD', 'ELECTRICITE', 'Démarreur', OUVERTURE);
    expect(garage.postesDisponibles('ELECTRICITE')).toBe(3);

    const ordre = garage.cloturerOrdre('AB-123-CD', apres(90));

    expect(ordre.dateCloture).toEqual(apres(90));
    expect(ordre.dureeMinutes).toBe(90);
    expect(ordre.montantMainOeuvre).toBe(25000);
    expect(ordre.montantTotal).toBe(25000);
    expect(garage.postes.find((p) => p.id === ordre.posteId).statut).toBe('LIBRE');
    expect(garage.postesDisponibles('ELECTRICITE')).toBe(4);
  });

  test('refuse la clôture sans ordre en cours', () => {
    expect(() => garage.cloturerOrdre('ZZ-999-ZZ', apres(10))).toThrow(OrdreIntrouvableError);

    garage.receptionnerVehicule('AB-123-CD', 'MECANIQUE', 'Vidange', OUVERTURE);
    garage.cloturerOrdre('AB-123-CD', apres(10));
    expect(() => garage.cloturerOrdre('AB-123-CD', apres(20))).toThrow(OrdreIntrouvableError);
  });

  test('permet de réceptionner à nouveau un véhicule restitué', () => {
    garage.receptionnerVehicule('AB-123-CD', 'MECANIQUE', 'Vidange', OUVERTURE);
    garage.cloturerOrdre('AB-123-CD', apres(10));
    const nouvelOrdre = garage.receptionnerVehicule('AB-123-CD', 'PNEUMATIQUE', 'Pneus', apres(60));
    expect(nouvelOrdre.estEnCours()).toBe(true);
  });
});

describe('postesDisponibles', () => {
  test('décompte global et par catégorie au fil des réceptions et clôtures', () => {
    expect(garage.postesDisponibles()).toBe(15);

    garage.receptionnerVehicule('V1', 'MECANIQUE', 'Panne', OUVERTURE);
    garage.receptionnerVehicule('V2', 'MECANIQUE', 'Panne', OUVERTURE);
    garage.receptionnerVehicule('V3', 'PNEUMATIQUE', 'Panne', OUVERTURE);

    expect(garage.postesDisponibles()).toBe(12);
    expect(garage.postesDisponibles('MECANIQUE')).toBe(6);
    expect(garage.postesDisponibles('ELECTRICITE')).toBe(4);
    expect(garage.postesDisponibles('PNEUMATIQUE')).toBe(2);

    garage.cloturerOrdre('V1', apres(30));
    expect(garage.postesDisponibles()).toBe(13);
    expect(garage.postesDisponibles('MECANIQUE')).toBe(7);
  });
});

describe('historiqueVehicule', () => {
  test('renvoie les passages passés et en cours, du plus ancien au plus récent', () => {
    garage.receptionnerVehicule('AB-123-CD', 'MECANIQUE', 'Vidange', OUVERTURE);
    garage.cloturerOrdre('AB-123-CD', apres(30));
    garage.receptionnerVehicule('AB-123-CD', 'PNEUMATIQUE', 'Pneus', apres(120));
    garage.receptionnerVehicule('XY-000-ZZ', 'MECANIQUE', 'Autre véhicule', OUVERTURE);

    const historique = garage.historiqueVehicule('AB-123-CD');
    expect(historique).toHaveLength(2);
    expect(historique[0].description).toBe('Vidange');
    expect(historique[0].estEnCours()).toBe(false);
    expect(historique[1].estEnCours()).toBe(true);
    expect(garage.historiqueVehicule('INCONNU')).toEqual([]);
  });
});

describe('Rechargement depuis le repository', () => {
  test("un nouveau Garage sur le même stockage retrouve postes, ordres en cours et pièces", () => {
    garage.receptionnerVehicule('AB-123-CD', 'MECANIQUE', 'Freins', OUVERTURE);
    garage.ajouterPiece('AB-123-CD', 'Plaquettes', 12000, 1);

    const garageRecharge = new Garage(repository);

    expect(garageRecharge.postesDisponibles('MECANIQUE')).toBe(7);
    const [ordre] = garageRecharge.historiqueVehicule('AB-123-CD');
    expect(ordre.pieces).toEqual([{ designation: 'Plaquettes', prixUnitaire: 12000, quantite: 1 }]);
    expect(garageRecharge.cloturerOrdre('AB-123-CD', apres(40)).montantTotal).toBe(22000);
  });
});
