import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const DISCLAIMER_KEY = 'advanceboy-disclaimer-acknowledged'
const EMULATOR_DATA_PATH = '/emulatorjs/data/'
const EMULATOR_RUNTIME_SCRIPTS = [
  'emulator.js',
  'nipplejs.js',
  'shaders.js',
  'storage.js',
  'gamepad.js',
  'GameManager.js',
  'socket.io.min.js',
  'compression.js',
]
const EMULATOR_RUNTIME_STYLE = `${EMULATOR_DATA_PATH}emulator.css`
const BIOS_PATH = normalizeBaseUrl(import.meta.env.VITE_BIOS_BASE_URL || '/bios/')
let emulatorRuntimePromise = null

const systems = [
  { label: 'Game Boy Advance', core: 'gba', extensions: ['gba'] },
  { label: 'Game Boy / Game Boy Color', core: 'gb', extensions: ['gb', 'gbc'] },
  { label: 'Nintendo Entertainment System', core: 'nes', extensions: ['fds', 'nes', 'unf', 'unif'] },
  { label: 'Super Nintendo', core: 'snes', extensions: ['bsx', 'fig', 'gd3', 'gd7', 'sfc', 'smc', 'swc'] },
  { label: 'Nintendo 64', core: 'n64', extensions: ['n64', 'v64', 'z64'] },
  { label: 'Nintendo DS', core: 'nds', extensions: ['nds'] },
  { label: 'PlayStation', core: 'psx', extensions: ['bin', 'cue', 'img', 'iso', 'pbp'] },
  { label: 'Sega Mega Drive / Genesis', core: 'segaMD', extensions: ['gen', 'md', 'smd'] },
  { label: 'Sega Master System', core: 'segaMS', extensions: ['sms'] },
  { label: 'Sega Game Gear', core: 'segaGG', extensions: ['gg'] },
  { label: 'Sega 32X', core: 'sega32x', extensions: ['32x'] },
  { label: 'Sega CD', core: 'segaCD', extensions: ['chd'] },
  { label: 'Sega Saturn', core: 'segaSaturn', extensions: ['ccd', 'mds'] },
  { label: 'Atari 2600', core: 'atari2600', extensions: ['a26'] },
  { label: 'Atari 5200', core: 'a5200', extensions: ['a52'] },
  { label: 'Atari 7800', core: 'atari7800', extensions: ['a78'] },
  { label: 'Atari Lynx', core: 'lynx', extensions: ['lnx'] },
  { label: 'Atari Jaguar', core: 'jaguar', extensions: ['j64', 'jag'] },
  { label: 'NEC PC Engine / TurboGrafx-16', core: 'pce', extensions: ['pce', 'sgx'] },
  { label: 'NEC PC-FX', core: 'pcfx', extensions: ['pcfx'] },
  { label: 'SNK Neo Geo Pocket', core: 'ngp', extensions: ['ngc', 'ngp'] },
  { label: 'Bandai WonderSwan', core: 'ws', extensions: ['ws', 'wsc'] },
  { label: 'ColecoVision', core: 'coleco', extensions: ['col', 'cv'] },
  { label: 'Commodore 64', core: 'vice_x64sc', extensions: ['d64', 'g64', 'prg', 't64'] },
  { label: 'Arcade', core: 'arcade', extensions: ['zip'] },
]

const extensionMap = new Map(
  systems.flatMap((system) => system.extensions.map((extension) => [extension, system])),
)

const biosFilesByCore = {
  gba: ['gba_bios.bin', 'bios.bin'],
  psx: ['scph5501.bin', 'scph5500.bin', 'scph5502.bin', 'psxonpsp660.bin'],
  segaCD: ['bios_CD_U.bin', 'bios_CD_E.bin', 'bios_CD_J.bin'],
  segaSaturn: ['saturn_bios.bin', 'mpr-17933.bin', 'sega_101.bin'],
  pcfx: ['pcfx.rom'],
  coleco: ['coleco.rom'],
  a5200: ['5200.rom'],
  lynx: ['lynxboot.img'],
}

