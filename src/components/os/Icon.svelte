<script lang="ts">
  import type { IconKind } from '../../lib/os/types';

  // Inline SVG icon set for Finder rows and preview. Hand-drawn-simple,
  // flat fills, 1px strokes — consistent across kinds.
  type Props = {
    kind: IconKind;
    size?: number;
    thumb?: string | null;
  };

  let { kind, size = 16, thumb = null }: Props = $props();

  // App/image thumbnail radius scales with size (Big Sur app-tile feel).
  const appRadius = $derived(Math.max(2, Math.round(size * 0.22)));
</script>

{#if kind === 'folder'}
  <svg
    class="icon"
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <!-- back tab -->
    <path d="M1.5 4.5 A1 1 0 0 1 2.5 3.5 H6 L7.4 5 H13.5 A1 1 0 0 1 14.5 6 V6.6 H1.5 Z" fill="#63a6e6" />
    <!-- body -->
    <rect x="1.5" y="5" width="13" height="8" rx="1.5" fill="#3b82d0" />
  </svg>
{:else if kind === 'doc'}
  <svg
    class="icon"
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <!-- page with folded corner -->
    <path
      d="M3.5 1.5 H9.5 L12.5 4.5 V14 A0.5 0.5 0 0 1 12 14.5 H4 A0.5 0.5 0 0 1 3.5 14 Z"
      fill="#ffffff"
      stroke="#b9b9be"
      stroke-width="0.75"
    />
    <path d="M9.5 1.5 V4.5 H12.5 Z" fill="#e6e6ea" stroke="#b9b9be" stroke-width="0.75" stroke-linejoin="round" />
    <!-- text lines -->
    <line x1="5" y1="7" x2="11" y2="7" stroke="#c4c4c9" stroke-width="0.75" />
    <line x1="5" y1="9" x2="11" y2="9" stroke="#c4c4c9" stroke-width="0.75" />
    <line x1="5" y1="11" x2="9" y2="11" stroke="#c4c4c9" stroke-width="0.75" />
  </svg>
{:else if kind === 'app'}
  {#if thumb}
    <span
      class="tile"
      style:width={`${size}px`}
      style:height={`${size}px`}
      style:border-radius={`${appRadius}px`}
    >
      <img src={thumb} alt="" />
    </span>
  {:else}
    <svg
      class="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1.5" y="1.5" width="13" height="13" rx="3.4" fill="#8e8e93" />
      <!-- dark glyph -->
      <circle cx="8" cy="8" r="2.6" fill="#f5f5f4" />
      <circle cx="8" cy="8" r="1" fill="#3a3a3c" />
    </svg>
  {/if}
{:else if kind === 'calendar'}
  <svg
    class="icon"
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <!-- a torn-off calendar page: red band, blank day below -->
    <rect x="2" y="2.5" width="12" height="11" rx="1.6" fill="#ffffff" stroke="#b9b9be" stroke-width="0.75" />
    <path d="M2 4.1 A1.6 1.6 0 0 1 3.6 2.5 H12.4 A1.6 1.6 0 0 1 14 4.1 V5.5 H2 Z" fill="#e8524a" />
    <rect x="4.5" y="7.5" width="7" height="1" rx="0.5" fill="#d8d8dd" />
    <rect x="4.5" y="10" width="4.5" height="1" rx="0.5" fill="#d8d8dd" />
  </svg>
{:else if kind === 'image'}
  {#if thumb}
    <span class="tile" style:width={`${size}px`} style:height={`${size}px`} style:border-radius="2px">
      <img src={thumb} alt="" />
    </span>
  {:else}
    <svg
      class="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="#ffffff" stroke="#b9b9be" stroke-width="0.75" />
      <circle cx="5.5" cy="6" r="1.2" fill="#e0b34a" />
      <path d="M2.5 12.5 L6.5 8 L9 11 L11 9 L13.5 12" fill="none" stroke="#7fb27a" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  {/if}
{/if}

<style>
  .icon {
    display: block;
    flex: 0 0 auto;
  }
  .tile {
    display: inline-block;
    flex: 0 0 auto;
    overflow: hidden;
    box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.12);
  }
  .tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
</style>
