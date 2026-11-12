<template>
  <RouterView />
</template>

<style>
:root {
  --system-bg: #143c8d;
  --system-gradient:
    radial-gradient(ellipse at 58% 42%, rgba(121, 210, 255, 0.22), transparent 58%),
    radial-gradient(ellipse at 8% 12%, rgba(27, 93, 247, 0.18), transparent 32%),
    radial-gradient(ellipse at 82% 76%, rgba(74, 169, 255, 0.12), transparent 38%),
    linear-gradient(180deg, #1f56cb 0%, #173f9e 48%, #112d72 100%);
  --nav-bg:
    linear-gradient(112deg, transparent 0 42%, rgba(121, 210, 255, 0.06) 43%, transparent 46% 100%),
    rgba(3, 14, 36, 0.28);
  --primary-blue: #1a56df;
  --primary-blue-hover: #2460e6;
  --on-primary: #fff;
  --panel-bg: rgba(20, 78, 197, 0.12);
  --panel-bg-strong: rgba(31, 98, 226, 0.18);
  --panel-title-bg: rgba(34, 100, 228, 0.13);
  --recessed-bg: rgba(10, 36, 94, 0.58);
  --overlay-bg: #0b265a;
  --border-cyan: rgba(121, 210, 255, 0.18);
  --border-cyan-strong: rgba(121, 210, 255, 0.34);
  --glow-cyan: rgba(27, 93, 247, 0.18);
  --text-main: #f2fbff;
  --text-normal: #d9f3ff;
  --text-muted: #cce6ff;
  --text-subtle: #aacbf0;
  --danger: #ff6f7d;
  --warning: #ffbf6b;
  --success: #7bdcff;
  --cyan: #4aa9ff;
  --cyan-soft: #79d2ff;
  --panel-radius: 16px;
  --control-radius: 10px;
  --surface-shadow: 0 4px 14px rgba(10, 31, 81, 0.24);
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
  color: var(--text-normal);
  background: var(--system-bg);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  line-height: 1.5;
}

button,
input,
select,
textarea {
  font: inherit;
  letter-spacing: 0;
}

:where(button, a, input, select, textarea, summary):focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
}

*::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

*::-webkit-scrollbar-thumb {
  background: rgba(91, 214, 255, 0.28);
  border-radius: 8px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}
</style>
