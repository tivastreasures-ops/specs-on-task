// OnTaskAutoPlay: the "Play demo" button. Plays the whole flow by itself for recording, with no mouse and no camera moves.
// It presses the same buttons a person would (through each button's real SIK trigger), waits for each screen
// before the next press, and turns each scene toward the camera so the viewer never has to look around.
// Inputs: the flow, the voice player, the Play demo button. Reset (pressed by the presenter) stops a running demo.
// Must not: change flow rules. It only presses buttons that are showing.
// Steps, separated by ';': press <button> | tap <button> (press once it is showing) | until <STATE> | wait <seconds> | end
import { OnTaskButton } from "./OnTaskButton"
import { OnTaskFlow } from "./OnTaskFlow"
import { OnTaskVoice } from "./OnTaskVoice"

const DEFAULT_STEPS =
  "press panelReset; until COOKING; wait 6.5; " +
  "press panelGarlic; until GARLIC; wait 6; " +
  "press panelFlyer; until FLYER_OFFER; tap yesButton; until STICKY_PROPOSED; wait 3; " +
  "tap saveButton; until COOKING; wait 1; " +
  "press panelDrift; until DRIFT_NUDGE; wait 11; " +
  "press panelDoneCooking; until DONE_COOKING; wait 4; " +
  "tap myStickiesButton; until BROWSING; wait 4; press threeButton; wait 4; press gridButton; wait 6; end"
const STEP_TIMEOUT_S = 30

@component
export class OnTaskAutoPlay extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">OnTaskAutoPlay: Play demo</span>')
  @ui.separator
  @input @hint("Flow to drive") flow: OnTaskFlow
  @input @hint("Voice player, warmed up before the run so the first lines don't stall") voice: OnTaskVoice
  @input @hint("Demo panel 'Play demo' button") playButton: OnTaskButton
  @input @hint("Turn each scene toward the camera during the demo (preview/video only)") turnScenesTowardCamera: boolean = true
  @input @hint("Seconds to wait after pressing Play demo before the first press") warmUpSeconds: number = 1.5
  @input @hint("Demo script, see header") steps: string = DEFAULT_STEPS

  private queue: string[] = []
  private running = false
  private resumeAt = 0
  private stepStart = 0
  private startedAt = 0
  private pressingReset = false

  onAwake() {
    this.createEvent("UpdateEvent").bind(() => this.update())
    this.createEvent("OnStartEvent").bind(() => {
      // Warm the voices once, shortly after the Lens opens, so the demo itself never freezes on a first-load.
      const warm = this.createEvent("DelayedCallbackEvent")
      warm.bind(() => this.voice.warmUp())
      warm.reset(2)
      this.playButton.onPressed.add(() => this.start())
      this.flow.panelReset.onPressed.add(() => {
        if (this.running && !this.pressingReset) {
          this.finish("stopped by Reset")
        }
      })
    })
  }

  private start() {
    if (this.running) {
      return
    }
    this.flow.previewRotateToActiveSpot = this.turnScenesTowardCamera
    this.voice.warmUp()
    const script = this.steps && this.steps.trim().length > 0 ? this.steps : DEFAULT_STEPS
    this.queue = script
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    this.running = true
    this.startedAt = getTime()
    this.resumeAt = getTime() + this.warmUpSeconds
    this.stepStart = 0
    print("[AutoPlay] start, " + this.queue.length + " steps")
  }

  private update() {
    while (this.running && this.queue.length > 0 && getTime() >= this.resumeAt) {
      this.run(this.queue.shift())
    }
  }

  private run(line: string) {
    const [verb, arg] = line.split(" ")
    if (verb === "wait") {
      this.resumeAt = getTime() + parseFloat(arg)
    } else if (verb === "until") {
      if (this.holdUntil(this.flow.getState() === arg, line)) {
        return
      }
      print("[AutoPlay] " + line + " reached=" + (this.flow.getState() === arg) + " t=" + this.elapsed())
    } else if (verb === "tap") {
      const pressed = this.press(arg)
      if (this.holdUntil(pressed, line)) {
        return
      }
      print("[AutoPlay] tap " + arg + " pressed=" + pressed + " t=" + this.elapsed())
    } else if (verb === "press") {
      print("[AutoPlay] press " + arg + " pressed=" + this.press(arg) + " t=" + this.elapsed())
    } else if (verb === "end") {
      this.finish("complete")
    }
  }

  // Keeps a step at the front of the queue until its condition holds, up to STEP_TIMEOUT_S; then logs and moves on.
  private holdUntil(done: boolean, line: string): boolean {
    if (this.stepStart === 0) {
      this.stepStart = getTime()
    }
    if (!done && getTime() - this.stepStart < STEP_TIMEOUT_S) {
      this.queue.unshift(line)
      this.resumeAt = getTime() + 0.2
      return true
    }
    if (!done) {
      print("[AutoPlay] STEP FAILED (timed out): " + line)
    }
    this.stepStart = 0
    return false
  }

  private press(name: string): boolean {
    const flow = this.flow as any
    const button = (flow[name] ? flow[name] : (flow.board as any)[name]) as OnTaskButton
    if (!button) {
      print("[AutoPlay] unknown button " + name)
      return false
    }
    this.pressingReset = name === "panelReset"
    const pressed = button.simulatePress()
    this.pressingReset = false
    return pressed
  }

  private finish(reason: string) {
    this.running = false
    this.queue = []
    print("[AutoPlay] " + reason + " after " + this.elapsed() + " s")
  }

  private elapsed(): string {
    return (getTime() - this.startedAt).toFixed(1)
  }
}
