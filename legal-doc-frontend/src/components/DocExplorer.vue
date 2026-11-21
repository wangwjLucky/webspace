<script setup lang="ts">
/** 文件管理器（§2026-09-22）：左卷宗目录树(含文件叶) | 右内容区。
 * - 选文件夹 → 右侧平铺该目录文件缩略图，点缩略图预览
 * - 选文件叶 → 右侧直接预览（图片 <img> / PDF <iframe>）
 */
import { computed, ref, watch } from 'vue'
import type { FolderVO, RegFileVO, AuditVO } from '../types'

const props = defineProps<{ folders: FolderVO[]; files: RegFileVO[]; audit: AuditVO[] }>()

const norm = (p: string) => (p || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')

const ext = (name: string | null) => (name || '').toLowerCase().split('.').pop() || ''
const isImg = (name: string | null) => {
  const e = ext(name)
  return ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'gif'].includes(e)
}
const isPdf = (name: string | null) => ext(name) === 'pdf'
const isTiff = (name: string | null) => ['tif', 'tiff'].includes(ext(name))

interface TreeNode {
  id: string
  label: string
  folder: boolean
  file?: boolean
  fileCount?: number
  empty?: boolean
  volume?: string
  children?: TreeNode[]
  file_id?: string
  preview_url?: string | null
  img?: boolean
  pdf?: boolean
  tiff?: boolean
  name?: string | null
}

const filesByFolder = computed(() => {
  const m = new Map<string, RegFileVO[]>()
  for (const f of props.files) {
    const key = f.folder_id && f.folder_id !== '0' ? f.folder_id : '__unfiled__'
    const arr = m.get(key)
    if (arr) arr.push(f)
    else m.set(key, [f])
  }
  return m
})

const treeData = computed<TreeNode[]>(() => {
  const byParent = new Map<string, FolderVO[]>()
  for (const f of props.folders) {
    const arr = byParent.get(f.parent_id)
    if (arr) arr.push(f)
    else byParent.set(f.parent_id, [f])
  }
  const build = (f: FolderVO): TreeNode | null => {
    const kids = (byParent.get(f.id) || [])
      .map(build).filter((n): n is TreeNode => n !== null)
    const docs = (filesByFolder.value.get(f.id) || []).map(fl => ({
      id: fl.file_id,
      label: fl.name || fl.original_name || fl.file_id,
      folder: false,
      file: true,
      file_id: fl.file_id,
      preview_url: fl.preview_url,
      img: isImg(fl.original_name || fl.name),
      pdf: isPdf(fl.original_name || fl.name),
      tiff: isTiff(fl.original_name || fl.name),
      name: fl.name || fl.original_name,
    }))
    const fileCount = docs.length + kids.reduce((s, n) => s + (n.fileCount || 0), 0)
    return {
      id: f.id,
      label: f.name,
      folder: true,
      volume: f.volume_type || undefined,
      fileCount,
      empty: fileCount === 0,
      children: [...kids, ...docs],
    }
  }
  const roots = (byParent.get('0') || [])
    .map(build).filter((n): n is TreeNode => n !== null)
  const unfiled = filesByFolder.value.get('__unfiled__')
  if (unfiled && unfiled.length) {
    roots.push({
      id: '__unfiled__',
      label: '(未归卷)',
      folder: true,
      fileCount: unfiled.length,
      empty: false,
      children: unfiled.map(fl => ({
        id: fl.file_id,
        label: fl.name || fl.original_name || fl.file_id,
        folder: false,
        file: true,
        file_id: fl.file_id,
        preview_url: fl.preview_url,
        img: isImg(fl.original_name || fl.name),
        pdf: isPdf(fl.original_name || fl.name),
        tiff: isTiff(fl.original_name || fl.name),
        name: fl.name || fl.original_name,
      })),
    })
  }
  return roots
})

const selected = ref<{ type: 'folder' | 'file'; id: string } | null>(null)
const showEmpty = ref(true)

const folderTitle = computed(() => {
  if (!selected.value || selected.value.type !== 'folder') return ''
  if (selected.value.id === '__unfiled__') return '(未归卷)'
  const f = props.folders.find(x => x.id === selected.value!.id)
  return f ? f.name : ''
})

const visibleTree = computed<TreeNode[]>(() => {
  if (showEmpty.value) return treeData.value
  const prune = (nodes: TreeNode[]): TreeNode[] => {
    const out: TreeNode[] = []
    for (const n of nodes) {
      if (n.folder && n.fileCount === 0) continue
      if (n.children) {
        const kids = prune(n.children)
        out.push({ ...n, children: kids })
      } else {
        out.push(n)
      }
    }
    return out
  }
  return prune(treeData.value)
})

