const STATE_KEY = 'placeThingValidatorStateV2';
const SETTINGS_KEY = 'placeThingValidatorSettingsV2';
const DB_NAME = 'placeThingValidatorDB';
const DB_VERSION = 1;
const DEFAULT_MODEL = 'gpt-4o-mini';
const PLACE_PROMPT_VERSION = 'place-v1';
const OBJECT_PROMPT_VERSION = 'object-v1';

const DEFAULT_STATE = {
  run: null,
  places: [],
  objects: [],
  queryTests: [],
  ui: {
    activeStep: 'overview',
  },
};

const DEFAULT_SETTINGS = {
  model: DEFAULT_MODEL,
  rememberKey: false,
  apiKey: '',
};

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'onto', 'inside', 'near',
  'please', 'there', 'here', 'where', 'which', 'what', 'find', 'locate', 'need', 'want',
  'get', 'show', 'give', 'look', 'looking', 'stored', 'store', 'thing', 'item', 'object',
]);

let state = loadState();
let settings = loadSettings();
let sessionApiKey = settings.rememberKey ? settings.apiKey : '';
let flashTimer = null;
let renderToken = 0;
const liveObjectUrls = [];

const refs = {
  panels: Array.from(document.querySelectorAll('.panel')),
  stepItems: Array.from(document.querySelectorAll('.step-list li')),
  flash: document.getElementById('flash'),
  apiForm: document.getElementById('apiForm'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  modelInput: document.getElementById('modelInput'),
  rememberKeyInput: document.getElementById('rememberKeyInput'),
  testConnectionBtn: document.getElementById('testConnectionBtn'),
  clearApiBtn: document.getElementById('clearApiBtn'),
  runForm: document.getElementById('runForm'),
  placeForm: document.getElementById('placeForm'),
  objectForm: document.getElementById('objectForm'),
  challengeForm: document.getElementById('challengeForm'),
  exportBtn: document.getElementById('exportBtn'),
  resetBtn: document.getElementById('resetBtn'),
  analyzeAllPlacesBtn: document.getElementById('analyzeAllPlacesBtn'),
  inferAllObjectsBtn: document.getElementById('inferAllObjectsBtn'),
  loadDemoBtn: document.querySelector('[data-fill-demo]'),
  placesList: document.getElementById('placesList'),
  objectsList: document.getElementById('objectsList'),
  challengeResult: document.getElementById('challengeResult'),
  resultsDetails: document.getElementById('resultsDetails'),
  placeParentSelect: document.getElementById('placeParentSelect'),
  objectPlaceSelect: document.getElementById('objectPlaceSelect'),
  challengeObjectSelect: document.getElementById('challengeObjectSelect'),
  challengePlaceSelect: document.getElementById('challengePlaceSelect'),
  statusText: document.getElementById('statusText'),
  statusMeta: document.getElementById('statusMeta'),
  apiStatusText: document.getElementById('apiStatusText'),
  apiStatusMeta: document.getElementById('apiStatusMeta'),
  metricPlaces: document.getElementById('metricPlaces'),
  metricPlaceAnalyses: document.getElementById('metricPlaceAnalyses'),
  metricObjects: document.getElementById('metricObjects'),
  metricObjectInferences: document.getElementById('metricObjectInferences'),
  metricPlaceTop1: document.getElementById('metricPlaceTop1'),
  metricPlaceTop3: document.getElementById('metricPlaceTop3'),
  metricJointTop1: document.getElementById('metricJointTop1'),
  metricChallenges: document.getElementById('metricChallenges'),
  resultsSummary: document.getElementById('resultsSummary'),
  buildRecommendation: document.getElementById('buildRecommendation'),
};

boot();

function boot() {
  document.querySelectorAll('.capture-preview').forEach((preview) => {
    preview.dataset.emptyLabel = preview.textContent.trim();
  });

  hydrateApiForm();
  bindEvents();
  navigate(state.ui?.activeStep || 'overview', { save: false });
  void render();
}

function bindEvents() {
  refs.stepItems.forEach((item) => {
    item.addEventListener('click', () => navigate(item.dataset.step));
  });

  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.nav));
  });

  document.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', () => {
      void updatePreviewForInput(input);
    });
  });

  refs.apiForm.addEventListener('submit', handleApiSubmit);
  refs.testConnectionBtn.addEventListener('click', () => {
    void runButtonTask(refs.testConnectionBtn, refs.testConnectionBtn.textContent, testOpenAIConnection);
  });
  refs.clearApiBtn.addEventListener('click', clearApiKey);
  refs.runForm.addEventListener('submit', handleRunSubmit);
  refs.placeForm.addEventListener('submit', (event) => {
    void handlePlaceSubmit(event);
  });
  refs.objectForm.addEventListener('submit', (event) => {
    void handleObjectSubmit(event);
  });
  refs.challengeForm.addEventListener('submit', handleChallengeSubmit);
  refs.exportBtn.addEventListener('click', () => {
    void exportRun();
  });
  refs.resetBtn.addEventListener('click', () => {
    void resetAllData();
  });
  refs.loadDemoBtn?.addEventListener('click', loadDemoData);
  refs.analyzeAllPlacesBtn.addEventListener('click', () => {
    void analyzeAllPlaces();
  });
  refs.inferAllObjectsBtn.addEventListener('click', () => {
    void inferAllObjects();
  });

  refs.placesList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const placeId = button.dataset.placeId;
    if (!placeId) return;

    if (button.dataset.action === 'analyze-place') {
      void runButtonTask(button, button.textContent, () => analyzePlace(placeId));
    }

    if (button.dataset.action === 'delete-place') {
      void deletePlace(placeId);
    }
  });

  refs.objectsList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const objectId = button.dataset.objectId;
    if (!objectId) return;

    if (button.dataset.action === 'infer-object') {
      void runButtonTask(button, button.textContent, () => inferObject(objectId));
    }

    if (button.dataset.action === 'delete-object') {
      void deleteObject(objectId);
    }
  });

  window.addEventListener('beforeunload', revokeLiveObjectUrls);
}

function hydrateApiForm() {
  refs.modelInput.value = settings.model || DEFAULT_MODEL;
  refs.rememberKeyInput.checked = Boolean(settings.rememberKey);
  refs.apiKeyInput.value = settings.rememberKey ? settings.apiKey : '';
}

function loadState() {
  const fallback = deepClone(DEFAULT_STATE);

  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed?.challenges) && !Array.isArray(parsed?.queryTests)) {
      parsed.queryTests = parsed.challenges;
    }

    return {
      ...fallback,
      ...parsed,
      places: Array.isArray(parsed?.places) ? parsed.places : [],
      objects: Array.isArray(parsed?.objects) ? parsed.objects : [],
      queryTests: Array.isArray(parsed?.queryTests) ? parsed.queryTests : [],
      ui: {
        ...fallback.ui,
        ...(parsed?.ui || {}),
      },
    };
  } catch {
    return fallback;
  }
}

