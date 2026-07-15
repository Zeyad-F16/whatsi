const fs = require('fs'); 
const files = [
  'src/app/admin/page.tsx', 
  'src/app/admin/clients/page.tsx', 
  'src/app/admin/logs/page.tsx', 
  'src/app/api/admin/clients/route.ts', 
  'src/app/api/admin/clients/[id]/route.ts', 
  'src/app/api/admin/clients/[id]/regenerate-code/route.ts', 
  'src/app/api/license/activate/route.ts', 
  'src/app/api/license/verify/route.ts'
]; 
files.forEach(f => { 
  if(fs.existsSync(f)){ 
    let c = fs.readFileSync(f, 'utf8'); 
    c = c.replace(/\\`/g, '`').replace(/\\\$/g, '$'); 
    fs.writeFileSync(f, c); 
    console.log('Fixed', f); 
  } else { 
    console.log('Not found', f); 
  } 
});
