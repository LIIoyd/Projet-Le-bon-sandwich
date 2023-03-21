const express = require('express');
const router = express.Router();
const axios = require("axios");
const Joi = require('joi');


// GET /orders/{id}?embed=items
router.get("/:id", async (req, res, next) => {
    try {
        const authorization = req.headers.authorization.split(' ')[1];
        await axios.get(`http://node_auth:3000/auth/validate`, {
            headers: { 'Authorization' : `Bearer ${authorization}` }
        }).catch((err) => {
            res.json(err.response.data)
        });

        const { id } = req.params;
        const { embed } = req.query;
        const order = await axios.get(`http://node_orders:3000/orders/${id}`);
        if (order) {
            if (embed === "items") {
                const items = await axios.get(`http://node_orders:3000/orders/${id}/items`);
                if (items) {
                    res.json({ ...order.data, items: items.data });
                }              
            } else {
                res.json(order.data);
            }
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        res.sendStatus(500);
    }
});

// POST /orders
router.post("/", async (req, res, next) => {
    // Validation du body
    const schema = Joi.object({
        client_name: Joi.string().alphanum().min(3).max(30).required(),
        client_mail: Joi.string().email().required(),
        delivery: Joi.object({
            // date future only
            date: Joi.date().min('now').required(),
            time: Joi.string().pattern(new RegExp("^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$")).required(),
        }).required(),
        items: Joi.array().items(
            Joi.object({
                uri: Joi.string().pattern(new RegExp("^/sandwiches/[0-9]+$")).required(),
                quantity: Joi.number().integer().min(1).required(),
                label: Joi.string().alphanum().min(3).max(30).required(),
                price: Joi.number().min(0).required(),
            })
        ),
    });
    const { error, value } = schema.validate(req.body);
    if (!error) {  
        try {
            exist = true;
            ite = 0;
            while (exist && req.body.items.length > ite) {
                req.body.items.forEach(async element => {
                    id = element.uri.replace('/sandwiches/', '');
                    await axios.get(`http://directus:8055/items/sandwiches/${id}`).catch((err) => {
                        exist = false;
                        res.json(err.response.data)
                    });
                });
                ite++;
            }
            const authorization = req.headers.authorization.split(' ')[1];
            await axios.get(`http://node_auth:3000/auth/validate`, {
                headers: { 'Authorization' : `Bearer ${authorization}` }
            }).catch((err) => {
                res.json(err.response.data)
            });
            const order = await axios.post(`http://node_orders:3000/orders/`, req.body);
            if (order) {
                res.json(order.data);
            } else {
                res.sendStatus(404);
            }
        } catch (err) {
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(400);
    };
});

module.exports = router;