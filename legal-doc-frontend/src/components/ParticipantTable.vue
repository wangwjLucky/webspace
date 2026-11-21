<template>
  <h5 style="margin:16px 0 6px">{{ title }}（{{ items.length }}）</h5>
  <el-table :data="items" border size="small">
    <el-table-column label="姓名/单位" min-width="120">
      <template #default="{ row }">{{ row['姓名'] || row['单位名称'] || '-' }}</template>
    </el-table-column>
    <el-table-column label="诉讼地位" width="120">
      <template #default="{ row }">{{ Array.isArray(row['诉讼地位']) ? row['诉讼地位'].join('/') : (row['诉讼地位'] || '-') }}</template>
    </el-table-column>
    <el-table-column label="证件号码" min-width="180">
      <template #default="{ row }">{{ row['证件号码'] || '-' }}</template>
    </el-table-column>
    <el-table-column label="性别" width="60">
      <template #default="{ row }">{{ row['性别'] || '-' }}</template>
    </el-table-column>
    <el-table-column label="现住址" min-width="180" show-overflow-tooltip>
      <template #default="{ row }">{{ row['现住址'] || row['主要办事机构所在地'] || '-' }}</template>
    </el-table-column>
    <el-table-column label="对账" width="130">
      <template #default="{ row }"><StatusTag :status="row['reconciliation_status'] as string" /></template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import StatusTag from './StatusTag.vue'
defineProps<{ title: string; items: Record<string, unknown>[] }>()
</script>
