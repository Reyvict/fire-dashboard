const k=v=>'€'+(v/1000).toFixed(1)+'k';
const fmt=v=>v>=1000000?'€'+(v/1000000).toFixed(3)+'m':k(v);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const parseMonth=s=>{const [mon,yy]=s.split('/');const map={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};return new Date(Date.UTC(2000+Number(yy),map[mon],15));};

fetch('data.json?ts='+Date.now()).then(r=>r.json()).then(d=>{
 window.__fireData=d;
 const margin=d.core_fire-d.target_today, marginPct=margin/d.target_today*100, progress=d.core_fire/d.final_target*100;
 const fireStatus=d.status==='on_track'?'🟢 ON TRACK':(margin>=0?'🟢 ON TRACK':'🔴 BEHIND');
 window.__fireStatusText=fireStatus;
 if(document.querySelector('#firePanel').classList.contains('active')) document.querySelector('#status').textContent=fireStatus;
 document.querySelector('#updated').textContent='Atualizado em '+new Date(d.updated_at).toLocaleString('pt-BR',{dateStyle:'medium',timeStyle:'short'});
 document.querySelector('#core').textContent=fmt(d.core_fire);document.querySelector('#core2').textContent=fmt(d.core_fire);
 document.querySelector('#todayTarget').textContent=fmt(d.target_today);document.querySelector('#finalTarget').textContent=fmt(d.final_target);
 const officialEndDate=parseEndMonth((d.projection&&d.projection.end_month)||'2029-12');
 document.querySelector('#finalTargetDateLabel').textContent=formatMonthYear(officialEndDate);
 document.querySelector('#progressTargetLabel').textContent=fmt(d.final_target);
 document.querySelector('#sEndLabel').textContent='Valor em '+formatMonthYear(officialEndDate);
 document.querySelector('#marginShort').textContent=(margin>=0?'+':'-')+k(Math.abs(margin))+(margin>=0?' ahead':' behind');
 document.querySelector('#marginPct').textContent=(marginPct>=0?'+':'')+marginPct.toFixed(2)+'%';
 document.querySelector('#marginNow').textContent=(margin>=0?'+':'-')+k(Math.abs(margin));
 document.querySelector('#progressPct').textContent=progress.toFixed(1)+'%';document.querySelector('#remaining').textContent='Faltam '+fmt(d.final_target-d.core_fire);document.querySelector('#progressBar').style.width=clamp(progress,0,100)+'%';
 const planRate=(d.projection&&Number.isFinite(d.projection.plan_rate_annual))?d.projection.plan_rate_annual:0.075;
 const bonusMonth=(d.scenario_lab&&d.scenario_lab.bonus_month)||3;
 const projected=estimateFireDate(d.core_fire,(d.contribution_plan&&d.contribution_plan.total_monthly)||4000,planRate,0,d.final_target,new Date(d.updated_at),bonusMonth);
 const officialDate=parseEndMonth((d.projection&&d.projection.end_month)||'2029-12');
 const ahead=projected?monthDifference(projected.date,officialDate):null;
 document.querySelector('#projectedFireDate').textContent=projected?formatMonthYear(projected.date):'—';
 document.querySelector('#projectedFireCaption').textContent='Assumindo '+(planRate*100).toFixed(1)+'% a.a. e aportes oficiais';
 document.querySelector('#monthsAhead').textContent=ahead===null?'—':(ahead>0?'+'+ahead+' meses':ahead<0?Math.abs(ahead)+' meses atrás':'On date');
 document.querySelector('#monthsAhead').className='n '+(ahead!==null&&ahead>=0?'green':'amber');
 document.querySelector('#officialFireDate').textContent=formatMonthYear(officialDate);
 const monthlyContribution=(d.contribution_plan&&d.contribution_plan.total_monthly)||4000;
 const updatedDate=new Date(d.updated_at);
 const monthsRemaining=Math.max(0,(2029-updatedDate.getUTCFullYear())*12+(11-updatedDate.getUTCMonth()));
 const req=requiredAnnualReturn(d.core_fire,monthlyContribution,d.final_target,monthsRemaining);
 document.querySelector('#requiredReturn').textContent=req===null?'—':(req*100).toFixed(1)+'% p.a.';
 document.querySelector('#requiredReturnDetail').textContent='Retorno anualizado necessário pelos próximos '+monthsRemaining+' meses, mantendo '+fmt(monthlyContribution)+'/mês em aportes.';
 const conservativeRate=(d.projection&&Number.isFinite(d.projection.conservative_rate_annual))?d.projection.conservative_rate_annual:0.04;
 document.querySelector('#returnCompare').innerHTML='<strong>Referência:</strong> Conservative '+(conservativeRate*100).toFixed(1)+'% • Required '+(req===null?'—':(req*100).toFixed(1)+'%')+' • Plan '+(planRate*100).toFixed(1)+'%';
 document.querySelector('#conservativeLegendLabel').textContent='Conservative '+(conservativeRate*100).toFixed(1)+'%';
 document.querySelector('#conservativeChartCaption').textContent=(conservativeRate*100).toFixed(1)+'% é um cenário, não uma previsão. Parte do patrimônio atual e mantém '+fmt(monthlyContribution)+'/mês de aportes.';
 document.querySelector('#conservativeOutcomeLabel').textContent='Conservative '+(conservativeRate*100).toFixed(1)+'%';
 document.querySelector('#conservativeOutcomeCaption').textContent='Cenário conservador a partir de hoje, com '+fmt(monthlyContribution)+'/mês.';
 const bufferMonths=monthlyContribution>0?margin/monthlyContribution:0;
 document.querySelector('#bufferEuro').textContent=(margin>=0?'+':'-')+fmt(Math.abs(margin));
 document.querySelector('#bufferMonths').textContent=margin>=0?'Equivale a '+bufferMonths.toFixed(1)+' meses dos seus aportes planejados.':'Déficit equivalente a '+Math.abs(bufferMonths).toFixed(1)+' meses de aportes.';

 const es=d.etfs/d.core_fire*100,ps=d.pension/d.core_fire*100;
 document.querySelector('#etfs').textContent=fmt(d.etfs)+' ETFs';document.querySelector('#pension').textContent=fmt(d.pension)+' Pensões';
 document.querySelector('#etfShare').textContent=es.toFixed(1)+'%';document.querySelector('#pensionShare').textContent=ps.toFixed(1)+'%';document.querySelector('#eBar').style.width=es+'%';document.querySelector('#pBar').style.width=ps+'%';

 const bm=d.etfs/d.barista.etf_target_2029*100;document.querySelector('#baristaCurrent').textContent=fmt(d.etfs);document.querySelector('#baristaTarget').textContent=fmt(d.barista.etf_target_2029);document.querySelector('#baristaBar').style.width=clamp(bm,0,100)+'%';document.querySelector('#baristaPct').textContent=bm.toFixed(1)+'% da meta de ETFs acessíveis';

 document.querySelector('#official').textContent=fmt(d.official_financial_assets);document.querySelector('#sync').textContent=d.sync_warnings.length?'Há avisos de sincronização no Finary.':'Sem sync warnings no último check.';

 renderMilestones(d);renderMonthly(d);
 const proj=buildProjection(d);drawProjection(d,proj);drawMargin(d.history);
 const conservativeEnd=proj[proj.length-1].conservative;
 document.querySelector('#conservativeEnd').textContent=fmt(conservativeEnd);
 document.querySelector('#planEnd').textContent=fmt(d.final_target);

 const histDates=d.history.map(h=>new Date(h.date)).filter(x=>!Number.isNaN(x.getTime())).sort((a,b)=>a-b);
 const historyDays=histDates.length>1?(histDates[histDates.length-1]-histDates[0])/86400000:0;
 const minDays=(d.projection&&d.projection.current_pace_min_history_days)||90;
 document.querySelector('#paceEnd').textContent='—';
 document.querySelector('#paceCaption').textContent='Precisamos de ~'+Math.max(0,Math.ceil(minDays-historyDays))+' dias a mais de histórico para evitar extrapolar ruído de curto prazo.';
 const gap=d.final_target-conservativeEnd;
 document.querySelector('#outlookNote').innerHTML=gap>0?'<strong>Leitura:</strong> no cenário conservador de '+(conservativeRate*100).toFixed(1)+'%, você terminaria cerca de '+fmt(gap)+' abaixo do plano de '+fmt(d.final_target)+'. A linha serve como stress-test leve.':'<strong>Leitura:</strong> até o cenário conservador de '+(conservativeRate*100).toFixed(1)+'% alcança a meta final nas premissas atuais.';
 renderAccumulationMc(d);
 const selfTest=runFireSelfTests(d);document.querySelector('#modelTests').textContent=selfTest.passed+'/'+selfTest.total+' passed';document.querySelector('#modelTests').style.color=selfTest.passed===selfTest.total?'var(--green)':'var(--red)';
 initScenarioLab(d);
});



function aMulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function aNormal(rand){let u=0,v=0;while(!u)u=rand();while(!v)v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function aPercentile(sorted,p){if(!sorted.length)return 0;const x=(sorted.length-1)*p,i=Math.floor(x),r=x-i;return sorted[i+1]!==undefined?sorted[i]+r*(sorted[i+1]-sorted[i]):sorted[i]}
function addMonthsUTC(date,months){return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+months,1))}
function accMonteCarlo(d,opts={}){
 const cfg=d.accumulation_monte_carlo||{},start=new Date(d.updated_at),official=parseEndMonth((d.projection&&d.projection.end_month)||'2029-12');
 const sims=opts.simulations||cfg.simulations||5000,annual=Number.isFinite(opts.annualReturn)?opts.annualReturn:(cfg.expected_nominal_return??0.075),vol=Number.isFinite(opts.volatility)?opts.volatility:(cfg.annual_volatility??0.14);
 const monthly=Number.isFinite(opts.monthly)?opts.monthly:d.contribution_plan.total_monthly,bonus=Number.isFinite(opts.bonus)?opts.bonus:0,target=Number.isFinite(opts.target)?opts.target:d.final_target,bonusMonth=(d.scenario_lab&&d.scenario_lab.bonus_month)||3;
 const maxMonths=opts.maxMonths||cfg.max_horizon_months||120,officialMonths=Math.max(0,(official.getUTCFullYear()-start.getUTCFullYear())*12+(official.getUTCMonth()-start.getUTCMonth()));
 const mean=Math.pow(1+annual,1/12)-1,monthlyVol=vol/Math.sqrt(12),rand=aMulberry32((cfg.seed||20261009)+Math.round(monthly)+Math.round(bonus)+Math.round(annual*10000)+Math.round(target/1000));
 const ends=[],hits=[];let successOfficial=0;
 for(let s=0;s<sims;s++){
   let value=d.core_fire,hit=value>=target?0:null,endValue=officialMonths===0?value:null,y=start.getUTCFullYear(),m=start.getUTCMonth();
   for(let i=1;i<=maxMonths;i++){
     m++;if(m>11){m=0;y++}
     const ret=Math.max(-.95,mean+monthlyVol*aNormal(rand));
     value=value*(1+ret)+monthly;
     if((m+1)===bonusMonth)value+=bonus;
     if(hit===null&&value>=target)hit=i;
     if(i===officialMonths)endValue=value;
   }
   if(endValue===null)endValue=value;
   ends.push(endValue);hits.push(hit===null?Infinity:hit);
   if(hit!==null&&hit<=officialMonths)successOfficial++;
 }
 ends.sort((a,b)=>a-b);hits.sort((a,b)=>a-b);
 const confDate=level=>{const idx=Math.min(hits.length-1,Math.max(0,Math.ceil(level*hits.length)-1)),mo=hits[idx];return Number.isFinite(mo)?addMonthsUTC(start,mo):null};
 return {simulations:sims,annualReturn:annual,volatility:vol,successByOfficial:successOfficial/sims,p10:aPercentile(ends,.1),p50:aPercentile(ends,.5),p90:aPercentile(ends,.9),date50:confDate(.5),date80:confDate(.8),date90:confDate(.9)};
}
function renderAccumulationMc(d){
 const m=accMonteCarlo(d),pct=m.successByOfficial*100;
 document.querySelector('#accMcSuccess').textContent=pct.toFixed(0)+'%';
 document.querySelector('#accMcP10').textContent=fmt(m.p10);document.querySelector('#accMcP50').textContent=fmt(m.p50);document.querySelector('#accMcP90').textContent=fmt(m.p90);
 document.querySelector('#accMcDate50').textContent=m.date50?formatMonthYear(m.date50):'Beyond horizon';
 document.querySelector('#accMcDate80').textContent=m.date80?formatMonthYear(m.date80):'Beyond horizon';
 document.querySelector('#accMcDate90').textContent=m.date90?formatMonthYear(m.date90):'Beyond horizon';
 document.querySelector('#accMcCaption').textContent=m.simulations.toLocaleString('en-IE')+' paths • mean '+(m.annualReturn*100).toFixed(1)+'% • volatility '+(m.volatility*100).toFixed(0)+'% • monthly sequence risk';
 const status=pct>=80?'green':pct>=60?'amber':'red';
 document.querySelector('#accMcStatus').textContent=status==='green'?'🟢 HIGH CONFIDENCE':status==='amber'?'🟡 MODERATE':'🔴 LOW CONFIDENCE';
 document.querySelector('#accMcStatus').style.color=status==='green'?'var(--green)':status==='amber'?'var(--amber)':'var(--red)';
 document.querySelector('#accMcInsight').innerHTML='<strong>Leitura:</strong> a data determinística continua útil como baseline, mas a probabilidade mostra o efeito da ordem dos retornos. O percentil 80% é uma boa referência para uma data de saída mais prudente.';
 window.__baselineAccMc=m;
}
function renderScenarioMonteCarlo(d,monthly,bonus,rate,target){
 const cfg=d.accumulation_monte_carlo||{},sims=Math.min(2000,cfg.simulations||5000),m=accMonteCarlo(d,{monthly,bonus,annualReturn:rate,target,simulations:sims});
 const baseline=window.__baselineAccMc||accMonteCarlo(d,{simulations:sims});
 const pct=m.successByOfficial*100,delta=(m.successByOfficial-baseline.successByOfficial)*100;
 document.querySelector('#sMcSuccess').textContent=pct.toFixed(0)+'%';
 document.querySelector('#sMcDate80').textContent=m.date80?formatMonthYear(m.date80):'Beyond horizon';
 document.querySelector('#sMcRange').textContent=k(m.p10)+' / '+k(m.p50)+' / '+k(m.p90);
 document.querySelector('#sMcDelta').textContent=(delta>=0?'+':'')+delta.toFixed(0)+' pp';
 document.querySelector('#sMcDelta').className='mc-number '+(delta>=0?'green':'amber');
 document.querySelector('#sMcCaption').textContent=m.simulations.toLocaleString('en-IE')+' interactive simulations • volatility '+(m.volatility*100).toFixed(0)+'%';
 document.querySelector('#sMcStatus').textContent=pct>=80?'🟢 HIGH':pct>=60?'🟡 MODERATE':'🔴 LOW';
 document.querySelector('#sMcStatus').style.color=pct>=80?'var(--green)':pct>=60?'var(--amber)':'var(--red)';
}
function runFireSelfTests(d){
 let passed=0,total=4;
 try{const b=estimateFireDate(d.core_fire,d.contribution_plan.total_monthly,(d.projection&&d.projection.plan_rate_annual)||.075,0,d.final_target,new Date(d.updated_at),(d.scenario_lab&&d.scenario_lab.bonus_month)||3),x=estimateFireDate(d.core_fire,d.contribution_plan.total_monthly,(d.projection&&d.projection.plan_rate_annual)||.075,10000,d.final_target,new Date(d.updated_at),(d.scenario_lab&&d.scenario_lab.bonus_month)||3);if(b&&x&&x.months<=b.months)passed++}catch(e){}
 try{const end=parseEndMonth((d.projection&&d.projection.end_month)||'2029-12'),v1=valueAtEndMonth(d.core_fire,3000,.05,0,new Date(d.updated_at),end,3),v2=valueAtEndMonth(d.core_fire,4000,.05,0,new Date(d.updated_at),end,3);if(v2>v1)passed++}catch(e){}
 try{const m=accMonteCarlo(d,{simulations:120});if(m.p10<=m.p50&&m.p50<=m.p90)passed++}catch(e){}
 try{if(parseEndMonth('2029-12').getUTCMonth()===11)passed++}catch(e){}
 return {passed,total};
}

function parseEndMonth(s){const [y,m]=String(s).split('-').map(Number);return new Date(Date.UTC(y,(m||12)-1,1))}
function formatMonthYear(date){return date.toLocaleDateString('pt-BR',{month:'short',year:'numeric',timeZone:'UTC'}).replace('.','')}
function monthDifference(earlier,later){return(later.getUTCFullYear()-earlier.getUTCFullYear())*12+(later.getUTCMonth()-earlier.getUTCMonth())}
function estimateFireDate(current,monthlyContribution,annualReturn,annualBonus,target,startDate,bonusMonth,maxMonths=240){
 let value=current;if(value>=target)return{date:new Date(Date.UTC(startDate.getUTCFullYear(),startDate.getUTCMonth(),1)),months:0,value};
 const mr=Math.pow(1+annualReturn,1/12)-1;let y=startDate.getUTCFullYear(),m=startDate.getUTCMonth();
 for(let i=1;i<=maxMonths;i++){m++;if(m>11){m=0;y++}value=value*(1+mr)+monthlyContribution;if((m+1)===bonusMonth)value+=annualBonus;if(value>=target)return{date:new Date(Date.UTC(y,m,1)),months:i,value}}
 return null;
}
function valueAtEndMonth(current,monthlyContribution,annualReturn,annualBonus,startDate,endDate,bonusMonth){
 let value=current,mr=Math.pow(1+annualReturn,1/12)-1,y=startDate.getUTCFullYear(),m=startDate.getUTCMonth(),endYM=endDate.getUTCFullYear()*12+endDate.getUTCMonth();
 while(y*12+m<endYM){m++;if(m>11){m=0;y++}value=value*(1+mr)+monthlyContribution;if((m+1)===bonusMonth)value+=annualBonus}return value;
}
function requiredAnnualReturnWithBonus(current,monthlyContribution,annualBonus,target,startDate,endDate,bonusMonth){
 const endValue=annual=>valueAtEndMonth(current,monthlyContribution,annual,annualBonus,startDate,endDate,bonusMonth);let lo=-0.95,hi=1;
 while(endValue(hi)<target&&hi<10)hi*=2;if(endValue(hi)<target)return null;
 for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(endValue(mid)<target)lo=mid;else hi=mid}return hi;
}
function initScenarioLab(d){
 const cfg=d.scenario_lab||{},planRate=(d.projection&&Number.isFinite(d.projection.plan_rate_annual))?d.projection.plan_rate_annual:0.075;
 const els={monthly:document.querySelector('#sMonthly'),bonus:document.querySelector('#sBonus'),rate:document.querySelector('#sReturn'),target:document.querySelector('#sTarget')};
 if(!els.monthly.dataset.ready){els.monthly.value=cfg.default_monthly_contribution??d.contribution_plan.total_monthly;els.bonus.value=cfg.default_annual_bonus??0;els.rate.value=((cfg.default_return_annual??planRate)*100).toFixed(1);els.target.value=cfg.default_target??d.final_target;els.monthly.dataset.ready='1';Object.values(els).forEach(el=>el.addEventListener('input',()=>renderScenarioLab(d)))}
 renderScenarioLab(d);
}
function renderScenarioLab(d){
 const cfg=d.scenario_lab||{},start=new Date(d.updated_at),bonusMonth=cfg.bonus_month||3;
 const monthly=Math.max(0,Number(document.querySelector('#sMonthly').value)||0),bonus=Math.max(0,Number(document.querySelector('#sBonus').value)||0),rate=(Number(document.querySelector('#sReturn').value)||0)/100,target=Math.max(1,Number(document.querySelector('#sTarget').value)||d.final_target);
 const officialEnd=parseEndMonth((d.projection&&d.projection.end_month)||'2029-12'),baseMonthly=d.contribution_plan.total_monthly,baseRate=(d.projection&&d.projection.plan_rate_annual)||0.075;
 const baseline=estimateFireDate(d.core_fire,baseMonthly,baseRate,0,d.final_target,start,bonusMonth),scenario=estimateFireDate(d.core_fire,monthly,rate,bonus,target,start,bonusMonth);
 const endValue=valueAtEndMonth(d.core_fire,monthly,rate,bonus,start,officialEnd,bonusMonth),req=requiredAnnualReturnWithBonus(d.core_fire,monthly,bonus,target,start,officialEnd,bonusMonth),saved=(baseline&&scenario)?scenario.months-baseline.months:null;
 document.querySelector('#sFireDate').textContent=scenario?formatMonthYear(scenario.date):'> '+formatMonthYear(new Date(Date.UTC(start.getUTCFullYear()+20,start.getUTCMonth(),1)));
 document.querySelector('#sFireDateCaption').textContent=scenario?'Meta atingida em '+scenario.months+' meses':'Meta não atingida no horizonte do simulador';
 document.querySelector('#sMonthsSaved').textContent=saved===null?'—':saved<0?Math.abs(saved)+' meses antes':saved>0?saved+' meses depois':'Sem mudança';
 document.querySelector('#sMonthsSaved').className='scenario-result '+(saved!==null&&saved<=0?'green':'amber');
 document.querySelector('#sEndValue').textContent=fmt(endValue);
 const delta=endValue-d.final_target;document.querySelector('#sEndValueDelta').textContent=(delta>=0?'+':'-')+fmt(Math.abs(delta))+' vs meta oficial';
 document.querySelector('#sRequiredReturn').textContent=req===null?'—':(req*100).toFixed(1)+'%';
 const bonusTxt=bonus>0?' + '+rEuro(bonus)+'/ano de bônus':' sem bônus';
 document.querySelector('#sInsight').innerHTML='<strong>Cenário:</strong> '+rEuro(monthly)+'/mês'+bonusTxt+' e '+(rate*100).toFixed(1)+'% a.a. '+(scenario?('leva à meta em <strong>'+formatMonthYear(scenario.date)+'</strong>.'):'não chega à meta no horizonte simulado.')+' Isso não altera o plano oficial.';
 renderScenarioMonteCarlo(d,monthly,bonus,rate,target);
}

