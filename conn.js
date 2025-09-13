var mysql = require('mysql');
var util = require('util');

var conn = mysql.createConnection({
  host: "biraqu10fdxc8n6ny0aj-mysql.services.clever-cloud.com",
  user: "u6jinnt8j5a1tshf",
  password: "u6jinnt8j5a1tshf",
  database: "biraqu10fdxc8n6ny0aj"
});

// var conn = mysql.createConnection({
//   host: "localhost",  
//   user:'root',
//   password:'',
//   database:'construction'
// });

var exe = util.promisify(conn.query).bind(conn);

module.exports = exe;