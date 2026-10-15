# Coconut Run — The Workshop

An independent recreation of the Johnson Controls Flash physics game, using modern JavaScript modules, Vite, Canvas 2D, and Matter.js. All artwork is drawn in code.

## Run

```sh
npm install
npm run dev
npm test
npm run build
```

Draw beams, blocks, discs, wheels, and suspension. Touching frame pieces weld together; wheels near frames receive axles. Test the design, release 15 coconuts, then hold right/D or left/A to drive. R returns to the editor; Space pauses. Touch controls, local design saving, three starter designs, adjustable motors and suspension, and delivery scoring are included.

The recreated course and efficiency formula approximate the original experience; they are not recovered original game data. The engine uses a fixed 120 Hz timestep, independent of display refresh rate. No original proprietary assets or Flash code are included.

## Research

- Original developer: https://colordodge.com/coconut-run
- Gameplay video inspected: https://www.youtube.com/watch?v=PzKAlUex3cQ
- Contemporary mechanics discussion: https://boards.straightdope.com/t/sweet-little-flash-physics-engineering-game-coconut-run/485795
- Archived tool descriptions and video collection: https://flamani.blog.fc2.com/blog-entry-75.html

## Arcade edition

Three selectable courses: Lagoon Express, Dune Rally, and Coconut Orbit (48% gravity). Hold Shift or the boost button for a rechargeable speed burst. Stars, checkpoint flags, airtime callouts, delivery confetti and gold/silver/bronze medals reward experimentation. Course personal bests stay in browser local storage.

**Quick ride** loads and drives your current design automatically after letting the cargo settle. Arrow keys take over immediately. **T** retries and **R** returns to the workshop. Sound is opt-in; reduced-motion preferences reduce particle effects.

Original campaign credits: game developer Jason K. Smith; digital production Colossal Squid Industries; agency Fallon; client Johnson Controls. This is an independent homage, not an official Johnson Controls game.
