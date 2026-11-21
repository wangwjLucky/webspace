<template>
  <el-container class="app-shell">
    <aside class="app-aside">
      <div class="brand">
        <span class="brand-mark">§</span>
        <div class="brand-text">
          <span class="brand-title">卷宗流水</span>
          <span class="brand-sub">法律文书编排</span>
        </div>
      </div>
      <el-menu :router="true" :default-active="activePath" class="side-menu">
        <el-menu-item index="/"><el-icon><Upload /></el-icon><span>登记</span></el-menu-item>
        <el-menu-item index="/list"><el-icon><List /></el-icon><span>案件列表</span></el-menu-item>
      </el-menu>
      <div class="aside-foot">
        <span class="ver">v0.2 · 深色观测台</span>
      </div>
    </aside>
    <main class="app-main"><router-view /></main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
// /pipeline/:id /result/:id 都高亮"案件列表"
const activePath = computed(() => (route.path.startsWith('/list') || route.path.startsWith('/result') || route.path.startsWith('/pipeline') ? '/list' : route.path))
</script>

<style scoped>
.app-shell { height: 100vh; display: flex; }
.app-aside {
  width: 220px;
  flex-shrink: 0;
  background: linear-gradient(180deg, var(--ink-850), var(--ink-900));
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  position: relative;
}
.app-aside::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0; right: -1px;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--gold-500), transparent);
  opacity: 0.3;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 18px;
  border-bottom: 1px solid var(--line);
}
.brand-mark {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--gold-400);
  line-height: 1;
  text-shadow: 0 0 18px rgba(224, 180, 92, 0.35);
}
.brand-title {
  display: block;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--cream-100);
  letter-spacing: 0.06em;
}
.brand-sub {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--cream-400);
  margin-top: 2px;
  letter-spacing: 0.08em;
}
.side-menu {
  flex: 1;
  border: none !important;
  background: transparent !important;
  padding: 10px 8px;
}
.side-menu :deep(.el-menu-item) {
  color: var(--cream-300);
  border-radius: 8px;
  margin: 4px 0;
  height: 42px;
  line-height: 42px;
  font-size: 14px;
}
.side-menu :deep(.el-menu-item:hover) {
  background: var(--ink-800) !important;
  color: var(--cream-100);
}
.side-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(200, 151, 58, 0.18), transparent) !important;
  color: var(--gold-300) !important;
  box-shadow: inset 2px 0 0 var(--gold-500);
}
.aside-foot {
  padding: 14px 20px;
  border-top: 1px solid var(--line);
}
.ver {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--cream-400);
  letter-spacing: 0.06em;
}
</style>
