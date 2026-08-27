from pathlib import Path

server=Path('server.js')
s=server.read_text()
s=s.replace('app.use(express.json({ limit: "12mb" }));','app.use(express.json({ limit: "50mb" }));',1)
s=s.replace('app.use(express.urlencoded({ extended: true, limit: "12mb" }));','app.use(express.urlencoded({ extended: true, limit: "50mb" }));',1)
server.write_text(s)

p=Path('public/js/app-system-restore.js')
s=p.read_text()
old='''  document.addEventListener("DOMContentLoaded", () => {\n    buildPanel();\n    document.getElementById("restoreBackupFile")?.addEventListener("change", (event) => validateFile(event.target.files?.[0] || null));\n    document.getElementById("restoreConfirmText")?.addEventListener("input", updateRestoreButton);\n    document.getElementById("restoreBackupBtn")?.addEventListener("click", restoreBackup);\n  });\n})();\n'''
new='''  function initRestore() {\n    buildPanel();\n    document.getElementById("restoreBackupFile")?.addEventListener("change", (event) => validateFile(event.target.files?.[0] || null));\n    document.getElementById("restoreConfirmText")?.addEventListener("input", updateRestoreButton);\n    document.getElementById("restoreBackupBtn")?.addEventListener("click", restoreBackup);\n  }\n\n  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initRestore);\n  else initRestore();\n})();\n'''
assert old in s, 'restore init block not found'
s=s.replace(old,new,1)
p.write_text(s)
