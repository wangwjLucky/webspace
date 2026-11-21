<script setup lang="ts">
/** Vue Flow 自定义技能节点（对标 Dify node.tsx，只读，深色观测台风格）。
 * data 由 FlowCanvas 注入：{ skill, status, error }
 */
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{
  id: string
  data: { skill: string; status: string; error: string | null }
}>()

const SKILL_LABEL: Record<string, string> = {
  ocr: 'OCR 识别',
  catalog: '编目归类',
  'element-extraction': '要素提取',
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待执行',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
}

// 司法字源：目（识别）/ 册（编目）/ 要（要素）
const GLYPH: Record<string, string> = {
  ocr: '目',
  catalog: '册',
  'element-extraction': '要',
}
const glyph = computed(() => GLYPH[props.data.skill] ?? '·')
</script>

<template>
  <div class="skill-node" :class="props.data.status">
    <Handle type="target" :position="Position.Top" />
    <div class="icon-wrap"><span class="glyph">{{ glyph }}</span></div>
    <div class="meta">
      <div class="name">{{ SKILL_LABEL[props.data.skill] ?? props.data.skill }}</div>
      <div class="status">{{ STATUS_LABEL[props.data.status] ?? props.data.status }}</div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped>
.skill-node {
  width: 184px;
  padding: 14px 16px;
  border-radius: 12px;
  background: linear-gradient(160deg, var(--ink-750), var(--ink-800));
  border: 1px solid var(--line);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.03);
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
}
.skill-node:hover {
  transform: translateY(-1px);
  border-color: var(--gold-500);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(224, 180, 92, 0.15);
}
.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: var(--ink-900);
  border: 1px solid var(--line);
  flex-shrink: 0;
}
.glyph {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--cream-300);
  line-height: 1;
}
.meta {
  min-width: 0;
}
.meta .name {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--cream-100);
  letter-spacing: 0.02em;
}
.meta .status {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--cream-400);
  margin-top: 3px;
  letter-spacing: 0.04em;
}

/* 状态：pending 灰 / running 琥珀金脉动 / completed 青 / failed 玫红 */
.skill-node.pending .glyph { color: var(--slate-400); }
.skill-node.pending { border-color: var(--ink-600); }

.skill-node.running {
  border-color: var(--gold-500);
  box-shadow: 0 0 0 1px var(--gold-500), 0 6px 24px rgba(224, 180, 92, 0.18);
}
.skill-node.running .icon-wrap {
  background: linear-gradient(160deg, rgba(224, 180, 92, 0.18), var(--ink-900));
  border-color: var(--gold-500);
}
.skill-node.running .glyph { color: var(--gold-300); }
.skill-node.running .status { color: var(--gold-300); }
.skill-node.running::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 12px;
  border: 1px solid var(--gold-400);
  opacity: 0;
  animation: ring 2s ease-out infinite;
  pointer-events: none;
}

.skill-node.completed .icon-wrap {
  background: linear-gradient(160deg, rgba(86, 197, 166, 0.14), var(--ink-900));
  border-color: var(--teal-500);
}
.skill-node.completed .glyph { color: var(--teal-400); }
.skill-node.completed .status { color: var(--teal-400); }
.skill-node.completed { border-color: var(--ink-700); }

.skill-node.failed .icon-wrap {
  background: linear-gradient(160deg, rgba(232, 116, 109, 0.14), var(--ink-900));
  border-color: var(--rose-500);
}
.skill-node.failed .glyph { color: var(--rose-400); }
.skill-node.failed .status { color: var(--rose-400); }
.skill-node.failed { border-color: var(--rose-500); }

@keyframes ring {
  0% { opacity: 0.6; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.04); }
}
</style>
