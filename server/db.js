const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '47.94.131.132',      // 例如：rm-xxxx.mysql.rds.aliyuncs.com
  user: 'weight',    // 例如：root
  password: '123456',  // 例如：123456
  database: 'weight',    // 例如：vehicle_weight
  port: 3306,                 // MySQL默认端口
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool; 