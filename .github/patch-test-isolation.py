from pathlib import Path
p=Path('server.js')
s=p.read_text()
old='const dataDir = process.env.RAILWAY_ENVIRONMENT ? "/data" : __dirname;'
new='const dataDir = process.env.MINYA_DATA_DIR ? path.resolve(process.env.MINYA_DATA_DIR) : (process.env.RAILWAY_ENVIRONMENT ? "/data" : __dirname);'
assert old in s, 'dataDir line not found'
p.write_text(s.replace(old,new,1))
