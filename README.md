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
