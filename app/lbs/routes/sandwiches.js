const axios = require("axios");
const express = require("express");
const router = express.Router();
const Joi = require("joi");

router.get("/", async (req, res, next) => {
  try {
    const { data } = await axios.get("http://directus:8055/items/sandwiches");
    res.json(data);
  } catch (err) {
    res.sendStatus(err.response.status);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data } = await axios.get(
      `http://directus:8055/items/sandwiches/${id}`
    );
    res.json(data);
  } catch (err) {
    res.sendStatus(err.response.status);
  }
});

module.exports = router;
