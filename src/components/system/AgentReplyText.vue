<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ text: string }>()

const number = String.raw`[+\-−]?\d+(?:\.\d+)?`
const unit = String.raw`℃|°[ \t]*C|摄氏度|度|(?:mg|g|μg|µg|mmol)[ \t]*[/／][ \t]*L|毫克(?:[/／]|每)?升|mV|毫伏|NTU|ppt|ppm|‰|[%％]`
const reading = String.raw`${number}(?:[ \t]*(?:${unit}))?`
const range = String.raw`(?:[ \t]*(?:至|到|[-–—~～])[ \t]*${reading})?`
const readingPattern = new RegExp(
  String.raw`(?<![\w.:/+−-])${reading}${range}(?![\w:/]|\.\d|[-–—~～]\d|[年月日])`,
  'gi',
)

const parts = computed(() => {
  const fragments: Array<{ text: string; reading: boolean }> = []
  let start = 0

  for (const match of props.text.matchAll(readingPattern)) {
    if (match.index > start) {
      fragments.push({ text: props.text.slice(start, match.index), reading: false })
    }
    fragments.push({ text: match[0], reading: true })
    start = match.index + match[0].length
  }

  if (start < props.text.length) {
    fragments.push({ text: props.text.slice(start), reading: false })
  }
  return fragments
})
</script>

<template>
  <template v-for="(part, index) in parts" :key="index">
    <strong v-if="part.reading" class="reply-reading">{{ part.text }}</strong>
    <span v-else>{{ part.text }}</span>
  </template>
</template>

<style scoped>
.reply-reading {
  color: var(--text-main);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
</style>
