/* Same engine and seeded paths as the direct model; no DOM or financial defaults here. */
importScripts('retirement-engine.js');
self.onmessage = ({data: {id, method, data, options}}) => {
  try {
    const engine = self.FireRetirementEngine;
    const allowed = ['monteCarlo', 'maxSustainableLifestyle', 'decisionDeltas', 'validate'];
    let result;
    if (method === 'policyComparison') {
      const paths = engine.generatePaths(data, options);
      result = {
        cur: engine.monteCarlo(data, {...options, paths, policy: 'current_waterfall'}),
        mix: engine.monteCarlo(data, {...options, paths, policy: 'three_bucket'})
      };
    } else if (allowed.includes(method)) {
      result = engine[method](data, options);
    } else {
      throw new Error('Unsupported calculation');
    }
    // Paths are internal to comparisons; do not copy thousands of paths into the UI.
    const compact = JSON.parse(JSON.stringify(result, (key, value) => key === 'paths' ? undefined : value));
    self.postMessage({id, result: compact});
  } catch (error) {
    self.postMessage({id, error: error.message});
  }
};
