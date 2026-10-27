'use strict';

const path = require('path');
const express = require('express');
const { create } = require('express-handlebars');

const { Garage } = require('./metier');
const GarageService = require('./api/services/GarageService');
const creerApiRouter = require('./api/routes/apiRoutes');
const creerWebRouter = require('./web/webRoutes');
const creerHelpers = require('./views/helpers');

/**
 * Construit l'application Express autour d'un Garage déjà instancié
 * (le repository est choisi par l'appelant : SQLite en production, mémoire en test).
 */
function creerApp(garage) {
  const service = new GarageService(garage);
  const app = express();

  const hbs = create({
    extname: '.handlebars',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials'),
  });
  hbs.helpers = creerHelpers(hbs.handlebars);
  app.engine('handlebars', hbs.engine);
  app.set('view engine', 'handlebars');
  app.set('views', path.join(__dirname, 'views'));

  app.use('/api', creerApiRouter(service));
  app.use('/', creerWebRouter(service));
  return app;
}

/** Démarrage réel : garage persistant dans data/garage.db. */
function demarrer() {
  const SqliteRepository = require('./persistence/SqliteRepository');
  const fichier = process.env.GARAGE_DB || path.join(__dirname, '..', 'data', 'garage.db');
  const repository = new SqliteRepository(fichier);
  const garage = new Garage(repository);
  const port = Number(process.env.PORT) || 3000;

  creerApp(garage).listen(port, () => {
    console.log(`AutoFix démarré sur http://localhost:${port} (données : ${fichier})`);
  });
}

if (require.main === module) {
  demarrer();
}

module.exports = { creerApp };
