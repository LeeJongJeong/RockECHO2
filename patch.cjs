const fs = require('fs');
let data = fs.readFileSync('src/services/ai-service.ts', 'utf8');
data = data.replace('const id = uuidv4()', `const stub = await db.prepare("SELECT id FROM knowledge_entry WHERE incident_id = ? AND status = 'raw_input'").bind(input.incidentId).first<{ id: string }>()\n  const id = stub?.id || uuidv4()`);
fs.writeFileSync('src/services/ai-service.ts', data);
