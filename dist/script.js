// console.clear();

var synth = new Stepper({
  container: document.getElementById("stepper-1"),
  note_count: 11,
  octave: 4
});

document.documentElement.addEventListener('mousedown', () => {
  if (Tone.context.state !== 'running') Tone.context.resume();
});

var drum = new Stepper({
  container: document.getElementById("stepper-3"),
  notes: ["oh", "ch", "sd", "kd"],
  sampler: true
});

var clock = new Clock({
  container: document.getElementById("step-o-matic"),
  play_el: document.getElementById("play"),
  key_el: document.getElementById("key"),
  kit_el: document.getElementById("kit"),
  pulse_el: document.getElementById("pulse"),
  tempo_el: document.getElementById("tempo"),
  save_code_el: document.getElementById("save-code"),
  load_code_el: document.getElementById("load-code"),
  load_code_modal: document.getElementById("load-code-modal"),
  save_code_modal: document.getElementById("save-code-modal"),
  load_code_from_modal: document.getElementById("load-code-from-modal"),
  close_load_code_modal: document.getElementById("close-load-code-modal"),
  close_save_code_modal: document.getElementById("close-save-code-modal"),
  buffering: document.getElementById("buffering"),
  key: "C",
  synth: "Britey",
  kit: "808",
  pulse: 4,
  tempo: 90,
  steppers: { 
    synth: synth,
    drum: drum 
  }
});


clock.start();


/********************
CLOCK
contains many steppers that can be played
as the clock progresses
********************/