function loadSettings() {
  const fallback = deepClone(DEFAULT_SETTINGS);

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      model: safeString(parsed?.model) || DEFAULT_MODEL,
      rememberKey: Boolean(parsed?.rememberKey),
      apiKey: Boolean(parsed?.rememberKey) ? safeString(parsed?.apiKey) : '',
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function saveSettings() {
  const persisted = {
    model: safeString(settings.model) || DEFAULT_MODEL,
    rememberKey: Boolean(settings.rememberKey),
    apiKey: settings.rememberKey ? safeString(settings.apiKey) : '',
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(persisted));
}

function handleApiSubmit(event) {
  event.preventDefault();

  settings.model = safeString(refs.modelInput.value) || DEFAULT_MODEL;
  settings.rememberKey = refs.rememberKeyInput.checked;

  if (settings.rememberKey) {
    settings.apiKey = safeString(refs.apiKeyInput.value);
    sessionApiKey = settings.apiKey;
  } else {
    sessionApiKey = safeString(refs.apiKeyInput.value);
    settings.apiKey = '';
    refs.apiKeyInput.value = '';
  }

  saveSettings();
  updateApiStatus();
  setBanner(
    getApiKey()
      ? 'OpenAI settings saved. The key stays local to this browser.'
      : 'Model setting saved. Add a key when you want to run AI analysis.',
    'success',
    4000,
  );
}

function clearApiKey() {
  settings.apiKey = '';
  settings.rememberKey = false;
  sessionApiKey = '';
  refs.apiKeyInput.value = '';
  refs.rememberKeyInput.checked = false;
  saveSettings();
  updateApiStatus();
  setBanner('OpenAI key cleared from this browser.', 'success', 3000);
}

async function testOpenAIConnection() {
  if (!getApiKey()) {
    navigate('overview');
    setBanner('Add your OpenAI key first, then test the connection.', 'warn', 5000);
    return;
  }

  const result = await callOpenAIJson({
    systemPrompt: 'You are a connectivity check. Return strict JSON only.',
    userText: '{"status":"ok","purpose":"connectivity-check"}',
    imageEntries: [],
  });

  settings.model = result.model;
  refs.modelInput.value = result.model;
  saveSettings();
  updateApiStatus();
  setBanner(`AI connection works. Active model: ${result.model}.`, 'success', 4500);
}

function handleRunSubmit(event) {
  event.preventDefault();
  const form = new FormData(refs.runForm);

  state.run = {
    id: state.run?.id || uid('run'),
    name: safeString(form.get('name')),
    environmentType: safeString(form.get('environmentType')),
    notes: safeString(form.get('notes')),
    status: 'active',
    createdAt: state.run?.createdAt || new Date().toISOString(),
    promptVersion: OBJECT_PROMPT_VERSION,
    modelVersion: settings.model || DEFAULT_MODEL,
  };

  saveState();
  navigate('places');
  void render();
  setBanner(`Run saved, ${state.run.name}.`, 'success', 3500);
}

async function handlePlaceSubmit(event) {
  event.preventDefault();
  if (!ensureRun()) return;

  const form = new FormData(refs.placeForm);
  const requiredInputs = ['overviewFile', 'alternateFile', 'detailFile'];
  const missingRequired = requiredInputs.some((name) => !refs.placeForm.elements[name].files[0]);
  if (missingRequired) {
    setBanner('Please capture overview, alternate, and detail shots before saving the place.', 'error', 5000);
    return;
  }

  const placeId = uid('place');
  const captureSpecs = [
    ['overviewFile', 'overview'],
    ['alternateFile', 'alternate'],
    ['detailFile', 'detail'],
    ['hardmodeFile', 'hardmode'],
  ];

  const assetIds = [];
  setBanner('Saving place photos...', 'warn');

  for (const [inputName, captureType] of captureSpecs) {
    const file = refs.placeForm.elements[inputName].files[0];
    if (!file) continue;
    const asset = await createAssetFromFile(file, {
      entityType: 'place',
      entityId: placeId,
      captureType,
    });
    assetIds.push(asset.id);
  }

  state.places.push({
    id: placeId,
    runId: state.run.id,
    name: safeString(form.get('name')),
    placeType: safeString(form.get('placeType')),
    parentPlaceId: safeString(form.get('parentPlaceId')) || null,
    description: safeString(form.get('description')),
    varianceNotes: safeString(form.get('varianceNotes')),
    assetIds,
    status: 'mapped',
    createdAt: new Date().toISOString(),
    aiSummary: null,
    aiState: 'idle',
    aiError: '',
  });

  refs.placeForm.reset();
  clearFormPreviews(refs.placeForm);
  saveState();
  await render();
  setBanner('Mapped place saved. You can analyze it with AI now.', 'success', 3500);
}

async function handleObjectSubmit(event) {
  event.preventDefault();
  if (!ensureRun()) return;
  if (!state.places.length) {
    setBanner('Map at least one place before capturing objects.', 'warn', 5000);
    navigate('places');
    return;
  }

  const form = new FormData(refs.objectForm);
  const contextFile = refs.objectForm.elements.contextFile.files[0];
  if (!contextFile) {
    setBanner('Please capture the object-in-context photo before saving the object.', 'error', 5000);
    return;
  }

  const objectId = uid('object');
  const captureSpecs = [
    ['contextFile', 'context'],
    ['alternateObjectFile', 'alternate'],
  ];

  const assetIds = [];
  setBanner('Saving object photos...', 'warn');

  for (const [inputName, captureType] of captureSpecs) {
    const file = refs.objectForm.elements[inputName].files[0];
    if (!file) continue;
    const asset = await createAssetFromFile(file, {
      entityType: 'object',
      entityId: objectId,
      captureType,
    });
    assetIds.push(asset.id);
  }

  state.objects.push({
    id: objectId,
    runId: state.run.id,
    name: safeString(form.get('name')),
    category: safeString(form.get('category')),
    placeId: safeString(form.get('placeId')),
    quality: safeString(form.get('quality')) || 'good',
    notes: safeString(form.get('notes')),
    assetIds,
    status: 'captured',
    createdAt: new Date().toISOString(),
    inference: null,
    aiState: 'idle',
    aiError: '',
  });

  refs.objectForm.reset();
  clearFormPreviews(refs.objectForm);
  saveState();
  await render();
  setBanner('Object capture saved. You can run AI inference now.', 'success', 3500);
}

function handleChallengeSubmit(event) {
  event.preventDefault();
  if (!state.objects.length) {
    setBanner('Capture at least one object before running challenge mode.', 'warn', 4000);
    navigate('objects');
    return;
  }

  const form = new FormData(refs.challengeForm);
  const queryText = safeString(form.get('queryText'));
  const queryType = safeString(form.get('queryType')) || 'joint';
  const expectedObjectId = safeString(form.get('expectedObjectId')) || null;
  const expectedPlaceId = safeString(form.get('expectedPlaceId')) || null;

  const result = runChallenge(queryText, queryType, expectedObjectId, expectedPlaceId);
  state.queryTests.push(result);
  saveState();
  void render();

  if (result.correct === true) {
    setBanner('Challenge recorded, top result matches the expected truth.', 'success', 3500);
  } else if (result.correct === false) {
    setBanner('Challenge recorded, the top result missed the expected truth.', 'warn', 4000);
  } else {
    setBanner('Challenge recorded.', 'success', 3000);
  }
}

function ensureRun() {
  if (state.run) return true;
  setBanner('Create a run first so the PoC data has a proper container.', 'warn', 4500);
  navigate('run');
  return false;
}

async function runButtonTask(button, idleText, task) {
  button.disabled = true;
  const originalText = idleText;
  button.textContent = 'Working...';
  try {
    await task();
  } catch (error) {
    console.error(error);
    setBanner(error?.message || 'That action failed.', 'error', 6000);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function analyzeAllPlaces() {
  if (!state.places.length) {
    setBanner('There are no places to analyze yet.', 'warn', 3000);
    return;
  }
  if (!getApiKey()) {
    navigate('overview');
    setBanner('Add your OpenAI key in Overview first.', 'warn', 5000);
    return;
  }

  for (let index = 0; index < state.places.length; index += 1) {
    const place = state.places[index];
    setBanner(`Analyzing place ${index + 1}/${state.places.length}, ${place.name}...`, 'warn');
    try {
      await analyzePlace(place.id, { silent: true });
    } catch (error) {
      console.error(error);
      setBanner(`Stopped during place analysis: ${error.message}`, 'error', 7000);
      return;
    }
  }

  setBanner('Finished analyzing all mapped places.', 'success', 4500);
}

async function inferAllObjects() {
  if (!state.objects.length) {
    setBanner('There are no objects to infer yet.', 'warn', 3000);
    return;
  }
  if (!state.places.length) {
    setBanner('Map at least one place first.', 'warn', 3500);
    return;
  }
  if (!getApiKey()) {
    navigate('overview');
    setBanner('Add your OpenAI key in Overview first.', 'warn', 5000);
    return;
  }

  for (let index = 0; index < state.objects.length; index += 1) {
    const object = state.objects[index];
    setBanner(`Inferring object ${index + 1}/${state.objects.length}, ${object.name}...`, 'warn');
    try {
      await inferObject(object.id, { silent: true });
    } catch (error) {
      console.error(error);
      setBanner(`Stopped during object inference: ${error.message}`, 'error', 7000);
      return;
    }
  }

  setBanner('Finished inferring all captured objects.', 'success', 4500);
}

function requireApiKeyOrJump() {
  if (getApiKey()) return true;
  navigate('overview');
  throw new Error('Add your OpenAI key in Overview first.');
}

async function analyzePlace(placeId, { silent = false } = {}) {
  requireApiKeyOrJump();
  const place = getPlace(placeId);
  if (!place) throw new Error('Place not found.');

  place.aiState = 'working';
  place.aiError = '';
  saveState();
  await render();

  try {
    const assets = await getAssets(place.assetIds);
    if (!assets.length) throw new Error('This place has no saved images yet.');

    const systemPrompt = [
      'You are analyzing storage-place photos for a retrieval validation PoC.',
      'Return strict JSON only.',
      'Do not invent unsupported specifics.',
      'Focus on visible contextual cues that distinguish one place from another.',
      'Use concise language and return arrays for cue lists.',
    ].join(' ');

    const userText = `
Return JSON with this shape:
{
  "canonicalLabel": "...",
  "placeTypeGuess": "...",
  "conciseDescription": "...",
  "visibleContextCues": ["..."],
  "distinguishingFeatures": ["..."],
  "likelyConfusions": ["..."],
  "retrievalKeywords": ["..."],
  "confidence": 0.0,
  "shouldHedge": false,
  "notes": "..."
}

Place metadata:
${JSON.stringify(
      {
        id: place.id,
        name: place.name,
        placeType: place.placeType,
        parentPlaceLabel: resolvePlaceName(place.parentPlaceId),
        description: place.description,
        varianceNotes: place.varianceNotes,
      },
      null,
      2,
    )}

The images belong to the same place.
Capture what would help later place matching from object-in-context photos.
`;

    const result = await callOpenAIJson({
      systemPrompt,
      userText,
      imageEntries: assets.map((asset) => ({
        label: `Place reference image, ${asset.captureType}`,
        blob: asset.blob,
      })),
    });

    place.aiSummary = {
      promptVersion: PLACE_PROMPT_VERSION,
      model: result.model,
      createdAt: new Date().toISOString(),
      rawText: result.rawText,
      normalized: normalizePlaceSummary(result.parsed),
    };
    place.aiState = 'done';
    place.aiError = '';

    if (!silent) {
      setBanner(`AI place memory saved for ${place.name}.`, 'success', 4000);
    }
  } catch (error) {
    place.aiState = 'error';
    place.aiError = error?.message || 'AI place analysis failed.';
    throw error;
  } finally {
    saveState();
    await render();
  }
}

async function inferObject(objectId, { silent = false } = {}) {
  requireApiKeyOrJump();
  const object = getObject(objectId);
  if (!object) throw new Error('Object not found.');
  if (!state.places.length) throw new Error('Map at least one place before running inference.');

  object.aiState = 'working';
  object.aiError = '';
  saveState();
  await render();

  try {
    const objectAssets = await getAssets(object.assetIds);
    if (!objectAssets.length) throw new Error('This object has no saved images yet.');

    const knownPlaces = state.places.map((place) => ({
      id: place.id,
      name: place.name,
      placeType: place.placeType,
      parentPlaceLabel: resolvePlaceName(place.parentPlaceId),
      manualDescription: place.description,
      varianceNotes: place.varianceNotes,
      aiSummary: place.aiSummary?.normalized || null,
    }));

    const referenceImages = [];
    for (const place of state.places) {
      const refAssetId = place.assetIds?.[0];
      if (!refAssetId) continue;
      const refAsset = await getAsset(refAssetId);
      if (!refAsset?.blob) continue;
      referenceImages.push({
        label: `Reference place image for ${place.id}, ${place.name}, ${refAsset.captureType}`,
        blob: refAsset.blob,
      });
    }

    const systemPrompt = [
      'You are evaluating an object-in-context image against a known place-memory index for a retrieval PoC.',
      'Return strict JSON only.',
      'You must distinguish the object from the surrounding place context.',
      'predictedPlaceId must be one of the supplied known place ids, or null if evidence is insufficient.',
      'Use uncertainty honestly. Return alternative candidates when appropriate.',
    ].join(' ');

    const userText = `
Return JSON with this shape:
{
  "place": {
    "predictedPlaceId": "place_123 or null",
    "predictedLabel": "...",
    "candidates": [
      {"placeId": "place_123", "label": "...", "confidence": 0.0}
    ]
  },
  "object": {
    "predictedLabel": "...",
    "category": "...",
    "candidates": [
      {"label": "...", "confidence": 0.0}
    ]
  },
  "scene": {
    "lighting": "...",
    "clutter": "...",
    "occlusion": "..."
  },
  "retrieval": {
    "confidenceOverall": 0.0,
    "ambiguityFlags": ["..."],
    "shouldHedge": false,
    "evidenceSummary": "..."
  },
  "explanation": "..."
}

KNOWN_PLACES_JSON:
${JSON.stringify(knownPlaces, null, 2)}

OBJECT_RECORD:
${JSON.stringify(
      {
        name: object.name,
        category: object.category,
        notes: object.notes,
        captureQuality: object.quality,
      },
      null,
      2,
    )}

You will first see object images, then representative place images.
Use both the object and the background context.
`;

    const result = await callOpenAIJson({
      systemPrompt,
      userText,
      imageEntries: [
        ...objectAssets.map((asset, index) => ({
          label: `Object capture ${index + 1}, ${asset.captureType}`,
          blob: asset.blob,
        })),
        ...referenceImages,
      ],
    });

    object.inference = {
      promptVersion: OBJECT_PROMPT_VERSION,
      model: result.model,
      createdAt: new Date().toISOString(),
      rawText: result.rawText,
      normalized: normalizeObjectInference(result.parsed),
    };
    object.aiState = 'done';
    object.aiError = '';

    if (!silent) {
      const predictedPlaceId = object.inference.normalized.place.predictedPlaceId;
      const correctPlace = predictedPlaceId && predictedPlaceId === object.placeId;
      setBanner(
        correctPlace
          ? `Inference complete, it picked the right place for ${object.name}.`
          : `Inference complete for ${object.name}. Review the result and ambiguity flags.`,
        correctPlace ? 'success' : 'warn',
        4500,
      );
    }
  } catch (error) {
    object.aiState = 'error';
    object.aiError = error?.message || 'AI inference failed.';
    throw error;
  } finally {
    saveState();
    await render();
  }
}

async function callOpenAIJson({ systemPrompt, userText, imageEntries = [] }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No OpenAI key is set in this browser.');

  const content = [{ type: 'text', text: userText.trim() }];

  for (const entry of imageEntries) {
    content.push({ type: 'text', text: entry.label });
    content.push({
      type: 'image_url',
      image_url: {
        url: await blobToDataUrl(entry.blob),
      },
    });
  }

  const modelCandidates = buildModelCandidates();
  let lastError = null;

  for (const model of modelCandidates) {
    const basePayload = {
      model,
      temperature: 0.2,
      max_tokens: 1800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
    };

    let payload = {
      ...basePayload,
      response_format: { type: 'json_object' },
    };

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error('Network or browser error while contacting OpenAI. Check connectivity, key, and browser support.');
    }

    let data = await safeJson(response);

    if (!response.ok && mentionsResponseFormatIssue(data)) {
      payload = { ...basePayload };
      try {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        throw new Error('Network or browser error while contacting OpenAI. Check connectivity, key, and browser support.');
      }
      data = await safeJson(response);
    }

    if (!response.ok) {
      lastError = new Error(describeOpenAIError(data, response.status));
      if (shouldTryAnotherModel(data, response.status, model, modelCandidates)) {
        continue;
      }
      throw lastError;
    }

    const rawText = extractContentText(data?.choices?.[0]?.message?.content);
    const parsed = parseJsonLoose(rawText);
    if (!parsed) {
      throw new Error('OpenAI returned a response, but I could not parse valid JSON from it.');
    }

    return {
      model: data?.model || model,
      rawText,
      parsed,
    };
  }

  throw lastError || new Error('No compatible OpenAI model worked for this request.');
}

function mentionsResponseFormatIssue(payload) {
  const message = safeString(payload?.error?.message).toLowerCase();
  return message.includes('response_format') || message.includes('json_object') || message.includes('json schema');
}

function describeOpenAIError(payload, status) {
  const message = safeString(payload?.error?.message);
  if (message) return message;
  return `OpenAI request failed with status ${status}.`;
}

function buildModelCandidates() {
  return Array.from(new Set([
    safeString(settings.model) || DEFAULT_MODEL,
    DEFAULT_MODEL,
    'gpt-4o-mini',
    'gpt-4.1-mini',
  ].filter(Boolean)));
}

function shouldTryAnotherModel(payload, status, model, modelCandidates) {
  if (model === modelCandidates[modelCandidates.length - 1]) return false;
  const message = safeString(payload?.error?.message).toLowerCase();
  const code = safeString(payload?.error?.code).toLowerCase();
  if (code === 'model_not_found') return true;
  if (message.includes('model') && (message.includes('not found') || message.includes('does not exist') || message.includes('not have access') || message.includes('access to') || message.includes('unavailable'))) {
    return true;
  }
  return status === 404;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function extractContentText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part?.type === 'text') return part.text || '';
      return '';
    })
    .join('\n');
}

