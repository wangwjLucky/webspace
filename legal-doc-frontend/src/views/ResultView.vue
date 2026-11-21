<template>
  <div class="page-pad">
    <el-card shadow="never" v-loading="loading" class="result-card">
      <template #header>
        <div class="card-head">
          <div class="head-left">
            <span class="brand-mark">§</span>
            <div>
              <h2 class="card-title">登记结果 <span class="reg-id muted">#{{ regId }}</span></h2>
              <span class="card-sub">卷宗详情 · 目录浏览与要素</span>
            </div>
          </div>
          <el-space wrap>
            <el-button type="primary" @click="$router.push(`/pipeline/${regId}`)">流程图</el-button>
            <el-button v-if="data?.status === 'failed'" type="danger" :icon="RefreshRight" @click="retry">重跑</el-button>
            <el-button :icon="Refresh" @click="load" circle />
          </el-space>
        </div>
      </template>

      <div v-if="data">
        <!-- 状态 + 元信息 -->
        <div class="meta-bar">
          <span class="status-pill" :class="data.status"><span class="dot" />{{ statusText(data.status) }}</span>
          <span class="meta-chip"><label>案件</label>{{ data.case_lx }} {{ caseNames[data.case_lx] || '' }}</span>
          <span class="meta-chip"><label>创建</label>{{ data.created_time || '—' }}</span>
          <span class="meta-chip"><label>retry</label>{{ data.retry_count }}</span>
        </div>
        <el-alert v-if="data.last_error" type="error" :title="data.last_error" :closable="false" class="mt" />

        <!-- 技能进度步骤条 -->
        <div class="stepper">
          <div v-for="(s, i) in data.skills" :key="s.name" class="step" :class="s.status">
            <span class="step-ico">{{ i + 1 }}</span>
            <div class="step-meta">
              <span class="step-name">{{ skillLabel(s.name) }}</span>
              <span class="step-status">{{ statusText(s.status) }}</span>
            </div>
            <div class="step-actions">
              <el-button v-for="a in skillActions(s.status)" :key="a.action" size="small" :type="a.type as any"
                :loading="skillBusy === s.name + ':' + a.action" :disabled="data.status === 'running' && a.action === 'pause'"
                @click="controlSkill(s.name, a.action)">{{ a.label }}</el-button>
              <span v-if="s.error" class="step-err" :title="s.error">⚠</span>
            </div>
            <span v-if="i < data.skills.length - 1" class="step-arrow" />
          </div>
        </div>

        <!-- 主体标签页：卷宗目录 / 要素提取 / 对账明细 共享内容区，切换不滚屏 -->
        <el-tabs v-model="activeTab" class="main-tabs">
          <el-tab-pane label="卷宗目录与文件" name="files">
            <DocExplorer :folders="data.folders" :files="data.files" :audit="element.audit" />
          </el-tab-pane>
          <el-tab-pane :label="`要素提取（${elemCount}` + '）'" name="element">
            <ElementPanel :element="element" />
          </el-tab-pane>
          <el-tab-pane :label="`对账明细（${element.audit.length}）`" name="audit">
            <AuditTable :audit="element.audit" :element="element" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, RefreshRight } from '@element-plus/icons-vue'
import { api } from '../api'
import { caseNames } from '../stores/case-names'
import type { RegistrationVO } from '../types'
import DocExplorer from '../components/DocExplorer.vue'
import ElementPanel from '../components/ElementPanel.vue'
import AuditTable from '../components/AuditTable.vue'

const route = useRoute()
const regId = String(route.params.id)
const loading = ref(true)
const data = ref<RegistrationVO | null>(null)
let timer: number | null = null

const catalogGroups = computed(() => data.value?.catalog?.catalog || [])
const element = computed(() => data.value?.element || { status_note: '', document_flags: [], basic_info: {}, participants_natural: [], participants_legal: [], agents: [], audit: [] } as any)

const statusText = (s: string) => ({ pending: '待执行', running: '执行中', completed: '已完成', failed: '失败', paused: '已暂停' }[s] || s)
const skillLabel = (n: string) => ({ ocr: 'OCR 识别', catalog: '编目归类', 'element-extraction': '要素提取' }[n] || n)

const activeTab = ref('files')
const elemCount = computed(() => {
  const e: any = element.value
  return (e.participants_natural?.length || 0) + (e.participants_legal?.length || 0) + (e.agents?.length || 0)
})

// 各状态可用的单技能动作
function skillActions(status: string): { action: 'pause' | 'resume' | 'retry'; label: string; type: string }[] {
  if (status === 'pending') return [{ action: 'pause', label: '暂停', type: 'default' }]
  if (status === 'paused') return [{ action: 'resume', label: '启动', type: 'primary' }, { action: 'retry', label: '重试', type: 'warning' }]
  if (status === 'completed') return [{ action: 'retry', label: '重试', type: 'warning' }]
  if (status === 'failed') return [{ action: 'retry', label: '重试', type: 'warning' }]
  return []  // running 不可中断
}

