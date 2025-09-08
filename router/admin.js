
var express = require('express');
var exe = require("../conn");
var router = express.Router();

router.get("/", function(req, res){
    res.send("Welcome To Admin Panel");
});
var express = require("express");
var router = express.Router();
var exe = require("../conn");

router.get("/",function(req,res){
    res.render("admin/home.ejs");
});
router.get("/addsite",function(req,res){
    res.render("admin/addsite.ejs");
});

module.exports = router;

