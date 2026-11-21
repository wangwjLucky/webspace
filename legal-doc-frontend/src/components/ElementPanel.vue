<template>
  <div>
    <h4>要素提取结果 <el-text class="muted">{{ element.status_note || '' }}</el-text></h4>
    <el-table :data="basicInfoRows" border size="small" v-if="basicInfoRows.length">
      <el-table-column prop="k" label="字段" width="160" />
      <el-table-column prop="v" label="值" />
    </el-table>

    <ParticipantTable v-for="g in groups" :key="g.title" :title="g.title" :items="g.items" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ElementVO } from '../types'
import ParticipantTable from './ParticipantTable.vue'

const props = defineProps<{ element: ElementVO }>()

const basicInfoRows = computed(() =>
  Object.entries(props.element.basic_info || {}).map(([k, v]) => ({ k, v: v === null ? '-' : String(v) }))
)

const groups = computed(() => [
  { title: '自然人当事人', items: props.element.participants_natural || [] },
  { title: '法人当事人', items: props.element.participants_legal || [] },
  { title: '代理人', items: props.element.agents || [] },
].filter(g => g.items.length > 0))
</script>
