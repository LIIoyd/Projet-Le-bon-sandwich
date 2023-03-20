const express = require('express');
const router = express.Router();
const axios = require("axios");


// GET /orders/{id}?embed=items
router.get("/:id", async (req, res, next) => {
    try {
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
        next(err);
    }
});

// POST /orders



module.exports = router;