<template>
  <div class="page-pad">
    <el-card shadow="never" class="list-card">
      <template #header>
        <div class="card-head">
          <div class="head-left">
            <span class="brand-mark">§</span>
            <div>
              <h2 class="card-title">案件列表</h2>
              <span class="card-sub">已登记的卷宗流水</span>
            </div>
          </div>
          <el-space wrap>
            <el-input v-model="queryId" placeholder="输入 reg_id 跳转" style="width:240px" @keyup.enter="go" clearable>
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button type="primary" @click="go">查看</el-button>
            <el-button :icon="Refresh" @click="load" circle />
          </el-space>
        </div>
      </template>

      <el-table :data="list" border v-loading="loading">
        <el-table-column prop="id" label="reg_id" width="200" />
        <el-table-column label="案件类型" width="200">
          <template #default="{ row }">
            <span class="case-code">{{ row.case_lx }}</span>
            <span class="case-name">{{ caseNames[row.case_lx] || '' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="130">
          <template #default="{ row }">
            <span class="status-pill" :class="row.status"><span class="dot" />{{ statusText(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="retry_count" label="retry" width="80" align="center" />
        <el-table-column prop="created_time" label="创建时间" min-width="180" />
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/result/${row.id}`)">详情</el-button>
            <el-button link type="primary" @click="$router.push(`/pipeline/${row.id}`)">流程图</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > size"
        style="margin-top:18px; justify-content:flex-end"
        layout="total, prev, pager, next"
        :total="total" :page-size="size" :current-page="page"
        @current-change="onPage" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { api } from '../api'
import { caseNames } from '../stores/case-names'
import type { RegistrationListItem } from '../types'

const router = useRouter()
const list = ref<RegistrationListItem[]>([])
const loading = ref(true)
const queryId = ref('')
const total = ref(0)
const page = ref(1)
const size = ref(50)

const statusText = (s: string) => ({ pending: '待执行', running: '执行中', completed: '已完成', failed: '失败' }[s] || s)

const load = async () => {
  loading.value = true
  try {
    const data: any = await api.listRegistrations(page.value, size.value)
    if (Array.isArray(data)) {
      list.value = data
      total.value = data.length
    } else {
      list.value = Array.isArray(data?.records) ? data.records : []
      total.value = data?.total ?? list.value.length
    }
  } catch {
    list.value = []
    ElMessage.error('加载失败')
  }
  loading.value = false
}
const onPage = (p: number) => { page.value = p; load() }
const go = () => { if (queryId.value.trim()) router.push(`/result/${queryId.value.trim()}`) }
onMounted(load)
</script>

<style scoped>
.card-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.head-left { display: flex; align-items: center; gap: 12px; }
.brand-mark {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--gold-400);
  line-height: 1;
  text-shadow: 0 0 18px rgba(224, 180, 92, 0.3);
}
.card-title { margin: 0; font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--cream-100); letter-spacing: 0.03em; }
.card-sub { font-family: var(--font-mono); font-size: 11px; color: var(--cream-400); }
.case-code { font-family: var(--font-mono); color: var(--cream-300); font-size: 12px; }
.case-name { margin-left: 8px; color: var(--cream-100); font-size: 13px; }

.status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 999px;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.04em;
  border: 1px solid;
}
.status-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status-pill.pending { color: var(--slate-400); border-color: var(--ink-600); }
.status-pill.running { color: var(--gold-300); border-color: var(--gold-500); }
.status-pill.running .dot { animation: pdot 1.2s infinite; }
.status-pill.completed { color: var(--teal-400); border-color: var(--teal-500); }
.status-pill.failed { color: var(--rose-400); border-color: var(--rose-500); }
@keyframes pdot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
</style>