function getExtension(fileName) {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

function detectSystem(file) {
  return extensionMap.get(getExtension(file.name)) || null
}

function normalizeBaseUrl(value) {
  return value.endsWith('/') ? value : `${value}/`
}

async function findBios(core) {
  const candidates = biosFilesByCore[core] || []

  if (window.__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const bios = await invoke('find_bios', { core, candidates })

      if (bios) {
        return bios
      }
    } catch {
      // Fall back to URL probing when the native Tauri command is unavailable.
    }
  }

  for (const fileName of candidates) {
    const url = `${BIOS_PATH}${fileName}`

    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })

      if (response.ok) {
        return { fileName, url }
      }
    } catch {
      // Missing local BIOS files are expected for systems that do not need one.
    }
  }

  return null
}

function formatBytes(bytes) {
  if (!bytes) {
    return '0 bytes'
  }

  const units = ['bytes', 'KB', 'MB', 'GB']
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** power

  return `${value.toFixed(value >= 10 || power === 0 ? 0 : 1)} ${units[power]}`
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }

    const script = document.createElement('script')

    script.src = src
    script.async = false
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load EmulatorJS runtime'))
    document.body.appendChild(script)
  })
}

function loadStyle(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${src}"]`)) {
      resolve()
      return
    }

    const stylesheet = document.createElement('link')

    stylesheet.rel = 'stylesheet'
    stylesheet.href = src
    stylesheet.onload = resolve
    stylesheet.onerror = () => reject(new Error('Could not load EmulatorJS styles'))
    document.head.appendChild(stylesheet)
  })
}

function buildEmulatorConfig() {
  return {
    gameUrl: window.EJS_gameUrl,
    dataPath: EMULATOR_DATA_PATH,
    system: window.EJS_core,
    biosUrl: window.EJS_biosUrl,
    gameName: window.EJS_gameName,
    volume: window.EJS_volume,
    startOnLoad: window.EJS_startOnLoaded,
    threads: window.EJS_threads,
    disableDatabases: window.EJS_disableDatabases,
  }
}

function installEmulatorDestroy() {
  if (!window.EmulatorJS || window.EmulatorJS.prototype.__visualAdvanceDestroyInstalled) {
    return
  }

  const prototype = window.EmulatorJS.prototype
  const originalAddEventListener = prototype.addEventListener

  prototype.addEventListener = function addTrackedEventListener(element, listener, callback) {
    const listeners = originalAddEventListener.call(this, element, listener, callback)

    this.__visualAdvanceListeners = [
      ...(this.__visualAdvanceListeners || []),
      ...listeners,
    ]

    return listeners
  }

  prototype.destroy = function destroyEmulator() {
    if (this.__visualAdvanceDestroyed) {
      return
    }

    this.__visualAdvanceDestroyed = true

    try {
      this.menu?.close?.()
    } catch {
      // Best-effort cleanup for a runtime that may be only partially initialized.
    }

    try {
      if (document.fullscreenElement === this.elements?.parent) {
        document.exitFullscreen?.()
      }
    } catch {
      // Fullscreen exit may be blocked if the browser has already changed state.
    }

    try {
      this.callEvent?.('exit')
    } catch {
      // Some cores may already have aborted.
    }

    clearTimeout(this.resetTimeout)

    try {
      this.Module?.pauseMainLoop?.()
    } catch {
      // Not every Emscripten runtime exposes pauseMainLoop.
    }

    try {
      this.Module?.abort?.()
    } catch {
      // abort can throw after a previous exit path has run.
    }

    for (const listener of this.__visualAdvanceListeners || []) {
      try {
        listener.elem.removeEventListener(listener.listener, listener.cb)
      } catch {
        // Detached nodes and aborted runtimes should not prevent teardown.
      }
    }

    this.__visualAdvanceListeners = []
    this.started = false
    this.paused = true
  }

  prototype.__visualAdvanceDestroyInstalled = true
}

async function ensureEmulatorRuntime() {
  if (!emulatorRuntimePromise) {
    emulatorRuntimePromise = (async () => {
      await loadStyle(EMULATOR_RUNTIME_STYLE)

      for (const script of EMULATOR_RUNTIME_SCRIPTS) {
        await loadScript(`${EMULATOR_DATA_PATH}src/${script}`)
      }

      installEmulatorDestroy()
    })()
  }

  await emulatorRuntimePromise
}

