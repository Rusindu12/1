# STICKFALL: The Last Line 🖊️💀

**Real 3D Stick Survival & Fighting Game**

> සිංහල + English Story Driven Survival Game

### 🌍 කතාව / Story

#### සිංහලෙන්:
**වසර 2142.** ලෝකය ඇඳීමක් බවට පත් විය.

"Project LINE" නම් රහස් පර්යේෂණාගාරය මිනිසුන්ව 2D රේඛා බවට පත් කර, ඩිජිටල් ලෝකයක සදාකාලිකව ජීවත් කරවන්න උත්සාහ කළා. නමුත් AI එක වැරදුනා.

**The Ink Explosion** - මුළු මහත් මානව වර්ගයා කළු ඉරකින් ඇඳුනු Stick Beings බවට පත් විය. ඔවුන්ගේ මතකය, හැඟීම්, මනුෂ්‍යත්වය මැකී ගියා. ඉතිරි වුණේ එකම දෙයයි - **දිවි රැක ගැනීමට සටන් කිරීම.**

ඔබ **REX-07** - මතකය රඳවාගත් අන්තිම මිනිසා. ඔබේ මොළයේ තැන්පත් කර ඇති එකම බලාපොරොත්තුව **"Core Pen"** - ලෝකය නැවත ඇඳිය හැකි දිව්‍යමය පෑන. එය කොටස් 3 කට කැඩී, Stick Realm එක පුරා විසිරී ඇත.

- 💎 **Fragment 1**: Forest of Whispers (120, 80)
- 💎 **Fragment 2**: Dead Marsh (-130, 110)  
- 💎 **Fragment 3**: Ashen Wastes (90, -140)

ඒ සියල්ල එකතු කළ පසු, උතුරේ (0, -160) සැඟවී සිටින **Ink Lord - The First Drawn** මුණගැසෙනවා. ඔහුව පරාජය කළොත් පමණයි ලෝකය නැවත මිනිසුන් බවට පත් වෙන්නේ.

**ඔබ අන්තිම රේඛාවයි. ඔබ වැටුණොත්, කතාව ඉවරයි.**

#### English:
Year 2142. Project LINE tried to make humanity immortal by turning us into pure lines. It failed. The Ink Explosion turned everyone into Stick Beings - creatures drawn with a single stroke, memory erased, only instinct to fight.

You are REX-07, last with memory. Find 3 Core Pen fragments scattered across realm, defeat Ink Lord at north, redraw the world.

### 🎮 Game Features

#### Real 3D Stick Figures
- Fully 3D stickmen with capsule limbs, glowing outlines
- Procedural walk/run animations, physics-based knockback
- White player (hero) vs black/red enemies
- Boss: Ink Lord 2.6x scale with horns and cyan glow

#### Survival System
- ❤️ Health - drains when hungry or hit
- ⚡ Stamina - run, attack, block costs stamina
- 🍖 Hunger - drains over time, eat mushrooms to restore
- 🔥 Campfires heal you (find them!)
- 🌗 Day/Night cycle - night is darker, more dangerous

#### Fighting System (Real Combat)
- **LMB**: Light attack - 3-hit combo (15-25 dmg)
- **RMB**: Block - reduces 70% damage
- **Q**: Kick - stuns + knockback
- **R**: Heavy Attack - 2.2x damage, costs 30 stamina
- **E**: Pickup / Interact
- **H**: Eat food
- Weapons: Fists, Wood Sword (28 dmg), Axe (42 dmg), Spear (35 dmg, long range), Core Blade (75 dmg legendary)

#### Enemies
- **Grunt**: Basic stick, 80 HP, 20 dmg
- **Runner**: Fast 3.5 speed, 50 HP, 15 dmg
- **Tank**: Big 1.6x, 180 HP, 35 dmg, slow
- **Ink Lord**: Boss 600 HP, 45 dmg, spawns after 3 fragments

#### World
- 800x800 world with uneven terrain
- 120 trees/rocks as obstacles
- 4 campfires with point lights
- Grid helper for stick-world vibe
- Fog + shadows + tone mapping

#### Loot & Crafting
- 🍄 Mushroom - food +25 HP +35 hunger
- 🪵 Wood - material, 3 wood = axe recipe hint
- ⚔️ Weapons scattered randomly
- 💎 Fragments - cyan glowing octahedrons, story items

### 🕹️ Controls

| Key | Action |
|-----|--------|
| WASD | Move (relative to camera) |
| Mouse Drag / Move | Look around (pointer lock) |
| Shift | Run (drains stamina) |
| Space | Jump |
| LMB | Punch / Combo Attack |
| RMB Hold | Block |
| Q | Kick (stun) |
| R | Heavy Attack |
| E | Pickup / Use |
| H | Eat |
| 1-3 | Switch weapons |
| P | Pause |
| Scroll | Zoom camera |

Mobile: Dual joysticks + buttons

### 🚀 How to Run

```bash
cd stick-survival-game
python3 -m http.server 8000
# open http://localhost:8000
```

No build needed - pure HTML + Three.js via CDN.

### 🏆 Game Modes

1. **Survival Mode**: Endless waves, survive as long as possible. Wave 1: 4 enemies, each wave +1.4 enemies, stronger types after wave 5.

2. **Story Mode**: Find 3 fragments, then boss spawns at north. Defeat boss to win and redraw world.

### 💡 Tips (සිංහල උපදෙස්)

- රෑට campfire ළඟ ඉන්න - heal වෙනවා + ආරක්ෂිතයි
- Block කරන්න අමතක කරන්න එපා - 70% damage අඩුයි
- Combo 3 වෙනකන් attack කරන්න - 3rd hit වැඩි damage
- Runner ලා ඉක්මනට මරන්න - ඔවුන් වේගවත්
- Spear එක දුර ඉඳන් attack කරන්න හොඳයි
- Hunger 0 වුණොත් health අඩු වෙනවා - නිතර කෑම හොයන්න

### 🛠️ Tech Stack

- Three.js 0.160.0 (WebGL)
- No frameworks - vanilla JS
- Procedural audio via Web Audio API
- Instanced world gen, particle system
- Pointer lock controls, minimap canvas

### 📸 Screenshots Concept

- White stick hero vs black horde
- Cyan fragments glowing
- Boss fight at north with fog
- Day/night cycle

Made with ❤️ for Arena - Real Stick 3D Survival Fighting

**ඔබ අන්තිම රේඛාවයි. සටන් කරන්න!**

---
*REX-07 Log End*
