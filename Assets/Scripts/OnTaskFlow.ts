// OnTaskFlow: the demo's one state machine. Owns current state, active spot, timers, and the stored sticky list.
// Inputs: spots, per-state visuals, buttons, voice, board. Only the controls for the current state are enabled.
// Must not: reach into art. Art lives in OnTaskCompanions / OnTaskArtSlot, so swapping sets leaves this state alone.
//
// PREVIEW STAND-IN: the arc of five spots with fake-kitchen backgrounds only exists so the flow can be seen
// without a kitchen. A live Lens shows the real kitchen through the glasses, with content anchored to real places.
// Content is world-anchored to its spot, never head-locked. The arc is placed once from the user's start pose.
// The companion stays beside whichever spot is active: each spot's content root holds its own pose.
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import { OnTaskArtSlot } from "./OnTaskArtSlot"
import { OnTaskBoard, StickyItem } from "./OnTaskBoard"
import { OnTaskButton } from "./OnTaskButton"
import { OnTaskCompanions } from "./OnTaskCompanions"
import { OnTaskSpot } from "./OnTaskSpot"
import { OnTaskVoice } from "./OnTaskVoice"

type FlowState =
  | "COOKING"
  | "GARLIC"
  | "FLYER_OFFER"
  | "FLYER_IDLE"
  | "STICKY_PENDING"
  | "STICKY_PROPOSED"
  | "STICKY_RESOLVED"
  | "DRIFT_WAIT"
  | "DRIFT_NUDGE"
  | "DONE_COOKING"
  | "BROWSING"

type Timer = { at: number; run: () => void }
type Fade = { target: SceneObject; start: number; duration: number; done: () => void }

// Spot-local Y of the presenter panel: above the 23 cm window (top edge at +11.5), never over scene content.
// Panel center height above the spot. The panel is two rows tall (bottom at about 11.8 cm), so it sits just above the 11.5 cm window top.
const DEMO_PANEL_Y_CM = 17.3
const SPOT_YAW_DEGREES = [0, -45, -90, -135, -180]

