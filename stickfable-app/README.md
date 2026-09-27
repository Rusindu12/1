# StickFable 5.1 - Android APK 🎮📱

**Fable-inspired Stick RPG - Claude Edition - Android App**

> සිංහල + English - Phone එකේ play කරන්න!

### 📥 APK Download

**Latest APK (Auto-built):**
- **GitHub Release:** https://github.com/Rusindu12/1/releases/tag/stickfable-apk-latest
- **Direct Download:** https://github.com/Rusindu12/1/releases/download/stickfable-apk-latest/StickFable-5.1.apk
- **GitHub Actions Artifacts:** Actions tab → StickFable 5.1 APK → Latest run → Artifacts

### 📱 Install කරන්නේ කොහොමද? (සිංහල)

1. **Download APK:**
   - උඩ link එකෙන් APK එක download කරන්න
   - File size ~ 3-5 MB

2. **Unknown Sources Allow කරන්න:**
   - Settings → Apps → Special Access → Install Unknown Apps
   - හෝ Settings → Security → Unknown Sources → Allow
   - Chrome / File Manager ට Allow කරන්න

3. **Install:**
   - Download කරපු APK එක tap කරන්න
   - Install → Open

4. **Play:**
   - App එක landscape mode එකේ open වෙනවා
   - Fullscreen immersive
   - Touch controls: Joystick + buttons
   - Back button = Pause

### 🎮 Game Features - Phone එකේ

**Fable 5.1 Claude Edition Full Game:**
- ✅ Morality system - Good (halo) / Evil (horns)
- ✅ Dog companion - Ink - finds treasure
- ✅ 12 Expressions - Dance, Fart, Flex, Flirt...
- ✅ 10 Silver Keys - hidden, dog sniffs
- ✅ 2 Demon Doors - riddles
- ✅ 13 Quests - chicken chaser, turnips, fragments, boss
- ✅ 4 Spells - Fireball, Heal, Push, Lightning
- ✅ Marriage, Property, Shop, Legendary weapons
- ✅ 50+ Narrator lines - British sarcasm
- ✅ Chicken kicking championship!

**Mobile Controls:**
- Left joystick: Move
- Right joystick: Look around
- ⚔️ Attack, 🔥 Magic, 💬 Talk, 🎭 Expressions
- Touch optimized, haptic vibration

### 🛠️ Technical

**App Structure:**
```
stickfable-app/
├── app/src/main/assets/index.html  # Full game (Three.js)
├── app/src/main/java/.../MainActivity.kt  # WebView wrapper
├── app/src/main/AndroidManifest.xml
└── build.gradle.kts
```

**MainActivity.kt:**
- WebView with hardware acceleration
- WebGL enabled for Three.js
- Fullscreen immersive
- Landscape locked
- JavaScript interface for vibration, toast
- Back button = pause
- Keep screen on

**Build:**
```bash
cd stickfable-app
gradle assembleDebug
# APK at app/build/outputs/apk/debug/
```

**GitHub Actions Auto-Build:**
- Push to any branch with changes to stickfable-app/ or stick-survival-game/
- Workflow: .github/workflows/stickfable.yml
- Builds debug-signed APK
- Publishes to release tag stickfable-apk-latest
- Artifact: StickFable-5.1-debug-apk

### 🔧 Permissions

- INTERNET - for Three.js CDN (unpkg)
- ACCESS_NETWORK_STATE
- VIBRATE - haptic feedback
- WAKE_LOCK - keep screen on during play

No other permissions! No ads, no tracking!

### 📖 Story (සිංහල)

Oakvale Stick Village එකේ කුකුල් කොටුවේ හැදුණු REX - Guildmaster ඔබව hero කෙනෙක් කරන්න හදනවා. Core Pen කොටස් 3ක් හොයලා Ink Lord පරාජය කරන්න ඕන! හොඳද නරකද? Choices matter!

### 🎯 Tips for Mobile

- Joystick එකෙන් move, right joystick එකෙන් look
- Chicken kick කරන්න - auto quest!
- Dog follow කරන්න - treasure හොයනවා
- Shop එකේ (18,-12) weapons, pies, houses තියෙනවා
- Demon Doors 2ක් තියෙනවා - riddles solve කරන්න
- Silver keys 10ක් - dog sniff කරනවා
- Expressions (Z) - villagers react වෙනවා!

### 🐛 Troubleshooting

**APK install වෙන්නේ නැද්ද?**
- Unknown sources allow කරලාද බලන්න
- Old version uninstall කරලා reinstall කරන්න
- Android 7.0+ ඕන (minSdk 24)

**Game lag වෙනවද?**
- Phone එකේ performance mode on කරන්න
- Background apps close කරන්න
- WebView update කරන්න (Play Store)

**Black screen?**
- Internet connection ඕන - Three.js CDN load වෙන්න
- WebView update කරන්න
- App clear cache

### 📞 Support

- GitHub Issues: https://github.com/Rusindu12/1/issues
- Game Web Version: https://rusindu12.github.io/1/ (if Pages enabled)

### 🏆 Credits

- Inspired by Lionhead's Fable series
- Claude Edition - Anthropic level craft
- Three.js for 3D
- Built with love, ink, and chicken feathers!

**ඔබ අන්තිම රේඛාවයි! Phone එකේ play කරන්න! 🐔⚔️**

---
*StickFable 5.1 - The Last Line - Android APK*
*Version 5.1-claude - Debug signed*