function Clock(params) {
  var C = {};
  
  init();
  
  return C;
  
  function init() {
    setGlobals();
    setSteppers();
    setEvents();
  }
  
  /**********
  setters
  **********/
  
  function setGlobals() {
    C.container = params.container;
    C.play_el   = params.play_el;
    C.key_el    = params.key_el;
    C.pulse_el  = params.pulse_el;
    C.tempo_el  = params.tempo_el;
    C.kit_el    = params.kit_el;
    C.save_code_el = params.save_code_el;
    C.load_code_el = params.load_code_el;
    C.load_code_modal = params.load_code_modal;
    C.save_code_modal = params.save_code_modal;
    C.load_code_from_modal = params.load_code_from_modal;
    C.close_load_code_modal = params.close_load_code_modal;
    C.close_save_code_modal = params.close_save_code_modal;
    C.buffering = params.buffering;
          
    
    C.current_beat = 0;
    C.playing      = false;
    C.buffered     = false;
    
    C.start = start;
    C.stop  = stop;
    C.loadCode = loadCode;
    C.updateKit = updateKit;
    C.updateSynth = updateSynth;
  }
  
  function setSteppers() {
    C.steppers = params.steppers;
    updateKey(params.key);
    updateTempo(params.tempo);
    updatePulse(params.pulse);
    C.kit = new Kit();
    C.synth = new Synth();
    updateKit(params.kit);
    updateSynth(params.synth);
  }
  
  function setEvents() {

    C.key_el.addEventListener("click", pause);
    C.pulse_el.addEventListener("click", pause);
    C.kit_el.addEventListener("click", pause);
    
    C.play_el.addEventListener("change", function() {
      if(this.checked) { C.start(); } else { C.stop(); }
    });
    
    C.kit_el.addEventListener("change", function() {
      updateKit(this.value);
      unpause();
    });
    C.key_el.addEventListener("change", function() {
      updateKey(this.value);
      unpause();
    });
    C.pulse_el.addEventListener("change", function() {
      updatePulse(parseInt(this.value));
      unpause();
    });
    C.tempo_el.addEventListener("change", function() {
      updateTempo(parseInt(this.value));
    });
    
    C.save_code_el.addEventListener("click", openSaveCodeModal);
    C.load_code_el.addEventListener("click", openLoadCodeModal);
    C.close_save_code_modal.addEventListener("click", function() {
      C.save_code_modal.className = C.save_code_modal.className.replace(" active", "");
    });
    C.load_code_from_modal.addEventListener("click", function() {
      C.load_code_modal.className = C.load_code_modal.className.replace(" active", "");
      var value = C.load_code_modal.querySelector("textarea").value;
      if(value) loadCode(value);
    });
    C.close_load_code_modal.addEventListener("click", function() {
      C.load_code_modal.className = C.load_code_modal.className.replace(" active", "");
    });
  }
  
  /**********
  updating
  **********/
  
  // update the drum kit
  function updateKit(kit) {
    C.buffered = false;
    C.buffering.className = "active";
    C.kit_el.value = kit;
    C.kit.updateKit(kit);
    C.steppers.drum.updateInstrument(C.kit.kit);
    Tone.Buffer.on("load", function() {
      C.buffering.className = "";
      C.buffered = true;
    });
  }
  
  // update the synth
  function updateSynth(name) {
    C.synth.updateSynth(name);
    C.steppers.synth.updateInstrument(C.synth.synth);
  }
  
  // update the tempo clock
  function updateTempo(tempo) {
    C.tempo_el.value = tempo;
    C.tempo = tempo;
    Tone.Transport.bpm.value = C.tempo;
  }
  
  // update the beat count for each stepper
  function updatePulse(pulse) {
    C.pulse_el.value = pulse;
    C.pulse = pulse;
    var denom = pulse > 5 ? 8 : 4;
    Tone.Transport.timeSignature = [pulse, denom];
    C.beats = pulse * 4;
    var name = C.container.className;
    C.container.className = name.match("pulse-") ? name.replace(/pulse-\d\d?/, "pulse-" + pulse) : "pulse-" + pulse;
    C.steppers.synth.updateBeats(C.beats);
    C.steppers.drum.updateBeats(C.beats);
  }
  
  // update the key for each non sampler stepper
  function updateKey(key) {
    C.key = key;
    C.key_el.value = key;
    C.steppers.synth.updateKey(key);
    C.steppers.drum.updateKey(key);
  }
  
  /**********
  modals
  **********/

  // save code by generating new encode string
  function openSaveCodeModal() {
    C.save_code_modal.className += " active";
    var s = JSON.stringify({
      steps: {
        synth: C.steppers.synth.steps,
        drum: C.steppers.drum.steps
      },
      synth: C.synth.name,
      kit: C.kit.name,
      tempo: C.tempo,
      key: C.key,
      pulse: C.pulse
    });
    var encoded = s;
    var textarea = C.save_code_modal.querySelector("textarea");
    textarea.value = encoded;
    textarea.focus();
  }
  
  // open the load modal
  function openLoadCodeModal(string) {
    var textarea = C.load_code_modal.querySelector("textarea");
    textarea.value = "";
    textarea.focus();
    C.load_code_modal.className += " active";
  }
  
  // load code by reading encoded string
  function loadCode(string) {
    var decoded = string;
    var parsed = JSON.parse(decoded);
    if(parsed) {
      updateKey(parsed.key);
      updateTempo(parsed.tempo);
      updatePulse(parsed.pulse);
      updateSynth(parsed.synth);
      updateKit(parsed.kit);
      C.steppers.synth.updateSteps(parsed.steps.synth);
      C.steppers.drum.updateSteps(parsed.steps.drum);
    } else {
      alert("That code bad, yo.");
    }
  }
  
  /**********
  play events
  **********/
  
  // start playing
  function start() {
    C.playing = true;
    C.play_el.setAttribute("checked", true);
    
    Tone.Transport.bpm.value = C.tempo;
    Tone.Transport.scheduleRepeat(player, "16n");
    Tone.Transport.start();
    
    function player(time) {
      if(C.buffered) {
        C.container.className = "pulse-" + C.pulse + " step-" + C.current_beat;
        C.steppers.synth.playNotes(C.current_beat, time);
        C.steppers.drum.playNotes(C.current_beat, time);

        if(C.current_beat >= C.beats - 1) {
          C.current_beat = 0;
        } else {
          C.current_beat++;
        }
      }
    }
  }
  
  // unpause paused state
  function unpause() {
    if(C.playing)
      start();
  }
  
  // temporarily pause wihtout changing play state
  function pause() {
    if(C.playing)
      Tone.Transport.cancel();
  }
  
  // stop all playing
  function stop() {
    if(C.playing) {
      C.play_el.removeAttribute("checked");
      C.play_el.checked = false;
      C.playing = false;
      Tone.Transport.cancel();
    }
  }
  
}