function parseJsonLoose(text) {
  const trimmed = safeString(text).trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenced = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(fenced);
  } catch {
    // continue
  }

  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const sliced = fenced.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch {
      return null;
    }
  }

  return null;
}

function normalizePlaceSummary(raw) {
  return {
    canonicalLabel: safeString(raw?.canonicalLabel || raw?.label || ''),
    placeTypeGuess: safeString(raw?.placeTypeGuess || raw?.type || ''),
    conciseDescription: safeString(raw?.conciseDescription || raw?.description || ''),
    visibleContextCues: normalizeStringArray(raw?.visibleContextCues),
    distinguishingFeatures: normalizeStringArray(raw?.distinguishingFeatures),
    likelyConfusions: normalizeStringArray(raw?.likelyConfusions),
    retrievalKeywords: normalizeStringArray(raw?.retrievalKeywords),
    confidence: normalizeConfidence(raw?.confidence),
    shouldHedge: Boolean(raw?.shouldHedge),
    notes: safeString(raw?.notes || ''),
  };
}

function normalizeObjectInference(raw) {
  const predictedPlaceId = resolvePlaceIdFromAny(
    raw?.place?.predictedPlaceId || raw?.place?.placeId || raw?.place?.id || raw?.place?.predictedLabel,
  );

  return {
    place: {
      predictedPlaceId,
      predictedLabel: safeString(raw?.place?.predictedLabel || resolvePlaceName(predictedPlaceId) || ''),
      candidates: normalizePlaceCandidates(raw?.place?.candidates),
    },
    object: {
      predictedLabel: safeString(raw?.object?.predictedLabel || raw?.object?.label || ''),
      category: safeString(raw?.object?.category || ''),
      candidates: normalizeObjectCandidates(raw?.object?.candidates),
    },
    scene: {
      lighting: safeString(raw?.scene?.lighting || ''),
      clutter: safeString(raw?.scene?.clutter || ''),
      occlusion: safeString(raw?.scene?.occlusion || ''),
    },
    retrieval: {
      confidenceOverall: normalizeConfidence(raw?.retrieval?.confidenceOverall || raw?.confidenceOverall),
      ambiguityFlags: normalizeStringArray(raw?.retrieval?.ambiguityFlags || raw?.ambiguityFlags),
      shouldHedge: Boolean(raw?.retrieval?.shouldHedge || raw?.shouldHedge),
      evidenceSummary: safeString(raw?.retrieval?.evidenceSummary || raw?.evidenceSummary || ''),
    },
    explanation: safeString(raw?.explanation || ''),
  };
}

