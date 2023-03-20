const express = require("express");
const router = express.Router();
const knex = require("../db_connection");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const randToken = require("rand-token");

// Méthode POST pour créer un utilisateur
router.post("/signup", async (req, res, next) => {
  // On vérifie que le body contient bien un nom, un email et un mot de passe
  const schema = Joi.object({
    name: Joi.string().min(1).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  });

  const { error, value } = schema.validate(req.body);

  // Si aucune erreur de validation du body, on continue
  if (!error) {
    try {
      // On vérifie que l'utilisateur n'existe pas déjà
      const user = await knex("clients").where("email", value.email).first();

      // Si l'utilisateur n'existe pas, on le crée
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

        // On retourne un message de succès
        res.status(201).json({
          type: "success",
          error: null,
          message: "Utilisateur créé",
        });
      } else {
        // Si l'utilisateur existe déjà, on renvoie une erreur 409
        res.status(409).json({
          type: "error",
          error: 409,
          message: "Cet utilisateur existe déjà",
        });
      }
    } catch (err) {
      // Si une erreur est survenue lors de l'execution, on renvoie une erreur 500
      res.sendStatus(500);
    }
  } else {
    // Si une erreur de validation du body est survenue, on renvoie une erreur 400
    res.sendStatus(400);
  }
});

// Méthode POST pour se connecter
router.post("/signin", async (req, res, next) => {
  // On vérifie que le body contient bien un email et un mot de passe
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  });

  const { error, value } = schema.validate(req.body);

  // Si aucune erreur de validation du body, on continue
  if (!error) {
    try {
      // On récupère le mot de passe hashé de l'utilisateur
      const user = await knex("clients").where("email", value.email).first();

      // On vérifie que l'utilisateur existe
      if (user) {
        // On compare le mot de passe entré avec le mot de passe hashé
        const validPassword = await bcrypt.compare(
          value.password,
          user.password
        );

        // Si le mot de passe est correct
        if (validPassword) {
          // On génère les tokens
          const tokens = await generateTokens(user.id);

          // On retourne les tokens
          res.status(200).json({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });
        } else {
          // Si le mot de passe est incorrect, on renvoie une erreur 401
          res.status(401).json({
            type: "error",
            error: 401,
            message: "Mot de passe incorrect",
          });
        }
      } else {
        // Si l'utilisateur n'existe pas, on renvoie une erreur 404
        res.status(404).json({
          type: "error",
          error: 404,
          message: "Cet utilisateur n'existe pas",
        });
      }
    } catch (err) {
      // Si une erreur est survenue lors de l'execution, on renvoie une erreur 500
      res.sendStatus(500);
    }
  } else {
    // Si une erreur de validation du body est survenue, on renvoie une erreur 400
    res.sendStatus(400);
  }
});

// Méthode POST pour rafraichir le token
router.post("/refreshToken", async (req, res, next) => {
  // On vérifie que le refresh token est présent dans le body
  const schema = Joi.object({
    refresh_token: Joi.string().required(),
  });
  const { error, value } = schema.validate(req.body);

  // Si aucune erreur de vérification du body, on continue
  if (!error) {
    try {
      // On récupère l'access token
      const decode = verifyToken(req.headers["authorization"]);
      // On récupère ce token dans la base de données
      const refreshToken = await knex("clients")
        .select("refresh_token")
        .where("refresh_token", value.refresh_token)
        .first();

      // Si le token existe dans la base de données
      if (refreshToken) {
        // On génère un nouveau couple de token
        const tokens = generateTokens(decode.id);

        // On retourne les nouveaux tokens
        res.status(200).json({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
      } else {
        // Si le token n'existe pas, on renvoie une erreur 401
        res.status(401).json({
          type: "error",
          error: 401,
          message: "Token invalide",
        });
      }
    } catch (err) {
      // Si une erreur est survenue lors de l'execution, on renvoie une erreur 500
      res.sendStatus(500);
    }
  } else {
    // Si une erreur de validation du body est survenue, on renvoie une erreur 400
    res.sendStatus(400);
  }
});

// Methode GET pour vérifier si le token est valide
router.get("/validate", (req, res) => {
  try {
    //On appelle la metode verifyToken pour vérifier le token en lui passant en parametre le header autorization
    const decode = verifyToken(req.headers["authorization"]);
    console.log(decode);
    //  Si le token est valide on renvoie un status 200 avec le login a true et les données du token
    res.status(200).json({
      login: true,
      data: decode,
    });
  } catch (err) {
    // si le token est invalide ou probleme de header on renvoie une erreur 401
    res.status(401).json({
      login: false,
      data: "error",
    });
  }
});

router.all("/signup", async (req, res, next) => {
  res.status(405).json({
    type: "error",
    error: 405,
    message: "Requête non authorisée",
  });
});

router.all("/signin", async (req, res, next) => {
  res.status(405).json({
    type: "error",
    error: 405,
    message: "Requête non authorisée",
  });
});

router.all("/refreshToken", async (req, res, next) => {
  res.status(405).json({
    type: "error",
    error: 405,
    message: "Requête non authorisée",
  });
});

router.all("/validate", async (req, res, next) => {
  res.status(405).json({
    type: "error",
    error: 405,
    message: "Requête non authorisée",
  });
});

// Vérifie que l'access token est valide
function verifyToken(bearer) {
  // On vérifie que le token est présent dans le header
  if (bearer && bearer.startsWith("Bearer")) {
    // On récupère le token sans le mot Bearer
    const bearerHeader = bearer.split(" ");
    const bearerToken = bearerHeader[1];

    try {
      // On vérifie que le token est valide en le décodant
      const decode = jwt.verify(bearerToken, process.env.ACCESS_TOKEN_SECRET);
      return decode;
    } catch (err) {
      throw new Error("Token invalide");
    }
  } else {
    throw new Error("Token invalide");
  }
}

// Genère l'access token et le refresh token en prenant l'utilisateur en paramètre
async function generateTokens(id) {
  // Génération de l'access token
  const token = await jwt.sign(
    {
      id: id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1h",
    }
  );

  // Génération du refresh token
  const refreshToken = await randToken.generate(30);
  await knex("clients").where("id", id).update({
    refresh_token: refreshToken,
  });

  // Retourne les tokens
  return {
    access_token: token,
    refresh_token: refreshToken,
  };
}
module.exports = router;
