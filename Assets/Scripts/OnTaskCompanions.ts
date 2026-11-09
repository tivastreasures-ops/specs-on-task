// OnTaskCompanions: owns which companion is active and pushes that set's art to every keyed slot.
// Inputs: the four art sets, the shared sticky art, the selector switch and its demo panel button.
// Must not: touch flow state or the stored sticky list. Swapping only re-textures slots.
// Incomplete set policy: FALL BACK TO PHINEAS AND PRINT A WARNING, so a slot is never blank.
// Must sit above every OnTaskArtSlot in the hierarchy so its onAwake runs first.
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import { OnTaskArtSlot } from "./OnTaskArtSlot"
import { OnTaskButton } from "./OnTaskButton"
import { CompanionSlotKey, OnTaskCompanionArtSet } from "./OnTaskCompanionArtSet"

const FALLBACK_ID = "phineas"

@component
export class OnTaskCompanions extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">OnTaskCompanions: active art set</span>')
  @ui.separator
  @ui.group_start("Sets (empty slots until approved)")
  @input @hint("Phineas's set. Holds the placeholder art.") setPhineas: OnTaskCompanionArtSet
  @input @allowUndefined @hint("Hudson's set. Empty until approved.") setHudson: OnTaskCompanionArtSet
  @input @allowUndefined @hint("Merry's set. Empty until approved.") setMerry: OnTaskCompanionArtSet
  @input @allowUndefined @hint("Snowy's set. Empty until approved.") setSnowy: OnTaskCompanionArtSet
  @ui.group_end
  @ui.group_start("Shared art (all companions)")
  @input @allowUndefined @hint("Sticky art, used by the corner sticky and every board card") sharedStickyArt: Texture
  @ui.group_end
  @ui.group_start("Selector")
  @input @hint("Off: selector hidden and non-interactive, Phineas forced active. On: demo panel button cycles companions.")
  enableCompanionSelector: boolean = false
  @input @hint("Companion to start on when the selector is on. Ignored while it is off.")
  @widget(new ComboBoxWidget([new ComboBoxItem("phineas", "phineas"), new ComboBoxItem("hudson", "hudson"), new ComboBoxItem("merry", "merry"), new ComboBoxItem("snowy", "snowy")]))
  activeCompanionId: string = "phineas"
  @input @hint("Demo panel selector button") selectorButton: OnTaskButton
  @input @hint("Selector button label") selectorLabel: Text
  @ui.group_end

  /** Fires after art has been re-applied. Payload is the id actually active. */
  onCompanionChanged = new Event<string>()

  static instance: OnTaskCompanions
  private slots: OnTaskArtSlot[] = []
  private readonly order = ["phineas", "hudson", "merry", "snowy"]
  private cycleIndex = 0

  onAwake() {
    OnTaskCompanions.instance = this
    if (!this.enableCompanionSelector) {
      this.activeCompanionId = FALLBACK_ID
    }
    this.createEvent("OnStartEvent").bind(() => this.start())
  }

  private start() {
    if (this.enableCompanionSelector) {
      this.selectorButton.onPressed.add(() => this.cycle())
    }
    this.selectorButton.getSceneObject().enabled = this.enableCompanionSelector
    this.cycleIndex = Math.max(0, this.order.indexOf(this.activeCompanionId))
    this.setActive(this.activeCompanionId)
  }

  /** Slots register themselves in onAwake and get the current art immediately. */
  register(slot: OnTaskArtSlot) {
    this.slots.push(slot)
    this.applyTo(slot, this.currentSet())
  }

  /** Activate a set. While the selector is off, only Phineas can be active. */
  setActive(id: string): string {
    let resolved = id
    if (!this.enableCompanionSelector && id !== FALLBACK_ID) {
      print("[OnTask] companion selector is off, forcing " + FALLBACK_ID)
      resolved = FALLBACK_ID
    }
    const set = this.setFor(resolved)
    const missing = set ? set.missingSlots() : ["(no set wired)"]
    if (missing.length > 0 && resolved !== FALLBACK_ID) {
      print("[OnTask] WARNING companion '" + resolved + "' incomplete, " + missing.length + " slots missing (" + missing[0] + "...). Falling back to " + FALLBACK_ID)
      resolved = FALLBACK_ID
    }
    this.activeCompanionId = resolved
    const active = this.currentSet()
    let applied = 0
    for (const slot of this.slots) {
      if (this.applyTo(slot, active)) {
        applied++
      }
    }
    if (this.selectorLabel) {
      this.selectorLabel.text = "Companion: " + resolved
    }
    print("[OnTask] companion active=" + resolved + " slotsApplied=" + applied + "/" + this.slots.length)
    this.onCompanionChanged.invoke(resolved)
    return resolved
  }

  /** Attempts each companion in turn. Incomplete sets log the fallback. */
  cycle() {
    this.cycleIndex = (this.cycleIndex + 1) % this.order.length
    this.setActive(this.order[this.cycleIndex])
  }

  /** Voice clip for the active companion; falls back to Phineas's clip when the active set has none. */
  voiceClip(clip: string): AudioTrackAsset | null {
    const own = this.currentSet().getVoice(clip)
    if (own) {
      return own
    }
    return this.setPhineas ? this.setPhineas.getVoice(clip) : null
  }

  /** Every companion's voice clips, for warming them all up before a recording. */
  allVoiceTracks(): AudioTrackAsset[] {
    const tracks: AudioTrackAsset[] = []
    for (const set of [this.setPhineas, this.setHudson, this.setMerry, this.setSnowy]) {
      if (!set) {
        continue
      }
      for (let i = 1; i <= 10; i++) {
        const track = set.getVoice("P" + (i < 10 ? "0" + i : "" + i))
        if (track) {
          tracks.push(track)
        }
      }
    }
    return tracks
  }

  /** Re-applies the active set's art to one slot, e.g. after its slotKey changed. */
  refresh(slot: OnTaskArtSlot): boolean {
    return this.applyTo(slot, this.currentSet())
  }

  private setFor(id: string): OnTaskCompanionArtSet | null {
    switch (id) {
      case "phineas":
        return this.setPhineas
      case "hudson":
        return this.setHudson
      case "merry":
        return this.setMerry
      case "snowy":
        return this.setSnowy
    }
    return null
  }

  private currentSet(): OnTaskCompanionArtSet {
    return this.setFor(this.activeCompanionId) || this.setPhineas
  }

  private applyTo(slot: OnTaskArtSlot, set: OnTaskCompanionArtSet): boolean {
    if (slot.slotKey === "shared.sticky") {
      return slot.setTexture(this.sharedStickyArt)
    }
    return slot.setTexture(set.getTexture(slot.slotKey as CompanionSlotKey))
  }
}
