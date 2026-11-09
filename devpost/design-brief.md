---
status: approved
---

# Design brief: On Task

<!-- Filled in by plan-lens from the learner's interview and the flow decisions that followed. Uses the learner's words where possible. Values the learner didn't choose are marked (default). -->

## The one spatial moment
I'm at my stove making an omelet. Phineas, my fox companion, sits on the rim of the pan. When something pulls me away, like a flyer for an event, Phineas offers to keep it as a sticky so I can go back to cooking. If I drift off to the dishes anyway, Phineas asks, "How's that omelet coming along?"

The idea came from a breakfast that should have taken 20 minutes and took about two hours, because every step (opening the fridge, seeing the cat food, noticing something on the table) set off something else.

## Why it belongs on glasses
- Uses: leaves your body free, draws in the world.
- Why it's better than the phone version: my hands are on the pan and my eyes stay on the stove. The companion sits on the thing I'm working on, not on a screen I have to pick up. That's what stops one distraction from turning into five.

## Product or overlay
- Type: overlay. It responds to a real kitchen and a real task.
- What the real version would sense: where I am in the kitchen, the garlic on the shelf, the flyer I picked up, and when I wander off.
- Stand-ins for the preview:
  - Five painted kitchen scenes (stove, spice shelf, flyer counter, dishes, couch) stand in for the real kitchen. They sit in an arc around the start position, and you turn to face each one. On glasses, the real kitchen would replace them.
  - A presenter panel stands in for voice, object recognition and drift detection. It stays visible in the preview and the video as the presenter's controls. Top row: "I need garlic", "Notice flyer", "Drift", "Done cooking" and "Reset". Second row: "Play demo" and "Companion".
  - "Play demo" runs the whole story by itself in about 70 to 75 seconds (garlic, flyer, Yes, Save, drift nudge, couch, My Stickies, then the Three and Collection views), so it can be recorded hands-free. Pressing Reset stops it.
  - "Companion" switches between Phineas the fox, Hudson the dog, Merry the bird and Snowy the cat. Each has their own bubbles, buttons, poses, paw board and voice.
  - Drift is a timer (default 8 s) or a second tap of "Drift". The Lens can't detect drift.
  - The voice is recorded clips. Each companion has their own lines, P01 to P10. My lines are T1 to T7, and they play only in the preview and video. A live Lens would use my real voice.
  - All clips are loaded silently once, about 2 seconds after the Lens opens, so the demo doesn't stall on the first line of each clip.

## Where things live
All sizes are in inches on the Specs display window, about 15.0 x 9.06 in seen from about 22 in. Positions are inches from the window's top-left.
- Where I'm looking during the main task: down at the pan on the stove.
- Each scene's content is anchored to its own spot (stove, spice shelf, flyer counter, dishes, couch), never to my head.
- The companion: 2.5 in tall, sitting on the pan rim while I cook, and beside whichever spot is active.
- "There it is!" bubble: 5.5 in wide, next to Phineas at the spice shelf. A pink highlight frames the garlic jar.
- "Want me to make a sticky?" bubble: 6.8 in wide, at the flyer counter.
- Proposed sticky: 2.8 in square, in the top-right corner (x 12.2 to 15.0, y 0.2 to 3.0).
- Yes / No and Save & Remind / Save / Dismiss: 1.05 in tall pills. Bottom edge at y 8.8. Yes at x 6.0, No at 9.0. Save & Remind at 4.5, Save at 7.5, Dismiss at 10.5.
- "Saved!" and "I'll remind you Saturday morning." bubbles: drawn art in each companion's style, where the sticky offer was.
- Drift nudge bubble: 7.0 in wide, at the dishes.
- My Stickies button: 1.3 in tall, centered at x 7.5, bottom edge at y 8.8. It shows only on the couch, never while cooking.
- Paw board: 7.6 in tall and about 11 in wide, on the couch spot. Browsing bar 0.9 in tall: Prev, Next, view icons (Single, Three, Collection) and Close.
- Board cap: no board is wider than 11 in. Hudson's, Merry's and Snowy's boards are wider art, so they are drawn a little smaller, and the stickies shrink with them. On those three boards the Collection stickies are a further 30% smaller and the second row sits 0.62 in higher, so the bow at the bottom never touches a sticky. Phineas's board is unchanged.
- Spots are 66 cm from the start position (default). At the spec's 56 cm, Lens Studio's preview cuts off the window's edges. At 66 cm the whole window fits.

## Hands and input
- Every button is a pinch (a mouse click in the preview).
- Yes / No: Phineas always asks permission before making a sticky.
- Save, Save & Remind, Dismiss: Dismiss rejects a proposed sticky. Close closes the board. The two are never mixed.
- My Stickies, Prev, Next, Single, Three, Collection, Close: browsing after cooking.
- Voice: none in this build. Every spoken trigger has a presenter-panel button.
- Targets should highlight when aimed at. Not built yet: the buttons currently have no hover state.

## When things show
- Only the controls for the current state are visible.
- Cooking: Phineas on the pan, no buttons.
- "There it is!" and the garlic highlight: show with Phineas's line, clear on the next step.
- Sticky offer: shows when I notice the flyer. No: Phineas says "No problem" and everything clears. Yes: the sticky appears.
- After Save ("Saved!"), Save & Remind ("I'll remind you Saturday morning.") or Dismiss (the sticky fades out, nothing saved), the confirmation fades and Phineas goes back to the stove.
- Drift nudge: shows after the timer or the tap, has no buttons, and fades on its own.
- The paw board never shows while I'm cooking. It opens only when I press My Stickies on the couch, and the view I pick is never changed automatically.
- If something needs attention out of view: Phineas's voice carries it.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. At start, Phineas sits on the pan at the stove with no buttons, and his first line plays.
2. "I need garlic" turns me to the spice shelf, where Phineas says "There it is!" and the garlic jar is highlighted.
3. "Notice flyer" shows "Want me to make a sticky?" with Yes and No. No clears it with no sticky. Yes shows exactly one sticky in the corner.
4. Save shows "Saved!", Save & Remind shows "I'll remind you Saturday morning.", and Dismiss fades the sticky and saves nothing.
5. "Drift" moves to the dishes, and after the delay (or a second tap) Phineas asks "How's that omelet coming along?" with no buttons. The bubble fades on its own.
6. "Done cooking" shows the couch with My Stickies, which never appears while cooking.
7. My Stickies opens the board with my saved sticky first. Single, Three and Collection switch views, Prev and Next move between stickies, and Close closes the board.
8. Reset returns to the stove and clears the saved stickies.

## Out of scope
- Task breakdown, and the Work-with-me and Quiet modes. These are mockup and video only.
- Real reminders. Save & Remind only shows a confirmation.
- Remembering stickies between runs. The list lasts one run of the Lens.
- Recognizing the real kitchen, voice commands, and real drift detection.

## Risks and open questions
- All four companions are complete: final art (bubbles, buttons, poses, paw board, My Stickies button) and their own ten voice lines each. The sticky art is shared by all four.
- The voice clips were made with ElevenLabs, and the art was made with AI image tools.
- Some controls are small for hands (0.9 in Prev, Next and view icons; 1.05 in pills). That's a choice I kept; real glasses would tell.
- Feel unproven: comfort over time, real hand tracking, and whether the nudge lands at the right moment can only be judged on glasses.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- LEAF was left out of this build. Each done criterion was checked instead with a scripted test driver in the preview (a hidden, normally-off script that presses the same buttons a user would and waits for each step to finish), plus the "Play demo" run for every companion. All 8 criteria pass.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
