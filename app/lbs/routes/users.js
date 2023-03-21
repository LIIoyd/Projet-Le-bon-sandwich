const axios = require("axios");
const express = require("express");
const router = express.Router();

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

      return user.data;
    } catch (err) {
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(400);
  }
});

module.exports = router;
