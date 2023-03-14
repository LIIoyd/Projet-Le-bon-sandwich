const express = require("express");
const router = express.Router();
const knex = require("../db_connection");
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");

/* Méthode POST sur /auth */
router.post("/", async (req, res, next) => {});

/* Méthode pour tout Uri invalide */
router.all("/:id", async (req, res, next) => {
  res.status(405).json({
    type: "error",
    error: 405,
    message: "Requête non authorisée",
  });
});

module.exports = router;
