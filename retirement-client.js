/* Bounded, session-only cache keyed by all inputs, including opening state and seed. */
let retirementWorker;
let retirementRequestId = 0;
const retirementPending = new Map();
const retirementCache = new Map();
function rCalculationStatus(message) {
  const element = document.querySelector('#rCalculationStatus');
  if (element) element.textContent = message;
}
function rWorkerCall(method, data, options = {}) {
  const key = JSON.stringify([method, data, options]);
  if (retirementCache.has(key)) return retirementCache.get(key);
  const promise = new Promise((resolve, reject) => {
    try {
      if (!retirementWorker) {
        retirementWorker = new Worker('retirement-worker.js');
        retirementWorker.onmessage = ({data: message}) => {
          const pending = retirementPending.get(message.id);
          if (!pending) return;
          retirementPending.delete(message.id);
          if (message.error) pending.reject(new Error(message.error));
          else pending.resolve(message.result);
          rCalculationStatus(retirementPending.size
            ? 'Calculating full simulations… You can keep using the tabs.'
            : 'Full simulations complete.');
        };
        const failed = () => {
          retirementWorker.terminate();
          retirementWorker = null;
          for (const pending of retirementPending.values()) pending.reject(new Error('Background calculation unavailable'));
          retirementPending.clear();
          retirementCache.clear();
          rCalculationStatus('Calculation failed. Select a scenario or reopen Retirement to retry.');
        };
        retirementWorker.onerror = failed;
        retirementWorker.onmessageerror = failed;
      }
      const id = ++retirementRequestId;
      retirementPending.set(id, {resolve, reject});
      rCalculationStatus('Calculating full simulations… You can keep using the tabs.');
      try { retirementWorker.postMessage({id, method, data, options}); }
      catch (error) { retirementPending.delete(id); throw error; }
    } catch (error) { reject(error); }
  });
  retirementCache.set(key, promise);
  if (retirementCache.size > 32) retirementCache.delete(retirementCache.keys().next().value);
  promise.catch(() => { if (retirementCache.get(key) === promise) retirementCache.delete(key); });
  return promise;
}
