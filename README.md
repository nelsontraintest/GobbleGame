# 🦃 Gobble Game

**Big-Eat-Small Tic-Tac-Toe** (also known as Gobblet Gobblers) — a fully playable web game with an AI opponent, optimised for Apple iOS Safari (mobile-first).

---

## How to Play

### The Basics
- 3×3 board, just like Tic-Tac-Toe.
- **You** play 🔵 Blue; the **AI** plays 🔴 Red.
- Each player has **6 pieces**: 2 small, 2 medium, 2 large.

### On Your Turn
1. **Place** a new piece from your reserve onto any empty cell, or on top of a smaller piece of either colour.
2. **Move** one of your visible (top) pieces on the board to an empty cell or on top of a smaller piece.

### Gobbling
- A **larger piece can cover** ("gobble") a smaller piece of either colour.
- Only the **top visible piece** in each cell counts toward winning.
- Covered pieces may **reappear** if the piece on top moves away — watch out!

### Winning
Get **3 of your visible pieces in a row** — horizontally, vertically, or diagonally.

---

## Controls (Touch / Mobile)
1. Tap a piece in your reserve → tap a valid cell to place it.
2. Tap one of your pieces on the board → tap a valid destination to move it.
3. Tap the selected piece again (or an invalid cell) to deselect.

---

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Main game page (iOS meta tags, layout) |
| `style.css` | Mobile-first responsive styles, Safari-compatible |
| `game.js` | Game state, board/reserve rendering, move logic, win/draw detection |
| `ai.js` | AI opponent — minimax with alpha-beta pruning |

---

## Deploying to GitHub Pages

1. Go to **Settings → Pages** in this repository.
2. Under *Source*, select **Deploy from a branch** → `main` → `/ (root)`.
3. Click **Save**.
4. After a minute, your game is live at:  
   `https://<your-username>.github.io/GobbleGame/`

Open that URL in **iPhone Safari** to play! 🎮

---

## Technical Highlights

- **Pure HTML + CSS + JavaScript** — no build tools, no frameworks.
- **Minimax AI with alpha-beta pruning** (depth 5) — challenging but beatable.
- **Mobile-first** with proper `viewport`, `touch-action: manipulation`, and `apple-mobile-web-app-capable` meta tags.
- **Stack tracking** — every cell stores the full pile of pieces; covered pieces reappear correctly.
- **Win detection** checks only top (visible) pieces after every move.
- CSS animations for piece placement and winning celebration.