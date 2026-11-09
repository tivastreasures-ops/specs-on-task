// OnTaskArtSlot: one visual quad. Clones the shared material so textures and opacity stay per object.
// Expects a RenderMeshVisual on this SceneObject. Art comes from one of two places:
//   slotKey set   -> OnTaskCompanions supplies it (per-companion slots, or "shared.sticky")
//   slotKey empty -> the `art` input on this component (backgrounds, highlight, demo panel)
// Must not: decide when it is visible. The flow owns that.
import { OnTaskCompanions } from "./OnTaskCompanions"

@component
export class OnTaskArtSlot extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">OnTaskArtSlot</span>')
  @ui.separator
  @input @hint("Art set key, e.g. faceYes or poseStove, or shared.sticky. Empty: use the art input below.")
  slotKey: string = ""
  @input @allowUndefined @hint("Used only when slotKey is empty. Drop a texture here.") art: Texture
  @input @hint("Crop the texture to fill this quad without stretching (centered). Used by scene backgrounds.")
  coverCrop: boolean = false
  @input @hint("Keep this quad's height and set its width from the art's aspect ratio. Used by the pill buttons.")
  fitWidthToArt: boolean = false
  @input @hint("Keep this quad's width and set its height from the art's aspect ratio. Used by the speech bubbles.")
  fitHeightToArt: boolean = false
  @input @hint("With fit width to art: the widest this quad may get, in cm (0 = no limit). A wider art shrinks, keeping its aspect.")
  maxWidthCm: number = 0
  @input @hint("When a max-width art shrinks, keep the bottom edge where it was (so a bow or footer stays put).")
  keepBottomEdge: boolean = false

  // Authored size and height, captured once, so swapping art always sizes from the design values.
  private designHeight = -1
  private designY = 0

  /** Called with the new size in cm when fitWidthToArt changes the width. A button uses it to resize its collider. */
  onSizeChanged: (widthCm: number, heightCm: number) => void = null

  private visual: RenderMeshVisual
  private material: Material
  private static unitQuad: RenderMesh = null
  private opacity = 1
  private currentTexture: Texture = null

  onAwake() {
    this.visual = this.getSceneObject().getComponent("Component.RenderMeshVisual")
    this.material = this.visual.mainMaterial.clone()
    this.visual.mainMaterial = this.material
    // Always a unit quad facing +Z; the object's scale is its size in cm.
    if (!OnTaskArtSlot.unitQuad) {
      OnTaskArtSlot.unitQuad = OnTaskArtSlot.buildQuad(0, 1, 0, 1)
    }
    this.visual.mesh = OnTaskArtSlot.unitQuad
    if (this.slotKey !== "") {
      OnTaskCompanions.instance.register(this)
    } else if (this.art) {
      this.setTexture(this.art)
    }
  }

  /** Returns false, keeping the current texture, when given nothing. A slot never goes blank. */
  setTexture(texture: Texture): boolean {
    if (!texture) {
      print("[OnTask] art slot '" + this.getSceneObject().name + "' has no texture for key '" + this.slotKey + "', keeping current")
      return false
    }
    this.currentTexture = texture
    this.material.mainPass.baseTex = texture
    this.material.mainPass.baseColor = new vec4(1, 1, 1, this.opacity)
    if (this.coverCrop) {
      this.applyCoverCrop(texture)
    } else if (this.fitWidthToArt) {
      this.applyFitWidth(texture)
    } else if (this.fitHeightToArt) {
      this.applyFitHeight(texture)
    }
    return true
  }

  private applyFitHeight(texture: Texture) {
    const t = this.getTransform()
    const s = t.getLocalScale()
    const width = Math.abs(s.x)
    t.setLocalScale(new vec3(s.x, width / (texture.getWidth() / texture.getHeight()), s.z))
  }

  /** Current quad size in cm (absolute local scale). */
  getSizeCm(): vec2 {
    const s = this.getTransform().getLocalScale()
    return new vec2(Math.abs(s.x), Math.abs(s.y))
  }

  private applyFitWidth(texture: Texture) {
    const t = this.getTransform()
    const s = t.getLocalScale()
    if (this.designHeight < 0) {
      this.designHeight = Math.abs(s.y)
      this.designY = t.getLocalPosition().y
    }
    const aspect = texture.getWidth() / texture.getHeight()
    let height = this.designHeight
    let width = height * aspect
    if (this.maxWidthCm > 0 && width > this.maxWidthCm) {
      width = this.maxWidthCm
      height = width / aspect
    }
    t.setLocalScale(new vec3(width, height * Math.sign(s.y || 1), s.z))
    if (this.keepBottomEdge) {
      const p = t.getLocalPosition()
      const bottom = this.designY - this.designHeight / 2
      t.setLocalPosition(new vec3(p.x, bottom + height / 2, p.z))
    }
    if (this.onSizeChanged) {
      this.onSizeChanged(width, height)
    }
  }

  setOpacity(alpha: number) {
    this.opacity = alpha
    this.material.mainPass.baseColor = new vec4(1, 1, 1, alpha)
  }

  getTextureName(): string {
    return this.currentTexture ? this.currentTexture.name : "(none)"
  }

  private applyCoverCrop(texture: Texture) {
    const scale = this.getTransform().getLocalScale()
    const quadAspect = Math.abs(scale.x / scale.y)
    const texAspect = texture.getWidth() / texture.getHeight()
    let uMin = 0
    let uMax = 1
    let vMin = 0
    let vMax = 1
    if (texAspect > quadAspect) {
      const keep = quadAspect / texAspect
      uMin = (1 - keep) / 2
      uMax = 1 - uMin
    } else {
      const keep = texAspect / quadAspect
      vMin = (1 - keep) / 2
      vMax = 1 - vMin
    }
    this.visual.mesh = OnTaskArtSlot.buildQuad(uMin, uMax, vMin, vMax)
  }

  private static buildQuad(uMin: number, uMax: number, vMin: number, vMax: number): RenderMesh {
    const builder = new MeshBuilder([
      { name: "position", components: 3 },
      { name: "normal", components: 3 },
      { name: "texture0", components: 2 },
    ])
    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16
    builder.appendVerticesInterleaved([
      -0.5, -0.5, 0, 0, 0, 1, uMin, vMin,
      0.5, -0.5, 0, 0, 0, 1, uMax, vMin,
      0.5, 0.5, 0, 0, 0, 1, uMax, vMax,
      -0.5, 0.5, 0, 0, 0, 1, uMin, vMax,
    ])
    builder.appendIndices([0, 1, 2, 0, 2, 3])
    builder.updateMesh()
    return builder.getMesh()
  }
}
