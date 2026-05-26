
<p align="center">
  <a href="https://chromewebstore.google.com/detail/glcikgfijpjhnnlgomdhjelfejhpmaje">
    <img src="https://img.shields.io/badge/🚀_Install_Chrome_Extension-Chrome_Web_Store-4285F4?style=for-the-badge" />
  </a>
</p>

# Mascot Walker

This is a standalone implementation of the small webmeji-style mascot seen in the open Chrome tab.

Observed source pattern:

- The page injects `/webmeji/config.js`, `/webmeji/webmeji.js`, and `/webmeji/webmeji.css`.
- The visible node is `.webmeji-container` with `position: fixed`, `z-index: 9999`, and a 100 by 100 pixel sprite image.
- The walking loop alternates sprite frames like `/webmeji/miku/shime1.png` and `/webmeji/miku/shime2.png`.
- Direction is flipped with `scaleX(...)`, while `left` and `top` are updated over time.
- On mobile, the original CSS scales the container down to 50 by 50 pixels.
- Dragging Miku upward and releasing now plays the original-style falling frames, then the fallen recovery frames.
- The idle loop can jump to the left wall, right wall, or top edge, then hang, climb, or fall back down.
- The crouched rest loop uses `shime26.png`, `shime27.png`, and `shime28.png` while Miku pauses between walks.

This local version uses the downloaded `assets/miku/shime*.png` frame files and the frame mapping from `assets/miku/config.js`.

```js
import { createMikuWalker } from "./miku-walker.js";

const walker = createMikuWalker({
  size: 100,
  speed: 70,
  bottom: 18,
  frames: {
    stand: "./assets/miku/shime1.png",
    walk: ["./assets/miku/shime1.png", "./assets/miku/shime2.png", "./assets/miku/shime3.png", "./assets/miku/shime2.png"],
    rest: ["./assets/miku/shime26.png", "./assets/miku/shime27.png", "./assets/miku/shime28.png", "./assets/miku/shime27.png"],
    wave: ["./assets/miku/shime15.png", "./assets/miku/shime16.png", "./assets/miku/shime17.png"],
    jump: "./assets/miku/shime22.png"
  }
});
```

Open `index.html` in a browser to try it.
