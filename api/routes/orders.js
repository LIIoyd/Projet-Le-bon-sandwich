const express = require('express');
const router = express.Router();
const knex = require('../db_connection');

router.get('/', async (req, res, next) => {
  try {
    let results = await knex('orders');
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
    let results = await knex('orders').where('id', idParam).first();
    if (results) {
      results = {"type" : "ressource",
      "order" : results,
      "links" : {
        "self" :{ "href" : "/orders/" + results.id },
        "items" :{ "href" : "/orders/" + results.id + "/items"}
        }
      }
      const embed = req.query.embed.toLowerCase();
      if (embed == "items") {
        let items = await knex('items').where('command_id', idParam);
        if (items) {
          let itemres = [];
          items.forEach(item => {
            itemres.push({
              "id": item.id,
              "uri": item.uri,
              "name": item.label,
              "price": item.price,
              "quantity": item.quantity,
            });
          });
          results.order.items = itemres;
        } else {
          res.status(404).json({
            "type": "error",
            "error": 404,
            "message": "ressource non disponible "
          })
        }
      }
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
      const test = await knex('orders')
        .where('id', idParam)
        .update({
          name: nom,
          email: mail,
          withdraw: isdate
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

/* récupérer les items d'une order */
router.get('/:id/items', async (req, res, next) => {
  const idParam = req.params.id;
  try {
    let order = await knex('orders').where('id', idParam).first();
    if (order) {
      let items = await knex('items').where('command_id', idParam);
      if (items) {
        let result = [];
        items.forEach(item => {
          result.push({
            "id": item.id,
            "uri": item.uri,
            "name": item.label,
            "price": item.price,
            "quantity": item.quantity,
          });
        });
        res.json(result);
      } else {
        res.status(404).json({
          "type": "error",
          "error": 404,
          "message": "ressource non disponible : /orders/" + idParam + "/items"
        })
      }
    } else {
      res.status(404).json({
        "type": "error",
        "error": 404,
        "message": "ressource non disponible : /orders/" + idParam + "/items"
      })
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
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
