// The recorded voices (public/audio/<id>.mp3): fetched and decoded once, cut to where the speech starts and ends
// (ElevenLabs pads every clip with silence, which made the gaps between lines), and played through one AudioContext,
// so a pause stops the voice mid-word and the next line starts the moment the last one ends.

type Clip = { buffer: AudioBuffer; start: number; end: number };

const LOUD = 0.012;    // a sample above this is speech
const LEAD = 0.03;     // seconds kept before the first word
const TAIL = 0.12;     // and after the last one, for its natural fall

let ctx: AudioContext | null = null;
const clips = new Map<string, Promise<Clip | null>>();

/** Called from the Play click: browsers start audio only after the user has pressed something. */
export function unlock() {
  ctx ??= new AudioContext();
  void ctx.resume();
}

export const pause = () => void ctx?.suspend();
export const resume = () => void ctx?.resume();

function trim(buffer: AudioBuffer): Clip {
  const data = buffer.getChannelData(0);
  let first = 0, last = data.length - 1;
  while (first < last && Math.abs(data[first]) < LOUD) first++;
  while (last > first && Math.abs(data[last]) < LOUD) last--;
  const rate = buffer.sampleRate;
  return { buffer, start: Math.max(0, first / rate - LEAD), end: Math.min(buffer.duration, last / rate + TAIL) };
}

/** Starts loading clips ahead of time, so none of them waits on the network when its turn comes. */
export function load(id: string): Promise<Clip | null> {
  if (!clips.has(id)) {
    clips.set(id, fetch(`/audio/${id}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((bytes) => ctx!.decodeAudioData(bytes))
      .then(trim)
      .catch(() => null));
  }
  return clips.get(id)!;
}

/**
 * Plays a clip to its end (false: there is no recording). onTime gets the seconds played, the clip's length, and
 * where in the recording it started (the silence cut off its start: recorded word times are shifted by it);
 * level, when given, gets --voice-level (0..1) from the voice as it plays, as the app sets it from the mic.
 * alive() going false stops it.
 */
export async function play(id: string, alive: () => boolean, onTime?: (at: number, of: number, from: number) => void,
                           level?: HTMLElement | null): Promise<boolean> {
  const clip = await load(id);
  if (!clip || !ctx || !alive()) return false;
  const c = ctx;
  const source = c.createBufferSource();
  source.buffer = clip.buffer;
  const analyser = c.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  analyser.connect(c.destination);
  const length = clip.end - clip.start;
  const began = c.currentTime;
  source.start(0, clip.start, length);

  const samples = new Float32Array(analyser.fftSize);
  let loud = 0, frame = 0;
  const meter = () => {
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const s of samples) sum += s * s;
    const target = Math.min(1, Math.sqrt(sum / samples.length) * 6);
    loud += (target - loud) * (target > loud ? 0.45 : 0.06);
    level?.style.setProperty("--voice-level", loud.toFixed(3));
    frame = requestAnimationFrame(meter);
  };
  if (level) frame = requestAnimationFrame(meter);

  await new Promise<void>((resolve) => {
    const watch = setInterval(() => {
      if (!alive()) { source.stop(); return; }
      onTime?.(Math.min(length, c.currentTime - began), length, clip.start);
    }, 30);
    source.onended = () => { clearInterval(watch); resolve(); };
  });
  cancelAnimationFrame(frame);
  level?.style.setProperty("--voice-level", "0");
  onTime?.(length, length, clip.start);
  source.disconnect();
  analyser.disconnect();
  return true;
}