const skillBusy = ref<string | null>(null)
async function controlSkill(skill: string, action: 'pause' | 'resume' | 'retry') {
  skillBusy.value = skill + ':' + action
  try {
    await api.controlSkill(regId, skill, action)
    ElMessage.success(`${action === 'pause' ? '已暂停' : action === 'resume' ? '已启动' : '已提交重试'}：${skillLabel(skill)}` + (action === 'retry' && skill !== 'element-extraction' ? '（连带下游重跑）' : ''))
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '操作失败')
  } finally { skillBusy.value = null }
}

const load = async () => {
  try {
    data.value = await api.getRegistration(regId)
    if (data.value && data.value.status === 'running') {
      timer = window.setTimeout(load, 5000)
    }
  } catch (e: any) { ElMessage.error('加载失败：' + (e?.message || e)) }
  loading.value = false
}

const retry = async () => {
  try { await ElMessageBox.confirm('确认重跑？', '提示') } catch { return }
  await api.retryRegistration(regId)
  ElMessage.success('已提交重跑')
  loading.value = true
  load()
}

onMounted(load)
onUnmounted(() => timer && clearTimeout(timer))
</script>

<style scoped>
.mt { margin-top: 14px; }

.card-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.head-left { display: flex; align-items: center; gap: 12px; }
.brand-mark { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--gold-400); line-height: 1; text-shadow: 0 0 18px rgba(224, 180, 92, 0.3); }
.card-title { margin: 0; font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--cream-100); letter-spacing: 0.03em; }
.reg-id { font-family: var(--font-mono); font-size: 14px; }
.card-sub { font-family: var(--font-mono); font-size: 11px; color: var(--cream-400); }

.meta-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-bottom: 16px; }
.status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.04em; border: 1px solid; }
.status-pill .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.status-pill.pending { color: var(--slate-400); border-color: var(--ink-600); }
.status-pill.running { color: var(--gold-300); border-color: var(--gold-500); }
.status-pill.running .dot { animation: pdot 1.2s infinite; }
.status-pill.completed { color: var(--teal-400); border-color: var(--teal-500); }
.status-pill.failed { color: var(--rose-400); border-color: var(--rose-500); }
.status-pill.paused { color: var(--slate-400); border-color: var(--ink-600); background: rgba(107, 118, 129, 0.1); }
@keyframes pdot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
.meta-chip { font-family: var(--font-mono); font-size: 12px; color: var(--cream-200); }
.meta-chip label { color: var(--cream-400); margin-right: 6px; }

.stepper { display: flex; align-items: center; gap: 0; margin: 8px 0 22px; flex-wrap: wrap; }
.step { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--ink-800); }
.step-ico { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 11px; font-weight: 600; background: var(--ink-700); color: var(--cream-300); }
.step-meta { display: flex; flex-direction: column; line-height: 1.3; }
.step-name { font-size: 13px; font-weight: 600; color: var(--cream-100); }
.step-status { font-family: var(--font-mono); font-size: 10px; color: var(--cream-400); }
.step.pending .step-ico { background: var(--ink-700); color: var(--slate-400); }
.step.running { border-color: var(--gold-500); }
.step.running .step-ico { background: var(--gold-500); color: var(--ink-900); }
.step.running .step-status { color: var(--gold-300); }
.step.completed { border-color: var(--teal-500); }
.step.completed .step-ico { background: var(--teal-500); color: var(--ink-900); }
.step.completed .step-status { color: var(--teal-400); }
.step.failed { border-color: var(--rose-500); }
.step.failed .step-ico { background: var(--rose-500); color: var(--ink-900); }
.step.failed .step-status { color: var(--rose-400); }
.step.paused { border-color: var(--ink-600); }
.step.paused .step-ico { background: var(--ink-700); color: var(--slate-400); }
.step.paused .step-status { color: var(--slate-400); }
.step-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.step-actions .el-button { padding: 4px 10px; height: 26px; font-size: 11px; border-radius: 4px; }
.step-err { color: var(--rose-400); cursor: help; font-size: 14px; }
.step-arrow { width: 28px; height: 1px; background: var(--ink-600); margin: 0 2px; position: relative; }

.main-tabs { margin-top: 18px; }
.main-tabs :deep(.el-tabs__header) { margin: 0 0 14px; }
.main-tabs :deep(.el-tabs__nav-wrap::after) { background: var(--line); height: 1px; }
.main-tabs :deep(.el-tabs__item) {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--cream-300);
  height: 40px;
}
.main-tabs :deep(.el-tabs__item:hover) { color: var(--cream-100); }
.main-tabs :deep(.el-tabs__item.is-active) { color: var(--gold-300); }
.main-tabs :deep(.el-tabs__active-bar) { background: var(--gold-500); height: 2px; }
.main-tabs :deep(.el-tab-pane) { min-height: 480px; }
.step-arrow::after { content: '▸'; position: absolute; right: -6px; top: -7px; color: var(--ink-600); font-size: 10px; }
</style>
