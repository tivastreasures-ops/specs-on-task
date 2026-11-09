// OnTaskSpot: handles for one world-anchored spot. Holds no logic.
// Expects: the background quad and the content root (which holds the companion pose for this spot).
@component
export class OnTaskSpot extends BaseScriptComponent {
  @input @hint("Fake-kitchen background quad, 38.1 x 23.0 cm") background: SceneObject
  @input @hint("Everything that belongs to this spot. Enabled only while the spot is active.") content: SceneObject
}
