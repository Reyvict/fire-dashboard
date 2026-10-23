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
 const cp=d.contribution_plan||{},pb=cp.pension_breakdown||{};
 document.querySelector('#contributionSummary').textContent='Aportes forward: '+fmt(cp.etfs_monthly||0)+'/m ETFs + '+fmt(cp.pension_monthly||0)+'/m pensões'+(pb.Rosely!=null&&pb.Victor!=null?' ('+fmt(pb.Rosely)+' Rosely + '+fmt(pb.Victor)+' Victor)':'')+' = '+fmt(cp.total_monthly||0)+'/m.';
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

function initRetirement(){
 if(window.__retirementInitStarted)return;
 window.__retirementInitStarted=true;
 document.querySelectorAll('#rLifestyleLab button, #rLifestyleLab input').forEach(el=>el.disabled=true);
 rCalculationStatus('Loading retirement projections…');
 const loading=document.querySelector('#rUpdated');if(loading)loading.textContent='Loading retirement decision model…';
 Promise.all([fetch('retirement-data.json?ts='+Date.now()).then(r=>r.json()),fetch('data.json?ts='+Date.now()).then(r=>r.json())]).then(async ([d,fire])=>{
 rSyncRetirementFromFire(d,fire);
 const a=d.assumptions,t=d.tax_rules,p=d.projection_inputs;
 const defaultSim=rSimulate(d,a.default_pension_access_age,a.central_return_rate);
 const pensionStart=p.projected_total_pensions_2030;
 const salaryOnly=rGeneralTax(a.barista_income_gross_2030,0,a.retirement_start_year,a,t);
 const baristaNet=a.barista_income_gross_2030-salaryOnly.tax-salaryOnly.ss;

 document.querySelector('#rUpdated').textContent='V'+(d.dashboard_version||'2.3')+' • Modelo '+new Date(d.updated_at).toLocaleDateString('pt-BR')+' • saldos sincronizados do FIRE em '+new Date(d.synced_fire_at).toLocaleDateString('pt-BR')+' • Forever FIRE até '+((d.forever_fire&&d.forever_fire.end_year)||2100);
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
 const sp=d.state_pension||{},spHouse=(sp.max_annual_rate_2026||0)*2;
 document.querySelector('#rStatePensionVerified').textContent='Verified '+(sp.last_verified||'—');
 document.querySelector('#rStatePensionAge').textContent=sp.pension_age||66;
 document.querySelector('#rStatePensionWeekly').textContent=rEuro(sp.max_weekly_rate_2026||0)+'/wk';
 document.querySelector('#rStatePensionHousehold').textContent=rEuro(spHouse)+'/yr';
 document.querySelector('#rStatePensionBaseline').textContent=sp.baseline_included?'Included':'Excluded';
 rRenderStatePensionTable(d);
 document.querySelector('#rStatePensionInsight').innerHTML='<strong>Planning use:</strong> 0% mantém o baseline. 50% e 100% são sensitivity cases, não entitlement estimates. O modelo infla a taxa de 2026 em '+(a.inflation_rate*100).toFixed(0)+'%/ano e tributa a renda no proxy espanhol.';
 rDrawBuckets(defaultSim.rows,a);
 rRenderScenarioTable(d);
 rRenderSensitivityTable(d);
 rRenderRetirementYears(defaultSim.rows,d);
 rRenderActualVsPlan(defaultSim.rows,d);
 const fullMcByAge=await rRenderFullMcTable(d),fullDefault=fullMcByAge[a.default_pension_access_age];
 document.querySelector('#rFullMcDefault').textContent=(fullDefault.successRate*100).toFixed(0)+'%';
 document.querySelector('#rFullMcP10').textContent=fmt(fullDefault.p10RealEnd);document.querySelector('#rFullMcMedian').textContent=fmt(fullDefault.medianRealEnd);document.querySelector('#rFullMcP90').textContent=fmt(fullDefault.p90RealEnd);
 document.querySelector('#rFullMcCaption').textContent=fullDefault.simulations.toLocaleString('en-IE')+' simulations por cenário • shared decision engine'+' • até '+d.full_plan_monte_carlo.end_year;
 const fStatus=fullDefault.successRate>=.8?'green':fullDefault.successRate>=.6?'amber':'red';
 document.querySelector('#rFullMcStatus').textContent=fStatus==='green'?'🟢 ROBUST':fStatus==='amber'?'🟡 WATCH':'🔴 FRAGILE';
 document.querySelector('#rFullMcStatus').style.color=fStatus==='green'?'var(--green)':fStatus==='amber'?'var(--amber)':'var(--red)';
 document.querySelector('#rFullMcInsight').innerHTML='<strong>Leitura:</strong> este é o Monte Carlo mais completo do Hub. Diferente do Forever FIRE simplificado, ele respeita os buckets, acesso às pensões, proxy fiscal espanhol e o piso ARF configurado.';
 rRenderExecutiveSummary(d,fire,bridgeDefault,fullDefault);
 await rSetupLifestyleLab(d,fullDefault);await rRenderDecisionAudit(d,fire,defaultSim,fullDefault);
 rSetupRetirementDetails();
 const rTests=await rRunSelfTests(d,fire);if(rTests.passed<rTests.total)console.warn('Retirement self-tests',rTests);
 const foreverWR=ff.portfolio_withdrawal_real_2030/total2030,requiredNominal=a.inflation_rate+foreverWR;
 const grossNeeded=rGrossForNet(ff.outside_income_net_target_2030,a.retirement_start_year,a,t);
 const incomeGap=Math.max(0,ff.outside_income_net_target_2030-baristaNet);
 const bucketCfg=window.FireRetirementEngine.bucketConfig(d),reserve=Math.min(a.house_cash_2030,(bucketCfg.pot1||0)+(bucketCfg.pot2||0));
 const mcReserve=await rMonteCarlo(d,'reserve'),mcAll=await rMonteCarlo(d,'all_cash'),guard=rGuardrailStatus(foreverWR,ff.guardrails);
 document.querySelector('#rForeverDraw').textContent=rEuro(ff.portfolio_withdrawal_real_2030)+'/ano';
 document.querySelector('#rOutsideIncome').textContent=rEuro(ff.outside_income_net_target_2030)+'/ano';
 document.querySelector('#rGrossNeeded').textContent='≈ '+rEuro(grossNeeded)+'/ano';
 document.querySelector('#rIncomeGap').textContent='≈ '+rEuro(incomeGap)+'/ano';
 document.querySelector('#rForeverWR').textContent=(foreverWR*100).toFixed(2)+'%';
 document.querySelector('#rForeverRequiredReturn').textContent='≈ '+(requiredNominal*100).toFixed(2)+'% p.a.';
 document.querySelector('#rMcSuccess').textContent=(mcReserve.successRate*100).toFixed(0)+'%';
 document.querySelector('#rMcCaption').textContent=ff.monte_carlo.simulations.toLocaleString('en-IE')+' simulations'+' • median real 2100 '+fmt(mcReserve.medianRealEnd);
 const statusOk=a.central_return_rate>=requiredNominal;
 document.querySelector('#rForeverStatus').textContent=statusOk?'🟢 Expected real-principal margin':'🟡 Central return below preservation rate';
 document.querySelector('#rForeverStatus').style.color=statusOk?'var(--green)':'var(--amber)';
 document.querySelector('#rForeverInsight').innerHTML='<strong>Leitura:</strong> '+rEuro(ff.portfolio_withdrawal_real_2030)+' começa em '+(foreverWR*100).toFixed(2)+'% do patrimônio. Preservar o principal em poder de compra exige aproximadamente '+(requiredNominal*100).toFixed(2)+'% nominal antes do drag fiscal. O cenário central atual de '+(a.central_return_rate*100).toFixed(0)+'% fica abaixo disso.';
 document.querySelector('#rGuardrailRate').textContent=(foreverWR*100).toFixed(2)+'% • '+guard.label;
 document.querySelector('#rGuardrailAction').innerHTML='<strong>'+guard.label+':</strong> '+guard.action;
 document.querySelector('#rAllCash').textContent=fmt(a.house_cash_2030)+' @ 0%';
 document.querySelector('#rCashReserve').textContent=fmt(reserve)+' • Pot 1+2';
 document.querySelector('#rInvestableRemainder').textContent=fmt(a.house_cash_2030-reserve)+' • Pot 3';
 document.querySelector('#rMcAllCash').textContent=(mcAll.successRate*100).toFixed(0)+'%';
 document.querySelector('#rMcReserve').textContent=(mcReserve.successRate*100).toFixed(0)+'%';
 rDrawForever(ff.deterministic_rates.map(rate=>rForeverScenario(d,rate)),d);

 window.__retirementReady=true;
 rCalculationStatus('Full simulations complete.');
}).catch(e=>{
 console.error(e);
 window.__retirementInitStarted=false;
 const el=document.querySelector('#rUpdated');
 if(el)el.textContent='Retirement calculation failed. Reopen this tab to retry.';
 rCalculationStatus('Calculation failed. Reopen the Retirement tab to retry.');
 });
}
const retirementBtn=document.querySelector('#retirementTabBtn');
if(retirementBtn)retirementBtn.addEventListener('click',()=>setTimeout(initRetirement,0));
if(new URLSearchParams(location.search).get('tab')==='retirement')setTimeout(initRetirement,0);



