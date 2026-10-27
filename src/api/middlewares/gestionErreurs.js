'use strict';

const { traduireErreur } = require('../erreursHttp');

/** Route /api inconnue. */
function routeApiIntrouvable(req, res) {
  res.status(404).json({
    erreur: { code: 'ROUTE_INTROUVABLE', message: `Route ${req.method} ${req.originalUrl} inexistante.` },
  });
}

/** Middleware d'erreurs centralisé de l'API : erreur métier -> réponse JSON adaptée. */
// eslint-disable-next-line no-unused-vars
function gestionErreursApi(err, req, res, next) {
  const { statut, code, message } = traduireErreur(err);
  if (statut === 500) {
    console.error(err);
  }
  res.status(statut).json({ erreur: { code, message } });
}

module.exports = { routeApiIntrouvable, gestionErreursApi };