function normalizePlaceCandidates(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((candidate) => {
      const placeId = resolvePlaceIdFromAny(candidate?.placeId || candidate?.id || candidate?.label);
      return {
        placeId,
        label: safeString(candidate?.label || resolvePlaceName(placeId) || ''),
        confidence: normalizeConfidence(candidate?.confidence),
      };
    })
    .filter((candidate) => candidate.placeId || candidate.label);
}

function normalizeObjectCandidates(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((candidate) => ({
      label: safeString(candidate?.label || candidate?.name || ''),
      confidence: normalizeConfidence(candidate?.confidence),
    }))
    .filter((candidate) => candidate.label);
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => safeString(item)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number > 1 && number <= 100) return clamp(number / 100, 0, 1);
  return clamp(number, 0, 1);
}

function runChallenge(queryText, queryType, expectedObjectId, expectedPlaceId) {
  const tokens = tokenize(queryText);
  const rankedResults = state.objects
    .map((object) => scoreObjectForQuery(object, tokens, queryText, queryType))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const topResult = rankedResults[0] || null;
  const secondScore = rankedResults[1]?.score || 0;
  const margin = topResult ? topResult.score - secondScore : 0;

  let confidence = 0.18;
  if (topResult) {
    confidence = clamp(0.22 + Math.min(topResult.score, 18) * 0.035 + Math.max(margin, 0) * 0.04, 0.18, 0.97);
  }

  let correct = null;
  if (queryType === 'negative' && !expectedObjectId && !expectedPlaceId) {
    correct = !topResult || topResult.score < 2;
  } else if (expectedObjectId && expectedPlaceId) {
    correct = topResult ? topResult.objectId === expectedObjectId && topResult.placeId === expectedPlaceId : false;
  } else if (expectedObjectId) {
    correct = topResult ? topResult.objectId === expectedObjectId : false;
  } else if (expectedPlaceId) {
    correct = topResult ? topResult.placeId === expectedPlaceId : false;
  }

  const trustScore = topResult
    ? Math.max(1, Math.min(5, Math.round(2 + confidence * 2 + Math.min(margin, 4) * 0.25)))
    : queryType === 'negative' ? 4 : 2;

  return {
    id: uid('query'),
    queryText,
    queryType,
    expectedObjectId,
    expectedPlaceId,
    rankedResults,
    topObjectId: topResult?.objectId || null,
    topPlaceId: topResult?.placeId || null,
    confidence,
    trustScore,
    correct,
    createdAt: new Date().toISOString(),
  };
}

function scoreObjectForQuery(object, tokens, queryText, queryType) {
  const place = getPlace(object.placeId);
  const objectInference = object.inference?.normalized || null;
  const placeSummary = place?.aiSummary?.normalized || null;

  const objectName = normalizeText(object.name);
  const objectCategory = normalizeText(object.category);
  const placeName = normalizeText(place?.name || '');
  const notes = normalizeText(object.notes);
  const description = normalizeText(place?.description || '');
  const cues = normalizeText([
    ...(placeSummary?.visibleContextCues || []),
    ...(placeSummary?.distinguishingFeatures || []),
    ...(placeSummary?.retrievalKeywords || []),
  ].join(' '));
  const predictedObject = normalizeText(objectInference?.object?.predictedLabel || '');
  const predictedPlace = normalizeText(objectInference?.place?.predictedLabel || '');

  let score = 0;
  const evidence = new Set();
  const queryNorm = normalizeText(queryText);
  const haystack = [objectName, objectCategory, placeName, notes, description, cues, predictedObject, predictedPlace]
    .filter(Boolean)
    .join(' ');

  for (const token of tokens) {
    if (objectName.includes(token)) {
      score += 4;
      evidence.add(`object:${token}`);
    }
    if (objectCategory.includes(token)) {
      score += 2.5;
      evidence.add(`category:${token}`);
    }
    if (placeName.includes(token)) {
      score += queryType === 'place' ? 4.5 : 3.5;
      evidence.add(`place:${token}`);
    }
    if (notes.includes(token)) {
      score += 1.5;
      evidence.add(`notes:${token}`);
    }
    if (description.includes(token) || cues.includes(token)) {
      score += queryType === 'place' ? 2.8 : 1.8;
      evidence.add(`context:${token}`);
    }
    if (predictedObject.includes(token) || predictedPlace.includes(token)) {
      score += 1.4;
      evidence.add(`ai:${token}`);
    }
  }

  if (queryNorm && haystack.includes(queryNorm)) {
    score += 5;
    evidence.add('exact-ish phrase');
  }

  if (queryType === 'joint' && evidence.size >= 2) score += 2;
  if (queryType === 'ambiguous') score *= 0.9;
  if (queryType === 'negative') score = Math.max(0, score - 2);

  return {
    objectId: object.id,
    placeId: object.placeId,
    label: `${object.name} in ${place?.name || 'Unknown place'}`,
    score,
    evidence: Array.from(evidence),
    objectName: object.name,
    placeName: place?.name || 'Unknown place',
  };
}

