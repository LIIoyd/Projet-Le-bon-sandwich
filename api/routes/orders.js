const express = require("express");
const router = express.Router();
const knex = require("../db_connection");
const Joi = require("joi");
const uuid = require("uuid");

router.get("/", async (req, res, next) => {
  try {
    let results = await knex("orders");
    res.json(results);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

/*Get order with id*/
router.get("/:id", async (req, res, next) => {
  const idParam = req.params.id;
  try {
    let results = await knex("orders").where("id", idParam).first();
    if (results) {
      results = {
        type: "ressource",
        order: results,
        links: {
          self: { href: "/orders/" + results.id },
          items: { href: "/orders/" + results.id + "/items" },
        },
      };
      const embed = req.query.embed.toLowerCase();
      if (embed == "items") {
        let items = await knex("items").where("command_id", idParam);
        if (items) {
          let itemres = [];
          items.forEach((item) => {
            itemres.push({
              id: item.id,
              uri: item.uri,
              name: item.label,
              price: item.price,
              quantity: item.quantity,
            });
          });
          results.order.items = itemres;
        } else {
          res.status(404).json({
            type: "error",
            error: 404,
            message: "ressource non disponible ",
          });
        }
      }
      res.json(results);
    } else {
      res.status(404).json({
        type: "error",
        error: 404,
        message: "ressource non disponible : /orders/" + idParam + "/",
      });
    }
  } catch (error) {
    console.log(error);
    req.sendStatus(500);
  }
});

/**Modification de donnée dans une commande */
router.put("/:id", async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const { nom, mail, livraison } = req.body;
    const isdate = new Date(livraison);
    console.log(isdate);

    if (isdate == "Invalid Date") {
      res.sendStatus(400);
    } else {
      const test = await knex("orders").where("id", idParam).update({
        name: nom,
        email: mail,
        withdraw: isdate,
      });
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
router.get("/:id/items", async (req, res, next) => {
  const idParam = req.params.id;
  try {
    let order = await knex("orders").where("id", idParam).first();
    if (order) {
      let items = await knex("items").where("command_id", idParam);
      if (items) {
        let result = [];
        items.forEach((item) => {
          result.push({
            id: item.id,
            uri: item.uri,
            name: item.label,
            price: item.price,
            quantity: item.quantity,
          });
        });
        res.json(result);
      } else {
        res.status(404).json({
          type: "error",
          error: 404,
          message: "ressource non disponible : /orders/" + idParam + "/items",
        });
      }
    } else {
      res.status(404).json({
        type: "error",
        error: 404,
        message: "ressource non disponible : /orders/" + idParam + "/items",
      });
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

router.post("/", async (req, res, next) => {
  const schema = Joi.object({
    client_name: Joi.string().Joi.string().alphanum().min(3).max(30).required(),
    client_mail: Joi.string().email().required(),
    date: Joi.date().required(),
    time: Joi.string()
      .pattern(new RegExp("^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"))
      .required(),
  });

  try {
    schema.validate({
      client_name: req.body.client_name,
      client_mail: req.body.client_mail,
      date: req.body.date,
      time: req.body.time,
    });
    let uuid = uuid.v4();
    let newOrder = knex("orders").insert({
      id: uuid,
      name: req.body.client_name,
      email: req.body.client_mail,
      withdraw: req.body.date + " " + req.body.time,
    });
    // header location : /orders/uuid and body : order
    //res.append('Link', ['<http://localhost/>', '<http://localhost:3000/>'])
    res
      .status(201)
      .location("/orders/" + uuid)
      .json(newOrder);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});
/*Uri not valid*/
router.all("/:id", async (req, res, next) => {
  res.status(405).json({
    type: "error",
    error: 405,
    message: "Requête non authorisée",
  });
});

module.exports = router;
