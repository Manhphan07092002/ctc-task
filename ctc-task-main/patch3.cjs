const fs = require('fs');
let content = fs.readFileSync('frontend/pages/Admin/DatabaseManagement.tsx', 'utf8');

content = content.replace(
  "alert(data.message || 'Import thành công. Hệ thống đang khởi động lại...');",
  "alert(data.message || 'Import thành công. Hệ thống đang khởi động lại, trang sẽ tự làm mới sau 10 giây...');"
);

content = content.replace(
  "setTimeout(() => {\r\n        window.location.reload();\r\n      }, 3000);",
  "setTimeout(() => {\r\n        window.location.reload();\r\n      }, 10000);"
);

content = content.replace(
  "setTimeout(() => {\n        window.location.reload();\n      }, 3000);",
  "setTimeout(() => {\n        window.location.reload();\n      }, 10000);"
);

fs.writeFileSync('frontend/pages/Admin/DatabaseManagement.tsx', content);
console.log("Patched");
