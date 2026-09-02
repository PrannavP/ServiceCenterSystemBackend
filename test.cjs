const { Pool } = require('pg');
const pool = new Pool({ 
    host: '13.232.223.104', 
    port: 5432, 
    database: 'ServiceCentreDb', 
    user: 'servicecenter_user', 
    password: 'service_center', 
    ssl: { rejectUnauthorized: false } 
});
pool.query("SELECT * FROM app.tbl_user WHERE lower(username) = 'admin'").then(res => { 
    console.log(res.rows); 
    pool.end(); 
}).catch(console.error);
