'use strict';

module.exports = {
  Garage: require('./Garage'),
  Poste: require('./Poste'),
  Ordre: require('./Ordre'),
  ...require('./constantes'),
  ...require('./erreurs'),
};
