<template>
  <el-table :data="participants" border size="small" style="margin-bottom:8px">
    <el-table-column label="姓名" min-width="120">
      <template #default="{ row }"><el-input v-model="row.name" placeholder="姓名" size="small" /></template>
    </el-table-column>
    <el-table-column label="诉讼地位" min-width="120">
      <template #default="{ row }"><el-input v-model="row.role" placeholder="原告/被告/第三人..." size="small" /></template>
    </el-table-column>
    <el-table-column label="身份证（可选）" min-width="180">
      <template #default="{ row }"><el-input v-model="row.id_card" placeholder="身份证号" size="small" /></template>
    </el-table-column>
    <el-table-column label="操作" width="70" align="center">
      <template #default="{ $index }">
        <el-button type="danger" :icon="Delete" circle size="small" @click="participants.splice($index, 1)" />
      </template>
    </el-table-column>
  </el-table>
  <el-button :icon="Plus" @click="participants.push({ name: '', role: '', id_card: '' })">添加当事人</el-button>
</template>

<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue'
const participants = defineModel<{ name: string; role: string; id_card: string }[]>({ required: true })
</script>
