(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FireRetirementEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const EPS=1e-6;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const sum=a=>a.reduce((s,v)=>s+v,0);
  const round2=v=>Math.round((v+Number.EPSILON)*100)/100;
  const yearOf=s=>Number(String(s).slice(0,4));
  const monthOf=s=>Number(String(s).slice(5,7)||1);
  const dayOf=s=>Number(String(s).slice(8,10)||1);
  const annualToMonthly=r=>Math.pow(1+r,1/12)-1;
  const projectMonthly=(current,monthly,annual,months)=>{let v=current,m=annualToMonthly(annual);for(let i=0;i<months;i++)v=v*(1+m)+monthly;return v};
  const monthsToEnd2029=date=>{const d=new Date(date);return Math.max(0,(2029-d.getUTCFullYear())*12+(11-d.getUTCMonth()));};
  const percentile=(a,p)=>{if(!a.length)return 0;const x=(a.length-1)*p,i=Math.floor(x),r=x-i;return a[i+1]!==undefined?a[i]+r*(a[i+1]-a[i]):a[i]};
  function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  function normal(rand){let u=0,v=0;while(!u)u=rand();while(!v)v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  function corrNormals(rand,rho){const a=normal(rand),b=normal(rand);return [a,rho*a+Math.sqrt(Math.max(0,1-rho*rho))*b]}

  function ageAtStartOfYear(birthDate,year){const by=yearOf(birthDate),bm=monthOf(birthDate),bd=dayOf(birthDate);return year-by-((bm===1&&bd===1)?0:1)}
  function ageDuringYear(birthDate,year){return year-yearOf(birthDate)}
  function firstFullEligibleYear(birthDate,accessAge){const y=yearOf(birthDate)+accessAge;return (monthOf(birthDate)===1&&dayOf(birthDate)===1)?y:y+1}

  function inflationFactor(a,year,override){
    if(override&&override[year]!=null)return override[year];
    return Math.pow(1+a.inflation_rate,Math.max(0,year-a.retirement_start_year));
  }
  function indexedBrackets(brackets,f){return brackets.map(b=>({cap:b.cap>900000000?b.cap:b.cap*f,rate:b.rate}))}
  function progressiveTax(amount,brackets){let tax=0,prev=0;for(const b of brackets){const taxable=Math.max(0,Math.min(amount,b.cap)-prev);tax+=taxable*b.rate;if(amount<=b.cap)break;prev=b.cap}return tax}
  function generalTax(salary,pension,year,a,t,inflationOverride){
    const f=a.tax_brackets_indexed_with_inflation_from_2030?inflationFactor(a,year,inflationOverride):1;
    const ss=salary*t.employee_social_security_rate;
    const workIncome=salary+pension,deduction=workIncome>0?t.general_work_expense_deduction*f:0,base=Math.max(0,workIncome-ss-deduction);
    const sb=indexedBrackets(t.state_general_brackets,f),vb=indexedBrackets(t.valencia_general_brackets,f);
    const state=Math.max(0,progressiveTax(base,sb)-progressiveTax(Math.min(base,t.state_personal_minimum*f),sb));
    const regional=Math.max(0,progressiveTax(base,vb)-progressiveTax(Math.min(base,t.valencia_personal_minimum*f),vb));
    return {tax:state+regional,ss,base};
  }
  function savingsTax(totalGain,year,a,t,inflationOverride){
    const f=a.tax_brackets_indexed_with_inflation_from_2030?inflationFactor(a,year,inflationOverride):1;
    return progressiveTax(Math.max(0,totalGain),indexedBrackets(t.savings_brackets,f));
  }
  function incrementalSavingsTax(priorGain,newGain,year,a,t,inflationOverride){return Math.max(0,savingsTax(priorGain+newGain,year,a,t,inflationOverride)-savingsTax(priorGain,year,a,t,inflationOverride))}

  function officialRow(fire){
    const rows=fire.monthly||[];
    return rows.find(r=>r.month==='Dec/29')||rows[rows.length-1]||null;
  }
  function pensionShares(d){
    const v=d.people&&d.people.Victor||{},r=d.people&&d.people.Rosely||{};
    const va=Number(v.projected_pension_2030||v.pension_balance_snapshot||0),ra=Number(r.projected_pension_2030||r.pension_balance_snapshot||0),tot=va+ra;
    return tot>0?{Victor:va/tot,Rosely:ra/tot}:{Victor:.5,Rosely:.5};
  }
  function basisConfig(d){return d.etf_tax_data||{mode:'proxy',proxy:{official_cost_basis_2030:d.projection_inputs&&d.projection_inputs.projected_etf_cost_basis_2030}}}
  function buildOpeningState(d,fire,mode){
    mode=mode||((d.opening_balance_policy||{}).default_mode)||'official_plan';
    const row=officialRow(fire),shares=pensionShares(d),p=d.projection_inputs||{},a=d.assumptions||{},taxCfg=basisConfig(d);
    const officialEtf=row&&Number.isFinite(row.etfs)?row.etfs:(fire.barista&&fire.barista.etf_target_2029)||p.projected_etfs_2030||0;
    const officialPension=row&&Number.isFinite(row.pension)?row.pension:(fire.barista&&fire.barista.pension_target_2029)||p.projected_total_pensions_2030||0;
    const officialBasis=(taxCfg.proxy&&Number.isFinite(taxCfg.proxy.official_cost_basis_2030))?taxCfg.proxy.official_cost_basis_2030:(p.projected_etf_cost_basis_2030||0);
    const warnings=[];
    let etf=officialEtf,pension=officialPension,basis=officialBasis,source='Official Dec-2029 accumulation path';
    if(mode==='live_forecast'){
      const months=monthsToEnd2029(fire.updated_at),rate=(fire.projection&&Number.isFinite(fire.projection.plan_rate_annual))?fire.projection.plan_rate_annual:(a.central_return_rate||.04),cp=fire.contribution_plan||{};
      etf=projectMonthly(fire.etfs||0,cp.etfs_monthly||0,rate,months);
      pension=projectMonthly(fire.pension||0,cp.pension_monthly||0,rate,months);
      const ratio=officialEtf>0?clamp(officialBasis/officialEtf,0,1):.65;
      const currentBasis=(taxCfg.proxy&&Number.isFinite(taxCfg.proxy.current_cost_basis))?taxCfg.proxy.current_cost_basis:(fire.etfs||0)*ratio;
      basis=Math.min(etf,currentBasis+(cp.etfs_monthly||0)*months);
      source='Live forecast from current FIRE balances';
      if(!(taxCfg.proxy&&Number.isFinite(taxCfg.proxy.current_cost_basis)))warnings.push('Live ETF basis uses an estimated current basis ratio; future contributions are added at 100% basis.');
    }
    const house=a.house_cash_2030||0;
    const v=pension*shares.Victor,r=pension*shares.Rosely;
    if((taxCfg.mode||'proxy')!=='tax_lots')warnings.push('ETF realised-gain taxation is using the proportional cost-basis proxy until complete tax lots are loaded.');
    const eligibility=d.pension_eligibility||{};
    if(eligibility.status!=='verified')warnings.push('Pension legal-access rules remain unverified; access-age scenarios are planning assumptions.');
    return {mode,source,houseCash:house,etf,etfCostBasis:Math.min(etf,basis),etfLots:(taxCfg.mode==='tax_lots'?(taxCfg.tax_lots||[]):[]),pensionVictor:v,pensionRosely:r,totalPension:pension,totalAssets:house+etf+pension,warnings,official:{etf:officialEtf,pension:officialPension,costBasis:officialBasis,total:house+officialEtf+officialPension},shares};
  }

  function statePensionGross(d,who,year,fraction,inflationOverride){const cfg=d.state_pension||{},person=d.people&&d.people[who];if(!person||!fraction)return 0;const by=yearOf(person.birth_date),bm=monthOf(person.birth_date),eligible=by+(cfg.pension_age||66);if(year<eligible)return 0;let yf=1;if(cfg.first_year_prorated&&year===eligible)yf=Math.max(0,Math.min(1,(13-bm)/12));const ref=cfg.rate_reference_year||2026,annual=cfg.max_annual_rate_2026||((cfg.max_weekly_rate_2026||0)*52);const idx=cfg.index_with_inflation?inflationFactor({...d.assumptions,retirement_start_year:ref},year,inflationOverride):1;return annual*idx*fraction*yf}
  function legalGate(d,who){const pe=d.pension_eligibility||{},person=pe.people&&pe.people[who];if(!person)return {allowed:true,verified:false};if(person.status==='ineligible')return {allowed:false,verified:true};if(person.status==='verified'&&person.access_allowed===false)return {allowed:false,verified:true};return {allowed:true,verified:person.status==='verified'};}
  function personEligible(d,who,year,accessAge){const gate=legalGate(d,who);if(!gate.allowed)return false;const bd=d.people[who].birth_date,timing=(d.pension_eligibility&&d.pension_eligibility.annual_timing)||'next_full_year';if(timing==='next_full_year')return year>=firstFullEligibleYear(bd,accessAge);return ageDuringYear(bd,year)>=accessAge}
  function arfRate(d,who,year,pot,accessAge){const rules=d.pension_rules||{};if(!rules.assume_arf_after_access||!personEligible(d,who,year,accessAge))return 0;const start=ageAtStartOfYear(d.people[who].birth_date,year),min=rules.imputed_distribution_start_age||60;if(start<min)return 0;if(pot>(rules.high_value_threshold||2000000))return rules.high_value_rate||.06;if(start>=70)return rules.imputed_rate_70_plus||.05;return rules.imputed_rate_under_70||.04}

  function sellProxyForNet(value,basis,netNeed,priorGain,year,a,t,inflationOverride){
    if(netNeed<=0||value<=0)return {sale:0,gain:0,tax:0,basisAfter:basis,net:0};
    const gainRatio=clamp((value-basis)/Math.max(value,EPS),0,1);
    const calc=sale=>{const gain=sale*gainRatio,tax=incrementalSavingsTax(priorGain,gain,year,a,t,inflationOverride);return {sale,gain,tax,net:sale-tax}};
    const all=calc(value);if(all.net<=netNeed)return {...all,basisAfter:0};
    let lo=0,hi=value;for(let i=0;i<50;i++){const m=(lo+hi)/2;if(calc(m).net<netNeed)lo=m;else hi=m}
    const c=calc(hi),principal=hi-c.gain;return {...c,basisAfter:Math.max(0,basis-principal)};
  }
  function applyReturnToLots(lots,r){return (lots||[]).map(l=>({...l,market_value:(Number(l.market_value)||0)*(1+r)}))}
  function lotTotals(lots){return {value:sum((lots||[]).map(l=>Number(l.market_value)||0)),basis:sum((lots||[]).map(l=>Number(l.cost_basis)||0))}}
  function sellLotsForNet(lots,netNeed,priorGain,year,a,t,inflationOverride){
    const ordered=clone(lots||[]).sort((x,y)=>String(x.acquisition_date||'').localeCompare(String(y.acquisition_date||'')));
    const max=lotTotals(ordered).value;if(netNeed<=0||max<=0)return {sale:0,gain:0,tax:0,net:0,lots:ordered};
    const preview=sale=>{let rem=sale,gain=0,newLots=[];for(const lot of ordered){let mv=Number(lot.market_value)||0,cb=Number(lot.cost_basis)||0;if(rem<=EPS){newLots.push({...lot});continue}const take=Math.min(mv,rem),ratio=mv>0?take/mv:0;gain+=take-cb*ratio;mv-=take;cb-=cb*ratio;rem-=take;if(mv>EPS)newLots.push({...lot,market_value:mv,cost_basis:cb})}const tax=incrementalSavingsTax(priorGain,Math.max(0,gain),year,a,t,inflationOverride);return {sale:sale-rem,gain:Math.max(0,gain),tax,net:sale-rem-tax,lots:newLots}};
    const all=preview(max);if(all.net<=netNeed)return all;let lo=0,hi=max;for(let i=0;i<50;i++){const m=(lo+hi)/2;if(preview(m).net<netNeed)lo=m;else hi=m}return preview(hi);
  }
  function pensionForNet(vPot,rPot,roselySalary,netNeed,year,accessAge,d,baseVictor=0,baseRosely=0,inflationOverride){
    if(netNeed<=0)return {gross:0,victor:0,rosely:0,tax:0,net:0};const eligible=[];
    if(personEligible(d,'Victor',year,accessAge)&&vPot>0)eligible.push({who:'Victor',pot:vPot});if(personEligible(d,'Rosely',year,accessAge)&&rPot>0)eligible.push({who:'Rosely',pot:rPot});
    const total=sum(eligible.map(x=>x.pot));if(total<=0)return {gross:0,victor:0,rosely:0,tax:0,net:0};const a=d.assumptions,t=d.tax_rules;
    const calc=g=>{g=Math.min(g,total);let victor=0,rosely=0;for(const x of eligible){const z=g*x.pot/total;if(x.who==='Victor')victor=z;else rosely=z}const bR=generalTax(roselySalary,baseRosely,year,a,t,inflationOverride).tax,wR=generalTax(roselySalary,baseRosely+rosely,year,a,t,inflationOverride).tax,bV=generalTax(0,baseVictor,year,a,t,inflationOverride).tax,wV=generalTax(0,baseVictor+victor,year,a,t,inflationOverride).tax,tax=(wR-bR)+(wV-bV);return {gross:g,victor,rosely,tax,net:g-tax}};
    const all=calc(total);if(all.net<=netNeed)return all;let lo=0,hi=total;for(let i=0;i<50;i++){const m=(lo+hi)/2;if(calc(m).net<netNeed)lo=m;else hi=m}return calc(hi);
  }

  function defaultAssets(d){const x=d.asset_class_assumptions||{};return {cash:{return:0,vol:0},short_bonds:{return:.03,vol:.04},growth_bonds:{return:.03,vol:.06},equity:{return:.05,vol:.15},pension:{return:.05,vol:.11},...x}}
  function bucketConfig(d){const w=d.withdrawal_policies&&d.withdrawal_policies.three_bucket||{};return {pot1:60000,pot2:60000,pot1_return:.025,growth_equity_weight:.6,equity_drawdown_threshold:.85,refill_target_years:2,...w}}
  function initialPolicyState(d,opening,policy){
    if(policy!=='three_bucket')return {cash:opening.houseCash,shortBonds:0,growthBonds:0,growthEquity:0,shortBasis:0,growthBondBasis:0,growthEquityBasis:0};
    const b=bucketConfig(d),pot1=Math.min(opening.houseCash,b.pot1),pot2=Math.min(Math.max(0,opening.houseCash-pot1),b.pot2),growth=Math.max(0,opening.houseCash-pot1-pot2),eq=growth*(b.growth_equity_weight??.6),gb=growth-eq;
    return {cash:pot1,shortBonds:pot2,growthBonds:gb,growthEquity:eq,shortBasis:pot2,growthBondBasis:gb,growthEquityBasis:eq};
  }
  function returnSet(d,year,provider){const a=defaultAssets(d);if(typeof provider==='function'){const x=provider(year)||{};if(Number.isFinite(x))return {cash:a.cash.return,short_bonds:x,growth_bonds:x,equity:x,pension:x};return {cash:x.cash??a.cash.return,short_bonds:x.short_bonds??a.short_bonds.return,growth_bonds:x.growth_bonds??a.growth_bonds.return,equity:x.equity??a.equity.return,pension:x.pension??a.pension.return}}if(Number.isFinite(provider))return {cash:a.cash.return,short_bonds:provider,growth_bonds:provider,equity:provider,pension:provider};return {cash:a.cash.return,short_bonds:a.short_bonds.return,growth_bonds:a.growth_bonds.return,equity:a.equity.return,pension:a.pension.return}}

  function simulate(d,opts){
    opts=opts||{};const a=d.assumptions,t=d.tax_rules,opening=clone(opts.opening||d._engineOpening||buildOpeningState(d,opts.fire||{},a.opening_balance_mode)),policy=opts.policy||((d.withdrawal_policies||{}).default)||'current_waterfall',accessAge=opts.accessAge??a.default_pension_access_age,endYear=opts.endYear||((d.full_plan_monte_carlo||{}).end_year)||2100,stateFrac=opts.statePensionFraction||0,inflationOverride=opts.inflationFactors||null;
    const ps=initialPolicyState(d,opening,policy),taxCfg=basisConfig(d);let cash=ps.cash,shortBonds=ps.shortBonds,growthBonds=ps.growthBonds,growthEquity=ps.growthEquity,shortBasis=ps.shortBasis,growthBondBasis=ps.growthBondBasis,growthEquityBasis=ps.growthEquityBasis;
    let etf=opening.etf,etfBasis=opening.etfCostBasis,etfLots=clone(opening.etfLots||[]),vP=opening.pensionVictor,rP=opening.pensionRosely,equityPeak=Math.max(EPS,growthEquity+etf),rows=[];
    let salaryTax=0,statePensionTax=0,pensionTax=0,savingsTaxTotal=0,totalSS=0,firstShortfallYear=null,cashEndYear=null,etfStartYear=null,equityStartYear=null,pensionStartYear=null,firstProtectedDepletionYear=null,totalArfGross=0,totalArfReinvested=0,totalStatePensionGross=0,lowest=Infinity;
    for(let year=a.retirement_start_year;year<=endYear;year++){
      const start={cash,shortBonds,growthBonds,growthEquity,etf,etfBasis,vP,rP,total:cash+shortBonds+growthBonds+growthEquity+etf+vP+rP};
      const rr=returnSet(d,year,opts.returnProvider);rr.cash=policy==='three_bucket'?(bucketConfig(d).pot1_return??rr.cash):(Number.isFinite(a.cash_return_rate)?a.cash_return_rate:0);cash*=1+rr.cash;shortBonds*=1+rr.short_bonds;growthBonds*=1+rr.growth_bonds;growthEquity*=1+rr.equity;vP*=1+rr.pension;rP*=1+rr.pension;
      if(taxCfg.mode==='tax_lots'&&etfLots.length){etfLots=applyReturnToLots(etfLots,rr.equity);const z=lotTotals(etfLots);etf=z.value;etfBasis=z.basis}else etf*=1+rr.equity;
      const retDelta={cash:cash-start.cash,shortBonds:shortBonds-start.shortBonds,growthBonds:growthBonds-start.growthBonds,growthEquity:growthEquity-start.growthEquity,etf:etf-start.etf,pension:(vP+rP)-(start.vP+start.rP)};
      const infl=inflationOverride&&inflationOverride[year]!=null?inflationOverride[year]:inflationFactor(a,year);
      const lifestyle=a.lifestyle_annual_2030*infl;
      const salaryActive=(year>=a.barista_start_year&&year<=a.barista_end_year)&&!(opts.baristaOffYears||[]).includes(year);const salary=salaryActive?a.barista_income_gross_2030*Math.pow(1+a.barista_income_growth_rate,year-a.barista_start_year):0;
      const stV=statePensionGross(d,'Victor',year,stateFrac,inflationOverride),stR=statePensionGross(d,'Rosely',year,stateFrac,inflationOverride),stateGross=stV+stR;totalStatePensionGross+=stateGross;
      const salaryOnly=generalTax(salary,0,year,a,t,inflationOverride),baseR=generalTax(salary,stR,year,a,t,inflationOverride),baseV=generalTax(0,stV,year,a,t,inflationOverride),baseTax=baseR.tax+baseV.tax,stateTaxYear=Math.max(0,baseTax-salaryOnly.tax),workNet=salary+stateGross-baseTax-baseR.ss;salaryTax+=salaryOnly.tax;statePensionTax+=stateTaxYear;totalSS+=baseR.ss;
      let need=Math.max(0,lifestyle-workNet),cashUsed=0,shortUsed=0,growthBondSale=0,growthEquitySale=0,etfSale=0,etfGain=0,pensionGross=0,pensionTaxYear=0,vW=0,rW=0,arfFloor=0,arfReinvest=0,savingsGainYear=0,savingsTaxYear=0;
      const useCash=()=>{const x=Math.min(cash,need);cash-=x;need-=x;cashUsed+=x};
      const useAsset=(kind)=>{if(need<=EPS)return;let value,basis;if(kind==='short'){value=shortBonds;basis=shortBasis}else if(kind==='growthBond'){value=growthBonds;basis=growthBondBasis}else{value=growthEquity;basis=growthEquityBasis}const s=sellProxyForNet(value,basis,need,savingsGainYear,year,a,t,inflationOverride);savingsGainYear+=s.gain;savingsTaxYear+=s.tax;need=Math.max(0,need-s.net);if(kind==='short'){shortBonds-=s.sale;shortBasis=s.basisAfter;shortUsed+=s.sale}else if(kind==='growthBond'){growthBonds-=s.sale;growthBondBasis=s.basisAfter;growthBondSale+=s.sale}else{growthEquity-=s.sale;growthEquityBasis=s.basisAfter;growthEquitySale+=s.sale;if(s.sale>0&&!equityStartYear)equityStartYear=year}};
      const usePension=()=>{if(need<=EPS)return;const pr=pensionForNet(vP,rP,salary,need,year,accessAge,d,stV,stR,inflationOverride);pensionGross+=pr.gross;vW+=pr.victor;rW+=pr.rosely;pensionTaxYear+=pr.tax;vP=Math.max(0,vP-pr.victor);rP=Math.max(0,rP-pr.rosely);need=Math.max(0,need-pr.net);if(pr.gross>0&&!pensionStartYear)pensionStartYear=year};
      const useEtf=()=>{if(need<=EPS)return;let s;if(taxCfg.mode==='tax_lots'&&etfLots.length){s=sellLotsForNet(etfLots,need,savingsGainYear,year,a,t,inflationOverride);etfLots=s.lots;const z=lotTotals(etfLots);etf=z.value;etfBasis=z.basis}else{s=sellProxyForNet(etf,etfBasis,need,savingsGainYear,year,a,t,inflationOverride);etf=Math.max(0,etf-s.sale);etfBasis=s.basisAfter}savingsGainYear+=s.gain;savingsTaxYear+=s.tax;etfSale+=s.sale;etfGain+=s.gain;need=Math.max(0,need-s.net);if(s.sale>0&&!etfStartYear)etfStartYear=year;if(s.sale>0&&!equityStartYear)equityStartYear=year};
      useCash();
      if(policy==='three_bucket'){
        useAsset('short');if(cash+shortBonds<=.5&&!firstProtectedDepletionYear)firstProtectedDepletionYear=year;
        usePension();
        const currentEquity=growthEquity+etf,equityDrawdown=currentEquity<equityPeak*(bucketConfig(d).equity_drawdown_threshold||.85)||rr.equity<-.10;
        useAsset('growthBond');
        if(need>EPS){if(equityDrawdown){useEtf();useAsset('growthEquity')}else{useAsset('growthEquity');useEtf()}}
      }else{usePension();useEtf()}
      const arfBaseV=vP+vW,arfBaseR=rP+rW,floorV=arfBaseV*arfRate(d,'Victor',year,arfBaseV,accessAge),floorR=arfBaseR*arfRate(d,'Rosely',year,arfBaseR,accessAge),extraV=Math.min(vP,Math.max(0,floorV-vW)),extraR=Math.min(rP,Math.max(0,floorR-rW)),extra=extraV+extraR;
      if(extra>EPS){const oldTax=pensionTaxYear,newVW=vW+extraV,newRW=rW+extraR;const bR=generalTax(salary,stR,year,a,t,inflationOverride).tax,wR=generalTax(salary,stR+newRW,year,a,t,inflationOverride).tax,bV=generalTax(0,stV,year,a,t,inflationOverride).tax,wV=generalTax(0,stV+newVW,year,a,t,inflationOverride).tax,newTax=(wR-bR)+(wV-bV),extraTax=Math.max(0,newTax-oldTax);vP-=extraV;rP-=extraR;vW=newVW;rW=newRW;pensionGross+=extra;pensionTaxYear=newTax;arfFloor=extra;let extraNet=Math.max(0,extra-extraTax),used=Math.min(need,extraNet);need-=used;extraNet-=used;if(extraNet>0){etf+=extraNet;etfBasis+=extraNet;arfReinvest=extraNet}totalArfGross+=extra;totalArfReinvested+=extraNet;if(!pensionStartYear)pensionStartYear=year}
      pensionTax+=pensionTaxYear;savingsTaxTotal+=savingsTaxYear;
      if(!cashEndYear&&cash<=.5)cashEndYear=year;
      equityPeak=Math.max(equityPeak,growthEquity+etf);
      const pensionEnd=vP+rP,netWorth=cash+shortBonds+growthBonds+growthEquity+etf+pensionEnd;lowest=Math.min(lowest,netWorth);const totalTaxYear=baseTax+pensionTaxYear+savingsTaxYear;
      const end={cash,shortBonds,growthBonds,growthEquity,etf,etfBasis,vP,rP,total:netWorth};
      const sourceIn=salary+stateGross,withdrawals=cashUsed+shortUsed+growthBondSale+growthEquitySale+etfSale+pensionGross,returns=sum(Object.values(retDelta));
      const reconciliationError=round2((start.total+returns+sourceIn-withdrawals-totalTaxYear-baseR.ss-lifestyle+Math.min(lifestyle,workNet+withdrawals-totalTaxYear-baseR.ss)) - end.total);
      const assetError=round2((start.total+returns-withdrawals+arfReinvest)-end.total);
      rows.push({year,ageVictor:ageDuringYear(d.people.Victor.birth_date,year),ageRosely:ageDuringYear(d.people.Rosely.birth_date,year),returnRate:rr.equity,returns:rr,lifestyle,salaryGross:salary,statePensionGross:stateGross,workNet,cashUsed,shortBondSale:shortUsed,growthBondSale,growthEquitySale,etfSale,etfGain,pensionGross,victorWithdraw:vW,roselyWithdraw:rW,arfFloorGross:arfFloor,arfReinvestedNet:arfReinvest,salaryTax:salaryOnly.tax,statePensionTax:stateTaxYear,pensionTax:pensionTaxYear,etfTax:savingsTaxYear,tax:totalTaxYear,ss:baseR.ss,startCash:start.cash,startEtf:start.etf,startPension:start.vP+start.rP,cash,shortBonds,growthBonds,growthEquity,etf,costBasis:etfBasis,victorP:vP,roselyP:rP,pension:pensionEnd,netWorth,shortfall:need,reconciliationError,assetError,protectedAssets:cash+shortBonds+growthBonds});
      if(need>1){firstShortfallYear=year;break}
    }
    const accessibleStart=opening.houseCash+opening.etf,initialWorkGap=Math.max(1,(a.lifestyle_annual_2030-(a.barista_income_gross_2030-generalTax(a.barista_income_gross_2030,0,a.retirement_start_year,a,t).tax-generalTax(a.barista_income_gross_2030,0,a.retirement_start_year,a,t).ss))),protectedStart=policy==='three_bucket'?(ps.cash+ps.shortBonds+ps.growthBonds):ps.cash;
    return {policy,accessAge,opening,rows,firstShortfallYear,cashEndYear,etfStartYear,equityStartYear,pensionStartYear,firstProtectedDepletionYear,salaryTax,statePensionTax,pensionTax,etfTax:savingsTaxTotal,totalTax:salaryTax+statePensionTax+pensionTax+savingsTaxTotal,totalSS,totalArfGross,totalArfReinvested,totalStatePensionGross,accessibleStart,protectedYears:protectedStart/initialWorkGap,lowestPortfolioValue:Number.isFinite(lowest)?lowest:opening.totalAssets,statePensionFraction:stateFrac};
  }

  function bridgeScenario(d,opts){opts=opts||{};const accessAge=opts.accessAge??d.assumptions.default_pension_access_age,first=Math.min(firstFullEligibleYear(d.people.Victor.birth_date,accessAge),firstFullEligibleYear(d.people.Rosely.birth_date,accessAge)),sim=simulate(d,{...opts,accessAge,endYear:first-1});const last=sim.rows[sim.rows.length-1],remaining=last?(last.cash+last.shortBonds+last.growthBonds+last.growthEquity+last.etf):sim.accessibleStart,gap=sum(sim.rows.map(r=>Math.max(0,r.lifestyle-r.workNet))),tax=sum(sim.rows.map(r=>r.etfTax)),years=Math.max(0,first-d.assumptions.retirement_start_year),bufferYears=((d.bridge_to_pension||{}).safety_buffer_years)||2,draw=((d.forever_fire||{}).portfolio_withdrawal_real_2030)||30000,safety=draw*Math.pow(1+d.assumptions.inflation_rate,years)*bufferYears,status=sim.firstShortfallYear?'red':remaining>=safety?'green':'amber';return {accessAge,firstPensionYear:first,bridgeYears:years,accessibleStart:sim.accessibleStart,lifestyleGap:gap,etfTax:tax,remainingAccessible:remaining,safetyBuffer:safety,status,statusLabel:status==='green'?'🟢 BRIDGE READY':status==='amber'?'🟡 THIN BUFFER':'🔴 BRIDGE GAP',shortfall:sim.firstShortfallYear?(sim.rows[sim.rows.length-1].shortfall||0):0,lastFundedYear:sim.rows.length?sim.rows[sim.rows.length-1].year:d.assumptions.retirement_start_year-1,protectedYears:sim.protectedYears};}

  function generatePaths(d,opts){opts=opts||{};const m=d.full_plan_monte_carlo||{},sims=opts.simulations||m.simulations||1500,endYear=opts.endYear||m.end_year||2100,start=d.assumptions.retirement_start_year,seed=opts.seed??m.seed??20261009,assets=defaultAssets(d),rho=(d.asset_class_assumptions&&d.asset_class_assumptions.equity_bond_correlation)??.2,rand=mulberry32(seed),paths=[];for(let s=0;s<sims;s++){const path={};for(let y=start;y<=endYear;y++){const [ze,zb]=corrNormals(rand,rho),zp=.7*ze+Math.sqrt(1-.49)*normal(rand);path[y]={cash:assets.cash.return,short_bonds:Math.max(-.3,assets.short_bonds.return+assets.short_bonds.vol*zb),growth_bonds:Math.max(-.5,assets.growth_bonds.return+assets.growth_bonds.vol*zb),equity:Math.max(-.95,assets.equity.return+assets.equity.vol*ze),pension:Math.max(-.95,assets.pension.return+assets.pension.vol*zp)}}paths.push(path)}return paths}
  function monteCarlo(d,opts){opts=opts||{};const m=d.full_plan_monte_carlo||{},endYear=opts.endYear||m.end_year||2100,paths=opts.paths||generatePaths(d,opts),ends=[],fails=[],lowest=[],successSims=[];let ok=0;for(let i=0;i<paths.length;i++){const sim=simulate(d,{...opts,endYear,returnProvider:y=>paths[i][y]});const good=!sim.firstShortfallYear;if(good)ok++;else fails.push(sim.firstShortfallYear);const last=sim.rows[sim.rows.length-1],years=Math.max(0,(last?last.year:d.assumptions.retirement_start_year)-d.assumptions.retirement_start_year),real=good&&last?last.netWorth/Math.pow(1+d.assumptions.inflation_rate,years):0;ends.push(Math.max(0,real));lowest.push(sim.lowestPortfolioValue);successSims.push(good)}ends.sort((a,b)=>a-b);fails.sort((a,b)=>a-b);lowest.sort((a,b)=>a-b);return {successRate:ok/paths.length,p10RealEnd:percentile(ends,.1),medianRealEnd:percentile(ends,.5),p90RealEnd:percentile(ends,.9),medianFailureYear:fails.length?Math.round(percentile(fails,.5)):null,medianLowest:percentile(lowest,.5),simulations:paths.length,endYear,paths};}

  function stressScenarios(d){return (d.stress_scenarios&&d.stress_scenarios.scenarios)||[
    {id:'early_crash',label:'Early equity crash',equity:{0:-.35,1:-.10,2:.08,3:.07},pension:{0:-.18,1:-.05,2:.06,3:.06}},
    {id:'lost_decade',label:'Prolonged low returns',years:10,equity_return:.01,bond_return:.01,pension_return:.02},
    {id:'inflation_shock',label:'Early inflation shock',inflation_rates:[.06,.05,.04,.03]},
    {id:'double_shock',label:'Crash + lost Barista income',equity:{0:-.30,1:-.08,2:.06},pension:{0:-.15,1:-.04,2:.05},barista_off_years:3}
  ];}
  function runStress(d,opts){opts=opts||{};const out=[];for(const sc of stressScenarios(d)){const start=d.assumptions.retirement_start_year,assets=defaultAssets(d),infl={},off=[];if(sc.inflation_rates){let cumulative=1;for(let i=0;i<sc.inflation_rates.length;i++){cumulative*=1+sc.inflation_rates[i];infl[start+i]=cumulative}for(let y=start+sc.inflation_rates.length;y<=(opts.endYear||2060);y++)infl[y]=(infl[y-1]||1)*(1+d.assumptions.inflation_rate)}if(sc.barista_off_years)for(let i=0;i<sc.barista_off_years;i++)off.push(start+i);const provider=y=>{const i=y-start;if(sc.years&&i<sc.years)return {cash:assets.cash.return,short_bonds:sc.bond_return,growth_bonds:sc.bond_return,equity:sc.equity_return,pension:sc.pension_return};return {cash:assets.cash.return,short_bonds:assets.short_bonds.return,growth_bonds:assets.growth_bonds.return,equity:(sc.equity&&sc.equity[i]!=null)?sc.equity[i]:assets.equity.return,pension:(sc.pension&&sc.pension[i]!=null)?sc.pension[i]:assets.pension.return}};const sim=simulate(d,{...opts,returnProvider:provider,inflationFactors:Object.keys(infl).length?infl:null,baristaOffYears:off});const last=sim.rows[sim.rows.length-1];out.push({id:sc.id,label:sc.label,firstShortfallYear:sim.firstShortfallYear,terminal:last?last.netWorth:0,lowest:sim.lowestPortfolioValue,firstEquitySale:sim.equityStartYear,firstPension:sim.pensionStartYear})}return out}

  function cloneWith(d,fn){const x=clone(d);fn(x);return x}
  function decisionDeltas(d,opts){opts=opts||{};const sims=opts.simulations||((d.decision_analysis||{}).simulations)||500,endYear=opts.endYear||((d.full_plan_monte_carlo||{}).end_year)||2100,paths=generatePaths(d,{simulations:sims,endYear,seed:(d.full_plan_monte_carlo||{}).seed||20261009});const base=monteCarlo(d,{...opts,paths,endYear}),det=simulate(d,{...opts,endYear});const cases=[];const add=(id,label,md,mopts={})=>{let scenarioOpening=mopts.opening||opts.opening;if(opts.opening&&md.assumptions.house_cash_2030!==d.assumptions.house_cash_2030){scenarioOpening={...clone(opts.opening),houseCash:md.assumptions.house_cash_2030,totalAssets:opts.opening.totalAssets+(md.assumptions.house_cash_2030-d.assumptions.house_cash_2030)}}else if(opts.fire&&!mopts.opening){scenarioOpening=buildOpeningState(md,opts.fire,opts.openingMode||((d.opening_balance_policy||{}).default_mode)||'official_plan')}const mc=monteCarlo(md,{...opts,...mopts,opening:scenarioOpening,paths,endYear}),ds=simulate(md,{...opts,...mopts,opening:scenarioOpening,endYear}),last=ds.rows[ds.rows.length-1],baseLast=det.rows[det.rows.length-1];cases.push({id,label,successDeltaPp:(mc.successRate-base.successRate)*100,firstShortfallBase:det.firstShortfallYear,firstShortfallScenario:ds.firstShortfallYear,terminalDelta:(last?last.netWorth:0)-(baseLast?baseLast.netWorth:0),firstEquitySaleDelta:(ds.equityStartYear||9999)-(det.equityStartYear||9999)})};
    add('spend_minus_10k','€10k less annual spending',cloneWith(d,x=>x.assumptions.lifestyle_annual_2030=Math.max(0,x.assumptions.lifestyle_annual_2030-10000)));
    add('barista_plus_10k','€10k additional gross Barista income',cloneWith(d,x=>x.assumptions.barista_income_gross_2030+=10000));
    add('pension_50_vs_55','Pension access 50 vs 55',d,{accessAge:50});
    add('accessible_plus_100k','€100k more accessible capital',cloneWith(d,x=>x.assumptions.house_cash_2030+=100000));
    return {baseline:base,cases,paths};
  }

  function maxSustainableLifestyle(d,opts){opts=opts||{};const cfg=d.lifestyle_spending_lab||{},target=opts.target||cfg.sustainable_success_target||.8,step=cfg.custom_step_annual_2030||1000,lo0=cfg.custom_min_annual_2030||15000,hi0=cfg.custom_max_annual_2030||90000,sims=opts.simulations||cfg.sustainable_search_simulations||800,endYear=opts.endYear||((d.full_plan_monte_carlo||{}).end_year)||2100,paths=generatePaths(d,{simulations:sims,endYear,seed:(d.full_plan_monte_carlo||{}).seed||20261009});let lo=lo0,hi=hi0,best=lo0,bestMc=null;for(let i=0;i<(cfg.sustainable_search_iterations||8)&&lo<=hi;i++){let mid=Math.round(((lo+hi)/2)/step)*step,md=cloneWith(d,x=>x.assumptions.lifestyle_annual_2030=mid),mc=monteCarlo(md,{...opts,paths,endYear});if(mc.successRate>=target){best=mid;bestMc=mc;lo=mid+step}else hi=mid-step}return {annual:best,successRate:(bestMc||monteCarlo(cloneWith(d,x=>x.assumptions.lifestyle_annual_2030=best),{...opts,paths,endYear})).successRate,target,simulations:sims};}

  function validate(d,fire,opts){opts=opts||{};const tests=[],push=(name,ok,detail)=>tests.push({name,ok:!!ok,detail:detail||''});const opening=buildOpeningState(d,fire,'official_plan');const row=officialRow(fire);push('Opening balance reconciles to official accumulation path',!!row&&Math.abs(opening.etf-row.etfs)<.01&&Math.abs(opening.totalPension-row.pension)<.01,'Official Dec-2029 ETF/pension values');push('Household pension ownership reconciles',Math.abs(opening.pensionVictor+opening.pensionRosely-opening.totalPension)<.01);
    const base=simulate(d,{opening,endYear:Math.min(2060,(d.full_plan_monte_carlo||{}).end_year||2100)});push('Annual asset balances are finite',base.rows.every(r=>Number.isFinite(r.netWorth)&&r.netWorth>=-1));
    let v=100000;for(let i=0;i<10;i++)v-=10000;push('Known hand case: €100k less €10k × 10 = €0',Math.abs(v)<.01);
    const zd=clone(d);zd.assumptions.central_return_rate=0;const z=simulate(zd,{opening:{...opening,houseCash:100000,etf:0,etfCostBasis:0,pensionVictor:0,pensionRosely:0,totalPension:0,totalAssets:100000,warnings:[]},endYear:2030,returnProvider:()=>({cash:0,short_bonds:0,growth_bonds:0,equity:0,pension:0}),accessAge:99});push('Zero-return engine test',z.rows.length===1&&Number.isFinite(z.rows[0].netWorth));
    const nt=clone(d);for(const k of ['state_general_brackets','valencia_general_brackets','savings_brackets'])nt.tax_rules[k]=nt.tax_rules[k].map(b=>({...b,rate:0}));nt.tax_rules.employee_social_security_rate=0;const n=simulate(nt,{opening,endYear:2032});push('Zero-tax test',Math.abs(n.totalTax)<.01&&Math.abs(n.totalSS)<.01);
    const noIncome=clone(d);noIncome.assumptions.barista_income_gross_2030=0;const a=simulate(d,{opening,endYear:2060}),b=simulate(noIncome,{opening,endYear:2060});const failOrd=y=>y==null?9999:y;push('No-Barista income cannot delay the first shortfall',failOrd(b.firstShortfallYear)<=failOrd(a.firstShortfallYear));
    const highSpend=clone(d);highSpend.assumptions.lifestyle_annual_2030+=10000;const hs=simulate(highSpend,{opening,endYear:2060});push('Higher spending cannot delay the first shortfall',failOrd(hs.firstShortfallYear)<=failOrd(a.firstShortfallYear));
    const more=clone(d);more.assumptions.house_cash_2030+=100000;const mo=buildOpeningState(more,fire,'official_plan'),ms=simulate(more,{opening:mo,endYear:2060});push('Higher starting accessible capital cannot bring shortfall earlier',failOrd(ms.firstShortfallYear)>=failOrd(a.firstShortfallYear));
    const paths=generatePaths(d,{simulations:80,endYear:2050,seed:12345}),m1=monteCarlo(d,{opening,paths,endYear:2050}),m2=monteCarlo(d,{opening,paths,endYear:2050});push('Monte Carlo reproducibility with fixed paths',m1.successRate===m2.successRate&&m1.medianRealEnd===m2.medianRealEnd);
    const s0=initialPolicyState(d,opening,'three_bucket');push('Three-bucket opening conserves house proceeds',Math.abs(s0.cash+s0.shortBonds+s0.growthBonds+s0.growthEquity-opening.houseCash)<.01,'Pot 1 + Pot 2 + Pot 3 = house proceeds');
    const warnings=[...opening.warnings];if((d.tax_rules&&d.tax_rules.reference)||'')warnings.push('Tax calculations are current-law planning proxies, not forecasts of future law.');if((d.opening_balance_policy||{}).default_mode==='official_plan')warnings.push('Retirement baseline uses the official Dec-2029 plan; live forecast is shown separately.');return {passed:tests.filter(x=>x.ok).length,total:tests.length,tests,warnings,opening};
  }

  function metrics(d,sim){const rows=sim.rows||[],findYear=(who,age)=>yearOf(d.people[who].birth_date)+age,assetAt=y=>{const r=rows.find(x=>x.year===y);return r?r.netWorth:null};return {accessibleCapitalAtRetirement:sim.accessibleStart,protectedSpendingYears:sim.protectedYears,firstCashExhausted:sim.cashEndYear,firstEtfSale:sim.etfStartYear,firstEquitySale:sim.equityStartYear,firstPensionRequired:sim.pensionStartYear,lowestPortfolioValue:sim.lowestPortfolioValue,firstShortfallYear:sim.firstShortfallYear,lifetimeTax:sim.totalTax,victor50:assetAt(findYear('Victor',50)),rosely50:assetAt(findYear('Rosely',50)),victor60:assetAt(findYear('Victor',60)),rosely60:assetAt(findYear('Rosely',60)),victor70:assetAt(findYear('Victor',70)),rosely70:assetAt(findYear('Rosely',70))};}

  return {clone,projectMonthly,buildOpeningState,generalTax,savingsTax,firstFullEligibleYear,simulate,bridgeScenario,generatePaths,monteCarlo,runStress,decisionDeltas,maxSustainableLifestyle,validate,metrics,defaultAssets,bucketConfig};
});