function requiredAnnualReturn(current,monthlyContribution,target,months){
 if(months<=0)return current>=target?0:null;
 const endValue=annual=>{
   const monthlyRate=Math.pow(1+annual,1/12)-1;
   let value=current;
   for(let i=0;i<months;i++)value=value*(1+monthlyRate)+monthlyContribution;
   return value;
 };
 let lo=-0.99,hi=1;
 while(endValue(hi)<target&&hi<10)hi*=2;
 if(endValue(hi)<target)return null;
 for(let i=0;i<80;i++){
   const mid=(lo+hi)/2;
   if(endValue(mid)<target)lo=mid;else hi=mid;
 }
 return hi;
}

function renderMilestones(d){
 const tb=document.querySelector('#milestones');tb.innerHTML='';
 d.milestones.forEach((m,i)=>{const tr=document.createElement('tr');const pct=d.core_fire/m.target*100;tr.innerHTML='<td>'+m.label+'</td><td>'+fmt(m.target)+'</td><td><span class="pill">'+(i===0?Math.min(100,pct).toFixed(1)+'%':'Plan')+'</span></td>';tb.appendChild(tr)});
 const n=d.milestones.find(m=>d.core_fire<m.target)||d.milestones[d.milestones.length-1];document.querySelector('#nextMilestone').textContent='Próximo milestone: faltam '+fmt(Math.max(0,n.target-d.core_fire))+' para '+n.label+'.';
}
function renderMonthly(d){
 const mt=document.querySelector('#monthly');mt.innerHTML='';
 const now=new Date(d.updated_at),ym=now.getUTCFullYear()*12+now.getUTCMonth();
 let idx=d.monthly.findIndex(m=>{const md=parseMonth(m.month);return md.getUTCFullYear()*12+md.getUTCMonth()>=ym});
 if(idx<0)idx=d.monthly.length-1;
 d.monthly.slice(idx,idx+4).forEach((m,i)=>{const tr=document.createElement('tr');tr.innerHTML='<td>'+m.month+'</td><td>'+fmt(m.etfs)+'</td><td>'+fmt(m.pension)+'</td><td>'+fmt(m.core)+'</td><td class="'+(i===0?'green':'')+'">'+(i===0?fmt(d.core_fire):'—')+'</td>';mt.appendChild(tr)});
}
function buildProjection(d){
 const plan=d.monthly.map(m=>({date:parseMonth(m.month),label:m.month,plan:m.core}));
 const updated=new Date(d.updated_at),startMonth=new Date(Date.UTC(updated.getUTCFullYear(),updated.getUTCMonth(),15));
 const annual=(d.projection&&Number.isFinite(d.projection.conservative_rate_annual))?d.projection.conservative_rate_annual:0.04;
 const monthlyContribution=(d.projection&&Number.isFinite(d.projection.monthly_contribution))?d.projection.monthly_contribution:((d.contribution_plan&&d.contribution_plan.total_monthly)||4000);
 const mr=Math.pow(1+annual,1/12)-1;
 let val=d.core_fire,started=false;
 return plan.map(p=>{
   if(!started&&p.date>=startMonth)started=true;
   if(!started)return {...p,conservative:null};
   if(p.date.getTime()===startMonth.getTime())return {...p,conservative:val};
   val=val*(1+mr)+monthlyContribution;
   return {...p,conservative:val};
 });
}
function drawProjection(d,proj){
 const svg=document.querySelector('#projectionChart'),W=900,H=300,p={l:52,r:16,t:18,b:38};
 const actual=d.history.map(h=>({date:new Date(h.date),value:h.actual,label:h.label})).filter(x=>!Number.isNaN(x.date.getTime()));
 const allVals=[...proj.flatMap(x=>[x.plan,x.conservative]).filter(Number.isFinite),...actual.map(x=>x.value)];
 const mn=Math.min(...allVals)*.97,mx=Math.max(...allVals)*1.03;
 const t0=Math.min(proj[0].date.getTime(),...actual.map(a=>a.date.getTime())),t1=proj[proj.length-1].date.getTime();
 const x=t=>p.l+(t-t0)*(W-p.l-p.r)/(t1-t0),y=v=>p.t+(mx-v)*(H-p.t-p.b)/(mx-mn);
 let s='';
 for(let i=0;i<5;i++){const yy=p.t+i*(H-p.t-p.b)/4;s+='<line x1="'+p.l+'" y1="'+yy+'" x2="'+(W-p.r)+'" y2="'+yy+'" stroke="#202944"/>';const val=mx-i*(mx-mn)/4;s+='<text x="4" y="'+(yy+4)+'" fill="#9aa4bc" font-size="10">'+Math.round(val/1000)+'k</text>'}
 const path=(arr,key)=>arr.filter(a=>Number.isFinite(a[key])).map(a=>x(a.date.getTime())+','+y(a[key])).join(' ');
 s+='<polyline fill="none" stroke="#7c9cff" stroke-width="3" points="'+path(proj,'plan')+'"/>';
 s+='<polyline fill="none" stroke="#f4c95d" stroke-width="3" stroke-dasharray="7 5" points="'+path(proj,'conservative')+'"/>';
 if(actual.length>1)s+='<polyline fill="none" stroke="#35d07f" stroke-width="4" points="'+actual.map(a=>x(a.date.getTime())+','+y(a.value)).join(' ')+'"/>';
 actual.forEach(a=>s+='<circle cx="'+x(a.date.getTime())+'" cy="'+y(a.value)+'" r="4" fill="#35d07f"/>');
 const ticks=[0,3,15,27,39].filter(i=>i<proj.length);
 ticks.forEach(i=>{const pt=proj[i];s+='<text x="'+(x(pt.date.getTime())-17)+'" y="'+(H-10)+'" fill="#9aa4bc" font-size="10">'+pt.label+'</text>'});
 svg.innerHTML=s;
}
function drawMargin(h){
 const svg=document.querySelector('#marginChart'),W=900,H=210,p={l:52,r:16,t:16,b:34};
 const arr=h.map(x=>({label:x.label,v:x.actual-x.target})),maxAbs=Math.max(1000,...arr.map(x=>Math.abs(x.v)))*1.15;
 const x=i=>p.l+(arr.length===1?0:i*(W-p.l-p.r)/(arr.length-1)),y=v=>p.t+(maxAbs-v)*(H-p.t-p.b)/(2*maxAbs),zero=y(0);
 let s='<line x1="'+p.l+'" y1="'+zero+'" x2="'+(W-p.r)+'" y2="'+zero+'" stroke="#9aa4bc" stroke-width="1.5"/><text x="5" y="'+(zero+4)+'" fill="#9aa4bc" font-size="10">€0</text>';
 if(arr.length>1)s+='<polyline fill="none" stroke="#b99cff" stroke-width="3" points="'+arr.map((a,i)=>x(i)+','+y(a.v)).join(' ')+'"/>';
 arr.forEach((a,i)=>{const c=a.v>=0?'#35d07f':'#ff7272';s+='<circle cx="'+x(i)+'" cy="'+y(a.v)+'" r="5" fill="'+c+'"/><text x="'+(x(i)-15)+'" y="'+(H-10)+'" fill="#9aa4bc" font-size="10">'+a.label+'</text>'});
 svg.innerHTML=s;
}

