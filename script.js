const STORAGE_KEY = 'placeThingValidatorDemoState';

const initialState = {
  run: null,
  places: [],
  objects: [],
  challenges: [],
};

let state = loadState();

const panels = Array.from(document.querySelectorAll('.panel'));
const stepItems = Array.from(document.querySelectorAll('.step-list li'));
const placesList = document.getElementById('placesList');
const objectsList = document.getElementById('objectsList');
const challengeResult = document.getElementById('challengeResult');
const objectPlaceSelect = document.getElementById('objectPlaceSelect');
const challengeObjectSelect = document.getElementById('challengeObjectSelect');

const runForm = document.getElementById('runForm');
const placeForm = document.getElementById('placeForm');
const objectForm = document.getElementById('objectForm');
const challengeForm = document.getElementById('challengeForm');

const statusText = document.getElementById('statusText');
const statusMeta = document.getElementById('statusMeta');
const metricPlaces = document.getElementById('metricPlaces');
const metricObjects = document.getElementById('metricObjects');
const metricChallenges = document.getElementById('metricChallenges');
const metricTrust = document.getElementById('metricTrust');
const resultsSummary = document.getElementById('resultsSummary');

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : structuredClone(initialState);
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function navigate(step) {
  panels.forEach((panel) => panel.classList.toggle('active', panel.id === step));
  stepItems.forEach((item) => item.classList.toggle('active', item.dataset.step === step));
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalize(text) {
  return (text || '').toLowerCase().trim();
}

function renderEntityList(container, items, type) {
  if (!items.length) {
    container.className = 'entity-list empty';
    container.textContent = type === 'place' ? 'No places mapped yet.' : 'No objects captured yet.';
    return;
  }

  container.className = 'entity-list';
  container.innerHTML = items.map((item) => {
    if (type === 'place') {
      return `
        <article class="entity-card">
          <h4>${escapeHtml(item.name)}</h4>
          <p>${escapeHtml(item.description || 'No description yet.')}</p>
          <div class="tag-row">
            <span class="tag">${escapeHtml(item.placeType)}</span>
            ${item.parentPlace ? `<span class="tag">Parent: ${escapeHtml(item.parentPlace)}</span>` : ''}
            <span class="tag">Shots: ${item.captures.length}</span>
          </div>
        </article>
      `;
    }

    return `
      <article class="entity-card">
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(item.notes || 'No notes yet.')}</p>
        <div class="tag-row">
          <span class="tag">${escapeHtml(item.category || 'uncategorized')}</span>
          <span class="tag">Place: ${escapeHtml(resolvePlaceName(item.placeId))}</span>
          <span class="tag">Quality: ${escapeHtml(item.quality)}</span>
        </div>
      </article>
    `;
  }).join('');
}

function resolvePlaceName(placeId) {
  return state.places.find((place) => place.id === placeId)?.name || 'Unknown place';
}

function populateSelects() {
  const placeOptions = ['<option value="">Choose a mapped place</option>']
    .concat(state.places.map((place) => `<option value="${place.id}">${escapeHtml(place.name)}</option>`))
    .join('');
  objectPlaceSelect.innerHTML = placeOptions;

  const objectOptions = ['<option value="">Optional</option>']
    .concat(state.objects.map((object) => `<option value="${object.id}">${escapeHtml(object.name)}</option>`))
    .join('');
  challengeObjectSelect.innerHTML = objectOptions;
}

function computeRecommendation() {
  if (!state.challenges.length) {
    return 'No evaluation summary yet. Add a few places and objects, then run challenge queries.';
  }

  const correct = state.challenges.filter((c) => c.correct).length;
  const trust = state.challenges.reduce((sum, c) => sum + c.trustScore, 0) / state.challenges.length;
  const accuracy = correct / state.challenges.length;

  if (accuracy >= 0.75 && trust >= 4) {
    return 'Strong signal. This looks like a Go for a richer MVP, with photo-first capture still the right default.';
  }
  if (accuracy >= 0.5 && trust >= 3) {
    return 'Promising but not clean yet. Refine capture guidance, place taxonomy, and ambiguity handling before scaling.';
  }
  return 'Weak signal so far. The concept likely needs prompt, workflow, or retrieval redesign before a larger build.';
}

function renderChallengeResult() {
  const latest = state.challenges[state.challenges.length - 1];
  if (!latest) {
    challengeResult.className = 'entity-list empty';
    challengeResult.textContent = 'No challenge run yet.';
    return;
  }

  challengeResult.className = 'entity-list';
  challengeResult.innerHTML = `
    <article class="entity-card">
      <h4>${escapeHtml(latest.queryText)}</h4>
      <p>Predicted match: ${escapeHtml(latest.predictedLabel)}</p>
      <div class="tag-row">
        <span class="tag">Type: ${escapeHtml(latest.queryType)}</span>
        <span class="tag">Confidence: ${(latest.confidence * 100).toFixed(0)}%</span>
        <span class="tag">Trust: ${latest.trustScore}/5</span>
        <span class="tag">${latest.correct ? 'Correct' : 'Needs review'}</span>
      </div>
    </article>
  `;
}

function renderStatus() {
  if (!state.run) {
    statusText.textContent = 'Draft';
    statusMeta.textContent = 'No run active yet';
    return;
  }

  statusText.textContent = state.run.name;
  statusMeta.textContent = `${state.places.length} places, ${state.objects.length} objects, ${state.challenges.length} challenges`;
}

function renderMetrics() {
  metricPlaces.textContent = String(state.places.length);
  metricObjects.textContent = String(state.objects.length);
  metricChallenges.textContent = String(state.challenges.length);
  const trust = state.challenges.length
    ? state.challenges.reduce((sum, c) => sum + c.trustScore, 0) / state.challenges.length
    : 0;
  metricTrust.textContent = trust.toFixed(1);
  resultsSummary.textContent = computeRecommendation();
}

function render() {
  renderEntityList(placesList, state.places, 'place');
  renderEntityList(objectsList, state.objects, 'object');
  populateSelects();
  renderChallengeResult();
  renderStatus();
  renderMetrics();
}

function inferChallenge(queryText, queryType, expectedObjectId) {
  const q = normalize(queryText);
  let bestObject = null;
  let bestScore = -1;

  for (const object of state.objects) {
    let score = 0;
    const objectText = normalize(`${object.name} ${object.category} ${object.notes}`);
    const placeName = normalize(resolvePlaceName(object.placeId));

    q.split(/\s+/).forEach((token) => {
      if (!token || token.length < 3) return;
      if (objectText.includes(token)) score += 2;
      if (placeName.includes(token)) score += 3;
    });

    if (queryType === 'place' && placeName && q.includes(placeName.split(' ')[0])) score += 2;
    if (queryType === 'object' && objectText) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestObject = object;
    }
  }

  const confidence = Math.max(0.28, Math.min(0.94, 0.38 + Math.max(bestScore, 0) * 0.08));
  const correct = expectedObjectId ? bestObject?.id === expectedObjectId : Boolean(bestObject);
  const trustScore = correct ? (confidence > 0.75 ? 5 : 4) : (confidence > 0.75 ? 2 : 3);

  return {
    id: uid('challenge'),
    queryText,
    queryType,
    expectedObjectId: expectedObjectId || null,
    predictedObjectId: bestObject?.id || null,
    predictedLabel: bestObject ? `${bestObject.name} in ${resolvePlaceName(bestObject.placeId)}` : 'No confident match',
    confidence,
    trustScore,
    correct,
    createdAt: new Date().toISOString(),
  };
}

