const mysql = require('mysql2');

// create the connection to database
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'projectdb'
  });
// creates the promise pool
const promisePool = pool.promise();

module.exports = {
    pool: pool,
    promisePool: promisePool
};
