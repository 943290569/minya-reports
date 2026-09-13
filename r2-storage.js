const crypto=require('crypto');

function config(){return{accountId:String(process.env.R2_ACCOUNT_ID||'').trim(),accessKeyId:String(process.env.R2_ACCESS_KEY_ID||'').trim(),secretAccessKey:String(process.env.R2_SECRET_ACCESS_KEY||'').trim(),bucket:String(process.env.R2_BUCKET||'').trim()};}
function configured(){const c=config();return Boolean(c.accountId&&c.accessKeyId&&c.secretAccessKey&&c.bucket);}
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const hmac=(key,value,encoding)=>crypto.createHmac('sha256',key).update(value).digest(encoding);
const encodePath=value=>String(value).split('/').map(encodeURIComponent).join('/');

function signedUrl(method,objectKey,expiresSeconds=900){const c=config();if(!configured())throw new Error('لم يتم إعداد Cloudflare R2 بعد');const now=new Date(),amzDate=now.toISOString().replace(/[:-]|\.\d{3}/g,''),date=amzDate.slice(0,8),region='auto',service='s3',host=`${c.accountId}.r2.cloudflarestorage.com`,uri=`/${encodeURIComponent(c.bucket)}/${encodePath(objectKey)}`,scope=`${date}/${region}/${service}/aws4_request`,params={'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':`${c.accessKeyId}/${scope}`,'X-Amz-Date':amzDate,'X-Amz-Expires':String(Math.min(3600,Math.max(60,expiresSeconds))),'X-Amz-SignedHeaders':'host'},query=Object.entries(params).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&'),canonical=[method,uri,query,`host:${host}\n`,'host','UNSIGNED-PAYLOAD'].join('\n'),stringToSign=['AWS4-HMAC-SHA256',amzDate,scope,sha256(canonical)].join('\n'),kDate=hmac(`AWS4${c.secretAccessKey}`,date),kRegion=hmac(kDate,region),kService=hmac(kRegion,service),kSigning=hmac(kService,'aws4_request'),signature=hmac(kSigning,stringToSign,'hex');return`https://${host}${uri}?${query}&X-Amz-Signature=${signature}`;}
async function request(method,objectKey,options={}){const response=await fetch(signedUrl(method,objectKey,300),{method,body:options.body,headers:options.headers});if(!response.ok&&!(method==='DELETE'&&response.status===404))throw new Error(`R2 HTTP ${response.status}`);return response;}
async function putObject(objectKey,body,mime='application/octet-stream'){return request('PUT',objectKey,{body,headers:{'Content-Type':mime}});}
async function deleteObject(objectKey){return request('DELETE',objectKey);}

module.exports={config,configured,signedUrl,putObject,deleteObject};