/********************
STEPPER
has its own instrument and array of note step sequences
that can be played on a clock
********************/

function Stepper(params) {
  var S = {};
  
  init();
  
  function init() {
    setGlobals();
    setEvents();
  }
  
  return S;
  
  /********** 
  setters 
  **********/
  
  function setGlobals() {
    S.container = params.container;
    
    if(params.notes) {
      S.notes = params.notes;
    } else {
      S.notes_lib = setNotesLib();
    }
    
    S.sampler   = params.sampler || false;
    S.hoverable = false;
    S.hover_on  = true;
    S.octave       = params.octave;
    S.note_count   = params.note_count;
    
    S.updateBeats      = updateBeats;
    S.playNotes        = playNotes;
    S.getActiveNotes   = getActiveNotes;
    S.updateSteps      = updateSteps;
    S.updateHovers     = updateHovers;
    S.updateKey        = updateKey;
    S.updateInstrument = updateInstrument;
  }
  
  function setEvents() {
    S.container.addEventListener("mouseup", mouseup);
    S.container.addEventListener("mouseenter", function(e) {
      if(S.hoverable) mouseup(e);
    });
  }
  
  // set the steps to be an array of binary play switches for each note
  function setSteps() {
    S.steps = [];
    for(var r = 0; r < S.notes.length; r++) {
      // create an array sequence of binary on/off players
      var sequence = [];
      for(var b = 0; b < S.beats; b++) {
        sequence.push(0);
      }
      // add the row to steps
      S.steps.push(sequence);
    }
    S.max_step = S.steps.length;
  }
  
  // set a notes library
  function setNotesLib() {
    var notes = [];
    for(var i = 2; i < 8; i++) {
      var n = "C Db D Eb E F Gb G Ab A Bb B".split(" ");
      for(var x = 0; x < n.length; x++) {
        notes.push(n[x] + i);
      }
    }
    return notes;
  }
  
  
  /********** 
  updates
  **********/
  
  // set the instrument to the Tone.js object that is passed in
  function updateInstrument(instrument) {
    S.instrument = instrument;
  }
  
  // update hoverable to account for click and dragging
  function updateHovers(hoverable) {
    S.hoverable = hoverable;
  }
  
  // update quarter note length beat count
  function updateBeats(beats) {
    if(!S.steps) {
      S.beats = beats;
      setSteps();
    }
    adjustBeats(S.beats - beats);
    S.beats = beats;
    drawBeats();
  }
  
  // update the steps to match an existing array
  function updateSteps(steps) {
    for(var s = 0; s < steps.length; s++) {
      if(s < S.steps[s].length) {
        S.steps[s] = steps[s];
      }
    }
    drawBeats();
  }
  
  // update the key
  function updateKey(key) {
    if(!S.sampler) {
      S.key = key;
      var minor = key.match(/m$/) ? true : false;
      if(minor) key = key.replace("m", "");
      var jumps = minor ? [0,2,3,7,8] : [0,2,4,7,9];
      var start = S.notes_lib.indexOf(key + S.octave);
      var start_octave = S.octave;
      var array = [];
      for(var o = 0; o < S.note_count; o++) {
        var index = start + jumps[o % jumps.length] + (Math.floor(o / jumps.length) * 12);
        var note = S.notes_lib[index];
        array.push(note);
      }
      array.reverse();
      S.notes = array;
    }
  }
  
  /********** 
  helpers
  **********/
  
  // adjust the notes beat sequences to be less or more than existing
  function adjustBeats(amount) {
    if(amount === 0) return;
    for(var n = 0; n < S.steps.length; n++) {
      var step = S.steps[n];
      if(amount > 0) {
        step.splice(step.length - amount, amount);
      } else {
        for(var i = 0; i < (amount * -1); i++)
          step.push(0);
      }
    }
  }
  
  // draw beat elements to the dom
  function drawBeats() {
    S.container.innerHTML = "";

    // draw each step sequence
    for(var s = 0; s < S.steps.length; s++) {
      var el = document.createElement("div");
      el.className = "note";
      for(var b = 0; b < S.beats; b++) {
        var beat = S.steps[s][b];
        var b_el = document.createElement("a");
        b_el.className = "beat";
        if(beat) b_el.className += " active";
        b_el.setAttribute("data-index", s + "," + b);
        b_el.addEventListener("mousedown", mousedown);
        b_el.addEventListener("mouseenter", mouseenter);
        el.appendChild(b_el);
      }
      S.container.appendChild(el);
    }
  }
  
  /********** 
  events
  **********/
  
  // toggle the beat on or off
  function mousedown(e) {
    e.preventDefault();
    S.hoverable = true;
    var el = e.target,
        index = el.getAttribute("data-index").split(","),
        row = parseInt(index[0]), beat = parseInt(index[1]);
    var b = S.steps[row][beat];
    S.hover_on = b === 0;
    toggleElement(e.target);
  }
  
  // disable hoverable on mouseup
  function mouseup(e) {
    e.preventDefault();
    S.hoverable = false;
  }
  
  // detect hover and do somestuff if mouse is being held down
  function mouseenter(e) {
    e.preventDefault();
    if(!S.hoverable) return;
    toggleElement(e.target, true);
  }
   
  function toggleElement(el, hovering) {
    var index = el.getAttribute("data-index").split(","),
        row = parseInt(index[0]), beat = parseInt(index[1]);
    var b = S.steps[row][beat];
    if(b === 1) { 
      if(hovering && S.hover_on) return;
      S.steps[row][beat] = 0;
      el.className = el.className.replace(/ active/g, "");
    } else {
      if(hovering && !S.hover_on) return;
      S.steps[row][beat] = 1;
      el.className += " active";
    }
  }
  
  // play all active notes 
  function playNotes(beat, time) {
    var notes = S.getActiveNotes(beat);
    if(!notes.length) return;
    if(S.sampler) {
      for(var n = 0; n < notes.length; n++) {
        S.instrument.triggerAttackRelease(notes[n], "8n", time);
      }
    } else {
      S.instrument.triggerAttackRelease(notes, "16n", time);
    }
  }
  
  // get all notes for each step that should play at beat position
  function getActiveNotes(beat) {
    var active_notes = [];
    for(var s = 0; s < S.steps.length; s++) {
      if(S.steps[s][beat]) active_notes.push(S.notes[s]);
    }
    return active_notes;
  }
  
  return S;
}