function setupTabs(){
 const buttons=[...document.querySelectorAll('.tabbtn')],panels=[...document.querySelectorAll('.tab-panel')];
 function activate(id,push=true){
   buttons.forEach(b=>b.classList.toggle('active',b.dataset.tab===id));panels.forEach(p=>p.classList.toggle('active',p.id===id));
   const retirement=id==='retirementPanel',scenario=id==='scenarioPanel',badge=document.querySelector('#status');badge.classList.remove('retirement-mode','scenario-mode');
   if(retirement){badge.textContent='🔵 PROJECTION MODE';badge.classList.add('retirement-mode')}
   else if(scenario){badge.textContent='🟡 WHAT-IF MODE';badge.classList.add('scenario-mode')}
   else badge.textContent=window.__fireStatusText||'⏳ LOADING';
   if(push){const url=new URL(location.href);url.searchParams.set('tab',retirement?'retirement':scenario?'scenario':'fire');history.replaceState(null,'',url)}
 }
 buttons.forEach(b=>b.addEventListener('click',()=>activate(b.dataset.tab)));
 const wanted=new URLSearchParams(location.search).get('tab');activate(wanted==='retirement'?'retirementPanel':wanted==='scenario'?'scenarioPanel':'firePanel',false);
}
setupTabs();

Promise.all([fetch('retirement-data.json?ts='+Date.now()).then(r=>r.json()),fetch('data.json?ts='+Date.now()).then(r=>r.json())]).then(([d,fire])=>{
 rSyncRetirementFromFire(d,fire);
 const a=d.assumptions,t=d.tax_rules,p=d.projection_inputs;
 const defaultSim=rSimulate(d,a.default_pension_access_age,a.central_return_rate);
 const pensionStart=p.projected_total_pensions_2030;
 const salaryOnly=rGeneralTax(a.barista_income_gross_2030,0,a.retirement_start_year,a,t);
 const baristaNet=a.barista_income_gross_2030-salaryOnly.tax-salaryOnly.ss;

 document.querySelector('#rUpdated').textContent='Modelo '+new Date(d.updated_at).toLocaleDateString('pt-BR')+' • saldos sincronizados do FIRE em '+new Date(d.synced_fire_at).toLocaleDateString('pt-BR')+' • Forever FIRE até '+((d.forever_fire&&d.forever_fire.end_year)||2100);
 document.querySelector('#rLifestyle2030').textContent=rEuro(a.lifestyle_annual_2030);
 document.querySelector('#rBaristaGross').textContent=rEuro(a.barista_income_gross_2030)+' bruto';
 document.querySelector('#rBaristaNet').textContent='≈ '+rEuro(baristaNet)+' líquido no proxy fiscal';
 document.querySelector('#rStartAssets').textContent=fmt(p.projected_total_assets_2030);
 document.querySelector('#rDefaultTax').textContent=fmt(defaultSim.totalTax);
 document.querySelector('#rDefaultTaxCaption').textContent='Até '+(defaultSim.firstShortfallYear||a.projection_end_year)+' • SS separada';
 document.querySelector('#rShortfall').textContent=defaultSim.firstShortfallYear||('>'+a.projection_end_year);
 const vBirthYear=Number(String(d.people.Victor.birth_date).slice(0,4)),v55=vBirthYear+55,v60=vBirthYear+60;
 document.querySelector('#rAssets55').textContent=rAssetAt(defaultSim,v55);
 document.querySelector('#rAssets60').textContent=rAssetAt(defaultSim,v60);
 document.querySelector('#rShortfallCaption').textContent=(a.central_return_rate*100).toFixed(1)+'% retorno • acesso à pensão aos '+a.default_pension_access_age;
 document.querySelector('#rAssets55Caption').textContent='Final de '+v55+' no cenário padrão';
 document.querySelector('#rAssets60Caption').textContent='Final de '+v60+' no cenário padrão';

 document.querySelector('#rHouseCash').textContent=fmt(a.house_cash_2030);
 document.querySelector('#rEtfStart').textContent=fmt(p.projected_etfs_2030)+' • basis '+fmt(p.projected_etf_cost_basis_2030);
 document.querySelector('#rPensionStart').textContent=fmt(pensionStart)+' • Rosely '+fmt(d.people.Rosely.projected_pension_2030)+' / Victor '+fmt(d.people.Victor.projected_pension_2030);
 document.querySelector('#rCashEndYear').textContent=defaultSim.cashEndYear||'—';
 document.querySelector('#rEtfPhaseYear').textContent=defaultSim.etfStartYear||'—';
 document.querySelector('#rPensionPhaseYear').textContent=defaultSim.pensionStartYear||'—';

 document.querySelector('#rSalaryTax').textContent=fmt(defaultSim.salaryTax);
 document.querySelector('#rPensionTax').textContent=fmt(defaultSim.pensionTax);
 document.querySelector('#rEtfTax').textContent=fmt(defaultSim.etfTax);
 document.querySelector('#rSocialSecurity').textContent=fmt(defaultSim.totalSS);
 document.querySelector('#rLifetimeTax').textContent=fmt(defaultSim.totalTax);
 document.querySelector('#rMonthlyBudget').textContent=rEuro(a.lifestyle_annual_2030/12);
 const ff=d.forever_fire,total2030=p.projected_total_assets_2030;
 const bridgeCfg=d.bridge_to_pension||{default_access_age:a.default_pension_access_age,scenarios:a.pension_access_age_scenarios,safety_buffer_years:2};
 const bridgeDefault=rBridgeScenario(d,bridgeCfg.default_access_age);
 document.querySelector('#rBridgeAccessible').textContent=fmt(bridgeDefault.accessibleStart);
 document.querySelector('#rBridgeNeed').textContent=fmt(bridgeDefault.lifestyleGap);
 document.querySelector('#rBridgeNeedCaption').textContent='Até '+bridgeDefault.firstPensionYear+' • inclui '+fmt(bridgeDefault.etfTax)+' de tax ETF';
 document.querySelector('#rBridgeFirstYear').textContent=bridgeDefault.firstPensionYear;
 document.querySelector('#rBridgeYears').textContent=bridgeDefault.bridgeYears+' anos de bridge • acesso aos '+bridgeCfg.default_access_age;
 document.querySelector('#rBridgeRemaining').textContent=fmt(bridgeDefault.remainingAccessible);
 document.querySelector('#rBridgeBuffer').textContent='Safety buffer '+fmt(bridgeDefault.safetyBuffer)+' • '+bridgeCfg.safety_buffer_years+' anos do draw alvo';
 document.querySelector('#rBridgeStatus').textContent=bridgeDefault.statusLabel;
 document.querySelector('#rBridgeStatus').style.color=bridgeDefault.status==='green'?'var(--green)':bridgeDefault.status==='amber'?'var(--amber)':'var(--red)';
 document.querySelector('#rBridgeStatus').style.background=bridgeDefault.status==='green'?'#35d07f15':bridgeDefault.status==='amber'?'#f4c95d18':'#ff727218';
 document.querySelector('#rBridgeInsight').innerHTML=bridgeDefault.shortfall>1
   ?'<strong>Gap:</strong> no cenário de acesso aos '+bridgeCfg.default_access_age+', o capital acessível acaba antes da primeira pensão. Shortfall estimado: '+fmt(bridgeDefault.shortfall)+'.'
   :'<strong>Bridge coberto:</strong> no cenário de acesso aos '+bridgeCfg.default_access_age+', o plano chega à primeira pensão com aproximadamente <strong>'+fmt(bridgeDefault.remainingAccessible)+'</strong> ainda acessíveis, depois de financiar o lifestyle gap e impostos dos ETFs.';
 rRenderBridgeTable(d);
 const rules=d.pension_rules||{};
 document.querySelector('#rArfVerified').textContent='Verified '+(rules.last_verified||'—');
 document.querySelector('#rArfStart').textContent=(rules.imputed_distribution_start_age||60)+'+';
 document.querySelector('#rArfRates').textContent=((rules.imputed_rate_under_70||.04)*100).toFixed(0)+'% / '+((rules.imputed_rate_70_plus||.05)*100).toFixed(0)+'% / '+((rules.high_value_rate||.06)*100).toFixed(0)+'%';
 document.querySelector('#rArfResidence').textContent=rules.tax_residence_assumption||'—';
 document.querySelector('#rArfWithholding').textContent=rules.arf_or_vested_prsa_irish_withholding_at_source?'Irish at source':'Not modeled';
 document.querySelector('#rArfImpact').innerHTML='<strong>Model behavior:</strong> após crystallisation assumida para ARF, o motor aplica o piso de imputed distribution quando elegível. Qualquer distribuição líquida acima do gasto é reinvestida no bucket tributável de ETFs. A retenção irlandesa transfronteiriça é sinalizada, mas o foreign-tax-credit final não é modelado separadamente.';
 const fullMcByAge=rRenderFullMcTable(d),fullDefault=fullMcByAge[a.default_pension_access_age];
 document.querySelector('#rFullMcDefault').textContent=(fullDefault.successRate*100).toFixed(0)+'%';
 document.querySelector('#rFullMcP10').textContent=fmt(fullDefault.p10RealEnd);document.querySelector('#rFullMcMedian').textContent=fmt(fullDefault.medianRealEnd);document.querySelector('#rFullMcP90').textContent=fmt(fullDefault.p90RealEnd);
 document.querySelector('#rFullMcCaption').textContent=d.full_plan_monte_carlo.simulations.toLocaleString('en-IE')+' simulations por cenário • cash → pension/ARF → ETF • tax-aware • até '+d.full_plan_monte_carlo.end_year;
 const fStatus=fullDefault.successRate>=.8?'green':fullDefault.successRate>=.6?'amber':'red';
 document.querySelector('#rFullMcStatus').textContent=fStatus==='green'?'🟢 ROBUST':fStatus==='amber'?'🟡 WATCH':'🔴 FRAGILE';
 document.querySelector('#rFullMcStatus').style.color=fStatus==='green'?'var(--green)':fStatus==='amber'?'var(--amber)':'var(--red)';
 document.querySelector('#rFullMcInsight').innerHTML='<strong>Leitura:</strong> este é o Monte Carlo mais completo do Hub. Diferente do Forever FIRE simplificado, ele respeita os buckets, acesso às pensões, proxy fiscal espanhol e o piso ARF configurado.';
 rRenderExecutiveSummary(d,fire,bridgeDefault,fullDefault);
 rSetupRetirementDetails();
 const rTests=rRunSelfTests(d);if(rTests.passed<rTests.total)console.warn('Retirement self-tests',rTests);
 const foreverWR=ff.portfolio_withdrawal_real_2030/total2030,requiredNominal=a.inflation_rate+foreverWR;
 const grossNeeded=rGrossForNet(ff.outside_income_net_target_2030,a.retirement_start_year,a,t);
 const incomeGap=Math.max(0,ff.outside_income_net_target_2030-baristaNet);
 const reserve=Math.min(a.house_cash_2030,ff.portfolio_withdrawal_real_2030*ff.cash_strategy.reserve_years);
 const mcReserve=rMonteCarlo(d,'reserve'),mcAll=rMonteCarlo(d,'all_cash'),guard=rGuardrailStatus(foreverWR,ff.guardrails);
 document.querySelector('#rForeverDraw').textContent=rEuro(ff.portfolio_withdrawal_real_2030)+'/ano';
 document.querySelector('#rOutsideIncome').textContent=rEuro(ff.outside_income_net_target_2030)+'/ano';
 document.querySelector('#rGrossNeeded').textContent='≈ '+rEuro(grossNeeded)+'/ano';
 document.querySelector('#rIncomeGap').textContent='≈ '+rEuro(incomeGap)+'/ano';
 document.querySelector('#rForeverWR').textContent=(foreverWR*100).toFixed(2)+'%';
 document.querySelector('#rForeverRequiredReturn').textContent='≈ '+(requiredNominal*100).toFixed(2)+'% p.a.';
 document.querySelector('#rMcSuccess').textContent=(mcReserve.successRate*100).toFixed(0)+'%';
 document.querySelector('#rMcCaption').textContent=ff.monte_carlo.simulations.toLocaleString('en-IE')+' sims • median real 2100 '+fmt(mcReserve.medianRealEnd);
 const statusOk=a.central_return_rate>=requiredNominal;
 document.querySelector('#rForeverStatus').textContent=statusOk?'🟢 Expected real-principal margin':'🟡 Central return below preservation rate';
 document.querySelector('#rForeverStatus').style.color=statusOk?'var(--green)':'var(--amber)';
 document.querySelector('#rForeverInsight').innerHTML='<strong>Leitura:</strong> '+rEuro(ff.portfolio_withdrawal_real_2030)+' começa em '+(foreverWR*100).toFixed(2)+'% do patrimônio. Preservar o principal em poder de compra exige aproximadamente '+(requiredNominal*100).toFixed(2)+'% nominal antes do drag fiscal. O cenário central atual de '+(a.central_return_rate*100).toFixed(0)+'% fica abaixo disso.';
 document.querySelector('#rGuardrailRate').textContent=(foreverWR*100).toFixed(2)+'% • '+guard.label;
 document.querySelector('#rGuardrailAction').innerHTML='<strong>'+guard.label+':</strong> '+guard.action;
 document.querySelector('#rAllCash').textContent=fmt(a.house_cash_2030)+' @ 0%';
 document.querySelector('#rCashReserve').textContent=fmt(reserve)+' ('+ff.cash_strategy.reserve_years+' anos)';
 document.querySelector('#rInvestableRemainder').textContent=fmt(a.house_cash_2030-reserve);
 document.querySelector('#rMcAllCash').textContent=(mcAll.successRate*100).toFixed(0)+'%';
 document.querySelector('#rMcReserve').textContent=(mcReserve.successRate*100).toFixed(0)+'%';
 rDrawForever(ff.deterministic_rates.map(rate=>rForeverScenario(d,rate)),d);

 rDrawBuckets(defaultSim.rows,a);
 rRenderScenarioTable(d);
 rRenderSensitivityTable(d);
 rRenderRetirementYears(defaultSim.rows,d);
}).catch(e=>{
 console.error(e);
 const el=document.querySelector('#rUpdated');
 if(el)el.textContent='Erro ao carregar retirement-data.json';
});



