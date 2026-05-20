<template>
  <RouterView />
</template>

<style>
:root {
  --system-bg: #143c8d;
  --primary-blue: #1a56df;
  --panel-bg: rgba(20, 78, 197, 0.12);
  --panel-bg-strong: rgba(31, 98, 226, 0.18);
  --panel-title-bg: rgba(34, 100, 228, 0.13);
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
  --panel-radius: 2px;
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
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Segoe UI', sans-serif;
}

button {
  font: inherit;
  letter-spacing: 0;
}

*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

*::-webkit-scrollbar-thumb {
  background: rgba(91, 214, 255, 0.28);
  border-radius: 8px;
}

*::-webkit-scrollbar-track {
  background: rgba(3, 16, 30, 0.42);
}
</style>
