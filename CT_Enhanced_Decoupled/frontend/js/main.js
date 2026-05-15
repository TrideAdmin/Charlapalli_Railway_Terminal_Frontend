// main.js — Global utilities for Charlapalli Terminal

// Shimmer animation for loading states
document.addEventListener('DOMContentLoaded', () => {
  // Add loading shimmer to any .loading-pulse elements
  document.querySelectorAll('.loading-pulse').forEach(el => {
    if (!el.style.animation) {
      el.style.animation = 'shimmer-text 1.5s ease-in-out infinite';
    }
  });
});

// Add shimmer keyframe for loading text
const shimmerStyle = document.createElement('style');
shimmerStyle.textContent = `
  @keyframes shimmer-text {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  /* Hover glow for interactive elements */
  .facility-card:focus-visible,
  .wait-card:focus-visible {
    outline: 1px solid var(--gold, #c9a84c);
    outline-offset: 2px;
  }
`;
document.head.appendChild(shimmerStyle);
