<script setup lang="ts">
/** 子步骤详情抽屉（对标 Dify result-panel）：input/output JSON 只读，深色主题。 */
import { computed } from 'vue'
import type { SkillStepVO } from '../../../types'

const props = defineProps<{
  modelValue: boolean
  step: SkillStepVO | null
}>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

function fmt(v: unknown): string {
  if (v == null) return '(空)'
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}
</script>

<template>
  <el-drawer
    v-model="visible"
    title="子步骤详情"
    size="44%"
    direction="rtl"
    destroy-on-close
    modal-class="pipe-drawer"
  >
    <template v-if="step">
      <dl class="kv">
        <div class="kv-row"><dt>步骤号</dt><dd>{{ step.step_no }}</dd></div>
        <div class="kv-row"><dt>名称</dt><dd class="mono">{{ step.name }}</dd></div>
        <div class="kv-row"><dt>类型</dt><dd class="mono">{{ step.kind }}</dd></div>
        <div class="kv-row"><dt>状态</dt><dd><span class="st" :class="step.status">{{ step.status }}</span></dd></div>
        <div class="kv-row"><dt>开始</dt><dd class="mono dim">{{ step.started_at ?? '—' }}</dd></div>
        <div class="kv-row"><dt>结束</dt><dd class="mono dim">{{ step.finished_at ?? '—' }}</dd></div>
      </dl>
      <div v-if="step.error" class="err-box">
        <div class="err-title">错误</div>
        <pre class="err-pre">{{ step.error }}</pre>
      </div>
      <div class="tabs">
        <div class="tab-head">
          <span class="tab-label">输入</span>
          <span class="tab-sep" />
          <span class="tab-label">输出</span>
        </div>
        <div class="tab-panes">
          <pre class="json">{{ fmt(step.input) }}</pre>
          <pre class="json">{{ fmt(step.output) }}</pre>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<!-- 全局样式（抽屉 teleport 到 body，需硬编码深色，不依赖 .pipeline-page 变量） -->
<style>
.pipe-drawer .el-drawer {
  background: #0f151c;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.5);
}
.pipe-drawer .el-drawer__header {
  margin-bottom: 0;
  padding: 18px 22px;
  border-bottom: 1px solid #2a3340;
}
.pipe-drawer .el-drawer__title {
  font-family: 'Noto Serif SC', Georgia, serif;
  font-size: 16px;
  font-weight: 700;
  color: #ece4d2;
  letter-spacing: 0.04em;
}
.pipe-drawer .el-drawer__close-btn {
  color: #7d7464;
}
.pipe-drawer .el-drawer__close-btn:hover {
  color: #ecc878;
}
.pipe-drawer .el-drawer__body {
  padding: 20px 22px;
  color: #d6cdb8;
}
.pipe-drawer .el-overlay {
  background: rgba(8, 11, 15, 0.72);
  backdrop-filter: blur(3px);
}
</style>

<style scoped>
.kv {
  margin: 0 0 18px;
  border: 1px solid #2a3340;
  border-radius: 8px;
  overflow: hidden;
  background: #141b24;
}
.kv-row {
  display: flex;
  border-bottom: 1px solid #222c3a;
}
.kv-row:last-child {
  border-bottom: none;
}
.kv-row dt {
  width: 84px;
  flex-shrink: 0;
  padding: 9px 14px;
  font-size: 12px;
  color: #7d7464;
  background: #0f151c;
  font-family: 'JetBrains Mono', Consolas, monospace;
}
.kv-row dd {
  margin: 0;
  padding: 9px 14px;
  font-size: 13px;
  color: #ece4d2;
  flex: 1;
  min-width: 0;
  word-break: break-all;
}
.mono {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12.5px;
}
.dim {
  color: #a89f8c;
}
.st {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 3px;
  border: 1px solid;
  letter-spacing: 0.04em;
}
.st.running {
  color: #ecc878;
  border-color: #c8973a;
  background: rgba(224, 180, 92, 0.08);
}
.st.success {
  color: #56c5a6;
  border-color: #3fa888;
  background: rgba(86, 197, 166, 0.06);
}
.st.failed {
  color: #e8746d;
  border-color: #cf5b54;
  background: rgba(232, 116, 109, 0.06);
}

.err-box {
  margin: 0 0 18px;
}
.err-title {
  font-size: 13px;
  color: #e8746d;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.04em;
}
.err-pre {
  margin: 0;
  background: rgba(232, 116, 109, 0.06);
  border-left: 2px solid #cf5b54;
  color: #e8746d;
  padding: 12px 14px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.tabs {
  border: 1px solid #2a3340;
  border-radius: 8px;
  overflow: hidden;
  background: #141b24;
}
.tab-head {
  display: flex;
  border-bottom: 1px solid #222c3a;
}
.tab-label {
  flex: 1;
  text-align: center;
  padding: 9px;
  font-size: 12px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  color: #7d7464;
  letter-spacing: 0.06em;
}
.tab-head .tab-sep {
  width: 1px;
  background: #222c3a;
}
.tab-panes {
  display: flex;
  max-height: 48vh;
  overflow: auto;
}
.json {
  flex: 1;
  margin: 0;
  padding: 14px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-all;
  color: #c8c0ad;
  background: #0f151c;
  border-left: 1px solid #222c3a;
}
.tab-panes .json:first-child {
  border-left: none;
}
</style>
