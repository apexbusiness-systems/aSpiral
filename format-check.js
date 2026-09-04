const fs = require('fs');
const content = fs.readFileSync('.jules/bolt.md', 'utf-8');
console.log(content);
