<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { hardReload, useAppVersions } from '@/composables/useAppVersions'
import { useAutoReadSetting } from '@/composables/useAutoRead'
import { ZH_VOICE_DEVICE, ZH_VOICE_XIAOXIAO, useZhVoice } from '@/composables/useZhVoice'
import { SLOW_SPEED_MAX, SLOW_SPEED_MIN, SLOW_SPEED_STEP, useSlowSpeed } from '@/composables/useSlowSpeed'
import { clearAppStorage } from '@/utils/appStorage'
import VersionRow from './versionRow.vue'

type SettingsTab = 'general' | 'version' | 'gm'

const FLASH_MS = 2000

const open = ref(false)
const tab = ref<SettingsTab>('general')
const gmConfirming = ref(false)
const flash = ref('')
const { installed, history, pending, refresh, applyUpdate, clearCaches } = useAppVersions()
const { percent: slowPercent, setPercent: setSlowPercent, slower, faster, canSlower, canFaster } = useSlowSpeed()
const { enabled: autoRead, toggle: toggleAutoRead, label: autoReadLabel } = useAutoReadSetting()
const { voice: zhVoice, setVoice: setZhVoice } = useZhVoice()

function onSlowInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  setSlowPercent(value)
}

let flashTimer = 0

function showFlash(message: string) {
  flash.value = message
  if (flashTimer) window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => {
    flash.value = ''
    flashTimer = 0
  }, FLASH_MS)
}

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
  if (pending.value.length) {
    showFlash('Update available')
    return
  }
  showFlash("You're up to date.")
}

