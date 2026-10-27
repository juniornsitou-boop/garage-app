'use strict';

const express = require('express');
const creerGarageController = require('../controllers/garageController');
const { routeApiIntrouvable, gestionErreursApi } = require('../middlewares/gestionErreurs');

function creerApiRouter(service) {
  const router = express.Router();
  const controller = creerGarageController(service);

  router.use(express.json());

  router.post('/receptions', controller.receptionner);
  router.post('/pieces', controller.ajouterPiece);
  router.post('/clotures', controller.cloturer);
  router.get('/postes', controller.etatPostes);
  router.get('/ordres/:id', controller.detailOrdre);
  router.get('/vehicules/:immatriculation/historique', controller.historique);

  router.use(routeApiIntrouvable);
  router.use(gestionErreursApi);
  return router;
}

module.exports = creerApiRouter;
