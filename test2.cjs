const bcrypt = require('bcrypt');
const hash = '$2b$10$A3QZ4rVYLiVPfneWWFXwRePf4QHBGzGSBJraB6C5dut81ZakVC6mK';
bcrypt.compare('Admin@12', hash).then(res => {
    console.log("Does Admin@12 match? ", res);
});
bcrypt.compare('admin', hash).then(res => {
    console.log("Does admin match? ", res);
});
bcrypt.compare('admin123', hash).then(res => {
    console.log("Does admin123 match? ", res);
});
