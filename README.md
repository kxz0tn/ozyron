# Ozyron

A black and white futuristic city in 3D, running in the browser.

**Live:** https://kxz0tn.github.io/ozyron/

## Features

- **Boot terminal** — the city comes online system by system before the flyover. Press any key or tap to skip.
- **Megatowers** — dense, varied tower architecture with lit windows, skybridges and rooftop landing pads.
- **Spaceship factory** — gantries with cross-bracing, a ship under construction on a cradle, and jointed robot arms welding with sparks.
- **Space energy system** — a reactor core, a beam to an orbital collector ring, and glowing conduits feeding the city.
- **Transit** — flying traffic lanes, ground streets with moving light, and ships launching and landing.
- **Atmosphere** — fog, haze layers, wet reflective ground, bloom and a strict greyscale grade.
- Everything (geometry, textures, signage) is generated procedurally in code. No external fonts, images or network requests.

## Controls

| Input | Action |
|---|---|
| (none) | Slow cinematic flyover |
| Mouse drag / one finger | Orbit |
| Scroll / pinch | Zoom |
| Right-drag / two fingers | Pan |
| W A S D / arrow keys | Fly |
| E or Space / Q | Up / down |
| Shift | Faster |
| C | Toggle the flyover |

Any input takes manual control. The flyover resumes after 45 seconds idle.

## Run locally

It is a static site with no build step:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure

```
index.html          entry, import map
css/boot.css        boot terminal styles
js/boot.js          boot terminal sequence
js/main.js          renderer, post-processing, district list
js/world.js         sky, stars, ground, fog
js/towers.js        megatower district
js/details.js       skybridges, pads, streets, signage, haze
js/energy.js        reactor, beam, orbital ring, conduits
js/shipyard.js      spaceship factory
js/traffic.js       air lanes and ship flights
js/camera.js        flyover and free-fly controls
vendor/             three.js r160 (MIT)
```

To add a district, write a module that returns `{ update(t, dt) }` and add it to the `systems` list in `js/main.js`.

## Credits

Built by kxz0tn. Uses [three.js](https://threejs.org) (MIT, © 2010-2023 three.js authors); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

[MIT](LICENSE) © 2026 kxz0tn
