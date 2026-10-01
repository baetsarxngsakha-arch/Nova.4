const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('public/js/app.js','utf8');
async function run(role,token){
 const listeners={},root={innerHTML:'',classList:{toggle(){}},addEventListener:(name,fn)=>listeners[name]=fn,querySelector:selector=>selector==='#kioskVideo'?{}:null};
 const api={url:()=>'',token:()=>token,setUrl:()=>{},setToken:()=>{},clearToken:()=>{},call:async action=>{
   if(action==='publicScan')return {action:'clockIn',name:'พนักงาน',nickname:'นัท',time:'08:59'};
   if(action!=='bootstrap')throw Error('unexpected');
   return {user:{id:'NV001',name:'พนักงาน',nickname:'นัท',role,face:{status:'ใช้งาน'}},users:role==='employee'?[]:[{id:'NV001',name:'พนักงาน',nickname:'นัท',role:'employee',status:'ใช้งาน',face:{status:'ใช้งาน'}}],attendance:[],leaves:[],leaveTypes:[{id:'ANNUAL',name:'ลาพักร้อน',days:6,status:'ใช้งาน'}],shifts:[{id:'NORMAL',name:'กะปกติ',status:'ใช้งาน'}],calendar:{users:[{id:'NV001',name:'พนักงาน',nickname:'นัท'}],attendance:[],leaves:[],daysOff:[]},settings:{'OT 1.0x':1,'OT 1.5x':1.5,'OT 2.0x':2,'OT 3.0x':3}};
 }};
 const ctx=vm.createContext({document:{getElementById:()=>root},NovaApi:api,NovaFace:{stop(){},start:async()=>Array(128).fill(0.1)},Intl,Date,Object,String,Number,Array,RegExp,setTimeout:()=>{},window:{scrollTo(){},addEventListener(){}},sessionStorage:{},localStorage:{}});
 vm.runInContext(code,ctx);await new Promise(r=>setImmediate(r));
 return {html:root.innerHTML,listeners,root};
}
const click=async(view,kind,value)=>view.listeners.click({target:{closest:selector=>selector===kind?value:null}});
(async()=>{
 const guest=await run('employee','');assert(guest.html.includes('สแกนหน้าเพื่อบันทึกเวลา'));assert(guest.html.includes('เข้าสู่ระบบ'));
 await click(guest,'[data-action]',{dataset:{action:'kiosk-scan'}});await new Promise(r=>setImmediate(r));assert(guest.root.innerHTML.includes('บันทึกเวลาสำเร็จ'));
 const employee=await run('employee','token');assert(employee.html.includes('สแกนหน้าเพื่อบันทึกเวลา'));
 await click(employee,'[data-action]',{dataset:{action:'open-login'}});assert(employee.root.innerHTML.includes('ยื่นคำขอลา'));
 await click(employee,'[data-tab]',{dataset:{tab:'scan'}});assert(employee.root.innerHTML.includes('scanVideo'));
 await click(employee,'[data-tab]',{dataset:{tab:'calendar'}});assert(employee.root.innerHTML.includes('ปฏิทินทุกคน'));
 const owner=await run('owner','token');await click(owner,'[data-action]',{dataset:{action:'open-login'}});assert(owner.root.innerHTML.includes('อนุมัติเวลา'));
 await click(owner,'[data-tab]',{dataset:{tab:'settings'}});assert(owner.root.innerHTML.includes('ลงทะเบียนใบหน้าพนักงาน'));assert(owner.root.innerHTML.includes('enrollVideo'));assert(owner.root.innerHTML.includes('ประเภทการลา'));
 console.log('PASS kiosk first page, login menu, employee scan and calendar, admin enrollment');
})().catch(e=>{console.error(e);process.exit(1)});
