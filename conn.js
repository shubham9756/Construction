var mysql = require('mysql');
var util = require('util');

var conn = mysql.createConnection({
  host: "b1fuygc9n4qhlfflu3qn-mysql.services.clever-cloud.com",
  user: "us2heyrjqh9uy5am",
  password: "us2heyrjqh9uy5am",
  database: "b1fuygc9n4qhlfflu3qn"
});

var exe = util.promisify(conn.query).bind(conn);

module.exports = exe;