var express = require("express");
var  bodyParser = require("body-parser");
var session = require("express-session");
var cookieParser = require("cookie-parser");
var upload = require("express-fileupload");
var conn = require("./conn");
var adminroute = require("./router/admin");
var userroute = require("./router/user");
var path = require("path");
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
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/admin",adminroute);
app.use("/user",userroute);



app.listen(1000)