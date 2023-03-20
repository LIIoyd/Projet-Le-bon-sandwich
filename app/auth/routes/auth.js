const express = require("express");
const router = express.Router();
const knex = require("../db_connection");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

/* Méthode POST sur /auth */
// used to signup, must return access_token and refresh_token
router.post("/signup", async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  });

  const { error, value } = schema.validate(req.body);

  if (!error) {
    try {
      const user = await knex("clients").where("email", value.email).first();

      if (!user) {
        await knex
          .insert({
            name: value.name,
            email: value.email,
            password: await bcrypt.hash(value.password, 10),
            total_spent: 0,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .into("clients");
        res.status(201).json({
          type: "success",
          error: null,
          message: "Utilisateur créé",
        });
      } else {
        res.status(409).json({
          type: "error",
          error: 409,
          message: "Cet utilisateur existe déjà",
        });
      }
    } catch (err) {
      res.sendStatus(500);
    }
  } else {
    res.status(400).json({
      type: "error",
      error: 400,
      message: error.details[0].message,
    });
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
