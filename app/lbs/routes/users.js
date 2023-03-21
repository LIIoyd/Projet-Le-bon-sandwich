const axios = require("axios");
const express = require("express");
const router = express.Router();
const Joi = require("joi");

router.post("/signup", async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  });
  const { error, value } = schema.validate(req.body);

  if (!error) {
    try {
      const user = await axios.post("http://node_auth:3000/auth/signup", {
        name: value.name,
        email: value.email,
        password: value.password,
      });

      res.json(user.data);
    } catch (err) {
      res.sendStatus(err.response.status);
    }
  } else {
    res.sendStatus(400);
  }
});

router.post("/signin", async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  });

  const { error, value } = schema.validate(req.body);

  // Si aucune erreur de validation du body, on continue
  if (!error) {
    try {
      const user = await axios.post("http://node_auth:3000/auth/signin", {
        email: value.email,
        password: value.password,
      });
        res.json(user.data);
     
    } catch (err) {
        res.sendStatus(err.response.status);
    }
  } else {
    res.sendStatus(400);
  }
});

module.exports = router;
