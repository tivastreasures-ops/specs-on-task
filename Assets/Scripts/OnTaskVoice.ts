// OnTaskVoice: plays voice clips in order using the audio finish callback, never fixed delays.
// Inputs: the clips, one companion AudioComponent and one user AudioComponent. Clips never overlap.
// Companion lines (P01..P10) come from the active companion's art set; the P clips below are Phineas's and are
// the fallback when a companion has no clip (Merry and Snowy have no P03). T clips are the user's lines.
// Must not: decide what plays when. The flow calls playSequence.
import { OnTaskCompanions } from "./OnTaskCompanions"

export type VoiceStep = { clip: string; onStart?: () => void }
const COMPANION_CLIPS = ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10"]
const USER_CLIPS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7"]

@component
export class OnTaskVoice extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">OnTaskVoice</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input @hint("Play the T clips (user's lines). Preview and video only; a live Lens uses her real voice.")
  playUserVoice: boolean = true
  @ui.group_end
  @ui.group_start("Players")
  @input @hint("Companion voice player") companionAudio: AudioComponent
  @input @hint("User voice player") userAudio: AudioComponent
  @ui.group_end
  @ui.group_start("Companion clips")
  @input @hint("Omelet time") P01: AudioTrackAsset
  @input @hint("There it is") P02: AudioTrackAsset
  @input @hint("Want a sticky") P03: AudioTrackAsset
  @input @hint("No problem") P04: AudioTrackAsset
  @input @hint("Check out holiday fair") P05: AudioTrackAsset
  @input @hint("Saved") P06: AudioTrackAsset
  @input @hint("Saved, remind") P07: AudioTrackAsset
  @input @hint("Tossed it") P08: AudioTrackAsset
  @input @hint("Nudge: omelet") P09: AudioTrackAsset
  @input @hint("See your stickies") P10: AudioTrackAsset
  @ui.group_end
  @ui.group_start("User clips")
  @input @hint("Making omelet") T1: AudioTrackAsset
  @input @hint("Need garlic") T2: AudioTrackAsset
  @input @hint("Holiday fair Saturday") T3: AudioTrackAsset
  @input @hint("Yes") T4: AudioTrackAsset
  @input @hint("No") T5: AudioTrackAsset
  @input @hint("Right, the omelet") T6: AudioTrackAsset
  @input @hint("Thanks Phineas") T7: AudioTrackAsset
  @ui.group_end

  private generation = 0

  /** Stops anything playing, then runs steps in order. T steps are skipped when playUserVoice is off. */
  playSequence(steps: VoiceStep[], onDone?: () => void) {
    this.stop()
    const generation = this.generation
    const runStep = (index: number) => {
      if (generation !== this.generation) {
        return
      }
      if (index >= steps.length) {
        if (onDone) {
          onDone()
        }
        return
      }
      const step = steps[index]
      const isUser = step.clip.charAt(0) === "T"
      if (isUser && !this.playUserVoice) {
        runStep(index + 1)
        return
      }
      if (step.onStart) {
        step.onStart()
      }
      const track = this.trackFor(step.clip)
      if (!track) {
        print("[OnTask] voice clip " + step.clip + " not wired, skipping")
        runStep(index + 1)
        return
      }
      const player = isUser ? this.userAudio : this.companionAudio
      player.audioTrack = track
      player.setOnFinish(() => {
        print("[OnTask] voice finished " + step.clip)
        runStep(index + 1)
      })
      print("[OnTask] voice start " + step.clip)
      player.play(1)
    }
    runStep(0)
  }

  /** Companion clips resolve through the active companion (Phineas fallback); T clips are the inputs here. */
  private trackFor(clip: string): AudioTrackAsset | null {
    if (clip.charAt(0) === "P" && OnTaskCompanions.instance) {
      const own = OnTaskCompanions.instance.voiceClip(clip)
      if (own) {
        return own
      }
    }
    const fallback = (this as any)[clip] as AudioTrackAsset
    return fallback ? fallback : null
  }

  /**
   * Loads clips once, silently, so the first real line doesn't stall while its file opens.
   * Each clip is started at volume 0 and stopped at once. This can freeze the Lens for several seconds,
   * so it runs once when the Lens opens (before any recording), not when the demo starts.
   * Covers Phineas's clips, every companion's clips, and the user's lines.
   */
  warmUp() {
    if (this.warmedUp) {
      return
    }
    this.warmedUp = true
    this.stop()
    const companionTracks: AudioTrackAsset[] = COMPANION_CLIPS.map((c) => (this as any)[c] as AudioTrackAsset)
    if (OnTaskCompanions.instance) {
      companionTracks.push(...OnTaskCompanions.instance.allVoiceTracks())
    }
    const userTracks: AudioTrackAsset[] = USER_CLIPS.map((c) => (this as any)[c] as AudioTrackAsset)
    let loaded = 0
    for (const [player, tracks] of [[this.companionAudio, companionTracks], [this.userAudio, userTracks]] as [AudioComponent, AudioTrackAsset[]][]) {
      const volume = player.volume
      player.volume = 0
      for (const track of tracks) {
        if (!track) {
          continue
        }
        player.audioTrack = track
        player.play(1)
        player.stop(false)
        loaded++
      }
      player.volume = volume
    }
    print("[OnTask] voice warm-up loaded " + loaded + " clips")
  }

  private warmedUp = false

  /** Cancels the running sequence. Its finish callbacks become no-ops. */
  stop() {
    this.generation++
    for (const player of [this.companionAudio, this.userAudio]) {
      if (player.isPlaying()) {
        player.stop(false)
      }
    }
  }
}
