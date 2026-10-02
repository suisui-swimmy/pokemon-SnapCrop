import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const camera = (id = 'camera', label = 'Camera') => ({kind: 'videoinput', deviceId: id, label});
const mic = (id = 'mic', label = 'Microphone') => ({kind: 'audioinput', deviceId: id, label});
function harness({devices = [camera(), mic()], error, audioError, enumerateError, pending} = {}) {
  const requests = [], streams = [], messages = [], storage = new Map();
  const makeStream = constraints => {
    const tracks = ['video', 'audio'].filter(kind => constraints[kind]).map(kind => ({
      kind, stopped: false, stop() {this.stopped = true;},
      getSettings: () => ({deviceId: constraints[kind]?.deviceId?.exact || (kind === 'video' ? 'camera' : 'mic')}),
    }));
    const stream = {getTracks: () => tracks, getVideoTracks: () => tracks.filter(t => t.kind === 'video'), getAudioTracks: () => tracks.filter(t => t.kind === 'audio')};
    streams.push(stream); return stream;
  };
  const select = () => ({value: '', disabled: false, options: [], set innerHTML(_) {this.options = [];}, append(option) {this.options.push(option);}});
  const context = vm.createContext({
    document: {addEventListener() {}, createElement: () => ({})}, window: {},
    localStorage: {setItem: (k,v) => storage.set(k,v)},
    navigator: {mediaDevices: {
      enumerateDevices: async () => {if(enumerateError) throw enumerateError; return devices;},
      getUserMedia: async constraints => {requests.push(constraints); if(pending) await pending; if(error) throw error; if(constraints.audio && audioError) throw audioError; return makeStream(constraints);},
    }}, messages,
  });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/u, `
    renderCameraDetails = () => {};
    setCameraState = label => messages.push(label);
    appendTerminalError = message => messages.push(message);
    appendTerminalNotice = () => {};
    appendTerminalEntry = lines => messages.push(...lines);
    syncAudioControls = () => {};
    warmAudioOutput = async () => {};
    stopCurrentStream = () => {state.stream?.getTracks().forEach(t => t.stop());state.stream = null;stopSelectedAudioInput();};
    runControlActionAndRestoreTerminalFocus = async action => {await action(); messages.push('focus');};
    globalThis.api = {state, elements, initializeMediaInput, startSelectedVideo, setupAudioPlayback, populateAudioSelect, handleAudioSelectionChange, applySelectedAudioInput};
  })();`), context);
  Object.assign(context.api.elements, {deviceSelect: select(), audioSelect: select(), startVideoButton: {}, refreshDevicesButton: {}, video: {play: async () => {context.api.state.videoReady = true;}}});
  return {...context.api, context, requests, messages, streams, storage, makeStream};
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('startup requests both permissions before enumeration, stops permission tracks, then starts video only', async () => {
  const h = harness(); await h.initializeMediaInput();
  assert.deepEqual(JSON.parse(JSON.stringify(h.requests[0])), {video: true, audio: true});
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].audio, false);
  assert.ok(h.streams[0].getTracks().every(t => t.stopped));
  assert.ok(h.state.stream.getTracks().every(t => !t.stopped));
  assert.equal(h.elements.startVideoButton.disabled, false);
  assert.ok(h.messages.includes('focus'));
});

test('saved camera is restored after permission and missing camera falls back', async () => {
  for(const saved of ['saved', 'removed']) {
    const h = harness({devices: [camera(), camera('saved', 'Saved')]});
    h.state.selectedDeviceId = saved; h.state.deviceSelectionLocked = true;
    await h.initializeMediaInput();
    assert.equal(h.requests[1].video.deviceId.exact, saved === 'saved' ? 'saved' : 'camera');
  }
});

test('no-audio preference stays selected and the provisional microphone stops', async () => {
  const h = harness(); h.state.hasPersistedAudioSelection = true;
  await h.initializeMediaInput();
  assert.equal(h.elements.audioSelect.value, '');
  assert.equal(h.state.audioInputStream, null);
  assert.ok(h.streams[0].getAudioTracks()[0].stopped);
});

test('permission pending blocks duplicate starts and unlocks after success', async () => {
  let release; const pending = new Promise(resolve => {release = resolve;});
  const h = harness({pending}); const first = h.initializeMediaInput(); await flush();
  assert.equal(h.requests.length, 1);
  for(const name of ['startVideoButton','refreshDevicesButton','deviceSelect','audioSelect']) assert.equal(h.elements[name].disabled, true);
  await h.startSelectedVideo(); assert.equal(h.requests.length, 1);
  release(); await first; assert.equal(h.elements.deviceSelect.disabled, false);
});

