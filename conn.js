const mysql = require('mysql');
const util = require('util');

const pool = mysql.createPool({
  host: "biraqu10fdxc8n6ny0aj-mysql.services.clever-cloud.com",
  user: "u6jinnt8j5a1tshf",
  password: "Ri4fc5wniRPJMs3E85Cx",
  database: "biraqu10fdxc8n6ny0aj",
  connectionLimit: 10,   // किती connections allow करायचे
});

// promisify query for async/await
const exe = util.promisify(pool.query).bind(pool);

module.exports = exe;