async function exportRun() {
  const assetIds = collectAllAssetIds();
  const assetManifest = [];
  for (const assetId of assetIds) {
    const asset = await getAsset(assetId);
    if (!asset) continue;
    assetManifest.push({
      id: asset.id,
      entityType: asset.entityType,
      entityId: asset.entityId,
      captureType: asset.captureType,
      mimeType: asset.mimeType,
      size: asset.size,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt,
    });
  }

  const bundle = {
    exportedAt: new Date().toISOString(),
    app: 'place-thing-validator',
    state,
    assetManifest,
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(state.run?.name || 'place-thing-validator-run')}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setBanner('Run JSON exported. Images remain local in the browser.', 'success', 3500);
}

async function resetAllData() {
  const ok = confirm('Reset all local run data and stored images for this browser?');
  if (!ok) return;

  state = deepClone(DEFAULT_STATE);
  saveState();
  await clearAllAssets();
  refs.runForm.reset();
  refs.placeForm.reset();
  refs.objectForm.reset();
  refs.challengeForm.reset();
  clearFormPreviews(refs.placeForm);
  clearFormPreviews(refs.objectForm);
  navigate('overview');
  await render();
  setBanner('All local run data and images were reset.', 'success', 4000);
}

function loadDemoData() {
  const placeA = uid('place');
  const placeB = uid('place');
  const objectA = uid('object');
  const objectB = uid('object');

  state = {
    run: {
      id: uid('run'),
      name: 'Workshop + cellar pilot',
      environmentType: 'mixed',
      notes: 'Demo dataset for UX walkthrough and retrieval scoring.',
      status: 'active',
      createdAt: new Date().toISOString(),
      promptVersion: OBJECT_PROMPT_VERSION,
      modelVersion: settings.model || DEFAULT_MODEL,
    },
    places: [
      {
        id: placeA,
        runId: 'demo',
        name: 'Electronics cabinet drawer 2',
        placeType: 'drawer',
        parentPlaceId: null,
        description: 'Middle drawer with adapters, testers, and small tools.',
        varianceNotes: 'Dim light and repeated small black tools.',
        assetIds: [],
        status: 'mapped',
        createdAt: new Date().toISOString(),
        aiState: 'done',
        aiError: '',
        aiSummary: {
          promptVersion: PLACE_PROMPT_VERSION,
          model: settings.model || DEFAULT_MODEL,
          createdAt: new Date().toISOString(),
          rawText: '',
          normalized: {
            canonicalLabel: 'electronics cabinet drawer 2',
            placeTypeGuess: 'drawer',
            conciseDescription: 'A medium drawer with dark tools, cable adapters, and dividers.',
            visibleContextCues: ['drawer rails', 'small electronics tools', 'compact black adapters'],
            distinguishingFeatures: ['dense small tools', 'shallow drawer geometry'],
            likelyConfusions: ['tool cabinet middle drawer'],
            retrievalKeywords: ['drawer', 'electronics', 'tester', 'adapters'],
            confidence: 0.84,
            shouldHedge: false,
            notes: 'Strong place identity when drawer edges are visible.',
          },
        },
      },
      {
        id: placeB,
        runId: 'demo',
        name: 'Workshop shelf A top',
        placeType: 'shelf',
        parentPlaceId: null,
        description: 'Top shelf with battery tools, blue cases, and cartons.',
        varianceNotes: 'Side lighting and mixed box sizes.',
        assetIds: [],
        status: 'mapped',
        createdAt: new Date().toISOString(),
        aiState: 'done',
        aiError: '',
        aiSummary: {
          promptVersion: PLACE_PROMPT_VERSION,
          model: settings.model || DEFAULT_MODEL,
          createdAt: new Date().toISOString(),
          rawText: '',
          normalized: {
            canonicalLabel: 'workshop shelf a top',
            placeTypeGuess: 'shelf',
            conciseDescription: 'An upper shelf with power-tool cases and cartons.',
            visibleContextCues: ['blue tool cases', 'top shelf angle', 'stacked cartons'],
            distinguishingFeatures: ['high shelf perspective', 'larger items'],
            likelyConfusions: ['adjacent shelf section'],
            retrievalKeywords: ['shelf', 'bosch', 'boxes', 'top'],
            confidence: 0.81,
            shouldHedge: false,
            notes: 'Blue tool cases are the strongest cue.',
          },
        },
      },
    ],
    objects: [
      {
        id: objectA,
        runId: 'demo',
        name: 'Black cable tester',
        category: 'electronics tool',
        placeId: placeA,
        quality: 'cluttered',
        notes: 'Small rectangular tester near adapters and short cables.',
        assetIds: [],
        status: 'captured',
        createdAt: new Date().toISOString(),
        aiState: 'done',
        aiError: '',
        inference: {
          promptVersion: OBJECT_PROMPT_VERSION,
          model: settings.model || DEFAULT_MODEL,
          createdAt: new Date().toISOString(),
          rawText: '',
          normalized: {
            place: {
              predictedPlaceId: placeA,
              predictedLabel: 'Electronics cabinet drawer 2',
              candidates: [
                { placeId: placeA, label: 'Electronics cabinet drawer 2', confidence: 0.84 },
                { placeId: placeB, label: 'Workshop shelf A top', confidence: 0.24 },
              ],
            },
            object: {
              predictedLabel: 'Black cable tester',
              category: 'electronics tool',
              candidates: [
                { label: 'Black cable tester', confidence: 0.78 },
                { label: 'Multimeter', confidence: 0.31 },
              ],
            },
            scene: {
              lighting: 'dim',
              clutter: 'medium',
              occlusion: 'partial',
            },
            retrieval: {
              confidenceOverall: 0.74,
              ambiguityFlags: ['similar small tools nearby'],
              shouldHedge: true,
              evidenceSummary: 'Drawer edges and small electronics context support the place match.',
            },
            explanation: 'The object appears in a shallow drawer with compact electronics accessories.',
          },
        },
      },
      {
        id: objectB,
        runId: 'demo',
        name: 'Blue Bosch drill',
        category: 'power tool',
        placeId: placeB,
        quality: 'good',
        notes: 'Blue compact drill stored near battery packs.',
        assetIds: [],
        status: 'captured',
        createdAt: new Date().toISOString(),
        aiState: 'done',
        aiError: '',
        inference: {
          promptVersion: OBJECT_PROMPT_VERSION,
          model: settings.model || DEFAULT_MODEL,
          createdAt: new Date().toISOString(),
          rawText: '',
          normalized: {
            place: {
              predictedPlaceId: placeB,
              predictedLabel: 'Workshop shelf A top',
              candidates: [
                { placeId: placeB, label: 'Workshop shelf A top', confidence: 0.88 },
                { placeId: placeA, label: 'Electronics cabinet drawer 2', confidence: 0.14 },
              ],
            },
            object: {
              predictedLabel: 'Blue Bosch drill',
              category: 'power tool',
              candidates: [
                { label: 'Blue Bosch drill', confidence: 0.83 },
                { label: 'Cordless driver', confidence: 0.35 },
              ],
            },
            scene: {
              lighting: 'good',
              clutter: 'low',
              occlusion: 'none',
            },
            retrieval: {
              confidenceOverall: 0.86,
              ambiguityFlags: [],
              shouldHedge: false,
              evidenceSummary: 'Blue cases and shelf context strongly support the prediction.',
            },
            explanation: 'The top-shelf environment and power-tool context are distinctive.',
          },
        },
      },
    ],
    queryTests: [],
    ui: {
      activeStep: 'results',
    },
  };

  state.queryTests.push(
    runChallenge('Find the black cable tester from the electronics cabinet', 'joint', objectA, placeA),
    runChallenge('Find the blue Bosch drill', 'object', objectB, placeB),
  );

  saveState();
  refs.runForm.reset();
  refs.placeForm.reset();
  refs.objectForm.reset();
  refs.challengeForm.reset();
  clearFormPreviews(refs.placeForm);
  clearFormPreviews(refs.objectForm);
  navigate('results');
  void render();
  setBanner('Demo data loaded.', 'success', 2500);
}

