const express = require('express');
const router = express.Router();
const knex = require('../db_connection');

router.get('/',async (req, res, next)  => {
    try{
      let results = await knex('item');
      res.json(results);
    }catch(error){
      console.log(error);
      res.sendStatus(500);
    }
});

module.exports = router;
