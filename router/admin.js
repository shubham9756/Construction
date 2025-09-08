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