function rProjectMonthly(current,monthly,annual,months){const mr=Math.pow(1+annual,1/12)-1;let v=current;for(let i=0;i<months;i++)v=v*(1+mr)+monthly;return v}
function rSyncRetirementFromFire(d,fire){
 const a=d.assumptions,p=d.projection_inputs,snap=new Date(fire.updated_at),months=Math.max(0,(a.retirement_start_year-snap.getUTCFullYear())*12-snap.getUTCMonth());
 const accumulationRate=(fire.projection&&Number.isFinite(fire.projection.plan_rate_annual))?fire.projection.plan_rate_annual:a.central_return_rate;
 const oldV=d.people.Victor.pension_balance_snapshot,oldR=d.people.Rosely.pension_balance_snapshot,oldTotal=oldV+oldR,vShare=oldTotal>0?oldV/oldTotal:.5,rShare=1-vShare;
 const curV=fire.pension*vShare,curR=fire.pension*rShare,projV=rProjectMonthly(curV,d.people.Victor.monthly_pension_contribution,accumulationRate,months),projR=rProjectMonthly(curR,d.people.Rosely.monthly_pension_contribution,accumulationRate,months);
 const projectedEtfs=rProjectMonthly(fire.etfs,(fire.contribution_plan&&fire.contribution_plan.etfs_monthly)||0,accumulationRate,months),basisRatio=p.projected_etfs_2030>0?p.projected_etf_cost_basis_2030/p.projected_etfs_2030:.65;
 d.people.Victor.pension_balance_snapshot=curV;d.people.Rosely.pension_balance_snapshot=curR;d.people.Victor.projected_pension_2030=projV;d.people.Rosely.projected_pension_2030=projR;
 p.pension_snapshot_date=String(fire.updated_at).slice(0,10);p.months_to_retirement=months;p.projected_etfs_2030=projectedEtfs;p.projected_etf_cost_basis_2030=projectedEtfs*basisRatio;p.projected_total_pensions_2030=projV+projR;p.projected_total_assets_2030=a.house_cash_2030+projectedEtfs+projV+projR;d.synced_fire_at=fire.updated_at;
}


function rBridgeFirstPensionYear(d,accessAge){
 const start=d.assumptions.retirement_start_year,end=(d.forever_fire&&d.forever_fire.end_year)||2100;
 for(let year=start;year<=end;year++){
   if(rAge(d.people.Victor.birth_date,year)>=accessAge||rAge(d.people.Rosely.birth_date,year)>=accessAge)return year;
 }
 return end;
}
function rBridgeScenario(d,accessAge){
 const a=d.assumptions,t=d.tax_rules,p=d.projection_inputs,cfg=d.bridge_to_pension||{};
 const firstPensionYear=rBridgeFirstPensionYear(d,accessAge),bridgeYears=Math.max(0,firstPensionYear-a.retirement_start_year);
 let cash=a.house_cash_2030,etf=p.projected_etfs_2030,costBasis=p.projected_etf_cost_basis_2030;
 const accessibleStart=cash+etf;
 let lifestyleGap=0,etfTax=0,shortfall=0,lastFundedYear=a.retirement_start_year-1;
 for(let year=a.retirement_start_year;year<firstPensionYear;year++){
   cash*=1+a.cash_return_rate;
   etf*=1+a.central_return_rate;
   const lifestyle=a.lifestyle_annual_2030*Math.pow(1+a.inflation_rate,year-a.retirement_start_year);
   const salary=(year>=a.barista_start_year&&year<=a.barista_end_year)?a.barista_income_gross_2030*Math.pow(1+a.barista_income_growth_rate,year-a.barista_start_year):0;
   const salaryCalc=rGeneralTax(salary,0,year,a,t),workNet=salary-salaryCalc.tax-salaryCalc.ss;
   let need=Math.max(0,lifestyle-workNet);
   lifestyleGap+=need;
   const cashUsed=Math.min(cash,need);cash-=cashUsed;need-=cashUsed;
   if(need>0){
     const er=rSellEtfForNet(etf,costBasis,need,year,a,t);
     etf=Math.max(0,etf-er.sale);costBasis=er.costBasis;etfTax+=er.tax;
     need=Math.max(0,need-(er.sale-er.tax));
   }
   lastFundedYear=year;
   if(need>1){shortfall=need;break}
 }
 const remainingAccessible=Math.max(0,cash+etf);
 const drawBase=(d.forever_fire&&d.forever_fire.portfolio_withdrawal_real_2030)||30000;
 const bufferYears=cfg.safety_buffer_years||2;
 const safetyBuffer=drawBase*Math.pow(1+a.inflation_rate,Math.max(0,firstPensionYear-a.retirement_start_year))*bufferYears;
 const status=shortfall>1?'red':remainingAccessible>=safetyBuffer?'green':'amber';
 const statusLabel=status==='green'?'🟢 BRIDGE READY':status==='amber'?'🟡 THIN BUFFER':'🔴 BRIDGE GAP';
 return {accessAge,firstPensionYear,bridgeYears,accessibleStart,lifestyleGap,etfTax,remainingAccessible,safetyBuffer,status,statusLabel,shortfall,lastFundedYear};
}
function rRenderBridgeTable(d){
 const cfg=d.bridge_to_pension||{scenarios:d.assumptions.pension_access_age_scenarios};
 const tb=document.querySelector('#rBridgeTable');tb.innerHTML='';
 (cfg.scenarios||[50,55,60]).forEach(age=>{
   const s=rBridgeScenario(d,age),tr=document.createElement('tr');
   const pill=s.status==='green'?'🟢 Ready':s.status==='amber'?'🟡 Thin':'🔴 Gap';
   tr.innerHTML='<td>'+age+'</td><td>'+s.firstPensionYear+'</td><td>'+s.bridgeYears+' anos</td><td>'+fmt(s.lifestyleGap)+'</td><td>'+fmt(s.etfTax)+'</td><td>'+fmt(s.remainingAccessible)+'</td><td><span class="pill" style="color:'+(s.status==='green'?'var(--green)':s.status==='amber'?'var(--amber)':'var(--red)')+'">'+pill+'</span></td>';
   tb.appendChild(tr);
 });
}

