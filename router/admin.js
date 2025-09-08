var express = require('express');
var exe = require("../conn");
var router = express.Router();

router.get("/",function(req,res){
    res.render("admin/home.ejs");
});

router.get("/addsite",function(req,res){
    res.render("admin/addsite.ejs");
});

module.exports = router;

