const express = require("express");
const router = express.Router();
const knex = require("../db_connection");
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");

let pagination = 2;

/* Méthode GET sur /orders. Récupération des commandes avec possibilité de filtre, de tri et de pagination */
router.get("/", async (req, res, next) => {
  // Récupération des paramètres de la requête
  let client = req.query.c;
  let sort = req.query.sort;
  let page = req.query.page;

  // Cas sans problème d'éxécution
  try {
    // Paramètres de la requête pour les liens de pagination
    let parametersArray = [];

    // Construction de la requête de base
    let query = knex("orders");
    // Si un client est spécifié, on l'ajoute à la requête
    if (client != undefined) {
      query = query.where("name", client);
      parametersArray = [...parametersArray, "c=" + client];
    }

    // On récupère le nombre de commandes pour la pagination
    let count = await query.clone().count("id as count");
    let maxPage = Math.ceil(count[0].count / pagination);

    if (count[0].count > 0) {
      // Si un tri est spécifié, on l'ajoute à la requête
      if (sort != undefined) {
        if (sort == "date") {
          query = query.orderBy("created_at", "desc");
          parametersArray = [...parametersArray, "sort=date"];
        } else if (sort == "amount") {
          query = query.orderBy("amount_to_pay", "desc");
          parametersArray = [...parametersArray, "sort=amount"];
        }
      } else {
        query = query.orderBy("withdraw", "asc");
      }

      // Si une page est spécifiée, on l'ajoute à la requête
      if (page != undefined) {
        if (page <= 0) {
          page = 1;
        } else if (page > maxPage) {
          page = maxPage;
        }
        query = query.offset((page - 1) * pagination).limit(pagination);
      }

      // On éxécute la requête
      let orders = await query;

      // Si on a des commandes
      if (orders) {
        // On construit chaque commande
        let ordersRes = [];
        orders.forEach(async (order) => {
          let orderDatas = {
            order: {
              id: order.id,
              client_name: order.name,
              order_date: order.created_at,
              delivery_date: order.withdraw,
              status: order.status,
              amount: order.amount_to_pay,
            },
            links: {
              self: { href: "/orders/" + order.id },
            },
          };
          ordersRes.push(orderDatas);
        });
        // On construit les liens de pagination
        let links = null;
        if (page != undefined) {
          links = [
            {
              next:
                parseInt(page) + 1 <= maxPage
                  ? {
                      href:
                        "/orders?page=" +
                        (parseInt(page) + 1) +
                        "&" +
                        parametersArray.join("&"),
                    }
                  : null,
              prev:
                parseInt(page) - 1 > 0
                  ? {
                      href:
                        "/orders?page=" +
                        (parseInt(page) - 1) +
                        "&" +
                        parametersArray.join("&"),
                    }
                  : null,
              first: { href: "/orders?page=1&" + parametersArray.join("&") },
              last: {
                href:
                  "/orders?page=" + maxPage + "&" + parametersArray.join("&"),
              },
            },
          ];
        }
        // On construit le résultat
        let result = [
          {
            type: "collection",
            count: count[0].count,
            size: orders.length,
            links: links,
            orders: ordersRes,
          },
        ];
        // On envoie le résultat
        res.json(result);
      }
    } else {
      // Cas où il n'y a pas de commande
      res.sendStatus(404);
    }
  } catch (error) {
    // Cas où il y a un problème d'éxécution
    res.sendStatus(500);
  }
});

/* Méthode GET sur /orders/:id. Récupération d'une commande */
router.get("/:id", async (req, res, next) => {
  // On récupère l'id de la commande
  const idParam = req.params.id;
  // Cas sans problème d'éxécution
  try {
    // On récupère la commande
    let results = await knex("orders").where("id", idParam).first();
    // On vérifie que la commande existe
    if (results) {
      // On construit le résultat
      results = {
        type: "ressource",
        order: results,
        links: {
          self: { href: "/orders/" + results.id },
          items: { href: "/orders/" + results.id + "/items" },
        },
      };
      // On vérifie si on doit inclure les items
      let embed = req.query.embed;
      if (embed != undefined && embed.toLowerCase() == "items") {
        // On récupère les items de la commande
        let items = await knex("items").where("order_id", idParam);
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
          // On ajoute les items au résultat
          results.order.items = itemres;
        } else {
          // Cas où la commande n'a pas d'items
          res.status(404).json({
            type: "error",
            error: 404,
            message: "ressource non disponible ",
          });
        }
      }
      // On envoie le résultat
      res.json(results);
    } else {
      // Cas où la commande n'existe pas
      res.status(404).json({
        type: "error",
        error: 404,
        message: "ressource non disponible : /orders/" + idParam + "/",
      });
    }
  } catch (error) {
    // Cas avec problème d'éxécution
    req.sendStatus(500);
  }
});

