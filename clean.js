import fs from 'fs';
let data = fs.readFileSync('app_data.json', 'utf8');
data = data.replace(/"stage": "Jogos "/g, '"stage": "Jogos"');
fs.writeFileSync('app_data.json', data);
