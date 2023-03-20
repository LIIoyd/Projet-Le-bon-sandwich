const express = require("express");
const router = express.Router();
const knex = require("../db_connection");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const randToken = require("rand-token");

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

router.post("/signin", async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  });

  const { error, value } = schema.validate(req.body);

  if (!error) {
    try {
      // On récupère le mot de passe hashé de l'utilisateur
      const hashedPassword = await knex("clients")
        .select("password")
        .where("email", value.email)
        .first();

      // On vérifie que l'utilisateur existe
      if (hashedPassword) {
        // On compare le mot de passe entré avec le mot de passe hashé
        const validPassword = await bcrypt.compare(
          value.password,
          hashedPassword.password,
          function (err, result) {
            if (err) {
              res.sendStatus(500);
            }
            return result;
          }
        );

        // Si le mot de passe est correct, on génère un token JWT
        if (validPassword) {
          const token = await jwt.sign(
            {
              email: value.email,
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
              expiresIn: "1h",
            }
          );

          // Et un refresh token
          const refreshToken = await randToken.generate(30);

          res.status(200).json({
            access_token: token,
            refresh_token: refreshToken,
          });
        } else {
          res.status(401).json({
            type: "error",
            error: 401,
            message: "Mot de passe incorrect",
          });
        }
      } else {
        res.status(409).json({
          type: "error",
          error: 409,
          message: "Cet utilisateur n'existe pas",
        });
      }
    } catch (err) {
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(400);
  }
});

router.post("/refreshToken", async (req, res, next) => {
  const schema = Joi.object({
    refresh_token: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);

  if (!error) {
    try {
      const refreshToken = await knex("refresh_tokens")
        .select("refresh_token")
        .where("refresh_token", value.refresh_token)
        .first();

      if (refreshToken) {
        const token = await jwt.sign(
          {
            id: refreshToken.id,
          },
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: "1h",
          }
        );

        res.status(200).json({
          access_token: token,
        });
      } else {
        res.status(401).json({
          type: "error",
          error: 401,
          message: "Token invalide",
        });
      }
    } catch (err) {
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(400);
  }
});

// Verify route
router.get("/validate", (req, res) => {
  // Get token value to the json body
  const token = req.headers["authorization"];

  // If the token is present
  if (token || !token.startsWith("Bearer")) {
    console.log(token);
    // Verify the token using jwt.verify method
    const bearer = token.split(" ");
    const bearerToken = bearer[1];

    console.log(bearerToken);

    try {
      const decode = jwt.verify(bearerToken, "secret");

      //  Return response with decode data
      res.status(200).json({
        login: true,
        data: decode,
      });
    } catch (err) {
      res.status(401).json({
        login: false,
        data: "error",
      });
    }
  } else {
    // Return response with error
    res.status(401).json({
      login: false,
      data: "error",
    });
  }
});

router.all("/", async (req, res, next) => {
  res.status(405).json({
    type: "error",
    error: 405,
    message: "Requête non authorisée",
  });
});

module.exports = router;
