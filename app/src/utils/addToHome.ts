export type AddToHomeKind = 'prompt' | 'ios' | 'inApp'

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
}

export type AddToHomeHints = {
  maxTouchPoints?: number
}

const IN_APP =
  /micromessenger|aweme|douyin|bytedance|newsarticle|weibo|fbav|fb_iab|instagram|line\/|snapchat|kakaotalk|xiaohongshu|\bqq\/|mqqbrowser/i

let captured: BeforeInstallPromptEvent | null = null
let installed = false
let listening = false

export function isStandalone(
  win: Pick<Window, 'matchMedia'> & { navigator: Navigator } = window,
): boolean {
  try {
    if (win.matchMedia?.('(display-mode: standalone)').matches) return true
  } catch {
    /* ignore */
  }
  return Boolean((win.navigator as Navigator & { standalone?: boolean }).standalone)
}

export function isInAppBrowser(ua: string): boolean {
  const text = String(ua || '')
  if (IN_APP.test(text)) return true
  return /android/i.test(text) && /; wv\)/i.test(text)
}

export function isIosSafariFamily(ua: string, hints: AddToHomeHints = {}): boolean {
  const text = String(ua || '')
  if (/iphone|ipad|ipod/i.test(text)) return true
  return /macintosh/i.test(text) && (hints.maxTouchPoints ?? 0) > 1
}

export function canUseInstallPrompt(ua: string, hints: AddToHomeHints = {}): boolean {
  const text = String(ua || '')
  if (isInAppBrowser(text) || isIosSafariFamily(text, hints)) return false
  const chrome = /chrome|chromium/i.test(text) && !/opr\//i.test(text)
  const edge = /edg(?:e|a|ios)?\//i.test(text)
  const samsung = /samsungbrowser/i.test(text)
  if (/android/i.test(text)) return chrome || edge || samsung
  return chrome || edge
}

export function addToHomeKind(ua: string, hints: AddToHomeHints = {}): AddToHomeKind {
  const text = String(ua || '')
  if (isInAppBrowser(text)) return 'inApp'
  if (isIosSafariFamily(text, hints)) return 'ios'
  if (canUseInstallPrompt(text, hints)) return 'prompt'
  return 'inApp'
}

function onBeforeInstall(event: Event) {
  event.preventDefault()
  captured = event as BeforeInstallPromptEvent
}

function onInstalled() {
  installed = true
  captured = null
}

export function captureInstallPrompt(target: EventTarget = window): void {
  if (listening) return
  listening = true
  target.addEventListener('beforeinstallprompt', onBeforeInstall)
  target.addEventListener('appinstalled', onInstalled)
}

export function hasInstallPrompt(): boolean {
  return captured != null
}

export function wasAppInstalled(): boolean {
  return installed
}

export function shouldHideAddToHome(
  win: Pick<Window, 'matchMedia'> & { navigator: Navigator } = window,
): boolean {
  return wasAppInstalled() || isStandalone(win)
}

export async function promptInstall(): Promise<'ok' | 'missing'> {
  const event = captured
  if (!event) return 'missing'
  captured = null
  await event.prompt()
  return 'ok'
}

export const ADD_TO_HOME_COPY = {
  title: 'Add to Home Screen',
  body: 'Opens full screen, like an app. Stories load faster next time.',
  add: 'Add',
  almostReady: 'Almost ready, please try again in a moment.',
  iosSteps: 'Tap Share ⬆︎, then ‘Add to Home Screen’.',
  inAppSteps: 'Tap ⋯ at the top right and open in your browser.',
} as const