async function deletePlace(placeId) {
  const place = getPlace(placeId);
  if (!place) return;

  const affectedPlaceIds = new Set(collectChildPlaceIds(placeId));
  const affectedPlaces = state.places.filter((entry) => affectedPlaceIds.has(entry.id));
  const linkedObjects = state.objects.filter((object) => affectedPlaceIds.has(object.placeId));
  const message = linkedObjects.length || affectedPlaces.length > 1
    ? `Delete ${place.name}, ${affectedPlaces.length - 1} child place(s), and ${linkedObjects.length} linked object record(s)?`
    : `Delete ${place.name}?`;
  if (!confirm(message)) return;

  for (const affectedPlace of affectedPlaces) {
    await deleteAssets(affectedPlace.assetIds);
  }
  for (const object of linkedObjects) {
    await deleteAssets(object.assetIds);
  }

  const linkedObjectIds = new Set(linkedObjects.map((object) => object.id));

  state.places = state.places.filter((entry) => !affectedPlaceIds.has(entry.id));
  state.objects = state.objects.filter((object) => !linkedObjectIds.has(object.id));
  state.queryTests = state.queryTests.filter((query) => {
    if (query.expectedPlaceId && affectedPlaceIds.has(query.expectedPlaceId)) return false;
    if (query.expectedObjectId && linkedObjectIds.has(query.expectedObjectId)) return false;
    return true;
  });

  saveState();
  await render();
  setBanner(`Deleted ${place.name}.`, 'success', 3000);
}

async function deleteObject(objectId) {
  const object = getObject(objectId);
  if (!object) return;
  if (!confirm(`Delete ${object.name}?`)) return;

  await deleteAssets(object.assetIds);
  state.objects = state.objects.filter((entry) => entry.id !== objectId);
  state.queryTests = state.queryTests.filter((query) => query.expectedObjectId !== objectId);
  saveState();
  await render();
  setBanner(`Deleted ${object.name}.`, 'success', 3000);
}

function getPlace(placeId) {
  return state.places.find((place) => place.id === placeId) || null;
}

function getObject(objectId) {
  return state.objects.find((object) => object.id === objectId) || null;
}

function collectChildPlaceIds(rootPlaceId) {
  const collected = new Set([rootPlaceId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const place of state.places) {
      if (place.parentPlaceId && collected.has(place.parentPlaceId) && !collected.has(place.id)) {
        collected.add(place.id);
        changed = true;
      }
    }
  }

  return Array.from(collected);
}

function resolvePlaceName(placeId) {
  return getPlace(placeId)?.name || '';
}

function resolvePlaceIdFromAny(value) {
  const raw = safeString(value);
  if (!raw) return null;
  const direct = getPlace(raw);
  if (direct) return direct.id;
  const target = normalizeText(raw);
  const byName = state.places.find((place) => {
    const placeName = normalizeText(place.name);
    return placeName === target || placeName.includes(target) || target.includes(placeName);
  });
  return byName?.id || null;
}

function navigate(step, { save = true } = {}) {
  refs.panels.forEach((panel) => panel.classList.toggle('active', panel.id === step));
  refs.stepItems.forEach((item) => item.classList.toggle('active', item.dataset.step === step));
  state.ui.activeStep = step;
  if (save) saveState();
}

async function render() {
  const token = ++renderToken;
  revokeLiveObjectUrls();
  populateSelects();
  updateRunStatus();
  updateApiStatus();
  renderMetricsAndSummary();
  renderChallengeResult();
  await renderPlacesList(token);
  if (token !== renderToken) return;
  await renderObjectsList(token);
  if (token !== renderToken) return;
  await renderResultsDetails(token);
}

function populateSelects() {
  const placeOptions = ['<option value="">Optional</option>']
    .concat(state.places.map((place) => `<option value="${place.id}">${escapeHtml(place.name)}</option>`))
    .join('');

  refs.placeParentSelect.innerHTML = placeOptions;
  refs.challengePlaceSelect.innerHTML = placeOptions;

  refs.objectPlaceSelect.innerHTML = ['<option value="">Choose a mapped place</option>']
    .concat(state.places.map((place) => `<option value="${place.id}">${escapeHtml(place.name)}</option>`))
    .join('');

  refs.challengeObjectSelect.innerHTML = ['<option value="">Optional</option>']
    .concat(state.objects.map((object) => `<option value="${object.id}">${escapeHtml(object.name)}</option>`))
    .join('');
}

function updateRunStatus() {
  if (!state.run) {
    refs.statusText.textContent = 'Draft';
    refs.statusMeta.textContent = 'No run active yet';
    return;
  }

  refs.statusText.textContent = state.run.name;
  refs.statusMeta.textContent = `${state.places.length} places, ${state.objects.length} objects, ${state.queryTests.length} challenges`;
}

function updateApiStatus() {
  const apiKey = getApiKey();
  const model = settings.model || DEFAULT_MODEL;
  if (apiKey) {
    refs.apiStatusText.textContent = 'Ready';
    refs.apiStatusMeta.textContent = `${model}, key ${settings.rememberKey ? 'stored locally' : 'in memory only'}`;
  } else {
    refs.apiStatusText.textContent = 'Key not set';
    refs.apiStatusMeta.textContent = `Model ${model}, add a key in Overview`;
  }
}

async function renderPlacesList(token) {
  if (!state.places.length) {
    refs.placesList.className = 'entity-list empty';
    refs.placesList.textContent = 'No places mapped yet.';
    return;
  }

  const cards = [];
  for (const place of state.places) {
    if (token !== renderToken) return;
    const assets = await getAssets(place.assetIds);
    const ai = place.aiSummary?.normalized || null;
    const aiStateTag = place.aiState === 'working'
      ? '<span class="tag warn">AI running...</span>'
      : place.aiError
        ? '<span class="tag bad">AI failed</span>'
        : ai
          ? '<span class="tag good">AI analyzed</span>'
          : '<span class="tag warn">AI pending</span>';
    const tags = [
      `<span class="tag">${escapeHtml(place.placeType || 'place')}</span>`,
      place.parentPlaceId ? `<span class="tag">Parent: ${escapeHtml(resolvePlaceName(place.parentPlaceId))}</span>` : '',
      `<span class="tag">Shots: ${assets.length}</span>`,
      aiStateTag,
    ].filter(Boolean).join('');

    const aiBlock = ai
      ? `
        <div class="list-block">
          <strong>AI place memory</strong>
          <p>${escapeHtml(ai.conciseDescription || 'No summary text returned.')}</p>
          <div class="tag-row">
            <span class="tag">Confidence ${(ai.confidence * 100).toFixed(0)}%</span>
            ${ai.shouldHedge ? '<span class="tag warn">Should hedge</span>' : '<span class="tag good">Stable cue set</span>'}
          </div>
          ${renderListBlock('Context cues', ai.visibleContextCues)}
          ${renderListBlock('Distinguishing features', ai.distinguishingFeatures)}
          ${renderListBlock('Likely confusions', ai.likelyConfusions)}
        </div>
      `
      : `
        <div>
          <p class="caption">Run AI place analysis after capturing the photos.</p>
          ${place.aiError ? `<p class="caption error-text">Last AI error: ${escapeHtml(place.aiError)}</p>` : ''}
        </div>
      `;

    cards.push(`
      <article class="entity-card">
        <div>
          <h4>${escapeHtml(place.name)}</h4>
          <p>${escapeHtml(place.description || 'No manual description yet.')}</p>
        </div>
        <div class="tag-row">${tags}</div>
        ${renderAssetStrip(assets)}
        ${aiBlock}
        <div class="button-row">
          <button class="subtle" data-action="analyze-place" data-place-id="${place.id}">${ai ? 'Re-run AI analysis' : 'Analyze with AI'}</button>
          <button class="ghost danger" data-action="delete-place" data-place-id="${place.id}">Delete</button>
        </div>
      </article>
    `);
  }

  refs.placesList.className = 'entity-list';
  refs.placesList.innerHTML = cards.join('');
}

