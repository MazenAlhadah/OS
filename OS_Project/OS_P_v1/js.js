let P=[];

function add(){
  let id = document.getElementById("pid").value.trim();
  let at = +document.getElementById("at").value;
  let bt = +document.getElementById("bt").value;
  let pr = +document.getElementById("pr").value;

  if(!id || at < 0 || bt <= 0 || isNaN(pr)){
    alert("Invalid input!");
    return;
  }

  if(P.find(x => x.id === id)){
    alert("Duplicate ID!");
    return;
  }

  P.push({id, at, bt, pr});
  renderTable();
  clearInputs();
}

function renderTable(){
  let table = document.getElementById("table");
  table.innerHTML = `
  <tr>
  <th>ID</th><th>AT</th><th>BT</th><th>PR</th><th>Delete</th>
  </tr>`;

  P.forEach((p,i)=>{
    let row = table.insertRow();
    row.innerHTML = `
      <td>${p.id}</td>
      <td>${p.at}</td>
      <td>${p.bt}</td>
      <td>${p.pr}</td>
      <td><button class="delete" onclick="remove(${i})">X</button></td>
    `;
  });
}

function remove(i){
  P.splice(i,1);
  renderTable();
}

function resetAll(){
  P=[];
  renderTable();
  rrG.innerHTML=prG.innerHTML=rrRes.innerHTML=prRes.innerHTML=cmp.innerHTML="";
}

function clearInputs(){
  pid.value="";
  at.value="";
  bt.value="";
  pr.value="";
}

function run(){
  let q = +document.getElementById("q").value;

  if(q <= 0){
    alert("Enter valid Time Quantum");
    return;
  }

  if(P.length === 0){
    alert("Add processes first!");
    return;
  }

  let rr = roundRobin(q);
  let pr = priority();

  show(rr,"rrG","rrRes");
  show(pr,"prG","prRes");

  compare(rr,pr);
}

function roundRobin(q){
  let t=0,queue=[],done=[],g=[];
  let procs=JSON.parse(JSON.stringify(P)).sort((a,b)=>a.at-b.at);

  let rem={},start={};
  procs.forEach(p=>rem[p.id]=p.bt);

  while(procs.length||queue.length){
    while(procs.length && procs[0].at<=t)
      queue.push(procs.shift());

    if(!queue.length){ t++; continue; }

    let p = queue.shift();

    if(start[p.id]==undefined) start[p.id]=t;

    let exec = Math.min(q,rem[p.id]);
    g.push({id:p.id});

    t+=exec;
    rem[p.id]-=exec;

    while(procs.length && procs[0].at<=t)
      queue.push(procs.shift());

    if(rem[p.id]>0) queue.push(p);
    else done.push({id:p.id,finish:t});
  }

  return calc(done,start,g);
}

function priority(){
  let t=0,done=[],g=[];
  let pre=document.getElementById("pre").checked;
  let procs=JSON.parse(JSON.stringify(P));

  let rem={},start={};
  procs.forEach(p=>rem[p.id]=p.bt);

  while(done.length<P.length){
    let avail=procs.filter(p=>p.at<=t && rem[p.id]>0);

    if(!avail.length){ t++; continue; }

    avail.sort((a,b)=>a.pr-b.pr);
    let p=avail[0];

    if(start[p.id]==undefined) start[p.id]=t;

    if(pre){
      g.push({id:p.id});
      rem[p.id]--;
      t++;
      if(rem[p.id]==0)
        done.push({id:p.id,finish:t});
    }else{
      g.push({id:p.id});
      t+=rem[p.id];
      rem[p.id]=0;
      done.push({id:p.id,finish:t});
    }
  }

  return calc(done,start,g);
}

function calc(done,start,gantt){
  let res=[],totalWT=0,totalTAT=0,totalRT=0;

  done.forEach(d=>{
    let p=P.find(x=>x.id===d.id);
    let TAT=d.finish-p.at;
    let WT=TAT-p.bt;
    let RT=start[p.id]-p.at;

    totalWT+=WT;
    totalTAT+=TAT;
    totalRT+=RT;

    res.push({id:p.id,WT,TAT,RT});
  });

  return {
    res,
    gantt,
    avgWT: totalWT/P.length,
    avgTAT: totalTAT/P.length,
    avgRT: totalRT/P.length
  };
}

function show(data,ganttID,resID){
  let gDiv=document.getElementById(ganttID);
  gDiv.innerHTML="";

  data.gantt.forEach(b=>{
    gDiv.innerHTML+=`<div class="block">${b.id}</div>`;
  });

  let html="<table><tr><th>ID</th><th>WT</th><th>TAT</th><th>RT</th></tr>";

  data.res.forEach(r=>{
    html+=`<tr>
      <td>${r.id}</td>
      <td>${r.WT}</td>
      <td>${r.TAT}</td>
      <td>${r.RT}</td>
    </tr>`;
  });

  html+="</table>";

  html+=`<p>Avg WT: ${data.avgWT.toFixed(2)}</p>`;
  html+=`<p>Avg TAT: ${data.avgTAT.toFixed(2)}</p>`;
  html+=`<p>Avg RT: ${data.avgRT.toFixed(2)}</p>`;

  document.getElementById(resID).innerHTML=html;
}

function compare(rr,pr){
  let text="";

  text += rr.avgWT < pr.avgWT ? "Round Robin better Waiting Time<br>" : "Priority better Waiting Time<br>";
  text += rr.avgRT < pr.avgRT ? "Round Robin better Response Time<br>" : "Priority better Response Time<br>";

  text += "<br>Round Robin is more fair<br>";
  text += "Priority may cause starvation";

  cmp.innerHTML=text;
}