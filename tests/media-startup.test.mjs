import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const device = (id = 'camera', label = 'Camera') => ({kind: 'videoinput', deviceId: id, label});
function harness({devices = [device()], error, enumerateError, pending, audio = false, audioError} = {}) {
  const requests = [], messages = [];
  const track = {stop() {}, getSettings: () => ({deviceId: 'camera'})};
  const stream = {getTracks: () => [track], getVideoTracks: () => [track], getAudioTracks: () => []};
  const select = () => ({value: '', disabled: false, options: [], set innerHTML(_) {this.options = [];}, append(option) {this.options.push(option);}});
  const context = vm.createContext({
    document: {addEventListener() {}, createElement: () => ({})}, window: {},
    navigator: {mediaDevices: {
      enumerateDevices: async () => {if(enumerateError) throw enumerateError; return devices;},
      getUserMedia: async constraints => {requests.push(constraints); if(pending) await pending; if(constraints.audio && audioError) throw audioError; if(error) throw error; return stream;},
    }},
    messages,
  });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/u, `
    renderCameraDetails = () => {};
    setCameraState = (label) => messages.push(label);
    appendTerminalError = (message) => messages.push(message);
    appendTerminalNotice = () => {};
    appendTerminalEntry = () => {};
    syncAudioControls = () => {};
    warmAudioOutput = async () => {};
    stopCurrentStream = () => {state.stream = null;};
    runControlActionAndRestoreTerminalFocus = async (action) => {await action(); messages.push('focus');};
    globalThis.api = {state, elements, initializeMediaInput, startSelectedVideo, setupAudioPlayback, populateDeviceSelect};
  })();`), context);
  Object.assign(context.api.elements, {deviceSelect: select(), audioSelect: select(), startVideoButton: {}, refreshDevicesButton: {}, video: {play: async () => {context.api.state.videoReady = true;}}});
  if(audio) context.api.state.selectedAudioDeviceId = 'mic';
  return {...context.api, context, requests, messages, stream};
}

test('startup requests video without a click even when device labels and IDs are hidden', async () => {
  const h = harness({devices: [device('', '')]});
  await h.initializeMediaInput();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].audio, false);
  assert.equal(h.requests[0].video.deviceId, undefined);
  assert.equal(h.state.stream, h.stream);
  assert.equal(h.state.mediaStartInProgress, false);
  assert.equal(h.elements.startVideoButton.disabled, false);
  assert.ok(h.messages.includes('focus'));
});

test('saved camera is selected and missing saved camera falls back safely', async () => {
  for (const saved of ['saved', 'removed']) {
    const h = harness({devices: [device(), device('saved', 'Saved Camera')]});
    h.state.selectedDeviceId = saved;
    h.state.deviceSelectionLocked = true;
    await h.initializeMediaInput();
    assert.equal(h.requests[0].video.deviceId.exact, saved === 'saved' ? 'saved' : 'camera');
  }
});

test('pending permission disables controls and repeated starts do not duplicate requests', async () => {
  let release;
  const pending = new Promise(resolve => {release = resolve;});
  const h = harness({pending});
  const first = h.initializeMediaInput();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.requests.length, 1);
  for(const name of ['startVideoButton', 'refreshDevicesButton', 'deviceSelect', 'audioSelect']) assert.equal(h.elements[name].disabled, true);
  await h.startSelectedVideo();
  assert.equal(h.requests.length, 1);
  release(); await first;
  assert.equal(h.elements.deviceSelect.disabled, false);
});

test('denied permission is not retried automatically and manual start remains available', async () => {
  const h = harness({error: {name: 'NotAllowedError'}});
  await h.initializeMediaInput();
  assert.equal(h.requests.length, 1);
  assert.ok(h.messages.includes('拒否'));
  assert.equal(h.elements.startVideoButton.disabled, false);
  await h.startSelectedVideo();
  assert.equal(h.requests.length, 2);
});

test('missing, unavailable and unsupported device enumeration does not start capture', async () => {
  for (const options of [{devices: []}, {enumerateError: new Error('enumeration failed')}]) {
    const h = harness(options);
    await h.initializeMediaInput();
    assert.equal(h.requests.length, 0);
  }
  const h = harness();
  h.context.navigator.mediaDevices = undefined;
  await h.initializeMediaInput();
  assert.equal(h.requests.length, 0);
  assert.equal(h.elements.startVideoButton.disabled, true);
});

test('startup does not replace an already started stream', async () => {
  const h = harness(); h.state.stream = h.stream;
  await h.initializeMediaInput(); assert.equal(h.requests.length, 0);
});

test('suspended audio resume does not hold media startup and focus hostage', async () => {
  const h = harness();
  h.context.window.AudioContext = class {
    state = 'suspended'; destination = {};
    createGain() {return {gain: {value: 1}, connect() {}};}
    createMediaStreamSource() {return {connect() {}, disconnect() {}};}
    resume() {return new Promise(() => {});}
  };
  h.context.MediaStream = class {};
  vm.runInContext('api.state.audioVolume = 1', h.context);
  const outcome = await Promise.race([
    h.setupAudioPlayback({stream: {getAudioTracks: () => [{}]}}),
    new Promise(resolve => setTimeout(() => resolve('blocked'), 100)),
  ]);
  assert.equal(outcome, true);
  assert.equal(h.state.audioReady, true);
});


test('selected microphone denial keeps the running video and unlocks controls', async () => {
  const h = harness({audio: true, audioError: {name: 'NotAllowedError'}, devices: [device(), {kind: 'audioinput', deviceId: 'mic', label: 'Microphone'}]});
  await h.initializeMediaInput();
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[0].audio, false);
  assert.equal(h.requests[1].video, false);
  assert.equal(h.state.stream, h.stream);
  assert.equal(h.elements.audioSelect.disabled, false);
  assert.equal(h.elements.startVideoButton.disabled, false);
  assert.ok(h.messages.some(message => message.includes('音声入力へのアクセスが拒否')));
});