@component
export class OnTaskFlow extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">OnTaskFlow: demo state machine</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Fake-kitchen stand-ins for preview. A live Lens shows the real kitchen through the glasses, so turn this off there.")
  showSceneBackgrounds: boolean = true
  @input @hint("Append the sample stickies after the real saved ones") includeSampleStickies: boolean = true
  @input
  @hint("Editable sample stickies for the browsing views")
  sampleStickies: string[] = ["Buy Eggs", "Water plants", "Don't forget sunglasses", "Charger cord is in front suitcase pocket", "Buy more pet food"]
  @input @hint("Text of the proposed sticky") stickyText: string = "Check out a holiday fair next Saturday, 1 to 5."
  @input @allowUndefined @hint("Art for the saved holiday fair sticky on the board (shared, all companions)") stickyArt: Texture
  @input
  @hint("Sample sticky art for the browsing views (shared). When filled, it replaces the text samples above.")
  sampleStickyArt: Texture[] = []
  @input
  @widget(new SliderWidget(0, 30, 0.5))
  @hint("Seconds from Drift until the nudge. A second tap of Drift skips the wait.")
  nudgeDelaySeconds: number = 8
  @input @widget(new SliderWidget(1, 20, 0.5)) @hint("Seconds the nudge bubble stays before fading") nudgeHoldSeconds: number = 5
  @input @widget(new SliderWidget(0.5, 10, 0.5)) @hint("Seconds the Saved / Remind confirmation stays") confirmHoldSeconds: number = 2.5
  @input @widget(new SliderWidget(0.1, 2, 0.1)) @hint("Fade length in seconds") fadeSeconds: number = 0.6
  @input
  @widget(new SliderWidget(40, 90, 1))
  @hint("Distance from the user's start to each spot. Spec: 56 cm (22 in). The SPECS 27 preview only shows about 32 cm of width at 56 cm; 66 cm fits the whole 38.1 cm window.")
  spotDistanceCm: number = 56
  @input
  @hint("Preview convenience, off by default: turns the arc so the active spot faces the camera. Breaks world anchoring, so never use on device.")
  previewRotateToActiveSpot: boolean = false
  @ui.group_end

  @ui.group_start("Spots")
  @input @hint("Parent of the five spots. Placed once from the user's start pose.") arcRoot: SceneObject
  @input @hint("Stove spot") spotStove: OnTaskSpot
  @input @hint("Spice shelf spot") spotSpiceShelf: OnTaskSpot
  @input @hint("Flyer counter spot") spotFlyerCounter: OnTaskSpot
  @input @hint("Dishes spot") spotDishes: OnTaskSpot
  @input @hint("Couch spot") spotCouch: OnTaskSpot
  @ui.group_end

  @ui.group_start("Per-state visuals")
  @input @hint("'There it is!' bubble") bubbleThereItIs: SceneObject
  @input @hint("Frame around the garlic jar") garlicHighlight: SceneObject
  @input @hint("'Want me to make a sticky?' bubble") bubbleWantSticky: SceneObject
  @input @hint("Proposed corner sticky") stickyCorner: SceneObject
  @input @hint("Corner sticky text") stickyCornerText: Text
  @input @hint("Saved / Remind confirmation") bubbleConfirm: SceneObject
  @input @hint("Confirmation text") bubbleConfirmText: Text
  @input @allowUndefined @hint("Confirmation bubble face; switches between the companion's Saved and Saved & Remind art") bubbleConfirmFace: OnTaskArtSlot
  @input @hint("Omelet nudge bubble") bubbleNudge: SceneObject
  @ui.group_end

  @ui.group_start("Controls")
  @input @hint("Yes") yesButton: OnTaskButton
  @input @hint("No") noButton: OnTaskButton
  @input @hint("Save & Remind") saveRemindButton: OnTaskButton
  @input @hint("Save") saveButton: OnTaskButton
  @input @hint("Dismiss: rejects a proposed sticky") dismissButton: OnTaskButton
  @input @hint("My Stickies: couch idle only") myStickiesButton: OnTaskButton
  @input @hint("Browsing board") board: OnTaskBoard
  @ui.group_end

  @ui.group_start("Demo panel (presenter tool)")
  @input @hint("Panel root. Follows the active spot, outside the display window.") demoPanel: SceneObject
  @input @hint("I need garlic") panelGarlic: OnTaskButton
  @input @hint("Notice flyer") panelFlyer: OnTaskButton
  @input @hint("Drift") panelDrift: OnTaskButton
  @input @hint("Done cooking") panelDoneCooking: OnTaskButton
  @input @hint("Reset") panelReset: OnTaskButton
  @ui.group_end

  @ui.group_start("Audio")
  @input @hint("Voice player") voice: OnTaskVoice
  @ui.group_end

  private state: FlowState = "COOKING"
  private activeSpot: OnTaskSpot
  private savedStickies: string[] = []
  private timers: Timer[] = []
  private fades: Fade[] = []
  private arcPlaced = false
  private startPosition = vec3.zero()
  private startYaw = 0

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.start())
    this.createEvent("UpdateEvent").bind(() => this.update())
  }

  getState(): string {
    return this.state
  }

  getSavedCount(): number {
    return this.savedStickies.length
  }

  private start() {
    for (const spot of this.allSpots()) {
      spot.background.enabled = this.showSceneBackgrounds
    }
    this.yesButton.onPressed.add(() => this.onYes())
    this.noButton.onPressed.add(() => this.onNo())
    this.saveButton.onPressed.add(() => this.onSave())
    this.saveRemindButton.onPressed.add(() => this.onSaveRemind())
    this.dismissButton.onPressed.add(() => this.onDismiss())
    this.myStickiesButton.onPressed.add(() => this.onOpenBoard())
    this.board.onClose.add(() => this.onCloseBoard())
    this.panelGarlic.onPressed.add(() => this.enterGarlic())
    this.panelFlyer.onPressed.add(() => this.enterFlyerOffer())
    this.panelDrift.onPressed.add(() => this.onDriftPressed())
    this.panelDoneCooking.onPressed.add(() => this.enterDoneCooking())
    this.panelReset.onPressed.add(() => this.reset())
    this.stickyCornerText.text = this.stickyText
    this.enterCooking()
  }

  private update() {
    const now = getTime()
    if (!this.arcPlaced) {
      this.placeArc()
    }
    const due = this.timers.filter((t) => t.at <= now)
    this.timers = this.timers.filter((t) => t.at > now)
    for (const timer of due) {
      timer.run()
    }
    const finished: Fade[] = []
    this.fades = this.fades.filter((fade) => {
      const t = Math.min(1, (now - fade.start) / fade.duration)
      this.setOpacityDeep(fade.target, 1 - t)
      if (t >= 1) {
        finished.push(fade)
      }
      return t < 1
    })
    for (const fade of finished) {
      fade.done()
    }
  }

  // ---------- states ----------

  private enterCooking() {
    this.transition("COOKING", this.spotStove)
    this.voice.playSequence([{ clip: "T1" }, { clip: "P01" }])
  }

  private enterGarlic() {
    this.transition("GARLIC", this.spotSpiceShelf)
    this.voice.playSequence([
      { clip: "T2" },
      {
        clip: "P02",
        onStart: () => {
          this.bubbleThereItIs.enabled = true
          this.garlicHighlight.enabled = true
        },
      },
    ])
  }

  private enterFlyerOffer() {
    this.transition("FLYER_OFFER", this.spotFlyerCounter)
    this.voice.playSequence([
      { clip: "T3" },
      {
        clip: "P03",
        onStart: () => {
          this.bubbleWantSticky.enabled = true
          this.show(this.yesButton)
          this.show(this.noButton)
        },
      },
    ])
  }

  private onNo() {
    this.transition("FLYER_IDLE", this.spotFlyerCounter)
    this.voice.playSequence([{ clip: "T5" }, { clip: "P04" }])
  }

  // No sticky exists until Yes has been answered and P05 has finished.
  private onYes() {
    this.transition("STICKY_PENDING", this.spotFlyerCounter)
    this.voice.playSequence([{ clip: "T4" }, { clip: "P05" }], () => this.enterStickyProposed())
  }

  private enterStickyProposed() {
    this.transition("STICKY_PROPOSED", this.spotFlyerCounter)
    this.setOpacityDeep(this.stickyCorner, 1)
    this.stickyCorner.enabled = true
    this.show(this.saveRemindButton)
    this.show(this.saveButton)
    this.show(this.dismissButton)
  }

  private onSave() {
    this.savedStickies.push(this.stickyText)
    print("[OnTask] sticky saved, stored=" + this.savedStickies.length)
    this.confirm("Saved!", "P06", "bubbleSaved")
  }

  // Confirmation only: no real reminder is scheduled.
  private onSaveRemind() {
    this.savedStickies.push(this.stickyText)
    print("[OnTask] sticky saved with remind confirmation, stored=" + this.savedStickies.length)
    this.confirm("I'll remind you Saturday morning.", "P07", "bubbleSavedRemind")
  }

  // Dismiss rejects the proposed sticky. It never closes a window; that is Close, on the board.
  private onDismiss() {
    print("[OnTask] sticky dismissed, stored=" + this.savedStickies.length)
    this.state = "STICKY_RESOLVED"
    this.hideStickyControls()
    this.voice.playSequence([{ clip: "P08" }])
    this.fadeOut(this.stickyCorner, () => this.returnToStove())
  }

  // The bubble shows the companion's baked-in "Saved" art when its set has it; otherwise the plain bubble draws the message.
  private confirm(message: string, clip: string, slotKey: string) {
    this.state = "STICKY_RESOLVED"
    this.hideStickyControls()
    let hasArt = false
    if (this.bubbleConfirmFace && OnTaskCompanions.instance) {
      this.bubbleConfirmFace.slotKey = slotKey
      hasArt = OnTaskCompanions.instance.refresh(this.bubbleConfirmFace)
    }
    this.bubbleConfirmText.getSceneObject().enabled = !hasArt
    this.bubbleConfirmText.text = message
    this.setOpacityDeep(this.bubbleConfirm, 1)
    this.bubbleConfirm.enabled = true
    this.voice.playSequence([{ clip }])
    this.after(this.confirmHoldSeconds, () => {
      this.fadeOut(this.bubbleConfirm)
      this.fadeOut(this.stickyCorner, () => this.returnToStove())
    })
  }

  // She goes back to cooking between the sticky and the dishes. Silent, and lets the clip finish.
  private returnToStove() {
    this.transition("COOKING", this.spotStove, false)
  }

  // The Lens cannot detect drift. This delay, or a second tap of Drift, is a stand-in for noticing it.
  private onDriftPressed() {
    if (this.state === "DRIFT_WAIT") {
      print("[OnTask] drift second tap, nudging now")
      this.playNudge()
      return
    }
    this.transition("DRIFT_WAIT", this.spotDishes)
    this.after(this.nudgeDelaySeconds, () => this.playNudge())
  }

  private playNudge() {
    this.transition("DRIFT_NUDGE", this.spotDishes)
    this.setOpacityDeep(this.bubbleNudge, 1)
    this.bubbleNudge.enabled = true
    this.voice.playSequence([{ clip: "P09" }, { clip: "T6" }, { clip: "T7" }])
    this.after(this.nudgeHoldSeconds, () => this.fadeOut(this.bubbleNudge))
  }

  private enterDoneCooking() {
    this.transition("DONE_COOKING", this.spotCouch)
    this.show(this.myStickiesButton)
    this.voice.playSequence([{ clip: "P10" }])
  }

  // Opened only by the user. Nothing opens the board automatically.
  private onOpenBoard() {
    this.transition("BROWSING", this.spotCouch)
    this.board.open(this.storedList())
  }

  private onCloseBoard() {
    this.transition("DONE_COOKING", this.spotCouch)
    this.show(this.myStickiesButton)
  }

  private reset() {
    print("[OnTask] RESET")
    this.savedStickies = []
    this.enterCooking()
  }

  // ---------- helpers ----------

  /** Every state starts here: cancels timers, fades and audio, hides all controls, switches spot. */
  private transition(next: FlowState, spot: OnTaskSpot, stopVoice: boolean = true) {
    print("[OnTask] state " + this.state + " -> " + next)
    this.state = next
    this.timers = []
    this.fades = []
    if (stopVoice) {
      this.voice.stop()
    }
    this.clearTransients()
    this.setActiveSpot(spot)
  }

  private clearTransients() {
    for (const object of [this.bubbleThereItIs, this.garlicHighlight, this.bubbleWantSticky, this.stickyCorner, this.bubbleConfirm, this.bubbleNudge]) {
      object.enabled = false
    }
    for (const button of [this.yesButton, this.noButton, this.saveRemindButton, this.saveButton, this.dismissButton, this.myStickiesButton]) {
      button.getSceneObject().enabled = false
    }
    this.board.close()
  }

  private hideStickyControls() {
    this.saveRemindButton.getSceneObject().enabled = false
    this.saveButton.getSceneObject().enabled = false
    this.dismissButton.getSceneObject().enabled = false
  }

  private show(button: OnTaskButton) {
    button.getSceneObject().enabled = true
  }

  /** Only the active spot's content is enabled. The presenter panel follows it, outside the window. */
  private setActiveSpot(spot: OnTaskSpot) {
    this.activeSpot = spot
    for (const candidate of this.allSpots()) {
      candidate.content.enabled = candidate === spot
    }
    this.demoPanel.setParent(spot.getSceneObject())
    const panel = this.demoPanel.getTransform()
    panel.setLocalPosition(new vec3(0, DEMO_PANEL_Y_CM, 0.5))
    panel.setLocalRotation(quat.quatIdentity())
    if (this.previewRotateToActiveSpot && this.arcPlaced) {
      this.placeArc()
    }
  }

  // Runs once from the camera's start pose, so the arc is world-locked afterwards.
  private placeArc() {
    if (!this.arcPlaced) {
      const camera = WorldCameraFinderProvider.getInstance().getTransform()
      const forward = camera.back
      this.startYaw = Math.atan2(-forward.x, -forward.z)
      this.startPosition = camera.getWorldPosition()
      this.arcPlaced = true
      for (const spot of this.allSpots()) {
        const t = spot.getSceneObject().getTransform()
        const p = t.getLocalPosition()
        const flat = new vec3(p.x, 0, p.z).normalize().uniformScale(this.spotDistanceCm)
        t.setLocalPosition(new vec3(flat.x, p.y, flat.z))
      }
      print("[OnTask] arc placed at " + this.startPosition + " yawDeg=" + (this.startYaw * MathUtils.RadToDeg).toFixed(1))
    }
    const index = this.allSpots().indexOf(this.activeSpot)
    const turn = this.previewRotateToActiveSpot ? -SPOT_YAW_DEGREES[index] * MathUtils.DegToRad : 0
    const transform = this.arcRoot.getTransform()
    transform.setWorldPosition(this.startPosition)
    transform.setWorldRotation(quat.fromEulerAngles(0, this.startYaw + turn, 0))
  }

  private allSpots(): OnTaskSpot[] {
    return [this.spotStove, this.spotSpiceShelf, this.spotFlyerCounter, this.spotDishes, this.spotCouch]
  }

  /** Real saved stickies first, then samples. Can be empty; the board handles that. */
  private storedList(): StickyItem[] {
    const saved: StickyItem[] = this.savedStickies.map((label) => ({ label, art: this.stickyArt ? this.stickyArt : null }))
    if (!this.includeSampleStickies) {
      return saved
    }
    const art = this.sampleStickyArt ? this.sampleStickyArt.filter((t) => !!t) : []
    const samples: StickyItem[] =
      art.length > 0
        ? art.map((t) => ({ label: t.name, art: t }))
        : (this.sampleStickies || []).map((label) => ({ label, art: null }))
    return saved.concat(samples)
  }

  private after(seconds: number, run: () => void) {
    this.timers.push({ at: getTime() + seconds, run })
  }

  private fadeOut(target: SceneObject, done?: () => void) {
    this.fades.push({
      target,
      start: getTime(),
      duration: this.fadeSeconds,
      done: () => {
        print("[OnTask] faded out " + target.name)
        target.enabled = false
        this.setOpacityDeep(target, 1)
        if (done) {
          done()
        }
      },
    })
  }

  private setOpacityDeep(object: SceneObject, alpha: number) {
    const art = object.getComponent(OnTaskArtSlot.getTypeName()) as OnTaskArtSlot
    if (art) {
      art.setOpacity(alpha)
    }
    const text = object.getComponent("Component.Text") as Text
    if (text) {
      const color = text.textFill.color
      text.textFill.color = new vec4(color.r, color.g, color.b, alpha)
    }
    for (let i = 0; i < object.getChildrenCount(); i++) {
      this.setOpacityDeep(object.getChild(i), alpha)
    }
  }
}