const currentFiles = computed<RegFileVO[]>(() => {
  if (!selected.value || selected.value.type !== 'folder') return []
  if (selected.value.id === '__unfiled__') {
    return filesByFolder.value.get('__unfiled__') || []
  }
  return filesByFolder.value.get(selected.value.id) || []
})


const currentFile = computed<RegFileVO | null>(() => {
  if (!selected.value || selected.value.type !== 'file') return null
  return props.files.find(f => f.file_id === selected.value!.id) || null
})

function onNodeClick(data: TreeNode) {
  if (data.file) selected.value = { type: 'file', id: data.file_id! }
  else if (data.folder) selected.value = { type: 'folder', id: data.id }
}

// 默认选首个含直接文件的目录（无文件则首个根）
watch(treeData, (td) => {
  if (!selected.value) {
    if (props.files.length) {
      const fid = props.files[0].folder_id
      const key = fid && fid !== '0' ? fid : '__unfiled__'
      selected.value = { type: 'folder', id: key }
    } else if (td.length) {
      selected.value = { type: 'folder', id: td[0].id }
    }
  }
}, { immediate: true })

const riskFields = computed(() => props.audit.filter(a =>
  ['unverifiable', 'ocr_suspect', 'suspicious', 'invalid_checksum', 'truncated_unverifiable']
    .some(k => (a.verification_status || '').includes(k) || a.value_validity === k || a.reconciliation_status === k)
))
</script>

<template>
  <div class="explorer">
    <el-alert v-if="riskFields.length" type="warning" :closable="false" show-icon
      :title="`⚠️ ${riskFields.length} 个风险字段需人工关注（unverifiable/ocr_suspect/suspicious/校验位非法）`" class="risk" />

    <div class="browser">
      <aside class="tree-pane">
        <div class="pane-head">
          <span>卷宗目录</span>
          <el-tooltip content="空目录显隐" placement="left">
            <el-switch v-model="showEmpty" inline-prompt size="small" active-text="显" inactive-text="隐" />
          </el-tooltip>
        </div>
        <div class="tree-scroll">
          <el-tree :data="visibleTree" :props="{ label: 'label' }" node-key="id"
            default-expand-all :expand-on-click-node="false"
            @node-click="(_d: any) => onNodeClick(_d)" class="vol-tree">
            <template #default="{ data }">
              <span class="node" :class="{ active: selected && selected.id === data.id }">
                <span v-if="data.folder" class="folder-node" :class="{ empty: data.empty }">
                  <span class="ico">▸</span>
                  <span class="lbl">{{ data.label }}</span>
                  <span v-if="data.volume" class="vol">{{ data.volume }}</span>
                  <span class="dc" :class="{ zero: data.fileCount === 0 }">{{ data.fileCount }}</span>
                </span>
                <span v-else class="file-node">
                  <span class="ico">{{ data.pdf ? '⬚' : (data.img ? '▭' : '⚑') }}</span>
                  <span class="lbl">{{ data.label }}</span>
                </span>
              </span>
            </template>
          </el-tree>
        </div>
      </aside>

      <section class="content-pane">
        <!-- 选了文件夹：缩略图平铺 -->
        <template v-if="selected && selected.type === 'folder'">
          <div class="pane-head">
            <span>{{ folderTitle }}</span>
            <span class="cnt">{{ currentFiles.length }} 个文件</span>
          </div>
          <div class="grid" v-if="currentFiles.length">
            <div v-for="f in currentFiles" :key="f.file_id" class="tile" @click="selected = { type: 'file', id: f.file_id }">
              <div class="thumb">
                <img v-if="isImg(f.original_name || f.name)" :src="f.preview_url || ''" loading="lazy" />
                <span v-else class="thumb-glyph">{{ isPdf(f.original_name||f.name) ? 'PDF' : (isTiff(f.original_name||f.name) ? 'TIFF' : 'DOC') }}</span>
              </div>
              <div class="tile-name">{{ f.name || f.original_name }}</div>
            </div>
          </div>
          <div v-else class="empty-state"><span class="em-mark">∅</span><span>该目录无文件</span></div>
        </template>

        <!-- 选了文件：直接预览 -->
        <template v-else-if="currentFile">
          <div class="pane-head">
            <span>{{ currentFile.name || currentFile.original_name }}</span>
            <a v-if="currentFile.preview_url" :href="currentFile.preview_url" target="_blank" class="open-new">新窗口打开 ↗</a>
          </div>
          <div class="preview">
            <img v-if="isImg(currentFile.original_name || currentFile.name)" :src="currentFile.preview_url || ''" />
            <iframe v-else-if="isPdf(currentFile.original_name || currentFile.name)" :src="currentFile.preview_url || ''" class="pdf-frame" />
            <div v-else class="preview-fallback">
              <span class="em-mark">⚑</span>
              <span>该格式无法内嵌预览（{{ ext(currentFile.original_name||currentFile.name) }}）</span>
              <a v-if="currentFile.preview_url" :href="currentFile.preview_url" target="_blank" class="open-new">下载查看 ↗</a>
            </div>
          </div>
        </template>

        <div v-else class="empty-state"><span class="em-mark">◯</span><span>从左侧选择文件或目录</span></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.explorer { width: 100%; }
