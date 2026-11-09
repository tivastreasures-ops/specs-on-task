// OnTaskButton: a SIK-pinchable control. Mouse in Interactive Preview, hands on device, LEAF all reach it.
// Expects a unit-scale root (this object) with a child face (OnTaskArtSlot) and optional child Text.
// Owns the collider and Interactable; both are built in onAwake and bound in OnStartEvent per SIK rules.
// Must not: know what a press means. It only raises onPressed.
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import { OnTaskArtSlot } from "./OnTaskArtSlot"

@component
export class OnTaskButton extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">OnTaskButton</span>')
  @ui.separator
  @input @hint("Collider width in cm") widthCm: number = 6
  @input @hint("Collider height in cm") heightCm: number = 2.667
  @input @allowUndefined @hint("Child face quad. Dims when this button is an unselected view icon.") face: OnTaskArtSlot

  onPressed = new Event<void>()
  private interactable: Interactable

  onAwake() {
    const collider = this.getSceneObject().createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(this.widthCm, this.heightCm, 0.5)
    collider.shape = shape
    collider.fitVisual = false
    // Pills whose face fits its width to the art: keep the click area the same size as the art.
    if (this.face && this.face.fitWidthToArt) {
      const resize = (w: number, h: number) => {
        const s = Shape.createBoxShape()
        s.size = new vec3(w, h, 0.5)
        collider.shape = s
      }
      this.face.onSizeChanged = resize
      const size = this.face.getSizeCm()
      resize(size.x, size.y)
    }
    this.interactable = this.getSceneObject().createComponent(Interactable.getTypeName()) as Interactable
    this.createEvent("OnStartEvent").bind(() => {
      this.interactable.onTriggerEnd.add(() => this.onPressed.invoke())
    })
  }

  /** Selected view icons are full strength, others dim. */
  setSelected(selected: boolean) {
    if (this.face) {
      this.face.setOpacity(selected ? 1 : 0.45)
    }
  }

  /** Runs the real Interactable trigger path without an interactor ray. Used by the dev driver and the Play demo auto-play. Refuses hidden buttons. */
  simulatePress(): boolean {
    if (!this.getSceneObject().isEnabledInHierarchy) {
      return false
    }
    const args = { interactor: { inputType: 1 } } as any
    this.interactable.triggerStart(args)
    this.interactable.triggerEnd(args)
    return true
  }
}
