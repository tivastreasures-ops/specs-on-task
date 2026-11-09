// OnTaskBoard: the browsing view (paw board, cards, browsing bar). A passive view.
// Inputs: its bar buttons, the cards root (one child per pooled card), and the empty-list text.
// Raises onClose only. Close closes this window and has nothing to do with Dismiss, which rejects a sticky.
// Must not: own or change the stored sticky list. The flow passes it in on open().
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import { OnTaskArtSlot } from "./OnTaskArtSlot"
import { OnTaskButton } from "./OnTaskButton"
import { OnTaskCompanions } from "./OnTaskCompanions"

type BoardView = "single" | "three" | "grid"

/** One sticky on the board. With art, the art shows and the label is only for logs; without art, the label is drawn on the fallback card. */
export type StickyItem = { label: string; art: Texture | null }
const IN_TO_CM = 2.54
const GRID_PAGE_SIZE = 9
const GRID_COLUMNS_X_IN = [3.55, 5.51, 7.5, 9.46, 11.45]

@component
export class OnTaskBoard extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">OnTaskBoard: browsing</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("Parent of the pooled card objects") cardsRoot: SceneObject
  @input @hint("Shown when there are no stickies") emptyText: Text
  @input @hint("Previous sticky") prevButton: OnTaskButton
  @input @hint("Next sticky") nextButton: OnTaskButton
  @input @hint("Single view") singleButton: OnTaskButton
  @input @hint("Three view") threeButton: OnTaskButton
  @input @hint("Collection view") gridButton: OnTaskButton
  @input @hint("Closes the board") closeButton: OnTaskButton
  @input @allowUndefined @hint("Card art for a sticky that has no art of its own (its label is drawn on top)") fallbackStickyArt: Texture
  @input @allowUndefined @hint("Paw board frame. When a companion's board is drawn smaller (width cap), the card layout shrinks with it.") boardFrame: SceneObject
  @input @hint("Frame height (cm) the card layout was designed for: Phineas's 7.6 in board") designFrameHeightCm: number = 19.3
  @input @hint("Extra shrink for Collection stickies on a capped (smaller) board, so the bow clears the second row. 1 = none. Phineas's full-size board is never affected.")
  collectionShrinkOnSmallBoard: number = 0.7
  @input @hint("On a capped (smaller) board, raise the Collection's second row by this many inches so the bow clears it.")
  collectionRowLiftIn: number = 0.62
  @ui.group_end
  @ui.group_start("Card sizes (inches)")
  @input @widget(new SliderWidget(2, 6, 0.1)) @hint("Single view card width") singleWidthIn: number = 4.3
  @input @widget(new SliderWidget(2, 6, 0.1)) @hint("Three view center card width") threeCenterWidthIn: number = 4.0
  @input @widget(new SliderWidget(1, 5, 0.1)) @hint("Three view side card width") threeSideWidthIn: number = 3.3
  @input @widget(new SliderWidget(1, 3, 0.1)) @hint("Collection card width") gridWidthIn: number = 1.9
  @ui.group_end

  onClose = new Event<void>()
  private items: StickyItem[] = []
  private current = 0
  private view: BoardView = "single"
  private cards: { root: SceneObject; art: OnTaskArtSlot; text: Text }[] = []

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.prevButton.onPressed.add(() => this.step(-1))
      this.nextButton.onPressed.add(() => this.step(1))
      this.singleButton.onPressed.add(() => this.setView("single"))
      this.threeButton.onPressed.add(() => this.setView("three"))
      this.gridButton.onPressed.add(() => this.setView("grid"))
      this.closeButton.onPressed.add(() => this.onClose.invoke())
      // A companion swap can resize the frame; redraw so the cards follow it.
      if (OnTaskCompanions.instance) {
        OnTaskCompanions.instance.onCompanionChanged.add(() => {
          if (this.getSceneObject().enabled && this.items.length > 0) {
            this.render()
          }
        })
      }
    })
  }

  /** Opens on the Single view. Views change only when the user picks one. */
  open(items: StickyItem[]) {
    this.items = items
    this.current = 0
    this.getSceneObject().enabled = true
    this.setView("single")
  }

  close() {
    this.getSceneObject().enabled = false
  }

  private collectCards() {
    if (this.cards.length > 0) {
      return
    }
    for (let i = 0; i < this.cardsRoot.getChildrenCount(); i++) {
      const root = this.cardsRoot.getChild(i)
      const art = root.getChild(0).getComponent(OnTaskArtSlot.getTypeName()) as OnTaskArtSlot
      const text = root.getChild(1).getComponent("Component.Text") as Text
      this.cards.push({ root, art, text })
    }
  }

  private step(delta: number) {
    const count = this.items.length
    if (count === 0) {
      return
    }
    this.current = (this.current + delta + count) % count
    print("[OnTask] board current=" + this.current + "/" + count + " '" + this.items[this.current].label + "'")
    this.render()
  }

  private setView(view: BoardView) {
    this.view = view
    print("[OnTask] board view=" + view + " items=" + this.items.length)
    this.singleButton.setSelected(view === "single")
    this.threeButton.setSelected(view === "three")
    this.gridButton.setSelected(view === "grid")
    this.render()
  }

  private render() {
    this.collectCards()
    for (const card of this.cards) {
      card.root.enabled = false
    }
    this.emptyText.getSceneObject().enabled = this.items.length === 0
    if (this.items.length === 0) {
      return
    }
    if (this.view === "single") {
      this.place(0, this.current, 7.5, 3.82, this.singleWidthIn, true)
    } else if (this.view === "three") {
      this.renderThree()
    } else {
      this.renderGrid()
    }
  }

  // With fewer than three stickies, a side card is left empty rather than repeating one.
  private renderThree() {
    const count = this.items.length
    this.place(0, this.current, 7.5, 3.82, this.threeCenterWidthIn, true)
    if (count >= 2) {
      this.place(1, (this.current + 1) % count, 11.5, 3.82, this.threeSideWidthIn, false)
    }
    if (count >= 3) {
      this.place(2, (this.current - 1 + count) % count, 3.56, 3.82, this.threeSideWidthIn, false)
    }
  }

  private renderGrid() {
    const page = Math.floor(this.current / GRID_PAGE_SIZE)
    const start = page * GRID_PAGE_SIZE
    const end = Math.min(start + GRID_PAGE_SIZE, this.items.length)
    for (let i = start; i < end; i++) {
      const slot = i - start
      const column = slot < 5 ? slot : slot - 5
      const yIn = slot < 5 ? 2.72 : 4.96 - (this.isSmallBoard() ? this.collectionRowLiftIn : 0)
      this.place(slot, i, GRID_COLUMNS_X_IN[column], yIn, this.gridWidthIn, i === this.current)
    }
  }

  /** True when the active companion's board is drawn smaller than Phineas's (width cap). */
  private isSmallBoard(): boolean {
    if (!this.boardFrame) {
      return false
    }
    return Math.abs(this.boardFrame.getTransform().getLocalScale().y) / this.designFrameHeightCm < 0.999
  }

  // Cards scale as a whole. A card with art takes the art's aspect ratio (never stretched) and hides its label;
  // a card without art is square, shows the fallback card, and draws its label.
  private place(cardIndex: number, itemIndex: number, xIn: number, yIn: number, widthIn: number, isCurrent: boolean) {
    const card = this.cards[cardIndex]
    const item = this.items[itemIndex]
    card.root.enabled = true
    const transform = card.root.getTransform()
    const position = transform.getLocalPosition()
    // Layout is designed for Phineas's board; scale it about the frame's center when the frame is drawn smaller.
    let k = 1
    let cx = 0
    let cy = 0
    if (this.boardFrame) {
      const frame = this.boardFrame.getTransform()
      k = Math.min(1, Math.abs(frame.getLocalScale().y) / this.designFrameHeightCm)
      cx = frame.getLocalPosition().x
      cy = frame.getLocalPosition().y
    }
    const x = (xIn - 7.5) * IN_TO_CM
    const y = (4.53 - yIn) * IN_TO_CM
    transform.setLocalPosition(new vec3(cx + (x - cx) * k, cy + (y - cy) * k, position.z))
    let width = widthIn * IN_TO_CM * k
    if (this.view === "grid" && k < 0.999) {
      width *= this.collectionShrinkOnSmallBoard
    }
    const art = item.art ? item.art : this.fallbackStickyArt
    const aspect = item.art ? item.art.getWidth() / item.art.getHeight() : 1
    transform.setLocalScale(new vec3(width, width / aspect, 1))
    if (art) {
      card.art.setTexture(art)
    }
    card.text.getSceneObject().enabled = !item.art
    card.text.text = item.label
    card.art.setOpacity(isCurrent || this.view !== "grid" ? 1 : 0.7)
  }
}
