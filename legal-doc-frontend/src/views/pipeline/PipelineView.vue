<script setup lang="ts">
/** 流程可视化页（§2026-09-21 §9）—— 司法档案 × 深色观测台美学。
 * 左：Vue Flow 三节点 DAG（状态色 + 边动画）
 * 右：选中技能的子步骤时间线
 * 点时间线条目 → 抽屉看 input/output JSON
 * 2s 轮询，running/pending 时持续，终态停
 */
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useRegistrationPoll } from '../../composables/useRegistrationPoll'
import FlowCanvas from './components/FlowCanvas.vue'
import StepTracePanel from './components/StepTracePanel.vue'
import StepDetailDrawer from './components/StepDetailDrawer.vue'
import type { SkillStepVO } from '../../types'

const route = useRoute()
const regId = String(route.params.id)
const { data, loading, error } = useRegistrationPoll(regId)

const activeSkill = ref<string>('ocr')
const drawer = ref(false)
const activeStep = ref<SkillStepVO | null>(null)

function onSelectSkill(skill: string) {
  activeSkill.value = skill
}

function onSelectStep(step: SkillStepVO) {
  activeStep.value = step
  drawer.value = true
}

const STATUS_TEXT: Record<string, string> = {
  pending: '待执行',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
}
function statusText(s: string): string {
  return STATUS_TEXT[s] ?? s
}
function statusType(s: string): string {
  return ({ pending: 'pending', running: 'running', completed: 'completed', failed: 'failed' } as const)[s] ?? 'pending'
}
</script>

<template>
  <div class="pipeline-page" :data-reg-status="data?.status ?? 'loading'">
    <!-- 大气背景层：网格 + 径向光晕 -->
    <div class="atmosphere" aria-hidden="true">
      <div class="grid-layer" />
      <div class="glow glow-1" />
      <div class="glow glow-2" />
    </div>

    <header class="page-header">
      <div class="brand">
        <span class="brand-mark">§</span>
        <div class="brand-text">
          <h1 class="page-title">卷宗流水</h1>
          <span class="page-sub">DAG · OCR → 编目 → 要素提取</span>
        </div>
      </div>
      <div class="header-meta">
        <span v-if="data" class="reg-id">登记 #{{ data.id }}</span>
        <span v-if="loading" class="meta-hint loading-dot">加载中</span>
        <span v-else-if="error" class="meta-err">{{ error }}</span>
        <span v-else-if="data" class="status-pill" :class="statusType(data.status)">
          <span class="dot" />{{ statusText(data.status) }}
        </span>
      </div>
    </header>

    <main class="page-body">
      <section class="canvas-col">
        <FlowCanvas v-if="data" :skills="data.skills" @select-skill="onSelectSkill" />
        <div v-else class="placeholder">
          <span class="placeholder-mark">◯</span>
          <span>等待数据流入…</span>
        </div>
      </section>
      <aside class="trace-col">
        <StepTracePanel v-if="data" :steps="data.steps" :active-skill="activeSkill" @select-step="onSelectStep" />
      </aside>
    </main>

    <StepDetailDrawer v-model="drawer" :step="activeStep" />
  </div>
</template>

<script lang="ts">
export default { name: 'PipelineView' }
</script>

