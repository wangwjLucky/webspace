/** 轮询登记结果 + 子步骤 trace（§2026-09-21）。
 *
 * - status ∈ {pending, running} 时每 2s 轮询 GET /registration/:id
 * - steps 按 (skill, step_no) 去重合并（增量返回不会重复 DOM）
 * - 终态（completed/failed）停轮询
 */
import { ref, watch, onUnmounted, type Ref } from 'vue'
import { api } from '../api'
import type { RegistrationVO, SkillStepsGroup } from '../types'

const RUNNING = new Set(['pending', 'running'])

export function useRegistrationPoll(regId: string) {
  const data: Ref<RegistrationVO | null> = ref(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let timer: number | null = null

  async function fetchOnce() {
    try {
      const res = await api.getRegistration(regId)
      // 合并 steps：保留已收到的 running/历史，新数据覆盖同 (skill,step_no)
      const prev = data.value
      if (prev && prev.steps && res.steps) {
        res.steps = mergeSteps(prev.steps, res.steps)
      }
      data.value = res
      loading.value = false
      error.value = null
      if (!RUNNING.has(res.status)) {
        stop()
      }
    } catch (e: any) {
      error.value = e?.message ?? String(e)
      loading.value = false
    }
  }

  function start() {
    loading.value = true
    fetchOnce()
    if (timer == null) {
      timer = window.setInterval(fetchOnce, 2000)
    }
  }

  function stop() {
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
  }

  // regId 变化时重启
  watch(() => regId, () => {
    stop()
    data.value = null
    start()
  })

  onUnmounted(stop)

  start()  // 首次拉取 + 启动轮询

  return { data, loading, error, refresh: fetchOnce }
}

/** 按 (skill, step_no) 合并：后返回的覆盖前，保证每个 step_no 只留最新状态。 */
function mergeSteps(prev: SkillStepsGroup[], cur: SkillStepsGroup[]): SkillStepsGroup[] {
  const map = new Map<string, Map<number, any>>()
  for (const g of [...prev, ...cur]) {
    let m = map.get(g.skill)
    if (!m) {
      m = new Map()
      map.set(g.skill, m)
    }
    for (const it of g.items) {
      m.set(it.step_no, { ...m.get(it.step_no), ...it })
    }
  }
  const order: Record<string, number> = { ocr: 0, catalog: 1, 'element-extraction': 2 }
  return [...map.entries()]
    .sort((a, b) => (order[a[0]] ?? 99) - (order[b[0]] ?? 99))
    .map(([skill, m]) => ({
      skill,
      items: [...m.values()].sort((a, b) => a.step_no - b.step_no),
    }))
}
