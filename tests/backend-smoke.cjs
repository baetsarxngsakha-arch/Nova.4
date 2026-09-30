const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
class Range{constructor(sheet,row,col,nrow,ncol){Object.assign(this,{sheet,row,col,nrow,ncol});}getValues(){return Array.from({length:this.nrow},(_,i)=>Array.from({length:this.ncol},(_,j)=>this.sheet.rows[this.row+i-1]?.[this.col+j-1]??''));}setValues(rows){rows.forEach((r,i)=>r.forEach((v,j)=>{const ri=this.row+i-1,ci=this.col+j-1;this.sheet.rows[ri]??=[];this.sheet.rows[ri][ci]=v;}));return this;}setBackground(){return this;}setFontColor(){return this;}setFontWeight(){return this;}setNumberFormat(){return this;}}
class Sheet{constructor(name){this.name=name;this.rows=[];this.columns=26;}getName(){return this.name;}setName(n){this.name=n;}getLastRow(){let n=this.rows.length;while(n&&!this.rows[n-1]?.some(v=>v!==''&&v!==undefined))n--;return n;}getLastColumn(){return Math.max(0,...this.rows.map(r=>r?.length||0));}getMaxRows(){return 1000;}getMaxColumns(){return this.columns;}insertColumnsAfter(_,n){this.columns+=n;}getRange(...a){return new Range(this,...a);}setFrozenRows(){}}
class Spreadsheet{constructor(){this.sheets=[new Sheet('ชีต1')];this.id='mock-db';}getId(){return this.id;}getUrl(){return 'https://docs.google.com/spreadsheets/d/mock-db/edit';}getName(){return 'Nova.3';}getSheets(){return this.sheets;}getSheetByName(n){return this.sheets.find(s=>s.name===n)||null;}insertSheet(n){const s=new Sheet(n);this.sheets.push(s);return s;}deleteSheet(s){this.sheets=this.sheets.filter(x=>x!==s);}setSpreadsheetTimeZone(){}}
const db=new Spreadsheet(),props=new Map(),cache=new Map(),logs=[];const oldShift=new Sheet('Shifts');oldShift.rows=[['shift_id','name']];db.sheets.push(oldShift);
function thaiFormat(d,_zone,fmt){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return fmt.replace(/'/g,'').replace('yyyy',parts.year).replace('MM',parts.month).replace('dd',parts.day).replace('HH',parts.hour).replace('mm',parts.minute).replace('ss',parts.second).replace('XXX','+07:00');}
const context=vm.createContext({console,Date,Math,JSON,String,Number,Boolean,Set,Object,Array,RegExp,Error,Logger:{log:x=>logs.push(x)},SpreadsheetApp:{getActiveSpreadsheet:()=>db,openById:()=>db,create:()=>db,flush:()=>{}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v)})},LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},CacheService:{getScriptCache:()=>({put:(k,v)=>cache.set(k,v),get:k=>cache.get(k)||null,remove:k=>cache.delete(k)})},Utilities:{getUuid:()=>crypto.randomUUID(),computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()].map(v=>v>127?v-256:v),DigestAlgorithm:{SHA_256:'SHA_256'},formatDate:thaiFormat},ContentService:{MimeType:{JSON:'json'},createTextOutput:x=>({text:x,setMimeType(){return this;}})}});
for(const f of ['Setup','Util','Code','Attendance','Leave','Users'])vm.runInContext(fs.readFileSync(`apps-script/${f}.gs`,'utf8'),context,{filename:f+'.gs'});
const call=(action,payload={},token='')=>JSON.parse(vm.runInContext('doPost',context)({postData:{contents:JSON.stringify({action,payload,token})}}).text);
const setup=vm.runInContext('setupAll()',context);assert(setup.ok);assert(db.getSheetByName('Attendance'));assert(db.getSheetByName('Accounts'));assert.strictEqual(db.getSheetByName('Attendance').getRange(1,1,1,15).getValues()[0][0],'ชื่อพนักงาน');
const owner=call('login',{userId:'OWNER',pin:setup.ownerPin});assert(owner.ok,owner.error);const ot=owner.data.token;
const added=call('saveEmployee',{userId:'NV001',name:'ทดสอบ ระบบ',nickname:'ทดสอบ',shiftId:'NORMAL',role:'employee'},ot);assert(added.ok,added.error);
const emp=call('login',{userId:'NV001',pin:added.data.pin});assert(emp.ok,emp.error);const et=emp.data.token;
assert(!call('saveSettings',{'OT 1.5x':2},et).ok);
assert(call('clockIn',{},et).ok);assert(!call('clockIn',{},et).ok);
const out=call('clockOut',{},et);assert(out.ok,out.error);
const row=call('bootstrap',{},ot).data.attendance[0];assert(row&&row.checkIn&&row.checkOut);
assert(call('reviewAttendance',{id:row.id,status:'อนุมัติ'},ot).ok);
const leave=call('requestLeave',{typeId:'ANNUAL',start:'2026-10-01',end:'2026-10-01',days:1,reason:'ธุระ'},et);assert(leave.ok,leave.error);
assert(!call('requestLeave',{typeId:'ANNUAL',start:'2026-10-01',end:'2026-10-01',days:1,reason:'ซ้ำ'},et).ok);
assert(call('reviewLeave',{id:leave.data.id,status:'อนุมัติ'},ot).ok);
assert(!call('requestLeave',{typeId:'ANNUAL',start:'2026-02-31',end:'2026-02-31',days:1},et).ok);
assert(!call('adjustAttendance',{id:row.id,reason:'ทดสอบ',ot:{'1.0':25,'1.5':0,'2.0':0,'3.0':0}},ot).ok);
assert(call('saveSettings',{'OT 1.5x':2},ot).ok);
assert(!call('saveSettings',{'OT 1.5x':99},ot).ok);
assert(!call('resetEmployeePin',{userId:'OWNER'},et).ok);
assert(call('changePin',{oldPin:added.data.pin,newPin:'24681357'},et).ok);
assert(!call('bootstrap',{},et).ok);
const relog=call('login',{userId:'NV001',pin:'24681357'});assert(relog.ok);
assert(call('resetEmployeePin',{userId:'NV001'},ot).ok);
assert(!call('bootstrap',{},relog.data.token).ok);
assert(call('ping').ok);
assert.strictEqual(vm.runInContext('setupAll()',context).ownerPin,'(PIN เดิมยังใช้งานอยู่)');
assert.strictEqual(db.getSheetByName('Accounts').getLastRow(),3);
assert.strictEqual(db.getSheetByName('Shifts').getLastRow(),3);
assert.strictEqual(db.getSheetByName('Shifts').getRange(2,3,1,1).getValues()[0][0],'MORNING');
console.log('PASS setup, login, roles, employee, clock, review, leave, repeat setup');