/*********
Kit provides different pre-programmed samplers thanks to Tone.js
*********/

function Kit() {
  var D = {};
  
  init();
  
  return D;
  
  function init() {
    D.updateKit = updateKit;
  }
  
  function updateKit(name) {
    D.name = name;
    var path = "https://s3-us-west-2.amazonaws.com/s.cdpn.io/111863/";
    var kd = path + "kd-" + name + ".wav",
        sd = path + "sd-" + name + ".wav",
        ch = path + "ch-" + name + ".wav",
        oh = path + "oh-" + name + ".wav";
    D.kit = new Tone.Sampler({
      oh: oh, ch: ch, sd: sd, kd: kd
    });
    
    var gains = {
      808: 0.8,
      606: 0.4,
      ana: 0.9
    };
    
    var gain = new Tone.Gain(gains[name]);
    gain.toMaster();
    
    
    var multiband = new Tone.MultibandCompressor({
      lowFrequency: 200,
      highFrequency: 1300,
      low: {
        threshold: -12
      }
    });

    var distortion = new Tone.Distortion();
    distortion.wet.value = 0.3;
    
    multiband.connect(gain);
    distortion.connect(multiband);
    if(name === "ana") {
      D.kit.connect(distortion);
    } else {
      D.kit.connect(multiband);
    }
  }
}



