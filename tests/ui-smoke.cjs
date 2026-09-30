const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('public/js/app.js','utf8');
async function run(role,token){
 const listeners={},root={innerHTML:'',classList:{toggle(){}},addEventListener:(name,fn)=>listeners[name]=fn};
 const api={url:()=>'',token:()=>token,setUrl:()=>{},setToken:()=>{},clearToken:()=>{},call:async action=>{
   if(action!=='bootstrap')throw Error('unexpected');
   return {user:{id:'NV001',name:'พนักงาน',nickname:'นัท',role},users:role==='employee'?[]:[{id:'NV001',name:'พนักงาน',nickname:'นัท',role:'employee',status:'ใช้งาน'}],attendance:[],leaves:[],leaveTypes:[{id:'ANNUAL',name:'ลาพักร้อน',days:6,status:'ใช้งาน'}],shifts:[{id:'NORMAL',name:'กะปกติ',status:'ใช้งาน'}],settings:{'OT 1.0x':1,'OT 1.5x':1.5,'OT 2.0x':2,'OT 3.0x':3}};
 }};
 const ctx=vm.createContext({document:{getElementById:()=>root},NovaApi:api,NovaFace:{stop(){},start:async()=>Array(128).fill(0.1)},Intl,Date,Object,String,Number,Array,RegExp,setTimeout:()=>{},window:{scrollTo(){}},sessionStorage:{},localStorage:{}});
 vm.runInContext(code,ctx);
 await new Promise(r=>setImmediate(r));
 return {html:root.innerHTML,listeners,root};
}
(async()=>{const login=await run('employee','');assert(login.html.includes('เข้าสู่ระบบ'));const employee=await run('employee','token');assert(employee.html.includes('ยื่นคำขอลา'));await employee.listeners.click({target:{closest:selector=>selector==='[data-tab]'?{dataset:{tab:'scan'}}:null}});assert(employee.root.innerHTML.includes('scanVideo'));assert(employee.root.innerHTML.includes('สแกนใบหน้าเข้า–ออกงาน'));const owner=await run('owner','token');assert(owner.html.includes('อนุมัติเวลา'));await owner.listeners.click({target:{closest:selector=>selector==='[data-tab]'?{dataset:{tab:'settings'}}:null}});assert(owner.root.innerHTML.includes('ลงทะเบียนใบหน้าพนักงาน'));assert(owner.root.innerHTML.includes('enrollVideo'));console.log('PASS login, employee scan, admin enrollment rendering');})().catch(e=>{console.error(e);process.exit(1)});
