var express = require("express");
var  bodyParser = require("body-parser");
var session = require("express-session");
var cookieParser = require("cookie-parser");
var upload = require("express-fileupload");

var adminroute = require("./router/admin");

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public/"));
app.use(cookieParser());
app.use(session
    ({secret: "efsgfr",
     resave: true,
      saveUninitialized: true
    }));
app.use(upload());

app.use("/",adminroute);



app.listen(1000)