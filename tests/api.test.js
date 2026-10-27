'use strict';

// Bonus : tests d'intégration de l'API avec Supertest (repository en mémoire).
const request = require('supertest');
const { Garage } = require('../src/metier');
const MemoireRepository = require('../src/persistence/MemoireRepository');
const { creerApp } = require('../src/app');

let app;

beforeEach(() => {
  app = creerApp(new Garage(new MemoireRepository()));
});

describe('API REST', () => {
  test('POST /api/receptions -> 201 et ordre créé', async () => {
    const res = await request(app)
      .post('/api/receptions')
      .send({ immatriculation: 'AB-123-CD', categorie: 'MECANIQUE', description: 'Bruit moteur' });

    expect(res.status).toBe(201);
    expect(res.body.posteId).toBe('MECA-01');
    expect(res.body.pieces).toEqual([]);
  });

  test('POST /api/receptions -> 400 si catégorie invalide, 409 si déjà en réparation', async () => {
    const invalide = await request(app)
      .post('/api/receptions')
      .send({ immatriculation: 'AB-123-CD', categorie: 'CARROSSERIE', description: 'x' });
    expect(invalide.status).toBe(400);
    expect(invalide.body.erreur.code).toBe('VALIDATION');

    const corps = { immatriculation: 'AB-123-CD', categorie: 'MECANIQUE', description: 'Freins' };
    await request(app).post('/api/receptions').send(corps);
    const doublon = await request(app).post('/api/receptions').send(corps);
    expect(doublon.status).toBe(409);
    expect(doublon.body.erreur.code).toBe('VEHICULE_DEJA_EN_REPARATION');
  });

  test('POST /api/receptions -> 409 quand aucun poste n\'est disponible', async () => {
    for (let i = 1; i <= 3; i++) {
      await request(app).post('/api/receptions')
        .send({ immatriculation: `PN-${i}`, categorie: 'PNEUMATIQUE', description: 'Crevaison' });
    }
    const res = await request(app).post('/api/receptions')
      .send({ immatriculation: 'PN-4', categorie: 'PNEUMATIQUE', description: 'Crevaison' });
    expect(res.status).toBe(409);
    expect(res.body.erreur.code).toBe('POSTE_INDISPONIBLE');
  });

  test('POST /api/pieces puis /api/clotures -> ordre clôturé avec le total', async () => {
    await request(app).post('/api/receptions')
      .send({ immatriculation: 'AB-123-CD', categorie: 'MECANIQUE', description: 'Freins' });

    const piece = await request(app).post('/api/pieces')
      .send({ immatriculation: 'AB-123-CD', designation: 'Disque', prixUnitaire: 15000, quantite: 2 });
    expect(piece.status).toBe(200);
    expect(piece.body.montantPieces).toBe(30000);

    const cloture = await request(app).post('/api/clotures').send({ immatriculation: 'AB-123-CD' });
    expect(cloture.status).toBe(200);
    expect(cloture.body.dateCloture).not.toBeNull();
    // Clôture immédiate : diagnostic offert, seules les pièces sont dues.
    expect(cloture.body.montantMainOeuvre).toBe(0);
    expect(cloture.body.montantTotal).toBe(30000);
  });

  test('POST /api/pieces -> 400 si quantité invalide, 404 sans ordre en cours', async () => {
    const invalide = await request(app).post('/api/pieces')
      .send({ immatriculation: 'AB-123-CD', designation: 'Filtre', prixUnitaire: 1000, quantite: 0 });
    expect(invalide.status).toBe(400);

    const introuvable = await request(app).post('/api/pieces')
      .send({ immatriculation: 'AB-123-CD', designation: 'Filtre', prixUnitaire: 1000, quantite: 1 });
    expect(introuvable.status).toBe(404);
  });

  test('GET /api/postes avec et sans filtre', async () => {
    await request(app).post('/api/receptions')
      .send({ immatriculation: 'AB-123-CD', categorie: 'ELECTRICITE', description: 'Batterie' });

    const tous = await request(app).get('/api/postes');
    expect(tous.status).toBe(200);
    expect(tous.body).toMatchObject({ total: 15, libres: 14, occupes: 1 });

    const elec = await request(app).get('/api/postes?categorie=ELECTRICITE');
    expect(elec.body).toMatchObject({ total: 4, libres: 3, occupes: 1 });
    expect(elec.body.postes[0].immatriculation).toBe('AB-123-CD');

    const mauvais = await request(app).get('/api/postes?categorie=XXX');
    expect(mauvais.status).toBe(400);
  });

  test('GET /api/ordres/:id et /api/vehicules/:immatriculation/historique', async () => {
    const creation = await request(app).post('/api/receptions')
      .send({ immatriculation: 'AB-123-CD', categorie: 'MECANIQUE', description: 'Vidange' });

    const detail = await request(app).get(`/api/ordres/${creation.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.immatriculation).toBe('AB-123-CD');
    expect((await request(app).get('/api/ordres/OR-99999')).status).toBe(404);

    const historique = await request(app).get('/api/vehicules/AB-123-CD/historique');
    expect(historique.status).toBe(200);
    expect(historique.body.nombrePassages).toBe(1);
    expect((await request(app).get('/api/vehicules/INCONNU/historique')).status).toBe(404);
  });

  test('JSON mal formé -> 400 sans stack trace', async () => {
    const res = await request(app)
      .post('/api/receptions')
      .set('Content-Type', 'application/json')
      .send('{"immatriculation": ');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
  });
});