function rProjectMonthly(current,monthly,annual,months){const mr=Math.pow(1+annual,1/12)-1;let v=current;for(let i=0;i<months;i++)v=v*(1+mr)+monthly;return v}
function rSyncRetirementFromFire(d,fire){
 const eng=window.FireRetirementEngine;if(!eng)throw new Error('retirement-engine.js not loaded');
 const policy=d.opening_balance_policy||{},allowed=policy.allowed_modes||['official_plan','live_forecast'];let mode=policy.default_mode||'official_plan';
 try{const saved=localStorage.getItem('fire_retirement_opening_mode');if(saved&&allowed.includes(saved))mode=saved}catch(e){}
 const opening=eng.buildOpeningState(d,fire,mode),p=d.projection_inputs,breakdown=(fire.contribution_plan&&fire.contribution_plan.pension_breakdown)||{};
 d._engineOpening=opening;d._fireData=fire;d.assumptions.opening_balance_mode=mode;
 if(Number.isFinite(breakdown.Victor))d.people.Victor.monthly_pension_contribution=breakdown.Victor;
 if(Number.isFinite(breakdown.Rosely))d.people.Rosely.monthly_pension_contribution=breakdown.Rosely;
 d.people.Victor.projected_pension_2030=opening.pensionVictor;d.people.Rosely.projected_pension_2030=opening.pensionRosely;
 p.projected_etfs_2030=opening.etf;p.projected_etf_cost_basis_2030=opening.etfCostBasis;p.projected_total_pensions_2030=opening.totalPension;p.projected_total_assets_2030=opening.totalAssets;
 const snap=new Date(fire.updated_at);p.pension_snapshot_date=String(fire.updated_at).slice(0,10);p.months_to_retirement=Math.max(0,(2030-snap.getUTCFullYear())*12-snap.getUTCMonth());
 d.synced_fire_at=fire.updated_at;
}
function rBridgeFirstPensionYear(d,accessAge){
 const eng=window.FireRetirementEngine;
 return Math.min(eng.firstFullEligibleYear(d.people.Victor.birth_date,accessAge),eng.firstFullEligibleYear(d.people.Rosely.birth_date,accessAge));
}
function rBridgeScenario(d,accessAge){
 return window.FireRetirementEngine.bridgeScenario(d,{opening:d._engineOpening,accessAge,policy:(d.withdrawal_policies&&d.withdrawal_policies.default)||'current_waterfall'});
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
 const eng=window.FireRetirementEngine,md=eng.clone(d),f=d.forever_fire;
 md.assumptions.lifestyle_annual_2030=f.portfolio_withdrawal_real_2030;md.assumptions.barista_income_gross_2030=0;md.assumptions.barista_end_year=md.assumptions.retirement_start_year-1;
 const sim=eng.simulate(md,{opening:d._engineOpening,accessAge:d.assumptions.default_pension_access_age,endYear:f.end_year,returnProvider:()=>rate,policy:(d.withdrawal_policies&&d.withdrawal_policies.default)||'current_waterfall'});
 const rows=sim.rows.map(r=>({year:r.year,real:Math.max(0,r.netWorth/Math.pow(1+d.assumptions.inflation_rate,r.year-d.assumptions.retirement_start_year)),shortfall:r.shortfall}));
 if(sim.firstShortfallYear){for(let y=sim.firstShortfallYear+1;y<=f.end_year;y++)rows.push({year:y,real:0,shortfall:1})}
 return {rate,rows};
}
function rMulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function rNormal(rand){let u=0,v=0;while(!u)u=rand();while(!v)v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function rPct(a,p){const x=(a.length-1)*p,i=Math.floor(x),r=x-i;return a[i+1]!==undefined?a[i]+r*(a[i+1]-a[i]):a[i]}
async function rMonteCarlo(d,mode){
 const eng=window.FireRetirementEngine,md=eng.clone(d),f=d.forever_fire,m=f.monte_carlo;
 md.assumptions.lifestyle_annual_2030=f.portfolio_withdrawal_real_2030;md.assumptions.barista_income_gross_2030=0;md.assumptions.barista_end_year=md.assumptions.retirement_start_year-1;
 md.asset_class_assumptions=md.asset_class_assumptions||{};md.asset_class_assumptions.equity={...(md.asset_class_assumptions.equity||{}),return:m.expected_nominal_return||.05,vol:m.annual_volatility||.12};md.asset_class_assumptions.pension={...(md.asset_class_assumptions.pension||{}),return:m.expected_nominal_return||.05,vol:m.annual_volatility||.12};
 const policy=mode==='reserve'?'three_bucket':'current_waterfall',mc=await rWorkerCall('monteCarlo',md,{opening:d._engineOpening,policy,accessAge:d.assumptions.default_pension_access_age,simulations:m.simulations,endYear:f.end_year,seed:m.seed});
 return {successRate:mc.successRate,medianRealEnd:mc.medianRealEnd,p10:mc.p10RealEnd,p90:mc.p90RealEnd};
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
function rPensionForNet(vPot,rPot,roselySalary,netNeed,year,accessAge,d,baseVictorPension=0,baseRoselyPension=0){
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
   const baseR=rGeneralTax(roselySalary,baseRoselyPension,year,a,t).tax;
   const withR=rGeneralTax(roselySalary,baseRoselyPension+rosely,year,a,t).tax;
   const baseV=rGeneralTax(0,baseVictorPension,year,a,t).tax;
   const withV=rGeneralTax(0,baseVictorPension+victor,year,a,t).tax;
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

function rStatePensionGross(d,who,year,fraction){
 const cfg=d.state_pension||{},person=d.people&&d.people[who];if(!person||!fraction)return 0;
 const parts=String(person.birth_date).split('-').map(Number),by=parts[0],bm=parts[1]||1,age=cfg.pension_age||66,eligibleYear=by+age;
 if(year<eligibleYear)return 0;
 let yearFraction=1;if(cfg.first_year_prorated&&year===eligibleYear)yearFraction=Math.max(0,Math.min(1,(13-bm)/12));
 const ref=cfg.rate_reference_year||2026,annual=cfg.max_annual_rate_2026||((cfg.max_weekly_rate_2026||299.3)*52);
 const index=cfg.index_with_inflation?Math.pow(1+d.assumptions.inflation_rate,Math.max(0,year-ref)):1;
 return annual*index*fraction*yearFraction;
}
function rStatePensionStartYear(d,who){
 const cfg=d.state_pension||{},by=Number(String(d.people[who].birth_date).slice(0,4));return by+(cfg.pension_age||66);
}
function rRenderStatePensionTable(d){
 const cfg=d.state_pension||{},tb=document.querySelector('#rStatePensionTable');tb.innerHTML='';const a=d.assumptions,results={};
 (cfg.scenario_fractions||[0,.5,1]).forEach(frac=>{
   const sim=rSimulateEngine(d,a.default_pension_access_age,()=>a.central_return_rate,(d.full_plan_monte_carlo&&d.full_plan_monte_carlo.end_year)||2100,frac);
   const last=sim.rows[sim.rows.length-1],years=last?last.year-a.retirement_start_year:0;
   const realEnd=!sim.firstShortfallYear&&last?last.netWorth/Math.pow(1+a.inflation_rate,years):0;
   results[frac]=sim;
   const tr=document.createElement('tr');
   tr.innerHTML='<td>'+Math.round(frac*100)+'%</td><td>'+rStatePensionStartYear(d,'Victor')+'</td><td>'+rStatePensionStartYear(d,'Rosely')+'</td><td>'+(sim.firstShortfallYear||'> '+((d.full_plan_monte_carlo&&d.full_plan_monte_carlo.end_year)||2100))+'</td><td>'+fmt(realEnd)+'</td><td>'+fmt(sim.totalStatePensionGross||0)+'</td>';
   tb.appendChild(tr);
 });
 return results;
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
function rPensionTaxForGross(vGross,rGross,roselySalary,year,d,baseVictorPension=0,baseRoselyPension=0){
 const a=d.assumptions,t=d.tax_rules,baseR=rGeneralTax(roselySalary,baseRoselyPension,year,a,t).tax,withR=rGeneralTax(roselySalary,baseRoselyPension+rGross,year,a,t).tax,baseV=rGeneralTax(0,baseVictorPension,year,a,t).tax,withV=rGeneralTax(0,baseVictorPension+vGross,year,a,t).tax;
 return (withR-baseR)+(withV-baseV);
}
function rSimulateEngine(d,accessAge,returnProvider,endYear,statePensionFraction=0){
 return window.FireRetirementEngine.simulate(d,{opening:d._engineOpening,accessAge,returnProvider,endYear,statePensionFraction,policy:(d.withdrawal_policies&&d.withdrawal_policies.default)||'current_waterfall'});
}
function rSimulate(d,accessAge,returnRate){
 const x=rSimulateEngine(d,accessAge,()=>returnRate,d.assumptions.projection_end_year);x.returnRate=returnRate;return x;
}
async function rFullPlanMonteCarlo(d,accessAge,opts={}){
 const m=d.full_plan_monte_carlo||{},sims=Number.isFinite(opts.simulations)?opts.simulations:(m.simulations||1500),seedOffset=Number.isFinite(opts.seedOffset)?opts.seedOffset:0,endYear=Number.isFinite(opts.endYear)?opts.endYear:(m.end_year||2100);
 const x=await rWorkerCall('monteCarlo',d,{opening:d._engineOpening,accessAge,simulations:sims,endYear,seed:(m.seed||20261009)+seedOffset,policy:(d.withdrawal_policies&&d.withdrawal_policies.default)||'current_waterfall'});
 return {accessAge,successRate:x.successRate,p10RealEnd:x.p10RealEnd,medianRealEnd:x.medianRealEnd,p90RealEnd:x.p90RealEnd,medianFailureYear:x.medianFailureYear,simulations:x.simulations,endYear:x.endYear};
}
async function rRenderFullMcTable(d){
 const tb=document.querySelector('#rFullMcTable');tb.innerHTML='';const out={};
 for(const age of (d.full_plan_monte_carlo.access_age_scenarios||d.assumptions.pension_access_age_scenarios)){
   const s=await rFullPlanMonteCarlo(d,age);out[age]=s;const tr=document.createElement('tr');
   tr.innerHTML='<td>'+age+'</td><td>'+Math.round(s.successRate*100)+'%</td><td>'+fmt(s.p10RealEnd)+'</td><td>'+fmt(s.medianRealEnd)+'</td><td>'+fmt(s.p90RealEnd)+'</td><td>'+(s.medianFailureYear||'—')+'</td>';tb.appendChild(tr);
 }
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
function rLifestyleCopy(d,annual){
 const x=JSON.parse(JSON.stringify(d));x.assumptions.lifestyle_annual_2030=annual;return x;
}
function rAssetNumberAt(sim,year){
 const row=sim.rows.find(r=>r.year===year);return row?row.netWorth:null;
}
function rLifestyleSustainable(d){
 return rWorkerCall('maxSustainableLifestyle',d,{opening:d._engineOpening,accessAge:d.assumptions.default_pension_access_age,policy:(d.withdrawal_policies||{}).default||'current_waterfall'});
}
async function rSetupLifestyleLab(d,baselineMc){
 const root=document.querySelector('#rLifestyleLab'),cfg=d.lifestyle_spending_lab||{};if(!root||cfg.enabled===false)return;
 const baselineAnnual=cfg.baseline_annual_2030||d.assumptions.lifestyle_annual_2030,defaultAnnual=cfg.default_scenario_annual_2030||baselineAnnual,min=cfg.custom_min_annual_2030||15000,max=cfg.custom_max_annual_2030||90000,step=cfg.custom_step_annual_2030||1000,accessAge=d.assumptions.default_pension_access_age,endYear=(d.full_plan_monte_carlo&&d.full_plan_monte_carlo.end_year)||2100;
 const baselineD=rLifestyleCopy(d,baselineAnnual),baselineBridge=rBridgeScenario(baselineD,accessAge),baselineDet=rSimulateEngine(baselineD,accessAge,()=>baselineD.assumptions.central_return_rate,endYear),baseMc=baselineMc||await rFullPlanMonteCarlo(baselineD,accessAge);
 const sustainable=await rLifestyleSustainable(d),custom=document.querySelector('#rLifeCustom'),b45=document.querySelector('#rLife45'),b60=document.querySelector('#rLife60'),reset=document.querySelector('#rLifeReset');
 custom.min=min;custom.max=max;custom.step=step;
 document.querySelector('#rLifeBaseline').textContent=rEuro(baselineAnnual)+'/ano';
 document.querySelector('#rLifeSustainable').textContent='≈ '+rEuro(sustainable.annual)+'/ano';
 document.querySelector('#rLifeSustainableCaption').textContent='≈ '+rEuro(sustainable.annual/12)+'/mês • '+Math.round(sustainable.successRate*100)+'% em '+sustainable.simulations.toLocaleString('en-IE')+' sims';
 const deltaMoney=v=>(v>=0?'+':'-')+rEuro(Math.abs(v)),deltaPct=v=>(v>=0?'+':'')+v.toFixed(0)+' pp';
 const setButton=(el,on)=>{if(!el)return;el.setAttribute('aria-pressed',on?'true':'false');el.style.borderColor=on?'var(--green)':'';el.style.color=on?'var(--green)':''};
 const duration=s=>s.firstShortfallYear?String(s.firstShortfallYear):'Never / >'+endYear;
 let renderVersion=0;
 const render=async annual=>{
   const version=++renderVersion;
   root.setAttribute('aria-busy','true');
   root.classList.remove('calculation-error');
   root.classList.add('calculating');
   document.querySelector('#rLifeStatus').textContent='Calculating selected scenario…';
   try{
   annual=Math.max(min,Math.min(max,Math.round(Number(annual||defaultAnnual)/step)*step));custom.value=annual;
   try{localStorage.setItem('fire_retirement_lifestyle_annual_2030',String(annual))}catch(e){}
   const sd=rLifestyleCopy(d,annual),bridge=rBridgeScenario(sd,accessAge),det=rSimulateEngine(sd,accessAge,()=>sd.assumptions.central_return_rate,endYear),mc=annual===baselineAnnual?baseMc:await rFullPlanMonteCarlo(sd,accessAge);
   if(version!==renderVersion)return;
   const v60=Number(String(d.people.Victor.birth_date).slice(0,4))+60,base60=rAssetNumberAt(baselineDet,v60)||0,sc60=rAssetNumberAt(det,v60)||0,pp=(mc.successRate-baseMc.successRate)*100;
   document.querySelector('#rLifeStatus').textContent=annual===baselineAnnual?'BASELINE • '+rEuro(annual):'WHAT-IF • '+rEuro(annual);
   document.querySelector('#rLifeStatus').style.color=annual===baselineAnnual?'var(--muted)':'var(--green)';
   document.querySelector('#rLifeMonthly').textContent=rEuro(annual/12)+'/mês';
   document.querySelector('#rLifeDuration').textContent=duration(det);
   document.querySelector('#rLifeBridgeNeed').textContent=fmt(bridge.lifestyleGap);
   document.querySelector('#rLifeBridgeRemain').textContent=fmt(bridge.remainingAccessible);
   document.querySelector('#rLifeMcSuccess').textContent=Math.round(mc.successRate*100)+'%';
   document.querySelector('#rLifeMcSuccess').style.color=mc.successRate>=.8?'var(--green)':mc.successRate>=.6?'var(--amber)':'var(--red)';
   document.querySelector('#rLifeAssets60').textContent=fmt(sc60);
   setButton(b45,annual===45000);setButton(b60,annual===baselineAnnual);
   const tb=document.querySelector('#rLifeComparisonTable');tb.innerHTML='';
   const rows=[
     ['Gasto mensal',rEuro(baselineAnnual/12),rEuro(annual/12),deltaMoney((annual-baselineAnnual)/12)],
     ['Bridge funding need',fmt(baselineBridge.lifestyleGap),fmt(bridge.lifestyleGap),deltaMoney(bridge.lifestyleGap-baselineBridge.lifestyleGap)],
     ['Capital na 1ª pensão',fmt(baselineBridge.remainingAccessible),fmt(bridge.remainingAccessible),deltaMoney(bridge.remainingAccessible-baselineBridge.remainingAccessible)],
     ['Patrimônio aos 60',fmt(base60),fmt(sc60),deltaMoney(sc60-base60)],
     ['Primeiro shortfall',duration(baselineDet),duration(det),(!baselineDet.firstShortfallYear&&!det.firstShortfallYear)?'—':!det.firstShortfallYear?'sem shortfall':!baselineDet.firstShortfallYear?'pior':((det.firstShortfallYear-baselineDet.firstShortfallYear)>=0?'+':'')+(det.firstShortfallYear-baselineDet.firstShortfallYear)+' anos'],
     ['Monte Carlo até '+endYear,Math.round(baseMc.successRate*100)+'%',Math.round(mc.successRate*100)+'%',deltaPct(pp)],
     ['Impostos totais • modelo',fmt(baselineDet.totalTax),fmt(det.totalTax),deltaMoney(det.totalTax-baselineDet.totalTax)]
   ];
   rows.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML='<td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td>';tb.appendChild(tr)});
   const spendDiff=baselineAnnual-annual,bridgeSaved=baselineBridge.lifestyleGap-bridge.lifestyleGap,remainGain=bridge.remainingAccessible-baselineBridge.remainingAccessible;
   if(annual<baselineAnnual)document.querySelector('#rLifeInsight').innerHTML='<strong>Impacto:</strong> reduzir o lifestyle em '+rEuro(spendDiff)+'/ano reduz a necessidade estimada do bridge em <strong>'+fmt(Math.max(0,bridgeSaved))+'</strong>, deixa cerca de <strong>'+fmt(Math.max(0,remainGain))+'</strong> a mais acessível na primeira pensão e muda o sucesso do plano de <strong>'+Math.round(baseMc.successRate*100)+'%</strong> para <strong>'+Math.round(mc.successRate*100)+'%</strong> ('+deltaPct(pp)+'). O baseline oficial continua '+rEuro(baselineAnnual)+'/ano.';
   else if(annual>baselineAnnual)document.querySelector('#rLifeInsight').innerHTML='<strong>Impacto:</strong> este cenário adiciona '+rEuro(annual-baselineAnnual)+'/ano ao lifestyle. O sucesso do plano muda de <strong>'+Math.round(baseMc.successRate*100)+'%</strong> para <strong>'+Math.round(mc.successRate*100)+'%</strong> ('+deltaPct(pp)+'). O baseline oficial não foi alterado.';
   else document.querySelector('#rLifeInsight').innerHTML='<strong>Baseline:</strong> este é o plano oficial de '+rEuro(baselineAnnual)+'/ano em euros de 2030. Use €45k ou Custom para testar alternativas sem gravar mudanças no plano.';
   root.dataset.annual=String(annual);
   }catch(error){
     if(version!==renderVersion)return;
     document.querySelector('#rLifeStatus').textContent='Calculation failed — select a scenario to retry';
     root.classList.add('calculation-error');
     console.error(error);
   }finally{if(version===renderVersion){root.setAttribute('aria-busy','false');root.classList.remove('calculating')}}
 };
 let initial=defaultAnnual;try{const stored=Number(localStorage.getItem('fire_retirement_lifestyle_annual_2030'));if(Number.isFinite(stored)&&stored>=min&&stored<=max)initial=stored}catch(e){}
 b45.onclick=()=>render(45000);b60.onclick=()=>render(baselineAnnual);reset.onclick=()=>render(defaultAnnual);custom.onchange=()=>render(custom.value);
 [b45,b60,reset,custom].forEach(el=>el.disabled=false);
 await render(initial);
}
function rSetupRetirementDetails(){
 const panel=document.querySelector('#retirementPanel'),summary=document.querySelector('#rExecSummary'),btn=document.querySelector('#rToggleDetails');if(!panel||!summary||!btn||btn.dataset.ready)return;
 const children=[...panel.children],idx=children.indexOf(summary),details=children.slice(idx+1);details.forEach(el=>el.classList.add('retirement-detail'));
 let collapsed=window.matchMedia&&window.matchMedia('(max-width: 760px)').matches;
 const apply=()=>{details.forEach(el=>el.classList.toggle('is-collapsed',collapsed));btn.textContent=collapsed?'Show detailed analysis':'Hide detailed analysis'};
 apply();btn.addEventListener('click',()=>{collapsed=!collapsed;apply()});btn.dataset.ready='1';
}
async function rRunSelfTests(d,fire){
 const v=await rWorkerCall('validate',d,fire||d._fireData||window.__fireData||{});
 return {passed:v.passed,total:v.total,tests:v.tests,warnings:v.warnings};
}
async function rRenderDecisionAudit(d,fire,defaultSim,fullDefault){
 const eng=window.FireRetirementEngine,val=await rWorkerCall('validate',d,fire),metrics=eng.metrics(d,defaultSim),meta=d.model_meta||{},taxMode=(d.etf_tax_data&&d.etf_tax_data.mode)||'proxy';
 const bucket=eng.simulate(d,{opening:d._engineOpening,policy:'three_bucket',accessAge:d.assumptions.default_pension_access_age,endYear:(d.full_plan_monte_carlo&&d.full_plan_monte_carlo.end_year)||2100});
 const sel=document.querySelector('#rOpeningMode');if(sel){sel.value=d.assumptions.opening_balance_mode||'official_plan';if(!sel.dataset.ready){sel.addEventListener('change',()=>{try{localStorage.setItem('fire_retirement_opening_mode',sel.value)}catch(e){}location.reload()});sel.dataset.ready='1'}}
 document.querySelector('#rAuditTests').textContent=val.passed+'/'+val.total+' passed';document.querySelector('#rAuditTests').style.color=val.passed===val.total?'var(--green)':'var(--red)';
 document.querySelector('#rAuditModel').textContent=(meta.engine_version||'2.4')+' • '+(meta.assumption_version||'—');
 document.querySelector('#rAuditTaxMode').textContent=taxMode==='tax_lots'?'FIFO tax lots':'Proxy cost basis';
 document.querySelector('#rAuditFreshness').textContent=new Date(fire.updated_at).toLocaleDateString('pt-BR')+' • '+((fire.sync_warnings||[]).length)+' warning(s)';
 document.querySelector('#rDecisionProtected').textContent=metrics.protectedSpendingYears.toFixed(1)+'y / '+bucket.protectedYears.toFixed(1)+'y';document.querySelector('#rDecisionProtectedCaption').textContent='Current / three-bucket';
 document.querySelector('#rDecisionFirstEquity').textContent=metrics.firstEquitySale||'—';document.querySelector('#rDecisionFirstPension').textContent=metrics.firstPensionRequired||'—';document.querySelector('#rDecisionLowest').textContent=fmt(metrics.lowestPortfolioValue);
 const deltas=await rWorkerCall('decisionDeltas',d,{opening:d._engineOpening,fire,simulations:(d.decision_analysis&&d.decision_analysis.simulations)||250,endYear:(d.full_plan_monte_carlo&&d.full_plan_monte_carlo.end_year)||2100,policy:(d.withdrawal_policies&&d.withdrawal_policies.default)||'current_waterfall'}),dt=document.querySelector('#rDecisionDeltaTable');dt.innerHTML='';
 deltas.cases.forEach(x=>{const tr=document.createElement('tr'),fail=x.firstShortfallScenario||'> '+((d.full_plan_monte_carlo&&d.full_plan_monte_carlo.end_year)||2100);tr.innerHTML='<td>'+x.label+'</td><td>'+(x.successDeltaPp>=0?'+':'')+x.successDeltaPp.toFixed(0)+' pp</td><td>'+fail+'</td><td>'+(x.terminalDelta>=0?'+':'-')+fmt(Math.abs(x.terminalDelta))+'</td>';dt.appendChild(tr)});
 const stresses=eng.runStress(d,{opening:d._engineOpening,policy:'three_bucket',accessAge:d.assumptions.default_pension_access_age,endYear:2060}),st=document.querySelector('#rStressTable');st.innerHTML='';
 stresses.forEach(x=>{const tr=document.createElement('tr');tr.innerHTML='<td>'+x.label+'</td><td>'+(x.firstShortfallYear||'> 2060')+'</td><td>'+(x.firstEquitySale||'—')+'</td><td>'+fmt(x.lowest)+'</td>';st.appendChild(tr)});
 const {cur,mix}=await rWorkerCall('policyComparison',d,{opening:d._engineOpening,simulations:(d.decision_analysis&&d.decision_analysis.simulations)||250,endYear:(d.full_plan_monte_carlo&&d.full_plan_monte_carlo.end_year)||2100,seed:(d.full_plan_monte_carlo&&d.full_plan_monte_carlo.seed)||20261009,accessAge:d.assumptions.default_pension_access_age});
 document.querySelector('#rPolicyComparison').innerHTML='<strong>Withdrawal policy:</strong> on the same '+((d.decision_analysis&&d.decision_analysis.simulations)||250)+' market paths, current waterfall succeeds in <strong>'+Math.round(cur.successRate*100)+'%</strong> vs <strong>'+Math.round(mix.successRate*100)+'%</strong> for the three-bucket policy. This isolates policy impact from Monte Carlo noise.';
 const warnings=[...val.warnings,...(fire.sync_warnings||[])];document.querySelector('#rAuditWarnings').innerHTML=warnings.map(x=>'⚠️ '+x).join('<br>');
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

function rRenderActualVsPlan(rows,d){
 const cfg=d.actual_tracking||{},actuals=(d.actuals||[]).slice().sort((a,b)=>a.year-b.year),tb=document.querySelector('#rActualPlanTable');tb.innerHTML='';
 if(!actuals.length){
   document.querySelector('#rActualYears').textContent='0';document.querySelector('#rActualSpendVar').textContent='—';document.querySelector('#rActualPotVar').textContent='—';
   document.querySelector('#rActualLatestYear').textContent=cfg.start_year||d.assumptions.retirement_start_year;document.querySelector('#rActualLatestCaption').textContent='Tracking starts when retirement actuals exist';
   document.querySelector('#rActualPlanStatus').textContent='⏳ STARTS '+(cfg.start_year||d.assumptions.retirement_start_year);document.querySelector('#rActualPlanStatus').style.color='var(--muted)';
   document.querySelector('#rActualPlanInsight').innerHTML='<strong>Ready:</strong> a infraestrutura já está ativa. Quando houver actuals de aposentadoria, esta seção calculará automaticamente gasto vs plano e patrimônio vs plano.';
   const tr=document.createElement('tr');tr.innerHTML='<td colspan="7" class="small">Sem actuals de aposentadoria ainda — baseline preservado até '+(cfg.start_year||d.assumptions.retirement_start_year)+'.</td>';tb.appendChild(tr);return;
 }
 let cumSpendVar=0,latestPotVar=null,latestYear=null,validYears=0;
 actuals.forEach(actual=>{
   const plan=rows.find(x=>x.year===actual.year);if(!plan)return;
   const spendVar=actual.spend==null?null:actual.spend-plan.lifestyle,potVar=actual.end_pot==null?null:actual.end_pot-plan.netWorth;
   if(spendVar!=null)cumSpendVar+=spendVar;if(potVar!=null){latestPotVar=potVar;latestYear=actual.year}validYears++;
   const tr=document.createElement('tr');
   tr.innerHTML='<td>'+actual.year+'</td><td>'+rEuro(plan.lifestyle)+'</td><td>'+(actual.spend==null?'—':rEuro(actual.spend))+'</td><td>'+(spendVar==null?'—':((spendVar>=0?'+':'')+rEuro(spendVar)))+'</td><td>'+rEuro(plan.netWorth)+'</td><td>'+(actual.end_pot==null?'—':rEuro(actual.end_pot))+'</td><td>'+(potVar==null?'—':((potVar>=0?'+':'')+rEuro(potVar)))+'</td>';tb.appendChild(tr);
 });
 document.querySelector('#rActualYears').textContent=validYears;document.querySelector('#rActualSpendVar').textContent=(cumSpendVar>=0?'+':'')+rEuro(cumSpendVar);document.querySelector('#rActualSpendVar').style.color=cumSpendVar<=0?'var(--green)':'var(--amber)';
 document.querySelector('#rActualPotVar').textContent=latestPotVar==null?'—':((latestPotVar>=0?'+':'')+rEuro(latestPotVar));document.querySelector('#rActualPotVar').style.color=latestPotVar==null?'var(--text)':latestPotVar>=0?'var(--green)':'var(--amber)';
 document.querySelector('#rActualLatestYear').textContent=latestYear||actuals[actuals.length-1].year;document.querySelector('#rActualLatestCaption').textContent=latestPotVar==null?'No portfolio actual for latest year':'Portfolio variance vs deterministic plan';
 const ok=(latestPotVar==null||latestPotVar>=0)&&cumSpendVar<=0;document.querySelector('#rActualPlanStatus').textContent=ok?'🟢 AHEAD / ON PLAN':'🟡 REVIEW';document.querySelector('#rActualPlanStatus').style.color=ok?'var(--green)':'var(--amber)';
 document.querySelector('#rActualPlanInsight').innerHTML='<strong>Tracked:</strong> '+validYears+' year(s). Spending variance is cumulative; portfolio variance uses the latest year with an end-of-year actual.';
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