async function onClearCache() {
  showFlash('Cache cleared.')
  await clearCaches(FLASH_MS)
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
  if (flashTimer) window.clearTimeout(flashTimer)
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
          :aria-selected="tab === 'general'"
          :class="{ active: tab === 'general' }"
          @click="tab = 'general'"
        >
          General
        </button>
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

      <div v-if="tab === 'general'" class="pane" role="tabpanel">
        <div class="auto-read">
          <p class="slow-label">Auto read</p>
          <button
            type="button"
            class="switch"
            role="switch"
            :aria-checked="autoRead"
            aria-label="Auto read"
            @click="toggleAutoRead"
          >
            {{ autoReadLabel }}
          </button>
        </div>
        <div class="zh-voice">
          <p class="slow-label">Chinese voice</p>
          <div class="voice-picks">
            <button
              type="button"
              class="voice-pick"
              :aria-pressed="zhVoice === ZH_VOICE_XIAOXIAO"
              @click="setZhVoice(ZH_VOICE_XIAOXIAO)"
            >Xiaoxiao</button>
            <button
              type="button"
              class="voice-pick"
              :aria-pressed="zhVoice === ZH_VOICE_DEVICE"
              @click="setZhVoice(ZH_VOICE_DEVICE)"
            >Device</button>
          </div>
        </div>
        <div class="slow-speed">
          <div class="slow-head">
            <p class="slow-label">Slow speed</p>
            <p class="slow-value" aria-live="polite">{{ slowPercent }}%</p>
          </div>
          <div class="slow-controls">
            <button
              type="button"
              class="ghost step"
              aria-label="Decrease slow speed"
              :disabled="!canSlower"
              @click="slower"
            >−</button>
            <input
              type="range"
              class="slow-slider"
              :min="SLOW_SPEED_MIN"
              :max="SLOW_SPEED_MAX"
              :step="SLOW_SPEED_STEP"
              :value="slowPercent"
              aria-label="Slow speed"
              @input="onSlowInput"
            />
            <button
              type="button"
              class="ghost step"
              aria-label="Increase slow speed"
              :disabled="!canFaster"
              @click="faster"
            >+</button>
          </div>
        </div>
      </div>

      <div v-else-if="tab === 'version'" class="pane" role="tabpanel">
        <div class="pane-head">
          <p class="current">
            Current version
            <strong>{{ installed?.version || '—' }}</strong>
          </p>
          <div class="version-actions">
            <button type="button" class="action" @click="checkUpdate">
              Check for updates
            </button>
            <button type="button" class="ghost" @click="onClearCache">
              Clear cache
            </button>
          </div>
        </div>
        <div class="history" aria-label="Last 10 versions">
          <VersionRow
            v-for="group in history"
            :key="group.version"
            :version="group.version"
            :date="group.date"
            :summaries="group.summaries"
          />
        </div>
      </div>

      <div v-else-if="tab === 'gm'" class="pane" role="tabpanel">
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
      v-if="flash"
      class="toast notice"
      aria-live="polite"
    >
      {{ flash }}
    </aside>
    <aside
      v-else-if="!open && pending.length"
      class="toast popover"
      aria-live="polite"
      aria-label="Available updates"
    >
      <button type="button" class="action sticky" @click="applyUpdate">
        Update
      </button>
      <VersionRow
        v-for="group in pending"
        :key="group.version"
        :version="group.version"
        :date="group.date"
        :summaries="group.summaries"
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

.auto-read {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 18px;
  border: 3px solid #2f3f3b;
  background: var(--fog);
}

.auto-read .slow-label {
  margin: 0;
}

.switch {
  min-height: 44px;
  min-width: 72px;
  margin: 0;
  padding: 8px 14px;
  border-radius: 999px;
  border: 3px solid #2f3f3b;
  background: var(--paper);
  color: var(--ink);
  font-size: 1.05rem;
  font-weight: 700;
}

.switch[aria-checked='true'] {
  background: var(--teal);
  color: white;
}

.zh-voice {
  margin-bottom: 10px;
  padding: 10px 12px 12px;
  border-radius: 18px;
  border: 3px solid #2f3f3b;
  background: var(--fog);
}

.zh-voice .slow-label {
  margin: 0 0 8px;
}

.voice-picks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.voice-pick {
  min-height: 44px;
  margin: 0;
  padding: 8px 10px;
  border-radius: 999px;
  border: 3px solid #2f3f3b;
  background: var(--paper);
  color: var(--ink);
  font-size: 1.02rem;
  font-weight: 700;
}

.voice-pick[aria-pressed='true'] {
  background: var(--teal);
  color: white;
}

.slow-speed {
  margin: 0;
  padding: 10px 12px 12px;
  border-radius: 18px;
  border: 3px solid #2f3f3b;
  background: var(--fog);
}

.slow-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.slow-label,
.slow-value {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.slow-value {
  color: var(--teal-dark);
}

.slow-controls {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 8px;
}

.slow-slider {
  width: 100%;
  min-height: 32px;
  accent-color: var(--teal);
}

.ghost.step {
  min-height: 44px;
  width: 44px;
  margin: 0;
  padding: 0;
  font-size: 1.35rem;
  line-height: 1;
}

.ghost.step:disabled {
  opacity: 0.38;
  cursor: not-allowed;
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
  min-height: 44px;
  padding: 8px 4px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 0.92rem;
  font-weight: 700;
}

.tabs button.active {
  background: var(--paper);
  color: var(--teal-dark);
  box-shadow: 0 2px 0 rgba(47, 63, 59, 0.18);
}

.pane-head {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: -4px -4px 12px;
  padding: 4px 4px 8px;
  background: var(--paper);
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

.history,
.toast {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history {
  margin-top: 12px;
}

.toast.notice {
  z-index: 47;
  width: max-content;
  max-width: min(360px, calc(100vw - 48px));
  font-weight: 700;
  font-size: 1.05rem;
}

.toast.popover {
  max-height: min(70vh, 560px);
}

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
.version-actions .ghost,
.toast .action {
  margin-top: 0;
}

.toast .action.sticky {
  position: sticky;
  top: 0;
  z-index: 1;
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
