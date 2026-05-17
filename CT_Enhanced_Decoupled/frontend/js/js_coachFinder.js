/**
 * coachFinder.js
 * Coach Position Finder for Charlapalli Terminal
 * Drop this file into: frontend/js/coachFinder.js
 *
 * Then add before </body> in index.html:
 *   <script src="/js/coachFinder.js"></script>
 */

(function () {
  'use strict';

  /* ── COACH COMPOSITION DATA ────────────────────────────────────────
   * Keyed by train number (string). Each entry is an ordered array
   * from ENGINE end → GUARD/EOG end (left → right in the diagram).
   * Coaches not listed here fall back to a generic 12-coach SL rake.
   * ──────────────────────────────────────────────────────────────── */
  const COMPOSITIONS = {
    '22693': [ // Rajdhani Express
      { id: 'L',   type: 'loco',   label: 'L'   },
      { id: 'EOG', type: 'eog',    label: 'EOG' },
      { id: 'H1',  type: 'ac',     label: '1A'  },
      { id: 'H2',  type: 'ac',     label: '2A'  },
      { id: 'A1',  type: 'ac',     label: '2A'  },
      { id: 'A2',  type: 'ac',     label: '2A'  },
      { id: 'B1',  type: 'ac',     label: '3A'  },
      { id: 'B2',  type: 'ac',     label: '3A'  },
      { id: 'B3',  type: 'ac',     label: '3A'  },
      { id: 'B4',  type: 'ac',     label: '3A'  },
      { id: 'B5',  type: 'ac',     label: '3A'  },
      { id: 'PC',  type: 'pantry', label: 'PAN' },
      { id: 'B6',  type: 'ac',     label: '3A'  },
      { id: 'EOG2',type: 'eog',    label: 'EOG' },
    ],
    '12728': [ // Godavari Express
      { id: 'L',   type: 'loco', label: 'L'  },
      { id: 'EOG', type: 'eog',  label: 'EOG'},
      { id: 'S1',  type: 'sl',   label: 'S1' },
      { id: 'S2',  type: 'sl',   label: 'S2' },
      { id: 'S3',  type: 'sl',   label: 'S3' },
      { id: 'S4',  type: 'sl',   label: 'S4' },
      { id: 'S5',  type: 'sl',   label: 'S5' },
      { id: 'S6',  type: 'sl',   label: 'S6' },
      { id: 'S7',  type: 'sl',   label: 'S7' },
      { id: 'S8',  type: 'sl',   label: 'S8' },
      { id: 'S9',  type: 'sl',   label: 'S9' },
      { id: 'S10', type: 'sl',   label: 'S10' },
      { id: 'S11', type: 'sl',   label: 'S11' },
      { id: 'S12', type: 'sl',   label: 'S12' },
      { id: 'A1',  type: 'ac',   label: '2A' },
      { id: 'B1',  type: 'ac',   label: '3A' },
      { id: 'B2',  type: 'ac',   label: '3A' },
      { id: 'GEN1',type: 'gen',  label: 'GS' },
      { id: 'GEN2',type: 'gen',  label: 'GS' },
      { id: 'EOG2',type: 'eog',  label: 'EOG'},
    ],
    '57477': [ // Passenger Special — generic
      { id: 'L',   type: 'loco', label: 'L'  },
      { id: 'GEN1',type: 'gen',  label: 'GS' },
      { id: 'GEN2',type: 'gen',  label: 'GS' },
      { id: 'GEN3',type: 'gen',  label: 'GS' },
      { id: 'S1',  type: 'sl',   label: 'S1' },
      { id: 'S2',  type: 'sl',   label: 'S2' },
      { id: 'GEN4',type: 'gen',  label: 'GS' },
    ],
    '18519': [ // Visakha Express
      { id: 'L',   type: 'loco', label: 'L'  },
      { id: 'EOG', type: 'eog',  label: 'EOG'},
      { id: 'B7',  type: 'ac',   label: '3A' },
      { id: 'B6',  type: 'ac',   label: '3A' },
      { id: 'B5',  type: 'ac',   label: '3A' },
      { id: 'B4',  type: 'ac',   label: '3A' },
      { id: 'B3',  type: 'ac',   label: '3A' },
      { id: 'B2',  type: 'ac',   label: '3A' },
      { id: 'B1',  type: 'ac',   label: '3A' },
      { id: 'A1',  type: 'ac',   label: '2A' },
      { id: 'A2',  type: 'ac',   label: '2A' },
      { id: 'EOG2',type: 'eog',  label: 'EOG'},
    ],
    '12723': [ // Telangana Express
      { id: 'L',   type: 'loco', label: 'L'  },
      { id: 'EOG', type: 'eog',  label: 'EOG'},
      { id: 'H1',  type: 'ac',   label: '1A' },
      { id: 'A1',  type: 'ac',   label: '2A' },
      { id: 'A2',  type: 'ac',   label: '2A' },
      { id: 'B1',  type: 'ac',   label: '3A' },
      { id: 'B2',  type: 'ac',   label: '3A' },
      { id: 'B3',  type: 'ac',   label: '3A' },
      { id: 'B4',  type: 'ac',   label: '3A' },
      { id: 'B5',  type: 'ac',   label: '3A' },
      { id: 'B6',  type: 'ac',   label: '3A' },
      { id: 'PC',  type: 'pantry', label: 'PAN'},
      { id: 'S1',  type: 'sl',   label: 'S1' },
      { id: 'S2',  type: 'sl',   label: 'S2' },
      { id: 'S3',  type: 'sl',   label: 'S3' },
      { id: 'S4',  type: 'sl',   label: 'S4' },
      { id: 'S5',  type: 'sl',   label: 'S5' },
      { id: 'S6',  type: 'sl',   label: 'S6' },
      { id: 'GEN1',type: 'gen',  label: 'GS' },
      { id: 'GEN2',type: 'gen',  label: 'GS' },
      { id: 'EOG2',type: 'eog',  label: 'EOG'},
    ],
    '17643': [ // Circar Express
      { id: 'L',   type: 'loco', label: 'L'  },
      { id: 'EOG', type: 'eog',  label: 'EOG'},
      { id: 'GEN1',type: 'gen',  label: 'GS' },
      { id: 'GEN2',type: 'gen',  label: 'GS' },
      { id: 'S1',  type: 'sl',   label: 'S1' },
      { id: 'S2',  type: 'sl',   label: 'S2' },
      { id: 'S3',  type: 'sl',   label: 'S3' },
      { id: 'S4',  type: 'sl',   label: 'S4' },
      { id: 'S5',  type: 'sl',   label: 'S5' },
      { id: 'S6',  type: 'sl',   label: 'S6' },
      { id: 'S7',  type: 'sl',   label: 'S7' },
      { id: 'B1',  type: 'ac',   label: '3A' },
      { id: 'B2',  type: 'ac',   label: '3A' },
      { id: 'B3',  type: 'ac',   label: '3A' },
      { id: 'A1',  type: 'ac',   label: '2A' },
      { id: 'GEN3',type: 'gen',  label: 'GS' },
      { id: 'EOG2',type: 'eog',  label: 'EOG'},
    ],
    '17031': [ // Mumbai Express
      { id: 'L',   type: 'loco', label: 'L'  },
      { id: 'EOG', type: 'eog',  label: 'EOG'},
      { id: 'GEN1',type: 'gen',  label: 'GS' },
      { id: 'GEN2',type: 'gen',  label: 'GS' },
      { id: 'S1',  type: 'sl',   label: 'S1' },
      { id: 'S2',  type: 'sl',   label: 'S2' },
      { id: 'S3',  type: 'sl',   label: 'S3' },
      { id: 'S4',  type: 'sl',   label: 'S4' },
      { id: 'S5',  type: 'sl',   label: 'S5' },
      { id: 'S6',  type: 'sl',   label: 'S6' },
      { id: 'B1',  type: 'ac',   label: '3A' },
      { id: 'B2',  type: 'ac',   label: '3A' },
      { id: 'B3',  type: 'ac',   label: '3A' },
      { id: 'A1',  type: 'ac',   label: '2A' },
      { id: 'HA1', type: 'ac',   label: '1A' },
      { id: 'GEN3',type: 'gen',  label: 'GS' },
      { id: 'EOG2',type: 'eog',  label: 'EOG'},
    ],
    '12703': [ // Falaknuma Express
      { id: 'L',   type: 'loco', label: 'L'  },
      { id: 'EOG', type: 'eog',  label: 'EOG'},
      { id: 'A1',  type: 'ac',   label: '2A' },
      { id: 'A2',  type: 'ac',   label: '2A' },
      { id: 'B1',  type: 'ac',   label: '3A' },
      { id: 'B2',  type: 'ac',   label: '3A' },
      { id: 'B3',  type: 'ac',   label: '3A' },
      { id: 'B4',  type: 'ac',   label: '3A' },
      { id: 'B5',  type: 'ac',   label: '3A' },
      { id: 'B6',  type: 'ac',   label: '3A' },
      { id: 'B7',  type: 'ac',   label: '3A' },
      { id: 'PC',  type: 'pantry', label: 'PAN'},
      { id: 'S1',  type: 'sl',   label: 'S1' },
      { id: 'S2',  type: 'sl',   label: 'S2' },
      { id: 'S3',  type: 'sl',   label: 'S3' },
      { id: 'S4',  type: 'sl',   label: 'S4' },
      { id: 'S5',  type: 'sl',   label: 'S5' },
      { id: 'S6',  type: 'sl',   label: 'S6' },
      { id: 'S7',  type: 'sl',   label: 'S7' },
      { id: 'GEN1',type: 'gen',  label: 'GS' },
      { id: 'GEN2',type: 'gen',  label: 'GS' },
      { id: 'EOG2',type: 'eog',  label: 'EOG'},
    ],
  };

  /** Default SL rake for unknown trains */
  function defaultComposition() {
    const coaches = [
      { id: 'L',   type: 'loco', label: 'L'   },
      { id: 'EOG', type: 'eog',  label: 'EOG' },
    ];
    for (let i = 1; i <= 12; i++) coaches.push({ id: `S${i}`, type: 'sl', label: `S${i}` });
    for (let i = 1; i <= 4; i++) coaches.push({ id: `B${i}`, type: 'ac', label: `3A`   });
    coaches.push({ id: 'GEN1', type: 'gen', label: 'GS' });
    coaches.push({ id: 'GEN2', type: 'gen', label: 'GS' });
    coaches.push({ id: 'EOG2', type: 'eog', label: 'EOG' });
    return coaches;
  }

  /* ── LEGEND CONFIG ──────────────────────────────────────────────── */
  const LEGEND = [
    { type: 'loco',   label: 'Locomotive',  color: '#c9a84c' },
    { type: 'eog',    label: 'EOG / Guard', color: '#a855f7' },
    { type: 'ac',     label: 'AC Coach',    color: '#3b82f6' },
    { type: 'sl',     label: 'Sleeper',     color: '#e85d26' },
    { type: 'gen',    label: 'General',     color: '#64748b' },
    { type: 'pantry', label: 'Pantry',      color: '#10b981' },
  ];

  /* ── MODAL STATE ────────────────────────────────────────────────── */
  let activeTrain = null;

  /* ── BUILD MODAL DOM (once) ─────────────────────────────────────── */
  function buildModal() {
    if (document.getElementById('coachFinderOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'coachFinderOverlay';
    overlay.className = 'coach-modal-overlay';
    overlay.innerHTML = `
      <div class="coach-modal" role="dialog" aria-modal="true" aria-labelledby="coachModalTitle">
        <div class="coach-modal-header">
          <div>
            <div class="coach-modal-title" id="coachModalTitle">Coach Position Finder</div>
            <div class="coach-modal-subtitle" id="coachModalSubtitle">— · — · —</div>
          </div>
          <button class="coach-modal-close" id="coachModalClose" aria-label="Close">✕</button>
        </div>

        <div class="coach-search-row">
          <input
            type="text"
            id="coachSearchInput"
            placeholder="Enter coach no. e.g. B2, S3, A1, H1…"
            autocomplete="off"
            spellcheck="false"
          />
          <button class="btn-find-coach" id="coachSearchBtn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Find
          </button>
        </div>

        <div id="coachNotFound" class="coach-not-found" style="display:none;">
          Coach not found. Try: B1, S2, A1, GS, EOG…
        </div>

        <div class="coach-direction-row">
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Engine / Front
          </span>
          <span>
            Guard / Rear
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </div>

        <div class="coach-diagram-scroll">
          <div class="coach-track" id="coachTrack"></div>
        </div>

        <div class="coach-legend">
          ${LEGEND.map(l => `
            <div class="legend-item">
              <div class="legend-dot" style="border-color:${l.color};background:${l.color}22;"></div>
              ${l.label}
            </div>`).join('')}
        </div>
      </div>`;

    document.body.appendChild(overlay);

    /* close handlers */
    document.getElementById('coachModalClose').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    /* search handlers */
    document.getElementById('coachSearchBtn').addEventListener('click', runCoachSearch);
    document.getElementById('coachSearchInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') runCoachSearch();
    });
  }

  /* ── RENDER DIAGRAM ─────────────────────────────────────────────── */
  function renderDiagram(trainNumber, highlightId) {
    const composition = COMPOSITIONS[String(trainNumber)] || defaultComposition();
    const track = document.getElementById('coachTrack');
    const normalizedHighlight = highlightId ? highlightId.toUpperCase().trim() : null;
    let found = false;

    track.innerHTML = composition.map(coach => {
      const isHL = normalizedHighlight && coach.id.toUpperCase() === normalizedHighlight;
      if (isHL) found = true;
      return `
        <div class="coach-car">
          <div class="coach-car-body type-${coach.type}${isHL ? ' highlighted' : ''}" title="${coach.id}">
            ${coach.id}
          </div>
          <div class="coach-car-label">${coach.label}</div>
        </div>`;
    }).join('');

    /* auto-scroll highlighted coach into view */
    if (normalizedHighlight && found) {
      setTimeout(() => {
        const hlEl = track.querySelector('.highlighted');
        if (hlEl) hlEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 80);
    }

    return found;
  }

  /* ── SEARCH HANDLER ─────────────────────────────────────────────── */
  function runCoachSearch() {
    const input = document.getElementById('coachSearchInput').value;
    const notFound = document.getElementById('coachNotFound');
    if (!activeTrain) return;
    const found = renderDiagram(activeTrain.number, input);
    notFound.style.display = found || !input.trim() ? 'none' : 'block';
  }

  /* ── OPEN / CLOSE ───────────────────────────────────────────────── */
  function openModal(train) {
    buildModal();
    activeTrain = train;

    document.getElementById('coachModalTitle').textContent =
      `${train.number} · ${train.name}`;
    document.getElementById('coachModalSubtitle').textContent =
      `Platform ${train.platform} · ${train.from} → ${train.to}`;

    /* reset search */
    document.getElementById('coachSearchInput').value = '';
    document.getElementById('coachNotFound').style.display = 'none';

    renderDiagram(train.number, null);

    const overlay = document.getElementById('coachFinderOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    /* focus search input */
    setTimeout(() => document.getElementById('coachSearchInput').focus(), 300);
  }

  function closeModal() {
    const overlay = document.getElementById('coachFinderOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    activeTrain = null;
  }

  /* ── PUBLIC API ─────────────────────────────────────────────────── */
  window.CoachFinder = { open: openModal, close: closeModal };

})();
