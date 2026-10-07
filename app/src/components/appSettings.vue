<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { hardReload, useAppVersions } from '@/composables/useAppVersions'
import { clearAppStorage } from '@/utils/appStorage'
import VersionRow from './versionRow.vue'

type SettingsTab = 'version' | 'gm'

const open = ref(false)
const tab = ref<SettingsTab>('version')
const gmConfirming = ref(false)
const { versions, current, pending, refresh, applyUpdate, clearCaches } = useAppVersions()

function toggle() {
  open.value = !open.value
  if (open.value) gmConfirming.value = false
}

function close() {
  open.value = false
  gmConfirming.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    close()
  }
}

async function checkUpdate() {
  await refresh()
  if (pending.value.length) close()
}

function resetLocalState() {
  clearAppStorage()
  hardReload()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="settings">
    <button
      type="button"
      class="gear"
      :aria-expanded="open"
      aria-haspopup="dialog"
      aria-controls="settings-panel"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.59.22-1.14.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64L4.86 11.06c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.4.31.64.22l2.39-.96c.49.4 1.04.72 1.63.94l.36 2.54c.05.24.26.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.59-.22 1.14-.53 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
        />
      </svg>
      <span>设置</span>
    </button>

    <div
      v-if="open"
      class="backdrop"
      aria-hidden="true"
      @click="close"
    />

    <section
      v-if="open"
      id="settings-panel"
      class="panel"
      role="dialog"
      aria-label="设置"
    >
      <div class="tabs" role="tablist" aria-label="设置分类">
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'version'"
          :class="{ active: tab === 'version' }"
          @click="tab = 'version'"
        >
          版本
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'gm'"
          :class="{ active: tab === 'gm' }"
          @click="tab = 'gm'"
        >
          GM
        </button>
      </div>

      <div v-if="tab === 'version'" class="pane" role="tabpanel">
        <p class="current">
          当前版本
          <strong>{{ current?.version || '—' }}</strong>
        </p>
        <div class="version-actions">
          <button type="button" class="action" @click="checkUpdate">
            检查更新
          </button>
          <button type="button" class="ghost" @click="clearCaches">
            清除缓存
          </button>
        </div>
        <div class="rows">
          <VersionRow
            v-for="entry in versions"
            :key="entry.id"
            :entry="entry"
          />
          <p v-if="!versions.length" class="empty">还没有版本记录</p>
        </div>
      </div>

      <div v-else class="pane" role="tabpanel">
        <p class="gm-copy">清空本机阅读进度、展示模式和已读版本，然后重新加载。</p>
        <template v-if="!gmConfirming">
          <button type="button" class="danger" @click="gmConfirming = true">
            初始化
          </button>
        </template>
        <div v-else class="confirm">
          <p>确定清空本地数据？此操作不能撤销。</p>
          <div class="confirm-actions">
            <button type="button" class="ghost" @click="gmConfirming = false">
              取消
            </button>
            <button type="button" class="danger" @click="resetLocalState">
              确定清空
            </button>
          </div>
        </div>
      </div>
    </section>

    <aside
      v-else-if="pending.length"
      class="toast"
      aria-live="polite"
      aria-label="可用更新"
    >
      <VersionRow
        v-for="entry in pending"
        :key="entry.id"
        :entry="entry"
        show-update
        @update="applyUpdate"
      />
    </aside>
  </div>
</template>

<style scoped>
.settings {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  width: min(360px, calc(100vw - 24px));
  pointer-events: none;
}

.gear,
.backdrop,
.panel,
.toast {
  pointer-events: auto;
}

.gear {
  position: relative;
  z-index: 46;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
  padding: 10px 16px;
  border-radius: 999px;
  border: 3px solid #2f3f3b;
  background: var(--paper);
  color: var(--ink);
  font-size: 1.05rem;
  font-weight: 700;
  box-shadow: 0 4px 0 #2f3f3b;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(36, 51, 48, 0.18);
}

.panel,
.toast {
  position: relative;
  z-index: 45;
  width: 100%;
  max-height: min(70vh, 560px);
  overflow: auto;
  padding: 12px;
  border-radius: 22px;
  border: 3px solid #2f3f3b;
  background: var(--paper);
  box-shadow: var(--shadow);
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  padding: 4px;
  border-radius: 999px;
  background: var(--fog);
  border: 3px solid #2f3f3b;
}

.tabs button {
  flex: 1;
  min-height: 48px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 1.05rem;
  font-weight: 700;
}

.tabs button.active {
  background: var(--paper);
  color: var(--teal-dark);
  box-shadow: 0 2px 0 rgba(47, 63, 59, 0.18);
}

.current {
  margin: 0 0 12px;
  font-size: 1.05rem;
  font-weight: 600;
}

.current strong {
  margin-left: 6px;
  color: var(--teal-dark);
}

.rows,
.toast {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty,
.gm-copy,
.confirm p {
  margin: 0;
  color: var(--muted);
  font-weight: 500;
  line-height: 1.45;
}

.version-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.action,
.danger,
.ghost {
  min-height: 52px;
  width: 100%;
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 3px solid #2f3f3b;
  font-size: 1.05rem;
  font-weight: 700;
}

.version-actions .action,
.version-actions .ghost {
  margin-top: 0;
}

.action {
  background: var(--teal);
  color: white;
}

.danger {
  background: var(--coral);
  color: white;
}

.ghost {
  background: var(--paper);
  color: var(--ink);
}

.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.confirm-actions .danger,
.confirm-actions .ghost {
  margin-top: 12px;
}
</style>
