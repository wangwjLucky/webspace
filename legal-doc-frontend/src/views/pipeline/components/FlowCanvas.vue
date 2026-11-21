<script setup lang="ts">
/** Vue Flow 只读画布：渲染 ocr→catalog→element 三节点 DAG + 状态色（对标 Dify workflow 画布）。
 * 点击节点 → emit('select-skill', skill)，右侧时间线切换。
 */
import { computed } from 'vue'
import { VueFlow, useVueFlow, type Node, type Edge } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import SkillNode from './SkillNode.vue'
import type { SkillRunVO } from '../../../types'

const props = defineProps<{
  skills: SkillRunVO[]
}>()
const emit = defineEmits<{ 'select-skill': [skill: string] }>()

const ORDER = ['ocr', 'catalog', 'element-extraction']

const nodes = computed<Node[]>(() =>
  ORDER.map((skill, i) => {
    const sr = props.skills.find(s => s.name === skill)
    const status = sr?.status ?? 'pending'
    return {
      id: skill,
      type: 'skill',
      position: { x: 220, y: 60 + i * 130 },
      data: { skill, status, error: sr?.error ?? null },
    }
  }),
)

const edges = computed<Edge[]>(() => [
  { id: 'e-ocr-catalog', source: 'ocr', target: 'catalog', animated: true },
  { id: 'e-catalog-element', source: 'catalog', target: 'element-extraction', animated: true },
])

const { onNodeClick } = useVueFlow()
onNodeClick(({ node }) => {
  if (node.id) emit('select-skill', node.id)
})
</script>

<template>
  <div class="flow-canvas">
    <VueFlow :nodes="nodes" :edges="edges" :fit-view-on-init="true" :nodes-draggable="false" :nodes-connectable="false" :elements-selectable="true">
      <template #node-skill="nodeProps">
        <SkillNode v-bind="nodeProps" />
      </template>
      <Background pattern-color="#e4e7ed" :gap="18" />
      <Controls :show-interactive="false" />
      <MiniMap />
    </VueFlow>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

/* 深色观测台覆写 */
.flow-canvas {
  width: 100%;
  height: 100%;
  background: transparent;
}
.flow-canvas .vue-flow {
  background: transparent;
}
.flow-canvas .vue-flow__background {
  opacity: 0.5;
}
.flow-canvas .vue-flow__edge-path {
  stroke: var(--ink-600);
  stroke-width: 1.5;
}
.flow-canvas .vue-flow__edge.animated .vue-flow__edge-path {
  stroke: var(--gold-500);
  stroke-width: 1.8;
  stroke-dasharray: 6 5;
  animation: dashflow 0.7s linear infinite;
}
.flow-canvas .vue-flow__edge:hover .vue-flow__edge-path {
  stroke: var(--gold-400);
}
@keyframes dashflow {
  to { stroke-dashoffset: -22; }
}
/* 控制器 + 小地图适配深色 */
.flow-canvas .vue-flow__controls {
  background: var(--ink-800);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}
.flow-canvas .vue-flow__controls-button {
  background: transparent;
  border-bottom: 1px solid var(--line);
  fill: var(--cream-300);
}
.flow-canvas .vue-flow__controls-button:hover {
  background: var(--ink-700);
}
.flow-canvas .vue-flow__minimap {
  background: var(--ink-850);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.flow-canvas .vue-flow__minimap-mask {
  fill: rgba(11, 15, 20, 0.7);
}
.flow-canvas .vue-flow__attribution {
  display: none;
}
</style>
