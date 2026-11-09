// OnTaskDevDriver: DEV ONLY, disabled in the shipped scene. Runs a scripted list of presses and logs the result,
// so the flow can be verified without a mouse. Presses go through Interactable's trigger events, not a real ray.
// Refuses to press a hidden button, so it also checks "only the current state's controls are enabled".
// Commands, separated by ';': press <inputName> | wait <seconds> | until <STATE> | ray <inputName> | companion <id> | cycle | state
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import { OnTaskButton } from "./OnTaskButton"
import { OnTaskCompanions } from "./OnTaskCompanions"
import { OnTaskFlow } from "./OnTaskFlow"

@component
export class OnTaskDevDriver extends BaseScriptComponent {
  @input @hint("Command list, see header") commands: string = ""
  @input @hint("Flow under test") flow: OnTaskFlow
  @input @hint("Companion manager under test") companions: OnTaskCompanions
  @input @allowUndefined @hint("Play demo button, so a test can start the auto-play (name: playDemoButton)") playDemoButton: OnTaskButton

  private queue: string[] = []
  private resumeAt = 0
  private started = false
  private untilStart = 0

  onAwake() {
    this.createEvent("UpdateEvent").bind(() => this.update())
  }

  private update() {
    if (!this.started) {
      this.started = true
      this.queue = this.commands
        .split(";")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
      this.resumeAt = getTime() + 0.5
      print("[DevDriver] " + this.queue.length + " commands")
    }
    while (this.queue.length > 0 && getTime() >= this.resumeAt) {
      this.run(this.queue.shift())
    }
  }

  private run(line: string) {
    const parts = line.split(" ")
    const verb = parts[0]
    const name = parts[1]
    if (verb === "wait") {
      this.resumeAt = getTime() + parseFloat(name)
    } else if (verb === "until") {
      // until <STATE>: hold the queue until the flow reaches that state (60 s cap), so slow audio can't desync the script.
      if (this.untilStart === 0) {
        this.untilStart = getTime()
      }
      if (this.flow.getState() !== name && getTime() - this.untilStart < 60) {
        this.queue.unshift(line)
        this.resumeAt = getTime() + 0.25
        return
      }
      print("[DevDriver] until " + name + " reached=" + (this.flow.getState() === name) + " state=" + this.flow.getState())
      this.untilStart = 0
    } else if (verb === "tap") {
      // tap <inputName>: press as soon as the button is showing (retries, 60 s cap). Use for controls that appear with a voice line.
      if (this.untilStart === 0) {
        this.untilStart = getTime()
      }
      const pressed = this.button(name).simulatePress()
      if (!pressed && getTime() - this.untilStart < 60) {
        this.queue.unshift(line)
        this.resumeAt = getTime() + 0.25
        return
      }
      print("[DevDriver] tap " + name + " pressed=" + pressed + " state=" + this.flow.getState() + " stored=" + this.flow.getSavedCount())
      this.untilStart = 0
    } else if (verb === "press") {
      const pressed = this.button(name).simulatePress()
      print("[DevDriver] press " + name + " pressed=" + pressed + " state=" + this.flow.getState() + " stored=" + this.flow.getSavedCount())
    } else if (verb === "ray") {
      this.ray(name)
    } else if (verb === "companion") {
      const active = this.companions.setActive(name)
      print("[DevDriver] setActive(" + name + ") -> " + active + " state=" + this.flow.getState() + " stored=" + this.flow.getSavedCount())
    } else if (verb === "cycle") {
      this.companions.cycle()
      print("[DevDriver] cycled -> " + this.companions.activeCompanionId + " state=" + this.flow.getState() + " stored=" + this.flow.getSavedCount())
    } else if (verb === "state") {
      print("[DevDriver] state=" + this.flow.getState() + " stored=" + this.flow.getSavedCount())
    }
  }

  private button(name: string): OnTaskButton {
    const flow = this.flow as any
    if (name === "selectorButton") {
      return this.companions.selectorButton
    }
    if (name === "playDemoButton") {
      return this.playDemoButton
    }
    return flow[name] ? flow[name] : (flow.board as any)[name]
  }

  // Physics ray from the camera through a button: the same collider a mouse or hand ray has to reach.
  private ray(name: string) {
    const start = WorldCameraFinderProvider.getInstance().getTransform().getWorldPosition()
    const target = this.button(name).getSceneObject().getTransform().getWorldPosition()
    const end = target.add(target.sub(start).normalize().uniformScale(5))
    Physics.createGlobalProbe().rayCast(start, end, (hit) => {
      print("[DevDriver] ray " + name + " hit=" + (hit ? hit.collider.getSceneObject().name : "nothing"))
    })
  }
}
