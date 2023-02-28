const express = require('express');
const router = express.Router();
const knex = require('../db_connection');

router.get('/', async (req, res, next) => {
  try {
    let results = await knex('order');
    res.json(results);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/*Get order with id*/
router.get('/:id', async (req, res, next) => {
  const idParam = req.params.id;
  try {
    let results = await knex('order').where('id', idParam).first();
    if (results) {
      res.json(results);
    } else {
      res.status(404).json({
        "type": "error",
        "error": 404,
        "message": "ressource non disponible : /orders/" + idParam + "/"
      })
    }
  } catch (error) {
    console.log(error);
    req.sendStatus(500);
  }

});

/**Modification de donnée dans une commande */
router.put('/:id', async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const { nom, mail, livraison } = req.body;
    const isdate = new Date(livraison);
    console.log(isdate);

    if (isdate == "Invalid Date") {
      res.sendStatus(400);
    } else {
      const test = await knex('order')
        .where('id', idParam)
        .update({
          nom: nom,
          mail: mail,
          livraison: isdate
        })
      if (test == 1) {
        res.sendStatus(204);
      } else {
        res.sendStatus(404);
      }
    }

  } catch (error) {
    console.error(error);
    req.sendStatus(500);
  }
});

/*Uri not valid*/
router.all('/:id', async (req, res, next) => {
  res.status(405).json({
    type: "error",
    error: 405,
    message: "Requête non authorisée"
  })
});

module.exports = router;
