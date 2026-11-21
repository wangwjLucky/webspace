<script setup lang="ts">
/** 子步骤时间线（对标 Dify tracing-panel/agent-log）：列出选中技能的 skill_step，
 * 点击 → emit('select-step', step)，右侧抽屉看详情。
 */
import { computed } from 'vue'
import type { SkillStepVO, SkillStepsGroup } from '../../../types'

const props = defineProps<{
  steps: SkillStepsGroup[]
  activeSkill: string
}>()
const emit = defineEmits<{ 'select-step': [step: SkillStepVO] }>()

const SKILL_LABEL: Record<string, string> = {
  ocr: 'OCR 识别',
  catalog: '编目归类',
  'element-extraction': '要素提取',
}

const items = computed<SkillStepVO[]>(() => {
  const g = props.steps.find(s => s.skill === props.activeSkill)
  return g?.items ?? []
})

function statusText(s: string): string {
  return { running: '执行中', success: '成功', failed: '失败' }[s] ?? s
}

function kindText(k: string): string {
  return {
    llm_call: 'LLM 调用',
    ocr_call: 'OCR 调用',
    aggregation: '聚合',
    verification: '原文核实',
    reconciliation: '对账',
    tool_call: '工具调用',
    agent_thought: 'Agent 推理',
  }[k] ?? k
}

function duration(s: SkillStepVO): string {
  if (!s.started_at || !s.finished_at) return s.status === 'running' ? '…' : ''
  const ms = new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}
</script>

<template>
  <div class="trace-panel">
    <div class="panel-title">
      {{ SKILL_LABEL[activeSkill] ?? activeSkill }} · 子步骤
      <span class="count">{{ items.length }}</span>
    </div>
    <div v-if="items.length === 0" class="empty">暂无子步骤记录</div>
    <div v-else class="timeline">
      <div
        v-for="s in items"
        :key="s.id"
        class="step"
        :class="s.status"
        @click="emit('select-step', s)"
      >
        <div class="rail"><span class="bullet" /></div>
        <div class="body">
          <div class="head">
            <span class="name">{{ s.name }}</span>
            <span class="kind">{{ kindText(s.kind) }}</span>
            <span class="badge">{{ statusText(s.status) }}</span>
            <span v-if="duration(s)" class="dur">{{ duration(s) }}</span>
          </div>
          <div v-if="s.error" class="err">{{ s.error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trace-panel {
  height: 100%;
  overflow-y: auto;
  background: linear-gradient(180deg, var(--ink-850), var(--ink-900));
  font-family: var(--font-body);
}
.trace-panel::-webkit-scrollbar { width: 8px; }
.trace-panel::-webkit-scrollbar-track { background: transparent; }
.trace-panel::-webkit-scrollbar-thumb { background: var(--ink-600); border-radius: 4px; }

.panel-title {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px 14px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--cream-100);
  background: linear-gradient(180deg, var(--ink-850) 70%, transparent);
  border-bottom: 1px solid var(--line);
  letter-spacing: 0.04em;
}
.count {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 400;
  color: var(--cream-400);
  padding: 1px 7px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--ink-800);
}
.empty {
  padding: 48px 20px;
  color: var(--ink-600);
  font-family: var(--font-mono);
  font-size: 13px;
  text-align: center;
}

.timeline {
  padding: 10px 18px 28px;
}
.step {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 9px 10px 9px 4px;
  margin: 1px 0;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}
.step:hover {
  background: var(--ink-800);
}
.rail {
  position: relative;
  width: 14px;
  flex-shrink: 0;
  align-self: stretch;
}
.rail::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 18px;
  bottom: -10px;
  width: 1px;
  background: var(--line);
}
.step:last-child .rail::before { display: none; }
.bullet {
  position: absolute;
  top: 6px;
  left: 2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--slate-400);
  box-shadow: 0 0 0 3px var(--ink-900);
}
.step.running .bullet {
  background: var(--gold-400);
  animation: blink 1.1s infinite;
}
.step.success .bullet { background: var(--teal-400); }
.step.failed .bullet { background: var(--rose-400); }

.body { flex: 1; min-width: 0; }
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}
.name {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--cream-100);
  font-size: 12.5px;
}
.kind {
  font-family: var(--font-mono);
  color: var(--cream-400);
  font-size: 11px;
}
.badge {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 3px;
  letter-spacing: 0.04em;
  border: 1px solid;
}
.step.running .badge { color: var(--gold-300); border-color: var(--gold-500); background: rgba(224, 180, 92, 0.08); }
.step.success .badge { color: var(--teal-400); border-color: var(--teal-500); background: rgba(86, 197, 166, 0.06); }
.step.failed .badge { color: var(--rose-400); border-color: var(--rose-500); background: rgba(232, 116, 109, 0.06); }
.dur {
  margin-left: auto;
  font-family: var(--font-mono);
  color: var(--cream-400);
  font-size: 11px;
}
.err {
  margin-top: 5px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--rose-400);
  word-break: break-all;
  line-height: 1.5;
  padding: 5px 8px;
  background: rgba(232, 116, 109, 0.06);
  border-radius: 4px;
  border-left: 2px solid var(--rose-500);
}
@keyframes blink {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 3px var(--ink-900), 0 0 0 4px var(--gold-400); }
  50% { opacity: 0.45; box-shadow: 0 0 0 3px var(--ink-900); }
}
</style>
