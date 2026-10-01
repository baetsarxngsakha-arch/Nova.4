const NovaApp=(()=>{
  const root=document.getElementById('app');
  const state={user:null,data:null,tab:'home',busy:false,message:'',generated:null,scanning:false,faceStatus:'',faceReadyUntil:0,faceDescriptor:null,scanSequence:0,enrolling:false,enrollStatus:'',enrollTarget:'',enrollSequence:0,loginOpen:false,kioskScanning:false,kioskStatus:'',kioskResult:null,kioskSleeping:false,kioskSequence:0,lastActivity:Date.now(),calendarMonth:'',editingId:'',editingLeaveType:''};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=value=>{const s=String(value||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?`${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}`:'—';};
  const today=()=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;};
  const admin=()=>['owner','manager'].includes(state.user?.role);
  const roleName=role=>({owner:'เจ้าของธุรกิจ / Admin',manager:'หัวหน้าแผนก / Admin',employee:'พนักงาน'})[role]||role;
  const badge=status=>`<span class="badge ${status==='อนุมัติ'?'ok':status==='ไม่อนุมัติ'?'bad':'wait'}">${esc(status||'—')}</span>`;
  const field=(label,value)=>`<div class="info"><small>${label}</small><b>${esc(value||'—')}</b></div>`;
  function notify(message){state.message=message;render();setTimeout(()=>{if(state.message===message){state.message='';render();}},4000);}
  function setBusy(value){state.busy=value;root.classList.toggle('busy',value);}
  function stopScan(){state.scanSequence++;NovaFace.stop();state.scanning=false;state.faceReadyUntil=0;state.faceDescriptor=null;}
  function stopEnrollment(){state.enrollSequence++;NovaFace.stop();state.enrolling=false;}
  function stopKiosk(){state.kioskSequence++;NovaFace.stop();state.kioskScanning=false;}
  function say(text){try{const synth=window.speechSynthesis;if(!synth||!window.SpeechSynthesisUtterance)return;const speech=new window.SpeechSynthesisUtterance(text);speech.lang='th-TH';speech.pitch=1.5;speech.rate=1.05;const voices=synth.getVoices();speech.voice=voices.find(v=>v.lang?.toLowerCase().startsWith('th')&&/female|หญิง/i.test(v.name))||voices.find(v=>v.lang?.toLowerCase().startsWith('th'))||null;synth.cancel();synth.speak(speech);}catch{}}
  function kioskView(){return `<div class="kiosk"><header class="kiosk-head"><div class="brand"><div class="logo">N</div><div><strong>NOVA <em>PEOPLE</em></strong><small>สแกนใบหน้าเข้า–ออกงาน</small></div></div><button class="outline small" data-action="open-login">เข้าสู่ระบบ</button></header>${state.kioskSleeping?'<button class="sleep-screen" data-action="wake-kiosk">แตะหน้าจอเพื่อเริ่มสแกนใบหน้า</button>':`<main class="kiosk-main"><p class="eyebrow">FACE ATTENDANCE · ${date(today())}</p><h1>สแกนหน้าเพื่อบันทึกเวลา</h1><div class="camera-frame"><video id="kioskVideo" autoplay muted playsinline aria-label="กล้องสแกนใบหน้าเข้าออกงาน"></video><div class="face-guide" aria-hidden="true"></div>${state.kioskScanning?'':'<div class="camera-idle">◎<small>กดเริ่มสแกน หรือรอกล้องเปิด</small></div>'}</div><p class="scan-status" id="kioskStatus">${esc(state.kioskStatus||'กำลังเตรียมกล้อง…')}</p>${state.kioskResult?`<div class="kiosk-result"><b>${esc(state.kioskResult.nickname||state.kioskResult.name)}</b><span>${state.kioskResult.action==='clockIn'?'เข้างาน':'ออกงาน'} · ${esc(state.kioskResult.time)}</span></div>`:''}<button class="primary" data-action="kiosk-scan" ${state.kioskScanning?'disabled':''}>${state.kioskScanning?'กำลังสแกน…':'เริ่มสแกนใบหน้า'}</button><p class="hint">วางใบหน้า 1 คนกลางกรอบ ระบบจะลงเวลาให้อัตโนมัติ</p></main>`}${state.loginOpen?`<div class="login-overlay"><button class="login-back" data-action="close-login">← กลับหน้าสแกน</button>${loginView()}</div>`:''}</div>`;}
  async function startKiosk(){
    if(state.kioskScanning||state.loginOpen||state.kioskSleeping||state.user)return;
    stopKiosk();state.kioskScanning=true;state.kioskStatus='กำลังเปิดกล้อง…';state.kioskResult=null;state.lastActivity=Date.now();const sequence=state.kioskSequence;render();
    try{
      const descriptor=await NovaFace.start(root.querySelector('#kioskVideo'),status=>{if(sequence!==state.kioskSequence)return;state.kioskStatus=status;const label=root.querySelector('#kioskStatus');if(label)label.textContent=status;});
      if(sequence!==state.kioskSequence)return;
      state.kioskScanning=false;state.kioskStatus='กำลังเทียบใบหน้าและบันทึกเวลา…';render();
      const result=await NovaApi.call('publicScan',{descriptor});
      if(sequence!==state.kioskSequence)return;
      state.kioskResult=result;state.kioskStatus='บันทึกเวลาสำเร็จ';state.lastActivity=Date.now();render();
      say(result.action==='clockOut'?'ออกงาน บ๊ายบาย':result.time<'09:00'?'ยินดีต้อนรับ':'เข้างานสายนะคะ');
    }catch(error){if(sequence===state.kioskSequence){state.kioskScanning=false;state.kioskStatus=error.message||'สแกนไม่สำเร็จ';render();}}
  }
  async function refresh(){const data=await NovaApi.call('bootstrap');state.data=data;state.user={...state.user,...data.user};render();}
  async function request(action,payload,success){
    if(state.busy)return;
    setBusy(true);
    try{const result=await NovaApi.call(action,payload);if(success)success(result);await refresh();notify('บันทึกข้อมูลแล้ว');return true;}
    catch(error){notify(error.message);if(!NovaApi.token()){state.user=null;state.data=null;render();}return false;}
    finally{setBusy(false);}
  }
  function loginView(){return `<div class="login-wrap"><div class="login-brand"><div class="logo">N</div><div><strong>NOVA PEOPLE</strong><small>ระบบลงเวลาและวันลา</small></div></div><div class="login-card"><span class="eyebrow">WELCOME BACK</span><h1>เข้าสู่ระบบ</h1><p>ใช้รหัสพนักงานและ PIN ที่ผู้ดูแลระบบออกให้</p><form data-form="login" class="form"><label>รหัสพนักงาน<input name="userId" autocomplete="username" placeholder="เช่น NV001 หรือ OWNER" required></label><label>PIN<input name="pin" type="password" inputmode="numeric" autocomplete="current-password" required></label><button class="primary" type="submit">เข้าสู่ระบบ</button></form><details class="connection"><summary>ตั้งค่าการเชื่อมต่อ Apps Script</summary><form data-form="api-url" class="form"><label>Web App URL (/exec)<input name="url" type="url" value="${esc(NovaApi.url())}" placeholder="https://script.google.com/macros/s/.../exec" required></label><div class="actions"><button class="outline" type="submit">บันทึก URL</button><button class="outline" type="button" data-action="ping">ตรวจการเชื่อมต่อ</button></div></form></details></div><div class="login-foot">Google Sheets · Apps Script · Netlify</div></div>`;}
  function shell(){
    const titles={home:admin()?'ภาพรวมงานบุคคล':'หน้าหลัก',history:'ประวัติและรายงาน',scan:'สแกนใบหน้า',calendar:'ปฏิทินพนักงาน',settings:'ตั้งค่าระบบ'};
    const symbols={home:'◷',history:'▤',scan:'◎',calendar:'▦',settings:'⚙'};
    return `<header class="top"><div class="brand"><div class="logo">N</div><div><strong>NOVA <em>PEOPLE</em></strong><small>ระบบลงเวลาและวันลา</small></div></div><div class="top-user"><span>${esc(state.user?.nickname||state.user?.name||'')}</span><button class="logout" data-action="logout" title="ออกจากระบบ">ออก</button></div></header><main><div class="page-title"><div><small>${esc(roleName(state.user?.role))} · ${date(today())}</small><h1>${titles[state.tab]||titles.home}</h1></div><div class="title-icon">${symbols[state.tab]||'◷'}</div></div>${state.tab==='home'?homeView():state.tab==='history'?historyView():state.tab==='scan'?scanView():state.tab==='calendar'?calendarView():settingsView()}</main><nav class="bottom five"><button data-tab="history" class="${state.tab==='history'?'active':''}"><span>▤</span>ประวัติ</button><button data-tab="calendar" class="${state.tab==='calendar'?'active':''}"><span>▦</span>ปฏิทิน</button><button data-tab="home" class="${state.tab==='home'?'active':''}"><span>⌂</span>หน้าหลัก</button><button data-tab="scan" class="${state.tab==='scan'?'active':''}"><span>◎</span>สแกนหน้า</button><button data-tab="settings" class="${state.tab==='settings'?'active':''}"><span>⚙</span>ตั้งค่า</button></nav>`;
  }
  function homeView(){return admin()?adminHome():employeeHome();}
  function scanView(){
    if(state.user?.role==='owner')return '<section class="card"><h3>สแกนใบหน้า</h3><p class="hint">หน้านี้สำหรับบัญชีพนักงาน</p></section>';
    const rows=state.data.attendance||[],todayRow=rows.find(r=>r.date===today()&&r.status!=='ไม่อนุมัติ');
    const open=rows.find(r=>r.checkIn&&!r.checkOut&&r.status!=='ไม่อนุมัติ');
    const ready=Date.now()<state.faceReadyUntil&&!!state.faceDescriptor;
    return `<section class="card scan-card"><div class="card-head"><div><small>FACE SCAN</small><h3>สแกนใบหน้าเข้า–ออกงาน</h3></div><span class="accent">◎</span></div><div class="camera-frame"><video id="scanVideo" autoplay muted playsinline aria-label="ภาพกล้องสำหรับสแกนใบหน้า"></video><div class="face-guide" aria-hidden="true"></div>${state.scanning?'':'<div class="camera-idle">◎<small>กดเปิดกล้องเพื่อเริ่มสแกน</small></div>'}</div><p class="scan-status" id="scanStatus">${esc(state.faceStatus||'ยังไม่ได้เปิดกล้อง')}</p><div class="actions">${state.scanning?'<button class="secondary" data-action="scan-stop">ปิดกล้อง</button>':`<button class="primary" data-action="scan-start">${ready?'สแกนใหม่':'เปิดกล้องสแกนใบหน้า'}</button>`}</div><p class="hint">${state.user?.face?.status==='ใช้งาน'?'สแกนแล้วระบบจะเทียบกับใบหน้าที่ Admin ลงทะเบียนไว้':'ยังไม่ได้ลงทะเบียนใบหน้า กรุณาติดต่อ Admin'} · ระบบยังไม่ตรวจภาพปลอมหรือวิดีโอ</p></section><section class="card"><div class="card-head"><div><small>ATTENDANCE</small><h3>บันทึกเวลา</h3></div></div><div class="clock-grid">${field('เวลาเข้างาน',todayRow?.checkIn)}${field('เวลาออกงาน',open?.checkOut||todayRow?.checkOut)}</div><div class="actions"><button class="primary" data-action="clock-in" ${ready&&!todayRow&&!open?'':'disabled'}>เข้างาน</button><button class="secondary" data-action="clock-out" ${ready&&open?'':'disabled'}>ออกงาน</button></div><p class="hint">${ready?'สแกนสำเร็จ · กดบันทึกภายใน 60 วินาที':'สแกนให้สำเร็จก่อนลงเวลา'}</p></section>`;
  }
  function employeeHome(){
    const rows=state.data.attendance||[],todayRow=rows.find(r=>r.date===today()&&r.status!=='ไม่อนุมัติ');
    const open=rows.find(r=>r.checkIn&&!r.checkOut&&r.status!=='ไม่อนุมัติ');
    const types=(state.data.leaveTypes||[]).filter(t=>t.status==='ใช้งาน');
    return `<section class="welcome"><div><small>สวัสดี</small><h2>${esc(state.user?.nickname||state.user?.name)}</h2><p>วันนี้ ${date(today())}</p></div><div class="welcome-icon">✦</div></section><section class="card"><div class="card-head"><div><small>ATTENDANCE</small><h3>ลงเวลาเข้า–ออก</h3></div><span class="accent">◷</span></div><div class="clock-grid">${field('เวลาเข้างาน',todayRow?.checkIn)}${field('เวลาออกงาน',open?.checkOut||todayRow?.checkOut)}</div><div class="actions"><button class="primary" data-tab="scan">ไปหน้าสแกนใบหน้า</button></div>${todayRow?`<div class="subline">สาย ${esc(todayRow.late)} นาที · ${badge(todayRow.status)}</div>`:''}</section><section class="card"><div class="card-head"><div><small>LEAVE</small><h3>ยื่นคำขอลา</h3></div><span class="accent">▦</span></div><form class="form" data-form="leave"><label>ประเภทการลา<select name="typeId" required><option value="">เลือกประเภท</option>${types.map(t=>`<option value="${esc(t.id)}">${esc(t.name)} · ${esc(t.days)} วัน/ปี</option>`).join('')}</select></label><div class="two"><label>วันเริ่ม<input type="date" name="start" value="${today()}" required></label><label>วันสิ้นสุด<input type="date" name="end" value="${today()}" required></label></div><div class="two"><label>จำนวนวัน<input type="number" name="days" value="1" min="0.5" step="0.5" required></label><label>เหตุผล<input name="reason" maxlength="300" placeholder="ระบุเหตุผล"></label></div><button class="primary" type="submit">ส่งคำขอลา</button></form></section><section class="card"><div class="card-head"><div><small>RECENT</small><h3>คำขอลาล่าสุด</h3></div></div>${(state.data.leaves||[]).slice(-3).reverse().map(leaveRow).join('')||'<p class="empty">ยังไม่มีคำขอลา</p>'}</section>`;
  }
  function adminHome(){
    const attendance=state.data.attendance||[],leaves=state.data.leaves||[],users=state.data.users||[];
    const pendingA=attendance.filter(r=>r.status==='รออนุมัติ'),pendingL=leaves.filter(r=>r.status==='รออนุมัติ');
    return `<div class="stats"><div><small>พนักงาน</small><b>${users.filter(u=>['employee','manager'].includes(u.role)&&u.status==='ใช้งาน').length}</b></div><div><small>รออนุมัติเวลา</small><b>${pendingA.length}</b></div><div><small>รออนุมัติลา</small><b>${pendingL.length}</b></div></div><section class="card"><div class="card-head"><div><small>ATTENDANCE REVIEW</small><h3>รายการลงเวลา</h3></div></div>${pendingA.length?pendingA.slice().reverse().map(r=>`<div class="review"><div><b>${esc(r.name)} · ${esc(r.nickname)}</b><small>${date(r.date)} · ${esc(r.checkIn||'—')} – ${esc(r.checkOut||'รอออกงาน')} · สาย ${esc(r.late)} นาที</small></div><div class="row-actions"><button data-action="adjust" data-id="${esc(r.id)}" title="แก้ OT">แก้</button><button data-action="approve-attendance" data-id="${esc(r.id)}" ${r.checkOut?'':'disabled'} title="อนุมัติ">✓</button><button data-action="reject-attendance" data-id="${esc(r.id)}" title="ไม่อนุมัติ">×</button></div></div>`).join(''):'<p class="empty">ไม่มีรายการรออนุมัติ</p>'}</section><section class="card"><div class="card-head"><div><small>LEAVE REVIEW</small><h3>คำขอลา</h3></div></div>${pendingL.length?pendingL.slice().reverse().map(r=>`<div class="review"><div><b>${esc(r.name)} · ${esc(r.type)}</b><small>${date(r.start)} – ${date(r.end)} · ${esc(r.days)} วัน${r.reason?' · '+esc(r.reason):''}</small></div><div class="row-actions"><button data-action="approve-leave" data-id="${esc(r.id)}" title="อนุมัติ">✓</button><button data-action="reject-leave" data-id="${esc(r.id)}" title="ไม่อนุมัติ">×</button></div></div>`).join(''):'<p class="empty">ไม่มีคำขอลารออนุมัติ</p>'}</section>`;
  }
  function leaveRow(r){return `<div class="review"><div><b>${esc(r.type)} · ${esc(r.days)} วัน</b><small>${date(r.start)} – ${date(r.end)}${r.name&&admin()?' · '+esc(r.name):''}</small></div>${badge(r.status)}</div>`;}
  function historyView(){const attendance=state.data.attendance||[],leaves=state.data.leaves||[];return `<section class="card"><div class="card-head"><div><small>ATTENDANCE</small><h3>ประวัติลงเวลา</h3></div>${admin()?'<button class="outline small" data-action="export">ส่งออก CSV</button>':''}</div><div class="table-scroll"><table><thead><tr><th>วันที่</th><th>พนักงาน</th><th>เข้า</th><th>ออก</th><th>สาย</th><th>กะ</th><th>OT 1.0</th><th>OT 1.5</th><th>OT 2.0</th><th>OT 3.0</th><th>ทำงาน</th><th>รวม OT</th><th>สถานะ</th>${admin()?'<th>แก้ไข</th>':''}</tr></thead><tbody>${attendance.slice().reverse().map(r=>`<tr><td>${date(r.date)}</td><td>${esc(r.nickname||r.name)}</td><td>${esc(r.checkIn||'—')}</td><td>${esc(r.checkOut||'—')}</td><td>${esc(r.late)}</td><td>${esc(r.shift)}</td><td>${esc(r.ot['1.0'])}</td><td>${esc(r.ot['1.5'])}</td><td>${esc(r.ot['2.0'])}</td><td>${esc(r.ot['3.0'])}</td><td>${esc(r.worked)}</td><td>${esc(r.totalOt)}</td><td>${badge(r.status)}</td>${admin()?`<td><button class="outline small" data-action="edit-attendance" data-id="${esc(r.id)}">แก้ไข</button></td>`:''}</tr>`).join('')}</tbody></table>${attendance.length?'':'<p class="empty">ยังไม่มีข้อมูลลงเวลา</p>'}</div></section>${admin()&&state.editingId?editAttendanceForm():''}<section class="card"><div class="card-head"><div><small>LEAVE HISTORY</small><h3>ประวัติวันลา</h3></div></div>${leaves.slice().reverse().map(leaveRow).join('')||'<p class="empty">ยังไม่มีคำขอลา</p>'}</section>`;}
  function calendarView(){
    const c=state.data.calendar||{users:[],attendance:[],leaves:[],daysOff:[]},month=state.calendarMonth||today().slice(0,7),[year,num]=month.split('-').map(Number),days=new Date(year,num,0).getDate();
    const start=new Date(year,num-1,1).getDay(),cells=Array.from({length:start},()=>'<div class="calendar-empty"></div>');
    for(let d=1;d<=days;d++){
      const day=`${month}-${String(d).padStart(2,'0')}`;
      const events=c.users.map(u=>{const leave=c.leaves.find(r=>r.employeeId===u.id&&r.start<=day&&r.end>=day),attended=c.attendance.some(r=>r.employeeId===u.id&&r.date===day),off=c.daysOff.some(r=>r.employeeId===u.id&&r.date===day);return leave?{name:u.nickname||u.name,label:leave.type,kind:'leave'}:attended?{name:u.nickname||u.name,label:'มาทำงาน',kind:'present'}:off?{name:u.nickname||u.name,label:'หยุด',kind:'off'}:null;}).filter(Boolean);
      cells.push(`<div class="calendar-day"><b>${d}</b>${events.map(e=>`<span class="calendar-event ${e.kind}" title="${esc(e.name)} · ${esc(e.label)}">${esc(e.name)} · ${esc(e.label)}</span>`).join('')}</div>`);
    }
    const options=(c.users||[]).map(u=>`<option value="${esc(u.id)}">${esc(u.name)} · ${esc(u.id)}</option>`).join('');
    return `<section class="card"><div class="card-head"><div><small>TEAM CALENDAR</small><h3>ปฏิทินทุกคน</h3></div><input id="calendarMonth" type="month" value="${esc(month)}" aria-label="เลือกเดือน"></div><div class="calendar-legend"><span class="present">มาทำงาน</span><span class="off">หยุด</span><span class="leave">ลา</span></div><div class="calendar-grid">${['อา','จ','อ','พ','พฤ','ศ','ส'].map(x=>`<div class="calendar-weekday">${x}</div>`).join('')}${cells.join('')}</div><p class="hint">แสดงวันหยุดที่ Admin ระบุ วันลาที่อนุมัติแล้ว และวันที่มีการลงเวลา วันที่ไม่มีรายการยังไม่กำหนดสถานะ</p></section>${admin()?`<section class="card"><div class="card-head"><div><small>DAY OFF</small><h3>กำหนดวันหยุดพนักงาน</h3></div></div><form class="form" data-form="day-off"><div class="two"><label>พนักงาน<select name="userId" required>${options}</select></label><label>วันที่<input type="date" name="date" value="${today()}" required></label></div><label>หมายเหตุ<input name="note" maxlength="200"></label><div class="actions"><button class="primary" name="off" value="true" type="submit">บันทึกวันหยุด</button><button class="secondary" name="off" value="false" type="submit">ยกเลิกวันหยุด</button></div></form></section>`:''}`;
  }
  function editAttendanceForm(){
    const r=(state.data.attendance||[]).find(row=>row.id===state.editingId);if(!r)return '';
    return `<section class="card" id="attendanceEditor"><div class="card-head"><div><small>EDIT ATTENDANCE</small><h3>แก้ข้อมูล · ${esc(r.name)} · ${date(r.date)}</h3></div><button class="outline small" data-action="cancel-edit">ปิด</button></div><form class="form" data-form="edit-attendance"><input type="hidden" name="id" value="${esc(r.id)}"><div class="two"><label>วันที่<input type="date" name="date" value="${esc(r.date)}" required></label><label>กะ<select name="shift">${(state.data.shifts||[]).map(s=>`<option value="${esc(s.name)}" ${r.shift===s.name?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label></div><div class="two"><label>เวลาเข้า<input type="time" name="checkIn" value="${esc(r.checkIn)}" required></label><label>เวลาออก<input type="time" name="checkOut" value="${esc(r.checkOut)}"></label></div><label>สาย (นาที)<input type="number" name="late" min="0" max="1440" value="${esc(r.late)}" required></label><div class="two">${['1.0','1.5','2.0','3.0'].map(k=>`<label>OT ${k}x<input type="number" name="ot${k}" min="0" max="24" step="0.01" value="${esc(r.ot[k])}" required></label>`).join('')}</div><label>เหตุผลการแก้ไข<input name="reason" minlength="3" maxlength="300" required placeholder="ระบุเหตุผลใน AuditLog"></label><button class="primary" type="submit">บันทึกการแก้ไข</button></form></section>`;
  }
  function settingsView(){return `<section class="card"><div class="card-head"><div><small>MY ACCOUNT</small><h3>บัญชีของฉัน</h3></div></div><div class="account-name">${esc(state.user?.name)} <span>${esc(state.user?.id)}</span></div><form class="form" data-form="pin"><div class="two"><label>PIN เดิม<input type="password" name="oldPin" inputmode="numeric" required></label><label>PIN ใหม่ 6–12 หลัก<input type="password" name="newPin" inputmode="numeric" minlength="6" maxlength="12" required></label></div><button class="outline" type="submit">เปลี่ยน PIN</button></form></section>${admin()?adminSettings()+faceEnrollmentView()+leaveTypesView():''}<section class="card"><div class="card-head"><div><small>CONNECTION</small><h3>การเชื่อมต่อ</h3></div></div><form class="form" data-form="api-url"><label>Apps Script Web App URL<input name="url" type="url" value="${esc(NovaApi.url())}" required></label><div class="actions"><button class="outline" type="submit">บันทึก URL</button><button class="outline" type="button" data-action="ping">ตรวจการเชื่อมต่อ</button></div></form></section>`;}
  function faceEnrollmentView(){
    const employees=(state.data.users||[]).filter(u=>['employee','manager'].includes(u.role)&&u.status==='ใช้งาน');
    return `<section class="card scan-card"><div class="card-head"><div><small>FACE REGISTRATION</small><h3>ลงทะเบียนใบหน้าพนักงาน</h3></div><span class="accent">◎</span></div><label>พนักงาน<select id="enrollEmployee" ${state.enrolling?'disabled':''}><option value="">เลือกพนักงาน</option>${employees.map(u=>`<option value="${esc(u.id)}" ${state.enrollTarget===u.id?'selected':''}>${esc(u.name)} · ${esc(u.id)} · ${esc(u.face?.status||'ยังไม่ลงทะเบียน')}</option>`).join('')}</select></label><label class="consent"><input id="enrollConsent" type="checkbox" ${state.enrolling?'disabled':''}> พนักงานรับทราบและยินยอมให้ลงทะเบียนใบหน้าเพื่อบันทึกเวลา</label><div class="camera-frame"><video id="enrollVideo" autoplay muted playsinline aria-label="ภาพกล้องลงทะเบียนใบหน้า"></video><div class="face-guide" aria-hidden="true"></div>${state.enrolling?'':'<div class="camera-idle">◎<small>เลือกพนักงานแล้วเปิดกล้อง</small></div>'}</div><p class="scan-status" id="enrollStatus">${esc(state.enrollStatus||'ยังไม่ได้เปิดกล้อง')}</p><div class="actions">${state.enrolling?'<button class="secondary" data-action="enroll-stop">ปิดกล้อง</button>':'<button class="primary" data-action="enroll-start">สแกนและลงทะเบียน</button>'}<button class="outline" data-action="revoke-face">ลบใบหน้าที่ลงทะเบียน</button></div><p class="hint">ถ่ายใบหน้าพนักงานที่เลือกเพียงคนเดียว ข้อมูลลักษณะใบหน้าเก็บใน Apps Script Script Properties; ไม่มีการเก็บภาพถ่าย</p></section>`;
  }
  function leaveTypesView(){
    const types=state.data.leaveTypes||[],current=types.find(t=>t.id===state.editingLeaveType)||null;
    return `<section class="card" id="leaveTypeEditor"><div class="card-head"><div><small>LEAVE TYPES</small><h3>ประเภทการลา</h3></div><button class="outline small" data-action="new-leave-type">เพิ่มประเภท</button></div>${types.map(t=>`<div class="review"><div><b>${esc(t.name)} · ${esc(t.id)}</b><small>${esc(t.days)} วัน/ปี · ${t.paid?'ได้รับค่าจ้าง':'ไม่รับค่าจ้าง'} · ${esc(t.status)}${t.expiresAt?' · หมดอายุ '+date(t.expiresAt):''}</small></div><button class="outline small" data-action="edit-leave-type" data-id="${esc(t.id)}">แก้ไข</button></div>`).join('')}<form class="form separated" data-form="leave-type"><h4>${current?'แก้ประเภทการลา':'เพิ่มประเภทการลา'}</h4><div class="two"><label>รหัสประเภทลา<input name="id" value="${esc(current?.id||'')}" pattern="[A-Za-z0-9_-]{2,24}" ${current?'readonly':''} required></label><label>ชื่อประเภทลา<input name="name" value="${esc(current?.name||'')}" maxlength="80" required></label></div><div class="two"><label>จำนวนวันต่อปี<input name="days" type="number" min="0" max="366" step="0.5" value="${esc(current?.days??6)}" required></label><label>ได้รับค่าจ้าง<select name="paid"><option value="true" ${current?.paid!==false?'selected':''}>ได้รับค่าจ้าง</option><option value="false" ${current?.paid===false?'selected':''}>ไม่รับค่าจ้าง</option></select></label></div><div class="two"><label>วันหมดอายุ (ถ้ามี)<input name="expiresAt" type="date" value="${esc(current?.expiresAt||'')}"></label><label>สถานะ<select name="status"><option value="ใช้งาน" ${current?.status!=='ปิดใช้งาน'?'selected':''}>ใช้งาน</option><option value="ปิดใช้งาน" ${current?.status==='ปิดใช้งาน'?'selected':''}>ปิดใช้งาน</option></select></label></div><button class="primary" type="submit">บันทึกประเภทการลา</button></form><p class="hint">เมื่อประเภทลามีคำขอแล้ว ระบบจะไม่ให้เปลี่ยนชื่อ เพื่อรักษาประวัติและยอดสิทธิ์เดิม</p></section>`;
  }
  function adminSettings(){const users=state.data.users||[],shifts=state.data.shifts||[],settings=state.data.settings||{};return `<section class="card"><div class="card-head"><div><small>EMPLOYEES</small><h3>พนักงานและบทบาท</h3></div></div>${state.generated?`<div class="credential"><b>บัญชีที่สร้าง: ${esc(state.generated.userId)}</b><p>PIN ชั่วคราว: <strong>${esc(state.generated.pin)}</strong></p><small>จด PIN นี้ให้พนักงานก่อนปิดหน้าจอ</small></div>`:''}${users.map(u=>`<div class="review"><div><b>${esc(u.name)} · ${esc(u.nickname)}</b><small>${esc(u.id)} · ${esc(roleName(u.role))} · ${esc(u.shift||'—')} · ${esc(u.status)} · ใบหน้า: ${esc(u.face?.status||'ยังไม่ลงทะเบียน')}</small></div>${u.status==='ใช้งาน'&&state.user.role==='owner'&&u.id!=='OWNER'?`<button class="outline small" data-action="reset-pin" data-id="${esc(u.id)}">รีเซ็ต PIN</button>`:''}${u.status==='ใช้งาน'&&u.id!=='OWNER'&&(u.role!=='manager'||state.user.role==='owner')?`<button class="outline small danger" data-action="delete-employee" data-id="${esc(u.id)}">ลบ</button>`:''}</div>`).join('')}<form class="form separated" data-form="employee"><h4>เพิ่มพนักงาน</h4><div class="two"><label>รหัสพนักงาน<input name="userId" pattern="[A-Za-z0-9_-]{2,24}" required></label><label>ชื่อพนักงาน<input name="name" required></label></div><div class="two"><label>ชื่อเล่น<input name="nickname" required></label><label>แผนก<input name="department"></label></div><div class="two"><label>กะ<select name="shiftId">${shifts.filter(s=>s.status==='ใช้งาน').map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label><label>บทบาท<select name="role"><option value="employee">พนักงาน</option>${state.user.role==='owner'?'<option value="manager">หัวหน้าแผนก / Admin</option>':''}</select></label></div><button class="primary" type="submit">เพิ่มพนักงาน</button></form></section><section class="card"><div class="card-head"><div><small>OVERTIME POLICY</small><h3>ค่าพื้นฐาน OT</h3></div></div><form class="form" data-form="settings"><div class="two">${['OT 1.0x','OT 1.5x','OT 2.0x','OT 3.0x'].map(key=>`<label>${key}<input name="${key}" type="number" min="0" max="10" step="0.05" value="${esc(settings[key]??'')}" required></label>`).join('')}</div><div class="two"><label>ชั่วโมงทำงานมาตรฐาน<input name="ชั่วโมงทำงานมาตรฐาน" type="number" min="1" max="24" step="0.5" value="${esc(settings['ชั่วโมงทำงานมาตรฐาน']??8)}"></label><label>นาทีผ่อนผันสาย<input name="นาทีผ่อนผันสาย" type="number" min="0" max="120" value="${esc(settings['นาทีผ่อนผันสาย']??9)}"></label></div><button class="primary" type="submit">บันทึกการตั้งค่า</button></form><p class="hint">ระบบลง OT เริ่มต้นที่ 1.5x หลังเกินชั่วโมงมาตรฐาน Admin แก้ชั่วโมงแต่ละประเภทพร้อมเหตุผลได้ในรายการรออนุมัติ</p></section>`;}
  function render(){root.innerHTML=(state.user&&state.data?shell():kioskView())+(state.message?`<div class="toast">${esc(state.message)}</div>`:'');}
  function exportCsv(){const h=['ชื่อพนักงาน','ชื่อเล่น','วันที่','เวลาเข้างาน','เวลาออกงาน','สาย (นาที)','กะ','OT 1.0x','OT 1.5x','OT 2.0x','OT 3.0x','รวมเวลาทำงาน','รวม OT','หมายเหตุ','สถานะ'];const rows=(state.data.attendance||[]).map(r=>[r.name,r.nickname,date(r.date),r.checkIn,r.checkOut,r.late,r.shift,r.ot['1.0'],r.ot['1.5'],r.ot['2.0'],r.ot['3.0'],r.worked,r.totalOt,r.note,r.status]);const csv='\ufeff'+[h,...rows].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`NOVA_Attendance_${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  root.addEventListener('click',async e=>{
    const tab=e.target.closest('[data-tab]');if(tab){if(state.tab===tab.dataset.tab)return;if(state.tab==='scan')stopScan();if(state.tab==='settings')stopEnrollment();state.tab=tab.dataset.tab;render();window.scrollTo(0,0);return;}
    const btn=e.target.closest('[data-action]');if(!btn)return;
    const action=btn.dataset.action,id=btn.dataset.id;
    if(action==='open-login'){stopKiosk();if(NovaApi.token()){try{await refresh();state.tab='home';state.loginOpen=false;render();return;}catch{NovaApi.clearToken();}}state.loginOpen=true;render();return;}
    if(action==='close-login'){state.loginOpen=false;state.lastActivity=Date.now();render();startKiosk();return;}
    if(action==='wake-kiosk'){state.kioskSleeping=false;state.lastActivity=Date.now();render();startKiosk();return;}
    if(action==='kiosk-scan'){state.lastActivity=Date.now();startKiosk();return;}
    if(action==='logout'){stopScan();stopEnrollment();NovaApi.clearToken();state.user=null;state.data=null;state.generated=null;state.lastActivity=Date.now();render();startKiosk();return;}
    if(action==='cancel-edit'){state.editingId='';render();return;}
    if(action==='edit-attendance'){state.editingId=id;render();root.querySelector('#attendanceEditor')?.scrollIntoView?.({behavior:'smooth'});return;}
    if(action==='new-leave-type'||action==='edit-leave-type'){state.editingLeaveType=action==='edit-leave-type'?id:'';render();root.querySelector('#leaveTypeEditor')?.scrollIntoView?.({behavior:'smooth'});return;}
    if(action==='delete-employee'){const reason=prompt(`เหตุผลการลบพนักงาน ${id}`);if(reason===null)return;return request('deleteEmployee',{userId:id,reason});}
    if(action==='ping'){try{const r=await NovaApi.call('ping');notify(r.pong?'เชื่อมต่อ Apps Script สำเร็จ':'API ไม่ตอบรับ');}catch(error){notify(error.message);}return;}
    if(action==='enroll-stop'){stopEnrollment();state.enrollStatus='ปิดกล้องแล้ว';render();return;}
    if(action==='enroll-start'){
      if(!admin())return;
      const userId=root.querySelector('#enrollEmployee')?.value,consent=root.querySelector('#enrollConsent')?.checked;
      if(!userId||!consent){notify('เลือกพนักงานและยืนยันการรับทราบก่อนลงทะเบียน');return;}
      stopEnrollment();state.enrollTarget=userId;state.enrolling=true;state.enrollStatus='กำลังเริ่มสแกน…';const sequence=state.enrollSequence;render();
      try{
        const descriptor=await NovaFace.start(root.querySelector('#enrollVideo'),status=>{if(sequence!==state.enrollSequence)return;state.enrollStatus=status;const label=root.querySelector('#enrollStatus');if(label)label.textContent=status;});
        if(sequence!==state.enrollSequence)return;
        state.enrolling=false;state.enrollStatus='สแกนสำเร็จ กำลังบันทึก…';render();
        if(await request('enrollFace',{userId,consent:true,descriptor})){state.enrollStatus='ลงทะเบียนใบหน้าแล้ว';render();}
      }catch(error){if(sequence===state.enrollSequence){state.enrolling=false;state.enrollStatus=error.message||'ลงทะเบียนไม่สำเร็จ';render();}}
      return;
    }
    if(action==='revoke-face'){
      if(!admin())return;
      const userId=root.querySelector('#enrollEmployee')?.value;
      if(!userId){notify('เลือกพนักงานก่อน');return;}
      const reason=prompt('เหตุผลการลบข้อมูลใบหน้า');if(reason===null)return;
      state.enrollTarget=userId;
      return request('revokeFace',{userId,reason});
    }
    if(action==='scan-stop'){stopScan();state.faceStatus='ปิดกล้องแล้ว';render();return;}
    if(action==='scan-start'){
      if(state.user?.role==='owner')return;
      stopScan();state.scanning=true;state.faceStatus='กำลังเริ่มสแกน…';const sequence=state.scanSequence;render();
      try{
        const video=root.querySelector('#scanVideo');
        const descriptor=await NovaFace.start(video,status=>{if(sequence!==state.scanSequence)return;state.faceStatus=status;const label=root.querySelector('#scanStatus');if(label)label.textContent=status;});
        if(sequence!==state.scanSequence)return;
        state.scanning=false;state.faceDescriptor=descriptor;state.faceReadyUntil=Date.now()+60000;state.faceStatus='สแกนสำเร็จ · เลือกเข้า/ออกงานภายใน 60 วินาที';render();
        setTimeout(()=>{if(state.tab==='scan'&&Date.now()>=state.faceReadyUntil&&state.faceReadyUntil){state.faceReadyUntil=0;state.faceDescriptor=null;state.faceStatus='หมดเวลาสแกน กรุณาสแกนใหม่';render();}},61000);
      }catch(error){if(sequence===state.scanSequence){state.scanning=false;state.faceStatus=error.message||'สแกนไม่สำเร็จ';render();}}
      return;
    }
    if(action==='clock-in'||action==='clock-out'){
      if(state.user?.role==='owner'||state.tab!=='scan'||Date.now()>=state.faceReadyUntil||!state.faceDescriptor){notify('กรุณาสแกนใบหน้าให้สำเร็จก่อนลงเวลา');return;}
      const descriptor=state.faceDescriptor;state.faceDescriptor=null;state.faceReadyUntil=0;state.faceStatus='กำลังเทียบใบหน้าและบันทึกเวลา…';
      return request(action==='clock-in'?'clockIn':'clockOut',{descriptor});
    }
    if(action==='approve-attendance')return request('reviewAttendance',{id,status:'อนุมัติ'});
    if(action==='reject-attendance')return request('reviewAttendance',{id,status:'ไม่อนุมัติ'});
    if(action==='approve-leave')return request('reviewLeave',{id,status:'อนุมัติ'});
    if(action==='reject-leave')return request('reviewLeave',{id,status:'ไม่อนุมัติ'});
    if(action==='reset-pin'){if(!confirm(`รีเซ็ต PIN ของ ${id}?`))return;return request('resetEmployeePin',{userId:id},r=>{state.generated=r;});}
    if(action==='export')return exportCsv();
    if(action==='adjust'){
      const row=state.data.attendance.find(r=>r.id===id);if(!row)return;
      const reason=prompt('เหตุผลการแก้ไข OT (อย่างน้อย 3 ตัวอักษร)');if(reason===null)return;
      const ot={};for(const key of ['1.0','1.5','2.0','3.0']){const answer=prompt(`ชั่วโมง OT ${key}x`,row.ot[key]);if(answer===null)return;ot[key]=Number(answer);}
      return request('adjustAttendance',{id,reason,ot});
    }
  });
  root.addEventListener('submit',async e=>{
    const form=e.target.closest('[data-form]');if(!form)return;e.preventDefault();
    const data=Object.fromEntries(new FormData(form).entries());
    if(form.dataset.form==='api-url'){try{NovaApi.setUrl(data.url);notify('บันทึก URL แล้ว');}catch(error){notify(error.message);}return;}
    if(form.dataset.form==='login'){
      if(state.busy)return;setBusy(true);
      try{const result=await NovaApi.call('login',data);NovaApi.setToken(result.token);state.user=result.user;state.loginOpen=false;state.tab='home';await refresh();if(result.user.mustChange)notify('กรุณาเปลี่ยน PIN ในหน้าตั้งค่า');}
      catch(error){notify(error.message);}finally{setBusy(false);}return;
    }
    if(form.dataset.form==='leave')return request('requestLeave',data);
    if(form.dataset.form==='pin'){
      if(state.busy)return;setBusy(true);
      try{await NovaApi.call('changePin',data);NovaApi.clearToken();state.user=null;state.data=null;state.generated=null;notify('เปลี่ยน PIN แล้ว กรุณาเข้าสู่ระบบใหม่');}
      catch(error){notify(error.message);}finally{setBusy(false);}return;
    }
    if(form.dataset.form==='employee')return request('saveEmployee',data,r=>{state.generated=r;});
    if(form.dataset.form==='edit-attendance'){const ot={'1.0':Number(data['ot1.0']),'1.5':Number(data['ot1.5']),'2.0':Number(data['ot2.0']),'3.0':Number(data['ot3.0'])};if(await request('editAttendance',{id:data.id,date:data.date,shift:data.shift,checkIn:data.checkIn,checkOut:data.checkOut,late:Number(data.late),ot,reason:data.reason})){state.editingId='';render();}return;}
    if(form.dataset.form==='day-off')return request('setDayOff',{userId:data.userId,date:data.date,note:data.note,off:e.submitter?.value!=='false'});
    if(form.dataset.form==='leave-type'){if(await request('saveLeaveType',{id:data.id,name:data.name,days:Number(data.days),paid:data.paid,status:data.status,expiresAt:data.expiresAt})){state.editingLeaveType=data.id.toUpperCase();render();}return;}
    if(form.dataset.form==='settings')return request('saveSettings',data);
  });
  root.addEventListener('change',e=>{if(e.target?.id==='calendarMonth'){state.calendarMonth=e.target.value;render();}});
  document.addEventListener?.('visibilitychange',()=>{if(document.hidden){if(state.tab==='scan'){stopScan();state.faceStatus='หยุดกล้องเมื่อออกจากหน้านี้';render();}if(state.enrolling){stopEnrollment();state.enrollStatus='หยุดกล้องเมื่อออกจากหน้านี้';render();}}});
  window.addEventListener?.('pagehide',()=>{stopScan();stopEnrollment();stopKiosk();});
  window.setInterval?.(()=>{if(!state.user&&!state.loginOpen&&!state.kioskSleeping&&Date.now()-state.lastActivity>=30000){stopKiosk();state.kioskSleeping=true;state.kioskStatus='';render();}},1000);
  async function init(){render();setTimeout(()=>startKiosk(),100);}
  init();
  return {refresh};
})();
