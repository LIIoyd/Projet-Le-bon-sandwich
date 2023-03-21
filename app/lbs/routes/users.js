const axios = require("axios");
const express = require('express');
const router = express.Router();
const Joi = require("joi");
// POST /users/{id}/signup
// POST /users/signin
// POST /users/signout

router.post('/signin', async (req, res, next) => {
    const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  });

  const { error, value } = schema.validate(req.body);

    // Si aucune erreur de validation du body, on continue
    if (!error) {
        try {
            const user = await axios.post(`http://node_auth:3000/auth/signin`,  value);
            if (user) {
                res.json(user.data);
            } else {
                res.sendStatus(401);
            }
        } catch (err) {
            res.status(401).json({
                type: "error",
                error: err.response.status,
                message: err.response.data.message,
            });
        }
    } else {
        res.sendStatus(400);
    }
});












module.exports = router;