test('microphone denial or absence falls back once to camera and avoids another microphone request', async () => {
  for(const name of ['NotAllowedError','NotFoundError','NotReadableError']) {
    const h = harness({audioError: {name}}); h.state.selectedAudioDeviceId = 'mic';
    await h.initializeMediaInput();
    assert.equal(h.requests.length, 3);
    assert.equal(h.requests[0].audio, true);
    assert.equal(h.requests[1].audio, false);
    assert.equal(h.requests[2].audio, false);
    assert.ok(h.state.stream); assert.ok(h.streams[0].getTracks().every(t => t.stopped));
  }
});

test('camera denial is bounded and a manual retry is possible', async () => {
  const h = harness({error: {name: 'NotAllowedError'}});
  await h.initializeMediaInput(); assert.equal(h.requests.length, 2);
  assert.ok(h.messages.includes('拒否')); assert.equal(h.elements.startVideoButton.disabled, false);
  await h.startSelectedVideo(); assert.equal(h.requests.length, 4);
});

test('enumeration failure or missing devices releases permission tracks without starting playback', async () => {
  for(const options of [{devices: []},{enumerateError: new Error('enumeration failed')}]) {
    const h = harness(options); await h.initializeMediaInput();
    assert.equal(h.requests.length, 1); assert.equal(h.state.stream, null);
    assert.ok(h.streams[0].getTracks().every(t => t.stopped));
  }
  const h = harness(); h.context.navigator.mediaDevices = undefined;
  await h.initializeMediaInput(); assert.equal(h.requests.length, 0); assert.equal(h.elements.startVideoButton.disabled, true);
});

test('already running video is not restarted by initialization; later start does not reacquire joint permissions', async () => {
  const h = harness(); await h.initializeMediaInput();
  await h.initializeMediaInput(); assert.equal(h.requests.length, 2);
  await h.startSelectedVideo(); assert.equal(h.requests.length, 3); assert.equal(h.requests[2].audio, false);
});

test('anonymous audio option differs from none and requests microphone without an exact empty ID', async () => {
  const h = harness({devices: [camera(), mic('', '')],audioError: {name: 'NotAllowedError'}});
  await h.initializeMediaInput();
  const [none, anonymous] = h.elements.audioSelect.options;
  assert.equal(none.value, ''); assert.notEqual(anonymous.value, '');
  h.elements.audioSelect.value = anonymous.value;
  const before = h.requests.length;
  await h.applySelectedAudioInput(h.handleAudioSelectionChange());
  assert.equal(h.requests.length, before + 1);
  assert.equal(h.requests.at(-1).video, false);
  assert.equal(h.requests.at(-1).audio.deviceId, undefined);
  assert.ok(![...h.storage.values()].includes(anonymous.value));
});

test('anonymous microphone resolves to actual device ID after permission; stale result cannot turn audio back on', async () => {
  for(const cancel of [false,true]) {
    const devices = [camera(), mic('', '')]; const h = harness({devices});
    h.state.audioDevices = [devices[1]]; h.populateAudioSelect();
    h.elements.audioSelect.value = h.elements.audioSelect.options[1].value;
    let release; const waiting = new Promise(resolve => {release = resolve;});
    const audio = h.makeStream({audio: true});
    h.context.navigator.mediaDevices.getUserMedia = async () => {await waiting; return audio;};
    const first = h.applySelectedAudioInput(h.handleAudioSelectionChange()); await flush();
    if(cancel) {h.elements.audioSelect.value = ''; await h.applySelectedAudioInput(h.handleAudioSelectionChange());}
    devices[1] = mic(); release(); await first;
    if(cancel) {assert.equal(h.state.audioInputStream,null);assert.ok(audio.getTracks()[0].stopped);}
    else {assert.equal(h.state.selectedAudioDeviceId,'mic');assert.equal(h.elements.audioSelect.value,'mic');assert.equal(h.storage.get('pokemon-snapcrop.audio-device'),'mic');}
  }
});

test('suspended audio resume does not block controls or focus', async () => {
  const h = harness(); h.context.window.AudioContext = class {
    state = 'suspended'; destination = {};
    createGain() {return {gain: {value: 1}, connect() {}};}
    createMediaStreamSource() {return {connect() {}, disconnect() {}};}
    resume() {return new Promise(() => {});}
  }; h.context.MediaStream = class {};
  assert.equal(await Promise.race([h.setupAudioPlayback({stream: h.makeStream({audio:true})}),new Promise(r=>setTimeout(()=>r('blocked'),100))]),true);
});
