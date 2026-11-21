<template>
  <div>
    <el-checkbox-group v-model="folders">
      <el-space wrap>
        <el-checkbox v-for="d in dirs" :key="d" :label="d">{{ d }}</el-checkbox>
      </el-space>
    </el-checkbox-group>
    <div class="muted" style="margin-top:8px" v-if="defaultFolders.length">
      <el-icon><InfoFilled /></el-icon> 该案件类型默认目录（留空即用）: {{ defaultFolders.join(' / ') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
const props = defineProps<{ tree: Record<string, string[]>; caseLx: string; defaultFolders: string[] }>()
const folders = defineModel<string[]>('folders', { required: true })
const dirs = computed(() => props.tree[props.caseLx] || [])
watch(() => props.caseLx, () => { folders.value = [] })
</script>
