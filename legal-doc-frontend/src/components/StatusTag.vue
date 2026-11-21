<template>
  <el-tag v-if="status" :type="type" size="small" effect="dark">{{ status }}</el-tag>
  <span v-else class="muted">-</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ status?: string | null }>()
const type = computed(() => {
  const s = props.status || ''
  if (['verified', 'matched', 'valid'].includes(s)) return 'success'
  if (['ocr_suspect', 'source_mismatch_resolved'].includes(s)) return 'warning'
  if (['unverifiable', 'suspicious', 'invalid_checksum', 'truncated_unverifiable'].includes(s)) return 'danger'
  if (['basis_missing', 'not_applicable'].includes(s)) return 'info'
  return 'info'
})
</script>