.risk { margin-bottom: 14px; }
.browser { display: flex; gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; height: 620px; }

.tree-pane { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--ink-850); }
.content-pane { flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--ink-900); }

.pane-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid var(--line);
  font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--cream-100); letter-spacing: 0.04em;
  background: var(--ink-850);
}
.content-pane .pane-head { background: var(--ink-900); }
.cnt { font-family: var(--font-mono); font-size: 11px; font-weight: 400; color: var(--cream-400); }
.open-new { font-family: var(--font-mono); font-size: 11px; color: var(--gold-300); text-decoration: none; }
.open-new:hover { color: var(--gold-400); }

.tree-scroll { flex: 1; overflow: auto; padding: 6px 4px; }
.vol-tree { background: transparent; --el-tree-node-hover-bg-color: var(--ink-800); }
.vol-tree :deep(.el-tree-node__content) { height: 30px; }
.node { flex: 1; display: flex; align-items: center; padding: 0 4px; border-radius: 5px; }
.node.active { background: rgba(200, 151, 58, 0.14); }
.folder-node, .file-node { display: inline-flex; align-items: center; gap: 7px; width: 100%; }
.folder-node .ico { color: var(--gold-400); font-size: 10px; width: 10px; }
.file-node .ico { color: var(--cream-400); font-size: 11px; width: 10px; }
.folder-node .lbl { font-size: 13px; color: var(--cream-100); }
.file-node .lbl { font-size: 12.5px; color: var(--cream-200); font-family: var(--font-mono); }
.vol { font-family: var(--font-mono); font-size: 9px; color: var(--gold-400); border: 1px solid var(--gold-500); border-radius: 2px; padding: 0 3px; opacity: 0.7; }
.dc { margin-left: auto; font-family: var(--font-mono); font-size: 10px; color: var(--cream-300); background: var(--ink-700); border-radius: 999px; padding: 0 6px; }
.dc.zero { color: var(--slate-400); background: var(--ink-750); }
.folder-node.empty .lbl { color: var(--cream-400); }

.grid { flex: 1; overflow: auto; padding: 18px; display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 312px; gap: 16px; align-content: start; }
.tile { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; cursor: pointer; background: var(--ink-850); transition: border-color 0.18s, transform 0.18s; display: flex; flex-direction: column; }
.tile:hover { border-color: var(--gold-500); transform: translateY(-2px); }
.tile.active { border-color: var(--gold-400); box-shadow: 0 0 0 1px var(--gold-400); }
.thumb { height: 280px; background: var(--ink-900); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top; transition: transform 0.3s; }
.tile:hover .thumb img { transform: scale(1.04); }
.thumb-glyph { font-family: var(--font-mono); font-size: 18px; font-weight: 600; color: var(--gold-400); letter-spacing: 0.06em; border: 1px solid var(--gold-500); padding: 6px 12px; border-radius: 6px; }
.tile-name { padding: 9px 12px; font-family: var(--font-mono); font-size: 12px; color: var(--cream-300); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.preview { flex: 1; overflow: auto; padding: 16px; display: flex; align-items: center; justify-content: center; }
.preview img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
.pdf-frame { width: 100%; height: 100%; border: none; }
.preview-fallback { display: flex; flex-direction: column; align-items: center; gap: 14px; color: var(--cream-400); font-family: var(--font-mono); font-size: 13px; }

.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--cream-400); font-family: var(--font-mono); font-size: 13px; }
.em-mark { font-size: 40px; color: var(--ink-600); }
</style>
