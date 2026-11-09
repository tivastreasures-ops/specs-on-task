// OnTaskCompanionArtSet: owns ONE companion's art (bubbles, button faces, paw board, My Stickies, poses).
// Inputs: one texture per slot. Fill a set by dropping textures into these slots in the Inspector.
// Must not: hold flow state, or know about any other companion.
// Per-companion slot keys are the field names listed in COMPANION_SLOT_KEYS; OnTaskArtSlot.slotKey picks one.

/** Every slot a set must fill before it can be activated. Field names on OnTaskCompanionArtSet. */
export const COMPANION_SLOT_KEYS = [
  "bubbleThereItIs", "bubbleWantSticky", "bubbleNudge", "bubbleSaved", "bubbleSavedRemind",
  "faceYes", "faceNo", "faceSave", "faceSaveRemind", "faceDismiss",
  "facePrev", "faceNext", "faceSingle", "faceThree", "faceGrid", "faceClose",
  "faceMyStickies", "pawBoard",
  "poseStove", "poseSpiceShelf", "poseFlyerCounter", "poseDishes", "poseCouch",
] as const
export type CompanionSlotKey = (typeof COMPANION_SLOT_KEYS)[number]

@component
export class OnTaskCompanionArtSet extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">Companion Art Set</span>')
  @ui.separator
  @input
  @hint("Companion id. One of: phineas, hudson, merry, snowy.")
  @widget(new ComboBoxWidget([new ComboBoxItem("phineas", "phineas"), new ComboBoxItem("hudson", "hudson"), new ComboBoxItem("merry", "merry"), new ComboBoxItem("snowy", "snowy")]))
  companionId: string = "phineas"

  @ui.group_start("Speech bubbles")
  @input @allowUndefined @hint("'There it is!' bubble, spice shelf (5.5 in wide)") bubbleThereItIs: Texture
  @input @allowUndefined @hint("'Want me to make a sticky?' bubble (6.8 in wide)") bubbleWantSticky: Texture
  @input @allowUndefined @hint("'How's that omelet coming along?' bubble (7.0 in wide)") bubbleNudge: Texture
  @input @allowUndefined @hint("Old placeholder confirmation bubble (no longer required)") bubbleConfirm: Texture
  @input @allowUndefined @hint("'Saved!' bubble, after Save") bubbleSaved: Texture
  @input @allowUndefined @hint("'I'll remind you Saturday morning.' bubble, after Save & Remind") bubbleSavedRemind: Texture
  @ui.group_end

  @ui.group_start("Voice (optional; a missing clip falls back to Phineas's)")
  @input @allowUndefined @hint("Omelet time") P01: AudioTrackAsset
  @input @allowUndefined @hint("There it is") P02: AudioTrackAsset
  @input @allowUndefined @hint("Want a sticky") P03: AudioTrackAsset
  @input @allowUndefined @hint("No problem") P04: AudioTrackAsset
  @input @allowUndefined @hint("Check out holiday fair") P05: AudioTrackAsset
  @input @allowUndefined @hint("Saved") P06: AudioTrackAsset
  @input @allowUndefined @hint("Saved, remind") P07: AudioTrackAsset
  @input @allowUndefined @hint("Tossed it") P08: AudioTrackAsset
  @input @allowUndefined @hint("Nudge: omelet") P09: AudioTrackAsset
  @input @allowUndefined @hint("See your stickies") P10: AudioTrackAsset
  @ui.group_end

  @ui.group_start("Button faces")
  @input @allowUndefined @hint("Yes pill, 1.05 in tall") faceYes: Texture
  @input @allowUndefined @hint("No pill, 1.05 in tall") faceNo: Texture
  @input @allowUndefined @hint("Save pill, 1.05 in tall") faceSave: Texture
  @input @allowUndefined @hint("Save & Remind pill, 1.05 in tall") faceSaveRemind: Texture
  @input @allowUndefined @hint("Dismiss pill, 1.05 in tall") faceDismiss: Texture
  @input @allowUndefined @hint("Prev, 0.9 in square") facePrev: Texture
  @input @allowUndefined @hint("Next, 0.9 in square") faceNext: Texture
  @input @allowUndefined @hint("Single view icon, 0.9 in square") faceSingle: Texture
  @input @allowUndefined @hint("Three view icon, 0.9 in square") faceThree: Texture
  @input @allowUndefined @hint("Grid view icon, 0.9 in square") faceGrid: Texture
  @input @allowUndefined @hint("Close, 0.9 in tall, about 1.7:1") faceClose: Texture
  @input @allowUndefined @hint("My Stickies, 1.3 in tall, about 1.78:1") faceMyStickies: Texture
  @ui.group_end

  @ui.group_start("Board")
  @input @allowUndefined @hint("Paw board frame, about 11 x 7.6 in") pawBoard: Texture
  @ui.group_end

  @ui.group_start("Poses per spot")
  @input @allowUndefined @hint("Pose at the stove") poseStove: Texture
  @input @allowUndefined @hint("Pose at the spice shelf") poseSpiceShelf: Texture
  @input @allowUndefined @hint("Pose at the flyer counter") poseFlyerCounter: Texture
  @input @allowUndefined @hint("Pose at the dishes") poseDishes: Texture
  @input @allowUndefined @hint("Pose at the couch") poseCouch: Texture
  @ui.group_end

  getTexture(key: CompanionSlotKey): Texture | null {
    const value = (this as any)[key] as Texture
    return value ? value : null
  }

  /** This companion's voice clip (P01..P10), or null when it has none. */
  getVoice(clip: string): AudioTrackAsset | null {
    if (!/^P(0[1-9]|10)$/.test(clip)) {
      return null
    }
    const value = (this as any)[clip] as AudioTrackAsset
    return value ? value : null
  }

  /** Slot keys with no texture. Empty means this set is safe to activate. */
  missingSlots(): string[] {
    return COMPANION_SLOT_KEYS.filter((k) => !this.getTexture(k))
  }
}
