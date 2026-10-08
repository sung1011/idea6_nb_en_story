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
      aria-label="Settings"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.59.22-1.14.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64L4.86 11.06c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.4.31.64.22l2.39-.96c.49.4 1.04.72 1.63.94l.36 2.54c.05.24.26.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.59-.22 1.14-.53 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
        />
      </svg>
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
      aria-label="Settings"
    >
      <div class="tabs" role="tablist" aria-label="Settings sections">
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'version'"
          :class="{ active: tab === 'version' }"
          @click="tab = 'version'"
        >
          Version
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
          Current version
          <strong>{{ current?.version || '—' }}</strong>
        </p>
        <div class="version-actions">
          <button type="button" class="action" @click="checkUpdate">
            Check for updates
          </button>
          <button type="button" class="ghost" @click="clearCaches">
            Clear cache
          </button>
        </div>
        <div class="rows">
          <VersionRow
            v-for="entry in versions"
            :key="entry.id"
            :entry="entry"
          />
          <p v-if="!versions.length" class="empty">No version history yet</p>
        </div>
      </div>

      <div v-else class="pane" role="tabpanel">
        <p class="gm-copy">Clear reading progress and acknowledged versions on this device, then reload.</p>
        <template v-if="!gmConfirming">
          <button type="button" class="danger" @click="gmConfirming = true">
            Reset all data
          </button>
        </template>
        <div v-else class="confirm">
          <p>This will erase local data on this device. This cannot be undone.</p>
          <div class="confirm-actions">
            <button type="button" class="ghost" @click="gmConfirming = false">
              Cancel
            </button>
            <button type="button" class="danger" @click="resetLocalState">
              Reset all data
            </button>
          </div>
        </div>
      </div>
    </section>

    <aside
      v-else-if="pending.length"
      class="toast"
      aria-live="polite"
      aria-label="Available updates"
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
  position: relative;
  z-index: 50;
  flex-shrink: 0;
}

.gear {
  position: relative;
  z-index: 46;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: 16px;
  border: 3px solid #2f3f3b;
  background: var(--paper);
  color: var(--ink);
  box-shadow: 0 3px 0 #2f3f3b;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(36, 51, 48, 0.18);
}

.panel,
.toast {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 45;
  width: min(360px, calc(100vw - 48px));
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
