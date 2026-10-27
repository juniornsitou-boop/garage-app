'use strict';

/**
 * Contrôleurs REST : lisent la requête, appellent le service, renvoient le JSON.
 * Aucune règle métier ici ; les erreurs remontent au middleware centralisé.
 */
function creerGarageController(service) {
  return {
    receptionner(req, res) {
      res.status(201).json(service.receptionner(req.body));
    },

    ajouterPiece(req, res) {
      res.status(200).json(service.ajouterPiece(req.body));
    },

    cloturer(req, res) {
      res.status(200).json(service.cloturer(req.body));
    },

    etatPostes(req, res) {
      res.status(200).json(service.etatPostes(req.query.categorie));
    },

    detailOrdre(req, res) {
      res.status(200).json(service.detailOrdre(req.params.id));
    },

    historique(req, res) {
      res.status(200).json(service.historique(req.params.immatriculation));
    },
  };
}

module.exports = creerGarageController;