async function renderObjectsList(token) {
  if (!state.objects.length) {
    refs.objectsList.className = 'entity-list empty';
    refs.objectsList.textContent = 'No objects captured yet.';
    return;
  }

  const cards = [];
  for (const object of state.objects) {
    if (token !== renderToken) return;
    const assets = await getAssets(object.assetIds);
    const inference = object.inference?.normalized || null;
    const predictedPlaceId = inference?.place?.predictedPlaceId || null;
    const placeCorrect = predictedPlaceId ? predictedPlaceId === object.placeId : null;
    const inferenceStateTag = object.aiState === 'working'
      ? '<span class="tag warn">AI running...</span>'
      : object.aiError
        ? '<span class="tag bad">AI failed</span>'
        : inference
          ? `<span class="tag ${placeCorrect ? 'good' : 'warn'}">${placeCorrect ? 'Top-1 place hit' : 'Review prediction'}</span>`
          : '<span class="tag warn">Inference pending</span>';

    const tags = [
      object.category ? `<span class="tag">${escapeHtml(object.category)}</span>` : '<span class="tag">uncategorized</span>',
      `<span class="tag">Place: ${escapeHtml(resolvePlaceName(object.placeId) || 'Unknown')}</span>`,
      `<span class="tag">Quality: ${escapeHtml(object.quality)}</span>`,
      inferenceStateTag,
    ].join('');

    const inferenceBlock = inference
      ? `
        <div class="list-block">
          <strong>AI inference</strong>
          <div class="kv-grid">
            <div class="row"><span>Predicted place</span><span>${escapeHtml(inference.place.predictedLabel || resolvePlaceName(predictedPlaceId) || 'No confident place')}</span></div>
            <div class="row"><span>Predicted object</span><span>${escapeHtml(inference.object.predictedLabel || 'No confident object')}</span></div>
            <div class="row"><span>Confidence</span><span>${(inference.retrieval.confidenceOverall * 100).toFixed(0)}%</span></div>
            <div class="row"><span>Scene</span><span>${escapeHtml([
              inference.scene.lighting,
              inference.scene.clutter,
              inference.scene.occlusion,
            ].filter(Boolean).join(', ') || 'Not specified')}</span></div>
          </div>
          ${renderListBlock('Ambiguity flags', inference.retrieval.ambiguityFlags)}
          ${renderCandidateBlock('Place candidates', inference.place.candidates.map((candidate) => `${candidate.label || resolvePlaceName(candidate.placeId) || 'Unknown'} (${(candidate.confidence * 100).toFixed(0)}%)`))}
          ${renderCandidateBlock('Object candidates', inference.object.candidates.map((candidate) => `${candidate.label} (${(candidate.confidence * 100).toFixed(0)}%)`))}
          ${inference.retrieval.evidenceSummary ? `<p>${escapeHtml(inference.retrieval.evidenceSummary)}</p>` : ''}
          ${inference.explanation ? `<p>${escapeHtml(inference.explanation)}</p>` : ''}
        </div>
      `
      : `
        <div>
          <p class="caption">Run AI inference after Stage 1 place mapping is ready.</p>
          ${object.aiError ? `<p class="caption error-text">Last AI error: ${escapeHtml(object.aiError)}</p>` : ''}
        </div>
      `;

    cards.push(`
      <article class="entity-card">
        <div>
          <h4>${escapeHtml(object.name)}</h4>
          <p>${escapeHtml(object.notes || 'No notes yet.')}</p>
        </div>
        <div class="tag-row">${tags}</div>
        ${renderAssetStrip(assets)}
        ${inferenceBlock}
        <div class="button-row">
          <button class="subtle" data-action="infer-object" data-object-id="${object.id}">${inference ? 'Re-run AI inference' : 'Run AI inference'}</button>
          <button class="ghost danger" data-action="delete-object" data-object-id="${object.id}">Delete</button>
        </div>
      </article>
    `);
  }

  refs.objectsList.className = 'entity-list';
  refs.objectsList.innerHTML = cards.join('');
}

function renderChallengeResult() {
  const latest = state.queryTests[state.queryTests.length - 1];
  if (!latest) {
    refs.challengeResult.className = 'entity-list empty';
    refs.challengeResult.textContent = 'No challenge run yet.';
    return;
  }

  const rankedRows = latest.rankedResults.length
    ? latest.rankedResults.map((result, index) => `
        <div class="score-row">
          <strong>#${index + 1}, ${escapeHtml(result.label)}</strong>
          <div class="tag-row">
            <span class="tag">Score ${result.score.toFixed(1)}</span>
            ${result.evidence.length ? `<span class="tag">Evidence: ${escapeHtml(result.evidence.join(', '))}</span>` : ''}
          </div>
        </div>
      `).join('')
    : '<div class="score-row"><strong>No confident match</strong><p>The local retrieval layer could not find a strong candidate.</p></div>';

  refs.challengeResult.className = 'entity-list';
  refs.challengeResult.innerHTML = `
    <article class="entity-card">
      <div>
        <h4>${escapeHtml(latest.queryText)}</h4>
        <p>${escapeHtml(latest.queryType)} query</p>
      </div>
      <div class="tag-row">
        <span class="tag">Confidence ${(latest.confidence * 100).toFixed(0)}%</span>
        <span class="tag">Trust ${latest.trustScore}/5</span>
        ${latest.correct === true ? '<span class="tag good">Correct</span>' : ''}
        ${latest.correct === false ? '<span class="tag warn">Missed expected truth</span>' : ''}
      </div>
      <div class="score-list">${rankedRows}</div>
    </article>
  `;
}

function renderMetricsAndSummary() {
  const metrics = computeMetrics();

  refs.metricPlaces.textContent = String(metrics.placeCount);
  refs.metricPlaceAnalyses.textContent = String(metrics.placeAnalyses);
  refs.metricObjects.textContent = String(metrics.objectCount);
  refs.metricObjectInferences.textContent = String(metrics.objectInferences);
  refs.metricPlaceTop1.textContent = formatPercent(metrics.placeTop1);
  refs.metricPlaceTop3.textContent = formatPercent(metrics.placeTop3);
  refs.metricJointTop1.textContent = formatPercent(metrics.jointTop1);
  refs.metricChallenges.textContent = formatPercent(metrics.challengeAccuracy);

  refs.resultsSummary.innerHTML = `
    <ul>
      <li><strong>${metrics.placeAnalyses}/${metrics.placeCount}</strong> mapped places have AI place memory.</li>
      <li><strong>${metrics.objectInferences}/${metrics.objectCount}</strong> objects have AI inference results.</li>
      <li><strong>${formatPercent(metrics.placeTop1)}</strong> place top-1 accuracy, <strong>${formatPercent(metrics.placeTop3)}</strong> place top-3 accuracy.</li>
      <li><strong>${formatPercent(metrics.jointTop1)}</strong> joint top-1 object+place accuracy.</li>
      <li><strong>${formatPercent(metrics.challengeAccuracy)}</strong> challenge-mode hit rate across scored queries.</li>
    </ul>
  `;

  refs.buildRecommendation.textContent = computeRecommendation(metrics);
}

async function renderResultsDetails(token) {
  const inferredObjects = state.objects.filter((object) => object.inference?.normalized);
  if (!inferredObjects.length) {
    refs.resultsDetails.className = 'entity-list empty';
    refs.resultsDetails.textContent = 'No object inference results yet.';
    return;
  }

  const cards = [];
  for (const object of inferredObjects) {
    if (token !== renderToken) return;
    const inference = object.inference.normalized;
    const actualPlaceName = resolvePlaceName(object.placeId) || 'Unknown place';
    const predictedPlaceName = inference.place.predictedLabel || resolvePlaceName(inference.place.predictedPlaceId) || 'No confident place';
    const placeCorrect = inference.place.predictedPlaceId === object.placeId;
    const objectCorrect = labelsMatch(inference.object.predictedLabel, object.name);
    const assets = await getAssets(object.assetIds.slice(0, 1));

    cards.push(`
      <article class="entity-card">
        <div>
          <h4>${escapeHtml(object.name)}</h4>
          <p>Actual place: ${escapeHtml(actualPlaceName)}</p>
        </div>
        <div class="tag-row">
          <span class="tag ${placeCorrect ? 'good' : 'warn'}">Place ${placeCorrect ? 'correct' : 'mismatch'}</span>
          <span class="tag ${objectCorrect ? 'good' : 'warn'}">Object ${objectCorrect ? 'correct' : 'review'}</span>
          <span class="tag">Confidence ${(inference.retrieval.confidenceOverall * 100).toFixed(0)}%</span>
        </div>
        ${renderAssetStrip(assets)}
        <div class="kv-grid">
          <div class="row"><span>Predicted place</span><span>${escapeHtml(predictedPlaceName)}</span></div>
          <div class="row"><span>Predicted object</span><span>${escapeHtml(inference.object.predictedLabel || 'No confident object')}</span></div>
          <div class="row"><span>Ambiguity</span><span>${escapeHtml(inference.retrieval.ambiguityFlags.join(', ') || 'None noted')}</span></div>
        </div>
      </article>
    `);
  }

  refs.resultsDetails.className = 'entity-list';
  refs.resultsDetails.innerHTML = cards.join('');
}