function rGrossForNet(targetNet,year,a,t){
 let lo=0,hi=Math.max(targetNet*2,50000);
 const net=g=>{const x=rGeneralTax(g,0,year,a,t);return g-x.tax-x.ss};
 while(net(hi)<targetNet&&hi<1000000)hi*=1.5;
 for(let i=0;i<45;i++){const m=(lo+hi)/2;if(net(m)<targetNet)lo=m;else hi=m}
 return hi;
}
function rGuardrailStatus(rate,g){
 if(rate<=g.green_max_withdrawal_rate)return {label:'🟢 Green',action:'Mantenha €30k reais como teto de planejamento e reavalie anualmente.'};
 if(rate<=g.watch_max_withdrawal_rate)return {label:'🟡 Watch',action:'Congele o aumento pela inflação e evite elevar gastos discricionários até voltar a 2.5% ou menos.'};
 return {label:'🔴 Protect principal',action:'Reduza o draw discricionário e/ou aumente renda externa até o portfolio draw voltar para 3% ou menos.'};
}
function rForeverScenario(d,rate){
 const a=d.assumptions,p=d.projection_inputs,f=d.forever_fire;
 let cash=Math.min(a.house_cash_2030,f.portfolio_withdrawal_real_2030*f.cash_strategy.reserve_years),invested=p.projected_total_assets_2030-cash,rows=[];
 for(let year=a.retirement_start_year;year<=f.end_year;year++){
  const i=year-a.retirement_start_year;cash*=1+a.cash_return_rate;invested*=1+rate;
  const w=f.portfolio_withdrawal_real_2030*Math.pow(1+a.inflation_rate,i),c=Math.min(cash,w);cash-=c;
  const rem=w-c,use=Math.min(invested,rem);invested-=use;
  const shortfall=Math.max(0,rem-use),real=(cash+invested)/Math.pow(1+a.inflation_rate,i);
  rows.push({year,real:Math.max(0,real),shortfall});
  if(shortfall>1){for(let y=year+1;y<=f.end_year;y++)rows.push({year:y,real:0,shortfall:1});break}
 }
 return {rate,rows};
}
function rMulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function rNormal(rand){let u=0,v=0;while(!u)u=rand();while(!v)v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function rPct(a,p){const x=(a.length-1)*p,i=Math.floor(x),r=x-i;return a[i+1]!==undefined?a[i]+r*(a[i+1]-a[i]):a[i]}
function rMonteCarlo(d,mode){
 const a=d.assumptions,p=d.projection_inputs,f=d.forever_fire,m=f.monte_carlo,rand=rMulberry32(m.seed),ends=[];let okN=0;
 const startCash=mode==='all_cash'?a.house_cash_2030:Math.min(a.house_cash_2030,f.portfolio_withdrawal_real_2030*f.cash_strategy.reserve_years);
 for(let s=0;s<m.simulations;s++){
  let cash=startCash,invested=p.projected_total_assets_2030-startCash,ok=true;
  for(let year=a.retirement_start_year;year<=f.end_year;year++){
   const i=year-a.retirement_start_year;cash*=1+a.cash_return_rate;
   invested*=1+Math.max(m.return_floor,m.expected_nominal_return+m.annual_volatility*rNormal(rand));
   const w=f.portfolio_withdrawal_real_2030*Math.pow(1+a.inflation_rate,i),c=Math.min(cash,w);cash-=c;
   const rem=w-c;if(invested<rem){ok=false;invested=0;break}invested-=rem;
  }
  if(ok)okN++;
  ends.push(Math.max(0,(cash+invested)/Math.pow(1+a.inflation_rate,f.end_year-a.retirement_start_year)));
 }
 ends.sort((x,y)=>x-y);
 return {successRate:okN/m.simulations,medianRealEnd:rPct(ends,.5),p10:rPct(ends,.1),p90:rPct(ends,.9)};
}
function rDrawForever(sc,d){
 const svg=document.querySelector('#rForeverChart'),W=900,H=300,p={l:58,r:16,t:18,b:38},start=d.projection_inputs.projected_total_assets_2030;
 const years=sc[0].rows.map(x=>x.year),mx=Math.max(start,...sc.flatMap(s=>s.rows.map(x=>x.real)))*1.06;
 const x=i=>p.l+i*(W-p.l-p.r)/(years.length-1),y=v=>p.t+(mx-v)*(H-p.t-p.b)/mx,colors=['#f4c95d','#7c9cff','#35d07f'];let out='';
 for(let i=0;i<5;i++){const yy=p.t+i*(H-p.t-p.b)/4,val=mx-i*mx/4;out+='<line x1="'+p.l+'" y1="'+yy+'" x2="'+(W-p.r)+'" y2="'+yy+'" stroke="#202944"/><text x="3" y="'+(yy+4)+'" fill="#9aa4bc" font-size="10">'+Math.round(val/1000)+'k</text>'}
 out+='<line x1="'+p.l+'" y1="'+y(start)+'" x2="'+(W-p.r)+'" y2="'+y(start)+'" stroke="#f5f7fb" stroke-width="1.5" stroke-dasharray="4 5"/>';
 sc.forEach((s,j)=>out+='<polyline fill="none" stroke="'+colors[j]+'" stroke-width="3" points="'+s.rows.map((r,i)=>x(i)+','+y(r.real)).join(' ')+'"/>');
 [2030,2040,2050,2060,2070,2080,2090,2100].forEach(yr=>{const i=years.indexOf(yr);if(i>=0)out+='<text x="'+(x(i)-13)+'" y="'+(H-10)+'" fill="#9aa4bc" font-size="10">'+yr+'</text>'});
 svg.innerHTML=out;
}

function rEuro(v){
 return '€'+Math.round(v||0).toLocaleString('en-IE');
}
function rAge(birthDate,year){
 return year-Number(String(birthDate).slice(0,4));
}
function rInflationFactor(a,year){
 return Math.pow(1+a.inflation_rate,Math.max(0,year-a.retirement_start_year));
}
function rIndexedBrackets(brackets,factor){
 return brackets.map(b=>({cap:b.cap>900000000?b.cap:b.cap*factor,rate:b.rate}));
}
function rProgressiveTax(amount,brackets){
 let tax=0,prev=0;
 for(const b of brackets){
   const taxable=Math.max(0,Math.min(amount,b.cap)-prev);
   tax+=taxable*b.rate;
   if(amount<=b.cap)break;
   prev=b.cap;
 }
 return tax;
}
function rGeneralTax(salary,pension,year,a,t){
 const f=a.tax_brackets_indexed_with_inflation_from_2030?rInflationFactor(a,year):1;
 const ss=salary*t.employee_social_security_rate;
 const workIncome=salary+pension;
 const deduction=workIncome>0?t.general_work_expense_deduction*f:0;
 const base=Math.max(0,workIncome-ss-deduction);
 const sb=rIndexedBrackets(t.state_general_brackets,f),vb=rIndexedBrackets(t.valencia_general_brackets,f);
 const stateMin=t.state_personal_minimum*f,valMin=t.valencia_personal_minimum*f;
 const state=Math.max(0,rProgressiveTax(base,sb)-rProgressiveTax(Math.min(base,stateMin),sb));
 const regional=Math.max(0,rProgressiveTax(base,vb)-rProgressiveTax(Math.min(base,valMin),vb));
 return {tax:state+regional,ss,base};
}
function rSavingsTax(gain,year,a,t){
 const f=a.tax_brackets_indexed_with_inflation_from_2030?rInflationFactor(a,year):1;
 return rProgressiveTax(Math.max(0,gain),rIndexedBrackets(t.savings_brackets,f));
}
function rSellEtfForNet(etf,costBasis,netNeed,year,a,t){
 if(netNeed<=0||etf<=0)return {sale:0,gain:0,tax:0,costBasis};
 const gainRatio=Math.max(0,Math.min(1,(etf-costBasis)/etf));
 const calc=sale=>{
   const gain=sale*gainRatio,tax=rSavingsTax(gain,year,a,t);
   return {net:sale-tax,gain,tax};
 };
 const maxCalc=calc(etf);
 if(maxCalc.net<=netNeed){
   return {sale:etf,gain:maxCalc.gain,tax:maxCalc.tax,costBasis:0};
 }
 let lo=0,hi=etf;
 for(let i=0;i<45;i++){
   const mid=(lo+hi)/2;
   if(calc(mid).net<netNeed)lo=mid;else hi=mid;
 }
 const c=calc(hi),principal=hi-c.gain;
 return {sale:hi,gain:c.gain,tax:c.tax,costBasis:Math.max(0,costBasis-principal)};
}
function rPensionForNet(vPot,rPot,roselySalary,netNeed,year,accessAge,d){
 const a=d.assumptions,t=d.tax_rules;
 if(netNeed<=0)return {gross:0,victor:0,rosely:0,tax:0};
 const eligible=[];
 if(rAge(d.people.Victor.birth_date,year)>=accessAge&&vPot>0)eligible.push({who:'Victor',pot:vPot});
 if(rAge(d.people.Rosely.birth_date,year)>=accessAge&&rPot>0)eligible.push({who:'Rosely',pot:rPot});
 const totalPot=eligible.reduce((s,x)=>s+x.pot,0);
 if(totalPot<=0)return {gross:0,victor:0,rosely:0,tax:0};
 const calc=gross=>{
   gross=Math.min(gross,totalPot);
   let victor=0,rosely=0;
   eligible.forEach(x=>{
     const w=gross*x.pot/totalPot;
     if(x.who==='Victor')victor=w;else rosely=w;
   });
   const baseR=rGeneralTax(roselySalary,0,year,a,t).tax;
   const withR=rGeneralTax(roselySalary,rosely,year,a,t).tax;
   const baseV=rGeneralTax(0,0,year,a,t).tax;
   const withV=rGeneralTax(0,victor,year,a,t).tax;
   const tax=(withR-baseR)+(withV-baseV);
   return {net:gross-tax,gross,victor,rosely,tax};
 };
 const all=calc(totalPot);
 if(all.net<=netNeed)return all;
 let lo=0,hi=totalPot;
 for(let i=0;i<45;i++){
   const mid=(lo+hi)/2;
   if(calc(mid).net<netNeed)lo=mid;else hi=mid;
 }
 return calc(hi);
}
function rAgeAtStartOfYear(birthDate,year){
 const parts=String(birthDate).split('-').map(Number),by=parts[0],bm=parts[1]||1,bd=parts[2]||1;
 return year-by-((bm===1&&bd===1)?0:1);
}
function rArfRate(d,birthDate,year,pot,accessAge){
 const rules=d.pension_rules||{};
 if(!rules.assume_arf_after_access)return 0;
 if(rAge(d.people.Victor.birth_date,year)<0)return 0;
 if(rAge(birthDate,year)<accessAge)return 0;
 const ageStart=rAgeAtStartOfYear(birthDate,year),startAge=rules.imputed_distribution_start_age||60;
 if(ageStart<startAge)return 0;
 if(pot>(rules.high_value_threshold||2000000))return rules.high_value_rate||.06;
 if(ageStart>=70)return rules.imputed_rate_70_plus||.05;
 return rules.imputed_rate_under_70||.04;
}
function rPensionTaxForGross(vGross,rGross,roselySalary,year,d){
 const a=d.assumptions,t=d.tax_rules,baseR=rGeneralTax(roselySalary,0,year,a,t).tax,withR=rGeneralTax(roselySalary,rGross,year,a,t).tax,baseV=rGeneralTax(0,0,year,a,t).tax,withV=rGeneralTax(0,vGross,year,a,t).tax;
 return (withR-baseR)+(withV-baseV);
}
function rSimulateEngine(d,accessAge,returnProvider,endYear){
 const a=d.assumptions,t=d.tax_rules,p=d.projection_inputs;
 let cash=a.house_cash_2030,etf=p.projected_etfs_2030,costBasis=p.projected_etf_cost_basis_2030;
 let victorP=d.people.Victor.projected_pension_2030,roselyP=d.people.Rosely.projected_pension_2030;
 const rows=[];let salaryTax=0,pensionTax=0,etfTax=0,totalSS=0,firstShortfallYear=null,cashEndYear=null,etfStartYear=null,pensionStartYear=null,totalArfGross=0,totalArfReinvested=0;
 for(let year=a.retirement_start_year;year<=endYear;year++){
   const startCash=cash,startEtf=etf,startVictorP=victorP,startRoselyP=roselyP;
   const returnRate=Math.max(-.95,typeof returnProvider==='function'?returnProvider(year):returnProvider);
   cash*=1+a.cash_return_rate;etf*=1+returnRate;victorP*=1+returnRate;roselyP*=1+returnRate;
   const arfBaseVictor=victorP,arfBaseRosely=roselyP;
   const lifestyle=a.lifestyle_annual_2030*Math.pow(1+a.inflation_rate,year-a.retirement_start_year);
   const salary=(year>=a.barista_start_year&&year<=a.barista_end_year)?a.barista_income_gross_2030*Math.pow(1+a.barista_income_growth_rate,year-a.barista_start_year):0;
   const salaryCalc=rGeneralTax(salary,0,year,a,t),workNet=salary-salaryCalc.tax-salaryCalc.ss;salaryTax+=salaryCalc.tax;totalSS+=salaryCalc.ss;
   let need=Math.max(0,lifestyle-workNet);
   const cashUsed=Math.min(cash,need);cash-=cashUsed;need-=cashUsed;if(!cashEndYear&&cash<=.5)cashEndYear=year;

   let pensionGross=0,pensionTaxYear=0,victorWithdraw=0,roselyWithdraw=0,arfFloorGross=0,arfReinvestedNet=0;
   if(need>0){
     const pr=rPensionForNet(victorP,roselyP,salary,need,year,accessAge,d);
     pensionGross=pr.gross;victorWithdraw=pr.victor;roselyWithdraw=pr.rosely;pensionTaxYear=pr.tax;
     if(pensionGross>0&&!pensionStartYear)pensionStartYear=year;
     victorP=Math.max(0,victorP-victorWithdraw);roselyP=Math.max(0,roselyP-roselyWithdraw);
     need=Math.max(0,need-(pensionGross-pensionTaxYear));
   }

   const floorV=arfBaseVictor*rArfRate(d,d.people.Victor.birth_date,year,arfBaseVictor,accessAge),floorR=arfBaseRosely*rArfRate(d,d.people.Rosely.birth_date,year,arfBaseRosely,accessAge);
   const extraV=Math.min(victorP,Math.max(0,floorV-victorWithdraw)),extraR=Math.min(roselyP,Math.max(0,floorR-roselyWithdraw)),extraGross=extraV+extraR;
   if(extraGross>0){
     const newV=victorWithdraw+extraV,newR=roselyWithdraw+extraR,newTax=rPensionTaxForGross(newV,newR,salary,year,d),extraTax=Math.max(0,newTax-pensionTaxYear);
     victorP=Math.max(0,victorP-extraV);roselyP=Math.max(0,roselyP-extraR);victorWithdraw=newV;roselyWithdraw=newR;pensionGross+=extraGross;pensionTaxYear=newTax;arfFloorGross=extraGross;
     let extraNet=Math.max(0,extraGross-extraTax),useForNeed=Math.min(need,extraNet);need-=useForNeed;extraNet-=useForNeed;
     if(extraNet>0){etf+=extraNet;costBasis+=extraNet;arfReinvestedNet=extraNet}
     totalArfGross+=extraGross;totalArfReinvested+=arfReinvestedNet;
     if(pensionGross>0&&!pensionStartYear)pensionStartYear=year;
   }
   pensionTax+=pensionTaxYear;

   let etfSale=0,etfGain=0,etfTaxYear=0;
   if(need>0){
     const er=rSellEtfForNet(etf,costBasis,need,year,a,t);etfSale=er.sale;etfGain=er.gain;etfTaxYear=er.tax;costBasis=er.costBasis;etf=Math.max(0,etf-etfSale);etfTax+=etfTaxYear;
     if(etfSale>0&&!etfStartYear)etfStartYear=year;need=Math.max(0,need-(etfSale-etfTaxYear));
   }
   const totalTaxYear=salaryCalc.tax+pensionTaxYear+etfTaxYear,pensionEnd=victorP+roselyP,netWorth=cash+etf+pensionEnd;
   rows.push({year,ageVictor:rAge(d.people.Victor.birth_date,year),ageRosely:rAge(d.people.Rosely.birth_date,year),returnRate,lifestyle,salaryGross:salary,workNet,cashUsed,etfSale,etfGain,pensionGross,victorWithdraw,roselyWithdraw,arfFloorGross,arfReinvestedNet,salaryTax:salaryCalc.tax,pensionTax:pensionTaxYear,etfTax:etfTaxYear,tax:totalTaxYear,ss:salaryCalc.ss,startCash,startEtf,startPension:startVictorP+startRoselyP,cash,etf,costBasis,victorP,roselyP,pension:pensionEnd,netWorth,shortfall:need});
   if(need>1){firstShortfallYear=year;break}
 }
 return {accessAge,rows,firstShortfallYear,cashEndYear,etfStartYear,pensionStartYear,salaryTax,pensionTax,etfTax,totalTax:salaryTax+pensionTax+etfTax,totalSS,totalArfGross,totalArfReinvested};
}
function rSimulate(d,accessAge,returnRate){
 const x=rSimulateEngine(d,accessAge,()=>returnRate,d.assumptions.projection_end_year);x.returnRate=returnRate;return x;
}
function rFullPlanMonteCarlo(d,accessAge){
 const m=d.full_plan_monte_carlo||{},sims=m.simulations||1500,rand=rMulberry32((m.seed||20261009)+accessAge*101),ends=[],failYears=[];let success=0;
 for(let s=0;s<sims;s++){
   const sim=rSimulateEngine(d,accessAge,()=>Math.max(-.95,(m.expected_nominal_return||.05)+(m.annual_volatility||.12)*rNormal(rand)),m.end_year||2100);
   const ok=!sim.firstShortfallYear;if(ok)success++;else failYears.push(sim.firstShortfallYear);
   const last=sim.rows[sim.rows.length-1],years=Math.max(0,(last?last.year:d.assumptions.retirement_start_year)-d.assumptions.retirement_start_year),real=ok&&last?last.netWorth/Math.pow(1+d.assumptions.inflation_rate,years):0;
   ends.push(Math.max(0,real));
 }
 ends.sort((a,b)=>a-b);failYears.sort((a,b)=>a-b);
 return {accessAge,successRate:success/sims,p10RealEnd:rPct(ends,.1),medianRealEnd:rPct(ends,.5),p90RealEnd:rPct(ends,.9),medianFailureYear:failYears.length?Math.round(rPct(failYears,.5)):null,simulations:sims};
}
function rRenderFullMcTable(d){
 const tb=document.querySelector('#rFullMcTable');tb.innerHTML='';const out={};
 (d.full_plan_monte_carlo.access_age_scenarios||d.assumptions.pension_access_age_scenarios).forEach(age=>{
   const s=rFullPlanMonteCarlo(d,age);out[age]=s;const tr=document.createElement('tr');
   tr.innerHTML='<td>'+age+'</td><td>'+Math.round(s.successRate*100)+'%</td><td>'+fmt(s.p10RealEnd)+'</td><td>'+fmt(s.medianRealEnd)+'</td><td>'+fmt(s.p90RealEnd)+'</td><td>'+(s.medianFailureYear||'—')+'</td>';tb.appendChild(tr);
 });
 return out;
}
function rRenderExecutiveSummary(d,fire,bridge,fullMc){
 const start=new Date(fire.updated_at),rate=(fire.projection&&fire.projection.plan_rate_annual)||.075,bonusMonth=(fire.scenario_lab&&fire.scenario_lab.bonus_month)||3,fireDate=estimateFireDate(fire.core_fire,fire.contribution_plan.total_monthly,rate,0,fire.final_target,start,bonusMonth);
 document.querySelector('#rExecFireDate').textContent=fireDate?formatMonthYear(fireDate.date):'—';
 document.querySelector('#rExecBridge').textContent=bridge.statusLabel.replace(/^[^ ]+ /,'');
 document.querySelector('#rExecBridge').style.color=bridge.status==='green'?'var(--green)':bridge.status==='amber'?'var(--amber)':'var(--red)';
 document.querySelector('#rExecBridgeCaption').textContent='Access '+d.assumptions.default_pension_access_age+' • '+bridge.bridgeYears+' year bridge';
 document.querySelector('#rExecMc').textContent=Math.round(fullMc.successRate*100)+'%';
 document.querySelector('#rExecAccessible').textContent=fmt(bridge.accessibleStart);
 const ok=bridge.status==='green'&&fullMc.successRate>=.8,status=ok?'green':(bridge.status==='red'||fullMc.successRate<.6)?'red':'amber';
 document.querySelector('#rExecStatus').textContent=status==='green'?'🟢 PLAN ROBUST':status==='amber'?'🟡 PLAN WATCH':'🔴 PLAN FRAGILE';
 document.querySelector('#rExecStatus').style.color=status==='green'?'var(--green)':status==='amber'?'var(--amber)':'var(--red)';
}
function rSetupRetirementDetails(){
 const panel=document.querySelector('#retirementPanel'),summary=document.querySelector('#rExecSummary'),btn=document.querySelector('#rToggleDetails');if(!panel||!summary||!btn||btn.dataset.ready)return;
 const children=[...panel.children],idx=children.indexOf(summary),details=children.slice(idx+1);details.forEach(el=>el.classList.add('retirement-detail'));
 let collapsed=window.matchMedia&&window.matchMedia('(max-width: 760px)').matches;
 const apply=()=>{details.forEach(el=>el.classList.toggle('is-collapsed',collapsed));btn.textContent=collapsed?'Show detailed analysis':'Hide detailed analysis'};
 apply();btn.addEventListener('click',()=>{collapsed=!collapsed;apply()});btn.dataset.ready='1';
}
function rRunSelfTests(d){
 let passed=0,total=5;
 try{if(rArfRate(d,d.people.Victor.birth_date,2030,500000,55)===0)passed++}catch(e){}
 try{let y=2030;while(rAgeAtStartOfYear(d.people.Victor.birth_date,y)<60)y++;if(Math.abs(rArfRate(d,d.people.Victor.birth_date,y,500000,55)-((d.pension_rules&&d.pension_rules.imputed_rate_under_70)||.04))<1e-9)passed++}catch(e){}
 try{let y=2030;while(rAgeAtStartOfYear(d.people.Victor.birth_date,y)<70)y++;if(Math.abs(rArfRate(d,d.people.Victor.birth_date,y,500000,55)-((d.pension_rules&&d.pension_rules.imputed_rate_70_plus)||.05))<1e-9)passed++}catch(e){}
 try{let y=2030;while(rAgeAtStartOfYear(d.people.Victor.birth_date,y)<60)y++;if(Math.abs(rArfRate(d,d.people.Victor.birth_date,y,2500000,55)-((d.pension_rules&&d.pension_rules.high_value_rate)||.06))<1e-9)passed++}catch(e){}
 try{const b=rBridgeScenario(d,d.assumptions.default_pension_access_age);if(Math.abs(b.accessibleStart-(d.assumptions.house_cash_2030+d.projection_inputs.projected_etfs_2030))<1)passed++}catch(e){}
 return {passed,total};
}
function rAssetAt(sim,year){
 const row=sim.rows.find(r=>r.year===year);
 return row?fmt(row.netWorth):'—';
}
function rDrawBuckets(rows,a){
 const svg=document.querySelector('#rBucketChart'),W=900,H=300,p={l:55,r:16,t:18,b:38};
 if(!rows.length){svg.innerHTML='';return}
 const max=Math.max(...rows.map(r=>r.netWorth))*1.06;
 const x=i=>p.l+(rows.length===1?0:i*(W-p.l-p.r)/(rows.length-1));
 const y=v=>p.t+(max-v)*(H-p.t-p.b)/max;
 let out='';
 for(let i=0;i<5;i++){
   const yy=p.t+i*(H-p.t-p.b)/4,val=max-i*max/4;
   out+='<line x1="'+p.l+'" y1="'+yy+'" x2="'+(W-p.r)+'" y2="'+yy+'" stroke="#202944"/><text x="3" y="'+(yy+4)+'" fill="#9aa4bc" font-size="10">'+Math.round(val/1000)+'k</text>';
 }
 const polygon=(topFn,bottomFn,fill)=>{
   const top=rows.map((r,i)=>x(i)+','+y(topFn(r))).join(' ');
   const bottom=[...rows].reverse().map((r,rev)=>{const i=rows.length-1-rev;return x(i)+','+y(bottomFn(r))}).join(' ');
   return '<polygon points="'+top+' '+bottom+'" fill="'+fill+'" fill-opacity=".55"/>';
 };
 out+=polygon(r=>r.cash,r=>0,'#7c9cff');
 out+=polygon(r=>r.cash+r.etf,r=>r.cash,'#b99cff');
 out+=polygon(r=>r.netWorth,r=>r.cash+r.etf,'#35d07f');
 out+='<polyline fill="none" stroke="#f5f7fb" stroke-width="2.5" points="'+rows.map((r,i)=>x(i)+','+y(r.netWorth)).join(' ')+'"/>';
 const step=Math.max(1,Math.floor(rows.length/6));
 rows.forEach((r,i)=>{if(i%step===0||i===rows.length-1)out+='<text x="'+(x(i)-14)+'" y="'+(H-10)+'" fill="#9aa4bc" font-size="10">'+r.year+'</text>'});
 svg.innerHTML=out;
}
function rRenderScenarioTable(d){
 const tb=document.querySelector('#rScenarioTable');tb.innerHTML='';
 d.assumptions.pension_access_age_scenarios.forEach(age=>{
   const s=rSimulate(d,age,d.assumptions.central_return_rate),tr=document.createElement('tr');
   tr.innerHTML='<td>'+age+'</td><td>'+(s.pensionStartYear||'—')+'</td><td>'+(s.firstShortfallYear||('>'+d.assumptions.projection_end_year))+'</td><td>'+fmt(s.totalTax)+'</td><td>'+rAssetAt(s,2042)+'</td><td>'+rAssetAt(s,2047)+'</td>';
   tb.appendChild(tr);
 });
}
function rRenderSensitivityTable(d){
 const tb=document.querySelector('#rSensitivityTable');tb.innerHTML='';
 d.assumptions.scenario_rates.forEach(rate=>{
   const s=rSimulate(d,d.assumptions.default_pension_access_age,rate),tr=document.createElement('tr');
   tr.innerHTML='<td>'+(rate*100).toFixed(0)+'%</td><td>'+(s.firstShortfallYear||('>'+d.assumptions.projection_end_year))+'</td><td>'+rAssetAt(s,2042)+'</td><td>'+rAssetAt(s,2047)+'</td><td>'+fmt(s.totalTax)+'</td>';
   tb.appendChild(tr);
 });
}
function rRenderRetirementYears(rows,d){
 const tb=document.querySelector('#rYearTable'),actualMap=new Map((d.actuals||[]).map(x=>[x.year,x]));
 tb.innerHTML='';
 rows.forEach(r=>{
   const tr=document.createElement('tr'),actual=actualMap.get(r.year);
   const lifestyle=actual&&actual.spend!=null?actual.spend:r.lifestyle;
   const endNet=actual&&actual.end_pot!=null?actual.end_pot:r.netWorth;
   tr.innerHTML='<td>'+r.year+'</td><td>'+r.ageVictor+'/'+r.ageRosely+'</td><td>'+rEuro(lifestyle)+'</td><td>'+rEuro(r.workNet)+'</td><td>'+rEuro(r.cashUsed)+'</td><td>'+rEuro(r.etfSale)+'</td><td>'+rEuro(r.etfGain)+'</td><td>'+rEuro(r.pensionGross)+'</td><td>'+rEuro(r.tax)+'</td><td>'+rEuro(r.cash)+'</td><td>'+rEuro(r.etf)+'</td><td>'+rEuro(r.pension)+'</td><td>'+rEuro(endNet)+(r.shortfall>1?' ⚠️':'')+'</td>';
   tb.appendChild(tr);
 });
}
