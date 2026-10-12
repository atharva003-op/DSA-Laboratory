const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const algoDetails = {
  bubble: { name: "Bubble sort", description: "Repeatedly compares adjacent values and swaps them if they are in the wrong order.", complexity: "O(n²)" },
  selection: { name: "Selection sort", description: "Finds the smallest remaining value and moves it to the next sorted position.", complexity: "O(n²)" },
  insertion: { name: "Insertion sort", description: "Builds a sorted section by inserting each new value into its correct position.", complexity: "O(n²)" },
  quick: { name: "Quick sort", description: "Partitions values around a pivot, then sorts the partitions recursively.", complexity: "Average O(n log n)" }
};

let originalArray = [42, 18, 35, 7, 29, 50, 12, 24];
let array = [...originalArray];
let steps = [];
let stepIndex = 0;
let comparisons = 0;
let writes = 0;
let running = false;
let timer = null;
let sortedIndices = new Set();
let currentHighlights = { compare: [], swap: [] };

function parseArray(text, maxItems = 32) {
  const pieces = text.split(",").map(x => x.trim()).filter(Boolean);
  if (!pieces.length) throw new Error("Enter at least one number.");
  if (pieces.length > maxItems) throw new Error(`Please use ${maxItems} values or fewer.`);
  const values = pieces.map(x => Number(x));
  if (values.some(x => !Number.isFinite(x))) throw new Error("Use numbers only, separated by commas.");
  if (values.some(x => Math.abs(x) > 1000000)) throw new Error("Keep each number between -1,000,000 and 1,000,000.");
  return values;
}
function addStep(a, compare = [], swap = [], message = "", comp = 0, write = 0, done = []) {
  steps.push({ a: [...a], compare: [...compare], swap: [...swap], message, comp, write, done: [...done] });
}
function generateSteps(source, type) {
  const a = [...source], out = [];
  const push = (compare = [], swap = [], message = "", comp = 0, write = 0, done = []) => out.push({ a: [...a], compare: [...compare], swap: [...swap], message, comp, write, done: [...done] });
  let comp = 0, write = 0, done = [];
  push([], [], "Ready. Press Run sort or Step to begin.", 0, 0, []);
  if (type === "bubble") {
    for (let i = 0; i < a.length - 1; i++) {
      let changed = false;
      for (let j = 0; j < a.length - i - 1; j++) {
        comp++; push([j, j + 1], [], `Compare ${a[j]} and ${a[j + 1]}.`, comp, write, done);
        if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; write += 2; changed = true; push([], [j, j + 1], `Swap ${a[j + 1]} and ${a[j]}.`, comp, write, done); }
      }
      done.push(a.length - i - 1); push([], [], `Position ${a.length - i} is now sorted.`, comp, write, done);
      if (!changed) break;
    }
  } else if (type === "selection") {
    for (let i = 0; i < a.length - 1; i++) {
      let min = i;
      for (let j = i + 1; j < a.length; j++) {
        comp++; push([min, j], [], `Compare current minimum ${a[min]} with ${a[j]}.`, comp, write, done);
        if (a[j] < a[min]) min = j;
      }
      if (min !== i) { [a[i], a[min]] = [a[min], a[i]]; write += 2; push([], [i, min], `Place ${a[i]} at sorted position ${i}.`, comp, write, done); }
      done.push(i); push([], [], `First ${i + 1} item(s) are sorted.`, comp, write, done);
    }
  } else if (type === "insertion") {
    done = [0];
    for (let i = 1; i < a.length; i++) {
      const key = a[i]; let j = i - 1;
      push([i], [], `Take ${key} and insert it into the sorted section.`, comp, write, done);
      while (j >= 0) {
        comp++; push([j, j + 1], [], `Compare ${a[j]} with ${key}.`, comp, write, done);
        if (a[j] > key) { a[j + 1] = a[j]; write++; push([], [j, j + 1], `Shift ${a[j]} one position right.`, comp, write, done); j--; }
        else break;
      }
      a[j + 1] = key; write++; done = Array.from({ length: i + 1 }, (_, k) => k); push([], [j + 1], `Insert ${key} at index ${j + 1}.`, comp, write, done);
    }
  } else if (type === "quick") {
    function quick(lo, hi) {
      if (lo >= hi) { if (lo === hi) done.push(lo); return; }
      const pivot = a[hi]; let i = lo;
      push([hi], [], `Choose ${pivot} as the pivot.`, comp, write, done);
      for (let j = lo; j < hi; j++) {
        comp++; push([j, hi], [], `Compare ${a[j]} with pivot ${pivot}.`, comp, write, done);
        if (a[j] < pivot) { if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; write += 2; push([], [i, j], `Move ${a[i]} to the left partition.`, comp, write, done); } i++; }
      }
      if (i !== hi) { [a[i], a[hi]] = [a[hi], a[i]]; write += 2; push([], [i, hi], `Place pivot ${pivot} at index ${i}.`, comp, write, done); }
      done.push(i); quick(lo, i - 1); quick(i + 1, hi);
    }
    quick(0, a.length - 1);
  }
  done = Array.from({ length: a.length }, (_, i) => i);
  push([], [], "Sorting complete. Every value is in ascending order.", comp, write, done);
  return out;
}
function renderBars(state = null) {
  const values = state ? state.a : array;
  const compare = state ? state.compare : currentHighlights.compare;
  const swap = state ? state.swap : currentHighlights.swap;
  const done = state ? state.done : [...sortedIndices];
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  $("#barChart").innerHTML = values.map((v, i) => {
    const height = 22 + (v - min) / span * 72;
    let cls = "bar";
    if (done.includes(i)) cls += " sorted";
    if (compare.includes(i)) cls = "bar compare";
    if (swap.includes(i)) cls = "bar swap";
    return `<div class="${cls}" style="height:${height}%" title="Index ${i}: ${v}"><span class="bar-value">${v}</span></div>`;
  }).join("");
  $("#arraySize").textContent = values.length;
}
function updateMetrics(state = null) {
  const s = state || { comp: comparisons, write: writes };
  $("#comparisons").textContent = s.comp;
  $("#swaps").textContent = s.write;
}
function logStep(state, index) {
  const log = $("#logEntries");
  if (index === 0) log.innerHTML = "";
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<b>STEP ${String(index).padStart(2, "0")}</b><span></span>`;
  entry.lastElementChild.textContent = state.message;
  log.prepend(entry);
  while (log.children.length > 5) log.lastElementChild.remove();
  $("#stepCount").textContent = `${index} / ${steps.length - 1} steps`;
}
function stopRun() {
  running = false;
  if (timer) clearTimeout(timer);
  timer = null;
  $("#runSort").textContent = "▶ Run sort";
}
function displayStep(index) {
  stepIndex = Math.max(0, Math.min(index, steps.length - 1));
  const s = steps[stepIndex];
  array = [...s.a]; currentHighlights = { compare: s.compare, swap: s.swap }; sortedIndices = new Set(s.done);
  renderBars(s); updateMetrics(s); logStep(s, stepIndex);
  $("#runStatus").textContent = stepIndex === steps.length - 1 ? "Complete" : stepIndex === 0 ? "Ready to run" : `Step ${stepIndex} of ${steps.length - 1}`;
  if (stepIndex === steps.length - 1) stopRun();
}
function prepareSort(resetInput = false) {
  stopRun();
  try {
    if (resetInput) originalArray = parseArray($("#arrayInput").value);
    array = [...originalArray];
    steps = generateSteps(array, $("#algorithm").value);
    stepIndex = 0; comparisons = 0; writes = 0; sortedIndices = new Set(); currentHighlights = { compare: [], swap: [] };
    $("#logEntries").innerHTML = '<p class="log-empty">Run or step through an algorithm to see what happens here.</p>';
    const detail = algoDetails[$("#algorithm").value];
    $("#algoName").textContent = detail.name; $("#algoDescription").textContent = detail.description; $("#algoComplexity").textContent = detail.complexity;
    renderBars(); updateMetrics(); $("#runStatus").textContent = "Ready to run"; $("#stepCount").textContent = "0 steps";
  } catch (err) { showMessage(err.message); }
}
function showMessage(message) { $("#runStatus").textContent = message; }
function runAnimation() {
  if (running) { stopRun(); return; }
  if (stepIndex >= steps.length - 1) displayStep(0);
  running = true; $("#runSort").textContent = "Ⅱ Pause";
  const delay = [1100, 750, 430, 220, 90][Number($("#speed").value) - 1];
  const tick = () => {
    if (!running) return;
    if (stepIndex >= steps.length - 1) { stopRun(); return; }
    displayStep(stepIndex + 1);
    if (running) timer = setTimeout(tick, delay);
  };
  timer = setTimeout(tick, delay);
}
$("#applyArray").addEventListener("click", () => { try { originalArray = parseArray($("#arrayInput").value); prepareSort(); $("#runStatus").textContent = "Array applied"; } catch (err) { showMessage(err.message); } });
$("#randomArray").addEventListener("click", () => {
  originalArray = Array.from({ length: 8 + Math.floor(Math.random() * 5) }, () => Math.floor(Math.random() * 90) + 5);
  $("#arrayInput").value = originalArray.join(", "); prepareSort();
});
$("#algorithm").addEventListener("change", () => prepareSort());
$("#runSort").addEventListener("click", runAnimation);
$("#stepSort").addEventListener("click", () => { if (running) stopRun(); if (stepIndex < steps.length - 1) displayStep(stepIndex + 1); });
$("#resetSort").addEventListener("click", () => prepareSort());
$("#speed").addEventListener("input", () => { $("#speedLabel").textContent = ["Slowest", "Slow", "Medium", "Fast", "Fastest"][Number($("#speed").value) - 1]; });
prepareSort();

function renderSearchArray(values, checked = [], found = -1, discarded = []) {
  $("#searchItems").innerHTML = values.map((v, i) => {
    let cls = "search-item";
    if (checked.includes(i)) cls += " checked";
    if (discarded.includes(i)) cls += " discarded";
    if (found === i) cls = "search-item found";
    return `<div class="${cls}" data-index="${i}">${v}</div>`;
  }).join("");
}
let searchRunning = false;
async function runSearch() {
  if (searchRunning) return;
  let values, target;
  try { values = parseArray($("#searchArray").value, 40); target = Number($("#targetValue").value); if (!Number.isFinite(target)) throw new Error("Enter a valid target number."); }
  catch (e) { $("#searchStatus").textContent = e.message; return; }
  const method = $("#searchMethod").value;
  if (method === "binary" && values.some((v, i) => i > 0 && v < values[i - 1])) {
    $("#searchStatus").textContent = "Binary search needs ascending sorted data. Sort the array first.";
    $("#searchResult").textContent = "No search performed — the array is not sorted."; return;
  }
  searchRunning = true; $("#runSearch").disabled = true; $("#runSearch").textContent = "Searching…";
  $("#searchHelp").textContent = method === "linear" ? "Checks each item from left to right." : "Checks the middle item and discards half the remaining range.";
  let checked = 0, found = -1, checkedIndexes = [], discarded = [];
  renderSearchArray(values); $("#searchResult").textContent = ""; $("#checkedCount").textContent = "0"; $("#foundIndex").textContent = "—";
  if (method === "linear") {
    for (let i = 0; i < values.length; i++) {
      checked++; checkedIndexes.push(i); renderSearchArray(values, checkedIndexes, -1, discarded);
      $("#searchStatus").textContent = `Checking index ${i}: ${values[i]}`;
      $("#checkedCount").textContent = checked; await wait(380);
      if (values[i] === target) { found = i; break; }
    }
  } else {
    let low = 0, high = values.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2); checked++; checkedIndexes.push(mid);
      renderSearchArray(values, checkedIndexes, -1, discarded);
      $("#searchStatus").textContent = `Range ${low}–${high}. Checking middle index ${mid}: ${values[mid]}`;
      $("#checkedCount").textContent = checked; await wait(500);
      if (values[mid] === target) { found = mid; break; }
      if (values[mid] < target) { for (let k = low; k <= mid; k++)if (k !== mid) discarded.push(k); low = mid + 1; }
      else { for (let k = low; k <= mid; k++)if (k !== mid) discarded.push(k); high = mid - 1; }
      renderSearchArray(values, checkedIndexes, -1, discarded);
    }
  }
  renderSearchArray(values, checkedIndexes, found, discarded);
  if (found >= 0) { $("#searchStatus").textContent = "Target found!"; $("#searchResult").textContent = `Found ${target} at index ${found} after checking ${checked} item(s).`; $("#foundIndex").textContent = found; }
  else { $("#searchStatus").textContent = "Search complete."; $("#searchResult").textContent = `${target} was not found in this array.`; $("#foundIndex").textContent = "Not found"; }
  searchRunning = false; $("#runSearch").disabled = false; $("#runSearch").textContent = "Search for target ↗";
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
$("#runSearch").addEventListener("click", runSearch);
$("#searchMethod").addEventListener("change", () => { $("#searchHelp").textContent = $("#searchMethod").value === "binary" ? "Binary search requires values sorted in ascending order." : "Linear search checks each item from left to right."; });
$("#searchArray").addEventListener("change", () => { try { const a = parseArray($("#searchArray").value, 40); renderSearchArray(a); $("#searchStatus").textContent = "Array updated."; } catch (e) { $("#searchStatus").textContent = e.message; } });

const structureMeta = {
  stack: { symbol: "▤", name: "Stack", definition: "Last In, First Out (LIFO)", complexity: "Push / pop O(1)", input: "VALUE TO PUSH", insert: "Push value", remove: "Pop", empty: "Stack is empty. Push a value to begin.", cap: 12 },
  queue: { symbol: "⇥", name: "Queue", definition: "First In, First Out (FIFO)", complexity: "Enqueue / dequeue O(1)", input: "VALUE TO ENQUEUE", insert: "Enqueue", remove: "Dequeue", empty: "Queue is empty. Enqueue a value to begin.", cap: 12 },
  linked: { symbol: "↔", name: "Linked list", definition: "Nodes connected in sequence", complexity: "Insert head O(1)", input: "VALUE TO ADD", insert: "Add to head", remove: "Remove head", empty: "List is empty. Add a node to begin.", cap: 12 }
};
let activeStructure = "stack";
let structureData = { stack: ["12", "24", "36"], queue: ["12", "24", "36"], linked: ["12", "24", "36"] };
function renderStructure(message = null, error = false) {
  const meta = structureMeta[activeStructure], data = structureData[activeStructure];
  $("#structureSymbol").textContent = meta.symbol; $("#structureName").textContent = meta.name; $("#structureDefinition").textContent = meta.definition; $("#structureComplexity").textContent = meta.complexity; $("#structureInputLabel").textContent = meta.input; $("#insertStructure").textContent = meta.insert; $("#removeStructure").textContent = meta.remove;
  const visual = $("#structureVisual");
  if (!data.length) visual.innerHTML = `<span class="empty-structure">${meta.empty}</span>`;
  else if (activeStructure === "stack") visual.innerHTML = `<div class="stack-column">${data.map((v, i) => `<div class="structure-node ${i === data.length - 1 ? 'primary' : ''}">${escapeHTML(v)}${i === data.length - 1 ? '<small>TOP</small>' : ''}</div>`).join("")}</div>`;
  else visual.innerHTML = data.map((v, i) => `${i > 0 ? '<span class="structure-arrow">→</span>' : ''}<div class="structure-node ${i === 0 ? 'primary' : ''}">${escapeHTML(v)}${activeStructure === "queue" && i === 0 ? '<small>FRONT</small>' : ""}${activeStructure === "queue" && i === data.length - 1 ? '<small>REAR</small>' : ""}</div>`).join("") + (activeStructure === "linked" ? '<span class="structure-arrow">→ NULL</span>' : "");
  $("#structureMessage").textContent = message || `${data.length} item(s) in ${meta.name.toLowerCase()}.`;
  $("#structureMessage").classList.toggle("error", error);
}
function escapeHTML(v) { return String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
$$(".structure-tab").forEach(btn => btn.addEventListener("click", () => {
  activeStructure = btn.dataset.structure;
  $$(".structure-tab").forEach(b => { const active = b === btn; b.classList.toggle("active", active); b.setAttribute("aria-selected", String(active)); });
  renderStructure();
}));
$("#insertStructure").addEventListener("click", () => {
  const value = $("#structureValue").value.trim();
  const data = structureData[activeStructure], meta = structureMeta[activeStructure];
  if (!value) { renderStructure("Enter a value before inserting.", true); $("#structureValue").focus(); return; }
  if (data.length >= meta.cap) { renderStructure(`Limit reached (${meta.cap} items). Remove an item before adding more.`, true); return; }
  if (activeStructure === "linked") data.unshift(value); else data.push(value);
  $("#structureValue").value = "";
  renderStructure(activeStructure === "stack" ? `Pushed ${value} onto the top of the stack.` : activeStructure === "queue" ? `Enqueued ${value} at the rear of the queue.` : `Added ${value} as a new head node.`);
});
$("#removeStructure").addEventListener("click", () => {
  const data = structureData[activeStructure];
  if (!data.length) { renderStructure("Nothing to remove — this structure is empty.", true); return; }
  let value;
  if (activeStructure === "queue" || activeStructure === "linked") value = data.shift(); else value = data.pop();
  renderStructure(activeStructure === "stack" ? `Popped ${value} from the top.` : activeStructure === "queue" ? `Dequeued ${value} from the front.` : `Removed ${value} from the head.`);
});
$("#clearStructure").addEventListener("click", () => { structureData[activeStructure] = []; renderStructure("Cleared. The structure is now empty."); });
renderStructure();

$("#menuBtn").addEventListener("click", () => $("#navLinks").classList.toggle("open"));
$$('#navLinks a').forEach(a => a.addEventListener("click", () => $("#navLinks").classList.remove("open")));
