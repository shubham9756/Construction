var express = require("express");
var  bodyParser = require("body-parser");
var session = require("express-session");
var cookieParser = require("cookie-parser");
var upload = require("express-fileupload");
var admin = require("./router/admin");

var site = require("./router/site");
var godown = require("./router/godown");
var conn = require("./conn");
var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());



app.use(express.static("public/"));
app.use(cookieParser());
app.use(session
    ({secret: "efsgfrrefefrgr",
     resave: true,
      saveUninitialized: true
    }));
app.use(upload());

app.use("/admin",admin)
app.use("/site", site);
app.use("/godown", godown);

app.get("/", function(req, res){
    res.send("Welcome To  Construction");
});


app.listen(1000)