function computeMetrics() {
  const inferredObjects = state.objects.filter((object) => object.inference?.normalized);
  let placeTop1Hits = 0;
  let placeTop3Hits = 0;
  let jointTop1Hits = 0;

  for (const object of inferredObjects) {
    const inference = object.inference.normalized;
    const predictedPlaceId = inference.place.predictedPlaceId;
    const candidatePlaceIds = [
      predictedPlaceId,
      ...inference.place.candidates.map((candidate) => candidate.placeId),
    ].filter(Boolean);

    const placeTop1 = predictedPlaceId === object.placeId;
    const placeTop3 = candidatePlaceIds.slice(0, 3).includes(object.placeId);
    const objectTop1 = labelsMatch(inference.object.predictedLabel, object.name);

    if (placeTop1) placeTop1Hits += 1;
    if (placeTop3) placeTop3Hits += 1;
    if (placeTop1 && objectTop1) jointTop1Hits += 1;
  }

  const scoredChallenges = state.queryTests.filter((query) => query.correct !== null);
  const challengeHits = scoredChallenges.filter((query) => query.correct).length;

  return {
    placeCount: state.places.length,
    placeAnalyses: state.places.filter((place) => place.aiSummary?.normalized).length,
    objectCount: state.objects.length,
    objectInferences: inferredObjects.length,
    placeTop1: inferredObjects.length ? placeTop1Hits / inferredObjects.length : 0,
    placeTop3: inferredObjects.length ? placeTop3Hits / inferredObjects.length : 0,
    jointTop1: inferredObjects.length ? jointTop1Hits / inferredObjects.length : 0,
    challengeAccuracy: scoredChallenges.length ? challengeHits / scoredChallenges.length : 0,
  };
}

function computeRecommendation(metrics) {
  if (!metrics.objectInferences) {
    return 'Start by mapping a few places, capture real objects in context, and run AI inference. The concept cannot be judged before that loop exists end to end.';
  }

  if (metrics.objectInferences >= 3 && metrics.placeTop1 >= 0.75 && metrics.jointTop1 >= 0.6) {
    return 'Strong early signal. The place-memory approach looks viable for an MVP. Keep the guided capture flow, improve retrieval UX, and only then consider a richer backend.';
  }

  if (metrics.objectInferences >= 2 && metrics.placeTop1 >= 0.45) {
    return 'Promising but not clean yet. Tighten place capture guidance, improve cue quality, and reduce overconfident errors before scaling the build.';
  }

  return 'The current signal is still weak. The next leverage points are better place capture, sharper prompts, and more explicit ambiguity handling before investing further.';
}

function setBanner(message, tone = 'info', autoHideMs = 0) {
  refs.flash.textContent = message;
  refs.flash.className = `flash ${tone}`;
  clearTimeout(flashTimer);
  if (autoHideMs > 0) {
    flashTimer = setTimeout(() => {
      refs.flash.className = 'flash hidden';
      refs.flash.textContent = '';
    }, autoHideMs);
  }
}

function clearFormPreviews(form) {
  form.querySelectorAll('input[type="file"]').forEach((input) => {
    resetPreview(input.name);
  });
}

async function updatePreviewForInput(input) {
  const preview = document.querySelector(`[data-preview-for="${input.name}"]`);
  if (!preview) return;

  const file = input.files?.[0];
  if (!file) {
    resetPreview(input.name);
    return;
  }

  const url = URL.createObjectURL(file);
  preview.classList.remove('empty');
  preview.innerHTML = `<img src="${url}" alt="Preview for ${escapeHtml(input.name)}" />`;
  const image = preview.querySelector('img');
  image?.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
  image?.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
}

function resetPreview(inputName) {
  const preview = document.querySelector(`[data-preview-for="${inputName}"]`);
  if (!preview) return;
  preview.classList.add('empty');
  preview.textContent = preview.dataset.emptyLabel || 'No file selected';
}

function renderAssetStrip(assets) {
  const validAssets = assets.filter((asset) => asset?.blob);
  if (!validAssets.length) {
    return '<p class="caption">No photos saved yet.</p>';
  }

  return `
    <div class="asset-strip">
      ${validAssets.map((asset) => {
        const url = createLiveObjectUrl(asset.blob);
        return `
          <div class="asset-thumb">
            <img src="${url}" alt="${escapeHtml(asset.captureType)}" />
            <span>${escapeHtml(asset.captureType)}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderListBlock(title, items) {
  if (!items?.length) return '';
  return `
    <div class="list-block">
      <strong>${escapeHtml(title)}</strong>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
  `;
}

function renderCandidateBlock(title, items) {
  if (!items?.length) return '';
  return renderListBlock(title, items);
}

function createLiveObjectUrl(blob) {
  const url = URL.createObjectURL(blob);
  liveObjectUrls.push(url);
  return url;
}

function revokeLiveObjectUrls() {
  while (liveObjectUrls.length) {
    const url = liveObjectUrls.pop();
    URL.revokeObjectURL(url);
  }
}

async function createAssetFromFile(file, { entityType, entityId, captureType }) {
  const prepared = await optimizeImage(file);
  const asset = {
    id: uid('asset'),
    entityType,
    entityId,
    captureType,
    blob: prepared.blob,
    mimeType: prepared.blob.type || 'image/jpeg',
    width: prepared.width,
    height: prepared.height,
    size: prepared.blob.size,
    createdAt: new Date().toISOString(),
  };
  await putAsset(asset);
  return asset;
}

async function optimizeImage(file) {
  try {
    const image = await loadImageSource(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image.element, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.84);
    return {
      blob,
      width,
      height,
    };
  } catch (error) {
    console.warn('Image optimization failed, keeping original file.', error);
    return {
      blob: file,
      width: 0,
      height: 0,
    };
  }
}

async function loadImageSource(file) {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      element: bitmap,
    };
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight, element: img });
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not convert canvas to blob.'));
    }, type, quality);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function slugify(text) {
  return safeString(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export';
}

function normalizeText(text) {
  return safeString(text).toLowerCase();
}

function tokenize(text) {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token && token.length > 1 && !STOPWORDS.has(token));
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function labelsMatch(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;

  const leftTokens = new Set(tokenize(left));
  const rightTokens = tokenize(right);
  if (!leftTokens.size || !rightTokens.length) return false;
  const overlap = rightTokens.filter((token) => leftTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.length) >= 0.6;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function collectAllAssetIds() {
  return [
    ...state.places.flatMap((place) => place.assetIds || []),
    ...state.objects.flatMap((object) => object.assetIds || []),
  ];
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function putAsset(asset) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite');
    tx.oncomplete = () => resolve(asset);
    tx.onerror = () => reject(tx.error);
    tx.objectStore('assets').put(asset);
  });
}

async function getAsset(assetId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readonly');
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore('assets').get(assetId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function getAssets(assetIds = []) {
  const assets = [];
  for (const assetId of assetIds) {
    const asset = await getAsset(assetId);
    if (asset) assets.push(asset);
  }
  return assets;
}

async function deleteAssets(assetIds = []) {
  if (!assetIds.length) return;
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore('assets');
    assetIds.forEach((assetId) => store.delete(assetId));
  });
}

async function clearAllAssets() {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore('assets').clear();
  });
}

function getApiKey() {
  return settings.rememberKey ? safeString(settings.apiKey) : safeString(sessionApiKey);
}
