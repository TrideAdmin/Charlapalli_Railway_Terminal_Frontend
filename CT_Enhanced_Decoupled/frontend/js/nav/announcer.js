/**
 * announcer.js
 * ──────────────────────────────────────────────────────────────────────────
 * Handles navigation announcements:
 *   • Web Speech API (text-to-speech) when supported
 *   • Visual toast fallback for silent environments or unsupported browsers
 * ──────────────────────────────────────────────────────────────────────────
 */

export default class Announcer {
  /**
   * @param {object} [opts]
   * @param {boolean} [opts.voice=true]          – enable TTS
   * @param {string}  [opts.lang='en-IN']        – BCP-47 language tag
   * @param {string}  [opts.toastContainerId]    – id of a DOM element to inject toasts
   */
  constructor(opts = {}) {
    this._voiceEnabled = opts.voice ?? true;
    this._lang         = opts.lang  ?? 'en-IN';
    this._toastEl      = opts.toastContainerId
      ? document.getElementById(opts.toastContainerId)
      : null;
    this._synth        = window.speechSynthesis || null;
    this._queue        = [];
    this._speaking     = false;
  }

  /**
   * Announce a message (voice + toast).
   * @param {string} text
   * @param {'info'|'warn'|'success'} [level='info']
   */
  announce(text, level = 'info') {
    this._showToast(text, level);
    if (this._voiceEnabled && this._synth) {
      this._speak(text);
    }
  }

  /** Mute / unmute TTS. */
  setVoice(enabled) {
    this._voiceEnabled = enabled;
    if (!enabled && this._synth) this._synth.cancel();
  }

  destroy() {
    this._synth?.cancel();
    this._queue = [];
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _speak(text) {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = this._lang;
    utt.rate  = 1.0;
    utt.pitch = 1.0;

    this._synth.cancel(); // preempt any ongoing speech
    this._synth.speak(utt);
  }

  _showToast(text, level = 'info') {
    const container = this._toastEl || this._getOrCreateContainer();

    const toast = document.createElement('div');
    toast.className = `nav-toast nav-toast--${level}`;
    toast.innerHTML = `
      <span class="nav-toast__icon">${this._icon(level)}</span>
      <span class="nav-toast__text">${text}</span>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('nav-toast--visible'));

    // Animate out after 4.5s
    setTimeout(() => {
      toast.classList.remove('nav-toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  _getOrCreateContainer() {
    let c = document.getElementById('nav-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'nav-toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  _icon(level) {
    const icons = {
      info:    '🗺',
      warn:    '⚠️',
      success: '✅',
    };
    return icons[level] || icons.info;
  }
}
