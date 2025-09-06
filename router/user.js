var express = require("express");
var router = express.Router();
var exe = require("../conn");  

router.get("/",function(req,res){
    res.send("welcome to user home page");
});

module.exports = router;