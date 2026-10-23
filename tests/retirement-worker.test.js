const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../retirement-engine');
const d = require('../retirement-data.json');
const fire = require('../data.json');
const compact = x => JSON.parse(JSON.stringify(x, (k,v) => k === 'paths' ? undefined : v));
let message;
const context = vm.createContext({self:{FireRetirementEngine:E,postMessage:x=>message=x},importScripts:name=>assert.equal(name,'retirement-engine.js')});
vm.runInContext(fs.readFileSync(require.resolve('../retirement-worker.js'),'utf8'),context);
const opening=E.buildOpeningState(d,fire,'official_plan');
for(const [method,options] of [
 ['monteCarlo',{opening,simulations:1500,endYear:2100,seed:20261009}],
 ['maxSustainableLifestyle',{opening,simulations:800,endYear:2100}],
 ['decisionDeltas',{opening,fire,simulations:250,endYear:2100}],
 ['validate',fire]
]){
 context.self.onmessage({data:{id:1,method,data:d,options}});
 assert.equal(message.error,undefined);
 assert.deepEqual(compact(message.result),compact(E[method](d,options)),method+' must match direct engine');
}
context.self.onmessage({data:{id:2,method:'unknown',data:d,options:{}}});
assert.equal(message.id,2);assert.match(message.error,/Unsupported/);
console.log('Worker parity: full Monte Carlo, sustainable search, decision deltas, validation and error handling passed');
