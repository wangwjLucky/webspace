<script setup lang="ts">
/** 对账明细：按「基本信息 / 每个当事人」分块，默认全展开。
 * 当事人归属：audit(source_doc_id, field, llm_value/resolved_to) ↔ participant(_src, field, value) 值匹配。
 */
import { computed } from 'vue'
import type { AuditVO, ElementVO } from '../types'
import StatusTag from './StatusTag.vue'

const props = defineProps<{ audit: AuditVO[]; element: ElementVO }>()

interface Block {
  key: string
  label: string
  sub: string
  items: AuditVO[]
}

function roleText(p: any): string {
  const r = p['诉讼地位']
  if (Array.isArray(r)) return r.join('/')
  return r ? String(r) : ''
}

const blocks = computed<Block[]>(() => {
  const out: Block[] = []
  const used = new Set<AuditVO>()

  // 基本信息
  const basic = props.audit.filter(a => (a.field || '').startsWith('basic_info.'))
  basic.forEach(a => used.add(a))
  if (basic.length) out.push({ key: '__basic__', label: '基本信息', sub: '', items: basic })

  // 每个当事人一块：逐字段取首个未匹配的 audit 条目（audit 内序即当事人序）
  const parties: { p: any; type: string }[] = [
    ...((props.element.participants_natural || []).map(p => ({ p, type: '自然人' }))),
    ...((props.element.participants_legal || []).map(p => ({ p, type: '法人' }))),
    ...((props.element.agents || []).map(p => ({ p, type: '代理人' }))),
  ]
  for (const { p, type } of parties) {
    const src = p?._src
    if (!src) continue
    const name = type === '代理人' ? `代理人 ${p['姓名'] || '?'}` : (p['姓名'] || p['单位名称'] || '?')
    const role = roleText(p)
    const items: AuditVO[] = []
    for (const f of Object.keys(p || {})) {
      if (f.startsWith('_')) continue
      const pv = p[f]
      if (pv == null || pv === '' ) continue  // null 字段未进 audit
      const pvs = String(pv)
      const a = props.audit.find(x =>
        !used.has(x) && x.source_doc_id === src && x.field === f
        && (String(x.llm_value ?? '') === pvs || String(x.resolved_to ?? '') === pvs)
      )
      if (a) { items.push(a); used.add(a) }
    }
    if (items.length) {
      out.push({ key: `${src}|${name}`, label: name, sub: `${src} · ${type}${role ? ' · ' + role : ''}`, items })
    }
  }

  // 未归属
  const orphan = props.audit.filter(a => !used.has(a))
  if (orphan.length) out.push({ key: '__other__', label: '其他', sub: '', items: orphan })

  return out
})
</script>

<template>
  <div v-if="audit.length" class="audit-blocks">
    <div v-for="b in blocks" :key="b.key" class="audit-block">
      <div class="block-head">
        <span class="block-ico">▸</span>
        <span class="block-label">{{ b.label }}</span>
        <span v-if="b.sub" class="block-sub">{{ b.sub }}</span>
        <span class="block-cnt">{{ b.items.length }} 项</span>
      </div>
      <el-table :data="b.items" border size="small">
        <el-table-column prop="field" label="字段" width="150" show-overflow-tooltip />
        <el-table-column label="LLM 值" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ row.llm_value ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="原文核实" width="160">
          <template #default="{ row }"><StatusTag :status="row.verification_status" /></template>
        </el-table-column>
        <el-table-column label="值合法性" width="140">
          <template #default="{ row }"><StatusTag :status="row.value_validity" /></template>
        </el-table-column>
        <el-table-column label="对账" width="140">
          <template #default="{ row }"><StatusTag :status="row.reconciliation_status" /></template>
        </el-table-column>
        <el-table-column label="重抽采纳值" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.resolved_to ?? '-' }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
  <el-empty v-else description="无对账明细" />
</template>

<style scoped>
.audit-blocks { display: flex; flex-direction: column; gap: 18px; }
.audit-block {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--ink-850);
}
.block-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  background: linear-gradient(90deg, var(--ink-800), var(--ink-850));
  border-bottom: 1px solid var(--line);
}
.block-ico { color: var(--gold-400); font-size: 12px; }
.block-label {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--cream-100);
  letter-spacing: 0.03em;
}
.block-sub {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--cream-400);
  padding: 1px 7px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--ink-900);
}
.block-cnt {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--cream-300);
  background: var(--ink-700);
  border-radius: 999px;
  padding: 1px 10px;
}
.audit-block :deep(.el-table) { border: none; }
</style>