function App() {
  const playerRef = useRef(null)
  const romInputRef = useRef(null)
  const blobUrlRef = useRef(null)
  const gamepadFrameRef = useRef(null)
  const loadIdRef = useRef(0)

  const [status, setStatus] = useState('Load a ROM to start')
  const [romInfo, setRomInfo] = useState(null)
  const [selectedCore, setSelectedCore] = useState('gba')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(() => localStorage.getItem(DISCLAIMER_KEY) !== 'true')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [controllers, setControllers] = useState(['Not connected', 'Not connected'])

  const gamepadSupported = useMemo(
    () => typeof navigator !== 'undefined' && 'getGamepads' in navigator,
    [],
  )

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const onFullscreenChange = () => setIsMaximized(Boolean(document.fullscreenElement))

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    pollControllers()

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      cancelAnimationFrame(gamepadFrameRef.current)
      unloadRom()
    }
    // The listeners and animation loop are global app lifecycle hooks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function acknowledgeDisclaimer() {
    localStorage.setItem(DISCLAIMER_KEY, 'true')
    setShowDisclaimer(false)
  }

  function resetRuntimeContainer() {
    const emulator = window.EJS_emulator

    try {
      emulator?.gameManager?.saveSaveFiles?.()
    } catch {
      // Save data is best-effort during forced teardown.
    }

    emulator?.destroy?.()
    window.EJS_emulator = null

    if (playerRef.current) {
      playerRef.current.innerHTML = ''
      playerRef.current.classList.remove('ejs_parent', 'ejs_small_screen', 'ejs_big_screen')
      playerRef.current.removeAttribute('tabindex')
    }
  }

  async function loadRom(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const detected = detectSystem(file)
    const core = detected?.core || selectedCore
    const loadId = loadIdRef.current + 1

    loadIdRef.current = loadId
    resetRuntimeContainer()

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
    }

    const blobUrl = URL.createObjectURL(file)
    const bios = await findBios(core)
    blobUrlRef.current = blobUrl

    window.EJS_player = '#game'
    window.EJS_gameName = file.name.replace(/\.[^.]+$/, '')
    window.EJS_gameUrl = blobUrl
    window.EJS_core = core
    window.EJS_biosUrl = bios?.url || ''
    window.EJS_pathtodata = EMULATOR_DATA_PATH
    window.EJS_startOnLoaded = true
    window.EJS_disableDatabases = false
    window.EJS_threads = false
    window.EJS_volume = 0.75
    window.EJS_language = 'en-US'

    setSelectedCore(core)
    setRomInfo({
      name: file.name,
      size: file.size,
      system: detected?.label || systems.find((system) => system.core === core)?.label || core,
      core,
      bios: bios?.fileName || '',
    })
    setStatus(`Loading ${file.name}`)
    setIsLoaded(false)

    try {
      await ensureEmulatorRuntime()

      if (loadIdRef.current !== loadId) {
        return
      }

      window.EJS_emulator = new window.EmulatorJS(window.EJS_player, buildEmulatorConfig())

      if (loadIdRef.current !== loadId) {
        window.EJS_emulator?.destroy?.()
        return
      }

      setIsLoaded(true)
      setStatus('Running')
    } catch (error) {
      setStatus(error.message || 'Could not load ROM')
    } finally {
      event.target.value = ''
    }
  }

  function unloadRom() {
    resetRuntimeContainer()

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    setRomInfo(null)
    setIsLoaded(false)
    setStatus('ROM unloaded')

    if (romInputRef.current) {
      romInputRef.current.value = ''
    }
  }

  async function toggleMaximized() {
    try {
      if (!document.fullscreenElement) {
        await playerRef.current?.requestFullscreen()
        setStatus('Screen maximized')
        return
      }

      await document.exitFullscreen()
      setStatus('Screen restored')
    } catch (error) {
      setStatus(error.message || 'Could not change display mode')
    }
  }

  async function installApp() {
    if (!installPrompt) {
      setStatus('Install prompt is not available yet')
      return
    }

    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  function pollControllers() {
    const pads = Array.from(navigator.getGamepads?.() || [])
      .filter((pad) => pad?.connected)
      .slice(0, 2)

    setControllers([
      pads[0]?.id || 'Not connected',
      pads[1]?.id || 'Not connected',
    ])
    gamepadFrameRef.current = requestAnimationFrame(pollControllers)
  }

  return (
    <main className="emulator-shell">
      {showDisclaimer && (
        <section className="disclaimer-banner" role="status" aria-live="polite">
          <div className="disclaimer-copy">
            <strong>Informational Notice</strong>
            <p>
              This application is emulator software. Use only games, BIOS images,
              and save data that you lawfully own or are otherwise authorized to use.
              Copyrighted game data remains subject to the rights of its owners.
            </p>
            <p>This notice is provided for general informational purposes only.</p>
          </div>
          <button type="button" className="secondary" onClick={acknowledgeDisclaimer}>
            Acknowledge
          </button>
        </section>
      )}

      <section className="emulator-topbar">
        <div>
          <p className="eyebrow">Universal web emulator</p>
          <h1>Play classic console ROMs</h1>
        </div>
        <div className="actions">
          <label className="system-picker">
            <span>System</span>
            <select value={selectedCore} onChange={(event) => setSelectedCore(event.target.value)}>
              {systems.map((system) => (
                <option key={system.core} value={system.core}>
                  {system.label}
                </option>
              ))}
            </select>
          </label>
          <label className="file-button">
            <input ref={romInputRef} type="file" onChange={loadRom} />
            Load ROM
          </label>
          <button type="button" className="secondary" onClick={unloadRom} disabled={!romInfo}>
            Unload
          </button>
          <button type="button" className="secondary" onClick={toggleMaximized}>
            {isMaximized ? 'Restore' : 'Fullscreen'}
          </button>
          <button type="button" className="secondary" onClick={installApp}>
            Install
          </button>
        </div>
      </section>

      <section className="status-strip">
        <span>{status}</span>
        <span>{romInfo?.name || 'No ROM loaded'}</span>
        <span>{romInfo?.system || 'No system'}</span>
        <span>{isLoaded ? 'runtime ready' : 'waiting'}</span>
      </section>

      {!gamepadSupported && (
        <p className="support-alert">This browser does not expose the Gamepad API.</p>
      )}

      <section className={`console-layout ${isMaximized ? 'console-layout-maximized' : ''}`}>
        <div
          ref={playerRef}
          id="game"
          className={`screen-bezel emulator-player ${isMaximized ? 'screen-bezel-maximized' : ''}`}
          aria-label="Emulator screen"
        />

        <div className={`side-panel ${isMaximized ? 'side-panel-hidden' : ''}`}>
          <div className="panel">
            <div className="panel-heading">
              <h2>Game</h2>
              <span>{romInfo ? 'loaded' : 'empty'}</span>
            </div>
            <dl className="cartridge-list">
              <div>
                <dt>Name</dt>
                <dd>{romInfo?.name || 'None'}</dd>
              </div>
              <div>
                <dt>System</dt>
                <dd>{romInfo?.system || 'Select a ROM'}</dd>
              </div>
              <div>
                <dt>Core</dt>
                <dd>{romInfo?.core || selectedCore}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{romInfo ? formatBytes(romInfo.size) : '--'}</dd>
              </div>
              <div>
                <dt>BIOS</dt>
                <dd>{romInfo?.bios || 'None detected'}</dd>
              </div>
            </dl>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2>Controllers</h2>
              <span>two players</span>
            </div>
            <div className="controller-list">
              <div>
                <strong>Player 1</strong>
                <span>{controllers[0]}</span>
              </div>
              <div>
                <strong>Player 2</strong>
                <span>{controllers[1]}</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2>Runtime</h2>
              <span>EmulatorJS</span>
            </div>
            <p className="runtime-copy">
              Open the emulator menu over the game screen to remap keyboard and
              gamepad controls, save/load states, adjust volume, and configure shaders.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
