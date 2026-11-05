# Render a chart

Render every `.mmd` file you show with the bundled renderer. Use the paths relative to this skill, not a separate theme skill. Install the pinned runtime once in a scratch directory outside the repository:

```sh
npm install --prefix /scratch/pele-runtime pele@1.9.0 @napi-rs/canvas@1.1.0
node <skill-dir>/scripts/render.mjs /scratch/chart.mmd /scratch/chart.svg /scratch/pele-runtime
```

Write the SVG beside its Mermaid source, with the same name, and give both to the reader. The default `auto` appearance follows the viewer's light or dark setting. For an export with a fixed appearance, append `--appearance light` or `--appearance dark`. For a PNG, rasterize the SVG in Chromium after its embedded fonts load. Some SVG rasterizers do not support Pele's CSS variables.

The Balanced theme uses IBM Plex Sans, neutral surfaces, modest corners, and strong red failure marks. IBM Plex Mono is reserved for code spans that Pele recognizes. The renderer registers and embeds the same fonts it uses to measure labels. It needs no installed font or remote font service. Font files and their [SIL Open Font License](../assets/OFL.txt) are bundled in `assets/`. They come from [IBM Plex at `48e8676`](https://github.com/IBM/plex/tree/48e8676114c04f29033b4b53da4ec579f8846297/packages).

Keep the generated states, transitions, labels, groups and verification classes. Use the existing phase classes `blue`, `teal`, `purple`, `yellow`, `orange`, `tan` and `pink` when phases carry meaning. Do not assign a different color to every state. Confirmed violations use `breaks`, possible violations use `mayBreak`, shortest bug paths use `bugPath`, and repeated counterexample states use `repeats`. The CSS preserves the red or orange fill when a state also has a path or repeat border.

Inspect the result at its intended viewing size. Check long labels, arrows, nested and parallel containers, group colors and overlapping verification marks. A large chart needs room or zoom. Do not shrink the text to fit it into a small preview.

The renderer keeps the upstream limits of 1,000,000 input characters, 8,000,000 output bytes and 10,000 edges. When Pele throws an error, show the Mermaid source and the error. Do not silently switch renderers. Harry may request a different style explicitly.

## Maintaining this fork

This fork's rendering customization is `scripts/render.mjs`, `assets/`, and this reference. `tools/forks.json` declares the edited upstream reference. Merge upstream updates manually and retain the renderer call. The modeling, checking and chart-generation code stays upstream-owned. Do not install the former `statechart-theme` companion alongside it.

Pele ignores Mermaid `theme` and `themeVariables`. Its presentation uses CSS variables and node classes. See the [Pele theming API](https://pele.run/theming). Some Mermaid `classDef` declarations become inline styles, so verification marks in [balanced.css](../assets/balanced.css) use `!important`.