<style>
/* 司法档案 × 深色观测台 设计令牌 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500&display=swap');

.pipeline-page {
  --ink-900: #0b0f14;
  --ink-850: #0f151c;
  --ink-800: #141b24;
  --ink-750: #1a2230;
  --ink-700: #222c3a;
  --ink-600: #2e3a4a;
  --line: #2a3340;
  --cream-100: #ece4d2;
  --cream-200: #d6cdb8;
  --cream-300: #a89f8c;
  --cream-400: #7d7464;
  --gold-300: #ecc878;
  --gold-400: #e0b45c;
  --gold-500: #c8973a;
  --teal-400: #56c5a6;
  --teal-500: #3fa888;
  --rose-400: #e8746d;
  --rose-500: #cf5b54;
  --slate-400: #6b7681;

  --font-display: 'Noto Serif SC', 'Source Han Serif SC', Georgia, serif;
  --font-body: 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;

  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ink-900);
  color: var(--cream-200);
  font-family: var(--font-body);
  overflow: hidden;
}

/* 大气背景 */
.pipeline-page .atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.pipeline-page .grid-layer {
  position: absolute;
  inset: -2px;
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.35;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, #000 0%, transparent 90%);
}
.pipeline-page .glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.22;
}
.pipeline-page .glow-1 {
  width: 520px;
  height: 520px;
  top: -120px;
  left: 8%;
  background: radial-gradient(circle, var(--gold-500), transparent 70%);
}
.pipeline-page .glow-2 {
  width: 600px;
  height: 600px;
  bottom: -180px;
  right: 4%;
  background: radial-gradient(circle, #2a5d6e, transparent 70%);
  opacity: 0.3;
}

/* 头部 */
.pipeline-page .page-header {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 28px;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(20, 27, 36, 0.9), rgba(11, 15, 20, 0.6));
  backdrop-filter: blur(6px);
}
.pipeline-page .brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.pipeline-page .brand-mark {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  color: var(--gold-400);
  line-height: 1;
  text-shadow: 0 0 24px rgba(224, 180, 92, 0.35);
}
.pipeline-page .page-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--cream-100);
  letter-spacing: 0.04em;
  line-height: 1.1;
}
.pipeline-page .page-sub {
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--cream-400);
  letter-spacing: 0.06em;
  margin-top: 2px;
}
.pipeline-page .header-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-family: var(--font-mono);
  font-size: 12px;
}
.pipeline-page .reg-id {
  color: var(--cream-300);
  letter-spacing: 0.04em;
}
.pipeline-page .meta-hint {
  color: var(--cream-400);
}
.pipeline-page .loading-dot::after {
  content: '…';
  animation: dots 1.4s steps(4) infinite;
}
@keyframes dots {
  0% { content: '   '; }
  100% { content: '…'; }
}
.pipeline-page .meta-err {
  color: var(--rose-400);
}

/* 状态药丸 */
.pipeline-page .status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  border: 1px solid;
}
.pipeline-page .status-pill .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.pipeline-page .status-pill.pending { color: var(--slate-400); border-color: var(--ink-600); background: rgba(107, 118, 129, 0.08); }
.pipeline-page .status-pill.running { color: var(--gold-300); border-color: var(--gold-500); background: rgba(224, 180, 92, 0.1); }
.pipeline-page .status-pill.running .dot { animation: pulse-dot 1.2s infinite; box-shadow: 0 0 0 0 var(--gold-400); }
.pipeline-page .status-pill.completed { color: var(--teal-400); border-color: var(--teal-500); background: rgba(86, 197, 166, 0.08); }
.pipeline-page .status-pill.failed { color: var(--rose-400); border-color: var(--rose-500); background: rgba(232, 116, 109, 0.08); }
@keyframes pulse-dot {
  0% { box-shadow: 0 0 0 0 rgba(224, 180, 92, 0.6); }
  70% { box-shadow: 0 0 0 6px rgba(224, 180, 92, 0); }
  100% { box-shadow: 0 0 0 0 rgba(224, 180, 92, 0); }
}

/* 主体 */
.pipeline-page .page-body {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  min-height: 0;
}
.pipeline-page .canvas-col {
  flex: 7;
  min-width: 0;
  min-height: 0;
  position: relative;
}
.pipeline-page .trace-col {
  flex: 3;
  min-width: 280px;
  max-width: 420px;
  min-height: 0;
  border-left: 1px solid var(--line);
}
.pipeline-page .placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--cream-400);
  font-family: var(--font-mono);
  font-size: 13px;
}
.pipeline-page .placeholder-mark {
  font-size: 42px;
  color: var(--ink-600);
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); opacity: 0.5; }
  50% { transform: translateY(-8px); opacity: 0.8; }
}

/* 让抽屉契合深色主题 */
.pipeline-page ~ .el-drawer,
.el-drawer.elt-drawer-dark {
  background: var(--ink-850) !important;
}
</style>