function exportRun() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.run?.name || 'place-thing-validator-run'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function resetDemo() {
  if (!confirm('Reset all local demo data for this app?')) return;
  state = structuredClone(initialState);
  saveState();
  navigate('overview');
}

function loadDemoData() {
  state = {
    run: {
      id: uid('run'),
      name: 'Workshop + cellar pilot',
      environmentType: 'mixed',
      notes: 'Testing whether place memory improves retrieval trust.',
      createdAt: new Date().toISOString(),
    },
    places: [
      {
        id: uid('place'),
        name: 'Electronics cabinet drawer 2',
        placeType: 'drawer',
        parentPlace: 'Electronics cabinet',
        description: 'Middle drawer with adapters, testers, and small tools.',
        captures: ['overview', 'alternate', 'detail', 'hardmode'],
        varianceNotes: 'Dim lighting, repeated small tools, moderate clutter.',
      },
      {
        id: uid('place'),
        name: 'Workshop shelf A top',
        placeType: 'shelf',
        parentPlace: 'Workshop shelf A',
        description: 'Top shelf with boxes, battery tools, and consumables.',
        captures: ['overview', 'alternate', 'detail'],
        varianceNotes: 'Strong side lighting, mixed object sizes.',
      },
    ],
    objects: [],
    challenges: [],
  };

  state.objects = [
    {
      id: uid('object'),
      name: 'Black cable tester',
      category: 'electronics tool',
      placeId: state.places[0].id,
      quality: 'cluttered',
      notes: 'Small black tester near adapters and short cables.',
    },
    {
      id: uid('object'),
      name: 'Blue Bosch drill',
      category: 'power tool',
      placeId: state.places[1].id,
      quality: 'good',
      notes: 'Blue compact drill stored near battery packs.',
    },
  ];

  state.challenges = [
    inferChallenge('Find the black cable tester from the electronics cabinet', 'joint', state.objects[0].id),
    inferChallenge('Find the blue Bosch drill', 'object', state.objects[1].id),
  ];

  saveState();
  navigate('results');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

runForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(runForm);
  state.run = {
    id: uid('run'),
    name: form.get('name'),
    environmentType: form.get('environmentType'),
    notes: form.get('notes'),
    createdAt: new Date().toISOString(),
  };
  saveState();
  navigate('places');
});

placeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(placeForm);
  const captures = form.getAll('captures');
  state.places.push({
    id: uid('place'),
    name: form.get('name'),
    placeType: form.get('placeType'),
    parentPlace: form.get('parentPlace'),
    description: form.get('description'),
    captures,
    varianceNotes: form.get('varianceNotes'),
  });
  placeForm.reset();
  saveState();
});

objectForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(objectForm);
  state.objects.push({
    id: uid('object'),
    name: form.get('name'),
    category: form.get('category'),
    placeId: form.get('placeId'),
    quality: form.get('quality'),
    notes: form.get('notes'),
  });
  objectForm.reset();
  saveState();
});

challengeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(challengeForm);
  const result = inferChallenge(
    String(form.get('queryText')),
    String(form.get('queryType')),
    String(form.get('expectedObjectId') || '') || null,
  );
  state.challenges.push(result);
  saveState();
});

document.querySelectorAll('[data-nav]').forEach((button) => {
  button.addEventListener('click', () => navigate(button.dataset.nav));
});

document.querySelector('[data-fill-demo]')?.addEventListener('click', loadDemoData);
document.getElementById('exportBtn').addEventListener('click', exportRun);
document.getElementById('resetBtn').addEventListener('click', resetDemo);

render();
