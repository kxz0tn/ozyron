# Third-party notices

Ozyron v2 ships one third-party library. Everything else (code, geometry, textures, shaders, music, sound) is original and generated in code at runtime.

## three.js r160 (MIT)
Copyright 2010-2023 three.js authors. Full licence text: `vendor/LICENSE-three.txt`.
Files used, unmodified from the r160 release:
- `vendor/three.module.js`
- `vendor/jsm/controls/OrbitControls.js`
- `vendor/jsm/postprocessing/EffectComposer.js`, `RenderPass.js`, `ShaderPass.js`, `MaskPass.js`, `Pass.js`, `UnrealBloomPass.js`, `OutputPass.js`
- `vendor/jsm/shaders/CopyShader.js`, `LuminosityHighPassShader.js`, `OutputShader.js`
- `vendor/jsm/objects/Reflector.js` (added in v2, wet-street reflections)

## Fonts
None bundled. UI uses the device's own monospace font stack (`ui-monospace`, Menlo, Consolas, ...).

## Audio
None bundled. All ambient sound, music and effects are synthesised live with the WebAudio API (`js/core/audio.js`).
