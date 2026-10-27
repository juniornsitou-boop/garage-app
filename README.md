# AutoFix - Gestion d'un garage mécanique

Examen de rattrapage Node.js - NSITOU MABIALA Junior (Master 2 Génie Logiciel).

Application Node.js qui gère les 15 postes d'un garage (8 MECANIQUE, 4 ELECTRICITE, 3 PNEUMATIQUE),
la réception des véhicules, l'ajout de pièces, la clôture avec calcul du montant dû, une API REST
Express et une interface web express-handlebars.

## Installation et lancement

Prérequis : Node.js 20 ou plus récent.

```bash
npm install     # installe express, express-handlebars, better-sqlite3, jest, supertest
npm start       # http://localhost:3000 (port modifiable avec PORT=...)
npm test        # lance toute la suite Jest
```

Les données sont stockées dans `data/garage.db` (créé au premier démarrage, ignoré par git).
Pour repartir d'un garage vide, il suffit de supprimer ce fichier.

## Organisation

```
src/
  metier/        Poste, Ordre, Garage, constantes (tarifs, répartition), erreurs métier
  persistence/   SqliteRepository (better-sqlite3), MemoireRepository (tests)
  api/           routes/, controllers/, services/GarageService.js, validation, middleware d'erreurs
  web/           routes des pages Handlebars
  views/         layouts/main.handlebars, partials/, pages, helpers.js
  app.js         assemblage Express et démarrage
tests/
  garage.test.js       tests unitaires de la logique métier (repository en mémoire)
  persistence.test.js  rechargement de l'état depuis un vrai fichier SQLite
  api.test.js          tests d'intégration de l'API avec Supertest (bonus)
```

`Garage` reçoit son stockage par injection (`new Garage(repository)`) et ne connaît pas SQLite.
L'API REST et les pages web passent par le même `GarageService`, qui valide les entrées et
délègue au `Garage`.

## Choix de persistance : SQLite (better-sqlite3)

L'état du garage est naturellement relationnel (postes, ordres rattachés à un poste, pièces
rattachées à un ordre) : SQLite permet de le décrire avec des tables `postes`, `ordres` et `pieces`,
de chercher l'historique d'une immatriculation par une requête indexée et d'écrire chaque
opération dans une transaction, au lieu de réécrire tout l'état en JSON à chaque modification
comme avec node-localstorage. Les pièces sont dans une table dédiée plutôt qu'une colonne JSON,
pour garder des montants entiers typés et interrogeables.

## API REST

| Méthode | Route | Réponse |
|---------|-------|---------|
| POST | `/api/receptions` | 201, ordre créé |
| POST | `/api/pieces` | 200, ordre mis à jour |
| POST | `/api/clotures` | 200, ordre clôturé avec `montantTotal` |
| GET | `/api/postes?categorie=` | 200, compteurs libres/occupés et liste des postes |
| GET | `/api/ordres/:id` | 200, détail de l'ordre |
| GET | `/api/vehicules/:immatriculation/historique` | 200, passages du véhicule |

Erreurs (format `{ "erreur": { "code", "message" } }`) : 400 données invalides, 404 ordre ou
véhicule introuvable, 409 aucun poste disponible ou véhicule déjà en réparation.

Exemple :

```bash
curl -X POST http://localhost:3000/api/receptions \
  -H "Content-Type: application/json" \
  -d '{"immatriculation":"LT-482-AB","categorie":"MECANIQUE","description":"Bruit au freinage"}'
```

## Règles de calcul

- Main d'oeuvre : 15 minutes ou moins, gratuite. Au-delà, chaque heure entamée est facturée
  (arrondi supérieur sur la durée totale, sans déduire les 15 minutes).
- Ligne de pièce : `prixUnitaire x quantite`. Total : main d'oeuvre + somme des lignes.
- Tous les montants sont des entiers en F CFA.
