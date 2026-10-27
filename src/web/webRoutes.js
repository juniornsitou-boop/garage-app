'use strict';

const express = require('express');
const { NOMS_CATEGORIES } = require('../metier');
const { traduireErreur } = require('../api/erreursHttp');

/**
 * Pages Handlebars. Elles appellent le même GarageService que l'API REST
 * (même processus, pas d'aller-retour HTTP interne).
 */
function creerWebRouter(service) {
  const router = express.Router();
  router.use(express.urlencoded({ extended: false }));

  /** Affiche la vue ; en cas d'erreur, réaffiche le formulaire avec un message lisible. */
  const formulaire = (vue, action) => (req, res) => {
    const valeurs = req.body || {};
    const contexte = { page: vue, categories: NOMS_CATEGORIES };
    try {
      res.render(vue, { ...contexte, ...action(valeurs) });
    } catch (err) {
      const { statut, message } = traduireErreur(err);
      if (statut === 500) console.error(err);
      res.status(statut).render(vue, { ...contexte, valeurs, erreur: message });
    }
  };

  router.get('/', (req, res) => {
    res.render('accueil', { page: 'accueil', etat: service.etatPostes() });
  });

  router.get('/reception', (req, res) => {
    res.render('reception', { page: 'reception', categories: NOMS_CATEGORIES, valeurs: {} });
  });
  router.post('/reception', formulaire('reception', (valeurs) => ({
    ordre: service.receptionner(valeurs),
    valeurs: {},
  })));

  router.get('/pieces', (req, res) => {
    res.render('pieces', { page: 'pieces', valeurs: {} });
  });
  router.post('/pieces', formulaire('pieces', (valeurs) => {
    const ordre = service.ajouterPiece(valeurs);
    // On garde l'immatriculation pour enchaîner plusieurs pièces sur le même ordre.
    return { ordre, valeurs: { immatriculation: ordre.immatriculation } };
  }));

  router.get('/cloture', (req, res) => {
    res.render('cloture', { page: 'cloture', valeurs: {} });
  });
  router.post('/cloture', formulaire('cloture', (valeurs) => ({
    ordre: service.cloturer(valeurs),
    valeurs: {},
  })));

  router.get('/postes', (req, res) => {
    const contexte = { page: 'postes', categories: NOMS_CATEGORIES };
    try {
      res.render('postes', { ...contexte, etat: service.etatPostes(req.query.categorie) });
    } catch (err) {
      const { statut, message } = traduireErreur(err);
      res.status(statut).render('postes', { ...contexte, etat: service.etatPostes(), erreur: message });
    }
  });

  router.use((req, res) => {
    res.status(404).render('introuvable', { page: null, url: req.originalUrl });
  });

  return router;
}

module.exports = creerWebRouter;