/* Méthode PUT sur /orders/:id. Modification d'une commande */
router.put("/:id", async (req, res, next) => {
  // Schéma de validation
  const schema = Joi.object({
    client_name: Joi.string().alphanum().min(3).max(30).required(),
    client_mail: Joi.string().email().required(),
    date: Joi.date().required(),
    time: Joi.string()
      .pattern(new RegExp("^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"))
      .required(),
  });

  try {
    let validated = schema.validate({
      client_name: req.body.client_name,
      client_mail: req.body.client_mail,
      date: req.body.delivery.date,
      time: req.body.delivery.time,
    });

    if (!validated.error) {
      // Cas sans problème d'éxécution
      const idParam = req.params.id;
      const { client_name, client_mail, date, time } = req.body;
      const isdate = new Date(date + " " + time);

      if (isdate == "Invalid Date") {
        res.sendStatus(400);
      } else {
        const test = await knex("orders").where("id", idParam).update({
          name: client_name,
          email: client_mail,
          withdraw: isdate,
        });
        if (test == 1) {
          res.sendStatus(204);
        } else {
          res.sendStatus(404);
        }
      }
    } else {
      // Cas avec problème de validation
      res.sendStatus(400);
    }
  } catch (error) {
    // Cas avec problème d'éxécution
    req.sendStatus(500);
  }
});

/* Méthode GET sur /orders/:id/items. Récupération des items d'une commande */
router.get("/:id/items", async (req, res, next) => {
  // On récupère l'id de la commande
  const idParam = req.params.id;
  // Cas sans problème d'éxécution
  try {
    // On récupère la commande
    let order = await knex("orders").where("id", idParam).first();
    // On vérifie que la commande existe
    if (order) {
      // On récupère les items de la commande
      let items = await knex("items").where("order_id", idParam);
      // On vérifie que la commande a des items
      if (items) {
        // On construit le résultat
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
        // On envoie le résultat
        res.json(result);
      } else {
        // Cas où la commande n'a pas d'items
        res.sendStatus(404);
      }
    } else {
      // Cas où la commande n'existe pas
      res.sendStatus(404);
    }
  } catch (error) {
    // Cas avec problème d'éxécution
    res.sendStatus(500);
  }
});

/* Méthode POST sur /order. Nouvelles commandes avec nouveaux items */
router.post("/", async (req, res, next) => {
  // Schéma de validation des données de commande
  const schema = Joi.object({
    client_name: Joi.string().alphanum().min(3).max(30).required(),
    client_mail: Joi.string().email().required(),
    date: Joi.date().required(),
    time: Joi.string()
      .pattern(new RegExp("^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$"))
      .required(),
  });

  // Schéma de validation des données d'items
  const itemSchema = Joi.object({
    uri: Joi.string().pattern(new RegExp("^/sandwiches/[0-9]+$")).required(),
    quantity: Joi.number().integer().min(1).required(),
    label: Joi.string().alphanum().min(3).max(30).required(),
    price: Joi.number().min(0).required(),
  });
  // Cas sans problème d'éxécution
  try {
    let validator = true;

    // On fait la validation des données de commande
    let validated = schema.validate({
      client_name: req.body.client_name,
      client_mail: req.body.client_mail,
      date: req.body.delivery.date,
      time: req.body.delivery.time,
    });
    if (validated.error) {
      validator = false;
    }

    // On fait la vérification des items
    let itemIterator = 0;
    while (req.body.items[itemIterator] && validator) {
      let itemValid = itemSchema.validate({
        uri: req.body.items[itemIterator].uri,
        quantity: req.body.items[itemIterator].quantity,
        label: req.body.items[itemIterator].label,
        price: req.body.items[itemIterator].price,
      });
      if (itemValid.error) {
        validator = false;
      }
      itemIterator++;
    }

    // Si la commande est valide
    if (validator) {
      // On génère un id unique pour la commande
      let uuid = uuidv4();
      // On calcule le prix total de la commande
      let totalPrice = req.body.items.reduce((acc, item) => {
        return acc + item.price * item.quantity;
      }, 0);
      // On crée la date de retrait
      let withdrawDate = new Date(
        req.body.delivery.date + " " + req.body.delivery.time
      );

      // On insère la commande dans la base de données
      await knex
        .insert({
          amount_to_pay: totalPrice,
          created_at: new Date(),
          updated_at: new Date(),
          email: req.body.client_mail,
          id: uuid,
          name: req.body.client_name,
          withdraw: withdrawDate,
        })
        .into("orders");

      // On insère les items de la commande dans la base de données
      req.body.items.forEach(async (item) => {
        let newItem = {
          order_id: uuid,
          label: item.label,
          price: item.price,
          quantity: item.quantity,
          uri: item.uri,
        };
        await knex.insert(newItem).into("items");
      });

      // On renvoie la réponse pour la création de la commande
      res
        .status(201)
        .location("/orders/" + uuid)
        .json({
          client_name: req.body.client_name,
          client_mail: req.body.client_mail,
          withdraw: withdrawDate,
          id: uuid,
          total_amount: totalPrice,
        });
    } else {
      // Si les validations sont incorrectes
      res.sendStatus(400);
    }
  } catch (error) {
    // Cas d'erreur
    res.sendStatus(500);
  }
});

/* Méthode pour tout Uri invalide */
router.all("/:id", async (req, res, next) => {
  res.status(405).json({
    type: "error",
    error: 405,
    message: "Requête non authorisée",
  });
});

module.exports = router;
