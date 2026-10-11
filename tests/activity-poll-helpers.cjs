// Older smoke fixtures jump their clocks. Supply the fresh zero-key poll a real
// Windows adapter would have sent before each simulated main-process tick.
async function mockActivityPolling(page){
 await page.waitForFunction(()=>typeof window.activity==='function'&&typeof window.clock==='function');
 await page.evaluate(()=>{
  const receive=window.activity,check=window.clock;let signal=null;
  window.activity=next=>{signal=next;receive(next);};
  window.clock=()=>{if(signal)receive({...signal,typingCount:0});check();};
 });
}
module.exports={mockActivityPolling};
