const express = require('express');
const router = express.Router();
const knex = require('../db_connection');

/* GET users listing. */
router.get('/',async (req, res, next)  => {
  try{
    let results = await knex('client');
    res.json(results);
  }catch(error){
    console.log(error);
    res.sendStatus(500);
  }
});


module.exports = router;