/*********
Synth provides different pre-programmed synthesizers thanks to Tone.js
*********/

function Synth() {
  
  var S = {};
  
  init();
  
  return S;
  
  function init() {
    loadFX();
    loadSynths();
    S.updateSynth = updateSynth;
  }
    
  function updateSynth(name) {
    S.name = name;
    useSynth(name);
  }
  
  function loadFX() {
    S.FX = {
      multiband: new Tone.MultibandCompressor({
        lowFrequency: 200,
        highFrequency: 1300,
        low: {
          threshold: -12
        }
      }),
      reverb: new Tone.Freeverb(),
      delay: new Tone.PingPongDelay("16n", 0.2),
      long_delay: new Tone.PingPongDelay("32n", 0.3)
    };
    
    S.FX.reverb.roomSize.value = 0.6;
    S.FX.reverb.wet.value = 0.2;

    S.FX.delay.wet.value = 0.4;
    
    S.FX.long_delay.wet.value = 0.4;
  }
  
  // load up all the synths
  function loadSynths() {
    S.synths = {
      // Haunty: Haunty(),
      // Belly: Belly(),
      Britey: Britey()
    };
  }
  
  // initial load of haunty synth
  function Haunty() {
    var synth = new Tone.PolySynth(16, Tone.SimpleAM);
    synth.set({
      envelope: {
        attack:  0.5,
        release: 0.5
      }
    });
    synth.set("carrier", {
      volume: -4,
      oscillator: { 
        partials: [1, 0.2, 0.01] 
      },
      envelope: {
        attack: 0.05, decay: 0.02,
        sustain: 0.6,  release: 0.8
      }
    });
    synth.set("modulator", {
      volume: -12,
      oscillator: { 
        partials: [1, 0.2, 0.01],
        detune: 0, phase: 90,
      },
      envelope: {
        attack: 0.05, decay: 0.01,
        sustain: 1, release: 1
      }
    });
    
    synth.chain(S.FX.delay, S.FX.reverb, S.FX.multiband, Tone.Master);
    return synth;
  }
  
  // initial load of britey synth
  function Britey() {
    var synth = new Tone.PolySynth(16, Tone.SimpleAM);
    synth.set({
      envelope: {
        attack:  0.5,
        release: 0.5
      }
    });
    synth.set("carrier", {
      volume: -4,
      oscillator: { 
        type: "triangle"
      },
      envelope: {
        attack: 0.05, decay: 0.02,
        sustain: 0.6,  release: 0.8
      }
    });
    synth.set("modulator", {
      volume: -16,
      oscillator: { 
        type: "triangle"
      },
      envelope: {
        attack: 0.05, decay: 0.01,
        sustain: 1, release: 1
      }
    });
    
    synth.chain(S.FX.long_delay, S.FX.multiband, Tone.Master);
    return synth;
  }
  
  // initial load of belly synth
  function Belly() {
    var synth = new Tone.PolySynth(16, Tone.SimpleFM);
    synth.set("harmonicity", 3);
    synth.set("modulationIndex", 10);
    synth.set("carrier", {
      volume: -20,
      portamento: 0,
      oscillator: {
        type: "sine"
      },
      envelope: {
        attack: 0.01,
        decay: 0,
        sustain: 1,
        release: 0.5
      }
    });
    synth.set("modulator", {
      volume: -20,
      portamento: 0,
      oscillator:{
        type: "triangle"
      },
      envelope: {
        attack: 0.01,
        decay: 0,
        sustain: 1,
        release: 0.5
      }
    });
    
    synth.chain(S.FX.multiband, Tone.Master);
    return synth;
  }
  
  // take a name and return a synth
  function useSynth(name) {
    switch(name) {
      case "Haunty":
        S.synth = S.synths.Haunty;
        break;
      case "Belly":
        S.synth = S.synths.Belly;
        break;
      case "Britey":
        S.synth = S.synths.Britey;
        break;
      default:
        S.synth = S.synths.Belly;
    }
  }
}